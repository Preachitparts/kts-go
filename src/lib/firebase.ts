
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyANdr4m7IuVgvyPEJwrp-Ix9CaxyArBW5M",
  authDomain: "kts-go.firebaseapp.com",
  projectId: "kts-go",
  storageBucket: "kts-go.appspot.com",
  messagingSenderId: "733494640668",
  appId: "1:733494640668:web:62ca8eb3202c28a1d59fd9"
};


// Initialize Firebase
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
