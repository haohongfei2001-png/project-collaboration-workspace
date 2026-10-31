// Personal project monitoring. Source facts, reviewed plan summaries and local actions stay separate.
const watchCopy = value => structuredClone(value);
const watchText = (value, max = 2000) => String(value ?? '').trim().slice(0, max);
const watchTime = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
const watchId = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)}`;
const watchProject = (state, id) => { const project = state.projects.find(p => p.id === id); if (!project) throw new Error('找不到这个项目'); return project; };
const watchMutate = (state, id, command) => { const next = watchCopy(state); command(watchProject(next, id), next); return next; };
const watchSha = value => /^[a-f0-9]{40}$/i.test(String(value || ''));
const watchLabels = item => (item.labels || []).map(label => String(typeof label === 'string' ? label : label.name).trim().toLowerCase());
const watchLabelsByKind = {
  approval: ['needs-approval', 'approval-required', 'awaiting-approval', '需要批准', '待批准'],
  decision: ['needs-decision', 'decision-required', '需要决定', '待决定'],
  blocked: ['blocked', '阻塞', '已阻塞'],
  verify: ['needs-verification', '待验证', '待验收']
};

export function parseWatchRepo(input) {
  let value = watchText(input, 500);
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) {
    let url; try { url = new URL(value); } catch { throw new Error('请填写 GitHub 仓库地址'); }
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.username || url.password || url.port || url.search || url.hash) throw new Error('请使用 https://github.com/所有者/仓库');
    value = url.pathname.replace(/^\/+|\/+$/g, '');
  }
  value = value.replace(/\.git$/i, '');
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(value) || ['.', '..'].includes(value.split('/')[1])) throw new Error('请填写 owner/repository 格式的仓库');
  return value;
}

export function createWatchState(projects = []) {
  if (!Array.isArray(projects)) throw new Error('项目列表格式不正确');
  const ids = new Set();
  return { version: 3, projects: projects.map(input => {
    const project = watchCopy(input), id = watchText(project.id || watchId('project'), 100);
    if (ids.has(id)) throw new Error('项目标识重复');
    ids.add(id);
    return { ...project, id, name: watchText(project.name || project.title || project.repo, 100), repo: parseWatchRepo(project.repo), watching: Boolean(project.watching), previousPlans: project.previousPlans || [], rounds: project.rounds || [], observedRounds: project.observedRounds || [], attention: project.attention || [], notes: project.notes || [], tasks: project.tasks || [], snapshot: project.snapshot || null, resolutions: project.resolutions || {} };
  }), monitor: { enabled: false, intervalMs: 600000 }, resolutions: {} };
}

export function toggleWatch(state, id) { return watchMutate(state, id, project => { project.watching = !project.watching; }); }
export function setMonitor(state, enabled) { const next = watchCopy(state); next.monitor = { ...next.monitor, enabled: Boolean(enabled), intervalMs: Math.max(600000, next.monitor?.intervalMs || 600000) }; return next; }

// Only compare runs for the exact revision. Keep independent workflow events separate.
export function watchChecksFor(headSha, runs = []) {
  if (!headSha) return { state: 'unknown', headSha: '', runs: [], label: '尚无当前版本检查' };
  const latest = new Map();
  for (const run of runs.filter(r => (r.headSha || r.head_sha) === headSha)) {
    const key = `${run.workflowId || run.workflow_id || run.path || run.name || run.id}:${run.event || ''}`;
    const old = latest.get(key);
    const newerAttempt = old && run.id === old.id && Number(run.runAttempt || run.run_attempt || 1) > Number(old.runAttempt || old.run_attempt || 1);
    const newerRun = !old || watchTime(run.createdAt || run.created_at) > watchTime(old.createdAt || old.created_at) || watchTime(run.createdAt || run.created_at) === watchTime(old.createdAt || old.created_at) && Number(run.id) > Number(old.id);
    if (newerAttempt || newerRun) latest.set(key, run);
  }
  const current = [...latest.values()];
  const failed = current.find(r => ['failure', 'timed_out', 'startup_failure'].includes(r.conclusion));
  const requiresAction = current.find(r => r.conclusion === 'action_required');
  const pending = current.find(r => r.status !== 'completed');
  const passed = current.length > 0 && current.some(r => r.conclusion === 'success') && current.every(r => r.status === 'completed' && ['success', 'neutral', 'skipped'].includes(r.conclusion));
  const state = failed ? 'failure' : requiresAction ? 'action_required' : pending ? 'pending' : passed ? 'success' : 'unknown';
  const chosen = failed || requiresAction || pending || current[0];
  return { state, headSha, runs: current, url: chosen?.url || chosen?.html_url || '', runId: chosen?.id || null, runAttempt: chosen?.runAttempt || chosen?.run_attempt || 1, label: ({ failure: '当前版本检查未通过', action_required: '自动检查待处理', pending: '自动检查进行中', success: '已读取的检查通过', unknown: '尚无完整检查结果' })[state] };
}

function watchSelectedPulls(project) {
  const pulls = project.snapshot?.pullRequests || [];
  const tracked = (Array.isArray(project.trackedPr) ? project.trackedPr : [project.trackedPr]).map(Number).filter(Number.isSafeInteger).filter(n => n > 0);
  if (tracked.length) return pulls.filter(pull => tracked.includes(pull.number));
  // Without an explicitly selected PR the current development line is the default branch.
  // An unrelated recently updated PR must not replace the line named in the UI.
  return [];
}

function watchSourceChanged(project) {
  const tracked = watchSelectedPulls(project), originalRef = project.plan?.headSha || project.plan?.ref || project.sourceRef;
  const headChanged = Boolean(project.trackedPr) && watchSha(originalRef) && tracked.length === 1 && tracked[0].headSha !== originalRef;
  const missingTracked = Boolean(project.trackedPr && project.snapshot && tracked.length === 0);
  const documentChanged = Boolean(project.plan?.sha && project.snapshot?.planDocument?.sha && project.plan.sha !== project.snapshot.planDocument.sha);
  const mainChanged = !project.trackedPr && watchSha(originalRef) && project.snapshot?.commits?.[0]?.sha && project.snapshot.commits[0].sha !== originalRef;
  const newerDiscussion = watchTrackedComments(project).some(comment => watchTime(comment.updatedAt || comment.createdAt) > watchTime(project.observedAt));
  const newerChecks = watchObservedChecks(project).some(check => check.runs.some(run => watchTime(run.updatedAt || run.updated_at || run.createdAt || run.created_at) > watchTime(project.observedAt)));
  return Boolean(headChanged || missingTracked || documentChanged || mainChanged || newerDiscussion || newerChecks || project.planNeedsReview || project.snapshot?.planDocument?.unavailable || project.snapshot?.planDocument?.truncated);
}

function watchTrackedComments(project) {
  const numbers = (Array.isArray(project.trackedPr) ? project.trackedPr : [project.trackedPr]).map(Number).filter(number => number > 0 && Number.isSafeInteger(number));
  return (project.snapshot?.comments || []).filter(comment => !numbers.length || !comment.issueNumber || numbers.includes(Number(comment.issueNumber)));
}

function watchPlanProgress(project) {
  const plan = project.plan || {}, items = (plan.items || []).filter(item => item.inScope !== false);
  const done = items.filter(item => ['done', 'completed'].includes(item.status)).length;
  const needsReview = watchSourceChanged(project);
  const statusesKnown = items.every(item => ['done', 'completed', 'active', 'blocked', 'todo'].includes(item.status));
  // A curated excerpt must not quietly become an entire project's denominator.
  const known = Boolean(items.length && plan.scopeComplete === true && statusesKnown && !needsReview);
  return { done, total: items.length, percent: known ? Math.round(done / items.length * 100) : null, known, needsReview, label: plan.scopeLabel || '已收录计划', sourceUrl: plan.sourceUrl || '', items };
}

function watchSeedAttention(project, sourceChanged) {
  const selected = watchSelectedPulls(project), heads = new Set(selected.map(p => p.headSha));
  if (project.snapshot?.commits?.[0]?.sha) heads.add(project.snapshot.commits[0].sha);
  return (project.attention || []).filter(item => !item.resolved).map((item, index) => {
    const sourceRef = item.headSha || item.ref;
    const staleRevision = sourceChanged && watchSha(sourceRef) && !heads.has(sourceRef);
    const newerComments = watchTrackedComments(project).filter(comment => watchTime(comment.updatedAt || comment.createdAt) > watchTime(item.at || project.observedAt)).sort((a, b) => watchTime(b.updatedAt || b.createdAt) - watchTime(a.updatedAt || a.createdAt));
    const newerDiscussion = newerComments.length > 0;
    const needsReview = Boolean(staleRevision || newerDiscussion);
    const baseKey = item.key || `reviewed:${project.id}:${item.id || index}:${sourceRef || item.sourceUrl || ''}`;
    const revisionKey = needsReview ? `:review:${[...heads].sort().join(',')}:${newerComments[0]?.id || ''}:${newerComments[0]?.updatedAt || ''}` : '';
    return { ...item, key: baseKey + revisionKey, kind: needsReview ? 'verify' : item.kind || 'verify', title: needsReview ? `需复核：${item.title}` : item.title, detail: item.detail || item.reason || '', sourceUrl: item.sourceUrl || '', headSha: watchSha(sourceRef) ? sourceRef : '', at: item.at || project.observedAt || '', confidence: 'reviewed-source', needsReview };
  });
}

function watchObservedChecks(project) {
  const snapshot = project.snapshot;
  if (!snapshot) return [];
  const checks = watchSelectedPulls(project).map(pull => ({ prNumber: pull.number, title: pull.title, sourceUrl: pull.url, ...watchChecksFor(pull.headSha, snapshot.workflowRuns || []) }));
  if (!project.trackedPr && snapshot.commits?.[0]?.sha) {
    const commit = snapshot.commits[0];
    if (!checks.some(check => check.headSha === commit.sha)) checks.unshift({ prNumber: null, title: `${snapshot.repository?.defaultBranch || '默认分支'} · ${commit.title}`, sourceUrl: commit.url, ...watchChecksFor(commit.sha, snapshot.workflowRuns || []) });
  }
  return checks;
}

function watchLiveAttention(project) {
  const attention = [], snapshot = project.snapshot;
  if (!snapshot) return attention;
  for (const check of watchObservedChecks(project)) {
    if (check.state === 'failure' || check.state === 'action_required') attention.push({ key: `check:${check.prNumber || 'main'}:${check.headSha}:${check.runId}:${check.runAttempt}:${check.state}`, kind: check.state === 'failure' ? 'blocked' : 'verify', title: check.state === 'failure' ? `当前开发版本检查未通过` : '自动检查需要处理', detail: check.title, sourceUrl: check.url || check.sourceUrl, headSha: check.headSha, at: snapshot.fetchedAt, confidence: 'source-fact', prNumber: check.prNumber });
  }
  for (const item of [...(snapshot.issues || []), ...(snapshot.pullRequests || [])].filter(item => item.state === 'open')) {
    const labels = watchLabels(item);
    for (const [kind, exactLabels] of Object.entries(watchLabelsByKind)) {
      if (!labels.some(label => exactLabels.includes(label))) continue;
      const type = item.headSha ? 'pr' : 'issue';
      attention.push({ key: `${type}:${item.number}:${kind}:${item.updatedAt || ''}`, kind, title: item.title, detail: `GitHub 明确标注：${labels.filter(label => exactLabels.includes(label)).join('、')}`, sourceUrl: item.url, headSha: item.headSha || '', at: item.updatedAt || snapshot.fetchedAt, confidence: 'explicit-label', prNumber: type === 'pr' ? item.number : null, issueNumber: type === 'issue' ? item.number : null });
    }
  }
  return attention;
}

function watchNewestDate(values) { return values.filter(Boolean).sort((a, b) => watchTime(b) - watchTime(a))[0] || null; }

function watchSourceRounds(project) {
  const live = [], snapshot = project.snapshot;
  if (!snapshot) return live;
  const pulls = project.trackedPr ? watchSelectedPulls(project) : (snapshot.pullRequests || []).filter(pull => pull.merged && pull.base === (snapshot.repository?.defaultBranch || 'main'));
  for (const pull of pulls) {
    const check = watchChecksFor(pull.headSha, project.snapshot?.workflowRuns || []);
    const date = watchNewestDate([pull.mergedAt, pull.updatedAt, ...check.runs.flatMap(run => [run.updatedAt || run.updated_at, run.createdAt || run.created_at])]);
    const observation = { at: snapshot.fetchedAt, sourceDate: date, headSha: pull.headSha, checkState: check.state, checkUrl: check.url, runId: check.runId, runAttempt: check.runAttempt, pullState: pull.state, merged: Boolean(pull.merged) };
    live.push({ id: `pr-${pull.number}-${pull.headSha}`, prNumber: pull.number, title: pull.title, date, observedAt: snapshot.fetchedAt, headSha: pull.headSha, status: pull.merged ? 'merged' : pull.state === 'closed' ? 'closed' : check.state === 'failure' ? 'failed' : 'active', done: pull.merged ? [`改动已合入 ${pull.base || '目标分支'}`] : [], failed: check.state === 'failure' ? ['此版本的自动检查未通过'] : [], next: pull.state === 'closed' ? [] : check.state === 'pending' ? ['等待自动检查结果'] : check.state === 'success' ? ['检查通过；产品体验结果尚未自动确认'] : [], sources: [{ label: `PR #${pull.number}`, url: pull.url }, ...(check.url ? [{ label: check.label, url: check.url }] : [])], check, observations: [observation], provenance: 'github-facts' });
  }
  for (const commit of project.snapshot?.commits || []) {
    if (live.some(round => round.headSha === commit.sha)) continue;
    const check = watchChecksFor(commit.sha, snapshot.workflowRuns || []);
    const date = watchNewestDate([commit.date, ...check.runs.flatMap(run => [run.updatedAt || run.updated_at, run.createdAt || run.created_at])]);
    live.push({ id: `commit-${commit.sha}`, title: commit.title, date, observedAt: snapshot.fetchedAt, headSha: commit.sha, status: /^(?:revert\b|回退|回滚)/i.test(commit.title) ? 'reverted' : check.state === 'failure' ? 'failed' : 'committed', done: ['提交已进入默认分支'], failed: check.state === 'failure' ? ['此默认分支版本的自动检查未通过'] : [], next: [], sources: [{ label: '提交记录', url: commit.url }, ...(check.url ? [{ label: check.label, url: check.url }] : [])], check, observations: [{ at: snapshot.fetchedAt, sourceDate: date, headSha: commit.sha, checkState: check.state, checkUrl: check.url, runId: check.runId, runAttempt: check.runAttempt }], provenance: 'github-facts' });
  }
  return live;
}

