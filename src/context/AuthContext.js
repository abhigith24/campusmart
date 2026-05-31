import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";

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
    await createOrUpdateProfile(result.user);
    return result;
  }

  async function signUpWithEmail(email, password, name, college, branch, year) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await createOrUpdateProfile(result.user, { college, branch, year });
    return result;
  }

  async function loginWithEmail(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
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
        isAdmin: false
      });
    }
  }

  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  async function fetchProfile(uid) {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) setUserProfile(snap.data());
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) await fetchProfile(user.uid);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = {
    currentUser,
    userProfile,
    signInWithGoogle,
    signUpWithEmail,
    loginWithEmail,
    logout,
    fetchProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
