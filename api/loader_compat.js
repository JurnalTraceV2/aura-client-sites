import launcherLogin from './launcher/login.js';

export default async function handler(req, res) {
  // Only allow POST requests (as the loader sends POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const incoming = req.body && typeof req.body === 'object' ? req.body : {};
  
  // Map loader's "login" and "pass" (as seen in WindowsProject3.cpp) to "email" and "password"
  // Map "hwid" to "hwidHash"
  const mappedBody = {
    email: incoming.login || incoming.email || '',
    password: incoming.pass || incoming.password || '',
    hwidHash: incoming.hwid || incoming.hwidHash || '',
    launcherVersion: incoming.version || '1.0.0',
    deviceId: incoming.hwid || '',
    deviceProof: incoming.hwid || ''
  };

  // Create a compatible request object
  const compatReq = {
    ...req,
    body: mappedBody
  };

  // Proxy the response to format it for the C++ loader
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (!payload || typeof payload !== 'object') {
      return originalJson(payload);
    }

    // Loader checks for "success": true and "user": {}
    if (payload.ok || payload.success) {
      return originalJson({
        success: true,
        token: payload.sessionToken || payload.token,
        subscription: payload.subscription || 'none',
        user: {
          login: mappedBody.email,
          uid: payload.user?.uid || payload.uidShort || 'user',
          id: payload.user?.uid || '0',
          subscription: payload.subscription || 'none'
        }
      });
    }

    // Default error response for loader
    return originalJson({
      success: false,
      message: payload.error || payload.message || 'Authentication failed'
    });
  };

  return launcherLogin(compatReq, res);
}
