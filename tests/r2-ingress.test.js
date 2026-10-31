import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { createGitHubIngress, createCronForwarder, previewOrigin, INGRESS_TIMEOUT_MS, INGRESS_MAX_BODY_BYTES } from '../server/ingress.js';
import { configureScheduler, schedulerDatabaseOptions, SCHEDULER_COMMAND, SCHEDULER_CRON } from '../scripts/r2/configure-scheduler.mjs';

const env = {
  PCW_PREVIEW_ORIGIN: 'https://pcw-r2-example.vercel.app',
  GITHUB_WEBHOOK_SECRET: "It's a Secret to Everybody",
  VERCEL_AUTOMATION_BYPASS_SECRET: 'test-only-bypass-secret-123456789',
};
const body = Buffer.from('{"action":"opened","text":"保留原始字节 🔒","installation":{"id":12}}\n');
const ingressUrl = 'https://project-ref.supabase.co/functions/v1/github-ingress';
const signature = bytes => `sha256=${createHmac('sha256', env.GITHUB_WEBHOOK_SECRET).update(bytes).digest('hex')}`;
function request(bytes = body, extra = {}) {
  return new Request(extra.url || ingressUrl, {
    method: extra.method || 'POST',
    headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature(bytes), 'x-github-event': 'pull_request', 'x-github-delivery': '03cc50bb-71a0-47ad-b74b-d341f480dfd1', ...extra.headers },
    ...(!['GET', 'HEAD'].includes(extra.method) ? { body: extra.stream || bytes, duplex: 'half' } : {}),
  });
}
const accepted = status => new Response('{"accepted":true,"privateBackendDetail":"must-not-leak"}', { status: status || 202, headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'private=value', 'Location': 'https://untrusted.example/' } });

