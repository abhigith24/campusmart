import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext();
export const useWishlist = () => useContext(WishlistContext);

export function WishlistProvider({ children }) {
  const { currentUser } = useAuth();
  const [wishlistIds, setWishlistIds] = useState(new Set());   // Set of listingIds
  const [wishlistDocs, setWishlistDocs] = useState([]);        // [{id, listingId, ...}]

  useEffect(() => {
    if (!currentUser) { setWishlistIds(new Set()); setWishlistDocs([]); return; }
    const q = query(
      collection(db, "wishlists"),
      where("userId", "==", currentUser.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setWishlistDocs(docs);
      setWishlistIds(new Set(docs.map(d => d.listingId)));
    });
    return unsub;
  }, [currentUser]);

  const isWishlisted = useCallback(listingId => wishlistIds.has(listingId), [wishlistIds]);

  const toggleWishlist = useCallback(async (listingId) => {
    if (!currentUser) return;
    if (wishlistIds.has(listingId)) {
      // Remove
      const existing = wishlistDocs.find(d => d.listingId === listingId);
      if (existing) await deleteDoc(doc(db, "wishlists", existing.id));
    } else {
      // Add
      await addDoc(collection(db, "wishlists"), {
        userId: currentUser.uid,
        listingId,
        createdAt: serverTimestamp()
      });
    }
  }, [currentUser, wishlistIds, wishlistDocs]);

  return (
    <WishlistContext.Provider value={{ wishlistIds, wishlistDocs, isWishlisted, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}
