import { collectEvidence, createGitHubClient } from './github.js';
import { buildAnalysisInput, callAnalysis, estimateAnalysisReservation } from './analysis.js';
import { cipher, HttpError } from './security.js';

export async function runWorker({store,config,fetchImpl,modelFetchImpl,maxJobs=4,maxMillis=110000}) {
  const started=Date.now();const outcomes=[];const crypto=cipher(config);
  const github=createGitHubClient({appId:config.appId,privateKey:config.privateKey,...(fetchImpl?{fetchImpl}:{})});
  await store.heartbeat('worker',{state:'running'});
  while(outcomes.length<maxJobs&&Date.now()-started<maxMillis-25000){
    const job=await store.claim();if(!job)break;let analysisProvider=null;
    try{
      const project=await store.project(job.user_id,job.project_id);
      if(!project.watching||project.status==='permission_revoked'){await store.finish(job);continue;}
      if(job.kind==='sync'){
        if(job.payload?.trackingVersion!=null&&job.payload.trackingVersion!==project.trackingVersion){await store.finish(job);outcomes.push({id:job.id,kind:job.kind,status:'obsolete_configuration'});continue;}
        const tokenResult=await github.installationToken(project.installationId,{repositoryIds:[project.repositoryId]});
        const token=typeof tokenResult==='string'?tokenResult:tokenResult.token;
        const startedAt=job.payload?.startedAt||new Date().toISOString();
        const result=await collectEvidence(project,{token,...(fetchImpl?{fetchImpl}:{}),since:project.lastSyncedAt,cursor:job.payload?.cursor||null,maxRequests:24,maxPages:2,maxDurationMs:Math.min(65000,Math.max(1000,maxMillis-(Date.now()-started)-20000))});
        await store.syncResult(job,{...result,trackingVersion:project.trackingVersion},startedAt);
        outcomes.push({id:job.id,kind:job.kind,status:'succeeded',complete:!result.cursor});
      } else {
        const context=await store.analysisContext(job);analysisProvider=context.provider;
        if(!context.provider){await store.worker(q=>q.query("UPDATE pcw.projects SET status='awaiting_ai' WHERE id=$1",[project.id]));await store.finish(job);outcomes.push({id:job.id,kind:job.kind,status:'awaiting_ai'});continue;}
        if(context.coverageLimited)context.sourceCoverage={...context.sourceCoverage,complete:false,reason:'Bounded recent context; full older records remain available in history.'};
        const input=buildAnalysisInput(context);
        const estimate=estimateAnalysisReservation(context.provider.config,context);
        const reservation=await store.reserve(job.user_id,context.provider.id,context.provider.version,estimate.costMicros,project.id,'analysis',{generation:context.project.generation,jobId:job.id,leaseToken:job.lease_token,retryKey:job.payload?.retryKey||'automatic'});
        if(reservation.duplicate){if(reservation.status&&reservation.status!=='succeeded'&&!reservation.active){const unknown=new HttpError(409,'AI_RESULT_UNCONFIRMED','之前的模型调用结果尚未确认，需要复核或手动重新分析');unknown.noRetry=true;throw unknown;}await store.finish(job);outcomes.push({id:job.id,kind:job.kind,status:reservation.active?'already_running':'already_analyzed'});continue;}
        let result;
        try{
          const key=crypto.decrypt(context.provider.key_cipher,`provider:${job.user_id}:${context.provider.id}`);
          await store.authorizeDispatch(job.user_id,reservation.id);
          result=await callAnalysis({...context.provider.config,timeoutMs:Math.max(1000,Math.min(context.provider.config.timeoutMs,maxMillis-(Date.now()-started)-10000))},key,context,{...(modelFetchImpl?{fetchImpl:modelFetchImpl}:{}),allowedHosts:config.allowedProviderHosts});
        }catch(error){await store.settle(job.user_id,reservation.id,{costMicros:error.costMicros,usage:error.usage,requestId:error.requestId,errorCode:error.code||'MODEL_ERROR',dispatched:error.requestSent===true});error.noRetry=error.requestSent===true;throw error;}
        try{await store.saveAnalysis(job,context,result,reservation.id);}catch(error){error.noRetry=true;error.code=error.code||'AI_RESULT_UNCONFIRMED';throw error;}
        outcomes.push({id:job.id,kind:job.kind,status:'succeeded'});
      }
      await store.finish(job);
    }catch(error){
      if(error.noRetry||['BUDGET_EXCEEDED','AI_BUDGET_DISABLED','AI_PRICE_REQUIRED','KEY_UNAVAILABLE'].includes(error.code))job.max_attempts=job.attempts;
      if(['PERMISSION_REVOKED','INSTALLATION_REVOKED','GITHUB_PERMISSION_REVOKED'].includes(error.code)||(job.kind==='sync'&&error.name==='GitHubError'&&['CREDENTIAL_REVOKED','FORBIDDEN','NOT_FOUND'].includes(error.code))){await store.worker(q=>q.query("UPDATE pcw.projects SET status='permission_revoked',last_error=$2 WHERE id=$1",[job.project_id,error.code||'PERMISSION_REVOKED']));job.max_attempts=job.attempts;}
      if(job.kind==='analyze'&&error.code==='PROVIDER_AUTH_FAILED'&&analysisProvider){await store.worker(q=>q.query("UPDATE pcw.providers SET status='unverified',last_error='MODEL_KEY_REJECTED' WHERE id=$1 AND version=$2 AND status='active'",[analysisProvider.id,analysisProvider.version]));}
      await store.finish(job,error,error.retryAt||null);outcomes.push({id:job.id,kind:job.kind,status:'failed',code:error.code||'WORKER_ERROR'});
    }
  }
  await store.heartbeat('worker',{state:'idle',processed:outcomes.length,failures:outcomes.filter(x=>x.status==='failed').length});
  return {processed:outcomes.length,outcomes};
}
