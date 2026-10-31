/** Fictional browser prototype contract. Client-side policies are not a security boundary. */
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'review' | 'accepted';
export type ActorId = 'owner' | 'designer' | 'frontend' | 'backend' | 'qa' | 'viewer' | 'observer' | 'planner';
export interface Member { id: string; name: string; role: string; roleLabel: string; initial: string; color: string }
export interface Agent extends Member { allowedResourceIds: string[]; canDraft: boolean }
export interface Dependency { taskId: string; gate: 'accepted' | 'adopted' }
export interface ResourceLink { resourceId: string; pinnedVersion: string }
export interface Criterion { id: string; text: string }
export interface Task {
  id: string; title: string; description: string; milestoneId: string; parentId: string | null;
  assigneeId: string; status: TaskStatus; dueDate: string; priority: 'high' | 'medium' | 'low';
  dependencies: Dependency[]; resourceLinks: ResourceLink[]; criteria: Criterion[];
  updatedAt: string; version: number; manualBlockReason: string; createdByAgentId?: string; reviewReason?: string;
}
export interface Resource {
  id: string; title: string; provider: 'drive' | 'github' | 'workspace'; kind: string;
  version: string; content: string; available: boolean; allowedActors: string[];
  updatedAt: string; syncedAt: string; simulated: true; sourceSequence: number;
  history: Array<{ version: string; content: string; updatedAt: string }>;
  externalId?: string; fileName?: string; restricted?: boolean; state?: 'open' | 'merged';
  demoScenario?: 'feedback';
  number?: number; checks?: string; authorId?: string; headSha?: string; mergeSha?: string;
}
export interface Milestone { id: string; title: string; name: string; dueDate: string; description: string }
export interface Proposal {
  id: string; taskId: string; title: string; version: string; adoptedVersion?: string;
  status: 'submitted' | 'adopted' | 'retained'; authorId: string; summary: string;
  tradeoffs: string[]; resourceId: string; submittedAt: string;
}
export interface Decision {
  id: string; taskId: string; proposalId: string; adoptedVersion: string; resourceId: string;
  reason: string; actorId: string; decidedBy: string; at: string; decidedAt: string;
  replacesDecisionId: string | null; supersededBy?: string;
}
export interface Submission {
  id: string; taskId: string; authorId: string; status: 'submitted' | 'accepted';
  proposalId?: string;
  note: string; evidenceRefs: ResourceLink[]; submittedAt: string; taskVersion: number; decisionRefs?: DecisionRef[];
}
export interface DecisionRef { decisionId: string; taskId: string; proposalId: string; adoptedVersion: string }
export interface Acceptance {
  id: string; taskId: string; submissionId: string; reviewerId: string; reviewedBy: string;
  reviewedAt: string; criteriaIds: string[]; note: string; evidenceRefs: ResourceLink[];
  taskVersion: number; result: 'accepted'; decisionRefs?: DecisionRef[];
  invalidatedAt?: string; invalidatedBy?: string; invalidationReason?: string;
}
export interface AuditEvent {
  id: string; actorId: string; action: string; targetId: string; detail: string; at: string;
  [key: string]: unknown;
}
export interface Project {
  id: string; code: string; name: string; goal: string; successMetric: string;
  dueDate: string; status: 'active' | 'delivered'; ownerId: string; scope: string;
  createdAt: string; deliveredAt?: string;
  template?: 'blank' | 'feedback';
}
export interface State {
  schemaVersion: 1; revision: number; clock: string; project: Project;
  members: Member[]; agents: Agent[]; milestones: Milestone[]; tasks: Task[];
  resources: Resource[]; proposals: Proposal[]; decisions: Decision[];
  submissions: Submission[]; acceptances: Acceptance[]; audit: AuditEvent[];
  processedEvents: string[]; appliedPlans: string[];
  deliveries: Array<{ id: string; actorId: string; at: string; note: string; taskIds: string[]; acceptanceIds: string[]; decisionIds: string[];
    manifest?: Array<{ taskId: string; taskVersion: number; acceptanceId: string; evidenceRefs: ResourceLink[]; decisionRefs: DecisionRef[] }> }>;
}
export interface TaskDraft {
  title: string; description?: string; assigneeId: string; milestoneId: string;
  parentId?: string; dependencies?: Dependency[]; criteria?: string[]; dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
}
export interface Plan {
  id: string; baseRevision: number; sourceVersions: Array<{ resourceId: string; version: string }>;
  tasks: TaskDraft[]; createdBy: string; agentId: 'planner'; simulated: true;
  createdAt?: string; explanation?: string; error?: string;
}
export type Command =
  | ({ type: 'createTask' } & TaskDraft)
  | { type: 'updateTask'; taskId: string; patch: Partial<Pick<Task, 'title' | 'description' | 'assigneeId' | 'parentId' | 'dependencies' | 'dueDate'>> }
  | { type: 'setStatus'; taskId: string; status: 'todo' | 'in_progress' | 'blocked'; reason?: string }
  | { type: 'linkResource'; taskId: string; resourceId: string; pinnedVersion?: string }
  | { type: 'registerResource'; resourceId: string; title: string; provider: 'drive' | 'github' | 'workspace'; kind: 'requirement' | 'design' | 'acceptance' | 'document'; version: string; content: string }
  | { type: 'submitProposal'; taskId: string; proposalId: string; resourceId: string; title: string; version: string; summary: string; tradeoffs: string[] }
  | { type: 'adoptProposal'; proposalId: string; version: string; reason: string }
  | { type: 'submitTask'; taskId: string; note: string; evidenceIds?: string[] }
  | { type: 'acceptTask'; taskId: string; note: string; criteriaIds: string[]; evidenceIds?: string[] }
  | { type: 'syncGithub' | 'syncDrive'; eventId?: string; sourceVersion?: number }
  | { type: 'reviewResource'; taskId: string; resourceId: string; version: string; note: string }
  | { type: 'sourceUnavailable' | 'restoreSource'; resourceId: string }
  | { type: 'applyPlan'; plan: Plan }
  | { type: 'deliverProject'; note: string }
  | { type: 'createProject'; projectId: string; name: string; goal: string; dueDate?: string; template?: 'blank' | 'feedback' };
