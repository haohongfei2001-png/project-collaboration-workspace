/**
 * Pure, deterministic domain model for the Project Collaboration Workspace prototype.
 * All people, source records and events are fictional. These client-side checks model
 * policy; they are NOT a production security boundary. Real authorization belongs on
 * the server and must intersect current provider permissions with project policy.
 */

const START = '2026-10-31T02:00:00.000Z';
const copy = value => JSON.parse(JSON.stringify(value));
const timestamp = state => new Date(Date.parse(state.clock || START) + 60_000).toISOString();
const clean = (value, max = 2000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const allHumanIds = ['owner', 'designer', 'frontend', 'backend', 'qa', 'viewer'];
const eventResult = (state, message) => ({ ok: true, state, message, idempotent: true });
const failure = (state, code, message) => ({ ok: false, state, error: { code, message }, message });

class DomainError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const assert = (condition, code, message) => { if (!condition) throw new DomainError(code, message); };
const taskById = (state, id) => state.tasks.find(item => item.id === id);
const resourceById = (state, id) => state.resources.find(item => item.id === id);
const actorById = (state, id) => [...state.members, ...state.agents].find(item => item.id === id);
const isAgent = (state, id) => state.agents.some(item => item.id === id);
const isManager = (state, id) => state.members.some(item => item.id === id && item.role === 'owner');
const isReviewer = (state, id) => state.members.some(item => item.id === id && ['owner', 'qa'].includes(item.role));
const isLeaf = (state, id) => !state.tasks.some(task => task.parentId === id);

function log(state, actorId, action, targetId, detail, extras = {}) {
  state.audit.unshift({ id: `event-${state.revision}-${state.audit.length + 1}`, actorId, action,
    targetId, detail, at: state.clock, ...extras });
}

function resource(id, title, provider, kind, version, content, options = {}) {
  return { id, title, provider, kind, version, content, available: true,
    allowedActors: [...allHumanIds], updatedAt: START, syncedAt: START,
    simulated: true, sourceSequence: 1,
    history: [{ version, content, updatedAt: START }], ...options };
}

/** Create a consistent fictional software-team project; 11 rows, 10 leaf tasks. */
export function createSeed() {
  const members = [
    { id: 'owner', name: '林澈', role: 'owner', roleLabel: '产品负责人', initial: '澈', color: '#7367c6' },
    { id: 'designer', name: '沈言', role: 'designer', roleLabel: '产品设计师', initial: '言', color: '#c38367' },
    { id: 'frontend', name: '周屿', role: 'frontend', roleLabel: '前端工程师', initial: '屿', color: '#6386b9' },
    { id: 'backend', name: '陈序', role: 'backend', roleLabel: '后端工程师', initial: '序', color: '#5a9988' },
    { id: 'qa', name: '许宁', role: 'qa', roleLabel: '测试与交付', initial: '宁', color: '#ad8a48' },
    { id: 'viewer', name: '顾乔', role: 'viewer', roleLabel: '观察者', initial: '乔', color: '#8a8e98' },
  ];
  const agents = [
    { id: 'observer', name: '观察助手', role: 'agent', roleLabel: '只读项目观察', initial: '观', color: '#879993',
      allowedResourceIds: ['r-project', 'r-requirements', 'r-flow', 'r-design', 'r-pr', 'r-qa'], canDraft: false },
    { id: 'planner', name: '规划助手', role: 'agent', roleLabel: '需求拆分草案', initial: '规', color: '#8e83b4',
      allowedResourceIds: ['r-project', 'r-requirements', 'r-flow', 'r-design'], canDraft: true },
  ];
  const milestones = [
    { id: 'm1', title: '需求对齐', name: '需求对齐', dueDate: '2026-10-30', description: '明确范围、流程与验收依据' },
    { id: 'm2', title: '设计与实现', name: '设计与实现', dueDate: '2026-11-04', description: '采用交互方案，完成闭环能力' },
    { id: 'm3', title: '验收与交付', name: '验收与交付', dueDate: '2026-11-06', description: '验证端到端流程并交接试点' },
  ];
  const resources = [
    resource('r-project', '客户反馈闭环 · 项目目标', 'workspace', 'brief', 'v1',
      '为小型软件团队建立反馈收集、明确负责人、处理跟进与回应的完整闭环。试点目标：每条有效反馈在 2 个工作日内明确负责人；这是演示目标，并非已经取得的业务成果。首期不包含自动向客户发送回应。'),
    resource('r-requirements', '客户反馈闭环 · 需求说明', 'drive', 'document', 'v2',
      '范围：集中收集反馈；按状态筛选；每条反馈有唯一负责人；记录反馈与处理回应。角色：产品负责人可指派，工程师更新自己的处理，观察者只读。验收：指派记录可追溯；未指派反馈能被发现；回应进入时间线。首期不自动发送客户消息。', { fileName: '反馈闭环需求说明', externalId: 'demo-drive-requirements', demoScenario: 'feedback' }),
    resource('r-flow', '反馈从进入到回应 · 用户流程', 'drive', 'document', 'v1',
      '客户反馈进入待分配队列 → 产品负责人指派 → 工程师处理 → 负责人审核回应 → 形成可追溯的处理记录。未知负责人不能被标记为已处理。', { externalId: 'demo-drive-flow' }),
    resource('r-design', '反馈工作台 · 交互方案', 'drive', 'design', 'v2',
      '方案 A：按状态分列的看板，适合熟悉流程的执行成员。方案 B：收件箱与固定上下文栏，便于负责人连续分配、审阅和追溯。两者保留相同状态模型；本次须明确采用版本并说明理由。', { externalId: 'demo-drive-design', demoScenario: 'feedback' }),
    resource('r-pr', '#42 · 反馈与回应 API', 'github', 'pull_request', 'open@1',
      'PR #42 已打开：实现反馈创建、负责人分配及回应记录接口。代码评审中，尚未合并；测试检查已通过不能替代业务验收。',
      { externalId: 'demo/repo/pull/42', number: 42, state: 'open', checks: 'passed', authorId: 'backend', headSha: 'demo-42-head-v1', demoScenario: 'feedback' }),
    resource('r-qa', '反馈闭环 · 验收清单', 'drive', 'document', 'v1',
      '验收路径：收集反馈 → 指派负责人 → 更新处理状态 → 保存回应 → 查询历史。权限反例：观察者无法修改；工程师无法修改他人任务；未经审核不视为正式交付。', { externalId: 'demo-drive-qa' }),
    resource('r-budget', '试点预算与供应商报价', 'drive', 'restricted', 'v1',
      '仅负责人可读取的虚构预算资料：试点预算上限 18000 元，供应商方案暂未批准。本内容不应进入任何演示 AI 的上下文。',
      { allowedActors: ['owner'], externalId: 'demo-drive-budget', restricted: true }),
  ];
  const definitions = [
    ['FB-01', '明确试点范围与成功标准', 'm1', 'owner', 'accepted', [], '以产品负责人分配反馈为首个场景，明确两工作日负责人目标及首期边界。', ['试点目标及不做范围有记录', '成功标准可被实际验证'], '2026-10-29'],
    ['FB-02', '梳理反馈处理流程', 'm1', 'owner', 'accepted', [], '统一从反馈进入、指派、处理到回应的状态流，标明异常与退出路径。', ['流程覆盖指派与回应', '观察者权限边界明确'], '2026-10-30'],
    ['FB-00', '反馈闭环实现', 'm2', 'owner', 'in_progress', [], '组织设计、前后端与权限实现。此行为工作分解父项，不重复计入验收完成度。', ['子任务分别完成验收'], '2026-11-04'],
    ['FB-03', '反馈工作台交互方案', 'm2', 'designer', 'review', [], '对比看板与收件箱两种方案，保留选择理由并固定正式采用版本。', ['负责人完成方案采用并记录原因', '关键交互与异常态覆盖完整'], '2026-10-31'],
    ['FB-04', '反馈与回应 API', 'm2', 'backend', 'in_progress', [{ taskId: 'FB-02', gate: 'accepted' }], '实现反馈创建、指派和回应 API。PR 合并后进入待验收，需核对业务标准。', ['PR #42 已合并且检查通过', '反馈与回应保存路径有验收证据'], '2026-11-02'],
    ['FB-05', '前端反馈收件箱', 'm2', 'frontend', 'blocked', [{ taskId: 'FB-03', gate: 'adopted' }], '按正式采用的设计实现反馈列表、详情与负责人指派，保留当前上下文。', ['采用版本有来源依据', '筛选、详情与指派流程可完成'], '2026-11-03'],
    ['FB-06', '成员与权限校验', 'm2', 'backend', 'todo', [{ taskId: 'FB-04', gate: 'accepted' }], '在服务端校验负责人、工程师与观察者的操作权限；不能只隐藏按钮。', ['观察者写入请求被拒绝', '越权修改请求被拒绝并留下审计'], '2026-11-03'],
    ['FB-07', '反馈回应时间线', 'm2', 'frontend', 'todo', [{ taskId: 'FB-05', gate: 'accepted' }], '呈现每条反馈的指派、状态和回应历史，明确操作者与时间。', ['回应按实际发生时间排序', '历史记录能定位到源反馈'], '2026-11-04'],
    ['FB-08', '编写交付验收用例', 'm3', 'qa', 'todo', [{ taskId: 'FB-02', gate: 'accepted' }], '编写正常闭环和权限拒绝、缺失负责人等反例，提供可复现步骤。', ['覆盖正常闭环', '覆盖权限拒绝与缺失负责人'], '2026-11-02'],
    ['FB-09', '端到端回归验收', 'm3', 'qa', 'blocked', ['FB-04', 'FB-05', 'FB-06', 'FB-07', 'FB-08'].map(taskId => ({ taskId, gate: 'accepted' })), '以产品、工程师、观察者三种角色完成真实闭环回归，提交逐项结果。', ['核心路径全部通过', '权限与异常反例全部通过'], '2026-11-05'],
    ['FB-10', '试点交付与交接', 'm3', 'owner', 'todo', [{ taskId: 'FB-09', gate: 'accepted' }], '整理采用版本、验收结果、已知限制及下一阶段计划，形成正式交付记录。', ['验收结果与采用版本完整', '已知限制与交接责任人明确'], '2026-11-06'],
  ];
  const tasks = definitions.map(([id, title, milestoneId, assigneeId, status, dependencies, description, criteria, dueDate]) => ({
    id, title, milestoneId, assigneeId, status, dependencies, description, dueDate,
    parentId: ['FB-03', 'FB-04', 'FB-05', 'FB-06', 'FB-07'].includes(id) ? 'FB-00' : null,
    priority: ['FB-03', 'FB-04', 'FB-05', 'FB-09'].includes(id) ? 'high' : 'medium',
    criteria: criteria.map((text, index) => ({ id: `${id}-c${index + 1}`, text })),
    resourceLinks: [{ resourceId: 'r-requirements', pinnedVersion: 'v2' }],
    updatedAt: START, version: 1, manualBlockReason: '',
  }));
  const link = (id, resourceId, pinnedVersion) => taskById({ tasks }, id).resourceLinks.push({ resourceId, pinnedVersion });
  link('FB-02', 'r-flow', 'v1'); link('FB-03', 'r-design', 'v2');
  link('FB-04', 'r-pr', 'open@1'); link('FB-05', 'r-design', 'v2');
  for (const id of ['FB-08', 'FB-09', 'FB-10']) link(id, 'r-qa', 'v1');
  const proposals = [
    { id: 'proposal-a', taskId: 'FB-03', title: '方案 A · 流程看板', version: 'v2', status: 'submitted', authorId: 'designer',
      summary: '按处理状态分列，让执行成员直观看到工作阶段。',
      tradeoffs: ['阶段分布清楚', '跨列查找反馈需要更多移动', '长内容与关联资料需要展开'], resourceId: 'r-design', submittedAt: START },
    { id: 'proposal-b', taskId: 'FB-03', title: '方案 B · 上下文收件箱', version: 'v2', status: 'submitted', authorId: 'designer',
      summary: '列表与详情并排，负责人可连续查看、分配和回应。',
      tradeoffs: ['连续处理时保留上下文', '指派与资料在同一位置', '阶段全貌通过筛选补充'], resourceId: 'r-design', submittedAt: START },
  ];
  const acceptances = ['FB-01', 'FB-02'].map((taskId, index) => ({ id: `accept-seed-${index + 1}`, taskId,
    submissionId: `submission-seed-${index + 1}`, reviewerId: 'owner', reviewedBy: 'owner', reviewedAt: START,
    criteriaIds: taskById({ tasks }, taskId).criteria.map(item => item.id), note: '演示记录：已核对范围、流程及验收依据。',
    evidenceRefs: taskById({ tasks }, taskId).resourceLinks.map(copy), taskVersion: 1, result: 'accepted' }));
  const submissions = acceptances.map(item => ({ id: item.submissionId, taskId: item.taskId, authorId: 'owner', status: 'accepted',
    note: '提交范围与流程定义。', evidenceRefs: copy(item.evidenceRefs), submittedAt: START, taskVersion: 1 }));
  submissions.push({ id: 'submission-design-v2', taskId: 'FB-03', authorId: 'designer', status: 'submitted', note: '已提交两套可比较的 v2 方案，请负责人选择采用并独立验收。', evidenceRefs: [{ resourceId: 'r-design', pinnedVersion: 'v2' }], submittedAt: START, taskVersion: 1 });
  return {
    schemaVersion: 1, revision: 1, clock: START,
    project: { id: 'feedback', code: 'FB', name: '客户反馈闭环', goal: '让每条反馈都有明确负责人、处理进展和可追溯的回应。',
      successMetric: '演示目标：有效反馈在 2 个工作日内明确负责人', dueDate: '2026-11-06', status: 'active', ownerId: 'owner',
      scope: '反馈收集、责任分配、处理跟进、回应记录；不包含自动发送客户消息。', createdAt: '2026-10-26T01:00:00.000Z' },
    members, agents, milestones, tasks, resources, proposals, decisions: [], submissions, acceptances,
    audit: [
      { id: 'seed-event-4', actorId: 'designer', action: 'proposal.submitted', targetId: 'FB-03', detail: '提交交互方案 A 与 B，当前均为 v2，等待采用。', at: '2026-10-31T01:40:00.000Z' },
      { id: 'seed-event-3', actorId: 'backend', action: 'github.linked', targetId: 'FB-04', detail: '关联演示 PR #42；代码评审中。', at: '2026-10-30T08:30:00.000Z' },
      { id: 'seed-event-2', actorId: 'owner', action: 'task.accepted', targetId: 'FB-02', detail: '验收反馈处理流程；需求对齐里程碑完成。', at: '2026-10-30T04:20:00.000Z' },
      { id: 'seed-event-1', actorId: 'owner', action: 'project.created', targetId: 'feedback', detail: '创建项目，明确目标、首期范围与交付责任。', at: '2026-10-26T01:00:00.000Z' },
    ], processedEvents: [], appliedPlans: [], deliveries: [],
  };
}

export function getLeaves(state) { return state.tasks.filter(task => isLeaf(state, task.id)); }

function adoptedForTask(state, taskId) {
  return state.proposals.find(proposal => proposal.taskId === taskId && proposal.status === 'adopted');
}

/** The work tree and dependency graph are independent. Resource freshness is a gate. */
export function getTaskBlockers(state, taskId) {
  const task = taskById(state, taskId);
  if (!task) return [];
  const blockers = [];
  for (const dependency of task.dependencies) {
    const upstream = taskById(state, dependency.taskId);
    const satisfied = dependency.gate === 'adopted' ? Boolean(adoptedForTask(state, dependency.taskId)) : upstream?.status === 'accepted';
    if (!satisfied) blockers.push({ taskId: dependency.taskId, title: upstream?.title || dependency.taskId, gate: dependency.gate,
      reason: dependency.gate === 'adopted' ? '等待负责人采用方案' : '依赖任务尚未验收' });
  }
  for (const link of task.resourceLinks) {
    const item = resourceById(state, link.resourceId);
    if (!item || !item.available) blockers.push({ resourceId: link.resourceId, title: '关联来源', gate: 'available', reason: '来源暂不可访问，请恢复后核对' });
    else if (link.pinnedVersion !== item.version) blockers.push({ resourceId: item.id, title: item.title, gate: 'review',
      reason: `引用 ${link.pinnedVersion}，当前 ${item.version}，需要复核` });
  }
  if (task.manualBlockReason) blockers.push({ taskId: task.id, title: task.title, gate: 'manual', reason: task.manualBlockReason });
  return blockers;
}
export const getBlockers = getTaskBlockers;

export function getEffectiveStatus(state, taskOrId) {
  const task = typeof taskOrId === 'string' ? taskById(state, taskOrId) : taskOrId;
  if (!task) return 'todo';
  const children = state.tasks.filter(item => item.parentId === task.id);
  if (children.length) {
    const childStates = children.map(child => getEffectiveStatus(state, child));
    if (childStates.every(status => status === 'accepted')) return 'accepted';
    if (childStates.includes('blocked')) return 'blocked';
    if (childStates.every(status => status === 'todo')) return 'todo';
    return 'in_progress';
  }
  if (task.status === 'accepted') return 'accepted';
  if (getTaskBlockers(state, task.id).length > 0) return 'blocked';
  return task.status;
}

export function getProgress(state) {
  const leaves = getLeaves(state);
  const counts = { accepted: 0, review: 0, in_progress: 0, blocked: 0, todo: 0 };
  for (const task of leaves) counts[getEffectiveStatus(state, task)] += 1;
  const accepted = counts.accepted;
  return { total: leaves.length, accepted, review: counts.review, inProgress: counts.in_progress,
    blocked: counts.blocked, todo: counts.todo, statusCounts: counts,
    rawReview: leaves.filter(task => task.status === 'review').length,
    percent: leaves.length ? Math.round(accepted / leaves.length * 100) : 0,
    milestones: state.milestones.map(milestone => {
      const items = leaves.filter(task => task.milestoneId === milestone.id);
      const count = items.filter(task => task.status === 'accepted').length;
      return { ...milestone, total: items.length, accepted: count, percent: items.length ? Math.round(count / items.length * 100) : 0,
        status: items.length && count === items.length ? 'accepted' : items.some(task => task.status !== 'todo') ? 'in_progress' : 'todo' };
    }),
    readyToDeliver: leaves.length > 0 && leaves.every(task => task.status === 'accepted' && getTaskBlockers(state, task.id).length === 0
      && state.acceptances.some(item => item.taskId === task.id && !item.invalidatedAt)),
    deliveryHealth: getDeliveryHealth(state),
    currentEvidenceWarning: getDeliveryHealth(state).status === 'needs_review' ? '历史交付保留；当前部分来源或业务依据需要复核。' : null,
  };
}

/** A delivered manifest is historical; current source health remains observable. */
export function getDeliveryHealth(state) {
  const delivery = state.deliveries?.at(-1);
  if (!delivery) return { status: 'not_delivered', label: '尚未交付', issues: [], asOf: null, checkedAt: state.clock };
  const issues = [];
  const add = (code, targetId, taskId) => {
    const existing = issues.find(item => item.code === code && item.targetId === targetId);
    if (existing) { if (!existing.taskIds.includes(taskId)) existing.taskIds.push(taskId); }
    else issues.push({ code, targetId, taskIds: [taskId] });
  };
  const manifest = delivery.manifest || delivery.taskIds.map(taskId => {
    const acceptance = state.acceptances.find(item => item.taskId === taskId && delivery.acceptanceIds.includes(item.id));
    return { taskId, acceptanceId: acceptance?.id, evidenceRefs: acceptance?.evidenceRefs || [] };
  });
  for (const item of manifest) {
    const acceptance = state.acceptances.find(entry => entry.id === item.acceptanceId);
    if (!acceptance || acceptance.invalidatedAt) add('acceptance_changed', item.acceptanceId || item.taskId, item.taskId);
    for (const ref of item.evidenceRefs) {
      const source = resourceById(state, ref.resourceId);
      if (!source?.available) add('source_unavailable', ref.resourceId, item.taskId);
      else if (source.version !== ref.pinnedVersion) add('source_changed', ref.resourceId, item.taskId);
    }
  }
  for (const decisionId of delivery.decisionIds) {
    const decision = state.decisions.find(item => item.id === decisionId);
    if (!decision || decision.supersededBy) add('decision_changed', decisionId, decision?.taskId || state.project.id);
  }
  return { status: issues.length ? 'needs_review' : 'verified', label: issues.length ? '已交付 · 当前依据待复核' : '已交付 · 当前依据可核对',
    issues, asOf: delivery.at, checkedAt: state.clock };
}

function canReadResource(state, actorId, item, agentId) {
  const actor = actorById(state, actorId);
  if (!actor || isAgent(state, actorId) || !item?.available || !item.allowedActors.includes(actorId)) return false;
  if (!agentId) return true;
  const agent = state.agents.find(item => item.id === agentId);
  return Boolean(agent?.allowedResourceIds.includes(item.id));
}

export function visibleResources(state, actorId, agentId) {
  return state.resources.filter(item => canReadResource(state, actorId, item, agentId)).map(copy);
}

/** Previously linked source metadata can remain visible without returning its body. */
export function resourceMetadata(state, actorId, resourceId) {
  const item = resourceById(state, resourceId);
  if (!actorById(state, actorId) || isAgent(state, actorId) || !item?.allowedActors.includes(actorId)) return null;
  return { id: item.id, title: item.title, provider: item.provider, kind: item.kind, version: item.version,
    available: item.available, updatedAt: item.updatedAt, syncedAt: item.syncedAt,
    simulated: true, restricted: Boolean(item.restricted), state: item.state || null,
    availabilityLabel: item.available ? '可访问' : '来源暂不可访问',
    inaccessibleReason: item.available ? null : '来源可能已移动、删除或撤去访问权；当前不能读取正文。' };
}

/** Policy is enforced by execute as well as UI affordances. This is a demo policy. */
export function can(state, actorId, action, target) {
  const actor = actorById(state, actorId);
  if (!actor) return false;
  if (isAgent(state, actorId)) return action === 'draft' && Boolean(actor.canDraft);
  const targetId = typeof target === 'string' ? target : target?.id || target?.taskId;
  const task = taskById(state, targetId);
  if (['read', 'summarize'].includes(action)) return true;
  if (action === 'readResource') return canReadResource(state, actorId, typeof target === 'object' && target.provider ? target : resourceById(state, targetId));
  if (state.project.status === 'delivered' && !['createProject', 'sourceUnavailable', 'restoreSource'].includes(action)) return false;
  if (['createTask', 'assign', 'adoptProposal', 'syncGithub', 'syncDrive', 'sourceUnavailable', 'restoreSource', 'applyPlan', 'deliverProject', 'createProject', 'manageMembers'].includes(action)) return isManager(state, actorId);
  if (['acceptTask', 'accept'].includes(action)) return isReviewer(state, actorId);
  if (action === 'registerResource') return actor.role !== 'viewer';
  if (['draft', 'createPlan'].includes(action)) return actor.role !== 'viewer';
  if (['updateTask', 'setStatus', 'submitTask', 'submitProposal', 'linkResource', 'reviewResource'].includes(action)) {
    return Boolean(task && actor.role !== 'viewer' && (isManager(state, actorId) || task.assigneeId === actorId || (actor.role === 'qa' && action === 'reviewResource')));
  }
  return false;
}

function validateGraphs(state) {
  const ids = new Set(state.tasks.map(task => task.id));
  assert(ids.size === state.tasks.length, 'DUPLICATE_ID', '任务编号重复。');
  for (const task of state.tasks) {
    assert(!task.parentId || ids.has(task.parentId), 'PARENT_NOT_FOUND', '父任务不存在。');
    if (task.parentId) assert(taskById(state, task.parentId).milestoneId === task.milestoneId, 'MILESTONE_MISMATCH', '父子任务必须位于同一里程碑。');
    for (const dependency of task.dependencies) {
      assert(ids.has(dependency.taskId), 'DEPENDENCY_NOT_FOUND', '依赖任务不存在。');
      assert(['accepted', 'adopted'].includes(dependency.gate), 'INVALID_GATE', '依赖条件无效。');
    }
  }
  const visit = (id, visiting, visited, edges, code) => {
    assert(!visiting.has(id), code, code === 'TREE_CYCLE' ? '工作分解不能形成循环。' : '任务依赖不能形成循环。');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of edges(taskById(state, id))) visit(next, visiting, visited, edges, code);
    visiting.delete(id); visited.add(id);
  };
  for (const [edges, code] of [[task => task.parentId ? [task.parentId] : [], 'TREE_CYCLE'], [task => task.dependencies.map(item => item.taskId), 'DEPENDENCY_CYCLE']]) {
    const visited = new Set();
    for (const task of state.tasks) visit(task.id, new Set(), visited, edges, code);
  }
  for (const task of state.tasks) {
    for (const dependency of task.dependencies) {
      assert(dependency.gate !== 'accepted' || isLeaf(state, dependency.taskId), 'DELIVERABLE_PARENT',
        '该任务被其他工作等待验收，不能改为工作分组。请保留此交付任务，另建分组组织子任务。');
    }
  }
}

