import pg from 'pg';
import { pathToFileURL } from 'node:url';

export const SCHEDULER_JOB_NAME = 'pcw-r2-preview';
export const SCHEDULER_CRON = '*/5 * * * *';
export const SCHEDULER_COMMAND = 'select pcw_scheduler.enqueue_tick();';
const extensions = ['pg_cron', 'pg_net', 'supabase_vault', 'pgcrypto'];
const secretNames = ['pcw_r2_scheduler_edge_url', 'pcw_r2_scheduler_hmac_key'];
const untrustedRoles = ['anon', 'authenticated', 'pcw_app', 'pcw_runtime'];
const quoteIdentifier = value => `"${String(value).replaceAll('"', '""')}"`;
class SetupError extends Error { constructor(code, detail) { super(code); this.code = code; this.detail = detail; } }

export function schedulerEdgeUrl(value) {
  if (typeof value !== 'string' || !/^https:\/\/[a-z0-9-]{1,63}\.supabase\.co\/functions\/v1\/cron-forwarder$/.test(value)) throw new SetupError('SCHEDULER_EDGE_URL_INVALID');
  return value;
}

export function schedulerDatabaseOptions(env) {
  const value = env.PCW_SCHEDULER_DATABASE_URL;
  if (!value || value === env.DATABASE_URL) throw new SetupError('SEPARATE_ADMIN_DATABASE_URL_REQUIRED');
  let url; try { url = new URL(value); } catch { throw new SetupError('ADMIN_DATABASE_URL_INVALID'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || url.hash || !/^\/[a-zA-Z0-9_-]+$/.test(url.pathname)) throw new SetupError('ADMIN_DATABASE_URL_INVALID');
  for (const [name, setting] of url.searchParams) if (name !== 'sslmode' || !['require', 'verify-ca', 'verify-full'].includes(setting)) throw new SetupError('ADMIN_DATABASE_URL_OPTIONS_UNSAFE');
  const user = decodeURIComponent(url.username);
  if (untrustedRoles.includes(user) || untrustedRoles.some(role => user.startsWith(`${role}.`))) throw new SetupError('ADMIN_ROLE_REQUIRED');
  // Construct explicit options so connection-string sslmode cannot disable certificate verification.
  return {
    host: url.hostname, port: Number(url.port || 5432), user, password: decodeURIComponent(url.password), database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: true, ...(env.PCW_SCHEDULER_DATABASE_CA ? { ca: env.PCW_SCHEDULER_DATABASE_CA } : {}) },
    application_name: 'pcw-scheduler-config', connectionTimeoutMillis: 10000, statement_timeout: 15000, query_timeout: 20000,
  };
}

export function schedulerFunctionSql(cryptoSchema) {
  if (typeof cryptoSchema !== 'string' || !cryptoSchema || cryptoSchema.length > 63) throw new SetupError('PGCRYPTO_SCHEMA_INVALID');
  return `CREATE OR REPLACE FUNCTION pcw_scheduler.enqueue_tick() RETURNS bigint
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $pcw_scheduler$
DECLARE
  endpoint text; signing_key text; stamp text; nonce text; message text; signature text; request_id bigint;
BEGIN
  SELECT decrypted_secret INTO STRICT endpoint FROM vault.decrypted_secrets WHERE name='pcw_r2_scheduler_edge_url';
  SELECT decrypted_secret INTO STRICT signing_key FROM vault.decrypted_secrets WHERE name='pcw_r2_scheduler_hmac_key';
  IF endpoint !~ '^https://[a-z0-9-]{1,63}\\.supabase\\.co/functions/v1/cron-forwarder$'
     OR signing_key !~ '^[a-fA-F0-9]{64}$' THEN
    RAISE EXCEPTION 'PCW_SCHEDULER_CONFIGURATION_INVALID';
  END IF;
  stamp := floor(extract(epoch FROM clock_timestamp()))::bigint::text;
  nonce := gen_random_uuid()::text;
  message := 'pcw-r2-cron-v1' || chr(10) || 'POST' || chr(10) || '/functions/v1/cron-forwarder' || chr(10) || stamp || chr(10) || nonce;
  signature := 'v1=' || encode(${quoteIdentifier(cryptoSchema)}.hmac(convert_to(message,'UTF8'), decode(signing_key,'hex'), 'sha256'), 'hex');
  SELECT net.http_post(
    url := endpoint,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type','application/json',
      'x-pcw-scheduler-timestamp',stamp,'x-pcw-scheduler-nonce',nonce,'x-pcw-scheduler-signature',signature),
    timeout_milliseconds := 120000
  ) INTO request_id;
  INSERT INTO pcw_scheduler.requests(request_id,nonce,requested_at) VALUES(request_id,nonce,clock_timestamp());
  DELETE FROM pcw_scheduler.requests WHERE requested_at < now() - interval '7 days';
  RETURN request_id;
EXCEPTION WHEN OTHERS THEN
  -- Do not put request headers, Vault values, or provider errors into cron.job_run_details.
  RAISE EXCEPTION 'PCW_SCHEDULER_ENQUEUE_FAILED' USING ERRCODE='P0001';
END;
$pcw_scheduler$;`;
}

