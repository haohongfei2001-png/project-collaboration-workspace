import { watchChecksFor } from './watch-domain.js';
import { createWorkspaceClient, normalizeProject, normalizePlan, normalizeEvidence, serverSummary, projectHealth, claimSources, mergeProjectDetail } from './watch-api.js';

const app = document.querySelector('#app');
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
const kindNames = {blocked:'有阻塞',failure:'检查失败',approval:'待批准',decision:'待决定',verify:'待验证',review:'待复核',unverified:'待验证',confirmation:'待确认',connection:'后台连接'};
const statusNames = {done:'已完成',active:'进行中',blocked:'有阻塞',todo:'待开始',unknown:'待确认'};
let state={version:4,projects:[],monitor:{enabled:false}};
const server={loading:true,configured:false,user:null,csrf:'',capabilities:{},setupIssues:[],monitor:{},error:'',settings:null,repositories:[],epoch:0,lastPoll:0,polling:false};
const api=createWorkspaceClient({getCsrf:()=>server.csrf});
const ui={view:'projects',projectId:null,tab:'overview',filter:'all',sort:'default',query:'',overlay:null,nav:false,historyFilter:'all',compareIndex:0,returnFocus:null,busy:new Set(),errors:{},deferred:false,evidenceBodies:new Map()};
let toastTimer;
const project=id=>state.projects.find(p=>p.id===(id||ui.projectId));
const health=p=>projectHealth(p,{aiConfigured:Boolean(server.capabilities.ai)});
const summary=p=>{const s=serverSummary(p),h=health(p);if(h?.needsAttention)s.attention.push({id:'connection:'+p.id,key:'connection:'+p.id,kind:'connection',title:h.label,detail:h.detail,actionable:false});return s;};
const watched=()=>state.projects.filter(p=>p.watching);
const allAttention=()=>state.projects.flatMap(p=>(summary(p).attention||[]).map(a=>({...a,projectId:p.id,projectName:p.name||p.title})));
function notify(text,error=false){const node=document.querySelector('#toast');node.textContent=text;node.className=`visible ${error?'is-error':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.className='',4200);}
function route(){
  const parts=location.hash.replace(/^#\/?/,'').split('/');
  if(parts[0]==='project'&&project(parts[1])){ui.view='project';ui.projectId=parts[1];ui.tab=['overview','history','plan','notes'].includes(parts[2])?parts[2]:'overview';}
  else{ui.view=['projects','attention','notes'].includes(parts[0])?parts[0]:'projects';ui.projectId=null;}
  ui.overlay=null;ui.nav=false;render();if(ui.projectId)loadProjectDetail(ui.projectId);
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
  <div class="sidebar-bottom"><button class="connection-status" data-action="monitor"><span class="status-dot ${state.monitor.enabled?'running':''}"></span><span>${esc(monitorLabel())}</span>${ico('settings')}</button><button class="account" data-action="settings"><span class="avatar">${esc((server.user?.login||'·').slice(0,1).toUpperCase())}</span><span>${esc(server.user?.login||'尚未登录')}<small>个人工作台</small></span>${ico('settings')}</button></div></aside>`;
}
function topbar(){const p=project();return `<header class="topbar">${ibtn('menu','nav','打开导航')}<div class="breadcrumbs"><button data-action="home">项目</button>${p?`${ico('chevron')}<span>${esc(p.name||p.title)}</span>`:ui.view==='attention'?`${ico('chevron')}<span>需关注</span>`:ui.view==='notes'?`${ico('chevron')}<span>资料</span>`:''}</div><div class="topbar-right">${btn(state.monitor.enabled?'关注中':'选择关注','monitor',{cls:'quiet monitor-trigger',icon:'eye'})}${ibtn('plus','new-project','添加项目')}</div></header>`;}
function progress(p,s,compact=false){
  const progress=s.progress||{},counted=Number.isInteger(progress.total)&&progress.total>0&&Number.isInteger(progress.done);
  const label=progress.known?`${progress.percent}%`:counted?`${progress.done} / ${progress.total}`:'未量化';
  const name=progress.needsReview?'上次计划':'当前计划';
  return `<div class="progress-block ${compact?'compact':''}"><div class="progress-meta"><span>${name}</span><strong>${esc(label)}</strong></div><div class="progress-track ${progress.known?'quantified':'unknown'}" role="img" aria-label="${esc(`${name}，${label}${progress.needsReview?'，待复核':''}`)}">${progress.known?`<progress class="server-progress" max="100" value="${progress.percent}" aria-label="计划进度 ${progress.percent}%"></progress>`:'<span></span><span></span><span></span><span></span>'}</div></div>`;
}
function phaseTag(p,s){return `<span class="phase-tag ${esc(p.phase?.key||'neutral')}"><i></i>${esc(s.phase?.needsReview?'阶段待复核':s.phase?.label||p.phase?.label||'待确认')}</span>`;}
function projectCard(p){
  const s=summary(p),h=health(p),count=s.attention.filter(a=>a.kind!=='connection').length;
  const alert=count?`<button class="card-alert" data-action="open-attention" data-id="${esc(p.id)}">${ico('alert')}<span>${count} 项需关注</span></button>`:'';
  const status=h?`<button class="r2-card-health ${h.tone}" data-action="source" data-id="${esc(p.id)}" title="${esc(h.detail)}" aria-label="${esc(h.label)}，查看来源与恢复操作">${ico(h.tone==='waiting'?'clock':'alert')}<span>${esc(h.label)}</span></button>`:alert||`<span class="card-quiet">${ico('check')}${s.resolvedAttention?.length?`已记录 ${s.resolvedAttention.length} 项`:p.analysis?'暂无明确待办':'等待分析'}</span>`;
  const time=`<span class="card-time ${ui.errors[p.id]?'error-text':s.stale?'is-stale':''}" title="${esc(ui.errors[p.id]||`读取于 ${date(s.lastSyncedAt||p.observedAt)}`)}">${ui.busy.has(p.id)?'读取中…':ui.errors[p.id]?'读取失败':age(s.lastSyncedAt||p.observedAt)}</span>`;
  return `<article class="project-card ${p.watching?'watched':''}" data-project-card="${esc(p.id)}"><button class="card-main" data-action="open-project" data-id="${esc(p.id)}" aria-label="打开 ${esc(p.name||p.title)}">${appIcon(p)}<h2>${esc(p.name||p.title)}</h2>${phaseTag(p,s)}${progress(p,s,true)}</button><button class="watch-button ${p.watching?'selected':''}" data-action="toggle-watch" data-id="${esc(p.id)}" aria-label="${p.watching?'取消关注':'关注'} ${esc(p.name||p.title)}" title="${p.watching?'取消关注':'关注这个项目'}" aria-pressed="${p.watching}">${ico('eye')}</button><div class="card-footer ${h?'r2-health-footer':''}">${status}${h&&count?alert:time}</div></article>`;
}
function projectsView(){
  let rows=state.projects.filter(p=>(ui.filter!=='watching'||p.watching)&&(ui.filter!=='attention'||summary(p).attention?.length)&&(!ui.query||(p.name||p.title).toLowerCase().includes(ui.query.toLowerCase())||p.repo.toLowerCase().includes(ui.query.toLowerCase())));
  if(ui.sort==='name')rows.sort((a,b)=>(a.name||a.title).localeCompare(b.name||b.title));
  if(ui.sort==='recent')rows.sort((a,b)=>Date.parse(b.snapshot?.fetchedAt||b.observedAt)-Date.parse(a.snapshot?.fetchedAt||a.observedAt));
  if(ui.sort==='attention')rows.sort((a,b)=>(summary(b).attention?.length||0)-(summary(a).attention?.length||0));
  const count=state.projects.filter(p=>summary(p).attention?.length).length;
  return `<section class="workspace-page"><div class="page-heading"><h1>项目</h1><div class="heading-tools"><label class="search-field">${ico('search')}<input id="project-search" aria-label="搜索项目" placeholder="搜索项目" value="${esc(ui.query)}" autocomplete="off"/><kbd>⌘ K</kbd></label>${ibtn('plus','new-project','添加项目')}</div></div>
  <div class="project-toolbar"><div class="filter-tabs" role="tablist" aria-label="项目筛选">${[['all','全部',state.projects.length],['watching','正在关注',watched().length],['attention','需关注',count]].map(([id,label,n])=>`<button role="tab" aria-selected="${ui.filter===id}" class="${ui.filter===id?'selected':''}" data-action="filter" data-filter="${id}">${label}<span>${n}</span></button>`).join('')}</div><label class="sort-control"><span class="sr-only">排列方式</span><select id="project-sort" aria-label="排列方式"><option value="default" ${ui.sort==='default'?'selected':''}>项目顺序</option><option value="recent" ${ui.sort==='recent'?'selected':''}>最近读取</option><option value="attention" ${ui.sort==='attention'?'selected':''}>需关注优先</option><option value="name" ${ui.sort==='name'?'selected':''}>项目名称</option></select>${ico('down')}</label></div>
  <div class="project-grid">${rows.map(projectCard).join('')}</div>${rows.length?'':`<div class="empty-state">${ico('search')}<h2>没有找到项目</h2><p>换个名字，或添加一个 GitHub 仓库。</p>${btn('添加项目','new-project',{icon:'plus'})}</div>`}
  <footer class="workspace-footer"><span>${ico('github')}来自你的真实 GitHub 项目</span><button data-action="monitor">${esc(monitorLabel())}${ico('arrow')}</button></footer></section>`;
}
function attentionIcon(kind){return ['approval','confirmation'].includes(kind)?'lock':kind==='decision'?'decision':['verify','review','unverified'].includes(kind)?'circle':'alert';}
function attentionItem(p,a,compact=false){return `<article class="attention-item ${compact?'compact':''}"><span class="attention-symbol ${esc(a.kind)}">${ico(attentionIcon(a.kind))}</span><div class="attention-body"><div class="attention-title"><h3>${esc(a.title)}</h3><span>${esc(kindNames[a.kind]||'需关注')}</span></div>${a.detail?`<p>${esc(a.detail)}</p>`:''}<div class="attention-actions">${a.kind==='connection'?btn('查看连接与恢复','source',{cls:'text-button',attrs:`data-id="${esc(p.id)}"`}):link('查看依据',a.sourceUrl)}${a.actionable===false?'':btn('记下处理结果','decision',{cls:'text-button',attrs:`data-id="${esc(p.id)}" data-key="${esc(a.key||a.id)}"`})}</div></div></article>`;}
function attentionView(){const list=allAttention();const decisions=list.filter(a=>['approval','decision','confirmation'].includes(a.kind));return `<section class="workspace-page"><div class="page-heading"><h1>需关注 <span class="heading-count">${list.length}</span></h1>${btn('选择项目','monitor',{cls:'quiet',icon:'eye'})}</div><div class="attention-summary"><span>${ico('alert')}开发与连接提醒 <b>${list.length-decisions.length}</b></span><span>${ico('decision')}批准或决策事项 <b>${decisions.length}</b></span></div>${state.projects.map(p=>{const items=summary(p).attention||[];return items.length?`<section class="attention-group"><button class="group-project" data-action="open-project" data-id="${esc(p.id)}">${appIcon(p,'small')}<h2>${esc(p.name||p.title)}</h2>${ico('chevron')}</button><div class="attention-list">${items.map(a=>attentionItem(p,a)).join('')}</div></section>`:'';}).join('')||'<div class="empty-state"><h2>没有新的待处理项</h2><p>没有新提交，不会被自动判断为卡住。</p></div>'}</section>`;}
function sourceStrip(p,s){const h=health(p),label=ui.errors[p.id]?'工作台读取失败':ui.busy.has(p.id)?'正在提交后台同步':h?.label||`GitHub · ${date(s.lastSyncedAt||p.observedAt)}`;return `<button class="source-strip r2-source-strip ${h?.tone||''}" data-action="source" data-id="${esc(p.id)}" title="${esc(ui.errors[p.id]||h?.detail||`最近同步 ${date(s.lastSyncedAt||p.observedAt)}`)}"><span class="status-dot ${ui.errors[p.id]||h?.tone==='error'?'failed':ui.busy.has(p.id)?'running':h?.tone==='warning'?'r2-warning':''}"></span><span>${esc(label)}</span>${ico('chevron')}</button>`;}
function listBits(items,kind){return (items||[]).slice(0,4).map(item=>`<li>${ico(kind==='done'?'check':kind==='failed'?'error':'arrow')}<span>${esc(typeof item==='object'?item.title||item.text:item)}</span></li>`).join('');}
function currentOverview(p,s){return serverOverview(p,s);}
function checksText(p,s){
  const checks=s.checks?.length?s.checks:[watchChecksFor(p.headSha,p.snapshot?.workflowRuns||[])];
  const candidate=Array.isArray(checks)?checks.find(c=>c.state==='failure')||checks.find(c=>c.state==='pending')||checks[0]:checks;
  const value=typeof candidate==='string'?candidate:candidate?.state||candidate?.status;
  if(value==='failure')return {text:'有检查未通过',tone:'failure',icon:'error'};
  if(value==='pending')return {text:'检查运行中',tone:'pending',icon:'clock'};
  if(value==='success')return {text:'已读取的检查通过',tone:'success',icon:'check'};
  const rows=(p.workflows||[]).filter(r=>(r.headSha||r.head_sha)===p.headSha);
  if(!p.snapshot&&rows.length&&rows.every(r=>r.conclusion==='success'))return {text:'当前版本检查通过',tone:'success',icon:'check'};
  return {text:'检查依据不足',tone:'neutral',icon:'circle'};
}
function taskSection(p){return `<section class="next-tasks"><div class="panel-heading"><h2>我的下一步</h2>${ibtn('plus','new-task','添加下一步',`data-id="${esc(p.id)}"`)}</div>${(p.tasks||[]).length?`<div class="task-list">${p.tasks.map(t=>`<div class="task-item ${t.done?'done':''}"><button class="task-check" data-action="toggle-task" data-id="${esc(p.id)}" data-task="${esc(t.id)}" aria-label="${t.done?'恢复':'完成'} ${esc(t.title)}" aria-pressed="${Boolean(t.done)}">${ico(t.done?'check':'circle')}</button><button class="task-text" data-action="edit-task" data-id="${esc(p.id)}" data-task="${esc(t.id)}">${esc(t.title)}</button></div>`).join('')}</div>`:`<button class="add-inline" data-action="new-task" data-id="${esc(p.id)}">${ico('plus')}记下一件自己要做的事</button>`}</section>`;}
function roundsOf(p){return (p.rounds||[]).slice().sort((a,b)=>Date.parse(b.date||b.at||b.updatedAt||0)-Date.parse(a.date||a.at||a.updatedAt||0));}
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
function historyView(p,s){return serverHistory(p,s);}
function localRecords(s){return s.resolvedAttention?.length?`<details class="local-records"><summary>我的处理记录 · ${s.resolvedAttention.length}</summary>${s.resolvedAttention.map(a=>`<article><h3>${esc(a.title)}</h3><p>${esc(a.resolution?.note)}</p><small>${date(a.resolution?.at)} · 仅记录在工作台</small>${link('原始依据',a.sourceUrl)}</article>`).join('')}</details>`:'';}
function rawPlan(document){
  const p=project(),cached=p?ui.evidenceBodies.get(`${p.id}:${document.id}`):null;
  if(p&&(document.data?._bodyAvailable||document.data?._bodyTruncated||cached))return `<section class="raw-plan"><h4>${esc(document.path||'开发计划原文')}</h4>${evidenceBody(document,p)}${link('打开确切版本',document.sourceUrl)}</section>`;
  return `<details class="raw-plan"><summary>${ico('note')}计划原文 · ${esc(document.path||'来源文件')}</summary><div>${link('打开确切版本',document.sourceUrl)}${document.content?`<pre>${esc(document.content.slice(0,16000))}</pre>${document.content.length>16000?'<p>这里显示前 16,000 字符，完整内容请打开来源。</p>':''}`:'<p>本次未取得完整正文，保留旧依据并等待复核。</p>'}</div></details>`;
}
function planItems(plan){return plan?.items?.length?plan.items:[...(plan?.done||[]).map((title,i)=>({id:`previous-done-${i}`,title,status:'done'})),...(plan?.remaining||[]).map((title,i)=>({id:`previous-pending-${i}`,title,status:'todo'}))];}
function planList(plan){return `<div class="plan-items">${planItems(plan).map(item=>`<div class="plan-item ${esc(item.status)}"><span class="item-status">${ico(item.status==='done'?'check':item.status==='blocked'?'error':item.status==='active'?'play':'circle')}</span><div><span>${esc(item.title)}</span><small>${esc(statusNames[item.status]||'待确认')}</small></div>${item.sourceUrl?link('依据',item.sourceUrl):''}</div>`).join('')||'<p class="plan-empty">来源还没有明确的计划项。</p>'}</div>`;}
function planView(p,s){const previous=p.previousPlans?.[ui.compareIndex]||p.previousPlans?.[0];return `<section class="plan-view"><div class="section-heading"><div><h2>开发计划</h2><p>${esc(s.progress?.known?'完整范围已明确，进度按计划项计算。':'当前计划项可以追踪；完整产品范围尚未量化。')}</p></div>${p.previousPlans?.length>1?`<label class="sort-control"><select id="plan-version" aria-label="选择之前的计划">${p.previousPlans.map((v,i)=>`<option value="${i}" ${i===ui.compareIndex?'selected':''}>${esc(v.title)}</option>`).join('')}</select>${ico('down')}</label>`:''}</div>${s.progress?.needsReview?`<div class="source-notice">${ico('alert')}来源版本已变化，以下整理保留为上一份依据，不能直接当作新版本已完成。</div>`:''}<div class="plan-comparison"><article class="plan-sheet current"><div class="plan-version"><span class="version-dot"></span>当前计划${p.plan?.ref?`<code>${esc(p.plan.ref.slice(0,7))}</code>`:''}</div><h3>${esc(p.plan?.title||'还没有开发计划')}</h3>${planList(p.plan)}<div class="plan-sheet-footer">${link('打开原计划',p.plan?.sourceUrl)}</div></article><article class="plan-sheet previous"><div class="plan-version">${ico('clock')}之前的计划${previous?.date?`<span>${date(previous.date,true)}</span>`:''}</div><h3>${esc(previous?.title||previous?.path||'尚无较早的计划快照')}</h3>${previous?`${previous.summary?`<p class="plan-summary">${esc(previous.summary)}</p>`:''}${previous.content||previous.data?._bodyAvailable||previous.data?._bodyTruncated?rawPlan(previous):planList(previous)}`:'<p class="plan-empty">后续读到计划变更时，保留原版本供比较。</p>'}${previous?`<div class="plan-sheet-footer">${link('打开当时的依据',previous.sourceUrl)}</div>`:''}</article></div>${p.plan?.content||p.plan?.data?._bodyAvailable||p.plan?.data?._bodyTruncated?rawPlan(p.plan):p.snapshot?.planDocument?rawPlan(p.snapshot.planDocument):''}${p.parallelCandidate?`<div class="parallel-candidate"><span>${ico('code')}并行开发</span><strong>${esc(p.parallelCandidate.title)}</strong><small>${esc(p.parallelCandidate.phase)}</small>${link('查看候选',p.parallelCandidate.sourceUrl)}</div>`:''}</section>`;}
function noteCards(p){return (p.notes||[]).map(n=>`<article class="note-card"><button data-action="edit-note" data-id="${esc(p.id)}" data-note="${esc(n.id)}">${ico(n.url?'external':'note')}<h3>${esc(n.title)}</h3><p>${esc(n.text||n.url||'')}</p><small>${date(n.updatedAt||n.createdAt)}</small></button></article>`).join('');}
function notesView(p){const projects=p?[p]:state.projects.filter(x=>x.notes?.length);return `<section class="notes-view ${p?'':'workspace-page'}"><div class="section-heading"><h${p?'2':'1'}>资料</h${p?'2':'1'}>${btn('添加资料','new-note',{cls:'primary',icon:'plus',attrs:p?`data-id="${esc(p.id)}"`:''})}</div>${projects.map(item=>`${!p?`<h2 class="notes-project-name">${appIcon(item,'tiny')}${esc(item.name||item.title)}</h2>`:''}<div class="notes-grid">${noteCards(item)}${p?`<button class="add-note-card" data-action="new-note" data-id="${esc(p.id)}">${ico('plus')}保存文字或链接</button>`:''}</div>`).join('')||'<div class="empty-state"><h2>把资料放回项目里</h2><p>保存一条想法，或一个参考链接。</p></div>'}</section>`;}
function projectView(){const p=project();const s=summary(p);return `<section class="project-page"><div class="project-heading"><div class="project-identity">${appIcon(p,'large')}<div><h1>${esc(p.name||p.title)}</h1>${phaseTag(p,s)}</div></div><div class="project-actions">${btn(p.watching?'已关注':'关注项目','toggle-watch',{cls:p.watching?'watch-active':'',icon:'eye',attrs:`data-id="${esc(p.id)}"`})}${ibtn('refresh','sync','刷新项目状态',`data-id="${esc(p.id)}" ${ui.busy.has(p.id)?'disabled':''}`)}${ibtn('more','source','查看项目来源',`data-id="${esc(p.id)}"`)}</div></div><div class="project-tabs" role="tablist" aria-label="项目内容">${[['overview','开发概况'],['history','开发历史'],['plan','计划'],['notes','资料']].map(([id,label])=>`<button role="tab" aria-selected="${ui.tab===id}" class="${ui.tab===id?'active':''}" data-action="tab" data-tab="${id}">${label}</button>`).join('')}</div>${ui.tab==='overview'?currentOverview(p,s):ui.tab==='history'?historyView(p,s):ui.tab==='plan'?planView(p,s):notesView(p)}</section>`;}
function field(label,name,value='',placeholder='',required=false){return `<label class="field"><span>${esc(label)}</span><input name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="500" ${required?'required':''}/></label>`;}
function area(label,name,value='',placeholder=''){return `<label class="field"><span>${esc(label)}</span><textarea name="${name}" rows="4" maxlength="8000" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`;}
function projectSelect(id){return `<label class="field"><span>项目</span><select name="projectId">${state.projects.map(p=>`<option value="${esc(p.id)}" ${p.id===id?'selected':''}>${esc(p.name||p.title)}</option>`).join('')}</select></label>`;}
function dialogContent(){return serverDialog();}
function overlay(){const d=dialogContent();return d?`<div class="overlay" data-action="backdrop"><section class="dialog ${d.wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-heading"><h2 id="dialog-title">${esc(d.title)}</h2>${ibtn('close','close','关闭')}</div><div class="dialog-body">${d.body}</div><div class="dialog-footer">${d.footer}</div></section></div>`:'';}
function render(){
  const expanded=[...document.querySelectorAll('details[open][data-details-key]')].map(node=>node.dataset.detailsKey);
  app.innerHTML=`${sidebar()}${ui.nav?'<button class="nav-backdrop" data-action="nav" aria-label="关闭导航"></button>':''}<div class="main-shell">${topbar()}<main id="workspace-main">${server.loading||!server.user||!server.configured?setupView():`${server.error?`<div class="source-notice" role="status">${ico('alert')}${esc(server.error)}${btn('重试','reload',{cls:'text-button'})}</div>`:''}${ui.view==='project'&&project()?projectView():ui.view==='attention'?attentionView():ui.view==='notes'?notesView():projectsView()}`}</main></div>${overlay()}`;
  for(const key of expanded)document.querySelectorAll(`details[data-details-key="${CSS.escape(key)}"]`).forEach(details=>details.open=true);
  document.body.classList.toggle('has-overlay',Boolean(ui.overlay));
  document.querySelectorAll('button').forEach((b,i)=>{b.dataset.focusKey=[b.dataset.action,b.dataset.id,b.dataset.key,b.dataset.tab,b.dataset.note,b.dataset.task,b.dataset.filter,i].filter(Boolean).join(':');});
}

