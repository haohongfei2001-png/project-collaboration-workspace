import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, generateKeyPairSync, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { GitHubError, createAppJwt, createGitHubClient, verifyWebhookSignature, createOAuthStart, exchangeOAuthCode, normalizeWebhook, collectEvidence } from '../server/github.js';

const A = 'a'.repeat(40), B = 'b'.repeat(40), T = '2026-10-31T12:00:00.000Z';
const keys = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const response = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const run = attempt => ({ id: 7, name: 'Certification', workflow_id: 3, head_sha: B, head_branch: 'work', event: 'pull_request', status: 'completed', conclusion: attempt === 1 ? 'failure' : 'success', run_attempt: attempt, created_at: '2026-10-30T12:00:00Z', updated_at: attempt === 1 ? '2026-10-30T12:20:00Z' : T, html_url: 'https://github.com/u/r/actions/runs/7' });
const ownerComment = (id = 900) => ({ id, body: 'Project 仍 BLOCKED。须先获得用户对这一个增量窗口的授权。', user: { login: 'u' }, author_association: 'OWNER', issue_url: 'https://api.github.com/repos/u/r/issues/16', html_url: `https://github.com/u/r/pull/16#issuecomment-${id}`, created_at: '2026-10-30T10:00:00Z', updated_at: T });
const pull = { number: 16, title: 'Fix project', body: 'CI passed, real device NOT_RUN.', state: 'open', draft: true, head: { sha: B, ref: 'work' }, base: { sha: A, ref: 'main' }, changed_files: 1, user: { login: 'u' }, author_association: 'OWNER', created_at: '2026-10-20T00:00:00Z', updated_at: T, html_url: 'https://github.com/u/r/pull/16' };

function fixture({ intercept } = {}) {
  const calls = [];
  async function fetchImpl(input, options) {
    const url = new URL(input), p = url.pathname, page = Number(url.searchParams.get('page') || 1); calls.push({ url, options });
    const special = await intercept?.(url, options, calls); if (special) return special;
    if (p === '/repos/u/r') return response({ id: 11, full_name: 'u/r', default_branch: 'main', private: true, updated_at: T, pushed_at: T, html_url: 'https://github.com/u/r' });
    if (p === '/repos/u/r/commits/main') return response({ sha: A, commit: { message: 'Main update', committer: { date: T } }, files: [{ filename: 'src/main.js', patch: '+actual change', additions: 1, deletions: 0 }], parents: [] });
    if (p === '/repos/u/r/pulls/16') return response(pull);
    if (p === '/repos/u/r/pulls') return response([]); // Selected PR deliberately absent from the recent window.
    if (p === '/repos/u/r/issues') return response([{ id: 701, number: 3, title: 'Actual acceptance incomplete', body: 'Real device remains NOT_RUN.', state: 'open', user: { login: 'u' }, author_association: 'OWNER', created_at: T, updated_at: T, html_url: 'https://github.com/u/r/issues/3' }]);
    if (p === '/repos/u/r/issues/comments') return page === 1 ? response([ownerComment()], 200, { link: '<https://api.github.com/repos/u/r/issues/comments?page=2&per_page=50>; rel="next"' }) : response([ownerComment(901)]);
    if (p === '/repos/u/r/pulls/comments' || p === '/repos/u/r/pulls/16/comments') return response([]);
    if (p === '/repos/u/r/issues/16/comments') return response([ownerComment()]);
    if (p === '/repos/u/r/pulls/16/reviews') return response([{ id: 333, body: 'Scoped source review passed.', state: 'APPROVED', commit_id: B, submitted_at: T, user: { login: 'reviewer' }, author_association: 'COLLABORATOR', html_url: 'https://github.com/u/r/pull/16#pullrequestreview-333' }]);
    if (p === `/repos/u/r/compare/${A}...${B}`) return response({ files: [{ filename: 'src/host.js', sha: 'c'.repeat(40), patch: '+bounded fix', status: 'modified', additions: 1, deletions: 0 }] });
    if (p === '/repos/u/r/commits') return response([{ sha: A, commit: { message: 'Main update', committer: { date: T } } }]);
    if (p === '/repos/u/r/actions/runs') return response({ total_count: 1, workflow_runs: [run(2)] });
    if (p === '/repos/u/r/actions/runs/7/attempts/1') return response(run(1));
    if (p.endsWith('/attempts/1/jobs')) return response({ total_count: 1, jobs: [{ id: 10, run_id: 7, head_sha: B, name: 'unit', status: 'completed', conclusion: 'failure', started_at: '2026-10-30T12:00:00Z', completed_at: '2026-10-30T12:20:00Z', steps: [{ number: 1, name: 'assertions', status: 'completed', conclusion: 'failure' }] }] });
    if (p.endsWith('/attempts/2/jobs')) return response({ total_count: 2, jobs: [{ id: 12, run_id: 7, head_sha: B, name: 'unit', status: 'completed', conclusion: 'success', completed_at: T, steps: [{ number: 1, name: 'assertions', conclusion: 'success' }] }, { id: 13, run_id: 7, head_sha: B, name: 'Full native certification', status: 'completed', conclusion: 'skipped', completed_at: T, steps: [] }] });
    if (p.endsWith('/check-runs')) return response({ total_count: 1, check_runs: [{ id: p.includes(A) ? 98 : 99, head_sha: p.includes(A) ? A : B, name: 'review', status: 'completed', conclusion: 'success', completed_at: T }] });
    if (/\/commits\/[ab]{40}\/statuses$/.test(p)) return response([{ id: 201, context: 'ci', state: 'success', created_at: T }, { id: 200, context: 'ci', state: 'failure', created_at: '2026-10-30T12:00:00Z' }]);
    if (p === '/repos/u/r/deployments') return response([{ id: 6, sha: A, environment: 'preview', created_at: T }]);
    if (p === '/repos/u/r/deployments/6/statuses') return response([{ id: 81, state: 'success', created_at: T, environment_url: 'https://preview.example.test' }, { id: 80, state: 'failure', created_at: '2026-10-30T12:00:00Z' }]);
    if (p === '/repos/u/r/contents/docs/STATUS.md') { const content = `Source at ${url.searchParams.get('ref')}\nCI passed; real device remains NOT_RUN.`; return response({ type: 'file', encoding: 'base64', content: Buffer.from(content).toString('base64'), size: Buffer.byteLength(content), sha: 'd'.repeat(40) }); }
    throw new Error(`Unexpected request: ${url.pathname}`);
  }
  return { fetchImpl, calls };
}
async function finishCollection(f, options = {}) {
  const { project: projectOverrides = {}, ...limits } = options;
  let cursor = null, last; const evidence = [], rounds = [];
  for (let i = 0; i < 40; i++) { last = await collectEvidence({ fullName: 'u/r', repositoryId: 11, selectedPrNumbers: [16], sourcePaths: ['docs/STATUS.md'], ...projectOverrides }, { fetchImpl: f.fetchImpl, token: 'test-server-only-token', now: () => Date.parse(T), maxRequests: 5, maxPages: 1, ...limits, cursor }); evidence.push(...last.evidence); rounds.push(last); cursor = last.cursor; if (!cursor) return { last, evidence, rounds }; }
  throw new Error('Continuation did not converge');
}

