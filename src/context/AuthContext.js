import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";
import { trackSignUp, trackLogin } from "../utils/analytics";
import { hasPermission, hasFeature, canAccessRoute } from "../config/accessControl";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const isNew = result._tokenResponse?.isNewUser;
    await createOrUpdateProfile(result.user);
    await fetchProfile(result.user.uid);
    if (isNew) trackSignUp("google");
    else        trackLogin("google");
    return result;
  }

  async function signUpWithEmail(email, password, name, college, branch, year) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await createOrUpdateProfile(result.user, { college, branch, year });
    await fetchProfile(result.user.uid);
    trackSignUp("email");
    return result;
  }

  async function loginWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    trackLogin("email");
    return result;
  }

  async function resetPassword(email) {
    return await sendPasswordResetEmail(auth, email);
  }

  async function createOrUpdateProfile(user, extra = {}) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        name: user.displayName || extra.name || "Student",
        email: user.email,
        photoURL: user.photoURL || "",
        college: extra.college || "",
        branch: extra.branch || "",
        year: extra.year || "",
        rating: 0,
        totalRatings: 0,
        joinedAt: serverTimestamp(),
        role: "user"
      });
    }
  }

  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  async function fetchProfile(uid) {
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setUserProfile(snap.data());
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  }

  useEffect(() => {
    let profileUnsub;
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        profileUnsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) setUserProfile(docSnap.data());
          setLoading(false);
        }, (err) => {
          console.error("Error loading user profile:", err);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        if (profileUnsub) profileUnsub();
        setLoading(false);
      }
    });
    return () => {
      unsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const role = userProfile?.role || "user";

  const boundHasPermission = (permission) => {
    return hasPermission(role, permission);
  };

  const boundHasFeature = (feature) => {
    return hasFeature(role, feature);
  };

  const boundCanAccessRoute = (route) => {
    return canAccessRoute(role, route);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    signInWithGoogle,
    signUpWithEmail,
    loginWithEmail,
    resetPassword,
    logout,
    hasPermission: boundHasPermission,
    hasFeature: boundHasFeature,
    canAccessRoute: boundCanAccessRoute
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
