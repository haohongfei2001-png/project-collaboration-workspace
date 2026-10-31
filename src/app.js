import { createSeed, execute, getProgress, can, visibleResources, summarize, createPlan, getTaskBlockers, getLeaves, getEffectiveStatus, resourceMetadata } from './domain.js';

const STORE = 'project-workspace.r1.projects';
const SESSION = 'project-workspace.r1.session';
const APP = document.querySelector('#app');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  layers: '<path d="m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/>',
  tree: '<rect x="3" y="3" width="7" height="5" rx="1"/><rect x="14" y="10" width="7" height="5" rx="1"/><rect x="14" y="18" width="7" height="4" rx="1"/><path d="M6 8v12h8M6 12h8"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  circleCheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
  external: '<path d="M14 3h7v7m0-7-11 11M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  spark: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z"/>',
  link: '<path d="m10 13 4-4m-6 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 1 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0)"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8M8 17h5"/>',
  github: '<path d="M9 19c-4 1-4-2-5-2m10 4v-3.4a3 3 0 0 0-.8-2.3c2.8-.3 5.8-1.4 5.8-6.2a4.8 4.8 0 0 0-1.3-3.3 4.5 4.5 0 0 0-.1-3.3s-1-.3-3.4 1.3a12 12 0 0 0-6.2 0C5.6 2.2 4.6 2.5 4.6 2.5a4.5 4.5 0 0 0-.1 3.3A4.8 4.8 0 0 0 3.2 9c0 4.8 3 5.9 5.8 6.2a3 3 0 0 0-.8 2.2V21"/>',
  drive: '<path d="m8 3 7 12h7L15 3H8Zm0 0L1 15l4 6 7-12M5 21h14l3-6H8"/>',
  branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 7v10m0-6h5a7 7 0 0 0 7-3"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 1l1 5M4 12l1 5a8 8 0 0 0 13 1"/>',
  alert: '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v.1"/>',
  flag: '<path d="M5 21V4m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const statuses = { todo: ['待开始','neutral'], in_progress: ['进行中','purple'], blocked: ['受阻','amber'], review: ['待验收','blue'], accepted: ['已验收','green'] };