test('App JWT uses independently verifiable RS256 with bounded expiry and clock-skew allowance', () => {
  const token = createAppJwt({ appId: 'Iv1.example', privateKey: keys.privateKey, now: Date.parse(T) });
  const [header, body, signature] = token.split('.'), claims = JSON.parse(Buffer.from(body, 'base64url'));
  assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'RS256');
  assert.equal(claims.iss, 'Iv1.example'); assert.equal(claims.iat, Date.parse(T) / 1000 - 60); assert(claims.exp <= Date.parse(T) / 1000 + 600);
  assert(verify('RSA-SHA256', Buffer.from(`${header}.${body}`), keys.publicKey, Buffer.from(signature, 'base64url')));
  assert.throws(() => createAppJwt({ appId: 'x', privateKey: 'private-secret-bad' }), e => e.code === 'APP_CONFIGURATION' && !e.message.includes('private-secret'));
});

test('webhook HMAC validates GitHub published vector and the exact UTF-8 bytes', () => {
  assert(verifyWebhookSignature('Hello, World!', 'sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17', "It's a Secret to Everybody"));
  const secret = 's'.repeat(40), body = Buffer.from('{"message":"中文"}\n'), signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  assert(verifyWebhookSignature(body, signature, secret)); assert(!verifyWebhookSignature(body.toString().trim(), signature, secret));
  assert(!verifyWebhookSignature(body, `sha1=${'0'.repeat(40)}`, secret)); assert(!verifyWebhookSignature(body, `sha256=${'g'.repeat(64)}`, secret)); assert(!verifyWebhookSignature(body, signature, ''));
});

test('installation token scope/cache/concurrent refresh never reaches a browser or token query', async () => {
  let now = Date.parse(T), count = 0; const calls = [];
  const c = createGitHubClient({ appId: 12, privateKey: keys.privateKey, now: () => now, fetchImpl: async (url, options) => { calls.push({ url, options }); count++; return response({ token: `installation-${count}`, expires_at: new Date(now + 3600_000).toISOString() }); } });
  const values = await Promise.all([c.installationToken(1, { repositoryIds: [12, 11] }), c.installationToken(1, { repositoryIds: [11, 12] })]);
  assert.deepEqual(values, ['installation-1', 'installation-1']); assert.equal(count, 1);
  assert.deepEqual(JSON.parse(calls[0].options.body), { repository_ids: [11, 12] }); assert.equal(calls[0].options.redirect, 'manual');
  now += 3550_000; assert.equal(await c.installationToken(1, { repositoryIds: [11, 12] }), 'installation-2');
  c.invalidateInstallation(1); assert.equal(await c.installationToken(1, { repositoryIds: [11, 12] }), 'installation-3');
  assert.equal(new URL(calls[0].url).origin, 'https://api.github.com'); assert(!calls[0].url.includes('token='));
  await assert.rejects(c.installationToken(1, { repositoryIds: [0] }), e => e.code === 'INVALID_REPOSITORY_SCOPE');
});