test('portable ingress verifies independent HMAC and forwards exact Unicode bytes only to the fixed backend', async () => {
  let captured;
  const handler = createGitHubIngress({ env, fetchImpl: async (url, options) => { captured = { url, options }; return accepted(); } });
  const result = await handler(request());
  assert.equal(result.status, 202);
  assert.deepEqual(await result.json(), { accepted: true });
  assert.equal(captured.url, `${env.PCW_PREVIEW_ORIGIN}/api/webhooks/github`);
  assert.deepEqual(Buffer.from(captured.options.body), body);
  assert.equal(captured.options.redirect, 'error');
  assert.equal(captured.options.credentials, 'omit');
  assert.equal(captured.options.headers['x-hub-signature-256'], signature(body));
  assert.equal(captured.options.headers['x-github-delivery'], '03cc50bb-71a0-47ad-b74b-d341f480dfd1');
  assert.equal(captured.options.headers['x-vercel-protection-bypass'], env.VERCEL_AUTOMATION_BYPASS_SECRET);
  assert.equal(result.headers.get('set-cookie'), null);
  assert.equal(result.headers.get('location'), null);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('GitHub published HMAC test vector is accepted without reserializing raw bytes', async () => {
  const bytes = Buffer.from('Hello, World!'); let called = false;
  const handler = createGitHubIngress({ env, fetchImpl: async (_, init) => { called = true; assert.deepEqual(Buffer.from(init.body), bytes); return accepted(200); } });
  const result = await handler(request(bytes, { headers: { 'x-hub-signature-256': 'sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17' } }));
  assert.equal(result.status, 200); assert.equal(called, true);
});

test('modified bytes, invalid signatures and ambiguous event/delivery headers never reach the protected deployment', async () => {
  let calls = 0;
  const handler = createGitHubIngress({ env, fetchImpl: async () => { calls++; return accepted(); } });
  const modified = Buffer.concat([body, Buffer.from(' ')]);
  assert.equal((await handler(request(modified, { headers: { 'x-hub-signature-256': signature(body) } }))).status, 401);
  for (const headers of [
    { 'x-hub-signature-256': 'sha1=unused' },
    { 'x-hub-signature-256': `${signature(body)}, ${signature(body)}` },
    { 'x-github-delivery': 'abc' },
    { 'x-github-delivery': 'valid-delivery, second-delivery' },
    { 'x-github-event': 'pull_request, push' },
    { 'x-github-event': '../api/cron' },
    { 'content-type': 'application/x-www-form-urlencoded' },
    { 'content-encoding': 'gzip' },
  ]) assert.equal((await handler(request(body, { headers }))).status, 400);
  assert.equal(calls, 0);
});

test('public ingress rejects GET/HEAD and arbitrary paths or query targets without disclosing configuration', async () => {
  let calls = 0;
  const handler = createGitHubIngress({ env, fetchImpl: async () => { calls++; return accepted(); } });
  for (const method of ['GET', 'HEAD', 'PUT', 'OPTIONS', 'DELETE']) {
    const result = await handler(request(body, { method }));
    assert.equal(result.status, 405); assert.equal(result.headers.get('allow'), 'POST');
    assert.equal((await result.text()).includes(env.VERCEL_AUTOMATION_BYPASS_SECRET), false);
  }
  for (const url of [`${ingressUrl}?target=https://evil.test`, `${ingressUrl}?x-vercel-protection-bypass=oops`, 'https://project-ref.supabase.co/functions/v1/github-ingress/api/cron', 'https://project-ref.supabase.co/api/webhooks/github']) {
    assert.equal((await handler(request(body, { url }))).status, 404);
  }
  assert.equal(calls, 0);
});

test('unsafe origins and missing server secrets fail closed without any credentialed request', async () => {
  let calls = 0;
  for (const origin of ['http://pcw.vercel.app', 'https://pcw.vercel.app.evil.test', 'https://evil.test', 'https://127.0.0.1', 'https://pcw.vercel.app:444', 'https://u:p@pcw.vercel.app', 'https://pcw.vercel.app/path', 'https://pcw.vercel.app?target=a', 'https://pcw.vercel.app#private', 'https://pcw.vercel.app\\evil', 'https://vercel.app', `https://${'x'.repeat(64)}.vercel.app`]) {
    assert.throws(() => previewOrigin(origin));
    const handler = createGitHubIngress({ env: { ...env, PCW_PREVIEW_ORIGIN: origin }, fetchImpl: async () => { calls++; return accepted(); } });
    const response = await handler(request()); assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { accepted: false, code: 'INGRESS_NOT_CONFIGURED' });
  }
  for (const name of Object.keys(env)) {
    const handler = createGitHubIngress({ env: { ...env, [name]: '' }, fetchImpl: async () => { calls++; return accepted(); } });
    assert.equal((await handler(request())).status, 503);
  }
  assert.equal(calls, 0);
});

test('body limits apply to streamed bytes and dishonest content-length, before signing or forwarding', async () => {
  let calls = 0, cancelled = false;
  const handler = createGitHubIngress({ env, maxBodyBytes: 64, fetchImpl: async () => { calls++; return accepted(); } });
  assert.equal((await handler(request(body, { headers: { 'content-length': '5000000' } }))).status, 413);
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(40)); controller.enqueue(new Uint8Array(40)); }, cancel() { cancelled = true; } });
  assert.equal((await handler(request(body, { stream, headers: { 'content-length': '20' } }))).status, 413);
  assert.equal(cancelled, true);
  for (const declared of ['1, 100', '-1', 'invalid']) assert.equal((await handler(request(body, { headers: { 'content-length': declared } }))).status, 400);
  const short = Buffer.from('{}');
  assert.equal((await handler(request(short, { headers: { 'content-length': '1' } }))).status, 400);
  assert.equal(calls, 0);
  assert.equal(INGRESS_MAX_BODY_BYTES, 2 * 1024 * 1024);
});

test('caller authorization/cookies/forwarding headers cannot override server-only bypass or fixed target', async () => {
  let headers;
  const handler = createGitHubIngress({ env, fetchImpl: async (_, options) => { headers = new Headers(options.headers); return accepted(); } });
  assert.equal((await handler(request(body, { headers: {
    authorization: 'Bearer attacker', cookie: 'session=attacker', 'x-forwarded-host': 'evil.test', 'x-original-url': '/api/cron',
    'x-vercel-protection-bypass': 'attacker', 'x-vercel-set-bypass-cookie': 'true',
  } }))).status, 202);
  assert.equal(headers.get('x-vercel-protection-bypass'), env.VERCEL_AUTOMATION_BYPASS_SECRET);
  for (const name of ['authorization', 'cookie', 'x-forwarded-host', 'x-original-url', 'x-vercel-set-bypass-cookie']) assert.equal(headers.get(name), null);
  assert.equal([...headers].length, 5);
});

