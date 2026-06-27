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
import ImageGallery from "../components/ImageGallery/ImageGallery";
import { Heart, MapPin, ShieldCheck, Eye, Calendar, MessageCircle, Star, ShoppingCart, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { getWorkspace, isReviewWorkspace, isAdminReviewWorkspace, isSupportReviewWorkspace } from "../utils/workspace";
import StaffWorkspaceBanner from "../components/StaffWorkspaceBanner";
import ReadOnlyWorkspacePanel from "../components/ReadOnlyWorkspacePanel";
import ModerationDialog from "../components/ModerationDialog";
import ReportSellerModal from "../components/ReportSellerModal";
import { usePurchaseRequest } from "../hooks/usePurchaseRequest";
import { transactionService } from "../services/transactionService";
import { LISTING_STATUS } from "../constants/listingStatus";
import { REQUEST_STATUS } from "../constants/requestStatus";

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
  
  const { request: purchaseRequest, loading: reqLoading } = usePurchaseRequest(currentUser?.uid, listing?.id);
  const [showReportModal, setShowReportModal] = useState(false);

  const workspace = getWorkspace(userProfile, "listing");
  const isReview = isReviewWorkspace(userProfile, "listing");
  const isAdminReview = isAdminReviewWorkspace(userProfile, "listing");
  const isSupportReview = isSupportReviewWorkspace(userProfile, "listing");

  const [showModerationDialog, setShowModerationDialog] = useState(false);

  const [sellerData,     setSellerData]     = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [showRating,     setShowRating]     = useState(false);
  const [showBuyModal,   setShowBuyModal]   = useState(false);
  const [showReportSeller, setShowReportSeller] = useState(false);
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
    const t = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 100);
    return () => clearTimeout(t);
  }, [listing.id]);

  const isOwner    = currentUser?.uid === listing?.sellerId;
  const isSold     = listing?.status === "sold" || listing?.status === "exchanged";
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
          const hasExchanged = reqSnap.docs.some(d => d.data().status === "EXCHANGED");
          setIsEligibleBuyer(hasExchanged);

          // Check if already rated
          if (hasExchanged) {
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

        // Notify the seller that a new chat started
        await setDoc(doc(collection(db, "notifications")), {
          type: "NEW_CHAT",
          sellerId: listing.sellerId,
          buyerId: currentUser.uid,
          listingId: listing.id,
          listingTitle: listing.title,
          read: false,
          createdAt: serverTimestamp()
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
      await transactionService.createPurchaseRequest(
        currentUser.uid,
        userProfile?.name || currentUser.displayName || "Buyer",
        listing
      );
      toast("Purchase request sent! 🎉", "success");
      setShowBuyModal(false);
    } catch (err) {
      console.error(err);
      toast(err.message || "Failed to send request", "error");
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

  const trustScore = sellerData?.trustScore !== undefined 
    ? sellerData.trustScore 
    : Math.round(
        50 +
        ((sellerData?.collegeVerified || sellerData?.isVerified || listing?.collegeVerified || listing?.isVerified) ? 20 : 0) +
        (Number(sellerData?.successfulSales || listing?.sellerSuccessfulSales || 0) >= 3 ? 15 : 0) +
        (Number(sellerData?.rating || listing?.sellerRating || 0) > 0 ? (Number(sellerData?.rating || listing?.sellerRating || 0) / 5) * 15 : 0)
      );

  // ── RENDER SUBSECTIONS ───────────────────────────────────────────────────

  const renderImageGallery = () => {
    return (
      <ImageGallery
        images={images}
        category={listing.category}
        title={listing.title}
        isSold={isSold}
        wishlisted={wishlisted}
        onToggleWishlist={() => requireAuth(null, () => toggleWishlist(listing.id))}
        listing={listing}
        currentUser={currentUser}
      />
    );
  };

  const renderBuyerStatusCard = () => {
    if (isOwner || !purchaseRequest) return null;

    if (purchaseRequest.status === REQUEST_STATUS.PENDING) {
      return (
        <div style={{ background: "var(--status-pending-bg)", border: "1px solid var(--warn)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
          <div style={{ fontWeight: 800, color: "var(--status-pending-txt)", marginBottom: 4 }}>✓ Request Sent</div>
          <div style={{ fontSize: 13, color: "var(--muted-2)", lineHeight: 1.5 }}>Waiting for seller response.</div>
        </div>
      );
    }
    if (purchaseRequest.status === REQUEST_STATUS.ACCEPTED) {
      return (
        <div style={{ background: "var(--status-accepted-bg)", border: "1px solid var(--grn)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
          <div style={{ fontWeight: 800, color: "var(--status-accepted-txt)", marginBottom: 4 }}>✓ Request Accepted</div>
          <div style={{ fontSize: 13, color: "var(--status-accepted-txt)", lineHeight: 1.5 }}>Seller accepted your request.</div>
        </div>
      );
    }
    if (purchaseRequest.status === REQUEST_STATUS.DECLINED) {
      return (
        <div style={{ background: "var(--status-rejected-bg)", border: "1px solid var(--danger)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
          <div style={{ fontWeight: 800, color: "var(--status-rejected-txt)", marginBottom: 4 }}>Request Declined</div>
          <div style={{ fontSize: 13, color: "var(--status-rejected-txt)", lineHeight: 1.5 }}>Allow another request if business rules permit.</div>
        </div>
      );
    }
    if (purchaseRequest.status === REQUEST_STATUS.EXCHANGED) {
      return (
        <div style={{ background: "var(--status-accepted-bg)", border: "1px solid var(--grn)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
          <div style={{ fontWeight: 800, color: "var(--status-accepted-txt)", marginBottom: 4 }}>✓ Transaction Completed</div>
          <div style={{ fontSize: 13, color: "var(--status-accepted-txt)", lineHeight: 1.5 }}>You can now rate the seller.</div>
        </div>
      );
    }
    return null;
  };

  const renderProductInfoCard = () => {
    const availabilityMap = {
      [LISTING_STATUS.ACTIVE]: { label: "Available", bg: "var(--status-accepted-bg)", color: "var(--status-accepted-txt)" },
      [LISTING_STATUS.RESERVED]: { label: "Reserved", bg: "var(--status-pending-bg)", color: "var(--status-pending-txt)" },
      [LISTING_STATUS.SOLD]: { label: "Sold", bg: "var(--status-rejected-bg)", color: "var(--status-rejected-txt)" },
      [LISTING_STATUS.EXCHANGED]: { label: "Exchanged", bg: "var(--status-accepted-bg)", color: "var(--status-accepted-txt)" },
    };
    const statusObj = availabilityMap[listing.status] || availabilityMap[LISTING_STATUS.ACTIVE];

    return (
      <div className="detail-card-premium">
        {/* Category */}
        <div style={{ marginBottom: 8 }}>
          <span className="premium-cat">{listing.category}</span>
        </div>

        {/* Title */}
        <h1 className="premium-title" style={{ marginBottom: 12 }}>{listing.title}</h1>

        {/* Condition & Availability Row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          {COND_META[listing.condition] && (
            <span className="premium-cond-badge" style={{ background: COND_META[listing.condition].bg, color: COND_META[listing.condition].color }}>
              {COND_META[listing.condition].label}
            </span>
          )}
          <span className="premium-cond-badge" style={{ background: statusObj.bg, color: statusObj.color }}>
            {statusObj.label}
          </span>
        </div>

        {/* Price */}
        <div className="premium-price-row" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 16 }}>
          <div className={`premium-price ${listing.isFree ? "free" : ""}`}>
            {listing.isFree ? "Free 💚" : listing.listingType === "rent" ? `₹${listing.rentPerDay}/day` : `₹${listing.price}`}
          </div>
        </div>

        {/* Metadata Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "var(--light)", padding: "16px", borderRadius: "8px", marginBottom: "24px", fontSize: "13px" }}>
           <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
             <span style={{ color: "var(--muted)", fontWeight: 600 }}>Posted</span>
             <span style={{ color: "var(--txt)", fontWeight: 700 }}>{listing.createdAt?.toDate ? new Date(listing.createdAt.toDate()).toLocaleDateString("en-IN") : "Recently"}</span>
           </div>
           <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
             <span style={{ color: "var(--muted)", fontWeight: 600 }}>Category</span>
             <span style={{ color: "var(--txt)", fontWeight: 700 }}>{listing.category}</span>
           </div>
           <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
             <span style={{ color: "var(--muted)", fontWeight: 600 }}>Condition</span>
             <span style={{ color: "var(--txt)", fontWeight: 700 }}>{listing.condition}</span>
           </div>
           {listing.sellerCollege && (
             <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
               <span style={{ color: "var(--muted)", fontWeight: 600 }}>Campus</span>
               <span style={{ color: "var(--txt)", fontWeight: 700 }}>{listing.sellerCollege}</span>
             </div>
           )}
           <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
             <span style={{ color: "var(--muted)", fontWeight: 600 }}>Views</span>
             <span style={{ color: "var(--txt)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Eye size={14}/> {listing.views || 0}</span>
           </div>
        </div>

        {/* Buyer Request Status Card */}
        {renderBuyerStatusCard()}

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
              !isSold ? (
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
                  🔒 This listing is sold and locked from editing.
                </div>
              )
            ) : hasFeature("showPurchaseRequests") && !isOwner && listing.status === "active" ? (
              /* ACTIVE — buyer actions (always show full 3-button stack) */
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* 1. Request to Buy / ✓ Request Sent */}
                {purchaseRequest?.status === REQUEST_STATUS.PENDING ? (
                  <button className="btn-primary-premium" disabled style={{ height: "48px", opacity: 0.7 }}>
                    <ShoppingCart size={16} /> ✓ Request Sent
                  </button>
                ) : purchaseRequest?.status === REQUEST_STATUS.ACCEPTED ? (
                  <button className="btn-primary-premium" disabled style={{ height: "48px", opacity: 0.7 }}>
                    <ShoppingCart size={16} /> ✓ Accepted
                  </button>
                ) : (
                  <button className="btn-primary-premium" onClick={() => requireAuth(null, () => { trackInitiatePurchase(listing); setShowBuyModal(true); })} disabled={buyLoading} style={{ height: "48px" }}>
                    <ShoppingCart size={16} /> {buyLoading ? "Sending..." : "Request to Buy"}
                  </button>
                )}

                {/* 2. Wishlist — always visible */}
                <button
                  className="btn-outline"
                  onClick={() => {
                    if (isWishlisted(listing.id)) {
                      setPage("wishlist");
                    } else {
                      requireAuth(null, () => toggleWishlist(listing.id));
                    }
                  }}
                  style={{ height: "44px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%" }}
                  type="button"
                >
                  <Heart size={15} fill={isWishlisted(listing.id) ? "var(--danger)" : "none"} color={isWishlisted(listing.id) ? "var(--danger)" : "currentColor"} />
                  <span>{isWishlisted(listing.id) ? "View Wishlist" : "Add to Wishlist"}</span>
                </button>

                {/* 3. Chat — disabled until ACCEPTED, with helper text */}
                {purchaseRequest?.status === REQUEST_STATUS.ACCEPTED ? (
                  <button className="btn-secondary-premium" onClick={() => requireAuth(null, openChat)} disabled={contactLoading} style={{ height: "46px" }}>
                    <MessageCircle size={16} /> {contactLoading ? "Opening..." : "Continue Chat"}
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <button className="btn-secondary-premium" disabled style={{ height: "46px", width: "100%" }}>
                      <MessageCircle size={16} /> Chat with Seller
                    </button>
                    <span style={{ fontSize: "11px", color: "var(--muted-2)", fontWeight: 500 }}>
                      Chat becomes available after seller accepts your request.
                    </span>
                  </div>
                )}
              </div>
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
            ) : (
              /* SOLD / RESERVED STATE — buyer actions */
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {(purchaseRequest?.status === REQUEST_STATUS.EXCHANGED || purchaseRequest?.status === REQUEST_STATUS.ACCEPTED) && (
                  <>
                    {purchaseRequest.status === REQUEST_STATUS.EXCHANGED ? (
                      alreadyRated ? (
                        <div style={{
                          background: "var(--status-accepted-bg)", border: "1px solid var(--grn)",
                          borderRadius: "8px", padding: "12px",
                          fontSize: 13, color: "var(--status-accepted-txt)", fontWeight: 600, textAlign: "center"
                        }}>
                          ✅ You've already reviewed this seller
                        </div>
                      ) : (
                        <button className="btn-primary-premium" onClick={() => requireAuth(null, () => setShowRating(true))} style={{ height: "48px" }}>
                          <Star size={16} fill="currentColor" /> Rate Seller
                        </button>
                      )
                    ) : (
                      /* ACCEPTED — Chat is active */
                      <button className="btn-primary-premium" onClick={() => requireAuth(null, openChat)} disabled={contactLoading} style={{ height: "48px" }}>
                        <MessageCircle size={16} /> {contactLoading ? "Opening..." : "Continue Chat"}
                      </button>
                    )}

                    {/* Wishlist always visible */}
                    <button
                      className="btn-outline"
                      onClick={() => {
                        if (isWishlisted(listing.id)) {
                          setPage("wishlist");
                        } else {
                          requireAuth(null, () => toggleWishlist(listing.id));
                        }
                      }}
                      style={{ height: "44px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%" }}
                      type="button"
                    >
                      <Heart size={15} fill={isWishlisted(listing.id) ? "var(--danger)" : "none"} color={isWishlisted(listing.id) ? "var(--danger)" : "currentColor"} />
                      <span>{isWishlisted(listing.id) ? "❤️ View Wishlist" : "Add to Wishlist"}</span>
                    </button>
                  </>
                )}

                {/* If a different buyer requested it (and not the current user) */}
                {!purchaseRequest || (purchaseRequest.status !== REQUEST_STATUS.EXCHANGED && purchaseRequest.status !== REQUEST_STATUS.ACCEPTED) ? (
                  <div style={{
                    background: isSold ? "var(--status-accepted-bg)" : "var(--status-pending-bg)",
                    border: `1.5px solid ${isSold ? "var(--grn)" : "var(--warn)"}`,
                    borderRadius: "8px", padding: "12px",
                    textAlign: "center", fontWeight: 700,
                    color: isSold ? "var(--status-accepted-txt)" : "var(--status-pending-txt)",
                    fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                  }}>
                    <span>{isSold ? "🎉" : "🔒"}</span> {isSold ? "This item has been exchanged" : "This item is reserved"}
                  </div>
                ) : null}
              </div>
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
          style={{ minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}
        >
          View Seller Profile →
        </button>

        {!isOwner && (
          <div style={{ textAlign: "center", marginTop: "12px" }}>
            <button 
              className="btn-link" 
              onClick={() => requireAuth(null, () => setShowReportSeller(true))} 
              style={{ color: "var(--muted)", fontSize: "12px", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", minHeight: "44px", padding: "8px" }}
            >
              Report Seller
            </button>
          </div>
        )}
      </div>
    );
  };

  const formatDescription = (text) => {
    if (!text || text.trim() === "") return <span style={{ color: "var(--muted-2)", fontStyle: "italic" }}>No description provided for this listing.</span>;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "var(--p)", textDecoration: "underline" }}>{part}</a>;
      }
      return part;
    });
  };

  const renderDescriptionBlock = () => {
    return (
      <div style={{ background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1.5px solid var(--bdr)", padding: "20px 24px", boxShadow: "var(--s1)" }}>
        <h4 style={{ fontWeight: 800, marginBottom: 10, fontSize: "15px", color: "var(--txt)", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📄</span> Product Description
        </h4>
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--muted)", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
          {formatDescription(listing.description)}
        </div>
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

            {/* Right Column: Info card + Sticky Seller Trust card */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {renderProductInfoCard()}
              <div style={{ position: "sticky", top: "84px" }}>
                {renderSellerTrustCard()}
              </div>
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

      {/* Report Seller Modal */}
      {showReportSeller && (
        <ReportSellerModal
          onClose={() => setShowReportSeller(false)}
          sellerId={listing.sellerId}
          sellerName={sellerData?.name || listing.sellerName || "Seller"}
          listingId={listing.id}
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
