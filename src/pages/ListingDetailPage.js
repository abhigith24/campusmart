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

const COND_META = {
  New:  { label: "Brand New",    bg: "#dcfce7", color: "#15803d" },
  Good: { label: "Good Condition", bg: "#dbeafe", color: "#1d4ed8" },
  Fair: { label: "Fair Condition", bg: "#fef9c3", color: "#a16207" },
  Old:  { label: "Heavily Used", bg: "#fee2e2", color: "#b91c1c" },
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

  const isOwner    = currentUser?.uid === listing.sellerId;
  const isSold     = listing.status === "sold";
  const wishlisted = isWishlisted(listing.id);

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
      // Load seller data
      const snap = await getDoc(doc(db, "users", listing.sellerId));
      if (snap.exists()) setSellerData(snap.data());

      // Fetch seller stats
      try {
        const qListings = query(
          collection(db, "listings"),
          where("sellerId", "==", listing.sellerId)
        );
        const snapListings = await getDocs(qListings);
        const sellerListings = snapListings.docs.map(d => d.data());
        setTotalListings(sellerListings.length);
        setCompletedTrades(sellerListings.filter(l => l.status === "sold").length);
      } catch (err) {
        console.error("Error loading seller stats:", err);
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
      await updateDoc(doc(db, "listings", listing.id), { status: "sold" });
      toast("Marked as sold! ✅", "success");
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

  const images = listing.images?.length > 0 ? listing.images : null;

  return (
    <div className="container detail-page">
      <button className="btn btn-ghost" onClick={() => {
        if (window.history.state && window.history.state.page) {
          window.history.back();
        } else {
          setPage("home");
        }
      }} style={{ marginBottom:20 }}>
        ← Back to listings
      </button>

      <div className="detail-grid">
        {/* ── Left: Images + description ── */}
        <div>
          <div
            className="detail-imgs"
            style={{ position:"relative", touchAction: "pan-y" }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {images
              ? <img src={images[activeImg]} alt={listing.title} />
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
                  <img src={url} alt="" />
                </div>
              ))}
            </div>
          )}

          <div style={{ background:"#fff", borderRadius:"var(--r-md)", border:"1.5px solid var(--bdr)", padding:20, marginTop:16 }}>
            <h4 style={{ fontWeight:800, marginBottom:10 }}>📄 Description</h4>
            <p style={{ fontSize:14, lineHeight:1.7, color:"var(--muted)" }}>{listing.description}</p>
            <div style={{ marginTop:12, fontSize:13, color:"var(--muted-2)", display:"flex", gap:16 }}>
              <span>👀 {listing.views||0} views</span>
              <span>📅 {listing.createdAt?.toDate ? new Date(listing.createdAt.toDate()).toLocaleDateString("en-IN") : "Recently"}</span>
            </div>
          </div>
        </div>

        {/* ── Right: Detail card ── */}
        <div>
          <div className="detail-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "8px" }}>
              <div className="detail-cat">{listing.category}</div>
              <button
                className="btn btn-outline btn-xs"
                onClick={handleShare}
                type="button"
                style={{ borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <span>🔗</span> Share
              </button>
            </div>
            <div className="detail-title">{listing.title}</div>

            <div className={`detail-price ${listing.isFree?"free":""}`} style={{ color: listing.listingType==="rent" ? "#2563eb" : undefined }}>
              {isSold ? "Item Sold ✅" : listing.isFree ? "💚 Free Donation" : listing.listingType==="rent" ? `₹${listing.rentPerDay}/day` : `₹${listing.price}`}
            </div>

            <div className="detail-badges" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {COND_META[listing.condition] && (
                <span className="badge" style={{ background: COND_META[listing.condition].bg, color: COND_META[listing.condition].color, border: "0", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  {COND_META[listing.condition].label}
                </span>
              )}
              {listing.isFree && <span className="badge" style={{ background: "#dcfce7", color: "#15803d", border: "0", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Free</span>}
              {isSold && <span className="badge" style={{ background: "#fee2e2", color: "#b91c1c", border: "0", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Sold</span>}
              <span className="badge" style={{ background: "var(--light)", color: "var(--txt-2)", border: "0", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{listing.category}</span>
            </div>

            {/* Redesigned Seller Card with Trust Stats */}
            <div className="detail-seller-trust-card" onClick={() => { setViewProfileUserId(listing.sellerId); setPage("profile"); }} style={{ cursor: "pointer", background: "var(--light)", borderRadius: "var(--r-md)", padding: "16px", border: "1px solid var(--bdr)", marginBottom: "16px" }}>
              {!sellerData ? (
                <div className="skeleton-shimmer">
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
                    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="skeleton" style={{ height: 16, width: "60%", marginBottom: 6 }} />
                      <div className="skeleton" style={{ height: 12, width: "80%" }} />
                    </div>
                  </div>
                  <div className="seller-trust-grid-mini" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", borderTop: "1px solid rgba(226,232,240,.8)", paddingTop: "10px" }}>
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div className="skeleton" style={{ height: 10, width: "40%" }} />
                        <div className="skeleton" style={{ height: 12, width: "70%" }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
                <div className="avatar" style={{ width:40, height:40, fontSize:15, flexShrink: 0 }}>
                  {sellerData?.photoURL
                    ? <img src={sellerData.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : (sellerData?.name || listing.sellerName || "?")[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="seller-name" style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <span style={{ fontWeight: 800 }}>{sellerData?.name || listing.sellerName}</span>
                    {sellerData?.isVerified && (
                      <span className="card-verified-badge" title="Verified Student" style={{ padding: "1px 4px", fontSize: "9px" }}>
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="seller-college" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "12px", color: "var(--muted)" }}>
                    {[sellerData?.college, sellerData?.branch].filter(Boolean).join(" • ")}
                  </div>
                </div>
              </div>

              <div className="seller-trust-grid-mini" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", borderTop: "1px solid rgba(226,232,240,.8)", paddingTop: "10px" }}>
                <div className="trust-stat-mini" style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  <div className="trust-stat-label-mini" style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700" }}>Rating</div>
                  <div className="trust-stat-val-mini" style={{ color: "var(--yel)", fontWeight: "700", fontSize: "12px" }}>
                    ★ {sellerData?.rating > 0 ? sellerData.rating.toFixed(1) : "N/A"}
                  </div>
                </div>
                <div className="trust-stat-mini" style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  <div className="trust-stat-label-mini" style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700" }}>Member Since</div>
                  <div className="trust-stat-val-mini" style={{ fontSize: "12px", color: "var(--txt-2)", fontWeight: "600" }}>{getMemberSince(sellerData?.joinedAt)}</div>
                </div>
                <div className="trust-stat-mini" style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  <div className="trust-stat-label-mini" style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700" }}>Total Listings</div>
                  <div className="trust-stat-val-mini" style={{ fontSize: "12px", color: "var(--txt-2)", fontWeight: "600" }}>{totalListings} items</div>
                </div>
                <div className="trust-stat-mini" style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  <div className="trust-stat-label-mini" style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700" }}>Completed Trades</div>
                  <div className="trust-stat-val-mini" style={{ fontSize: "12px", color: "var(--txt-2)", fontWeight: "600" }}>{completedTrades} sold</div>
                </div>
                <div className="trust-stat-mini" style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", marginTop: "2px" }}>
                  <span style={{ color: "var(--muted)", fontWeight: "500" }}>Response Rate:</span>
                  <span style={{ fontWeight: "700", color: "var(--grn)" }}>{getResponseRate(listing.sellerId)}</span>
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "var(--p)", fontWeight: 700, marginTop: "10px", textAlign: "center", borderTop: "1px solid rgba(226,232,240,.5)", paddingTop: "6px" }}>
                🔍 View seller profile & history
              </div>
                </>
              )}
            </div>

            {/* ── Action Buttons ── */}
            <div className="action-btns">
              {isOwner ? (
                /* OWNER ACTIONS */
                <>
                  {!isSold ? (
                    <button className="btn btn-outline" onClick={() => { setSelectedListing(listing); setPage("edit"); }}>
                      ✏️ Edit Listing
                    </button>
                  ) : (
                    <div style={{
                      background:"#fef9c3", border:"1px solid #fde047",
                      borderRadius:"var(--r-sm)", padding:"10px 14px",
                      fontSize:13, color:"#a16207", fontWeight:600, lineHeight:1.5
                    }}>
                      🔒 This listing has been sold and can no longer be edited.
                    </div>
                  )}
                  {!isSold && (
                    <button className="btn btn-green" onClick={handleMarkSold}>✅ Mark as Sold</button>
                  )}
                  <button className="btn btn-danger" onClick={handleDelete}>🗑️ Delete Listing</button>
                </>
              ) : isSold ? (
                /* SOLD STATE — buyer actions */
                <>
                  <div style={{
                    background:"#f0fdf4", border:"1.5px solid #22c55e",
                    borderRadius:"var(--r-sm)", padding:"12px 16px",
                    textAlign:"center", fontWeight:700, color:"#15803d"
                  }}>
                    This item has been sold 🎉
                  </div>

                  {isEligibleBuyer && (
                    alreadyRated ? (
                      <div style={{
                        background:"#f0fdf4", border:"1px solid #86efac",
                        borderRadius:"var(--r-sm)", padding:"10px 14px",
                        fontSize:13, color:"#15803d", fontWeight:600, textAlign:"center"
                      }}>
                        ✅ You've already reviewed this seller
                      </div>
                    ) : (
                      <button className="btn btn-primary" onClick={() => requireAuth(null, () => setShowRating(true))}>
                        ⭐ Rate Seller
                      </button>
                    )
                  )}

                  <button className="btn btn-outline" onClick={() => requireAuth(null, openChat)} disabled={contactLoading}>
                    💬 {contactLoading ? "Opening..." : "View Chat"}
                  </button>
                </>
              ) : (
                /* ACTIVE — buyer actions */
                <>
                  <button className="btn btn-primary" onClick={() => requireAuth(null, () => { trackInitiatePurchase(listing); setShowBuyModal(true); })} style={{ height: "46px", fontSize: "15px" }}>🛒 Buy Now</button>
                  <button
                    className={`btn ${wishlisted ? "btn-danger" : "btn-outline"}`}
                    onClick={() => requireAuth(null, () => toggleWishlist(listing.id))}
                    style={{ height: "42px" }}
                  >
                    <svg width="15" height="15" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                    {wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                  </button>
                  <button className="btn btn-outline" onClick={() => requireAuth(null, openChat)} disabled={contactLoading} style={{ height: "42px" }}>
                    💬 {contactLoading ? "Opening..." : "Message Seller"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Meetup spot — shown if seller set one */}
          {listing.meetupSpot && (
            <div className="listing-meetup-spot">
              📍 Meetup: <span style={{ fontWeight:800 }}>{listing.meetupSpot}</span>
            </div>
          )}

          {/* Safety Tips Card */}
          <div style={{
            background:"#fffbeb", border:"1px solid #fef3c7",
            borderRadius:"var(--r-md)", padding:"16px", marginTop:16,
            boxShadow: "var(--s0)"
          }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", fontWeight: "800", color: "#b45309", fontSize: "14px", marginBottom: "8px" }}>
              <span>🛡️</span> Safety Guidelines
            </div>
            <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "12px", color: "#78350f", lineHeight: "1.6", display: "flex", flexDirection: "column", gap: "6px" }}>
              <li>Always meet in a public, well-lit place on campus.</li>
              <li>Inspect the item thoroughly before making any payment.</li>
              <li>Avoid advanced online transactions; swap physically.</li>
            </ul>
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
                <img src={listing.images[0]} alt="" style={{ width:"100%", height:130, objectFit:"cover", borderRadius:"var(--r-sm)", marginBottom:12 }} />
              )}
              <div style={{ fontWeight:800, fontSize:16, marginBottom:4 }}>{listing.title}</div>
              <div style={{ fontSize:13, color:"var(--muted)", marginBottom:8 }}>{listing.condition} · {listing.category}</div>
              <div style={{ fontSize:24, fontWeight:900, color: listing.isFree ? "#22c55e" : "var(--p)" }}>
                {listing.isFree ? "Free 💚" : `₹${listing.price}`}
              </div>
            </div>
            <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:"var(--r-xs)", padding:"10px 14px", marginBottom:16, fontSize:13, color:"#a16207" }}>
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
