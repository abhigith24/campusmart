import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY             || "YOUR_API_KEY",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN         || "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       process.env.REACT_APP_FIREBASE_DATABASE_URL        || "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID          || "YOUR_PROJECT_ID",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET      || "YOUR_PROJECT.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID              || "YOUR_APP_ID"
};

// Firebase Storage removed — images are uploaded via Cloudinary (src/utils/cloudinary.js)
const app = initializeApp(firebaseConfig);

export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const rtdb           = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
