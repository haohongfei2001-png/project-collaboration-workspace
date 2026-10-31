import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { Store } from '../server/store.js';
import { recoverWebhookDeliveries, DELIVERY_RETENTION_MS, deliveryBackoffMs } from '../server/recovery.js';

// Only the GitHub API transport is a test double. Store transactions, role scope, RLS and migrations execute in PostgreSQL.
let db, store, migration1, migration2, sequence = 0;
const keys = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
before(async () => {
  migration1 = await readFile(new URL('../db/001_workspace.sql', import.meta.url), 'utf8');
  migration2 = await readFile(new URL('../db/002_delivery_recovery.sql', import.meta.url), 'utf8');
  db = process.env.PCW_TEST_DATABASE_URL ? new pg.Pool({ connectionString: process.env.PCW_TEST_DATABASE_URL, max: 6 }) : new PGlite();
  if (db.exec) { await db.exec(migration1); await db.exec(migration2); }
  else { await db.query(migration1); await db.query(migration2); }
  store = new Store(db);
});
after(async () => { if (db.close) await db.close(); else await db.end(); });
const sql = (text, values = []) => store.worker(q => q.query(text, values));
const iso = time => new Date(time).toISOString();

async function fixture() {
  sequence++;
  const value = { userId: randomUUID(), projectId: randomUUID(), installationId: 800000 + sequence, repositoryId: 900000 + sequence, guid: randomUUID(), time: Date.now(), calls: [], pages: new Map(), posts: [] };
  const owner = 600000 + sequence;
  value.config = { appId: String(700000 + sequence), privateKey: keys.privateKey, ownerGithubId: String(owner) };
  value.repo = `user-${owner}/test-project`;
  await store.worker(async q => {
    await q.query('INSERT INTO pcw.users(id,github_id,login) VALUES($1,$2,$3)', [value.userId, owner, `user-${owner}`]);
    await q.query('INSERT INTO pcw.installations(id,user_id,account_id,account_login) VALUES($1,$2,$3,$4)', [value.installationId, value.userId, owner, `user-${owner}`]);
    await q.query('INSERT INTO pcw.projects(id,user_id,installation_id,github_repo_id,repo,name) VALUES($1,$2,$3,$4,$5,$6)', [value.projectId, value.userId, value.installationId, value.repositoryId, value.repo, 'Recovery test']);
  });
  value.pages.set('', { data: [] });
  value.fetchImpl = async (input, init) => {
    const url = new URL(input); value.calls.push({ path: url.pathname, cursor: url.searchParams.get('cursor'), method: init.method });
    assert.equal(url.origin, 'https://api.github.com'); assert.equal(init.redirect, 'manual');
    const jwt = init.headers.Authorization.slice(7).split('.'); assert.equal(JSON.parse(Buffer.from(jwt[1], 'base64url')).iss, value.config.appId);
    if (init.method === 'GET' && url.pathname === '/app/hook/deliveries') {
      const custom = await value.onGet?.(url, init); if (custom) return custom;
      const page = value.pages.get(url.searchParams.get('cursor') || ''); assert.ok(page, 'Unexpected pagination cursor');
      return new Response(JSON.stringify(page.data), { headers: { 'content-type': 'application/json', ...(page.next ? { link: `<https://api.github.com/app/hook/deliveries?per_page=100&cursor=${encodeURIComponent(page.next)}>; rel="next"` } : {}) } });
    }
    if (init.method === 'POST' && /^\/app\/hook\/deliveries\/\d+\/attempts$/.test(url.pathname)) {
      value.posts.push(Number(url.pathname.split('/')[4]));
      return await value.onPost?.(url, init) || new Response(null, { status: 202 });
    }
    throw new Error('Unexpected GitHub operation');
  };
  value.run = options => recoverWebhookDeliveries({ store, config: value.config, fetchImpl: value.fetchImpl, now: () => value.time, ...options });
  return value;
}