function watchMergeFacts(rounds, archived = false) {
  const merged = new Map();
  for (const input of rounds) {
    const round = watchCopy(input), prior = merged.get(round.id);
    if (!prior) { merged.set(round.id, { ...round, firstObservedAt: round.firstObservedAt || round.observedAt, ...(archived ? { provenance: 'observed-history' } : {}) }); continue; }
    const observations = [...(prior.observations || []), ...(round.observations || [])].filter((item, index, all) => all.findIndex(other => other.headSha === item.headSha && other.runId === item.runId && other.runAttempt === item.runAttempt && other.checkState === item.checkState && other.pullState === item.pullState && other.merged === item.merged) === index);
    const wasFailed = observations.some(observation => observation.checkState === 'failure') || prior.failed?.length;
    const sources = [...(round.sources || []), ...(prior.sources || [])].filter((source, index, all) => all.findIndex(other => other.url === source.url) === index);
    merged.set(round.id, { ...prior, ...round, date: watchNewestDate([prior.date, round.date]), firstObservedAt: prior.firstObservedAt || prior.observedAt || round.observedAt, observations, sources, done: [...new Set([...(prior.done || []), ...(round.done || [])])], failed: round.failed?.length ? round.failed : wasFailed ? ['此版本曾有自动检查未通过，后续结果见来源'] : [], provenance: archived || prior.provenance === 'observed-history' ? 'observed-history' : round.provenance });
  }
  return [...merged.values()].sort((a, b) => watchTime(b.date || b.at) - watchTime(a.date || a.at));
}

