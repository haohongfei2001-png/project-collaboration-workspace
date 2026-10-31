import { createHash, createHmac, createPrivateKey, randomBytes, sign, timingSafeEqual } from 'node:crypto';

// Network credentials only ever leave through these two fixed GitHub origins.
export const GITHUB_API_VERSION = '2026-03-10';
const API = 'https://api.github.com';
const WEB = 'https://github.com';
const SHA = /^[a-f\d]{40}$/i;
const REPO = /^[A-Za-z\d][A-Za-z\d-]{0,38}\/[A-Za-z\d_.-]{1,100}$/;
const MAX_BODY = 8 * 1024 * 1024;
const MAX_FILE = 512 * 1024;
const DEFAULT_PATHS = ['docs/STATUS.md', 'docs/AUTHORITY.md', 'docs/DEVELOPMENT_PLAN.md', 'README.md'];
const KNOWN_PATHS = {
  'haohongfei2001-png/riftlet': ['docs/R21_UI_FREEZE_AND_MAC_ACCEPTANCE.md', 'docs/EXECUTION_BOARD.md', 'docs/MAINLINE_GOVERNANCE.md', 'docs/INTEGRATION_HANDOFF.md'],
  'haohongfei2001-png/virtual-ai-workspace-layer': ['docs/STATUS.md', 'docs/AUTHORITY.md', 'docs/DEVELOPMENT_PLAN.md', 'src/pro/README.md'],
  'haohongfei2001-png/paia': ['extension/manifest.json', 'extension/docs/consumer-product-v1/STATUS.md', 'extension/docs/consumer-product-v1/AUTHORITY.md', 'extension/docs/consumer-product-v1/MASTER_PLAN.md', 'extension/docs/consumer-product-v1/implementation/MAINTENANCE-STATUS-DOCUMENT-REVALIDATION-20261028.md', 'README.md'],
};

export class GitHubError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = 'GitHubError'; this.code = code; Object.assign(this, details); }
}
const iso = value => { const n = typeof value === 'number' ? value : Date.parse(value); return Number.isFinite(n) ? new Date(n).toISOString() : null; };
const clock = now => typeof now === 'function' ? now() : now ?? Date.now();
const positive = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const text = value => typeof value === 'string' ? value : '';
const clean = object => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
const canonical = value => JSON.stringify(value, function (_key, item) { return item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item; });
const digest = value => createHash('sha256').update(value).digest('hex');
function repoName(value) {
  if (typeof value !== 'string' || !REPO.test(value) || value.split('/').some(s => s === '.' || s === '..')) throw new GitHubError('INVALID_REPOSITORY', 'Repository must be an owner/name pair.');
  return value;
}
function sourcePath(value) {
  if (typeof value !== 'string' || value.length > 500 || !value || /[\\\u0000-\u001f?#%]/.test(value) || value.split('/').some(p => !p || p === '.' || p === '..')) throw new GitHubError('INVALID_SOURCE_PATH', 'Source path is not a safe repository-relative path.');
  return value;
}
function apiURL(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\\\u0000-\u0020]/.test(path)) throw new GitHubError('INVALID_API_PATH', 'Only relative GitHub API paths are accepted.');
  let decoded; try { decoded = decodeURIComponent(path.split('?')[0]); } catch { throw new GitHubError('INVALID_API_PATH', 'Invalid API path encoding.'); }
  if (decoded.split('/').some(p => p === '.' || p === '..') || /[\\\u0000-\u001f]/.test(decoded)) throw new GitHubError('INVALID_API_PATH', 'API traversal is not allowed.');
  const url = new URL(path, API);
  if (url.origin !== API || url.username || url.password || url.hash || [...url.searchParams.keys()].some(k => /token|secret|authorization/i.test(k))) throw new GitHubError('INVALID_API_PATH', 'Invalid GitHub API URL.');
  return url;
}
function sourceURL(value, repo, fallback) {
  try { const url = new URL(value); if (url.origin === WEB && !url.username && !url.password && url.pathname.toLowerCase().startsWith(`/${repo.toLowerCase()}/`)) return url.href; } catch { /* use the known GitHub resource */ }
  return fallback;
}
function retryAt(response, now) {
  const retry = response.headers?.get?.('retry-after');
  if (retry) { const seconds = Number(retry); if (Number.isFinite(seconds) && seconds >= 0) return iso(now + Math.max(1, seconds) * 1000); const date = Date.parse(retry); if (Number.isFinite(date)) return iso(Math.max(now + 1000, date)); }
  const reset = Number(response.headers?.get?.('x-ratelimit-reset'));
  return iso(Number.isFinite(reset) && reset * 1000 > now ? reset * 1000 + 1000 : now + 60_000);
}
async function jsonBody(response) {
  const length = Number(response.headers?.get?.('content-length'));
  if (length > MAX_BODY) throw new GitHubError('RESPONSE_TOO_LARGE', 'GitHub response exceeds the bounded read limit.');
  let raw;
  if (response.body?.getReader) {
    const reader = response.body.getReader(), chunks = []; let bytes = 0;
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > MAX_BODY) { await reader.cancel(); throw new GitHubError('RESPONSE_TOO_LARGE', 'GitHub response exceeds the bounded read limit.'); } chunks.push(Buffer.from(value)); } raw = Buffer.concat(chunks).toString('utf8'); }
    finally { reader.releaseLock(); }
  } else if (typeof response.text === 'function') { raw = await response.text(); if (Buffer.byteLength(raw) > MAX_BODY) throw new GitHubError('RESPONSE_TOO_LARGE', 'GitHub response exceeds the bounded read limit.'); }
  else if (typeof response.json === 'function') return response.json();
  else throw new GitHubError('INVALID_RESPONSE', 'GitHub returned no JSON response.');
  try { return raw ? JSON.parse(raw) : null; } catch { throw new GitHubError('INVALID_RESPONSE', 'GitHub returned invalid JSON.'); }
}
async function fetchJSON(url, { token, method = 'GET', body, fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = 15_000, accept = 'application/vnd.github+json' } = {}) {
  if (typeof fetchImpl !== 'function') throw new GitHubError('FETCH_UNAVAILABLE', 'Server fetch is unavailable.');
  if (token !== undefined && (typeof token !== 'string' || /[\r\n]/.test(token))) throw new GitHubError('INVALID_CREDENTIAL', 'Invalid credential format.');
  let response;
  try {
    response = await fetchImpl(url.toString(), { method, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: clean({ Accept: accept, 'X-GitHub-Api-Version': GITHUB_API_VERSION, 'User-Agent': 'Project-Collaboration-Workspace-R2', Authorization: token ? `Bearer ${token}` : undefined, 'Content-Type': body ? 'application/json' : undefined }), body: body ? JSON.stringify(body) : undefined });
  } catch (error) { throw new GitHubError(error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR', 'GitHub could not be reached; existing evidence is retained.', { retryable: true, retryAt: iso(clock(now) + 60_000) }); }
  const status = response.status;
  if (status >= 300 && status < 400) throw new GitHubError('REDIRECT_REFUSED', 'GitHub redirected the request; credentials were not forwarded.', { status, retryable: false });
  if (!response.ok) {
    const remaining = response.headers?.get?.('x-ratelimit-remaining');
    if (status === 429 || status === 403 && (remaining === '0' || response.headers?.get?.('retry-after'))) throw new GitHubError('RATE_LIMITED', 'GitHub rate limit reached.', { status, retryable: true, retryAt: retryAt(response, clock(now)) });
    if (status === 401) throw new GitHubError('CREDENTIAL_REVOKED', 'GitHub credential is expired or revoked.', { status, retryable: false });
    if (status === 403) throw new GitHubError('FORBIDDEN', 'GitHub permission is missing or suspended.', { status, retryable: false });
    if (status === 404) throw new GitHubError('NOT_FOUND', 'GitHub resource is absent or no longer authorized.', { status, retryable: false });
    throw new GitHubError('API_ERROR', `GitHub API returned HTTP ${status}.`, { status, retryable: status >= 500, retryAt: status >= 500 ? iso(clock(now) + 60_000) : null });
  }
  try { return { data: await jsonBody(response), headers: response.headers, status }; }
  catch (error) { if (error instanceof GitHubError) throw error; throw new GitHubError('INVALID_RESPONSE', 'GitHub response could not be fully read.', { retryable: true, retryAt: iso(clock(now) + 60_000) }); }
}

export function createAppJwt({ appId, privateKey, now = Date.now() }) {
  const seconds = Math.floor(clock(now) / 1000);
  if (!text(String(appId || '')).match(/^[A-Za-z\d_.-]{1,100}$/) || !Number.isFinite(seconds)) throw new GitHubError('APP_CONFIGURATION', 'GitHub App ID is missing or invalid.');
  try {
    const key = createPrivateKey(privateKey);
    if (key.asymmetricKeyType !== 'rsa') throw new Error('RSA required');
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iat: seconds - 60, exp: seconds + 540, iss: String(appId) })).toString('base64url');
    const input = `${header}.${payload}`;
    return `${input}.${sign('RSA-SHA256', Buffer.from(input), key).toString('base64url')}`;
  } catch { throw new GitHubError('APP_CONFIGURATION', 'GitHub App requires a valid RSA private key.'); }
}

