import { randomUUID } from 'node:crypto';
import { createAppJwt, createGitHubClient, GitHubError } from './github.js';

// GitHub.com currently retains delivery viewing/redelivery for THREE days. Seven days is GHES.
export const DELIVERY_RETENTION_MS = 3 * 86400000;
export const DELIVERY_GRACE_MS = 120000;
export const DELIVERY_MAX_ATTEMPTS = 5;
const OVERLAP_MS = 300000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const stamp = time => new Date(time).toISOString();
const millis = value => value instanceof Date ? value.getTime() : value ? Date.parse(value) : null;
const code = error => /^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code || '') ? error.code : 'RECOVERY_ERROR';
const positive = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const failure = (value, details = {}) => new GitHubError(value, value, details);
export const deliveryBackoffMs = attempt => Math.min(3600000, DELIVERY_GRACE_MS * 2 ** Math.max(0, attempt - 1));

function normalizeDelivery(item) {
  const id = positive(item?.id), installationId = item?.installation_id == null ? null : positive(item.installation_id);
  const repositoryId = item?.repository_id == null ? null : positive(item.repository_id);
  const time = Date.parse(item?.delivered_at);
  const statusCode = item?.status_code == null ? 0 : Number(item.status_code);
  if (!id || !UUID.test(item?.guid || '') || !Number.isFinite(time) || !/^[a-z][a-z0-9_]{0,63}$/.test(item?.event || '') || !Number.isInteger(statusCode) || statusCode < 0 || statusCode > 599 || (item?.installation_id != null && !installationId) || (item?.repository_id != null && !repositoryId)) throw failure('INVALID_DELIVERY_METADATA');
  return { delivery_id: id, guid: item.guid.toLowerCase(), installation_id: installationId, repository_id: repositoryId,
    event_type: item.event, action: typeof item.action === 'string' && /^[a-z_]{1,64}$/.test(item.action) ? item.action : null,
    delivered_at: stamp(time), redelivery: item.redelivery === true, status_code: statusCode,
    // A redirect cannot prove that the protected ingestion endpoint saved anything.
    provider_succeeded: statusCode >= 200 && statusCode < 300,
  };
}

function nextCursor(headers) {
  const links = String(headers?.get?.('link') || '').split(',').filter(part => /;\s*rel="next"(?:;|\s*$)/i.test(part));
  if (links.length > 1) throw failure('PAGINATION_INVALID');
  if (!links.length) return null;
  const target = links[0].match(/^\s*<([^>]+)>/); if (!target) throw failure('PAGINATION_INVALID');
  let url; try { url = new URL(target[1]); } catch { throw failure('PAGINATION_INVALID'); }
  if (url.origin !== 'https://api.github.com' || url.pathname !== '/app/hook/deliveries' || url.username || url.password || url.hash || [...url.searchParams.keys()].some(key => !['per_page', 'cursor'].includes(key))) throw failure('PAGINATION_INVALID');
  const cursor = url.searchParams.get('cursor');
  if (!cursor || cursor.length > 1024 || !/^[A-Za-z0-9._=+/-]+$/.test(cursor) || url.searchParams.getAll('cursor').length !== 1) throw failure('PAGINATION_INVALID');
  return cursor;
}

async function assertLease(q, appId, lease, at) {
  const result = await q.query('SELECT * FROM pcw.webhook_recovery_state WHERE app_id=$1 AND lease_token=$2 AND lease_until>$3::timestamptz FOR UPDATE', [appId, lease, at]);
  if (!result.rows.length) throw failure('RECOVERY_LEASE_LOST');
  return result.rows[0];
}

async function bindings(q, owner) {
  return (await q.query(`SELECT i.id,i.user_id,
    COALESCE((SELECT jsonb_agg(p.github_repo_id) FROM pcw.projects p WHERE p.installation_id=i.id AND p.user_id=i.user_id AND p.status<>'permission_revoked'),'[]') AS repositories
    FROM pcw.installations i JOIN pcw.users u ON u.id=i.user_id
    WHERE i.status='active' AND u.github_id=$1::bigint AND i.account_id=u.github_id`, [owner])).rows;
}

