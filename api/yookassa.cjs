const https = require('https');
const crypto = require('crypto');

const PAYMENT_TIERS = {
  beta: { amount: 1290, currency: 'RUB', description: 'Aura Client - Beta access' },
  '1_month': { amount: 299, currency: 'RUB', description: 'Aura Client - Premium 1 month' },
  lifetime: { amount: 890, currency: 'RUB', description: 'Aura Client - Lifetime' },
  hwid_reset: { amount: 499, currency: 'RUB', description: 'Aura Client - HWID reset' }
};

function json(res, status, payload) {
  res.status(status).json(payload);
}

function getEnvConfig() {
  const shopId = String(process.env.YOOKASSA_SHOP_ID || '').trim();
  const secretKey = String(process.env.YOOKASSA_SECRET_KEY || '').trim();
  const missing = [];
  if (!shopId) {
    missing.push('YOOKASSA_SHOP_ID');
  }
  if (!secretKey) {
    missing.push('YOOKASSA_SECRET_KEY');
  }
  if (missing.length > 0) {
    return { ok: false, error: `Missing ${missing.join(', ')}` };
  }
  return { ok: true, shopId, secretKey };
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return {};
    }
  }
  if (req.method !== 'POST') {
    return {};
  }
  const raw = await getRawBody(req);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

function yookassaRequest({ method, path, body, shopId, secretKey, idempotenceKey }) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    const headers = {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    };

    if (idempotenceKey) {
      headers['Idempotence-Key'] = idempotenceKey;
    }

    const req = https.request(
      {
        hostname: 'api.yookassa.ru',
        port: 443,
        method,
        path: `/v3${path}`,
        headers
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          let parsed = null;
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch (_) {
            parsed = { raw: data || '' };
          }

          if (response.statusCode >= 200 && response.statusCode < 300) {
            return resolve(parsed);
          }

          const message = parsed?.description || parsed?.error || `YooKassa HTTP ${response.statusCode || 500}`;
          return reject(new Error(message));
        });
      }
    );

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

function createIdempotenceKey() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const env = getEnvConfig();
  if (!env.ok) {
    return json(res, 500, { ok: false, error: 'Payments are not configured', details: env.error });
  }

  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  const body = await parseBody(req);

  try {
    if (pathname.endsWith('/create') && req.method === 'POST') {
      const tier = String(body?.tier || '').trim();
      const selectedTier = PAYMENT_TIERS[tier];

      if (!selectedTier) {
        return json(res, 400, { ok: false, error: 'Invalid tier' });
      }

      const returnUrl =
        typeof body?.returnUrl === 'string' && body.returnUrl.trim()
          ? body.returnUrl.trim()
          : 'https://aura-client-sites.vercel.app/payment/success';

      const payment = await yookassaRequest({
        method: 'POST',
        path: '/payments',
        shopId: env.shopId,
        secretKey: env.secretKey,
        idempotenceKey: createIdempotenceKey(),
        body: {
          amount: {
            value: selectedTier.amount.toFixed(2),
            currency: selectedTier.currency
          },
          confirmation: {
            type: 'redirect',
            return_url: returnUrl
          },
          capture: true,
          description: selectedTier.description,
          metadata: {
            tier,
            userId: String(body?.userId || 'anonymous')
          }
        }
      });

      return json(res, 200, {
        ok: true,
        paymentId: payment.id,
        confirmationUrl: payment?.confirmation?.confirmation_url || '',
        expiresAt: payment?.expires_at ? new Date(payment.expires_at).getTime() : 0,
        amount: selectedTier.amount,
        currency: selectedTier.currency
      });
    }

    if (pathname.endsWith('/check') && req.method === 'POST') {
      const paymentId = String(body?.paymentId || '').trim();

      if (!paymentId) {
        return json(res, 400, { ok: false, error: 'paymentId is required' });
      }

      const payment = await yookassaRequest({
        method: 'GET',
        path: `/payments/${paymentId}`,
        shopId: env.shopId,
        secretKey: env.secretKey
      });

      return json(res, 200, {
        ok: true,
        paymentId: payment.id,
        status: payment.status,
        paid: payment.status === 'succeeded',
        subscription: payment.status === 'succeeded' ? 'premium' : 'none'
      });
    }

    if (pathname.endsWith('/webhook') && req.method === 'POST') {
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { ok: false, error: 'Endpoint not found' });
  } catch (error) {
    console.error('[YooKassa API error]', error);
    return json(res, 500, {
      ok: false,
      error: 'Failed to process payment request',
      details: error?.message || 'Unknown error'
    });
  }
};
