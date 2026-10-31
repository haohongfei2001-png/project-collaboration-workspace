// Portable Web API implementation, shared by the deployed Deno entry point and Node tests.
// This bridge is deliberately stateless. Only the protected backend persists or deduplicates deliveries.
export const INGRESS_MAX_BODY_BYTES = 2 * 1024 * 1024;
export const INGRESS_TIMEOUT_MS = 7000;
const encoder = new TextEncoder();
const paths = new Set(['/functions/v1/github-ingress', '/github-ingress']);

class IngressError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

export function previewOrigin(value) {
  // Only an explicitly configured Vercel deployment/alias is accepted. No user-supplied destination.
  if (typeof value !== 'string' || !/^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app\/?$/i.test(value)) throw new Error('PREVIEW_ORIGIN_INVALID');
  const parsed = new URL(value);
  if (parsed.hostname.split('.')[0].length > 63) throw new Error('PREVIEW_ORIGIN_INVALID');
  return parsed.origin;
}

function settings(env) {
  const origin = previewOrigin(env.PCW_PREVIEW_ORIGIN);
  const webhookSecret = env.GITHUB_WEBHOOK_SECRET;
  const bypassSecret = env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (typeof webhookSecret !== 'string' || encoder.encode(webhookSecret).length < 16 || encoder.encode(webhookSecret).length > 512 || /[\r\n\0]/.test(webhookSecret)) throw new Error('WEBHOOK_SECRET_INVALID');
  if (typeof bypassSecret !== 'string' || !/^[\x21-\x7e]{16,1024}$/.test(bypassSecret)) throw new Error('BYPASS_SECRET_INVALID');
  return { origin, webhookSecret, bypassSecret };
}

export function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...(status === 405 ? { Allow: 'POST' } : {}),
      ...(status >= 500 ? { 'Retry-After': '60' } : {}),
    },
  });
}

export async function readBounded(stream, maxBytes, signal) {
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  const chunks = []; let length = 0;
  try {
    while (true) {
      if (signal.aborted) throw new IngressError(504, 'INGRESS_TIMEOUT');
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { cancel(); throw new IngressError(413, 'PAYLOAD_TOO_LARGE'); }
      chunks.push(value);
    }
    if (signal.aborted) throw new IngressError(504, 'INGRESS_TIMEOUT');
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

export function createGitHubIngress({ env = {}, fetchImpl = globalThis.fetch, cryptoImpl = globalThis.crypto, timeoutMs = INGRESS_TIMEOUT_MS, maxBodyBytes = INGRESS_MAX_BODY_BYTES } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > INGRESS_TIMEOUT_MS) throw new Error('INGRESS_TIMEOUT_INVALID');
  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 1 || maxBodyBytes > INGRESS_MAX_BODY_BYTES) throw new Error('INGRESS_BODY_LIMIT_INVALID');
  let config;
  try { config = settings(env); } catch { /* Return a fixed failure below; never print configuration or secret values. */ }
  let key;
  return async function githubIngress(request) {
    if (request.method !== 'POST') return reply(405, { accepted: false, code: 'METHOD_NOT_ALLOWED' });
    const incoming = new URL(request.url);
    if (!paths.has(incoming.pathname) || incoming.search || incoming.hash) return reply(404, { accepted: false, code: 'NOT_FOUND' });
    if (!config) return reply(503, { accepted: false, code: 'INGRESS_NOT_CONFIGURED' });
    const signature = request.headers.get('x-hub-signature-256') || '';
    const delivery = request.headers.get('x-github-delivery') || '';
    const event = request.headers.get('x-github-event') || '';
    const contentType = request.headers.get('content-type') || '';
    const contentEncoding = request.headers.get('content-encoding');
    if (!/^sha256=[a-f0-9]{64}$/i.test(signature) || !/^[a-zA-Z0-9-]{8,128}$/.test(delivery) || !/^[a-z][a-z0-9_]{0,63}$/.test(event) || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType) || (contentEncoding && contentEncoding.toLowerCase() !== 'identity')) {
      return reply(400, { accepted: false, code: 'INVALID_HEADERS' });
    }
    const declared = request.headers.get('content-length');
    if (declared !== null && !/^\d{1,10}$/.test(declared)) return reply(400, { accepted: false, code: 'INVALID_CONTENT_LENGTH' });
    if (declared !== null && Number(declared) > maxBodyBytes) return reply(413, { accepted: false, code: 'PAYLOAD_TOO_LARGE' });
    const controller = new AbortController(); let timer;
    const expired = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new IngressError(504, 'INGRESS_TIMEOUT')); }, timeoutMs);
    });
    const forward = async () => {
      const body = await readBounded(request.body, maxBodyBytes, controller.signal);
      if (!body.byteLength || (declared !== null && Number(declared) !== body.byteLength)) throw new IngressError(400, 'INVALID_CONTENT_LENGTH');
      key ??= cryptoImpl.subtle.importKey('raw', encoder.encode(config.webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      const expected = Uint8Array.from(signature.slice(7).match(/.{2}/g), pair => parseInt(pair, 16));
      if (!await cryptoImpl.subtle.verify('HMAC', await key, expected, body)) throw new IngressError(401, 'INVALID_SIGNATURE');
      if (controller.signal.aborted) throw new IngressError(504, 'INGRESS_TIMEOUT');
      const response = await fetchImpl(`${config.origin}/api/webhooks/github`, {
        method: 'POST',
        redirect: 'error',
        credentials: 'omit',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': event,
          'x-github-delivery': delivery,
          'x-vercel-protection-bypass': config.bypassSecret,
        },
        body,
      });
      if (response.redirected || ![200, 202].includes(response.status) || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
        void response.body?.cancel().catch(() => {});
        throw new IngressError(502, 'UPSTREAM_UNAVAILABLE');
      }
      // A login page or a generic HTTP 200 is not acknowledgement of durable webhook ingestion.
      let acknowledgement;
      try { acknowledgement = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readBounded(response.body, 16 * 1024, controller.signal))); }
      catch { throw new IngressError(502, 'UPSTREAM_UNAVAILABLE'); }
      if (acknowledgement?.accepted !== true) throw new IngressError(502, 'UPSTREAM_UNAVAILABLE');
      return reply(response.status, { accepted: true });
    };
    try { return await Promise.race([forward(), expired]); }
    catch (error) {
      if (error instanceof IngressError) return reply(error.status, { accepted: false, code: error.code });
      return reply(controller.signal.aborted ? 504 : 502, { accepted: false, code: controller.signal.aborted ? 'INGRESS_TIMEOUT' : 'UPSTREAM_UNAVAILABLE' });
    } finally { clearTimeout(timer); controller.abort(); }
  };
}
