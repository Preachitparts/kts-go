
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMzrHohlmU1D0mUrsbUsrmwkIrcJ8A5bs",
  authDomain: "kts-go-ca9do.firebaseapp.com",
  projectId: "kts-go-ca9do",
  storageBucket: "kts-go-ca9do.appspot.com",
  messagingSenderId: "99006736811",
  appId: "1:99006736811:web:735262da0ed184bb948aee"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