test('installation 401 refreshes once, while permanent revocation remains typed', async () => {
  let tokenCalls = 0, readCalls = 0;
  const c = createGitHubClient({ appId: 12, privateKey: keys.privateKey, now: () => Date.parse(T), fetchImpl: async (url) => {
    if (url.endsWith('/access_tokens')) return response({ token: `t-${++tokenCalls}`, expires_at: '2026-10-31T13:00:00Z' });
    readCalls++; return response({}, 401);
  } });
  await assert.rejects(c.installationRequest(1, '/installation/repositories'), e => e.code === 'CREDENTIAL_REVOKED');
  assert.equal(tokenCalls, 2); assert.equal(readCalls, 2);
});

test('API client refuses hostile paths, traversal and redirects without forwarding credentials', async () => {
  const calls = []; const c = createGitHubClient({ fetchImpl: async (url, options) => { calls.push({ url, options }); return response({}, 302, { location: 'https://attacker.test/leak' }); } });
  for (const p of ['https://attacker.test', '//attacker.test', '/repos/u/r/../secrets', '/repos/u/r/%2e%2e/secrets', '/repos/u/r?access_token=secret', '/repos/u/r\\else']) await assert.rejects(async () => c.request(p, { token: 'secret' }), e => e.code === 'INVALID_API_PATH');
  assert.equal(calls.length, 0);
  await assert.rejects(c.request('/repos/u/r', { token: 'secret' }), e => e.code === 'REDIRECT_REFUSED'); assert.equal(calls.length, 1); assert.equal(calls[0].options.redirect, 'manual');
});

test('403 permissions, 403 rate exhaustion, 429 and API faults retain distinct retry semantics', async () => {
  for (const [status, headers, code, retryable] of [[403, {}, 'FORBIDDEN', false], [403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Date.parse(T) / 1000 + 40) }, 'RATE_LIMITED', true], [429, { 'retry-after': '120' }, 'RATE_LIMITED', true], [503, {}, 'API_ERROR', true]]) {
    const c = createGitHubClient({ now: () => Date.parse(T), fetchImpl: async () => response({ message: 'must not echo service-body-secret' }, status, headers) });
    await assert.rejects(c.request('/repos/u/r'), e => { assert(e instanceof GitHubError); assert.equal(e.code, code); assert.equal(e.retryable, retryable); assert(!e.message.includes('service-body-secret')); if (retryable) assert(Date.parse(e.retryAt) > Date.parse(T)); return true; });
  }
});

test('OAuth start binds caller state/redirect; exchange only sends secrets to fixed GitHub endpoint', async () => {
  const state = 'x'.repeat(64), start = createOAuthStart({ clientId: 'client', redirectUri: 'https://app.example.test/api/oauth/callback', state });
  assert.equal(new URL(start.url).origin, 'https://github.com'); assert.equal(new URL(start.url).searchParams.get('state'), state);
  assert.throws(() => createOAuthStart({ clientId: 'client', redirectUri: 'javascript:alert(1)', state }), e => e.code === 'OAUTH_CONFIGURATION');
  let call; const out = await exchangeOAuthCode({ clientId: 'client', clientSecret: 'secret', code: 'one-time-code', redirectUri: 'https://app.example.test/api/oauth/callback', fetchImpl: async (url, options) => { call = { url, options }; return response({ access_token: 'user-token', token_type: 'bearer', expires_in: 3600 }); } });
  assert.equal(out.accessToken, 'user-token'); assert.equal(call.url, 'https://github.com/login/oauth/access_token'); assert.equal(call.options.headers.Accept, 'application/json'); assert.equal(call.options.redirect, 'manual'); assert(!call.url.includes('secret'));
});

test('webhooks keep real event order, deduplicate delivery and never bind comments to new PR HEAD', () => {
  const payload = { installation: { id: 1 }, repository: { id: 11, full_name: 'u/r' }, action: 'created', comment: ownerComment(), issue: { number: 16 } };
  const first = normalizeWebhook('issue_comment', payload, { deliveryId: 'd1', receivedAt: T });
  const duplicate = normalizeWebhook('issue_comment', payload, { deliveryId: 'd1', receivedAt: '2026-10-31T12:30:00Z' });
  assert.equal(first.evidence[0].id, duplicate.evidence[0].id); assert.equal(first.evidence[0].sha, null); assert.equal(first.evidence[0].data.issueNumber, 16); assert.equal(first.evidence[0].authorAssociation, 'OWNER');
  const late = normalizeWebhook('issue_comment', { ...payload, comment: { ...ownerComment(), updated_at: '2026-10-29T12:00:00Z' } }, { deliveryId: 'd2', receivedAt: T });
  assert.equal(late.evidence[0].occurredAt, '2026-10-29T12:00:00.000Z'); assert.notEqual(late.evidence[0].id, first.evidence[0].id);
  assert.throws(() => normalizeWebhook('issue_comment', { ...payload, installation: null }, { deliveryId: 'd3' }), e => e.code === 'INVALID_WEBHOOK');
});