function getEvidence(state, task, actorId, evidenceIds) {
  const ids = Array.isArray(evidenceIds) ? evidenceIds : task.resourceLinks.map(link => link.resourceId);
  assert(ids.length > 0, 'EVIDENCE_REQUIRED', '请先关联至少一份成果或验收资料。');
  return [...new Set(ids)].map(id => {
    const item = resourceById(state, id);
    assert(item && canReadResource(state, actorId, item), 'EVIDENCE_UNAVAILABLE', '部分证据不在当前可访问范围内。');
    assert(task.resourceLinks.some(link => link.resourceId === id), 'EVIDENCE_NOT_LINKED', '请先将证据关联到当前任务。');
    return { resourceId: id, pinnedVersion: item.version };
  });
}

function addTask(state, command, actorId) {
  const title = clean(command.title, 140);
  assert(title, 'TITLE_REQUIRED', '请填写任务名称。');
  assert(state.milestones.some(item => item.id === command.milestoneId), 'MILESTONE_REQUIRED', '请选择有效里程碑。');
  const assigneeId = command.assigneeId || actorId;
  assert(state.members.some(item => item.id === assigneeId && item.role !== 'viewer'), 'INVALID_ASSIGNEE', '请选择可执行任务的团队成员。');
  const number = Math.max(0, ...state.tasks.map(task => Number(task.id.split('-').pop()) || 0)) + 1;
  const id = `${state.project.code}-${String(number).padStart(2, '0')}`;
  const criteria = Array.isArray(command.criteria) && command.criteria.length ? command.criteria.map(value => clean(typeof value === 'string' ? value : value.text)).filter(Boolean) : ['交付成果满足任务要求并通过责任人验收'];
  assert(criteria.length > 0, 'CRITERIA_REQUIRED', '至少需要一项验收标准。');
  const task = { id, title, description: clean(command.description), assigneeId, milestoneId: command.milestoneId,
    parentId: command.parentId || null, status: 'todo', priority: ['high', 'medium', 'low'].includes(command.priority) ? command.priority : 'medium',
    dueDate: clean(command.dueDate, 10) || state.project.dueDate,
    dependencies: Array.isArray(command.dependencies) ? copy(command.dependencies) : [], resourceLinks: [],
    criteria: criteria.map((text, index) => ({ id: `${id}-c${index + 1}`, text })), version: 1, updatedAt: state.clock, manualBlockReason: '' };
  state.tasks.push(task);
  validateGraphs(state);
  log(state, actorId, 'task.created', id, `创建「${title}」，负责人 ${actorById(state, assigneeId).name}。`);
  return task;
}

