import React, { useState, useEffect } from "react";
import {
  doc, getDoc, updateDoc, increment, serverTimestamp,
  addDoc, collection, setDoc, query, where, getDocs
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import RatingModal from "../components/RatingModal";

const COND_META = {
  New:  { label: "Brand New",    bg: "#dcfce7", color: "#15803d" },
  Good: { label: "Good Condition", bg: "#dbeafe", color: "#1d4ed8" },
  Fair: { label: "Fair Condition", bg: "#fef9c3", color: "#a16207" },
  Old:  { label: "Heavily Used", bg: "#fee2e2", color: "#b91c1c" },
};

export default function ListingDetailPage({ listing, setPage, setSelectedListing, setChatWith }) {
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

  const isOwner    = currentUser?.uid === listing.sellerId;
  const isSold     = listing.status === "sold";
  const wishlisted = isWishlisted(listing.id);

  useEffect(() => {
    async function load() {
      // Load seller data
      const snap = await getDoc(doc(db, "users", listing.sellerId));
      if (snap.exists()) setSellerData(snap.data());

      // Increment view count (ignore errors)
      updateDoc(doc(db, "listings", listing.id), { views: increment(1) }).catch(() => {});

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

  const images = listing.images?.length > 0 ? listing.images : null;

  return (
    <div className="container detail-page">
      <button className="btn btn-ghost" onClick={() => setPage("home")} style={{ marginBottom:20 }}>
        ← Back to listings
      </button>

      <div className="detail-grid">
        {/* ── Left: Images + description ── */}
        <div>
          <div className="detail-imgs" style={{ position:"relative" }}>
            {images
              ? <img src={images[activeImg]} alt={listing.title} />
              : <span style={{ fontSize:64 }}>📦</span>}
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
            <div className="detail-cat">{listing.category}</div>
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

            {/* Seller info */}
            <div className="seller-card">
              <div className="avatar" style={{ width:44, height:44, fontSize:16 }}>
                {sellerData?.photoURL
                  ? <img src={sellerData.photoURL} alt="" style={{ width:"100%", height:"100%" }} />
                  : (sellerData?.name || listing.sellerName || "?")[0].toUpperCase()}
              </div>
              <div className="seller-info">
                <div className="seller-name" style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                  {sellerData?.name || listing.sellerName}
                  {sellerData?.isVerified && <span className="verified-badge-sm">✓ Verified</span>}
                </div>
                <div className="seller-college">{[sellerData?.college, sellerData?.branch].filter(Boolean).join(" • ")}</div>
                <div className="seller-rating">
                  {sellerData?.rating > 0
                    ? <>⭐ {sellerData.rating.toFixed(1)} <span style={{ color:"var(--muted)", fontWeight:500 }}>({sellerData.totalRatings} review{sellerData.totalRatings!==1?"s":""})</span></>
                    : <span style={{ color:"var(--muted-2)", fontWeight:500, fontSize:12 }}>No reviews yet</span>}
                </div>
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="action-btns">
              {isOwner ? (
                /* OWNER ACTIONS */
                <>
                  {/* Edit — hidden when sold */}
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
                  {/* Mark as sold — only if active */}
                  {!isSold && (
                    <button className="btn btn-green" onClick={handleMarkSold}>✅ Mark as Sold</button>
                  )}
                  {/* Delete — always available to owner */}
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

                  {/* Rate Seller — only eligible buyer, only once */}
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
                      <button className="btn btn-primary" onClick={() => setShowRating(true)}>
                        ⭐ Rate Seller
                      </button>
                    )
                  )}

                  {/* Chat always available */}
                  <button className="btn btn-outline" onClick={openChat} disabled={contactLoading}>
                    💬 {contactLoading ? "Opening..." : "View Chat"}
                  </button>
                </>
              ) : (
                /* ACTIVE — buyer actions */
                <>
                  <button className="btn btn-primary" onClick={() => setShowBuyModal(true)}>🛒 Buy Now</button>
                  <button
                    className={`btn ${wishlisted ? "btn-danger" : "btn-outline"}`}
                    onClick={() => toggleWishlist(listing.id)}>
                    {wishlisted ? "❤️ Remove from Wishlist" : "🤍 Add to Wishlist"}
                  </button>
                  <button className="btn btn-outline" onClick={openChat} disabled={contactLoading}>
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

          <div style={{
            background:"#eef2ff", border:"1.5px solid #c7d2fe",
            borderRadius:"var(--r-sm)", padding:"12px 16px", marginTop:12,
            fontSize:13, fontWeight:600, color:"#4338ca"
          }}>
            🛡️ Always meet in a safe, public place on campus. Never pay before seeing the item.
          </div>
        </div>
      </div>

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
