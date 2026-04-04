import verifyModsHandler from './client/mods/verify.js';

function getPathname(req) {
  try {
    return new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`).pathname;
  } catch {
    return req.url || '/';
  }
}

export default async function handler(req, res) {
  const pathname = getPathname(req);

  if (pathname.includes('/mods/verify')) {
    return verifyModsHandler(req, res);
  }

  return res.status(404).json({
    ok: false,
    error: 'Client endpoint not found.'
  });
}
