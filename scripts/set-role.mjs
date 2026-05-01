#!/usr/bin/env node

/**
 * Set user role in Firebase RTDB
 * 
 * Usage:
 *   node scripts/set-role.mjs --uid <USER_UID> --role admin
 *   node scripts/set-role.mjs --uid WZrlr86c1EZhEwPomYahgvBRrSv2 --role admin
 */

const FIREBASE_URL = process.env.FIREBASE_DATABASE_URL || 'https://gen-lang-client-0640974949-default-rtdb.firebaseio.com';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { uid: '', role: '' };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--uid':
      case '-u':
        options.uid = args[++i];
        break;
      case '--role':
      case '-r':
        options.role = args[++i];
        break;
    }
  }

  return options;
}

async function main() {
  const { uid, role } = parseArgs();

  if (!uid || !role) {
    console.error('Usage: node scripts/set-role.mjs --uid <UID> --role <ROLE>');
    console.error('Roles: admin, youtuber, youtube, user');
    process.exit(1);
  }

  console.log(`Setting role "${role}" for user ${uid}...`);

  // First check if user exists
  const getRes = await fetch(`${FIREBASE_URL}/users/${uid}.json`);
  const userData = await getRes.json();

  if (!userData) {
    console.error(`User ${uid} not found in RTDB`);
    process.exit(1);
  }

  console.log('Current user data:', JSON.stringify(userData, null, 2));
  console.log(`Current role: ${userData.role || 'not set'}`);

  // Set the role
  const patchRes = await fetch(`${FIREBASE_URL}/users/${uid}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  });

  if (patchRes.ok) {
    console.log(`\n✓ Role updated to "${role}" for user ${uid}`);
  } else {
    const err = await patchRes.text();
    console.error(`✗ Failed to update role: ${patchRes.status} ${err}`);
    process.exit(1);
  }

  // Verify
  const verifyRes = await fetch(`${FIREBASE_URL}/users/${uid}/role.json`);
  const newRole = await verifyRes.json();
  console.log(`Verified role: ${newRole}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
