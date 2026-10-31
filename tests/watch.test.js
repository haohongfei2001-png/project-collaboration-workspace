import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWatchRepo, createWatchState, toggleWatch, setMonitor, applyWatchSnapshot, getWatchSummary, getAttention, resolveAttention, addWatchNote, addWatchTask, toggleWatchTask, watchChecksFor } from '../src/watch-domain.js';
import { fetchWatchSnapshot } from '../src/watch-sync.js';

const REPO = 'example/project';
const A = 'a'.repeat(40), B = 'b'.repeat(40), C = 'c'.repeat(40);
const AT = '2026-11-01T00:00:00.000Z', LATER = '2026-11-01T00:10:00.000Z';
const run = (patch = {}) => ({ id: 1, workflowId: 5, name: 'Checks', event: 'pull_request', headSha: A, status: 'completed', conclusion: 'success', createdAt: AT, url: `https://github.com/${REPO}/actions/runs/1`, ...patch });
const pull = (patch = {}) => ({ number: 1, title: '保存资料', state: 'open', headSha: A, updatedAt: AT, base: 'main', url: `https://github.com/${REPO}/pull/1`, ...patch });
const snapshot = (patch = {}) => ({ repo: REPO, fetchedAt: AT, repository: { defaultBranch: 'main' }, pullRequests: [pull()], workflowRuns: [run()], issues: [], commits: [], comments: [], warnings: [], ...patch });
const seed = (patch = {}) => ({ id: 'project', name: '个人项目', repo: REPO, sourceRef: A, trackedPr: 1, watching: true, observedAt: AT, phase: { label: '个人体验验证', sourceUrl: `https://github.com/${REPO}/pull/1` }, plan: { title: '当前计划', ref: A, scopeLabel: '本轮计划', scopeComplete: true, sourceUrl: `https://github.com/${REPO}/blob/${A}/PLAN.md`, items: [{ id: 'a', title: '资料保存', status: 'done' }, { id: 'b', title: '资料搜索', status: 'active' }, { id: 'c', title: '体验验证', status: 'todo' }] }, attention: [], rounds: [], snapshot: snapshot(), ...patch });
const state = patch => createWatchState([seed(patch)]);
const project = s => s.projects[0];
const response = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });

function api(options = {}) {
  const calls = [], repoData = { full_name: REPO, private: false, default_branch: 'main', html_url: `https://github.com/${REPO}` };
  const pulls = [{ number: 1, title: '资料保存', state: 'open', head: { sha: B, ref: 'feature/notes' }, base: { ref: 'main' }, html_url: `https://github.com/${REPO}/pull/1`, updated_at: LATER, labels: [] }];
  const runs = [{ id: 8, workflow_id: 5, head_sha: B, status: 'completed', conclusion: 'success', name: 'Checks', event: 'pull_request', created_at: LATER, html_url: `https://github.com/${REPO}/actions/runs/8` }];
  const commits = [{ sha: C, html_url: `https://github.com/${REPO}/commit/${C}`, commit: { message: 'revert: restore approved site\n\nDetails', committer: { date: LATER } } }];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const custom = options.route?.(url, init);
    if (custom) return custom;
    if (url.includes('/pulls?')) return response(options.pulls || pulls, 200, options.headers);
    if (url.includes('/actions/runs?')) return response({ workflow_runs: options.runs || runs }, 200, options.headers);
    if (url.includes('/issues/comments?')) return response(options.comments || [{ id: 1, issue_url: `https://api.github.com/repos/${REPO}/issues/1`, body: '请确认验收范围', updated_at: LATER, html_url: `https://github.com/${REPO}/pull/1#issuecomment-1` }]);
    if (url.includes('/issues?')) return response(options.issues || []);
    if (url.includes('/commits?')) return response(options.commits || commits);
    if (url.includes('/contents/')) return response(options.file || { type: 'file', sha: 'plan-new', size: 31, encoding: 'base64', content: Buffer.from('# 当前计划\n- [ ] 实机验证').toString('base64') });
    return response(options.repository || repoData);
  };
  return { calls, fetchImpl };
}