test('deletion/revocation normalization retains tombstones and installation scope for caller authorization', () => {
  const deletion = normalizeWebhook('issue_comment', { installation: { id: 1 }, repository: { id: 11, full_name: 'u/r' }, action: 'deleted', comment: ownerComment(), issue: { number: 16 } }, { deliveryId: 'd4', receivedAt: T });
  assert.equal(deletion.evidence[0].data.deleted, true); assert.equal(deletion.evidence[0].data.eventTimeIsReceipt, true);
  const revoke = normalizeWebhook('installation_repositories', { installation: { id: 1 }, action: 'removed', repositories_removed: [{ id: 11, full_name: 'u/r' }] }, { deliveryId: 'd5', receivedAt: T });
  assert.deepEqual(revoke.repositoriesRemoved, [{ id: 11, fullName: 'u/r' }]); assert.equal(revoke.installationId, 1); assert.equal(revoke.repo, null);
});

test('continued collection reads selected PR outside recent window and SHA-pins docs/diffs', async () => {
  const f = fixture(), { last, evidence, rounds } = await finishCollection(f);
  assert(rounds.length > 1); assert.equal(last.cursor, null); assert.equal(last.coverage.complete, true); assert.equal(last.headSha, B); assert.equal(last.mainSha, A);
  assert(evidence.some(e => e.kind === 'pull_request' && e.data.number === 16));
  const docs = evidence.filter(e => e.kind === 'document'); assert.deepEqual(new Set(docs.map(e => e.sha)), new Set([A, B])); assert(docs.every(e => e.data.content.includes(e.sha)));
  const diff = evidence.find(e => e.kind === 'changed_file'); assert.equal(diff.sha, B); assert.equal(diff.data.baseSha, A); assert(diff.data.patch.includes('bounded fix'));
  assert(f.calls.filter(c => c.url.pathname.includes('/contents/')).every(c => /^[ab]{40}$/.test(c.url.searchParams.get('ref'))));
  assert(f.calls.every(c => c.options.method === 'GET' && c.options.redirect === 'manual' && c.options.headers.Authorization === 'Bearer test-server-only-token'));
});

test('one SHA preserves failed prior attempt, later success, skipped jobs and individual status history', async () => {
  const { evidence } = await finishCollection(fixture());
  const runs = evidence.filter(e => e.kind === 'workflow_run'); assert(runs.some(e => e.sha === B && e.data.runAttempt === 1 && e.data.conclusion === 'failure')); assert(runs.some(e => e.sha === B && e.data.runAttempt === 2 && e.data.conclusion === 'success' && e.data.jobsComplete));
  const jobs = evidence.filter(e => e.kind === 'workflow_job'); assert(jobs.some(e => e.data.conclusion === 'skipped')); assert(jobs.some(e => e.data.conclusion === 'failure')); assert(jobs.some(e => e.data.steps.some(s => s.conclusion === 'failure')));
  assert(evidence.some(e => e.kind === 'commit_status' && e.data.state === 'failure')); assert(evidence.some(e => e.kind === 'commit_status' && e.data.state === 'success'));
  assert(evidence.some(e => e.kind === 'deployment_status' && e.data.state === 'failure')); assert(evidence.some(e => e.kind === 'deployment_status' && e.data.state === 'success'));
});

test('issue bodies are reconciled and webhook/REST validation records share stable resource keys', async () => {
  const { evidence } = await finishCollection(fixture());
  assert(evidence.some(e => e.kind === 'issue' && e.data.number === 3 && e.data.body.includes('NOT_RUN')));
  const common = { installation: { id: 1 }, repository: { id: 11, full_name: 'u/r' }, action: 'completed' };
  const check = normalizeWebhook('check_run', { ...common, check_run: { id: 99, head_sha: B, name: 'review', status: 'completed', conclusion: 'success', completed_at: T } }, { deliveryId: 'stable-check', receivedAt: T }).evidence[0];
  const status = normalizeWebhook('status', { ...common, id: 201, sha: B, context: 'ci', state: 'success', created_at: T }, { deliveryId: 'stable-status', receivedAt: T }).evidence[0];
  assert(evidence.some(e => e.sourceKey === check.sourceKey && e.kind === check.kind));
  assert(evidence.some(e => e.sourceKey === status.sourceKey && e.kind === status.kind));
});

