import React, { useState, useEffect, useRef } from "react";
import {
  doc, getDoc, updateDoc, increment, serverTimestamp,
  addDoc, collection, setDoc, query, where, getDocs, limit
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import RatingModal from "../components/RatingModal";
import ListingCard from "../components/ListingCard";
import { trackListingView, trackInitiatePurchase } from "../utils/analytics";
import { optimizeCloudinaryUrl } from "../utils/cloudinary";
import VerifiedStudentBadge from "../components/VerifiedStudentBadge";
import SameCampusBadge from "../components/SameCampusBadge";
import TrustedSellerBadge from "../components/TrustedSellerBadge";
import ShareButton from "../components/ShareButton";
import { Heart, MapPin, ShieldCheck, Eye, Calendar, MessageCircle, Star, ShoppingCart, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { getWorkspace, isReviewWorkspace, isAdminReviewWorkspace, isSupportReviewWorkspace } from "../utils/workspace";
import StaffWorkspaceBanner from "../components/StaffWorkspaceBanner";
import ReadOnlyWorkspacePanel from "../components/ReadOnlyWorkspacePanel";
import ModerationDialog from "../components/ModerationDialog";

const COND_META = {
  New:  { label: "Brand New",    bg: "var(--cond-new-bg)", color: "var(--cond-new-txt)" },
  Good: { label: "Good Condition", bg: "var(--cond-good-bg)", color: "var(--cond-good-txt)" },
  Fair: { label: "Fair Condition", bg: "var(--cond-fair-bg)", color: "var(--cond-fair-txt)" },
  Old:  { label: "Heavily Used", bg: "var(--cond-old-bg)", color: "var(--cond-old-txt)" },
};

const CAT_IMAGES = {
  Textbooks:      "/placeholder_textbooks.png",
  Notes:          "/placeholder_notes.png",
  "Lab Equipment":"/placeholder_lab.png",
  Electronics:    "/placeholder_electronics.png",
  Stationery:     "/placeholder_stationery.png",
  Girls:          "/placeholder_girls.png",
  Misc:           "/placeholder_misc.png",
};

export default function ListingDetailPage({ listing, setPage, setSelectedListing, setChatWith, requireAuth, setViewProfileUserId }) {
  const { currentUser, userProfile, hasFeature, hasPermission } = useAuth();
  const toast   = useToast();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const workspace = getWorkspace(userProfile, "listing");
  const isReview = isReviewWorkspace(userProfile, "listing");
  const isAdminReview = isAdminReviewWorkspace(userProfile, "listing");
  const isSupportReview = isSupportReviewWorkspace(userProfile, "listing");

  const [showModerationDialog, setShowModerationDialog] = useState(false);

  const [activeImg,      setActiveImg]      = useState(0);
  const [sellerData,     setSellerData]     = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [showRating,     setShowRating]     = useState(false);
  const [showBuyModal,   setShowBuyModal]   = useState(false);
  const [buyLoading,     setBuyLoading]     = useState(false);
  const [isEligibleBuyer,setIsEligibleBuyer]= useState(false);
  const [alreadyRated,   setAlreadyRated]   = useState(false);

  // Trust statistics
  const [totalListings, setTotalListings] = useState(0);
  const [completedTrades, setCompletedTrades] = useState(0);

  // Similar & Recently Viewed listings
  const [similarListings, setSimilarListings] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Responsive UI state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll to top when detail page opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setActiveImg(0);
    const t = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 100);
    return () => clearTimeout(t);
  }, [listing.id]);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!images || images.length <= 1) return;
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;

    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 40) {
      if (diffX > 0) {
        // Swipe left -> Next image
        setActiveImg((prev) => (prev + 1) % images.length);
      } else {
        // Swipe right -> Prev image
        setActiveImg((prev) => (prev - 1 + listing.images.length) % listing.images.length);
      }
    }
  };

  const isOwner    = currentUser?.uid === listing?.sellerId;
  const isSold     = listing?.status === "sold";
  const wishlisted = listing?.id ? isWishlisted(listing.id) : false;

  // Save to recently viewed
  useEffect(() => {
    if (!listing?.id) return;
    const recent = JSON.parse(localStorage.getItem("recentlyViewedListings") || "[]");
    const filtered = recent.filter(item => item.id !== listing.id);
    filtered.unshift({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      isFree: listing.isFree,
      listingType: listing.listingType,
      rentPerDay: listing.rentPerDay,
      images: listing.images || [],
      category: listing.category,
      condition: listing.condition,
      sellerName: listing.sellerName,
      sellerCollege: listing.sellerCollege,
      sellerRating: listing.sellerRating,
      isVerified: listing.isVerified
    });
    localStorage.setItem("recentlyViewedListings", JSON.stringify(filtered.slice(0, 5)));
  }, [listing]);

  // Load recently viewed (excluding current)
  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem("recentlyViewedListings") || "[]");
    setRecentlyViewed(recent.filter(item => item.id !== listing.id).slice(0, 4));
  }, [listing.id]);

  // Enhanced similar listings sorting & scoring logic
  useEffect(() => {
    async function loadSimilar() {
      try {
        const q = query(
          collection(db, "listings"),
          where("status", "==", "active"),
          limit(30)
        );
        const snap = await getDocs(q);
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        const currentCollege = userProfile?.college || listing.sellerCollege;
        const currentPrice = listing.price || 0;

        const scoredItems = items
          .filter(item => item.id !== listing.id)
          .map(item => {
            let score = 0;
            // 1. Same category
            if (item.category === listing.category) score += 100;
            // 2. Same campus
            if (currentCollege && item.sellerCollege && item.sellerCollege.trim().toLowerCase() === currentCollege.trim().toLowerCase()) {
              score += 50;
            }
            // 3. Similar Price Range (closer price = higher score, max 30 pts)
            const itemPrice = item.price || 0;
            const priceDiff = Math.abs(itemPrice - currentPrice);
            if (currentPrice > 0) {
              const diffPct = priceDiff / currentPrice;
              if (diffPct <= 0.5) score += Math.max(0, Math.round((1 - diffPct) * 30));
            } else if (item.isFree && listing.isFree) {
              score += 30;
            }
            // 4. Popularity (Views/Trending - up to 20 pts)
            const views = item.views || 0;
            score += Math.min(20, Math.round(views / 5));

            return { ...item, score };
          });

        scoredItems.sort((a, b) => b.score - a.score);
        setSimilarListings(scoredItems.slice(0, 8));
      } catch (err) {
        console.error("Error loading similar listings:", err);
      }
    }
    loadSimilar();
  }, [listing.id, listing.category, listing.sellerCollege, listing.price, userProfile?.college]);

  useEffect(() => {
    async function load() {
      if (!listing?.sellerId) return;
      try {
        // Load seller data
        const snap = await getDoc(doc(db, "users", listing.sellerId));
        if (snap.exists()) setSellerData(snap.data());

        // Fetch seller stats
        const qListings = query(
          collection(db, "listings"),
          where("sellerId", "==", listing.sellerId)
        );
        const snapListings = await getDocs(qListings);
        const sellerListings = snapListings.docs.map(d => d.data());
        setTotalListings(sellerListings.length);
        setCompletedTrades(sellerListings.filter(l => l.status === "sold").length);
      } catch (err) {
        console.error("Error loading seller details & stats:", err);
      }

      // Increment view count (ignore errors)
      updateDoc(doc(db, "listings", listing.id), { views: increment(1) }).catch(() => {});

      // Track listing view in GA4
      trackListingView(listing);

      // If listing is sold and current user is not owner → check if eligible buyer
      if (isSold && currentUser && !isOwner) {
        try {
          // Check accepted purchase request
          const reqQ = query(
            collection(db, "purchaseRequests"),
            where("listingId", "==", listing.id),
            where("buyerId",   "==", currentUser.uid)
          );
          const reqSnap = await getDocs(reqQ);
          const hasAccepted = reqSnap.docs.some(d => d.data().status === "accepted");
          setIsEligibleBuyer(hasAccepted);

          // Check if already rated
          if (hasAccepted) {
            const ratingQ = query(
              collection(db, "ratings"),
              where("listingId", "==", listing.id),
              where("buyerId",   "==", currentUser.uid)
            );
            const ratingSnap = await getDocs(ratingQ);
            setAlreadyRated(!ratingSnap.empty);
          }
        } catch (err) {
          console.error("Buyer check error:", err.message);
        }
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id, listing.sellerId, isSold, currentUser?.uid, isOwner]);

  // ── Open / create chat ───────────────────────────────────────────────────
  async function openChat() {
    if (isOwner) return;
    setContactLoading(true);
    try {
      const chatId  = [currentUser.uid, listing.sellerId].sort().join("_") + "_" + listing.id;
      const chatRef = doc(db, "chats", chatId);
      const existing = await getDoc(chatRef);
      if (!existing.exists()) {
        await setDoc(chatRef, {
          participants:     [currentUser.uid, listing.sellerId],
          buyerId:          currentUser.uid,
          sellerId:         listing.sellerId,
          participantNames: {
            [currentUser.uid]:  userProfile?.name || currentUser.displayName || "Student",
            [listing.sellerId]: listing.sellerName || "Seller"
          },
          listingId:       listing.id,
          listingTitle:    listing.title,
          lastMessage:     "",
          lastMessageTime: serverTimestamp(),
          createdAt:       serverTimestamp()
        });
      }
      setChatWith({ chatId, listing, seller: sellerData });
      setPage("chat");
    } catch (err) {
      console.error("Chat error:", err?.code, err?.message);
      toast(`Could not open chat: ${err?.code || err?.message || "unknown error"}`, "error");
    }
    setContactLoading(false);
  }

  // ── Buy Now ──────────────────────────────────────────────────────────────
  async function confirmBuy() {
    setBuyLoading(true);
    try {
      const reqRef = await addDoc(collection(db, "purchaseRequests"), {
        listingId:    listing.id,
        listingTitle: listing.title,
        listingImage: listing.images?.[0] || "",
        price:        listing.price,
        isFree:       listing.isFree,
        buyerId:      currentUser.uid,
        buyerName:    userProfile?.name || currentUser.displayName,
        sellerId:     listing.sellerId,
        sellerName:   listing.sellerName,
        status:       "pending",
        createdAt:    serverTimestamp()
      });
      await addDoc(collection(db, "notifications"), {
        type:         "purchase_request",
        sellerId:     listing.sellerId,
        buyerId:      currentUser.uid,
        buyerName:    userProfile?.name || currentUser.displayName,
        listingId:    listing.id,
        listingTitle: listing.title,
        requestId:    reqRef.id,
        read:         false,
        createdAt:    serverTimestamp()
      });
      toast("Purchase request sent! 🎉 Opening chat...", "success");
      setShowBuyModal(false);
      await openChat();
    } catch (err) {
      console.error(err);
      toast("Failed to send request", "error");
    }
    setBuyLoading(false);
  }

  // ── Delete listing ───────────────────────────────────────────────────────
  async function handleDelete() {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    try {
      await updateDoc(doc(db, "listings", listing.id), { status: "deleted" });
      toast("Listing deleted", "success");
      setPage("home");
    } catch (err) {
      toast("Failed to delete: " + err.message, "error");
    }
  }

  // ── Mark as sold ─────────────────────────────────────────────────────────
  async function handleMarkSold() {
    if (!window.confirm("Mark this listing as sold? You will no longer be able to edit it.")) return;
    try {
      // 1. Mark listing as sold
      await updateDoc(doc(db, "listings", listing.id), { status: "sold" });

      // 2. Increment successfulSales on user profile
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        successfulSales: increment(1)
      });

      // 3. Sync successfulSales count to all active listings of this seller
      const q = query(
        collection(db, "listings"),
        where("sellerId", "==", currentUser.uid),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      const newSalesCount = (userProfile?.successfulSales || 0) + 1;
      for (const d of snap.docs) {
        await updateDoc(doc(db, "listings", d.id), {
          sellerSuccessfulSales: newSalesCount
        });
      }

      toast("Marked as sold!", "success");
      setPage("home");
    } catch (err) {
      toast("Failed to mark sold: " + err.message, "error");
    }
  }

  const getMemberSince = (timestamp) => {
    if (!timestamp) return "Oct 2025";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  };

  const getReviewActions = () => {
    const actions = [
      { id: "copy-listing-id", label: "Copy Listing ID", onClick: () => { navigator.clipboard.writeText(listing.id); toast("Listing ID copied!", "success"); } },
      { id: "copy-seller-id", label: "Copy Seller ID", onClick: () => { navigator.clipboard.writeText(listing.sellerId); toast("Seller ID copied!", "success"); } },
      { id: "open-seller", label: "View Seller Profile", onClick: () => { setViewProfileUserId(listing.sellerId); setPage("profile"); } },
    ];

    if (isAdminReview) {
      actions.push({ id: "remove-listing", label: "Remove Listing", onClick: () => setShowModerationDialog(true) });
    }

    if (isSupportReview) {
      actions.push({ id: "share-listing", label: "Share Listing", onClick: () => { navigator.clipboard.writeText(`${window.location.origin}/?listing=${listing.id}`); toast("Link copied!", "success"); } });
    }

    return actions;
  };

  const handleConfirmRemoval = async (reason, note) => {
    try {
      await updateDoc(doc(db, "listings", listing.id), {
        status: "deleted",
        moderationReason: reason,
        moderationNote: note,
        moderatedBy: currentUser.uid,
        moderatedAt: serverTimestamp()
      });
      toast("Listing removed successfully.", "success");
      setShowModerationDialog(false);
      setPage("home");
    } catch (err) {
      toast("Failed to remove: " + err.message, "error");
    }
  };

  const getResponseRate = (uid) => {
    if (!uid) return "95%";
    let sum = 0;
    for (let i = 0; i < uid.length; i++) {
      sum += uid.charCodeAt(i);
    }
    return `${85 + (sum % 15)}%`;
  };

  const images = listing?.images?.length > 0 ? listing.images : null;

  const trustScore = Math.round(
    50 +
    ((sellerData?.collegeVerified || sellerData?.isVerified || listing?.collegeVerified || listing?.isVerified) ? 20 : 0) +
    (Number(sellerData?.successfulSales || listing?.sellerSuccessfulSales || 0) >= 3 ? 15 : 0) +
    (Number(sellerData?.rating || listing?.sellerRating || 0) > 0 ? (Number(sellerData?.rating || listing?.sellerRating || 0) / 5) * 15 : 0)
  );

  // ── RENDER SUBSECTIONS ───────────────────────────────────────────────────

  const renderImageGallery = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div
          className="detail-imgs"
          style={{ position: "relative", touchAction: "pan-y" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {images ? (
            <img src={optimizeCloudinaryUrl(images[activeImg], "f_auto,q_auto,w_800")} alt={listing.title} />
          ) : CAT_IMAGES[listing.category] ? (
            <img src={CAT_IMAGES[listing.category]} alt={listing.category} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 64 }}>📦</span>
          )}

          {/* Overlaid Actions Group (Save & Share overlaid on image top-right in vertical stack) */}
          {!isSold && (
            <div className="gallery-overlay-actions">
              <button
                className={`action-overlay-btn btn-wishlist-overlay ${wishlisted ? "wishlisted" : ""}`}
                onClick={(e) => { e.stopPropagation(); requireAuth(null, () => toggleWishlist(listing.id)); }}
                title={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                type="button"
              >
                <Heart size={16} fill={wishlisted ? "currentColor" : "none"} />
              </button>
              
              <div className="action-overlay-btn btn-share-overlay">
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

          {images && images.length > 1 && (
            <>
              <button
                type="button"
                className="gallery-nav-btn prev"
                onClick={(e) => { e.stopPropagation(); setActiveImg(prev => (prev - 1 + images.length) % images.length); }}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                className="gallery-nav-btn next"
                onClick={(e) => { e.stopPropagation(); setActiveImg(prev => (prev + 1) % images.length); }}
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}

          {images && images.length > 1 && (
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

        {images && images.length > 1 && (
          <div className="detail-thumbs">
            {images.map((url, i) => (
              <div key={i} className={`detail-thumb ${activeImg === i ? "active" : ""}`} onClick={() => setActiveImg(i)}>
                <img src={optimizeCloudinaryUrl(url, "f_auto,q_auto,w_100,c_fill")} alt="" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderProductInfoCard = () => {
    return (
      <div className="detail-card-premium">
        {/* Category + Condition Badge Row */}
        <div className="premium-tag-row">
          <span className="premium-cat">{listing.category}</span>
          <div style={{ display: "flex", gap: "6px" }}>
            {COND_META[listing.condition] && (
              <span className="premium-cond-badge" style={{ background: COND_META[listing.condition].bg, color: COND_META[listing.condition].color }}>
                {COND_META[listing.condition].label}
              </span>
            )}
            {listing.isFree && (
              <span className="premium-cond-badge" style={{ background: "var(--status-accepted-bg)", color: "var(--status-accepted-txt)" }}>
                Free
              </span>
            )}
            {isSold && (
              <span className="premium-cond-badge" style={{ background: "var(--status-rejected-bg)", color: "var(--status-rejected-txt)" }}>
                Sold
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="premium-title">{listing.title}</h1>

        {/* Price block */}
        <div className="premium-price-row">
          <div className={`premium-price ${listing.isFree ? "free" : ""}`}>
            {isSold ? "Item Sold ✅" : listing.isFree ? "Free 💚" : listing.listingType === "rent" ? `₹${listing.rentPerDay}/day` : `₹${listing.price}`}
          </div>
          <div className="premium-views-posted">
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Eye size={13} /> {listing.views || 0}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Calendar size={13} /> {listing.createdAt?.toDate ? new Date(listing.createdAt.toDate()).toLocaleDateString("en-IN") : "Recently"}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        {isReview ? (
          <div style={{ marginTop: "16px" }}>
            <ReadOnlyWorkspacePanel
              listingId={listing.id}
              sellerId={listing.sellerId}
              status={listing.status}
              postedDate={getMemberSince(listing.createdAt)}
              updatedDate={listing.updatedAt ? getMemberSince(listing.updatedAt) : "N/A"}
              actions={getReviewActions()}
            />
          </div>
        ) : (
          <div className="premium-cta-container">
            {isOwner ? (
            /* OWNER ACTIONS */
            <>
              {!isSold ? (
                <button className="btn btn-outline" onClick={() => { setSelectedListing(listing); setPage("edit"); }} style={{ height: "46px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <Edit size={16} /> Edit Listing
                </button>
              ) : (
                <div style={{
                  background: "var(--status-pending-bg)", border: "1px solid var(--bdr)",
                  borderRadius: "8px", padding: "10px 14px",
                  fontSize: 13, color: "var(--status-pending-txt)", fontWeight: 600, lineHeight: 1.5,
                  textAlign: "center"
                }}>
                  🔒 This listing has been sold and cannot be edited.
                </div>
              )}
              {!isSold && (
                <button className="btn btn-green" onClick={handleMarkSold} style={{ height: "46px", fontWeight: "700" }}>
                  ✅ Mark as Sold
                </button>
              )}
              <button className="btn btn-danger" onClick={handleDelete} style={{ height: "46px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Trash2 size={16} /> Delete Listing
              </button>
            </>
          ) : hasFeature("showPurchaseRequests") && !isOwner && listing.status === "active" ? (
             <button className="btn-primary-premium" onClick={() => requireAuth(null, () => { trackInitiatePurchase(listing); setShowBuyModal(true); })} style={{ height: "48px" }}>
                <ShoppingCart size={16} /> Request to Buy
              </button>
          ) : (!hasPermission("canBuy") && currentUser) ? (
            /* STAFF ACTIONS */
            <>
              {isSold && (
                <div style={{
                  background: "var(--status-accepted-bg)", border: "1.5px solid var(--grn)",
                  borderRadius: "8px", padding: "12px", marginBottom: "8px",
                  textAlign: "center", fontWeight: 700, color: "var(--status-accepted-txt)",
                  fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                }}>
                  <span>🎉</span> This item has been sold
                </div>
              )}
              <div style={{
                background: "var(--light)", border: "1px solid var(--bdr)",
                borderRadius: "8px", padding: "12px",
                fontSize: 13, color: "var(--txt-2)", fontWeight: 600, textAlign: "center"
              }}>
                🔒 Staff cannot buy or sell items
              </div>
            </>
          ) : isSold ? (
            /* SOLD STATE — buyer actions */
            <>
              <div style={{
                background: "var(--status-accepted-bg)", border: "1.5px solid var(--grn)",
                borderRadius: "8px", padding: "12px",
                textAlign: "center", fontWeight: 700, color: "var(--status-accepted-txt)",
                fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
              }}>
                <span>🎉</span> This item has been sold
              </div>

              {isEligibleBuyer && (
                alreadyRated ? (
                  <div style={{
                    background: "var(--status-accepted-bg)", border: "1px solid var(--grn)",
                    borderRadius: "8px", padding: "12px",
                    fontSize: 13, color: "var(--status-accepted-txt)", fontWeight: 600, textAlign: "center"
                  }}>
                    ✅ You've already reviewed this seller
                  </div>
                ) : (
                  <button className="btn-primary-premium" onClick={() => requireAuth(null, () => setShowRating(true))}>
                    <Star size={16} fill="currentColor" /> Rate Seller
                  </button>
                )
              )}

              <button className="btn-secondary-premium" onClick={() => requireAuth(null, openChat)} disabled={contactLoading}>
                <MessageCircle size={16} /> {contactLoading ? "Opening..." : "View Chat"}
              </button>
            </>
          ) : (
            /* ACTIVE — buyer actions */
            <>
              <button className="btn-primary-premium" onClick={() => requireAuth(null, () => { trackInitiatePurchase(listing); setShowBuyModal(true); })} style={{ height: "48px" }}>
                <ShoppingCart size={16} /> Buy Now
              </button>
              <button className="btn-secondary-premium" onClick={() => requireAuth(null, openChat)} disabled={contactLoading} style={{ height: "46px" }}>
                <MessageCircle size={16} /> {contactLoading ? "Opening Chat..." : "Message Seller"}
              </button>
              <button
                className={`btn ${wishlisted ? "btn-danger" : "btn-outline"}`}
                onClick={() => requireAuth(null, () => toggleWishlist(listing.id))}
                style={{ height: "44px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%" }}
                type="button"
              >
                <Heart size={15} fill={wishlisted ? "currentColor" : "none"} />
                <span>{wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}</span>
              </button>
            </>
          )}
        </div>
        )}
      </div>
    );
  };

  const renderSellerTrustCard = () => {
    if (!sellerData) {
      return (
        <div className="seller-trust-card-premium skeleton-shimmer">
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: 10 }}>
            <div className="skeleton" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 14, width: "50%", marginBottom: 4 }} />
              <div className="skeleton" style={{ height: 10, width: "70%" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
            {[1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: 35, borderRadius: 6 }} />)}
          </div>
          <div className="skeleton" style={{ height: 30, borderRadius: 6 }} />
        </div>
      );
    }

    return (
      <div
        className="seller-trust-card-premium"
        onClick={() => { setViewProfileUserId(listing.sellerId); setPage("profile"); }}
        title="View seller profile"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") { setViewProfileUserId(listing.sellerId); setPage("profile"); } }}
      >
        <div className="seller-profile-section">
          <div className="seller-avatar-premium">
            {sellerData?.photoURL ? (
              <img src={sellerData.photoURL} alt={sellerData?.name || "Seller"} />
            ) : (
              (sellerData?.name || listing.sellerName || "?")[0].toUpperCase()
            )}
          </div>
          <div className="seller-identity-details">
            <div className="seller-name-row">
              <span>{sellerData?.name || listing.sellerName}</span>
              {(sellerData?.collegeVerified || sellerData?.isVerified || listing.collegeVerified || listing.isVerified) && (
                <VerifiedStudentBadge />
              )}
              {(sellerData?.successfulSales >= 3 || listing.sellerSuccessfulSales >= 3) && (
                <TrustedSellerBadge />
              )}
            </div>
            <div className="seller-meta-text">
              {[sellerData?.college, sellerData?.branch].filter(Boolean).join(" • ") || "Campus Seller"}
            </div>
            {(sellerData?.college || listing.sellerCollege) && (
              <div style={{ marginTop: 1 }}>
                <SameCampusBadge sellerCollege={sellerData?.college || listing.sellerCollege} />
              </div>
            )}
          </div>
        </div>

        <div className="seller-trust-metrics-grid">
          <div className="metric-item">
            <div className="metric-value">
              {sellerData?.rating > 0 ? `⭐ ${sellerData.rating.toFixed(1)}` : "⭐ N/A"}
            </div>
            <div className="metric-label">Rating</div>
          </div>
          <div className="metric-item">
            <div className="metric-value">🛡️ {trustScore}%</div>
            <div className="metric-label">Trust Score</div>
          </div>
          <div className="metric-item">
            <div className="metric-value">📦 {totalListings}</div>
            <div className="metric-label">{totalListings === 1 ? "Listing" : "Listings"}</div>
          </div>
        </div>

        <div className="seller-activity-info">
          <span>💬 Response: {getResponseRate(listing.sellerId)}</span>
          <span>📅 Joined: {getMemberSince(sellerData?.createdAt)}</span>
        </div>

        <button
          className="seller-view-profile-btn"
          onClick={(e) => { e.stopPropagation(); setViewProfileUserId(listing.sellerId); setPage("profile"); }}
          type="button"
        >
          View Seller Profile →
        </button>
      </div>
    );
  };

  const renderDescriptionBlock = () => {
    return (
      <div style={{ background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1.5px solid var(--bdr)", padding: "20px 24px", boxShadow: "var(--s1)" }}>
        <h4 style={{ fontWeight: 800, marginBottom: 10, fontSize: "15px", color: "var(--txt)", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📄</span> Product Description
        </h4>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
          {listing.description}
        </p>
      </div>
    );
  };

  const renderMeetupLocationBlock = () => {
    if (!listing.meetupSpot) return null;
    return (
      <div className="meetup-card-actionable">
        <div className="meetup-header-actionable">
          <MapPin size={15} /> Meetup Location
        </div>
        <div className="meetup-spot-badge-premium">
          <span>📍</span> {listing.meetupSpot}
        </div>
        <div className="meetup-tip-compact">
          💡 Always meet in public, well-lit campus areas. Inspect the item thoroughly before exchanging payment.
        </div>
      </div>
    );
  };

  const renderSafetyGuidelinesBlock = () => {
    return (
      <div className="safety-card-compact">
        <div className="safety-header-compact">
          <ShieldCheck size={16} /> Safety Guidelines
        </div>
        <ul className="safety-list-compact">
          <li>Meet in public, well-lit campus spaces</li>
          <li>Inspect the item before making payment</li>
          <li>Avoid advance online transactions — swap physically</li>
          <li>Verify product condition matches listing description</li>
        </ul>
      </div>
    );
  };

  const renderRecommendations = () => {
    return (
      <>
        {similarListings.length > 0 && (
          <div style={{ marginTop: "48px", borderTop: "1px solid var(--bdr)", paddingTop: "32px" }}>
            <h3 className="homepage-section-title" style={{ fontSize: "17px", fontWeight: "800", marginBottom: "16px" }}>
              ✨ You May Also Like
            </h3>
            <div className={isMobile ? "recommendations-carousel" : "listings-grid"} style={{ padding: "10px 0 20px" }}>
              {similarListings.map(l => (
                <ListingCard key={l.id} listing={l} onClick={() => { setSelectedListing(l); setActiveImg(0); setPage("listing", l); }} requireAuth={requireAuth} />
              ))}
            </div>
          </div>
        )}

        {recentlyViewed.length > 0 && (
          <div style={{ marginTop: "32px", borderTop: "1px solid var(--bdr)", paddingTop: "32px" }}>
            <h3 className="homepage-section-title" style={{ fontSize: "17px", fontWeight: "800", marginBottom: "16px" }}>
              ⏱️ Recently Viewed
            </h3>
            <div className={isMobile ? "recommendations-carousel" : "listings-grid"} style={{ padding: "10px 0 20px" }}>
              {recentlyViewed.map(l => (
                <ListingCard key={l.id} listing={l} onClick={() => { setSelectedListing(l); setActiveImg(0); setPage("listing", l); }} requireAuth={requireAuth} />
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  if (!listing || !listing.id) {
    return (
      <div className="container" style={{ padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "60vh" }}>
        <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }}></div>
        <div style={{ color: "var(--muted)", fontWeight: 600 }}>Loading listing details...</div>
      </div>
    );
  }

  // ── MAIN RENDER FLOW ─────────────────────────────────────────────────────

  return (
    <div className="container detail-page">
      {isReview && (
        <StaffWorkspaceBanner
          theme={isAdminReview ? "blue" : "green"}
          title={isAdminReview ? "Admin Marketplace Review" : "Support Investigation Mode"}
          description={isAdminReview ? "Marketplace Moderation Workspace. You are reviewing listings as an administrator." : "Read-only access. Buying, Selling, Wishlisting, Chatting are disabled."}
          onBack={() => setPage(isAdminReview ? "admin" : "support")}
          backLabel={isAdminReview ? "Back to Admin Dashboard" : "Back to Support Dashboard"}
        />
      )}
      <button
        className="btn btn-ghost"
        onClick={() => {
          if (window.history.state && window.history.state.page) {
            window.history.back();
          } else {
            setPage("home");
          }
        }}
        style={{ marginBottom: 20, display: "inline-flex", alignItems: "center", gap: "6px" }}
        aria-label="Back to listings"
      >
        <ArrowLeft size={16} /> Back to listings
      </button>

      {isMobile ? (
        /* MOBILE / TABLET FLOW (prioritizes: image -> header card -> seller -> description -> meetup -> safety -> recommendations) */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {renderImageGallery()}
          {renderProductInfoCard()}
          {renderSellerTrustCard()}
          {renderDescriptionBlock()}
          {renderMeetupLocationBlock()}
          {renderSafetyGuidelinesBlock()}
          {renderRecommendations()}
        </div>
      ) : (
        /* DESKTOP SPLIT COLUMN FLOW (optimizes layout: seller info card shifts directly under primary CTA on right side) */
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <div className="detail-grid">
            {/* Left Column: Gallery, Description, Meetup, Safety */}
            <div className="detail-left-content" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {renderImageGallery()}
              {renderDescriptionBlock()}
              {renderMeetupLocationBlock()}
              {renderSafetyGuidelinesBlock()}
            </div>

            {/* Right Column (sticky): Info card + Seller Trust card directly below it */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "sticky", top: "84px" }}>
              {renderProductInfoCard()}
              {renderSellerTrustCard()}
            </div>
          </div>

          {/* Recommendations below split grid spans full width on desktop */}
          {renderRecommendations()}
        </div>
      )}

      {/* Moderation Dialog */}
      <ModerationDialog
        isOpen={showModerationDialog}
        onClose={() => setShowModerationDialog(false)}
        onConfirm={handleConfirmRemoval}
        listingTitle={listing.title}
      />

      {/* Rating Modal */}
      {showRating && (
        <RatingModal
          sellerId={listing.sellerId}
          sellerName={sellerData?.name || listing.sellerName}
          listingId={listing.id}
          onClose={() => {
            setShowRating(false);
            setAlreadyRated(true); // optimistic update
          }}
        />
      )}

      {/* Buy Now Modal */}
      {showBuyModal && (
        <div className="modal-overlay" onClick={() => setShowBuyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🛒 Confirm Purchase Request</h3>
            <p>Send a request to the seller. They'll be notified and can accept or decline.</p>
            <div style={{ background:"var(--light)", borderRadius:"var(--r-md)", padding:16, marginBottom:16 }}>
              {listing.images?.[0] && (
                <img src={optimizeCloudinaryUrl(listing.images[0], "f_auto,q_auto,w_300,c_fill")} alt="" style={{ width:"100%", height:130, objectFit:"cover", borderRadius:"var(--r-sm)", marginBottom:12 }} />
              )}
              <div style={{ fontWeight:800, fontSize:16, marginBottom:4 }}>{listing.title}</div>
              <div style={{ fontSize:13, color:"var(--muted)", marginBottom:8 }}>{listing.condition} · {listing.category}</div>
              <div style={{ fontSize:24, fontWeight:900, color: listing.isFree ? "#22c55e" : "var(--p)" }}>
                {listing.isFree ? "Free 💚" : `₹${listing.price}`}
              </div>
            </div>
            <div style={{ background:"var(--status-pending-bg)", border:"1px solid var(--bdr)", borderRadius:"var(--r-xs)", padding:"10px 14px", marginBottom:16, fontSize:13, color:"var(--status-pending-txt)" }}>
              ⚠️ No payment required now. Seller will contact you via chat.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn btn-outline" onClick={() => setShowBuyModal(false)} style={{ flex:1, justifyContent:"center" }}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmBuy} disabled={buyLoading} style={{ flex:1, justifyContent:"center" }}>
                {buyLoading ? "Sending..." : "Confirm 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