test('repo validation prevents credential URLs, host lookalikes and path traversal before network access', () => {
  assert.equal(parseWatchRepo(`https://github.com/${REPO}.git`), REPO);
  for (const value of ['https://github.com.evil.test/a/b', 'https://token@github.com/a/b', 'https://github.com/a/b?token=x', 'a/..', 'a/b/tree/main', 'http://github.com/a/b']) assert.throws(() => parseWatchRepo(value));
});

test('monitor selection and personal notes/tasks persist without mutating the prior state', () => {
  const original = state(), before = JSON.stringify(original);
  let next = toggleWatch(original, 'project');
  next = setMonitor(next, true);
  next = addWatchNote(next, 'project', { title: '体验记录', text: '在手机上验证资料入口' });
  next = addWatchTask(next, 'project', { id: 'try', title: '试一次资料检索' });
  next = toggleWatchTask(next, 'project', 'try');
  assert.equal(project(next).watching, false); assert.equal(next.monitor.enabled, true);
  assert.equal(project(next).notes[0].text, '在手机上验证资料入口'); assert.equal(project(next).tasks[0].done, true);
  assert.equal(JSON.stringify(original), before); assert.deepEqual(JSON.parse(JSON.stringify(next)), next);
});

test('only an explicitly complete plan scope has a percentage; excerpts and unknown statuses do not fabricate overall completion', () => {
  const complete = getWatchSummary(seed(), Date.parse(AT)).progress;
  assert.equal(complete.percent, 33); assert.equal(complete.label, '本轮计划');
  const partial = seed(); delete partial.plan.scopeComplete;
  assert.equal(getWatchSummary(partial).progress.known, false); assert.equal(getWatchSummary(partial).progress.percent, null);
  assert.equal(getWatchSummary(partial).progress.done, 1);
  partial.plan.scopeComplete = true; partial.plan.items[1].status = 'unknown';
  assert.equal(getWatchSummary(partial).progress.known, false);
});

test('passed CI and merged PR never silently complete plan items', () => {
  const s = state(), next = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: LATER, pullRequests: [pull({ merged: true, state: 'closed' })] }));
  assert.deepEqual(project(next).plan.items, project(s).plan.items);
  assert.equal(getWatchSummary(project(next)).progress.done, 1);
  assert.equal(getWatchSummary(project(next)).checks[0].state, 'success');
});

test('inactivity can make information stale but never becomes a blocked or approval signal', () => {
  const summary = getWatchSummary(seed(), Date.parse(AT) + 86400000);
  assert.equal(summary.stale, true); assert.equal(summary.attention.length, 0);
  assert.equal(summary.phase.label, '个人体验验证');
});

test('an open PR does not imply the user is required to approve it', () => {
  const s = state(); assert.equal(getAttention(s).length, 0);
  assert.equal(getWatchSummary(project(s)).rounds[0].status, 'active');
});

test('failure on an old head cannot block the current head', () => {
  const p = seed({ sourceRef: B, snapshot: snapshot({ pullRequests: [pull({ headSha: B })], workflowRuns: [run({ conclusion: 'failure' })] }) });
  assert.equal(getWatchSummary(p).checks[0].state, 'unknown'); assert.equal(getWatchSummary(p).attention.length, 0);
});

test('latest successful run replaces older failure for the same workflow event but not another event', () => {
  const runs = [run({ conclusion: 'failure' }), run({ id: 2, createdAt: LATER })];
  assert.equal(watchChecksFor(A, runs).state, 'success');
  runs.push(run({ id: 3, event: 'push', conclusion: 'failure', createdAt: LATER }));
  assert.equal(watchChecksFor(A, runs).state, 'failure');
});

test('a rerun attempt in progress supersedes its earlier failed attempt, and cancellations remain unknown', () => {
  assert.equal(watchChecksFor(A, [run({ conclusion: 'failure', runAttempt: 1 }), run({ status: 'in_progress', conclusion: null, runAttempt: 2 })]).state, 'pending');
  assert.equal(watchChecksFor(A, [run({ conclusion: 'cancelled' })]).state, 'unknown');
});