function delivery(f, id, changes = {}) {
  return { id, guid: f.guid, delivered_at: iso(f.time - 180000), redelivery: false, status: 'failed', status_code: 500, event: 'push', action: null, installation_id: f.installationId, repository_id: f.repositoryId, ...changes };
}
async function group(f) { return (await sql('SELECT * FROM pcw.webhook_recovery_groups WHERE app_id=$1 AND guid=$2', [f.config.appId, f.guid])).rows[0]; }
async function state(f) { return (await sql('SELECT * FROM pcw.webhook_recovery_state WHERE app_id=$1', [f.config.appId])).rows[0]; }
async function receipt(f) {
  await store.ingestDelivery({ id: f.guid, event: 'push', installationId: f.installationId, payload: { installation: { id: f.installationId }, repository: { id: f.repositoryId, full_name: f.repo } }, bodyHash: 'a'.repeat(64), evidence: [], repo: f.repo });
  // Do not leave synthetic sync work for another test file sharing an explicitly configured PostgreSQL test database.
  await sql('DELETE FROM pcw.jobs WHERE project_id=$1', [f.projectId]);
}

test('only authorized bound failures are reserved before POST; 202 remains pending until the real Store saves the delivery', async () => {
  const f = await fixture();
  f.pages.set('', { data: [delivery(f, 1), delivery(f, 2, { guid: randomUUID(), installation_id: 42 }), delivery(f, 3, { guid: randomUUID(), repository_id: 43 }), delivery(f, 4, { guid: randomUUID(), delivered_at: iso(f.time - 30000) })] });
  f.onPost = async () => {
    const reserved = (await sql('SELECT * FROM pcw.webhook_redelivery_requests WHERE app_id=$1 AND guid=$2', [f.config.appId, f.guid])).rows;
    assert.equal(reserved.length, 1); assert.equal(reserved[0].outcome, 'reserved');
    assert.equal((await group(f)).attempts, 1);
  };
  const first = await f.run();
  assert.equal(first.requested, 1); assert.equal(first.recovered, 0); assert.equal(first.pending, 2); assert.equal(first.incomplete, true);
  assert.deepEqual(f.posts, [1]); assert.equal((await group(f)).status, 'requested');
  assert.equal((await sql('SELECT count(*)::integer AS n FROM pcw.webhook_delivery_attempts WHERE app_id=$1', [f.config.appId])).rows[0].n, 2);
  await receipt(f);
  const second = await f.run(); assert.equal(second.recovered, 1); assert.equal(second.requested, 0); assert.equal((await group(f)).status, 'recovered');
});

test('pagination persists every page before advancing, waits for later successful attempts, and uses the original scan start as watermark', async () => {
  const f = await fixture(); const started = f.time;
  f.pages.set('', { data: [delivery(f, 11)], next: 'page-two' });
  f.pages.set('page-two', { data: [delivery(f, 12, { redelivery: true, delivered_at: iso(f.time - 60000), status: 'OK', status_code: 200 })] });
  let result = await f.run({ maxPages: 1 });
  assert.equal(result.pollIncomplete, true); assert.equal(result.lastSuccessfulPollAt, null); assert.equal(result.requested, 0); assert.equal((await state(f)).cursor, 'page-two');
  f.time += 30000;
  result = await f.run({ maxPages: 1 });
  assert.equal(result.pollIncomplete, false); assert.equal(result.unconfirmed, 1); assert.equal(result.recovered, 0); assert.equal(result.requested, 0);
  assert.equal(Date.parse(result.watermarkAt), started); assert.equal(Date.parse(result.lastSuccessfulPollAt), f.time);
  assert.equal((await state(f)).ordering_trusted, false); // Deliberately late-arriving, newer attempt on page two.
  await receipt(f); f.pages.set('', { data: [] });
  assert.equal((await f.run()).recovered, 1); assert.equal(f.posts.length, 0);
});

test('a persistent lease prevents concurrent polls and repeated polls do not duplicate GUID attempts or immediate redelivery', async () => {
  const f = await fixture(); f.pages.set('', { data: [delivery(f, 21)] });
  let unlock, announce; const waiting = new Promise(resolve => { announce = resolve; }); const blocked = new Promise(resolve => { unlock = resolve; });
  f.onGet = async () => { announce(); await blocked; };
  const running = f.run(); await waiting;
  const concurrent = await f.run(); assert.equal(concurrent.status, 'busy'); assert.equal(f.calls.length, 1);
  unlock(); assert.equal((await running).requested, 1);
  f.onGet = null;
  const again = await f.run(); assert.equal(again.requested, 0); assert.equal(f.posts.length, 1);
  assert.equal((await sql('SELECT count(*)::integer AS n FROM pcw.webhook_delivery_attempts WHERE app_id=$1', [f.config.appId])).rows[0].n, 1);
  assert.equal((await sql('SELECT count(*)::integer AS n FROM pcw.webhook_redelivery_requests WHERE app_id=$1', [f.config.appId])).rows[0].n, 1);
});

