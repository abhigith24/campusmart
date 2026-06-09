import React from "react";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

const CAT_ICONS = {
  Textbooks:"Book", Notes:"Note", "Lab Equipment":"Lab",
  Electronics:"Tech", Stationery:"Pen", Girls:"Girls", Misc:"Item"
};
const COND_META = {
  New:  { label:"New",  dot:"#10b981", bg:"#dcfce7", color:"#166534" },
  Good: { label:"Good", dot:"#3b82f6", bg:"#dbeafe", color:"#1d4ed8" },
  Fair: { label:"Fair", dot:"#f59e0b", bg:"#fef3c7", color:"#92400e" },
  Old:  { label:"Used", dot:"#ef4444", bg:"#fee2e2", color:"#991b1b" },
};

function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff/60000))}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
  return d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
}

export default function ListingCard({ listing, onClick }) {
  const { currentUser } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const {
    id, title, price, isFree, category, condition,
    images, sellerName, sellerCollege, sellerRating,
    status, createdAt, isVerified, listingType, rentPerDay
  } = listing;

  const icon = CAT_ICONS[category] || "Item";
  const wishlisted = isWishlisted(id);
  const isSold = status === "sold";
  const cond = COND_META[condition];
  const posted = timeAgo(createdAt);
  const isRent = listingType === "rent";

  function handleHeart(e) {
    e.stopPropagation();
    if (!currentUser) return;
    toggleWishlist(id);
  }

  return (
    <div className={`listing-card ${isFree ? "free-item" : ""} ${isSold ? "sold-item" : ""}`} onClick={onClick}>
      <div className="card-img">
        {images?.[0]
          ? <img src={images[0]} alt={title} loading="lazy" />
          : <div className="card-img-placeholder">{icon}</div>}

        {isFree && !isSold && <span className="free-badge">FREE</span>}
        {isRent && !isSold && <span className="rent-badge">RENT</span>}
        {isSold && <span className="sold-badge">SOLD</span>}
        {posted && !isSold && <span className="card-posted-badge">{posted}</span>}

        <button
          className={`heart-btn ${wishlisted ? "wishlisted" : ""}`}
          onClick={handleHeart}
          title={wishlisted ? "Remove from wishlist" : "Save"}
          aria-label={wishlisted ? "Remove from wishlist" : "Save listing"}
          type="button"
        >
          {wishlisted ? "Saved" : "Save"}
        </button>
      </div>

      <div className="card-body">
        <div className="card-top-row">
          <span className="card-cat">{category}</span>
          {cond && !isSold && (
            <span className="card-cond-badge" style={{ background:cond.bg, color:cond.color }}>
              <span className="card-cond-dot" style={{ background:cond.dot }} />
              {cond.label}
            </span>
          )}
        </div>

        <div className="card-title" title={title}>{title}</div>

        {sellerCollege && (
          <div className="card-college">
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            {sellerCollege}
          </div>
        )}

        <div className="card-footer">
          <div className={`card-price ${isFree ? "free" : ""} ${isSold ? "sold" : ""}`}>
            {isSold ? "Sold" : isFree ? "Free" : isRent ? `Rs ${Number(rentPerDay || 0).toLocaleString("en-IN")}/day` : (
              <>Rs {price?.toLocaleString("en-IN")}</>
            )}
          </div>
          <div className="card-seller-info">
            <div className="card-seller-avatar">{(sellerName || "?")[0].toUpperCase()}</div>
            {sellerRating > 0 && <span className="card-rating">{sellerRating.toFixed(1)}</span>}
            {isVerified && <span className="card-verified-dot" title="Verified Seller" />}
          </div>
        </div>
        <div className="card-seller-name">{sellerName}</div>
      </div>
    </div>
  );
}
