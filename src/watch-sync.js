import { parseWatchRepo, watchChecksFor } from './watch-domain.js';

// Public GETs only. The caller schedules one repository per shared interval, not one timer per card.
function watchSyncError(message, code, details = {}) { return Object.assign(new Error(message), { code, ...details }); }
function watchRate(response) {
  const remaining = response.headers?.get?.('x-ratelimit-remaining');
  const reset = response.headers?.get?.('x-ratelimit-reset');
  const retry = response.headers?.get?.('retry-after');
  const resetNumber = Number(reset);
  return { remaining: remaining === null || remaining === undefined ? null : Number(remaining), resetAt: reset && Number.isFinite(resetNumber) ? new Date(resetNumber * 1000).toISOString() : null, retryAfterSeconds: retry && Number.isFinite(Number(retry)) ? Number(retry) : null };
}
async function readWatchResource(fetchImpl, url, signal, allowUnavailable = false) {
  let response;
  try { response = await fetchImpl(url, { method: 'GET', headers: { Accept: 'application/vnd.github+json' }, credentials: 'omit', cache: 'no-store', signal }); }
  catch (error) { if (error.name === 'AbortError') throw error; throw watchSyncError('暂时无法连接 GitHub，保留上次读取结果。', 'NETWORK_ERROR'); }
  const rate = watchRate(response);
  if (!response.ok) {
    if (allowUnavailable && response.status === 404) return { data: null, unavailable: true, rate, status: 404, hasNext: false };
    if (response.status === 429 || response.status === 403 && rate.remaining === 0) throw watchSyncError('公开读取额度暂时用完，稍后继续。上次结果已保留。', 'RATE_LIMITED', { status: response.status, ...rate });
    if (response.status === 404) throw watchSyncError('没有读到这个公开仓库，请核对地址。私有仓库需要授权接入。', 'NOT_FOUND', { status: response.status });
    if (response.status === 403) throw watchSyncError('GitHub 暂时拒绝读取，保留上次结果。', 'FORBIDDEN', { status: response.status, ...rate });
    throw watchSyncError(`GitHub 读取未成功（${response.status}），保留上次结果。`, 'HTTP_ERROR', { status: response.status, ...rate });
  }
  let data; try { data = await response.json(); } catch { throw watchSyncError('GitHub 返回的数据无法读取，保留上次结果。', 'INVALID_RESPONSE'); }
  return { data, rate, hasNext: /rel="next"/.test(response.headers?.get?.('link') || ''), status: response.status };
}
function watchNormalizeLabels(labels = []) { return labels.map(label => String(typeof label === 'string' ? label : label.name || '')).filter(Boolean); }
function watchShort(value, max = 3000) { return String(value || '').slice(0, max); }
function watchNormalizeRun(run) {
  return { id: run.id, workflowId: run.workflow_id, name: run.name, headSha: run.head_sha, headBranch: run.head_branch || '', status: run.status, conclusion: run.conclusion, runAttempt: run.run_attempt || 1, event: run.event || '', createdAt: run.created_at, updatedAt: run.updated_at || run.created_at, url: run.html_url };
}
function watchPlanPath(path) {
  const value = String(path || '').trim().replace(/^\/+/, '');
  if (!value || value.length > 500 || value.split('/').some(part => !part || part === '.' || part === '..') || /[\u0000-\u001f]/.test(value)) throw watchSyncError('计划文件路径不正确。', 'INVALID_PLAN_PATH');
  return value;
}
function watchDecodeFile(file) {
  if (file.encoding !== 'base64' || typeof file.content !== 'string') return null;
  try { return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(file.content.replace(/\s/g, '')), character => character.charCodeAt(0))); }
  catch { return null; }
}

