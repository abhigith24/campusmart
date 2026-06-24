import React, { useEffect, useRef, useState } from "react";
import { Link, Copy, Mail, Check, Share2 } from "lucide-react";
import { generateSlug, getListingUrl } from "../utils/urlHelper";
import { trackShareAction } from "../utils/shareAnalytics";
import { useToast } from "../context/ToastContext";

export default function ShareModal({ isOpen, onClose, listing, currentUserId }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Handle click outside container
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("share-modal-overlay")) {
      onClose();
    }
  };

  if (!isOpen || !listing) return null;

  const baseUrl = `${window.location.origin}${getListingUrl(listing)}`;
  const refId = currentUserId || listing.sellerId || "";
  const shareUrlBase = `${baseUrl}${refId ? `?ref=${refId}` : ""}`;

  const priceStr = listing.isFree || listing.listingType === "free"
    ? "Free"
    : listing.listingType === "rent"
      ? `₹${listing.rentPerDay}/day`
      : `₹${listing.price}`;

  const textMessage = `🎓 Check out this item on CampusMart\n\n📦 Product: ${listing.title}\n💰 Price: ${priceStr}\n🏫 Seller College: ${listing.sellerCollege || "CampusMart Campus"}\n\nView Listing:\n${shareUrlBase}`;

  const handleCopyLink = () => {
    const finalUrl = `${shareUrlBase}${shareUrlBase.includes("?") ? "&" : "?"}utm_source=clipboard`;
    navigator.clipboard.writeText(finalUrl).then(() => {
      setCopied(true);
      toast("🔗 Listing link copied", "success");
      trackShareAction(listing.id, "clipboard", currentUserId);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast("Failed to copy link", "error");
    });
  };

  const handleShareClick = (platform, href) => {
    trackShareAction(listing.id, platform, currentUserId);
    if (href.startsWith("mailto:")) {
      window.location.href = href;
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  const handleInstagramClick = (e) => {
    e.preventDefault();
    const finalUrl = `${shareUrlBase}${shareUrlBase.includes("?") ? "&" : "?"}utm_source=instagram`;
    navigator.clipboard.writeText(finalUrl).then(() => {
      toast("🔗 Instagram share link copied!", "success");
      trackShareAction(listing.id, "instagram", currentUserId);
    });
  };

  // Keyboard navigation accessibility helper
  const handleItemKeyDown = (e, callback) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      callback(e);
    }
  };

  const targets = [
    {
      name: "WhatsApp",
      icon: "💬",
      color: "#25D366",
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage + "\n\nLink: " + shareUrlBase + "&utm_source=whatsapp")}`,
      platform: "whatsapp"
    },
    {
      name: "Telegram",
      icon: "✈️",
      color: "#0088cc",
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrlBase + (shareUrlBase.includes("?") ? "&" : "?") + "utm_source=telegram")}&text=${encodeURIComponent(textMessage)}`,
      platform: "telegram"
    },
    {
      name: "LinkedIn",
      icon: "💼",
      color: "#0a66c2",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrlBase + (shareUrlBase.includes("?") ? "&" : "?") + "utm_source=linkedin")}`,
      platform: "linkedin"
    },
    {
      name: "Facebook",
      icon: "👥",
      color: "#1877f2",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrlBase + (shareUrlBase.includes("?") ? "&" : "?") + "utm_source=facebook")}`,
      platform: "facebook"
    },
    {
      name: "X (Twitter)",
      icon: "𝕏",
      color: "#000000",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(textMessage)}&url=${encodeURIComponent(shareUrlBase + (shareUrlBase.includes("?") ? "&" : "?") + "utm_source=twitter")}`,
      platform: "twitter"
    },
    {
      name: "Email",
      icon: "✉️",
      color: "#ea4335",
      href: `mailto:?subject=${encodeURIComponent("CampusMart | " + listing.title)}&body=${encodeURIComponent(textMessage + "\n\nView listing: " + shareUrlBase + "&utm_source=email")}`,
      platform: "email"
    },
    {
      name: "Messages",
      icon: "📱",
      color: "#4cd964",
      href: `sms:?&body=${encodeURIComponent(textMessage + " " + shareUrlBase + "&utm_source=messages")}`,
      platform: "messages"
    },
    {
      name: "Instagram",
      icon: "📸",
      color: "#e1306c",
      href: "#",
      onClick: handleInstagramClick,
      platform: "instagram"
    }
  ];

  return (
    <div 
      className="share-modal-overlay" 
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div 
        className="share-modal-content" 
        ref={containerRef}
        style={{ position: "relative" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Share2 size={20} style={{ color: "var(--p)" }} />
            <h3 id="share-modal-title" style={{ margin: 0, fontWeight: 800, fontSize: "18px" }}>Share Listing</h3>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Close share modal"
            type="button"
            style={{ background: "none", border: "none", fontSize: "18px", color: "var(--muted)", cursor: "pointer", fontWeight: "bold", padding: "4px" }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px", marginTop: 0 }}>
          Rent or buy {listing.title} on CampusMart. Share this with other students!
        </p>

        {/* Copy Link Input Row */}
        <div style={{ display: "flex", gap: "8px", background: "var(--light)", borderRadius: "var(--r-md)", padding: "6px 8px 6px 12px", border: "1px solid var(--bdr)", alignItems: "center", marginBottom: "20px" }}>
          <Link size={16} style={{ color: "var(--muted-2)", flexShrink: 0 }} />
          <input 
            type="text" 
            readOnly 
            value={shareUrlBase} 
            aria-label="Listing share link"
            style={{ border: "none", background: "transparent", fontSize: "13px", color: "var(--txt-2)", width: "100%", outline: "none", textOverflow: "ellipsis" }}
            onClick={handleCopyLink}
          />
          <button 
            onClick={handleCopyLink} 
            aria-label="Copy listing link to clipboard"
            type="button"
            style={{ 
              display: "inline-flex", alignItems: "center", gap: "4px", background: copied ? "var(--grn)" : "var(--p)", 
              color: "#fff", border: "none", padding: "6px 12px", borderRadius: "var(--r-sm)", 
              fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" 
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Share Target Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px 6px" }}>
          {targets.map((t, idx) => (
            <a 
              key={idx}
              href={t.href}
              onClick={t.onClick ? t.onClick : () => handleShareClick(t.platform, t.href)}
              onKeyDown={(e) => handleItemKeyDown(e, t.onClick ? t.onClick : () => handleShareClick(t.platform, t.href))}
              role="button"
              tabIndex={0}
              aria-label={`Share on ${t.name}`}
              style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center"
              }}
              className="share-grid-item"
            >
              <div 
                style={{ 
                  background: `${t.color}15`, 
                  border: `1.5px solid ${t.color}35`
                }}
                className="share-icon-circle"
              >
                {t.icon}
              </div>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--txt-2)", textAlign: "center", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", width: "100%" }}>
                {t.name}
              </span>
            </a>
          ))}
        </div>

      </div>
    </div>
  );
}
