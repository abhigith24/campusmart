import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const WishlistContext = createContext();
export const useWishlist = () => useContext(WishlistContext);

export function WishlistProvider({ children }) {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [wishlistIds, setWishlistIds] = useState(new Set());   // Set of listingIds
  const [wishlistDocs, setWishlistDocs] = useState([]);        // [{id, listingId, ...}]
  const toggleRef = useRef();

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
    const isAdding = !wishlistIds.has(listingId);
    let originalDocs = [...wishlistDocs];
    let existingDoc = wishlistDocs.find(d => d.listingId === listingId);

    // Optimistic UI update
    if (isAdding) {
      setWishlistIds(prev => new Set(prev).add(listingId));
      toast(
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, gap: "10px", flexWrap: "wrap" }}>
          <span>Added to Wishlist! ❤️</span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.__navigateTo) window.__navigateTo("wishlist");
              }}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "none",
                borderRadius: "4px",
                color: "#fff",
                padding: "3px 8px",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              View
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (toggleRef.current) toggleRef.current(listingId);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "none",
                borderRadius: "4px",
                color: "#ffebee",
                padding: "3px 8px",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Undo
            </button>
          </div>
        </div>,
        "success"
      );
    } else {
      setWishlistIds(prev => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
      toast(
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, gap: "10px" }}>
          <span>Removed from Saved Items</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (toggleRef.current) toggleRef.current(listingId);
            }}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "4px",
              color: "#fff",
              padding: "3px 8px",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer"
            }}
          >
            Undo
          </button>
        </div>,
        "success"
      );
    }

    try {
      if (!isAdding) {
        // Remove
        if (existingDoc) {
          await deleteDoc(doc(db, "wishlists", existingDoc.id));
        }
      } else {
        // Add
        await addDoc(collection(db, "wishlists"), {
          userId: currentUser.uid,
          listingId,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Wishlist toggle error:", err);
      toast("Failed to update saved items ❌. Reverting...", "error");
      
      // Rollback
      setWishlistIds(new Set(originalDocs.map(d => d.listingId)));
      setWishlistDocs(originalDocs);
    }
  }, [currentUser, wishlistIds, wishlistDocs, toast]);

  useEffect(() => {
    toggleRef.current = toggleWishlist;
  }, [toggleWishlist]);

  const value = useMemo(() => ({
    wishlistIds, wishlistDocs, isWishlisted, toggleWishlist
  }), [wishlistIds, wishlistDocs, isWishlisted, toggleWishlist]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}
