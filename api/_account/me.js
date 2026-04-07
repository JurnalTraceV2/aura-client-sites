/**
 * GET /api/account/me
 *
 * Returns the authenticated user's profile, subscription state, and recent payments.
 * Uses Firebase Admin SDK so security rules are bypassed server-side.
 */

import { adminDb } from '../_lib/firebase-admin.js';
import { verifyRequestAuth } from '../_lib/auth.js';
import { resolveEntitlementState } from '../_lib/license.js';
import { methodNotAllowed, serverError, unauthorized } from '../_lib/http.js';

// Safe Admin DB read — returns null on any error
async function safeAdminGet(path) {
  try {
    const snapshot = await adminDb.ref(path).get();
    return snapshot.exists() ? snapshot : null;
  } catch (err) {
    console.warn(`account/me: adminDb.ref("${path}").get() failed:`, err?.message || err);
    return null;
  }
}

// Ensure user record exists and has all required fields
async function ensureUserRecordAdmin(uid, email, username) {
  try {
    const userRef = adminDb.ref(`users/${uid}`);
    const snapshot = await userRef.get();

    if (!snapshot.exists()) {
      // Allocate a sequential short UID
      let uidShort = '1';
      try {
        const counterRef = adminDb.ref('meta/counters/userUidShort');
        const result = await counterRef.transaction((current) => (Number(current || 0) + 1));
        uidShort = String(result.snapshot.val() || 1);
      } catch (counterErr) {
        console.warn('account/me: uidShort counter failed:', counterErr?.message);
      }

      const now = Date.now();
      await userRef.set({
        email: email || null,
        username: username || null,
        role: 'user',
        status: 'active',
        subscription: 'none',
        subscriptionExpiresAt: null,
        hwidHash: null,
        uidShort,
        resetCredits: 0,
        resetWindowStart: now,
        banned: false,
        createdAt: now,
        lastLoginAt: null
      });

      // Ensure entitlement record
      await adminDb.ref(`entitlements/${uid}`).set({
        plan: 'none',
        state: 'pending',
        expiresAt: null,
        source: 'init',
        updatedAt: now
      });
    } else {
      const existing = snapshot.val() || {};
      const patch = {};
      if (!existing.email && email) patch.email = email;
      if (!existing.username && username) patch.username = username;
      if (existing.banned === undefined) patch.banned = false;
      if (existing.resetCredits === undefined) patch.resetCredits = 0;
      if (!existing.uidShort) {
        try {
          const counterRef = adminDb.ref('meta/counters/userUidShort');
          const result = await counterRef.transaction((current) => (Number(current || 0) + 1));
          patch.uidShort = String(result.snapshot.val() || 1);
        } catch (_) { /* non-fatal */ }
      }
      if (Object.keys(patch).length > 0) {
        await userRef.update(patch);
      }
    }
  } catch (err) {
    console.warn('account/me: ensureUserRecordAdmin failed (non-fatal):', err?.message || err);
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

    // Ensure the user record exists in RTDB (non-fatal)
    await ensureUserRecordAdmin(auth.uid, auth.email || null, auth.username || null);

    // Read user profile
    const userSnapshot = await safeAdminGet(`users/${auth.uid}`);
    const user = userSnapshot ? (userSnapshot.val() || {}) : {};

    // Read entitlement
    const entitlementSnapshot = await safeAdminGet(`entitlements/${auth.uid}`);
    const entitlement = entitlementSnapshot ? (entitlementSnapshot.val() || null) : null;

    const subState = resolveEntitlementState(user, entitlement);

    // Read payments — try user-scoped path first, then flat payments node
    const payments = [];
    const userPaymentsSnapshot = await safeAdminGet(`userPayments/${auth.uid}`);
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
      const paymentsSnapshot = await safeAdminGet('payments');
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
