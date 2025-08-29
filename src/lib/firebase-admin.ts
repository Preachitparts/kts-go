
import * as admin from "firebase-admin";

// This function initializes and returns a Firebase Admin App instance.
// It uses a global variable to ensure it's only initialized once.
function getFirebaseAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  const serviceAccountString = process.env.FIREBASE_ADMIN_SDK_CONFIG;
  if (!serviceAccountString) {
    throw new Error("FIREBASE_ADMIN_SDK_CONFIG environment variable is not set.");
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    // CRITICAL FIX: The service account string from env vars MUST be parsed into a JSON object.
    serviceAccount = JSON.parse(serviceAccountString);
  } catch (error: any) {
    console.error("Firebase Admin SDK Error: Failed to parse FIREBASE_ADMIN_SDK_CONFIG.", error.message);
    throw new Error("Server configuration error: Could not parse Firebase service account key.");
  }

  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return app;
}

const adminApp = getFirebaseAdminApp();
const adminDb = admin.firestore(adminApp);
const adminAuth = admin.auth(adminApp);

export { adminDb, adminAuth };
