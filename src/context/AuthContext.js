import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";
import { trackSignUp, trackLogin } from "../utils/analytics";
import { hasPermission, hasFeature, canAccessRoute } from "../config/accessControl";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const logger = {
  info: (msg, meta = {}) => console.info(`[AuthContext] INFO: ${msg}`, meta),
  warn: (msg, meta = {}) => console.warn(`[AuthContext] WARN: ${msg}`, meta),
  error: (msg, meta = {}) => console.error(`[AuthContext] ERROR: ${msg}`, meta)
};

const mapAuthError = (err) => {
  logger.error("Authentication error occurred", { error: err });
  switch (err.code) {
    case "auth/invalid-email":
      return new Error("The email address is invalid.");
    case "auth/user-disabled":
      return new Error("This user account has been disabled.");
    case "auth/user-not-found":
      return new Error("No account found with this email.");
    case "auth/wrong-password":
      return new Error("Incorrect password.");
    case "auth/email-already-in-use":
      return new Error("An account already exists with this email address.");
    case "auth/weak-password":
      return new Error("The password is too weak. Choose at least 6 characters.");
    case "auth/too-many-requests":
      return new Error("Too many login attempts. Please try again later.");
    case "auth/network-request-failed":
      return new Error("Network error. Please check your internet connection.");
    default:
      return new Error(err.message || "Authentication failed.");
  }
};

const validateStringInput = (val, name) => {
  if (!val || typeof val !== "string" || val.trim() === "") {
    throw new Error(`Invalid input: ${name} must be a non-empty string.`);
  }
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Phase 2: Validate Google credentials exists
      if (!user.uid || !user.email || !user.emailVerified) {
        await signOut(auth);
        throw new Error("auth/invalid-google-account");
      }

      const isNew = result._tokenResponse?.isNewUser;
      await createOrUpdateProfile(user);

      if (isNew) {
        trackSignUp("google");
        logger.info("Google signup success", { uid: user.uid });
      } else {
        trackLogin("google");
        logger.info("Google login success", { uid: user.uid });
      }
      return result;
    } catch (err) {
      if (err.message === "auth/invalid-google-account") {
        throw new Error("Your Google account is incomplete or has an unverified email address.");
      }
      throw mapAuthError(err);
    }
  }

  async function signUpWithEmail(email, password, name, college, branch, year) {
    validateStringInput(email, "email");
    validateStringInput(password, "password");
    validateStringInput(name, "name");

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      await updateProfile(user, { displayName: name });
      await createOrUpdateProfile(user, { college, branch, year, name });
      await sendEmailVerification(user);

      // Perform immediate sign out to prevent auto-login before email is verified
      await signOut(auth);
      setUserProfile(null);

      trackSignUp("email");
      logger.info("Signup success. Verification email sent.", { uid: user.uid });
      return result;
    } catch (err) {
      logger.warn("Signup failure", { error: err.message });
      throw mapAuthError(err);
    }
  }

  async function loginWithEmail(email, password) {
    validateStringInput(email, "email");
    validateStringInput(password, "password");

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Phase 7: Email verification checks prior to login
      if (!user.emailVerified) {
        await signOut(auth);
        throw new Error("auth/email-not-verified");
      }

      trackLogin("email");
      logger.info("Login success", { uid: user.uid });
      return result;
    } catch (err) {
      logger.warn("Login failure", { error: err.message });
      if (err.message === "auth/email-not-verified") {
        throw new Error("Please verify your email address before logging in.");
      }
      throw mapAuthError(err);
    }
  }

  async function resetPassword(email) {
    validateStringInput(email, "email");
    try {
      await sendPasswordResetEmail(auth, email);
      logger.info("Password reset email sent", { email });
    } catch (err) {
      throw mapAuthError(err);
    }
  }

  async function resendVerification() {
    try {
      const user = auth.currentUser;
      if (user && !user.emailVerified) {
        await sendEmailVerification(user);
        logger.info("Email verification sent", { uid: user.uid });
      } else {
        throw new Error("No unverified user is currently logged in.");
      }
    } catch (err) {
      throw mapAuthError(err);
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setUserProfile(null);
      logger.info("Logout success");
    } catch (err) {
      throw mapAuthError(err);
    }
  }

  async function fetchProfile(uid) {
    if (!uid) return;
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile(data);
        return data;
      }
    } catch (err) {
      logger.error("Error fetching user profile", { uid, error: err });
    }
  }

  // Phase 3: Hardened profile creation on client side
  async function createOrUpdateProfile(user, extra = {}) {
    if (!user.uid) throw new Error("Invalid profile payload: uid is required.");
    if (!user.email) throw new Error("Invalid profile payload: email is required.");

    const name = user.displayName || extra.name || "Student";
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // Whitelist only allowed client creation properties (No privileged aggregators)
      const cleanProfile = {
        uid: user.uid,
        name: name,
        displayName: name,
        email: user.email,
        photoURL: user.photoURL || "",
        college: extra.college || "",
        branch: extra.branch || "",
        year: extra.year || "",
        rating: 0,
        totalRatings: 0,
        joinedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        role: "user"
      };

      await setDoc(ref, cleanProfile);
      logger.info("User profile created", { uid: user.uid });
    }
  }

  // Phase 5 & 6: Realtime profile listener with clean subscriber lifecycle management
  useEffect(() => {
    let profileUnsub = null;

    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (user) {
        // Enforce verified status
        if (!user.emailVerified) {
          setUserProfile(null);
          setLoading(false);
          return;
        }

        profileUnsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            // Phase 4: Removed RBAC Client-Side Migration updates. Only read database values.
            setUserProfile(docSnap.data());
          } else {
            logger.warn("Profile document does not exist for authenticated user", { uid: user.uid });
            setUserProfile(null);
          }
          setLoading(false);
        }, (err) => {
          logger.error("Error loading user profile via listener", { error: err });
          setUserProfile(null);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsub();
      if (profileUnsub) {
        profileUnsub();
      }
    };
  }, []);

  const boundHasPermission = useCallback((permission) => {
    return hasPermission(userProfile, permission);
  }, [userProfile]);

  const boundHasFeature = useCallback((feature) => {
    return hasFeature(userProfile, feature);
  }, [userProfile]);

  const boundCanAccessRoute = useCallback((route) => {
    return canAccessRoute(userProfile, route);
  }, [userProfile]);

  const value = useMemo(() => ({
    currentUser,
    userProfile,
    loading,
    signInWithGoogle,
    signUpWithEmail,
    loginWithEmail,
    resetPassword,
    resendVerification,
    logout,
    fetchProfile,
    hasPermission: boundHasPermission,
    hasFeature: boundHasFeature,
    canAccessRoute: boundCanAccessRoute
  }), [currentUser, userProfile, loading, boundHasPermission, boundHasFeature, boundCanAccessRoute]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
