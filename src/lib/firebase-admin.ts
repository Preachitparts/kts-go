import * as admin from "firebase-admin";

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountString) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
}

try {
    const serviceAccount = JSON.parse(serviceAccountString);
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
} catch (error: any) {
    if (error instanceof SyntaxError) {
        console.error("Firebase Admin SDK Error: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. The JSON is malformed.", error.message);
   } else {
        console.error("Firebase Admin SDK Error: Initialization failed.", error.message);
   }
   throw new Error("Server configuration error: Could not initialize Firebase Admin SDK.");
}


export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;

    