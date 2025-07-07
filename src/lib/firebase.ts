
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

// --- TEMPORARY DEBUGGING STEP ---
// The following configuration is hardcoded to bypass any potential issues
// with the .env file not being loaded by the development server.
// THIS IS NOT FOR PRODUCTION. Once authentication works, this should be
// reverted to use process.env variables.
const firebaseConfig = {
  apiKey: "AIzaSyCWC36zTrwmtn-If2h2wtvGd_Ef1Y9Y-Bw",
  authDomain: "ideasaver-6560d.firebaseapp.com",
  projectId: "ideasaver-6560d",
  storageBucket: "ideasaver-6560d.firebasestorage.app",
  messagingSenderId: "855959969241",
  appId: "1:855959969241:web:f1e06de34fa64c94b88dc8",
  measurementId: "G-GV8J00PSVX"
};


// --- ORIGINAL CODE (to be restored later) ---
/*
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
*/

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let firebaseConfigError: string | null = null;

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  firebaseConfigError = "Firebase configuration is missing. Please set up your .env file.";
}

try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e: any) {
    firebaseConfigError = `Failed to initialize Firebase: ${e.message}. Please check your .env file and Firebase project setup.`;
}

export { app, db, auth, firebaseConfigError };