test('only exact explicit labels generate approval and decision alerts; body phrases and near matches do not', () => {
  const p = seed({ snapshot: snapshot({ issues: [{ number: 7, title: '选择方案', body: 'no approval needed', state: 'open', labels: ['needs-decision'], updatedAt: AT, url: `https://github.com/${REPO}/issues/7` }, { number: 8, title: '不用批准', state: 'open', labels: ['no-approval-required'], updatedAt: AT }, { number: 9, title: '以前的批准', state: 'closed', labels: ['needs-approval'] }] }) });
  const attention = getWatchSummary(p).attention;
  assert.equal(attention.length, 1); assert.equal(attention[0].kind, 'decision'); assert.equal(attention[0].confidence, 'explicit-label');
});

test('source review blockers survive green CI, and a new revision flags reviewed statements for rechecking', () => {
  let p = seed({ attention: [{ id: 'mac', title: '真实设备入口仍未通过', kind: 'blocked', ref: A, sourceUrl: `https://github.com/${REPO}/pull/1#issuecomment-9`, at: AT }] });
  assert.equal(getWatchSummary(p).attention[0].kind, 'blocked');
  p = project(applyWatchSnapshot(createWatchState([p]), 'project', snapshot({ fetchedAt: LATER, pullRequests: [pull({ headSha: B })], workflowRuns: [run({ headSha: B })] })));
  const summary = getWatchSummary(p);
  assert.equal(summary.progress.known, false); assert.equal(summary.sourceChanged, true);
  assert.equal(summary.attention[0].needsReview, true); assert.equal(summary.attention[0].kind, 'verify');
});

test('new discussion marks a curated attention statement for rechecking without pretending to understand arbitrary prose', () => {
  const p = seed({ attention: [{ title: '等待一次实测', kind: 'verify', ref: A, at: AT }], snapshot: snapshot({ comments: [{ id: 99, body: 'All is ready / actually no', updatedAt: LATER }] }) });
  assert.equal(getWatchSummary(p).attention[0].needsReview, true);
  assert.equal(getWatchSummary(p).attention.length, 1);
  assert.equal(getWatchSummary(p).sourceChanged, true);
  assert.equal(getWatchSummary(p).progress.known, false);
});

test('discussion for an unrelated PR does not invalidate the tracked project statement', () => {
  const p = seed({ snapshot: snapshot({ comments: [{ id: 99, issueNumber: 77, updatedAt: LATER }] }) });
  assert.equal(getWatchSummary(p).sourceChanged, false);
});

test('local acknowledgement hides only the exact source condition; a new failed run reappears', () => {
  let s = state({ snapshot: snapshot({ workflowRuns: [run({ conclusion: 'failure' })] }) });
  const alert = getAttention(s)[0];
  assert.throws(() => resolveAttention(s, 'project', alert.key, ''));
  s = resolveAttention(s, 'project', alert.key, '已安排排查，未批准 GitHub 操作');
  assert.equal(getAttention(s).length, 0);
  assert.equal(getWatchSummary(project(s)).resolvedAttention[0].resolution.scope, 'local-acknowledgement');
  assert.equal(project(s).snapshot.workflowRuns[0].conclusion, 'failure');
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: LATER, workflowRuns: [run({ id: 2, conclusion: 'failure', createdAt: LATER })] }));
  assert.equal(getAttention(s).length, 1);
  assert.equal(getWatchSummary(project(s)).resolvedAttention.length, 1);
  assert.equal(getWatchSummary(project(s)).resolvedAttention[0].headSha, A);
  assert.equal(getWatchSummary(project(s)).resolvedAttention[0].sourceUrl, alert.sourceUrl);
});

