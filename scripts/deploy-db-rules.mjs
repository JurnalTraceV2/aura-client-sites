#!/usr/bin/env node

/**
 * Deploy Realtime Database rules via REST API.
 * 
 * Usage: node scripts/deploy-db-rules.mjs
 * 
 * Requires: Sign in to get an access token, or use Firebase Console.
 * This script uses the Firebase REST API with the database secret.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.FIREBASE_DATABASE_URL || 'https://gen-lang-client-0640974949-default-rtdb.firebaseio.com';

const rulesPath = join(__dirname, '..', 'database.rules.json');
const rules = readFileSync(rulesPath, 'utf8');

console.log('Rules to deploy:');
console.log(rules);
console.log('\n---');
console.log('Cannot deploy rules via REST API without admin credentials.');
console.log('\nPlease apply these rules manually:');
console.log('1. Go to: https://console.firebase.google.com/project/gen-lang-client-0640974949/database/gen-lang-client-0640974949-default-rtdb/rules');
console.log('2. Replace the existing rules with the content above');
console.log('3. Click "Publish"');
console.log('\nOr install Firebase CLI:');
console.log('  npm install -g firebase-tools');
console.log('  firebase login');
console.log('  firebase deploy --only database');
