import crypto from 'crypto';
import { normalizeTier } from './license.js';

const YOOKASSA_API_URL = String(process.env.YOOKASSA_API_URL || 'https://api.yookassa.ru/v3').replace(/\/+$/, '');

const TIER_PRICES = {
  '1_month': 299,
  'lifetime': 890,
  'beta': 1290,
  'hwid_reset': 499
};

export function getTierPriceRub(rawTier) {
  const tier = normalizeTier(rawTier);
  const amount = TIER_PRICES[tier];
  if (!amount) {
    throw new Error(`Unsupported tier: ${rawTier}`);
  }
  return {
    tier,
    amountRub: amount
  };
}

function basicAuthHeader() {
  const shopId = String(process.env.YOOKASSA_SHOP_ID || '').trim();
  const secretKey = String(process.env.YOOKASSA_SECRET_KEY || '').trim();
  if (!shopId || !secretKey) {
    throw new Error('YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY are not configured.');
  }
  return {
    shopId,
    secretKey,
    value: `Basic ${Buffer.from(`${shopId}:${secretKey}`, 'utf8').toString('base64')}`
  };
}

export async function createYooKassaPayment({ paymentId, userId, email, tier, amountRub, returnUrl }) {
  const auth = basicAuthHeader();
  const idempotenceKey = crypto.randomUUID();

  const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth.value,
      'Idempotence-Key': idempotenceKey
    },
    body: JSON.stringify({
      amount: {
        value: `${Number(amountRub).toFixed(2)}`,
        currency: 'RUB'
      },
      capture: true,
      description: `Aura Client ${tier}`,
      confirmation: {
        type: 'redirect',
        return_url: returnUrl
      },
      metadata: {
        paymentId,
        userId,
        tier,
        email: email || ''
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      message: payload?.description || payload?.error || `YooKassa HTTP ${response.status}`,
      payload
    };
  }

  return {
    ok: true,
    payment: payload
  };
}

export function normalizeYooKassaStatus(status) {
  const raw = String(status || '').toLowerCase();
  if (raw === 'succeeded') {
    return 'completed';
  }
  if (raw === 'canceled') {
    return 'failed';
  }
  if (raw === 'pending' || raw === 'waiting_for_capture') {
    return 'pending';
  }
  return raw || 'pending';
}