test('old or foreign snapshots cannot overwrite the current project', () => {
  const s = state({ snapshot: snapshot({ fetchedAt: LATER }) });
  assert.deepEqual(applyWatchSnapshot(s, 'project', snapshot()).projects, s.projects);
  assert.throws(() => applyWatchSnapshot(s, 'project', snapshot({ repo: 'wrong/repo' })));
  assert.throws(() => applyWatchSnapshot(s, 'project', { repo: REPO, fetchedAt: LATER, pullRequests: [] }));
});

test('a tracked PR falling outside the fetched window makes old plan progress unconfirmed', () => {
  const p = seed({ snapshot: snapshot({ pullRequests: [] }) });
  assert.equal(getWatchSummary(p).progress.known, false);
  assert.equal(getWatchSummary(p).sourceChanged, true);
});

test('default branch checks are monitored even when work arrived without a PR', () => {
  const p = seed({ trackedPr: null, sourceRef: 'main', snapshot: snapshot({ pullRequests: [], commits: [{ sha: B, title: 'Fix direct update', date: LATER, url: `https://github.com/${REPO}/commit/${B}` }], workflowRuns: [run({ headSha: B, conclusion: 'failure' })] }) });
  const summary = getWatchSummary(p);
  assert.equal(summary.checks[0].headSha, B);
  assert.equal(summary.attention[0].kind, 'blocked');
  assert.equal(summary.attention[0].prNumber, null);
});

test('main-only monitoring never substitutes an unrelated recently updated open PR', () => {
  const p = seed({ trackedPr: null, sourceRef: 'main', snapshot: snapshot({ pullRequests: [pull({ title: 'Unrelated old website work' })], commits: [{ sha: B, title: 'Current main', date: LATER, url: `https://github.com/${REPO}/commit/${B}` }], workflowRuns: [run({ headSha: A, conclusion: 'failure' }), run({ id: 2, headSha: B, createdAt: LATER })] }) });
  const summary = getWatchSummary(p);
  assert.equal(summary.checks.length, 1); assert.equal(summary.checks[0].headSha, B);
  assert.equal(summary.checks[0].state, 'success'); assert.equal(summary.attention.length, 0);
});

test('new evidence reopens a previously acknowledged reviewed statement for local review', () => {
  let s = state({ attention: [{ title: '等待实机验证', kind: 'verify', ref: A, at: AT }] });
  s = resolveAttention(s, 'project', getAttention(s)[0].key, '已经记录');
  assert.equal(getAttention(s).length, 0);
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: LATER, comments: [{ id: 55, updatedAt: LATER, body: '新的实机结果' }] }));
  assert.equal(getAttention(s).length, 1);
  assert.equal(getAttention(s)[0].needsReview, true);
});

test('default-branch commits and explicit reverts appear even when no PR represents them', () => {
  const p = seed({ snapshot: snapshot({ commits: [{ sha: B, title: 'revert: restore approved site', date: LATER, url: `https://github.com/${REPO}/commit/${B}` }] }) });
  const rounds = getWatchSummary(p).rounds;
  assert.equal(rounds[0].headSha, B); assert.equal(rounds[0].status, 'reverted');
  assert.equal(rounds[0].sources[0].label, '提交记录');
});

test('changed plan content preserves its previous source version and does not parse arbitrary prose into completion', () => {
  let s = state({ snapshot: snapshot({ planDocument: { sha: 'old-document', ref: A, content: '- [x] Old item', sourceUrl: 'https://github.com/example/project/blob/a/PLAN.md' } }) });
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: LATER, planDocument: { sha: 'new-document', ref: A, content: 'Everything 100% done, trust me' } }));
  assert.equal(project(s).previousPlans[0].sha, 'old-document');
  assert.equal(project(s).previousPlans[0].ref, A);
  assert.equal(getWatchSummary(project(s)).progress.done, 1);
  assert.equal(project(s).plan.items.length, 3);
});

test('a missing or truncated plan makes current progress unconfirmed while preserving the reviewed plan', () => {
  const p = seed({ snapshot: snapshot({ planDocument: { unavailable: true, status: 404 } }) });
  assert.equal(getWatchSummary(p).progress.known, false); assert.equal(getWatchSummary(p).progress.needsReview, true);
  assert.equal(p.plan.items.length, 3);
});

