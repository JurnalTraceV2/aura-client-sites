const admin = require('firebase-admin');

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyAaz1Sat0zPHZdeUESxkV8lNEtUJE7EEPA',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'gen-lang-client-0640974949.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0640974949',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0640974949.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '90325346449',
  appId: process.env.FIREBASE_APP_ID || '1:90325346449:web:86b3b2f10f9bc94155f730',
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://gen-lang-client-0640974949-default-rtdb.firebaseio.com'
};

// Initialize Firebase Admin SDK
let admin;
try {
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseConfig.projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: firebaseConfig.databaseURL,
    });
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

const db = admin.database();

// Helper function to verify Firebase token
async function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Get user profile
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // For now, allow anonymous access for demo
  const user = { uid: 'demo_user', email: 'demo@example.com' };

  const userRef = db.ref(`users/${user.uid}`);
  
  try {
    if (req.method === 'GET') {
      const snapshot = await userRef.get();
      const userData = snapshot.val() || {};
      
      return res.json({
        ok: true,
        user: {
          uid: user.uid,
          email: user.email,
          subscription: userData.subscription || 'none',
          role: userData.role || 'user',
          hwidHash: userData.hwidHash || null,
          createdAt: userData.createdAt || null
        }
      });
    }
    
    if (req.method === 'POST') {
      const { subscription, hwidHash } = req.body;
      const updates = {};
      
      if (subscription) updates.subscription = subscription;
      if (hwidHash !== undefined) updates.hwidHash = hwidHash;
      
      updates.updatedAt = serverTimestamp();
      
      await userRef.update(updates);
      
      return res.json({
        ok: true,
        message: 'Profile updated successfully'
      });
    }
    
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Account API error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
