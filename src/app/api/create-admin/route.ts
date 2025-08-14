
import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Function to initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
    // Check if the app is already initialized to avoid re-initializing
    if (!admin.apps.length) {
        try {
            const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

            // Check if the environment variable is actually loaded.
            if (!serviceAccountString) {
                console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not set in the environment variables.");
                throw new Error("Server configuration error: Missing Firebase credentials.");
            }
            
            // Parse the service account key from the string.
            const serviceAccount = JSON.parse(serviceAccountString);

            // Initialize the app with the credentials.
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });

            console.log("Firebase Admin SDK initialized successfully.");

        } catch (error: any) {
            // Log the detailed error for server-side debugging. This is crucial.
            console.error("Firebase admin initialization error:", error.message);
            // Do not proceed if initialization fails. The error will be handled by the check below.
        }
    }
}

export async function POST(req: NextRequest) {
    // Attempt to initialize on every request, the function itself prevents re-initialization.
    initializeFirebaseAdmin();

    // After attempting initialization, check if it was successful.
    // This is the gatekeeper that prevents the function from proceeding if init failed.
    if (!admin.apps.length) {
        return NextResponse.json({ error: 'Firebase Admin SDK could not be initialized. Check server logs for details.' }, { status: 500 });
    }

    try {
        const { email, password, name, role } = await req.json();

        if (!email || !password || !name || !role) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        // Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
        });

        // Add user details to Firestore
        const db = admin.firestore();
        await db.collection("users").doc(userRecord.uid).set({
            name,
            email,
            role,
        });

        return NextResponse.json({ success: true, uid: userRecord.uid });

    } catch (error: any) {
        console.error('Error creating new admin:', error);
        
        let errorMessage = 'An internal server error occurred.';
        // Provide more specific error messages based on Firebase Auth error codes
        if (error.code === 'auth/email-already-exists') {
            errorMessage = 'An account with this email already exists.';
        } else if (error.code === 'auth/invalid-password') {
            errorMessage = 'The password must be a string with at least six characters.';
        }
        
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
