import verifySessionHandler from './launcher/verify-session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, message: 'Method not allowed' });
  }

  const incoming = req.body && typeof req.body === 'object' ? req.body : {};
  const mappedReq = {
    ...req,
    body: {
      sessionToken: incoming.sessionToken || incoming.token,
      hwidHash: incoming.hwidHash || incoming.hwid
    }
  };

  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && payload.valid === true) {
      return originalJson({
        valid: true,
        uidShort: payload.uidShort,
        subscription: payload.subscription,
        sessionExpiresAt: payload.sessionExpiresAt
      });
    }

    return originalJson({
      valid: false,
      message: payload?.error || payload?.message || 'Session invalid'
    });
  };

  return verifySessionHandler(mappedReq, res);
}