test('login HTML, rejected ingestion, redirects and upstream errors cannot become a successful acknowledgement', async () => {
  for (const upstream of [
    () => new Response('login', { status: 200, headers: { 'content-type': 'text/html' } }),
    () => new Response('{"accepted":false}', { status: 200, headers: { 'content-type': 'application/json' } }),
    () => new Response('invalid json', { status: 200, headers: { 'content-type': 'application/json' } }),
    () => new Response('', { status: 302, headers: { location: 'https://evil.test/' } }),
    () => new Response('private upstream data', { status: 401 }),
    () => new Response('private upstream data', { status: 429 }),
    () => new Response('private upstream data', { status: 500 }),
  ]) {
    const handler = createGitHubIngress({ env, fetchImpl: async () => upstream() });
    const result = await handler(request());
    assert.equal(result.status, 502);
    assert.deepEqual(await result.json(), { accepted: false, code: 'UPSTREAM_UNAVAILABLE' });
  }
});

test('a real local HTTP redirect is never followed with bypass credentials', async t => {
  let attackerRequests = 0, backendHeaders;
  const attacker = createServer((_, res) => { attackerRequests++; res.end('must not reach'); });
  const upstream = createServer((req, res) => { backendHeaders = req.headers; res.writeHead(307, { location: `http://127.0.0.1:${attacker.address().port}/steal` }); res.end(); });
  attacker.listen(0, '127.0.0.1'); await once(attacker, 'listening');
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  t.after(() => { attacker.closeAllConnections(); attacker.close(); upstream.closeAllConnections(); upstream.close(); });
  // Only transport is redirected to a local test server. The production URL is still asserted.
  const handler = createGitHubIngress({ env, fetchImpl: (url, options) => {
    assert.equal(url, `${env.PCW_PREVIEW_ORIGIN}/api/webhooks/github`);
    return fetch(`http://127.0.0.1:${upstream.address().port}/api/webhooks/github`, options);
  } });
  assert.equal((await handler(request())).status, 502);
  assert.equal(backendHeaders['x-vercel-protection-bypass'], env.VERCEL_AUTOMATION_BYPASS_SECRET);
  assert.equal(attackerRequests, 0);
});

test('the total deadline bounds slow request bodies, unresponsive upstreams and response bodies', async () => {
  assert.ok(INGRESS_TIMEOUT_MS < 8000);
  for (const kind of ['request', 'fetch', 'response']) {
    let signal;
    const handler = createGitHubIngress({ env, timeoutMs: 30, fetchImpl: async (_, options) => {
      signal = options.signal;
      if (kind === 'fetch') return new Promise(() => {});
      if (kind === 'response') return new Response(new ReadableStream({}), { status: 202, headers: { 'content-type': 'application/json' } });
      return accepted();
    } });
    const started = Date.now();
    const result = await handler(request(body, kind === 'request' ? { stream: new ReadableStream({}) } : {}));
    assert.equal(result.status, 504); assert.ok(Date.now() - started < 1000);
    if (signal) assert.equal(signal.aborted, true);
  }
});

test('duplicate delivery IDs are forwarded unchanged so the durable backend decides deduplication', async () => {
  const deliveries = [];
  const handler = createGitHubIngress({ env, fetchImpl: async (_, options) => { deliveries.push(options.headers['x-github-delivery']); return accepted(deliveries.length === 1 ? 202 : 200); } });
  assert.equal((await handler(request())).status, 202);
  assert.equal((await handler(request())).status, 200);
  assert.equal(deliveries.length, 2); assert.equal(deliveries[0], deliveries[1]);
});