test('failed deliveries use persisted exponential backoff and stop after five attempts while keeping the complete request history', async () => {
  const f = await fixture(); f.pages.set('', { data: [delivery(f, 31)] });
  for (let attempt = 1; attempt <= 5; attempt++) {
    const result = await f.run(); assert.equal(result.requested, 1);
    const current = await group(f); assert.equal(current.attempts, attempt);
    assert.equal(new Date(current.next_attempt_at).getTime() - f.time, deliveryBackoffMs(attempt));
    const retry = await f.run(); assert.equal(retry.requested, 0);
    f.time += deliveryBackoffMs(attempt) + 1;
  }
  const exhausted = await f.run(); assert.equal(exhausted.exhausted, 1); assert.equal(exhausted.requested, 0); assert.equal(exhausted.incomplete, true);
  assert.equal(f.posts.length, 5); assert.equal((await group(f)).status, 'exhausted');
  const history = (await sql('SELECT attempt_no,outcome FROM pcw.webhook_redelivery_requests WHERE app_id=$1 ORDER BY attempt_no', [f.config.appId])).rows;
  assert.deepEqual(history.map(row => row.attempt_no), [1, 2, 3, 4, 5]); assert.ok(history.every(row => row.outcome === 'accepted'));
});

test('a rate-limited continuation preserves its cursor and watermark and makes no call before Retry-After', async () => {
  const f = await fixture(); const started = f.time;
  f.pages.set('', { data: [delivery(f, 41)], next: 'resume-safe' }); f.pages.set('resume-safe', { data: [] });
  await f.run({ maxPages: 1 });
  f.onGet = async url => url.searchParams.has('cursor') ? new Response('{}', { status: 429, headers: { 'Retry-After': '120' } }) : null;
  const limited = await f.run(); assert.equal(limited.lastError, 'RATE_LIMITED'); assert.equal(limited.lastSuccessfulPollAt, null);
  assert.equal((await state(f)).cursor, 'resume-safe');
  const callCount = f.calls.length; assert.equal((await f.run()).status, 'retry_wait'); assert.equal(f.calls.length, callCount);
  f.onGet = null; f.time += 121000;
  const resumed = await f.run({ maxRedeliveries: 0 }); assert.equal(resumed.pollIncomplete, false); assert.equal(Date.parse(resumed.watermarkAt), started);
});

test('an unknown POST result keeps the committed reservation and cannot be described as successful delivery', async () => {
  const f = await fixture(); f.pages.set('', { data: [delivery(f, 51)] });
  f.onPost = async () => { throw new Error('connection failed with a private diagnostic'); };
  const result = await f.run(); assert.equal(result.requested, 0); assert.equal(result.attempted, 1); assert.equal(result.pending, 1); assert.equal(result.recovered, 0);
  assert.equal(result.lastError, 'NETWORK_ERROR'); assert.equal(result.incomplete, true); assert.equal(JSON.stringify(result).includes('private diagnostic'), false);
  const saved = (await sql('SELECT * FROM pcw.webhook_redelivery_requests WHERE app_id=$1', [f.config.appId])).rows[0];
  assert.equal(saved.outcome, 'unknown'); assert.equal(saved.error_code, 'NETWORK_ERROR');
  await f.run(); assert.equal(f.posts.length, 1);
});

test('revoked installation or repository access stops recovery before a new POST reservation', async () => {
  for (const revoke of ['installation', 'repository']) {
    const f = await fixture(); f.pages.set('', { data: [delivery(f, 61)] });
    await f.run({ maxRedeliveries: 0 });
    if (revoke === 'installation') await sql("UPDATE pcw.installations SET status='revoked' WHERE id=$1", [f.installationId]);
    else await sql("UPDATE pcw.projects SET status='permission_revoked' WHERE id=$1", [f.projectId]);
    const result = await f.run(); assert.equal(result.revoked, 1); assert.equal(result.requested, 0); assert.equal(f.posts.length, 0);
    assert.equal((await group(f)).attempts, 0);
  }
});

