import { parseRepo } from './personal-domain.js';

// Public read-only REST access. No credentials, token inputs, background service,
// or source-code writes. Missing workflow evidence stays explicitly unknown.
const CHECK_FAILURES = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'stale']);
function syncError(message, code, details = {}) { return Object.assign(new Error(message), { code, ...details }); }
function rateInfo(response) {
  const remaining = response.headers?.get?.('x-ratelimit-remaining');
  const reset = response.headers?.get?.('x-ratelimit-reset');
  const retryAfter = response.headers?.get?.('retry-after');
  return { remaining: remaining === null || remaining === undefined ? null : Number(remaining), resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : null, retryAfterSeconds: retryAfter ? Number(retryAfter) : null };
}
async function read(fetchImpl, url, signal) {
  let response;
  try { response = await fetchImpl(url, { method: 'GET', headers: { Accept: 'application/vnd.github+json' }, signal, credentials: 'omit', cache: 'no-store' }); }
  catch (error) { if (error.name === 'AbortError') throw error; throw syncError('暂时无法连接 GitHub。上次成功读取的状态会保留。', 'NETWORK_ERROR'); }
  const rate = rateInfo(response);
  if (!response.ok) {
    if (response.status === 429 || response.status === 403 && rate.remaining === 0) throw syncError('GitHub 的公开读取额度暂时用完，请稍后重试。上次状态已保留。', 'RATE_LIMITED', { ...rate, status: response.status });
    if (response.status === 404) throw syncError('没有读到这个公开仓库。请检查地址；私有仓库需要之后接入授权。', 'NOT_FOUND', { status: response.status });
    if (response.status === 403) throw syncError('GitHub 暂时拒绝了读取，请稍后再试。上次状态已保留。', 'FORBIDDEN', { ...rate, status: response.status });
    throw syncError(`GitHub 读取失败（${response.status}），保留上次成功的状态。`, 'HTTP_ERROR', { status: response.status });
  }
  let data; try { data = await response.json(); } catch { throw syncError('GitHub 返回的数据无法读取，保留上次状态。', 'INVALID_RESPONSE'); }
  return { data, rate, hasNext: /rel="next"/.test(response.headers?.get?.('link') || '') };
}
function checksFor(pull, runs) {
  const matching = runs.filter(run => run.head_sha === pull.head.sha);
  const latest = new Map();
  for (const run of matching) {
    const key = run.workflow_id || run.path || run.name || run.id;
    const existing = latest.get(key);
    if (!existing || (run.run_attempt || 1) > (existing.run_attempt || 1) && run.id === existing.id || new Date(run.created_at) > new Date(existing.created_at) || run.created_at === existing.created_at && run.id > existing.id) latest.set(key, run);
  }
  const checks = [...latest.values()];
  const failure = checks.find(run => CHECK_FAILURES.has(run.conclusion));
  const pending = checks.find(run => run.status !== 'completed');
  const passing = checks.length && checks.every(run => run.status === 'completed' && ['success', 'skipped', 'neutral'].includes(run.conclusion)) && checks.some(run => run.conclusion === 'success');
  const chosen = failure || pending || checks[0];
  return { state: failure ? 'failure' : pending ? 'pending' : passing ? 'success' : 'unknown', headSha: pull.head.sha, url: chosen?.html_url || '', runId: chosen?.id || null, conclusion: chosen?.conclusion || null, coverage: 'recent-actions-workflows', runs: checks.map(run => ({ id: run.id, name: run.name, status: run.status, conclusion: run.conclusion, url: run.html_url })) };
}
export async function fetchGitHubSnapshot(input, { fetchImpl = globalThis.fetch, signal, previous } = {}) {
  const repo = parseRepo(input);
  if (!repo) throw syncError('先填写一个公开 GitHub 仓库。', 'MISSING_REPOSITORY');
  if (typeof fetchImpl !== 'function') throw syncError('当前浏览器无法读取网络，请使用支持 fetch 的浏览器。', 'FETCH_UNAVAILABLE');
  const base = `https://api.github.com/repos/${repo}`;
  const repository = await read(fetchImpl, base, signal);
  if (repository.data.private) throw syncError('当前原型只读取公开仓库，不保存账号凭据。', 'PRIVATE_REPOSITORY');
  if (!repository.data.full_name || repository.data.full_name.toLowerCase() !== repo.toLowerCase()) throw syncError('仓库身份发生变化，请核对地址后重新连接。', 'REPOSITORY_CHANGED');
  const [pulls, workflows] = await Promise.all([
    read(fetchImpl, `${base}/pulls?state=all&sort=updated&direction=desc&per_page=100`, signal),
    read(fetchImpl, `${base}/actions/runs?per_page=30`, signal)
  ]);
  if (!Array.isArray(pulls.data) || !Array.isArray(workflows.data.workflow_runs)) throw syncError('仓库返回的 PR 或检查数据不完整，保留上次状态。', 'INVALID_RESPONSE');
  if (pulls.data.some(p => !Number.isInteger(p.number) || !p.head?.sha || !p.title)) throw syncError('部分 PR 缺少关键状态，保留上次成功读取。', 'INVALID_RESPONSE');
  const warnings = [];
  if (pulls.hasNext) warnings.push('当前只读取最近更新的 100 个 PR；未覆盖的关联改动会显示待确认。');
  if (workflows.hasNext) warnings.push('自动检查只覆盖最近 30 次 Actions 运行；旧版本缺少检查时不会推断通过。');
  const normalized = pulls.data.map(pull => ({ number: pull.number, title: pull.title, state: pull.state, draft: Boolean(pull.draft), merged: Boolean(pull.merged_at), headSha: pull.head.sha, branch: pull.head.ref || '', base: pull.base?.ref || '', url: pull.html_url || `https://github.com/${repo}/pull/${pull.number}`, updatedAt: pull.updated_at, mergedAt: pull.merged_at || null, check: checksFor(pull, workflows.data.workflow_runs) }));
  const rates = [repository.rate, pulls.rate, workflows.rate].filter(r => r.remaining !== null);
  const rateLimit = rates.sort((a, b) => a.remaining - b.remaining)[0] || { remaining: null, resetAt: null, retryAfterSeconds: null };
  return { repo: repository.data.full_name, fetchedAt: new Date().toISOString(), source: 'github-public-api', repository: { fullName: repository.data.full_name, defaultBranch: repository.data.default_branch, url: repository.data.html_url, description: repository.data.description || '', pushedAt: repository.data.pushed_at, updatedAt: repository.data.updated_at }, pullRequests: normalized, warnings, complete: !pulls.hasNext && !workflows.hasNext, rateLimit, coverage: { pullRequests: normalized.length, workflowRuns: workflows.data.workflow_runs.length, sourceCodeRead: false }, previousFetchedAt: previous?.fetchedAt || null };
}