test('the HMAC-only Edge entry uses exactly the portable module exercised by Node tests', async () => {
  const config = await readFile(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  const entry = await readFile(new URL('../supabase/functions/github-ingress/index.ts', import.meta.url), 'utf8');
  assert.match(config, /\[functions\.github-ingress\]\s+verify_jwt\s*=\s*false/);
  assert.match(entry, /import \{ createGitHubIngress \} from '\.\.\/_shared\/github-ingress\.js'/);
  assert.doesNotMatch(entry, /console\.|SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL/);
});

const schedulerEnv = { ...env, PCW_SCHEDULER_HMAC_KEY: '12'.repeat(32), CRON_SECRET: 'test-only-workspace-cron-secret-123456789' };
const clock = Date.parse('2026-10-31T20:00:00Z');
const nonce = '6ce49410-6285-45a3-a3aa-e1f71e416bb5';
const cronUrl = 'https://abcdefghijklmnopqrst.supabase.co/functions/v1/cron-forwarder';
function cronRequest({ timestamp = String(Math.floor(clock / 1000)), key = schedulerEnv.PCW_SCHEDULER_HMAC_KEY, purpose = 'pcw-r2-cron-v1', extra = {}, url = cronUrl, payload = '{}', method = 'POST' } = {}) {
  const signed = `${purpose}\nPOST\n/functions/v1/cron-forwarder\n${timestamp}\n${nonce}`;
  return new Request(url, { method,
    headers: { 'Content-Type': 'application/json', 'x-pcw-scheduler-timestamp': timestamp, 'x-pcw-scheduler-nonce': nonce,
      'x-pcw-scheduler-signature': `v1=${createHmac('sha256', Buffer.from(key, 'hex')).update(signed).digest('hex')}`, ...extra },
    ...(!['GET', 'HEAD'].includes(method) ? { body: payload } : {}),
  });
}
const cronAccepted = () => new Response('{"queued":1,"processed":2,"outcomes":[{"status":"succeeded"},{"status":"failed","privateDetail":"never-forward"}]}', { headers: { 'Content-Type': 'application/json' } });

test('cron bridge verifies a purpose-bound HMAC, injects long-lived credentials only at its fixed destination, and strips private results', async () => {
  let captured;
  const handler = createCronForwarder({ env: schedulerEnv, now: () => clock, fetchImpl: async (url, init) => { captured = { url, init }; return cronAccepted(); } });
  const result = await handler(cronRequest({ extra: { authorization: 'Bearer attacker', 'x-vercel-protection-bypass': 'attacker', 'x-vercel-set-bypass-cookie': 'true' } }));
  assert.equal(result.status, 200); assert.deepEqual(await result.json(), { accepted: true, processed: 2, failed: 1 });
  assert.equal(captured.url, `${env.PCW_PREVIEW_ORIGIN}/api/cron`);
  assert.equal(captured.init.redirect, 'error'); assert.equal(captured.init.credentials, 'omit');
  assert.equal(captured.init.headers.Authorization, `Bearer ${schedulerEnv.CRON_SECRET}`);
  assert.equal(captured.init.headers['x-vercel-protection-bypass'], env.VERCEL_AUTOMATION_BYPASS_SECRET);
  assert.equal(captured.init.headers['x-pcw-scheduler-nonce'], nonce);
  assert.equal(captured.init.body, '{}');
  assert.equal(captured.init.headers['x-vercel-set-bypass-cookie'], undefined);
  assert.equal(captured.init.headers['x-pcw-scheduler-signature'], undefined);
});

test('expired, future, altered-purpose and foreign-key scheduler signatures are rejected before the backend is contacted', async () => {
  let calls = 0;
  const handler = createCronForwarder({ env: schedulerEnv, now: () => clock, fetchImpl: async () => { calls++; return cronAccepted(); } });
  for (const options of [
    { timestamp: String(clock / 1000 - 61) }, { timestamp: String(clock / 1000 + 6) },
    { key: '34'.repeat(32) }, { purpose: 'approve-or-merge' },
    { extra: { 'x-pcw-scheduler-signature': `v1=${'0'.repeat(64)}` } },
  ]) assert.equal((await handler(cronRequest(options))).status, 401);
  for (const extra of [ { 'x-pcw-scheduler-timestamp': 'NaN' }, { 'x-pcw-scheduler-nonce': 'a,b' }, { 'x-pcw-scheduler-signature': 'v2=wrong' } ]) assert.equal((await handler(cronRequest({ extra }))).status, 400);
  assert.equal(calls, 0);
});

test('cron bridge has no caller-selected operation, target, query argument or GET path', async () => {
  let calls = 0;
  const handler = createCronForwarder({ env: schedulerEnv, now: () => clock, fetchImpl: async () => { calls++; return cronAccepted(); } });
  for (const payload of ['{"target":"https://evil.test"}', '{"operation":"merge"}', '[]', 'null']) assert.equal((await handler(cronRequest({ payload }))).status, 400);
  for (const url of [`${cronUrl}?target=https://evil.test`, `${cronUrl}/api/cron`, cronUrl.replace('cron-forwarder', 'github-ingress')]) assert.equal((await handler(cronRequest({ url }))).status, 404);
  assert.equal((await handler(cronRequest({ method: 'GET' }))).status, 405);
  assert.equal(calls, 0);
});

test('cron bridge refuses redirect/login acknowledgements and has a bounded total upstream wait', async () => {
  for (const upstream of [() => new Response('', { status: 302, headers: { Location: 'https://evil.test/' } }), () => new Response('SSO login'), () => new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } })]) {
    const handler = createCronForwarder({ env: schedulerEnv, now: () => clock, fetchImpl: async () => upstream() });
    assert.equal((await handler(cronRequest())).status, 502);
  }
  let signal;
  const handler = createCronForwarder({ env: schedulerEnv, now: () => clock, timeoutMs: 30, fetchImpl: async (_, init) => { signal = init.signal; return new Promise(() => {}); } });
  assert.equal((await handler(cronRequest())).status, 504); assert.equal(signal.aborted, true);
});

