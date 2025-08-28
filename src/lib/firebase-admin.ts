
import * as admin from "firebase-admin";

const serviceAccountString = process.env.FIREBASE_ADMIN_SDK_CONFIG;

if (!serviceAccountString) {
  throw new Error("FIREBASE_ADMIN_SDK_CONFIG environment variable is not set or is empty. This is required for server-side operations. Please check your .env.local file or Vercel environment variables.");
}

let serviceAccount: admin.ServiceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountString);
} catch (error: any) {
  console.error("Firebase Admin SDK Error: Failed to parse FIREBASE_ADMIN_SDK_CONFIG.", error.message);
  throw new Error("Server configuration error: Could not parse Firebase service account key. Ensure it is a valid JSON string.");
}

let adminApp: admin.app.App;

if (admin.apps.length > 0) {
  adminApp = admin.apps[0] as admin.app.App;
} else {
  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const adminDb = admin.firestore(adminApp);
const adminAuth = admin.auth(adminApp);

export { adminDb, adminAuth };