test('pagination limit produces resumable cursor; all comments survive without claiming incomplete reads complete', async () => {
  const f = fixture(), { last, rounds, evidence } = await finishCollection(f, { since: '2026-10-31T11:00:00Z' });
  assert(rounds.some(r => r.cursor && !r.coverage.complete)); assert.equal(last.coverage.since, '2026-10-31T10:55:00.000Z'); assert.equal(last.coverage.allHistory, false);
  assert(evidence.some(e => e.kind === 'issue_comment' && e.data.id === 901));
  for (const r of rounds) if (r.cursor) assert(!JSON.stringify(r.cursor).includes('test-server-only-token'));
  assert(f.calls.some(c => c.url.pathname === '/repos/u/r/issues/comments' && c.url.searchParams.get('page') === '2'));
});

test('permission loss at a subresource produces explicit incomplete coverage without inventing an empty success', async () => {
  const f = fixture({ intercept: url => url.pathname.endsWith('/pulls/16/reviews') ? response({}, 403) : undefined });
  const { last, rounds } = await finishCollection(f);
  assert.equal(last.coverage.complete, false); assert(last.coverage.sources.some(s => s.source === 'pr:16:reviews' && s.error === 'FORBIDDEN'));
  assert(rounds.some(r => r.warnings.some(w => w.code === 'FORBIDDEN')));
});

test('rate-limited collection returns retry cursor, keeps earlier evidence and resumes after cooldown', async () => {
  let now = Date.parse(T), fired = false;
  const f = fixture({ intercept: url => { if (!fired && url.pathname === '/repos/u/r/pulls/16') { fired = true; return response({}, 429, { 'retry-after': '60' }); } } });
  const project = { fullName: 'u/r', selectedPrNumbers: [16], sourcePaths: ['docs/STATUS.md'] };
  const first = await collectEvidence(project, { fetchImpl: f.fetchImpl, now: () => now, maxRequests: 30 });
  assert(first.evidence.length); assert(first.cursor); assert.equal(first.retryAt, '2026-10-31T12:01:00.000Z'); assert(!first.coverage.complete);
  now += 61_000; const second = await collectEvidence(project, { fetchImpl: f.fetchImpl, now: () => now, cursor: first.cursor, maxRequests: 100, maxPages: 5 });
  assert(second.evidence.some(e => e.kind === 'pull_request')); assert.equal(second.cursor, null);
});

test('hostile pagination and another-repository cursor cannot send the installation token elsewhere', async () => {
  const f = fixture({ intercept: url => url.pathname === '/repos/u/r/pulls' ? response([], 200, { link: '<https://attacker.test/?page=2>; rel="next"' }) : undefined });
  await assert.rejects(collectEvidence({ fullName: 'u/r', sourcePaths: [] }, { fetchImpl: f.fetchImpl, maxRequests: 30 }), e => e.code === 'INVALID_PAGINATION');
  assert(f.calls.every(c => c.url.origin === 'https://api.github.com'));
  await assert.rejects(collectEvidence({ fullName: 'u/r' }, { cursor: { version: 1, repo: 'u/r', tasks: [{ kind: 'repository', path: '/repos/u/other', key: 'x' }], coverage: [] }, fetchImpl: f.fetchImpl }), e => e.code === 'INVALID_CURSOR');
});

test('real GitHub canonical repository-ID pagination is accepted only for the verified repository', async () => {
  const f = fixture({ intercept: url => url.pathname === '/repos/u/r/issues/comments' && url.searchParams.get('page') === '1' ? response([ownerComment()], 200, { link: '<https://api.github.com/repositories/11/issues/comments?page=2&per_page=50>; rel="next"' }) : undefined });
  const { last, evidence } = await finishCollection(f); assert(last.coverage.complete); assert(evidence.some(e => e.data.id === 901));
  assert(f.calls.every(c => c.url.pathname.startsWith('/repos/u/r')));
  const bad = fixture({ intercept: url => url.pathname === '/repos/u/r/issues/comments' ? response([], 200, { link: '<https://api.github.com/repositories/99/issues/comments?page=2>; rel="next"' }) : undefined });
  await assert.rejects(collectEvidence({ fullName: 'u/r', sourcePaths: [] }, { fetchImpl: bad.fetchImpl, maxRequests: 30 }), e => e.code === 'INVALID_PAGINATION');
});

test('repository ID mismatch fails closed even if display owner/name still matches', async () => {
  await assert.rejects(collectEvidence({ fullName: 'u/r', repositoryId: 99 }, { fetchImpl: fixture().fetchImpl }), e => e.code === 'REPOSITORY_IDENTITY_CHANGED');
});

