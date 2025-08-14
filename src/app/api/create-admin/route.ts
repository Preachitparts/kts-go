
import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Function to initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (error) {
            console.error("Firebase admin initialization error", error);
        }
    }
}

export async function POST(req: NextRequest) {
    initializeFirebaseAdmin();

    if (!admin.apps.length) {
        return NextResponse.json({ error: 'Firebase Admin SDK not initialized.' }, { status: 500 });
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
        if (error.code === 'auth/email-already-exists') {
            errorMessage = 'An account with this email already exists.';
        } else if (error.code === 'auth/invalid-password') {
            errorMessage = 'The password must be a string with at least six characters.';
        }
        
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