export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!(Buffer.isBuffer(rawBody) || rawBody instanceof Uint8Array || typeof rawBody === 'string') || typeof signature !== 'string' || !/^sha256=[a-f\d]{64}$/.test(signature) || typeof secret !== 'string' || secret.length < 16) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const actual = Buffer.from(signature.slice(7), 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createGitHubClient({ appId, privateKey, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const cached = new Map(), pending = new Map();
  const request = (path, options = {}) => fetchJSON(apiURL(path), { fetchImpl, now, ...options });
  function tokenKey(id, repositoryIds) {
    if (!positive(id)) throw new GitHubError('INVALID_INSTALLATION', 'Invalid GitHub installation ID.');
    const ids = repositoryIds === undefined ? undefined : [...new Set(repositoryIds.map(positive))].sort((a, b) => a - b);
    if (ids && (!ids.length || ids.includes(null) || ids.length > 500)) throw new GitHubError('INVALID_REPOSITORY_SCOPE', 'Invalid installation repository scope.');
    return { key: `${id}:${ids?.join(',') || '*'}`, ids };
  }
  async function installationToken(id, { repositoryIds, force = false } = {}) {
    const { key, ids } = tokenKey(id, repositoryIds), found = cached.get(key);
    if (!force && found && found.expiresAt > clock(now) + 60_000) return found.token;
    if (pending.has(key)) return pending.get(key);
    const promise = (async () => {
      try {
        const { data } = await request(`/app/installations/${positive(id)}/access_tokens`, { method: 'POST', token: createAppJwt({ appId, privateKey, now }), body: ids ? { repository_ids: ids } : {} });
        const expiresAt = Date.parse(data?.expires_at);
        if (!text(data?.token) || !Number.isFinite(expiresAt) || expiresAt <= clock(now) + 60_000) throw new GitHubError('INVALID_RESPONSE', 'GitHub returned an invalid installation token.');
        cached.set(key, { token: data.token, expiresAt }); return data.token;
      } finally { pending.delete(key); }
    })(); pending.set(key, promise); return promise;
  }
  function invalidateInstallation(id) { for (const key of cached.keys()) if (key.startsWith(`${id}:`)) cached.delete(key); }
  async function installationRequest(id, path, { repositoryIds, ...options } = {}) {
    try { return await request(path, { ...options, token: await installationToken(id, { repositoryIds }) }); }
    catch (error) { if (error.code !== 'CREDENTIAL_REVOKED') throw error; invalidateInstallation(id); return request(path, { ...options, token: await installationToken(id, { repositoryIds, force: true }) }); }
  }
  return { request, installationToken, installationRequest, invalidateInstallation };
}

function redirectURL(value) {
  let url; try { url = new URL(value); } catch { throw new GitHubError('OAUTH_CONFIGURATION', 'OAuth redirect URL is invalid.'); }
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) || url.username || url.password || url.hash) throw new GitHubError('OAUTH_CONFIGURATION', 'OAuth redirect URL must use HTTPS.');
  return url.toString();
}
export function createOAuthStart({ clientId, redirectUri, state = randomBytes(32).toString('base64url') }) {
  if (!text(clientId) || !text(state) || state.length < 32 || state.length > 512 || /[\r\n]/.test(state)) throw new GitHubError('OAUTH_CONFIGURATION', 'OAuth client ID and a strong state are required.');
  const url = new URL('/login/oauth/authorize', WEB);
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectURL(redirectUri), state }).toString();
  return { url: url.toString(), state };
}
export async function exchangeOAuthCode({ clientId, clientSecret, code, redirectUri, fetchImpl = globalThis.fetch }) {
  if (![clientId, clientSecret, code].every(v => text(v) && v.length <= 4096 && !/[\r\n]/.test(v))) throw new GitHubError('OAUTH_CONFIGURATION', 'OAuth exchange fields are missing or invalid.');
  // The caller must atomically consume its server-bound state BEFORE exchange.
  const { data } = await fetchJSON(new URL('/login/oauth/access_token', WEB), { fetchImpl, method: 'POST', accept: 'application/json', body: { client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectURL(redirectUri) } });
  if (data?.error || !text(data?.access_token) || data.token_type?.toLowerCase() !== 'bearer') throw new GitHubError('OAUTH_EXCHANGE_FAILED', 'GitHub did not issue a user access token.');
  return { accessToken: data.access_token, tokenType: 'bearer', expiresIn: data.expires_in ?? null, refreshToken: data.refresh_token ?? null, refreshTokenExpiresIn: data.refresh_token_expires_in ?? null };
}