function watchRounds(project) {
  const seed = watchCopy(project.rounds || []);
  const facts = watchMergeFacts([...(project.observedRounds || []), ...watchSourceRounds(project)]).filter(round => {
    if (seed.some(reviewed => reviewed.id === round.id)) return false;
    // Distinct reviewed comments may share a code SHA. Keep each reviewed round intact;
    // suppress only an automatic baseline fact already represented by those reviews.
    const coveredBaseline = round.provenance !== 'observed-history' && seed.some(reviewed => reviewed.headSha && reviewed.headSha === round.headSha) && watchTime(round.date) <= watchTime(project.observedAt);
    return !coveredBaseline;
  });
  return [...seed, ...facts].sort((a, b) => watchTime(b.date || b.at) - watchTime(a.date || a.at));
}

export function getWatchSummary(project, at = Date.now()) {
  const sourceChanged = watchSourceChanged(project), lastSyncedAt = project.snapshot?.fetchedAt || project.observedAt || null;
  const stale = !lastSyncedAt || at - watchTime(lastSyncedAt) > 30 * 60 * 1000;
  const phase = typeof project.phase === 'string' ? { label: project.phase, sourceUrl: '' } : { label: '阶段待确认', ...project.phase };
  const allAttention = [...watchSeedAttention(project, sourceChanged), ...watchLiveAttention(project)].map(item => ({ ...item, projectId: project.id, projectName: project.name, resolution: project.resolutions?.[item.key] || null, resolved: Boolean(project.resolutions?.[item.key]) }));
  const attention = allAttention.filter(item => !item.resolved);
  const resolvedAttention = Object.entries(project.resolutions || {}).map(([key, resolution]) => ({ key, title: '已记录的来源事项', ...(resolution.attention || {}), ...(allAttention.find(item => item.key === key) || {}), projectId: project.id, projectName: project.name, resolution, resolved: true })).sort((a, b) => watchTime(b.resolution.at) - watchTime(a.resolution.at));
  const checks = watchObservedChecks(project);
  return { phase: { ...phase, needsReview: sourceChanged }, progress: watchPlanProgress(project), attention, resolvedAttention, allAttention, rounds: watchRounds(project), stale, lastSyncedAt, checks, sourceChanged, observed: Boolean(project.snapshot), monitored: Boolean(project.watching), pendingTasks: (project.tasks || []).filter(task => !task.done), warnings: project.snapshot?.warnings || [] };
}