test('GitHub.com three-day retention loss stays explicit and durable after a later successful poll', async () => {
  assert.equal(DELIVERY_RETENTION_MS, 3 * 86400000);
  const f = await fixture(); f.pages.set('', { data: [delivery(f, 71)] });
  await f.run({ maxRedeliveries: 0 }); f.time += 4 * 86400000; f.pages.set('', { data: [] });
  const result = await f.run(); assert.equal(result.retentionGap, true); assert.equal(result.exhausted, 1); assert.equal(result.providerRetentionDays, 3); assert.equal(result.incomplete, true);
  assert.ok(result.lastSuccessfulPollAt); assert.equal((await group(f)).status, 'expired'); assert.equal(f.posts.length, 0);
  const gaps = await sql("SELECT detail FROM pcw.audit WHERE entity_id=$1 AND action='webhook.recovery.retention_gap'", [f.config.appId]);
  assert.equal(gaps.rows.length, 1); assert.ok(Date.parse(gaps.rows[0].detail.to) > Date.parse(gaps.rows[0].detail.from));
  f.time += 300000; assert.equal((await f.run()).retentionGap, true);
});

test('failed storage rolls back the retry reservation and no HTTP POST occurs before a durable reservation', async () => {
  const f = await fixture(); f.pages.set('', { data: [delivery(f, 81)] });
  let injected = false;
  const faultyStore = { heartbeat: store.heartbeat.bind(store), worker: operation => store.worker(q => operation({ query: async (text, params) => {
    if (!injected && text.includes('INSERT INTO pcw.webhook_redelivery_requests')) { injected = true; const error = new Error('storage unavailable'); error.code = 'STORAGE_UNAVAILABLE'; throw error; }
    return q.query(text, params);
  } })) };
  const result = await f.run({ store: faultyStore }); assert.equal(result.status, 'error'); assert.equal(result.requested, 0); assert.equal(f.posts.length, 0);
  assert.equal((await group(f)).attempts, 0); assert.equal((await sql('SELECT count(*)::integer AS n FROM pcw.webhook_redelivery_requests WHERE app_id=$1', [f.config.appId])).rows[0].n, 0);
  f.time += 61000; assert.equal((await f.run()).requested, 1);
});

test('expired worker leases and crash-left reservations recover without reusing the same attempt number', async () => {
  const f = await fixture(); f.pages.set('', { data: [delivery(f, 91)] }); await f.run({ maxRedeliveries: 0 });
  const crashedLease = randomUUID();
  await store.worker(async q => {
    await q.query("UPDATE pcw.webhook_recovery_groups SET status='requested',attempts=1,last_requested_at=$3,next_attempt_at=$4 WHERE app_id=$1 AND guid=$2", [f.config.appId, f.guid, iso(f.time - 180000), iso(f.time - 1)]);
    await q.query('INSERT INTO pcw.webhook_redelivery_requests(app_id,guid,attempt_no,user_id,installation_id,delivery_id,lease_token,requested_at,retry_at) VALUES($1,$2,1,$3,$4,91,$5,$6,$7)', [f.config.appId, f.guid, f.userId, f.installationId, crashedLease, iso(f.time - 180000), iso(f.time - 1)]);
    await q.query('UPDATE pcw.webhook_recovery_state SET lease_token=$2,lease_until=$3 WHERE app_id=$1', [f.config.appId, crashedLease, iso(f.time - 1)]);
  });
  const result = await f.run(); assert.equal(result.requested, 1); assert.equal((await group(f)).attempts, 2);
  const history = (await sql('SELECT attempt_no,outcome FROM pcw.webhook_redelivery_requests WHERE app_id=$1 ORDER BY attempt_no', [f.config.appId])).rows;
  assert.deepEqual(history, [{ attempt_no: 1, outcome: 'unknown' }, { attempt_no: 2, outcome: 'accepted' }]);
});

