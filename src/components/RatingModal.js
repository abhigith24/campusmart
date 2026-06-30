import React, { useState, useEffect } from "react";
import {
  doc, setDoc, updateDoc, getDoc, addDoc,
  collection, query, where, getDocs, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { RatingService } from "../services/ratingService";
import { NotificationService } from "../services/notificationService";

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function RatingModal({ sellerId, sellerName, listingId, onClose }) {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [rating,   setRating]   = useState(0);
  const [hover,    setHover]    = useState(0);
  const [review,   setReview]   = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);
  const [canRate,  setCanRate]  = useState(false);
  const [reason,   setReason]   = useState("");

  const PREDEFINED_TAGS = ["Friendly", "Responsive", "Recommended", "On Time", "Item as Described", "Good Communication"];

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  useEffect(() => {
    if (!currentUser || !listingId) {
      setChecking(false);
      setCanRate(false);
      setReason("You must be logged in to rate.");
      return;
    }
    checkEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkEligibility() {
    setChecking(true);
    try {
      // 1. Listing must exist and be sold
      const listingSnap = await getDoc(doc(db, "listings", listingId));
      if (!listingSnap.exists()) {
        setReason("Listing not found."); setCanRate(false); setChecking(false); return;
      }
      const listingData = listingSnap.data();
      if (listingData.status !== "exchanged" && listingData.status !== "sold") {
        setReason("Rating is only available after the item is sold or exchanged."); setCanRate(false); setChecking(false); return;
      }
      // 2. Must not be own listing
      if (listingData.sellerId === currentUser.uid) {
        setReason("You cannot rate your own listing."); setCanRate(false); setChecking(false); return;
      }

      // 3. Must have an accepted/exchanged purchase request
      const reqRef = doc(db, "purchaseRequests", `${currentUser.uid}_${listingId}`);
      const reqSnap = await getDoc(reqRef);
      if (!reqSnap.exists()) {
        setReason("Only the buyer with an accepted or exchanged request can rate the seller."); setCanRate(false); setChecking(false); return;
      }
      
      const reqData = reqSnap.data();
      if (reqData.status !== "EXCHANGED") {
        setReason("Rating is only available after the transaction is marked as exchanged."); setCanRate(false); setChecking(false); return;
      }

      // 4. No duplicate rating (use composite ID for ratings too)
      const ratingRef = doc(db, "ratings", `${currentUser.uid}_${listingId}`);
      const dupSnap = await getDoc(ratingRef);
      if (dupSnap.exists()) {
        setReason("You have already rated this transaction."); setCanRate(false); setChecking(false); return;
      }

      setCanRate(true);
    } catch (err) {
      console.error("Eligibility check error:", err.code, err.message);
      setReason(`Could not verify eligibility: ${err.message}`);
      setCanRate(false);
    }
    setChecking(false);
  }

  async function submitRating() {
    if (rating === 0) { toast("Please select a star rating", "error"); return; }
    setLoading(true);
    try {
      const ratingRef = doc(db, "ratings", `${currentUser.uid}_${listingId}`);
      const dupSnap = await getDoc(ratingRef);
      if (dupSnap.exists()) {
        toast("You have already rated this transaction. ❌", "error");
        onClose();
        setLoading(false);
        return;
      }

      await RatingService.submitRating({
        listingId,
        sellerId,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || "Student",
        rating,
        review,
        tags: selectedTags
      });

      toast("⭐ Rating submitted! Thank you.", "success");
      onClose();
    } catch (err) {
      console.error("Rating submit error:", err.code, err.message);
      if (err.code === "permission-denied") {
        toast("Failed to submit rating. You have already rated this transaction or are not eligible. ❌", "error");
      } else {
        toast(`Failed to submit: ${err.message}`, "error");
      }
    }
    setLoading(false);
  }

  const active = hover || rating;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal rating-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Rate ${sellerName}`}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="rating-modal-header">
          <div className="rating-modal-avatar">{(sellerName || "?")[0].toUpperCase()}</div>
          <div>
            <h3 style={{ marginBottom: 2 }}>Rate {sellerName}</h3>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Share your experience with this seller</p>
          </div>
        </div>

        {checking ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            <div style={{ color: "var(--muted)", fontSize: 14 }}>Checking eligibility…</div>
          </div>
        ) : !canRate ? (
          <div className="rating-blocked">
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Rating Unavailable</div>
            <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65, marginBottom: 20 }}>{reason}</div>
            <button className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            {/* Stars */}
            <div className="rating-stars-wrap">
              <div className="rating-stars">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button"
                    className={`rating-star ${n <= active ? "active" : ""}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}>
                    ★
                  </button>
                ))}
              </div>
              <div className="rating-label" style={{ minHeight: 22 }}>
                {active > 0 ? STAR_LABELS[active] : "Tap a star to rate"}
              </div>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ marginBottom: 8, display: "block" }}>What went well? <span style={{ color: "var(--muted-2)", fontWeight: 400, fontSize: 12 }}>— optional</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PREDEFINED_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    style={{
                      background: selectedTags.includes(tag) ? "var(--p-light)" : "var(--surface)",
                      color: selectedTags.includes(tag) ? "var(--p)" : "var(--txt-2)",
                      border: `1px solid ${selectedTags.includes(tag) ? "var(--p)" : "var(--bdr)"}`,
                      borderRadius: "16px",
                      padding: "4px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Review textarea */}
            <div className="form-group">
              <label className="form-label">
                Review <span style={{ color: "var(--muted-2)", fontWeight: 400, fontSize: 12 }}>— optional</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="How was the condition? Was the seller responsive?"
                value={review}
                onChange={e => setReview(e.target.value)}
                style={{ resize: "vertical" }}
                maxLength={300}
              />
              <div style={{ textAlign: "right", fontSize: 11, color: "var(--muted-2)", marginTop: 4 }}>
                {review.length}/300
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-outline" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitRating}
                style={{ flex: 2, justifyContent: "center" }}
                disabled={loading || rating === 0}>
                {loading
                  ? <><span className="btn-spinner" /> Submitting…</>
                  : `Submit ${"⭐".repeat(Math.min(rating, 5)) || "Rating"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
