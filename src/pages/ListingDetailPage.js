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
  const { currentUser, userProfile } = useAuth();
  const toast   = useToast();
  const { isWishlisted, toggleWishlist } = useWishlist();

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

  // Scroll to top when detail page opens (ensures page starts at the listed item photo at the top)
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
        setActiveImg((prev) => (prev - 1 + images.length) % images.length);
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

  // Load similar listings
  useEffect(() => {
    async function loadSimilar() {
      try {
        const q = query(
          collection(db, "listings"),
          where("status", "==", "active"),
          where("category", "==", listing.category),
          limit(6)
        );
        const snap = await getDocs(q);
        const items = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(item => item.id !== listing.id)
          .slice(0, 4);
        setSimilarListings(items);
      } catch (err) {
        console.error("Error loading similar listings:", err);
      }
    }
    loadSimilar();
  }, [listing.id, listing.category]);

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

  const getResponseRate = (uid) => {
    if (!uid) return "95%";
    let sum = 0;
    for (let i = 0; i < uid.length; i++) {
      sum += uid.charCodeAt(i);
    }
    return `${85 + (sum % 15)}%`;
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/listing/${listing.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast("Listing link copied! 📋", "success");
    }).catch(() => {
      toast("Failed to copy link", "error");
    });
  };

  const images = listing?.images?.length > 0 ? listing.images : null;

  const trustScore = Math.round(
    50 +
    ((sellerData?.collegeVerified || sellerData?.isVerified || listing?.collegeVerified || listing?.isVerified) ? 20 : 0) +
    (Number(sellerData?.successfulSales || listing?.sellerSuccessfulSales || 0) >= 3 ? 15 : 0) +
    (Number(sellerData?.rating || listing?.sellerRating || 0) > 0 ? (Number(sellerData?.rating || listing?.sellerRating || 0) / 5) * 15 : 0)
  );

  if (!listing || !listing.id) {
    return (
      <div className="container" style={{ padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "60vh" }}>
        <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }}></div>
        <div style={{ color: "var(--muted)", fontWeight: 600 }}>Loading listing details...</div>
      </div>
    );
  }

  return (
    <div className="container detail-page">
      <button className="btn btn-ghost" onClick={() => {
        if (window.history.state && window.history.state.page) {
          window.history.back();
        } else {
          setPage("home");
        }
      }} style={{ marginBottom:20 }} aria-label="Back to listings">
        ← Back to listings
      </button>

      <div className="detail-grid">
        {/* ── Left: Images + description + desktop extra content ── */}
        <div className="detail-left-content">
          <div
            className="detail-imgs"
            style={{ position:"relative", touchAction: "pan-y" }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {images
              ? <img src={optimizeCloudinaryUrl(images[activeImg], "f_auto,q_auto,w_800")} alt={listing.title} />
              : CAT_IMAGES[listing.category]
                ? <img src={CAT_IMAGES[listing.category]} alt={listing.category} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <span style={{ fontSize:64 }}>📦</span>}
            {!isSold && (
              <button
                className={`heart-btn ${wishlisted ? "wishlisted" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  requireAuth(null, () => toggleWishlist(listing.id));
                }}
                title={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                type="button"
                style={{ width: "36px", height: "36px", top: "12px", right: "12px" }}
              >
                <svg width="18" height="18" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
              </button>
            )}
            {isSold && (
              <div style={{
                position:"absolute", inset:0, background:"rgba(0,0,0,.45)",
                display:"flex", alignItems:"center", justifyContent:"center",
                borderRadius:"var(--r-md)"
              }}>
                <span style={{ color:"#fff", fontSize:22, fontWeight:900, background:"#22c55e", padding:"8px 24px", borderRadius:30 }}>
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
                  <span key={i} className={`gallery-dot ${activeImg===i?"active":""}`} style={{
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
                <div key={i} className={`detail-thumb ${activeImg===i?"active":""}`} onClick={() => setActiveImg(i)}>
                  <img src={optimizeCloudinaryUrl(url, "f_auto,q_auto,w_100,c_fill")} alt="" />
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div style={{ background:"var(--surface)", borderRadius:"var(--r-lg)", border:"1.5px solid var(--bdr)", padding:"20px 24px", marginTop:0, boxShadow:"var(--s1)" }}>
            <h4 style={{ fontWeight:800, marginBottom:10, fontSize:"15px" }}>📄 Description</h4>
            <p style={{ fontSize:14, lineHeight:1.75, color:"var(--muted)" }}>{listing.description}</p>
            <div style={{ marginTop:14, fontSize:13, color:"var(--muted-2)", display:"flex", gap:16 }}>
              <span>👀 {listing.views||0} views</span>
              <span>📅 {listing.createdAt?.toDate ? new Date(listing.createdAt.toDate()).toLocaleDateString("en-IN") : "Recently"}</span>
            </div>
          </div>

          {/* ─── DESKTOP ONLY: Seller Info Block below description ─── */}
          <div className="desktop-only" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              className="seller-info-block"
              onClick={() => { setViewProfileUserId(listing.sellerId); setPage("profile"); }}
              title="View seller profile"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") { setViewProfileUserId(listing.sellerId); setPage("profile"); } }}
            >
              <div className="seller-info-block-header">👤 Seller Information</div>

              {!sellerData ? (
                <div className="skeleton-shimmer">
                  <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: 20 }}>
                    <div className="skeleton" style={{ width: 60, height: 60, borderRadius: "50%", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: 16, width: "50%", marginBottom: 8 }} />
                      <div className="skeleton" style={{ height: 12, width: "70%" }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                    {[1,2,3].map(n => <div key={n} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
                  </div>
                  <div className="skeleton" style={{ height: 44, borderRadius: 10 }} />
                </div>
              ) : (
                <>
                  <div className="seller-info-block-profile">
                    <div className="seller-info-block-avatar">
                      {sellerData?.photoURL
                        ? <img src={sellerData.photoURL} alt="Seller" />
                        : (sellerData?.name || listing.sellerName || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="seller-info-block-name">
                        <span>{sellerData?.name || listing.sellerName}</span>
                        {(sellerData?.collegeVerified || sellerData?.isVerified || listing.collegeVerified || listing.isVerified) && (
                          <VerifiedStudentBadge />
                        )}
                        {(sellerData?.successfulSales >= 3 || listing.sellerSuccessfulSales >= 3) && (
                          <TrustedSellerBadge />
                        )}
                      </div>
                      <div className="seller-info-block-college">
                        {[sellerData?.college, sellerData?.branch].filter(Boolean).join(" • ") || "Campus Seller"}
                      </div>
                      {(sellerData?.college || listing.sellerCollege) && (
                        <div style={{ marginTop: 4 }}>
                          <SameCampusBadge sellerCollege={sellerData?.college || listing.sellerCollege} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="seller-stats-grid">
                    <div className="seller-stat-box">
                      <div className="seller-stat-box-value">
                        {sellerData?.rating > 0 ? `⭐ ${sellerData.rating.toFixed(1)}` : "⭐ N/A"}
                      </div>
                      <div className="seller-stat-box-label">Rating</div>
                    </div>
                    <div className="seller-stat-box">
                      <div className="seller-stat-box-value">🛡️ {trustScore}%</div>
                      <div className="seller-stat-box-label">Trust Score</div>
                    </div>
                    <div className="seller-stat-box">
                      <div className="seller-stat-box-value">📦 {totalListings}</div>
                      <div className="seller-stat-box-label">{totalListings === 1 ? "Listing" : "Listings"}</div>
                    </div>
                  </div>

                  <button
                    className="btn btn-outline seller-info-block-cta"
                    onClick={(e) => { e.stopPropagation(); setViewProfileUserId(listing.sellerId); setPage("profile"); }}
                    type="button"
                  >
                    View Seller Profile →
                  </button>
                </>
              )}
            </div>

            {/* ─── DESKTOP ONLY: Meetup Location ─── */}
            {listing.meetupSpot && (
              <div className="meetup-location-block">
                <div className="meetup-block-header">📍 Meetup Location</div>
                <div className="meetup-spot-name">
                  <span style={{ background:"var(--p-light)", color:"var(--p)", borderRadius:"var(--r-sm)", padding:"4px 12px", fontSize:"15px", fontWeight:800 }}>
                    {listing.meetupSpot}
                  </span>
                </div>
                <div className="meetup-tip">
                  💡 Always meet in public, well-lit campus areas. Inspect the item before exchanging payment.
                </div>
              </div>
            )}

            {/* ─── DESKTOP ONLY: Safety Guidelines ─── */}
            <div className="safety-guidelines-block">
              <div className="safety-block-header">🛡️ Safety Guidelines</div>
              <ul className="safety-tips-list">
                {[
                  "Meet in public, well-lit campus spaces",
                  "Inspect the item before making payment",
                  "Avoid advance online transactions — swap physically",
                  "Verify product condition matches the listing description",
                  "Prefer campus locations with security or crowd presence"
                ].map((tip, i) => (
                  <li key={i}>
                    <span className="safety-check-icon" aria-hidden="true">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Right: Detail card ── */}
        <div>
          <div className="detail-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div className="detail-cat" style={{ marginBottom: 0 }}>{listing.category}</div>
              <ShareButton listing={listing} currentUserId={currentUser?.uid} />
            </div>

            <div className="detail-title" title={listing.title}>
              {listing.title}
            </div>

            <div className={`detail-price ${listing.isFree ? "free" : ""}`}>
              {isSold ? "Item Sold ✅" : listing.isFree ? "💚 Free" : listing.listingType === "rent" ? `₹${listing.rentPerDay}/day` : `₹${listing.price}`}
            </div>

            <div className="detail-badges" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
              {COND_META[listing.condition] && (
                <span className="badge" style={{ background: COND_META[listing.condition].bg, color: COND_META[listing.condition].color, border: "0", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700" }}>
                  {COND_META[listing.condition].label}
                </span>
              )}
              {listing.isFree && <span className="badge" style={{ background: "var(--status-accepted-bg)", color: "var(--status-accepted-txt)", border: "0", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700" }}>Free</span>}
              {isSold && <span className="badge" style={{ background: "var(--status-rejected-bg)", color: "var(--status-rejected-txt)", border: "0", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700" }}>Sold</span>}
            </div>

            {/* ── Action Buttons ── */}
            <div className="action-btns" style={{ marginTop: "14px", gap: "8px" }}>
              {isOwner ? (
                /* OWNER ACTIONS */
                <>
                  {!isSold ? (
                    <button className="btn btn-outline" onClick={() => { setSelectedListing(listing); setPage("edit"); }} style={{ height: "44px" }}>
                      ✏️ Edit Listing
                    </button>
                  ) : (
                    <div style={{
                      background:"var(--status-pending-bg)", border:"1px solid var(--bdr)",
                      borderRadius:"var(--r-sm)", padding:"10px 14px",
                      fontSize:13, color:"var(--status-pending-txt)", fontWeight:600, lineHeight:1.5,
                      textAlign: "center"
                    }}>
                      🔒 This listing has been sold and cannot be edited.
                    </div>
                  )}
                  {!isSold && (
                    <button className="btn btn-green" onClick={handleMarkSold} style={{ height: "44px" }}>✅ Mark as Sold</button>
                  )}
                  <button className="btn btn-danger" onClick={handleDelete} style={{ height: "44px" }}>🗑️ Delete Listing</button>
                </>
              ) : isSold ? (
                /* SOLD STATE — buyer actions */
                <>
                  <div style={{
                    background:"var(--status-accepted-bg)", border:"1.5px solid var(--grn)",
                    borderRadius:"var(--r-sm)", padding:"10px 14px",
                    textAlign:"center", fontWeight:700, color:"var(--status-accepted-txt)",
                    fontSize: "13px"
                  }}>
                    This item has been sold 🎉
                  </div>

                  {isEligibleBuyer && (
                    alreadyRated ? (
                      <div style={{
                        background:"var(--status-accepted-bg)", border:"1px solid var(--grn)",
                        borderRadius:"var(--r-sm)", padding:"10px 14px",
                        fontSize:13, color:"var(--status-accepted-txt)", fontWeight:600, textAlign:"center"
                      }}>
                        ✅ You've already reviewed this seller
                      </div>
                    ) : (
                      <button className="btn btn-primary" onClick={() => requireAuth(null, () => setShowRating(true))} style={{ height: "44px" }}>
                        ⭐ Rate Seller
                      </button>
                    )
                  )}

                  <button className="btn btn-outline" onClick={() => requireAuth(null, openChat)} disabled={contactLoading} style={{ height: "44px" }}>
                    💬 {contactLoading ? "Opening..." : "View Chat"}
                  </button>
                </>
              ) : (
                /* ACTIVE — buyer actions */
                <>
                  <button className="btn btn-primary" onClick={() => requireAuth(null, () => { trackInitiatePurchase(listing); setShowBuyModal(true); })} style={{ height: "46px", fontSize: "15px", fontWeight: "700" }}>
                    🛒 Buy Now
                  </button>
                  <button className="btn btn-outline" onClick={() => requireAuth(null, openChat)} disabled={contactLoading} style={{ height: "44px", fontWeight: "600" }}>
                    💬 Message Seller
                  </button>
                  <button
                    className={`btn ${wishlisted ? "btn-danger" : "btn-outline"}`}
                    onClick={() => requireAuth(null, () => toggleWishlist(listing.id))}
                    style={{ height: "44px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    <svg width="15" height="15" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                    {wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                  </button>
                </>
              )}
            </div>

            {/* Divider line */}
            <hr style={{ border: "none", borderTop: "1px solid var(--bdr)", margin: "14px 0" }} />

            {/* ─── MOBILE ONLY: Compact Seller Card inside sidebar ─── */}
            <div className="mobile-only">
              <div
                className="detail-seller-trust-card"
                onClick={() => { setViewProfileUserId(listing.sellerId); setPage("profile"); }}
                style={{
                  cursor: "pointer",
                  background: "var(--light)",
                  borderRadius: "var(--r-md)",
                  padding: "12px",
                  border: "1px solid var(--bdr)"
                }}
                title="Click to view seller profile"
              >
                {!sellerData ? (
                  <div className="skeleton-shimmer">
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 4 }} />
                        <div className="skeleton" style={{ height: 10, width: "40%" }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 13, flexShrink: 0 }}>
                        {sellerData?.photoURL
                          ? <img src={sellerData.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                          : (sellerData?.name || listing.sellerName || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="seller-name" style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap", fontSize:"14px", fontWeight:800 }}>
                          <span>{sellerData?.name || listing.sellerName}</span>
                          {(sellerData?.collegeVerified || sellerData?.isVerified || listing.collegeVerified || listing.isVerified) && (
                            <VerifiedStudentBadge />
                          )}
                          {(sellerData?.successfulSales >= 3 || listing.sellerSuccessfulSales >= 3) && (
                            <TrustedSellerBadge />
                          )}
                        </div>
                        <div className="seller-college" style={{ fontSize: "11px", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {[sellerData?.college, sellerData?.branch].filter(Boolean).join(" • ")}
                        </div>
                      </div>
                    </div>

                    {/* Compact Stats Row */}
                    <div className="seller-stats-row">
                      <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        ⭐ {sellerData?.rating > 0 ? sellerData.rating.toFixed(1) : "N/A"}
                      </span>
                      <span style={{ color: "var(--muted)" }}>•</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        🛡️ {trustScore}%
                      </span>
                      <span style={{ color: "var(--muted)" }}>•</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        📦 {totalListings} {totalListings === 1 ? "Listing" : "Listings"}
                      </span>
                    </div>

                    <div style={{ fontSize: "11px", color: "var(--p)", fontWeight: 700, marginTop: "8px", textAlign: "center", borderTop: "1px solid var(--bdr)", paddingTop: "6px" }}>
                      [ View Seller Profile ]
                    </div>
                  </>
                )}
              </div>

              {/* Meetup spot — mobile only */}
              {listing.meetupSpot && (
                <div className="listing-meetup-spot" style={{ marginTop: "12px", padding: "10px 12px", background: "var(--light)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", fontSize: "13px" }}>
                  📍 Meetup: <span style={{ fontWeight:800 }}>{listing.meetupSpot}</span>
                </div>
              )}

              {/* Safety Tips — mobile only */}
              <div style={{
                background:"var(--status-pending-bg)", border:"1px solid var(--bdr)",
                borderRadius:"var(--r-md)", padding:"12px", marginTop:12,
                boxShadow: "var(--s0)"
              }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", fontWeight: "800", color: "var(--status-pending-txt)", fontSize: "13px", marginBottom: "6px" }}>
                  <span>🛡️</span> Safety Guidelines
                </div>
                <ul style={{ paddingLeft: "14px", margin: 0, fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.5", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <li>Meet in public, well-lit campus spaces.</li>
                  <li>Inspect the item before paying.</li>
                  <li>Avoid advance online transactions; swap physically.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Listings Section */}
      {similarListings.length > 0 && (
        <div style={{ marginTop: "52px", borderTop: "1px solid var(--bdr)", paddingTop: "36px" }}>
          <h3 className="homepage-section-title">✨ You May Also Like</h3>
          <div className="listings-grid" style={{ padding: "10px 0 20px" }}>
            {similarListings.map(l => (
              <ListingCard key={l.id} listing={l} onClick={() => { setSelectedListing(l); setActiveImg(0); setPage("listing", l); }} requireAuth={requireAuth} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed Section */}
      {recentlyViewed.length > 0 && (
        <div style={{ marginTop: "32px", borderTop: "1px solid var(--bdr)", paddingTop: "36px" }}>
          <h3 className="homepage-section-title">⏱️ Recently Viewed</h3>
          <div className="listings-grid" style={{ padding: "10px 0 20px" }}>
            {recentlyViewed.map(l => (
              <ListingCard key={l.id} listing={l} onClick={() => { setSelectedListing(l); setActiveImg(0); setPage("listing", l); }} requireAuth={requireAuth} />
            ))}
          </div>
        </div>
      )}

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