export interface Result { ok: boolean; state: State; error?: { code: string; message: string }; message?: string; idempotent?: boolean; taskId?: string }
export interface Blocker { taskId?: string; resourceId?: string; title: string; gate: string; reason: string }
export interface Progress {
  total: number; accepted: number; review: number; inProgress: number; blocked: number; todo: number; percent: number;
  rawReview: number; statusCounts: Record<TaskStatus, number>;
  milestones: Array<Milestone & { total: number; accepted: number; percent: number; status: string }>;
  readyToDeliver: boolean; deliveryHealth: DeliveryHealth; currentEvidenceWarning: string | null;
}
export interface DeliveryHealth {
  status: 'not_delivered' | 'verified' | 'needs_review'; label: string;
  issues: Array<{ code: string; targetId: string; taskIds: string[] }>; asOf: string | null; checkedAt: string;
}
export interface Citation { resourceId: string; version: string; label: string; updatedAt: string }
export interface Summary {
  text: string; statements: Array<{ text: string; kind: 'observed' | 'inference' | 'recommendation'; citations: Citation[]; workspaceRefs?: Array<{ type: 'task' | 'acceptance' | 'decision'; id: string; label: string }> }>;
  coverage: { accessible: number; unavailable: number; restricted: number }; asOf: string; simulated: true;
  mode?: 'deterministic-fixture'; actorId?: string; agentId?: string; query?: string;
  scope?: 'task'; taskId?: string;
}
export function createSeed(): State;
export function execute(state: State, command: Command, actorId: string): Result;
export function getLeaves(state: State): Task[];
export function getProgress(state: State): Progress;
export function getTaskBlockers(state: State, taskId: string): Blocker[];
export const getBlockers: typeof getTaskBlockers;
export function getEffectiveStatus(state: State, taskOrId: Task | string): TaskStatus;
export function getDeliveryHealth(state: State): DeliveryHealth;
export function can(state: State, actorId: string, action: string, target?: string | Task | Resource | { id?: string; taskId?: string }): boolean;
export function visibleResources(state: State, actorId: string, agentId?: string): Resource[];
export function resourceMetadata(state: State, actorId: string, resourceId: string): (Pick<Resource, 'id' | 'title' | 'provider' | 'kind' | 'version' | 'available' | 'updatedAt' | 'syncedAt' | 'simulated'> & { restricted: boolean; state: string | null; availabilityLabel: string; inaccessibleReason: string | null }) | null;
export function summarize(state: State, actorId: string, agentId?: string, query?: string): Summary;
export function createPlan(state: State, actorId: string): Plan;
