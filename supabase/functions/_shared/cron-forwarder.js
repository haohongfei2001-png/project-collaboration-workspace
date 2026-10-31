import { previewOrigin, readBounded, reply } from './github-ingress.js';

export const SCHEDULER_SIGNATURE_TTL_SECONDS = 60;
export const CRON_FORWARD_TIMEOUT_MS = 115000;
const paths = new Set(['/functions/v1/cron-forwarder', '/cron-forwarder']);
const encoder = new TextEncoder();
export const schedulerMessage = (timestamp, nonce) => `pcw-r2-cron-v1\nPOST\n/functions/v1/cron-forwarder\n${timestamp}\n${nonce}`;

function configuration(env) {
  const origin = previewOrigin(env.PCW_PREVIEW_ORIGIN);
  const key = env.PCW_SCHEDULER_HMAC_KEY;
  const cronSecret = env.CRON_SECRET;
  const bypassSecret = env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (typeof key !== 'string' || !/^[a-f0-9]{64}$/i.test(key)) throw new Error('SCHEDULER_KEY_INVALID');
  if (typeof cronSecret !== 'string' || !/^[\x21-\x7e]{32,1024}$/.test(cronSecret)) throw new Error('CRON_SECRET_INVALID');
  if (typeof bypassSecret !== 'string' || !/^[\x21-\x7e]{16,1024}$/.test(bypassSecret)) throw new Error('BYPASS_SECRET_INVALID');
  return { origin, key: Uint8Array.from(key.match(/.{2}/g), pair => parseInt(pair, 16)), cronSecret, bypassSecret };
}

// pg_net follows redirects. Its request contains only this fixed-purpose, short-lived signature;
// the long-lived Vercel and workspace credentials are inserted here, with redirects forbidden.
export function createCronForwarder({ env = {}, fetchImpl = globalThis.fetch, cryptoImpl = globalThis.crypto, now = Date.now, timeoutMs = CRON_FORWARD_TIMEOUT_MS } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > CRON_FORWARD_TIMEOUT_MS) throw new Error('CRON_TIMEOUT_INVALID');
  let config; try { config = configuration(env); } catch { /* Fail closed without printing secret configuration. */ }
  let key;
  return async function cronForwarder(request) {
    if (request.method !== 'POST') return reply(405, { accepted: false, code: 'METHOD_NOT_ALLOWED' });
    const url = new URL(request.url);
    if (!paths.has(url.pathname) || url.search || url.hash) return reply(404, { accepted: false, code: 'NOT_FOUND' });
    if (!config) return reply(503, { accepted: false, code: 'SCHEDULER_NOT_CONFIGURED' });
    const timestamp = request.headers.get('x-pcw-scheduler-timestamp') || '';
    const nonce = request.headers.get('x-pcw-scheduler-nonce') || '';
    const signature = request.headers.get('x-pcw-scheduler-signature') || '';
    const declared = request.headers.get('content-length');
    if (!/^\d{10,11}$/.test(timestamp) || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(nonce) || !/^v1=[a-f0-9]{64}$/.test(signature) || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '') || request.headers.has('content-encoding')) {
      return reply(400, { accepted: false, code: 'INVALID_HEADERS' });
    }
    if (declared !== null && (!/^\d{1,4}$/.test(declared) || Number(declared) > 1024)) return reply(413, { accepted: false, code: 'PAYLOAD_TOO_LARGE' });
    const age = Math.floor(now() / 1000) - Number(timestamp);
    if (age < -5 || age > SCHEDULER_SIGNATURE_TTL_SECONDS) return reply(401, { accepted: false, code: 'SCHEDULER_SIGNATURE_EXPIRED' });
    const controller = new AbortController(); let timer;
    const expired = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('TIMEOUT')); }, timeoutMs); });
    const forward = async () => {
      key ??= cryptoImpl.subtle.importKey('raw', config.key, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      const signed = Uint8Array.from(signature.slice(3).match(/.{2}/g), pair => parseInt(pair, 16));
      if (!await cryptoImpl.subtle.verify('HMAC', await key, signed, encoder.encode(schedulerMessage(timestamp, nonce)))) return reply(401, { accepted: false, code: 'INVALID_SIGNATURE' });
      const body = await readBounded(request.body, 1024, controller.signal);
      // The authenticated operation has no arguments. In particular, callers cannot supply targets or headers.
      if ((declared !== null && Number(declared) !== body.byteLength) || !/^\s*\{\s*\}\s*$/.test(new TextDecoder('utf-8', { fatal: true }).decode(body))) return reply(400, { accepted: false, code: 'INVALID_BODY' });
      if (Math.floor(now() / 1000) - Number(timestamp) > SCHEDULER_SIGNATURE_TTL_SECONDS) return reply(401, { accepted: false, code: 'SCHEDULER_SIGNATURE_EXPIRED' });
      const upstream = await fetchImpl(`${config.origin}/api/cron`, {
        method: 'POST', redirect: 'error', credentials: 'omit', signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.cronSecret}`,
          'x-vercel-protection-bypass': config.bypassSecret,
          // The backend records this nonce durably to reject replay across Edge isolates.
          'x-pcw-scheduler-nonce': nonce,
        },
        body: '{}',
      });
      if (upstream.redirected || upstream.status !== 200 || !/^application\/json(?:\s*;|$)/i.test(upstream.headers.get('content-type') || '')) {
        void upstream.body?.cancel().catch(() => {});
        return reply(502, { accepted: false, code: 'UPSTREAM_UNAVAILABLE' });
      }
      const result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readBounded(upstream.body, 32 * 1024, controller.signal)));
      if (!Number.isInteger(result.queued) || result.queued < 0 || !Number.isInteger(result.processed) || result.processed < 0 || !Array.isArray(result.outcomes)) return reply(502, { accepted: false, code: 'UPSTREAM_UNAVAILABLE' });
      return reply(200, { accepted: true, processed: result.processed, failed: result.outcomes.filter(outcome => outcome?.status === 'failed').length });
    };
    try { return await Promise.race([forward(), expired]); }
    catch (error) {
      if (error?.code === 'PAYLOAD_TOO_LARGE') return reply(413, { accepted: false, code: 'PAYLOAD_TOO_LARGE' });
      return reply(controller.signal.aborted ? 504 : 502, { accepted: false, code: controller.signal.aborted ? 'SCHEDULER_TIMEOUT' : 'UPSTREAM_UNAVAILABLE' });
    } finally { clearTimeout(timer); controller.abort(); }
  };
}
