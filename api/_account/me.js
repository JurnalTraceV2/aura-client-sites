import { get, ref } from 'firebase/database';
import { db } from '../_lib/firebase.js';
import { verifyRequestAuth } from '../_lib/auth.js';
import { ensureUserRecord, getEntitlement, resolveEntitlementState } from '../_lib/license.js';
import { methodNotAllowed, serverError, unauthorized } from '../_lib/http.js';

// Safe Firebase read — returns null on any error (permission denied, network, etc.)
async function safeGet(path) {
  try {
    const snapshot = await get(ref(db, path));
    return snapshot.exists() ? snapshot : null;
  } catch (err) {
    console.warn(`account/me: safeGet("${path}") failed:`, err?.message || err);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res);
  }

  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized.');
    }

    // Ensure user record exists — non-fatal if it fails
    try {
      await ensureUserRecord(auth.uid, auth.email || undefined, auth.username || '');
    } catch (ensureErr) {
      console.warn('account/me: ensureUserRecord failed (non-fatal):', ensureErr?.message || ensureErr);
    }

    // Read the user profile
    const userSnapshot = await safeGet(`users/${auth.uid}`);
    const user = userSnapshot ? (userSnapshot.val() || {}) : {};

    // Read entitlement (may return null if node is missing or access denied)
    let entitlement = null;
    try {
      entitlement = await getEntitlement(auth.uid);
    } catch (entErr) {
      console.warn('account/me: getEntitlement failed (non-fatal):', entErr?.message || entErr);
    }

    const subState = resolveEntitlementState(user, entitlement);

    // Read payments — try user-scoped path first, then flat payments node
    const payments = [];
    const userPaymentsSnapshot = await safeGet(`userPayments/${auth.uid}`);
    if (userPaymentsSnapshot) {
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

    if (payments.length === 0) {
      const paymentsSnapshot = await safeGet('payments');
      if (paymentsSnapshot) {
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