function evidence(repo, kind, key, data, { sha = null, sourceUrl, occurredAt = null, observedAt, complete = true, author = '', authorAssociation = '' } = {}) {
  const sourceKey = `github:${repo}:${key}`, version = { sourceKey, sha: SHA.test(sha || '') ? sha.toLowerCase() : null, occurredAt: iso(occurredAt), data };
  return { id: digest(canonical(version)), kind, sourceKey, sourceUrl: sourceUrl || `${WEB}/${repo}`, sha: version.sha, occurredAt: version.occurredAt, observedAt, data, complete, author, authorAssociation };
}
function association(item, repo) { return text(item?.author_association) || (text(item?.user?.login).toLowerCase() === repo.split('/')[0].toLowerCase() ? 'OWNER' : 'NONE'); }
function pullFact(repo, pr, at) {
  return evidence(repo, 'pull_request', `pr:${pr.number}`, { number: pr.number, title: pr.title, body: pr.body || '', state: pr.state, draft: !!pr.draft, merged: !!pr.merged_at, mergedAt: pr.merged_at || null, closedAt: pr.closed_at || null, createdAt: pr.created_at, updatedAt: pr.updated_at, headSha: pr.head?.sha || null, headBranch: pr.head?.ref || null, baseSha: pr.base?.sha || null, baseBranch: pr.base?.ref || null, mergeCommitSha: pr.merge_commit_sha || null, labels: (pr.labels || []).map(l => l.name), author: pr.user?.login || '' }, { sha: pr.head?.sha, sourceUrl: sourceURL(pr.html_url, repo, `${WEB}/${repo}/pull/${pr.number}`), occurredAt: pr.updated_at, observedAt: at, author: pr.user?.login || '', authorAssociation: association(pr, repo) });
}
function commentFact(repo, item, at, kind = 'issue_comment', issueNumber) {
  const number = positive(issueNumber) || positive(/\/(?:issues|pull)\/(\d+)/.exec(item.issue_url || item.html_url || '')?.[1]);
  return evidence(repo, kind, `${kind}:${item.id}`, { id: item.id, body: item.body || '', issueNumber: number, prNumber: kind === 'issue_comment' ? null : number, createdAt: item.created_at || item.submitted_at, updatedAt: item.updated_at || item.submitted_at, state: item.state || null, commitId: item.commit_id || null, path: item.path || null, line: item.line || null, inReplyToId: item.in_reply_to_id || null }, { sha: item.commit_id, sourceUrl: sourceURL(item.html_url, repo, `${WEB}/${repo}/issues/${number || ''}#issuecomment-${item.id}`), occurredAt: item.updated_at || item.submitted_at || item.created_at, observedAt: at, author: item.user?.login || '', authorAssociation: association(item, repo) });
}
function commitFact(repo, item, at) {
  return evidence(repo, 'commit', `commit:${item.sha}`, { sha: item.sha, message: item.commit?.message || item.message || '', authoredAt: item.commit?.author?.date || null, committedAt: item.commit?.committer?.date || null, parents: (item.parents || []).map(p => p.sha), files: item.files?.map(f => ({ path: f.filename, previousPath: f.previous_filename || null, status: f.status, additions: f.additions, deletions: f.deletions, patch: f.patch?.slice(0, 32768) || null, patchComplete: typeof f.patch === 'string' && f.patch.length <= 32768 })) || null }, { sha: item.sha, sourceUrl: sourceURL(item.html_url, repo, `${WEB}/${repo}/commit/${item.sha}`), occurredAt: item.commit?.committer?.date || item.commit?.author?.date || item.timestamp, observedAt: at, complete: !item.files?.some(f => !f.patch || f.patch.length > 32768), author: item.author?.login || '' });
}
function runFact(repo, run, at, jobsComplete = false) {
  const attempt = positive(run.run_attempt) || 1;
  return evidence(repo, 'workflow_run', `workflow_run:${run.id}:attempt:${attempt}`, { id: run.id, name: run.name, workflowId: run.workflow_id, headSha: run.head_sha, headBranch: run.head_branch, event: run.event, status: run.status, conclusion: run.conclusion, runAttempt: attempt, createdAt: run.created_at, updatedAt: run.updated_at, runStartedAt: run.run_started_at, jobsComplete }, { sha: run.head_sha, sourceUrl: sourceURL(run.html_url, repo, `${WEB}/${repo}/actions/runs/${run.id}/attempts/${attempt}`), occurredAt: run.updated_at || run.created_at, observedAt: at, complete: jobsComplete, author: run.actor?.login || '' });
}
function jobFact(repo, job, at, attempt = job.run_attempt || 1, headSha = job.head_sha) {
  return evidence(repo, 'workflow_job', `workflow_job:${job.id}`, { id: job.id, runId: job.run_id, runAttempt: attempt, name: job.name, status: job.status, conclusion: job.conclusion, startedAt: job.started_at, completedAt: job.completed_at, steps: (job.steps || []).map(s => ({ number: s.number, name: s.name, status: s.status, conclusion: s.conclusion, startedAt: s.started_at, completedAt: s.completed_at })) }, { sha: headSha, sourceUrl: sourceURL(job.html_url, repo, `${WEB}/${repo}/actions/runs/${job.run_id}/job/${job.id}`), occurredAt: job.completed_at || job.started_at, observedAt: at });
}

