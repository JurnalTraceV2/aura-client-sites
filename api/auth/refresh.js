import { badRequest, getBody, methodNotAllowed, unauthorized } from '../_lib/http.js';
import { ensureUserRecord } from '../_lib/license.js';
import { rotateRefreshToken } from '../_lib/tokens.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  const body = getBody(req);
  const refreshToken = String(body.refreshToken || '').trim();
  if (!refreshToken) {
    return badRequest(res, 'refreshToken is required.');
  }

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated.ok) {
    return unauthorized(res, rotated.message || 'Refresh token invalid.');
  }

  const user = await ensureUserRecord(rotated.uid, '');
  return res.status(200).json({
    ok: true,
    accessToken: rotated.accessToken,
    refreshToken: rotated.refreshToken,
    accessExpiresAt: rotated.accessExpiresAt,
    refreshExpiresAt: rotated.refreshExpiresAt,
    uidShort: user.uidShort || null
  });
}
