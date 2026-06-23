import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useWishlist } from "../context/WishlistContext";
import ListingCard from "../components/ListingCard";

function SkeletonCard() {
  return (
    <div className="listing-card skeleton-card">
      <div className="skeleton skeleton-img" />
      <div className="card-body">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line medium" />
        <div className="skeleton skeleton-line short" style={{ marginTop: 8 }} />
      </div>
    </div>
  );
}

export default function SavedItemsPage({ setPage }) {
  const { wishlistDocs } = useWishlist();
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wishlistDocs.length) {
      setSavedItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const promises = wishlistDocs.map(w => getDoc(doc(db, "listings", w.listingId)));
        const snaps = await Promise.all(promises);
        if (!cancelled) {
          const items = [];
          snaps.forEach(snap => {
            if (snap.exists()) {
              items.push({ id: snap.id, ...snap.data() });
            }
          });
          setSavedItems(items);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading saved items:", err);
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [wishlistDocs]);

  return (
    <div className="container profile-page" style={{ padding: "30px 20px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <button 
          className="btn btn-ghost" 
          onClick={() => setPage("home")} 
          style={{ padding: "6px 10px", fontSize: "18px" }}
          type="button"
          aria-label="Back to home"
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Saved Items</h1>
      </div>

      {loading ? (
        <div className="listings-grid">
          {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : savedItems.length === 0 ? (
        <div className="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted-2)", marginBottom: 16 }}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeDasharray="3 3"/>
            <path d="M12 5v14" opacity="0.3"/>
          </svg>
          <h3>Your saved items list is empty</h3>
          <p>Tap the heart icon on any listing to save it here.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setPage("home")}>Browse Listings</button>
        </div>
      ) : (
        <div className="listings-grid">
          {savedItems.map(l => (
            <ListingCard key={l.id} listing={l} onClick={() => setPage("listing", l)} />
          ))}
        </div>
      )}
    </div>
  );
}
