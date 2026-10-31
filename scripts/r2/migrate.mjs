import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
import { postgresConnectionOptions } from '../../server/postgres-config.js';

const url = process.env.PCW_MIGRATION_DATABASE_URL;
if (!url) {
  console.error('Set PCW_MIGRATION_DATABASE_URL in the server environment; do not paste it into a command argument.');
  process.exit(1);
}
let client;
try {
  client = new pg.Client({ ...postgresConnectionOptions(url, { ca: process.env.DATABASE_CA || '' }), connectionTimeoutMillis: 10000, statement_timeout: 30000 });
  await client.connect();
  const directory = new URL('../../db/', import.meta.url);
  const files = (await readdir(directory)).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  if (!files.length) throw Object.assign(new Error(), { code: 'MIGRATIONS_REQUIRED' });
  const migrations = [];
  for (const file of files) {
    await client.query(await readFile(new URL(file, directory), 'utf8'));
    migrations.push(file.replace(/\.sql$/, ''));
  }
  const tables = await client.query("SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='pcw' AND c.relkind IN('r','p')");
  if (!tables.rows.length || tables.rows.some(table => !table.relrowsecurity || !table.relforcerowsecurity)) throw Object.assign(new Error(), { code: 'FORCED_RLS_REQUIRED' });
  const role = await client.query("SELECT rolsuper,rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname='pcw_app'");
  if (role.rows.length !== 1 || role.rows[0].rolsuper || role.rows[0].rolbypassrls || role.rows[0].rolcanlogin) throw Object.assign(new Error(), { code: 'RUNTIME_ROLE_UNSAFE' });
  for (const table of ['evidence', 'audit', 'resolutions']) {
    const permission = await client.query("SELECT has_table_privilege('pcw_app',$1,'UPDATE') AS can_update,has_table_privilege('pcw_app',$1,'DELETE') AS can_delete", ['pcw.' + table]);
    if (permission.rows[0]?.can_update || permission.rows[0]?.can_delete) throw Object.assign(new Error(), { code: 'IMMUTABLE_RECORD_PERMISSION_UNSAFE' });
  }
  console.log(JSON.stringify({ migrations, rlsTables: tables.rows.length, forcedRls: true, runtimeRole: 'pcw_app', runtimeRoleVerified: true, immutableRecordsVerified: true, status: 'applied' }));
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', code: /^[A-Z0-9_]{1,80}$/.test(error.code || '') ? error.code : 'DATABASE_ERROR' }));
  process.exitCode = 1;
} finally {
  if (client) await client.end().catch(() => {});
}
