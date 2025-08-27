
import * as admin from "firebase-admin";

function getFirebaseAdminApp() {
    if (admin.apps.length > 0) {
        return admin.apps[0] as admin.app.App;
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountString) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please check your deployment environment's configuration.");
    }

    let serviceAccount: admin.ServiceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountString);
    } catch (error: any) {
       console.error("Firebase Admin SDK Error: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. The JSON is malformed.", error.message);
       throw new Error("Server configuration error: Could not parse Firebase service account key.");
    }

    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}


const app = getFirebaseAdminApp();
export const adminDb = admin.firestore(app);
export const adminAuth = admin.auth(app);
export default admin;
