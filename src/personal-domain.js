// Personal workspace state. Pure, serializable commands; no network or browser APIs.
const DEFAULT_REPO = 'haohongfei2001-png/project-collaboration-workspace';
const STATES = { ready: '已可用', testing: '待体验', building: '开发中', blocked: '有阻塞', planned: '未开始', unknown: '待确认' };
const copy = value => structuredClone(value);
const now = () => new Date().toISOString();
const text = (value, max = 4000) => String(value ?? '').trim().slice(0, max);
let idSequence = 0;
const id = prefix => `${prefix}-${Date.now().toString(36)}-${(++idSequence).toString(36)}`;
const required = (value, label, max) => { const result = text(value, max); if (!result) throw new Error(`请填写${label}`); return result; };
const projectOf = (state, projectId) => { const project = state.projects.find(p => p.id === projectId); if (!project) throw new Error('这个项目不存在'); return project; };
const featureOf = (project, featureId) => { const feature = project.features.find(f => f.id === featureId); if (!feature) throw new Error('这个功能不存在'); return feature; };
const event = (project, title, detail = '') => { project.history.unshift({ id: id('change'), at: now(), title, detail }); project.history = project.history.slice(0, 80); };
const mutate = (state, projectId, command) => { const next = copy(state); command(projectOf(next, projectId)); return next; };