async function startScan(store, appId, lease, now) {
  const at = stamp(now), floor = now - DELIVERY_RETENTION_MS;
  return store.worker(async q => {
    let state = await assertLease(q, appId, lease, at);
    const previous = millis(state.watermark_at);
    // Retention advances while a scan is paused. Check before resuming too, not only when
    // a whole scan itself is three days old; an empty final page cannot prove the lost tail.
    const gapFrom = previous ?? (state.cursor ? millis(state.scan_since_at) : null);
    const gap = gapFrom != null && gapFrom < floor;
    if (gap && (!state.gap_to || millis(state.gap_to) < floor)) {
      await q.query('INSERT INTO pcw.audit(id,action,entity_id,detail) VALUES($1,$2,$3,$4::jsonb)', [randomUUID(), 'webhook.recovery.retention_gap', appId, JSON.stringify({ from: stamp(gapFrom), to: stamp(floor), providerRetentionDays: 3 })]);
      state = (await q.query(`UPDATE pcw.webhook_recovery_state SET retention_gap=true,
        gap_from=LEAST(COALESCE(gap_from,$3::timestamptz),$3::timestamptz),gap_to=$4,updated_at=$5
        WHERE app_id=$1 AND lease_token=$2 RETURNING *`, [appId, lease, stamp(gapFrom), stamp(floor), at])).rows[0];
    }
    if (state.cursor && millis(state.scan_started_at) > floor) return state;
    const lower = Math.max(previous == null ? floor : previous - OVERLAP_MS, floor);
    state = (await q.query(`UPDATE pcw.webhook_recovery_state SET cursor=NULL,seen_cursors='[]',scan_started_at=$3,scan_since_at=$4,scan_oldest_at=NULL,
      ordering_trusted=true,pages_seen=0,incomplete=true,retention_gap=retention_gap OR $5,
      gap_from=CASE WHEN $5 THEN LEAST(COALESCE(gap_from,$6::timestamptz),$6::timestamptz) ELSE gap_from END,
      gap_to=CASE WHEN $5 THEN $7::timestamptz ELSE gap_to END,updated_at=$3
      WHERE app_id=$1 AND lease_token=$2 RETURNING *`, [appId, lease, at, stamp(lower), Boolean(gap), gapFrom == null ? null : stamp(gapFrom), stamp(floor)])).rows[0];
    return state;
  });
}

