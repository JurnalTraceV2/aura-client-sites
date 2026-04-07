import { get, ref } from 'firebase/database';
import { db } from '../_lib/firebase.js';
import { verifyRequestAuth } from '../_lib/auth.js';
import { ensureUserRecord, getEntitlement, resolveEntitlementState } from '../_lib/license.js';
import { methodNotAllowed, serverError, unauthorized } from '../_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res);
  }

  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized.');
    }

    await ensureUserRecord(auth.uid, auth.email || undefined, auth.username || '');

    const userSnapshot = await get(ref(db, `users/${auth.uid}`));
    const user = userSnapshot.exists() ? (userSnapshot.val() || {}) : {};
    const entitlement = await getEntitlement(auth.uid);
    const subState = resolveEntitlementState(user, entitlement);

    // Try to read payments for this user. The server uses the client SDK so
    // Firebase security rules apply. We gracefully fall back to an empty list
    // if the read is rejected (permission denied) or the node doesn't exist.
    const payments = [];
    try {
      // First try user-scoped path (populated by the payments webhook handler)
      const userPaymentsSnapshot = await get(ref(db, `userPayments/${auth.uid}`));
      if (userPaymentsSnapshot.exists()) {
        userPaymentsSnapshot.forEach((child) => {
          const data = child.val() || {};
          payments.push({
            paymentId: child.key,
            tier: data.tier || null,
            amount: data.amount ?? null,
            status: data.status || 'pending',
            providerTxId: data.providerTxId || null,
            createdAt: data.createdAt || null,
            processedAt: data.processedAt || null
          });
        });
      }

      // If nothing found via user-scoped path, try the flat payments node
      if (payments.length === 0) {
        const paymentsSnapshot = await get(ref(db, 'payments'));
        if (paymentsSnapshot.exists()) {
          paymentsSnapshot.forEach((child) => {
            const data = child.val() || {};
            if (String(data.userId || '') === auth.uid) {
              payments.push({
                paymentId: child.key,
                tier: data.tier || null,
                amount: data.amount ?? null,
                status: data.status || 'pending',
                providerTxId: data.providerTxId || null,
                createdAt: data.createdAt || null,
                processedAt: data.processedAt || null
              });
            }
          });
        }
      }
    } catch (paymentsErr) {
      // Permission denied or network error — return an empty list rather than 500
      console.warn('account/me: failed to read payments:', paymentsErr?.message || paymentsErr);
    }

    payments.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

    return res.status(200).json({
      ok: true,
      uid: auth.uid,
      username: user.username || auth.username || null,
      email: user.email || auth.email || null,
      uidShort: user.uidShort || null,
      subscription: subState.plan,
      subscriptionExpiresAt: subState.expiresAt,
      entitlementState: subState.state,
      banned: user.banned === true,
      canDownloadLauncher: user.banned !== true && subState.active === true,
      hwidHash: user.hwidHash || user.hwid || null,
      resetCredits: Number(user.resetCredits || 0),
      paidResetCredits: Number(user.paidResetCredits || 0),
      lastHwidResetAt: user.lastHwidResetAt || null,
      payments: payments.slice(0, 10)
    });
  } catch (error) {
    console.error('account/me error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
