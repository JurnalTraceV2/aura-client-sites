#!/usr/bin/env node

/**
 * Standalone Key Generator for AURA CLIENT
 * 
 * Usage:
 *   node scripts/generate-keys.mjs --count 10 --tier lifetime
 *   node scripts/generate-keys.mjs --count 5 --tier 1_month --duration 30
 *   node scripts/generate-keys.mjs --count 3 --tier 12_month --activations 3
 * 
 * Environment variables required:
 *   - FIREBASE_DATABASE_URL
 *   - FIREBASE_API_KEY (for admin SDK if needed)
 */

import crypto from 'crypto';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KEY_FORMAT = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRawKey() {
  let result = '';
  const randomBytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    result += CHARS[randomBytes[i] % CHARS.length];
  }
  return result;
}

function formatKey(raw) {
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    count: 1,
    tier: '1_month',
    duration: null,
    activations: 1,
    output: null,
    firebaseUrl: process.env.FIREBASE_DATABASE_URL || 'https://gen-lang-client-0640974949-default-rtdb.firebaseio.com',
    adminSecret: process.env.ADMIN_API_SECRET || '',
    noUpload: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--count':
      case '-n':
        options.count = Math.min(100, Math.max(1, parseInt(args[++i]) || 1));
        break;
      case '--tier':
      case '-t':
        options.tier = args[++i];
        break;
      case '--duration':
      case '-d':
        options.duration = parseInt(args[++i]) || null;
        break;
      case '--activations':
      case '-a':
        options.activations = Math.min(10, Math.max(1, parseInt(args[++i]) || 1));
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--firebase-url':
        options.firebaseUrl = args[++i];
        break;
      case '--admin-secret':
        options.adminSecret = args[++i];
        break;
      case '--no-upload':
        options.noUpload = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
AURA Key Generator

Usage: node generate-keys.mjs [options]

Options:
  -n, --count <number>       Number of keys to generate (1-100, default: 1)
  -t, --tier <tier>          Tier: 1_month, 3_month, 6_month, 12_month, lifetime, beta
  -d, --duration <days>      Duration in days (optional, auto-set by tier)
  -a, --activations <num>    Max activations per key (1-10, default: 1)
  -o, --output <file>        Output file for keys (optional)
  --firebase-url <url>       Firebase Database URL (default: built-in)
  --admin-secret <secret>    Admin API secret for auto-upload
  --no-upload                Skip Firebase upload (keys won't work!)
  -h, --help                 Show this help

Examples:
  node generate-keys.mjs -n 10 -t lifetime
  node generate-keys.mjs -n 5 -t 1_month -d 30 -a 2
  node generate-keys.mjs -n 3 -t 12_month -o keys.txt
`);
}

function generateKeyData(options) {
  const raw = generateRawKey();
  const keyId = formatKey(raw);
  const now = Date.now();
  const expiresAt = options.duration ? now + (options.duration * 24 * 60 * 60 * 1000) : null;

  return {
    keyId,
    raw,
    tier: options.tier,
    status: 'active',
    maxActivations: options.activations,
    currentActivations: 0,
    createdAt: now,
    expiresAt,
    metadata: {
      generatedBy: 'cli-tool',
      generatedAt: new Date().toISOString()
    }
  };
}

async function uploadToFirebase(keys, options) {
  if (!options.firebaseUrl) {
    console.log('No Firebase URL provided, skipping upload');
    return false;
  }

  console.log(`Uploading ${keys.length} keys to Firebase...`);
  
  // Simple REST API upload
  const results = [];
  for (const key of keys) {
    try {
      const url = `${options.firebaseUrl}/keys/${key.keyId}.json`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(key)
      });
      
      if (res.ok) {
        results.push({ key: key.keyId, status: 'uploaded' });
        process.stdout.write('.');
      } else {
        results.push({ key: key.keyId, status: 'failed', error: res.status });
        process.stdout.write('x');
      }
    } catch (err) {
      results.push({ key: key.keyId, status: 'error', error: err.message });
      process.stdout.write('x');
    }
  }
  console.log('\n');
  
  const uploaded = results.filter(r => r.status === 'uploaded').length;
  const failed = results.filter(r => r.status !== 'uploaded').length;
  
  console.log(`Uploaded: ${uploaded}, Failed: ${failed}`);
  return failed === 0;
}

async function uploadViaApi(keys, options) {
  if (!options.adminSecret) {
    console.log('No admin secret provided, skipping API upload');
    return false;
  }

  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  
  console.log(`Uploading ${keys.length} keys via API...`);
  
  for (const key of keys) {
    try {
      const res = await fetch(`${baseUrl}/api/admin/generate-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': options.adminSecret
        },
        body: JSON.stringify({
          count: 1,
          tier: key.tier,
          durationDays: options.duration,
          maxActivations: key.maxActivations
        })
      });
      
      if (res.ok) {
        process.stdout.write('.');
      } else {
        process.stdout.write('x');
      }
    } catch {
      process.stdout.write('x');
    }
  }
  console.log('\n');
  return true;
}

async function main() {
  console.log('╔════════════════════════════════════╗');
  console.log('║     AURA Key Generator v1.0        ║');
  console.log('╚════════════════════════════════════╝\n');

  const options = parseArgs();

  console.log('Configuration:');
  console.log(`  Count: ${options.count}`);
  console.log(`  Tier: ${options.tier}`);
  console.log(`  Duration: ${options.duration ? options.duration + ' days' : 'auto'}`);
  console.log(`  Activations: ${options.activations}`);
  console.log(`  Output: ${options.output || 'console only'}`);
  console.log('');

  // Generate keys
  console.log('Generating keys...');
  const keys = [];
  for (let i = 0; i < options.count; i++) {
    keys.push(generateKeyData(options));
    process.stdout.write('.');
  }
  console.log('\n');

  // Display keys
  console.log('Generated Keys:');
  console.log('═══════════════════════════════════════════════════════════════');
  keys.forEach((key, i) => {
    console.log(`${(i + 1).toString().padStart(3)}. ${key.keyId}`);
    console.log(`     Tier: ${key.tier} | Activations: ${key.maxActivations}`);
    if (key.expiresAt) {
      console.log(`     Expires: ${new Date(key.expiresAt).toLocaleDateString()}`);
    } else {
      console.log(`     Expires: Never (lifetime)`);
    }
    console.log('');
  });
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Save to file if specified
  if (options.output) {
    const content = keys.map(k => 
      `${k.keyId}\t${k.tier}\t${k.maxActivations} activations\t${k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'lifetime'}`
    ).join('\n');
    
    writeFileSync(options.output, content);
    console.log(`✓ Keys saved to: ${options.output}\n`);
  }

  // Upload to Firebase (mandatory for keys to work!)
  if (options.noUpload) {
    console.log('⚠ WARNING: --no-upload specified. Keys are NOT in Firebase and will NOT work!');
    console.log('   Run again without --no-upload to upload keys.\n');
  } else if (options.firebaseUrl) {
    console.log('Uploading keys to Firebase...');
    const uploaded = await uploadToFirebase(keys, options);
    if (uploaded) {
      console.log('✓ All keys uploaded to Firebase and ready to use!\n');
    } else {
      console.log('⚠ Some keys failed to upload. Check errors above.\n');
    }
  } else if (options.adminSecret) {
    await uploadViaApi(keys, options);
  } else {
    console.log('⚠ WARNING: Keys were NOT uploaded to Firebase!');
    console.log('   They will NOT work when activated.');
    console.log('   Provide --firebase-url or --admin-secret to upload.\n');
  }

  console.log('\n✓ Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
