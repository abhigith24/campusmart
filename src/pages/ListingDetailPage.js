import React, { useState, useEffect } from "react";
import {
  doc, getDoc, updateDoc, increment, serverTimestamp,
  addDoc, collection, setDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import RatingModal from "../components/RatingModal";

const CONDITIONS = {
  New: "condition-New", Good: "condition-Good",
  Fair: "condition-Fair", Old: "condition-Old"
};

export default function ListingDetailPage({ listing, setPage, setSelectedListing, setChatWith }) {
  const { currentUser, userProfile } = useAuth();
  const toast    = useToast();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [activeImg,      setActiveImg]      = useState(0);
  const [sellerData,     setSellerData]     = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [showRating,     setShowRating]     = useState(false);
  const [showBuyModal,   setShowBuyModal]   = useState(false);
  const [buyLoading,     setBuyLoading]     = useState(false);

  const isOwner  = currentUser?.uid === listing.sellerId;
  const isSold   = listing.status === "sold";
  const wishlisted = isWishlisted(listing.id);

  useEffect(() => {
    async function loadSeller() {
      const snap = await getDoc(doc(db, "users", listing.sellerId));
      if (snap.exists()) setSellerData(snap.data());
    }
    loadSeller();
    updateDoc(doc(db, "listings", listing.id), { views: increment(1) }).catch(() => {});
  }, [listing.id, listing.sellerId]);

  // ── Open / create chat room ───────────────────────────────────────────────
  async function openChat() {
    if (isOwner) return;
    setContactLoading(true);
    try {
      const chatId  = [currentUser.uid, listing.sellerId].sort().join("_") + "_" + listing.id;
      const chatRef = doc(db, "chats", chatId);

      // Check if chat already exists — only create if new
      const existing = await getDoc(chatRef);
      if (!existing.exists()) {
        await setDoc(chatRef, {
          participants:     [currentUser.uid, listing.sellerId],
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

  // ── Buy Now ───────────────────────────────────────────────────────────────
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

  async function handleDelete() {
    if (!window.confirm("Delete this listing?")) return;
    await updateDoc(doc(db, "listings", listing.id), { status: "deleted" });
    toast("Listing deleted", "success");
    setPage("home");
  }

  async function handleMarkSold() {
    await updateDoc(doc(db, "listings", listing.id), { status: "sold" });
    toast("Marked as sold! ✅", "success");
    setPage("home");
  }

  const images = listing.images?.length > 0 ? listing.images : null;

  return (
    <div className="container detail-page">
      <button className="btn btn-ghost" onClick={() => setPage("home")} style={{ marginBottom: 20 }}>
        ← Back to listings
      </button>

      <div className="detail-grid">
        {/* Images */}
        <div>
          <div className="detail-imgs" style={{ position: "relative" }}>
            {images
              ? <img src={images[activeImg]} alt={listing.title} />
              : <span style={{ fontSize: 64 }}>📦</span>}
            {isSold && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "var(--radius)"
              }}>
                <span style={{ color: "white", fontSize: 26, fontWeight: 900, background: "var(--green)", padding: "8px 24px", borderRadius: 30 }}>
                  ✅ SOLD
                </span>
              </div>
            )}
          </div>
          {images && images.length > 1 && (
            <div className="detail-thumbs">
              {images.map((url, i) => (
                <div key={i} className={`detail-thumb ${activeImg === i ? "active" : ""}`} onClick={() => setActiveImg(i)}>
                  <img src={url} alt="" />
                </div>
              ))}
            </div>
          )}
          <div style={{ background: "white", borderRadius: "var(--radius)", border: "1.5px solid var(--border)", padding: 20, marginTop: 16 }}>
            <h4 style={{ fontWeight: 800, marginBottom: 10 }}>📄 Description</h4>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--muted)" }}>{listing.description}</p>
            <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", display: "flex", gap: 16 }}>
              <span>👀 {listing.views || 0} views</span>
              <span>📅 {listing.createdAt?.toDate ? new Date(listing.createdAt.toDate()).toLocaleDateString("en-IN") : "Recently"}</span>
            </div>
          </div>
        </div>

        {/* Details card */}
        <div>
          <div className="detail-card">
            <div className="detail-cat">{listing.category}</div>
            <div className="detail-title">{listing.title}</div>
            <div className={`detail-price ${listing.isFree ? "free" : ""}`}>
              {isSold ? "Item Sold ✅" : listing.isFree ? "💚 Free Donation" : `₹${listing.price}`}
            </div>
            <div className="detail-badges">
              <span className={`badge ${CONDITIONS[listing.condition] || ""}`}>{listing.condition}</span>
              {listing.isFree && <span className="badge" style={{ background: "var(--green-light)", color: "var(--green)" }}>Free</span>}
              {isSold && <span className="badge" style={{ background: "var(--green-light)", color: "var(--green)" }}>Sold</span>}
              <span className="badge">{listing.category}</span>
            </div>

            {/* Seller */}
            <div className="seller-card">
              <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>
                {sellerData?.photoURL
                  ? <img src={sellerData.photoURL} alt="" style={{ width: "100%", height: "100%" }} />
                  : (sellerData?.name || listing.sellerName || "?")[0].toUpperCase()}
              </div>
              <div className="seller-info">
                <div className="seller-name">{sellerData?.name || listing.sellerName}</div>
                <div className="seller-college">{[sellerData?.college, sellerData?.branch].filter(Boolean).join(" • ")}</div>
                <div className="seller-rating">
                  ⭐ {sellerData?.rating > 0 ? `${sellerData.rating.toFixed(1)} (${sellerData.totalRatings} reviews)` : "New Seller"}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="action-btns">
              {isOwner ? (
                <>
                  <button className="btn btn-outline" onClick={() => { setSelectedListing(listing); setPage("edit"); }}>✏️ Edit Listing</button>
                  {!isSold && <button className="btn btn-green" onClick={handleMarkSold}>✅ Mark as Sold</button>}
                  <button className="btn btn-danger" onClick={handleDelete}>🗑️ Delete Listing</button>
                </>
              ) : isSold ? (
                <div style={{ background: "var(--green-light)", border: "1.5px solid var(--green)", borderRadius: 10, padding: "12px 16px", textAlign: "center", fontWeight: 700, color: "var(--green)" }}>
                  This item has been sold 🎉
                </div>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={() => setShowBuyModal(true)}>🛒 Buy Now</button>
                  <button className={`btn ${wishlisted ? "btn-danger" : "btn-outline"}`} onClick={() => toggleWishlist(listing.id)}>
                    {wishlisted ? "❤️ Remove from Wishlist" : "🤍 Add to Wishlist"}
                  </button>
                  <button className="btn btn-outline" onClick={openChat} disabled={contactLoading}>
                    💬 {contactLoading ? "Opening..." : "Message Seller"}
                  </button>
                  <button className="btn btn-outline" onClick={() => setShowRating(true)}>⭐ Rate Seller</button>
                </>
              )}
            </div>
          </div>

          <div style={{ background: "var(--secondary-light)", border: "1.5px solid #c7d2fe", borderRadius: 12, padding: "12px 16px", marginTop: 12, fontSize: 13, fontWeight: 600, color: "var(--secondary)" }}>
            🛡️ Always meet in a safe, public place on campus. Never pay before seeing the item.
          </div>
        </div>
      </div>

      {showRating && (
        <RatingModal sellerId={listing.sellerId} sellerName={sellerData?.name || listing.sellerName} onClose={() => setShowRating(false)} />
      )}

      {showBuyModal && (
        <div className="modal-overlay" onClick={() => setShowBuyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🛒 Confirm Purchase Request</h3>
            <p>Send a purchase request to the seller. They'll be notified and can accept or reject.</p>
            <div style={{ background: "var(--light)", borderRadius: 12, padding: 16, marginBottom: 18 }}>
              {listing.images?.[0] && <img src={listing.images[0]} alt="" style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 8, marginBottom: 12 }} />}
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{listing.title}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{listing.condition} · {listing.category}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: listing.isFree ? "var(--green)" : "var(--primary)" }}>
                {listing.isFree ? "Free 💚" : `₹${listing.price}`}
              </div>
            </div>
            <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "#854d0e" }}>
              ⚠️ No payment required now. This sends a request to the seller who will contact you via chat.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setShowBuyModal(false)} style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmBuy} disabled={buyLoading} style={{ flex: 1, justifyContent: "center" }}>
                {buyLoading ? "Sending..." : "Confirm 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
