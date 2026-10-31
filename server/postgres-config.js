import { HttpError } from './security.js';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const REMOTE_SSL_MODES = new Set(['require', 'verify-ca', 'verify-full']);

function invalid() {
  return new HttpError(503, 'DATABASE_CONFIG_INVALID', '数据库连接配置无效；请检查地址、数据库、运行账号和 TLS 参数。');
}

/**
 * pg lets connection-string SSL options replace an explicit ssl object.
 * Never pass the original URL to pg: parse only approved fields, and make
 * certificate verification authoritative even for sslmode=require.
 */
export function postgresConnectionOptions(value, { ca = '' } = {}) {
  try {
    if (typeof value !== 'string' || !value || value.length > 16_384 || typeof ca !== 'string' || ca.length > 262_144) throw invalid();
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || url.hash) throw invalid();
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const local = LOCAL_HOSTS.has(host);
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = decodeURIComponent(url.pathname.slice(1));
    const port = Number(url.port || 5432);
    if (!user || user.length > 256 || /[\x00-\x1f\x7f]/.test(user) || (!local && !password)
      || password.length > 8192 || /\x00/.test(password)
      || !database || database.length > 256 || /[\/\\\x00-\x1f\x7f]/.test(database)
      || !Number.isInteger(port) || port < 1 || port > 65535) throw invalid();
    for (const name of url.searchParams.keys()) if (name !== 'sslmode') throw invalid();
    if (url.searchParams.getAll('sslmode').length > 1) throw invalid();
    const mode = url.searchParams.get('sslmode');
    if (mode !== null && !REMOTE_SSL_MODES.has(mode) && !(local && mode === 'disable')) throw invalid();
    const ssl = local && (mode === null || mode === 'disable')
      ? false
      : { rejectUnauthorized: true, ...(ca ? { ca } : {}) };
    return { host, port, user, password, database, ssl };
  } catch {
    // URL/parser exceptions can contain credentials. Only a fixed safe error escapes.
    throw invalid();
  }
}
