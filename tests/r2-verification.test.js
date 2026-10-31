import test from 'node:test';
import assert from 'node:assert/strict';
import { validateVerification } from '../server/verification.js';
import { buildAnalysisInput, validateAnalysis } from '../server/analysis.js';

const SHA = 'a'.repeat(40), OLD_SHA = 'b'.repeat(40);
const actor = { id: 'a89c4f9e-7d0e-4b95-91f4-9ccfdc1ea031', login: 'owner' };
const issue = { id: 'first-click', text: '真实设备上的第一次上传仍然失败', evidenceIds: ['failure'] };
const project = { id: 'p', repo: 'owner/project', owner: 'owner', headSha: SHA, status: 'current' };
const submitted = (patch = {}) => ({
  issueId: issue.id, sha: SHA, result: 'passed', environment: 'real-device',
  environmentDescription: 'MacBook，macOS 实机，Chrome 正式版',
  scopeDescription: '完全退出应用后重新启动，检查首击上传及选中文本是否保持。',
  notes: '在以上版本连续冷启动五次，每次首击都完成上传，选中的内容均保持。',
  personallyTested: true, coversIssue: true, ...patch,
});
const metadata = { sourceUrl: 'https://workspace.example/api/projects/p/evidence/receipt',
  occurredAt: '2026-10-31T22:00:00Z', observedAt: '2026-10-31T22:00:01Z',
  author: actor.login, authorAssociation: 'OWNER', complete: true };
const failure = { ...metadata, id: 'failure', sourceKey: 'comment:failure', kind: 'issue_comment',
  sourceUrl: 'https://github.com/owner/project/pull/1#issuecomment-1', sha: OLD_SHA,
  occurredAt: '2026-10-30T20:00:00Z', data: { body: issue.text } };
const receipt = (data, sha = SHA) => ({ ...metadata, id: 'receipt', sourceKey: 'verification:receipt', kind: 'acceptance', sha, data });
const claim = (id, text) => ({ id, text, classification: 'fact', evidenceIds: ['receipt'] });
const proposed = (patch = {}) => ({ stage: claim('stage', '收到此问题的新验证记录'),
  progress: { scopeComplete: false, percent: null, total: null, done: null, scope: '完整产品范围未确认', evidenceIds: [] },
  completed: [], incomplete: [], failed: [], blockers: [], pendingVerification: [], userActions: [], nextSteps: [],
  changeReason: claim('change', '用户亲自记录了当前版本的实际测试'),
  resolvedIssues: [claim(issue.id, '此问题已通过上述真实环境验证')], ...patch });
const analyze = (data, { currentProject = project, unresolved = [issue], recordSha = SHA, model = proposed() } = {}) => {
  const context = buildAnalysisInput({ project: currentProject, evidence: [failure, receipt(data, recordSha)],
    unresolved, sourceCoverage: { complete: true } });
  return { context, analysis: validateAnalysis(model, context) };
};

test('actual form payload becomes a traceable issue receipt and closes only the confirmed unresolved issue', () => {
  const data = validateVerification(submitted(), { project, issue, actor });
  assert.equal(data.productAcceptance, false);
  assert.equal(data.scope, 'workspace-only');
  assert.deepEqual(data.verification.issueIds, [issue.id]);
  assert.equal(data.verification.scope, 'issue');
  assert.equal(data.verification.environmentDescription, submitted().environmentDescription);
  assert.equal(data.verification.selfReported, true);
  const { analysis } = analyze(data);
  assert.equal(analysis.resolvedIssues.length, 1);
  assert.equal(analysis.resolvedIssues[0].id, issue.id);
  assert.equal(analysis.resolvedIssues[0].resolvedForSha, SHA);
  assert.equal(analysis.resolvedIssues[0].sources[0].url, metadata.sourceUrl);
  assert.equal(analysis.resolvedIssues[0].sources[0].occurredAt, '2026-10-31T22:00:00.000Z');
  assert.equal(analysis.pendingVerification.length, 0);
});

test('one successful issue test never certifies whole-product readiness or closes a different issue', () => {
  const data = validateVerification(submitted(), { project, issue, actor });
  const other = { ...issue, id: 'selection-retention', text: '另一个问题仍需确认' };
  const { analysis } = analyze(data, { unresolved: [issue, other], model: proposed({
    stage: claim('stage', '产品已可用'), resolvedIssues: [claim(other.id, '其他问题也已经解决')],
  }) });
  assert.equal(analysis.stage.classification, 'unknown');
  assert.equal(analysis.stage.pendingReview, true);
  assert.equal(analysis.resolvedIssues.length, 0);
  assert.deepEqual(new Set(analysis.pendingVerification.map(item => item.id)), new Set([issue.id, other.id]));
});

test('a user-recorded failed real test remains explicit failure evidence and cannot resolve the issue', () => {
  const data = validateVerification(submitted({ result: 'failed', notes: '实际冷启动五次，其中四次首击上传失败，重新打开仍然复现。' }), { project, issue, actor });
  assert.equal(data.conclusion, 'failure');
  assert.equal(data.verification.result, 'failed');
  const { analysis } = analyze(data);
  assert.equal(analysis.resolvedIssues.length, 0);
  assert.equal(analysis.pendingVerification[0].id, issue.id);
});

test('a changed or abbreviated SHA is rejected at intake and a receipt for an older SHA cannot close current work', () => {
  for (const sha of [OLD_SHA, SHA.slice(0, 7), 'a'.repeat(41), 'a'.repeat(63)]) {
    assert.throws(() => validateVerification(submitted({ sha }), { project, issue, actor }), error => error.code === 'VERIFICATION_VERSION_CHANGED');
  }
  const data = validateVerification(submitted(), { project, issue, actor });
  const { analysis } = analyze(data, { currentProject: { ...project, headSha: OLD_SHA } });
  assert.equal(analysis.resolvedIssues.length, 0);
  assert.equal(analysis.pendingVerification[0].id, issue.id);
});

test('the exact confirmed 40- or 64-character current SHA survives intake and analysis unchanged', () => {
  for (const sha of ['c'.repeat(40), 'd'.repeat(64)]) {
    const currentProject = { ...project, headSha: sha };
    const data = validateVerification(submitted({ sha }), { project: currentProject, issue, actor });
    const { context, analysis } = analyze(data, { currentProject, recordSha: sha });
    assert.equal(context.project.currentSha, sha);
    assert.equal(analysis.resolvedIssues[0].resolvedForSha, sha);
  }
});

test('CI, simulation, task completion and missing personal or scope attestation cannot create a real-test receipt', () => {
  for (const patch of [{ environment: 'ci' }, { environment: 'simulation' }, { personallyTested: false },
    { personallyTested: 'true' }, { coversIssue: false }, { notes: '只有 CI 测试通过，尚未进行实机测试。' },
    { notes: 'Only CI passed; not personally tested this version.' }]) {
    assert.throws(() => validateVerification(submitted(patch), { project, issue, actor }));
  }
  assert.throws(() => validateVerification(submitted({ done: true }), { project, issue, actor }), error => error.code === 'VERIFICATION_INPUT_INVALID');
});

test('client-controlled product scope, issue lists, actor or verification objects are rejected', () => {
  for (const field of [{ scope: 'product' }, { issueIds: ['all'] }, { actor }, { verification: { scope: 'product', result: 'passed' } }, { productAcceptance: true }]) {
    assert.throws(() => validateVerification(submitted(field), { project, issue, actor }), error => error.code === 'VERIFICATION_INPUT_INVALID');
  }
  assert.throws(() => validateVerification(submitted({ issueId: 'other' }), { project, issue, actor }), error => error.code === 'VERIFICATION_ISSUE_CHANGED');
  assert.throws(() => validateVerification(submitted(), { project, issue: { ...issue, resolved: true }, actor }), error => error.code === 'VERIFICATION_ISSUE_CHANGED');
});

test('a concrete environment, precise scope, facts, authenticated actor and bounded request are required', () => {
  for (const patch of [{ environmentDescription: '' }, { scopeDescription: '通过' }, { notes: '' }]) {
    assert.throws(() => validateVerification(submitted(patch), { project, issue, actor }), error => error.code === 'VERIFICATION_FIELD_INVALID');
  }
  assert.throws(() => validateVerification(submitted(), { project, issue, actor: null }), error => error.code === 'VERIFICATION_ACTOR_REQUIRED');
  assert.throws(() => validateVerification(submitted(), { project: { ...project, status: 'permission_revoked' }, issue, actor }), error => error.code === 'VERIFICATION_PROJECT_UNAVAILABLE');
  assert.throws(() => validateVerification(submitted({ notes: 'secret-not-to-echo'.repeat(1000) }), { project, issue, actor }), error => error.code === 'VERIFICATION_TOO_LARGE' && !error.message.includes('secret-not-to-echo'));
});

test('newer or simultaneous failed personal receipts prevent an old pass from closing the same issue', () => {
  const passed = receipt(validateVerification(submitted(), { project, issue, actor }));
  const failedData = validateVerification(submitted({ result: 'failed', notes: '在实机冷启动后首击再次失败，按相同步骤多次重试仍复现。' }), { project, issue, actor });
  for (const at of ['2026-10-31T22:05:00Z', metadata.occurredAt]) {
    const failed = { ...receipt(failedData), id: 'new-failure', sourceKey: 'verification:new-failure', occurredAt: at };
    const context = buildAnalysisInput({ project, evidence: [failure, passed, failed], unresolved: [issue] });
    const result = validateAnalysis(proposed(), context);
    assert.equal(result.resolvedIssues.length, 0);
    assert.equal(result.pendingVerification[0].id, issue.id);
  }
  const laterPass = { ...passed, id: 'later-pass', sourceKey: 'verification:later-pass', occurredAt: '2026-10-31T22:10:00Z' };
  const context = buildAnalysisInput({ project, evidence: [failure, passed, { ...receipt(failedData), id: 'new-failure', occurredAt: '2026-10-31T22:05:00Z' }, laterPass], unresolved: [issue] });
  const result = validateAnalysis(proposed({ resolvedIssues: [{ ...claim(issue.id, '这次再次验证通过'), evidenceIds: ['later-pass'] }] }), context);
  assert.equal(result.resolvedIssues.length, 1);
  assert.equal(result.resolvedIssues[0].resolvedAt, '2026-10-31T22:10:00.000Z');
  const otherIssue = { ...issue, id: 'other-issue' };
  const otherFailure = receipt(validateVerification(submitted({ issueId: otherIssue.id, result: 'failed' }), { project, issue: otherIssue, actor }));
  const unrelatedContext = buildAnalysisInput({ project, evidence: [failure, passed, { ...otherFailure, id: 'other-failure', occurredAt: '2026-10-31T22:05:00Z' }], unresolved: [issue, otherIssue] });
  assert.equal(validateAnalysis(proposed(), unrelatedContext).resolvedIssues[0].id, issue.id);
});

test('a verified issue stays closed across repeated later summaries, then reopens for new failure or a changed SHA', () => {
  const passed = receipt(validateVerification(submitted(), { project, issue, actor }));
  const records = [failure, passed];
  let previous = validateAnalysis(proposed(), buildAnalysisInput({ project, evidence: records, unresolved: [issue] }));
  const originalResolvedAt = previous.resolvedIssues[0].resolvedAt;
  for (let round = 2; round <= 4; round++) {
    const repeated = proposed({ resolvedIssues: [], failed: [{ id: issue.id, text: issue.text, classification: 'fact', evidenceIds: ['failure'] }] });
    previous = validateAnalysis(repeated, buildAnalysisInput({ project, evidence: records, unresolved: [], previous }));
    assert.equal(previous.failed.length, 0, `round ${round}`);
    assert.equal(previous.pendingVerification.length, 0, `round ${round}`);
    assert.equal(previous.resolvedIssues[0].id, issue.id);
    assert.equal(previous.resolvedIssues[0].resolvedAt, originalResolvedAt);
    assert.equal(previous.resolvedIssues[0].sources[0].url, metadata.sourceUrl);
    assert.equal(previous.resolvedIssues[0].carriedForward, true);
  }
  const failed = { ...receipt(validateVerification(submitted({ result: 'failed' }), { project, issue, actor })), id: 'new-failure', occurredAt: '2026-10-31T22:05:00Z' };
  const reopened = validateAnalysis(proposed({ resolvedIssues: [] }), buildAnalysisInput({ project, evidence: [...records, failed], unresolved: [], previous }));
  assert.equal(reopened.resolvedIssues.length, 0);
  assert.equal(reopened.pendingVerification[0].id, issue.id);
  assert.deepEqual(reopened.pendingVerification[0].evidenceIds, ['new-failure']);
  const changed = validateAnalysis(proposed({ resolvedIssues: [] }), buildAnalysisInput({ project: { ...project, headSha: OLD_SHA }, evidence: records, unresolved: [], previous }));
  assert.equal(changed.resolvedIssues.length, 0);
  assert.equal(changed.pendingVerification[0].id, issue.id);
  assert.equal(changed.pendingVerification[0].pendingReview, true);
});

test('a failed receipt omitted by the real context byte limit cannot revive an older retained pass or carried resolution', () => {
  const passed = receipt(validateVerification(submitted(), { project, issue, actor }));
  const failed = { ...receipt(validateVerification(submitted({ result: 'failed', notes: '实测首击失败，重启之后同样失败。'.repeat(100) }), { project, issue, actor })), id: 'new-failure', occurredAt: '2026-10-31T22:05:00Z' };
  const bulky = Array.from({ length: 60 }, (_, i) => ({ ...metadata, id: `required-${i}`, sourceKey: `document-${i}`, kind: 'document', sha: SHA, occurredAt: '2026-10-31T23:00:00Z', data: { body: 'x'.repeat(3500) } }));
  const related = Array.from({ length: 3 }, (_, i) => ({ id: `other-${i}`, text: '其他仍需复核的问题', evidenceIds: bulky.slice(i * 20, i * 20 + 20).map(item => item.id) }));
  const context = buildAnalysisInput({ project, evidence: [failure, passed, failed, ...bulky], unresolved: [issue, ...related] });
  assert(context.coverage.omittedEvidenceIds.includes('new-failure'));
  assert(context.evidence.some(item => item.id === 'receipt'));
  assert.equal(validateAnalysis(proposed(), context).resolvedIssues.length, 0);
  const previous = validateAnalysis(proposed(), buildAnalysisInput({ project, evidence: [failure, passed], unresolved: [issue] }));
  const carryContext = buildAnalysisInput({ project, evidence: [failure, passed, failed, ...bulky], unresolved: related, previous });
  assert(carryContext.coverage.omittedEvidenceIds.includes('new-failure'));
  const carried = validateAnalysis(proposed({ resolvedIssues: [] }), carryContext);
  assert.equal(carried.resolvedIssues.length, 0);
  assert(carried.pendingVerification.some(item => item.id === issue.id));
});
