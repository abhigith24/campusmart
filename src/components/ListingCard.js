import React from "react";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

const CAT_ICONS = {
  Books: "📚",
  Notes: "📝",
  Electronics: "💻",
  "Lab Equipment": "🧪",
  Stationery: "✏️",
  Fashion: "👕",
  Hostel: "🏠",
  Sports: "🚲",
  Gaming: "🎮",
  "Musical Instruments": "🎸",
  Photography: "📷",
  Other: "📦",
};

// Category-specific placeholder images (served from /public)
const CAT_IMAGES = {
  Books: "/placeholder_textbooks.png",
  Notes: "/placeholder_notes.png",
  "Lab Equipment": "/placeholder_lab.png",
  Electronics: "/placeholder_electronics.png",
  Stationery: "/placeholder_stationery.png",
  Fashion: "/placeholder_misc.png",
  Hostel: "/placeholder_misc.png",
  Sports: "/placeholder_misc.png",
  Gaming: "/placeholder_misc.png",
  "Musical Instruments": "/placeholder_misc.png",
  Photography: "/placeholder_misc.png",
  Other: "/placeholder_misc.png",
};
const COND_META = {
  New:  { label:"New",  dot:"var(--grn)", bg:"var(--cond-new-bg)", color:"var(--cond-new-txt)" },
  Good: { label:"Good", dot:"var(--p)", bg:"var(--cond-good-bg)", color:"var(--cond-good-txt)" },
  Fair: { label:"Fair", dot:"var(--text-muted)", bg:"var(--cond-fair-bg)", color:"var(--cond-fair-txt)" },
  Old:  { label:"Used", dot:"var(--red)", bg:"var(--cond-old-bg)", color:"var(--cond-old-txt)" },
};

import VerifiedStudentBadge from "./VerifiedStudentBadge";
import SameCampusBadge from "./SameCampusBadge";
import TrustedSellerBadge from "./TrustedSellerBadge";
import { optimizeCloudinaryUrl } from "../utils/cloudinary";

function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff/60000))}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
  return d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
}

function ListingCard({ listing, onClick, requireAuth, layout = "grid" }) {
  const { currentUser, userProfile } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const {
    id, title, price, isFree, category, condition,
    images, sellerName, sellerCollege, sellerRating,
    status, createdAt, isVerified, collegeVerified, sellerSuccessfulSales, listingType, rentPerDay
  } = listing;

  const icon = CAT_ICONS[category] || "Item";
  const wishlisted = isWishlisted(id);
  const isSold = status === "sold";
  const cond = COND_META[condition];
  const posted = timeAgo(createdAt);
  const isRent = listingType === "rent";
  const trustScore = Math.round(
    50 +
    ((collegeVerified || isVerified) ? 20 : 0) +
    (Number(sellerSuccessfulSales || 0) >= 3 ? 15 : 0) +
    (Number(sellerRating || 0) > 0 ? (Number(sellerRating) / 5) * 15 : 0)
  );

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
    <div className={`listing-card ${layout === "list" ? "layout-list-card" : ""} ${isFree ? "free-item" : ""} ${isSold ? "sold-item" : ""}`} onClick={onClick}>
      <div className="card-img">
        {images?.[0]
          ? <img src={optimizeCloudinaryUrl(images[0], "f_auto,q_auto,w_400,c_fill")} alt={title} loading="lazy" />
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
          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            <span className="card-cat">{category}</span>
            {(collegeVerified || isVerified) && <VerifiedStudentBadge />}
            {currentUser && userProfile?.college && sellerCollege && userProfile.college.trim().toLowerCase() === sellerCollege.trim().toLowerCase() && (
              <SameCampusBadge />
            )}
            {sellerSuccessfulSales >= 3 && (
              <TrustedSellerBadge />
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
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                {sellerRating > 0 && (
                  <span className="card-rating">
                    ★ {sellerRating.toFixed(1)}
                  </span>
                )}
                <span className="card-trust-score" title={`Trust Score: ${trustScore}% based on verification, ratings, and sales`}>
                  🛡️ {trustScore}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ListingCard);
