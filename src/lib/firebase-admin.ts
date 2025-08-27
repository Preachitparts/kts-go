
import * as admin from "firebase-admin";

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountString) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
}

let serviceAccount: admin.ServiceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountString);
} catch (error: any) {
  console.error("Firebase Admin SDK Error: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY.", error.message);
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
