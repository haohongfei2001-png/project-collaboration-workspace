// The server is the only source of R2 project state. Private project records and
// credentials intentionally never enter browser persistence.
export class WorkspaceApiError extends Error {
  constructor(message, {status = 0, code = 'UNAVAILABLE', details = null} = {}) {
    super(message); this.name = 'WorkspaceApiError'; this.status = status; this.code = code; this.details = details;
  }
}

export function createWorkspaceClient({fetchImpl = globalThis.fetch, getCsrf = () => '', timeoutMs = 20000} = {}) {
  const request = async function(path, {method = 'GET', body, signal, idempotencyKey} = {}) {
    if (typeof path !== 'string' || !/^\/api\/[A-Za-z0-9_/?=&%.-]+$/.test(path) || path.includes('..') || /%2f|%5c/i.test(path)) throw new WorkspaceApiError('无效的工作台请求', {code: 'INVALID_PATH'});
    method = method.toUpperCase();
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) throw new WorkspaceApiError('不支持的操作', {code: 'INVALID_METHOD'});
    const mutating = method !== 'GET', csrf = getCsrf();
    if (mutating && !csrf) throw new WorkspaceApiError('登录状态已失效，请重新登录', {status: 401, code: 'AUTH_REQUIRED'});
    if (idempotencyKey !== undefined && (method !== 'POST' || !/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(idempotencyKey))) throw new WorkspaceApiError('验证记录的请求标识无效，请重新打开表单', {code:'INVALID_IDEMPOTENCY_KEY'});
    const timeout = new AbortController(), timer = setTimeout(() => timeout.abort(), timeoutMs);
    const abort = () => timeout.abort(); signal?.addEventListener('abort', abort, {once: true});
    if (signal?.aborted) timeout.abort();
    try {
      const response = await fetchImpl(path, {method, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: timeout.signal,
        headers: {'Accept': 'application/json', ...(mutating ? {'Content-Type': 'application/json', 'x-csrf-token': csrf} : {}), ...(idempotencyKey ? {'Idempotency-Key':idempotencyKey} : {})},
        ...(body !== undefined ? {body: JSON.stringify(body)} : {})});
      const type = response.headers?.get('content-type') || '';
      if (!type.includes('application/json')) throw new WorkspaceApiError('服务暂不可用，请稍后重试', {status: response.status});
      const text = await response.text();
      if (text.length > 8_000_000) throw new WorkspaceApiError('服务返回的数据过大，请缩小读取范围', {code: 'RESPONSE_TOO_LARGE'});
      let data; try { data = JSON.parse(text); } catch { throw new WorkspaceApiError('服务返回的内容不完整，请重试'); }
      if (!response.ok) {
        const error = typeof data.error === 'object' ? data.error : data;
        throw new WorkspaceApiError(error.message || (typeof data.error === 'string' ? data.error : '') || '请求未成功，请重试', {status: response.status, code: error.code || data.code || 'REQUEST_FAILED', details: error.details});
      }
      return data;
    } catch (error) {
      if (error instanceof WorkspaceApiError) throw error;
      throw new WorkspaceApiError(timeout.signal.aborted ? '请求已超时，请重试' : '无法连接工作台，保留上次读取结果', {code: timeout.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR'});
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  };
  request.recordVerification = (projectId, payload, {idempotencyKey} = {}) => {
    const fields = ['issueId','sha','result','environment','environmentDescription','scopeDescription','notes','personallyTested','coversIssue'];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).some(key => !fields.includes(key))) return Promise.reject(new WorkspaceApiError('验证记录含有不支持的字段', {code:'INVALID_VERIFICATION'}));
    if (!idempotencyKey) return Promise.reject(new WorkspaceApiError('缺少验证记录的请求标识，请重新打开表单', {code:'INVALID_IDEMPOTENCY_KEY'}));
    return request(`/api/projects/${encodeURIComponent(projectId)}/verification`, {method:'POST',body:payload,idempotencyKey});
  };
  return request;
}

