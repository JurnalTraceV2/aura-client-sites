import validateHandler from './_keys/validate.js';
import activateHandler from './_keys/activate.js';

function getPathname(req) {
  try {
    return new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`).pathname;
  } catch {
    return req.url || '/';
  }
}

export default async function handler(req, res) {
  const pathname = getPathname(req);

  if (pathname.includes('/validate')) {
    return validateHandler(req, res);
  }

  if (pathname.includes('/activate')) {
    return activateHandler(req, res);
  }

  return res.status(404).json({
    ok: false,
    error: 'Keys endpoint not found.'
  });
}
