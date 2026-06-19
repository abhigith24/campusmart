import React from "react";
import { useNotifications } from "../context/NotificationsContext";

const TYPE_META = {
  purchase_request: { icon: "🛒", label: "New Purchase Request" },
  request_accepted: { icon: "✅", label: "Request Accepted" },
  request_rejected: { icon: "❌", label: "Request Rejected" },
  item_sold:        { icon: "💸", label: "Item Marked Sold" },
};

function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000)     return "Just now";
  if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}


function SkeletonNotificationItem() {
  return (
    <div className="notif-item skeleton-shimmer" style={{ background: "#fff", cursor: "default", display: "flex", gap: "12px", padding: "16px", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)" }}>
      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
      <div className="notif-body" style={{ flex: 1, minWidth: 0 }}>
        <div className="skeleton" style={{ height: 14, width: "30%", marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 12, width: "80%", marginBottom: 4 }} />
        <div className="skeleton" style={{ height: 10, width: "20%" }} />
      </div>
    </div>
  );
}

export default function NotificationsPage({ setPage, setSelectedListing }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();

  async function handleClick(n) {
    await markAsRead(n.id);
    // Navigate to the relevant listing if we have its id
    if (n.listingId && setSelectedListing) {
      // fetch the listing doc and navigate
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("../firebase");
      const snap = await getDoc(doc(db, "listings", n.listingId));
      if (snap.exists()) {
        const listingData = { id: snap.id, ...snap.data() };
        setSelectedListing(listingData);
        setPage("listing", listingData);
      }
    }
  }

  return (
    <div className="container" style={{ maxWidth: 700, paddingTop: 28, paddingBottom: 40 }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2>🔔 Notifications
              {unreadCount > 0 && (
                <span className="notif-badge-inline">{unreadCount}</span>
              )}
            </h2>
            <p style={{ color: "var(--muted)", marginTop: 4 }}>Stay updated on your listings and requests</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-outline btn-sm" onClick={markAllAsRead}>
              ✓ Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array(3).fill(0).map((_, i) => <SkeletonNotificationItem key={i} />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted-2)", marginBottom: 16 }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9z"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            <line x1="1" y1="1" x2="23" y2="23" stroke="var(--muted-2)" strokeWidth="1.5"/>
          </svg>
          <h3>No notifications yet</h3>
          <p>You'll be notified when someone wants to buy your items or when sellers respond.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setPage("home")}>Browse Marketplace</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notifications.map(n => {
            const meta = TYPE_META[n.type] || { icon: "📬", label: n.type };
            return (
              <div
                key={n.id}
                className={`notif-item ${!n.read ? "unread" : ""}`}
                onClick={() => handleClick(n)}
              >
                <div className="notif-icon">{meta.icon}</div>
                <div className="notif-body">
                  <div className="notif-label">{meta.label}</div>
                  <div className="notif-text">
                    {n.type === "purchase_request" && (
                      <><strong>{n.buyerName}</strong> wants to buy <strong>{n.listingTitle}</strong></>
                    )}
                    {n.type === "request_accepted" && (
                      <>Your request for <strong>{n.listingTitle}</strong> was accepted! Chat with the seller.</>
                    )}
                    {n.type === "request_rejected" && (
                      <>Your request for <strong>{n.listingTitle}</strong> was rejected.</>
                    )}
                    {n.type === "item_sold" && (
                      <>Your item <strong>{n.listingTitle}</strong> has been marked as sold.</>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                    <div className="notif-time">{timeAgo(n.createdAt)}</div>
                    {n.listingId && (
                      <span style={{ fontSize: 12, color: "var(--p)", fontWeight: 700 }}>
                        View listing →
                      </span>
                    )}
                  </div>
                </div>
                {!n.read && <div className="notif-dot" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
