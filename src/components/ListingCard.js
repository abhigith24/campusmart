import React from "react";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

const CAT_ICONS = {
  Textbooks:"Textbook", Notes:"Note", "Lab Equipment":"Lab",
  Electronics:"Tech", Stationery:"Pen", Girls:"Girls", Misc:"Item"
};

// Category-specific placeholder images (served from /public)
const CAT_IMAGES = {
  Textbooks:      "/placeholder_textbooks.png",
  Notes:          "/placeholder_notes.png",
  "Lab Equipment":"/placeholder_lab.png",
  Electronics:    "/placeholder_electronics.png",
  Stationery:     "/placeholder_stationery.png",
  Girls:          "/placeholder_girls.png",
  Misc:           "/placeholder_misc.png",
};
const COND_META = {
  New:  { label:"New",  dot:"#10b981", bg:"#dcfce7", color:"#166534" },
  Good: { label:"Good", dot:"#3b82f6", bg:"#dbeafe", color:"#1d4ed8" },
  Fair: { label:"Fair", dot:"#64748b", bg:"#e2e8f0", color:"#334155" },
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

export default function ListingCard({ listing, onClick, requireAuth }) {
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
    if (requireAuth) {
      requireAuth(null, () => toggleWishlist(id));
    } else {
      if (!currentUser) return;
      toggleWishlist(id);
    }
  }

  return (
    <div className={`listing-card ${isFree ? "free-item" : ""} ${isSold ? "sold-item" : ""}`} onClick={onClick}>
      <div className="card-img">
        {images?.[0]
          ? <img src={images[0]} alt={title} loading="lazy" />
          : CAT_IMAGES[category]
            ? <img src={CAT_IMAGES[category]} alt={category} loading="lazy" className="card-img-placeholder-img" />
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
          <svg width="16" height="16" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        </button>
      </div>

      <div className="card-body">
        <div className="card-top-row">
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span className="card-cat">{category}</span>
            {isVerified && (
              <span className="card-verified-badge" title="Verified Student">
                <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: 2 }}>
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Verified
              </span>
            )}
          </div>
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
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0, color: "var(--muted)" }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            <span>{sellerCollege}</span>
          </div>
        )}

        <div className="card-footer">
          <div className={`card-price ${isFree ? "free" : ""} ${isSold ? "sold" : ""}`}>
            {isSold ? "Sold" : isFree ? "Free" : isRent ? `Rs ${Number(rentPerDay || 0).toLocaleString("en-IN")}/day` : (
              <>Rs {price?.toLocaleString("en-IN")}</>
            )}
          </div>
          <div className="card-seller-info">
            <div className="card-seller-avatar" title={sellerName}>{(sellerName || "?")[0].toUpperCase()}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              <span className="card-seller-name-inline">{sellerName}</span>
              {sellerRating > 0 && (
                <span className="card-rating">
                  ★ {sellerRating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
