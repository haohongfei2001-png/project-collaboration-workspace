import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';

const DEFAULT_URLS = Object.freeze({
  openai: 'https://api.openai.com/v1',
  bailian: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});
const ALIBABA_HOSTS = new Set(['dashscope.aliyuncs.com', 'dashscope-intl.aliyuncs.com', 'dashscope-us.aliyuncs.com']);
const ALIBABA_WORKSPACE = /^[a-z0-9][a-z0-9-]{0,62}\.(?:cn-beijing|ap-southeast-1|us-east-1|eu-central-1|ap-northeast-1|cn-hongkong)\.maas\.aliyuncs\.com$/;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_REQUEST_BYTES = 512 * 1024;
const CONFIG_KEYS = new Set(['provider', 'baseUrl', 'model', 'inputPricePerMillion', 'outputPricePerMillion', 'currency', 'monthlyBudget', 'maxOutputTokens', 'timeoutMs', 'jsonMode']);

export class ProviderError extends Error {
  constructor(code, message, { status = 502, retryable = false, requestId = null, requestSent = false } = {}) {
    super(message);
    this.name = 'ProviderError';
    Object.assign(this, { code, status, retryable, requestId, requestSent });
  }
}

function configurationError(message) { return new ProviderError('PROVIDER_CONFIG_INVALID', message, { status: 400 }); }
function finiteNumber(value, name, { min = 0, max = 1_000_000, integer = false, fallback } = {}) {
  const number = value == null ? fallback : value;
  if (typeof number !== 'number' || !Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) throw configurationError(`${name} 参数无效。`);
  return number;
}

/** Only server configuration may supply allowedHosts; never copy it from a browser request. */
export function validateProviderConfig(input, { allowedHosts = [] } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw configurationError('请填写模型配置。');
  const provider = input.provider === 'alibaba' ? 'bailian' : input.provider;
  if (!['openai', 'bailian', 'compatible'].includes(provider)) throw configurationError('不支持的模型服务。');
  let url;
  try { url = new URL(input.baseUrl || DEFAULT_URLS[provider]); } catch { throw configurationError('模型服务地址无效。'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.port && url.port !== '443') || isIP(url.hostname)) throw configurationError('模型服务必须使用无凭据的 HTTPS 域名地址。');
  const host = url.hostname.toLowerCase();
  const basePath = url.pathname.replace(/\/+$/, '');
  if (provider === 'openai' && (host !== 'api.openai.com' || basePath !== '/v1')) throw configurationError('OpenAI 配置只允许官方 API 地址。');
  if (provider === 'bailian' && (!(ALIBABA_HOSTS.has(host) || ALIBABA_WORKSPACE.test(host)) || basePath !== '/compatible-mode/v1')) throw configurationError('百炼配置只允许官方 compatible-mode 地址。');
  if (provider === 'compatible' && (!allowedHosts.includes(host) || !/^\/[a-zA-Z0-9/_-]+$/.test(basePath) || basePath.includes('//'))) throw configurationError('此兼容服务尚未加入服务端允许名单。');
  if (typeof input.model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,159}$/.test(input.model)) throw configurationError('请填写服务商实际支持的模型 ID。');
  const currency = input.currency || (provider === 'bailian' ? 'CNY' : 'USD');
  if (!['USD', 'CNY'].includes(currency)) throw configurationError('费用币种只支持 USD 或 CNY，不进行隐含汇率转换。');
  const price = (value, name) => value == null ? null : finiteNumber(value, name, { min: 0.000001, max: 100_000 });
  const jsonMode = input.jsonMode || (provider === 'openai' ? 'json_schema' : 'json_object');
  if (!['json_schema', 'json_object'].includes(jsonMode)) throw configurationError('结构化输出模式无效。');
  return Object.freeze({
    provider, baseUrl: `${url.origin}${basePath}`, model: input.model, currency,
    inputPricePerMillion: price(input.inputPricePerMillion, '输入单价'),
    outputPricePerMillion: price(input.outputPricePerMillion, '输出单价'),
    monthlyBudget: finiteNumber(input.monthlyBudget, '月度预算', { fallback: 0, max: 100_000 }),
    maxOutputTokens: finiteNumber(input.maxOutputTokens, '最大输出', { fallback: 3000, min: 64, max: 16384, integer: true }),
    timeoutMs: finiteNumber(input.timeoutMs, '超时', { fallback: 45000, min: 1000, max: 90000, integer: true }),
    jsonMode,
  });
}

export function publicProviderConfig(config) {
  return Object.fromEntries(Object.entries(config).filter(([key]) => CONFIG_KEYS.has(key)));
}

