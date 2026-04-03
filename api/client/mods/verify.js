import { badRequest, getBody, methodNotAllowed, serverError } from '../../_lib/http.js';
import { normalizeHwidHash, verifySessionToken, writeAuditLog } from '../../_lib/license.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  const body = getBody(req);
  const sessionToken = String(body.sessionToken || body.token || '').trim();
  const hwidHash = normalizeHwidHash(body.hwidHash || body.hwid || '');
  const mods = Array.isArray(body.modsList) ? body.modsList : [];

  if (!sessionToken || !hwidHash) {
    return badRequest(res, 'sessionToken and hwidHash are required.');
  }

  try {
    const verification = await verifySessionToken(sessionToken, hwidHash, { touchSession: false });
    if (!verification.valid) {
      return res.status(403).json({ ok: false, error: verification.message || 'Session invalid.' });
    }

    await writeAuditLog('mods_verify', {
      uid: verification.uid,
      uidShort: verification.uidShort,
      modsCount: mods.length
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