export function getAttention(state, filter = {}) {
  const options = typeof filter === 'string' ? { kind: filter } : filter;
  return state.projects.filter(project => !options.watchingOnly || project.watching).flatMap(project => getWatchSummary(project).attention).filter(item => !options.kind || options.kind === 'all' || item.kind === options.kind).filter(item => !options.projectId || item.projectId === options.projectId);
}

export function applyWatchSnapshot(state, id, snapshot) {
  return watchMutate(state, id, project => {
    if (!snapshot || !watchTime(snapshot.fetchedAt) || !Array.isArray(snapshot.pullRequests) || !Array.isArray(snapshot.workflowRuns)) throw new Error('读取结果不完整，保留上次状态');
    if (parseWatchRepo(snapshot.repo).toLowerCase() !== project.repo.toLowerCase()) throw new Error('读取结果不属于这个项目');
    if (project.snapshot && watchTime(snapshot.fetchedAt) < watchTime(project.snapshot.fetchedAt)) return;
    const priorSnapshot = project.snapshot;
    const priorPr = priorSnapshot && Object.hasOwn(priorSnapshot, 'trackedHeadSha') ? priorSnapshot.pullRequests.find(pull => pull.headSha === priorSnapshot.trackedHeadSha)?.number || null : project.trackedPr;
    const priorFacts = watchSourceRounds({ ...project, trackedPr: priorPr });
    const knownRoundIds = new Set((project.observedRounds || []).map(round => round.id));
    const newFacts = [...priorFacts, ...watchSourceRounds({ ...project, snapshot })].filter(round => !watchTime(project.observedAt) || watchTime(round.date) > watchTime(project.observedAt) || knownRoundIds.has(round.id));
    project.observedRounds = watchMergeFacts([...(project.observedRounds || []), ...newFacts], true);
    const previousDocument = project.snapshot?.planDocument;
    if (previousDocument?.sha && (previousDocument.sha !== snapshot.planDocument?.sha || snapshot.planDocument?.unavailable)) {
      const prior = { ...watchCopy(previousDocument), observedAt: project.snapshot.fetchedAt };
      if (!project.previousPlans.some(plan => plan.sha === prior.sha && plan.path === prior.path)) project.previousPlans.unshift(prior);
      project.planNeedsReview = true;
    }
    if (!previousDocument && project.plan?.sha && snapshot.planDocument?.sha && project.plan.sha !== snapshot.planDocument.sha && !project.previousPlans.some(plan => plan.sha === project.plan.sha)) project.previousPlans.unshift(watchCopy(project.plan));
    project.snapshot = watchCopy(snapshot);
    project.lastReadAt = snapshot.fetchedAt;
    // Once relevant new evidence was seen, a later bounded window cannot make the
    // previous human summary current again. Only an explicit re-review may clear this.
    if (watchSourceChanged(project)) project.planNeedsReview = true;
  });
}

