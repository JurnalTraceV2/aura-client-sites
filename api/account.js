import meHandler from './_account/me.js';
import hwidResetHandler from './_account/hwid-reset.js';
import launcherUrlHandler from './_account/_download/launcher-url.js';
import redeemKeyHandler from './_account/redeem-key.js';

function getPathname(req) {
  try {
    return new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`).pathname;
  } catch {
    return req.url || '/';
  }
}

export default async function handler(req, res) {
  const pathname = getPathname(req);

  if (pathname.includes('/download/launcher-url')) {
    return launcherUrlHandler(req, res);
  }

  if (pathname.includes('/hwid-reset')) {
    return hwidResetHandler(req, res);
  }

  if (pathname.includes('/redeem-key')) {
    return redeemKeyHandler(req, res);
  }

  if (pathname.endsWith('/me') || pathname === '/api/account' || pathname === '/api/account.js') {
    return meHandler(req, res);
  }

  return res.status(404).json({
    ok: false,
    error: 'Account endpoint not found.'
  });
}
