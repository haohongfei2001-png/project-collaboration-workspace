import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalState, addProject, updateProject, addFeature, updateFeature, setFeatureVerification, addTask, updateTask, toggleTask, addNote, updateNote, setFocus, applySnapshot, markSeen, getProjectSummary, getFeatureState, answerProject, parseRepo } from '../src/personal-domain.js';
import { fetchGitHubSnapshot } from '../src/github-sync.js';

const REPO = 'haohongfei2001-png/project-collaboration-workspace';
const AT = '2026-10-31T14:00:00.000Z';
const fixture = (patch = {}) => ({ repo: REPO, source: 'connector-snapshot', fetchedAt: AT, repository: { fullName: REPO, defaultBranch: 'main', url: `https://github.com/${REPO}` }, pullRequests: [{ number: 1, title: '可交互原型', state: 'open', draft: false, merged: false, headSha: 'head-a', branch: 'design/prototype', url: `https://github.com/${REPO}/pull/1`, check: { state: 'success', headSha: 'head-a', url: `https://github.com/${REPO}/actions/runs/1`, runId: 1 } }], complete: true, warnings: [], ...patch });
const project = state => state.projects.find(p => p.id === state.activeProjectId);
const feature = (state, id = 'understanding') => project(state).features.find(f => f.id === id);
const state = () => createPersonalState(fixture());
const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
function apiFixture(overrides = {}) {
  const calls = [];
  const repo = { full_name: REPO, private: false, default_branch: 'main', html_url: `https://github.com/${REPO}`, description: '个人工作台' };
  const pulls = [{ number: 1, title: '原型', state: 'open', draft: false, head: { sha: 'a', ref: 'feature' }, base: { ref: 'main' }, html_url: `https://github.com/${REPO}/pull/1`, updated_at: AT, merged_at: null }];
  const runs = [{ id: 1, workflow_id: 9, name: 'Checks', head_sha: 'a', status: 'completed', conclusion: 'success', created_at: AT, html_url: `https://github.com/${REPO}/actions/runs/1` }];
  const fetchImpl = async (url, options) => { calls.push({ url, options }); if (url.includes('/pulls?')) return overrides.pullsResponse?.() || response(overrides.pulls || pulls); if (url.includes('/actions/runs?')) return overrides.runsResponse?.() || response({ workflow_runs: overrides.runs || runs }); return overrides.repoResponse?.() || response(overrides.repo || repo); };
  return { fetchImpl, calls };
}

test('repository input accepts canonical GitHub URLs and rejects credentials, lookalikes, subpaths, query strings and traversal', () => {
  assert.equal(parseRepo(`https://github.com/${REPO}.git`), REPO);
  assert.equal(parseRepo(REPO), REPO);
  assert.equal(parseRepo(''), '');
  for (const bad of ['https://github.com.evil.test/a/b', 'https://token@github.com/a/b', 'http://github.com/a/b', 'https://github.com/a/b/tree/main', 'https://github.com/a/b?token=secret', 'a/..', 'a/b/../../secret', 'git@github.com:a/b.git', 'https://api.github.com/repos/a/b']) assert.throws(() => parseRepo(bad));
});

test('fresh successful CI only creates candidates for experience; it never makes a product feature usable', () => {
  const s = state(), summary = getProjectSummary(s, 'workspace', Date.parse(AT));
  assert.equal(summary.ready, 0); assert.equal(summary.percent, 0); assert.equal(summary.counts.testing, 4);
  assert.equal(summary.sourceFreshness, 'fresh');
  assert(summary.features.every(f => f.evidence.length === 2));
  assert.equal(summary.counts.ready + summary.counts.testing + summary.counts.building + summary.counts.blocked + summary.counts.planned + summary.counts.unknown, summary.total);
});

