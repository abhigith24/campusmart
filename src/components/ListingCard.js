import React from "react";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

const CAT_ICONS = {
  Textbooks: "📖", Notes: "📝", "Lab Equipment": "🔬",
  Electronics: "💻", Stationery: "✏️", Misc: "📦"
};

export default function ListingCard({ listing, onClick }) {
  const { currentUser } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { id, title, price, isFree, category, condition, images, sellerName, sellerRating, status } = listing;
  const icon    = CAT_ICONS[category] || "📦";
  const wishlisted = isWishlisted(id);
  const isSold  = status === "sold";

  function handleHeart(e) {
    e.stopPropagation();
    if (!currentUser) return;
    toggleWishlist(id);
  }

  return (
    <div className={`listing-card ${isFree ? "free-item" : ""} ${isSold ? "sold-item" : ""}`} onClick={onClick}>
      <div className="card-img">
        {images && images[0]
          ? <img src={images[0]} alt={title} />
          : <span>{icon}</span>}
        {isFree  && <span className="free-badge">FREE</span>}
        {isSold  && <span className="sold-badge">SOLD</span>}
        {condition && !isSold && <span className="condition-badge">{condition}</span>}

        {/* Wishlist heart button */}
        <button
          className={`heart-btn ${wishlisted ? "wishlisted" : ""}`}
          onClick={handleHeart}
          title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          {wishlisted ? "❤️" : "🤍"}
        </button>
      </div>
      <div className="card-body">
        <div className="card-cat">{icon} {category}</div>
        <div className="card-title">{title}</div>
        <div className={`card-price ${isFree ? "free" : ""} ${isSold ? "sold" : ""}`}>
          {isSold ? "Sold ✅" : isFree ? "Donate Free 💚" : `₹${price}`}
        </div>
        <div className="card-meta">
          <span className="card-seller">👤 {sellerName}</span>
          {sellerRating > 0 && <span className="card-rating">⭐ {sellerRating.toFixed(1)}</span>}
        </div>
      </div>
    </div>
  );
}
