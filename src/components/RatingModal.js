import React, { useState, useEffect } from "react";
import {
  doc, updateDoc, getDoc, addDoc,
  collection, query, where, getDocs, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function RatingModal({ sellerId, sellerName, listingId, onClose }) {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [rating,    setRating]   = useState(0);
  const [hover,     setHover]    = useState(0);
  const [review,    setReview]   = useState("");
  const [loading,   setLoading]  = useState(false);
  const [checking,  setChecking] = useState(true);
  const [canRate,   setCanRate]  = useState(false);
  const [reason,    setReason]   = useState("");

  useEffect(() => {
    if (!currentUser || !listingId) {
      setChecking(false);
      setCanRate(false);
      setReason("You must be logged in to rate.");
      return;
    }
    checkEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, listingId]);

  async function checkEligibility() {
    setChecking(true);
    try {
      // 1. Listing must be sold
      const listingSnap = await getDoc(doc(db, "listings", listingId));
      if (!listingSnap.exists()) {
        setReason("Listing not found."); setCanRate(false); setChecking(false); return;
      }
      if (listingSnap.data().status !== "sold") {
        setReason("Rating is only available after the seller marks the item as Sold."); setCanRate(false); setChecking(false); return;
      }

      // 2. Current user must NOT be the seller
      if (listingSnap.data().sellerId === currentUser.uid) {
        setReason("You cannot rate your own listing."); setCanRate(false); setChecking(false); return;
      }

      // 3. Buyer must have an accepted purchase request
      // Query by listingId + buyerId only (avoid 3-field composite index)
      const reqQ = query(
        collection(db, "purchaseRequests"),
        where("listingId", "==", listingId),
        where("buyerId",   "==", currentUser.uid)
      );
      const reqSnap = await getDocs(reqQ);
      const hasAccepted = reqSnap.docs.some(d => d.data().status === "accepted");
      if (!hasAccepted) {
        setReason("Only the buyer whose purchase was accepted can rate the seller."); setCanRate(false); setChecking(false); return;
      }

      // 4. No duplicate rating
      const dupQ = query(
        collection(db, "ratings"),
        where("listingId", "==", listingId),
        where("buyerId",   "==", currentUser.uid)
      );
      const dupSnap = await getDocs(dupQ);
      if (!dupSnap.empty) {
        setReason("You have already submitted a rating for this transaction."); setCanRate(false); setChecking(false); return;
      }

      setCanRate(true);
    } catch (err) {
      console.error("Rating eligibility check failed:", err.code, err.message);
      // Show error details for debugging
      setReason(`Error checking eligibility: ${err.message}. Please try again.`);
      setCanRate(false);
    }
    setChecking(false);
  }

  async function submitRating() {
    if (rating === 0) { toast("Please select a star rating", "error"); return; }
    setLoading(true);
    try {
      // 1. Write rating doc
      await addDoc(collection(db, "ratings"), {
        listingId,
        sellerId,
        buyerId:   currentUser.uid,
        buyerName: currentUser.displayName || "Student",
        stars:     rating,
        review:    review.trim(),
        createdAt: serverTimestamp()
      });

      // 2. Re-fetch all ratings for this seller and recalculate
      const allQ    = query(collection(db, "ratings"), where("sellerId", "==", sellerId));
      const allSnap = await getDocs(allQ);
      const allStars = allSnap.docs.map(d => d.data().stars);
      const avg      = allStars.reduce((s, n) => s + n, 0) / allStars.length;

      // 3. Update seller's user doc
      await updateDoc(doc(db, "users", sellerId), {
        rating:       parseFloat(avg.toFixed(2)),
        totalRatings: allStars.length,
      });

      toast("⭐ Rating submitted! Thank you for your feedback.", "success");
      onClose();
    } catch (err) {
      console.error("Rating submit error:", err.code, err.message);
      toast(`Failed to submit: ${err.message}`, "error");
    }
    setLoading(false);
  }

  const active = hover || rating;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal rating-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="rating-modal-header">
          <div className="rating-modal-avatar">{(sellerName || "?")[0].toUpperCase()}</div>
          <div>
            <h3 style={{ marginBottom:2 }}>Rate {sellerName}</h3>
            <p style={{ margin:0, color:"var(--muted)", fontSize:13 }}>Share your experience with this seller</p>
          </div>
        </div>

        {checking ? (
          <div style={{ textAlign:"center", padding:"32px 0" }}>
            <div className="spinner" style={{ margin:"0 auto 12px" }} />
            <div style={{ color:"var(--muted)", fontSize:14 }}>Checking eligibility...</div>
          </div>
        ) : !canRate ? (
          <div className="rating-blocked">
            <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
            <div style={{ fontWeight:800, fontSize:16, marginBottom:8 }}>Rating Unavailable</div>
            <div style={{ fontSize:14, color:"var(--muted)", lineHeight:1.65, marginBottom:20 }}>{reason}</div>
            <button className="btn btn-outline" style={{ width:"100%", justifyContent:"center" }} onClick={onClose}>Close</button>
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
                    aria-label={`${n} star${n>1?"s":""}`}>
                    ★
                  </button>
                ))}
              </div>
              <div className="rating-label" style={{ minHeight:22 }}>
                {active > 0 ? STAR_LABELS[active] : "Tap a star to rate"}
              </div>
            </div>

            {/* Review textarea */}
            <div className="form-group">
              <label className="form-label">
                Review <span style={{ color:"var(--muted-2)", fontWeight:400, fontSize:12 }}>— optional</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="How was the item condition? Was the seller responsive? Would you recommend?"
                value={review}
                onChange={e => setReview(e.target.value)}
                style={{ resize:"vertical" }}
                maxLength={300}
              />
              <div style={{ textAlign:"right", fontSize:11, color:"var(--muted-2)", marginTop:4 }}>
                {review.length}/300
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn btn-outline" onClick={onClose}
                style={{ flex:1, justifyContent:"center" }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitRating}
                style={{ flex:2, justifyContent:"center" }}
                disabled={loading || rating === 0}>
                {loading
                  ? <><span className="btn-spinner" /> Submitting...</>
                  : `Submit ${rating > 0 ? "⭐".repeat(Math.min(rating,5)) : "Rating"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
