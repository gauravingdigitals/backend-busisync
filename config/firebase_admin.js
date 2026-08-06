const admin = require('firebase-admin');
const env = require('./environment');

let isInitialized = false;

function initFirebaseAdmin() {
  if (isInitialized || admin.apps.length > 0) {
    isInitialized = true;
    return admin;
  }

  try {
    if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY,
        }),
      });
    } else {
      admin.initializeApp({
        projectId: env.FIREBASE_PROJECT_ID,
      });
    }
    isInitialized = true;
    console.log(`✅ Firebase Admin initialized for project: ${env.FIREBASE_PROJECT_ID}`);
  } catch (err) {
    console.warn(`⚠️ Firebase Admin initialization warning: ${err.message}`);
  }
  return admin;
}

async function verifyIdToken(idToken) {
  initFirebaseAdmin();
  // Pass true as second parameter to check for revoked tokens
  return await admin.auth().verifyIdToken(idToken, true);
}

module.exports = {
  admin,
  initFirebaseAdmin,
  verifyIdToken,
};
