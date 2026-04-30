import generateKeysHandler from './_admin/generate-keys.js';

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

  return res.status(404).json({
    ok: false,
    error: 'Admin endpoint not found.'
  });
}
