import createKeyHandler from './_admin/keys-create.js';
import listKeysHandler from './_admin/keys-list.js';

function getPathname(req) {
  try {
    return new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`).pathname;
  } catch {
    return req.url || '/';
  }
}

export default async function handler(req, res) {
  const pathname = getPathname(req);

  if (pathname.includes('/keys/create')) {
    return createKeyHandler(req, res);
  }

  if (pathname.includes('/keys/list')) {
    return listKeysHandler(req, res);
  }

  return res.status(404).json({
    ok: false,
    error: 'Admin endpoint not found.'
  });
}