test('oversize or non-text plan and 300-file compare limit stay explicit knowledge gaps', async () => {
  const f = fixture({ intercept: url => {
    if (url.pathname.startsWith('/repos/u/r/contents/')) return response({ type: 'file', encoding: 'none', size: 2_000_000, sha: A, content: '' });
    if (url.pathname === '/repos/u/r/pulls/16') return response({ ...pull, changed_files: 301 });
  } });
  const { last, evidence } = await finishCollection(f);
  assert.equal(last.coverage.complete, false); assert(last.coverage.sources.some(s => s.error === 'DOCUMENT_UNREADABLE'));
  assert(evidence.filter(e => e.kind === 'document').every(e => !e.complete && e.data.content === null));
  assert(last.coverage.sources.some(s => s.source === 'pr:16:files' && !s.complete && s.expected === 301));
});

test('real-project fixture preserves scoped proof and the explicit VAIWL approval request', async () => {
  const audit = JSON.parse(await readFile(new URL('./fixtures/real-project-evidence.json', import.meta.url), 'utf8'));
  assert.equal(audit.readOnly, true); assert.equal(audit.repositories.length, 3); assert(audit.records.length >= 20);
  const approval = audit.records.find(r => r.id === 'vaiwl-comment-6547980076'); assert(approval.originalRecord.includes('须先获得用户对这一个增量窗口的授权')); assert(approval.originalRecord.includes('NOT_RELEASE_READY'));
  const paia = audit.records.find(r => r.id === 'paia-run-40736848180'); assert(paia.originalRecord.jobs.some(j => j.name === 'Full Suite Certification' && j.conclusion === 'skipped'));
  const riftlet = audit.records.find(r => r.id === 'riftlet-pr27'); assert(riftlet.originalRecord.includes('BLOCKED/NOT_RUN'));
});