test('scheduler requires an explicit separate admin connection and never downgrades TLS or logs connection secrets', async () => {
  let constructed = false;
  assert.deepEqual(await configureScheduler({ env: {}, clientFactory: () => { constructed = true; } }), { status: 'NOT_CONFIGURED', code: 'ENV_REQUIRED', missing: ['PCW_SCHEDULER_DATABASE_URL'], applied: false });
  assert.equal(constructed, false);
  const adminUrl = 'postgresql://postgres:private-db-password@db.abcdefghijklmnopqrst.supabase.co:5432/postgres?sslmode=require';
  const options = schedulerDatabaseOptions({ PCW_SCHEDULER_DATABASE_URL: adminUrl });
  assert.equal(options.ssl.rejectUnauthorized, true); assert.equal(options.connectionString, undefined);
  assert.throws(() => schedulerDatabaseOptions({ PCW_SCHEDULER_DATABASE_URL: adminUrl, DATABASE_URL: adminUrl }), /SEPARATE_ADMIN/);
  assert.throws(() => schedulerDatabaseOptions({ PCW_SCHEDULER_DATABASE_URL: adminUrl.replace('sslmode=require', 'sslmode=disable') }), /OPTIONS_UNSAFE/);
  assert.throws(() => schedulerDatabaseOptions({ PCW_SCHEDULER_DATABASE_URL: adminUrl.replace('postgres:', 'pcw_runtime:') }), /ADMIN_ROLE_REQUIRED/);
  const result = await configureScheduler({ env: { PCW_SCHEDULER_DATABASE_URL: adminUrl }, clientFactory: () => ({ connect: async () => { throw new Error(`Cannot connect ${adminUrl}`); }, end: async () => {} }) });
  assert.equal(result.status, 'NOT_CONFIGURED'); assert.equal(result.applied, false); assert.equal(JSON.stringify(result).includes('private-db-password'), false);
});

