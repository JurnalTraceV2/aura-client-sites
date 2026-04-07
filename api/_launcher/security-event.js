import { getBody } from '../_lib/http.js';
import { writeAuditLog } from '../_lib/license.js';
import { getClientIp } from '../_lib/rate-limit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const body = getBody(req) || {};

  // Log the event for the administrator
  await writeAuditLog('launcher_security_event', {
    ip,
    eventType: body.eventType || 'unknown',
    details: body.details || 'No details provided',
    hwidHash: body.hwidHash || 'unknown',
    username: body.username || 'unknown',
    uid: body.uid || 'unknown',
    launcherVersion: body.launcherVersion || 'unknown'
  });

  // Always return OK so the launcher continues its work
  return res.status(200).json({
    ok: true,
    received: true,
    timestamp: Date.now()
  });
}
