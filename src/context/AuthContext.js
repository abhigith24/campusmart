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
  log: (level, msg, meta = {}) => {
    const cleanMeta = {};
    if (meta.uid) cleanMeta.uid = meta.uid;
    if (meta.email) cleanMeta.email = meta.email;
    if (meta.event) cleanMeta.event = meta.event;
    console[level](`[AuthContext] ${level.toUpperCase()}: ${msg}`, cleanMeta);
  },
  info: (msg, meta = {}) => logger.log("info", msg, meta),
  warn: (msg, meta = {}) => logger.log("warn", msg, meta),
  error: (msg, meta = {}) => logger.log("error", msg, meta)
};

const mapAuthError = (err) => {
  logger.error("Authentication error occurred", { event: "auth_error", email: err?.email });
  switch (err?.code) {
    case "auth/email-not-verified":
      return new Error("Please verify your email before logging in.");
    case "auth/email-already-in-use":
      return new Error("This email is already registered. Please sign in instead.");
    case "auth/user-not-found":
      return new Error("No account found with this email.");
    case "auth/wrong-password":
      return new Error("Incorrect password.");
    case "auth/invalid-credential":
      return new Error("Incorrect email or password.");
    case "auth/too-many-requests":
      return new Error("Too many attempts. Please try again later.");
    case "auth/network-request-failed":
      return new Error("Network error. Check your internet connection.");
    case "auth/weak-password":
      return new Error("Password must contain at least six characters.");
    case "auth/invalid-email":
      return new Error("Please enter a valid email address.");
    case "auth/user-disabled":
      return new Error("This user account has been disabled.");
    default:
      return new Error("Authentication failed. Please try again.");
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
      if (!user.uid || !user.email) {
        await signOut(auth);
        throw new Error("auth/invalid-google-account");
      }

      if (!user.emailVerified) {
        await signOut(auth);
        throw new Error("auth/google-email-not-verified");
      }

      const isNew = result._tokenResponse?.isNewUser;
      await createOrUpdateProfile(user);

      if (isNew) {
        trackSignUp("google");
        logger.info("Google signup success", { uid: user.uid, email: user.email, event: "google_signup" });
      } else {
        trackLogin("google");
        logger.info("Google login success", { uid: user.uid, email: user.email, event: "google_login" });
      }
      return result;
    } catch (err) {
      if (err.message === "auth/google-email-not-verified") {
        throw new Error("Your Google account email is not verified. Please verify your Google account first.");
      }
      if (err.message === "auth/invalid-google-account") {
        throw new Error("Your Google account is incomplete.");
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
      logger.info("Signup success. Verification email sent.", { uid: user.uid, email: user.email, event: "signup_success" });
      return result;
    } catch (err) {
      logger.warn("Signup failure", { event: "signup_failure" });
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
      logger.info("Login success", { uid: user.uid, email: user.email, event: "login_success" });
      return result;
    } catch (err) {
      logger.warn("Login failure", { event: "login_failure" });
      if (err.message === "auth/email-not-verified") {
        throw new Error("Please verify your email before logging in.");
      }
      throw mapAuthError(err);
    }
  }

  async function resetPassword(email) {
    validateStringInput(email, "email");
    try {
      await sendPasswordResetEmail(auth, email);
      logger.info("Password reset email sent", { email, event: "password_reset_sent" });
    } catch (err) {
      throw mapAuthError(err);
    }
  }

  async function resendVerification(email = null, password = null) {
    try {
      let user = auth.currentUser;
      let tempSignIn = false;
      if (!user && email && password) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        user = result.user;
        tempSignIn = true;
      }
      if (user && !user.emailVerified) {
        await sendEmailVerification(user);
        logger.info("Email verification sent", { uid: user.uid, email: user.email, event: "email_verification_sent" });
        if (tempSignIn) {
          await signOut(auth);
        }
      } else {
        if (tempSignIn) {
          await signOut(auth);
        }
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
      logger.info("Logout success", { event: "logout_success" });
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
      logger.error("Error fetching user profile", { uid, event: "fetch_profile_error" });
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
      logger.info("User profile created", { uid: user.uid, email: user.email, event: "profile_created" });
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
            logger.warn("Profile document does not exist for authenticated user", { uid: user.uid, event: "profile_not_found" });
            setUserProfile(null);
          }
          setLoading(false);
        }, (err) => {
          logger.error("Error loading user profile via listener", { event: "profile_listener_error" });
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
