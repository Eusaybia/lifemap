import firebase from "firebase";
import "firebase/database";

var firebaseConfig = {
  apiKey: "AIzaSyCqulAS9_9MHrnn0ly8zQpQR3QDBSFl5Oo",
  authDomain: "lifemap-31c67.firebaseapp.com",
  databaseURL: "https://lifemap-31c67.firebaseio.com",
  projectId: "lifemap-31c67",
  storageBucket: "lifemap-31c67.appspot.com",
  messagingSenderId: "908420793581",
  appId: "1:908420793581:web:43079e2e62752ab77038e4",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
export const db = firebase.firestore()