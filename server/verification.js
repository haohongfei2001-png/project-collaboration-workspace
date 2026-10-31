import { HttpError } from './security.js';

const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const FIELDS = new Set(['issueId', 'sha', 'result', 'environment', 'environmentDescription', 'scopeDescription', 'notes', 'personallyTested', 'coversIssue']);

function reject(code, message, status = 400) { throw new HttpError(status, code, message); }
function text(value, minimum, maximum, field) {
  if (typeof value !== 'string' || value.trim().length < minimum || value.trim().length > maximum || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) {
    reject('VERIFICATION_FIELD_INVALID', `${field}格式无效，请填写具体事实。`);
  }
  return value.trim();
}

/**
 * Validate an authenticated user's explicit personal test receipt. The caller must
 * select `issue` from the current, generation/SHA-matched unresolved analysis in a
 * transaction. It also owns ID, URL, timestamp, author, immutable insert and job queue.
 * No caller-controlled scope, actor or arbitrary verification object is accepted.
 */
export function validateVerification(input, { project, issue, actor } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !FIELDS.has(key))) {
    reject('VERIFICATION_INPUT_INVALID', '验证记录包含不支持的字段。');
  }
  let bytes;
  try { bytes = Buffer.byteLength(JSON.stringify(input)); } catch { reject('VERIFICATION_INPUT_INVALID', '验证记录格式无效。'); }
  if (bytes > 8192) reject('VERIFICATION_TOO_LARGE', '验证记录超过 8 KiB，请缩短事实备注。');
  if (!actor || !UUID.test(actor.id || '') || !/^[A-Za-z\d][A-Za-z\d-]{0,38}$/.test(actor.login || '')) {
    reject('VERIFICATION_ACTOR_REQUIRED', '需要已验证的个人工作台账户。', 403);
  }
  if (!project || project.status === 'permission_revoked') reject('VERIFICATION_PROJECT_UNAVAILABLE', '仓库权限尚未确认，不能记录当前版本的验证。', 409);
  const currentSha = project.headSha ?? project.currentSha;
  if (typeof currentSha !== 'string' || !SHA.test(currentSha)) reject('VERIFICATION_VERSION_REQUIRED', '项目当前完整版本尚未确认，请先同步。', 409);
  if (typeof input.sha !== 'string' || !SHA.test(input.sha) || input.sha.toLowerCase() !== currentSha.toLowerCase()) {
    reject('VERIFICATION_VERSION_CHANGED', '记录的版本与项目当前版本不一致，请重新核对实际测试版本。', 409);
  }
  const issueId = text(input.issueId, 1, 240, '问题标识');
  if (!issue || issue.id !== issueId || issue.resolved === true || issue.status === 'resolved') {
    reject('VERIFICATION_ISSUE_CHANGED', '该问题已不在当前未解决列表中，请刷新后核对。', 409);
  }
  const issueText = text(issue.text, 1, 6000, '问题内容');
  if (!['passed', 'failed'].includes(input.result)) reject('VERIFICATION_RESULT_INVALID', '请选择本次亲自验证通过或失败。');
  if (!['real-device', 'real'].includes(input.environment)) reject('VERIFICATION_ENVIRONMENT_INVALID', '只接受真实设备或真实应用环境；CI、模拟和单元测试不属于本入口。');
  if (input.personallyTested !== true || input.coversIssue !== true) {
    reject('VERIFICATION_ATTESTATION_REQUIRED', '请确认你亲自测试了所填版本，并且本次范围完整覆盖这个问题。');
  }
  const environmentDescription = text(input.environmentDescription, 3, 240, '实际环境');
  const scopeDescription = text(input.scopeDescription, 8, 2000, '验证范围');
  const notes = text(input.notes, 8, 2000, '事实备注');
  const described = [environmentDescription, scopeDescription, notes].join('\n');
  // Reject direct contradictions of the required personal-real-test attestation.
  // These are conservative guardrails, not a claim to independently verify a user.
  if (/(?:未|没有|尚未|并未|未曾)(?:亲自)?(?:进行)?(?:真实|实际|实机|手动|人工)?(?:测试|验证|验收)|(?:仅|只|全部|完全)(?:做了|通过|完成|跑了|使用|来自|有)?\s*(?:CI|持续集成|自动化测试|模拟|mock|fixture|单元测试|任务勾选)|\b(?:not|never)\s+(?:personally\s+)?(?:tested|verified)\b|\b(?:only|solely|just)\s+(?:CI|automated|mock|fixture|simulated|unit\s+tests?)\b/i.test(described)) {
    reject('VERIFICATION_REAL_TEST_REQUIRED', '备注说明尚未实际测试或仅有模拟/CI 结果；请完成亲自验证后再记录。');
  }
  const sha = currentSha.toLowerCase();
  const verification = {
    scope: 'issue', result: input.result, environment: input.environment, environmentDescription,
    sha, issueIds: [issueId], issueText, scopeDescription, notes,
    personallyTested: true, coversIssue: true, method: 'manual', selfReported: true,
    reportedBy: { id: actor.id, login: actor.login },
  };
  const body = [
    '用户亲自验证记录（用户自报，仅针对以下一个问题，不是全产品验收）',
    `问题：${issueText}`, `结果：${input.result === 'passed' ? '通过' : '失败'}`, `实际测试版本：${sha}`,
    `实际环境：${environmentDescription}`, `验证范围：${scopeDescription}`, `事实备注：${notes}`,
    '用户确认：亲自测试以上版本和问题范围；没有把 CI、模拟结果或任务勾选当作实机验收。',
  ].join('\n');
  return { recordType: 'personal_verification', scope: 'workspace-only', productAcceptance: false,
    conclusion: input.result === 'passed' ? 'success' : 'failure', body, verification };
}