export async function fetchWatchSnapshot(input, { fetchImpl = globalThis.fetch, signal, previous, trackedPr, sourceRef, planPath, commentIssue } = {}) {
  const repo = parseWatchRepo(input);
  if (!repo) throw watchSyncError('请先填写一个公开 GitHub 仓库。', 'MISSING_REPOSITORY');
  if (typeof fetchImpl !== 'function') throw watchSyncError('当前浏览器无法发起网络读取。', 'FETCH_UNAVAILABLE');
  const requestedPlanPath = planPath ? watchPlanPath(planPath) : null;
  const base = `https://api.github.com/repos/${repo}`, requests = [];
  const get = async (path, allowUnavailable = false) => { const result = await readWatchResource(fetchImpl, base + path, signal, allowUnavailable); requests.push(result); return result; };
  const repository = await get('');
  if (repository.data.private) throw watchSyncError('当前版本只读取公开仓库，不保存账号凭据。', 'PRIVATE_REPOSITORY');
  if (repository.data.full_name?.toLowerCase() !== repo.toLowerCase()) throw watchSyncError('仓库身份不匹配，请核对地址。', 'REPOSITORY_CHANGED');
  const branch = repository.data.default_branch || 'main';
  const [pulls, actions, issues, commits] = await Promise.all([
    get('/pulls?state=all&sort=updated&direction=desc&per_page=30'),
    get('/actions/runs?per_page=30'),
    get('/issues?state=all&sort=updated&direction=desc&per_page=20'),
    get(`/commits?sha=${encodeURIComponent(branch)}&per_page=10`)
  ]);
  if (!Array.isArray(pulls.data) || !Array.isArray(actions.data.workflow_runs) || !Array.isArray(issues.data) || !Array.isArray(commits.data)) throw watchSyncError('开发记录返回不完整，保留上次结果。', 'INVALID_RESPONSE');
  if (pulls.data.some(pull => !Number.isSafeInteger(pull.number) || !pull.head?.sha || !pull.title)) throw watchSyncError('部分 PR 缺少版本信息，保留上次结果。', 'INVALID_RESPONSE');
  const warnings = [], workflowRuns = actions.data.workflow_runs.slice(0, 30).map(watchNormalizeRun);
  const pullRequests = pulls.data.slice(0, 30).map(pull => ({ number: pull.number, title: watchShort(pull.title, 300), body: watchShort(pull.body), state: pull.state, draft: Boolean(pull.draft), merged: Boolean(pull.merged_at), mergedAt: pull.merged_at || null, headSha: pull.head.sha, branch: pull.head.ref || '', base: pull.base?.ref || '', labels: watchNormalizeLabels(pull.labels), updatedAt: pull.updated_at, createdAt: pull.created_at, url: pull.html_url || `https://github.com/${repo}/pull/${pull.number}`, check: watchChecksFor(pull.head.sha, workflowRuns) }));
  const number = Number(Array.isArray(trackedPr) ? trackedPr[0] : trackedPr);
  const tracked = pullRequests.find(pull => pull.number === number);
  const commentNumber = Number(commentIssue || number);
  if (Number.isSafeInteger(number) && number > 0 && !tracked) warnings.push(`当前 30 个近期 PR 未覆盖关注的 #${number}，其版本状态暂不可确认。`);
  if (pulls.hasNext) warnings.push('PR 只覆盖最近更新的 30 项。');
  if (actions.hasNext) warnings.push('检查只覆盖最近 30 次 Actions；没有读到不等于通过。');
  if (issues.hasNext) warnings.push('事项只覆盖最近更新的 20 项，不能据此断言没有其他阻塞。');
  if (commits.hasNext) warnings.push('默认分支只覆盖最近 10 次提交。');
  let comments = [], planDocument = null, discussionComplete = false, commentsExamined = 0;
  if (Number.isSafeInteger(commentNumber) && commentNumber > 0) {
    // Repository comment listing supports updated/desc. The per-issue endpoint is ascending.
    // A single bounded read avoids silently fetching the oldest comments as if they were newest.
    const response = await get('/issues/comments?sort=updated&direction=desc&per_page=30');
    if (!Array.isArray(response.data)) throw watchSyncError('开发讨论返回不完整，保留上次结果。', 'INVALID_RESPONSE');
    const readComments = response.data.slice(0, 30);
    const matchedComments = readComments.filter(comment => String(comment.issue_url).toLowerCase() === `${base}/issues/${commentNumber}`.toLowerCase());
    commentsExamined = readComments.length;
    discussionComplete = !response.hasNext && response.data.length <= 30 && matchedComments.length <= 15;
    comments = matchedComments.slice(0, 15).map(comment => ({ id: comment.id, issueNumber: commentNumber, body: watchShort(comment.body, 10000), bodyTruncated: String(comment.body || '').length > 10000, createdAt: comment.created_at, updatedAt: comment.updated_at, url: comment.html_url, author: comment.user?.login || '' }));
    warnings.push('讨论仅覆盖仓库最近更新的 30 条评论中，与关注事项相关的最多 15 条；没有读到不等于没有新讨论。');
  }
  if (requestedPlanPath) {
    const path = requestedPlanPath;
    if (Number.isSafeInteger(number) && number > 0 && !tracked) {
      planDocument = { path, ref: null, sourceUrl: `https://github.com/${repo}/pull/${number}`, unavailable: true, status: 'source-unconfirmed', content: null, sha: null };
      warnings.push('没有取得所关注 PR 的当前版本，计划文件暂不刷新；不会改读其他开发线代替。');
    } else {
    // Re-resolve the tracked PR every cycle, then pin this file read to that observed head.
    const ref = tracked?.headSha || (/^[a-f0-9]{40}$/i.test(String(sourceRef || '')) ? commits.data[0]?.sha || branch : sourceRef || commits.data[0]?.sha || branch);
    const response = await get(`/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`, true);
    const url = `https://github.com/${repo}/blob/${encodeURIComponent(ref)}/${path.split('/').map(encodeURIComponent).join('/')}`;
    if (response.unavailable) {
      planDocument = { path, ref, sourceUrl: url, unavailable: true, status: 404, content: null, sha: null };
      warnings.push('当前版本未能找到所关联的计划文件，旧计划保留为历史依据。');
    } else if (Array.isArray(response.data) || response.data.type !== 'file') {
      throw watchSyncError('关联的计划路径不是文件，保留上次结果。', 'INVALID_PLAN_FILE');
    } else {
      const decoded = response.data.size > 120000 ? null : watchDecodeFile(response.data);
      planDocument = { path, ref, sha: response.data.sha, sourceUrl: url, content: decoded === null ? null : decoded.slice(0, 60000), truncated: decoded !== null && decoded.length > 60000, unavailable: decoded === null, status: 200 };
      if (decoded === null) warnings.push('计划文件过大或不是可读取的 UTF-8 文本，暂只记录其版本。');
      else if (decoded.length > 60000) warnings.push('计划正文仅保留前 60,000 个字符，不能据此推断全部计划。');
    }
    }
  }
  const rates = requests.map(request => request.rate).filter(rate => rate.remaining !== null).sort((a, b) => a.remaining - b.remaining);
  return {
    repo: repository.data.full_name, fetchedAt: new Date().toISOString(), source: 'github-public-api',
    repository: { fullName: repository.data.full_name, defaultBranch: branch, url: repository.data.html_url || `https://github.com/${repo}`, pushedAt: repository.data.pushed_at, updatedAt: repository.data.updated_at },
    trackedHeadSha: tracked?.headSha || null, pullRequests, workflowRuns,
    issues: issues.data.filter(issue => !issue.pull_request).slice(0, 20).map(issue => ({ number: issue.number, title: watchShort(issue.title, 300), body: watchShort(issue.body), state: issue.state, labels: watchNormalizeLabels(issue.labels), updatedAt: issue.updated_at, url: issue.html_url })),
    commits: commits.data.slice(0, 10).map(commit => ({ sha: commit.sha, title: watchShort(commit.commit?.message?.split('\n')[0], 300), date: commit.commit?.committer?.date || commit.commit?.author?.date, url: commit.html_url })),
    comments, planDocument, warnings, rateLimit: rates[0] || { remaining: null, resetAt: null, retryAfterSeconds: null },
    coverage: { requestCount: requests.length, pullRequests: pullRequests.length, pullRequestsComplete: !pulls.hasNext, workflowRuns: workflowRuns.length, workflowRunsComplete: !actions.hasNext, issues: Math.min(issues.data.filter(issue => !issue.pull_request).length, 20), issuesComplete: !issues.hasNext, commits: Math.min(commits.data.length, 10), commitsComplete: !commits.hasNext, comments: comments.length, commentsExamined, sourceCodeRead: false, planRead: Boolean(planDocument && planDocument.status !== 'source-unconfirmed'), discussionComplete, commentBodiesComplete: comments.every(comment => !comment.bodyTruncated) },
    previousFetchedAt: previous?.fetchedAt || null
  };
}
