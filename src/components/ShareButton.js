import React, { useState, lazy, Suspense } from "react";
import { Share2 } from "lucide-react";
import { getShareUrl } from "../utils/urlHelper";
import { trackShareAction } from "../utils/shareAnalytics";
import { useToast } from "../context/ToastContext";

// Lazy load ShareModal for performance optimization
const ShareModal = lazy(() => import("./ShareModal"));

export default function ShareButton({ listing, currentUserId, className = "", iconOnly = false }) {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!listing) return null;

  const refId = currentUserId || listing.sellerId || "";
  const finalShareUrl = getShareUrl(listing, refId, "native");
  
  // Format price appropriately
  let priceStr = "";
  if (listing.isFree || listing.listingType === "free") {
    priceStr = "Free";
  } else if (listing.listingType === "rent") {
    priceStr = `₹${listing.rentPerDay || 0}/day`;
  } else {
    priceStr = `₹${listing.price || 0}`;
  }

  const titleText = `CampusMart | ${listing.title}`;
  const messageText = `🎓 Check out this item on CampusMart\n\n📦 Product: ${listing.title}\n💰 Price: ${priceStr}\n🏫 Seller College: ${listing.sellerCollege || "CampusMart Campus"}\n\nView Listing:`;

  const handleShareClick = async (e) => {
    e.stopPropagation();

    // Check if Web Share API is available (primarily mobile/tablets)
    if (navigator.share) {
      try {
        await navigator.share({
          title: titleText,
          text: messageText,
          url: finalShareUrl
        });
        toast("✅ Shared successfully! 🎉", "success");
        trackShareAction(listing.id, "native", currentUserId);
      } catch (err) {

        if (err.name !== "AbortError") {
          console.error("Error sharing with native sheet, falling back to modal:", err);
          setIsModalOpen(true);
        }
      }
    } else {
      // Desktop or unsupported browser -> Fallback to custom glassmorphism modal
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleShareClick}
        className={`btn-share-custom ${className}`}
        aria-label={`Share listing: ${listing.title}`}
        type="button"
      >
        <Share2 size={15} />
        {!iconOnly && <span>Share</span>}
      </button>

      {/* Lazy loaded modal wrapper */}
      {isModalOpen && (
        <Suspense fallback={null}>
          <ShareModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            listing={listing}
            currentUserId={currentUserId}
          />
        </Suspense>
      )}
    </>
  );
}