// Local acknowledgement only: it never approves a PR or claims a GitHub problem is fixed.
export function resolveAttention(state, id, key, note) {
  const explanation = watchText(note, 2000);
  if (!explanation) throw new Error('请写下处理记录');
  return watchMutate(state, id, project => {
    const attention = getWatchSummary(project).attention.find(item => item.key === key);
    if (!attention) throw new Error('这条提醒已经变化，请重新查看');
    project.resolutions = { ...project.resolutions, [key]: { note: explanation, at: new Date().toISOString(), scope: 'local-acknowledgement', attention: watchCopy(attention) } };
  });
}

export function addWatchNote(state, id, input) {
  return watchMutate(state, id, project => { const text = watchText(input.text || input.body, 8000); if (!text) throw new Error('请写一点内容'); project.notes.unshift({ id: input.id || watchId('note'), title: watchText(input.title || text.split('\n')[0], 100), text, createdAt: new Date().toISOString() }); });
}
export function addWatchTask(state, id, input) {
  return watchMutate(state, id, project => { const title = watchText(typeof input === 'string' ? input : input.title, 300); if (!title) throw new Error('请填写下一步'); project.tasks.push({ id: input.id || watchId('task'), title, done: false, createdAt: new Date().toISOString() }); });
}
export function toggleWatchTask(state, id, taskId) {
  return watchMutate(state, id, project => { const task = project.tasks.find(item => item.id === taskId); if (!task) throw new Error('找不到这条待办'); task.done = !task.done; });
}