test('hostile pagination and invalid payload identity cannot change the API host or falsely advance a successful poll', async () => {
  const f = await fixture();
  f.onGet = async () => new Response(JSON.stringify([delivery(f, 101)]), { headers: { link: '<https://evil.test/app/hook/deliveries?cursor=next>; rel="next"' } });
  let result = await f.run(); assert.equal(result.lastError, 'PAGINATION_INVALID'); assert.equal(result.lastSuccessfulPollAt, null); assert.equal(f.posts.length, 0);
  f.time += 61000; f.onGet = async () => new Response(JSON.stringify([delivery(f, '../unsafe')]));
  result = await f.run(); assert.equal(result.lastError, 'INVALID_DELIVERY_METADATA'); assert.equal(result.lastSuccessfulPollAt, null); assert.equal(f.posts.length, 0);
});

test('the migration is repeatable and all four ledgers remain FORCE RLS worker-only with no deletion permission', async () => {
  if (db.exec) await db.exec(migration2); else await db.query(migration2);
  const f = await fixture(); f.pages.set('', { data: [delivery(f, 111)] }); await f.run({ maxRedeliveries: 0 });
  const tables = await db.query("SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,has_table_privilege('pcw_app',c.oid,'DELETE') AS can_delete FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='pcw' AND c.relname=ANY($1::text[])", [['webhook_recovery_state', 'webhook_recovery_groups', 'webhook_delivery_attempts', 'webhook_redelivery_requests']]);
  assert.equal(tables.rows.length, 4); assert.ok(tables.rows.every(row => row.relrowsecurity && row.relforcerowsecurity && !row.can_delete));
  assert.equal((await store.tx({ userId: f.userId }, q => q.query('SELECT * FROM pcw.webhook_recovery_groups WHERE app_id=$1', [f.config.appId]))).rows.length, 0);
  await assert.rejects(() => store.tx({ userId: f.userId }, q => q.query('INSERT INTO pcw.webhook_recovery_state(app_id) VALUES($1)', [`forged-${randomUUID()}`])), { code: '42501' });
});

test('the provider retention floor crossing an unfinished cursor cannot turn an empty last page into gap-free coverage', async () => {
  const f = await fixture();
  f.time = Date.parse('2026-10-31T12:05:00Z');
  await sql(`INSERT INTO pcw.webhook_recovery_state(app_id,cursor,scan_started_at,scan_since_at,scan_oldest_at,watermark_at,last_successful_poll_at)
    VALUES($1,'next-page','2026-10-31T12:00:00Z','2026-10-28T12:00:00Z','2026-10-30T00:00:00Z','2026-10-28T12:01:00Z','2026-10-28T12:02:00Z')`, [f.config.appId]);
  f.pages.set('next-page', { data: [] });
  const result = await f.run();
  assert.equal(f.calls[0].cursor, 'next-page'); assert.equal(result.pollIncomplete, false);
  assert.equal(result.retentionGap, true); assert.equal(result.incomplete, true);
  assert.equal(new Date(result.gapFrom).toISOString(), '2026-10-28T12:01:00.000Z');
  assert.equal(new Date(result.gapTo).toISOString(), '2026-10-28T12:05:00.000Z');
  assert.equal(result.watermarkAt, '2026-10-31T12:00:00.000Z');
});

test('a late worker that has lost its lease cannot persist its page or overwrite a newer successful heartbeat', async () => {
  const f = await fixture(); f.pages.set('', { data: [] });
  let unlock, announce, first = true;
  const started = new Promise(resolve => { announce = resolve; }); const delayed = new Promise(resolve => { unlock = resolve; });
  f.onGet = async () => { if (first) { first = false; announce(); await delayed; return new Response(JSON.stringify([delivery(f, 121)])); } };
  const oldRun = f.run(); await started;
  f.time += 61000;
  const current = await f.run(); assert.equal(current.status, 'ok'); assert.equal(current.pending, 0);
  const heartbeat = (await sql("SELECT detail FROM pcw.heartbeats WHERE name='webhook_recovery'")).rows[0].detail;
  unlock(); assert.equal((await oldRun).status, 'lease_lost');
  assert.deepEqual((await sql("SELECT detail FROM pcw.heartbeats WHERE name='webhook_recovery'")).rows[0].detail, heartbeat);
  assert.equal((await sql('SELECT count(*)::integer AS n FROM pcw.webhook_delivery_attempts WHERE app_id=$1', [f.config.appId])).rows[0].n, 0);
  assert.equal(f.posts.length, 0);
});