async function installedExtensions(client) {
  return (await client.query('SELECT e.extname,e.extversion,n.nspname AS schema FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname=ANY($1::text[])', [extensions])).rows;
}

async function configureLogRedaction(client) {
  // Bound parameters do not enter SQL source, and these transaction-local settings also suppress bind-value logging.
  // If the admin cannot set them, do not write any secret; report the prerequisite instead.
  try {
    const logging = (await client.query("SELECT current_setting('log_parameter_max_length') AS normal,current_setting('log_parameter_max_length_on_error') AS errors,current_setting('pgaudit.log_parameter',true) AS audit")).rows[0];
    if (logging?.normal !== '0' || logging?.errors !== '0') await client.query("SELECT set_config('log_parameter_max_length','0',true),set_config('log_parameter_max_length_on_error','0',true)");
    if (logging?.audit != null && !['off', 'false', '0'].includes(logging.audit)) await client.query("SELECT set_config('pgaudit.log_parameter','off',true)");
  } catch { throw new SetupError('DATABASE_LOG_REDACTION_REQUIRED'); }
}

async function verifyPrivateAccess(client) {
  const roles = await client.query(`SELECT r.rolname FROM pg_roles r WHERE r.rolname = ANY($1::text[])
    OR (NOT r.rolsuper AND r.rolname<>current_user AND EXISTS(
      SELECT 1 FROM pg_roles a WHERE a.rolname='pcw_app' AND pg_has_role(r.oid,a.oid,'member')))` , [untrustedRoles]);
  for (const { rolname } of roles.rows) {
    const access = await client.query(`SELECT
      has_table_privilege($1,'vault.decrypted_secrets','SELECT') AS vault_read,
      has_table_privilege($1,'net.http_request_queue','SELECT') AS queue_read`, [rolname]);
    if (access.rows[0]?.vault_read || access.rows[0]?.queue_read) throw new SetupError('SECRET_STORAGE_PERMISSIONS_UNSAFE');
  }
  const publicAccess = await client.query(`SELECT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
      LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
      WHERE (n.nspname,c.relname) IN (('vault','decrypted_secrets'),('net','http_request_queue')) AND a.grantee=0 AND a.privilege_type='SELECT') AS unsafe`);
  if (publicAccess.rows[0]?.unsafe) throw new SetupError('SECRET_STORAGE_PERMISSIONS_UNSAFE');
  return roles.rows.map(row => row.rolname);
}

async function putSecret(client, name, value, description) {
  const existing = await client.query('SELECT id FROM vault.secrets WHERE name=$1 FOR UPDATE', [name]);
  if (existing.rows.length > 1) throw new SetupError('VAULT_NAME_COLLISION');
  if (existing.rows[0]) await client.query('SELECT vault.update_secret($1::uuid,$2::text,$3::text,$4::text)', [existing.rows[0].id, value, name, description]);
  else await client.query('SELECT vault.create_secret($1::text,$2::text,$3::text)', [value, name, description]);
}

