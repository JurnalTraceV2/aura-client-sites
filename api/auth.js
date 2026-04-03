import launcherLogin from './launcher/login.js';
import refreshHandler from './auth/refresh.js';

function getPathname(req) {
  try {
    return new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`).pathname;
  } catch {
    return req.url || '/';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const pathname = getPathname(req);
  if (pathname.includes('/refresh')) {
    return refreshHandler(req, res);
  }

  const incoming = req.body && typeof req.body === 'object' ? req.body : {};
  const mappedBody = {
    username: incoming.username || incoming.login || incoming.email,
    email: incoming.email || incoming.username || incoming.login,
    password: incoming.password || incoming.pass,
    hwidHash: incoming.hwidHash || incoming.hwid,
    launcherVersion: incoming.launcherVersion || incoming.version || 'legacy',
    deviceId: incoming.deviceId || incoming.device || incoming.hwidHash || incoming.hwid || '',
    deviceProof: incoming.deviceProof || incoming.deviceFingerprintHash || incoming.hwidHash || incoming.hwid || ''
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

    if (payload.ok && payload.sessionToken) {
      return originalJson({
        success: true,
        accessToken: payload.accessToken || '',
        refreshToken: payload.refreshToken || '',
        accessExpiresAt: payload.accessExpiresAt || null,
        refreshExpiresAt: payload.refreshExpiresAt || null,
        token: payload.sessionToken,
        sessionToken: payload.sessionToken,
        uidShort: payload.uidShort,
        subscription: payload.subscription,
        sessionExpiresAt: payload.sessionExpiresAt,
        user: {
          login: payload.user?.username || mappedBody.username,
          id: payload.user?.uid,
          role: 'user',
          subscription: payload.subscription
        }
      });
    }

    return originalJson({
      success: false,
      message: payload.error || payload.message || 'Authentication failed.'
    });
  };

  return launcherLogin(compatReq, res);
}
