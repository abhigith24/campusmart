import React, { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, addDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const STATUS_STYLE = {
  pending:  { bg: "#fef3c7", color: "#92400e", label: "⏳ Pending" },
  accepted: { bg: "var(--green-light)", color: "#15803d", label: "✅ Accepted" },
  rejected: { bg: "#fee2e2", color: "#b91c1c", label: "❌ Rejected" },
};

function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000)    return "Just now";
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function PurchaseRequestsPage({ setPage, setChatWith }) {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("incoming"); // incoming (seller) | outgoing (buyer)
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const q1 = query(collection(db, "purchaseRequests"), where("sellerId", "==", currentUser.uid));
    const q2 = query(collection(db, "purchaseRequests"), where("buyerId",  "==", currentUser.uid));

    const u1 = onSnapshot(q1, s => {
      const d = s.docs.map(d => ({ id: d.id, ...d.data() }));
      d.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setIncoming(d);
      setLoading(false);
    });
    const u2 = onSnapshot(q2, s => {
      const d = s.docs.map(d => ({ id: d.id, ...d.data() }));
      d.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOutgoing(d);
    });
    return () => { u1(); u2(); };
  }, [currentUser]);

  async function handleAccept(req) {
    try {
      // 1. Update request status
      await updateDoc(doc(db, "purchaseRequests", req.id), { status: "accepted" });
      // 2. Mark listing as sold
      await updateDoc(doc(db, "listings", req.listingId), { status: "sold" });
      // 3. Notify buyer
      await addDoc(collection(db, "notifications"), {
        type:         "request_accepted",
        sellerId:     currentUser.uid,
        buyerId:      req.buyerId,
        buyerName:    req.buyerName,
        listingId:    req.listingId,
        listingTitle: req.listingTitle,
        requestId:    req.id,
        read:         false,
        createdAt:    serverTimestamp()
      });
      toast("Request accepted! Item marked as sold. 🎉", "success");
    } catch (err) {
      console.error(err);
      toast("Failed to accept request", "error");
    }
  }

  async function handleReject(req) {
    try {
      await updateDoc(doc(db, "purchaseRequests", req.id), { status: "rejected" });
      await addDoc(collection(db, "notifications"), {
        type:         "request_rejected",
        sellerId:     currentUser.uid,
        buyerId:      req.buyerId,
        buyerName:    req.buyerName,
        listingId:    req.listingId,
        listingTitle: req.listingTitle,
        requestId:    req.id,
        read:         false,
        createdAt:    serverTimestamp()
      });
      toast("Request rejected.", "success");
    } catch {
      toast("Failed to reject request", "error");
    }
  }

  const requests = tab === "incoming" ? incoming : outgoing;

  return (
    <div className="container" style={{ maxWidth: 800, paddingTop: 28, paddingBottom: 40 }}>
      <div className="page-header">
        <h2>🛒 Purchase Requests</h2>
        <p>Manage buy requests for your listings</p>
      </div>

      <div className="profile-tabs" style={{ marginBottom: 24 }}>
        <button className={`profile-tab ${tab === "incoming" ? "active" : ""}`} onClick={() => setTab("incoming")}>
          Incoming ({incoming.filter(r => r.status === "pending").length} pending)
        </button>
        <button className={`profile-tab ${tab === "outgoing" ? "active" : ""}`} onClick={() => setTab("outgoing")}>
          My Requests ({outgoing.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{tab === "incoming" ? "📬" : "🛍️"}</div>
          <h3>{tab === "incoming" ? "No incoming requests" : "No requests sent"}</h3>
          <p>{tab === "incoming"
            ? "When buyers click 'Buy Now' on your listings, requests appear here."
            : "Browse listings and click 'Buy Now' to send a purchase request."}
          </p>
          {tab === "outgoing" && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setPage("home")}>
              Browse Listings
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {requests.map(req => {
            const s = STATUS_STYLE[req.status] || STATUS_STYLE.pending;
            return (
              <div key={req.id} className="request-card">
                {req.listingImage && (
                  <img src={req.listingImage} alt="" className="request-img" />
                )}
                <div className="request-body">
                  <div className="request-title">{req.listingTitle}</div>
                  <div className="request-meta">
                    {tab === "incoming"
                      ? <>👤 <strong>{req.buyerName}</strong> wants to buy</>
                      : <>🏪 Seller: <strong>{req.sellerName}</strong></>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--p)" }}>
                      {req.isFree ? "Free 💚" : `₹${req.price}`}
                    </div>
                    <span style={{
                      padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 800,
                      background: s.bg, color: s.color
                    }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{timeAgo(req.createdAt)}</div>
                </div>
                {tab === "incoming" && req.status === "pending" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-green btn-sm" onClick={() => handleAccept(req)}>✅ Accept</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(req)}>❌ Reject</button>
                  </div>
                )}
                {tab === "outgoing" && req.status === "accepted" && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--grn)", textAlign: "center", padding: "0 8px" }}>
                    Accepted!<br/>Check your chat 💬
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