test('observed failed revisions and main commits remain in history after they leave the current API window', () => {
  const T2 = '2026-11-01T00:20:00.000Z', D = 'd'.repeat(40);
  let s = state();
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: LATER, pullRequests: [pull({ headSha: B, updatedAt: LATER })], workflowRuns: [run({ id: 2, headSha: B, conclusion: 'failure', createdAt: LATER })], commits: [{ sha: D, title: 'Direct main change', date: LATER, url: `https://github.com/${REPO}/commit/${D}` }] }));
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: T2, pullRequests: [pull({ headSha: C, updatedAt: T2 })], workflowRuns: [run({ id: 3, headSha: C, createdAt: T2 })], commits: [] }));
  const rounds = getWatchSummary(project(s)).rounds;
  assert(rounds.find(round => round.headSha === B).failed.length > 0);
  assert(rounds.some(round => round.headSha === D));
  assert.equal(rounds.find(round => round.headSha === B).provenance, 'observed-history');
  const count = project(s).observedRounds.length;
  s = applyWatchSnapshot(s, 'project', project(s).snapshot);
  assert.equal(project(s).observedRounds.length, count);
});

test('a passing retry on the same revision retains the earlier failed attempt without duplicating the development round', () => {
  const T2 = '2026-11-01T00:20:00.000Z';
  let s = state();
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: LATER, workflowRuns: [run({ id: 2, conclusion: 'failure', createdAt: LATER })] }));
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: T2, workflowRuns: [run({ id: 3, createdAt: T2 })] }));
  const rounds = getWatchSummary(project(s)).rounds.filter(round => round.prNumber === 1 && round.headSha === A);
  assert.equal(rounds.length, 1);
  assert.equal(rounds[0].check.state, 'success');
  assert(rounds[0].failed.some(text => text.includes('曾有')));
  assert(rounds[0].observations.some(observation => observation.runId === 2 && observation.checkState === 'failure'));
  assert(rounds[0].observations.some(observation => observation.runId === 3 && observation.checkState === 'success'));
  assert.equal(getWatchSummary(project(s)).attention.length, 0);
});

test('automatic history excludes unrelated open PRs while main history includes only merged default-branch PRs', () => {
  const pulls = [pull({ updatedAt: LATER }), pull({ number: 2, headSha: B, title: 'Unrelated branch', base: 'experiment', updatedAt: LATER }), pull({ number: 3, headSha: C, title: 'Merged into main', merged: true, state: 'closed', updatedAt: LATER })];
  let tracked = state({ snapshot: snapshot({ pullRequests: [] }) });
  tracked = applyWatchSnapshot(tracked, 'project', snapshot({ fetchedAt: LATER, pullRequests: pulls }));
  assert.deepEqual(project(tracked).observedRounds.map(round => round.prNumber), [1]);
  let main = state({ trackedPr: null, snapshot: snapshot({ pullRequests: [] }) });
  main = applyWatchSnapshot(main, 'project', snapshot({ fetchedAt: LATER, pullRequests: pulls }));
  assert.deepEqual(project(main).observedRounds.map(round => round.prNumber), [3]);
});

test('distinct reviewed development and device-test rounds sharing one SHA remain distinct', () => {
  const reviewed = [{ id: 'engineering', title: 'Engineering check', headSha: A, date: AT, sources: [{ url: `https://github.com/${REPO}/pull/1#issuecomment-1` }] }, { id: 'device', title: 'Device check', headSha: A, date: AT, sources: [{ url: `https://github.com/${REPO}/pull/1#issuecomment-2` }] }];
  let s = state({ rounds: reviewed });
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: LATER }));
  const rounds = getWatchSummary(project(s)).rounds;
  assert.equal(rounds.filter(round => round.headSha === A).length, 2);
  assert.deepEqual(rounds.map(round => round.id).sort(), ['device', 'engineering']);
});