function assertBilling(config) {
  if (!config.monthlyBudget) throw new ProviderError('AI_BUDGET_DISABLED', '请设置大于零的调用预算后再启用 AI。', { status: 409 });
  if (!(config.inputPricePerMillion > 0) || !(config.outputPricePerMillion > 0)) throw new ProviderError('AI_PRICE_REQUIRED', '请先按服务商账单口径填写输入与输出单价。', { status: 409 });
}

/** Byte count is deliberately more conservative than common token estimates. No discounts are assumed. */
export function estimateReservation(config, input, { verification = false } = {}) {
  assertBilling(config);
  let size;
  try { size = Buffer.byteLength(JSON.stringify(input ?? {})); } catch { throw configurationError('分析输入无法序列化。'); }
  if (size > MAX_REQUEST_BYTES) throw new ProviderError('AI_INPUT_TOO_LARGE', '本次证据超过单次分析上限，请缩小增量范围。', { status: 413 });
  const inputTokens = verification ? 4096 : size + 24576;
  const maxOutputTokens = verification ? Math.min(config.maxOutputTokens, 128) : config.maxOutputTokens;
  // Model Studio documents up to ten tokens of tolerance around the total-output cap.
  const budgetedOutputTokens = maxOutputTokens + (config.provider === 'bailian' ? 10 : 0);
  const costMicros = Math.ceil(inputTokens * config.inputPricePerMillion + budgetedOutputTokens * config.outputPricePerMillion);
  if (!Number.isSafeInteger(costMicros)) throw configurationError('费用预留超出安全范围。');
  return { costMicros, inputTokens, maxOutputTokens, budgetedOutputTokens, currency: config.currency };
}

export function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  // Only globally routable IPv6 unicast; excludes mapped IPv4, local, link-local, multicast and documentation addresses.
  if (isIP(address) === 6) return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:(?:db8|0|10|20):/i.test(address) && !/^2002:/i.test(address);
  return false;
}

/** DNS is checked and pinned for the connection; the HTTP Host/SNI stay on the approved hostname. */
async function secureFetch(urlString, init) {
  const url = new URL(urlString);
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true, verbatim: true }),
    new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })),
  ]);
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new ProviderError('PROVIDER_ADDRESS_REJECTED', '模型服务解析到了不允许的网络地址。', { status: 400 });
  if (init.signal.aborted) throw new Error('aborted');
  const chosen = addresses[0];
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, {
      method: init.method, headers: init.headers, signal: init.signal,
      lookup: (_hostname, options, callback) => options.all ? callback(null, [chosen]) : callback(null, chosen.address, chosen.family),
    }, res => {
      const chunks = []; let bytes = 0;
      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > MAX_RESPONSE_BYTES) { req.destroy(); reject(new ProviderError('PROVIDER_RESPONSE_TOO_LARGE', '模型响应超过安全上限。', { requestSent: true })); return; }
        chunks.push(chunk);
      });
      res.on('end', () => {
        try { resolve(new Response([204, 205, 304].includes(res.statusCode) ? null : Buffer.concat(chunks), { status: res.statusCode, headers: Object.fromEntries(Object.entries(res.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : String(value ?? '')])) })); }
        catch { reject(new ProviderError('PROVIDER_INVALID_RESPONSE', '模型服务响应无效。', { requestSent: true })); }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end(init.body);
  });
}

async function readLimitedJson(response) {
  const advertised = Number(response.headers?.get('content-length'));
  if (advertised > MAX_RESPONSE_BYTES) throw new ProviderError('PROVIDER_RESPONSE_TOO_LARGE', '模型响应超过安全上限。', { requestSent: true });
  let text;
  if (response.body?.getReader) {
    const reader = response.body.getReader(); const chunks = []; let bytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new ProviderError('PROVIDER_RESPONSE_TOO_LARGE', '模型响应超过安全上限。', { requestSent: true }); }
        chunks.push(Buffer.from(value));
      }
      text = Buffer.concat(chunks).toString('utf8');
    } finally { reader.releaseLock(); }
  } else {
    text = await response.text();
    if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new ProviderError('PROVIDER_RESPONSE_TOO_LARGE', '模型响应超过安全上限。', { requestSent: true });
  }
  try { return JSON.parse(text); } catch { throw new ProviderError('PROVIDER_INVALID_JSON', '模型服务返回了无法解析的响应。', { requestSent: true }); }
}

function accountUsage(data, config, reservation) {
  const raw = data?.usage;
  const valid = value => Number.isSafeInteger(value) && value >= 0 && value <= 2_000_000;
  const complete = valid(raw?.prompt_tokens) && valid(raw?.completion_tokens);
  const inputTokens = complete ? raw.prompt_tokens : reservation.inputTokens;
  const outputTokens = complete ? raw.completion_tokens : reservation.budgetedOutputTokens;
  const costMicros = Math.ceil(inputTokens * config.inputPricePerMillion + outputTokens * config.outputPricePerMillion);
  return { usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, complete, estimated: !complete }, costMicros };
}