const roleNames = { owner: '产品负责人', designer: '设计师', frontend: '前端工程师', backend: '后端工程师', qa: '测试 / 交付', viewer: '观察者' };
const uniqueId = prefix => `${prefix}-${typeof crypto.randomUUID==='function'?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const memberColors = { owner: '#dce6df', designer: '#ede2d8', frontend: '#dfe6f4', backend: '#eee4ce', qa: '#e7e0f1', viewer: '#e4e6e8' };
const eventNames = { 'project.created':'创建项目', 'task.created':'创建工作任务', 'task.updated':'调整任务要求', 'task.status_changed':'更新任务状态', 'task.status':'更新任务状态', 'task.assigned':'调整负责人', 'resource.linked':'关联任务资料', 'task.resource_linked':'关联任务资料', 'proposal.submitted':'提交候选方案', 'proposal.adopted':'正式采用方案', 'task.submitted':'提交任务验收', 'task.accepted':'任务验收通过', 'github.linked':'关联 GitHub PR', 'github.synced':'同步代码变化', 'github.merged':'PR 合并已同步', 'drive.synced':'同步资料更新', 'resource.updated':'同步资料更新', 'resource.reviewed':'复核任务依据', 'resource.unavailable':'来源访问失效', 'source.unavailable':'来源访问失效', 'source.restored':'恢复来源访问', 'resource.restored':'恢复来源访问', 'ai.plan_applied':'批准 AI 任务草案', 'ai.plan.applied':'批准 AI 任务草案', 'project.delivered':'确认本轮交付', 'task.acceptance_invalidated':'任务依据需要重新确认','acceptance.invalidated':'验收依据需要重新确认','task.basis_changed':'正式采用依据变化','resource.registered':'登记资料快照','resource.reviewed':'复核来源版本' };
const eventLabel = action => eventNames[action] || '项目记录更新';
const navItems = [['overview','grid','项目概览'],['work','tree','工作结构'],['resources','folder','资料库'],['outcomes','circleCheck','成果与验收'],['activity','clock','进展记录']];
let appProjects = {};
let activeProject = 'feedback';
let actorId = 'owner';
let persistenceError = false;
try {
  const stored = JSON.parse(localStorage.getItem(STORE) || '{}');
  for (const [key, value] of Object.entries(stored)) if (value?.schemaVersion === 1 && Array.isArray(value.tasks) && Array.isArray(value.resources) && Array.isArray(value.members) && Array.isArray(value.audit)) appProjects[key] = value;
  const session = JSON.parse(localStorage.getItem(SESSION) || '{}');
  activeProject = session.project || 'feedback';
  actorId = session.actor || 'owner';
} catch { persistenceError = true; }
if (!Object.keys(appProjects).length) { const seed = createSeed(); appProjects[seed.project.id] = seed; activeProject = seed.project.id; }
if (!appProjects[activeProject]) activeProject = Object.keys(appProjects)[0];
let appState = appProjects[activeProject];
if (!appState.members.some(m => m.id === actorId)) actorId = 'owner';
const ui = { view: 'overview', panel: null, modal: null, taskId: null, resourceId: null, mobileNav: false, projectMenu: false, query: '', filter: 'all', collapsed: new Set(), tab: 'decisions', agentId: 'observer', aiQuery: '', answer: null, plan: null, selectedVersion: null, reviewMode: null, guide: false, sourceFilter: 'all', compareTaskId: null };
let toastTimer;
let lastDialogFocus;

function save() {
  appProjects[activeProject] = appState;
  try { localStorage.setItem(STORE, JSON.stringify(appProjects)); localStorage.setItem(SESSION, JSON.stringify({ project: activeProject, actor: actorId })); }
  catch { persistenceError = true; }
}
function toast(message, bad = false) {
  const el = document.querySelector('#toast');
  el.textContent = message; el.className = bad ? 'visible error' : 'visible';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = ''; }, 4300);
}
function run(command, message, options = {}) {
  const result = execute(appState, command, actorId);
  if (!result.ok) { toast(result.error?.message || result.message || '这项操作当前不可执行', true); return false; }
  if (command.type === 'createProject') { activeProject = result.state.project.id; ui.view = 'overview'; }
  appState = result.state; save();
  if (ui.answer) ui.answer = null;
  if (options.close) { ui.modal = null; ui.reviewMode = null; }
  render(); toast(message || result.message || '已更新项目'); return true;
}
const person = id => appState.members.find(m => m.id === id) || { id, name: id === 'observer' ? '观察助手' : id === 'planner' ? '规划助手' : (id || '未指派') };
const taskBy = id => appState.tasks.find(t => t.id === id);
const resourceBy = id => appState.resources.find(r => r.id === id);
const memberName = id => person(id).name;
const avatar = (id, size = '') => `<span class="avatar ${size}" style="--avatar-bg:${memberColors[id] || '#e9e6f2'}" title="${esc(memberName(id))}">${esc(memberName(id).slice(-1))}</span>`;
const badge = (label, tone = 'neutral') => `<span class="badge ${tone}">${esc(label)}</span>`;
const status = t => { const effective = getEffectiveStatus(appState,t); const s = statuses[effective] || statuses.todo; return `<span class="status ${s[1]}"><span class="status-dot ${effective}">${effective === 'accepted' ? icon('check') : ''}</span>${s[0]}</span>`; };
const btn = (label, action, cls = '', attrs = '', symbol = '') => `<button type="button" class="button ${cls}" data-action="${action}" ${attrs}>${symbol ? icon(symbol) : ''}<span>${label}</span></button>`;
const dateLabel = value => { if (!value) return '未设置'; const d = new Date(value); return Number.isNaN(+d) ? String(value) : `${d.getUTCMonth()+1}月${d.getUTCDate()}日`; };
const timeLabel = value => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(+d) ? String(value) : new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d); };
const getVisible = () => appState.resources.map(r => resourceMetadata(appState,actorId,r.id)).filter(Boolean).map(m => m.available ? resourceBy(m.id) : m);
const getAgentVisible = () => visibleResources(appState, actorId, ui.agentId);
const isVisible = id => getVisible().some(r => r.id === id);
const getStale = t => (t.resourceLinks || []).filter(l => { const r = resourceBy(l.resourceId); return r && (r.version !== l.pinnedVersion || !r.available); });
const memberOptions = current => appState.members.filter(m => m.id !== 'viewer').map(m => `<option value="${esc(m.id)}" ${m.id === current ? 'selected' : ''}>${esc(m.name)} · ${esc(roleNames[m.id] || m.role)}</option>`).join('');
const sectionHeading = (title, sub = '', action = '') => `<div class="section-heading"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${action}</div>`;
function empty(title, sub, action = '') { return `<div class="empty-state"><div class="empty-mark">${icon('layers')}</div><h3>${title}</h3><p>${sub}</p>${action}</div>`; }
function navigate(view) { ui.view = view; ui.panel = null; ui.modal = null; ui.mobileNav = false; ui.query = ''; ui.filter = 'all'; render(); document.querySelector('#workspace-main')?.scrollTo(0,0); }
function openTask(id) { ui.taskId = id; ui.panel = 'task'; ui.modal = null; ui.answer = null; render(); }
function openResource(id) { if (!isVisible(id)) { toast('该来源不在当前身份的访问范围内', true); return; } ui.resourceId = id; ui.selectedVersion = null; ui.panel = 'resource'; render(); }

function sidebar() {
  return `<aside class="sidebar ${ui.mobileNav ? 'is-open' : ''}" aria-label="项目导航">
    <div class="brand"><span class="brand-symbol">${icon('layers')}</span><div>Project Workspace<small>项目协作工作台</small></div><button class="icon-button mobile-only" data-action="toggle-nav" aria-label="关闭导航">${icon('x')}</button></div>
    <button class="workspace-switch" data-action="projects"><span class="team-logo">P</span><span>产品团队<small>演示工作空间</small></span>${icon('down')}</button>
    ${btn('搜索项目内容','search','search-trigger','','search')}
    <div class="nav-label">当前项目</div>
    <button class="project-switch ${ui.projectMenu ? 'active' : ''}" data-action="projects"><span class="project-glyph">${icon('layers')}</span><span>${esc(appState.project.name)}</span>${icon('down')}</button>
    ${ui.projectMenu ? `<div class="project-dropdown">${Object.entries(appProjects).map(([id,s])=>`<button data-action="switch-project" data-id="${esc(id)}">${icon(id === activeProject ? 'circleCheck' : 'layers')}<span>${esc(s.project.name)}</span></button>`).join('')}<button data-action="new-project">${icon('plus')}创建项目</button></div>` : ''}
    <nav>${navItems.map(([id,ic,label])=>`<button class="nav-item ${ui.view===id ? 'active' : ''}" data-view="${id}" ${ui.view===id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${id==='outcomes' && appState.tasks.some(t=>t.status==='review') ? `<span class="nav-count">${appState.tasks.filter(t=>t.status==='review' && !appState.tasks.some(c=>c.parentId===t.id)).length}</span>` : ''}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><button class="nav-item ${ui.view==='team' ? 'active' : ''}" data-view="team">${icon('users')}<span>成员与权限</span></button><button class="nav-item ${ui.view==='connections' ? 'active' : ''}" data-view="connections">${icon('link')}<span>来源连接</span><span class="small-dot"></span></button><div class="sidebar-rule"></div><button class="guide-button" data-action="guide">${icon('play')}<span>演示导览<small>从方案选择到正式交付</small></span>${icon('chevron')}</button><div class="prototype-note"><span class="mini-dot"></span>R1 原型 · 虚构数据 ${btn('说明','about','text-button')}</div></div>
  </aside>`;
}
function topbar() {
  const title = navItems.find(n=>n[0]===ui.view)?.[2] || ({team:'成员与权限',connections:'来源连接'}[ui.view]) || '项目概览';
  return `<header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-only" data-action="toggle-nav" aria-label="打开导航" aria-expanded="${ui.mobileNav}">${icon('menu')}</button><span class="breadcrumb-project">${esc(appState.project.name)}</span><span class="separator">/</span><strong>${title}</strong></div><div class="topbar-actions"><span class="local-label">${icon('circleCheck')}<span>${persistenceError ? '当前会话保存' : '已保存在此浏览器'}</span></span><button class="assistant-trigger ${ui.panel==='ai' ? 'active' : ''}" data-action="ai">${icon('spark')}<span>项目助手</span><kbd>⌘ J</kbd></button><div class="identity">${avatar(actorId)}<select id="identity" aria-label="切换演示身份">${appState.members.map(m=>`<option value="${esc(m.id)}" ${actorId===m.id ? 'selected' : ''}>${esc(m.name)} · ${esc(roleNames[m.id] || m.role)}</option>`).join('')}</select>${icon('down')}</div></div></header>`;
}
function pageTitle(eyebrow, title, subtitle, actions = '') { return `<div class="page-title"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div><div class="page-title-actions">${actions}</div></div>`; }

function overview() {
  const p = getProgress(appState);
  const leaves = getLeaves(appState);
  const adopted = appState.decisions.length > 0;
  const undecided=appState.proposals.find(x=>x.status==='submitted'&&!appState.decisions.some(d=>d.taskId===x.taskId&&!d.supersededBy));
  const needsDecision = Boolean(undecided);
  const decisionCandidates=undecided?appState.proposals.filter(x=>x.taskId===undecided.taskId):[];
  const pending = leaves.filter(t=>getEffectiveStatus(appState,t)==='review');
  const blocked = leaves.filter(t=>getTaskBlockers(appState,t.id).length > 0 && t.status!=='accepted');
  const next = needsDecision ? taskBy(undecided.taskId) : pending[0] || blocked[0] || leaves.find(t=>t.status!=='accepted');
  const isDelivered = appState.project.status === 'delivered';
  const attentionTitle = needsDecision ? `为「${taskBy(undecided.taskId)?.title||'当前工作'}」选定方案` : pending.length ? `${pending.length} 项成果等待验收` : blocked.length ? '先解决依赖，再继续推进' : p.readyToDeliver ? '本轮工作已验收，可以交付了' : leaves.length ? '推进下一项有明确依据的工作' : '把目标拆成第一项可交付的工作';
  return `${pageTitle('PROJECT OVERVIEW',`${esc(appState.project.name)} ${badge(isDelivered ? '已交付' : '进行中',isDelivered ? 'green' : 'purple')}`,esc(appState.project.goal),`${btn('新建任务','new-task','primary','','plus')}`)}
    ${p.currentEvidenceWarning?`<div class="notice amber">${icon('alert')}<div><strong>已交付 · 当前依据待复核</strong><span>${esc(p.currentEvidenceWarning)}</span></div></div>`:''}<div class="project-meta"><span>${icon('flag')}目标交付 ${dateLabel(appState.project.dueDate)}</span><span>${avatar('owner','tiny')}林澈负责</span><div class="avatar-stack">${['designer','frontend','backend','qa'].map(id=>avatar(id,'tiny')).join('')}</div><span class="meta-faded">5 位协作者 · 2 个 AI 角色</span></div>
    <section class="progress-summary" aria-label="验收进度"><div class="progress-number"><span class="overline">本轮验收</span><strong>${p.accepted}<span> / ${p.total}</span></strong><span>项交付任务</span></div><div class="progress-visual"><div class="progress-legend"><span><i class="legend-dot green"></i>已验收 ${p.accepted}</span><span><i class="legend-dot blue"></i>待验收 ${p.review}</span><span><i class="legend-dot purple"></i>进行中 ${p.inProgress}</span><span><i class="legend-dot amber"></i>受阻 ${p.blocked}</span><span><i class="legend-dot"></i>待开始 ${p.todo}</span></div><div class="segmented-progress" aria-label="验收完成度 ${p.percent}%">${leaves.length ? leaves.map(t=>`<button title="${esc(t.id+' '+t.title+' · '+(statuses[getEffectiveStatus(appState,t)]?.[0]||''))}" aria-label="查看 ${esc(t.id)}" class="segment ${getEffectiveStatus(appState,t)}" data-action="task" data-id="${esc(t.id)}"></button>`).join('') : '<span class="segment todo"></span>'}</div><div class="progress-footnote">验收完成度 ${p.percent}%<span>按本轮叶子任务计算 · 方案采用与 PR 合并不计为验收</span></div></div></section>
    <div class="overview-columns"><div class="overview-primary"><section class="next-action"><div class="section-kicker"><span class="attention-dot"></span>${isDelivered ? '本轮交付完成' : '下一步 · 需要推动'}</div><h2>${isDelivered ? p.currentEvidenceWarning?'交付记录已保留，当前依据待复核':'交付依据已经完整留存' : attentionTitle}</h2><p>${isDelivered ? esc(appState.deliveries?.at(-1)?.note || '本轮已完成验收，决策与来源版本可在进展记录中追溯。') : needsDecision ? `${esc(memberName(undecided.authorId))}提交了 ${decisionCandidates.length} 个候选方案。采用一个确定版本，让后续工作有清楚依据；其他方案将保留在历史中。` : next ? esc(next.description) : p.readyToDeliver ? '本轮任务均已验收，资料依据有效。核对交付说明后，正式留存本轮范围、成果和决策记录。' : '填写任务要求、负责人和验收条件，让团队对完成的定义保持一致。'}</p><div class="next-action-footer"><div class="related-line">${next ? `${avatar(next.assigneeId,'tiny')}<span>${esc(next.id)} · ${esc(memberName(next.assigneeId))}</span>${status(next)}` : badge('范围清楚，进度才可信','neutral')}</div>${isDelivered ? btn('查看交付记录','goto-activity','primary soft','','clock') : needsDecision ? btn(decisionCandidates.length===2?'比较两个方案':'比较候选方案','compare','primary soft',`data-task="${esc(undecided.taskId)}"`,'arrow') : next ? btn('查看并推进','task','primary soft',`data-id="${esc(next.id)}"`,'arrow') : p.readyToDeliver ? btn('确认本轮交付','deliver','primary soft','','check') : btn('创建第一项任务','new-task','primary soft','','plus')}</div></section>
      <section class="milestone-section">${sectionHeading('里程碑','阶段组织工作，验收确认进展。',btn('查看工作结构','goto-work','text-button','','arrow'))}<div class="milestone-list">${appState.milestones.map((m,i)=>{const mp=p.milestones.find(x=>x.id===m.id)||{accepted:0,total:0,percent:0};return `<button class="milestone-row" data-action="milestone" data-id="${esc(m.id)}"><span class="milestone-index ${mp.total && mp.accepted===mp.total ? 'complete' : ''}">${mp.total && mp.accepted===mp.total ? icon('check') : `0${i+1}`}</span><span class="milestone-info"><strong>${esc(m.title || m.name)}</strong><small>${mp.accepted===mp.total && mp.total ? '已完成本阶段验收' : mp.total ? `${mp.total-mp.accepted} 项工作尚待确认` : isDelivered?'本轮未纳入工作':'等待拆分任务'}</small></span><span class="milestone-mini-progress"><i style="width:${mp.percent}%"></i></span><span class="milestone-count">${mp.accepted}<span>/${mp.total}</span></span>${icon('chevron')}</button>`;}).join('')}</div></section>
      <section>${sectionHeading('执行队列','优先展示等待判断和存在依赖的工作。',btn('全部任务','goto-work','text-button','','arrow'))}<div class="compact-task-list">${[...new Set([...pending,...blocked,...leaves.filter(t=>t.status==='in_progress')])].slice(0,4).map(t=>taskRow(t,true)).join('') || empty('项目已就绪','创建任务或查看本轮交付记录。')}</div></section>
    </div><aside class="overview-secondary"><section class="context-section"><div class="rail-heading">${icon('spark')}<h2>项目脉络</h2>${badge('模拟','neutral')}</div><p>把进展和依据一起看。</p><div class="context-fact"><span>当前正式依据</span><button data-action="resource" data-id="${resourceBy('r-requirements')?'r-requirements':'r-project'}">${icon('file')}<strong>${isVisible('r-requirements') ? '产品需求 '+esc(taskBy('FB-05')?.resourceLinks?.find(l=>l.resourceId==='r-requirements')?.pinnedVersion || resourceBy('r-requirements')?.version || '') : '项目目标 v1'}</strong>${icon('chevron')}</button></div><div class="context-fact"><span>设计选择</span><strong>${adopted ? esc(appState.proposals.find(x=>x.status==='adopted')?.title || '已记录采用决策') : appState.proposals.length ? `${appState.proposals.length} 个候选方案`  : '暂无候选成果'}</strong></div><div class="context-fact"><span>实现证据</span><strong>${resourceBy('r-pr') ? resourceBy('r-pr').demoScenario==='feedback' ? resourceBy('r-pr').state==='merged'?'PR #42 已合并 · 验收另行确认':'PR #42 正在评审' : '已登记实现资料 · 模拟快照' : '暂无关联 PR'}</strong></div>${btn('询问当前最大阻塞','ask-blockers','context-ask','','arrow')}</section>
      <section class="recent-section">${sectionHeading('最近变化','',btn('全部','goto-activity','text-button'))}<div class="activity-mini">${appState.audit.slice(0,4).map(a=>`<div class="mini-event"><span class="event-dot"></span><div><p>${esc(a.detail || a.summary || a.message || eventLabel(a.action))}</p><small>${timeLabel(a.at || a.timestamp)} · ${esc(memberName(a.actorId || a.actor))}</small></div></div>`).join('') || '<p class="muted">项目创建后的变化会留在这里。</p>'}</div></section>
      <div class="source-strip"><button data-action="goto-connections">${icon('github')}<span>GitHub</span>${badge('模拟')}</button><button data-action="goto-connections">${icon('drive')}<span>Google Drive</span>${badge('模拟')}</button></div></aside></div>`;
}

function taskRow(t, compact = false, level = 0) {
  const child = appState.tasks.some(x=>x.parentId===t.id);
  const blockers = getTaskBlockers(appState,t.id);
  return `<button class="task-row ${compact ? 'compact' : ''} ${child ? 'parent-task' : ''}" data-action="task" data-id="${esc(t.id)}" style="--indent:${level}"><span class="task-main">${child ? icon('layers') : `<span class="status-orb ${getEffectiveStatus(appState,t)}">${t.status==='accepted' ? icon('check') : ''}</span>`}<span class="task-code">${esc(t.id)}</span><span class="task-title">${esc(t.title)}${getStale(t).length ? '<span class="stale-dot" title="关联资料待复核"></span>' : ''}</span>${blockers.length && !child ? `<span class="dependency-tag" title="${esc(blockers.map(x=>x.reason).join('；'))}">${icon('link')}${blockers.length}</span>` : ''}</span>${compact ? '' : `<span class="task-status-col">${status(t)}</span>`}<span class="task-assignee">${avatar(t.assigneeId,'tiny')}<span>${esc(memberName(t.assigneeId))}</span></span>${compact ? `<span class="task-end">${status(t)}</span>` : `<span class="task-date">${dateLabel(t.dueDate)}</span>`}</button>`;
}
function orderedTasks(tasks) {
  const out=[]; const visited=new Set();
  function add(t,level){if(visited.has(t.id))return;visited.add(t.id);out.push([t,level]);tasks.filter(c=>c.parentId===t.id).forEach(c=>add(c,level+1));}
  tasks.filter(t=>!t.parentId || !tasks.some(p=>p.id===t.parentId)).forEach(t=>add(t,0));
  return out;
}
function workView() {
  const tasks = appState.tasks.filter(t => (!ui.query || `${t.title} ${t.id} ${t.description}`.toLowerCase().includes(ui.query.toLowerCase())) && (ui.filter==='all' || (ui.filter==='mine' ? t.assigneeId===actorId : ui.filter==='blocked' ? getTaskBlockers(appState,t.id).length>0 || t.status==='blocked' : getEffectiveStatus(appState,t)===ui.filter)));
  return `${pageTitle('WORK STRUCTURE','让工作有序推进','用层级组织范围，用依赖表达先后。每项交付都有负责人和验收条件。',btn('新建任务','new-task','primary','','plus'))}<div class="view-toolbar"><div class="segmented-control">${[['all','全部工作'],['mine','我负责的'],['review','待验收'],['blocked','受阻']].map(([value,label])=>`<button class="${ui.filter===value?'selected':''}" data-action="filter" data-id="${value}">${label}</button>`).join('')}</div><label class="search-input">${icon('search')}<input id="work-query" value="${esc(ui.query)}" placeholder="查找任务…" aria-label="查找任务" /></label></div>
    <div class="task-table"><div class="task-table-header"><span>任务 / 交付内容</span><span>状态</span><span>负责人</span><span>目标日期</span></div>${appState.milestones.map((m,i)=>{const group=tasks.filter(t=>t.milestoneId===m.id); if(!group.length && (ui.filter!=='all'||ui.query))return '';return `<section class="task-group"><button class="task-group-heading" data-action="collapse" data-id="${esc(m.id)}" aria-expanded="${!ui.collapsed.has(m.id)}">${icon(ui.collapsed.has(m.id)?'chevron':'down')}<span class="group-order">0${i+1}</span><h2>${esc(m.title||m.name)}</h2><span>${group.filter(t=>!appState.tasks.some(c=>c.parentId===t.id)).length}</span><span class="group-date">${dateLabel(m.dueDate)}</span></button>${!ui.collapsed.has(m.id) ? orderedTasks(group).map(([t,l])=>taskRow(t,false,l)).join('') || `<button class="add-task-row" data-action="new-task" data-milestone="${esc(m.id)}">${icon('plus')}添加这个阶段的任务</button>` : ''}</section>`;}).join('')}${!tasks.length && (ui.query||ui.filter!=='all') ? empty('没有符合条件的工作','试试其他关键词或切换筛选。',btn('查看全部','clear-filters','secondary')) : ''}</div>
    <div class="table-note">${icon('info')}阶段和父任务用于组织，不重复计入验收进度。依赖关系在任务详情中单独呈现。</div>`;
}

function resourcesView() {
  const resources=getVisible().filter(r=>(ui.sourceFilter==='all'||r.provider===ui.sourceFilter)&&(!ui.query||r.title.toLowerCase().includes(ui.query.toLowerCase())));
  const changes=appState.tasks.flatMap(t=>getStale(t)).length;
  return `${pageTitle('PROJECT RESOURCES','资料与工作，保持关联','在原系统维护内容，在这里确认它支持什么工作、采用哪个版本。',btn('登记资料','new-resource','primary','','plus')+btn('模拟来源更新','goto-connections','secondary','','refresh'))}${changes ? `<div class="notice amber">${icon('alert')}<div><strong>${changes} 处关联依据需要复核</strong><span>来源变化不会自动替换项目已固定的版本。打开资料，查看受影响的任务。</span></div></div>` : ''}
    <div class="view-toolbar"><div class="segmented-control">${[['all','全部资料'],['drive','Google Drive'],['github','GitHub'],['workspace','项目内']].map(([id,name])=>`<button class="${ui.sourceFilter===id?'selected':''}" data-action="source-filter" data-id="${id}">${name}</button>`).join('')}</div><label class="search-input">${icon('search')}<input id="resource-query" value="${esc(ui.query)}" placeholder="搜索资料…" aria-label="搜索资料" /></label></div>
    <div class="resource-table"><div class="resource-table-head"><span>资料 / 来源</span><span>关联工作</span><span>当前源版本</span><span>最近核对</span></div>${resources.map(r=>{const linked=appState.tasks.filter(t=>t.resourceLinks?.some(l=>l.resourceId===r.id));return `<button class="resource-row" data-action="resource" data-id="${esc(r.id)}"><span class="resource-name"><span class="file-icon ${r.provider}">${icon(r.provider==='github'?'github':r.provider==='drive'?'file':'layers')}</span><span><strong>${esc(r.title)}</strong><small>${r.provider==='drive'?'Google Drive':r.provider==='github'?'GitHub':'项目工作台'} · ${r.provider!=='workspace'?'模拟来源':'工作台记录'}</small></span></span><span class="linked-tasks">${linked.slice(0,3).map(t=>`<span class="id-tag">${esc(t.id)}</span>`).join('')}${linked.length>3?`<span class="muted">+${linked.length-3}</span>`:''}${!linked.length?'<span class="muted">尚未关联</span>':''}</span><span>${badge(r.version,r.available?'neutral':'amber')}${!r.available?'<small class="availability-warning">来源不可访问</small>':''}</span><span class="resource-date">${timeLabel(r.syncedAt||r.updatedAt)}</span></button>`;}).join('') || empty('还没有可访问的资料','演示项目附有模拟资料；新建项目可先拆分任务。真实连接将在下一阶段实现。')}</div><div class="table-note">${icon('shield')}这里只呈现当前演示身份允许查看的来源。外部访问失效后，正文和 AI 引用同时停止使用。</div>`;
}

function mockDesign(variant, size = '') {
  const board = `<div class="mock-board">${[['待分诊',['导出报表增加筛选项','移动端反馈表单适配']],['处理中',['支持批量指派负责人']],['已回应',['查看历史回应记录']]].map(([title,items],i)=>`<div class="mock-column"><div class="mock-column-title"><i class="board-dot c${i}"></i>${title}<small>${items.length}</small></div>${items.map((t,j)=>`<div class="mock-board-card"><span class="mock-card-tag">${j?'体验问题':'功能建议'}</span><strong>${t}</strong><div><small>今天</small><b class="mock-user">${['林','周','陈'][i]}</b></div></div>`).join('')}</div>`).join('')}</div>`;
  const inbox = `<div class="mock-dual"><div class="mock-compact-list"><div class="chosen"><i></i><strong>导出报表增加筛选项</strong><span>功能建议 · 刚刚</span></div><div><i></i><strong>支持批量指派负责人</strong><span>流程优化 · 10 分钟前</span></div><div><i></i><strong>移动端反馈表单适配</strong><span>体验问题 · 今天</span></div><div><i></i><strong>查看历史回应记录</strong><span>功能建议 · 今天</span></div></div><div class="mock-detail"><span class="mock-tag">待分诊 · 产品建议</span><strong>导出报表增加筛选项</strong><p>希望导出时保留当前筛选条件，方便交给团队继续处理。</p><div class="mock-person-line">负责人 <b class="mock-user">林</b> 林澈</div><div class="mock-lines"><i></i><i></i><i></i></div><span class="mock-solid">确认指派</span></div></div>`;
  return `<div class="design-preview ${variant==='a'?'variant-a':'variant-b'} ${size}" aria-label="方案${variant.toUpperCase()} ${variant==='a'?'流程看板':'上下文收件箱'}界面示意"><div class="mock-chrome"><span></span><span></span><span></span><small>feedback / ${variant==='a'?'board':'inbox'}</small></div><div class="mock-layout"><div class="mock-sidebar"><span class="mock-logo">f.</span><i></i><i class="active"></i><i></i><i></i></div><div class="mock-main"><div class="mock-title"><strong>${variant==='a'?'反馈工作看板':'反馈收件箱'}</strong><span>＋ 新反馈</span></div><div class="mock-tabs"><b>全部反馈 <em>8</em></b><span>我负责的</span><span>已回应</span></div>${variant==='a'?board:inbox}</div></div></div>`;
}
function outcomesView() {
  const pending=getLeaves(appState).filter(t=>t.status==='review');
  const p=getProgress(appState);
  const proposals=appState.proposals;
  return `${pageTitle('OUTCOMES & ACCEPTANCE','让成果成为正式进展','先做有依据的选择，再确认交付是否达到要求。',btn('提交候选方案','new-proposal','primary','','plus')+btn('查看决策历史','decisions-history','secondary','','clock'))}<div class="view-toolbar"><div class="underline-tabs">${[['decisions','方案决策',appState.proposals.length],['acceptance','任务验收',pending.length],['delivery','本轮交付',p.total]].map(([id,title,n])=>`<button class="${ui.tab===id?'selected':''}" data-action="outcome-tab" data-id="${id}">${title}<span>${n}</span></button>`).join('')}</div></div>
    ${ui.tab==='decisions'?`<div class="outcome-intro"><div><span class="overline">${appState.proposals.length ? `${appState.proposals.length} 个候选成果 · 按任务比较` : '候选成果'}</span><h2>${'候选成果与正式选择'}</h2><p>${appState.proposals.length?'比较同一任务的候选成果。选择会固定到当前正式提交的版本。':'先登记成果资料，再由任务负责人提交候选方案。'}</p></div>${appState.proposals.length?btn('并排比较','compare','primary','','layers'):''}</div><div class="proposal-grid">${appState.proposals.map((proposal,i)=>`<article class="proposal-card ${proposal.status==='adopted'?'adopted':''}"><div class="proposal-head"><span class="proposal-letter">${String.fromCharCode(65+i)}</span><div><h3>${esc(proposal.title)}</h3><p>${avatar(proposal.authorId,'tiny')} ${esc(memberName(proposal.authorId))} · 提交版本 ${esc(proposal.version)}</p></div>${badge(proposal.status==='adopted'?'已采用':proposal.status==='retained'?'保留备选':'待决策',proposal.status==='adopted'?'green':'neutral')}</div><button class="preview-open" data-action="compare" data-task="${esc(proposal.taskId)}" aria-label="比较 ${esc(proposal.title)}">${proposal.id==='proposal-a'||proposal.id==='proposal-b'?mockDesign(proposal.id==='proposal-a'?'a':'b'):`<div class="submitted-preview">${icon('file')}<strong>${esc(proposal.title)}</strong><span>${esc(proposal.taskId)} · ${esc(proposal.version)} · 成果快照</span><p>${esc(proposal.summary)}</p></div>`}</button><div class="proposal-body"><p>${esc(proposal.summary)}</p><ul>${(proposal.tradeoffs||[]).map(x=>`<li>${esc(typeof x==='string'?x:x.text||JSON.stringify(x))}</li>`).join('')}</ul><div class="proposal-card-footer"><span>${icon('file')}固定版本 ${esc(proposal.version)}</span>${btn(proposal.status==='adopted'?'查看采用理由':'参与比较','compare','text-button',`data-task="${esc(proposal.taskId)}"`,'arrow')}</div></div></article>`).join('') || empty('尚无候选成果','登记成果资料后，由任务负责人正式提交候选方案。')}</div>${appState.decisions.length?`<section class="decision-log">${sectionHeading('已记录的选择','每次重新采用都会追加记录。')}${appState.decisions.slice().map(d=>`<div class="decision-record">${icon('branch')}<div><strong>${esc(d.summary || appState.proposals.find(p=>p.id===d.proposalId)?.title || '方案采用')} · ${esc(d.version || d.adoptedVersion || '')}</strong><p>${esc(d.reason)}</p><small>${esc(memberName(d.actorId||d.decidedBy||d.authorId))} · ${timeLabel(d.at||d.decidedAt||d.createdAt)}</small></div>${badge('正式决策','green')}</div>`).join('')}</section>`:''}`:ui.tab==='acceptance'?`<div class="acceptance-intro"><h2>${pending.length} 项提交等待处理</h2><p>${p.review} 项可进入验收，${pending.length-p.review} 项需先复核来源或解除依赖阻塞。只有项目负责人或交付负责人能确认通过。</p></div><div class="acceptance-list">${pending.map(t=>`<article class="acceptance-card"><div>${status(t)}<h3>${esc(t.title)}</h3><p>${esc(t.id)} · ${esc(memberName(t.assigneeId))}提交 · ${(t.criteria||[]).length} 项验收条件</p><div class="evidence-chips">${t.resourceLinks.filter(l=>isVisible(l.resourceId)).map(l=>`<button data-action="resource" data-id="${esc(l.resourceId)}">${icon('file')}${esc(resourceBy(l.resourceId).title)} ${esc(l.pinnedVersion)}</button>`).join('')}</div></div>${getEffectiveStatus(appState,t)==='review'?btn('开始验收','accept-task','primary soft',`data-id="${esc(t.id)}"`,'check'):btn('查看并复核','task','secondary',`data-id="${esc(t.id)}"`,'arrow')}</article>`).join('') || empty('当前没有待验收工作','成员提交任务或同步 PR 合并事件后，会进入这个队列。',btn('查看工作结构','goto-work','secondary'))}</div>`:`<div class="delivery-summary"><div class="delivery-icon">${icon('flag')}</div><div><span class="overline">${esc(appState.project.name)} · 本轮交付</span><h2>${p.readyToDeliver?'所有交付任务已验收':'还有 '+(p.total-p.accepted)+' 项任务需要完成验收'}</h2><p>已验收 ${p.accepted}/${p.total} 项。交付记录会保留目标、任务、采用决策和具体来源版本。</p></div>${appState.project.status==='delivered'?btn('查看交付记录','goto-activity','secondary','','clock'):btn('确认交付','deliver','primary','','check')}</div><div class="delivery-checklist">${getLeaves(appState).map(t=>`<button data-action="task" data-id="${esc(t.id)}">${status(t)}<span>${esc(t.id)} · ${esc(t.title)}</span>${avatar(t.assigneeId,'tiny')}${icon('chevron')}</button>`).join('')}</div>${appState.project.status==='delivered'?`<div class="notice green">${icon('circleCheck')}<div><strong>本轮交付已记录</strong><span>${esc(appState.deliveries?.at(-1)?.note||'完整交付记录已留存。')} · ${esc(memberName(appState.deliveries?.at(-1)?.actorId))} · ${timeLabel(appState.deliveries?.at(-1)?.at)}</span><span>${esc(p.deliveryHealth?.label||'')}</span></div></div>`:''}`}`;
}

function activityView() {
  const events=appState.audit.slice();
  return `${pageTitle('PROJECT HISTORY','每次推进，都有来由','保留人、AI 和来源同步留下的变化。正式决策与历史验收不会被覆盖。',btn('导出演示记录','export','secondary','','download'))}<div class="history-summary"><span>${icon('clock')} ${events.length} 条项目事件</span><span>${icon('branch')} ${appState.decisions.length} 次采用决策</span><span>${icon('circleCheck')} ${appState.acceptances.length} 条验收记录</span></div><div class="timeline">${events.map(a=>`<article class="timeline-item"><div class="timeline-axis">${avatar(a.actorId||a.actor,'tiny')}</div><div class="timeline-content"><div class="timeline-heading"><strong>${esc(a.summary||a.message||eventLabel(a.action))}</strong><time>${timeLabel(a.at||a.timestamp)}</time></div><p>${esc(a.detail||a.note||a.reason||'')}</p><div class="timeline-meta"><span>${esc(memberName(a.actorId||a.actor))}</span>${a.onBehalfOf?`<span>由 ${esc(memberName(a.onBehalfOf))} 授权</span>`:''}${badge(eventLabel(a.type||a.action))} ${(a.taskId||a.targetId)&&taskBy(a.taskId||a.targetId)?btn(esc(a.taskId||a.targetId),'task','text-button',`data-id="${esc(a.taskId||a.targetId)}"`,'arrow'):''}</div></div></article>`).join('')||empty('项目历史从这里开始','创建任务、关联资料和完成验收后，变化会自动记录。')}</div>`;
}

function teamView() {
  return `${pageTitle('PEOPLE & PERMISSIONS','明确责任，也明确边界','切换演示身份可以验证不同角色的可读范围与操作权限。')}<div class="notice neutral">${icon('info')}<div><strong>演示权限，不是生产登录</strong><span>角色由本地切换，命令层实际检查操作；全部数据均为虚构。真实产品必须在服务端验证身份、项目权限和来源权限。</span></div></div><section>${sectionHeading('项目成员','5 位执行成员，1 位观察者。')}<div class="member-table"><div class="member-table-head"><span>成员</span><span>项目责任</span><span>可执行操作</span><span>演示身份</span></div>${appState.members.map(m=>`<div class="member-row"><span class="member-person">${avatar(m.id)}<strong>${esc(m.name)}</strong>${m.id===actorId?badge('当前','purple'):''}</span><span>${esc(roleNames[m.id]||m.role)}</span><span class="member-capabilities">${m.id==='owner'?'管理任务、采用方案、验收与交付':m.id==='qa'?'推进负责的任务、核对验收':m.id==='viewer'?'读取获准的项目内容':'推进负责的任务、提交成果'}</span>${btn('切换','switch-actor','secondary small',`data-id="${esc(m.id)}"`)}</div>`).join('')}</div></section><section class="agents-section">${sectionHeading('AI 协作角色','身份独立，操作代表委托人；能力范围不能超过委托人的权限。')}<div class="agent-grid"><article><div class="agent-mark">${icon('spark')}</div><div><h3>观察助手</h3><p>汇总可访问的任务、资料与实现证据，标注事实、推断和建议。</p><span class="permission-pill">${icon('lock')}只读 · 不执行变更</span></div>${btn('查看上下文','ai-observer','text-button','','arrow')}</article><article><div class="agent-mark purple">${icon('tree')}</div><div><h3>规划助手</h3><p>根据需求生成带来源的任务草案。获得批准后，由命令层复核并写入。</p><span class="permission-pill">${icon('shield')}起草 · 人工批准</span></div>${btn('查看任务草案','ai-plan','text-button','','arrow')}</article></div></section><section class="permission-matrix">${sectionHeading('权限如何生效','项目角色与来源授权共同决定访问范围。')}<div class="permission-equation"><span>项目权限</span><b>∩</b><span>来源实时权限</span><b>∩</b><span>连接范围</span><b>∩</b><span>AI 工具授权</span></div><p>“试点预算”只对项目负责人可见，两个 AI 角色都不读取。来源失效后，已缓存的正文也不再进入新的回答。原型中的校验可通过测试复现；浏览器本身不是安全存储边界。</p>${btn('尝试受限操作','test-permission','secondary','','shield')}</section>`;
}

function connectionsView() {
  const req=resourceBy('r-requirements'), pr=resourceBy('r-pr');
  return `${pageTitle('CONNECTED SOURCES','保留来源，连接工作','外部系统维护原始内容；工作台维护任务、依赖、决策和验收。')}<div class="notice purple">${icon('info')}<div><strong>本页所有同步均为模拟</strong><span>不会访问你的 GitHub 仓库或网盘，不会发送文件、创建 Issue 或修改 PR。点击按钮会改变当前示例项目的真实本地状态。</span></div></div><div class="connection-list"><article class="connection-card"><div class="connection-header"><span class="connection-logo">${icon('github')}</span><div><h2>GitHub</h2><p>代码、Issue、Pull Request 与提交状态</p></div>${badge('模拟连接','purple')}</div><div class="connection-detail"><span>演示来源</span><strong>product-team / feedback-workbench</strong><span>当前关联</span><strong>${pr?.demoScenario==='feedback'?'PR #42 · 反馈与回应 API':'未载入内置 PR 示例'}</strong><span>事实归属</span><strong>PR 状态来自 GitHub · 验收结论属于工作台</strong></div><div class="sync-event"><div>${icon('branch')}<div><strong>模拟 PR #42 已合并</strong><p>将后端任务推进为待验收，保留代码版本证据。</p></div></div>${btn('同步合并事件','sync-github','secondary',pr?.demoScenario==='feedback'?'':'disabled','refresh')}</div></article><article class="connection-card"><div class="connection-header"><span class="connection-logo drive">${icon('drive')}</span><div><h2>Google Drive</h2><p>需求、设计稿与验收资料</p></div>${badge('模拟连接','purple')}</div><div class="connection-detail"><span>演示来源</span><strong>客户反馈闭环 / 项目资料</strong><span>需求源版本</span><strong>${req?esc(req.version):'尚未关联'}</strong><span>版本规则</span><strong>外部新版本不替换项目已采用的依据</strong></div><div class="sync-event"><div>${icon('file')}<div><strong>模拟需求更新至 v3</strong><p>新增响应时限要求，相关任务提示重新核对。</p></div></div>${btn('同步文档更新','sync-drive','secondary',req?.demoScenario==='feedback'?'':'disabled','refresh')}</div><div class="sync-event"><div>${icon('shield')}<div><strong>模拟来源${req?.available?'访问失效':'恢复访问'}</strong><p>失效时停止正文读取与 AI 引用，保留关系占位。</p></div></div>${btn(req?.available?'模拟失去授权':'恢复来源','source-access','secondary',req?.demoScenario==='feedback'?'':'disabled',req?.available?'lock':'refresh')}</div></article></div><div class="connection-footer"><h3>真实接入的下一步</h3><p>GitHub App 限定仓库读取；Google Picker 明确选取资料。同步在服务端校验权限、去重、核对最新状态，并处理撤权。第一阶段不申请自动合并代码或全盘读取。</p></div>`;
}

function taskPanel() {
  const t=taskBy(ui.taskId); if(!t)return '';
  const blockers=getTaskBlockers(appState,t.id);
  const children=appState.tasks.filter(x=>x.parentId===t.id);
  const linked=t.resourceLinks || [];
  return `<div class="panel-top"><span>${icon('tree')} ${esc(t.id)} <span class="muted">/ 工作详情</span></span><button class="icon-button" data-action="close-panel" aria-label="关闭任务详情">${icon('x')}</button></div><div class="panel-scroll"><div class="task-detail-heading"><div>${status(t)}${t.priority==='high'?badge('优先处理','amber'):''}</div><h2>${esc(t.title)}</h2></div><div class="detail-properties"><label><span>负责人</span><div>${avatar(t.assigneeId,'tiny')}<select id="task-assignee" data-task="${esc(t.id)}" aria-label="任务负责人" ${can(appState,actorId,'assign')?'':'disabled'}>${memberOptions(t.assigneeId)}</select></div></label><label><span>任务状态</span><select id="task-status" data-task="${esc(t.id)}" aria-label="任务状态">${Object.entries(statuses).map(([id,[name]])=>`<option value="${id}" ${t.status===id?'selected':''} ${['review','accepted'].includes(id)?'disabled':''}>${name}</option>`).join('')}</select></label><div><span>目标日期</span><strong>${dateLabel(t.dueDate)}</strong></div><div><span>所属阶段</span><strong>${esc(appState.milestones.find(m=>m.id===t.milestoneId)?.title||'')}</strong></div></div><section class="detail-section"><h3>工作要求</h3><p>${esc(t.description)}</p>${btn('编辑任务','edit-task','text-button',`data-id="${esc(t.id)}"`)}</section>${t.reviewReason?`<div class="notice amber task-review-reason">${icon('alert')}<div><strong>验收依据需要重新确认</strong><span>${esc(t.reviewReason)}</span></div></div>`:''}${blockers.length?`<div class="dependency-notice">${icon('link')}<div><strong>继续推进前需要确认</strong>${blockers.map(b=>`<p>${b.taskId&&taskBy(b.taskId)?`<button class="text-link" data-action="task" data-id="${esc(b.taskId)}">${esc(b.taskId)} ${esc(b.title)}</button> · `:''}${esc(b.reason)}</p>`).join('')}</div></div>`:''}${children.length?`<section class="detail-section"><h3>下属工作</h3>${children.map(c=>`<button class="related-task" data-action="task" data-id="${esc(c.id)}">${status(c)}<span>${esc(c.title)}</span>${icon('chevron')}</button>`).join('')}</section>`:''}<section class="detail-section"><div class="section-heading"><h3>关联上下文 <span class="subcount">${linked.length}</span></h3>${btn('关联资料','link-resource','text-button',`data-id="${esc(t.id)}"`,'plus')}</div><div class="context-links">${linked.map(l=>{const r=resourceBy(l.resourceId);if(!r)return '';const allowed=isVisible(r.id);return `<div class="context-link"><button data-action="resource" data-id="${esc(r.id)}">${icon(allowed?r.provider==='github'?'github':'file':'lock')}<span><strong>${allowed?esc(r.title):'受限资料'}</strong><small>${allowed?`已固定 ${esc(l.pinnedVersion)} · 当前 ${esc(r.version)}`:'当前身份无权读取'}</small></span>${icon('chevron')}</button>${allowed && (l.pinnedVersion!==r.version || !r.available)?`<div class="context-update">${icon('alert')}<span>${r.available?'新版本待复核':'来源不可访问'}</span>${r.available?btn('复核依据','review-source','text-button',`data-resource="${esc(r.id)}" data-task="${esc(t.id)}"`):''}</div>`:''}</div>`;}).join('')||'<p class="muted">关联需求、设计稿或实现证据，让协作者有据可依。</p>'}</div></section><section class="detail-section"><h3>验收条件</h3><div class="criteria-list">${(t.criteria||[]).map(c=>`<div>${icon(t.status==='accepted'?'circleCheck':'check')}<span>${esc(c.text)}</span></div>`).join('')||'<p class="muted">暂无验收条件，请先编辑任务。</p>'}</div></section>${appState.proposals.some(p=>p.taskId===t.id)?`<div class="inline-design-cta"><div><strong>此项工作已有候选成果</strong><p>采用会留下具体版本与理由，之后仍需验收。</p></div>${btn('比较方案','compare','secondary',`data-task="${esc(t.id)}"`,'layers')}</div>`:''}<section class="detail-section">${btn('提交候选方案','new-proposal','secondary',`data-task="${esc(t.id)}"`,'plus')}</section><section class="detail-section"><h3>依赖与后续影响</h3>${t.dependencies?.length? t.dependencies.map(d=>`<button class="related-task" data-action="task" data-id="${esc(d.taskId)}">${icon('link')}<span>${esc(d.taskId)} ${esc(taskBy(d.taskId)?.title||'')}<small>等待${d.gate==='adopted'?'方案采用':'验收通过'}</small></span>${icon('chevron')}</button>`).join(''):'<p class="muted">没有前置任务。</p>'}${appState.tasks.filter(x=>x.dependencies?.some(d=>d.taskId===t.id)).map(x=>`<button class="related-task" data-action="task" data-id="${esc(x.id)}">${icon('arrow')}<span>影响 ${esc(x.id)} ${esc(x.title)}</span>${icon('chevron')}</button>`).join('')}</section></div><div class="panel-footer">${btn('询问这项工作','task-ai','secondary','','spark')}${!children.length?(t.status==='review'?btn('开始验收','accept-task','primary',`data-id="${esc(t.id)}"`,'check'):t.status==='accepted'?badge('本项已通过验收','green'):btn('提交验收','submit-task','primary',`data-id="${esc(t.id)}"`,'arrow')):''}</div>`;
}

function resourcePanel() {
  const r=getVisible().find(item=>item.id===ui.resourceId); if(!r)return `<div class="panel-top"><span>访问范围已变化</span><button class="icon-button" data-action="close-panel" aria-label="关闭资料">${icon('x')}</button></div>${empty('无法读取这项资料','当前身份没有来源授权。')}`;
  const history=r.history||[];
  const selected=ui.selectedVersion||r.version;
  const old=history.find(h=>h.version===selected);
  const content=selected===r.version?r.content:old?.content;
  const linked=appState.tasks.filter(t=>t.resourceLinks?.some(l=>l.resourceId===r.id));
  const versions=[...new Set([r.version,...history.map(x=>x.version)])];
  return `<div class="panel-top"><span>${icon(r.provider==='github'?'github':'file')} 来源快照 ${badge('模拟')}</span><button class="icon-button" data-action="close-panel" aria-label="关闭资料">${icon('x')}</button></div><div class="panel-scroll"><div class="resource-detail-title"><span class="file-icon ${r.provider}">${icon(r.provider==='github'?'github':'file')}</span><h2>${esc(r.title)}</h2><p>${r.provider==='drive'?'Google Drive':r.provider==='github'?'GitHub':'项目工作台'} · 核对于 ${timeLabel(r.syncedAt||r.updatedAt)}</p></div><div class="resource-version-bar"><label>查看快照 <select id="resource-version" aria-label="资料版本">${versions.map(v=>`<option value="${esc(v)}" ${selected===v?'selected':''}>${esc(v)} ${v===r.version?'· 当前源版本':'· 历史版本'}</option>`).join('')}</select></label>${badge(r.available?'可读取':'来源不可访问',r.available?'green':'amber')}</div>${!r.available?`<div class="notice amber">${icon('lock')}<div><strong>当前无法确认来源权限</strong><span>正文和历史缓存已停止展示，AI 也不再引用。可以在来源连接中模拟恢复。</span></div></div>`:`<article class="source-content">${String(content||'这个版本没有保留正文。').split('\n').map(line=>line.startsWith('#')?`<h3>${esc(line.replace(/^#+\s*/,''))}</h3>`:`<p>${esc(line)}</p>`).join('')}</article>`}<section class="detail-section"><h3>用于哪些工作</h3>${linked.map(t=>{const l=t.resourceLinks.find(x=>x.resourceId===r.id);return `<div class="resource-usage"><button class="related-task" data-action="task" data-id="${esc(t.id)}"><span><strong>${esc(t.id)} ${esc(t.title)}</strong><small>本项采用 ${esc(l.pinnedVersion)}</small></span>${icon('chevron')}</button>${l.pinnedVersion!==r.version&&r.available?btn('查看并复核新版本','review-source','text-button',`data-task="${esc(t.id)}" data-resource="${esc(r.id)}"`):''}</div>`;}).join('')||'<p class="muted">暂无关联任务。</p>'}</section><p class="source-boundary">这里展示的是演示来源的本地快照，不是对真实 GitHub 或 Google Drive 的读取。真实版只对获准资料建立索引。</p></div>`;
}

function aiPanel() {
  const resources=getAgentVisible();
  const answer=ui.answer;
  return `<div class="panel-top"><span>${icon('spark')} 项目助手</span><button class="icon-button" data-action="close-panel" aria-label="关闭项目助手">${icon('x')}</button></div><div class="ai-identity"><span class="agent-mark">${icon('spark')}</span><div><select id="agent-select" aria-label="选择 AI 角色"><option value="observer" ${ui.agentId==='observer'?'selected':''}>观察助手 · 只读</option><option value="planner" ${ui.agentId==='planner'?'selected':''}>规划助手 · 起草</option></select><small>代表 ${esc(memberName(actorId))} · ${resources.filter(r=>r.available).length} 份可用来源</small></div>${badge('规则模拟','purple')}</div><div class="panel-scroll ai-scroll"><div class="ai-scope"><span>${icon('shield')}当前项目与获准资料</span><p>回答按当前状态生成，标注来源版本。未连接大模型；不会向外部发送数据。</p></div>${ui.taskId&&taskBy(ui.taskId)?`<button class="ai-task-context" data-action="task" data-id="${esc(ui.taskId)}">${icon('link')}上下文：${esc(ui.taskId)} ${esc(taskBy(ui.taskId).title)}</button>`:''}${!answer&&!ui.plan?`<div class="ai-welcome"><div class="ai-orbit">${icon('spark')}</div><h2>理解项目，然后推动它。</h2><p>从任务、资料和已记录的决定中，找到有依据的下一步。</p><div class="suggestion-list"><button data-action="ask-blockers">目前最大的阻塞是什么？${icon('arrow')}</button><button data-action="ask-progress">哪些工作完成了，哪些还没验收？${icon('arrow')}</button><button data-action="ai-plan">根据需求，拆分补充开发任务${icon('arrow')}</button></div></div>`:''}${answer?`<div class="chat-question">${esc(ui.aiQuery)}</div><article class="ai-answer"><div class="ai-answer-header">${icon('spark')}<strong>基于当前可访问的项目状态</strong></div>${answer.statements?.length?answer.statements.map((s,i)=>`<div class="ai-statement"><span class="statement-kind ${s.kind}">${{observed:'已知事实',fact:'已知事实',inference:'推断',recommendation:'建议'}[s.kind]||'项目判断'}</span><p>${esc(s.text)}</p><div class="citation-row">${(s.workspaceRefs||[]).map(ref=>`<button class="citation" data-action="workspace-ref" data-type="${esc(ref.type)}" data-id="${esc(ref.id)}">${icon(ref.type==='task'?'tree':'branch')}${esc(ref.label)}</button>`).join('')}${(s.citations||[]).map(c=>`<button class="citation" data-action="citation" data-resource="${esc(c.resourceId)}" data-version="${esc(c.version)}" aria-label="查看来源 ${esc(c.label)}">${icon('file')}${esc(c.label||c.resourceId)} <b>${esc(c.version)}</b></button>`).join('')}</div></div>`).join(''):`<p>${esc(answer.text)}</p>`}<div class="answer-coverage">${icon('info')}回答依据 ${answer.coverage?.accessible??resources.length} 份可访问来源 · ${timeLabel(answer.asOf)}${answer.coverage?.unavailable?`<br>${answer.coverage.unavailable} 份来源当前不可访问。`:''}${answer.coverage?.restricted?'<br>部分关联资料不在当前访问范围内。':''}</div></article>`:''}${ui.plan?`<div class="plan-card"><div class="plan-heading">${icon('tree')}<h3>任务变更草案</h3>${badge('尚未执行','amber')}</div><p>根据需求资料起草。请核对负责人、范围与验收条件，再批准具体变更。</p>${ui.plan.tasks?.length?ui.plan.tasks.map((t,i)=>`<div class="plan-task"><span>0${i+1}</span><div><strong>${esc(t.title)}</strong><p>${esc(t.description)}</p><small>${esc(memberName(t.assigneeId))} · ${esc(appState.milestones.find(m=>m.id===t.milestoneId)?.title||'设计与实现')} · ${dateLabel(t.dueDate)}</small><details class="plan-full-change" open><summary>完整拟写入内容</summary><strong>验收条件</strong><ul>${(t.criteria||[]).map(c=>`<li>${esc(typeof c==='string'?c:c.text)}</li>`).join('')}</ul><p>前置依赖：${(t.dependencies||[]).map(d=>esc(d.taskId)).join('、')||'无新增依赖'}<br>上级工作：${t.parentId?esc(t.parentId):'直接归属里程碑'}</p></details></div></div>`).join(''):`<p class="muted">${esc(ui.plan.error?.message||ui.plan.error||'缺少获准需求资料，暂时无法生成任务草案。')}</p>`}<div class="plan-source">${icon('link')}版本依据：${(ui.plan.sourceVersions||[]).map(ref=>`${esc(isVisible(ref.resourceId)?resourceBy(ref.resourceId)?.title||ref.resourceId:'获准资料')} ${esc(ref.version)}`).join(' · ')||'无'}</div><div class="plan-footer">${btn('放弃草案','discard-plan','secondary')}${btn('批准并创建任务','apply-plan','primary',ui.plan.tasks?.length?'':'disabled','check')}</div><small>批准后会重新校验来源版本与权限，保留 AI 身份和授权人记录。</small></div>`:''}</div><form class="ai-composer" id="ai-form"><label class="sr-only" for="ai-input">询问项目助手</label><textarea id="ai-input" name="query" rows="2" placeholder="询问项目进展、阻塞，或起草任务…" required></textarea><div><small>${icon('shield')}来源可追溯 · 写入需审核</small><button type="submit" class="send-button" aria-label="发送项目问题">${icon('arrow')}</button></div></form>`;
}

function modalShell(title, subtitle, content, cls = '') {
  return `<div class="modal-backdrop" data-action="backdrop"><section class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><div><h2 id="modal-title">${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div><button class="icon-button" data-action="close-modal" aria-label="关闭对话框">${icon('x')}</button></div>${content}</section></div>`;
}
function taskForm(edit = false) {
  const t=edit?taskBy(ui.taskId):null;
  return modalShell(edit?'编辑工作任务':'新建工作任务','让负责人知道做什么、依据什么，以及怎样才算完成。',`<form id="task-form" class="form-body"><label>任务名称<input name="title" id="task-title-input" required maxlength="100" placeholder="例如：实现反馈状态筛选" value="${esc(t?.title||'')}" /></label><label>工作要求<textarea name="description" rows="3" required placeholder="说明使用场景、范围和交付要求…">${esc(t?.description||'')}</textarea></label><div class="form-grid"><label>负责人<select name="assigneeId" ${edit&&!can(appState,actorId,'assign')?'disabled':''}>${memberOptions(t?.assigneeId||actorId)}</select></label><label>所属里程碑<select name="milestoneId" ${edit?'disabled':''}>${appState.milestones.map(m=>`<option value="${esc(m.id)}" ${(t?.milestoneId||ui.newMilestone||'m2')===m.id?'selected':''}>${esc(m.title||m.name)}</option>`).join('')}</select></label></div><div class="form-grid"><label>上级工作<select name="parentId"><option value="">直接属于里程碑</option>${appState.tasks.filter(x=>x.id!==t?.id).map(x=>`<option value="${esc(x.id)}" ${t?.parentId===x.id?'selected':''}>${esc(x.id)} ${esc(x.title)}</option>`).join('')}</select></label><label>目标日期<input type="date" name="dueDate" value="${esc(t?.dueDate||appState.project.dueDate?.slice(0,10)||'2026-11-06')}" /></label></div>${edit?'':`<label>前置依赖<select name="dependency"><option value="">没有前置依赖</option>${getLeaves(appState).map(x=>`<option value="${esc(x.id)}">等待 ${esc(x.id)} ${esc(x.title)} 验收</option>`).join('')}</select></label><label>关联资料<select name="resourceId"><option value="">稍后关联</option>${getVisible().filter(r=>r.available).map(r=>`<option value="${esc(r.id)}">${esc(r.title)} · ${esc(r.version)}</option>`).join('')}</select></label><label>验收条件 <span class="muted">每行一项</span><textarea name="criteria" rows="2" required placeholder="有明确负责人且可保存\n权限不足时禁止修改"></textarea></label>`}<div class="form-footer"><span>${icon('shield')}仅修改当前演示项目</span>${btn('取消','close-modal','secondary')}<button class="button primary" type="submit">${icon('plus')}${edit?'保存修改':'创建任务'}</button></div></form>`);
}
function compareModal() {
  const proposals=appState.proposals.filter(p=>p.taskId===(ui.compareTaskId||appState.proposals[0]?.taskId));
  return modalShell('选择本轮采用的交互方案',`${esc(proposals[0]?.taskId||'')} · 采用一个确定版本，保留另一条思路。之后仍需完成任务验收。`,`<div class="compare-body"><div class="comparison-grid">${proposals.map((p,i)=>`<article><div class="compare-title"><span class="proposal-letter">${String.fromCharCode(65+i)}</span><div><h3>${esc(p.title)}</h3><p>${esc(memberName(p.authorId))} · ${esc(p.version)}</p></div>${p.status==='adopted'?badge('当前采用','green'):''}</div>${p.id==='proposal-a'||p.id==='proposal-b'?mockDesign(p.id==='proposal-a'?'a':'b','large'):`<div class="submitted-preview">${icon('file')}<strong>${esc(p.title)}</strong><span>${esc(p.version)} · 正式提交快照</span><p>${esc(p.summary)}</p></div>`}<p class="compare-summary">${esc(p.summary)}</p><ul>${p.tradeoffs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></article>`).join('')}</div><div class="comparison-criteria"><div><strong>评审焦点</strong><span>首次分诊速度</span><span>窄屏适配</span><span>后续扩展</span></div><p>候选成果保留各自的来源与版本。当前选择用于确定实现依据，不代表已经验证真实用户效果。</p></div><form id="adopt-form"><div class="form-grid"><label>采用方案<select name="proposalId">${proposals.map(p=>`<option value="${esc(p.id)}" ${p.id==='proposal-b'?'selected':''}>${esc(p.title)} · ${esc(p.version)}</option>`).join('')}</select></label><label>采用理由<input name="reason" required minlength="4" placeholder="例如：列表聚焦分诊，窄屏更容易操作" /></label></div><div class="form-footer"><span>${icon('branch')}未采用方案会保留；本次选择追加为正式决策。</span>${btn('返回','close-modal','secondary')}<button type="submit" class="button primary">${icon('check')}确认采用这个版本</button></div></form></div>`,'wide-modal');
}
function acceptanceModal(mode) {
  const t=taskBy(ui.taskId);if(!t)return '';
  const evidence=(t.resourceLinks||[]).filter(l=>isVisible(l.resourceId)&&resourceBy(l.resourceId)?.available);
  return modalShell(mode==='accept'?'验收任务成果':'提交任务验收',`${esc(t.id)} · ${esc(t.title)}`,`<form id="acceptance-form" class="form-body" data-mode="${mode}"><div class="notice ${mode==='accept'?'purple':'neutral'}">${icon(mode==='accept'?'shield':'file')}<div><strong>${mode==='accept'?'核对条件与证据，再确认通过':'提交不会直接计入已验收进度'}</strong><span>${mode==='accept'?'本次验收绑定当前任务版本与资料依据。':'提交后由负责人或测试 / 交付负责人检查。'}</span></div></div>${mode==='accept'?`<fieldset class="acceptance-criteria"><legend>逐项确认验收条件</legend>${t.criteria.map(c=>`<label><input type="checkbox" name="criteria" value="${esc(c.id)}" required /><span>${esc(c.text)}</span></label>`).join('')}</fieldset>`:''}<fieldset class="evidence-selection"><legend>提交的依据与证据</legend>${evidence.map(l=>`<label><input type="checkbox" name="evidence" value="${esc(l.resourceId)}" checked /><span>${esc(resourceBy(l.resourceId).title)} <small>${esc(l.pinnedVersion)}</small></span></label>`).join('')||'<p class="muted">尚无可访问证据。请先在任务详情中关联资料。</p>'}</fieldset><label>${mode==='accept'?'验收结论':'提交说明'}<textarea name="note" rows="3" required minlength="4" placeholder="说明已验证的内容、使用的证据与剩余限制…"></textarea></label><div class="form-footer"><span>${icon('clock')}操作者与当前版本会留在历史中</span>${btn('取消','close-modal','secondary')}<button type="submit" class="button primary">${icon('check')}${mode==='accept'?'确认验收通过':'提交验收'}</button></div></form>`);
}
function renderModal() {
  if(!ui.modal)return '';
  if(ui.modal==='resource')return modalShell('登记项目资料','为本地演示登记来源快照。原型不会读取你填写的真实账号或外部文件。',`<form id="resource-form" class="form-body"><label>资料名称<input name="title" required maxlength="100" placeholder="例如：反馈分诊交互稿 · 方案 C" /></label><div class="form-grid"><label>来源系统<select name="provider"><option value="drive">Google Drive · 模拟快照</option><option value="github">GitHub · 参考快照</option><option value="workspace">项目内资料</option></select></label><label>资料用途<select name="kind"><option value="requirement">需求依据</option><option value="design">设计成果</option><option value="acceptance">验收证据</option><option value="document">参考资料</option></select></label></div><label>来源版本<input name="version" required value="v1" maxlength="30" /></label><label>快照内容<textarea name="content" rows="5" required minlength="6" placeholder="填写可供团队阅读和引用的示例内容；请勿录入真实敏感数据。"></textarea></label><p class="muted">登记后可从任务关联这份资料。手工快照不触发内置同步脚本。GitHub 参考快照不代表真实 PR 状态，也不作为代码已合并的证明。</p><div class="form-footer">${btn('取消','close-modal','secondary')}<button class="button primary" type="submit">${icon('plus')}登记资料快照</button></div></form>`);
  if(ui.modal==='proposal')return modalShell('提交候选方案','任务负责人可以提出多个方案，每次正式提交都固定具体资料版本。',`<form id="proposal-form" class="form-body"><label>所属任务<select name="taskId" required>${getLeaves(appState).filter(t=>can(appState,actorId,'submitTask',t.id)).map(t=>`<option value="${esc(t.id)}" ${t.id===ui.taskId?'selected':''}>${esc(t.id)} ${esc(t.title)}</option>`).join('')}</select></label><label>方案名称<input name="title" required maxlength="100" placeholder="例如：方案 C · 聚焦分诊" /></label><label>提交的成果版本<select name="resourceId" required>${getVisible().filter(r=>r.available).map(r=>`<option value="${esc(r.id)}" ${r.kind==='design'?'selected':''}>${esc(r.title)} · ${esc(r.version)}</option>`).join('')}</select></label><label>方案说明<textarea name="summary" rows="3" required minlength="6" placeholder="这套方案解决什么，如何完成核心操作？"></textarea></label><label>关键取舍 <span class="muted">每行一条</span><textarea name="tradeoffs" rows="2" required placeholder="更容易连续处理反馈\n阶段全貌需要切换筛选"></textarea></label><div class="form-footer"><span>${icon('file')}提交不会自动采用或验收</span>${btn('取消','close-modal','secondary')}<button class="button primary" type="submit">${icon('arrow')}正式提交候选方案</button></div></form>`);
  if(ui.modal==='task')return taskForm(false);
  if(ui.modal==='edit-task')return taskForm(true);
  if(ui.modal==='compare')return compareModal();
  if(ui.modal==='accept'||ui.modal==='submit')return acceptanceModal(ui.modal);
  if(ui.modal==='link') { const t=taskBy(ui.taskId); return modalShell('关联工作资料','引用现有来源，不复制另一份难以维护的文件。',`<form id="link-form" class="form-body"><label>选择资料<select name="resourceId" required>${getVisible().filter(r=>r.available&&!t.resourceLinks.some(l=>l.resourceId===r.id)).map(r=>`<option value="${esc(r.id)}">${esc(r.title)} · ${esc(r.version)}</option>`).join('')}</select></label><p class="muted">关联时固定当前版本。后续来源更新，会在任务中提示复核。</p><div class="form-footer">${btn('取消','close-modal','secondary')}<button class="button primary" type="submit">${icon('link')}关联到 ${esc(t.id)}</button></div></form>`); }
  if(ui.modal==='review-source') {const r=resourceBy(ui.reviewResourceId),t=taskBy(ui.taskId),link=t.resourceLinks.find(x=>x.resourceId===r.id);return modalShell('复核资料更新',`${esc(t.id)} · ${esc(r.title)}`,`<form id="review-source-form" class="form-body"><div class="version-change"><span>任务当前依据<strong>${esc(link.pinnedVersion)}</strong></span>${icon('arrow')}<span>拟采用新依据<strong>${esc(r.version)}</strong></span></div><article class="source-content compact-source"><h3>新版本内容</h3>${r.content.split('\n').map(l=>`<p>${esc(l)}</p>`).join('')}</article><label>复核说明<textarea name="note" required minlength="4" placeholder="这次变化如何影响任务范围与验收？"></textarea></label><p class="muted">只更新这项任务的资料依据，历史采用决策与其他任务不会被替换。</p><div class="form-footer">${btn('暂不采用','close-modal','secondary')}<button class="button primary" type="submit">${icon('check')}确认采用 ${esc(r.version)}</button></div></form>`);}
  if(ui.modal==='project')return modalShell('创建项目','先明确这轮要交付什么，再组织工作。当前项目会保留，可随时切换。',`<form id="project-form" class="form-body"><label>起点<select name="template"><option value="blank">空白项目 · 手动登记资料与提交方案</option><option value="feedback">客户反馈闭环模板 · 含预置任务、资料和两套方案</option></select></label><label>项目名称<input name="name" required maxlength="60" placeholder="例如：客户反馈闭环 v1.1" /></label><label>这次希望达成什么？<textarea name="goal" rows="3" required minlength="6" placeholder="用具体的使用场景和结果描述目标，不必先列出所有功能。"></textarea></label><label>目标交付日期<input type="date" name="dueDate" required value="2026-11-13" /></label><div class="notice neutral">${icon('layers')}<div><span>将创建需求对齐、设计与实现、验收与交付三个初始阶段，沿用当前演示团队。空白项目仅保留目标资料；示例模板会复制标记为模拟的任务、来源与候选方案。</span></div></div><div class="form-footer">${btn('取消','close-modal','secondary')}<button type="submit" class="button primary">${icon('plus')}创建项目</button></div></form>`);
  if(ui.modal==='deliver')return modalShell('确认本轮项目交付','全部叶子任务通过验收且依据有效后，才能确认交付。',`<form id="deliver-form" class="form-body"><div class="delivery-modal-progress"><strong>${getProgress(appState).accepted} / ${getProgress(appState).total}</strong><span>项交付任务已验收</span></div><label>交付说明<textarea name="note" required minlength="4" placeholder="写明交付范围、验收结果和已知限制…"></textarea></label><div class="form-footer">${btn('返回检查','close-modal','secondary')}<button type="submit" class="button primary">${icon('flag')}确认交付并留存记录</button></div></form>`);
  if(ui.modal==='reset')return modalShell('恢复示例初始状态','只重置当前浏览器里的“客户反馈闭环”示例，不影响其他新建项目。',`<div class="form-body"><p>你在该示例中的任务、采用决策和验收操作将被替换。可以先导出演示记录留存。</p><div class="form-footer">${btn('取消','close-modal','secondary')}${btn('导出当前记录','export','secondary','','download')}${btn('恢复示例','confirm-reset','primary','','refresh')}</div></div>`);
  if(ui.modal==='search')return modalShell('搜索当前项目','查找任务、来源或具体工作内容。',`<div class="form-body"><label class="search-input global-search">${icon('search')}<input id="global-query" value="${esc(ui.query)}" placeholder="搜索任务名称、编号或资料…" aria-label="搜索项目内容" /></label><div class="search-results">${appState.tasks.filter(t=>`${t.id} ${t.title} ${t.description}`.toLowerCase().includes(ui.query.toLowerCase())).slice(0,8).map(t=>`<button data-action="task" data-id="${esc(t.id)}">${icon('tree')}<span><strong>${esc(t.title)}</strong><small>${esc(t.id)} · ${esc(memberName(t.assigneeId))}</small></span>${icon('arrow')}</button>`).join('')}${getVisible().filter(r=>r.title.toLowerCase().includes(ui.query.toLowerCase())).slice(0,4).map(r=>`<button data-action="search-resource" data-id="${esc(r.id)}">${icon('file')}<span><strong>${esc(r.title)}</strong><small>${r.provider} · ${esc(r.version)}</small></span>${icon('arrow')}</button>`).join('')}</div></div>`);
  return modalShell('关于这个原型','Project Collaboration Workspace · R1',`<div class="form-body about-copy"><h3>为跨角色交付判断设计</h3><p>用同一个项目连接目标、任务、资料版本、候选方案、采用理由和验收结果。每个操作都改变共享状态，并记录在项目历史中。</p><h3>本轮真实实现</h3><p>任务创建 / 指派 / 依赖、资料关联、方案比较与采用、验收与交付、权限策略检查、浏览器保存、引用导航和 AI 草案审批。</p><h3>明确的模拟边界</h3><p>所有团队成员、内容、PR 和资料均为虚构；GitHub / Drive 事件在本地模拟；AI 回答使用确定性规则。没有真实账号连接、多人实时服务或生产授权隔离。</p><p>原型不读取你的文件或账号、不调用外部模型。可从“来源连接”复现版本更新、失去授权和重复同步。</p><div class="form-footer">${btn('恢复演示状态','reset','secondary','','refresh')}${btn('开始体验','close-modal','primary','','arrow')}</div></div>`);
}

function guide() {
  return `<div class="guide-overlay"><div class="guide-title"><div>${icon('play')}<strong>一条完整的交付流程</strong><small>全部在同一示例项目内操作</small></div><button class="icon-button" data-action="guide" aria-label="关闭演示导览">${icon('x')}</button></div><div class="guide-steps">${[['new-project','01','建立项目目标','选用示例模板或空白项目，资料始终归属当前项目。'],['new-task','02','拆分与分工','创建任务，指派成员，固定资料依据。'],['goto-outcomes','03','提交、比较与采用','成员提交方案，负责人选定版本，保留备选。'],['goto-connections','04','查看来源变化','模拟 PR 合并与文档更新，复核影响。'],['ask-blockers','05','让 AI 理解项目','检查引用，审核具体任务草案。'],['goto-acceptance','06','验收并交付','核对证据和条件，确认正式进展。']].map(([act,num,title,sub])=>`<button data-action="guide-step" data-target="${act}"><span>${num}</span><div><strong>${title}</strong><small>${sub}</small></div>${icon('chevron')}</button>`).join('')}</div><div class="guide-foot">${btn('查看模拟边界','about','text-button')}${btn('恢复初始示例','reset','text-button','','refresh')}</div></div>`;
}
function render() {
  const focused=document.activeElement;
  const focusId=focused?.id;
  const selection=focused && ['INPUT','TEXTAREA'].includes(focused.tagName) ? [focused.selectionStart,focused.selectionEnd] : null;
  const mainScroll=document.querySelector('#workspace-main')?.scrollTop||0;
  const panelScroll=document.querySelector('.panel-scroll')?.scrollTop||0;
  const page=({overview,work:workView,resources:resourcesView,outcomes:outcomesView,activity:activityView,team:teamView,connections:connectionsView}[ui.view]||overview)();
  APP.innerHTML=`<div class="app-shell ${ui.panel?'has-panel':''}">${sidebar()}${ui.mobileNav?'<button class="nav-backdrop" data-action="toggle-nav" aria-label="关闭导航遮罩"></button>':''}<div class="workspace">${topbar()}<main id="workspace-main" tabindex="-1"><div class="page-content ${ui.view==='overview'?'overview-page':''}">${page}</div></main></div>${ui.panel?`<aside class="context-panel ${ui.panel==='ai'?'ai-panel':''}" aria-label="${ui.panel==='task'?'任务详情':ui.panel==='ai'?'项目助手':'资料详情'}">${ui.panel==='task'?taskPanel():ui.panel==='resource'?resourcePanel():aiPanel()}</aside>`:''}${ui.guide?guide():''}${renderModal()}</div>`;
  const main=document.querySelector('#workspace-main');if(main)main.scrollTop=mainScroll;
  const panel=document.querySelector('.panel-scroll');if(panel)panel.scrollTop=panelScroll;
  if(focusId) {const el=document.getElementById(focusId);if(el){el.focus({preventScroll:true});if(selection&&selection[0]!==null&&typeof el.setSelectionRange==='function'){try{el.setSelectionRange(...selection);}catch{}}}}
  if(ui.modal && !document.querySelector('.modal')?.contains(document.activeElement)) { const first=document.querySelector('.modal input, .modal textarea, .modal select, .modal button'); first?.focus({preventScroll:true}); }
}
function showModal(name) { lastDialogFocus=document.activeElement?.dataset?.action; ui.modal=name; render(); }
function ask(query) {
  ui.panel='ai';ui.aiQuery=query;ui.plan=null;
  if(/拆分|创建|规划|任务草案|起草/.test(query)){ui.agentId='planner';ui.answer=null;ui.plan=createPlan(appState,actorId);}
  else ui.answer=summarize(appState,actorId,ui.agentId,query);
  render();
}

APP.addEventListener('click',event=>{
  const view=event.target.closest('[data-view]');if(view){navigate(view.dataset.view);return;}
  const el=event.target.closest('[data-action]');if(!el)return;
  const {action,id}=el.dataset;
  if(action==='backdrop' && event.target!==el)return;
  handleAction(action,id,el);
});
function handleAction(action,id,el={dataset:{}}) {
  switch(action){
    case 'toggle-nav':ui.mobileNav=!ui.mobileNav;render();break;
    case 'projects':ui.projectMenu=!ui.projectMenu;render();break;
    case 'switch-project':save();activeProject=id;appState=appProjects[id];ui.projectMenu=false;ui.panel=null;ui.plan=null;ui.answer=null;ui.view='overview';ui.modal=null;save();render();break;
    case 'new-resource':showModal('resource');break;
    case 'new-proposal':ui.taskId=el.dataset.task||ui.taskId||getLeaves(appState).find(t=>can(appState,actorId,'submitTask',t.id))?.id;showModal('proposal');break;
    case 'new-project':ui.projectMenu=false;showModal('project');break;
    case 'new-task':ui.newMilestone=el.dataset.milestone||'m2';showModal('task');break;
    case 'edit-task':ui.taskId=id;showModal('edit-task');break;
    case 'task':openTask(id);break;
    case 'resource':openResource(id);break;
    case 'search-resource':ui.modal=null;openResource(id);break;
    case 'close-panel':ui.panel=null;ui.answer=null;render();break;
    case 'close-modal':case 'backdrop':ui.modal=null;render();document.querySelector(`[data-action="${lastDialogFocus}"]`)?.focus();break;
    case 'filter':ui.filter=id;render();break;
    case 'source-filter':ui.sourceFilter=id;render();break;
    case 'clear-filters':ui.filter='all';ui.query='';render();break;
    case 'collapse':ui.collapsed.has(id)?ui.collapsed.delete(id):ui.collapsed.add(id);render();break;
    case 'milestone':navigate('work');ui.collapsed=new Set(appState.milestones.filter(m=>m.id!==id).map(m=>m.id));render();break;
    case 'goto-work':navigate('work');break;
    case 'goto-activity':case 'decisions-history':navigate('activity');break;
    case 'goto-connections':navigate('connections');break;
    case 'goto-outcomes':ui.tab='decisions';navigate('outcomes');break;
    case 'goto-acceptance':ui.tab='acceptance';navigate('outcomes');break;
    case 'outcome-tab':ui.tab=id;render();break;
    case 'compare':ui.compareTaskId=el.dataset.task||appState.proposals[0]?.taskId;if(!appState.proposals.length){toast('当前项目暂无候选方案，可切换到示例项目体验。');break;}showModal('compare');break;
    case 'submit-task':ui.taskId=id;showModal('submit');break;
    case 'accept-task':ui.taskId=id;showModal('accept');break;
    case 'link-resource':ui.taskId=id;showModal('link');break;
    case 'review-source':ui.taskId=el.dataset.task;ui.reviewResourceId=el.dataset.resource;showModal('review-source');break;
    case 'deliver':showModal('deliver');break;
    case 'sync-github':run({type:'syncGithub'},'已核对模拟 PR 合并事件；任务仍需验收。');break;
    case 'sync-drive':run({type:'syncDrive'},'已同步需求更新。固定依据保留，相关任务等待复核。');break;
    case 'source-access':run({type:resourceBy('r-requirements')?.available?'sourceUnavailable':'restoreSource',resourceId:'r-requirements'},'来源访问状态已更新。');break;
    case 'switch-actor':switchActor(id);break;
    case 'test-permission':run({type:'deliverProject',note:'权限演示：尝试直接确认交付'},'本轮交付已确认。');break;
    case 'ai':ui.panel=ui.panel==='ai'?null:'ai';ui.taskId=null;render();break;
    case 'ai-observer':ui.panel='ai';ui.agentId='observer';ui.answer=null;ui.plan=null;render();break;
    case 'task-ai':ask(`请根据项目资料解释 ${ui.taskId} 当前的依赖与下一步。`);break;
    case 'ask-blockers':ask('目前这个项目最大的阻塞是什么？');break;
    case 'ask-progress':ask('哪些工作已经完成，哪些成果尚未验收？');break;
    case 'ai-plan':ask('根据当前需求，拆分补充开发任务。');break;
    case 'discard-plan':ui.plan=null;render();break;
    case 'apply-plan':if(ui.plan && run({type:'applyPlan',plan:ui.plan},'已批准并创建任务；AI 身份与授权人已记录。')){ui.plan=null;render();}break;
    case 'workspace-ref':if(el.dataset.type==='task'){openTask(id);}else{navigate('activity');}break;
    case 'citation':if(taskBy(el.dataset.resource)){openTask(el.dataset.resource);}else if(isVisible(el.dataset.resource)){ui.resourceId=el.dataset.resource;ui.selectedVersion=el.dataset.version;ui.panel='resource';render();}else{toast('该来源已失效或不在当前权限范围内。',true);}break;
    case 'guide':ui.guide=!ui.guide;render();break;
    case 'guide-step':ui.guide=false;handleAction(el.dataset.target);break;
    case 'search':ui.query='';showModal('search');break;
    case 'reset':ui.guide=false;showModal('reset');break;
    case 'confirm-reset':{const seed=createSeed();appProjects[seed.project.id]=seed;activeProject=seed.project.id;appState=seed;actorId='owner';ui.modal=null;ui.panel=null;ui.view='overview';ui.answer=null;ui.plan=null;ui.collapsed.clear();save();render();toast('示例已恢复，可以重新演示。');break;}
    case 'export':{if(actorId!=='owner'){toast('完整演示记录仅允许项目负责人导出。',true);break;}const blob=new Blob([JSON.stringify({prototype:'R1 · 全部为模拟数据',exportedAt:new Date().toISOString(),state:appState},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='project-workspace-demo.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('已导出当前演示状态与记录。');break;}
    case 'about':ui.guide=false;showModal('about');break;
  }
}
function switchActor(id){actorId=id;ui.answer=null;ui.plan=null;ui.panel=null;ui.modal=null;save();render();toast(`当前演示身份：${memberName(id)} · ${roleNames[id]||''}`);}
APP.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='identity')switchActor(el.value);
  if(el.id==='task-assignee'){run({type:'updateTask',taskId:el.dataset.task,patch:{assigneeId:el.value}},'负责人已更新。');render();}
  if(el.id==='task-status'){run({type:'setStatus',taskId:el.dataset.task,status:el.value},'任务状态已更新。');render();}
  if(el.id==='resource-version'){ui.selectedVersion=el.value;render();}
  if(el.id==='agent-select'){ui.agentId=el.value;ui.answer=null;ui.plan=null;render();}
});
APP.addEventListener('input',event=>{
  if(['work-query','resource-query','global-query'].includes(event.target.id)){ui.query=event.target.value;render();}
});
APP.addEventListener('submit',event=>{
  event.preventDefault();const form=event.target;const data=new FormData(form);
  if(form.id==='resource-form'){
    const kind=data.get('provider')==='github'?'document':data.get('kind');
    const baseId=({requirement:'r-requirements',design:'r-design',acceptance:'r-qa',pull_request:'r-pr'}[kind])||uniqueId('resource');
    const resourceId=resourceBy(baseId)?uniqueId('resource'):baseId;
    if(run({type:'registerResource',resourceId,title:data.get('title'),provider:data.get('provider'),kind,version:data.get('version'),content:data.get('content')},'资料已登记，可在任务中关联这个版本。',{close:true}))openResource(resourceId);
  }
  if(form.id==='proposal-form'){
    const r=resourceBy(data.get('resourceId'));
    if(r&&run({type:'submitProposal',proposalId:uniqueId('proposal'),taskId:data.get('taskId'),resourceId:r.id,title:data.get('title'),version:r.version,summary:data.get('summary'),tradeoffs:String(data.get('tradeoffs')).split('\n').map(x=>x.trim()).filter(Boolean)},'候选方案已正式提交，等待负责人比较与采用。',{close:true})){ui.panel=null;ui.view='outcomes';ui.tab='decisions';render();}
  }
  if(form.id==='task-form'){
    if(ui.modal==='edit-task'){const patch={title:data.get('title'),description:data.get('description'),parentId:data.get('parentId')||null,dueDate:data.get('dueDate')};if(data.get('assigneeId')&&data.get('assigneeId')!==taskBy(ui.taskId).assigneeId)patch.assigneeId=data.get('assigneeId');run({type:'updateTask',taskId:ui.taskId,patch},'任务要求已更新。',{close:true});return;}
    const before=new Set(appState.tasks.map(t=>t.id));
    if(run({type:'createTask',title:data.get('title'),description:data.get('description'),assigneeId:data.get('assigneeId'),milestoneId:data.get('milestoneId'),parentId:data.get('parentId')||null,dependencies:data.get('dependency')?[{taskId:data.get('dependency'),gate:'accepted'}]:[],criteria:String(data.get('criteria')).split('\n').map(s=>s.trim()).filter(Boolean),dueDate:data.get('dueDate')},'任务已创建。',{close:true})){
      const created=appState.tasks.find(t=>!before.has(t.id));if(created){if(data.get('resourceId'))run({type:'linkResource',taskId:created.id,resourceId:data.get('resourceId')},'任务已创建并关联资料。');openTask(created.id);}
    }
  }
  if(form.id==='project-form')run({type:'createProject',projectId:uniqueId('project'),template:data.get('template'),name:data.get('name'),goal:data.get('goal'),dueDate:data.get('dueDate')},'项目已创建。现在可以拆分第一项工作。',{close:true});
  if(form.id==='adopt-form'){const p=appState.proposals.find(x=>x.id===data.get('proposalId'));if(p)run({type:'adoptProposal',proposalId:p.id,version:p.version,reason:data.get('reason')},'方案版本已采用，备选和决策理由已保留。',{close:true});}
  if(form.id==='acceptance-form')run({type:form.dataset.mode==='accept'?'acceptTask':'submitTask',taskId:ui.taskId,note:data.get('note'),criteriaIds:data.getAll('criteria'),evidenceIds:data.getAll('evidence')},form.dataset.mode==='accept'?'验收通过，项目进度已更新。':'已提交，等待负责人验收。',{close:true});
  if(form.id==='link-form')run({type:'linkResource',taskId:ui.taskId,resourceId:data.get('resourceId')},'资料已关联，当前版本已固定。',{close:true});
  if(form.id==='review-source-form')run({type:'reviewResource',taskId:ui.taskId,resourceId:ui.reviewResourceId,version:resourceBy(ui.reviewResourceId).version,note:data.get('note')},'已复核并更新本项任务的资料依据。',{close:true});
  if(form.id==='deliver-form')run({type:'deliverProject',note:data.get('note')},'本轮交付已确认，完整记录已留存。',{close:true});
  if(form.id==='ai-form')ask(String(data.get('query')).trim());
});
document.addEventListener('keydown',event=>{
  const typing=['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName);
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();handleAction('search');}
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='j'){event.preventDefault();handleAction('ai');}
  if(event.key==='Escape'){if(ui.modal){handleAction('close-modal');}else if(ui.guide){ui.guide=false;render();}else if(ui.panel){ui.panel=null;render();}else if(ui.mobileNav){ui.mobileNav=false;render();}}
  if(event.key==='Tab'&&ui.modal){const controls=[...document.querySelectorAll('.modal button:not(:disabled),.modal input:not(:disabled),.modal select:not(:disabled),.modal textarea:not(:disabled),.modal [tabindex="0"]')].filter(x=>x.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  if(!typing&&!ui.modal&&event.key.toLowerCase()==='n'){event.preventDefault();handleAction('new-task');}
});
window.addEventListener('storage',event=>{if(event.key===STORE){toast('另一个标签页的项目状态有变化。刷新后读取最新保存的版本。');}});
save();render();
if(persistenceError)toast('浏览器存储不可用；当前会话仍可演示，请导出记录留存。',true);