test('a deleted or unreadable plan preserves the last readable body and exact source once', () => {
  const oldDocument = { path: 'PLAN.md', sha: 'readable-plan', ref: A, content: '# Actual previous plan', sourceUrl: `https://github.com/${REPO}/blob/${A}/PLAN.md` };
  let s = state({ snapshot: snapshot({ planDocument: oldDocument }) });
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: LATER, planDocument: { path: 'PLAN.md', ref: B, sha: null, content: null, unavailable: true, status: 404 } }));
  s = applyWatchSnapshot(s, 'project', { ...project(s).snapshot, fetchedAt: '2026-11-01T00:20:00.000Z' });
  assert.equal(project(s).previousPlans.filter(plan => plan.sha === oldDocument.sha).length, 1);
  assert.equal(project(s).previousPlans[0].content, oldDocument.content);
  assert.equal(project(s).previousPlans[0].sourceUrl, oldDocument.sourceUrl);
  assert.equal(project(s).planNeedsReview, true);
});

test('once new discussion invalidates a reviewed summary, a later empty comment window cannot make it current again', () => {
  let s = state();
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: LATER, comments: [{ id: 7, issueNumber: 1, updatedAt: LATER, body: 'New device result' }] }));
  assert.equal(getWatchSummary(project(s)).sourceChanged, true);
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: '2026-11-01T00:20:00.000Z', comments: [] }));
  assert.equal(project(s).planNeedsReview, true);
  assert.equal(getWatchSummary(project(s)).sourceChanged, true);
  assert.equal(getWatchSummary(project(s)).progress.known, false);
});

test('new check evidence on the same SHA invalidates the old reviewed conclusion and remains pending review after it falls out of coverage', () => {
  let s = state();
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: LATER, workflowRuns: [run({ id: 2, conclusion: 'failure', createdAt: LATER })] }));
  assert.equal(getWatchSummary(project(s)).sourceChanged, true);
  assert.equal(project(s).planNeedsReview, true);
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: '2026-11-01T00:20:00.000Z', workflowRuns: [] }));
  assert.equal(getWatchSummary(project(s)).sourceChanged, true);
  const oldEvidence = seed({ observedAt: LATER });
  assert.equal(getWatchSummary(oldEvidence).sourceChanged, false);
});

test('a first refresh does not relabel all pre-existing baseline facts as newly observed development history', () => {
  let s = state();
  s = applyWatchSnapshot(s, 'project', snapshot({ fetchedAt: LATER }));
  assert.deepEqual(project(s).observedRounds, []);
  assert(getWatchSummary(project(s)).rounds.every(round => round.provenance !== 'observed-history'));
});

test('adapter uses seven bounded read-only GETs with comments and plan; source file pins to newly observed PR head', async () => {
  const mock = api(), result = await fetchWatchSnapshot(REPO, { fetchImpl: mock.fetchImpl, trackedPr: 1, sourceRef: A, planPath: 'docs/开发计划.md' });
  assert.equal(mock.calls.length, 7); assert.equal(result.coverage.requestCount, 7);
  assert(mock.calls.every(call => call.init.method === 'GET' && call.init.credentials === 'omit' && !call.init.headers.Authorization));
  assert(mock.calls.find(call => call.url.includes('/contents/')).url.endsWith(`?ref=${B}`));
  assert.equal(result.planDocument.content, '# 当前计划\n- [ ] 实机验证');
  assert.equal(result.trackedHeadSha, B); assert.equal(result.commits[0].title, 'revert: restore approved site');
  assert.equal(result.pullRequests[0].check.state, 'success');
});

test('basic adapter reads five resources and treats the repository discussion window as partial', async () => {
  const mock = api(), result = await fetchWatchSnapshot(REPO, { fetchImpl: mock.fetchImpl });
  assert.equal(mock.calls.length, 5); assert.equal(result.coverage.discussionComplete, false);
  assert.deepEqual(result.comments, []); assert.equal(result.planDocument, null);
});

