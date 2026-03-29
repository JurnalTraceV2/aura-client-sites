export function methodNotAllowed(res) {
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

export function badRequest(res, message) {
  return res.status(400).json({ ok: false, error: message });
}

export function unauthorized(res, message) {
  return res.status(401).json({ ok: false, error: message });
}

export function forbidden(res, message) {
  return res.status(403).json({ ok: false, error: message });
}

export function tooManyRequests(res, retryAfterMs) {
  if (retryAfterMs > 0) {
    res.setHeader('Retry-After', Math.ceil(retryAfterMs / 1000));
  }
  return res.status(429).json({ ok: false, error: 'Too many requests' });
}

export function serverError(res, message, details = undefined) {
  return res.status(500).json({ ok: false, error: message, ...(details ? { details } : {}) });
}

export function normalizePem(pemText) {
  if (!pemText) {
    return '';
  }
  return String(pemText).replace(/\\n/g, '\n').trim();
}

export function getBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  try {
    if (typeof req.body === 'string') {
      return JSON.parse(req.body);
    }
  } catch (error) {
    return {};
  }

  return {};
}

export function extractBearerToken(req) {
  const raw = req?.headers?.authorization || req?.headers?.Authorization || '';
  if (!raw) {
    return '';
  }

  const value = String(Array.isArray(raw) ? raw[0] : raw).trim();
  if (!value.toLowerCase().startsWith('bearer ')) {
    return '';
  }

  return value.slice(7).trim();
}

export function getRequestBaseUrl(req) {
  const explicit = String(process.env.APP_URL || process.env.PUBLIC_APP_URL || '').trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const hostHeader = req?.headers?.['x-forwarded-host'] || req?.headers?.host || process.env.VERCEL_URL || '';
  const host = String(Array.isArray(hostHeader) ? hostHeader[0] : hostHeader).trim();
  if (!host) {
    return '';
  }

  const protoHeader = req?.headers?.['x-forwarded-proto'] || '';
  const protoRaw = String(Array.isArray(protoHeader) ? protoHeader[0] : protoHeader).trim();
  const proto = protoRaw || (host.includes('localhost') ? 'http' : 'https');

  return `${proto}://${host}`.replace(/\/+$/, '');
}
