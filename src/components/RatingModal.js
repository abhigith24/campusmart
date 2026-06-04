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
  const [rating,   setRating]   = useState(0);
  const [hover,    setHover]    = useState(0);
  const [review,   setReview]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);
  const [canRate,  setCanRate]  = useState(false);
  const [reason,   setReason]   = useState("");

  useEffect(() => {
    async function checkEligibility() {
      setChecking(true);
      try {
        // 1. Check listing is sold
        const listingSnap = await getDoc(doc(db, "listings", listingId));
        if (!listingSnap.exists() || listingSnap.data().status !== "sold") {
          setReason("You can only rate after the item is marked as sold."); setCanRate(false); setChecking(false); return;
        }
        // 2. Check buyer is involved (has a purchase request)
        const reqQ = query(
          collection(db, "purchaseRequests"),
          where("listingId", "==", listingId),
          where("buyerId",   "==", currentUser.uid),
          where("status",    "==", "accepted")
        );
        const reqSnap = await getDocs(reqQ);
        if (reqSnap.empty) {
          setReason("Only the accepted buyer can rate the seller."); setCanRate(false); setChecking(false); return;
        }
        // 3. Check no duplicate rating for this listing
        const ratingQ = query(
          collection(db, "ratings"),
          where("listingId", "==", listingId),
          where("buyerId",   "==", currentUser.uid)
        );
        const ratingSnap = await getDocs(ratingQ);
        if (!ratingSnap.empty) {
          setReason("You've already rated this seller for this transaction."); setCanRate(false); setChecking(false); return;
        }
        setCanRate(true);
      } catch {
        setCanRate(true); // allow on error to not block
      }
      setChecking(false);
    }
    if (currentUser && listingId) checkEligibility();
    else { setChecking(false); setCanRate(true); }
  }, [currentUser, listingId]);

  async function submitRating() {
    if (rating === 0) { toast("Please select a rating", "error"); return; }
    setLoading(true);
    try {
      // 1. Save rating document
      await addDoc(collection(db, "ratings"), {
        listingId,
        sellerId,
        buyerId:   currentUser.uid,
        stars:     rating,
        review:    review.trim(),
        createdAt: serverTimestamp()
      });

      // 2. Recalculate seller's average rating
      const allRatingsQ = query(collection(db, "ratings"), where("sellerId", "==", sellerId));
      const allSnap = await getDocs(allRatingsQ);
      const allStars = allSnap.docs.map(d => d.data().stars);
      const avg = allStars.reduce((s, n) => s + n, 0) / allStars.length;

      await updateDoc(doc(db, "users", sellerId), {
        rating:       parseFloat(avg.toFixed(2)),
        totalRatings: allStars.length,
      });

      toast("Rating submitted! ⭐ Thanks for your feedback.", "success");
      onClose();
    } catch (e) {
      console.error(e);
      toast("Could not submit rating", "error");
    }
    setLoading(false);
  }

  const active = hover || rating;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal rating-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="rating-modal-header">
          <div className="rating-modal-avatar">{(sellerName || "?")[0].toUpperCase()}</div>
          <div>
            <h3>Rate {sellerName}</h3>
            <p style={{ margin:0, color:"var(--muted)", fontSize:13 }}>How was your experience?</p>
          </div>
        </div>

        {checking ? (
          <div className="loading-center" style={{ padding:"32px 0" }}><div className="spinner" /></div>
        ) : !canRate ? (
          <div className="rating-blocked">
            <div style={{ fontSize:36, marginBottom:12 }}>🔒</div>
            <div style={{ fontWeight:700, marginBottom:6 }}>Can't rate yet</div>
            <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.6 }}>{reason}</div>
            <button className="btn btn-outline" style={{ marginTop:16, width:"100%", justifyContent:"center" }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            {/* Stars */}
            <div className="rating-stars-wrap">
              <div className="rating-stars">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" className={`rating-star ${n <= active ? "active" : ""}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}>
                    ★
                  </button>
                ))}
              </div>
              {active > 0 && (
                <div className="rating-label">{STAR_LABELS[active]}</div>
              )}
            </div>

            {/* Review */}
            <div className="form-group">
              <label className="form-label">Write a review <span style={{ color:"var(--muted)", fontWeight:400 }}>(optional)</span></label>
              <textarea className="form-input" rows={3}
                placeholder="Tell others about your experience with this seller..."
                value={review} onChange={e => setReview(e.target.value)}
                style={{ resize:"vertical" }} maxLength={300} />
              <div style={{ textAlign:"right", fontSize:12, color:"var(--muted)", marginTop:4 }}>{review.length}/300</div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button className="btn btn-outline" onClick={onClose} style={{ flex:1, justifyContent:"center" }}>Cancel</button>
              <button className="btn btn-primary" onClick={submitRating}
                style={{ flex:2, justifyContent:"center" }} disabled={loading || rating === 0}>
                {loading ? "Submitting..." : `Submit ${rating > 0 ? "⭐".repeat(rating) : "Rating"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