async function persistPage(store, appId, owner, lease, records, cursor, observedAt) {
  return store.worker(async q => {
    const state = await assertLease(q, appId, lease, observedAt);
    const known = new Map((await bindings(q, owner)).map(binding => [String(binding.id), { userId: binding.user_id, repositories: new Set(binding.repositories.map(String)) }]));
    const scoped = records.filter(record => {
      const binding = known.get(String(record.installation_id));
      return binding && (record.repository_id == null || binding.repositories.has(String(record.repository_id))) && millis(record.delivered_at) >= millis(state.scan_since_at);
    }).map(record => ({ ...record, user_id: known.get(String(record.installation_id)).userId }));
    if (scoped.length) {
      const previous = await q.query('SELECT delivery_id,guid,installation_id,user_id,repository_id,event_type FROM pcw.webhook_delivery_attempts WHERE app_id=$1 AND delivery_id=ANY($2::bigint[])', [appId, scoped.map(record => record.delivery_id)]);
      const byId = new Map(scoped.map(record => [String(record.delivery_id), record]));
      for (const row of previous.rows) {
        const incoming = byId.get(String(row.delivery_id));
        if (incoming.guid !== row.guid || String(incoming.installation_id) !== String(row.installation_id) || incoming.user_id !== row.user_id || String(incoming.repository_id) !== String(row.repository_id) || incoming.event_type !== row.event_type) throw failure('DELIVERY_IDENTITY_CONFLICT');
      }
      await q.query(`INSERT INTO pcw.webhook_delivery_attempts(app_id,delivery_id,guid,user_id,installation_id,repository_id,event_type,action,delivered_at,redelivery,first_status_code,latest_status_code,provider_succeeded,first_observed_at,last_observed_at)
        SELECT $1,r.delivery_id,r.guid,r.user_id,r.installation_id,r.repository_id,r.event_type,r.action,r.delivered_at,r.redelivery,r.status_code,r.status_code,r.provider_succeeded,$3,$3
        FROM jsonb_to_recordset($2::jsonb) AS r(delivery_id bigint,guid text,user_id uuid,installation_id bigint,repository_id bigint,event_type text,action text,delivered_at timestamptz,redelivery boolean,status_code integer,provider_succeeded boolean)
        ON CONFLICT(app_id,delivery_id) DO UPDATE SET latest_status_code=EXCLUDED.latest_status_code,
          provider_succeeded=pcw.webhook_delivery_attempts.provider_succeeded OR EXCLUDED.provider_succeeded,last_observed_at=EXCLUDED.last_observed_at`, [appId, JSON.stringify(scoped), observedAt]);
      const failed = new Map();
      for (const record of scoped.filter(record => !record.provider_succeeded)) {
        const old = failed.get(record.guid);
        const first = old ? stamp(Math.min(millis(old.first_delivered_at), millis(record.delivered_at))) : record.delivered_at;
        if (!old || millis(record.delivered_at) > millis(old.delivered_at) || record.delivered_at === old.delivered_at && record.delivery_id > old.delivery_id) failed.set(record.guid, { ...record, first_delivered_at: first });
        else old.first_delivered_at = first;
      }
      if (failed.size) {
        const priorGroups = await q.query('SELECT guid,user_id,installation_id FROM pcw.webhook_recovery_groups WHERE app_id=$1 AND guid=ANY($2::text[])', [appId, [...failed.keys()]]);
        for (const row of priorGroups.rows) { const incoming = failed.get(row.guid); if (incoming.user_id !== row.user_id || String(incoming.installation_id) !== String(row.installation_id)) throw failure('DELIVERY_IDENTITY_CONFLICT'); }
        await q.query(`INSERT INTO pcw.webhook_recovery_groups(app_id,guid,user_id,installation_id,repository_id,event_type,first_delivered_at,latest_delivered_at,latest_delivery_id,next_attempt_at,first_observed_at,last_observed_at)
          SELECT $1,r.guid,r.user_id,r.installation_id,r.repository_id,r.event_type,r.first_delivered_at,r.delivered_at,r.delivery_id,r.delivered_at+interval '2 minutes',$3,$3
          FROM jsonb_to_recordset($2::jsonb) AS r(guid text,user_id uuid,installation_id bigint,repository_id bigint,event_type text,first_delivered_at timestamptz,delivered_at timestamptz,delivery_id bigint)
          ON CONFLICT(app_id,guid) DO UPDATE SET first_delivered_at=LEAST(pcw.webhook_recovery_groups.first_delivered_at,EXCLUDED.first_delivered_at),
            latest_delivery_id=CASE WHEN (EXCLUDED.latest_delivered_at,EXCLUDED.latest_delivery_id)>(pcw.webhook_recovery_groups.latest_delivered_at,pcw.webhook_recovery_groups.latest_delivery_id) THEN EXCLUDED.latest_delivery_id ELSE pcw.webhook_recovery_groups.latest_delivery_id END,
            latest_delivered_at=GREATEST(pcw.webhook_recovery_groups.latest_delivered_at,EXCLUDED.latest_delivered_at),
            next_attempt_at=GREATEST(pcw.webhook_recovery_groups.next_attempt_at,EXCLUDED.next_attempt_at),last_observed_at=EXCLUDED.last_observed_at`, [appId, JSON.stringify([...failed.values()]), observedAt]);
      }
    }
    const times = records.map(record => millis(record.delivered_at));
    const ordered = state.ordering_trusted && times.every((time, index) => index === 0 || times[index - 1] >= time) && (!times.length || !state.scan_oldest_at || times[0] <= millis(state.scan_oldest_at));
    const oldest = times.length ? Math.min(...times) : null;
    const boundary = ordered && oldest != null && oldest < millis(state.scan_since_at);
    const done = !cursor || boundary;
    const seen = state.seen_cursors || [];
    if (!done && (cursor === state.cursor || seen.includes(cursor) || seen.length >= 2048)) throw failure('PAGINATION_LOOP');
    return (await q.query(`UPDATE pcw.webhook_recovery_state SET cursor=$3,seen_cursors=$4::jsonb,scan_oldest_at=$5,ordering_trusted=$6,pages_seen=pages_seen+1,
      last_page_at=$7,poll_failures=0,next_poll_at=NULL,last_error=NULL,incomplete=NOT $8,
      last_successful_poll_at=CASE WHEN $8 THEN $7::timestamptz ELSE last_successful_poll_at END,
      watermark_at=CASE WHEN $8 THEN scan_started_at ELSE watermark_at END,
      scan_started_at=CASE WHEN $8 THEN NULL ELSE scan_started_at END,
      updated_at=$7 WHERE app_id=$1 AND lease_token=$2 RETURNING *`, [appId, lease, done ? null : cursor, JSON.stringify(done ? [] : [...seen, cursor]), oldest == null ? null : stamp(oldest), ordered, observedAt, done])).rows[0];
  });
}

