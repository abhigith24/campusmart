import React from "react";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

const CAT_ICONS = {
  Textbooks:"📖", Notes:"📝", "Lab Equipment":"🔬",
  Electronics:"💻", Stationery:"✏️", Misc:"📦"
};

const COND_META = {
  New:  { label:"New",         dot:"#22c55e", bg:"#dcfce7", color:"#15803d" },
  Good: { label:"Good",        dot:"#3b82f6", bg:"#dbeafe", color:"#1d4ed8" },
  Fair: { label:"Fair",        dot:"#f59e0b", bg:"#fef9c3", color:"#a16207" },
  Old:  { label:"Used",        dot:"#ef4444", bg:"#fee2e2", color:"#b91c1c" },
};

export default function ListingCard({ listing, onClick }) {
  const { currentUser } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { id, title, price, isFree, category, condition, images, sellerName, sellerRating, status } = listing;
  const icon      = CAT_ICONS[category] || "📦";
  const wishlisted = isWishlisted(id);
  const isSold    = status === "sold";
  const cond      = COND_META[condition];

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

        {/* Wishlist heart */}
        <button
          className={`heart-btn ${wishlisted ? "wishlisted" : ""}`}
          onClick={handleHeart}
          title={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
        >
          {wishlisted ? "❤️" : "🤍"}
        </button>
      </div>

      {/* Body */}
      <div className="card-body">
        {/* Top row: category + condition */}
        <div className="card-top-row">
          <span className="card-cat">{icon} {category}</span>
          {cond && !isSold && (
            <span className="card-cond-badge" style={{ background: cond.bg, color: cond.color }}>
              <span className="card-cond-dot" style={{ background: cond.dot }} />
              {cond.label}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="card-title" title={title}>{title}</div>

        {/* Footer: price + seller */}
        <div className="card-footer">
          <div className={`card-price ${isFree ? "free" : ""} ${isSold ? "sold" : ""}`}>
            {isSold ? "Sold ✅" : isFree ? "Free 💚" : (
              <><span className="card-currency">₹</span>{price?.toLocaleString("en-IN")}</>
            )}
          </div>
          <div className="card-seller-info">
            <div className="card-seller-avatar">{(sellerName || "?")[0].toUpperCase()}</div>
            {sellerRating > 0 && <span className="card-rating">⭐ {sellerRating.toFixed(1)}</span>}
          </div>
        </div>

        {/* Seller name */}
        <div className="card-seller-name">{sellerName}</div>
      </div>
    </div>
  );
}

