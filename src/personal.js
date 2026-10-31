import { createPersonalState, addProject, updateProject, addFeature, updateFeature, setFeatureVerification, addTask, toggleTask, updateTask, addNote, updateNote, setFocus, applySnapshot, markSeen, getProjectSummary, getFeatureState, answerProject } from './personal-domain.js';
import { fetchGitHubSnapshot } from './github-sync.js';
import { githubSnapshot } from './github-snapshot.js';

const ROOT = document.querySelector('#app');
const STORE = 'project-workspace.personal.v1';
const SESSION = 'project-workspace.personal.view';
const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const symbols = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  check:'<path d="m5 12 4 4L19 6"/>', circle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  note:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>', chevron:'<path d="m9 5 6 7-6 7"/>',
  back:'<path d="M19 12H5m5-5-5 5 5 5"/>', down:'<path d="m6 9 6 6 6-6"/>', x:'<path d="m6 6 12 12M6 18 18 6"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  layers:'<path d="m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/>',
  github:'<path d="M9 19c-4 1-4-2-5-2m10 4v-3.4a3 3 0 0 0-.8-2.3c2.8-.3 5.8-1.4 5.8-6.2a4.8 4.8 0 0 0-1.3-3.3 4.5 4.5 0 0 0-.1-3.3s-1-.3-3.4 1.3a12 12 0 0 0-6.2 0C5.6 2.2 4.6 2.5 4.6 2.5a4.5 4.5 0 0 0-.1 3.3A4.8 4.8 0 0 0 3.2 9c0 4.8 3 5.9 5.8 6.2a3 3 0 0 0-.8 2.2V21"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 1l1 5M4 12l1 5a8 8 0 0 0 13 1"/>',
  flag:'<path d="M5 21V4m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  link:'<path d="m10 13 4-4m-6 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 1 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0)"/>',
  external:'<path d="M14 3h7v7m0-7-11 11M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="3" fill="currentColor" stroke="none"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  pin:'<path d="m16 3 5 5-4 3-1 5-3-3-6 6m6-6-5-5 5-1 3-4Z"/>',
  play:'<path d="m8 5 11 7-11 7V5Z"/>', alert:'<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v.1"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>', coffee:'<path d="M4 8h12v7a6 6 0 0 1-12 0V8Zm12 0h2a3 3 0 0 1 0 6h-2M7 2v2m6-2v2M3 22h15"/>'
};
const icon = (name, cls='') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[name] || symbols.layers}</svg>`;
const button = (label,action,cls='',attrs='',ico='') => `<button type="button" class="btn ${cls}" data-action="${action}" ${attrs}>${ico?icon(ico):''}<span>${h(label)}</span></button>`;
const iconButton = (name,action,label,attrs='') => `<button type="button" class="icon-btn" data-action="${action}" aria-label="${h(label)}" title="${h(label)}" ${attrs}>${icon(name)}</button>`;
const pill = (label,tone='neutral') => `<span class="pill ${h(tone)}"><i></i>${h(label)}</span>`;
const safeUrl = value => { try { const u = new URL(value); return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:''; } catch { return ''; } };
const external = (label,url,cls='') => safeUrl(url) ? `<a class="${cls}" href="${h(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${h(label)}${icon('external')}</a>` : `<span>${h(label)}</span>`;
const uid = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()+'-'+Math.random().toString(36).slice(2)}`;
const dateTime = value => value ? new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)) : '尚未同步';
const age = value => { const m=Math.max(0,Math.floor((Date.now()-Date.parse(value))/60000));return !Number.isFinite(m)?'尚未同步':m<1?'刚刚':m<60?`${m} 分钟前`:m<1440?`${Math.floor(m/60)} 小时前`:`${Math.floor(m/1440)} 天前`; };
let state = createPersonalState(githubSnapshot);
let saveError = false;
let lastSavedRaw = null;
const activeRequests = new Map();
const ui = { view:'project',tab:'overview',panel:null,modal:null,featureId:null,answer:null,navOpen:false,query:'',featureFilter:'all',busy:new Set(),syncErrors:{},lastAttempt:{},retryAt:{},returnFocus:null };
try { lastSavedRaw=localStorage.getItem(STORE);const cached=JSON.parse(lastSavedRaw||'null'); if(cached?.version===2&&Array.isArray(cached.projects)&&cached.projects.length&&cached.projects.every(p=>Array.isArray(p.features)&&Array.isArray(p.tasks)&&Array.isArray(p.notes))) state=cached; const session=JSON.parse(localStorage.getItem(SESSION)||'null'); if(session&&['projects','project','tasks','notes'].includes(session.view))ui.view=session.view; } catch { saveError=true; }
if(!state.projects.some(p=>p.id===state.activeProjectId))state.activeProjectId=state.projects[0].id;
const project = () => state.projects.find(p=>p.id===state.activeProjectId);
const feature = () => project().features.find(f=>f.id===ui.featureId);
let toastTimer;
function toast(message,bad=false) { const box=document.querySelector('#toast');box.textContent=message;box.className=`show ${bad?'error':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.className='',5000); }
function refreshStoredState() {
  const raw=localStorage.getItem(STORE);if(raw===lastSavedRaw||!raw)return;
  const latest=JSON.parse(raw);if(latest?.version!==2||!Array.isArray(latest.projects)||!latest.projects.length)throw new Error('其他页面保存了不同格式，请先导出当前内容。');
  const active=state.activeProjectId;state={...latest,activeProjectId:latest.projects.some(p=>p.id===active)?active:latest.activeProjectId};lastSavedRaw=raw;
}
function save() {
  try { if(localStorage.getItem(STORE)!==lastSavedRaw){toast('另一页面刚更新了项目，保留当前填写内容，请再保存一次。',true);return false;}const raw=JSON.stringify(state);localStorage.setItem(STORE,raw);lastSavedRaw=raw;localStorage.setItem(SESSION,JSON.stringify({view:ui.view}));return true; }
  catch {saveError=true;toast('浏览器没有保存成功，请先导出项目。',true);return false;}
}
function change(fn,message,close=true) { try { refreshStoredState();const previous=state;state=fn();if(!save()){state=previous;return false;}if(close)ui.modal=null;ui.answer=null;render();if(message)toast(message);return true; } catch(error) { toast(error.message||'暂时无法完成，请检查填写内容。',true);return false; } }
function navigate(view,tab='overview') { try{refreshStoredState();}catch(error){toast(error.message,true);}ui.view=view;ui.tab=tab;ui.panel=null;ui.modal=null;ui.navOpen=false;ui.query='';save();render();document.querySelector('main')?.scrollTo(0,0); }
function openProject(id) { state={...state,activeProjectId:id};navigate('project'); }
function openPanel(name,id) { ui.returnFocus=document.activeElement?.dataset?.focusKey||null;ui.panel=name;ui.modal=null;ui.navOpen=false;if(id)ui.featureId=id;if(name==='ask')ui.answer=answerProject(state,project().id,project().focus||'现在能用了吗？');render(); }
function openModal(name) { ui.returnFocus=document.activeElement?.dataset?.focusKey||null;ui.modal=name;render();requestAnimationFrame(()=>document.querySelector('.modal input, .modal textarea')?.focus()); }
function closeOverlay() { const key=ui.returnFocus; if(ui.modal)ui.modal=null;else ui.panel=null;render();if(key)document.querySelector(`[data-focus-key="${CSS.escape(key)}"]`)?.focus(); }
function projectIcon(p,large=false) { return `<span class="project-icon ${large?'large':''}">${icon(p.repo?'layers':'folder')}</span>`; }
function sidebar() {
  const count=state.projects.reduce((n,p)=>n+p.tasks.filter(t=>!t.done).length,0);
  return `<aside class="sidebar ${ui.navOpen?'open':''}" aria-label="工作台导航"><button class="brand" data-action="nav" data-id="projects"><span class="brand-mark"><i></i><i></i><i></i><i></i></span>我的工作台</button><div class="personal-label">个人空间</div><nav>${[['projects','grid','项目'],['tasks','circle','待办'],['notes','note','资料']].map(([id,sym,label])=>`<button class="nav-link ${(ui.view===id||id==='projects'&&ui.view==='project')?'selected':''}" data-action="nav" data-id="${id}">${icon(sym)}<span>${label}</span>${id==='tasks'&&count?`<small>${count}</small>`:''}</button>`).join('')}</nav><div class="sidebar-section"><span>正在做</span>${iconButton('plus','new-project','新建项目')}</div><div class="project-nav">${state.projects.map(p=>`<button class="project-link ${ui.view==='project'&&state.activeProjectId===p.id?'active':''}" data-action="project" data-id="${h(p.id)}"><span class="project-dot"></span><span>${h(p.title)}</span></button>`).join('')}</div><button class="quick-note" data-action="new-note">${icon('plus')}随手记</button><div class="sidebar-bottom"><button class="profile" data-action="settings"><span class="avatar">H</span><span>hongfei<small>个人工作台</small></span>${icon('settings')}</button></div></aside>`;
}
function topbar() {
  const p=project();
  return `<header class="topbar">${iconButton('menu','menu','打开导航')}<div class="breadcrumbs"><button data-action="nav" data-id="projects">${icon('grid')}项目</button>${ui.view==='project'?`${icon('chevron')}<span>${h(p.title)}</span>`:ui.view==='tasks'?`${icon('chevron')}<span>待办</span>`:ui.view==='notes'?`${icon('chevron')}<span>资料</span>`:''}</div><div class="topbar-actions">${iconButton('search','search','搜索工作台','data-focus-key="search"')}<span class="topbar-divider"></span>${iconButton('plus','new-project','新建项目')}</div></header>`;
}
function progress(summary,compact=false) {
  const labels={ready:'已可用',testing:'待体验',building:'开发中',blocked:'有阻碍',planned:'未开始',unknown:'待关联'};
  return `<div class="progress-wrap ${compact?'compact':''}"><div class="progress-meta"><span>${compact?'本版功能':'本版可用进度'}</span><strong>${summary.ready}<small> / ${summary.total} 项可用</small></strong></div><div class="progress-track" role="progressbar" aria-label="已体验可用的功能" aria-valuenow="${summary.ready}" aria-valuemin="0" aria-valuemax="${Math.max(1,summary.total)}">${summary.features.map(f=>`<span class="progress-segment ${h(f.status)}" title="${h(f.title+' · '+f.label)}"></span>`).join('')||'<span class="progress-segment planned"></span>'}</div>${!compact?`<div class="progress-legend">${Object.entries(labels).filter(([key])=>summary.counts[key]>0).map(([key,label])=>`<span><i class="${key}"></i>${label} ${summary.counts[key]}</span>`).join('')}</div>`:''}</div>`;
}
function syncLabel(p) { if(ui.busy.has(p.id))return '正在同步';if(ui.syncErrors[p.id])return '同步未成功';if(!p.snapshot)return '连接 GitHub';return `${p.snapshot.source==='connector-snapshot'?'已读取快照':'已同步'} · ${age(p.snapshot.fetchedAt)}`; }
function titleBlock(title,subtitle='',action='') { return `<div class="page-heading"><div><h1>${h(title)}</h1>${subtitle?`<p>${h(subtitle)}</p>`:''}</div><div class="heading-actions">${action}</div></div>`; }
function projectsView() {
  return `${titleBlock('我的项目','继续你在做的事。',button('新建项目','new-project','primary','','plus'))}<div class="projects-grid">${state.projects.map(p=>{const s=getProjectSummary(state,p.id);return `<button class="project-card" data-action="project" data-id="${h(p.id)}"><div class="project-card-top">${projectIcon(p,true)}${pill(s.ready===s.total&&s.total?'已体验可用':s.counts.blocked?'需要处理':'进行中',s.counts.blocked?'blocked':'building')}${icon('arrow')}</div><h2>${h(p.title)}</h2><p class="project-goal">${h(p.goal)}</p><div class="project-card-state">${h(s.headline)}</div>${progress(s,true)}<div class="project-card-footer"><span>${icon(p.repo?'github':'folder')}${p.repo?'GitHub 已关联':'个人项目'}</span><span>${p.snapshot?age(p.snapshot.fetchedAt):'尚未同步'}</span></div></button>`;}).join('')}<button class="new-project-tile" data-action="new-project"><span>${icon('plus')}</span><strong>开始一个新项目</strong><small>一个想法，也可以先放进来</small></button></div>`;
}
function featureCard(f,p) {
  const d=getFeatureState(p,f);const index=p.features.indexOf(f)%4;
  return `<button class="feature-card" data-action="feature" data-id="${h(f.id)}" data-focus-key="feature-${h(f.id)}"><div class="feature-card-top"><span class="feature-icon tone-${index}">${icon(f.icon||['grid','refresh','flag','note'][index])}</span>${pill(d.label,d.status)}</div><h3>${h(f.title)}</h3><p>${h(d.status==='testing'&&!d.needsRetest&&f.criteria?.length?'待确认：'+f.criteria[0]:d.status==='planned'?f.description||d.description:d.description)}</p><div class="feature-card-bottom"><span>${h(d.status==='ready'?'查看体验':d.status==='testing'?'去体验':d.status==='blocked'?'看看问题':d.status==='planned'||d.status==='unknown'?'继续完善':'查看进展')}</span>${icon('arrow')}</div></button>`;
}
function featuresSection(p,full=false) {
  const features=ui.featureFilter==='all'?p.features:p.features.filter(f=>getFeatureState(p,f).status===ui.featureFilter);
  return `<section class="features-section"><div class="section-heading"><h2>这版要做什么 <span>${p.features.length}</span></h2>${button('添加功能','new-feature','quiet','','plus')}</div>${full?`<div class="filter-row">${[['all','全部'],['testing','待体验'],['ready','已可用'],['blocked','有阻碍']].map(([value,label])=>`<button data-action="feature-filter" data-id="${value}" class="filter-chip ${ui.featureFilter===value?'active':''}">${label}</button>`).join('')}</div>`:''}<div class="features-grid">${features.map(f=>featureCard(f,p)).join('')||`<button class="empty-card" data-action="new-feature">${icon('plus')}<strong>${p.features.length?'没有这类功能':'先写下这版想做的一个功能'}</strong><span>例如：搜索历史记录、导出文件</span></button>`}</div></section>`;
}
function taskCards(p,limit) {
  const tasks=p.tasks.filter(t=>!t.done).slice(0,limit||100);
  return tasks.map(t=>`<div class="todo-card"><button class="check-toggle" data-action="toggle-task" data-id="${h(t.id)}" data-project="${h(p.id)}" aria-label="完成：${h(t.title)}">${icon('check')}</button><button class="todo-content" data-action="task-detail" data-id="${h(t.id)}" data-project="${h(p.id)}"><strong>${h(t.title)}</strong><span>${t.featureId?h(p.features.find(f=>f.id===t.featureId)?.title||p.title):h(p.title)}</span></button>${icon('chevron')}</div>`).join('');
}
function overview(p) {
  const s=getProjectSummary(state,p.id);const focus=answerProject(state,p.id,p.focus||'现在能用了吗？');const next=s.nextActions[0];
  return `<div class="overview-layout"><div class="overview-main"><section class="status-card"><div class="card-eyebrow"><span>${icon('spark')}项目状态</span><button class="source-status ${ui.syncErrors[p.id]?'warning':''}" data-action="connection">${icon(ui.busy.has(p.id)?'refresh':'github',ui.busy.has(p.id)?'spinning':'')}${h(syncLabel(p))}${icon('chevron')}</button></div><h2>${h(focus.answer)}</h2><p class="status-description">${h(s.description)}</p>${progress(s)}<div class="status-actions">${next?button(next.kind==='unblock'?'查看问题':next.kind==='verify'?'继续体验':next.taskId?'继续这一步':next.kind==='connect'?'关联仓库':next.kind==='sync'?'同步进展':'添加功能',next.featureId?'feature':next.taskId?'task-detail':next.kind==='connect'?'connect':next.kind==='sync'?'sync':'new-feature','primary',`data-id="${h(next.featureId||next.taskId||'')}"`,'arrow'):button('添加一个功能','new-feature','primary','','plus')}${button('为什么这样判断','ask','quiet',`data-question="${h(p.focus||'现在能用了吗？')}"`,'spark')}</div></section><section class="focus-card"><span class="focus-label">${icon('pin')}我关心的</span><button class="focus-answer" data-action="ask" data-question="${h(p.focus||'现在能用了吗？')}"><strong>${h(p.focus||'现在能用了吗？')}</strong>${icon('arrow')}</button>${button('调整','focus','quiet small')}</section>${featuresSection(p)}</div><aside class="overview-side"><section class="next-section"><div class="section-heading"><h2>下一步</h2>${iconButton('plus','new-task','添加待办')}</div>${s.nextActions.slice(0,2).map((a,i)=>`<button class="next-card" data-action="${a.featureId?'feature':a.taskId?'task-detail':a.kind==='connect'?'connect':a.kind==='sync'?'sync':'new-feature'}" ${a.featureId?`data-id="${h(a.featureId)}"`:a.taskId?`data-id="${h(a.taskId)}"`:''}><span class="next-number">${i+1}</span><div><strong>${h(a.title)}</strong><p>${h(a.detail)}</p></div>${icon('arrow')}</button>`).join('')||`<div class="quiet-empty">${icon('coffee')}<p>暂时没有急着处理的事。</p></div>`}</section><button class="capture-card" data-action="new-note"><span class="capture-icon">${icon('note')}</span><strong>有个想法，先记下来</strong><p>文字、参考链接，都放在项目里。</p><span class="capture-action">随手记 ${icon('plus')}</span></button><button class="history-link" data-action="history">${icon('clock')}查看变化${s.sinceSeenChanges?.length?`<span class="change-count">${s.sinceSeenChanges.length}</span>`:''}${icon('chevron')}</button></aside></div>`;
}
function projectView() {
  const p=project();
  return `<div class="project-heading"><div>${projectIcon(p,true)}<div><h1>${h(p.title)}<span class="version-tag">第一版</span></h1><p>${h(p.goal)}</p></div></div>${iconButton('more','edit-project','项目设置','data-focus-key="project-settings"')}</div><div class="project-tabs" role="tablist" aria-label="项目内容">${[['overview','概览'],['features','功能'],['notes','资料']].map(([id,label])=>`<button role="tab" aria-selected="${ui.tab===id}" class="${ui.tab===id?'active':''}" data-action="tab" data-id="${id}">${label}${id==='features'?`<small>${p.features.length}</small>`:''}</button>`).join('')}<div class="tabs-right">${button('问项目','ask','quiet','data-focus-key="ask"','spark')}</div></div>${ui.tab==='features'?featuresSection(p,true):ui.tab==='notes'?notesView(true):overview(p)}`;
}
function tasksView() {
  const all=state.projects.flatMap(p=>p.tasks.map(t=>({...t,projectId:p.id,projectTitle:p.title})));
  return `${titleBlock('我的待办',`${all.filter(t=>!t.done).length} 件待办，按项目放在一起。`,button('添加待办','new-task','primary','','plus'))}<div class="task-projects">${state.projects.filter(p=>p.tasks.some(t=>!t.done)).map(p=>`<section><div class="section-heading"><h2>${projectIcon(p)}${h(p.title)}</h2>${button('进入项目','project','quiet',`data-id="${h(p.id)}"`,'arrow')}</div><div class="task-cards-grid">${taskCards(p)}</div></section>`).join('')||`<div class="empty-card">${icon('circle')}<strong>没有待办，可以专心做一件事</strong>${button('记下下一步','new-task','secondary','','plus')}</div>`}</div>${all.some(t=>t.done)?`<details class="completed-tasks"><summary>已完成 ${all.filter(t=>t.done).length}</summary><div class="task-cards-grid">${all.filter(t=>t.done).map(t=>`<div class="todo-card done"><button class="check-toggle" data-action="toggle-task" data-id="${h(t.id)}" data-project="${h(t.projectId)}" aria-label="恢复待办：${h(t.title)}">${icon('check')}</button><span class="todo-content"><strong>${h(t.title)}</strong><span>${h(t.projectTitle)}</span></span></div>`).join('')}</div></details>`:''}`;
}
function notesView(inProject=false) {
  const list=(inProject?[project()]:state.projects).flatMap(p=>p.notes.map(n=>({...n,projectTitle:p.title,projectId:p.id})));
  return `${inProject?`<div class="section-heading"><h2>想法与资料</h2>${button('随手记','new-note','secondary','','plus')}</div>`:titleBlock('资料','想法和参考，留在它们所属的项目里。',button('随手记','new-note','primary','','plus'))}<div class="notes-grid">${list.map(n=>`<button class="note-card" data-action="note" data-id="${h(n.id)}" data-project="${h(n.projectId)}"><div class="note-card-label">${icon(n.url?'link':'note')}<span>${n.url?'参考资料':'随手记'}</span></div><h3>${h(n.title)}</h3><p>${h(n.text||n.content||'')}</p><div><span>${h(n.projectTitle)}</span><span>${dateTime(n.createdAt)}</span></div></button>`).join('')||`<button class="empty-card" data-action="new-note">${icon('note')}<strong>第一条想法，随时可以开始</strong><span>写几句话，或保存一个参考链接</span></button>`}</div>`;
}
function sourceItems(p,f) {
  const refs=f?getFeatureState(p,f).evidence:p.snapshot?.pullRequests?.map(pr=>({label:`开发改动 #${pr.number} · ${pr.title}`,url:pr.url,kind:'pull_request'}))||[];
  return refs.map(e=>`<div class="evidence-card">${icon(e.kind==='check'?'circle':'github')}<div>${external(e.label,e.url)}${e.kind?`<small>${e.kind==='check'?'开发检查':'GitHub 来源'}</small>`:''}</div></div>`).join('')||'<p class="muted">尚未关联开发来源。可以先写清功能，再关联相应改动。</p>';
}
function featurePanel() {
  const p=project(),f=feature();if(!f)return '';
  const d=getFeatureState(p,f);const criteria=f.criteria?.length?f.criteria:['完整使用一次这个功能，确认符合你的预期'];
  return `<div class="panel-feature-title"><span class="feature-icon tone-${p.features.indexOf(f)%4}">${icon(f.icon||'grid')}</span>${pill(d.label,d.status)}<h2>${h(f.title)}</h2><p>${h(f.description||'把它做成你自己愿意用的功能。')}</p></div><section class="panel-section"><h3>现在的情况</h3><div class="feature-explanation ${d.status}"><strong>${h(d.description||d.label)}</strong>${d.reason&&d.reason!==d.description?`<p>${h(d.reason)}</p>`:''}</div></section><section class="panel-section"><h3>${d.status==='ready'?'我的体验':'试一试'}</h3>${f.verification?`<div class="verification-note"><span>${icon(f.verification.passed?'circle':'alert')}${f.verification.passed?'曾确认可用':'体验中遇到问题'} · ${dateTime(f.verification.at)}</span><p>${h(f.verification.note)}</p></div>`:''}<form id="verify-form" data-feature="${h(f.id)}">${criteria.map((c,i)=>`<label class="criterion"><input type="checkbox" name="criteria" value="${i}" required ${d.status==='ready'?'checked':''}/><span>${h(typeof c==='string'?c:c.text||c.title)}</span></label>`).join('')}<label class="field"><span>体验笔记 <small>可选</small></span><textarea name="note" placeholder="哪里顺手，哪里还不对…" rows="3" maxlength="1500"></textarea></label><button class="btn primary full" type="submit">${icon('check')}我试过了，可以用</button>${button('发现一个问题','report-issue','quiet full')}</form></section><details class="evidence-details"><summary>${icon('github')}开发依据<span>${(f.prNumbers||[]).length}</span>${icon('down')}</summary><div>${sourceItems(p,f)}<p class="muted small-text">${p.snapshot?'读取于 '+dateTime(p.snapshot.fetchedAt):'尚未读取 GitHub'}。检查通过不会自动替你确认可用。</p></div></details><div class="panel-bottom">${button('调整这个功能','edit-feature','secondary','','settings')}${button('添加待办','new-task','quiet',`data-feature="${h(f.id)}"`,'plus')}</div>`;
}
function answerContent(answer) { return answer?`<div class="answer-card"><div class="answer-heading">${icon('spark')}<span>项目回答</span><small>规则版</small></div><h3>${h(answer.title)}</h3><p>${h(answer.answer)}</p>${answer.bullets?.length?`<div class="answer-points">${answer.bullets.map(b=>`<div><i></i><span>${h(b)}</span></div>`).join('')}</div>`:''}${answer.citations?.length?`<details class="answer-sources"><summary>查看依据 · ${answer.citations.length}</summary>${answer.citations.map(c=>`<div>${external(c.label,c.url)}</div>`).join('')}</details>`:''}<div class="answer-footer">${button('放到我关心的','pin-answer','quiet small','','pin')}<span>${age(answer.generatedAt)}</span></div></div>`:''; }
function askPanel() {
  return `<div class="ask-intro"><span class="ask-orb">${icon('spark')}</span><h2>问问这个项目</h2><p>接着当前进展聊，不用重新解释一遍。</p></div><div class="question-chips">${['现在能用了吗？','还差什么？','我现在该做什么？','最近有什么变化？'].map(q=>button(q,'question','question-chip',`data-question="${h(q)}"`)).join('')}</div>${answerContent(ui.answer)}<form id="ask-form" class="ask-composer"><label class="sr-only" for="project-question">询问项目</label><textarea id="project-question" name="question" placeholder="这个项目现在怎么样了？" rows="2" maxlength="300" required></textarea><button class="send-button" type="submit" aria-label="发送问题">${icon('arrow')}</button></form><p class="panel-footnote">当前使用规则解释已读取的状态，尚未接入大模型。个人笔记不会发送到外部模型。</p>`;
}
function historyPanel() {
  const p=project(),s=getProjectSummary(state,p.id);const changes=s.sinceSeenChanges||[];
  return `<h2>项目变化</h2><p class="panel-lead">需要回看时，记录都在这里。</p><div class="section-heading"><h3>自上次看过以来</h3>${button('我看过了','mark-seen','quiet small','','check')}</div>${changes.length?changes.map(c=>`<div class="history-card">${icon('refresh')}<div><strong>${h(c.title)}</strong><p>${h(c.detail)}</p>${c.url?external('查看来源',c.url):''}</div></div>`).join(''):'<div class="quiet-empty">'+icon('circle')+'<p>没有新的变化。</p></div>'}<details class="local-history"><summary>查看操作记录</summary>${(p.history||[]).slice(0,30).map(e=>`<div class="local-event"><span>${h(e.title||e.message||e.detail||e.type||'项目更新')}</span><small>${dateTime(e.at||e.createdAt)}</small></div>`).join('')||'<p class="muted">还没有操作记录。</p>'}</details>`;
}
function connectionPanel() {
  const p=project(),error=ui.syncErrors[p.id];
  return `<div class="connection-heading">${icon('github')}<h2>GitHub 同步</h2></div><p class="panel-lead">开发进展更新到项目里，你只看重要的变化。</p><div class="connection-card"><span class="small-label">已关联仓库</span><strong>${h(p.repo||'还没有关联')}</strong>${p.repo?external('在 GitHub 打开',`https://github.com/${p.repo}`):''}</div><div class="sync-info"><span>最近成功读取</span><strong>${dateTime(p.snapshot?.fetchedAt)}</strong><span>数据来源</span><strong>${p.snapshot?.source==='connector-snapshot'?'连接器读取的真实快照':p.snapshot?'公开 GitHub API':'尚未连接'}</strong></div>${error?`<div class="error-card">${icon('alert')}<p>${h(error)}</p></div>`:''}${p.snapshot?.warnings?.length?`<div class="error-card"><p>${h(p.snapshot.warnings.join('；'))}</p></div>`:''}<div class="sync-actions">${button(ui.busy.has(p.id)?'正在同步…':'立即同步','sync','primary',ui.busy.has(p.id)?'disabled':'','refresh')}${button(p.repo?'更换仓库':'关联仓库','connect','secondary','','link')}</div><label class="setting-row"><span><strong>自动同步</strong><small>页面可见时，每 5 分钟检查当前项目。</small></span><input class="switch" type="checkbox" id="auto-sync" aria-label="自动同步" ${p.autoSync?'checked':''}/></label><div class="boundary-note"><h3>这版的连接范围</h3><p>真实读取公开仓库的开发改动与检查结果。仅查看，不修改 GitHub；关闭页面后停止同步。</p><p>私有仓库与后台持续同步尚未接入。这里不保存账号密钥。</p><p>覆盖最近 100 个开发改动与 30 次 Actions 运行。公开读取额度按网络出口共享，限流时会保留旧状态并暂停重试。</p></div>${sourceItems(p)}`;
}
function panel() {
  if(!ui.panel)return '';
  const titles={feature:'功能',ask:'项目助手',history:'变化',connection:'来源',note:'资料',task:'待办'};
  let content=ui.panel==='feature'?featurePanel():ui.panel==='ask'?askPanel():ui.panel==='history'?historyPanel():ui.panel==='connection'?connectionPanel():'';
  if(ui.panel==='note'){const n=project().notes.find(n=>n.id===ui.noteId);content=n?`<span class="feature-icon tone-3">${icon(n.url?'link':'note')}</span><h2>${h(n.title)}</h2><p class="panel-lead">${h(project().title)} · ${dateTime(n.createdAt)}</p><div class="note-text">${h(n.text||n.content||'')}</div>${n.url?`<div class="evidence-card">${icon('link')}${external('打开参考资料',n.url)}</div>`:''}<div class="panel-bottom">${button('修改笔记','edit-note','secondary','','note')}</div>`:'';}
  if(ui.panel==='task'){const t=project().tasks.find(t=>t.id===ui.taskId);content=t?`<span class="feature-icon tone-2">${icon('circle')}</span><h2>${h(t.title)}</h2><p class="panel-lead">${h(project().title)}</p>${t.featureId?button('查看关联功能','feature','secondary',`data-id="${h(t.featureId)}"`,'layers'):''}<div class="panel-bottom">${button(t.done?'恢复待办':'完成这件事','toggle-task','primary',`data-id="${h(t.id)}"`,'check')}${button('修改待办','edit-task','quiet','','note')}</div>`:'';}
  return `<div class="panel-scrim" data-action="close-panel"></div><aside class="detail-panel" role="dialog" aria-modal="true" aria-label="${titles[ui.panel]||'详情'}"><header class="panel-header"><span>${titles[ui.panel]||'详情'}</span>${iconButton('x','close-panel','关闭详情','data-focus-key="close-panel"')}</header><div class="panel-body">${content}</div></aside>`;
}
function field(label,name,value='',placeholder='',type='text',required=false) { return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${h(value)}" placeholder="${h(placeholder)}" ${required?'required':''} maxlength="${name==='repo'?200:500}"/></label>`; }
function area(label,name,value='',placeholder='',required=false) { return `<label class="field"><span>${label}</span><textarea name="${name}" rows="3" placeholder="${h(placeholder)}" ${required?'required':''} maxlength="5000">${h(value)}</textarea></label>`; }
function projectSelect(){return `<label class="field"><span>所属项目</span><select name="projectId">${state.projects.map(p=>`<option value="${h(p.id)}" ${p.id===project().id?'selected':''}>${h(p.title)}</option>`).join('')}</select></label>`;}
function modal() {
  if(!ui.modal)return '';
  const p=project(),f=feature();let title='',body='',form='',submit='保存';
  if(ui.modal==='new-project'||ui.modal==='edit-project'){const edit=ui.modal==='edit-project';title=edit?'项目设置':'开始一个项目';form=edit?'project-edit-form':'project-form';submit=edit?'保存':'创建项目';body=field('项目名称','title',edit?p.title:'','你在做什么？','text',true)+area('这版想做到什么','goal',edit?p.goal:'','用一句话写下你想实现的目标。',true)+(edit?'':field('GitHub 仓库 <small>可选</small>','repo','','https://github.com/你的账号/项目'));}
  if(ui.modal==='new-feature'||ui.modal==='edit-feature'){const edit=ui.modal==='edit-feature';title=edit?'调整功能':'这版再做一个功能';form=edit?'feature-edit-form':'feature-form';body=field('功能名称','title',edit?f.title:'','例如：搜索历史记录','text',true)+area('它应该能做什么','description',edit?f.description:'','从使用者的角度，说清它有什么用。')+`<details class="feature-options" ${edit?'open':''}><summary>开发关联与体验要点 <span>可选</span>${icon('down')}</summary><div>`+area('怎么确认好用','criteria',edit?(f.criteria||[]).join('\n'):'','每行一项，例如：输入关键词后能找到对应记录。')+field('关联开发改动 <small>可选 · PR 编号</small>','prNumbers',edit?(f.prNumbers||[]).join(', '):'','例如 1, 3')+`<p class="form-hint">把代码变化和功能对应起来，后续状态才能跟着更新。</p><label class="field"><span>未关联代码时的状态</span><select name="manualStatus">${[['planned','未开始'],['building','开发中'],['testing','待体验']].map(([v,label])=>`<option value="${v}" ${edit&&f.manualStatus===v?'selected':''}>${label}</option>`).join('')}</select></label></div></details>`;}
  if(ui.modal==='new-task'||ui.modal==='edit-task'){const edit=ui.modal==='edit-task',t=p.tasks.find(item=>item.id===ui.taskId);title=edit?'修改待办':'记下下一步';form=edit?'task-edit-form':'task-form';submit=edit?'保存修改':'添加待办';body=field('要做什么','title',edit?t.title:'','写下一件具体的事','text',true)+(edit?'':projectSelect())+`<label class="field"><span>关联功能 <small>可选</small></span><select name="featureId"><option value="">暂不关联</option>${p.features.map(f=>`<option value="${h(f.id)}" ${(edit?t.featureId:ui.taskFeatureId)===f.id?'selected':''}>${h(f.title)}</option>`).join('')}</select></label>`;}
  if(ui.modal==='new-note'||ui.modal==='edit-note'){const edit=ui.modal==='edit-note',n=p.notes.find(item=>item.id===ui.noteId);title=edit?'修改笔记':'随手记';form=edit?'note-edit-form':'note-form';submit=edit?'保存修改':'保存笔记';body=field('标题','title',edit?n.title:'','一个想法，或一份参考','text',true)+area('内容','text',edit?n.text:'','先记下来，之后再整理。')+field('参考链接 <small>可选</small>','url',edit?n.url:'','https://…','url')+(edit?'':projectSelect());}
  if(ui.modal==='connect'){title='关联 GitHub';form='connect-form';submit='关联并读取';body=field('公开仓库','repo',p.repo||'','https://github.com/你的账号/项目','text',true)+`<p class="form-hint">只读取公开项目，不需要密钥。更换仓库后，原有开发关联与体验版本将重新确认。</p>`;}
  if(ui.modal==='focus'){title='这个项目，你最关心什么？';form='focus-form';body=`<div class="focus-options">${['现在能用了吗？','还差什么？','我现在该做什么？','最近有什么变化？'].map(q=>button(q,'choose-focus','question-chip',`data-question="${h(q)}"`)).join('')}</div>`+field('关注的问题','question',p.focus||'','例如：距离日常可用还差什么？','text',true);}
  if(ui.modal==='report-issue'){title='哪里还不好用？';form='issue-form';submit='记为待解决';body=area('遇到的问题','note','','写下具体表现，下一步就知道要修什么。',true);}
  if(ui.modal==='search'){title='搜索工作台';body=`<label class="search-field">${icon('search')}<input id="search-query" placeholder="搜索项目、功能、想法…" aria-label="搜索项目、功能、想法"/></label><div id="search-results">${searchResults('')}</div>`;}
  if(ui.modal==='settings'){title='我的工作台';body=`<div class="settings-profile"><span class="avatar">H</span><div><strong>hongfei</strong><p>个人空间 · 第一版</p></div></div><div class="settings-card"><h3>项目数据</h3><p>${saveError?'浏览器保存受限，请先导出。':'项目、待办和笔记保存在当前浏览器。'}</p>${button('导出我的项目','export','secondary','','download')}</div><div class="settings-card"><h3>关于这一版</h3><p>先把一个人的项目做好。GitHub 支持公开仓库只读同步，项目回答目前使用规则解释。</p><p>协作、私有仓库授权和真实模型将在后续接入。</p></div>`;}
  return `<div class="modal-backdrop" data-action="dismiss-modal"></div><section class="modal ${ui.modal==='search'?'search-modal':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title">${title}</h2>${iconButton('x','close-modal','关闭弹窗')}</header>${form?`<form id="${form}"><div class="modal-content">${body}</div><footer>${button('取消','close-modal','quiet')}<button type="submit" class="btn primary">${h(submit)}</button></footer></form>`:`<div class="modal-content">${body}</div>`}</section>`;
}
function searchResults(query) {
  const q=query.trim().toLowerCase();let result=[];
  for(const p of state.projects){if(!q||`${p.title} ${p.goal}`.toLowerCase().includes(q))result.push(`<button class="search-result" data-action="project" data-id="${h(p.id)}">${icon('folder')}<span><strong>${h(p.title)}</strong><small>项目</small></span>${icon('chevron')}</button>`);if(q)for(const f of p.features)if(`${f.title} ${f.description}`.toLowerCase().includes(q))result.push(`<button class="search-result" data-action="search-feature" data-id="${h(f.id)}" data-project="${h(p.id)}">${icon('layers')}<span><strong>${h(f.title)}</strong><small>${h(p.title)} · 功能</small></span>${icon('chevron')}</button>`);if(q)for(const n of p.notes)if(`${n.title} ${n.text}`.toLowerCase().includes(q))result.push(`<button class="search-result" data-action="note" data-id="${h(n.id)}" data-project="${h(p.id)}">${icon('note')}<span><strong>${h(n.title)}</strong><small>${h(p.title)} · 资料</small></span>${icon('chevron')}</button>`);}
  return result.slice(0,12).join('')||'<div class="quiet-empty"><p>没有找到，换个词试试。</p></div>';
}
function render() {
  const scroll=document.querySelector('main')?.scrollTop||0;
  ROOT.innerHTML=`<div class="app-shell">${sidebar()}${ui.navOpen?'<button class="nav-scrim" data-action="menu" aria-label="关闭导航"></button>':''}<div class="app-content">${topbar()}<main id="workspace-main" tabindex="-1">${saveError?'<div class="save-warning">浏览器保存受限，请从设置导出项目。</div>':''}${ui.view==='projects'?projectsView():ui.view==='tasks'?tasksView():ui.view==='notes'?notesView():projectView()}<footer class="workspace-footer"><span>先把自己的项目做好。</span><button data-action="connection">${icon('github')}来源与同步</button></footer></main></div>${panel()}${modal()}</div>`;
  document.querySelector('main').scrollTop=scroll;
  const background=document.querySelector('.app-content');if(ui.modal||ui.panel){background?.setAttribute('inert','');document.querySelector('.sidebar')?.setAttribute('inert','');if(ui.modal)document.querySelector('.detail-panel')?.setAttribute('inert','');}else if(ui.navOpen){background?.setAttribute('inert','');}
}
async function syncProject(id=project().id,silent=false) {
  try{refreshStoredState();}catch(error){toast(error.message,true);return;}
  const p=state.projects.find(p=>p.id===id);if(Date.now()<(ui.retryAt[id]||0)){toast('GitHub 暂时限制读取，请在 '+dateTime(ui.retryAt[id])+' 后重试。',true);return;}if(!p?.repo){openModal('connect');return;}if(ui.busy.has(id))return;
  ui.busy.add(id);ui.lastAttempt[id]=Date.now();delete ui.syncErrors[id];if(!ui.modal)render();
  const controller=new AbortController(),ticket=uid('sync'),timeout=setTimeout(()=>controller.abort(),20000);activeRequests.set(id,{ticket,controller,repo:p.repo});
  try { const snapshot=await fetchGitHubSnapshot(p.repo,{signal:controller.signal,previous:p.snapshot});refreshStoredState();if(activeRequests.get(id)?.ticket!==ticket||state.projects.find(item=>item.id===id)?.repo!==p.repo)return;state=applySnapshot(state,id,snapshot);if(!save())return;if(ui.answer)ui.answer=answerProject(state,project().id,ui.answer.question);if(!silent)toast(snapshot.complete?'项目状态已同步':'已读取部分状态，缺失项已标明'); }
  catch(error){if(activeRequests.get(id)?.ticket!==ticket||state.projects.find(item=>item.id===id)?.repo!==p.repo)return;ui.retryAt[id]=error.retryAfterSeconds?Date.now()+error.retryAfterSeconds*1000:error.resetAt?Date.parse(error.resetAt):0;ui.syncErrors[id]=error.name==='AbortError'?'这次连接超时了，仍保留上次成功读取的状态。':error.message||'暂时连不上 GitHub，保留上次成功读取的状态。';if(!silent)toast(ui.syncErrors[id],true);}
  finally { clearTimeout(timeout);if(activeRequests.get(id)?.ticket===ticket){activeRequests.delete(id);ui.busy.delete(id);if(!ui.modal&&(!ui.panel||ui.panel==='connection'||ui.panel==='history'))render();} }
}
ROOT.addEventListener('click',event=>{
  const el=event.target.closest('[data-action]');if(!el)return;const a=el.dataset.action,id=el.dataset.id,p=project();
  if(a==='nav')navigate(id);
  else if(a==='project')openProject(id);
  else if(a==='tab'){ui.tab=id;ui.featureFilter='all';render();}
  else if(a==='menu'){ui.navOpen=!ui.navOpen;render();}
  else if(['new-project','edit-project','new-feature','edit-feature','new-note','edit-note','edit-task','focus','connect','search','settings','report-issue'].includes(a))openModal(a);
  else if(a==='new-task'){ui.taskFeatureId=el.dataset.feature||null;openModal('new-task');}
  else if(a==='feature'||a==='search-feature'){if(el.dataset.project)state={...state,activeProjectId:el.dataset.project};openPanel('feature',id);}
  else if(a==='feature-filter'){ui.featureFilter=id;render();}
  else if(a==='connection'||a==='history')openPanel(a);
  else if(a==='close-panel'){ui.modal=null;ui.panel=null;closeOverlay();}
  else if(a==='close-modal'||a==='dismiss-modal')closeOverlay();
  else if(a==='ask'||a==='question'){ui.returnFocus=document.activeElement?.dataset?.focusKey||null;ui.panel='ask';ui.modal=null;ui.answer=answerProject(state,p.id,el.dataset.question||p.focus||'现在能用了吗？');render();}
  else if(a==='pin-answer'){change(()=>setFocus(state,p.id,ui.answer.question),'已放到项目首页');}
  else if(a==='choose-focus'){const input=document.querySelector('[name="question"]');input.value=el.dataset.question;input.focus();}
  else if(a==='mark-seen')change(()=>markSeen(state,p.id),'已记住你看到的版本');
  else if(a==='sync')syncProject();
  else if(a==='toggle-task')change(()=>toggleTask(state,el.dataset.project||p.id,id),'待办已更新',false);
  else if(a==='task-detail'){if(el.dataset.project)state={...state,activeProjectId:el.dataset.project};ui.taskId=id;openPanel('task');}
  else if(a==='note'){state={...state,activeProjectId:el.dataset.project||p.id};ui.noteId=id;openPanel('note');}
  else if(a==='export'){const blob=new Blob([JSON.stringify({format:'project-workspace-personal-v1',exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='my-project-workspace.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出项目数据');}
});
ROOT.addEventListener('input',event=>{if(event.target.id==='search-query')document.querySelector('#search-results').innerHTML=searchResults(event.target.value);});
ROOT.addEventListener('change',event=>{
  if(event.target.id==='auto-sync'){const value=event.target.checked;if(change(()=>updateProject(state,project().id,{autoSync:value}),value?'已开启：页面可见时每 5 分钟同步':'已关闭自动同步',false)&&value)syncProject();}
  if(event.target.name==='projectId'&&event.target.closest('#task-form')){const p=state.projects.find(p=>p.id===event.target.value);const select=document.querySelector('[name="featureId"]');select.innerHTML='<option value="">暂不关联</option>'+p.features.map(f=>`<option value="${h(f.id)}">${h(f.title)}</option>`).join('');}
});
ROOT.addEventListener('submit',event=>{
  event.preventDefault();const form=event.target,data=new FormData(form),p=project(),value=name=>String(data.get(name)||'').trim();
  if(form.id==='project-form'){const id=uid('project');if(change(()=>addProject(state,{id,title:value('title'),goal:value('goal'),repo:value('repo')}),'项目已创建')){openProject(id);if(project().repo)syncProject(id);}}
  if(form.id==='project-edit-form')change(()=>updateProject(state,p.id,{title:value('title'),goal:value('goal')}),'项目已更新');
  if(form.id==='feature-form'||form.id==='feature-edit-form'){const input=value('prNumbers');if(input&&!/^\d+(?:[\s,，]+\d+)*$/.test(input)){toast('开发改动请填写 PR 编号，例如 1, 3。',true);return;}const patch={title:value('title'),description:value('description'),criteria:value('criteria').split('\n').map(x=>x.trim()).filter(Boolean),prNumbers:input?input.split(/[\s,，]+/).map(Number):[],manualStatus:value('manualStatus')||'planned'};change(()=>form.id==='feature-form'?addFeature(state,p.id,{id:uid('feature'),icon:['grid','refresh','flag','note'][p.features.length%4],...patch}):updateFeature(state,p.id,ui.featureId,patch),form.id==='feature-form'?'已加入这一版':'功能已更新');}
  if(form.id==='task-form')change(()=>addTask(state,value('projectId'),{title:value('title'),featureId:value('featureId')||null}),'已记下下一步');
  if(form.id==='note-form')change(()=>addNote(state,value('projectId'),{title:value('title'),text:value('text'),url:value('url')}),'想法已保存');
  if(form.id==='note-edit-form')change(()=>updateNote(state,p.id,ui.noteId,{title:value('title'),text:value('text'),url:value('url')}),'笔记已更新');
  if(form.id==='task-edit-form')change(()=>updateTask(state,p.id,ui.taskId,{title:value('title'),featureId:value('featureId')||null}),'待办已更新');
  if(form.id==='connect-form'){if(activeRequests.has(p.id)){activeRequests.get(p.id).controller.abort();activeRequests.delete(p.id);ui.busy.delete(p.id);}delete ui.retryAt[p.id];delete ui.syncErrors[p.id];if(change(()=>updateProject(state,p.id,{repo:value('repo')}),'仓库已关联'))syncProject();}
  if(form.id==='focus-form')change(()=>setFocus(state,p.id,value('question')),'以后优先看这个问题');
  if(form.id==='verify-form'){const f=feature(),criteria=f.criteria?.length||1;if(data.getAll('criteria').length!==criteria){toast('先实际体验并勾选每一项。',true);return;}change(()=>setFeatureVerification(state,p.id,f.id,{passed:true,note:value('note')||'已按列出的体验要点逐项确认。',at:new Date().toISOString()}),'已记录你的体验，项目进度已更新',false);}
  if(form.id==='issue-form'){const f=feature();change(()=>{let next=setFeatureVerification(state,p.id,f.id,{passed:false,note:value('note'),at:new Date().toISOString()});return addTask(next,p.id,{title:`修复 ${f.title}：${value('note').slice(0,100)}`,featureId:f.id});},'问题已记入待办');}
  if(form.id==='ask-form'){ui.answer=answerProject(state,p.id,value('question'));render();}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){if(ui.modal||ui.panel){event.preventDefault();closeOverlay();}else if(ui.navOpen){ui.navOpen=false;render();}}
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openModal('search');}
  if(event.key==='Tab'&&(ui.modal||ui.panel)){const box=document.querySelector(ui.modal?'.modal':'.detail-panel'),items=[...box.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea, select, a[href], summary')].filter(el=>el.getClientRects().length);if(!items.length)return;const first=items[0],last=items[items.length-1];if(event.shiftKey&&(document.activeElement===first||!box.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!box.contains(document.activeElement))){event.preventDefault();first.focus();}}
});
const autoTick=()=>{const p=project();if(!document.hidden&&p?.autoSync&&p.repo&&Date.now()>(ui.retryAt[p.id]||0)&&!ui.modal&&!ui.panel&&Date.now()-(ui.lastAttempt[p.id]||Date.parse(p.snapshot?.fetchedAt)||0)>=300000)syncProject(p.id,true);};
setInterval(autoTick,30000);
document.addEventListener('visibilitychange',autoTick);
window.addEventListener('storage',event=>{if(event.key===STORE){try{refreshStoredState();if(!ui.modal&&!ui.panel)render();}catch(error){toast(error.message,true);}}});
render();