function bumpTask(task, state) { task.version += 1; task.updatedAt = state.clock; }

function invalidateAcceptance(state, task, actorId, reason, touch = true, seen = new Set()) {
  if (!task || seen.has(task.id)) return;
  seen.add(task.id);
  const wasAccepted = task.status === 'accepted';
  if (!wasAccepted) return;
  task.reviewReason = reason;
  if (wasAccepted) {
    task.status = 'review';
    if (touch) bumpTask(task, state);
    for (const acceptance of state.acceptances.filter(item => item.taskId === task.id && !item.invalidatedAt)) {
      acceptance.invalidatedAt = state.clock; acceptance.invalidatedBy = actorId; acceptance.invalidationReason = reason;
    }
    log(state, actorId, 'acceptance.invalidated', task.id, `当前验收需重新确认，历史记录保留：${reason}`);
    for (const downstream of state.tasks.filter(item => item.dependencies.some(dep => dep.taskId === task.id && dep.gate === 'accepted'))) {
      invalidateAcceptance(state, downstream, actorId, `前置任务 ${task.id} 的验收依据已变化。`, true, seen);
    }
  }
}

function decisionRefsForTask(state, task) {
  const ids = new Set([task.id, ...task.dependencies.filter(item => item.gate === 'adopted').map(item => item.taskId)]);
  return state.decisions.filter(item => ids.has(item.taskId) && !item.supersededBy)
    .map(item => ({ decisionId: item.id, taskId: item.taskId, proposalId: item.proposalId, adoptedVersion: item.adoptedVersion }));
}

