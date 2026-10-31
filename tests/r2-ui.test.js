import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createWorkspaceClient,WorkspaceApiError,normalizeProject,normalizePlan,normalizeEvidence,serverSummary,projectHealth,claimSources,mergeProjectDetail} from '../src/watch-api.js';
import {watchChecksFor} from '../src/watch-domain.js';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});

test('browser API client never sends a mutation without a CSRF token',async()=>{
  let calls=0;const api=createWorkspaceClient({fetchImpl:async()=>{calls++;return json({});}});
  await assert.rejects(api('/api/projects',{method:'POST',body:{repo:'example/private'}}),error=>error.status===401);
  assert.equal(calls,0);
});
test('browser API client sends credentials only to same-origin API routes',async()=>{
  const calls=[];const api=createWorkspaceClient({getCsrf:()=> 'csrf-test',fetchImpl:async(path,options)=>{calls.push({path,options});return json({ok:true});}});
  await api('/api/settings/provider',{method:'POST',body:{apiKey:'test-only-value'}});
  assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.cache,'no-store');
  assert.equal(calls[0].options.headers['x-csrf-token'],'csrf-test');
  for(const path of ['https://example.com/api/settings','//evil.example/api/settings','/api/../private','/api/a%2fb'])await assert.rejects(api(path),WorkspaceApiError);
  assert.equal(calls.length,1);
});
test('failed services are visible errors and cannot be parsed as successful state',async()=>{
  const api=createWorkspaceClient({fetchImpl:async()=>json({error:{message:'仓库授权已撤销',code:'REVOKED'}},403)});
  await assert.rejects(api('/api/projects'),error=>error.status===403&&error.code==='REVOKED');
  const html=createWorkspaceClient({fetchImpl:async()=>new Response('<html>Vercel login</html>',{status:200,headers:{'content-type':'text/html'}})});
  await assert.rejects(html('/api/bootstrap'),error=>error.code==='UNAVAILABLE');
});
test('an API timeout rejects and clears the timer instead of waiting indefinitely',async()=>{
  const api=createWorkspaceClient({timeoutMs:10,fetchImpl:async(_path,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))))});
  await assert.rejects(api('/api/projects'),error=>error.code==='TIMEOUT');
});
test('an unquantified scope and an invalidated analysis never render as a product completion percent',()=>{
  const unknown=normalizeProject({id:'p',repo:'org/project',analysis:{stage:{text:'开发中'},progress:{scopeComplete:false,percent:98}}});
  assert.equal(serverSummary(unknown).progress.known,false);assert.equal(serverSummary(unknown).progress.percent,null);
  const stale=normalizeProject({...unknown,analysisNeedsReview:true,analysis:{stage:{text:'旧状态'},progress:{scopeComplete:true,percent:100}}});
  assert.equal(serverSummary(stale).progress.known,false);assert.equal(serverSummary(stale).phase.needsReview,true);
});
test('analysis suggestions do not manufacture actionable approvals in the UI',()=>{
  const p=normalizeProject({id:'p',repo:'org/project',analysis:{userActions:[{id:'made-up',kind:'approval',text:'批准发布'}]},attention:[]});
  assert.deepEqual(serverSummary(p).attention,[]);
});
test('snoozed and delegated actions retain their treatment record without changing source facts',()=>{
  const p=normalizeProject({id:'p',repo:'org/project',attention:[{id:'a',title:'先测试',status:'handled',note:'已安排'},{id:'b',title:'下次处理',status:'snoozed',snoozedUntil:'2099-01-01T00:00:00Z'},{id:'c',title:'开发者跟进',status:'delegated'},{id:'d',title:'过期暂缓',status:'snoozed',snoozedUntil:'2020-01-01T00:00:00Z'}]});
  const summary=serverSummary(p);assert.deepEqual(summary.attention.map(a=>a.id),['d']);assert.equal(summary.resolvedAttention.length,3);assert.equal(p.attention.length,4);
});
test('evidence sources are resolved by immutable IDs and missing references stay missing',()=>{
  const p=normalizeProject({id:'p',repo:'org/project',evidence:[{id:1,source_url:'https://github.com/org/project/commit/a',sha:'a'.repeat(40),occurred_at:'2026-01-01T00:00:00Z',data:{conclusion:'failure'}}]});
  assert.equal(claimSources({evidenceIds:['1','missing']},p).length,1);assert.equal(claimSources({evidenceIds:['1']},p)[0].data.conclusion,'failure');
});
test('later project detail preserves older analysis and plan records rather than deleting them',()=>{
  const p=normalizeProject({id:'p',repo:'org/project',analysis:{id:'analysis-1',analysis:{stage:{text:'待验证'}}},plans:[{sha:'old',created_at:'2026-01-01T00:00:00Z',data:{path:'PLAN.md',content:'old'}}]});
  const next=mergeProjectDetail(p,{plans:[...p.plans,{sha:'new',created_at:'2026-02-01T00:00:00Z',data:{path:'PLAN.md',content:'new'}}],analyses:[{id:'analysis-1'}],history:[{id:'failed',failed:['实机未通过']}],evidence:[{id:'e1',kind:'comment',data:{body:'失败'}}]});
  assert.equal(next.plan.content,'new');assert.equal(next.previousPlans[0].content,'old');assert.equal(next.rounds[0].id,'failed');assert.equal(next.analysis.stage.text,'待验证');
});