test('commands preserve input state and local JSON roundtrip, while own tasks, notes and focus remain attached to project', () => {
  const s = state(), original = JSON.stringify(s);
  let next = addProject(s, { id: 'notes', title: '我的笔记', goal: '快速找到想法' });
  next = addFeature(next, 'notes', { id: 'search', title: '搜索笔记', criteria: ['搜索后打开结果'] });
  next = addTask(next, 'notes', { id: 'try-search', title: '试一次搜索', featureId: 'search' });
  next = addNote(next, 'notes', { title: '参考', text: '希望搜索结果能直接打开', url: 'https://example.com/reference' });
  next = setFocus(next, 'notes', '我能快速找回笔记吗？');
  next = toggleTask(next, 'notes', 'try-search');
  assert.equal(JSON.stringify(s), original); assert.equal(next.activeProjectId, 'notes');
  assert.equal(project(next).tasks[0].done, true); assert.equal(project(next).notes[0].text, '希望搜索结果能直接打开');
  assert.deepEqual(JSON.parse(JSON.stringify(next)), next);
  assert.throws(() => addNote(next, 'notes', { title: '恶意链接', url: 'javascript:alert(1)' }));
  assert.throws(() => addProject(next, { id: 'notes', title: '重复' }));
});

test('personal experience confirmation changes progress; missing note or failed checks cannot be promoted', () => {
  const s = state(), next = setFeatureVerification(s, 'workspace', 'understanding', { passed: true, note: '已用自己的项目查到下一步', at: AT });
  assert.equal(getProjectSummary(next, 'workspace').ready, 1); assert.equal(getProjectSummary(next, 'workspace').percent, 25);
  assert.equal(getProjectSummary(s, 'workspace').ready, 0);
  assert.throws(() => setFeatureVerification(s, 'workspace', 'understanding', { passed: true, note: '' }));
  const bad = fixture(); bad.pullRequests[0].check.state = 'failure';
  const failed = applySnapshot(s, 'workspace', bad);
  assert.equal(getFeatureState(project(failed), feature(failed)).status, 'blocked');
  assert.throws(() => setFeatureVerification(failed, 'workspace', 'understanding', { passed: true, note: '随意通过' }));
});

test('new code invalidates previous experience, but merging the same tested code does not erase it', () => {
  let s = setFeatureVerification(state(), 'workspace', 'understanding', { passed: true, note: '已体验通过', at: AT });
  const merged = fixture({ fetchedAt: '2026-10-31T14:01:00.000Z' }); merged.pullRequests[0].merged = true; merged.pullRequests[0].state = 'closed';
  s = applySnapshot(s, 'workspace', merged); assert.equal(getFeatureState(project(s), feature(s)).status, 'ready');
  const changed = fixture({ fetchedAt: '2026-10-31T14:02:00.000Z' }); changed.pullRequests[0].headSha = 'head-b'; changed.pullRequests[0].check.headSha = 'head-b';
  s = applySnapshot(s, 'workspace', changed);
  assert.equal(getFeatureState(project(s), feature(s)).status, 'testing'); assert.equal(getFeatureState(project(s), feature(s)).needsRetest, true);
  assert.equal(getProjectSummary(s, 'workspace').ready, 0);
  assert.equal(feature(s).verification.note, '已体验通过');
});

test('a failed new check overrides a same-head manual confirmation and a dismissed PR cannot be presented as completed', () => {
  let s = setFeatureVerification(state(), 'workspace', 'understanding', { passed: true, note: '这版可用' });
  const failed = fixture(); failed.pullRequests[0].check.state = 'failure';
  s = applySnapshot(s, 'workspace', failed); assert.equal(getFeatureState(project(s), feature(s)).status, 'blocked');
  const closed = fixture(); closed.pullRequests[0].state = 'closed';
  s = applySnapshot(s, 'workspace', closed); assert.equal(getFeatureState(project(s), feature(s)).status, 'blocked');
});

test('changing a repository removes source-specific assumptions; feature scope determines denominator', () => {
  let s = setFeatureVerification(state(), 'workspace', 'understanding', { passed: true, note: '当前可用' });
  s = updateFeature(s, 'workspace', 'github', { inScope: false }); assert.equal(getProjectSummary(s, 'workspace').total, 3); assert.equal(getProjectSummary(s, 'workspace').percent, 33);
  s = updateProject(s, 'workspace', { repo: 'example/new-repo' });
  assert.equal(project(s).snapshot, null); assert(project(s).features.every(f => f.prNumbers.length === 0 && f.verification === null));
  assert.equal(project(s).notes.length, 1); assert.equal(project(s).tasks.length, 1);
});

