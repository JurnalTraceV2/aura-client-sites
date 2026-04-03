import loginHandler from './launcher/login.js';
import manifestHandler from './launcher/manifest.js';
import heartbeatHandler from './launcher/heartbeat.js';
import verifySessionHandler from './launcher/verify-session.js';

function getPathname(req) {
  try {
    return new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`).pathname;
  } catch {
    return req.url || '/';
  }
}

export default async function handler(req, res) {
  const pathname = getPathname(req);

  if (pathname.includes('/login')) {
    return loginHandler(req, res);
  }

  if (pathname.includes('/manifest')) {
    return manifestHandler(req, res);
  }

  if (pathname.includes('/heartbeat')) {
    return heartbeatHandler(req, res);
  }

  if (pathname.includes('/verify-session')) {
    return verifySessionHandler(req, res);
  }

  return res.status(404).json({
    ok: false,
    error: 'Launcher endpoint not found.'
  });
}