/** All mutations use this single validated, immutable command gateway. */
export function execute(original, command, actorId) {
  if (!command || typeof command.type !== 'string') return failure(original, 'INVALID_COMMAND', '操作格式无效。');
  if (!can(original, actorId, command.type, command.taskId || command.proposalId || null)) return failure(original, 'FORBIDDEN', '当前身份没有执行此操作的权限。');
  if (['syncGithub', 'syncDrive'].includes(command.type)) {
    const eventId = command.eventId || (command.type === 'syncGithub' ? 'gh-merge-42' : 'drive-requirements-v3');
    if (original.processedEvents.includes(eventId)) return eventResult(original, '该演示事件已处理，本次不会重复写入。');
  }
  if (command.type === 'applyPlan' && original.appliedPlans.includes(command.plan?.id)) return eventResult(original, '此计划已经应用，不会重复创建任务。');
  const state = copy(original);
  state.revision += 1; state.clock = timestamp(original);
  try {
    let task = command.taskId ? taskById(state, command.taskId) : null;
    if (command.taskId) assert(task, 'TASK_NOT_FOUND', '任务不存在。');
    switch (command.type) {
      case 'createTask': {
        task = addTask(state, command, actorId);
        const parent = task.parentId ? taskById(state, task.parentId) : null;
        if (parent?.status === 'accepted') {
          invalidateAcceptance(state, parent, actorId, '工作范围增加了子任务；父项进度改由子任务汇总。');
          parent.status = 'in_progress';
        }
        break;
      }
      case 'updateTask': {
        const patch = command.patch || {};
        const before = JSON.stringify(task);
        if ('assigneeId' in patch && patch.assigneeId !== task.assigneeId) {
          assert(can(state, actorId, 'assign'), 'FORBIDDEN', '只有产品负责人可以调整任务责任人。');
          assert(state.members.some(item => item.id === patch.assigneeId && item.role !== 'viewer'), 'INVALID_ASSIGNEE', '负责人无效。');
          task.assigneeId = patch.assigneeId;
        }
        if ('title' in patch) { assert(clean(patch.title), 'TITLE_REQUIRED', '任务名称不能为空。'); task.title = clean(patch.title, 140); }
        if ('description' in patch) task.description = clean(patch.description);
        if ('dueDate' in patch) task.dueDate = clean(patch.dueDate, 10);
        if ('parentId' in patch) task.parentId = patch.parentId || null;
        if ('dependencies' in patch) { assert(Array.isArray(patch.dependencies), 'INVALID_DEPENDENCIES', '依赖格式无效。'); task.dependencies = copy(patch.dependencies); }
        validateGraphs(state);
        if (JSON.stringify(task) === before) return eventResult(original, '任务内容未发生变化。');
        bumpTask(task, state);
        invalidateAcceptance(state, task, actorId, '任务要求、范围或责任关系已变化。', false);
        const parent = task.parentId ? taskById(state, task.parentId) : null;
        if (parent?.status === 'accepted') {
          invalidateAcceptance(state, parent, actorId, '工作范围增加了子任务；父项进度改由子任务汇总。');
          parent.status = 'in_progress';
        }
        log(state, actorId, 'task.updated', task.id, `更新「${task.title}」的任务要求或责任关系。`);
        break;
      }
      case 'setStatus': {
        assert(isLeaf(state, task.id), 'GROUP_ROLLUP', '父任务进展由子任务汇总，请操作具体任务。');
        assert(['todo', 'in_progress', 'blocked'].includes(command.status), 'INVALID_TRANSITION', '提交与验收需使用对应操作，不能直接修改为已验收。');
        invalidateAcceptance(state, task, actorId, '责任人重新打开任务，需要新的验收结论。', false);
        task.status = command.status;
        task.manualBlockReason = command.status === 'blocked' ? clean(command.reason) || '责任人标记为阻塞，等待进一步处理' : '';
        bumpTask(task, state);
        log(state, actorId, 'task.status_changed', task.id, `任务状态更新为${{ todo: '待开始', in_progress: '进行中', blocked: '受阻' }[command.status]}。`);
        break;
      }
      case 'linkResource': {
        const item = resourceById(state, command.resourceId);
        assert(canReadResource(state, actorId, item), 'RESOURCE_UNAVAILABLE', '当前无法读取该资料。');
        const version = command.pinnedVersion || item.version;
        assert(item.history.some(entry => entry.version === version), 'VERSION_NOT_FOUND', '指定来源版本不存在。');
        assert(!task.resourceLinks.some(link => link.resourceId === item.id), 'ALREADY_LINKED', '该资料已经关联，可通过复核更新固定版本。');
        task.resourceLinks.push({ resourceId: item.id, pinnedVersion: version }); bumpTask(task, state);
        invalidateAcceptance(state, task, actorId, '任务增加了新的资料依据，需要重新核对验收。', false);
        log(state, actorId, 'resource.linked', task.id, `关联「${item.title}」${version}。`);
        break;
      }
      case 'registerResource': {
        const resourceId = command.resourceId;
        assert(typeof resourceId === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(resourceId), 'INVALID_RESOURCE_ID', '请提供有效的资料标识。');
        assert(!state.resources.some(item => item.id === resourceId), 'DUPLICATE_RESOURCE', '该资料标识已存在，请使用新的标识。');
        assert(['drive', 'github', 'workspace'].includes(command.provider), 'INVALID_PROVIDER', '资料来源类型无效。');
        assert(command.kind !== 'pull_request', 'STRUCTURED_PR_UNSUPPORTED',
          '手工 GitHub 资料只能登记为参考快照，不能声明结构化 PR 状态。请选择 document；PR 同步仅限内置示例。');
        assert(['requirement', 'design', 'acceptance', 'document'].includes(command.kind), 'INVALID_RESOURCE_KIND', '资料类型无效。');
        const title = clean(command.title, 160), version = clean(command.version, 60), content = clean(command.content, 12000);
        assert(title && version && content, 'RESOURCE_FIELDS_REQUIRED', '请填写资料名称、明确版本与演示内容。');
        const item = resource(resourceId, title, command.provider, command.kind, version, content, {
          allowedActors: state.members.map(member => member.id), externalId: `demo:${command.provider}:${resourceId}`,
          updatedAt: state.clock, syncedAt: state.clock, history: [{ version, content, updatedAt: state.clock }],
        });
        state.resources.push(item);
        log(state, actorId, 'resource.registered', item.id, `登记演示资料「${title}」${version}；未连接真实 ${command.provider} API。`, { simulated: true });
        break;
      }
      case 'submitProposal': {
        assert(isLeaf(state, task.id), 'GROUP_ROLLUP', '请为具体交付任务提交方案。');
        assert(typeof command.proposalId === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/.test(command.proposalId), 'INVALID_PROPOSAL_ID', '请提供方案的独立标识。');
        assert(!state.proposals.some(item => item.id === command.proposalId), 'DUPLICATE_PROPOSAL', '该方案已经提交，请勿重复提交。');
        const item = resourceById(state, command.resourceId);
        assert(canReadResource(state, actorId, item), 'RESOURCE_UNAVAILABLE', '当前无法读取该方案资料。');
        assert(item.history.some(entry => entry.version === command.version), 'VERSION_NOT_FOUND', '方案必须绑定真实存在的演示来源版本。');
        const title = clean(command.title, 140), summary = clean(command.summary, 2000);
        assert(title && summary.length >= 4, 'PROPOSAL_FIELDS_REQUIRED', '请填写方案名称与具体说明。');
        assert(Array.isArray(command.tradeoffs) && command.tradeoffs.every(value => typeof value === 'string'), 'INVALID_TRADEOFFS', '方案比较要点须为文字列表。');
        const proposal = { id: command.proposalId, taskId: task.id, resourceId: item.id, title, version: command.version, summary,
          tradeoffs: command.tradeoffs.map(value => clean(value, 300)).filter(Boolean).slice(0, 8),
          status: 'submitted', authorId: actorId, submittedAt: state.clock };
        state.proposals.push(proposal);
        if (!task.resourceLinks.some(link => link.resourceId === item.id)) task.resourceLinks.push({ resourceId: item.id, pinnedVersion: command.version });
        bumpTask(task, state);
        if (task.status !== 'accepted' && getTaskBlockers(state, task.id).length === 0) task.status = 'review';
        state.submissions.unshift({ id: `submission-${state.revision}`, taskId: task.id, proposalId: proposal.id, authorId: actorId,
          status: 'submitted', note: `提交候选方案「${title}」${command.version}：${summary}`,
          evidenceRefs: [{ resourceId: item.id, pinnedVersion: command.version }], submittedAt: state.clock, taskVersion: task.version });
        log(state, actorId, 'proposal.submitted', task.id, `正式提交「${title}」${command.version}，等待负责人比较与采用。`, { proposalId: proposal.id, resourceId: item.id });
        break;
      }
      case 'adoptProposal': {
        const proposal = state.proposals.find(item => item.id === command.proposalId);
        assert(proposal, 'PROPOSAL_NOT_FOUND', '方案不存在。');
        assert(command.version === proposal.version, 'STALE_VERSION', '方案版本已变化，请重新查看后采用。');
        const reason = clean(command.reason);
        assert(reason.length >= 4, 'REASON_REQUIRED', '请说明采用原因，至少四个字。');
        const item = resourceById(state, proposal.resourceId);
        assert(canReadResource(state, actorId, item), 'RESOURCE_UNAVAILABLE', '方案来源暂不可访问，不能采用。');
        assert(item.history.some(entry => entry.version === proposal.version), 'VERSION_NOT_FOUND', '无法确认方案来源版本。');
        const prior = state.decisions.find(item => item.taskId === proposal.taskId && !item.supersededBy);
        const selectionChanged = Boolean(prior && (prior.proposalId !== proposal.id || prior.adoptedVersion !== proposal.version));
        const decisionId = `decision-${state.revision}`;
        if (prior) prior.supersededBy = decisionId;
        for (const sibling of state.proposals.filter(item => item.taskId === proposal.taskId)) sibling.status = sibling.id === proposal.id ? 'adopted' : 'retained';
        proposal.adoptedVersion = proposal.version;
        state.decisions.unshift({ id: decisionId, taskId: proposal.taskId, proposalId: proposal.id, adoptedVersion: proposal.version,
          resourceId: proposal.resourceId, reason, actorId, decidedBy: actorId, at: state.clock, decidedAt: state.clock, replacesDecisionId: prior?.id || null });
        task = taskById(state, proposal.taskId); bumpTask(task, state);
        invalidateAcceptance(state, task, actorId, '采用决定已更新，须核对当前正式方案。', false);
        if (selectionChanged) {
          for (const downstream of state.tasks.filter(item => item.dependencies.some(dep => dep.taskId === task.id && dep.gate === 'adopted'))) {
            const reason = `采用方案已改为「${proposal.title}」${proposal.version}，请重新核对实现。`;
            if (downstream.status === 'accepted') invalidateAcceptance(state, downstream, actorId, reason);
            else {
              downstream.status = 'blocked'; downstream.manualBlockReason = reason; downstream.reviewReason = reason; bumpTask(downstream, state);
              log(state, actorId, 'task.basis_changed', downstream.id, reason);
            }
          }
        }
        for (const downstream of state.tasks) {
          if (downstream.status === 'blocked' && !downstream.manualBlockReason && getTaskBlockers(state, downstream.id).length === 0) downstream.status = 'todo';
        }
        log(state, actorId, 'proposal.adopted', proposal.taskId, `采用「${proposal.title}」${proposal.version}：${reason}。验收仍需单独完成。`, { decisionId });
        break;
      }
      case 'submitTask': {
        assert(isLeaf(state, task.id), 'GROUP_ROLLUP', '请提交具体子任务的成果。');
        assert(task.status !== 'accepted', 'ALREADY_ACCEPTED', '任务已验收；若有变更，请先调整任务状态。');
        const note = clean(command.note);
        assert(note.length >= 4, 'NOTE_REQUIRED', '请说明提交内容，至少四个字。');
        assert(getTaskBlockers(state, task.id).length === 0, 'TASK_BLOCKED', '请先解决依赖、来源复核或手动阻塞。');
        const evidenceRefs = getEvidence(state, task, actorId, command.evidenceIds);
        bumpTask(task, state); task.status = 'review';
        state.submissions.unshift({ id: `submission-${state.revision}`, taskId: task.id, authorId: actorId, status: 'submitted',
          note, evidenceRefs, decisionRefs: decisionRefsForTask(state, task), submittedAt: state.clock, taskVersion: task.version });
        log(state, actorId, 'task.submitted', task.id, `提交成果，等待独立验收：${note}`);
        break;
      }
      case 'acceptTask': {
        assert(isLeaf(state, task.id), 'GROUP_ROLLUP', '父任务由子任务汇总，不单独验收。');
        assert(task.status === 'review', 'SUBMISSION_REQUIRED', '只有已提交、待验收的任务可以验收。');
        assert(getTaskBlockers(state, task.id).length === 0, 'TASK_BLOCKED', '当前仍有依赖、来源复核或阻塞未解决。');
        const note = clean(command.note);
        assert(note.length >= 4, 'NOTE_REQUIRED', '请记录验收结论，至少四个字。');
        const selected = new Set(command.criteriaIds || []);
        assert(task.criteria.length > 0 && task.criteria.every(item => selected.has(item.id)), 'CRITERIA_INCOMPLETE', '请逐项确认全部验收标准。');
        if (state.proposals.some(item => item.taskId === task.id)) assert(adoptedForTask(state, task.id), 'ADOPTION_REQUIRED', '请先明确采用哪个方案与版本。');
        if (task.resourceLinks.some(link => resourceById(state, link.resourceId)?.kind === 'pull_request')) {
          assert(task.resourceLinks.filter(link => resourceById(state, link.resourceId)?.kind === 'pull_request').every(link => {
            const item = resourceById(state, link.resourceId); return item.state === 'merged' && item.checks === 'passed';
          }), 'PR_NOT_READY', '关联 PR 尚未合并或检查未通过，不能验收。');
        }
        const evidenceRefs = getEvidence(state, task, actorId, command.evidenceIds);
        const adopted = adoptedForTask(state, task.id);
        if (adopted) assert(evidenceRefs.some(ref => ref.resourceId === adopted.resourceId && ref.pinnedVersion === adopted.version),
          'ADOPTED_EVIDENCE_REQUIRED', '验收必须包含正式采用方案的确切版本证据。');
        const candidates = state.submissions.filter(item => item.taskId === task.id && (!adopted || item.proposalId === adopted.id || !item.proposalId));
        const submission = (adopted ? candidates.find(item => item.proposalId === adopted.id) : null)
          || candidates.find(item => item.status === 'submitted') || candidates[0];
        assert(submission, 'SUBMISSION_REQUIRED', '缺少正式提交记录，请先提交成果。');
        submission.status = 'accepted'; task.status = 'accepted'; task.reviewReason = ''; bumpTask(task, state);
        state.acceptances.unshift({ id: `acceptance-${state.revision}`, taskId: task.id, submissionId: submission.id, reviewerId: actorId, reviewedBy: actorId,
          reviewedAt: state.clock, criteriaIds: task.criteria.map(item => item.id), note, evidenceRefs,
          decisionRefs: decisionRefsForTask(state, task), taskVersion: task.version, result: 'accepted' });
        for (const downstream of state.tasks) {
          if (downstream.status === 'blocked' && !downstream.manualBlockReason && getTaskBlockers(state, downstream.id).length === 0) downstream.status = 'todo';
        }
        log(state, actorId, 'task.accepted', task.id, `逐项验收通过：${note}`);
        break;
      }
      case 'syncGithub': {
        const item = resourceById(state, 'r-pr');
        assert(item && item.available, 'SOURCE_UNAVAILABLE', '当前项目没有可同步的 GitHub 演示来源。');
        assert(item.demoScenario === 'feedback', 'UNSUPPORTED_SCENARIO', '该同步脚本仅支持内置反馈闭环示例，不会替手工资料编造 PR 状态。');
        const sourceVersion = command.sourceVersion ?? 2;
        assert(Number.isInteger(sourceVersion) && sourceVersion > 0, 'INVALID_SOURCE_VERSION', '来源版本序号必须为正整数。');
        if (sourceVersion <= item.sourceSequence) return eventResult(original, '忽略较旧或相同的 GitHub 来源状态。');
        const eventId = command.eventId || 'gh-merge-42';
        item.sourceSequence = sourceVersion; item.version = `merged@${sourceVersion}`; item.state = 'merged';
        item.mergeSha = 'demo-42-merge-sha'; item.updatedAt = state.clock; item.syncedAt = state.clock;
        item.content = '演示 PR #42 已合并，代码检查通过。API 实现进入待验收；仍需核对反馈与回应保存路径及业务验收标准。';
        item.history.push({ version: item.version, content: item.content, updatedAt: state.clock });
        task = taskById(state, 'FB-04');
        assert(task, 'TASK_NOT_FOUND', '未找到关联 PR 的任务。');
        const link = task.resourceLinks.find(link => link.resourceId === item.id);
        if (link) link.pinnedVersion = item.version;
        invalidateAcceptance(state, task, actorId, '关联 PR 的来源版本已变化。', false);
        task.status = 'review'; bumpTask(task, state);
        state.submissions.unshift({ id: `submission-gh-${state.revision}`, taskId: task.id, authorId: 'backend', status: 'submitted',
          note: '演示同步：PR #42 已合并。只进入待验收，不替代业务验收。', evidenceRefs: [{ resourceId: item.id, pinnedVersion: item.version }],
          submittedAt: state.clock, taskVersion: task.version });
        state.processedEvents.push(eventId);
        log(state, actorId, 'github.synced', task.id, '模拟 GitHub 同步：PR #42 已合并，API 任务进入待验收。', { source: 'github', eventId, simulated: true });
        break;
      }
      case 'syncDrive': {
        const item = resourceById(state, 'r-requirements');
        assert(item && item.available, 'SOURCE_UNAVAILABLE', '当前项目没有可同步的需求来源。');
        assert(item.demoScenario === 'feedback', 'UNSUPPORTED_SCENARIO', '该同步脚本仅支持内置反馈闭环示例，不会覆盖手工登记的需求。');
        const sourceVersion = command.sourceVersion ?? 3;
        assert(Number.isInteger(sourceVersion) && sourceVersion > 0, 'INVALID_SOURCE_VERSION', '来源版本序号必须为正整数。');
        if (sourceVersion <= (Number(item.version.slice(1)) || 0)) return eventResult(original, '忽略较旧或相同的 Drive 来源状态。');
        const eventId = command.eventId || 'drive-requirements-v3';
        item.sourceSequence = sourceVersion; item.version = `v${sourceVersion}`; item.updatedAt = state.clock; item.syncedAt = state.clock;
        item.content = '需求 v3：在既有反馈收集、指派和回应记录基础上，补充负责人变更历史与逾期提醒。负责人变更需记录前后值和操作者；超过 2 个工作日仍未指派的反馈显示待处理提醒。此次更新不包含自动发送客户消息。';
        item.history.push({ version: item.version, content: item.content, updatedAt: state.clock });
        for (const affected of state.tasks.filter(task => task.resourceLinks.some(link => link.resourceId === item.id))) {
          if (affected.status === 'accepted') invalidateAcceptance(state, affected, actorId, `需求来源已更新为 ${item.version}，需要复核当前范围。`);
        }
        state.processedEvents.push(eventId);
        log(state, actorId, 'drive.synced', item.id, `模拟 Drive 同步：需求已更新为 ${item.version}。已有固定引用保留，相关任务需要复核；历史验收记录保留。`, { source: 'drive', eventId, simulated: true });
        break;
      }
      case 'reviewResource': {
        const link = task.resourceLinks.find(item => item.resourceId === command.resourceId);
        const item = resourceById(state, command.resourceId);
        assert(link, 'RESOURCE_NOT_LINKED', '资料尚未关联当前任务。');
        assert(canReadResource(state, actorId, item), 'RESOURCE_UNAVAILABLE', '当前无法读取该资料。');
        assert(command.version === item.version, 'STALE_VERSION', '来源已变化，请复核当前最新版本。');
        const note = clean(command.note);
        assert(note.length >= 4, 'NOTE_REQUIRED', '请说明此次变更对任务的影响，至少四个字。');
        const previousVersion = link.pinnedVersion;
        link.pinnedVersion = item.version; bumpTask(task, state);
        if (previousVersion !== item.version) invalidateAcceptance(state, task, actorId, '固定资料版本发生变化，须重新核对验收结论。', false);
        log(state, actorId, 'resource.reviewed', task.id, `复核「${item.title}」${previousVersion} → ${item.version}：${note}`, { resourceId: item.id, previousVersion, reviewedVersion: item.version });
        break;
      }
      case 'sourceUnavailable':
      case 'restoreSource': {
        const item = resourceById(state, command.resourceId);
        assert(item, 'RESOURCE_NOT_FOUND', '来源不存在。');
        item.available = command.type === 'restoreSource'; item.syncedAt = state.clock;
        log(state, actorId, item.available ? 'source.restored' : 'source.unavailable', item.id,
          item.available ? '模拟恢复来源访问，读取当前版本；AI 上下文需重新生成。' : '模拟来源失权：正文和派生上下文立即从可访问结果排除。', { simulated: true });
        break;
      }
      case 'applyPlan': {
        const plan = command.plan;
        assert(plan && typeof plan.id === 'string' && Array.isArray(plan.tasks) && plan.tasks.length, 'INVALID_PLAN', '没有可应用的任务草案。');
        assert(plan.createdBy === actorId, 'PLAN_ACTOR_MISMATCH', '此计划不是基于当前委托身份生成。');
        assert(plan.baseRevision === original.revision, 'PLAN_STALE', '项目已变化，请重新生成草案再审核。');
        for (const source of plan.sourceVersions || []) {
          const item = resourceById(state, source.resourceId);
          assert(item && canReadResource(state, actorId, item, 'planner') && item.version === source.version, 'PLAN_SOURCE_STALE', '草案引用的来源已更新或失去访问权。');
        }
        assert((plan.sourceVersions || []).length > 0, 'PLAN_NO_SOURCE', '任务草案必须有获准来源依据。');
        // Recompute the deterministic proposal: an approval cannot smuggle unrelated commands.
        const expected = createPlan(original, actorId);
        assert(plan.id === expected.id && JSON.stringify(plan.tasks) === JSON.stringify(expected.tasks)
          && JSON.stringify(plan.sourceVersions) === JSON.stringify(expected.sourceVersions), 'PLAN_CHANGED', '草案参数已变化，请重新生成并审核。');
        for (const draft of plan.tasks) {
          const added = addTask(state, draft, actorId);
          added.resourceLinks = plan.sourceVersions.map(source => ({ resourceId: source.resourceId, pinnedVersion: source.version }));
          added.createdByAgentId = 'planner';
        }
        state.appliedPlans.push(plan.id);
        log(state, 'planner', 'ai.plan_applied', state.project.id, `负责人审核后创建 ${plan.tasks.length} 个任务，来源版本已固定。`, { onBehalfOf: actorId, approvedBy: actorId, planId: plan.id, simulated: true });
        break;
      }
      case 'deliverProject': {
        const progress = getProgress(state);
        assert(progress.readyToDeliver, 'DELIVERY_BLOCKED', '所有交付叶子任务须通过验收，依赖和来源复核须全部解决。');
        const note = clean(command.note);
        assert(note.length >= 4, 'NOTE_REQUIRED', '请填写交付说明，至少四个字。');
        state.project.status = 'delivered'; state.project.deliveredAt = state.clock;
        const manifest = getLeaves(state).map(task => {
          const acceptance = state.acceptances.find(item => item.taskId === task.id && !item.invalidatedAt);
          return { taskId: task.id, taskVersion: task.version, acceptanceId: acceptance.id,
            evidenceRefs: copy(acceptance.evidenceRefs), decisionRefs: copy(acceptance.decisionRefs || []) };
        });
        state.deliveries.push({ id: `delivery-${state.revision}`, actorId, at: state.clock, note,
          taskIds: getLeaves(state).map(task => task.id), acceptanceIds: manifest.map(item => item.acceptanceId), manifest,
          decisionIds: state.decisions.filter(item => !item.supersededBy).map(item => item.id) });
        log(state, actorId, 'project.delivered', state.project.id, `项目正式交付：${note}`);
        break;
      }
      case 'createProject': {
        const name = clean(command.name, 100), goal = clean(command.goal, 600);
        assert(name && goal, 'PROJECT_FIELDS_REQUIRED', '请填写项目名称与明确目标。');
        assert(typeof command.projectId === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/.test(command.projectId)
          && command.projectId !== state.project.id, 'PROJECT_ID_REQUIRED', '请提供新项目的独立标识；界面应在创建时生成新的 UUID。');
        const fresh = createSeed();
        assert(command.template === undefined || ['blank', 'feedback'].includes(command.template), 'INVALID_TEMPLATE', '项目模板无效。');
        const template = command.template === 'feedback';
        fresh.revision = state.revision; fresh.clock = state.clock;
        fresh.project = { ...fresh.project, id: command.projectId, code: template ? 'FB' : 'PW', name, goal,
          successMetric: template ? fresh.project.successMetric : '请在项目任务中定义可验收的成功标准',
          dueDate: clean(command.dueDate, 10) || (template ? fresh.project.dueDate : '2026-11-13'), status: 'active',
          ownerId: actorId, scope: template ? fresh.project.scope : '请通过任务明确项目范围与交付要求。', createdAt: state.clock,
          template: template ? 'feedback' : 'blank' };
        fresh.members = copy(state.members); fresh.agents = copy(state.agents);
        if (!template) {
          fresh.milestones = fresh.milestones.map(item => ({ ...item, dueDate: fresh.project.dueDate }));
          for (const key of ['tasks', 'resources', 'proposals', 'decisions', 'submissions', 'acceptances', 'audit', 'processedEvents', 'appliedPlans', 'deliveries']) fresh[key] = [];
        } else fresh.resources = fresh.resources.filter(item => item.id !== 'r-project');
        fresh.resources.push(resource('r-project', `${name} · 项目目标`, 'workspace', 'brief', 'v1',
          `项目目标：${goal}\n请在任务中补充可验证的验收标准与成果。此项目目标可作为需求背景引用，不能自动证明工作已经完成。`,
          { updatedAt: state.clock, syncedAt: state.clock,
            history: [{ version: 'v1', content: `项目目标：${goal}`, updatedAt: state.clock }] }));
        log(fresh, actorId, 'project.created', fresh.project.id, `创建项目「${name}」，明确目标：${goal}${template ? '；载入预置反馈闭环场景，任务、资料与历史均为虚构演示。' : ''}`);
        return { ok: true, state: fresh, message: '新项目已创建。' };
      }
      default: throw new DomainError('UNKNOWN_COMMAND', '不支持的操作。');
    }
    return { ok: true, state, message: '操作已完成。', taskId: task?.id };
  } catch (error) {
    if (error instanceof DomainError) return failure(original, error.code, error.message);
    return failure(original, 'INVALID_INPUT', '操作参数无效，请检查后重试。');
  }
}