test('sync comparison survives repeated refreshes until explicitly marked seen; stale snapshots cannot overwrite current', () => {
  let s = markSeen(state(), 'workspace');
  const changed = fixture({ fetchedAt: '2026-10-31T14:01:00.000Z' }); changed.pullRequests[0].headSha = 'new'; changed.pullRequests[0].check.headSha = 'new';
  s = applySnapshot(s, 'workspace', changed);
  assert.equal(getProjectSummary(s, 'workspace').sinceSeenChanges.length, 1);
  s = applySnapshot(s, 'workspace', { ...changed, fetchedAt: '2026-10-31T14:02:00.000Z' });
  assert.equal(getProjectSummary(s, 'workspace').changes.length, 0); assert.equal(getProjectSummary(s, 'workspace').sinceSeenChanges.length, 1);
  s = applySnapshot(s, 'workspace', fixture()); assert.equal(project(s).snapshot.pullRequests[0].headSha, 'new');
  s = markSeen(s, 'workspace'); assert.equal(getProjectSummary(s, 'workspace').sinceSeenChanges.length, 0);
  assert.throws(() => applySnapshot(s, 'workspace', { ...changed, repo: 'another/repo' }));
});

test('missing PR evidence and mismatched workflow head are explicit; old successful checks do not imply current readiness', () => {
  let s = updateFeature(state(), 'workspace', 'understanding', { prNumbers: [404] });
  assert.equal(getFeatureState(project(s), feature(s)).status, 'unknown');
  assert.throws(() => setFeatureVerification(s, 'workspace', 'understanding', { passed: true, note: '尚无依据' }));
  const wrongHead = fixture(); wrongHead.pullRequests[0].check.headSha = 'old-code';
  s = createPersonalState(wrongHead); assert.equal(getFeatureState(project(s), feature(s)).status, 'building');
});

test('answers follow saved context, separate unsupported questions, cite exact sources and disclose stale evidence', () => {
  const s = state(); const answer = answerProject(s, 'workspace', '现在能用了吗？');
  assert.equal(answer.mode, 'rules'); assert(!answer.answer.includes('都已体验确认')); assert(answer.citations.some(c => c.url.endsWith('/pull/1')));
  assert(answer.bullets.some(b => b.includes('15 分钟')));
  const unsupported = answerProject(s, 'workspace', '今年能赚多少钱？'); assert(unsupported.answer.includes('当前助手')); assert(unsupported.bullets.some(b => b.includes('没有足够依据')));
  const unseen = answerProject(markSeen(s, 'workspace'), 'workspace', '最近有什么变化'); assert(unseen.answer.includes('没有变化'));
});

test('public GitHub adapter uses exactly three GETs, omits credentials, and maps only current-head actions evidence', async () => {
  const api = apiFixture(); const result = await fetchGitHubSnapshot(REPO, { fetchImpl: api.fetchImpl });
  assert.equal(api.calls.length, 3); assert(api.calls.every(c => c.url.startsWith(`https://api.github.com/repos/${REPO}`) && c.options.method === 'GET' && c.options.credentials === 'omit' && !('Authorization' in c.options.headers)));
  assert.equal(result.pullRequests[0].check.state, 'success'); assert.equal(result.source, 'github-public-api'); assert.equal(result.repository.defaultBranch, 'main'); assert.equal(result.coverage.sourceCodeRead, false);
  const otherHead = apiFixture({ runs: [{ id: 2, workflow_id: 9, head_sha: 'older', status: 'completed', conclusion: 'success', created_at: AT }] });
  const unknown = await fetchGitHubSnapshot(REPO, { fetchImpl: otherHead.fetchImpl }); assert.equal(unknown.pullRequests[0].check.state, 'unknown');
});

test('workflow aggregation uses latest attempt per workflow, and any current failure blocks optimistic success', async () => {
  const api = apiFixture({ runs: [
    { id: 1, workflow_id: 9, head_sha: 'a', status: 'completed', conclusion: 'success', created_at: AT },
    { id: 2, workflow_id: 9, head_sha: 'a', status: 'completed', conclusion: 'failure', created_at: '2026-10-31T14:01:00Z' },
    { id: 3, workflow_id: 10, head_sha: 'a', status: 'completed', conclusion: 'success', created_at: AT }
  ] });
  const result = await fetchGitHubSnapshot(REPO, { fetchImpl: api.fetchImpl }); assert.equal(result.pullRequests[0].check.state, 'failure'); assert.equal(result.pullRequests[0].check.runs.length, 2);
});

