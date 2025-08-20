import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { config } from 'dotenv';

// Load environment variables from .env file
config();

export async function POST(req: NextRequest) {
    try {
        const { email, password, name, role } = await req.json();

        if (!email || !password || !name || !role) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        // Create user in Firebase Authentication
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
        });

        // Add user details to Firestore
        await adminDb.collection("users").doc(userRecord.uid).set({
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

    