async function uiHarness(respond){
  const source=(await fs.readFile(new URL('../src/watch.js',import.meta.url),'utf8')).replace(/^import[^;]+;\n/gm,'');
  const app={innerHTML:''},toast={textContent:'',className:''},listeners=new Map(),calls=[];
  const document={hidden:false,activeElement:null,body:{classList:{toggle(){}}},querySelector:s=>s==='#app'?app:s==='#toast'?toast:null,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners.set(type,fn)};
  const fetchImpl=async(path,options)=>{calls.push({path,options});return respond(path,options);};
  const context=vm.createContext({document,window:{addEventListener(){}},location:{hash:'',assign(){}},console,URL,crypto:globalThis.crypto,structuredClone,Date,Intl,Map,Set,Number,String,Object,JSON,Boolean,Math,Array,Error,RegExp,Promise,AbortController,Response,
    CSS:{escape:value=>value},setTimeout,clearTimeout,setInterval(){},requestAnimationFrame:fn=>fn(),FormData:class{constructor(form){this.form=form;}[Symbol.iterator](){return Object.entries(this.form.data)[Symbol.iterator]();}},
    createWorkspaceClient:options=>createWorkspaceClient({...options,fetchImpl}),normalizeProject,normalizePlan,normalizeEvidence,serverSummary,projectHealth,claimSources,mergeProjectDetail,watchChecksFor});
  vm.runInContext(source,context);await new Promise(resolve=>setTimeout(resolve,5));
  return {app,toast,calls,context,listeners,run:code=>vm.runInContext(code,context)};
}
test('unconfigured R2 boots with no sample project cards and no browser GitHub requests',async()=>{
  const h=await uiHarness(async path=>json(path==='/api/bootstrap'?{configured:false,setupIssues:['数据库待连接'],capabilities:{}}:{}));
  assert.match(h.app.innerHTML,/数据库待连接/);assert.doesNotMatch(h.app.innerHTML,/data-project-card=/);assert.doesNotMatch(h.app.innerHTML,/Riftlet|VAIWL/);
  assert.deepEqual(h.calls.map(c=>c.path),['/api/bootstrap']);
});
test('a broken bootstrap displays the failure instead of falling back to historic prototype data',async()=>{
  const h=await uiHarness(async()=>json({error:{message:'数据库连接失败'}},503));
  assert.match(h.app.innerHTML,/数据库连接失败/);assert.doesNotMatch(h.app.innerHTML,/data-project-card=/);
});
test('R2 escapes hostile repository and model text while displaying real server project cards',async()=>{
  const h=await uiHarness(async path=>json(path==='/api/bootstrap'?{configured:true,user:{id:'u',login:'owner'},csrf:'csrf',capabilities:{github:true},monitor:{lastWorkerAt:'2026-10-01T00:00:00Z',schedulerHealthy:true}}:{projects:[{id:'p',repo:'org/project',name:'<img src=x onerror=alert(1)>',watching:true,analysis:{stage:{text:'<script>alert(1)</script>',classification:'inference'},progress:{scopeComplete:false,percent:100}}}]}));
  assert.match(h.app.innerHTML,/data-project-card="p"/);assert.match(h.app.innerHTML,/&lt;img/);assert.doesNotMatch(h.app.innerHTML,/<script>alert/);assert.match(h.app.innerHTML,/未量化/);
});
test('API Key input is cleared before a provider request and never stored in browser persistence',async()=>{
  let keyField;
  const h=await uiHarness(async(path,options)=>{
    if(path==='/api/bootstrap')return json({configured:true,user:{id:'u',login:'owner'},csrf:'csrf',capabilities:{github:true}});
    if(path==='/api/settings/provider'){assert.equal(keyField.value,'');assert.equal(JSON.parse(options.body).apiKey,'synthetic-test-key');return json({id:'provider1'});}
    if(path==='/api/settings')return json({providers:[],usage:[]});return json({projects:[]});
  });
  keyField={value:'synthetic-test-key'};
  const attributes={};
  const form={id:'provider-form',data:{provider:'openai',model:'model-test',apiKey:'synthetic-test-key',monthlyBudget:'0',inputPricePerMillion:'1',outputPricePerMillion:'1',maxOutputTokens:'2048',currency:'USD'},elements:{apiKey:keyField},dataset:{},getAttribute:name=>attributes[name],setAttribute:(name,value)=>attributes[name]=value};
  await h.listeners.get('submit')({target:form,preventDefault(){}});
  assert.equal(keyField.value,'');assert.doesNotMatch(h.app.innerHTML,/synthetic-test-key/);
  const source=await fs.readFile(new URL('../src/watch.js',import.meta.url),'utf8');assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB/);
});

test('server-shaped project journey renders exact-line plans, history, gated user actions and accounting',async()=>{
  const sha='b'.repeat(40),time='2026-10-31T20:00:00Z';
  const source={id:'e1',kind:'issue_comment',sourceUrl:'https://github.com/org/project/pull/16#issuecomment-1',sha,occurredAt:time,observedAt:time,data:{body:'CI 通过，实机仍未通过'}};
  const fact={id:'c1',text:'Project 实机仍未通过',classification:'fact',evidenceIds:['e1'],sources:[{id:'e1',url:source.sourceUrl,sha,occurredAt:time}]};
  const analysis={stage:{...fact,text:'等待实机修复'},progress:{known:false,scopeComplete:false,percent:null},completed:[],incomplete:[],failed:[],blockers:[fact],pendingVerification:[],nextSteps:[],changeReason:{...fact,text:'出现新实机证据'}};
  const project={id:'p',repo:'org/project',name:'Project',trackedPr:16,headSha:sha,watching:true,status:'current',analysis:{...analysis,analyzedAt:time},attention:[{...fact,id:'approval-db',kind:'test',status:'open',resolution:{status:'handled',note:'已安排',at:time}},{...fact,id:'active-db',kind:'decision',text:'选择要保留的实现',status:'open'}],plans:[{id:'plan-pr',kind:'document',sha,observedAt:time,data:{line:'pr:16',path:'docs/PLAN.md',content:'PR current plan'}},{id:'plan-main',kind:'document',sha:'c'.repeat(40),observedAt:'2026-11-01T20:00:00Z',data:{line:'main',path:'docs/PLAN.md',content:'Unrelated main plan'}}],evidence:[source]};
  const h=await uiHarness(async path=>{
    if(path==='/api/bootstrap')return json({configured:true,user:{id:'u',login:'owner'},csrf:'csrf',capabilities:{github:true,ai:true}});
    if(path==='/api/projects')return json({projects:[project]});
    if(path.includes('/history'))return json({history:[{...source,id:'run',kind:'workflow_run',data:{name:'CI',conclusion:'failure'}}],analyses:[{id:'analysis1',createdAt:time,result:analysis}],evidence:[source],plans:project.plans,hasMore:true,nextCursor:'opaque_evidence_cursor',analysesHasMore:true,nextAnalysisCursor:'opaque_analysis_cursor'});
    if(path==='/api/settings')return json({providers:[{id:'provider1',config:{model:'model-test',provider:'openai',monthlyBudget:2,currency:'USD'},status:'active'}],budget:[{providerId:'provider1',currency:'USD',spentMicros:12500,calls:2}],usage:[{createdAt:time,currency:'USD',costMicros:12500,usage:{inputTokens:250,outputTokens:100}}]});
    return json({});
  });
  h.run("location.hash='#/project/p/overview';route()");await new Promise(resolve=>setTimeout(resolve,5));
  assert.match(h.app.innerHTML,/Project 实机仍未通过/);assert.match(h.app.innerHTML,/需要我处理/);assert.match(h.app.innerHTML,/选择要保留的实现/);
  assert.match(h.app.innerHTML,/data-key="active-db"/);assert.doesNotMatch(h.app.innerHTML,/data-key="signal:/);assert.doesNotMatch(h.app.innerHTML,/data-key="approval-db"/);
  h.run("location.hash='#/project/p/plan';route()");await new Promise(resolve=>setTimeout(resolve,5));
  assert.match(h.app.innerHTML,/PR current plan/);assert.doesNotMatch(h.app.innerHTML,/Unrelated main plan/);
  h.run("location.hash='#/project/p/history';route()");await new Promise(resolve=>setTimeout(resolve,5));
  assert.match(h.app.innerHTML,/自动检查 · CI/);assert.match(h.app.innerHTML,/读取更早的记录/);assert.match(h.app.innerHTML,/读取更早的判断/);
  assert.match(h.app.innerHTML,/已安排/);
  await h.run('loadSettings()');
  assert.match(h.app.innerHTML,/USD 0.0125 \/ 2.00/);assert.match(h.app.innerHTML,/250 \/ 100 Token/);
});

test('manual analysis is budget-labelled and raw evidence is fetched only on demand, then survives projection refresh',async()=>{
  const id='11111111-1111-4111-8111-111111111111',evidenceId='22222222-2222-4222-8222-222222222222';
  const claim={id:'claim-lazy',text:'等待实际验证',classification:'unknown',evidenceIds:[evidenceId]};
  const p={id,repo:'org/project',analysis:{stage:claim,blockers:[],pendingVerification:[],completed:[]},evidence:[{id:evidenceId,kind:'issue_comment',sourceUrl:'https://github.com/org/project/issues/1#issuecomment-1',data:{body:'SUMMARY_ONLY',_bodyTruncated:true}}]};
  let analyzed=0,bodyReads=0;
  const h=await uiHarness(async path=>{
    if(path==='/api/bootstrap')return json({configured:true,user:{id:'u',login:'owner'},csrf:'csrf',capabilities:{ai:true}});
    if(path==='/api/projects')return json({projects:[p]});
    if(path.endsWith('/history'))return json({history:[],evidence:p.evidence});
    if(path.endsWith('/analyze')){analyzed++;return json({queued:true},202);}
    if(path.includes('/evidence/')){bodyReads++;return json({evidence:{...p.evidence[0],data:{body:'FULL_EVIDENCE_TOKEN'}}});}
    return json({});
  });
  h.run(`location.hash='#/project/${id}/overview';route()`);await new Promise(resolve=>setTimeout(resolve,5));
  assert.match(h.app.innerHTML,/发起一次新的模型分析，受剩余预算限制/);assert.match(h.app.innerHTML,/当前为截断摘要/);assert.match(h.app.innerHTML,/读取完整原文/);assert.equal(bodyReads,0);
  assert.doesNotMatch(h.app.innerHTML,/FULL_EVIDENCE_TOKEN/);
  await h.run(`loadEvidenceBody('${id}','${evidenceId}')`);
  assert.equal(bodyReads,1);assert.match(h.app.innerHTML,/FULL_EVIDENCE_TOKEN/);
  await h.run('refreshProjects()');assert.match(h.app.innerHTML,/FULL_EVIDENCE_TOKEN/);
  await h.run(`retryAnalysis('${id}')`);assert.equal(analyzed,1);assert.equal(bodyReads,1);
  h.run('server.capabilities.ai=false;render()');assert.doesNotMatch(h.app.innerHTML,/data-action="retry-analysis"/);
});


test('persisted worker errors appear on cards and source details with the correct recovery action',async()=>{
  const projects=[
    {id:'github',repo:'org/github',name:'GitHub project',status:'permission_revoked',lastError:'REPOSITORY_REMOVED'},
    {id:'model',repo:'org/model',name:'Model project',status:'attention',lastError:'PROVIDER_AUTH_FAILED'},
    {id:'network',repo:'org/network',name:'Network project',status:'attention',lastError:'NETWORK_ERROR'},
    {id:'waiting',repo:'org/waiting',name:'Waiting project',status:'awaiting_ai'},
    {id:'retry',repo:'org/retry',name:'Retry project',status:'attention',lastError:'PROVIDER_TIMEOUT'}
  ];
  const h=await uiHarness(async path=>json(path==='/api/bootstrap'?{configured:true,user:{id:'u',login:'owner'},csrf:'csrf',capabilities:{ai:true,github:true}}:path==='/api/projects'?{projects}:{history:[],evidence:[]}));
  assert.match(h.app.innerHTML,/仓库已移出授权/);assert.match(h.app.innerHTML,/模型密钥需更换/);assert.match(h.app.innerHTML,/GitHub 读取失败/);assert.match(h.app.innerHTML,/等待模型连接/);
  for(const [id,label,action] of [['github','仓库已移出授权','install'],['model','模型密钥需更换','settings'],['network','GitHub 读取失败','sync'],['waiting','等待模型连接','settings'],['retry','模型分析失败','retry-analysis']]){
    h.run(`openOverlay('source',{projectId:'${id}'})`);
    const dialog=h.run('serverDialog().body');
    assert.match(dialog,new RegExp(label));assert.match(dialog,new RegExp('data-action="'+action+'"'));
    if(id==='model'||id==='retry'){assert.doesNotMatch(dialog,/仓库授权已撤销|GitHub 授权已撤销/);assert.doesNotMatch(dialog,/data-action="install"/);}
    h.run(`location.hash='#/project/${id}/overview';route()`);await new Promise(resolve=>setTimeout(resolve,5));
    assert.match(h.app.innerHTML,new RegExp('r2-source-strip[\\s\\S]*?'+label));
    assert.equal(h.run(`summary(project('${id}')).userActions.length`),0);
    assert.equal(h.run(`summary(project('${id}')).attention[0].actionable`),false);
  }
  h.run('server.capabilities.ai=false');assert.match(h.run("connectionRecovery(project('retry'))"),/data-action="settings"/);
  assert.equal(projectHealth({lastError:'BUDGET_EXCEEDED',status:'attention'}).action,'settings');
  assert.equal(projectHealth({lastError:'PROVIDER_AUTH_FAILED',status:'permission_revoked'}).action,'settings');
  assert.equal(projectHealth({status:'current'}),null);
});