async function inspectSchedule(client) {
  const presence = await client.query("SELECT to_regprocedure('pcw_scheduler.enqueue_tick()') IS NOT NULL AS fn,to_regclass('pcw_scheduler.requests') IS NOT NULL AS requests");
  if (!presence.rows[0]?.fn || !presence.rows[0]?.requests) return { status: 'NOT_CONFIGURED', code: 'SCHEDULER_SCHEMA_REQUIRED', delivery: 'NOT_VERIFIED' };
  const secrets = await client.query(`SELECT count(*)::integer AS count,bool_and(CASE name
    WHEN 'pcw_r2_scheduler_hmac_key' THEN decrypted_secret ~ '^[a-fA-F0-9]{64}$'
    WHEN 'pcw_r2_scheduler_edge_url' THEN decrypted_secret ~ '^https://[a-z0-9-]{1,63}\\.supabase\\.co/functions/v1/cron-forwarder$'
    ELSE false END) AS valid FROM vault.decrypted_secrets WHERE name=ANY($1::text[])`, [secretNames]);
  const jobs = await client.query('SELECT jobid,schedule,command,active,username FROM cron.job WHERE jobname=$1', [SCHEDULER_JOB_NAME]);
  const job = jobs.rows[0];
  if (secrets.rows[0]?.count !== 2 || !secrets.rows[0]?.valid || jobs.rows.length !== 1 || !job.active || job.schedule !== SCHEDULER_CRON || job.command !== SCHEDULER_COMMAND) return { status: 'NOT_CONFIGURED', code: 'SCHEDULER_REGISTRATION_REQUIRED', delivery: 'NOT_VERIFIED' };
  const latest = (await client.query(`SELECT r.request_id,r.requested_at,n.status_code,n.timed_out,
    (n.error_msg IS NOT NULL) AS transport_error,n.created AS responded_at FROM pcw_scheduler.requests r
    LEFT JOIN net._http_response n ON n.id=r.request_id ORDER BY r.requested_at DESC LIMIT 1`)).rows[0] || null;
  return {
    status: 'CONFIGURED', schedule: SCHEDULER_CRON, jobId: String(job.jobid),
    delivery: latest?.status_code === 200 && !latest.timed_out && !latest.transport_error ? 'HTTP_200_OBSERVED' : 'NOT_VERIFIED',
    latestDelivery: latest, productAcceptance: 'NOT_ASSESSED',
  };
}

