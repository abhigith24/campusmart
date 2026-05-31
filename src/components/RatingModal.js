import React, { useState } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../context/ToastContext";

export default function RatingModal({ sellerId, sellerName, onClose }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function submitRating() {
    if (rating === 0) { toast("Please select a rating", "error"); return; }
    setLoading(true);
    try {
      const ref = doc(db, "users", sellerId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const newTotal = (data.totalRatings || 0) + 1;
        const newRating = ((data.rating || 0) * (data.totalRatings || 0) + rating) / newTotal;
        await updateDoc(ref, { rating: newRating, totalRatings: newTotal });
      }
      toast("Rating submitted! ⭐", "success");
      onClose();
    } catch (e) {
      toast("Could not submit rating", "error");
    }
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>⭐ Rate Seller</h3>
        <p>How was your experience with {sellerName}?</p>
        <div className="stars">
          {[1,2,3,4,5].map(n => (
            <span
              key={n}
              className="star"
              style={{ opacity: n <= (hover || rating) ? 1 : 0.3 }}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
            >
              ⭐
            </span>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Share your experience (optional)"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
          <button className="btn btn-primary" onClick={submitRating} style={{ flex: 1, justifyContent: "center" }} disabled={loading}>
            {loading ? "Submitting..." : "Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