function cite(resource) { return { resourceId: resource.id, version: resource.version, label: resource.title, updatedAt: resource.updatedAt }; }

/** Deterministic, source-aware demo response. No model or remote API is invoked. */
export function summarize(state, actorId, agentId = 'observer', query = '') {
  const actor = actorById(state, actorId);
  const agent = state.agents.find(item => item.id === agentId);
  if (!actor || isAgent(state, actorId) || !agent) return { text: '当前身份无法获取项目上下文。', statements: [], coverage: { accessible: 0, unavailable: 0, restricted: 0 }, asOf: state.clock, simulated: true };
  const allowed = visibleResources(state, actorId, agentId);
  const byId = id => allowed.find(item => item.id === id);
  const citations = ids => ids.map(byId).filter(Boolean).map(cite);
  const progress = getProgress(state);
  const statements = [];
  const workRef = task => ({ type: 'task', id: task.id, label: `${task.id} ${task.title}` });
  const add = (text, kind, ids, workspaceRefs = []) => statements.push({ text, kind, citations: citations(ids), workspaceRefs });
  const queriedTaskIds = String(query).match(/\b[A-Za-z][A-Za-z0-9]*-\d+\b/g) || [];
  const targetedTask = queriedTaskIds.map(id => taskById(state, id.toUpperCase())).find(Boolean);
  if (targetedTask) {
    const task = targetedTask;
    const statusLabels = { todo: '待开始', in_progress: '进行中', blocked: '受阻', review: '待验收', accepted: '已验收' };
    const taskRefs = [workRef(task)];
    const linkedAllowed = task.resourceLinks.filter(link => byId(link.resourceId));
    const linkedResources = task.resourceLinks.map(link => resourceById(state, link.resourceId)).filter(Boolean);
    const blockers = getTaskBlockers(state, task.id);
    const sourceRestricted = task.resourceLinks.some(link => !byId(link.resourceId));
    add(`${task.id}「${task.title}」当前${statusLabels[getEffectiveStatus(state, task)]}，负责人为${actorById(state, task.assigneeId)?.name || '未明确'}，目标日期为 ${task.dueDate}。状态来自当前工作记录，不代表已经上线或取得使用成效。`, 'observed', [], taskRefs);
    add(task.description ? `工作要求：${task.description}` : '当前任务尚未填写具体工作要求，需要先明确范围。', 'observed', [], taskRefs);
    const dependencies = task.dependencies.map(dependency => ({ ...dependency, task: taskById(state, dependency.taskId) }));
    const dependencyText = dependencies.length ? dependencies.map(dependency => {
      const condition = dependency.gate === 'adopted' ? '方案采用' : '验收通过';
      const satisfied = dependency.gate === 'adopted' ? Boolean(adoptedForTask(state, dependency.taskId)) : dependency.task?.status === 'accepted';
      return `${dependency.taskId}「${dependency.task?.title || '未找到任务'}」的${condition}${satisfied ? '已满足' : '尚未满足'}`;
    }).join('；') : '没有前置任务依赖';
    const otherBlockers = blockers.filter(item => !dependencies.some(dependency => dependency.taskId === item.taskId));
    const blockerText = [...new Set(otherBlockers.map(item => item.resourceId && !byId(item.resourceId)
      ? '部分关联来源暂不可访问，当前助手不能核对其正文或版本'
      : item.reason))].join('；');
    add(`依赖情况：${dependencyText}。${blockerText ? `另需处理：${blockerText}。` : ''}`, 'observed', [],
      [...taskRefs, ...dependencies.map(item => item.task).filter(Boolean).map(workRef)]);
    if (linkedAllowed.length) {
      add(`当前可引用的资料：${linkedAllowed.map(link => {
        const source = byId(link.resourceId);
        return `「${source.title}」固定 ${link.pinnedVersion}，当前 ${source.version}${link.pinnedVersion !== source.version ? '（待复核）' : ''}`;
      }).join('；')}。${sourceRestricted ? '另有部分关联资料不在当前可访问范围内，不据此推测内容。' : ''}`, 'observed', linkedAllowed.map(link => link.resourceId), taskRefs);
    } else add(task.resourceLinks.length ? '关联资料暂不可访问或不在当前助手授权范围内，无法核对其正文与版本。' : '该任务尚未关联资料，当前只能依据工作记录说明状态。', 'observed', [], taskRefs);
    const children = state.tasks.filter(item => item.parentId === task.id);
    let nextStep;
    if (children.length) nextStep = '下一步按下属交付任务逐项推进；父项进度由子任务汇总，不单独提交验收。';
    else if (blockers.length) nextStep = '下一步先解决上述未满足的依赖、来源复核或责任人标记的阻塞，再继续提交成果。';
    else if (task.status === 'accepted') nextStep = '该任务已有验收结论。如范围或依据发生变化，应明确重新打开并复核；当前记录不能证明外部上线或业务效果。';
    else if (task.status === 'review') nextStep = '下一步由产品负责人或测试 / 交付负责人核对本任务的验收条件与实际提交证据，确认后才能计入已验收。';
    else if (!task.resourceLinks.length) nextStep = '下一步先关联本任务所需的需求或成果资料，再按已列出的验收条件完成工作并提交。';
    else nextStep = '下一步由当前负责人按本任务的验收条件完成工作、核对可访问的资料，再提交成果；不能根据资料存在就推断工作已完成。';
    add(nextStep, 'recommendation', [], [...taskRefs, ...children.map(workRef)]);
    const coverage = { accessible: linkedAllowed.length,
      unavailable: linkedResources.filter(item => !item.available && item.allowedActors.includes(actorId) && agent.allowedResourceIds.includes(item.id)).length,
      restricted: linkedResources.filter(item => item.available && !canReadResource(state, actorId, item, agentId)).length };
    return { text: statements.map(item => item.text).join('\n\n'), statements, coverage, asOf: state.clock, simulated: true,
      mode: 'deterministic-fixture', scope: 'task', taskId: task.id, actorId, agentId, query: clean(query, 500) };
  }
  if (!allowed.length) add('当前没有可引用的来源资料。可以查看有权读取的任务，但不能据此编造外部项目事实。', 'observed', []);
  else add(`「${state.project.name}」当前 ${progress.accepted}/${progress.total} 个叶子任务已验收，${progress.review} 项待验收。完成度按实际验收计算，不按提交数量计算。`, 'observed', [], getLeaves(state).filter(task => task.status === 'accepted' || task.status === 'review').map(workRef));
  const blocked = getLeaves(state).filter(task => task.status !== 'accepted' && getTaskBlockers(state, task.id).length);
  if (blocked.length) {
    const important = blocked.find(task => task.id === 'FB-05') || blocked[0];
    const reasons = getTaskBlockers(state, important.id).map(blocker => blocker.gate === 'review' ? '关联资料有新版本待复核' : blocker.reason).join('；');
    add(`当前需要优先处理「${important.title}」：${reasons}。另有 ${Math.max(0, blocked.length - 1)} 项任务受到依赖或资料复核影响。`, 'inference', [], [workRef(important), ...important.dependencies.map(dep => taskById(state, dep.taskId)).filter(Boolean).map(workRef)]);
  } else add('目前没有未解决的任务依赖或来源复核阻塞。仍需逐项完成提交与验收。', 'observed', ['r-qa']);
  const pr = byId('r-pr');
  if (pr?.demoScenario === 'feedback') add(pr.state === 'merged' ? 'GitHub 演示记录显示 PR #42 已合并；这只证明代码集成完成，API 任务仍以工作台中的独立验收为准。' : 'GitHub 演示记录显示 PR #42 仍在评审中；检查通过不等于已经合并或验收。', 'observed', ['r-pr']);
  else if (pr) add(`当前登记的代码资料为「${pr.title}」${pr.version}；这是手工演示内容，尚无真实 GitHub 状态可核对。`, 'observed', ['r-pr']);
  const requirements = byId('r-requirements');
  if (requirements?.demoScenario === 'feedback') add(requirements.version === 'v2' ? '需求 v2 的首期范围是反馈收集、指派与回应记录。建议先完成设计采用，再推进前端实现和权限反例验证。' : `当前需求为 ${requirements.version}，新增负责人变更历史与逾期提醒。建议先复核受影响任务，再由规划助手生成补充任务草案。`, 'recommendation', ['r-requirements', 'r-flow']);
  else if (requirements) add(`获准需求「${requirements.title}」${requirements.version} 已登记。原文摘录：${requirements.content.slice(0, 180)}${requirements.content.length > 180 ? '…' : ''}。当前规则助手没有对手工需求进行语义理解。`, 'observed', ['r-requirements']);
  if (/方案|采用|为什么|设计/.test(query)) {
    const decision = state.decisions.find(item => !item.supersededBy);
    if (decision && byId(decision.resourceId)) add(`已采用 ${state.proposals.find(item => item.id === decision.proposalId)?.title} ${decision.adoptedVersion}。采用理由：${decision.reason}。其他方案继续保留，采用与验收分别记录。`, 'observed', [decision.resourceId], [{ type: 'decision', id: decision.id, label: '方案采用决定' }]);
    else if (byId('r-design')?.demoScenario === 'feedback') add('当前尚未形成正式采用决定。A 方案突出阶段全貌；B 方案保留连续审阅上下文。选择应由负责人结合当前任务做出，助手不能替代采用。', 'recommendation', ['r-design']);
    else if (state.proposals.length) add(`当前登记了 ${state.proposals.length} 个候选方案。请负责人比较具体内容与版本，再记录采用理由；助手不能替代采用。`, 'recommendation', [], state.proposals.map(item => ({ type: 'task', id: item.taskId, label: item.title })));
  }
  const coverage = { accessible: allowed.length,
    unavailable: state.resources.filter(item => !item.available && item.allowedActors.includes(actorId) && agent.allowedResourceIds.includes(item.id)).length,
    restricted: state.resources.filter(item => !canReadResource(state, actorId, item, agentId) && item.available).length };
  return { text: statements.map(item => item.text).join('\n\n'), statements, coverage, asOf: state.clock, simulated: true,
    mode: 'deterministic-fixture', actorId, agentId, query: clean(query, 500) };
}

