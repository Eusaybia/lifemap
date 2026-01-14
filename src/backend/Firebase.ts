import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';
// Analytics disabled for local-only beta release
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "FIREBASE_KEY_REMOVED",
    authDomain: "eusaybia-lifemap.firebaseapp.com",
    projectId: "eusaybia-lifemap",
    storageBucket: "eusaybia-lifemap.appspot.com",
    messagingSenderId: "426360776379",
    appId: "1:426360776379:web:bc6bace66e3dda77566b9e",
    measurementId: "G-W3WPLFWDKP"
};

// Initialize Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
// Analytics disabled for local-only beta release
export const analytics = null;
export const functions = getFunctions(app);