const array = input => Array.isArray(input) ? input : [];
const text = input => typeof input === 'string' ? input : input?.text || input?.label || input?.title || '';
const timestamp = value => value ? Date.parse(value) || 0 : 0;

export function normalizeEvidence(row) {
  return {...row, id: String(row.id), sourceUrl: row.sourceUrl || row.source_url || row.url || '', sha: row.sha || row.headSha || '',
    occurredAt: row.occurredAt || row.occurred_at || row.createdAt, observedAt: row.observedAt || row.observed_at || row.createdAt,
    data: row.data || row.payload || {}, kind: row.kind || row.eventType || row.event_type || 'record'};
}

export function normalizePlan(row) {
  const data = row.data || row.document || row;
  return {...row, ...data, title: data.title || data.path || row.path || '开发计划', content: data.content ?? data.body ?? row.body,
    sha: row.sha || data.sha, ref: row.ref || row.sha || data.ref, sourceUrl: row.sourceUrl || row.source_url || data.sourceUrl,
    date: row.occurredAt || row.occurred_at || row.observedAt || row.observed_at || row.createdAt || row.created_at || data.date, items: array(data.items)};
}

export function evidenceRound(row) {
  if (!row.kind || !row.data) return row;
  const e = normalizeEvidence(row), d = e.data;
  const names = {pull_request:'PR 更新',commit:'提交',push:'代码推送',workflow_run:'自动检查',workflow_job:'检查任务',check_run:'检查',check_suite:'检查套件',deployment:'部署记录',deployment_status:'部署结果',issue_comment:'开发评论',pull_request_review:'审核记录',pull_request_review_comment:'代码审核评论',document:'来源文件',issue:'事项更新',status:'检查状态',workspace_record:'工作台记录'};
  const label = names[e.kind] || '来源记录';
  const title = d.title || d.name || d.path || d.message?.split('\n')[0] || d.body?.split('\n').find(line=>line.trim())?.replace(/^#+\s*/, '').slice(0,120) || label;
  const failure = ['failure','timed_out','startup_failure','error'].includes(d.conclusion || d.state);
  const reverted = e.kind === 'commit' && /^(revert\b|回退|回滚)/i.test(d.message || '');
  return {id:e.id, title:`${label} · ${title}`,date:e.occurredAt || e.observedAt,headSha:e.sha,
    status:reverted?'reverted':failure?'failed':e.kind==='pull_request'&&d.merged?'merged':'record',
    done:e.kind==='pull_request'&&d.merged?['PR 已合入目标分支；产品体验验收独立记录']:[],
    failed:failure?[`本次${label}结果：${d.conclusion || d.state}`]:[],next:[],
    sources:[{label:'原始记录',url:e.sourceUrl}],kind:e.kind};
}

export function normalizeProject(row) {
  const wrapped = row.analysis || row.latestAnalysis || row.latest_analysis;
  const analysis = wrapped?.analysis || wrapped?.result || wrapped?.output || wrapped || null;
  const allPlans = array(row.plans).map(normalizePlan).sort((a,b) => timestamp(b.date)-timestamp(a.date));
  const planPath = row.planPath || row.plan_path;
  const trackedPr = row.trackedPr ?? row.tracked_pr ?? null;
  const planLine = trackedPr ? `pr:${trackedPr}` : 'main';
  const plans = allPlans.filter(plan=>(!plan.line || plan.line===planLine) && (planPath ? plan.path===planPath : /plan/i.test(plan.path || plan.title || '')));
  const evidence = array(row.evidence).map(normalizeEvidence);
  const repo = row.repo || row.full_name || row.fullName || '';
  const icons = {riftlet:'/assets/apps/riftlet.svg',paia:'/assets/apps/paia.svg',pjsdas:'/assets/apps/todayaction.svg'};
  const repoName = repo.split('/')[1] || '';
  const familiar = {'Virtual-AI-Workspace-Layer':'VAIWL',paia:'PAIA',pjsdas:'TodayAction'}[repoName];
  const name = row.name && row.name !== repoName ? row.name : familiar || row.name || repoName;
  return {...row, id: String(row.id), name, repo, icon: row.icon || icons[repoName.toLowerCase()], watching: Boolean(row.watching),
    trackedPr, sourceRef: row.sourceRef || row.source_ref || 'main',
    headSha: row.headSha || row.head_sha || row.snapshot?.trackedHeadSha || row.snapshot?.commits?.[0]?.sha || '',
    observedAt: row.observedAt || row.observed_at || row.lastSyncedAt || row.last_synced_at || row.snapshot?.fetchedAt || null,
    status: row.status || {}, analysis, analysisMeta: wrapped,
    analysisNeedsReview: Boolean(row.analysisNeedsReview || row.analysis_needs_review || row.status?.needsReview || wrapped?.needsReview || wrapped?.needs_review || wrapped?.status === 'needs_review'),
    phase: {label: text(analysis?.stage) || '等待分析'}, plan: plans[0] || row.plan || {title:'等待获取开发计划',items:[]},
    previousPlans: plans.length ? plans.slice(1) : row.previousPlans || [], plans, evidence,
    rounds: array(row.rounds || row.history).map(evidenceRound), analyses: array(row.analyses), attention: array(row.attention),
    notes: array(row.notes), tasks: array(row.tasks), resolutions: row.resolutions || {},
    snapshot: row.snapshot || null};
}

export function serverSummary(project) {
  const analysis = project.analysis, stale = Boolean(project.analysisNeedsReview), progress = analysis?.progress || {};
  const known = !stale && progress.scopeComplete === true && Number.isFinite(progress.percent) && progress.percent >= 0 && progress.percent <= 100;
  const attention = array(project.attention).map(a => ({...a, key:a.id || a.key, actionable:true, kind:a.needsReview?'review':a.kind==='test'?'verify':a.kind,
    title:(a.needsReview?'需复核：':'')+text(a.title || a.text || a.claim), detail:a.detail || a.reason || '',
    sourceUrl:a.sourceUrl || a.source_url || a.sources?.[0]?.url || claimSources(a,project)[0]?.sourceUrl || '', at:a.at || a.createdAt || a.created_at,
    status:a.needsReview?'open':a.resolution?.status || a.status, snoozedUntil:a.resolution?.snoozedUntil || a.snoozedUntil || a.snoozed_until}));
  const active = attention.filter(a => !['handled','delegated','superseded','resolved'].includes(a.status) && !(a.status === 'snoozed' && timestamp(a.snoozedUntil) > Date.now()));
  const resolved = attention.filter(a => !active.includes(a)).map(a => ({...a,resolution:a.resolution || {status:a.status,note:a.note,at:a.updatedAt || a.updated_at || a.at}}));
  const signals = [['blocked',analysis?.blockers],['verify',analysis?.pendingVerification]].flatMap(([kind,claims])=>array(claims).map(claim=>({...claim,
    id:`signal:${claim.id}`,key:`signal:${claim.id}`,kind:stale||claim.pendingReview?'review':kind,title:(stale||claim.pendingReview?'待复核：':'')+text(claim),
    sourceUrl:claim.sources?.[0]?.url || claimSources(claim,project)[0]?.sourceUrl || '',actionable:false}))).filter(signal=>!active.some(a=>a.title===signal.title));
  return {phase:{label:text(analysis?.stage) || '等待分析',needsReview:stale},progress:{...progress,known,percent:known?progress.percent:null,needsReview:stale},
    sourceChanged:stale,stale,checks:project.checks || project.status?.checks || [], attention:[...active,...signals],userActions:active,signals,resolvedAttention:resolved,
    lastSyncedAt:project.lastSyncedAt || project.last_synced_at || project.observedAt,rounds:project.rounds};
}

// A saved worker error is a connection/processing signal, never evidence of a
// product failure or a request for a GitHub approval. Keep provider error names
// separate from GitHub authorization failures, including HTTP 401/403 cases.
export function projectHealth(project, {aiConfigured = false} = {}) {
  const status = typeof project.status === 'string' ? project.status : project.status?.state || '';
  const saved = project.lastError || project.last_error || project.status?.lastError || project.status?.syncError || '';
  const raw = (typeof saved === 'string' ? saved : saved.code || saved.message || '').slice(0, 300);
  const code = /^[A-Z][A-Z0-9_]{1,99}$/.test(raw) ? raw : '';
  const issue = (label, detail, action, tone = 'error', needsAttention = true) => ({label, detail, action, tone, needsAttention, code, rawError: code ? '' : raw});
  const modelSettings = {
    PROVIDER_AUTH_FAILED:['模型密钥需更换','模型 API Key 无效、已撤销或无此模型权限，请替换或重新验证连接。'],
    MODEL_KEY_REJECTED:['模型密钥需更换','模型服务拒绝了当前密钥，请替换或重新验证连接。'],
    AI_CREDENTIALS_INVALID:['模型密钥需更换','模型密钥已失效，请在连接设置中替换。'],
    BUDGET_EXCEEDED:['模型预算不足','本月剩余预算不足，分析已暂停。请核对消费记录与预算。'],
    AI_BUDGET_DISABLED:['模型预算未开启','模型预算为 0，尚未启动分析。请先设置预算。'],
    AI_PRICE_REQUIRED:['模型计费待设置','请补齐实际输入与输出价格，服务端才能预留调用预算。'],
    KEY_UNAVAILABLE:['密钥读取失败','服务端无法读取已保存密钥，请检查模型连接；若持续失败，需要检查服务端密钥设置。'],
    PROVIDER_CONFIG_INVALID:['模型配置需检查','模型配置未通过检查，请核对模型、接口地址与调用限额。'],
    PROVIDER_ADDRESS_REJECTED:['模型地址未获准','模型接口地址未通过服务端检查，请核对允许使用的接口。'],
    RESERVATION_EXCEEDED:['模型费用待复核','实际计费超出预留费用，后续分析已暂停，请核对消费记录。']
  };
  if (modelSettings[code]) return issue(...modelSettings[code], 'settings');
  if (/^(PROVIDER_|MODEL_|AI_)/.test(code)) {
    const label = code === 'PROVIDER_RATE_LIMITED' ? '模型调用受限' : code === 'AI_RESULT_UNCONFIRMED' ? '模型结果待复核' : '模型分析失败';
    return issue(label, '本次未形成新的项目判断，之前的记录仍保留。请核对连接与消费记录；重新分析会发起一次受预算限制的新调用。', aiConfigured ? 'retry-analysis' : 'settings');
  }
  const permissions = {
    INSTALLATION_REVOKED:['GitHub 授权已撤销','GitHub App 已卸载或暂停，后台读取已停止。重新连接后可继续使用已保存的历史。'],
    REPOSITORY_REMOVED:['仓库已移出授权','仓库已从 GitHub App 授权范围移除，请重新选择允许监控的仓库。'],
    CREDENTIAL_REVOKED:['GitHub 连接失效','GitHub 读取凭证失效，后台读取已停止，请重新连接 GitHub App。'],
    FORBIDDEN:['GitHub 权限不足','GitHub 拒绝读取仓库，请检查 App 权限、安装状态与仓库选择。'],
    NOT_FOUND:['仓库不可读取','仓库可能已移除、迁移或不在授权范围，请检查 GitHub App 的仓库选择。']
  };
  if (permissions[code]) return issue(...permissions[code], 'install');
  if (status === 'permission_revoked' || ['PERMISSION_REVOKED','GITHUB_PERMISSION_REVOKED'].includes(code)) return issue('仓库授权已撤销', '后台读取已停止，已保存的事实与旧判断仍可查看。请重新连接 GitHub App 并确认仓库授权。', 'install');
  if (code === 'RATE_LIMITED') return issue('GitHub 读取受限', 'GitHub API 已触发限流，后台会按服务端时间安排重试。已保存记录保留。', 'sync', 'warning');
  if (['APP_CONFIGURATION','INVALID_INSTALLATION','INVALID_CREDENTIAL'].includes(code)) return issue('GitHub 配置异常', '后台无法使用当前 GitHub App 配置，请检查连接设置与服务端配置。', 'settings');
  if (['NETWORK_ERROR','TIMEOUT','API_ERROR','INVALID_RESPONSE','RESPONSE_TOO_LARGE','INVALID_CURSOR','INVALID_PAGINATION','COLLECTION_CAPACITY','REDIRECT_REFUSED','REPOSITORY_IDENTITY_CHANGED'].includes(code)) return issue('GitHub 读取失败', '本次来源读取未完成，保留上次成功保存的记录。可以重试同步，最新状态仍需补齐来源。', 'sync');
  if (raw || status === 'attention') return issue('后台处理需检查', '后台任务未成功完成，已有记录仍保留。请查看错误记录与连接设置。', 'settings');
  if (status === 'awaiting_ai') return issue('等待模型连接', '已保存 GitHub 事实，尚无已验证的可用模型连接。请连接模型并设置预算。', 'settings', 'warning');
  const pending = Number(project.coverage?.pendingTasks);
  if (Number.isSafeInteger(pending) && pending > 0) return issue('历史补读中', `还有 ${pending} 项来源待补读。已保存的记录可查看，当前判断只覆盖已读取的证据。`, 'sync', 'waiting', false);
  if (status === 'pending') return issue('等待首次同步', '项目已加入后台队列，尚未完成首次来源读取。', 'sync', 'waiting', false);
  if (status === 'needs_review') return issue('等待分析更新', '新证据已保存，上一版判断需要复核，后台将按预算与事件安排分析。', aiConfigured ? 'retry-analysis' : 'settings', 'waiting', false);
  if (project.coverage?.complete === false) return issue('来源读取不完整', '部分 GitHub 来源尚未完整读取，请展开来源记录查看缺失范围。', 'sync', 'warning');
  return null;
}

export function claimSources(claim, project) {
  const ids = new Set(array(claim?.evidenceIds || claim?.evidence_ids).map(String));
  return array(project.evidence).filter(item => ids.has(String(item.id)));
}

export function mergeProjectDetail(project, detail) {
  const merge=(older,newer)=>[...new Map([...array(older),...array(newer)].map(item=>[String(item.id || item.sha || item.sourceUrl || item.source_url),item])).values()];
  return normalizeProject({...project,...detail,
    evidence: detail.evidence ? merge(project.evidence,detail.evidence) : project.evidence,
    rounds: detail.history || detail.rounds ? merge(project.rounds,detail.history || detail.rounds) : project.rounds,
    analysis: detail.analysis ?? project.analysisMeta ?? project.analysis,
    attention: detail.attention ?? project.attention,
    analyses: detail.analyses ? merge(project.analyses,detail.analyses) : project.analyses,
    plans: detail.plans ? merge(project.plans,detail.plans) : project.plans,
    historyHasMore:detail.hasMore ?? project.historyHasMore,
    historyCursor:detail.nextCursor ?? project.historyCursor,
    analysesHasMore:detail.analysesHasMore ?? project.analysesHasMore,
    nextAnalysisCursor:detail.nextAnalysisCursor ?? project.nextAnalysisCursor,
    historyCoverage:detail.coverage ?? project.historyCoverage});
}