/** Only --apply mutates. Importing this module or running --check never configures a project. */
export async function configureScheduler({ env = process.env, mode = 'check', clientFactory = options => new pg.Client(options) } = {}) {
  if (!['check', 'apply'].includes(mode)) return { status: 'NOT_CONFIGURED', code: 'MODE_INVALID', applied: false };
  const required = ['PCW_SCHEDULER_DATABASE_URL', ...(mode === 'apply' ? ['PCW_SCHEDULER_EDGE_URL', 'PCW_SCHEDULER_HMAC_KEY'] : [])];
  const missing = required.filter(name => !env[name]);
  if (missing.length) return { status: 'NOT_CONFIGURED', code: 'ENV_REQUIRED', missing, applied: false };
  let client, inTransaction = false, applied = false, stage = 'CONFIGURATION';
  try {
    const options = schedulerDatabaseOptions(env);
    let endpoint;
    if (mode === 'apply') {
      endpoint = schedulerEdgeUrl(env.PCW_SCHEDULER_EDGE_URL);
      if (!/^[a-f0-9]{64}$/i.test(env.PCW_SCHEDULER_HMAC_KEY)) throw new SetupError('SCHEDULER_HMAC_KEY_INVALID');
    }
    client = clientFactory(options); stage = 'DATABASE_CONNECTION'; await client.connect();
    let installed = await installedExtensions(client);
    const absent = extensions.filter(name => !installed.some(item => item.extname === name));
    if (mode === 'check') {
      if (absent.length) return { status: 'NOT_CONFIGURED', code: 'EXTENSIONS_REQUIRED', missing: absent, applied: false };
      await verifyPrivateAccess(client);
      return { ...await inspectSchedule(client), applied: false };
    }
    stage = 'TRANSACTION'; await client.query('BEGIN'); inTransaction = true;
    await client.query("SET LOCAL search_path = pg_catalog");
    await client.query('SELECT pg_advisory_xact_lock(1641663851,1)');
    stage = 'LOG_REDACTION'; await configureLogRedaction(client);
    stage = 'EXTENSIONS';
    if (absent.length) {
      const available = await client.query('SELECT name FROM pg_available_extensions WHERE name=ANY($1::text[])', [absent]);
      const unavailable = absent.filter(name => !available.rows.some(row => row.name === name));
      if (unavailable.length) throw new SetupError('EXTENSIONS_UNAVAILABLE', { missing: unavailable });
      if (absent.includes('pg_cron')) await client.query('CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog');
      if (absent.includes('pg_net')) await client.query('CREATE EXTENSION IF NOT EXISTS pg_net');
      if (absent.includes('supabase_vault')) await client.query('CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE');
      if (absent.includes('pgcrypto')) { await client.query('CREATE SCHEMA IF NOT EXISTS extensions'); await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions'); }
      installed = await installedExtensions(client);
    }
    if (extensions.some(name => !installed.some(item => item.extname === name))) throw new SetupError('EXTENSIONS_REQUIRED');
    const cryptoSchema = installed.find(item => item.extname === 'pgcrypto').schema;
    stage = 'PERMISSIONS'; const roles = await verifyPrivateAccess(client);
    const owner = (await client.query('SELECT current_user AS name')).rows[0]?.name;
    if (!owner || untrustedRoles.includes(owner)) throw new SetupError('ADMIN_ROLE_REQUIRED');
    const otherJobs = await client.query('SELECT jobid FROM cron.job WHERE jobname=$1 AND username<>current_user', [SCHEDULER_JOB_NAME]);
    if (otherJobs.rows.length) throw new SetupError('SCHEDULER_OWNER_MISMATCH');
    const schemaOwner = await client.query("SELECT pg_get_userbyid(nspowner) AS name FROM pg_namespace WHERE nspname='pcw_scheduler'");
    if (schemaOwner.rows[0] && schemaOwner.rows[0].name !== owner) throw new SetupError('SCHEDULER_SCHEMA_OWNER_MISMATCH');
    stage = 'PRIVATE_SCHEMA';
    await client.query('CREATE SCHEMA IF NOT EXISTS pcw_scheduler');
    await client.query('REVOKE ALL ON SCHEMA pcw_scheduler FROM PUBLIC');
    for (const role of roles) await client.query(`REVOKE ALL ON SCHEMA pcw_scheduler FROM ${quoteIdentifier(role)}`);
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA pcw_scheduler REVOKE ALL ON TABLES FROM PUBLIC');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA pcw_scheduler REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC');
    await client.query('CREATE TABLE IF NOT EXISTS pcw_scheduler.requests(request_id bigint PRIMARY KEY,nonce text NOT NULL UNIQUE,requested_at timestamptz NOT NULL)');
    await client.query('ALTER TABLE pcw_scheduler.requests ENABLE ROW LEVEL SECURITY');
    await client.query('REVOKE ALL ON ALL TABLES IN SCHEMA pcw_scheduler FROM PUBLIC');
    stage = 'VAULT';
    await putSecret(client, secretNames[0], endpoint, 'Fixed R2 cron-forwarder URL; no query string or long-lived credential');
    await putSecret(client, secretNames[1], env.PCW_SCHEDULER_HMAC_KEY, 'R2 scheduler HMAC key; only signs one-minute fixed-purpose requests');
    stage = 'REGISTRATION';
    await client.query(schedulerFunctionSql(cryptoSchema));
    await client.query('REVOKE ALL ON FUNCTION pcw_scheduler.enqueue_tick() FROM PUBLIC');
    for (const role of roles) await client.query(`REVOKE ALL ON ALL TABLES IN SCHEMA pcw_scheduler FROM ${quoteIdentifier(role)}`);
    for (const role of roles) await client.query(`REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pcw_scheduler FROM ${quoteIdentifier(role)}`);
    await client.query('SELECT cron.schedule($1::text,$2::text,$3::text) AS job_id', [SCHEDULER_JOB_NAME, SCHEDULER_CRON, SCHEDULER_COMMAND]);
    await client.query('COMMIT'); inTransaction = false; applied = true;
    stage = 'VERIFICATION';
    return { ...await inspectSchedule(client), applied, extensions: installed.map(({ extname, extversion }) => ({ name: extname, version: extversion })) };
  } catch (error) {
    if (inTransaction) { try { await client.query('ROLLBACK'); } catch { /* No credentials or database error text in output. */ } }
    return {
      status: applied ? 'CONFIGURATION_UNVERIFIED' : 'NOT_CONFIGURED', applied, stage,
      code: error instanceof SetupError ? error.code : 'DATABASE_OPERATION_FAILED',
      ...(error instanceof SetupError && error.detail ? error.detail : {}),
      ...(!(error instanceof SetupError) && /^[A-Z0-9]{5}$/.test(error?.code || '') ? { databaseCode: error.code } : {}),
      delivery: 'NOT_VERIFIED',
    };
  } finally { if (client) { try { await client.end(); } catch { /* Never emit a connection URL or error object. */ } } }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: node scripts/r2/configure-scheduler.mjs [--check | --apply]\nDefault --check is read-only. --apply transactionally configures the private five-minute Supabase scheduler.\nUse server environment variables, never CLI arguments: PCW_SCHEDULER_DATABASE_URL (separate admin), PCW_SCHEDULER_EDGE_URL, PCW_SCHEDULER_HMAC_KEY.\nOptional PCW_SCHEDULER_DATABASE_CA preserves TLS certificate verification. Missing access reports NOT_CONFIGURED.');
  } else if (args.length > 1 || args.some(arg => !['--check', '--apply'].includes(arg))) {
    console.log(JSON.stringify({ status: 'NOT_CONFIGURED', code: 'ARGUMENTS_INVALID', applied: false })); process.exitCode = 2;
  } else {
    const result = await configureScheduler({ mode: args[0] === '--apply' ? 'apply' : 'check' });
    console.log(JSON.stringify(result));
    if (result.status !== 'CONFIGURED') process.exitCode = 2;
  }
}