export function normalizeWebhook(event, payload, { deliveryId, receivedAt = new Date().toISOString() } = {}) {
  if (!payload || typeof payload !== 'object' || !text(event).match(/^[a-z_]{1,80}$/) || !text(deliveryId).match(/^[A-Za-z\d_-]{1,128}$/)) throw new GitHubError('INVALID_WEBHOOK', 'Webhook envelope is invalid.');
  const installationId = positive(payload.installation?.id), repositoryId = positive(payload.repository?.id), repo = payload.repository ? repoName(payload.repository.full_name) : null;
  if (payload.installation && !installationId || payload.repository && (!repositoryId || !installationId)) throw new GitHubError('INVALID_WEBHOOK', 'Webhook installation or repository ID is invalid.');
  const at = iso(receivedAt); if (!at) throw new GitHubError('INVALID_WEBHOOK', 'Webhook receipt time is invalid.');
  const result = { repo, repositoryId, installationId, action: text(payload.action), deliveryId, receivedAt: at, evidence: [], requiresSync: !!repo, repositoriesAdded: [], repositoriesRemoved: [] };
  for (const [key, field] of [['repositoriesAdded', 'repositories_added'], ['repositoriesRemoved', 'repositories_removed']]) result[key] = (payload[field] || []).map(r => ({ id: positive(r.id), fullName: repoName(r.full_name) })).filter(r => r.id);
  if (!repo) { result.requiresSync = ['installation', 'installation_repositories'].includes(event); return result; }
  let fact;
  if (event === 'pull_request' && positive(payload.pull_request?.number)) fact = pullFact(repo, payload.pull_request, at);
  else if (['issue_comment', 'pull_request_review_comment', 'pull_request_review'].includes(event)) {
    const item = event === 'pull_request_review' ? payload.review : payload.comment;
    if (positive(item?.id)) fact = commentFact(repo, item, at, event, payload.issue?.number || payload.pull_request?.number);
  } else if (event === 'workflow_run' && positive(payload.workflow_run?.id)) fact = runFact(repo, payload.workflow_run, at);
  else if (event === 'workflow_job' && positive(payload.workflow_job?.id)) fact = jobFact(repo, payload.workflow_job, at);
  else if (event === 'push') fact = evidence(repo, 'push', `delivery:${deliveryId}`, { ref: payload.ref, before: payload.before, after: payload.after, forced: !!payload.forced, deleted: !!payload.deleted, created: !!payload.created, commits: (payload.commits || []).map(c => ({ sha: c.id, message: c.message, timestamp: c.timestamp, added: c.added, modified: c.modified, removed: c.removed })), commitCount: payload.size ?? payload.commits?.length ?? 0 }, { sha: payload.after, sourceUrl: `${WEB}/${repo}/commit/${payload.after}`, occurredAt: payload.head_commit?.timestamp || at, observedAt: at, complete: (payload.size ?? payload.commits?.length ?? 0) <= (payload.commits?.length || 0), author: payload.sender?.login || '' });
  else if (['check_run', 'check_suite', 'status', 'deployment', 'deployment_status', 'issues', 'repository'].includes(event)) {
    const item = payload[event] || (event === 'issues' ? payload.issue : null) || payload;
    const sha = item.head_sha || item.sha || payload.deployment?.sha;
    const kind = event === 'issues' ? 'issue' : event === 'status' ? 'commit_status' : event;
    fact = evidence(repo, kind, `${kind}:${item.id || deliveryId}`, { id: item.id, number: item.number, name: item.name || item.context, status: item.status, conclusion: item.conclusion || null, state: item.state, title: item.title, body: item.body, description: item.description, environment: item.environment || payload.deployment?.environment, deploymentId: payload.deployment?.id, createdAt: item.created_at, updatedAt: item.updated_at, completedAt: item.completed_at, output: item.output ? { title: item.output.title, summary: item.output.summary, text: item.output.text } : null }, { sha, sourceUrl: sourceURL(item.html_url || item.target_url, repo, SHA.test(sha || '') ? `${WEB}/${repo}/commit/${sha}` : `${WEB}/${repo}`), occurredAt: item.updated_at || item.completed_at || item.created_at || at, observedAt: at, author: item.user?.login || item.creator?.login || payload.sender?.login || '', authorAssociation: association(item, repo) });
  }
  if (fact) { fact.data.eventAction = text(payload.action); if (payload.action === 'deleted' || payload.action === 'dismissed') { fact.data.deleted = payload.action === 'deleted'; fact.occurredAt = at; fact.data.eventTimeIsReceipt = true; } fact.id = digest(canonical({ sourceKey: fact.sourceKey, sha: fact.sha, occurredAt: fact.occurredAt, data: fact.data })); result.evidence.push(fact); }
  else result.requiresSync = event !== 'ping';
  return result;
}

