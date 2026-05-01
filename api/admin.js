import generateKeysHandler from './_admin/generate-keys.js';
import keyLimitsHandler from './_admin/key-limits.js';
import bootstrapAdminHandler from './_admin/bootstrap-admin.js';

function getPathname(req) {
  try {
    return new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`).pathname;
  } catch {
    return req.url || '/';
  }
}

export default async function handler(req, res) {
  const pathname = getPathname(req);

  if (pathname.includes('/generate-keys')) {
    return generateKeysHandler(req, res);
  }

  if (pathname.includes('/key-limits')) {
    return keyLimitsHandler(req, res);
  }

  if (pathname.includes('/bootstrap-admin')) {
    return bootstrapAdminHandler(req, res);
  }

  return res.status(404).json({
    ok: false,
    error: 'Admin endpoint not found.'
  });
}