/** Create a reviewable deterministic plan from the currently authorized requirement. */
export function createPlan(state, actorId) {
  const requirements = visibleResources(state, actorId, 'planner').find(item => item.id === 'r-requirements');
  const empty = { id: `plan-${state.project.id}-${state.revision}`, baseRevision: state.revision, sourceVersions: [], tasks: [], createdBy: actorId, agentId: 'planner', simulated: true };
  if (!can(state, actorId, 'createPlan')) return { ...empty, error: '当前身份不能生成任务草案。' };
  if (!requirements) return { ...empty, error: '没有可访问的需求来源，请先关联获准资料。' };
  if (requirements.demoScenario !== 'feedback') return { ...empty, error: '当前规则规划器仅支持内置反馈闭环需求；手工项目可创建任务，真实语义拆分待接入模型。' };
  const existing = new Set(state.tasks.map(task => task.title));
  const options = requirements.version === 'v2' ? [
    { title: '验证未指派反馈的异常路径', description: '依据需求 v2，验证未明确负责人时不能被标记为已处理，并保留异常提示。', assigneeId: 'qa', milestoneId: 'm3', dueDate: '2026-11-05', criteria: ['未指派反馈不能被错误标记完成', '异常提示可理解并能定位到责任操作'] },
    { title: '补充反馈回应审计说明', description: '依据需求 v2，明确回应记录的操作者、时间及变更追溯要求。', assigneeId: 'backend', milestoneId: 'm2', dueDate: '2026-11-04', criteria: ['回应记录包含操作者与时间', '审计说明与实际接口字段一致'] },
  ] : [
    { title: '实现负责人变更历史', description: '依据需求 v3，记录负责人变更的前后值、操作者及时间，供反馈详情引用。', assigneeId: 'backend', milestoneId: 'm2', dueDate: '2026-11-04', criteria: ['变更前后负责人均可追溯', '越权变更请求被拒绝'] },
    { title: '验证逾期未指派提醒', description: '依据需求 v3，验证超过 2 个工作日仍未指派的反馈有清晰提醒。', assigneeId: 'qa', milestoneId: 'm3', dueDate: '2026-11-05', criteria: ['超过目标时间出现提醒', '已指派后提醒状态正确更新'] },
  ];
  return { ...empty, id: `plan-${state.project.id}-${state.revision}-${requirements.version}`,
    sourceVersions: [{ resourceId: requirements.id, version: requirements.version }],
    tasks: options.filter(item => !existing.has(item.title)), createdAt: state.clock,
    explanation: '演示规划器从当前获准的需求版本生成两项补充任务；应用前须由产品负责人审核。' };
}