async function reconcile(q, appId, owner, at) {
  await q.query(`UPDATE pcw.webhook_recovery_groups g SET provider_success_at=s.delivered_at FROM
    (SELECT guid,max(delivered_at) AS delivered_at FROM pcw.webhook_delivery_attempts WHERE app_id=$1 AND provider_succeeded GROUP BY guid) s
    WHERE g.app_id=$1 AND g.guid=s.guid AND (g.provider_success_at IS NULL OR g.provider_success_at<s.delivered_at)`, [appId]);
  await q.query(`UPDATE pcw.webhook_recovery_groups g SET status='recovered',recovered_at=COALESCE(g.recovered_at,$2::timestamptz),last_error=NULL
    WHERE g.app_id=$1 AND EXISTS(SELECT 1 FROM pcw.deliveries d WHERE d.id=g.guid AND d.installation_id=g.installation_id AND d.status IN ('accepted','unbound'))`, [appId, at]);
  await q.query(`UPDATE pcw.webhook_recovery_groups g SET status='revoked',last_error='INSTALLATION_OR_REPOSITORY_REVOKED'
    WHERE g.app_id=$1 AND g.status<>'recovered' AND NOT EXISTS(SELECT 1 FROM pcw.installations i JOIN pcw.users u ON u.id=i.user_id
      WHERE i.id=g.installation_id AND i.user_id=g.user_id AND i.status='active' AND u.github_id=$2::bigint AND i.account_id=u.github_id
      AND (g.repository_id IS NULL OR EXISTS(SELECT 1 FROM pcw.projects p WHERE p.installation_id=i.id AND p.user_id=g.user_id AND p.github_repo_id=g.repository_id AND p.status<>'permission_revoked')))`, [appId, owner]);
  await q.query(`UPDATE pcw.webhook_recovery_groups SET status='expired',last_error='PROVIDER_RETENTION_EXPIRED'
    WHERE app_id=$1 AND status NOT IN('recovered','revoked') AND latest_delivered_at<$2::timestamptz-interval '3 days'`, [appId, at]);
  await q.query(`UPDATE pcw.webhook_recovery_groups SET status='unconfirmed',last_error='PROVIDER_SUCCESS_WITHOUT_LOCAL_RECEIPT'
    WHERE app_id=$1 AND status NOT IN('recovered','revoked','expired') AND provider_success_at IS NOT NULL`, [appId]);
  await q.query(`UPDATE pcw.webhook_recovery_groups SET status='exhausted',last_error=COALESCE(last_error,'REDELIVERY_LIMIT_REACHED')
    WHERE app_id=$1 AND status IN('pending','requested') AND attempts>=5 AND next_attempt_at<=$2::timestamptz`, [appId, at]);
  await q.query(`UPDATE pcw.webhook_recovery_groups SET status='pending' WHERE app_id=$1 AND status='requested' AND attempts<5 AND next_attempt_at<=$2::timestamptz`, [appId, at]);
  await q.query(`UPDATE pcw.webhook_redelivery_requests SET outcome='unknown',finished_at=$2,error_code='REQUEST_RESULT_UNCONFIRMED'
    WHERE app_id=$1 AND outcome='reserved' AND requested_at<$2::timestamptz-interval '2 minutes'`, [appId, at]);
}

