
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
export let firebaseConfigError: string | null = null;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing or placeholder environment variables
const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value || value.includes('_REPLACE_WITH_'))
  .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

if (missingKeys.length > 0) {
    firebaseConfigError = `The following Firebase credentials are missing or are still placeholders in your .env file: ${missingKeys.join(', ')}. Please update the file with your actual Firebase project credentials.`;
}


if (!firebaseConfigError) {
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        db = getFirestore(app);
        auth = getAuth(app);
    } catch (error: any) {
        console.error("Firebase initialization error:", error);
        firebaseConfigError = `Failed to initialize Firebase: ${error.message}. Please check your Firebase project configuration and credentials in the .env file.`;
    }
}

export { app, db, auth };