/** Caller MUST durably reserve estimateReservation before calling. No hidden retries. */
export async function requestChat(configInput, key, { messages, schema, verification = false }, { fetchImpl = secureFetch, signal, allowedHosts = [] } = {}) {
  const config = validateProviderConfig(configInput, { allowedHosts });
  assertBilling(config);
  if (typeof key !== 'string' || key.length < 8 || key.length > 4096 || /[\r\n\x00]/.test(key)) throw configurationError('API Key 格式无效。');
  const reservation = estimateReservation(config, { messages, schema }, { verification });
  const maxOutputTokens = reservation.maxOutputTokens;
  const body = {
    model: config.model, messages, stream: false,
    max_completion_tokens: maxOutputTokens,
    ...(config.provider === 'openai' ? { store: false } : {}),
    ...(verification && config.provider === 'bailian' && /^qwen3\./i.test(config.model) ? { enable_thinking: false } : {}),
    response_format: config.jsonMode === 'json_schema' && schema ? { type: 'json_schema', json_schema: { name: verification ? 'connection_check' : 'project_state', strict: true, schema } } : { type: 'json_object' },
  };
  const encoded = JSON.stringify(body);
  if (Buffer.byteLength(encoded) > MAX_REQUEST_BYTES) throw new ProviderError('AI_INPUT_TOO_LARGE', '本次证据超过单次分析上限。', { status: 413 });
  const timeoutSignal = AbortSignal.timeout(config.timeoutMs);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST', redirect: 'error', signal: combinedSignal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, Accept: 'application/json' }, body: encoded,
    });
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(combinedSignal.aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE', combinedSignal.aborted ? '模型请求超时或已取消，费用需等待核对。' : '模型服务暂时无法连接，已保留本次费用预留。', { retryable: true, requestSent: true });
  }
  const id = response.headers?.get('x-request-id') || response.headers?.get('x-dashscope-request-id');
  const requestId = typeof id === 'string' && /^[\w.-]{1,128}$/.test(id) ? id : null;
  if (!response.ok || (response.status >= 300 && response.status < 400)) {
    await response.body?.cancel?.().catch(() => {});
    const status = response.status;
    const code = status === 401 || status === 403 ? 'PROVIDER_AUTH_FAILED' : status === 429 ? 'PROVIDER_RATE_LIMITED' : 'PROVIDER_REQUEST_FAILED';
    throw new ProviderError(code, status === 401 || status === 403 ? 'API Key 无效、已撤销或无此模型权限。' : status === 429 ? '模型服务触发额度或频率限制。' : '模型请求未成功，原始服务响应不向客户端展示。', { retryable: status === 429 || status >= 500, requestId, requestSent: true });
  }
  const data = await readLimitedJson(response);
  // The caller's reservation covers input bytes plus fixed schema/prompt overhead.
  // If a provider omits usage, retain a conservative amount for this actual request.
  const accountingReservation = { ...reservation, inputTokens: verification ? 4096 : Buffer.byteLength(encoded) + 4096 };
  const accounting = accountUsage(data, config, accountingReservation);
  const errorWithUsage = (code, message) => Object.assign(new ProviderError(code, message, { requestId, requestSent: true }), accounting);
  const choice = data.choices?.[0];
  if (choice?.message?.refusal || choice?.finish_reason === 'content_filter') throw errorWithUsage('MODEL_REFUSED', '模型未提供可用分析，上一版结论保留待复核。');
  if (verification && choice?.finish_reason === 'length') return { output: null, ...accounting, requestId, reservation, structuredOutputVerified: false };
  if (choice?.finish_reason !== 'stop') throw errorWithUsage('MODEL_OUTPUT_INCOMPLETE', '模型输出未完整结束，未更新项目状态。');
  if (choice.message?.tool_calls?.length || typeof choice.message?.content !== 'string') throw errorWithUsage('MODEL_OUTPUT_INVALID', '模型输出格式不符合要求，未更新项目状态。');
  let output;
  try { output = JSON.parse(choice.message.content); } catch { throw errorWithUsage('MODEL_OUTPUT_INVALID', '模型未返回完整 JSON，未更新项目状态。'); }
  return { output, ...accounting, requestId, reservation };
}

export async function verifyProvider(config, key, options = {}) {
  const schema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false };
  const result = await requestChat(config, key, { verification: true, schema, messages: [{ role: 'system', content: 'Return only JSON matching {"ok":true}. This is a model connection check.' }, { role: 'user', content: 'Respond with JSON {"ok":true}.' }] }, options);
  const structuredOutputVerified = result.output?.ok === true && Object.keys(result.output).length === 1;
  return { verified: true, structuredOutputVerified, model: config.model, usage: result.usage, costMicros: result.costMicros, requestId: result.requestId };
}
