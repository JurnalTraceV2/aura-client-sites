const limiterStore = new Map();

function nowMs() {
  return Date.now();
}

export function checkRateLimit(key, limit, windowMs) {
  const now = nowMs();
  const current = limiterStore.get(key);

  if (!current || now >= current.resetAt) {
    limiterStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0, remaining: limit - 1 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, current.resetAt - now),
      remaining: 0
    };
  }

  current.count += 1;
  limiterStore.set(key, current);
  return { allowed: true, retryAfterMs: 0, remaining: Math.max(0, limit - current.count) };
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }

  return req.socket?.remoteAddress || 'unknown';
}
