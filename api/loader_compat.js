import launcherLogin from './launcher/login.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const incoming = req.body && typeof req.body === 'object' ? req.body : {};
  const mappedBody = {
    username: incoming.login || incoming.username || incoming.email || '',
    email: incoming.email || incoming.login || '',
    password: incoming.pass || incoming.password || '',
    hwidHash: incoming.hwid || incoming.hwidHash || '',
    launcherVersion: incoming.version || '1.0.0',
    deviceId: incoming.hwid || '',
    deviceProof: incoming.hwid || ''
  };

  const compatReq = {
    ...req,
    body: mappedBody
  };

  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (!payload || typeof payload !== 'object') {
      return originalJson(payload);
    }

    if (payload.ok || payload.success) {
      return originalJson({
        success: true,
        token: payload.sessionToken || payload.token,
        subscription: payload.subscription || 'none',
        user: {
          login: payload.user?.username || mappedBody.username,
          uid: payload.user?.uid || payload.uidShort || 'user',
          id: payload.user?.uid || '0',
          subscription: payload.subscription || 'none'
        }
      });
    }

    return originalJson({
      success: false,
      message: payload.error || payload.message || 'Authentication failed'
    });
  };

  return launcherLogin(compatReq, res);
}
