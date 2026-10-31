import { createHash, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, code, message, detail) { super(message); this.status = status; this.code = code; this.detail = detail; }
}
export const hash = input => createHash('sha256').update(typeof input === 'string' || Buffer.isBuffer(input) ? input : JSON.stringify(input)).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
export function equal(a, b) { const aa = Buffer.from(String(a || '')), bb = Buffer.from(String(b || '')); return aa.length > 0 && aa.length === bb.length && timingSafeEqual(aa, bb); }
export function cipher(config) {
  let keys;
  try { keys = config.encryptionKeys ? JSON.parse(config.encryptionKeys) : { v1: config.encryptionKey }; } catch { throw new HttpError(503, 'ENCRYPTION_INVALID', '服务器加密配置无效'); }
  const ids = Object.keys(keys);
  for (const id of ids) { keys[id] = Buffer.from(keys[id] || '', 'base64'); if (keys[id].length !== 32) throw new HttpError(503, 'ENCRYPTION_INVALID', '服务器加密密钥必须是 32 字节'); }
  if (!ids.length) throw new HttpError(503, 'ENCRYPTION_REQUIRED', '服务器加密尚未配置');
  return {
    encrypt(value, context) { const iv = randomBytes(12), enc = createCipheriv('aes-256-gcm', keys[ids[0]], iv); enc.setAAD(Buffer.from(context)); const data = Buffer.concat([enc.update(value, 'utf8'), enc.final()]); return [ids[0], iv.toString('base64url'), enc.getAuthTag().toString('base64url'), data.toString('base64url')].join('.'); },
    decrypt(value, context) { try { const [id, iv, tag, data] = value.split('.'); if (!keys[id]) throw Error(); const dec = createDecipheriv('aes-256-gcm', keys[id], Buffer.from(iv, 'base64url')); dec.setAAD(Buffer.from(context)); dec.setAuthTag(Buffer.from(tag, 'base64url')); return Buffer.concat([dec.update(Buffer.from(data, 'base64url')), dec.final()]).toString('utf8'); } catch { throw new HttpError(503, 'KEY_UNAVAILABLE', '保存的凭据无法解密，请检查密钥轮换配置'); } },
  };
}
export function cookies(req) { return Object.fromEntries(String(req.headers.cookie || '').split(';').map(x => x.trim().split(/=(.*)/s).slice(0, 2)).filter(x => x[0])); }
export function cookie(name, value, { secure = true, maxAge = 86400, httpOnly = true } = {}) { return `${name}=${value}; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}${httpOnly ? '; HttpOnly' : ''}`; }
export function requireMutation(req, session, config) {
  if (!equal(req.headers.origin, config.origin)) throw new HttpError(403, 'ORIGIN_REJECTED', '请求来源不匹配，请重新打开工作台');
  if (!equal(req.headers['x-csrf-token'], session.csrf)) throw new HttpError(403, 'CSRF_REJECTED', '会话已变化，请刷新后重试');
}
export async function readBody(req, limit = 2 * 1024 * 1024) {
  const chunks = []; let size = 0;
  if (req.body !== undefined && !req[Symbol.asyncIterator]) throw new HttpError(500, 'RAW_BODY_REQUIRED', '原始请求体不可用');
  for await (const chunk of req) { const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += b.length; if (size > limit) throw new HttpError(413, 'BODY_TOO_LARGE', '请求内容过大'); chunks.push(b); }
  return Buffer.concat(chunks);
}
export function parseJSON(buffer) { try { const value = JSON.parse(buffer.toString('utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); return value; } catch { throw new HttpError(400, 'INVALID_JSON', '请求格式无效'); } }
export function validateRepo(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value) || value.includes('..')) throw new HttpError(400, 'INVALID_REPO', '仓库名称无效'); return value; }
export function cleanPath(value) { if (!value) return ''; if (typeof value !== 'string' || value.length > 250 || value.startsWith('/') || value.split('/').some(p => !p || p === '.' || p === '..') || /[\\?#\x00-\x1f]/.test(value)) throw new HttpError(400, 'INVALID_PATH', '计划文件路径无效'); return value; }
export const publicError = error => ({ code: error.code || 'SERVER_ERROR', message: error instanceof HttpError || ['ProviderError','GitHubError'].includes(error.name) ? error.message : '服务暂时无法完成请求，已保留之前的记录。' });