async function schedulerDatabaseFixture(t) {
  // Real WASM PostgreSQL and pgcrypto; Vault, pg_net and pg_cron below are explicit local test doubles.
  // This proves SQL execution/HMAC/transaction/ACL behavior, not a deployed Supabase scheduler.
  const db = new PGlite({ extensions: { pgcrypto } }); t.after(() => db.close());
  await db.exec(`CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE pcw_app; CREATE ROLE pcw_runtime; GRANT pcw_app TO pcw_runtime;
    CREATE SCHEMA vault; CREATE TABLE vault.secrets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text UNIQUE,secret text,description text);
    CREATE VIEW vault.decrypted_secrets AS SELECT id,name,secret AS decrypted_secret FROM vault.secrets;
    CREATE FUNCTION vault.create_secret(text,text,text) RETURNS uuid LANGUAGE sql AS 'INSERT INTO vault.secrets(secret,name,description) VALUES($1,$2,$3) RETURNING id';
    CREATE FUNCTION vault.update_secret(uuid,text,text,text) RETURNS void LANGUAGE sql AS 'UPDATE vault.secrets SET secret=$2,name=$3,description=$4 WHERE id=$1';
    CREATE SCHEMA net; CREATE TABLE net.http_request_queue(id bigserial PRIMARY KEY,url text,body jsonb,headers jsonb,timeout_milliseconds integer);
    CREATE TABLE net._http_response(id bigint,status_code integer,timed_out boolean,error_msg text,created timestamptz DEFAULT now());
    CREATE FUNCTION net.http_post(url text,body jsonb DEFAULT '{}'::jsonb,params jsonb DEFAULT '{}'::jsonb,headers jsonb DEFAULT '{}'::jsonb,timeout_milliseconds integer DEFAULT 2000) RETURNS bigint
      LANGUAGE sql AS 'INSERT INTO net.http_request_queue(url,body,headers,timeout_milliseconds) VALUES($1,$2,$4,$5) RETURNING id';
    CREATE SCHEMA cron; CREATE TABLE cron.job(jobid bigserial PRIMARY KEY,jobname text UNIQUE,schedule text,command text,active boolean DEFAULT true,username text DEFAULT current_user);
    CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS 'INSERT INTO cron.job(jobname,schedule,command) VALUES($1,$2,$3) ON CONFLICT(jobname) DO UPDATE SET schedule=$2,command=$3,active=true RETURNING jobid';`);
  const calls = []; let inject;
  const client = { connect: async () => {}, end: async () => {}, query: async (sql, params) => {
    calls.push({ sql, params });
    if (inject) await inject(sql, params);
    if (sql.startsWith('SELECT e.extname')) return { rows: ['pg_cron', 'pg_net', 'supabase_vault', 'pgcrypto'].map(extname => ({ extname, extversion: extname === 'pgcrypto' ? '1.3' : 'LOCAL_TEST_DOUBLE', schema: extname === 'pgcrypto' ? 'extensions' : 'pg_catalog' })) };
    return db.query(sql, params);
  } };
  return { db, calls, clientFactory: () => client, setInjection: value => { inject = value; }, config: {
    PCW_SCHEDULER_DATABASE_URL: 'postgresql://postgres:test-admin@db.abcdefghijklmnopqrst.supabase.co:5432/postgres',
    PCW_SCHEDULER_EDGE_URL: cronUrl, PCW_SCHEDULER_HMAC_KEY: schedulerEnv.PCW_SCHEDULER_HMAC_KEY,
  } };
}

test('actual PostgreSQL SQL and pgcrypto interoperate with Edge verification; scheduled SQL and queued requests contain no long-lived Vercel/cron credentials', async t => {
  const f = await schedulerDatabaseFixture(t);
  const result = await configureScheduler({ env: f.config, mode: 'apply', clientFactory: f.clientFactory });
  assert.equal(result.status, 'CONFIGURED', JSON.stringify(result)); assert.equal(result.applied, true); assert.equal(result.delivery, 'NOT_VERIFIED');
  assert.equal((await f.db.query('SELECT count(*)::integer AS n FROM cron.job')).rows[0].n, 1);
  assert.equal((await f.db.query('SELECT command FROM cron.job')).rows[0].command, SCHEDULER_COMMAND);
  const requestId = (await f.db.query('SELECT pcw_scheduler.enqueue_tick() AS id')).rows[0].id;
  const queued = (await f.db.query('SELECT * FROM net.http_request_queue WHERE id=$1', [requestId])).rows[0];
  assert.equal(queued.url, cronUrl); assert.deepEqual(queued.body, {}); assert.equal(queued.timeout_milliseconds, 120000);
  assert.equal(Object.keys(queued.headers).length, 4);
  assert.equal(queued.headers.Authorization, undefined); assert.equal(queued.headers['x-vercel-protection-bypass'], undefined);
  const signed = `pcw-r2-cron-v1\nPOST\n/functions/v1/cron-forwarder\n${queued.headers['x-pcw-scheduler-timestamp']}\n${queued.headers['x-pcw-scheduler-nonce']}`;
  assert.equal(queued.headers['x-pcw-scheduler-signature'], `v1=${createHmac('sha256', Buffer.from(schedulerEnv.PCW_SCHEDULER_HMAC_KEY, 'hex')).update(signed).digest('hex')}`);
  const handler = createCronForwarder({ env: schedulerEnv, fetchImpl: async () => cronAccepted() });
  const response = await handler(new Request(queued.url, { method: 'POST', headers: queued.headers, body: '{}' }));
  assert.equal(response.status, 200);
  const allSql = f.calls.map(call => call.sql).join('\n');
  assert.equal(allSql.includes(schedulerEnv.PCW_SCHEDULER_HMAC_KEY), false);
  assert.equal(allSql.includes(schedulerEnv.CRON_SECRET), false);
  assert.equal(allSql.includes(env.VERCEL_AUTOMATION_BYPASS_SECRET), false);
  assert.ok(f.calls.some(call => call.params?.includes(schedulerEnv.PCW_SCHEDULER_HMAC_KEY)));
  assert.ok(f.calls.findIndex(call => call.sql.includes("set_config('log_parameter_max_length'")) < f.calls.findIndex(call => call.sql.includes('vault.create_secret')));
  await f.db.query('INSERT INTO net._http_response(id,status_code,timed_out) VALUES($1,200,false)', [requestId]);
  const checked = await configureScheduler({ env: f.config, clientFactory: f.clientFactory });
  assert.equal(checked.delivery, 'HTTP_200_OBSERVED'); assert.equal(checked.productAcceptance, 'NOT_ASSESSED');
});

