import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

var firebaseConfig = {
  apiKey: `${process.env.API_KEY}`,
  authDomain: `${process.env.AUTH_DOMAIN}`,
  databaseURL: `${process.env.DATABASE_URL}` ,
  projectId: `${process.env.PROJECT_ID}`,
  storageBucket: `${process.env.STORAGE_BUCKET}`,
  messagingSenderId: `${process.env.MESSAGING_SENDER_ID}`,
  appId: `${process.env.APP_ID}`,
};

console.log("process.env.API_KEY", process.env.API_KEY)
console.log("process.env.AUTH_DOMAIN", process.env.AUTH_DOMAIN)

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore();