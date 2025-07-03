
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

// Check for missing environment variables
if (!firebaseConfig.apiKey) {
    firebaseConfigError = 'Firebase API Key is missing. Please add `NEXT_PUBLIC_FIREBASE_API_KEY` to your .env file. You can find these keys in your Firebase project settings.';
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
