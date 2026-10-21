import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { properties } from './inquiry-properties.mjs';

export const recipient = 'info@verdelandhomebuilders.com';
const origins = new Set(['https://www.verdelandhomebuilders.com','https://verdelandhomebuilders.com']);
const email = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;
const json = (body, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const failure = (code, status) => json({accepted:false, code}, status);
const hash = (secret, value) => createHmac('sha256', secret).update(value).digest('hex');
function configured(env) {
  return env.INQUIRY_ENABLED === 'true' && env.INQUIRY_TOKEN_SECRET?.length >= 32 &&
    email.test(env.INQUIRY_FROM || '') && env.INQUIRY_FROM_VERIFIED === 'true' && env.RESEND_API_KEY &&
    /^https:\/\/[a-z0-9-]+\.upstash\.io\/?$/.test(env.UPSTASH_REDIS_REST_URL || '') && env.UPSTASH_REDIS_REST_TOKEN;
}
async function readBody(request) {
  if (Number(request.headers.get('content-length')) > 12000) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('json');
  const chunks = []; let size = 0;
  for (;;) { const {value, done} = await reader.read(); if (done) break;
    size += value.length; if (size > 12000) { await reader.cancel(); throw new Error('size'); } chunks.push(Buffer.from(value)); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function handleInquiry(request, options = {}) {
  const env = options.env || process.env, fetcher = options.fetcher || fetch;
  const now = options.now || Date.now, uuid = options.uuid || randomUUID;
  const report = options.report || (code => console.error('inquiry:', code)); // Codes only; never payloads or provider responses.
  const method = request.method;
  if (!['GET','POST'].includes(method)) return failure('method', 405);
  const origin = request.headers.get('origin'), requestOrigin = new URL(request.url).origin;
  if (!origins.has(requestOrigin) || (origin && origin !== requestOrigin) ||
      (method === 'POST' && origin !== requestOrigin) || request.headers.get('x-verde-inquiry') !== '1' ||
      request.headers.get('sec-fetch-site') === 'cross-site') return failure('origin', 403);
  if (method === 'POST' && request.headers.get('content-type')?.split(';')[0] !== 'application/json') return failure('content_type', 415);
  if (!configured(env)) return failure('unavailable', 503);
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (!ip) return failure('unavailable', 503); // Trust only the deployment's platform-injected IP header.
  const ipHash = hash(env.INQUIRY_TOKEN_SECRET, ip);
  async function redis(command) {
    const response = await fetcher(env.UPSTASH_REDIS_REST_URL, {method:'POST',headers:{Authorization:`Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(5000)});
    const data = await response.json();
    if (!response.ok || data.error || data.result === undefined) throw new Error('limiter');
    return data.result;
  }
  async function limit(key, max, seconds) {
    const count = await redis(['EVAL', "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", 1, 'vl-inquiry:' + key, seconds]);
    if (!Number.isInteger(count) || count < 1) throw new Error('limiter');
    return count <= max;
  }
  try {
    if (!await limit(`${method}:${ipHash}`, method === 'GET' ? 30 : 5, 900)) return failure('rate_limit', 429);
    if (method === 'GET') {
      const time = now();
      const payload = Buffer.from(JSON.stringify({id:uuid(),time,ip:ipHash})).toString('base64url');
      return json({token:payload + '.' + hash(env.INQUIRY_TOKEN_SECRET, payload), expiresAt:time + 3600000});
    }
    let data;
    try { data = await readBody(request); } catch (error) { return failure(error.message === 'size' ? 'too_large' : 'invalid', error.message === 'size' ? 413 : 400); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return failure('invalid', 400);
    if (typeof data.token !== 'string' || data.token.length > 1000) return failure('expired', 400);
    const [encoded, signature, extra] = data.token.split('.');
    const expected = hash(env.INQUIRY_TOKEN_SECRET, encoded);
    if (extra || !/^[a-f0-9]{64}$/.test(signature || '') || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return failure('expired', 400);
    let token; try { token = JSON.parse(Buffer.from(encoded, 'base64url').toString()); } catch { return failure('expired', 400); }
    if (token.ip !== ipHash || !Number.isFinite(token.time) || now() - token.time > 3600000 || token.time > now() || !/^[a-f0-9-]{36}$/.test(token.id)) return failure('expired', 400);
    if (now() - token.time < 3000) return failure('too_soon', 400);
    const limits = {name:120,email:254,phone:40,message:4000,property:80,website:200};
    for (const [field, max] of Object.entries(limits)) {
      if (typeof data[field] !== 'string' || data[field].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(data[field])) return failure('invalid', 400);
      data[field] = data[field].trim();
    }
    if (!data.name || /[\r\n]/.test(data.name) || !email.test(data.email) || data.website ||
      (data.property !== '' && !Object.hasOwn(properties, data.property)) ||
      (data.phone && (!/^[+()\d\s.\-]+$/.test(data.phone) || data.phone.replace(/\D/g,'').length < 7 || data.phone.replace(/\D/g,'').length > 15))) return failure('invalid', 400);
    if (!await limit('global', 100, 86400)) return failure('rate_limit', 429);
    const title = data.property ? properties[data.property] : 'Upcoming projects inquiry';
    const body = {from:`VerdeLand Home Builders <${env.INQUIRY_FROM}>`,to:[recipient],reply_to:data.email,
      subject:`Website inquiry: ${title}`,
      text:`${data.property ? 'Property' : 'Inquiry'}: ${title}\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || 'Not supplied'}\n\nQuestion:\n${data.message || 'Not supplied'}\n\nSubmitted through the VerdeLand Home Builders website.`};
    const digest = hash(env.INQUIRY_TOKEN_SECRET, JSON.stringify(body));
    const dedupeKey = 'vl-inquiry:request:' + token.id;
    const reserved = await redis(['SET', dedupeKey, digest, 'NX', 'EX', 86400]);
    if (reserved !== 'OK' && await redis(['GET', dedupeKey]) !== digest) return failure('expired', 409);
    const response = await fetcher('https://api.resend.com/emails', {method:'POST', headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':'verdeland-' + token.id},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
    const result = await response.json();
    if (!response.ok || typeof result.id !== 'string' || !result.id) throw new Error('delivery');
    // Stable, non-provider receipt for local retry deduplication only; never an analytics parameter.
    return json({accepted:true, receipt:hash(env.INQUIRY_TOKEN_SECRET, 'accepted:' + token.id)}); // Provider acceptance, not inbox delivery.
  } catch { report('dependency_failure'); return failure('unavailable', 503); }
}
