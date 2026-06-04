import React from "react";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

const CAT_ICONS = {
  Textbooks:"📖", Notes:"📝", "Lab Equipment":"🔬",
  Electronics:"💻", Stationery:"✏️", Misc:"📦"
};
const COND_META = {
  New:  { label:"New",  dot:"#22c55e", bg:"#dcfce7", color:"#15803d" },
  Good: { label:"Good", dot:"#3b82f6", bg:"#dbeafe", color:"#1d4ed8" },
  Fair: { label:"Fair", dot:"#f59e0b", bg:"#fef9c3", color:"#a16207" },
  Old:  { label:"Used", dot:"#ef4444", bg:"#fee2e2", color:"#b91c1c" },
};

function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000)   return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
  return d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
}

export default function ListingCard({ listing, onClick }) {
  const { currentUser } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const {
    id, title, price, isFree, category, condition,
    images, sellerName, sellerCollege, sellerRating,
    status, createdAt, isVerified
  } = listing;

  const icon      = CAT_ICONS[category] || "📦";
  const wishlisted = isWishlisted(id);
  const isSold    = status === "sold";
  const cond      = COND_META[condition];
  const posted    = timeAgo(createdAt);

  function handleHeart(e) {
    e.stopPropagation();
    if (!currentUser) return;
    toggleWishlist(id);
  }

  return (
    <div className={`listing-card ${isFree ? "free-item" : ""} ${isSold ? "sold-item" : ""}`} onClick={onClick}>
      {/* Image */}
      <div className="card-img">
        {images?.[0]
          ? <img src={images[0]} alt={title} loading="lazy" />
          : <div className="card-img-placeholder">{icon}</div>}

        {isFree && !isSold && <span className="free-badge">FREE</span>}
        {isSold              && <span className="sold-badge">SOLD</span>}

        {/* Posted time */}
        {posted && !isSold && (
          <span className="card-posted-badge">{posted}</span>
        )}

        {/* Heart */}
        <button className={`heart-btn ${wishlisted ? "wishlisted" : ""}`}
          onClick={handleHeart} title={wishlisted ? "Remove from wishlist" : "Save"}>
          {wishlisted ? "❤️" : "🤍"}
        </button>
      </div>

      {/* Body */}
      <div className="card-body">
        {/* Category + condition row */}
        <div className="card-top-row">
          <span className="card-cat">{icon} {category}</span>
          {cond && !isSold && (
            <span className="card-cond-badge" style={{ background:cond.bg, color:cond.color }}>
              <span className="card-cond-dot" style={{ background:cond.dot }} />
              {cond.label}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="card-title" title={title}>{title}</div>

        {/* College */}
        {sellerCollege && (
          <div className="card-college">
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            {sellerCollege}
          </div>
        )}

        {/* Price + Seller */}
        <div className="card-footer">
          <div className={`card-price ${isFree ? "free" : ""} ${isSold ? "sold" : ""}`}>
            {isSold ? "Sold ✅" : isFree ? "Free 💚" : (
              <><span className="card-currency">₹</span>{price?.toLocaleString("en-IN")}</>
            )}
          </div>
          <div className="card-seller-info">
            <div className="card-seller-avatar">{(sellerName || "?")[0].toUpperCase()}</div>
            {sellerRating > 0 && (
              <span className="card-rating">⭐ {sellerRating.toFixed(1)}</span>
            )}
            {isVerified && <span className="card-verified-dot" title="Verified Seller" />}
          </div>
        </div>
        <div className="card-seller-name">{sellerName}</div>
      </div>
    </div>
  );
}