// Continuations contain only task descriptors, IDs and bounded progress, never tokens or bodies.
// Each immutable SHA remains pinned across requests. Mutable GitHub collections have an overlap
// watermark and explicit coverage; their observation is not a transactionally frozen snapshot.
export async function collectEvidence(project, { token, fetchImpl = globalThis.fetch, since = null, now = Date.now, maxPages = 2, maxRequests = 30, maxDurationMs = 75_000, cursor = null } = {}) {
  const repo = repoName(project.fullName || project.repo || project.repositoryFullName), base = `/repos/${repo}`, at = iso(clock(now)), started = Date.now();
  if (!at || !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 20 || !Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > 300) throw new GitHubError('INVALID_COLLECTION_OPTIONS', 'Invalid evidence collection limits.');
  const configuredPulls = project.selectedPrNumbers ?? project.trackedPr ?? [];
  const selected = [...new Set([...(Array.isArray(configuredPulls) ? configuredPulls : [configuredPulls]), project.primaryPullNumber].map(positive).filter(Boolean))];
  const configuredPaths = project.sourcePaths?.length ? project.sourcePaths : project.planPaths?.length ? project.planPaths : [project.planPath, project.statusPath, ...(KNOWN_PATHS[repo.toLowerCase()] || DEFAULT_PATHS)].filter(Boolean);
  if (!Array.isArray(configuredPaths) || selected.length > 12 || configuredPaths.length > 16) throw new GitHubError('INVALID_COLLECTION_OPTIONS', 'At most 12 selected PRs and 16 source files can be monitored in one project.');
  const paths = [...new Set(configuredPaths)].map(sourcePath);
  let state;
  if (cursor) {
    if (cursor.version !== 1 || cursor.repo?.toLowerCase() !== repo.toLowerCase() || !Array.isArray(cursor.tasks) || cursor.tasks.length > 10_000 || !Array.isArray(cursor.coverage)) throw new GitHubError('INVALID_CURSOR', 'Evidence continuation does not match this repository.');
    state = structuredClone(cursor);
    for (const task of state.tasks) { const url = apiURL(task.path); if (!url.pathname.toLowerCase().startsWith(`${base.toLowerCase()}/`) && url.pathname.toLowerCase() !== base.toLowerCase() || !['repository', 'head', 'pulls', 'pull', 'issues', 'comments', 'inline', 'reviews', 'compare', 'commits', 'commit', 'runs', 'run', 'jobs', 'checks', 'statuses', 'deployments', 'deployment_statuses', 'document'].includes(task.kind)) throw new GitHubError('INVALID_CURSOR', 'Evidence continuation contains an invalid task.'); }
  } else {
    const sinceMs = since ? Date.parse(since) : NaN;
    state = { version: 1, repo, headSha: null, since: Number.isFinite(sinceMs) ? iso(sinceMs - 5 * 60_000) : null, startedAt: at, tasks: [{ kind: 'repository', path: base, key: 'repository' }], coverage: [], seen: [], selected, paths, snapshot: { repo, fetchedAt: at, pullRequests: [], workflowRuns: [], comments: [], commits: [], issues: [], warnings: [] } };
  }
  const out = [], warnings = [], deferred = [], sourcePages = new Map(); let requests = 0, retry = null;
  const cov = (key, patch) => { let c = state.coverage.find(x => x.source === key); if (!c) { c = { source: key, complete: false, items: 0, pages: 0 }; state.coverage.push(c); } Object.assign(c, patch); return c; };
  const enqueue = task => { if (state.tasks.length + deferred.length >= 10_000) throw new GitHubError('COLLECTION_CAPACITY', 'Collection queue limit reached; no success watermark was committed.'); state.tasks.push(task); };
  const list = (kind, path, key, extra = {}) => ({ kind, path, key, page: 1, ...extra });
  const mark = key => { if (state.seen.includes(key)) return false; state.seen.push(key); return true; };
  function documentTasks(sha, line) { for (const path of state.paths) { const key = `document:${line}:${path}`; if (mark(`${key}:${sha}`)) enqueue({ kind: 'document', key, path: `${base}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${sha}`, sha, sourcePath: path, line }); } }
  function validationTasks(sha) {
    if (!SHA.test(sha || '') || !mark(`validation:${sha}`)) return;
    enqueue(list('runs', `${base}/actions/runs?head_sha=${sha}`, `runs:${sha}`));
    enqueue(list('checks', `${base}/commits/${sha}/check-runs?filter=all`, `checks:${sha}`, { shape: 'check_runs', sha }));
    enqueue(list('statuses', `${base}/commits/${sha}/statuses`, `statuses:${sha}`, { sha }));
  }
  function directPull(pr) { if (!positive(pr) || !mark(`pull:${pr}`)) return; enqueue({ kind: 'pull', key: `pull:${pr}`, path: `${base}/pulls/${pr}`, pr }); }
  while (state.tasks.length && requests < maxRequests && Date.now() - started < maxDurationMs - 16_000) {
    const task = state.tasks.shift();
    if (task.notBefore && Date.parse(task.notBefore) > clock(now)) { deferred.push(task); retry = !retry || task.notBefore < retry ? task.notBefore : retry; continue; }
    if (task.page && (sourcePages.get(task.key) || 0) >= maxPages) { deferred.push(task); continue; }
    let url = apiURL(task.path); if (task.page) { url.searchParams.set('per_page', '50'); url.searchParams.set('page', String(task.page)); }
    let response;
    requests++;
    try { response = await fetchJSON(url, { token, fetchImpl, now }); }
    catch (error) {
      if (!(error instanceof GitHubError)) throw error;
      if (task.kind === 'repository' || error.code === 'CREDENTIAL_REVOKED') throw error;
      if (task.kind === 'document' && error.code === 'NOT_FOUND') { cov(task.key, { complete: true, absent: true, sha: task.sha, error: null, retryAt: null }); continue; }
      cov(task.key, { complete: false, error: error.code, retryAt: error.retryAt || null });
      warnings.push({ source: task.key, code: error.code, message: error.message, retryAt: error.retryAt || null });
      if (error.retryable) { deferred.push({ ...task, notBefore: error.retryAt }); retry = error.retryAt; if (error.code === 'RATE_LIMITED') break; }
      continue;
    }
    const data = response.data; let items;
    if (task.page) {
      const shape = task.shape || ({ runs: 'workflow_runs', jobs: 'jobs', checks: 'check_runs' }[task.kind]); items = shape ? data?.[shape] : data;
      if (!Array.isArray(items)) throw new GitHubError('INVALID_RESPONSE', 'GitHub collection shape is incomplete.');
      sourcePages.set(task.key, (sourcePages.get(task.key) || 0) + 1);
      const progress = cov(task.key, { error: null, retryAt: null }); progress.pages++; progress.items += items.length;
      const next = /<([^>]+)>;\s*rel="next"/.exec(response.headers?.get?.('link') || '');
      if (next) {
        let nextURL; try { nextURL = new URL(next[1]); } catch { throw new GitHubError('INVALID_PAGINATION', 'GitHub pagination link is invalid.'); }
        const page = positive(nextURL.searchParams.get('page'));
        // GitHub emits canonical /repositories/{immutable-id}/... Links even when
        // the request used /repos/{owner}/{name}/... . Accept only that SAME ID;
        // rebuild the original path below and never follow a token-bearing URL.
        const canonicalPath = `/repositories/${state.repositoryId}${url.pathname.slice(base.length)}`;
        if (nextURL.origin !== API || (nextURL.pathname !== url.pathname && nextURL.pathname !== canonicalPath) || page !== task.page + 1) throw new GitHubError('INVALID_PAGINATION', 'GitHub pagination left its source boundary.');
        enqueue({ ...task, page }); cov(task.key, { complete: false, nextPage: page });
      } else cov(task.key, { complete: true, nextPage: null });
      const total = data?.total_count; if (Number.isFinite(total) && total > progress.items && !next) { cov(task.key, { complete: false, error: 'API_TRUNCATED', total }); warnings.push({ source: task.key, code: 'API_TRUNCATED', message: 'GitHub total_count exceeds the returned collection; no complete-history claim is made.' }); }
    } else cov(task.key, { complete: true, items: 1, sha: task.sha || null, error: null, retryAt: null });
    if (task.kind === 'repository') {
      if (!data?.id || text(data.full_name).toLowerCase() !== repo.toLowerCase() || project.repositoryId && Number(project.repositoryId) !== data.id) throw new GitHubError('REPOSITORY_IDENTITY_CHANGED', 'GitHub repository identity no longer matches its monitored installation.');
      state.repositoryId = data.id; state.snapshot.repository = { id: data.id, fullName: data.full_name, defaultBranch: data.default_branch, private: !!data.private, url: data.html_url };
      out.push(evidence(repo, 'repository', 'repository', { id: data.id, fullName: data.full_name, defaultBranch: data.default_branch, private: !!data.private, archived: !!data.archived, pushedAt: data.pushed_at }, { sourceUrl: `${WEB}/${repo}`, occurredAt: data.updated_at, observedAt: at }));
      enqueue({ kind: 'head', key: 'main_head', path: `${base}/commits/${encodeURIComponent(data.default_branch || 'main')}` });
      for (const pr of state.selected) directPull(pr);
      enqueue(list('pulls', `${base}/pulls?state=all&sort=updated&direction=desc`, 'pulls'));
      const sinceQuery = state.since ? `&since=${encodeURIComponent(state.since)}` : '';
      enqueue(list('comments', `${base}/issues/comments?sort=updated&direction=desc${sinceQuery}`, 'repository_comments'));
      enqueue(list('inline', `${base}/pulls/comments?sort=updated&direction=desc${sinceQuery}`, 'repository_inline_comments'));
      enqueue(list('issues', `${base}/issues?state=all&sort=updated&direction=desc${sinceQuery}`, 'issues'));
      enqueue(list('runs', `${base}/actions/runs`, 'recent_runs'));
      enqueue(list('deployments', `${base}/deployments`, 'deployments'));
    } else if (task.kind === 'head' || task.kind === 'commit') {
      if (!SHA.test(data?.sha || '')) throw new GitHubError('INVALID_RESPONSE', 'GitHub commit is missing its SHA.');
      out.push(commitFact(repo, data, at));
      if (task.kind === 'head') {
        state.headSha = data.sha; state.snapshot.headSha = data.sha;
        enqueue(list('commits', `${base}/commits?sha=${data.sha}${state.since ? `&since=${encodeURIComponent(state.since)}` : ''}`, 'main_commits'));
        validationTasks(data.sha); documentTasks(data.sha, 'main');
      }
    } else if (task.kind === 'pulls' || task.kind === 'pull') {
      for (const pr of task.kind === 'pull' ? [data] : items) {
        if (!positive(pr.number) || !SHA.test(pr.head?.sha || '')) throw new GitHubError('INVALID_RESPONSE', 'GitHub PR identity is incomplete.');
        out.push(pullFact(repo, pr, at));
        if (state.snapshot.pullRequests.length < 30 && !state.snapshot.pullRequests.some(x => x.number === pr.number)) state.snapshot.pullRequests.push({ number: pr.number, title: pr.title, body: pr.body?.slice(0, 8000), headSha: pr.head.sha, updatedAt: pr.updated_at, state: pr.state, draft: pr.draft, merged: !!pr.merged_at, url: pr.html_url });
        if (task.kind === 'pull') {
          if (!state.snapshot.trackedHeadSha && state.selected.includes(pr.number)) state.snapshot.trackedHeadSha = pr.head.sha;
          enqueue(list('comments', `${base}/issues/${pr.number}/comments${state.since ? `?since=${encodeURIComponent(state.since)}` : ''}`, `pr:${pr.number}:comments`, { pr: pr.number, sha: pr.head.sha }));
          enqueue(list('reviews', `${base}/pulls/${pr.number}/reviews`, `pr:${pr.number}:reviews`, { pr: pr.number, sha: pr.head.sha }));
          enqueue(list('inline', `${base}/pulls/${pr.number}/comments`, `pr:${pr.number}:inline`, { pr: pr.number, sha: pr.head.sha }));
          if (SHA.test(pr.base?.sha || '')) enqueue({ kind: 'compare', path: `${base}/compare/${pr.base.sha}...${pr.head.sha}`, key: `pr:${pr.number}:files`, pr: pr.number, sha: pr.head.sha, baseSha: pr.base.sha, expectedFiles: pr.changed_files });
          else { cov(`pr:${pr.number}:files`, { complete: false, error: 'BASE_SHA_MISSING' }); warnings.push({ source: `pr:${pr.number}:files`, code: 'BASE_SHA_MISSING', message: 'PR changes cannot be pinned without its base SHA.' }); }
          validationTasks(pr.head.sha); documentTasks(pr.head.sha, `pr:${pr.number}`);
        } else if (!state.selected.length && state.snapshot.pullRequests.length <= 3) directPull(pr.number);
      }
    } else if (task.kind === 'issues') {
      for (const issue of items.filter(x => !x.pull_request)) {
        const fact = evidence(repo, 'issue', `issue:${issue.id}`, { id: issue.id, number: issue.number, title: issue.title, body: issue.body || '', state: issue.state, stateReason: issue.state_reason || null, labels: (issue.labels || []).map(l => l.name), createdAt: issue.created_at, updatedAt: issue.updated_at, closedAt: issue.closed_at }, { sourceUrl: sourceURL(issue.html_url, repo, `${WEB}/${repo}/issues/${issue.number}`), occurredAt: issue.updated_at || issue.created_at, observedAt: at, author: issue.user?.login || '', authorAssociation: association(issue, repo) });
        out.push(fact); if (state.snapshot.issues.length < 30) state.snapshot.issues.push({ number: issue.number, title: issue.title, body: issue.body?.slice(0, 8000), state: issue.state, updatedAt: issue.updated_at, url: fact.sourceUrl });
      }
    } else if (['comments', 'inline', 'reviews'].includes(task.kind)) {
      const kind = task.kind === 'comments' ? 'issue_comment' : task.kind === 'inline' ? 'pull_request_review_comment' : 'pull_request_review';
      for (const item of items) { const fact = commentFact(repo, item, at, kind, task.pr, task.sha); out.push(fact); if (state.snapshot.comments.length < 40) state.snapshot.comments.push({ id: item.id, body: item.body?.slice(0, 8000), author: item.user?.login, updatedAt: item.updated_at || item.submitted_at, url: item.html_url, issueNumber: fact.data.issueNumber }); }
    } else if (task.kind === 'compare') {
      if (!Array.isArray(data?.files)) throw new GitHubError('INVALID_RESPONSE', 'GitHub pinned comparison omitted changed files.');
      const completeFiles = Number.isInteger(task.expectedFiles) ? data.files.length === task.expectedFiles : data.files.length < 300;
      cov(task.key, { complete: completeFiles, items: data.files.length, expected: task.expectedFiles ?? null, baseSha: task.baseSha, sha: task.sha, error: completeFiles ? null : 'DIFF_LIMIT' });
      if (!completeFiles) warnings.push({ source: task.key, code: 'DIFF_LIMIT', message: 'Pinned GitHub comparison does not cover all changed files (API limit 300); missing changes remain unverified.' });
      for (const file of data.files) out.push(evidence(repo, 'changed_file', `pr:${task.pr}:file:${file.filename}`, { prNumber: task.pr, baseSha: task.baseSha, path: file.filename, previousPath: file.previous_filename || null, status: file.status, additions: file.additions, deletions: file.deletions, blobSha: file.sha, patch: file.patch?.slice(0, 32768) || null, patchComplete: typeof file.patch === 'string' && file.patch.length <= 32768 }, { sha: task.sha, sourceUrl: `${WEB}/${repo}/compare/${task.baseSha}...${task.sha}`, observedAt: at, complete: typeof file.patch === 'string' && file.patch.length <= 32768 }));
    } else if (task.kind === 'commits') {
      for (const item of items) { out.push(commitFact(repo, item, at)); if (state.snapshot.commits.length < 30) state.snapshot.commits.push({ sha: item.sha, title: item.commit?.message?.split('\n')[0], date: item.commit?.committer?.date, url: item.html_url }); }
    } else if (task.kind === 'runs' || task.kind === 'run') {
      for (const run of task.kind === 'run' ? [data] : items) {
        if (!positive(run.id) || !SHA.test(run.head_sha || '')) continue;
        const attempt = positive(run.run_attempt) || 1;
        out.push(runFact(repo, run, at));
        if (state.snapshot.workflowRuns.length < 100 && !state.snapshot.workflowRuns.some(x => x.id === run.id && x.runAttempt === attempt)) state.snapshot.workflowRuns.push({ id: run.id, name: run.name, headSha: run.head_sha, status: run.status, conclusion: run.conclusion, runAttempt: attempt, updatedAt: run.updated_at, url: run.html_url });
        if (mark(`jobs:${run.id}:${attempt}`)) enqueue(list('jobs', `${base}/actions/runs/${run.id}/attempts/${attempt}/jobs`, `run:${run.id}:attempt:${attempt}:jobs`, { run: { id: run.id, name: run.name, workflow_id: run.workflow_id, head_sha: run.head_sha, head_branch: run.head_branch, event: run.event, status: run.status, conclusion: run.conclusion, run_attempt: attempt, created_at: run.created_at, updated_at: run.updated_at, run_started_at: run.run_started_at, html_url: run.html_url }, sha: run.head_sha, attempt }));
        if (task.kind === 'runs') for (let prior = attempt - 1; prior >= 1; prior--) if (mark(`run:${run.id}:${prior}`)) enqueue({ kind: 'run', key: `run:${run.id}:attempt:${prior}`, path: `${base}/actions/runs/${run.id}/attempts/${prior}` });
      }
    } else if (task.kind === 'jobs') {
      for (const job of items) out.push(jobFact(repo, job, at, task.attempt, task.sha));
      const progress = state.coverage.find(c => c.source === task.key); if (progress.complete) out.push(runFact(repo, task.run, at, true));
    } else if (task.kind === 'checks' || task.kind === 'statuses') {
      for (const item of items) out.push(evidence(repo, task.kind === 'checks' ? 'check_run' : 'commit_status', `${task.kind === 'checks' ? 'check_run' : 'commit_status'}:${item.id}`, { id: item.id, name: item.name || item.context, status: item.status, conclusion: item.conclusion || null, state: item.state, description: item.description, startedAt: item.started_at, completedAt: item.completed_at, createdAt: item.created_at, updatedAt: item.updated_at, app: item.app ? { id: item.app.id, slug: item.app.slug } : null, output: item.output ? { title: item.output.title, summary: item.output.summary, text: item.output.text } : null }, { sha: item.head_sha || task.sha, sourceUrl: sourceURL(item.html_url || item.target_url, repo, `${WEB}/${repo}/commit/${task.sha}/checks`), occurredAt: item.completed_at || item.updated_at || item.created_at, observedAt: at }));
    } else if (task.kind === 'deployments') {
      for (const item of items) { out.push(evidence(repo, 'deployment', `deployment:${item.id}`, { id: item.id, sha: item.sha, ref: item.ref, task: item.task, environment: item.environment, description: item.description, productionEnvironment: item.production_environment, transientEnvironment: item.transient_environment, createdAt: item.created_at }, { sha: item.sha, sourceUrl: `${WEB}/${repo}/deployments`, occurredAt: item.created_at, observedAt: at, author: item.creator?.login || '' })); if (mark(`deployment:${item.id}`)) enqueue(list('deployment_statuses', `${base}/deployments/${item.id}/statuses`, `deployment:${item.id}:statuses`, { deployment: item.id, sha: item.sha })); }
    } else if (task.kind === 'deployment_statuses') {
      for (const item of items) out.push(evidence(repo, 'deployment_status', `deployment_status:${item.id}`, { id: item.id, deploymentId: task.deployment, state: item.state, description: item.description, environment: item.environment, environmentUrl: item.environment_url, createdAt: item.created_at, updatedAt: item.updated_at }, { sha: task.sha, sourceUrl: sourceURL(item.log_url || item.target_url, repo, `${WEB}/${repo}/deployments`), occurredAt: item.updated_at || item.created_at, observedAt: at, author: item.creator?.login || '' }));
    } else if (task.kind === 'document') {
      if (Array.isArray(data) || data?.type !== 'file' || data.submodule_git_url) { cov(task.key, { complete: false, error: 'NOT_A_FILE' }); warnings.push({ source: task.key, code: 'NOT_A_FILE', message: 'Configured plan source is not a regular file.' }); continue; }
      let content = null, complete = data.encoding === 'base64' && data.size <= MAX_FILE && typeof data.content === 'string';
      if (complete) { try { const bytes = Buffer.from(data.content.replace(/\s/g, ''), 'base64'); complete = bytes.length === data.size && bytes.length <= MAX_FILE; if (complete) content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { complete = false; } }
      if (!complete) { cov(task.key, { complete: false, error: 'DOCUMENT_UNREADABLE' }); warnings.push({ source: task.key, code: 'DOCUMENT_UNREADABLE', message: 'Plan content is unavailable, too large or not UTF-8; its version remains recorded.' }); }
      const fact = evidence(repo, 'document', `document:${task.line}:${task.sourcePath}`, { path: task.sourcePath, line: task.line, blobSha: data.sha, size: data.size, content, unavailable: !complete, ref: task.sha }, { sha: task.sha, sourceUrl: `${WEB}/${repo}/blob/${task.sha}/${task.sourcePath.split('/').map(encodeURIComponent).join('/')}`, observedAt: at, complete }); out.push(fact);
      if (!state.snapshot.planDocument && /PLAN|plan|ACCEPTANCE/.test(task.sourcePath)) state.snapshot.planDocument = { path: task.sourcePath, ref: task.sha, sha: data.sha, content: content?.slice(0, 20_000), truncated: content?.length > 20_000, sourceUrl: fact.sourceUrl, unavailable: !complete };
    }
  }
  state.tasks.push(...deferred);
  // Snapshot is a bounded UI convenience, never the authoritative event/history store.
  for (const source of state.coverage) if (!source.complete && source.error && !warnings.some(w => w.source === source.source && w.code === source.error)) warnings.push({ source: source.source, code: source.error, message: `Source coverage remains incomplete: ${source.source}.`, retryAt: source.retryAt || null });
  state.snapshot.fetchedAt = at; state.snapshot.warnings = warnings.map(w => w.message);
  const complete = !state.tasks.length && state.coverage.every(c => c.complete);
  const coverage = { complete, sources: state.coverage, requests, pendingTasks: state.tasks.length, since: state.since, startedAt: state.startedAt, observedAt: at, scope: 'Default-branch activity, selected PR details, repository event collections, and selected version-pinned documents; historical document revisions and unselected PR details are not exhaustively read.', mutableCollections: 'overlapping incremental observations, not a frozen GitHub transaction', allHistory: false };
  return { evidence: [...new Map(out.map(e => [e.id, e])).values()], headSha: state.snapshot.trackedHeadSha || state.headSha, mainSha: state.headSha, sourceConfig: { selectedPrNumbers: state.selected, sourcePaths: state.paths }, coverage, warnings, snapshot: state.snapshot, cursor: state.tasks.length ? state : null, retryAt: retry };
}
