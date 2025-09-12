// config/firebase.js
const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');

console.log('FIREBASE_PROJECT_ID', !!process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_CLIENT_EMAIL', !!process.env.FIREBASE_CLIENT_EMAIL);
console.log('FIREBASE_PRIVATE_KEY present?', !!process.env.FIREBASE_PRIVATE_KEY);

try {
  // Defensive: handle both escaped "\n" and real multiline keys
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || '';
  let privateKey = privateKeyRaw;

  if (privateKeyRaw.includes('\\n')) {
    // case: one-line string with \n escapes
    privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  }

  // 🔍 Debugging checks
  console.log('[firebase] privateKey first 50 chars:', privateKey.slice(0, 50));
  console.log('[firebase] privateKey contains literal "\\n"?', privateKey.includes('\\n'));
  console.log('[firebase] privateKey contains actual newline?', privateKey.includes('\n'));

  if (!admin.apps.length) {
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

// Export both admin and messaging instance
let messaging;
try {
  messaging = getMessaging();
  console.log('[firebase] messaging instance obtained');
} catch (err) {
  try {
    messaging = admin.messaging();
    console.log('[firebase] messaging fallback to admin.messaging() successful');
  } catch (err2) {
    console.error('[firebase] messaging could not be obtained:', err, err2);
    messaging = null;
  }
}

module.exports = { admin, messaging };