test('rate limit and network failures return actionable errors without fabricating a newer snapshot', async () => {
  const previous = fixture(), before = JSON.stringify(previous);
  const limited = apiFixture({ repoResponse: () => response({}, 403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1793462400', 'retry-after': '60' }) });
  await assert.rejects(fetchGitHubSnapshot(REPO, { fetchImpl: limited.fetchImpl, previous }), e => e.code === 'RATE_LIMITED' && e.retryAfterSeconds === 60);
  await assert.rejects(fetchGitHubSnapshot(REPO, { fetchImpl: async () => { throw new TypeError('offline'); }, previous }), e => e.code === 'NETWORK_ERROR');
  assert.equal(JSON.stringify(previous), before);
});

test('partial read failure does not silently publish a healthy snapshot, and paginated coverage is explicit', async () => {
  const broken = apiFixture({ runsResponse: () => response({}, 503) });
  await assert.rejects(fetchGitHubSnapshot(REPO, { fetchImpl: broken.fetchImpl }), e => e.code === 'HTTP_ERROR');
  const paginated = apiFixture({ pullsResponse: () => response([], 200, { link: '<https://api.github.com/repos/example/repo/pulls?page=2>; rel="next"' }) });
  const result = await fetchGitHubSnapshot(REPO, { fetchImpl: paginated.fetchImpl }); assert.equal(result.complete, false); assert(result.warnings[0].includes('100'));
});

test('private, redirected-identity and malformed repositories never become apparently connected', async () => {
  const privateApi = apiFixture({ repo: { full_name: REPO, private: true } });
  await assert.rejects(fetchGitHubSnapshot(REPO, { fetchImpl: privateApi.fetchImpl }), e => e.code === 'PRIVATE_REPOSITORY'); assert.equal(privateApi.calls.length, 1);
  const moved = apiFixture({ repo: { full_name: 'other/identity', private: false } });
  await assert.rejects(fetchGitHubSnapshot(REPO, { fetchImpl: moved.fetchImpl }), e => e.code === 'REPOSITORY_CHANGED');
  const malformed = apiFixture({ pulls: [{ number: 1, title: 'no head' }] });
  await assert.rejects(fetchGitHubSnapshot(REPO, { fetchImpl: malformed.fetchImpl }), e => e.code === 'INVALID_RESPONSE');
});

test('aborting a public sync propagates cancellation instead of claiming failure or consuming stored state', async () => {
  const abort = Object.assign(new Error('stop'), { name: 'AbortError' });
  await assert.rejects(fetchGitHubSnapshot(REPO, { fetchImpl: async () => { throw abort; } }), e => e.name === 'AbortError');
});

test('an experience problem can be resolved by another actual try without bypassing source failures', () => {
  let s = setFeatureVerification(state(), 'workspace', 'understanding', { passed: false, note: '第一次没有找到下一步' });
  assert.equal(getFeatureState(project(s), feature(s)).status, 'blocked');
  s = setFeatureVerification(s, 'workspace', 'understanding', { passed: true, note: '修正后重新体验，已找到下一步' });
  assert.equal(getFeatureState(project(s), feature(s)).status, 'ready');
  assert(project(s).history.some(event => event.detail === '第一次没有找到下一步'));
  const broken = fixture({ fetchedAt: '2026-10-31T14:01:00.000Z' }); broken.pullRequests[0].check.state = 'failure';
  s = applySnapshot(s, 'workspace', broken);
  assert.throws(() => setFeatureVerification(s, 'workspace', 'understanding', { passed: true, note: '不能覆盖来源检查失败' }));
});

test('resubmitting unchanged criteria preserves experience, while changing what must work invalidates it', () => {
  let s = setFeatureVerification(state(), 'workspace', 'understanding', { passed: true, note: '找到状态和下一步' });
  s = updateFeature(s, 'workspace', 'understanding', { title: '读懂自己的项目', criteria: [...feature(s).criteria] });
  assert.equal(getFeatureState(project(s), feature(s)).status, 'ready');
  s = updateFeature(s, 'workspace', 'understanding', { criteria: [...feature(s).criteria, '离线时能分辨旧状态'] });
  assert.equal(getFeatureState(project(s), feature(s)).status, 'testing');
  assert.equal(feature(s).verification, null);
});

test('next steps prioritize actual problems, then personal tasks, before automatic experience suggestions', () => {
  let s = addTask(state(), 'workspace', { id: 'my-next', title: '先整理自己最关心的功能' });
  assert.equal(getProjectSummary(s, 'workspace').nextActions[0].taskId, 'my-next');
  s = setFeatureVerification(s, 'workspace', 'sources', { passed: false, note: '刷新后没有找到资料' });
  const actions = getProjectSummary(s, 'workspace').nextActions;
  assert.equal(actions[0].kind, 'unblock');
  assert.equal(actions[1].taskId, 'my-next');
  assert(actions.findIndex(a => a.kind === 'verify') > actions.findLastIndex(a => a.kind === 'task'));
});

test('editing saved notes preserves omitted fields and original state, validates links and keeps creation time', () => {
  const s = addNote(state(), 'workspace', { id: 'editable-note', title: '初步想法', text: '需要保留的正文', url: 'https://example.com/reference' });
  const original = JSON.stringify(s), before = project(s).notes.find(n => n.id === 'editable-note');
  const next = updateNote(s, 'workspace', 'editable-note', { title: '更准确的标题' });
  const edited = project(next).notes.find(n => n.id === 'editable-note');
  assert.equal(JSON.stringify(s), original); assert.equal(edited.title, '更准确的标题');
  assert.equal(edited.text, before.text); assert.equal(edited.url, before.url); assert.equal(edited.createdAt, before.createdAt); assert(edited.updatedAt);
  const cleared = updateNote(next, 'workspace', 'editable-note', { text: '修正后的正文', url: '' });
  assert.equal(project(cleared).notes[0].text, '修正后的正文'); assert.equal(project(cleared).notes[0].url, '');
  assert.throws(() => updateNote(s, 'workspace', 'editable-note', { url: 'javascript:alert(1)' }));
  assert.throws(() => updateNote(s, 'workspace', 'editable-note', { title: ' ' }));
});

test('editing a task keeps completion and timestamps, and rejects features belonging to another project', () => {
  let s = addProject(state(), { id: 'other', title: '另一个项目' });
  s = addFeature(s, 'other', { id: 'other-feature', title: '另一个项目的功能' });
  s = addTask(s, 'workspace', { id: 'editable-task', title: '原待办', featureId: 'understanding' });
  s = toggleTask(s, 'workspace', 'editable-task', true);
  const original = JSON.stringify(s), before = s.projects.find(p => p.id === 'workspace').tasks.find(t => t.id === 'editable-task');
  const next = updateTask(s, 'workspace', 'editable-task', { title: '纠正后的待办' });
  const edited = next.projects.find(p => p.id === 'workspace').tasks.find(t => t.id === 'editable-task');
  assert.equal(JSON.stringify(s), original); assert.equal(edited.title, '纠正后的待办');
  assert.equal(edited.featureId, before.featureId); assert.equal(edited.done, true); assert.equal(edited.completedAt, before.completedAt); assert.equal(edited.createdAt, before.createdAt); assert(edited.updatedAt);
  assert.throws(() => updateTask(s, 'workspace', 'editable-task', { featureId: 'other-feature' }));
  assert.throws(() => updateTask(s, 'other', 'editable-task', { title: '错误项目' }));
  const unlinked = updateTask(next, 'workspace', 'editable-task', { featureId: null });
  assert.equal(unlinked.projects.find(p => p.id === 'workspace').tasks.find(t => t.id === 'editable-task').featureId, null);
});

test('the preset question about what to do now resolves to the actual personal next action', () => {
  const s = addTask(state(), 'workspace', { id: 'my-actual-next', title: '先体验真实项目的返回导航' });
  const answer = answerProject(s, 'workspace', '我现在该做什么？');
  assert.equal(answer.title, '现在值得做的事');
  assert.equal(answer.answer, '先体验真实项目的返回导航');
  assert.equal(answer.answer, getProjectSummary(s, 'workspace').nextActions[0].title);
  assert(answer.bullets.some(b => b.includes('先体验真实项目的返回导航')));
});


test('a partly usable personal project is not described as if nothing has started', () => {
  let s=addProject(state(),{id:'partial',title:'我的阅读清单'});
  s=addFeature(s,'partial',{id:'save',title:'保存资料'});
  s=addFeature(s,'partial',{id:'tags',title:'资料标签'});
  s=setFeatureVerification(s,'partial','save',{passed:true,note:'已实际保存并重新打开资料'});
  const summary=getProjectSummary(s,'partial');
  assert.equal(summary.ready,1);assert.equal(summary.total,2);
  assert.match(summary.headline,/1 项功能已经可用/);
  assert.doesNotMatch(summary.headline,/从一个小功能开始/);
});
