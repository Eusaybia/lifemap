import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyCqscewFIJolFOGTP3oVvTCuiEhbCGfDaA",
    authDomain: "eusaybia-lifemap.firebaseapp.com",
    projectId: "eusaybia-lifemap",
    storageBucket: "eusaybia-lifemap.appspot.com",
    messagingSenderId: "426360776379",
    appId: "1:426360776379:web:bc6bace66e3dda77566b9e",
    measurementId: "G-W3WPLFWDKP"
};

// Initialize Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
export const analytics = app.name && typeof window !== 'undefined' ? getAnalytics(app) : null;
export const functions = getFunctions(app);