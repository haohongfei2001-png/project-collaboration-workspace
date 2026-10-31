import { createWatchState, toggleWatch, setMonitor, applyWatchSnapshot, getWatchSummary, getAttention, resolveAttention, parseWatchRepo } from './watch-domain.js';
import { fetchWatchSnapshot } from './watch-sync.js';
import { watchCatalog, catalogRevision } from './watch-data.js';

const app = document.querySelector('#app');
const storageKey = document.querySelector('meta[name="workspace-storage"]')?.content || 'project-workspace.watch.v1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  inbox:'<path d="m4 4-2 10v6h20v-6L20 4H4Z"/><path d="M2 14h6l2 3h4l2-3h6"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>', back:'<path d="M19 12H5m5-5-5 5 5 5"/>',
  chevron:'<path d="m9 5 6 7-6 7"/>', down:'<path d="m6 9 6 6 6-6"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 1l1 5M4 12l1 5a8 8 0 0 0 13 1"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check:'<path d="m5 12 4 4L19 6"/>', circle:'<circle cx="12" cy="12" r="8.5"/>',
  error:'<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6m0-6-6 6"/>',
  alert:'<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v.1"/>',
  external:'<path d="M14 3h7v7m0-7-11 11M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  github:'<path d="M9 19c-4 1-4-2-5-2m10 4v-3.4a3 3 0 0 0-.8-2.3c2.8-.3 5.8-1.4 5.8-6.2a4.8 4.8 0 0 0-1.3-3.3 4.5 4.5 0 0 0-.1-3.3s-1-.3-3.4 1.3a12 12 0 0 0-6.2 0C5.6 2.2 4.6 2.5 4.6 2.5a4.5 4.5 0 0 0-.1 3.3A4.8 4.8 0 0 0 3.2 9c0 4.8 3 5.9 5.8 6.2a3 3 0 0 0-.8 2.2V21"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="3" fill="currentColor" stroke="none"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  play:'<path d="m8 5 11 7-11 7V5Z"/>', pause:'<path d="M8 5v14M16 5v14"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  decision:'<path d="m12 2 10 10-10 10L2 12 12-10Z"/><path d="M12 7v6m0 4v.1"/>',
  note:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  compare:'<path d="M12 3v18M3 7h6m-3-3 3 3-3 3m15 7h-6m3-3-3 3 3 3"/>',
  code:'<path d="m8 5-6 7 6 7m8-14 6 7-6 7M14 3l-4 18"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>'
};
const ico = (name, cls='') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.note}</svg>`;
const btn = (text, action, {cls='', icon='', attrs=''}={}) => `<button type="button" class="button ${cls}" data-action="${action}" ${attrs}>${icon?ico(icon):''}<span>${esc(text)}</span></button>`;
const ibtn = (icon, action, label, attrs='') => `<button type="button" class="icon-button" data-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${attrs}>${ico(icon)}</button>`;
const safeUrl = input => { try { const url=new URL(input);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';} };
const link = (text,url,cls='source-link') => safeUrl(url)?`<a class="${cls}" href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(text)}${ico('external')}</a>`:`<span class="${cls}">${esc(text)}</span>`;
const date = (value,short=false) => Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',...(short?{}:{hour:'2-digit',minute:'2-digit',hour12:false})}).format(new Date(value)):'尚未读取';
const age = value => {const m=Math.floor((Date.now()-Date.parse(value))/60000);return !Number.isFinite(m)?'尚未读取':m<1?'刚刚':m<60?`${m} 分钟前`:m<1440?`${Math.floor(m/60)} 小时前`:`${Math.floor(m/1440)} 天前`;};
const uid = prefix => `${prefix}-${crypto.randomUUID?.() || Date.now().toString(36)}`;
const kindNames = {blocked:'有阻塞',failure:'检查失败',approval:'待批准',decision:'待决定',verify:'待验证',review:'待复核',unverified:'待验证',confirmation:'待确认'};
const statusNames = {done:'已完成',active:'进行中',blocked:'有阻塞',todo:'待开始',unknown:'待确认'};
let state=createWatchState(watchCatalog);
let storedRaw=null;
let storageProblem=false;
try {
  storedRaw=localStorage.getItem(storageKey);
  const saved=JSON.parse(storedRaw||'null');
  if(saved?.version===3&&Array.isArray(saved.projects)&&saved.projects.length) state=saved;
  if(state.catalogRevision!==catalogRevision){
    const current=new Map(state.projects.map(p=>[p.id,p]));
    const seeded=createWatchState(watchCatalog);
    state={...state,projects:seeded.projects.map(p=>{
      const old=current.get(p.id);current.delete(p.id);
      if(!old)return p;
      const retain=Date.parse(old.snapshot?.fetchedAt)>Date.parse(p.observedAt);
      return {...p,watching:old.watching,notes:old.notes||[],tasks:old.tasks||[],resolutions:old.resolutions||{},observedRounds:old.observedRounds||[],previousPlans:[...(old.previousPlans||[]),...(p.previousPlans||[])].filter((plan,i,all)=>all.findIndex(x=>(x.sha||x.sourceUrl||x.title)===(plan.sha||plan.sourceUrl||plan.title))===i),...(retain?{snapshot:old.snapshot,planNeedsReview:old.planNeedsReview}:{}),localDecisions:old.localDecisions||[]};
    }).concat([...current.values()]),catalogRevision};
  }
} catch {storageProblem=true;}
const ui={view:'projects',projectId:null,tab:'overview',filter:'all',sort:'default',query:'',overlay:null,nav:false,historyFilter:'all',compareIndex:0,returnFocus:null,busy:new Set(),errors:{},deferred:false};
let toastTimer;
let lastAutoAt=0;
let cooldownUntil=0;
let lastNetworkAt=0;
const requests=new Map();
const project=id=>state.projects.find(p=>p.id===(id||ui.projectId));
const summary=p=>getWatchSummary(p);
const watched=()=>state.projects.filter(p=>p.watching);
const allAttention=()=>state.projects.flatMap(p=>(summary(p).attention||[]).map(a=>({...a,projectId:p.id,projectName:p.name||p.title})));
function notify(text,error=false){const node=document.querySelector('#toast');node.textContent=text;node.className=`visible ${error?'is-error':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.className='',4200);}
function refreshStorage(){const raw=localStorage.getItem(storageKey);if(raw&&raw!==storedRaw){const next=JSON.parse(raw);if(next?.version!==3||!Array.isArray(next.projects))throw Error('其他页面保存了不同的数据，请先导出。');state=next;storedRaw=raw;}}
function persist(){
  try{if(localStorage.getItem(storageKey)!==storedRaw)throw Error('另一页面刚更新了内容，请再保存一次。');const raw=JSON.stringify(state);localStorage.setItem(storageKey,raw);storedRaw=raw;return true;}
  catch(error){storageProblem=true;notify(error.message||'保存失败，请先导出。',true);return false;}
}
function change(fn,message='',close=true){try{refreshStorage();const previous=state;state=fn(state);if(!persist()){state=previous;return false;}if(close)ui.overlay=null;render();if(message)notify(message);return true;}catch(error){notify(error.message,true);return false;}}
function route(){
  const parts=location.hash.replace(/^#\/?/,'').split('/');
  if(parts[0]==='project'&&project(parts[1])){ui.view='project';ui.projectId=parts[1];ui.tab=['overview','history','plan','notes'].includes(parts[2])?parts[2]:'overview';}
  else{ui.view=['projects','attention','notes'].includes(parts[0])?parts[0]:'projects';ui.projectId=null;}
  ui.overlay=null;ui.nav=false;render();
}
function go(view,id='',tab='overview'){const next=view==='project'?`#/project/${encodeURIComponent(id)}/${tab}`:`#/${view}`;if(location.hash===next)route();else location.hash=next;}
function openOverlay(type,extra={}){ui.returnFocus=document.activeElement?.dataset?.focusKey||null;ui.overlay={type,...extra};ui.nav=false;render();requestAnimationFrame(()=>document.querySelector('.dialog input,.dialog textarea,.dialog button')?.focus());}
function closeOverlay(){const key=ui.returnFocus;ui.overlay=null;render();if(key)document.querySelector(`[data-focus-key="${CSS.escape(key)}"]`)?.focus();}
function appIcon(p,size=''){
  const src=typeof p.icon==='string'?p.icon:p.icon?.data||p.icon?.url;
  const valid=src&&(/^data:image\/(svg\+xml|png|webp);base64,/.test(src)||src.startsWith('/assets/apps/'));
  return `<span class="app-icon ${size} tone-${esc(p.id)}">${valid?`<img src="${esc(src)}" alt=""/>`:`<span>${esc(p.icon?.text||p.initials||(p.name||p.title||'P').slice(0,1))}</span>`}</span>`;
}
function sidebar(){
  const attention=allAttention().length;
  return `<aside class="sidebar ${ui.nav?'is-open':''}"><button class="brand" data-action="home">${ico('grid')}<span>工作台</span></button><nav aria-label="主导航">
  <button class="nav-item ${ui.view==='projects'||ui.view==='project'?'active':''}" data-action="home">${ico('grid')}<span>项目</span><small>${state.projects.length}</small></button>
  <button class="nav-item ${ui.view==='attention'?'active':''}" data-action="attention">${ico('inbox')}<span>需关注</span>${attention?`<small class="count">${attention}</small>`:''}</button>
  <button class="nav-item ${ui.view==='notes'?'active':''}" data-action="notes">${ico('folder')}<span>资料</span></button>
  </nav><div class="sidebar-section"><div class="section-label"><span>正在关注</span>${ibtn('plus','monitor','选择关注项目')}</div>${watched().map(p=>`<button class="project-nav ${ui.projectId===p.id?'selected':''}" data-action="open-project" data-id="${esc(p.id)}">${appIcon(p,'tiny')}<span>${esc(p.name||p.title)}</span></button>`).join('')||'<p class="sidebar-empty">选择你正在做的项目</p>'}</div>
  <div class="sidebar-bottom"><button class="connection-status" data-action="monitor"><span class="status-dot ${state.monitor.enabled?'running':''}"></span><span>${state.monitor.enabled?'关注已开启':'监控已暂停'}</span>${ico('settings')}</button><button class="account" data-action="settings"><span class="avatar">H</span><span>hongfei<small>个人工作台</small></span>${ico('settings')}</button></div></aside>`;
}
function topbar(){const p=project();return `<header class="topbar">${ibtn('menu','nav','打开导航')}<div class="breadcrumbs"><button data-action="home">项目</button>${p?`${ico('chevron')}<span>${esc(p.name||p.title)}</span>`:ui.view==='attention'?`${ico('chevron')}<span>需关注</span>`:ui.view==='notes'?`${ico('chevron')}<span>资料</span>`:''}</div><div class="topbar-right">${btn(state.monitor.enabled?'关注中':'选择关注','monitor',{cls:'quiet monitor-trigger',icon:'eye'})}${ibtn('plus','new-project','添加项目')}</div></header>`;}
function progress(p,s,compact=false){
  const items=p.plan?.items||[];
  const done=items.filter(x=>x.status==='done').length;
  const label=s.progress?.known?`${s.progress.percent}%`:items.length?`${done} / ${items.length}`:'未量化';
  const name=s.progress?.needsReview?'上次计划':items.length?'当前计划':'整体进度';
  return `<div class="progress-block ${compact?'compact':''}"><div class="progress-meta"><span>${name}</span><strong>${esc(label)}</strong></div><div class="progress-track ${items.length?'':'unknown'}" role="img" aria-label="${esc(`${name}，${items.length?`${done} 项完成，共 ${items.length} 项`:'尚无完整范围'}`)}">${items.length?items.map(item=>`<span class="segment ${esc(item.status)}" title="${esc(item.title+' · '+(statusNames[item.status]||'待确认'))}"></span>`).join(''):'<span></span><span></span><span></span><span></span>'}</div></div>`;
}
function phaseTag(p,s){return `<span class="phase-tag ${esc(p.phase?.key||'neutral')}"><i></i>${esc(s.phase?.needsReview?'阶段待复核':s.phase?.label||p.phase?.label||'待确认')}</span>`;}
function projectCard(p){const s=summary(p);const count=s.attention?.length||0;return `<article class="project-card ${p.watching?'watched':''}" data-project-card="${esc(p.id)}"><button class="card-main" data-action="open-project" data-id="${esc(p.id)}" aria-label="打开 ${esc(p.name||p.title)}">${appIcon(p)}<h2>${esc(p.name||p.title)}</h2>${phaseTag(p,s)}${progress(p,s,true)}</button><button class="watch-button ${p.watching?'selected':''}" data-action="toggle-watch" data-id="${esc(p.id)}" aria-label="${p.watching?'取消关注':'关注'} ${esc(p.name||p.title)}" title="${p.watching?'取消关注':'关注这个项目'}" aria-pressed="${p.watching}">${ico('eye')}</button><div class="card-footer">${count?`<button class="card-alert" data-action="open-attention" data-id="${esc(p.id)}">${ico('alert')}<span>${count} 项需关注</span></button>`:`<span class="card-quiet">${ico('check')}${s.resolvedAttention?.length?`已记录 ${s.resolvedAttention.length} 项`:p.observedAt||p.snapshot?'暂无提醒':'等待读取'}</span>`}<span class="card-time ${ui.errors[p.id]?'error-text':s.stale?'is-stale':''}" title="${esc(ui.errors[p.id]||`读取于 ${date(s.lastSyncedAt||p.observedAt)}`)}">${ui.busy.has(p.id)?'读取中…':ui.errors[p.id]?'读取失败':age(s.lastSyncedAt||p.observedAt)}</span></div></article>`;}
function projectsView(){
  let rows=state.projects.filter(p=>(ui.filter!=='watching'||p.watching)&&(ui.filter!=='attention'||summary(p).attention?.length)&&(!ui.query||(p.name||p.title).toLowerCase().includes(ui.query.toLowerCase())||p.repo.toLowerCase().includes(ui.query.toLowerCase())));
  if(ui.sort==='name')rows.sort((a,b)=>(a.name||a.title).localeCompare(b.name||b.title));
  if(ui.sort==='recent')rows.sort((a,b)=>Date.parse(b.snapshot?.fetchedAt||b.observedAt)-Date.parse(a.snapshot?.fetchedAt||a.observedAt));
  if(ui.sort==='attention')rows.sort((a,b)=>(summary(b).attention?.length||0)-(summary(a).attention?.length||0));
  const count=state.projects.filter(p=>summary(p).attention?.length).length;
  return `<section class="workspace-page"><div class="page-heading"><h1>项目</h1><div class="heading-tools"><label class="search-field">${ico('search')}<input id="project-search" aria-label="搜索项目" placeholder="搜索项目" value="${esc(ui.query)}" autocomplete="off"/><kbd>⌘ K</kbd></label>${ibtn('plus','new-project','添加项目')}</div></div>
  <div class="project-toolbar"><div class="filter-tabs" role="tablist" aria-label="项目筛选">${[['all','全部',state.projects.length],['watching','正在关注',watched().length],['attention','需关注',count]].map(([id,label,n])=>`<button role="tab" aria-selected="${ui.filter===id}" class="${ui.filter===id?'selected':''}" data-action="filter" data-filter="${id}">${label}<span>${n}</span></button>`).join('')}</div><label class="sort-control"><span class="sr-only">排列方式</span><select id="project-sort" aria-label="排列方式"><option value="default" ${ui.sort==='default'?'selected':''}>项目顺序</option><option value="recent" ${ui.sort==='recent'?'selected':''}>最近读取</option><option value="attention" ${ui.sort==='attention'?'selected':''}>需关注优先</option><option value="name" ${ui.sort==='name'?'selected':''}>项目名称</option></select>${ico('down')}</label></div>
  <div class="project-grid">${rows.map(projectCard).join('')}</div>${rows.length?'':`<div class="empty-state">${ico('search')}<h2>没有找到项目</h2><p>换个名字，或添加一个 GitHub 仓库。</p>${btn('添加项目','new-project',{icon:'plus'})}</div>`}
  <footer class="workspace-footer"><span>${ico('github')}来自你的真实 GitHub 项目</span><button data-action="monitor">${state.monitor.enabled?`正在轮询 ${watched().length} 个项目`:'选择几个项目，持续跟进'}${ico('arrow')}</button></footer></section>`;
}
function attentionIcon(kind){return ['approval','confirmation'].includes(kind)?'lock':kind==='decision'?'decision':['verify','review','unverified'].includes(kind)?'circle':'alert';}
function attentionItem(p,a,compact=false){return `<article class="attention-item ${compact?'compact':''}"><span class="attention-symbol ${esc(a.kind)}">${ico(attentionIcon(a.kind))}</span><div class="attention-body"><div class="attention-title"><h3>${esc(a.title)}</h3><span>${esc(kindNames[a.kind]||'需关注')}</span></div>${a.detail?`<p>${esc(a.detail)}</p>`:''}<div class="attention-actions">${link('查看依据',a.sourceUrl)}${btn('记下处理结果','decision',{cls:'text-button',attrs:`data-id="${esc(p.id)}" data-key="${esc(a.key||a.id)}"`})}</div></div></article>`;}
function attentionView(){const list=allAttention();const decisions=list.filter(a=>['approval','decision','confirmation'].includes(a.kind));return `<section class="workspace-page"><div class="page-heading"><h1>需关注 <span class="heading-count">${list.length}</span></h1>${btn('选择项目','monitor',{cls:'quiet',icon:'eye'})}</div><div class="attention-summary"><span>${ico('alert')}开发阻塞与待验证 <b>${list.length-decisions.length}</b></span><span>${ico('decision')}批准或决策事项 <b>${decisions.length}</b></span></div>${state.projects.map(p=>{const items=summary(p).attention||[];return items.length?`<section class="attention-group"><button class="group-project" data-action="open-project" data-id="${esc(p.id)}">${appIcon(p,'small')}<h2>${esc(p.name||p.title)}</h2>${ico('chevron')}</button><div class="attention-list">${items.map(a=>attentionItem(p,a)).join('')}</div></section>`:'';}).join('')||'<div class="empty-state"><h2>没有新的待处理项</h2><p>没有新提交，不会被自动判断为卡住。</p></div>'}</section>`;}
function sourceStrip(p,s){return `<button class="source-strip" data-action="source" data-id="${esc(p.id)}"><span class="status-dot ${ui.errors[p.id]?'failed':ui.busy.has(p.id)?'running':''}"></span><span>${ui.errors[p.id]?'读取失败，保留上次状态':ui.busy.has(p.id)?'正在读取 GitHub':`GitHub · ${date(s.lastSyncedAt||p.observedAt)}`}</span>${ico('chevron')}</button>`;}
function listBits(items,kind){return (items||[]).slice(0,4).map(item=>`<li>${ico(kind==='done'?'check':kind==='failed'?'error':'arrow')}<span>${esc(typeof item==='object'?item.title||item.text:item)}</span></li>`).join('');}
function currentOverview(p,s){
  const current=p.current||{};
  const newest=p.rounds?.[0];
  const changed=s.sourceChanged||s.progress?.needsReview;
  const headline=changed?'读到了新的开发记录，原有计划结论待复核':p.currentSummary||current.headline||newest?.title||'还没有开发结论';
  const attention=s.attention||[];
  return `<div class="project-overview"><div class="overview-primary"><section class="status-panel"><div class="panel-heading"><h2>当前进展</h2>${sourceStrip(p,s)}</div><h3 class="project-conclusion">${esc(headline)}</h3><div class="development-facts"><div><span>开发阶段</span>${phaseTag(p,s)}</div><div><span>跟进来源</span><strong>${esc(p.trackedPr?`PR #${p.trackedPr}`:p.sourceRef||'main')}</strong></div><div><span>最近检查</span><strong class="checks-label ${checksText(p,s).tone}">${ico(checksText(p,s).icon)}${checksText(p,s).text}</strong></div></div>${progress(p,s)}<button class="plan-caption" data-action="tab" data-tab="plan"><span>${esc(p.plan?.title||'还没有明确的开发计划')}</span>${ico('chevron')}</button></section>
  <section class="round-preview"><div class="panel-heading"><h2>${changed?'上次已核对的开发结果':'这一轮开发'}</h2>${btn('开发历史','tab',{cls:'text-button',attrs:'data-tab="history"',icon:'clock'})}</div><div class="round-preview-grid"><div class="outcome-column"><h3><i class="success-dot"></i>已完成</h3><ul>${listBits(current.done||newest?.done,'done')||'<li class="muted">尚未整理完成项</li>'}</ul></div><div class="outcome-column"><h3><i class="warning-dot"></i>未通过 / 未完成</h3><ul>${listBits(current.blocked||newest?.failed,'failed')||'<li class="muted">没有已确认的失败记录</li>'}</ul></div></div><div class="next-action-strip"><span>${ico('arrow')}${changed?'原定下一步':'接下来'}</span><p>${esc(p.currentWork||current.next||newest?.next?.[0]||'补齐当前开发计划和验证依据')}</p></div></section>
  ${taskSection(p)}</div><aside class="overview-aside"><section class="needs-panel"><div class="panel-heading"><h2>需关注</h2><span class="number-badge">${attention.length}</span></div>${attention.length?attention.slice(0,4).map(a=>attentionItem(p,a,true)).join(''):'<div class="quiet-success">'+ico('check')+`<p>${s.resolvedAttention?.length?'已记下处理结果，来源仍需确认':'没有新增待处理'}</p></div>`}<div class="approval-note">${ico('decision')}<span>${attention.some(a=>['approval','decision','confirmation'].includes(a.kind))?'存在明确的确认事项':'目前没有明确的批准或决策请求'}</span></div>${s.resolvedAttention?.length?`<button class="acknowledgement-link" data-action="tab" data-tab="history">${s.resolvedAttention.length} 条处理记录${ico('chevron')}</button>`:''}</section><section class="small-notes-panel"><div class="panel-heading"><h2>项目资料</h2>${ibtn('plus','new-note','添加资料',`data-id="${esc(p.id)}"`)}</div>${(p.notes||[]).slice(0,3).map(n=>`<button class="note-row" data-action="edit-note" data-id="${esc(p.id)}" data-note="${esc(n.id)}">${ico('note')}<span>${esc(n.title)}</span>${ico('chevron')}</button>`).join('')||`<button class="note-row muted" data-action="new-note" data-id="${esc(p.id)}">${ico('plus')}<span>保存想法或参考资料</span></button>`}${p.plan?.sourceUrl?`<div class="plan-source-row">${link('GitHub 开发计划',p.plan.sourceUrl)}</div>`:''}</section></aside></div>`;
}
function checksText(p,s){
  const candidate=Array.isArray(s.checks)?s.checks.find(c=>c.state==='failure')||s.checks.find(c=>c.state==='pending')||s.checks[0]:s.checks;
  const value=typeof candidate==='string'?candidate:candidate?.state||candidate?.status;
  if(value==='failure')return {text:'有检查未通过',tone:'failure',icon:'error'};
  if(value==='pending')return {text:'检查运行中',tone:'pending',icon:'clock'};
  if(value==='success')return {text:'已读取的检查通过',tone:'success',icon:'check'};
  const rows=(p.workflows||[]).filter(r=>(r.headSha||r.head_sha)===p.headSha);
  if(!p.snapshot&&rows.length&&rows.every(r=>r.conclusion==='success'))return {text:'当前版本检查通过',tone:'success',icon:'check'};
  return {text:'检查依据不足',tone:'neutral',icon:'circle'};
}
function taskSection(p){return `<section class="next-tasks"><div class="panel-heading"><h2>我的下一步</h2>${ibtn('plus','new-task','添加下一步',`data-id="${esc(p.id)}"`)}</div>${(p.tasks||[]).length?`<div class="task-list">${p.tasks.map(t=>`<div class="task-item ${t.done?'done':''}"><button class="task-check" data-action="toggle-task" data-id="${esc(p.id)}" data-task="${esc(t.id)}" aria-label="${t.done?'恢复':'完成'} ${esc(t.title)}" aria-pressed="${Boolean(t.done)}">${ico(t.done?'check':'circle')}</button><button class="task-text" data-action="edit-task" data-id="${esc(p.id)}" data-task="${esc(t.id)}">${esc(t.title)}</button></div>`).join('')}</div>`:`<button class="add-inline" data-action="new-task" data-id="${esc(p.id)}">${ico('plus')}记下一件自己要做的事</button>`}</section>`;}
function roundsOf(p,s){
  const reviewedIds=new Set((p.rounds||[]).map(r=>r.id));
  return (s.rounds||p.rounds||[]).filter(r=>reviewedIds.has(r.id)||r.provenance==='observed-history'||!p.rounds?.length||Date.parse(r.date||r.at||r.updatedAt)>Date.parse(p.observedAt||0)).sort((a,b)=>Date.parse(b.date||b.at||b.updatedAt||0)-Date.parse(a.date||a.at||a.updatedAt||0));
}
function newDiscussion(p){
  const comments=(p.snapshot?.comments||[]).filter(c=>Date.parse(c.updatedAt||c.createdAt)>Date.parse(p.observedAt||0));
  if(!comments.length)return '';
  return `<section class="live-discussions"><h3>新收到的开发讨论 <span>${comments.length}</span></h3>${comments.slice(0,5).map(c=>{
    const title=String(c.body||'').split('\n').find(line=>line.trim())?.replace(/^#+\s*/,'').replace(/\*\*/g,'').slice(0,130)||'开发讨论更新';
    return `<article><div><span>${date(c.updatedAt||c.createdAt)}</span>${link('原始回复',c.url)}</div><h4>${esc(title)}</h4><details><summary>展开原文 · 尚未自动判断产品影响</summary><pre>${esc(c.body||'本次没有读取正文')}</pre></details></article>`;
  }).join('')}</section>`;
}
function trackingSelector(p){
  const pulls=(p.snapshot?.pullRequests||[]).filter(x=>x.state==='open'||x.number===p.trackedPr);
  if(!pulls.length)return '';
  return `<label class="field tracking-field"><span>跟进开发线</span><select id="tracked-source" data-id="${esc(p.id)}"><option value="main" ${p.trackedPr?'':'selected'}>${esc(p.snapshot?.repository?.defaultBranch||'main')} · 主线</option>${pulls.map(pr=>`<option value="${pr.number}" ${p.trackedPr===pr.number?'selected':''}>PR #${pr.number} · ${esc(pr.title)}</option>`).join('')}</select></label>`;
}
function roundCard(r,index){
  const failed=(r.failed||[]).length;
  const tags={merged:'已合入',completed:'已完成',review:'待评审',blocked:'有阻塞',partial:'部分完成',reverted:'已回退',open:'开发中',active:'开发中',failed:'检查未通过',closed:'已关闭',commit:'代码更新',committed:'代码更新'};
  return `<article class="development-round"><div class="round-marker ${failed?'has-issue':''}">${ico(failed?'error':r.status==='merged'||r.status==='completed'?'check':'code')}</div><div class="round-content"><div class="round-topline"><span>${date(r.date||r.at||r.updatedAt)}</span><span class="round-status ${failed?'has-issue':''}">${esc(tags[r.status]||'开发记录')}</span></div><h3>${esc(r.title||'开发记录')}</h3><div class="round-outcomes">${(r.done||[]).length?`<div class="outcome-column"><h4>完成了</h4><ul>${listBits(r.done,'done')}</ul></div>`:''}${failed?`<div class="outcome-column"><h4>未通过 / 当时未完成</h4><ul>${listBits(r.failed,'failed')}</ul></div>`:''}${(r.next||[]).length?`<div class="outcome-column next-column"><h4>下一步</h4><ul>${listBits(r.next,'next')}</ul></div>`:''}${!(r.done||[]).length&&!failed&&!(r.next||[]).length?'<p class="muted">已记录开发事件，尚无经过复核的产品影响说明。</p>':''}</div><div class="round-sources">${(r.sources||[]).slice(0,3).map(x=>link(x.label||'GitHub 来源',x.url)).join('')}${r.sourceUrl&&!r.sources?.length?link('查看来源',r.sourceUrl):''}${r.headSha?`<span class="sha">${esc(r.headSha.slice(0,7))}</span>`:''}</div></div></article>`;
}
function historyView(p,s){const all=roundsOf(p,s);const rounds=all.filter(r=>ui.historyFilter!=='issues'||(r.failed||[]).length||r.status==='blocked'||r.status==='reverted');return `<section class="history-view"><div class="section-heading"><div><h2>开发历史</h2><p>每一轮的结果，按时间保留。</p></div><div class="segmented"><button class="${ui.historyFilter==='all'?'selected':''}" data-action="history-filter" data-filter="all">全部 ${all.length}</button><button class="${ui.historyFilter==='issues'?'selected':''}" data-action="history-filter" data-filter="issues">失败与回退</button></div></div>${p.previousPlans?.length?`<button class="plan-change-banner" data-action="tab" data-tab="plan">${ico('compare')}<span><strong>开发计划有过调整</strong><small>${esc(p.previousPlans[0].title)} → ${esc(p.plan?.title||'当前计划')}</small></span>${ico('chevron')}</button>`:''}${newDiscussion(p)}<div class="history-timeline">${rounds.map(roundCard).join('')||'<div class="empty-state"><h3>没有符合条件的开发记录</h3></div>'}</div>${localRecords(s)}</section>`;}
function localRecords(s){return s.resolvedAttention?.length?`<details class="local-records"><summary>我的处理记录 · ${s.resolvedAttention.length}</summary>${s.resolvedAttention.map(a=>`<article><h3>${esc(a.title)}</h3><p>${esc(a.resolution?.note)}</p><small>${date(a.resolution?.at)} · 仅记录在工作台</small>${link('原始依据',a.sourceUrl)}</article>`).join('')}</details>`:'';}
function rawPlan(document){return `<details class="raw-plan"><summary>${ico('note')}本次读到的计划原文 · ${esc(document.path||'来源文件')}</summary><div>${link('打开确切版本',document.sourceUrl)}${document.content?`<pre>${esc(document.content.slice(0,16000))}</pre>${document.content.length>16000?'<p>这里显示前 16,000 字符，完整内容请打开来源。</p>':''}`:'<p>本次未取得完整正文，保留旧依据并等待复核。</p>'}</div></details>`;}
function planItems(plan){return plan?.items?.length?plan.items:[...(plan?.done||[]).map((title,i)=>({id:`previous-done-${i}`,title,status:'done'})),...(plan?.remaining||[]).map((title,i)=>({id:`previous-pending-${i}`,title,status:'todo'}))];}
function planList(plan){return `<div class="plan-items">${planItems(plan).map(item=>`<div class="plan-item ${esc(item.status)}"><span class="item-status">${ico(item.status==='done'?'check':item.status==='blocked'?'error':item.status==='active'?'play':'circle')}</span><div><span>${esc(item.title)}</span><small>${esc(statusNames[item.status]||'待确认')}</small></div>${item.sourceUrl?link('依据',item.sourceUrl):''}</div>`).join('')||'<p class="plan-empty">来源还没有明确的计划项。</p>'}</div>`;}
function planView(p,s){const previous=p.previousPlans?.[ui.compareIndex]||p.previousPlans?.[0];return `<section class="plan-view"><div class="section-heading"><div><h2>开发计划</h2><p>${esc(s.progress?.known?'完整范围已明确，进度按计划项计算。':'当前计划项可以追踪；完整产品范围尚未量化。')}</p></div>${p.previousPlans?.length>1?`<label class="sort-control"><select id="plan-version" aria-label="选择之前的计划">${p.previousPlans.map((v,i)=>`<option value="${i}" ${i===ui.compareIndex?'selected':''}>${esc(v.title)}</option>`).join('')}</select>${ico('down')}</label>`:''}</div>${s.progress?.needsReview?`<div class="source-notice">${ico('alert')}来源版本已变化，以下整理保留为上一份依据，不能直接当作新版本已完成。</div>`:''}<div class="plan-comparison"><article class="plan-sheet current"><div class="plan-version"><span class="version-dot"></span>当前计划${p.plan?.ref?`<code>${esc(p.plan.ref.slice(0,7))}</code>`:''}</div><h3>${esc(p.plan?.title||'还没有开发计划')}</h3>${planList(p.plan)}<div class="plan-sheet-footer">${link('打开原计划',p.plan?.sourceUrl)}</div></article><article class="plan-sheet previous"><div class="plan-version">${ico('clock')}之前的计划${previous?.date?`<span>${date(previous.date,true)}</span>`:''}</div><h3>${esc(previous?.title||previous?.path||'尚无较早的计划快照')}</h3>${previous?`${previous.summary?`<p class="plan-summary">${esc(previous.summary)}</p>`:''}${previous.content?rawPlan(previous):planList(previous)}`:'<p class="plan-empty">后续读到计划变更时，保留原版本供比较。</p>'}${previous?`<div class="plan-sheet-footer">${link('打开当时的依据',previous.sourceUrl)}</div>`:''}</article></div>${p.snapshot?.planDocument?rawPlan(p.snapshot.planDocument):''}${p.parallelCandidate?`<div class="parallel-candidate"><span>${ico('code')}并行开发</span><strong>${esc(p.parallelCandidate.title)}</strong><small>${esc(p.parallelCandidate.phase)}</small>${link('查看候选',p.parallelCandidate.sourceUrl)}</div>`:''}</section>`;}
function noteCards(p){return (p.notes||[]).map(n=>`<article class="note-card"><button data-action="edit-note" data-id="${esc(p.id)}" data-note="${esc(n.id)}">${ico(n.url?'external':'note')}<h3>${esc(n.title)}</h3><p>${esc(n.text||n.url||'')}</p><small>${date(n.updatedAt||n.createdAt)}</small></button></article>`).join('');}
function notesView(p){const projects=p?[p]:state.projects.filter(x=>x.notes?.length);return `<section class="notes-view ${p?'':'workspace-page'}"><div class="section-heading"><h${p?'2':'1'}>资料</h${p?'2':'1'}>${btn('添加资料','new-note',{cls:'primary',icon:'plus',attrs:p?`data-id="${esc(p.id)}"`:''})}</div>${projects.map(item=>`${!p?`<h2 class="notes-project-name">${appIcon(item,'tiny')}${esc(item.name||item.title)}</h2>`:''}<div class="notes-grid">${noteCards(item)}${p?`<button class="add-note-card" data-action="new-note" data-id="${esc(p.id)}">${ico('plus')}保存文字或链接</button>`:''}</div>`).join('')||'<div class="empty-state"><h2>把资料放回项目里</h2><p>保存一条想法，或一个参考链接。</p></div>'}</section>`;}
function projectView(){const p=project();const s=summary(p);return `<section class="project-page"><div class="project-heading"><div class="project-identity">${appIcon(p,'large')}<div><h1>${esc(p.name||p.title)}</h1>${phaseTag(p,s)}</div></div><div class="project-actions">${btn(p.watching?'已关注':'关注项目','toggle-watch',{cls:p.watching?'watch-active':'',icon:'eye',attrs:`data-id="${esc(p.id)}"`})}${ibtn('refresh','sync','刷新项目状态',`data-id="${esc(p.id)}" ${ui.busy.has(p.id)?'disabled':''}`)}${ibtn('more','source','查看项目来源',`data-id="${esc(p.id)}"`)}</div></div><div class="project-tabs" role="tablist" aria-label="项目内容">${[['overview','开发概况'],['history','开发历史'],['plan','计划'],['notes','资料']].map(([id,label])=>`<button role="tab" aria-selected="${ui.tab===id}" class="${ui.tab===id?'active':''}" data-action="tab" data-tab="${id}">${label}</button>`).join('')}</div>${ui.tab==='overview'?currentOverview(p,s):ui.tab==='history'?historyView(p,s):ui.tab==='plan'?planView(p,s):notesView(p)}</section>`;}
function field(label,name,value='',placeholder='',required=false){return `<label class="field"><span>${esc(label)}</span><input name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="500" ${required?'required':''}/></label>`;}
function area(label,name,value='',placeholder=''){return `<label class="field"><span>${esc(label)}</span><textarea name="${name}" rows="4" maxlength="8000" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`;}
function projectSelect(id){return `<label class="field"><span>项目</span><select name="projectId">${state.projects.map(p=>`<option value="${esc(p.id)}" ${p.id===id?'selected':''}>${esc(p.name||p.title)}</option>`).join('')}</select></label>`;}
function dialogContent(){
  const o=ui.overlay;if(!o)return null;const p=project(o.projectId||o.id)||state.projects[0];
  if(o.type==='monitor')return {title:'关注正在开发的项目',wide:false,body:`<div class="monitor-state"><span class="status-dot ${state.monitor.enabled?'running':''}"></span><span>${state.monitor.enabled?'前台跟进中':'监控已暂停'}</span>${btn(state.monitor.enabled?'暂停':'开始跟进','monitor-toggle',{cls:'primary',icon:state.monitor.enabled?'pause':'play'})}</div><div class="monitor-projects">${state.projects.map(item=>`<label class="monitor-project">${appIcon(item,'small')}<span>${esc(item.name||item.title)}<small>${esc(summary(item).sourceChanged?'阶段待复核':item.phase?.label||'待确认')}</small></span><input type="checkbox" data-watch="${esc(item.id)}" ${item.watching?'checked':''} aria-label="关注 ${esc(item.name||item.title)}"/></label>`).join('')}</div><details class="monitor-details"><summary>读取方式与范围</summary><p>当前使用公开 GitHub API。页面打开且可见时，每 10 分钟轮询一个关注项目；手动刷新可立即读取。关闭页面后停止。</p><p>检查 PR、当前代码版本的检查、main 提交、问题标签、选定 PR 的评论与计划来源。没有新提交不会被判定为卡住。连续实时接收需要下一阶段接入 GitHub App 和服务端事件。</p><p>产品结论是本轮依据资料整理的快照；新增事实自动保留，未复核的产品影响不会冒充 AI 已理解。</p></details>`,footer:btn('完成','close',{cls:'primary'})};
  if(o.type==='source'){const s=summary(p);return {title:`${p.name||p.title} · 来源`,body:`<div class="source-identity">${ico('github')}<div><strong>${esc(p.repo)}</strong>${link('在 GitHub 打开',`https://github.com/${p.repo}`)}</div></div><dl class="source-facts"><div><dt>读取时间</dt><dd>${date(s.lastSyncedAt||p.observedAt)}</dd></div><div><dt>当前来源</dt><dd>${p.snapshot?.source==='github-public-api'?'公开 GitHub API':'已核对的 GitHub 快照'}</dd></div><div><dt>跟进开发线</dt><dd>${esc(p.trackedPr?`PR #${p.trackedPr}`:p.sourceRef||'main')}</dd></div><div><dt>原始版本</dt><dd><code>${esc((p.headSha||'').slice(0,12))}</code></dd></div></dl>${trackingSelector(p)}${ui.errors[p.id]?`<p class="source-notice">${esc(ui.errors[p.id])}</p>`:''}<div class="source-links">${(p.current?.sources||[]).map(x=>link(x.label,x.url)).join('')}${p.icon?.sourceUrl?link('应用图标来源',p.icon.sourceUrl):''}</div>${p.icon?.kind==='initials'?'<p class="form-hint">仓库未提供独立应用图标，当前使用字母占位。</p>':''}<details class="monitor-details"><summary>判断范围</summary><p>计划与产品摘要由已读取的资料整理，保留来源版本。新代码、新评论和检查结果可以自动读取；当前没有连接大模型，不自动理解任意评论、批准发布或修改仓库。</p>${(p.snapshot?.warnings||p.evidenceLimitations||[]).map(w=>`<p>${esc(w)}</p>`).join('')}</details>`,footer:`${btn('关闭','close')}${btn(ui.busy.has(p.id)?'读取中…':'刷新 GitHub','sync',{cls:'primary',icon:'refresh',attrs:`data-id="${esc(p.id)}" ${ui.busy.has(p.id)?'disabled':''}`})}`};}
  if(o.type==='settings')return {title:'个人工作台',body:`<div class="settings-list"><button data-action="export">${ico('download')}<span>导出工作台数据<small>包含关注设置、项目资料与处理记录</small></span>${ico('chevron')}</button><button data-action="monitor">${ico('eye')}<span>关注与读取设置</span>${ico('chevron')}</button><a href="/personal-v1.html">${ico('clock')}<span>打开上一版个人工作台<small>原有个人数据保留在原入口</small></span>${ico('external')}</a></div><p class="form-hint">数据保存在当前浏览器。当前没有账号同步、云端备份或导入恢复。</p>`,footer:btn('完成','close',{cls:'primary'})};
  if(o.type==='new-project')return {title:'添加项目',body:`<form id="project-form">${field('GitHub 仓库','repo','','owner/repository 或仓库链接',true)}${field('项目名称','name','','留空使用仓库名称')}<label class="checkbox-field"><input type="checkbox" name="watching" checked/>加入关注</label><p class="form-hint">当前支持公开仓库。先添加卡片，刷新后取得真实开发记录。</p></form>`,footer:`${btn('取消','close')}<button class="button primary" form="project-form" type="submit">添加项目</button>`};
  if(o.type==='note'){const n=(p.notes||[]).find(x=>x.id===o.noteId);return {title:n?'编辑资料':'添加资料',body:`<form id="note-form" data-id="${esc(p.id)}" data-note="${esc(n?.id||'')}">${projectSelect(p.id)}${field('标题','title',n?.title||'','给这份资料起个名字',true)}${area('内容','text',n?.text||'','想法、参考或下一次开发的要求')}${field('链接','url',n?.url||'','https://')}${n?.url?link('打开链接',n.url):''}</form>`,footer:`${btn('取消','close')}<button class="button primary" form="note-form" type="submit">保存</button>`};}
  if(o.type==='task'){const t=(p.tasks||[]).find(x=>x.id===o.taskId);return {title:t?'编辑下一步':'我的下一步',body:`<form id="task-form" data-id="${esc(p.id)}" data-task="${esc(t?.id||'')}">${field('要做什么','title',t?.title||'','一件具体的事',true)}</form>`,footer:`${btn('取消','close')}<button class="button primary" form="task-form" type="submit">保存</button>`};}
  if(o.type==='decision'){const a=(summary(p).attention||[]).find(x=>(x.key||x.id)===o.key);return {title:'记下处理结果',body:`<form id="decision-form" data-id="${esc(p.id)}" data-key="${esc(o.key)}"><div class="decision-context"><strong>${esc(a?.title||'来源事项')}</strong>${a?.sourceUrl?link('查看原始事项',a.sourceUrl):''}</div>${area('处理结果或决定','note','','写下你的决定，以及后续应做什么')}<p class="form-hint">保存在工作台，不会替你批准发布或修改 GitHub。来源更新后需要重新核对。</p></form>`,footer:`${btn('取消','close')}<button class="button primary" form="decision-form" type="submit">保存处理记录</button>`};}
  return null;
}
function overlay(){const d=dialogContent();return d?`<div class="overlay" data-action="backdrop"><section class="dialog ${d.wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-heading"><h2 id="dialog-title">${esc(d.title)}</h2>${ibtn('close','close','关闭')}</div><div class="dialog-body">${d.body}</div><div class="dialog-footer">${d.footer}</div></section></div>`:'';}
function render(){
  app.innerHTML=`${sidebar()}${ui.nav?'<button class="nav-backdrop" data-action="nav" aria-label="关闭导航"></button>':''}<div class="main-shell">${topbar()}<main id="workspace-main">${ui.view==='project'&&project()?projectView():ui.view==='attention'?attentionView():ui.view==='notes'?notesView():projectsView()}</main></div>${overlay()}`;
  document.body.classList.toggle('has-overlay',Boolean(ui.overlay));
  document.querySelectorAll('button').forEach((b,i)=>{b.dataset.focusKey=[b.dataset.action,b.dataset.id,b.dataset.key,b.dataset.tab,b.dataset.note,b.dataset.task,b.dataset.filter,i].filter(Boolean).join(':');});
}
async function syncOne(id,automatic=false){
  const p=project(id);if(!p||ui.busy.has(id))return;
  if(Date.now()<cooldownUntil){if(!automatic)notify(`读取额度正在恢复，请在 ${date(new Date(cooldownUntil).toISOString())} 后重试。`,true);return;}
  if(!automatic&&Date.now()-lastNetworkAt<10000){notify('刚刚已经读取过，请稍等几秒。');return;}
  lastNetworkAt=Date.now();lastAutoAt=Date.now();ui.busy.add(id);delete ui.errors[id];
  const controller=new AbortController();const token=uid('read');requests.set(id,{controller,token,repo:p.repo});
  if(!ui.overlay)render();
  try{
    const snapshot=await fetchWatchSnapshot(p.repo,{signal:controller.signal,previous:p.snapshot,trackedPr:p.trackedPr,sourceRef:p.sourceRef,planPath:p.planPath,commentIssue:p.commentIssue});
    const request=requests.get(id);if(!request||request.token!==token)return;
    refreshStorage();const activeProject=project(id);
    if(!activeProject||['repo','trackedPr','commentIssue','sourceRef','planPath'].some(key=>(activeProject[key]??null)!==(p[key]??null)))return;
    const before=state;state=applyWatchSnapshot(state,id,snapshot);if(!persist()){state=before;throw Error('读取已完成，但浏览器保存失败；已保留原状态，请先导出。');}
    if(snapshot.rateLimit?.remaining!==null&&snapshot.rateLimit?.remaining<12)cooldownUntil=Date.parse(snapshot.rateLimit.resetAt)||Date.now()+3600000;
    if(!automatic)notify(`${p.name||p.title} 已读取最新 GitHub 记录`);
  }catch(error){if(error.name!=='AbortError'){ui.errors[id]=error.message;if(error.code==='RATE_LIMITED')cooldownUntil=Date.parse(error.resetAt)||Date.now()+(error.retryAfterSeconds||600)*1000;if(!automatic)notify(error.message,true);}}
  finally{if(requests.get(id)?.token===token){ui.busy.delete(id);requests.delete(id);}if(!ui.overlay||['source','monitor'].includes(ui.overlay.type))render();else ui.deferred=true;}
}
function autoTick(){
  const latestRead=Math.max(0,...state.projects.map(p=>Date.parse(p.snapshot?.fetchedAt)||0));
  if(!state.monitor.enabled||document.hidden||ui.busy.size||Date.now()-Math.max(lastAutoAt,latestRead)<600000||Date.now()<cooldownUntil)return;
  const rows=watched().slice().sort((a,b)=>Date.parse(a.snapshot?.fetchedAt||a.observedAt||0)-Date.parse(b.snapshot?.fetchedAt||b.observedAt||0));
  if(rows.length)syncOne(rows[0].id,true);
}
document.addEventListener('click',event=>{
  const target=event.target.closest('[data-action]');if(!target)return;
  const action=target.dataset.action;const id=target.dataset.id||ui.projectId;
  if(action==='backdrop'&&event.target!==target)return;
  if(action==='home'){ui.query='';go('projects');}
  else if(action==='attention')go('attention');
  else if(action==='notes')go('notes');
  else if(action==='nav'){ui.nav=!ui.nav;render();}
  else if(action==='open-project')go('project',id);
  else if(action==='open-attention'){go('project',id);requestAnimationFrame(()=>document.querySelector('.needs-panel')?.scrollIntoView({block:'nearest',behavior:'smooth'}));}
  else if(action==='tab')go('project',ui.projectId,target.dataset.tab);
  else if(action==='filter'){ui.filter=target.dataset.filter;render();}
  else if(action==='history-filter'){ui.historyFilter=target.dataset.filter;render();}
  else if(action==='toggle-watch')change(s=>toggleWatch(s,id),'',false);
  else if(action==='monitor')openOverlay('monitor');
  else if(action==='monitor-toggle'){
    if(!watched().length){notify('先选择至少一个项目');return;}
    const enabled=!state.monitor.enabled;
    if(change(s=>setMonitor(s,enabled),enabled?'已开启前台跟进':'已暂停监控',false)&&enabled){lastAutoAt=0;autoTick();}
  }
  else if(action==='source')openOverlay('source',{projectId:id});
  else if(action==='sync')syncOne(id);
  else if(action==='settings')openOverlay('settings');
  else if(action==='new-project')openOverlay('new-project');
  else if(action==='new-note'||action==='edit-note')openOverlay('note',{projectId:id||state.projects[0].id,noteId:target.dataset.note});
  else if(action==='new-task'||action==='edit-task')openOverlay('task',{projectId:id,taskId:target.dataset.task});
  else if(action==='decision')openOverlay('decision',{projectId:id,key:target.dataset.key});
  else if(action==='toggle-task')change(s=>{const n=structuredClone(s);const t=n.projects.find(x=>x.id===id).tasks.find(x=>x.id===target.dataset.task);t.done=!t.done;return n;});
  else if(action==='close'||action==='backdrop')closeOverlay();
  else if(action==='export'){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='project-workspace-watch.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);notify('已导出当前工作台');
  }
});
document.addEventListener('input',event=>{
  if(event.target.id==='project-search'){ui.query=event.target.value;const start=event.target.selectionStart;render();const input=document.querySelector('#project-search');input.focus();input.setSelectionRange(start,start);}
});
document.addEventListener('change',event=>{
  if(event.target.id==='project-sort'){ui.sort=event.target.value;render();}
  else if(event.target.id==='plan-version'){ui.compareIndex=Number(event.target.value);render();}
  else if(event.target.id==='tracked-source'){
    const id=event.target.dataset.id,value=event.target.value;
    requests.get(id)?.controller.abort();requests.delete(id);ui.busy.delete(id);
    change(s=>{const n=structuredClone(s);const p=n.projects.find(x=>x.id===id);const pull=p.snapshot?.pullRequests?.find(pr=>String(pr.number)===value);p.trackedPr=pull?.number||null;p.commentIssue=pull?.number||p.primaryPullNumber||null;p.sourceRef=pull?.branch||p.snapshot?.repository?.defaultBranch||'main';p.planNeedsReview=true;return n;},'已更换开发线，原计划结论待复核',false);
  }
  else if(event.target.dataset.watch)change(s=>toggleWatch(s,event.target.dataset.watch),'',false);
});
document.addEventListener('submit',event=>{
  const form=event.target;if(!['project-form','note-form','task-form','decision-form'].includes(form.id))return;
  event.preventDefault();const data=Object.fromEntries(new FormData(form));
  try{
    if(form.id==='project-form'){
      const repo=parseWatchRepo(data.repo);if(state.projects.some(p=>p.repo.toLowerCase()===repo.toLowerCase()))throw Error('这个项目已经在工作台里。');
      const seed={id:uid('project'),name:String(data.name||repo.split('/')[1]).trim(),repo,sourceRef:'main',watching:Boolean(data.watching),observedAt:null,phase:{label:'待了解'},plan:{title:'待补充开发计划',items:[]},rounds:[],attention:[],notes:[],tasks:[]};
      change(s=>({...s,projects:[...s.projects,...createWatchState([seed]).projects]}),'项目已添加');
    }
    if(form.id==='note-form'){
      const title=String(data.title||'').trim();if(!title)throw Error('请填写资料标题');const url=data.url?safeUrl(data.url):'';if(data.url&&!url)throw Error('请填写有效的网页链接');
      change(s=>{const n=structuredClone(s);const original=n.projects.find(p=>p.id===form.dataset.id);const dest=n.projects.find(p=>p.id===data.projectId);const old=(original.notes||[]).find(x=>x.id===form.dataset.note);if(old)original.notes=original.notes.filter(x=>x.id!==old.id);dest.notes||=[];dest.notes.unshift({id:old?.id||uid('note'),title,text:String(data.text||'').trim(),url,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});return n;},'资料已保存');
    }
    if(form.id==='task-form'){
      const title=String(data.title||'').trim();if(!title)throw Error('请写下一步要做什么');
      change(s=>{const n=structuredClone(s);const p=n.projects.find(p=>p.id===form.dataset.id);p.tasks||=[];const old=p.tasks.find(t=>t.id===form.dataset.task);if(old)old.title=title;else p.tasks.push({id:uid('task'),title,done:false,createdAt:new Date().toISOString()});return n;},'下一步已保存');
    }
    if(form.id==='decision-form'){
      const note=String(data.note||'').trim();if(!note)throw Error('请写下处理结果');
      change(s=>resolveAttention(s,form.dataset.id,form.dataset.key,note),'处理结果已记录，GitHub 未被修改');
    }
  }catch(error){notify(error.message,true);}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){if(ui.overlay)closeOverlay();else if(ui.nav){ui.nav=false;render();}}
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(ui.view!=='projects')go('projects');requestAnimationFrame(()=>document.querySelector('#project-search')?.focus());}
  if(event.key==='Tab'&&ui.overlay){const nodes=[...document.querySelectorAll('.dialog button:not([disabled]),.dialog input,.dialog select,.dialog textarea,.dialog a[href],.dialog summary')].filter(n=>n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
});
window.addEventListener('hashchange',route);
window.addEventListener('storage',event=>{if(event.key!==storageKey)return;try{refreshStorage();if(!ui.overlay)render();}catch(error){notify(error.message,true);}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)autoTick();});
window.addEventListener('pagehide',()=>{for(const request of requests.values())request.controller.abort();});
setInterval(autoTick,30000);
route();
if(storageProblem)notify('浏览器存储不可用，请及时导出。',true);
