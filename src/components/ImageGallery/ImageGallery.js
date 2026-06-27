import React, { useState, useRef, memo } from "react";
import { optimizeCloudinaryUrl } from "../../utils/cloudinary";
import ShareButton from "../ShareButton";
import { Heart } from "lucide-react";
import ImageGalleryModal from "./ImageGalleryModal";

const CAT_IMAGES = {
  Textbooks:      "/placeholder_textbooks.png",
  Notes:          "/placeholder_notes.png",
  "Lab Equipment":"/placeholder_lab.png",
  Electronics:    "/placeholder_electronics.png",
  Stationery:     "/placeholder_stationery.png",
  Girls:          "/placeholder_girls.png",
  Misc:           "/placeholder_misc.png",
};

const ImageGallery = memo(({ 
  images, 
  category, 
  title, 
  isSold, 
  wishlisted, 
  onToggleWishlist, 
  listing, 
  currentUser 
}) => {
  const [activeImg, setActiveImg] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = () => {
    if (!images || images.length <= 1) return;
    if (touchStartX.current - touchEndX.current > 50) {
      setActiveImg((prev) => (prev + 1) % images.length);
    }
    if (touchStartX.current - touchEndX.current < -50) {
      setActiveImg((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const hasImages = images && images.length > 0;
  const currentImg = hasImages ? optimizeCloudinaryUrl(images[activeImg], "f_auto,q_auto,w_800") : (CAT_IMAGES[category] || null);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div
          className="detail-imgs"
          style={{ position: "relative", touchAction: "pan-y", cursor: hasImages ? "pointer" : "default" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            if (hasImages) setIsModalOpen(true);
          }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hasImages) setIsModalOpen(true);
          }}
          role="button"
          aria-label="View fullscreen image"
        >
          {currentImg ? (
            <img src={currentImg} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
          ) : (
            <span style={{ fontSize: 64 }}>📦</span>
          )}

          {!isSold && (
            <div className="gallery-overlay-actions">
              <button
                className={`action-overlay-btn btn-wishlist-overlay ${wishlisted ? "wishlisted" : ""}`}
                onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
                title={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                type="button"
                style={{ minHeight: "44px", minWidth: "44px" }}
              >
                <Heart size={16} fill={wishlisted ? "currentColor" : "none"} />
              </button>
              
              <div className="action-overlay-btn btn-share-overlay" onClick={e => e.stopPropagation()} style={{ minHeight: "44px", minWidth: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShareButton listing={listing} currentUserId={currentUser?.uid} iconOnly={true} />
              </div>
            </div>
          )}

          {isSold && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(0,0,0,.45)",
              display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center",
              borderRadius: "var(--r-md)", zIndex: 5
            }}>
              <span style={{ color: "#fff", fontSize: 22, fontWeight: 900, background: "#22c55e", padding: "8px 24px", borderRadius: 30 }}>
                ✅ SOLD
              </span>
            </div>
          )}

          {hasImages && images.length > 1 && (
            <>
              <button
                type="button"
                className="gallery-nav-btn prev"
                onClick={(e) => { e.stopPropagation(); setActiveImg(prev => (prev - 1 + images.length) % images.length); }}
                aria-label="Previous image"
                style={{ minHeight: "44px", minWidth: "44px" }}
              >
                ‹
              </button>
              <button
                type="button"
                className="gallery-nav-btn next"
                onClick={(e) => { e.stopPropagation(); setActiveImg(prev => (prev + 1) % images.length); }}
                aria-label="Next image"
                style={{ minHeight: "44px", minWidth: "44px" }}
              >
                ›
              </button>
            </>
          )}

          {hasImages && images.length > 1 && (
            <div className="gallery-dots" style={{
              position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
              display: "flex", gap: 6, zIndex: 10, background: "rgba(0,0,0,0.35)", padding: "5px 10px", borderRadius: 12
            }}>
              {images.map((_, i) => (
                <span key={i} className={`gallery-dot ${activeImg === i ? "active" : ""}`} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: activeImg === i ? "#fff" : "rgba(255,255,255,0.4)",
                  transition: "background 0.2s"
                }} />
              ))}
            </div>
          )}
        </div>

        {hasImages && images.length > 1 && (
          <div className="detail-thumbs" style={{ scrollSnapType: "x mandatory", overflowX: "auto", display: "flex", gap: "8px" }}>
            {images.map((url, i) => (
              <button 
                key={i} 
                className={`detail-thumb ${activeImg === i ? "active" : ""}`} 
                onClick={() => setActiveImg(i)}
                style={{ scrollSnapAlign: "start", border: "none", background: "none", padding: 0, cursor: "pointer" }}
                aria-label={`View image ${i + 1}`}
              >
                <img src={optimizeCloudinaryUrl(url, "f_auto,q_auto,w_100,c_fill")} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && hasImages && (
        <ImageGalleryModal 
          images={images} 
          initialIndex={activeImg} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
});

export default ImageGallery;
