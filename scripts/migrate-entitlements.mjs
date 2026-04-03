import { get, getDatabase, ref, set, update } from 'firebase/database';
import { getApps, initializeApp } from 'firebase/app';

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
const db = getDatabase(app);

function now() {
  return Date.now();
}

function inferEntitlement(user) {
  const subscription = String(user?.subscription || 'none').toLowerCase();
  const expiresAt = Number(user?.subscriptionExpiresAt || 0) || null;
  if (subscription === 'none') {
    return { plan: 'none', state: 'pending', expiresAt: null };
  }
  if (subscription === 'lifetime' || subscription === 'beta') {
    return { plan: subscription, state: 'active', expiresAt: null };
  }
  if (subscription === '1_month') {
    if (expiresAt && expiresAt > Date.now()) {
      return { plan: '1_month', state: 'active', expiresAt };
    }
    return { plan: '1_month', state: 'expired', expiresAt };
  }
  return { plan: 'none', state: 'pending', expiresAt: null };
}

async function main() {
  const usersSnapshot = await get(ref(db, 'users'));
  if (!usersSnapshot.exists()) {
    console.log('No users found.');
    return;
  }

  let migrated = 0;
  let manualReview = 0;
  const writes = [];

  usersSnapshot.forEach((child) => {
    const uid = child.key;
    const user = child.val() || {};
    const entitlement = inferEntitlement(user);
    const ambiguous = !user.email || !user.uidShort;

    writes.push(
      set(ref(db, `entitlements/${uid}`), {
        ...entitlement,
        source: 'migration_v1',
        updatedAt: now(),
        migrationStatus: ambiguous ? 'manual_review' : 'ok'
      })
    );

    if (user.hwidHash || user.hwid) {
      writes.push(
        set(ref(db, `devices/${uid}_${String(user.hwidHash || user.hwid).slice(0, 16)}`), {
          hwidHash: String(user.hwidHash || user.hwid),
          deviceFingerprintHash: '',
          firstSeenAt: now(),
          lastSeenAt: now(),
          state: 'active',
          source: 'migration_v1'
        })
      );
    }

    writes.push(
      update(ref(db, `users/${uid}`), {
        status: user.banned ? 'blocked' : 'active',
        lastLoginAt: user.lastLoginAt || null
      })
    );

    migrated += 1;
    if (ambiguous) {
      manualReview += 1;
    }
  });

  await Promise.all(writes);
  console.log(`Migrated users: ${migrated}`);
  console.log(`Manual review required: ${manualReview}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
