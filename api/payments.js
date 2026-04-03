import createHandler from './payments/create.js';
import checkHandler from './payments/check.js';
import webhookHandler from './payments/yookassa-webhook.js';

function getPathname(req) {
  try {
    return new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`).pathname;
  } catch {
    return req.url || '/';
  }
}

export default async function handler(req, res) {
  const pathname = getPathname(req);

  if (pathname.includes('/create')) {
    return createHandler(req, res);
  }

  if (pathname.includes('/check')) {
    return checkHandler(req, res);
  }

  if (pathname.includes('/webhook')) {
    return webhookHandler(req, res);
  }

  return res.status(404).json({
    ok: false,
    error: 'Payment endpoint not found.'
  });
}
