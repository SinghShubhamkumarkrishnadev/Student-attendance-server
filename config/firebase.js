// config/firebase.js
const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');


console.log('FIREBASE_PROJECT_ID', !!process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_CLIENT_EMAIL', !!process.env.FIREBASE_CLIENT_EMAIL);
console.log('FIREBASE_PRIVATE_KEY present?', !!process.env.FIREBASE_PRIVATE_KEY);

try {
  // Defensive: ensure env values exist before using replace
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, '\n') : undefined;

  if (!admin.apps.length) {
    // log what we have (mask private key)
    console.log('[firebase] initializing firebase admin with projectId=', process.env.FIREBASE_PROJECT_ID);

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    console.log('[firebase] initializeApp successful');
  } else {
    console.log('[firebase] admin app already initialized');
  }
} catch (initErr) {
  console.error('[firebase] initialization error:', initErr);
}

// Export both admin and messaging instance (use getMessaging() which is equivalent)
let messaging;
try {
  messaging = getMessaging(); // preferred import in recent SDKs
  console.log('[firebase] messaging instance obtained');
} catch (err) {
  // fallback to admin.messaging() for compatibility
  try {
    messaging = admin.messaging();
    console.log('[firebase] messaging fallback to admin.messaging() successful');
  } catch (err2) {
    console.error('[firebase] messaging could not be obtained:', err, err2);
    messaging = null;
  }
}

module.exports = { admin, messaging };
