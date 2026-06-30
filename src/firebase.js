import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const getEnvVar = (name) => {
  let val = null;
  // Check import.meta.env (Vite)
  try {
    val = import.meta.env[name];
  } catch (e) {
    // Ignore
  }
  // Check process.env (Webpack/Node/Fallback)
  if (!val) {
    try {
      val = process.env[name];
    } catch (e) {
      // Ignore
    }
  }
  return val;
};

// Phase 1: Validate required environment variables before startup
const REQUIRED_ENV_VARS = [
  "REACT_APP_FIREBASE_API_KEY",
  "REACT_APP_FIREBASE_AUTH_DOMAIN",
  "REACT_APP_FIREBASE_PROJECT_ID",
  "REACT_APP_FIREBASE_STORAGE_BUCKET",
  "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
  "REACT_APP_FIREBASE_APP_ID",
  "REACT_APP_FIREBASE_DATABASE_URL"
];

for (const name of REQUIRED_ENV_VARS) {
  const value = getEnvVar(name);
  if (!value || value.trim() === "" || value.startsWith("YOUR_")) {
    throw new Error(`Firebase initialization failed: Required environment variable "${name}" is missing or unconfigured.`);
  }
}

const firebaseConfig = {
  apiKey: getEnvVar("REACT_APP_FIREBASE_API_KEY"),
  authDomain: getEnvVar("REACT_APP_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("REACT_APP_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("REACT_APP_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("REACT_APP_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("REACT_APP_FIREBASE_APP_ID"),
  databaseURL: getEnvVar("REACT_APP_FIREBASE_DATABASE_URL")
};

// Phase 2: Ensure Firebase app initializes only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Phase 3: Configure Authentication Persistence explicitly
const authInstance = getAuth(app);
setPersistence(authInstance, browserLocalPersistence).catch((err) => {
  console.warn("Failed to set Firebase Auth browser local persistence:", err.message);
});

// Phase 4: Configure GoogleAuthProvider for production account selection
const providerInstance = new GoogleAuthProvider();
providerInstance.setCustomParameters({
  prompt: "select_account"
});

// Phase 5: Initialize Firestore with ignoreUndefinedProperties safely
let dbInstance;
try {
  dbInstance = getFirestore(app);
} catch (e) {
  dbInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true
  });
}

// Initialize Realtime Database
const rtdbInstance = getDatabase(app);

// Phase 6: Integrate Firebase App Check (reCAPTCHA v3 Site Key Check)
const siteKey = getEnvVar("REACT_APP_RECAPTCHA_SITE_KEY");
if (siteKey && typeof window !== "undefined") {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
    console.info("Firebase App Check initialized successfully.");
  } catch (err) {
    console.warn("Failed to initialize Firebase App Check:", err.message);
  }
}

// Clean Exports Structure (Phase 9)
export const auth = authInstance;
export const db = dbInstance;
export const rtdb = rtdbInstance;
export const googleProvider = providerInstance;

export { app };
export default app;
