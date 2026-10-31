import { randomUUID } from 'node:crypto';
import { configuration } from './config.js';
import { database } from './database.js';
import { cipher,cookies,cookie,hash,equal,randomToken,HttpError,requireMutation,readBody,parseJSON,validateRepo,cleanPath,publicError } from './security.js';
import { createGitHubClient,createOAuthStart,exchangeOAuthCode,verifyWebhookSignature,normalizeWebhook } from './github.js';
import { validateProviderConfig,estimateReservation,verifyProvider } from './providers.js';
import { runWorker } from './worker.js';

const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateISO=v=>v?new Date(v).toISOString():null;
const COOKIE='__Host-pcw_session';
export function createHandler({config=configuration(),store:providedStore,fetchImpl,modelFetchImpl,background}={}){
  const secure=new URL(config.origin).protocol==='https:';const sessionName=secure?COOKIE:'pcw_session';
  const oauthCookie=secure?'__Host-pcw_oauth':'pcw_oauth';
  let github;
  const gh=()=>github??=createGitHubClient({appId:config.appId,privateKey:config.privateKey,...(fetchImpl?{fetchImpl}:{})});
  const getStore=()=>providedStore||database(config);
  const json=(res,status,value,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers});res.end(JSON.stringify(value));};
  const redirect=(res,url,headers={})=>{res.writeHead(302,{'Location':url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer',...headers});res.end();};
  const readiness=async()=>{const issues=[...config.setupIssues];let heartbeats=[];if(config.databaseUrl||providedStore){try{heartbeats=await getStore().health();}catch{issues.push({code:'DATABASE_UNAVAILABLE',title:'数据库暂时不可用',detail:'检查连接、迁移及数据库角色。之前的记录不会被清空。'});}}return {issues,heartbeats};};
  const requestUser=async(req)=>{const token=cookies(req)[sessionName];return {session:await getStore().session(token),token};};
  const kick=()=>{if(background)background(runWorker({store:getStore(),config,fetchImpl,modelFetchImpl,maxJobs:2,maxMillis:85000}).catch(()=>{}));};
  const installationsForUser=async(session)=>{
    const token=cipher(config).decrypt(session.token_cipher,`github:${session.id}`);let output=[];
    for(let page=1;page<=10;page++){const response=await gh().request(`/user/installations?per_page=100&page=${page}`,{token});const data=response.data||response;output.push(...(data.installations||[]));if((data.installations||[]).length<100)return output;}
    throw new HttpError(422,'INSTALLATION_COVERAGE','安装列表过长，读取尚未完整');
  };
  const ownedInstallations=async(session)=>{
    const installations=await installationsForUser(session);const owned=installations.filter(i=>String(i.account?.id)===String(session.github_id)&&(!config.appId||String(i.app_id)===String(config.appId))&&!i.suspended_at);
    for(const installation of owned)await getStore().bindInstallation(session.id,installation);return owned;
  };
  const repoList=async(session)=>{
    const installs=await ownedInstallations(session);const token=cipher(config).decrypt(session.token_cipher,`github:${session.id}`);const repositories=[];
    for(const installation of installs){for(let page=1;page<=10;page++){const response=await gh().request(`/user/installations/${installation.id}/repositories?per_page=100&page=${page}`,{token});const data=response.data||response;const items=data.repositories||[];repositories.push(...items.map(r=>({id:r.id,full_name:r.full_name,name:r.name,private:r.private,installationId:installation.id,default_branch:r.default_branch})));if(items.length<100)break;if(page===10)throw new HttpError(422,'REPOSITORY_COVERAGE','仓库列表尚未完整，请减少安装范围');}}
    return repositories;
  };
  return async function handler(req,res){
    const requestId=randomUUID();res.setHeader('X-Request-Id',requestId);
    try{
      const url=new URL(req.url,config.origin);const path=url.pathname.replace(/\/+$/,'')||'/';const method=req.method||'GET';
      if(path==='/api/health'&&method==='GET'){return json(res,200,{service:'project-collaboration-workspace',version:'r2',configured:config.configured,mode:'server'});}
      if(path==='/api/bootstrap'&&method==='GET'){
        const ready=await readiness();let session=null;try{if(!ready.issues.some(x=>/DATABASE/.test(x.code)))session=(await requestUser(req)).session;}catch{}
        const worker=ready.heartbeats.find(h=>h.name==='worker'),scheduler=ready.heartbeats.find(h=>h.name==='scheduler');
        const settings=session?await getStore().settings(session.id):null;
        return json(res,200,{mode:'server',configured:ready.issues.length===0,setupIssues:ready.issues,user:session?{id:session.id,login:session.login}:null,csrf:session?.csrf||null,capabilities:{github:Boolean(config.appId&&config.privateKey),database:!ready.issues.some(x=>/DATABASE/.test(x.code)),ai:settings?.providers.some(p=>p.status==='active')||false},monitor:{lastWorkerAt:dateISO(worker?.last_at),lastSchedulerAt:dateISO(scheduler?.last_at),schedulerHealthy:!!scheduler&&Date.now()-Date.parse(scheduler.last_at)<15*60000},projects:session?await getStore().listProjects(session.id):[]});
      }
      if(path==='/api/webhooks/github'&&method==='POST'){
        if(!config.webhookSecret)throw new HttpError(503,'WEBHOOK_UNCONFIGURED','Webhook 尚未配置');
        const raw=await readBody(req,config.maxBodyBytes);
        if(!verifyWebhookSignature(raw,String(req.headers['x-hub-signature-256']||''),config.webhookSecret))throw new HttpError(401,'SIGNATURE_INVALID','Webhook 签名无效');
        const deliveryId=String(req.headers['x-github-delivery']||'');if(!/^[a-zA-Z0-9-]{8,128}$/.test(deliveryId))throw new HttpError(400,'DELIVERY_ID_REQUIRED','投递 ID 无效');
        const event=String(req.headers['x-github-event']||'');const payload=parseJSON(raw);const normalized=normalizeWebhook(event,payload,{deliveryId,receivedAt:new Date().toISOString()});
        const result=await getStore().ingestDelivery({id:deliveryId,event,action:payload.action,installationId:normalized.installationId||payload.installation?.id,payload,bodyHash:hash(raw),evidence:normalized.evidence||[],repo:normalized.repo});
        json(res,result.duplicate?200:202,{accepted:true,...result});kick();return;
      }
      if(path==='/api/cron'&&['GET','POST'].includes(method)){
        if(!config.cronSecret||!equal(req.headers.authorization,`Bearer ${config.cronSecret}`))throw new HttpError(401,'SCHEDULER_UNAUTHORIZED','后台调度凭据无效');
        const store=getStore();const queued=await store.schedule();await store.heartbeat('scheduler',{queued});const result=await runWorker({store,config,fetchImpl,modelFetchImpl,maxJobs:4,maxMillis:110000});return json(res,200,{queued,...result});
      }
      if(path==='/api/auth/start'&&method==='GET'){
        if(req.headers.host&&req.headers.host!==new URL(config.origin).host)return redirect(res,`${config.origin}/api/auth/start`);
        if(!config.clientId||!config.clientSecret||(!config.encryptionKey&&!config.encryptionKeys))throw new HttpError(503,'LOGIN_UNCONFIGURED','请先完成 GitHub App 和服务器凭据配置');
        await getStore().rateLimit(`login:${hash(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown')}`,10,300);
        const state=randomToken();await getStore().putState(state,'login');const auth=createOAuthStart({clientId:config.clientId,redirectUri:`${config.origin}/api/auth/callback`,state});return redirect(res,typeof auth==='string'?auth:auth.url,{'Set-Cookie':cookie(oauthCookie,state,{secure,maxAge:600})});
      }
      if(path==='/api/auth/callback'&&method==='GET'){
        const state=url.searchParams.get('state');if(!state||!equal(cookies(req)[oauthCookie],state)||!await getStore().consumeState(state,'login'))throw new HttpError(403,'OAUTH_STATE_INVALID','登录验证已过期，请重新登录');
        const code=url.searchParams.get('code');if(!code||code.length>512)throw new HttpError(400,'OAUTH_CODE_INVALID','登录凭据无效');
        const exchanged=await exchangeOAuthCode({clientId:config.clientId,clientSecret:config.clientSecret,code,redirectUri:`${config.origin}/api/auth/callback`,...(fetchImpl?{fetchImpl}:{})});const token=typeof exchanged==='string'?exchanged:exchanged.access_token||exchanged.accessToken;
        const response=await gh().request('/user',{token});const user=response.data||response;
        if(String(user.id)!==String(config.ownerGithubId))throw new HttpError(403,'ACCOUNT_NOT_ALLOWED','此个人工作台仅允许已配置的账户登录');
        const sessionToken=randomToken();await getStore().login(user,cipher(config).encrypt,token,sessionToken,randomToken());return redirect(res,config.origin,{'Set-Cookie':[cookie(sessionName,sessionToken,{secure,maxAge:604800}),cookie(oauthCookie,'',{secure,maxAge:0})]});
      }
      const {session,token}=await requestUser(req);if(!session)throw new HttpError(401,'LOGIN_REQUIRED','请先登录工作台');
      if(['POST','PATCH','PUT','DELETE'].includes(method))requireMutation(req,session,config);
      const store=getStore();await store.rateLimit(`api:${session.id}`,120,60);
      const data=async()=>parseJSON(await readBody(req,Math.min(config.maxBodyBytes,256000)));
      if(path==='/api/logout'&&method==='POST'){await store.logout(token);return json(res,200,{loggedOut:true},{'Set-Cookie':cookie(sessionName,'',{secure,maxAge:0})});}
      if(path==='/api/github/install'&&method==='GET'){
        if(!config.appSlug)throw new HttpError(503,'GITHUB_APP_REQUIRED','GitHub App 尚未配置');const state=randomToken();await store.putState(state,'install',session.id);return json(res,200,{url:`https://github.com/apps/${encodeURIComponent(config.appSlug)}/installations/new?state=${encodeURIComponent(state)}`});
      }
      if(path==='/api/github/callback'&&method==='GET'){
        const state=url.searchParams.get('state');if(!state||!await store.consumeState(state,'install',session.id))throw new HttpError(403,'INSTALL_STATE_INVALID','仓库授权校验已过期，请重试');
        const id=Number(url.searchParams.get('installation_id'));const installs=await ownedInstallations(session);if(!installs.some(i=>i.id===id))throw new HttpError(403,'INSTALLATION_OWNERSHIP','未找到属于本账户的授权');return redirect(res,`${config.origin}/#/projects`);
      }
      if(path==='/api/github/repos'&&method==='GET')return json(res,200,{repositories:await repoList(session)});
      if(path==='/api/projects'&&method==='GET'){const hb=await store.health(),w=hb.find(h=>h.name==='worker'),sc=hb.find(h=>h.name==='scheduler');return json(res,200,{projects:await store.listProjects(session.id),monitor:{lastWorkerAt:dateISO(w?.last_at),lastSchedulerAt:dateISO(sc?.last_at),schedulerHealthy:!!sc&&Date.now()-Date.parse(sc.last_at)<15*60000}});} 
      if(path==='/api/projects'&&method==='POST'){
        const input=await data();validateRepo(input.repo);if(!Number.isSafeInteger(Number(input.installationId)))throw new HttpError(400,'INSTALLATION_INVALID','安装 ID 无效');input.installationId=Number(input.installationId);input.planPath=cleanPath(input.planPath);if(input.trackedPr!=null&&(!Number.isInteger(input.trackedPr)||input.trackedPr<1))throw new HttpError(400,'PR_INVALID','PR 编号无效');
        const repos=await repoList(session);const repo=repos.find(r=>r.full_name.toLowerCase()===input.repo.toLowerCase()&&r.installationId===input.installationId);if(!repo)throw new HttpError(403,'REPOSITORY_NOT_AUTHORIZED','仓库不在本次授权范围中');const project=await store.addProject(session.id,repo,input);json(res,201,{project});kick();return;
      }
      const pm=path.match(/^\/api\/projects\/([^/]+)(?:\/(history|sync|analyze))?$/);
      if(pm){const id=pm[1];if(!idPattern.test(id))throw new HttpError(400,'PROJECT_ID_INVALID','项目 ID 无效');const project=await store.project(session.id,id);
        if(pm[2]==='history'&&method==='GET'){const before=url.searchParams.get('before'),analysisBefore=url.searchParams.get('analysisBefore');return json(res,200,await store.history(session.id,id,{before,analysisBefore}));}
        if(pm[2]==='analyze'&&method==='POST'){await store.rateLimit(`reanalyze:${session.id}:${id}`,2,300);const job=await store.enqueue(session.id,id,'analyze',`manual-analysis:${randomUUID()}`,{retryKey:randomUUID()});json(res,202,{queued:true,jobId:job.id,budgetEnforced:true});kick();return;}
        if(pm[2]==='sync'&&method==='POST'){await store.rateLimit(`sync:${session.id}:${id}`,3,60);const job=await store.enqueue(session.id,id,'sync',`manual:${id}:${Math.floor(Date.now()/10000)}`);json(res,202,{queued:true,jobId:job?.id||null});kick();return;}
        if(!pm[2]&&method==='PATCH'){
          const input=await data();const patch={};if('watching'in input){if(typeof input.watching!=='boolean')throw new HttpError(400,'PATCH_INVALID','关注状态无效');patch.watching=input.watching;}if('trackedPr'in input){if(input.trackedPr!=null&&(!Number.isInteger(input.trackedPr)||input.trackedPr<1))throw new HttpError(400,'PR_INVALID','PR 编号无效');patch.trackedPr=input.trackedPr;}if('planPath'in input)patch.planPath=cleanPath(input.planPath);
          for(const key of ['notes','tasks'])if(key in input){if(!Array.isArray(input[key])||input[key].length>200||JSON.stringify(input[key]).length>60000)throw new HttpError(400,'PATCH_TOO_LARGE','资料超过单次保存范围');patch[key]=input[key];}return json(res,200,{project:await store.patchProject(session.id,id,patch)});
        }
      }
      const em=path.match(/^\/api\/projects\/([^/]+)\/evidence\/([^/]+)$/);if(em&&method==='GET'){if(!idPattern.test(em[1])||!idPattern.test(em[2]))throw new HttpError(400,'EVIDENCE_ID_INVALID','依据 ID 无效');return json(res,200,{evidence:await store.evidenceRecord(session.id,em[1],em[2])});}
      if(path==='/api/settings'&&method==='GET')return json(res,200,{...await store.settings(session.id),setupIssues:(await readiness()).issues});
      if(path==='/api/settings/provider'&&method==='POST'){
        const input=await data();if(input.id&&!idPattern.test(input.id))throw new HttpError(400,'PROVIDER_ID_INVALID','模型配置 ID 无效');if(typeof input.apiKey!=='string'||input.apiKey.length<8||input.apiKey.length>4096||/[\r\n\x00]/.test(input.apiKey))throw new HttpError(400,'KEY_INVALID','API Key 格式无效');const providerConfig=validateProviderConfig(input,{allowedHosts:config.allowedProviderHosts});const saved=await store.saveProvider(session.id,input.id,providerConfig,cipher(config).encrypt,input.apiKey);input.apiKey='';return json(res,200,{provider:saved,verificationRequired:true});
      }
      const providerMatch=path.match(/^\/api\/settings\/provider\/([^/]+)(?:\/(verify))?$/);
      if(providerMatch){const id=providerMatch[1];if(!idPattern.test(id))throw new HttpError(400,'PROVIDER_ID_INVALID','模型配置 ID 无效');if(method==='DELETE'&&!providerMatch[2]){await store.revokeProvider(session.id,id);return json(res,200,{revoked:true});}
        if(method==='POST'&&providerMatch[2]==='verify'){
          await store.rateLimit(`verify:${session.id}`,3,300);const provider=await store.provider(session.id,id);const estimate=estimateReservation(provider.config,{}, {verification:true});const reserved=await store.reserve(session.id,id,provider.version,estimate.costMicros,null,'key_verification');
          try{const key=cipher(config).decrypt(provider.key_cipher,`provider:${session.id}:${id}`);await store.authorizeDispatch(session.id,reserved.id);const result=await verifyProvider(provider.config,key,{...(modelFetchImpl?{fetchImpl:modelFetchImpl}:{}),allowedHosts:config.allowedProviderHosts});await store.settle(session.id,reserved.id,result);await store.providerVerified(session.id,id,provider.version);json(res,200,{verified:true,model:result.model,usage:result.usage,costMicros:result.costMicros});kick();return;}catch(error){await store.settle(session.id,reserved.id,{costMicros:error.costMicros,usage:error.usage,errorCode:error.code||'PROVIDER_ERROR',dispatched:error.requestSent===true});throw error;}
        }
      }
      const am=path.match(/^\/api\/attention\/([^/]+)$/);if(am&&method==='POST'){if(!idPattern.test(am[1]))throw new HttpError(400,'ATTENTION_ID_INVALID','事项 ID 无效');const input=await data();if(!['handled','snoozed','delegated'].includes(input.status)||typeof input.note!=='string'||!input.note.trim()||input.note.length>3000)throw new HttpError(400,'RESOLUTION_INVALID','请选择处理方式并填写记录');if(input.snoozedUntil&&(!Number.isFinite(Date.parse(input.snoozedUntil))||Date.parse(input.snoozedUntil)<Date.now()))throw new HttpError(400,'SNOOZE_INVALID','暂缓时间无效');return json(res,200,await store.resolveAttention(session.id,am[1],input));}
      throw new HttpError(404,'NOT_FOUND','未找到此接口');
    }catch(error){const status=Number.isInteger(error.status)&&error.status>=400&&error.status<600?error.status:500;if(!res.headersSent)json(res,status,{error:publicError(error),requestId});else res.end();}
  };
}