test('comment reads are updated-desc and filtered to the selected issue without treating no match as no discussion', async () => {
  const mock = api({ comments: [{ id: 1, issue_url: `https://api.github.com/repos/${REPO}/issues/99`, body: 'unrelated' }] });
  const result = await fetchWatchSnapshot(REPO, { fetchImpl: mock.fetchImpl, trackedPr: 1 });
  assert.deepEqual(result.comments, []); assert(result.warnings.some(message => message.includes('没有读到不等于没有新讨论')));
  assert(mock.calls.some(call => call.url.includes('/issues/comments?sort=updated&direction=desc&per_page=30')));
});

test('case-insensitive repository input still matches canonical comment URLs and exposes coverage accurately', async () => {
  const mock = api(), result = await fetchWatchSnapshot('Example/Project', { fetchImpl: mock.fetchImpl, trackedPr: 1 });
  assert.equal(result.comments.length, 1);
  assert.equal(result.coverage.commentsExamined, 1);
  assert.equal(result.coverage.discussionComplete, true);
  assert.equal(result.coverage.pullRequestsComplete, true);
});

test('public rate limit and ordinary partial failure throw instead of manufacturing a current snapshot', async () => {
  const rate = api({ route: url => url.includes('/actions/runs?') ? response({}, 403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1793492400' }) : null });
  await assert.rejects(fetchWatchSnapshot(REPO, { fetchImpl: rate.fetchImpl }), error => error.code === 'RATE_LIMITED' && error.remaining === 0 && Boolean(error.resetAt));
  const failure = api({ route: url => url.includes('/commits?') ? response({}, 500) : null });
  await assert.rejects(fetchWatchSnapshot(REPO, { fetchImpl: failure.fetchImpl }), error => error.code === 'HTTP_ERROR');
});

test('plan deletion is explicitly unavailable; it never silently reuses a previously fetched plan as current', async () => {
  const mock = api({ route: url => url.includes('/contents/') ? response({}, 404) : null });
  const result = await fetchWatchSnapshot(REPO, { fetchImpl: mock.fetchImpl, trackedPr: 1, planPath: 'PLAN.md', previous: { planDocument: { content: 'old plan' } } });
  assert.equal(result.planDocument.unavailable, true); assert.equal(result.planDocument.content, null);
  assert(result.warnings.some(message => message.includes('未能找到')));
});

test('pagination is disclosed and an absent tracked PR is not assigned another PR’s head', async () => {
  const mock = api({ headers: { link: '<https://api.github.com/next>; rel="next"' } });
  const result = await fetchWatchSnapshot(REPO, { fetchImpl: mock.fetchImpl, trackedPr: 99 });
  assert.equal(result.trackedHeadSha, null); assert(result.warnings.some(message => message.includes('未覆盖关注的 #99')));
  assert(result.warnings.some(message => message.includes('最近 30 次 Actions')));
  assert.equal(result.coverage.pullRequestsComplete, false);
  assert.equal(result.coverage.workflowRunsComplete, false);
});

test('missing tracked PR cannot cause the adapter to substitute a main-branch plan as the selected development plan', async () => {
  const mock = api();
  const result = await fetchWatchSnapshot(REPO, { fetchImpl: mock.fetchImpl, trackedPr: 99, sourceRef: A, planPath: 'PLAN.md' });
  assert(!mock.calls.some(call => call.url.includes('/contents/')));
  assert.equal(result.planDocument.status, 'source-unconfirmed');
  assert.equal(result.planDocument.content, null);
  assert.equal(result.coverage.planRead, false);
});

test('private repositories stop after metadata and invalid plan paths cannot escape the contents endpoint', async () => {
  const mock = api({ repository: { full_name: REPO, private: true } });
  await assert.rejects(fetchWatchSnapshot(REPO, { fetchImpl: mock.fetchImpl }), error => error.code === 'PRIVATE_REPOSITORY');
  assert.equal(mock.calls.length, 1);
  const safe = api(); await assert.rejects(fetchWatchSnapshot(REPO, { fetchImpl: safe.fetchImpl, planPath: '../secret' }), error => error.code === 'INVALID_PLAN_PATH');
  assert(!safe.calls.some(call => call.url.includes('/contents/')));
});
