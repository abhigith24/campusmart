import React, { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
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

export default function MyCollegeListingsPage({ setPage }) {
  const { userProfile } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const collegeName = userProfile?.college || "";

  useEffect(() => {
    if (!collegeName) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "listings"),
      where("status", "==", "active"),
      where("sellerCollege", "==", collegeName),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(q, snap => {
      setListings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error(err);
      setLoading(false);
    });
    return unsub;
  }, [collegeName]);

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
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>
          {collegeName ? `Listings at ${collegeName}` : "My College Listings"}
        </h1>
      </div>

      {!collegeName ? (
        <div className="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted-2)", marginBottom: 16 }}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          <h3>No College Linked</h3>
          <p>Please enter your college name in settings to view listings from your campus.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setPage("settings")}>Go to Settings</button>
        </div>
      ) : loading ? (
        <div className="listings-grid">
          {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted-2)", marginBottom: 16 }}>
            <path d="M22 10v12h-20v-12l10-6z"/>
            <rect x="6" y="14" width="4" height="8"/>
            <rect x="14" y="14" width="4" height="8"/>
          </svg>
          <h3>No listings available from your college yet</h3>
          <p>Be the first to post an item from {collegeName}!</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setPage("post")}>+ Post Item</button>
        </div>
      ) : (
        <div className="listings-grid">
          {listings.map(l => (
            <ListingCard key={l.id} listing={l} onClick={() => setPage("listing", l)} />
          ))}
        </div>
      )}
    </div>
  );
}
