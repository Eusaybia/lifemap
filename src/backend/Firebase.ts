import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyCGLRLJdTbxxjZQWz4jSpnEbo7dE-pleqw",
    authDomain: "lifemap-8a767.firebaseapp.com",
    projectId: "lifemap-8a767",
    storageBucket: "lifemap-8a767.appspot.com",
    messagingSenderId: "167393207418",
    appId: "1:167393207418:web:369e66d09be9ea3ceb47c3",
    measurementId: "G-HSZDQYF07S"
};

// Initialize Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
export const analytics = app.name && typeof window !== 'undefined' ? getAnalytics(app) : null;
export const functions = getFunctions(app);