const C = 'c'.repeat(40);
const historicRun = (id, changes = {}) => ({ ...run(1), id, head_sha: C, name: `historical-${id}`, run_attempt: 1, status: 'completed', conclusion: 'success', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T01:00:00Z', html_url: `https://github.com/u/r/actions/runs/${id}`, ...changes });
function runPages(rows, { latest = new Map(), truncated = false } = {}) {
  return fixture({ intercept: url => {
    const path = url.pathname;
    if (path === '/repos/u/r/actions/runs') {
      const sha = url.searchParams.get('head_sha');
      if (sha) return response({ total_count: sha === B ? 1 : 0, workflow_runs: sha === B ? [{ ...run(2), created_at: '2025-01-01T00:00:00Z' }] : [] });
      const created = url.searchParams.get('created'), since = created ? Date.parse(created.slice(2)) : -Infinity;
      const matching = rows.filter(row => Date.parse(row.created_at) >= since), page = Number(url.searchParams.get('page') || 1), selected = matching.slice((page - 1) * 50, page * 50);
      const next = new URL(url); next.searchParams.set('page', String(page + 1));
      return response({ total_count: truncated ? 1001 : matching.length, workflow_runs: selected }, 200, page * 50 < matching.length ? { link: `<${next.href}>; rel="next"` } : {});
    }
    const match = /\/actions\/runs\/(\d+)(?:\/attempts\/(\d+))?(\/jobs)?$/.exec(path);
    if (match && Number(match[1]) !== 7) {
      const id = Number(match[1]), current = latest.get(id) || rows.find(row => row.id === id);
      if (!current) throw new Error(`Unknown fixture run ${id}`);
      const attempt = Number(match[2] || current.run_attempt), value = attempt < current.run_attempt ? { ...current, run_attempt: attempt, status: 'completed', conclusion: 'failure', updated_at: current.created_at } : current;
      if (match[3]) return response({ total_count: 1, jobs: [{ id: id * 100 + attempt, run_id: id, head_sha: value.head_sha, run_attempt: attempt, name: 'unit', status: value.status, conclusion: value.conclusion, started_at: value.created_at, completed_at: value.status === 'completed' ? value.updated_at : null, steps: [{ number: 1, name: 'test', status: value.status, conclusion: value.conclusion }] }] });
      return response(value);
    }
  } });
}

test('incremental PR pagination stops below the overlap watermark while initial backfill keeps older pages', async () => {
  const recent = Array.from({ length: 50 }, (_, index) => ({ ...pull, number: index + 100, updated_at: '2026-10-31T11:30:00Z' }));
  const boundary = { ...pull, number: 200, updated_at: '2026-10-31T10:55:00Z' }, older = { ...pull, number: 201, updated_at: '2026-10-31T10:54:59Z' }, oldest = { ...pull, number: 202, updated_at: '2025-01-01T00:00:00Z' };
  const make = () => fixture({ intercept: url => {
    if (url.pathname !== '/repos/u/r/pulls') return;
    assert.equal(url.searchParams.get('sort'), 'updated'); assert.equal(url.searchParams.get('direction'), 'desc');
    const page = Number(url.searchParams.get('page'));
    return response(page === 1 ? recent : page === 2 ? [boundary, older] : [oldest], 200, page < 3 ? { link: `<https://api.github.com/repositories/11/pulls?page=${page + 1}>; rel="next"` } : {});
  } });
  const incremental = make(), result = await finishCollection(incremental, { since: '2026-10-31T11:00:00Z' });
  assert.equal(result.last.coverage.mode, 'incremental'); assert(result.last.coverage.sources.find(source => source.source === 'pulls').stoppedAtWatermark);
  assert(result.evidence.some(item => item.kind === 'pull_request' && item.data.number === 200));
  assert(!result.evidence.some(item => item.kind === 'pull_request' && item.data.number === 201));
  assert(!incremental.calls.some(call => call.url.pathname === '/repos/u/r/pulls' && call.url.searchParams.get('page') === '3'));
  assert(incremental.calls.some(call => call.url.pathname === '/repos/u/r/pulls/16'));
  const initial = make(), all = await finishCollection(initial);
  assert.equal(all.last.coverage.mode, 'backfill'); assert(all.evidence.some(item => item.kind === 'pull_request' && item.data.number === 202));
});

test('inconsistent PR ordering disables early stopping for the entire continued source', async () => {
  const f = fixture({ intercept: url => {
    if (url.pathname !== '/repos/u/r/pulls') return;
    const page = Number(url.searchParams.get('page'));
    return response(page === 1 ? [{ ...pull, number: 100, updated_at: '2020-01-01T00:00:00Z' }, { ...pull, number: 101 }] : [{ ...pull, number: 100 + page, updated_at: page === 2 ? '2020-01-01T00:00:00Z' : T }], 200, page < 3 ? { link: `<https://api.github.com/repos/u/r/pulls?page=${page + 1}>; rel="next"` } : {});
  } });
  const result = await finishCollection(f, { since: T });
  assert(result.evidence.some(item => item.kind === 'pull_request' && item.data.number === 103));
  assert(result.last.coverage.sources.find(source => source.source === 'pulls').orderUnverified);
});

test('an old observed unfinished run is reread directly and keeps failure then success on the same old SHA', async () => {
  const current = historicRun(70, { run_attempt: 2, conclusion: 'success', updated_at: T });
  const old = { id: 70, headSha: C, runAttempt: 1, status: 'in_progress', conclusion: null, updatedAt: '2026-10-01T01:00:00Z', jobsComplete: false };
  const f = runPages([], { latest: new Map([[70, current]]) });
  const result = await finishCollection(f, { since: '2026-10-31T11:00:00Z', project: { snapshot: { workflowRuns: [], pendingWorkflowRuns: [old] } } });
  assert(f.calls.some(call => call.url.pathname === '/repos/u/r/actions/runs/70'));
  assert(result.evidence.some(item => item.kind === 'workflow_run' && item.sha === C && item.data.runAttempt === 1 && item.data.conclusion === 'failure'));
  assert(result.evidence.some(item => item.kind === 'workflow_run' && item.sha === C && item.data.runAttempt === 2 && item.data.conclusion === 'success' && item.data.jobsComplete));
  assert.equal(result.last.snapshot.pendingWorkflowRuns.length, 0);
  const recent = f.calls.find(call => call.url.pathname === '/repos/u/r/actions/runs' && !call.url.searchParams.has('head_sha'));
  assert.equal(recent.url.searchParams.get('created'), '>=2026-10-28T12:00:00.000Z');
  assert(f.calls.filter(call => call.url.searchParams.has('head_sha')).every(call => !call.url.searchParams.has('created')));
  assert(result.evidence.some(item => item.kind === 'workflow_run' && item.sha === B && item.data.createdAt === '2025-01-01T00:00:00Z'));
});

test('a no-change compensation poll does not reread all historical jobs or generate new evidence identities', async () => {
  const recent = historicRun(300, { created_at: '2026-10-31T10:00:00Z', updated_at: '2026-10-31T10:30:00Z' });
  const rows = [recent, ...Array.from({ length: 120 }, (_, index) => historicRun(index + 1000))];
  const initial = runPages(rows), before = await finishCollection(initial, { maxRequests: 30, maxPages: 2 });
  assert(initial.calls.filter(call => /\/runs\/(1\d{3})\/attempts\/1\/jobs$/.test(call.url.pathname)).length >= 120);
  const poll = runPages(rows), after = await finishCollection(poll, { since: T, now: () => Date.parse(T) + 300000, maxRequests: 30, maxPages: 2, project: { snapshot: before.last.snapshot } });
  assert(!poll.calls.some(call => /\/runs\/(?:300|1\d{3})\/attempts\/1\/jobs$/.test(call.url.pathname)));
  assert(poll.calls.length < 40); assert.equal(after.last.coverage.complete, true);
  const identities = new Set(before.evidence.map(item => item.id));
  assert(after.evidence.every(item => identities.has(item.id)), 'unchanged versions must not trigger another analysis through new fact IDs');
  assert(after.last.coverage.sources.some(source => source.source === 'run:300:attempt:1:jobs' && source.reused));
});

test('pending run tracking outlives the 100-row UI snapshot and a later creation-window poll', async () => {
  const rows = Array.from({ length: 101 }, (_, index) => historicRun(index + 1000, { status: 'in_progress', conclusion: null }));
  const first = await finishCollection(runPages(rows), { maxRequests: 30, maxPages: 2 });
  assert.equal(first.last.snapshot.workflowRuns.length, 100); assert.equal(first.last.snapshot.pendingWorkflowRuns.length, 101);
  const next = runPages(rows), after = await finishCollection(next, { since: T, project: { snapshot: first.last.snapshot }, maxRequests: 30, maxPages: 2 });
  assert.equal(next.calls.filter(call => /\/actions\/runs\/1\d{3}$/.test(call.url.pathname)).length, 101);
  assert.equal(after.last.snapshot.pendingWorkflowRuns.length, 101);
});

test('a long outage extends the run creation overlap and filtered API limits remain explicit', async () => {
  const f = runPages([], { truncated: true });
  const result = await finishCollection(f, { since: '2026-10-20T12:00:00Z', project: { snapshot: { pendingWorkflowRuns: [] } } });
  assert.equal(result.last.coverage.runsCreatedSince, '2026-10-20T11:55:00.000Z');
  assert.equal(result.last.coverage.complete, false); assert(result.last.coverage.sources.some(source => source.source === 'recent_runs' && source.error === 'API_TRUNCATED'));
  assert.equal(result.last.coverage.deploymentReadMode, 'full-pagination-every-cycle'); assert.equal(result.last.coverage.allHistory, false);
  assert(result.last.coverage.limitations.some(limit => limit.includes('older, untracked SHAs')));
});

test('a legacy cursor migrates unfinished queued jobs outside its old UI snapshot into durable pending tracking', async () => {
  const unfinished = historicRun(999, { status: 'in_progress', conclusion: null });
  const cursor = { version: 1, repo: 'u/r', repositoryId: 11, headSha: A, since: T, startedAt: T, selected: [], paths: [], seen: [], coverage: [],
    snapshot: { repo: 'u/r', fetchedAt: T, workflowRuns: Array.from({ length: 100 }, (_, index) => ({ id: index + 1, headSha: A, runAttempt: 1, status: 'completed', conclusion: 'success', updatedAt: T })), pullRequests: [], comments: [], commits: [], issues: [], warnings: [] },
    tasks: [{ kind: 'jobs', key: 'run:999:attempt:1:jobs', path: '/repos/u/r/actions/runs/999/attempts/1/jobs', page: 1, run: unfinished, sha: C, attempt: 1 }] };
  const result = await collectEvidence({ repo: 'u/r' }, { cursor, fetchImpl: runPages([unfinished]).fetchImpl, now: () => Date.parse(T) });
  assert.equal(result.cursor, null); assert.equal(result.coverage.legacyPendingSnapshot, true);
  assert(result.snapshot.pendingWorkflowRuns.some(row => row.id === 999 && row.status === 'in_progress'));
  assert.equal(result.snapshot.workflowRuns.length, 100);
  assert(result.coverage.limitations.some(limit => limit.includes('legacy snapshot')));
});

test('exactly 1000 filtered workflow results are unconfirmed at the provider cap even when total_count equals items', async () => {
  const rows = Array.from({ length: 50 }, (_, index) => historicRun(2000 + index));
  const cached = rows.map(row => ({ id: row.id, headSha: row.head_sha, runAttempt: 1, status: row.status, conclusion: row.conclusion, updatedAt: row.updated_at, jobsComplete: true }));
  const cursor = { version: 1, repo: 'u/r', repositoryId: 11, headSha: A, mode: 'incremental', since: T, runsCreatedSince: '2026-10-28T12:00:00Z', startedAt: T, previousRuns: cached, selected: [], paths: [], seen: [],
    snapshot: { repo: 'u/r', fetchedAt: T, workflowRuns: [], pendingWorkflowRuns: [], pullRequests: [], comments: [], commits: [], issues: [], warnings: [] },
    coverage: [{ source: 'recent_runs', complete: false, pages: 19, items: 950 }], tasks: [{ kind: 'runs', key: 'recent_runs', path: '/repos/u/r/actions/runs?created=%3E%3D2026-10-28T12%3A00%3A00Z', page: 20 }] };
  const result = await collectEvidence({ repo: 'u/r' }, { cursor, now: () => Date.parse(T), fetchImpl: async () => response({ total_count: 1000, workflow_runs: rows }) });
  assert.equal(result.coverage.complete, false); assert.equal(result.cursor, null);
  assert(result.coverage.sources.some(source => source.source === 'recent_runs' && source.error === 'API_FILTER_CAP_REACHED' && source.providerLimit === 1000));
});