export function parseRepo(input) {
  const value = text(input, 500);
  if (!value) return '';
  let path = value;
  if (/^https?:\/\//i.test(value)) {
    let url;
    try { url = new URL(value); } catch { throw new Error('请填写 GitHub 仓库地址或 owner/repository'); }
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.username || url.password || url.port || url.search || url.hash) throw new Error('请使用 https://github.com/所有者/仓库 的地址');
    path = url.pathname.replace(/^\/+|\/+$/g, '');
  }
  path = path.replace(/\.git$/i, '');
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_.-]{1,100}$/.test(path) || path.split('/')[1] === '.' || path.split('/')[1] === '..') throw new Error('请填写一个仓库，例如 owner/repository');
  return path;
}
function safeLink(input) {
  const value = text(input, 2000); if (!value) return '';
  let url; try { url = new URL(value); } catch { throw new Error('链接需要包含 https:// 或 http://'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('这里只接受普通网页链接');
  return url.href;
}
function numbers(value = []) {
  const list = Array.isArray(value) ? value : String(value).split(/[\s,，]+/);
  return [...new Set(list.filter(v => v !== '').map(v => Number(String(v).replace(/^#/, ''))))].filter(v => Number.isSafeInteger(v) && v > 0).sort((a, b) => a - b);
}
function criteria(value = []) { return (Array.isArray(value) ? value : String(value).split('\n')).map(v => text(typeof v === 'object' ? v.title || v.text : v, 300)).filter(Boolean).slice(0, 20); }
function makeFeature(input) {
  return { id: input.id || id('feature'), title: required(input.title, '功能名称', 100), description: text(input.description, 1200), icon: text(input.icon || 'layers', 30), prNumbers: numbers(input.prNumbers), criteria: criteria(input.criteria), inScope: input.inScope !== false, manualStatus: ['planned', 'building', 'testing'].includes(input.manualStatus) ? input.manualStatus : 'planned', verification: null };
}
function makeProject(input) {
  return { id: input.id || id('project'), title: required(input.title, '项目名称', 100), goal: text(input.goal, 1000), repo: parseRepo(input.repo || ''), features: [], tasks: [], notes: [], focus: text(input.focus || '能用了吗？', 300), snapshot: null, previousSnapshot: null, lastSeenSnapshot: null, autoSync: false, history: [], createdAt: now() };
}

export function createPersonalState(snapshot = null) {
  const project = makeProject({ id: 'workspace', title: '项目工作台', goal: '打开就知道产品做到哪、我该做什么。', repo: DEFAULT_REPO, focus: '现在能用了吗？' });
  project.features = [
    makeFeature({ id: 'project-work', title: '安排下一步', description: '把想做的功能和下一步放在同一个地方。', icon: 'grid', prNumbers: [1], criteria: ['创建一个自己的项目', '加入功能并保存下一步'] }),
    makeFeature({ id: 'sources', title: '保存想法与资料', description: '想法和参考资料随项目保存，需要时随手找到。', icon: 'folder', prNumbers: [1], criteria: ['保存一条资料链接', '重新打开仍能找到'] }),
    makeFeature({ id: 'understanding', title: '看清项目状态', description: '看懂现在能做什么、还差什么，以及原因。', icon: 'spark', prNumbers: [1], criteria: ['知道当前能做什么', '找到一个明确的下一步'] }),
    makeFeature({ id: 'github', title: '跟进开发进展', description: '自动跟进公开仓库，看看上次之后有什么变化。', icon: 'github', prNumbers: [1], criteria: ['连接一个公开仓库', '同步后看到实际 PR 与检查结果', '失败时保留上次状态并说明原因'] })
  ];
  project.tasks = [{ id: 'first-try', title: '用自己的项目试一次，看状态说明是否真的有帮助', done: false, featureId: 'understanding', createdAt: now() }];
  project.notes = [{ id: 'scope-note', title: '第一版要解决的事', text: '先让我自己每天愿意打开；团队协作以后再做。GitHub 提供开发事实，我在这里看产品状态和下一步。', url: '', createdAt: now() }];
  const state = { version: 2, activeProjectId: project.id, projects: [project] };
  if (!snapshot) return state;
  return applySnapshot(state, project.id, snapshot);
}
export function addProject(state, input) {
  const project = makeProject(input); if (state.projects.some(p => p.id === project.id)) throw new Error('项目标识已存在');
  const next = copy(state); next.projects.push(project); next.activeProjectId = project.id; return next;
}
export function updateProject(state, projectId, patch) {
  return mutate(state, projectId, project => {
    if ('title' in patch) project.title = required(patch.title, '项目名称', 100);
    if ('goal' in patch) project.goal = text(patch.goal, 1000);
    if ('focus' in patch) project.focus = text(patch.focus, 300);
    if ('autoSync' in patch) project.autoSync = Boolean(patch.autoSync);
    if ('repo' in patch) {
      const repo = parseRepo(patch.repo);
      if (repo.toLowerCase() !== project.repo.toLowerCase()) { project.snapshot = null; project.previousSnapshot = null; project.lastSeenSnapshot = null; project.features.forEach(f => { f.verification = null; f.prNumbers = []; }); event(project, '更换了代码来源', '原仓库的 PR 关联和体验确认已清除。'); }
      project.repo = repo;
    }
  });
}
export function addFeature(state, projectId, input) {
  return mutate(state, projectId, project => { const feature = makeFeature(input); if (project.features.some(f => f.id === feature.id)) throw new Error('功能标识已存在'); project.features.push(feature); event(project, `加入功能：${feature.title}`); });
}
export function updateFeature(state, projectId, featureId, patch) {
  return mutate(state, projectId, project => {
    const feature = featureOf(project, featureId);
    if ('title' in patch) feature.title = required(patch.title, '功能名称', 100);
    if ('description' in patch) feature.description = text(patch.description, 1200);
    if ('icon' in patch) feature.icon = text(patch.icon, 30);
    if ('prNumbers' in patch) feature.prNumbers = numbers(patch.prNumbers);
    if ('criteria' in patch) { const nextCriteria = criteria(patch.criteria); if (JSON.stringify(nextCriteria) !== JSON.stringify(feature.criteria)) feature.verification = null; feature.criteria = nextCriteria; }
    if ('inScope' in patch) feature.inScope = Boolean(patch.inScope);
    if ('manualStatus' in patch && ['planned', 'building', 'testing'].includes(patch.manualStatus)) feature.manualStatus = patch.manualStatus;
    event(project, `更新功能：${feature.title}`);
  });
}
function linkedPulls(project, feature) {
  const pulls = project.snapshot?.pullRequests || [];
  return feature.prNumbers.map(number => pulls.find(p => p.number === number)).filter(Boolean);
}
function fingerprint(project, feature) {
  return JSON.stringify({ repo: project.repo.toLowerCase(), refs: feature.prNumbers.map(number => { const p = project.snapshot?.pullRequests?.find(pr => pr.number === number); return [number, p?.headSha || null]; }) });
}
export function setFeatureVerification(state, projectId, featureId, input) {
  return mutate(state, projectId, project => {
    const feature = featureOf(project, featureId), note = required(input.note, '实际体验结果', 1500);
    const pulls = linkedPulls(project, feature);
    const sourceBlocked = pulls.length !== feature.prNumbers.length || pulls.some(pull => checkState(pull) === 'failure' || pull.state === 'closed' && !pull.merged);
    if (input.passed && sourceBlocked) throw new Error('先处理失败的检查或补齐代码依据，再确认可用。');
    feature.verification = { passed: Boolean(input.passed), note, at: input.at || now(), evidenceKey: fingerprint(project, feature) };
    event(project, `${input.passed ? '确认可用' : '记录体验问题'}：${feature.title}`, note);
  });
}
export function addTask(state, projectId, input) {
  const value = typeof input === 'string' ? { title: input } : input;
  return mutate(state, projectId, project => {
    if (value.featureId) featureOf(project, value.featureId);
    const taskId = value.id || id('task'); if (project.tasks.some(t => t.id === taskId)) throw new Error('待办标识已存在');
    project.tasks.unshift({ id: taskId, title: required(value.title, '下一步', 200), done: false, featureId: value.featureId || null, createdAt: now() });
  });
}
export function updateTask(state, projectId, taskId, patch) {
  return mutate(state, projectId, project => {
    const task = project.tasks.find(t => t.id === taskId); if (!task) throw new Error('这条待办不存在');
    if ('title' in patch) task.title = required(patch.title, '下一步', 200);
    if ('featureId' in patch) { if (patch.featureId) featureOf(project, patch.featureId); task.featureId = patch.featureId || null; }
    task.updatedAt = now();
  });
}
export function toggleTask(state, projectId, taskId, done) {
  return mutate(state, projectId, project => { const task = project.tasks.find(t => t.id === taskId); if (!task) throw new Error('这条待办不存在'); task.done = typeof done === 'boolean' ? done : !task.done; task.completedAt = task.done ? now() : null; });
}
export function addNote(state, projectId, input) {
  return mutate(state, projectId, project => { const noteId = input.id || id('note'); if (project.notes.some(n => n.id === noteId)) throw new Error('资料标识已存在'); project.notes.unshift({ id: noteId, title: required(input.title, '资料名称', 150), text: text(input.text ?? input.content, 10000), url: safeLink(input.url), createdAt: now() }); });
}
export function updateNote(state, projectId, noteId, patch) {
  return mutate(state, projectId, project => {
    const note = project.notes.find(n => n.id === noteId); if (!note) throw new Error('这条资料不存在');
    if ('title' in patch) note.title = required(patch.title, '资料名称', 150);
    if ('text' in patch) note.text = text(patch.text, 10000);
    if ('url' in patch) note.url = safeLink(patch.url);
    note.updatedAt = now();
  });
}
export function setFocus(state, projectId, question) { return updateProject(state, projectId, { focus: required(question, '关心的问题', 300) }); }

function checkState(pull) { const check = pull.check; return !pull.headSha || check?.headSha !== pull.headSha ? 'unknown' : check?.state || 'unknown'; }
export function getFeatureState(project, feature) {
  if (typeof feature === 'string') feature = featureOf(project, feature);
  const pulls = linkedPulls(project, feature), missing = feature.prNumbers.filter(n => !pulls.some(p => p.number === n));
  const evidence = pulls.flatMap(p => [{ label: `PR #${p.number} · ${p.title}`, url: p.url || `https://github.com/${project.repo}/pull/${p.number}`, kind: 'pull', number: p.number }, ...(p.check?.url ? [{ label: `检查：${checkState(p) === 'success' ? '通过' : checkState(p) === 'failure' ? '失败' : checkState(p) === 'pending' ? '进行中' : '待确认'}`, url: p.check.url, kind: 'check' }] : [])]);
  const changed = Boolean(feature.verification && feature.verification.evidenceKey !== fingerprint(project, feature));
  let status, description, nextAction;
  if (missing.length) { status = 'unknown'; description = `还没有读到关联的 PR ${missing.map(n => `#${n}`).join('、')}。`; nextAction = '同步 GitHub，或检查关联的 PR'; }
  else if (pulls.some(p => checkState(p) === 'failure')) { status = 'blocked'; description = '这项功能的自动检查没有通过，需要先修复。'; nextAction = '查看失败的检查'; }
  else if (pulls.some(p => p.state === 'closed' && !p.merged)) { status = 'blocked'; description = '关联的改动已关闭，但没有合入。'; nextAction = '确认是否改用其他实现'; }
  else if (feature.verification?.passed && !changed) { status = 'ready'; description = feature.verification.note; nextAction = '查看体验结果'; }
  else if (feature.verification && !feature.verification.passed && !changed) { status = 'blocked'; description = feature.verification.note; nextAction = '处理体验中发现的问题'; }
  else if (changed) { status = 'testing'; description = '你体验过的代码又更新了，需要再试一次。'; nextAction = '体验新版本'; }
  else if (pulls.length && pulls.every(p => !p.draft && checkState(p) === 'success')) { status = 'testing'; description = pulls.every(p => p.merged) ? '关联代码已合入，已读到的检查通过，等你实际体验。' : '关联改动已通过读到的检查，具体功能还需要实际体验。'; nextAction = '试一下这个功能'; }
  else if (pulls.length) { status = 'building'; description = pulls.some(p => p.draft) ? '实现还在调整，暂时没有可确认的候选版本。' : pulls.some(p => checkState(p) === 'pending') ? '代码检查正在运行。' : '已有实现改动，当前检查结果还不完整。'; nextAction = '查看开发进展'; }
  else { status = feature.manualStatus || 'planned'; description = status === 'testing' ? '你已标记为待体验，还没有可用确认。' : status === 'building' ? '你已开始这项工作，暂未关联代码。' : '还没有开始，可以先明确第一步。'; nextAction = status === 'planned' ? '安排下一步' : '更新当前情况'; }
  return { status, label: STATES[status], description, reason: description, nextAction, needsRetest: changed, evidence, missingPrNumbers: missing };
}
function delta(previous, current) {
  if (!current) return [];
  if (!previous) return [{ id: 'first-sync', title: '已读入仓库状态', detail: `读取了 ${current.pullRequests?.length || 0} 个最近的改动；没有将代码活动当作功能可用。`, url: current.repository?.url || `https://github.com/${current.repo}` }];
  const changes = [];
  for (const pr of current.pullRequests || []) {
    const old = previous.pullRequests?.find(p => p.number === pr.number);
    if (!old) changes.push({ id: `new-${pr.number}`, title: `新增改动 #${pr.number}`, detail: pr.title, url: pr.url });
    else {
      if (pr.headSha !== old.headSha) changes.push({ id: `head-${pr.number}`, title: `#${pr.number} 有新代码`, detail: '原先的体验确认需要与新版本重新核对。', url: pr.url });
      if (pr.merged && !old.merged) changes.push({ id: `merged-${pr.number}`, title: `#${pr.number} 已合入`, detail: '代码合入不等于已经体验通过。', url: pr.url });
      else if (pr.state !== old.state) changes.push({ id: `state-${pr.number}`, title: `#${pr.number} ${pr.state === 'closed' ? '已关闭' : '重新打开'}`, detail: pr.title, url: pr.url });
      if (checkState(pr) !== checkState(old)) changes.push({ id: `check-${pr.number}`, title: `#${pr.number} 检查${checkState(pr) === 'success' ? '通过' : checkState(pr) === 'failure' ? '失败' : checkState(pr) === 'pending' ? '进行中' : '待确认'}`, detail: pr.title, url: pr.check?.url || pr.url });
    }
  }
  return changes;
}
export function applySnapshot(state, projectId, snapshot) {
  return mutate(state, projectId, project => {
    if (!snapshot || !Array.isArray(snapshot.pullRequests) || !snapshot.fetchedAt || Number.isNaN(Date.parse(snapshot.fetchedAt))) throw new Error('仓库状态格式不完整');
    if (parseRepo(snapshot.repo).toLowerCase() !== project.repo.toLowerCase()) throw new Error('仓库状态与当前项目不匹配');
    if (project.snapshot && Date.parse(snapshot.fetchedAt) < Date.parse(project.snapshot.fetchedAt)) return;
    const value = copy(snapshot), changes = delta(project.snapshot, value);
    project.previousSnapshot = project.snapshot;
    project.snapshot = value;
    if (changes.length) event(project, 'GitHub 状态更新', changes.map(change => change.title).join('；'));
  });
}
export function markSeen(state, projectId) { return mutate(state, projectId, project => { project.lastSeenSnapshot = copy(project.snapshot); project.lastSeenAt = now(); }); }
export function getProjectSummary(state, projectId, at = Date.now()) {
  const project = projectOf(state, projectId), features = project.features.filter(f => f.inScope !== false).map(f => ({ ...f, ...getFeatureState(project, f) }));
  const counts = Object.fromEntries(Object.keys(STATES).map(key => [key, features.filter(f => f.status === key).length]));
  const total = features.length, ready = counts.ready, percent = total ? Math.round(100 * ready / total) : 0;
  const sourceFreshness = !project.snapshot ? 'missing' : at - Date.parse(project.snapshot.fetchedAt) > 15 * 60 * 1000 ? 'stale' : 'fresh';
  const nextActions = [];
  for (const feature of features.filter(f => f.status === 'blocked')) nextActions.push({ id: `unblock-${feature.id}`, title: feature.nextAction, detail: feature.title, featureId: feature.id, kind: 'unblock' });
  for (const task of project.tasks.filter(t => !t.done)) nextActions.push({ id: task.id, title: task.title, detail: task.featureId ? featureOf(project, task.featureId).title : '自己安排的下一步', taskId: task.id, kind: 'task' });
  for (const feature of features.filter(f => f.status === 'testing')) nextActions.push({ id: `try-${feature.id}`, title: `试一下「${feature.title}」`, detail: feature.needsRetest ? '代码更新后，需要重新体验' : '自动检查通过还不等于好用', featureId: feature.id, kind: 'verify' });
  if (!total) nextActions.push({ id: 'first-feature', title: '写下这版最想做好的功能', detail: '一个具体的小功能就够开始', kind: 'feature' });
  else if (project.repo && !project.snapshot) nextActions.push({ id: 'sync', title: '读取 GitHub 状态', detail: '先取得开发依据，再判断产品进展', kind: 'sync' });
  const headline = !total ? '先放进你这版最想做好的功能。' : ready === total ? '这版列出的功能，都已经体验通过。' : counts.blocked ? `${counts.blocked} 项功能还卡着，先解决它们。` : counts.testing ? '开发有了新进展，接下来试试好不好用。' : counts.unknown ? '还缺开发依据，暂时不能判断做到哪里了。' : counts.building ? '开发正在推进，还没有全部确认可用。' : ready ? `${ready} 项功能已经可用，接着做剩下的 ${total-ready} 项。` : '目标已经有了，从一个小功能开始。';
  const description = !total ? '不用先写完整计划。添加一个想实现的功能就可以开始。' : `${total} 项本版功能中，${ready} 项已确认可用${counts.testing ? `，${counts.testing} 项待体验` : ''}${counts.blocked ? `，${counts.blocked} 项需处理问题` : ''}。`;
  return { title: project.title, headline, description, total, ready, percent, counts, features, nextActions, changes: delta(project.previousSnapshot, project.snapshot), sinceSeenChanges: delta(project.lastSeenSnapshot, project.snapshot), sourceFreshness, hasSnapshot: Boolean(project.snapshot), focus: project.focus, answerMode: 'rules', lastSyncedAt: project.snapshot?.fetchedAt || null };
}
export function answerProject(state, projectId, question) {
  const project = projectOf(state, projectId), summary = getProjectSummary(state, projectId), query = required(question, '问题', 500);
  const citations = [...new Map(summary.features.flatMap(f => f.evidence).map(e => [e.url, e])).values()].slice(0, 8);
  let title = '当前产品状态', answer = summary.headline, bullets = [summary.description];
  if (/变化|最近|更新|上次/.test(query)) { title = '上次看过以后'; const changes = summary.sinceSeenChanges; answer = changes.length ? `有 ${changes.length} 处值得注意的变化。` : '已读取的状态与上次看过时没有变化。'; bullets = changes.length ? changes.map(c => `${c.title}：${c.detail}`) : ['这只覆盖已同步的 PR 和自动检查；未同步的信息不会被猜测。']; }
  else if (/下一步|现在做|该做|做什么|先做|推进|处理/.test(query)) { title = '现在值得做的事'; answer = summary.nextActions[0]?.title || '先补充一个明确的本版功能。'; bullets = summary.nextActions.slice(0, 3).map(a => `${a.title}：${a.detail}`); }
  else if (/还差|阻塞|卡|风险|问题/.test(query)) { title = '离本版目标还差什么'; const pending = summary.features.filter(f => f.status !== 'ready'); answer = pending.length ? `还剩 ${pending.length} 项功能没有确认可用。` : '当前列入本版的功能都已确认可用。'; bullets = pending.map(f => `${f.title} · ${f.label}：${f.description}`); }
  else if (/能用|可用|日常|完成|发布|上线|怎么样|进展|状态/.test(query)) { title = /发布|上线/.test(query) ? '发布前还要确认' : '现在能用了吗'; answer = summary.headline; bullets = [summary.description, ...summary.features.slice(0, 4).map(f => `${f.title}：${f.description}`)]; if (/发布|上线/.test(query)) bullets.push('这些开发和体验记录不能单独证明生产部署、数据安全或真实用户效果已经验证。'); }
  else { title = '这个问题还需要补充依据'; answer = '当前助手能解释已同步的开发状态，以及你保存的本版目标和体验结果。'; bullets = [`你关心的是「${query}」。现有资料没有足够依据给出具体结论。`, summary.description, '可以先把对应功能、资料或下一步加到项目中。']; }
  if (summary.sourceFreshness === 'missing') bullets.unshift('还没有 GitHub 状态，当前说明仅基于你保存的内容。');
  else if (summary.sourceFreshness === 'stale') bullets.push('来源已超过 15 分钟未更新，先同步再判断最新状态。');
  if (project.snapshot?.warnings?.length) bullets.push(...project.snapshot.warnings);
  return { question: query, title, answer, bullets, citations, mode: 'rules', generatedAt: now(), freshness: summary.sourceFreshness };
}
