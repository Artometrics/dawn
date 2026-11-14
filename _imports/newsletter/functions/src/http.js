export class HttpError extends Error {
  constructor(status, message, code = 'error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowed =
    typeof origin === 'string' &&
    (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
      origin === 'https://newsletter-510519.web.app' ||
      origin === 'https://newsletter-510519.firebaseapp.com' ||
      (process.env.PUBLIC_BASE_URL && origin === process.env.PUBLIC_BASE_URL.replace(/\/$/, '')));
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  const type = String(req.headers['content-type'] || '');
  if (type.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new HttpError(400, 'The request body was not valid JSON.', 'invalid_json');
    }
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  return String(req.socket?.remoteAddress || '').slice(0, 64);
}

export function time(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}
