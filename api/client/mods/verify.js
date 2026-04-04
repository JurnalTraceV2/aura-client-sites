import { badRequest, forbidden, getBody, methodNotAllowed, serverError, unauthorized } from '../../_lib/http.js';
import { hashToken, normalizeHwidHash, normalizeUsername, verifySessionToken, writeAuditLog } from '../../_lib/license.js';
import { verifyAccessToken, verifyLaunchToken } from '../../_lib/tokens.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  const body = getBody(req);
  const sessionToken = String(body.sessionToken || body.token || '').trim();
  const accessToken = String(body.accessToken || '').trim();
  const launchToken = String(body.launchToken || '').trim();
  const hwidHash = normalizeHwidHash(body.hwidHash || body.hwid || '');
  const username = normalizeUsername(body.username || body.login || '');
  const mods = Array.isArray(body.modsList) ? body.modsList : [];

  if (!sessionToken || !accessToken || !launchToken || !hwidHash) {
    return badRequest(res, 'sessionToken, accessToken, launchToken and hwidHash are required.');
  }

  try {
    const verification = await verifySessionToken(sessionToken, hwidHash, { touchSession: false });
    if (!verification.valid) {
      return unauthorized(res, verification.message || 'Session invalid.');
    }

    if (username && normalizeUsername(verification.username || '') && normalizeUsername(verification.username || '') !== username) {
      return forbidden(res, 'Username mismatch.');
    }

    const accessCheck = verifyAccessToken(accessToken);
    if (!accessCheck.ok) {
      return unauthorized(res, accessCheck.message || 'Access token invalid.');
    }

    const launchCheck = verifyLaunchToken(launchToken);
    if (!launchCheck.ok) {
      return unauthorized(res, launchCheck.message || 'Launch token invalid.');
    }

    const accessDecoded = accessCheck.decoded || {};
    const launchDecoded = launchCheck.decoded || {};
    const sessionHash = hashToken(sessionToken);
    if (String(accessDecoded.sub || '') !== String(verification.uid || '')) {
      return forbidden(res, 'Access token user mismatch.');
    }
    if (String(accessDecoded.sid || '') !== sessionHash) {
      return forbidden(res, 'Access token session mismatch.');
    }
    if (String(launchDecoded.sub || '') !== String(verification.uid || '')) {
      return forbidden(res, 'Launch token user mismatch.');
    }
    if (String(launchDecoded.sid || '') !== sessionHash) {
      return forbidden(res, 'Launch token session mismatch.');
    }
    if (String(launchDecoded.hwidHash || '') !== hwidHash) {
      return forbidden(res, 'Launch token HWID mismatch.');
    }

    await writeAuditLog('mods_verify', {
      uid: verification.uid,
      uidShort: verification.uidShort,
      modsCount: mods.length,
      launchTokenIssuedAt: Number(launchDecoded.iat || 0) * 1000,
      launchTokenExpiresAt: Number(launchDecoded.exp || 0) * 1000
    });

    return res.status(200).json({
      ok: true,
      status: 'authorized',
      uidShort: verification.uidShort
    });
  } catch (error) {
    console.error('client/mods/verify error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