const claimNames={fact:'已验证事实',inference:'证据推断',unknown:'尚未确认',recommendation:'建议操作'};
const list=value=>Array.isArray(value)?value:[];
const claimText=value=>typeof value==='string'?value:value?.text||value?.title||value?.label||'';
function monitorLabel(){
  if(!server.configured)return '等待完成配置';
  if(!server.user)return '登录后开始跟进';
  if(!watched().length)return '尚未关注项目';
  if(server.monitor.schedulerHealthy===false)return '后台调度待检查';
  if(!server.monitor.lastWorkerAt)return '等待后台首次运行';
  return '后台持续跟进中';
}
function setupIssue(item){return typeof item==='string'?item:item?.message||[item?.title,item?.detail].filter(Boolean).join(' · ')||item?.label||item?.code||'配置待完成';}
function setupView(){
  if(server.loading)return `<section class="setup-view" aria-busy="true"><span class="setup-symbol">${ico('grid')}</span><h1>正在打开工作台</h1><p>读取你的项目和持续监控状态。</p><div class="setup-loading" aria-hidden="true"><i></i><i></i><i></i></div></section>`;
  const issues=list(server.setupIssues),configured=server.configured;
  return `<section class="setup-view"><span class="setup-symbol">${ico(configured?'github':'settings')}</span><div class="eyebrow">PROJECT WORKSPACE · R2</div><h1>${configured?'你的项目，一眼看清。':'工作台已准备好，连接尚待完成。'}</h1><p>${configured?'登录后选择需要跟进的仓库，开发记录和项目判断会保存在这里。':'完成下面的连接后，工作台才能持续读取并保存真实项目状态。'}</p>${server.error?`<div class="source-notice" role="alert">${ico('alert')}${esc(server.error)}</div>`:''}${issues.length?`<div class="setup-checklist">${issues.map(item=>`<div>${ico('circle')}<span>${esc(setupIssue(item))}</span></div>`).join('')}</div>`:''}<div class="setup-actions">${configured||server.capabilities.github?`<a class="button primary" href="/api/auth/start">${ico('github')}使用 GitHub 登录</a>`:''}${btn('重新检查','reload',{icon:'refresh'})}<a class="button quiet" href="/watch-v1.html">查看上一版原型${ico('external')}</a></div><p class="form-hint">${configured?'只读取你授权的仓库。':'当前没有正在运行的项目监控，也没有把历史示例当作实时数据。'}</p></section>`;
}
function sourceDetails(claim,p){
  const resolved=claimSources(claim,p);
  const sources=resolved.length?resolved:list(claim?.sources).map(s=>({...s,sourceUrl:s.sourceUrl||s.url}));
  const label=claimNames[claim?.classification]||'尚未确认';
  return `<details class="claim-sources" data-details-key="claim:${esc(p.id)}:${esc(p.renderContext||'current')}:${esc(claim?.id||'stage')}"><summary><span class="claim-type ${esc(claim?.classification||'unknown')}">${label}</span>${sources.length?`${sources.length} 项依据`:'未附可核验来源'}${claim?.pendingReview?'<span class="review-tag">待复核</span>':''}</summary><div>${sources.map(source=>`<article>${link(source.kind||source.label||'原始记录',source.sourceUrl)}<div class="evidence-meta">${source.sha?`<code title="${esc(source.sha)}">${esc(source.sha.slice(0,12))}</code>`:'<span>未绑定代码 SHA</span>'}<span>${date(source.occurredAt||source.observedAt)}</span>${source.observedAt?`<span title="服务端读取时间">读取 ${date(source.observedAt)}</span>`:''}</div>${evidenceBody(source,p)}</article>`).join('')||'<p>该判断仍需补齐来源，不能据此认定已经完成。</p>'}</div></details>`;
}
function claimItem(claim,p){const object=typeof claim==='object'?claim:{text:claim,classification:'unknown'};return `<li class="analysis-claim"><p>${esc(claimText(object))}</p>${sourceDetails(object,p)}</li>`;}
function claimSection(title,claims,p,empty=''){return `<section class="analysis-section"><h3>${esc(title)} <span>${list(claims).length}</span></h3>${list(claims).length?`<ul class="analysis-claims">${claims.map(c=>claimItem(c,p)).join('')}</ul>`:empty?`<p class="empty-detail">${esc(empty)}</p>`:''}</section>`;}
function connectionRecovery(p){
  const h=health(p);if(!h)return '';
  const controls={install:['重新连接 GitHub','github'],settings:['检查连接设置','settings'],sync:['重试同步','refresh'],'retry-analysis':['重新分析','spark']};
  const [label,icon]=controls[h.action]||controls.settings;
  return `<section class="r2-connection-issue ${h.tone}" aria-label="后台连接状态"><div>${ico(h.tone==='waiting'?'clock':'alert')}<strong>${esc(h.label)}</strong></div><p>${esc(h.detail)}</p>${h.code?`<code>${esc(h.code)}</code>`:''}${h.rawError?`<p>${esc(h.rawError)}</p>`:''}${btn(label,h.action,{cls:'text-button',icon,attrs:`data-id="${esc(p.id)}" ${ui.busy.has(p.id)||ui.busy.has('analysis:'+p.id)?'disabled':''}`})}</section>`;
}
function serverOverview(p,s){
  const a=p.analysis,attention=s.userActions||[],check=checksText(p,s),issue=health(p);
  const title=a?claimText(a.stage):'等待首次项目分析';
  return `<div class="project-overview"><div class="overview-primary"><section class="status-panel"><div class="panel-heading"><h2>当前进展</h2>${sourceStrip(p,s)}</div>${issue?`<div class="source-notice r2-status-notice ${issue.tone}">${ico(issue.tone==='waiting'?'clock':'alert')}<span>${esc(issue.detail)}</span>${btn('查看连接','source',{cls:'text-button',attrs:`data-id="${esc(p.id)}"`})}</div>`:''}${s.sourceChanged?`<div class="source-notice">${ico('clock')}收到了新证据，以下保留上次判断，等待重新分析。</div>`:''}<h3 class="project-conclusion">${esc(title)}</h3>${a?.stage?sourceDetails(a.stage,p):'<p class="empty-detail">事实正在积累；尚未形成经过来源约束的产品结论。</p>'}<div class="development-facts"><div><span>跟进来源</span><strong>${esc(p.trackedPr?`PR #${p.trackedPr}`:p.sourceRef||'main')}</strong></div><div><span>自动检查</span><strong class="checks-label ${check.tone}">${ico(check.icon)}${check.text}</strong></div><div><span>分析时间</span><strong>${date(p.analysisMeta?.createdAt||p.analysisMeta?.created_at||a?.analyzedAt)}</strong></div></div>${progress(p,s)}${a?.progress?.scope?`<p class="plan-caption">${esc(a.progress.scope)}</p>`:''}<button class="plan-caption" data-action="tab" data-tab="plan"><span>${esc(p.plan?.title||'开发计划与版本')}</span>${ico('chevron')}</button>${analysisRetryControl(p)}</section>
  ${a?`<div class="analysis-grid">${claimSection('这一轮完成',a.completed,p,'尚无有据可查的完成项')}${claimSection('尚未完成',a.incomplete,p)}${claimSection('失败与回退',a.failed,p)}${claimSection('当前阻塞',a.blockers,p)}${claimSection('等待验证',a.pendingVerification,p)}${claimSection('下一步',a.nextSteps,p)}</div>${a.changeReason?`<section class="analysis-section change-reason"><h3>这次判断为什么改变</h3><ul class="analysis-claims">${claimItem(a.changeReason,p)}</ul></section>`:''}${list(a.warnings).length?`<details class="source-warnings"><summary>覆盖范围与判断限制 · ${a.warnings.length}</summary>${a.warnings.map(w=>`<p>${esc(w)}</p>`).join('')}</details>`:''}`:`<div class="analysis-empty"><span>${ico('spark')}</span><h3>还没有 AI 判断</h3><p>${server.capabilities.ai?'同步完成后，后台会根据预算和事件重要性安排分析。':'添加模型连接并设置预算后，开始结合长期记录分析项目。'}</p>${btn(server.capabilities.ai?'刷新状态':'配置模型',server.capabilities.ai?'reload':'settings',{icon:server.capabilities.ai?'refresh':'settings'})}</div>`}
  ${taskSection(p)}</div><aside class="overview-aside"><section class="needs-panel"><div class="panel-heading"><h2>需要我处理</h2><span class="number-badge">${attention.length}</span></div>${attention.length?attention.map(item=>attentionItem(p,item,true)).join(''):`<div class="quiet-success">${ico('circle')}<p>没有明确的待处理请求</p></div>`}<div class="approval-note">${ico('decision')}<span>处理记录保存在工作台，GitHub 的批准、合并与发布仍由原流程完成。</span></div></section><section class="small-notes-panel"><div class="panel-heading"><h2>项目资料</h2>${ibtn('plus','new-note','添加资料',`data-id="${esc(p.id)}"`)}</div>${list(p.notes).slice(0,3).map(n=>`<button class="note-row" data-action="edit-note" data-id="${esc(p.id)}" data-note="${esc(n.id)}">${ico('note')}<span>${esc(n.title)}</span>${ico('chevron')}</button>`).join('')||`<button class="note-row muted" data-action="new-note" data-id="${esc(p.id)}">${ico('plus')}保存想法或参考资料</button>`}</section></aside></div>`;
}
function analysisHistoryCard(row,p){
  const a=row.analysis||row.result||row.output||row,id=row.id||a.inputHash||'';
  const at=row.createdAt||row.created_at||a.analyzedAt;
  p={...p,renderContext:id};
  return `<article class="development-round"><div class="round-marker ${list(a.failed).length?'has-issue':''}">${ico(list(a.failed).length?'error':'spark')}</div><div class="round-content"><div class="round-topline"><span>${date(at)}</span><span>${row.needsReview||row.needs_review||row.status==='needs_review'?'旧结论 · 待复核':'历史判断'}</span><code>${esc(String(id).slice(0,10))}</code></div><h3>${esc(claimText(a.stage)||'项目状态更新')}</h3>${a.changeReason?`<p class="history-reason">${esc(claimText(a.changeReason))}</p>`:''}<details class="history-analysis" data-details-key="analysis:${esc(p.id)}:${esc(id)}"><summary>本轮完成、失败与下一步</summary><div class="analysis-grid">${claimSection('完成',a.completed,p)}${claimSection('失败与回退',a.failed,p)}${claimSection('未完成',a.incomplete,p)}${claimSection('阻塞',a.blockers,p)}${claimSection('待验证',a.pendingVerification,p)}${claimSection('下一步',a.nextSteps,p)}</div></details></div></article>`;
}
function serverHistory(p,s){
  const from=ui.historyFrom?Date.parse(ui.historyFrom+'T00:00:00+08:00'):0,to=ui.historyTo?Date.parse(ui.historyTo+'T23:59:59+08:00'):Infinity;
  const matchesTime=value=>{const at=Date.parse(value||0);return (!from||at>=from)&&(!Number.isFinite(to)||at<=to);};
  const analyses=list(p.analyses).filter(row=>{const a=row.analysis||row.result||row.output||row;return matchesTime(row.createdAt||row.created_at||a.analyzedAt)&&(!ui.historyRound||String(row.id)===ui.historyRound)&&(ui.historyFilter==='all'||list(a.failed).length||list(a.blockers).length);});
  const rounds=roundsOf(p,s).filter(r=>matchesTime(r.date||r.at||r.updatedAt)&&(ui.historyFilter==='all'||list(r.failed).length||['blocked','failed','reverted'].includes(r.status)));
  const evidence=list(p.evidence).filter(e=>matchesTime(e.occurredAt||e.observedAt));
  const coverage=p.historyCoverage||{};
  return `<section class="history-view"><div class="section-heading"><div><h2>开发历史</h2><p>事实、判断和处理记录分别保留。</p></div><div class="segmented"><button class="${ui.historyFilter==='all'?'selected':''}" data-action="history-filter" data-filter="all">全部</button><button class="${ui.historyFilter==='issues'?'selected':''}" data-action="history-filter" data-filter="issues">失败与回退</button></div></div><div class="history-filters"><label>从<input type="date" id="history-from" value="${esc(ui.historyFrom||'')}"/></label><label>到<input type="date" id="history-to" value="${esc(ui.historyTo||'')}"/></label><label>开发轮次<select id="history-round"><option value="">全部轮次</option>${list(p.analyses).map(row=>`<option value="${esc(row.id)}" ${ui.historyRound===String(row.id)?'selected':''}>${date(row.createdAt||row.created_at)} · ${esc(claimText((row.analysis||row.result||row.output||row).stage).slice(0,30))}</option>`).join('')}</select></label></div>${p.previousPlans?.length?`<button class="plan-change-banner" data-action="tab" data-tab="plan">${ico('compare')}<span><strong>保留了 ${p.previousPlans.length+1} 个计划版本</strong><small>查看当前计划与旧计划的差异</small></span>${ico('chevron')}</button>`:''}<div class="history-timeline">${analyses.map(row=>analysisHistoryCard(row,p)).join('')}${!ui.historyRound?rounds.map(roundCard).join(''):''}${!analyses.length&&!rounds.length?'<div class="empty-state"><h3>没有符合条件的开发记录</h3></div>':''}</div>${evidence.length?`<details class="evidence-archive" data-details-key="archive:${esc(p.id)}"><summary>${ico('code')}原始事实记录 · ${evidence.length}</summary>${evidence.map(e=>`<article><div><strong>${esc(e.kind)}</strong><span>${date(e.occurredAt||e.observedAt)}</span>${e.sha?`<code>${esc(e.sha.slice(0,12))}</code>`:''}${link('GitHub 来源',e.sourceUrl)}</div>${evidenceBody(e,p)}</article>`).join('')}</details>`:''}${p.historyHasMore?`<div class="history-more">${btn('读取更早的记录','load-older',{icon:'clock',attrs:`data-id="${esc(p.id)}" ${ui.busy.has('history:'+p.id)?'disabled':''}`})}</div>`:''}${p.analysesHasMore?`<div class="history-more">${btn('读取更早的判断','load-older-analyses',{icon:'spark',attrs:`data-id="${esc(p.id)}" ${ui.busy.has('analyses:'+p.id)?'disabled':''}`})}</div>`:''}${localRecords(s)}</section>`;
}
function providerForm(existing={}){
  const cfg=existing.config||existing;
  return `<form id="provider-form" autocomplete="off"><input type="hidden" name="replaceId" value="${esc(existing.id||'')}"/><div class="field-row"><label class="field"><span>服务商</span><select name="provider" id="provider-kind"><option value="openai" ${cfg.provider==='openai'?'selected':''}>OpenAI</option><option value="bailian" ${cfg.provider==='bailian'?'selected':''}>阿里云百炼</option><option value="compatible" ${cfg.provider==='compatible'?'selected':''}>兼容接口</option></select></label>${field('模型','model',cfg.model||'','填写可用模型 ID',true)}</div><label class="field"><span>API Key${existing.id?' · 填写新密钥以替换':''}</span><input type="password" name="apiKey" required maxlength="2048" autocomplete="new-password" spellcheck="false" placeholder="密钥只发送到服务端"/></label>${field('API 地址（可选）','baseUrl',cfg.baseUrl||'','使用服务商默认地址')}<p class="form-hint">兼容接口须由服务端允许。密钥不会存入浏览器或在保存后回显。</p><div class="field-row"><label class="field"><span>月预算</span><input type="number" name="monthlyBudget" min="0" step="0.01" required value="${esc(cfg.monthlyBudget??0)}"/></label><label class="field"><span>记账币种</span><select name="currency"><option value="USD" ${cfg.currency==='USD'?'selected':''}>USD · 美元</option><option value="CNY" ${cfg.currency==='CNY'?'selected':''}>CNY · 人民币</option></select></label></div><div class="field-row"><label class="field"><span>每百万输入 Token 价格</span><input name="inputPricePerMillion" type="number" min="0" step="0.0001" required value="${esc(cfg.inputPricePerMillion??'')}"/></label><label class="field"><span>每百万输出 Token 价格</span><input name="outputPricePerMillion" type="number" min="0" step="0.0001" required value="${esc(cfg.outputPricePerMillion??'')}"/></label></div><label class="field"><span>单次最多输出 Token</span><input type="number" name="maxOutputTokens" min="256" max="8192" step="1" required value="${esc(cfg.maxOutputTokens??2048)}"/></label><p class="form-hint">请使用你的实际计费价格。预算为 0 时不启动自动分析；调用前预留费用，消费记录保留在服务端。</p></form>`;
}
function usageList(settings){const rows=list(settings?.usage);return rows.length?`<details class="usage-records"><summary>近期调用 · ${rows.length}</summary>${rows.slice(0,30).map(row=>`<article><div><strong>${esc(row.model||row.provider||'模型调用')}</strong><span>${esc(row.status||'已记录')}</span></div><small>${date(row.createdAt||row.created_at)} · ${esc(row.currency||'USD')} ${esc(row.cost??((row.costMicros||row.cost_micros||0)/1e6).toFixed(6))} · ${esc(row.inputTokens||row.input_tokens||row.usage?.inputTokens||0)} / ${esc(row.outputTokens||row.output_tokens||row.usage?.outputTokens||0)} Token</small></article>`).join('')}</details>`:'<p class="empty-detail">还没有模型消费记录。</p>';}
function serverDialog(){
  const o=ui.overlay;if(!o)return null;const p=project(o.projectId||o.id)||state.projects[0];
  if(o.type==='settings'){
    const settings=server.settings,providers=list(settings?.providers);
    return {title:'连接与模型',wide:true,body:`<div class="connection-card"><div>${ico('github')}<span><strong>${esc(server.user?.login||'尚未登录')}</strong><small>${esc(monitorLabel())}</small></span></div>${server.user?btn('连接 GitHub App','install',{icon:'plus'}):'<a class="button primary" href="/api/auth/start">使用 GitHub 登录</a>'}</div>${server.settingsLoading?'<p class="empty-detail" role="status">正在读取配置…</p>':''}${list(settings?.setupIssues||server.setupIssues).map(item=>`<p class="source-notice">${esc(setupIssue(item))}</p>`).join('')}<div class="panel-heading settings-heading"><h3>AI 分析</h3>${btn('添加模型','new-provider',{icon:'plus',attrs:server.user?'':'disabled'})}</div>${providers.length?providers.map(provider=>{const cfg=provider.config||provider;return `<article class="provider-card"><div><strong>${esc(cfg.model||cfg.provider)}</strong><span>${esc(cfg.provider)} · ${esc(({active:'密钥已验证',unverified:'待验证',revoked:'已撤销',cost_review:'费用待复核'})[provider.status]||(provider.verifiedAt?'密钥已验证':'待验证'))}</span></div><p>月预算 ${esc(cfg.currency||'USD')} ${esc(cfg.monthlyBudget??0)}${provider.revokedAt||provider.revoked_at||provider.status==='revoked'?' · 已撤销':''}</p><div class="provider-actions">${btn('验证','verify-provider',{cls:'text-button',attrs:`data-id="${esc(provider.id)}" ${provider.status==='revoked'?'disabled':''}`})}${btn('替换密钥与配置','replace-provider',{cls:'text-button',attrs:`data-id="${esc(provider.id)}"`})}${btn('撤销','revoke-provider',{cls:'text-button danger-text',attrs:`data-id="${esc(provider.id)}"`})}</div></article>`;}).join(''):'<div class="provider-empty"><span>'+ico('spark')+'</span><p>连接模型后，后台会结合计划、开发历史和新证据分析项目。</p></div>'}${budgetSummary(settings)}${usageList(settings)}<div class="settings-list"><button data-action="monitor">${ico('eye')}<span>关注与后台运行</span>${ico('chevron')}</button><a href="/watch-v1.html">${ico('clock')}<span>打开上一版原型<small>原有本地数据保留在原入口</small></span>${ico('external')}</a>${server.user?`<button data-action="logout">${ico('lock')}<span>退出登录</span>${ico('chevron')}</button>`:''}</div>`,footer:btn('完成','close',{cls:'primary'})};
  }
  if(o.type==='provider')return {title:o.provider?'替换模型连接':'添加模型连接',wide:true,body:providerForm(o.provider),footer:`${btn('取消','close')}<button class="button primary" form="provider-form" type="submit">保存到服务端</button>`};
  if(o.type==='new-project')return {title:'选择获准的仓库',wide:true,body:`<div class="repo-heading"><p>可选择 GitHub App 已获准读取的公开或私有仓库。</p>${btn('调整仓库授权','install',{cls:'text-button',icon:'github'})}</div>${server.reposLoading?'<p class="empty-detail" role="status">正在读取仓库…</p>':`<form id="project-form"><label class="field"><span>GitHub 仓库</span><select name="repository" required><option value="">选择一个仓库</option>${server.repositories.filter(repo=>!state.projects.some(p=>p.repo.toLowerCase()===(repo.full_name||repo.fullName||'').toLowerCase())).map((repo,i)=>`<option value="${esc(String(repo.id))}">${esc(repo.full_name||repo.fullName)}${repo.private?' · 私有':''}</option>`).join('')}</select></label><div class="field-row">${field('跟进 PR（可选）','trackedPr','','留空跟进默认分支')}${field('计划文件（可选）','planPath','','docs/DEVELOPMENT_PLAN.md')}</div><p class="form-hint">如果列表缺少仓库，先调整 GitHub App 的仓库授权，再重新读取。</p></form>`}`,footer:`${btn('重新读取','reload-repos',{icon:'refresh'})}<button class="button primary" form="project-form" type="submit" ${server.reposLoading?'disabled':''}>添加并关注</button>`};
  if(o.type==='monitor')return {title:'关注与后台运行',body:`<div class="monitor-state"><span class="status-dot ${server.monitor.schedulerHealthy?'running':''}"></span><span>${esc(monitorLabel())}</span></div><dl class="source-facts"><div><dt>后台最近运行</dt><dd>${date(server.monitor.lastWorkerAt)}</dd></div><div><dt>关注项目</dt><dd>${watched().length} 个</dd></div></dl>${server.monitor.message?`<p class="source-notice">${esc(server.monitor.message)}</p>`:''}<div class="monitor-projects">${state.projects.map(item=>`<label class="monitor-project">${appIcon(item,'small')}<span>${esc(item.name)}<small>${esc(summary(item).phase.label)}</small></span><input type="checkbox" data-watch="${esc(item.id)}" ${item.watching?'checked':''} aria-label="关注 ${esc(item.name)}"/></label>`).join('')||'<p class="empty-detail">先选择要监控的仓库。</p>'}</div><p class="form-hint">页面只读取后台保存的状态。GitHub 事件、补偿同步和分析由服务器处理；是否持续运行以这里的实际运行记录为准。</p>`,footer:`${btn('添加项目','new-project',{icon:'plus'})}${btn('完成','close',{cls:'primary'})}`};
  if(o.type==='source'&&p)return {title:`${p.name} · 来源与开发线`,wide:true,body:`<div class="source-identity">${ico('github')}<div><strong>${esc(p.repo)}</strong>${link('在 GitHub 打开',`https://github.com/${p.repo}`)}</div></div>${connectionRecovery(p)}<dl class="source-facts"><div><dt>最近同步</dt><dd>${date(summary(p).lastSyncedAt)}</dd></div><div><dt>当前代码版本</dt><dd><code>${esc(p.headSha||'尚未读取')}</code></dd></div><div><dt>分析状态</dt><dd>${p.analysisNeedsReview?'旧结论待复核':p.analysis?'已有来源约束分析':'等待分析'}</dd></div></dl><form id="source-form" data-id="${esc(p.id)}"><div class="field-row">${field('跟进 PR（可选）','trackedPr',p.trackedPr||'','留空跟进默认分支')}${field('开发计划路径','planPath',p.planPath||p.plan_path||'','docs/DEVELOPMENT_PLAN.md')}</div></form>${list(p.coverage?.warnings||p.snapshot?.warnings||p.warnings).map(w=>`<p class="source-notice">${esc(typeof w==='string'?w:[w.source,w.code,w.message].filter(Boolean).join(' · '))}</p>`).join('')}<p class="form-hint">更换开发线会保留旧历史，并要求重新核对原判断。</p>`,footer:`${btn('关闭','close')}${btn('同步来源','sync',{icon:'refresh',attrs:`data-id="${esc(p.id)}"`})}<button class="button primary" form="source-form" type="submit">保存</button>`};
  if(o.type==='note'&&p){const n=list(p.notes).find(x=>x.id===o.noteId);return {title:n?'编辑资料':'添加资料',body:`<form id="note-form" data-id="${esc(p.id)}" data-note="${esc(n?.id||'')}">${field('标题','title',n?.title||'','给资料起个名字',true)}${area('内容','text',n?.text||'','开发想法、反馈或下一轮目标')}${field('链接','url',n?.url||'','https://')}</form>`,footer:`${btn('取消','close')}<button class="button primary" form="note-form" type="submit">保存</button>`};}
  if(o.type==='task'&&p){const t=list(p.tasks).find(x=>x.id===o.taskId);return {title:t?'编辑下一步':'我的下一步',body:`<form id="task-form" data-id="${esc(p.id)}" data-task="${esc(t?.id||'')}">${field('要做什么','title',t?.title||'','一件具体的事',true)}</form>`,footer:`${btn('取消','close')}<button class="button primary" form="task-form" type="submit">保存</button>`};}
  if(o.type==='decision'&&p){const a=summary(p).attention.find(x=>(x.key||x.id)===o.key);return {title:'记录处理状态',body:`<form id="decision-form" data-id="${esc(p.id)}" data-key="${esc(o.key)}"><div class="decision-context"><strong>${esc(a?.title||'来源事项')}</strong>${link('原始依据',a?.sourceUrl)}</div><label class="field"><span>处理方式</span><select name="status" id="decision-status"><option value="handled">已处理</option><option value="snoozed">暂缓</option><option value="delegated">交给开发者</option></select></label><label class="field" id="snooze-field" hidden><span>暂缓至（北京时间）</span><input type="datetime-local" name="snoozedUntil"/></label>${area('处理记录','note','','写下具体决定或安排')}<p class="form-hint">仅更新工作台处理记录，不会执行 GitHub 审批、合并或生产部署。</p></form>`,footer:`${btn('取消','close')}<button class="button primary" form="decision-form" type="submit">保存处理记录</button>`};}
  return null;
}

function handleError(error){
  if(error.status===401){server.epoch++;server.user=null;server.csrf='';server.settings=null;server.repositories=[];ui.evidenceBodies.clear();state.projects=[];ui.overlay=null;server.error='登录状态已失效，请重新登录。';render();}
  else notify(error.message||'操作未成功，请重试',true);
}
async function bootstrap(){
  const epoch=++server.epoch;server.loading=true;server.error='';render();
  try{
    const data=await api('/api/bootstrap');if(epoch!==server.epoch)return;
    server.configured=Boolean(data.configured);server.user=data.user||null;if(!server.user)ui.evidenceBodies.clear();server.csrf=data.csrf||'';server.capabilities=data.capabilities||{};server.setupIssues=list(data.setupIssues);server.monitor=data.monitor||{};
    state.projects=list(data.projects).map(normalizeProject);state.monitor.enabled=Boolean(server.monitor.schedulerHealthy&&server.monitor.lastWorkerAt);
    if(server.user&&server.configured){const projects=await api('/api/projects');if(epoch!==server.epoch)return;state.projects=list(projects.projects).map(normalizeProject);if(projects.monitor)server.monitor=projects.monitor;}
  }catch(error){if(epoch!==server.epoch)return;server.error=error.message;server.configured=false;server.user=null;state.projects=[];}
  finally{if(epoch===server.epoch){server.loading=false;server.lastPoll=Date.now();route();}}
}
async function refreshProjects({renderNow=true}={}){
  if(!server.user||!server.configured)return;
  const epoch=server.epoch,data=await api('/api/projects');if(epoch!==server.epoch)return;
  const old=new Map(state.projects.map(p=>[p.id,p]));
  state.projects=list(data.projects).map(row=>{const previous=old.get(String(row.id));return normalizeProject({...previous,...row,evidence:row.evidence??previous?.evidence,analyses:row.analyses??previous?.analyses,plans:row.plans??previous?.plans,rounds:row.history??row.rounds??previous?.rounds});});
  if(data.monitor)server.monitor=data.monitor;
  state.monitor.enabled=Boolean(server.monitor.schedulerHealthy&&server.monitor.lastWorkerAt);server.error='';
  if(renderNow&&!ui.overlay)render();
}
const detailRequests=new Map();
async function loadProjectDetail(id){
  if(!server.user||!id||detailRequests.has(id))return;
  const epoch=server.epoch;detailRequests.set(id,true);
  try{const detail=await api(`/api/projects/${encodeURIComponent(id)}/history`);if(epoch!==server.epoch)return;const index=state.projects.findIndex(p=>p.id===id);if(index>=0){const old=state.projects[index];const merged=mergeProjectDetail(old,detail);if(old.historyPagingStarted){merged.historyHasMore=old.historyHasMore;merged.historyCursor=old.historyCursor;}if(old.analysesPagingStarted){merged.analysesHasMore=old.analysesHasMore;merged.nextAnalysisCursor=old.nextAnalysisCursor;}state.projects[index]=merged;}if(ui.projectId===id&&!ui.overlay)render();}
  catch(error){if(error.status===401)handleError(error);else{ui.errors[id]=error.message;server.error='项目历史读取未完成：'+error.message;if(ui.projectId===id&&!ui.overlay)render();}}
  finally{detailRequests.delete(id);}
}
async function mutate(path,method,body,{message='',close=false}={}){
  const epoch=server.epoch;
  try{const result=await api(path,{method,body});if(epoch!==server.epoch)return null;if(close)ui.overlay=null;await refreshProjects({renderNow:false});if(ui.projectId)await loadProjectDetail(ui.projectId);render();if(message)notify(message);return result;}
  catch(error){handleError(error);return null;}
}
async function syncOne(id){
  if(!id||ui.busy.has(id))return;ui.busy.add(id);delete ui.errors[id];if(!ui.overlay)render();
  try{await api(`/api/projects/${encodeURIComponent(id)}/sync`,{method:'POST',body:{}});notify('同步任务已交给后台，完成后状态会自动更新。');await refreshProjects();}
  catch(error){ui.errors[id]=error.message;handleError(error);}
  finally{ui.busy.delete(id);if(!ui.overlay||ui.overlay.type==='source')render();}
}
async function loadSettings(){
  if(!server.user){openOverlay('settings');return;}server.settingsLoading=true;openOverlay('settings');const epoch=server.epoch;
  try{const data=await api('/api/settings');if(epoch!==server.epoch)return;server.settings=data;server.capabilities.ai=list(data.providers).some(provider=>provider.status==='active');}
  catch(error){handleError(error);}
  finally{server.settingsLoading=false;if(ui.overlay?.type==='settings')render();}
}
async function loadRepos(){
  if(!server.user){notify('请先登录 GitHub',true);return;}server.reposLoading=true;openOverlay('new-project');const epoch=server.epoch;
  try{const data=await api('/api/github/repos');if(epoch!==server.epoch)return;server.repositories=list(data.repositories);}
  catch(error){handleError(error);}
  finally{server.reposLoading=false;if(ui.overlay?.type==='new-project')render();}
}
async function installGithub(){
  try{const data=await api('/api/github/install');const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='github.com'||url.username||url.password)throw Error('服务返回的 GitHub 授权地址无效');location.assign(url.href);}
  catch(error){handleError(error);}
}
async function autoTick(){
  if(document.hidden||server.loading||server.polling||!server.user||Date.now()-server.lastPoll<30000)return;
  server.polling=true;server.lastPoll=Date.now();
  try{await refreshProjects();if(ui.projectId&&!ui.overlay)await loadProjectDetail(ui.projectId);}
  catch(error){if(error.status===401)handleError(error);else{server.error=error.message;if(!ui.overlay)render();}}
  finally{server.polling=false;}
}
async function saveCollection(id,collection,items,message){return mutate(`/api/projects/${encodeURIComponent(id)}`,'PATCH',{[collection]:items},{message,close:true});}
function formBusy(form,busy){document.querySelectorAll(`button[form="${form.id}"]`).forEach(button=>button.disabled=busy);form.setAttribute('aria-busy',String(busy));}

document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
  const action=target.dataset.action,id=target.dataset.id||ui.projectId;
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
  else if(action==='toggle-watch'){const p=project(id);if(p)await mutate(`/api/projects/${encodeURIComponent(id)}`,'PATCH',{watching:!p.watching});}
  else if(action==='monitor')openOverlay('monitor');
  else if(action==='source')openOverlay('source',{projectId:id});
  else if(action==='sync')await syncOne(id);
  else if(action==='retry-analysis')await retryAnalysis(id);
  else if(action==='load-evidence')await loadEvidenceBody(id,target.dataset.evidence);
  else if(action==='load-older')await loadOlderHistory(id);
  else if(action==='load-older-analyses')await loadOlderAnalyses(id);
  else if(action==='settings')await loadSettings();
  else if(action==='new-project'||action==='reload-repos')await loadRepos();
  else if(action==='install')await installGithub();
  else if(action==='reload')await bootstrap();
  else if(action==='new-provider')openOverlay('provider');
  else if(action==='replace-provider')openOverlay('provider',{provider:list(server.settings?.providers).find(p=>p.id===id)});
  else if(action==='verify-provider'){
    target.disabled=true;try{await api(`/api/settings/provider/${encodeURIComponent(id)}/verify`,{method:'POST',body:{}});await loadSettings();notify('密钥验证成功');}catch(error){target.disabled=false;handleError(error);}
  }
  else if(action==='revoke-provider'){
    target.disabled=true;try{await api(`/api/settings/provider/${encodeURIComponent(id)}`,{method:'DELETE'});await loadSettings();notify('模型连接已撤销，后续调用已停止');}catch(error){target.disabled=false;handleError(error);}
  }
  else if(action==='logout'){
    try{await api('/api/logout',{method:'POST',body:{}});server.epoch++;server.user=null;server.csrf='';server.settings=null;server.repositories=[];ui.evidenceBodies.clear();state.projects=[];ui.overlay=null;render();}catch(error){handleError(error);}
  }
  else if(action==='new-note'||action==='edit-note'){const projectId=id||state.projects[0]?.id;if(projectId)openOverlay('note',{projectId,noteId:target.dataset.note});else notify('先添加一个项目');}
  else if(action==='new-task'||action==='edit-task')openOverlay('task',{projectId:id,taskId:target.dataset.task});
  else if(action==='decision')openOverlay('decision',{projectId:id,key:target.dataset.key});
  else if(action==='toggle-task'){const p=project(id);if(p)await saveCollection(id,'tasks',p.tasks.map(t=>t.id===target.dataset.task?{...t,done:!t.done}:t),'下一步已更新');}
  else if(action==='close'||action==='backdrop')closeOverlay();
});
document.addEventListener('input',event=>{
  if(event.target.id==='project-search'){ui.query=event.target.value;const start=event.target.selectionStart;render();const input=document.querySelector('#project-search');input?.focus();input?.setSelectionRange(start,start);}
});
document.addEventListener('change',async event=>{
  const target=event.target;
  if(target.id==='project-sort'){ui.sort=target.value;render();}
  else if(target.id==='plan-version'){ui.compareIndex=Number(target.value);render();}
  else if(target.id==='history-from'||target.id==='history-to'||target.id==='history-round'){ui[{'history-from':'historyFrom','history-to':'historyTo','history-round':'historyRound'}[target.id]]=target.value;render();}
  else if(target.dataset.watch){target.disabled=true;await mutate(`/api/projects/${encodeURIComponent(target.dataset.watch)}`,'PATCH',{watching:target.checked});}
  else if(target.id==='decision-status'){const field=document.querySelector('#snooze-field');field.hidden=target.value!=='snoozed';field.querySelector('input').required=target.value==='snoozed';}
  else if(target.id==='provider-kind'){const form=target.form;form.elements.currency.value=target.value==='bailian'?'CNY':'USD';form.elements.baseUrl.value='';}
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(!['project-form','note-form','task-form','decision-form','provider-form','source-form'].includes(form.id))return;
  event.preventDefault();if(form.getAttribute('aria-busy')==='true')return;const data=Object.fromEntries(new FormData(form));formBusy(form,true);
  try{
    if(form.id==='project-form'){
      const repo=server.repositories.find(r=>String(r.id)===data.repository);if(!repo)throw Error('请选择一个已授权的仓库');
      const trackedPr=data.trackedPr?Number(data.trackedPr):null;if(trackedPr!==null&&(!Number.isSafeInteger(trackedPr)||trackedPr<1))throw Error('PR 编号须为正整数');
      await mutate('/api/projects','POST',{repo:repo.full_name||repo.fullName,installationId:repo.installationId||repo.installation_id,trackedPr,planPath:String(data.planPath||'').trim(),watching:true},{message:'项目已加入，后台开始同步',close:true});
    }
    else if(form.id==='source-form'){
      const trackedPr=data.trackedPr?Number(data.trackedPr):null;if(trackedPr!==null&&(!Number.isSafeInteger(trackedPr)||trackedPr<1))throw Error('PR 编号须为正整数');
      await mutate(`/api/projects/${encodeURIComponent(form.dataset.id)}`,'PATCH',{trackedPr,planPath:String(data.planPath||'').trim()},{message:'来源已更新，旧结论保留待复核',close:true});
    }
    else if(form.id==='provider-form'){
      const payload={provider:data.provider,model:String(data.model||'').trim(),apiKey:data.apiKey,baseUrl:String(data.baseUrl||'').trim()||undefined,currency:data.currency,
        monthlyBudget:Number(data.monthlyBudget),inputPricePerMillion:Number(data.inputPricePerMillion),outputPricePerMillion:Number(data.outputPricePerMillion),maxOutputTokens:Number(data.maxOutputTokens),...(data.replaceId?{id:data.replaceId}:{})};
      // Remove the credential from the DOM before awaiting any network operation.
      form.elements.apiKey.value='';data.apiKey='';
      try{await api('/api/settings/provider',{method:'POST',body:payload});}finally{payload.apiKey='';}
      await loadSettings();notify('模型连接已保存，请验证密钥后开始分析');
    }
    else if(form.id==='note-form'){
      const p=project(form.dataset.id),title=String(data.title||'').trim();if(!p||!title)throw Error('请填写资料标题');const url=data.url?safeUrl(data.url):'';if(data.url&&!url)throw Error('请填写有效的网页链接');
      const old=p.notes.find(n=>n.id===form.dataset.note),note={id:old?.id||uid('note'),title,text:String(data.text||'').trim(),url,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
      await saveCollection(p.id,'notes',[note,...p.notes.filter(n=>n.id!==note.id)],'资料已保存');
    }
    else if(form.id==='task-form'){
      const p=project(form.dataset.id),title=String(data.title||'').trim();if(!p||!title)throw Error('请填写具体的下一步');const old=p.tasks.find(t=>t.id===form.dataset.task);
      await saveCollection(p.id,'tasks',old?p.tasks.map(t=>t.id===old.id?{...t,title}:t):[...p.tasks,{id:uid('task'),title,done:false,createdAt:new Date().toISOString()}],'下一步已保存');
    }
    else if(form.id==='decision-form'){
      const note=String(data.note||'').trim();if(!note)throw Error('请写下具体处理记录');
      const payload={status:data.status,note};if(data.status==='snoozed'){const at=new Date(data.snoozedUntil+'+08:00');if(!Number.isFinite(at.getTime())||at.getTime()<=Date.now())throw Error('请选择未来的暂缓时间');payload.snoozedUntil=at.toISOString();}
      await mutate(`/api/attention/${encodeURIComponent(form.dataset.key)}`,'POST',payload,{message:'处理记录已保存',close:true});
    }
  }catch(error){handleError(error);}
  finally{formBusy(form,false);}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){if(ui.overlay)closeOverlay();else if(ui.nav){ui.nav=false;render();}}
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(ui.view!=='projects')go('projects');requestAnimationFrame(()=>document.querySelector('#project-search')?.focus());}
  if(event.key==='Tab'&&ui.overlay){const nodes=[...document.querySelectorAll('.dialog button:not([disabled]),.dialog input:not([type="hidden"]),.dialog select,.dialog textarea,.dialog a[href],.dialog summary')].filter(n=>n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
});
window.addEventListener('hashchange',route);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)autoTick();});
window.addEventListener('pagehide',()=>{document.querySelectorAll('input[name="apiKey"]').forEach(input=>input.value='');});
window.addEventListener('pageshow',event=>{if(event.persisted)bootstrap();});
setInterval(autoTick,30000);
bootstrap();

function budgetSummary(settings){
  const budget=list(settings?.budget);
  return budget.length?`<section class="budget-summary"><h3>本月用量</h3>${budget.map(item=>{const provider=list(settings.providers).find(p=>p.id===item.providerId),config=provider?.config||provider||{},spent=Number(item.spentMicros||0)/1e6,total=Number(config.monthlyBudget||0);return `<div><span>${esc(config.model||'模型连接')}</span><strong>${esc(item.currency)} ${spent.toFixed(4)} / ${total.toFixed(2)}</strong><small>${Number(item.calls)||0} 次 · 含尚未结算的预留费用</small></div>`;}).join('')}</section>`:'';
}
async function loadOlderHistory(id){
  const p=project(id);if(!p?.historyHasMore||!p.historyCursor||ui.busy.has('history:'+id))return;
  const epoch=server.epoch;ui.busy.add('history:'+id);render();
  try{const detail=await api(`/api/projects/${encodeURIComponent(id)}/history?before=${encodeURIComponent(p.historyCursor)}`);if(epoch!==server.epoch)return;const index=state.projects.findIndex(row=>row.id===id);if(index>=0)state.projects[index]={...mergeProjectDetail(state.projects[index],detail),historyPagingStarted:true};}
  catch(error){handleError(error);}
  finally{ui.busy.delete('history:'+id);if(!ui.overlay)render();}
}
async function loadOlderAnalyses(id){
  const p=project(id);if(!p?.analysesHasMore||!p.nextAnalysisCursor||ui.busy.has('analyses:'+id))return;
  const epoch=server.epoch;ui.busy.add('analyses:'+id);render();
  try{const detail=await api(`/api/projects/${encodeURIComponent(id)}/history?analysisBefore=${encodeURIComponent(p.nextAnalysisCursor)}`);if(epoch!==server.epoch)return;const index=state.projects.findIndex(row=>row.id===id);if(index>=0){const old=state.projects[index];state.projects[index]={...mergeProjectDetail(old,detail),analysesPagingStarted:true,historyHasMore:old.historyHasMore,historyCursor:old.historyCursor};}}
  catch(error){handleError(error);}
  finally{ui.busy.delete('analyses:'+id);if(!ui.overlay)render();}
}

function evidenceBody(source,p){
  const cached=ui.evidenceBodies.get(`${p.id}:${source.id}`),item=cached||source,data=item.data;
  const needsBody=!cached&&(data?._bodyAvailable===true||data?._bodyTruncated===true||!data);
  const canRead=typeof item.id==='string'&&/^[0-9a-f-]{36}$/i.test(item.id);
  const excerpt=data&&typeof data==='object'?Object.fromEntries(Object.entries(data).filter(([key])=>!['_bodyAvailable','_bodyTruncated'].includes(key))):data;
  const hasExcerpt=typeof excerpt==='string'?Boolean(excerpt):excerpt&&Object.keys(excerpt).length>0;
  const title=cached?(item.complete===false?'完整保存记录 · 来源覆盖不完整':'完整原始记录'):data?._bodyTruncated?'原始记录 · 当前为截断摘要':needsBody?'原始记录 · 按需读取':'原始记录';
  if(!hasExcerpt&&!canRead&&!needsBody)return '';
  return `<details class="raw-evidence" data-details-key="evidence:${esc(p.id)}:${esc(p.renderContext||'current')}:${esc(item.id||item.sourceUrl)}"><summary>${title}</summary>${hasExcerpt?`<pre>${esc(typeof excerpt==='string'?excerpt:JSON.stringify(excerpt,null,2))}</pre>`:''}${needsBody?`<p class="evidence-body-status">${data?._bodyTruncated?'这里显示有限摘要，完整记录仍保存在服务器。':'完整原文尚未在本页读取。'}</p>${canRead?btn(ui.busy.has('evidence:'+item.id)?'读取中…':'读取完整原文','load-evidence',{cls:'text-button',icon:'download',attrs:`data-id="${esc(p.id)}" data-evidence="${esc(item.id)}" ${ui.busy.has('evidence:'+item.id)?'disabled':''}`}):link('打开原始来源',item.sourceUrl||item.url)}`:''}</details>`;
}
function analysisRetryControl(p){
  return server.capabilities.ai?`<div class="analysis-retry">${btn(ui.busy.has('analysis:'+p.id)?'正在提交…':'重新分析','retry-analysis',{icon:'spark',attrs:`data-id="${esc(p.id)}" ${ui.busy.has('analysis:'+p.id)?'disabled':''}`})}<p>发起一次新的模型分析，受剩余预算限制；无需新增提交。</p></div>`:'';
}
async function retryAnalysis(id){
  if(!server.capabilities.ai||!id||ui.busy.has('analysis:'+id))return;ui.busy.add('analysis:'+id);render();
  try{await api(`/api/projects/${encodeURIComponent(id)}/analyze`,{method:'POST',body:{}});notify('新的分析任务已提交，将按当前配置和剩余预算执行。');await refreshProjects();}
  catch(error){handleError(error);}
  finally{ui.busy.delete('analysis:'+id);if(!ui.overlay)render();}
}
async function loadEvidenceBody(id,evidenceId){
  if(!id||!evidenceId||ui.busy.has('evidence:'+evidenceId))return;
  const epoch=server.epoch;ui.busy.add('evidence:'+evidenceId);render();
  try{const response=await api(`/api/projects/${encodeURIComponent(id)}/evidence/${encodeURIComponent(evidenceId)}`);if(epoch!==server.epoch)return;
    if(!response.evidence||String(response.evidence.id)!==String(evidenceId))throw Error('原始记录与所选来源不匹配，请重试');
    if(response.evidence.data?._bodyTruncated||response.evidence.data?._bodyAvailable)throw Error('服务只返回了摘要，完整原文尚未取得');
    ui.evidenceBodies.set(`${id}:${evidenceId}`,normalizeEvidence(response.evidence));
  }catch(error){handleError(error);}
  finally{ui.busy.delete('evidence:'+evidenceId);if(!ui.overlay)render();}
}