test('scheduler configuration is repeatable, keeps its schema private, and fully rolls back a failed credential rotation', async t => {
  const f = await schedulerDatabaseFixture(t);
  for (let i = 0; i < 2; i++) assert.equal((await configureScheduler({ env: f.config, mode: 'apply', clientFactory: f.clientFactory })).status, 'CONFIGURED');
  assert.equal((await f.db.query('SELECT count(*)::integer AS n FROM cron.job')).rows[0].n, 1);
  assert.equal((await f.db.query('SELECT count(*)::integer AS n FROM vault.secrets')).rows[0].n, 2);
  await f.db.exec('SET ROLE pcw_runtime');
  await assert.rejects(() => f.db.query('SELECT * FROM pcw_scheduler.requests'), { code: '42501' });
  await assert.rejects(() => f.db.query('SELECT pcw_scheduler.enqueue_tick()'), { code: '42501' });
  await assert.rejects(() => f.db.query('SELECT * FROM vault.decrypted_secrets'), { code: '42501' });
  await f.db.exec('RESET ROLE');
  f.setInjection(async sql => { if (sql.startsWith('SELECT cron.schedule')) throw new Error('injected failure with a sensitive message that must not reach stdout'); });
  const failed = await configureScheduler({ env: { ...f.config, PCW_SCHEDULER_HMAC_KEY: '34'.repeat(32) }, mode: 'apply', clientFactory: f.clientFactory });
  assert.equal(failed.status, 'NOT_CONFIGURED'); assert.equal(failed.applied, false); assert.equal(failed.stage, 'REGISTRATION');
  assert.equal(JSON.stringify(failed).includes('sensitive'), false);
  assert.ok(f.calls.some(call => call.sql === 'ROLLBACK'));
  assert.equal((await f.db.query("SELECT secret FROM vault.secrets WHERE name='pcw_r2_scheduler_hmac_key'")).rows[0].secret, schedulerEnv.PCW_SCHEDULER_HMAC_KEY);
  assert.equal((await f.db.query('SELECT schedule FROM cron.job')).rows[0].schedule, SCHEDULER_CRON);
});

test('scheduler stops before storing credentials if existing Vault/queue permissions or log settings are unsafe', async t => {
  const f = await schedulerDatabaseFixture(t);
  await f.db.exec('GRANT SELECT ON vault.decrypted_secrets TO PUBLIC');
  let result = await configureScheduler({ env: f.config, mode: 'apply', clientFactory: f.clientFactory });
  assert.equal(result.code, 'SECRET_STORAGE_PERMISSIONS_UNSAFE'); assert.equal(result.applied, false);
  assert.equal((await f.db.query('SELECT count(*)::integer AS n FROM vault.secrets')).rows[0].n, 0);
  await f.db.exec('REVOKE SELECT ON vault.decrypted_secrets FROM PUBLIC');
  f.setInjection(async sql => { if (sql.includes("set_config('log_parameter_max_length'")) { const error = new Error('permission denied'); error.code = '42501'; throw error; } });
  result = await configureScheduler({ env: f.config, mode: 'apply', clientFactory: f.clientFactory });
  assert.equal(result.code, 'DATABASE_LOG_REDACTION_REQUIRED');
  assert.equal((await f.db.query('SELECT count(*)::integer AS n FROM vault.secrets')).rows[0].n, 0);
});
