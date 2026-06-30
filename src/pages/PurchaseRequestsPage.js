import React, { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { transactionService } from "../services/transactionService";
import { PurchaseService } from "../services/purchaseService";
import { REQUEST_STATUS } from "../constants/requestStatus";
import { 
  Inbox, ShoppingCart, Clock, CheckCircle, XCircle, DollarSign, 
  Search, User, MessageSquare, ShieldCheck, XOctagon 
} from "lucide-react";

const STATUS_STYLE = {
  [REQUEST_STATUS.PENDING]:   { bg: "var(--status-pending-bg)", color: "var(--status-pending-txt)", label: "⏳ Pending" },
  [REQUEST_STATUS.ACCEPTED]:  { bg: "var(--status-accepted-bg)", color: "var(--status-accepted-txt)", label: "✅ Accepted" },
  [REQUEST_STATUS.DECLINED]:  { bg: "var(--status-rejected-bg)", color: "var(--status-rejected-txt)", label: "❌ Declined" },
  [REQUEST_STATUS.CANCELLED]: { bg: "var(--status-rejected-bg)", color: "var(--status-rejected-txt)", label: "🚫 Cancelled" },
  [REQUEST_STATUS.EXCHANGED]: { bg: "var(--status-accepted-bg)", color: "var(--status-accepted-txt)", label: "🤝 Exchanged" },
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

export default function PurchaseRequestsPage({ setPage, setChatWith, setViewProfileUserId }) {
  const { currentUser } = useAuth();
  const toast = useToast();
  
  const [tab, setTab] = useState("incoming"); // incoming (seller) | outgoing (buyer)
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  // Fetch Requests
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const q1 = query(collection(db, "purchaseRequests"), where("sellerId", "==", currentUser.uid));
    const q2 = query(collection(db, "purchaseRequests"), where("buyerId",  "==", currentUser.uid));

    const u1 = onSnapshot(q1, async s => {
      const d = s.docs.map(d => ({ id: d.id, ...d.data() }));
      const enriched = await PurchaseService.enrichRequests(d);
      enriched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setIncoming(enriched);
      setLoading(false);
    });
    const u2 = onSnapshot(q2, async s => {
      const d = s.docs.map(d => ({ id: d.id, ...d.data() }));
      const enriched = await PurchaseService.enrichRequests(d);
      enriched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOutgoing(enriched);
    });
    return () => { u1(); u2(); };
  }, [currentUser]);

  // Request actions
  const handleAccept = async (req) => {
    try {
      await transactionService.acceptPurchaseRequest(currentUser.uid, req);
      toast("Request accepted! Item marked as reserved. 🎉", "success");
    } catch (err) {
      console.error(err);
      toast(`Failed to accept request: ${err.message}`, "error");
    }
  };

  const handleReject = async (req) => {
    try {
      await transactionService.declinePurchaseRequest(currentUser.uid, req);
      toast("Request declined.", "success");
    } catch (err) {
      console.error(err);
      toast(`Failed to decline request: ${err.message}`, "error");
    }
  };

  const handleCancelAcceptance = async (req) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "purchaseRequests", req.id), {
        status: REQUEST_STATUS.CANCELLED,
        updatedAt: serverTimestamp()
      });
      batch.update(doc(db, "listings", req.listingId), {
        status: "active",
        updatedAt: serverTimestamp()
      });
      await batch.commit();
      toast("Acceptance cancelled. Listing is active again! 🔄", "success");
    } catch (err) {
      console.error(err);
      toast(`Failed to cancel acceptance: ${err.message}`, "error");
    }
  };

  const handleMarkExchanged = async (req) => {
    if (!window.confirm("Are you sure you want to mark this transaction as completed?")) return;
    try {
      await transactionService.markListingExchanged(currentUser.uid, req);
      toast("Item marked as exchanged! 🎉", "success");
    } catch (err) {
      console.error(err);
      toast(`Failed to mark as exchanged: ${err.message}`, "error");
    }
  };

  const handleOpenChat = (req) => {
    const chatId = [req.buyerId, req.sellerId].sort().join("_") + "_" + req.listingId;
    setChatWith({
      chatId,
      listingId: req.listingId,
      listingTitle: req.listingTitle,
      buyerId: req.buyerId,
      sellerId: req.sellerId,
      participants: [req.buyerId, req.sellerId]
    });
    setPage("chat");
  };

  const handleViewProfile = (userId) => {
    if (setViewProfileUserId) {
      setViewProfileUserId(userId);
      setPage("profile");
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const activeRequests = tab === "incoming" ? incoming : outgoing;
    const pending = activeRequests.filter(r => r.status === REQUEST_STATUS.PENDING).length;
    const accepted = activeRequests.filter(r => r.status === REQUEST_STATUS.ACCEPTED).length;
    const declined = activeRequests.filter(r => r.status === REQUEST_STATUS.DECLINED || r.status === REQUEST_STATUS.CANCELLED).length;
    const completed = activeRequests.filter(r => r.status === REQUEST_STATUS.EXCHANGED).length;
    
    // Earnings based on EXCHANGED requests
    const earnings = activeRequests.filter(r => r.status === REQUEST_STATUS.EXCHANGED).reduce((sum, r) => sum + (r.price || 0), 0);
    
    // Mock response rate
    const responseRate = "96%";

    return { total: activeRequests.length, pending, accepted, declined, completed, earnings, responseRate };
  }, [incoming, outgoing, tab]);

  // Filtering and searching logic
  const filteredRequests = useMemo(() => {
    let result = tab === "incoming" ? [...incoming] : [...outgoing];

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(r => 
        r.listingTitle?.toLowerCase().includes(q) ||
        r.buyerName?.toLowerCase().includes(q) ||
        r.sellerName?.toLowerCase().includes(q)
      );
    }

    // Filter Chips
    if (activeFilter !== "All") {
      const filterLower = activeFilter.toLowerCase();
      result = result.filter(r => {
        if (filterLower === "pending") return r.status === REQUEST_STATUS.PENDING;
        if (filterLower === "accepted") return r.status === REQUEST_STATUS.ACCEPTED;
        if (filterLower === "declined") return r.status === REQUEST_STATUS.DECLINED || r.status === REQUEST_STATUS.CANCELLED;
        if (filterLower === "completed") return r.status === REQUEST_STATUS.EXCHANGED;
        return true;
      });
    }

    return result;
  }, [incoming, outgoing, tab, searchTerm, activeFilter]);

  return (
    <div className="container purchase-requests-container" style={{ maxWidth: 1000 }}>
      {/* Title */}
      <div className="pr-header" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button 
          className="btn btn-ghost pr-back-btn" 
          onClick={() => setPage("home")} 
          type="button"
          aria-label="Back to home"
        >
          ←
        </button>
        <div>
          <h2 className="pr-title" style={{ margin: 0 }}>🛒 Purchase Requests Dashboard</h2>
          <p className="pr-subtitle" style={{ color: "var(--muted)", margin: 0 }}>Manage transaction offers and exchanges</p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="profile-tabs pr-tabs">
        <button className={`profile-tab ${tab === "incoming" ? "active" : ""}`} onClick={() => { setTab("incoming"); setActiveFilter("All"); }}>
          Incoming Offers ({incoming.filter(r => r.status === REQUEST_STATUS.PENDING).length} pending)
        </button>
        <button className={`profile-tab ${tab === "outgoing" ? "active" : ""}`} onClick={() => { setTab("outgoing"); setActiveFilter("All"); }}>
          My Buy Requests ({outgoing.length})
        </button>
      </div>

      {/* ================= SUMMARY STATISTIC CARDS ================= */}
      <div className="seller-summary-grid pr-stats-grid">
        <div className="seller-summary-card">
          <div className="seller-summary-header"><Inbox size={14} style={{ color: "var(--p)" }} /> Total</div>
          <div className="seller-summary-value">{metrics.total}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><Clock size={14} style={{ color: "var(--warn)" }} /> Pending</div>
          <div className="seller-summary-value">{metrics.pending}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><CheckCircle size={14} style={{ color: "var(--grn)" }} /> Accepted</div>
          <div className="seller-summary-value">{metrics.accepted}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><XOctagon size={14} style={{ color: "var(--red)" }} /> Cancelled</div>
          <div className="seller-summary-value">{metrics.declined}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><CheckCircle size={14} style={{ color: "#3b82f6" }} /> Exchanged</div>
          <div className="seller-summary-value">{metrics.completed}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><DollarSign size={14} style={{ color: "var(--grn)" }} /> Total Value</div>
          <div className="seller-summary-value" style={{ fontSize: "16px", paddingTop: "4px" }}>
            {metrics.earnings > 0 ? `₹${metrics.earnings.toLocaleString("en-IN")}` : "₹0.00"}
          </div>
        </div>
      </div>

      {/* ================= SEARCH & FILTERS ================= */}
      <div className="seller-search-filter-bar">
        <div className="seller-search-row">
          <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
            <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input 
              className="form-input" 
              type="text" 
              placeholder="Search buyer or listing..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "38px" }}
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="seller-filter-chips">
          {["All", "Pending", "Accepted", "Declined", "Completed"].map(chip => (
            <button
              key={chip}
              className={`seller-chip ${activeFilter === chip ? "active" : ""}`}
              onClick={() => setActiveFilter(chip)}
              type="button"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* ================= REQ LIST ================= */}
      {loading ? (
        <div className="loading-center" style={{ padding: "40px" }}><div className="spinner" /></div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state">
          {tab === "incoming" ? (
            <>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
              <h3>No Incoming Requests Yet</h3>
              <p>Requests from buyers will appear here when they make offers.</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🛒</div>
              <h3>You haven't requested any listings yet</h3>
              <p>Browse the marketplace and submit purchase offers.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setPage("home")}>
                Browse Marketplace
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="pr-list">
          {filteredRequests.map(req => {
            const s = STATUS_STYLE[req.status] || STATUS_STYLE[REQUEST_STATUS.PENDING];
            const priceVal = req.isFree ? "Free 💚" : req.price !== undefined ? `₹${req.price.toLocaleString("en-IN")}` : "Price Not Available";
            
            // Mock trust score calculation for buyer
            const mockTrustScore = Math.round(70 + ((req.buyerName?.length || 0) % 25));

            return (
              <div key={req.id} className="request-card pr-card">
                
                {/* Image */}
                {req.listingImage ? (
                  <img src={req.listingImage} alt="" className="request-img" />
                ) : (
                  <div className="request-img-placeholder">📦</div>
                )}

                {/* Body */}
                <div className="pr-card-body">
                  <div className="pr-card-title">{req.listingTitle}</div>
                  
                  {/* Price, Badge, Time (Moved up) */}
                  <div className="pr-price-row">
                    <span className="pr-price">{priceVal}</span>
                    <span className="pr-status-badge" style={{ background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                    <span className="pr-time">
                      Requested {timeAgo(req.createdAt)}
                    </span>
                  </div>
                  
                  {/* Participant info */}
                  <div className="pr-participant-info">
                    {tab === "incoming" ? (
                      <>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", background: "var(--light)", border: "1px solid var(--bdr)" }}>
                          {req.buyerPhoto ? <img src={req.buyerPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (req.buyerName || "?")[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: "13px", color: "var(--txt)" }}>
                          Buyer: <strong>{req.buyerName}</strong>
                        </span>
                        {req.buyerCollege && (
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>🎓 {req.buyerCollege}</span>
                        )}
                        <span style={{ fontSize: "11px", color: "var(--p)", background: "var(--p-light)", padding: "1px 6px", borderRadius: "8px" }}>
                          Trust Score: {mockTrustScore}%
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: "13px", color: "var(--txt)" }}>
                          Store: <strong>{req.sellerName}</strong>
                        </span>
                        {req.sellerCollege && (
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>🎓 {req.sellerCollege}</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* ================= WORKFLOW TIMELINE ================= */}
                  {req.status !== REQUEST_STATUS.DECLINED && req.status !== REQUEST_STATUS.CANCELLED ? (
                    <div className="request-timeline">
                      <span className={`request-timeline-step ${req.status === REQUEST_STATUS.PENDING ? "active" : "completed"}`}>Requested</span>
                      <span className={`request-timeline-step ${req.status === REQUEST_STATUS.ACCEPTED ? "active" : req.status === REQUEST_STATUS.EXCHANGED ? "completed" : ""}`}>Accepted</span>
                      <span className={`request-timeline-step ${req.status === REQUEST_STATUS.ACCEPTED ? "active" : req.status === REQUEST_STATUS.EXCHANGED ? "completed" : ""}`}>Chat Enabled</span>
                      <span className={`request-timeline-step ${req.status === REQUEST_STATUS.EXCHANGED ? "completed" : ""}`}>Exchanged</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--red)", fontWeight: "650", marginTop: "8px" }}>
                      <XOctagon size={14} /> Request de-listed / cancelled
                    </div>
                  )}
                </div>

                {/* Actions Panel */}
                <div className="pr-actions-panel">
                  
                  {/* Pending Incoming state actions */}
                  {tab === "incoming" && req.status === REQUEST_STATUS.PENDING && (
                    <>
                      <button className="btn btn-primary pr-btn" onClick={() => handleAccept(req)}>Accept Offer</button>
                      <div className="pr-secondary-actions">
                        <button className="btn btn-outline pr-btn pr-btn-decline" onClick={() => handleReject(req)}>Decline</button>
                        <button className="btn btn-outline pr-btn" onClick={() => handleViewProfile(req.buyerId)}>View Profile</button>
                      </div>
                    </>
                  )}

                  {/* Accepted Incoming state actions */}
                  {tab === "incoming" && req.status === REQUEST_STATUS.ACCEPTED && (
                    <>
                      <button className="btn btn-outline pr-btn" onClick={() => handleOpenChat(req)} style={{ gap: "4px" }}>
                        <MessageSquare size={16} /> Continue Chat
                      </button>
                      <button className="btn btn-primary pr-btn" onClick={() => handleMarkExchanged(req)}>Mark Exchanged</button>
                      <button className="btn btn-outline pr-btn pr-btn-decline" onClick={() => handleCancelAcceptance(req)}>Cancel Acceptance</button>
                    </>
                  )}

                  {/* Outgoing Accepted action */}
                  {tab === "outgoing" && req.status === REQUEST_STATUS.ACCEPTED && (
                    <button className="btn btn-outline pr-btn" onClick={() => handleOpenChat(req)} style={{ gap: "4px" }}>
                      <MessageSquare size={16} /> Chat with Seller
                    </button>
                  )}

                  {/* Completed transaction review options */}
                  {req.status === REQUEST_STATUS.EXCHANGED && (
                    <>
                      <button className="btn btn-outline pr-btn" onClick={() => handleOpenChat(req)} style={{ gap: "4px" }}>
                        <MessageSquare size={16} /> View Chat logs
                      </button>
                      {tab === "outgoing" && (
                        <button className="btn btn-primary pr-btn" onClick={() => setPage("reviews", { sellerId: req.sellerId })}>
                          Leave Review
                        </button>
                      )}
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
