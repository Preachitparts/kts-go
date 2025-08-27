
import * as admin from "firebase-admin";
import { config } from 'dotenv';

// Load environment variables from .env.local
config();

// Use the correct environment variable for the service account key
const serviceAccountString = process.env.FIREBASE_ADMIN_SDK_CONFIG;

if (!serviceAccountString) {
  throw new Error("FIREBASE_ADMIN_SDK_CONFIG environment variable is not set. This is required for server-side operations.");
}

let serviceAccount: admin.ServiceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountString);
} catch (error: any) {
  console.error("Firebase Admin SDK Error: Failed to parse FIREBASE_ADMIN_SDK_CONFIG.", error.message);
  throw new Error("Server configuration error: Could not parse Firebase service account key.");
}

const getFirebaseAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
};

const app = getFirebaseAdminApp();
const adminDb = admin.firestore(app);
const adminAuth = admin.auth(app);

export { adminDb, adminAuth };