async function reserveRedelivery(store, appId, owner, lease, now) {
  const at = stamp(now);
  return store.worker(async q => {
    const state = await assertLease(q, appId, lease, at);
    await reconcile(q, appId, owner, at);
    // Finish the complete bounded scan first, so a later page's successful attempt prevents a false retry.
    if (state.incomplete || !state.last_successful_poll_at || state.next_poll_at && millis(state.next_poll_at) > now) return null;
    const selected = await q.query(`SELECT * FROM pcw.webhook_recovery_groups WHERE app_id=$1 AND status='pending' AND attempts<5
      AND next_attempt_at<=$2::timestamptz AND latest_delivered_at<=$2::timestamptz-interval '2 minutes'
      ORDER BY next_attempt_at,latest_delivered_at FOR UPDATE SKIP LOCKED LIMIT 1`, [appId, at]);
    const group = selected.rows[0]; if (!group) return null;
    const attempt = group.attempts + 1, retryAt = stamp(now + deliveryBackoffMs(attempt));
    await q.query(`INSERT INTO pcw.webhook_redelivery_requests(app_id,guid,attempt_no,user_id,installation_id,delivery_id,lease_token,requested_at,retry_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [appId, group.guid, attempt, group.user_id, group.installation_id, group.latest_delivery_id, lease, at, retryAt]);
    await q.query(`UPDATE pcw.webhook_recovery_groups SET attempts=$3,status='requested',last_requested_at=$4,next_attempt_at=$5,last_error=NULL WHERE app_id=$1 AND guid=$2`, [appId, group.guid, attempt, at, retryAt]);
    await q.query('INSERT INTO pcw.audit(id,user_id,action,entity_id,detail) VALUES($1,$2,$3,$4,$5::jsonb)', [randomUUID(), group.user_id, 'webhook.redelivery.reserved', group.guid, JSON.stringify({ deliveryId: String(group.latest_delivery_id), attempt })]);
    return { ...group, attempt, retryAt };
  });
}

async function finishRedelivery(store, appId, lease, group, error, now) {
  const at = stamp(now), retry = Math.max(millis(group.retryAt), millis(error?.retryAt) || 0);
  await store.worker(async q => {
    await assertLease(q, appId, lease, at);
    const uncertain = ['TIMEOUT', 'NETWORK_ERROR', 'INVALID_RESPONSE'].includes(error?.code);
    const expired = error?.code === 'NOT_FOUND';
    await q.query(`UPDATE pcw.webhook_redelivery_requests SET outcome=$5,finished_at=$6,retry_at=$7,error_code=$8
      WHERE app_id=$1 AND guid=$2 AND attempt_no=$3 AND lease_token=$4 AND outcome='reserved'`, [appId, group.guid, group.attempt, lease, error ? uncertain ? 'unknown' : 'failed' : 'accepted', at, stamp(retry), error ? code(error) : null]);
    await q.query(`UPDATE pcw.webhook_recovery_groups SET status=CASE WHEN status='recovered' THEN status WHEN $3 THEN 'expired' ELSE 'requested' END,next_attempt_at=$4,last_error=$5 WHERE app_id=$1 AND guid=$2`, [appId, group.guid, expired, stamp(retry), error ? code(error) : null]);
    if (error) await q.query('UPDATE pcw.webhook_recovery_state SET last_error=$3 WHERE app_id=$1 AND lease_token=$2', [appId, lease, code(error)]);
    if (error?.code === 'RATE_LIMITED') await q.query('UPDATE pcw.webhook_recovery_state SET next_poll_at=$3,last_error=$4 WHERE app_id=$1 AND lease_token=$2', [appId, lease, stamp(retry), code(error)]);
  });
}

async function pollFailed(store, appId, lease, error, now) {
  await store.worker(async q => {
    const state = await assertLease(q, appId, lease, stamp(now));
    const retry = Math.max(now + Math.min(900000, 60000 * 2 ** Math.min(state.poll_failures, 4)), millis(error?.retryAt) || 0);
    const invalidCursor = Boolean(state.cursor) && [400, 422].includes(error?.status);
    await q.query(`UPDATE pcw.webhook_recovery_state SET poll_failures=poll_failures+1,next_poll_at=$3,incomplete=true,last_error=$4,
      cursor=CASE WHEN $5 THEN NULL ELSE cursor END,scan_started_at=CASE WHEN $5 THEN NULL ELSE scan_started_at END,updated_at=$6
      WHERE app_id=$1 AND lease_token=$2`, [appId, lease, stamp(retry), invalidCursor ? 'PAGINATION_CURSOR_EXPIRED' : code(error), invalidCursor, stamp(now)]);
  });
}

async function conclude(store, appId, owner, lease, now, extra = {}) {
  return store.worker(async q => {
    const state = (await q.query('SELECT * FROM pcw.webhook_recovery_state WHERE app_id=$1 AND lease_token=$2 AND lease_until>$3::timestamptz FOR UPDATE', [appId, lease, stamp(now)])).rows[0];
    // A stopped/expired worker must not reconcile rows or replace a newer worker's heartbeat.
    if (!state) return { status: 'lease_lost', incomplete: true, requested: extra.requested || 0, attempted: extra.attempted || 0, scannedPages: extra.scannedPages || 0 };
    await reconcile(q, appId, owner, stamp(now));
    await q.query('UPDATE pcw.webhook_recovery_state SET lease_token=NULL,lease_until=NULL,updated_at=$3 WHERE app_id=$1 AND lease_token=$2', [appId, lease, stamp(now)]);
    const counts = (await q.query(`SELECT count(*) FILTER(WHERE status IN('pending','requested'))::integer AS pending,
      count(*) FILTER(WHERE status IN('exhausted','expired'))::integer AS exhausted,
      count(*) FILTER(WHERE status='unconfirmed')::integer AS unconfirmed,count(*) FILTER(WHERE status='revoked')::integer AS revoked,
      count(*) FILTER(WHERE status='recovered')::integer AS recovered FROM pcw.webhook_recovery_groups WHERE app_id=$1`, [appId])).rows[0];
    const detail = { ...extra, lastSuccessfulPollAt: state?.last_successful_poll_at ? stamp(millis(state.last_successful_poll_at)) : null,
      watermarkAt: state?.watermark_at ? stamp(millis(state.watermark_at)) : null, lastPageAt: state?.last_page_at ? stamp(millis(state.last_page_at)) : null,
      ...counts, pollIncomplete: state?.incomplete !== false,
      incomplete: state?.incomplete !== false || state.retention_gap || counts.pending > 0 || counts.exhausted > 0 || counts.unconfirmed > 0 || counts.revoked > 0,
      retentionGap: state?.retention_gap || false, gapFrom: state?.gap_from || null, gapTo: state?.gap_to || null,
      providerRetentionDays: 3, lastError: state?.last_error || null, retryAt: state?.next_poll_at || null,
    };
    await q.query('INSERT INTO pcw.heartbeats(name,last_at,detail) VALUES($1,$2,$3::jsonb) ON CONFLICT(name) DO UPDATE SET last_at=$2,detail=$3::jsonb', ['webhook_recovery', stamp(now), JSON.stringify(detail)]);
    return detail;
  });
}

export async function recoverWebhookDeliveries({ store, config, fetchImpl, maxMillis = 15000, maxRedeliveries = 2, maxPages = 3, now = Date.now } = {}) {
  const appId = String(config?.appId || ''), owner = String(config?.ownerGithubId || '');
  const clock = () => typeof now === 'function' ? now() : now;
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(appId) || !config?.privateKey || !/^[1-9][0-9]{0,18}$/.test(owner) || BigInt(owner) > 9223372036854775807n) {
    const result = { status: 'not_configured', lastSuccessfulPollAt: null, pending: 0, exhausted: 0, incomplete: true, lastError: 'GITHUB_APP_REQUIRED', providerRetentionDays: 3 };
    if (store?.heartbeat) await store.heartbeat('webhook_recovery', result);
    return result;
  }
  if (!Number.isFinite(maxMillis) || maxMillis < 1 || maxMillis > 15000 || !Number.isInteger(maxRedeliveries) || maxRedeliveries < 0 || maxRedeliveries > 5 || !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 20) throw failure('RECOVERY_LIMIT_INVALID');
  const deadline = Date.now() + maxMillis, lease = randomUUID(), at = stamp(clock());
  const state = await store.worker(async q => {
    await q.query('INSERT INTO pcw.webhook_recovery_state(app_id,created_at,updated_at) VALUES($1,$2,$2) ON CONFLICT(app_id) DO NOTHING', [appId, at]);
    return (await q.query(`UPDATE pcw.webhook_recovery_state SET lease_token=$2,lease_until=$3::timestamptz+interval '60 seconds'
      WHERE app_id=$1 AND (lease_until IS NULL OR lease_until<=$3::timestamptz) RETURNING *`, [appId, lease, at])).rows[0];
  });
  if (!state) return { status: 'busy', incomplete: true, requested: 0, attempted: 0 };
  let requested = 0, attempted = 0, scannedPages = 0, status = 'ok';
  const remaining = () => Math.min(4000, deadline - Date.now() - 1000);
  try {
    if (state.next_poll_at && millis(state.next_poll_at) > clock()) return await conclude(store, appId, owner, lease, clock(), { status: 'retry_wait', requested, attempted, scannedPages });
    const bound = await store.worker(q => bindings(q, owner));
    if (!bound.length) {
      await store.worker(q => q.query("UPDATE pcw.webhook_recovery_state SET incomplete=true,last_error='INSTALLATION_REQUIRED' WHERE app_id=$1 AND lease_token=$2", [appId, lease]));
      return await conclude(store, appId, owner, lease, clock(), { status: 'not_configured', requested, attempted, scannedPages });
    }
    const token = createAppJwt({ appId, privateKey: config.privateKey, now: clock });
    const github = createGitHubClient({ appId, privateKey: config.privateKey, ...(fetchImpl ? { fetchImpl } : {}), now: clock });
    let current = await startScan(store, appId, lease, clock());
    while (scannedPages < maxPages && remaining() > 100) {
      const path = `/app/hook/deliveries?per_page=100${current.cursor ? `&cursor=${encodeURIComponent(current.cursor)}` : ''}`;
      const result = await github.request(path, { token, timeoutMs: remaining() });
      if (!Array.isArray(result.data) || result.data.length > 100) throw failure('INVALID_DELIVERY_RESPONSE');
      current = await persistPage(store, appId, owner, lease, result.data.map(normalizeDelivery), nextCursor(result.headers), stamp(clock()));
      scannedPages++; if (!current.incomplete) break;
    }
    if (current.incomplete) status = 'partial';
    while (!current.incomplete && attempted < maxRedeliveries && remaining() > 100) {
      const group = await reserveRedelivery(store, appId, owner, lease, clock()); if (!group) break;
      attempted++;
      let error = null;
      try {
        const response = await github.request(`/app/hook/deliveries/${group.latest_delivery_id}/attempts`, { token, method: 'POST', timeoutMs: Math.max(1, remaining()) });
        if (response.status !== 202) throw failure('REDELIVERY_ACK_INVALID');
        requested++;
      } catch (caught) { error = caught; }
      await finishRedelivery(store, appId, lease, group, error, clock());
      if (error) status = 'partial';
      if (error && ['RATE_LIMITED', 'CREDENTIAL_REVOKED', 'FORBIDDEN', 'REDIRECT_REFUSED'].includes(error.code)) { status = 'retry_wait'; await pollFailed(store, appId, lease, error, clock()); break; }
    }
  } catch (error) {
    status = 'error';
    if (error?.code !== 'RECOVERY_LEASE_LOST') await pollFailed(store, appId, lease, error, clock());
  }
  return conclude(store, appId, owner, lease, clock(), { status, requested, attempted, scannedPages });
}
