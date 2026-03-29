import { findUserByHwidHash, getSubscriptionState, normalizeHwidHash, verifySessionToken, writeAuditLog } from './_lib/license.js';

function extractBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  return {};
}

function fromQuery(req, key) {
  if (!req?.query) {
    return '';
  }
  const value = req.query[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ allowed: false, message: 'Method not allowed' });
  }

  const body = extractBody(req);
  const sessionToken = String(body.sessionToken || body.token || '').trim();
  const hwidCandidate = body.hwidHash || body.hwid || fromQuery(req, 'hwid') || fromQuery(req, 'hwidHash');
  const hwidHash = normalizeHwidHash(hwidCandidate);

  if (!hwidHash) {
    return res.status(400).json({ allowed: false, message: 'hwid/hwidHash is required' });
  }

  try {
    if (sessionToken) {
      const verification = await verifySessionToken(sessionToken, hwidHash, { touchSession: true });
      if (!verification.valid) {
        return res.status(200).json({
          allowed: false,
          message: verification.message || 'Session invalid.'
        });
      }

      return res.status(200).json({
        allowed: true,
        message: 'Access granted',
        subscription: verification.subscription,
        uidShort: verification.uidShort,
        username: verification.email
      });
    }

    const user = await findUserByHwidHash(hwidHash);
    if (!user) {
      return res.status(200).json({
        allowed: false,
        message: 'License not found. Buy access on website.'
      });
    }

    if (user.banned === true) {
      return res.status(200).json({
        allowed: false,
        message: 'Account is banned.'
      });
    }

    const subscriptionState = getSubscriptionState(user);
    if (!subscriptionState.active) {
      return res.status(200).json({
        allowed: false,
        message: 'Subscription inactive.'
      });
    }

    await writeAuditLog('legacy_hwid_check_success', {
      uid: user.uid,
      uidShort: user.uidShort,
      subscription: subscriptionState.subscription
    });

    return res.status(200).json({
      allowed: true,
      message: 'Access granted',
      subscription: subscriptionState.subscription,
      uidShort: user.uidShort || 'AURA-000000',
      username: user.email || null
    });
  } catch (error) {
    console.error('hwid-check error:', error);
    return res.status(500).json({
      allowed: false,
      message: 'Server temporarily unavailable.'
    });
  }
}
