import React from "react";
import { useNotifications } from "../context/NotificationsContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const TYPE_META = {
  // Uppercase
  PURCHASE_REQUEST:  { icon: "🛒", label: "New Purchase Request" },
  REQUEST_SENT:      { icon: "📨", label: "Purchase Request Sent" },
  REQUEST_ACCEPTED:  { icon: "✅", label: "Request Accepted" },
  REQUEST_DECLINED:  { icon: "❌", label: "Request Declined" },
  LISTING_EXCHANGED: { icon: "🤝", label: "Listing Exchanged" },
  REVIEW_RECEIVED:   { icon: "⭐", label: "New Review" },
  REVIEW_REMINDER:   { icon: "📝", label: "Review Reminder" },
  SELLER_REPORTED:   { icon: "⚠️", label: "Report Status Update" },
  NEW_CHAT:          { icon: "💬", label: "New Chat Started" },
  NEW_MESSAGE:       { icon: "📩", label: "New Message" },

  // Lowercase compatibility
  purchase_request:  { icon: "🛒", label: "New Purchase Request" },
  request_accepted:  { icon: "✅", label: "Request Accepted" },
  request_rejected:  { icon: "❌", label: "Request Rejected" },
  request_declined:  { icon: "❌", label: "Request Declined" },
  listing_exchanged: { icon: "🤝", label: "Listing Exchanged" },
  item_sold:         { icon: "💸", label: "Item Marked Sold" },
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
    <div className="notif-item skeleton-shimmer" style={{ background: "var(--card-bg)", cursor: "default", display: "flex", gap: "12px", padding: "16px", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)" }}>
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
  const { userProfile, currentUser } = useAuth();
  const isStaff = userProfile?.role === "admin" || userProfile?.role === "support";

  // Filter out marketplace notifications for staff
  const displayNotifications = notifications.filter(n => {
    if (isStaff) {
      const marketplaceTypes = [
        'purchase_request', 'request_accepted', 'request_rejected', 'item_sold', 'request_declined', 'listing_exchanged',
        'PURCHASE_REQUEST', 'REQUEST_ACCEPTED', 'REQUEST_DECLINED', 'LISTING_EXCHANGED', 'REVIEW_RECEIVED', 'SELLER_REPORTED'
      ];
      return !marketplaceTypes.includes(n.type);
    }
    
    const isSeller = currentUser?.uid === n.sellerId;
    const isBuyer = currentUser?.uid === n.buyerId;

    if (n.type === "PURCHASE_REQUEST" || n.type === "purchase_request") return isSeller;
    if (n.type === "REQUEST_SENT") return isBuyer;
    if (n.type === "REQUEST_ACCEPTED" || n.type === "request_accepted") return isBuyer;
    if (n.type === "REQUEST_DECLINED" || n.type === "request_rejected" || n.type === "request_declined") return isBuyer;
    if (n.type === "LISTING_EXCHANGED" || n.type === "listing_exchanged" || n.type === "item_sold") return isBuyer || isSeller;
    if (n.type === "REVIEW_RECEIVED" || n.type === "SELLER_REPORTED") return isSeller;
    if (n.type === "REVIEW_REMINDER") return isBuyer;
    if (n.type === "NEW_CHAT") return isBuyer;
    if (n.type === "NEW_MESSAGE") return isSeller || isBuyer;
    
    return true;
  });

  async function handleClick(n) {
    await markAsRead(n.id);
    // Navigate to the relevant listing if we have its id
    if (n.listingId && setSelectedListing) {
      // fetch the listing doc and navigate
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
      ) : displayNotifications.length === 0 ? (
        <div className="empty-state">
          <h3>🔔 No notifications yet</h3>
          <p>You're all caught up.<br />We'll notify you when something important happens.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setPage("home")}>Browse Marketplace</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {displayNotifications.map(n => {
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
                    { (n.type === "purchase_request" || n.type === "PURCHASE_REQUEST") && (
                      <><strong>{n.buyerName}</strong> wants to buy <strong>{n.listingTitle}</strong></>
                    )}
                    { n.type === "REQUEST_SENT" && (
                      <>You sent a purchase request for <strong>{n.listingTitle}</strong>.</>
                    )}
                    { (n.type === "request_accepted" || n.type === "REQUEST_ACCEPTED") && (
                      <>Your request for <strong>{n.listingTitle}</strong> was accepted! Chat with the seller.</>
                    )}
                    { (n.type === "request_rejected" || n.type === "REQUEST_DECLINED" || n.type === "request_declined") && (
                      <>Your request for <strong>{n.listingTitle}</strong> was declined.</>
                    )}
                    { (n.type === "item_sold" || n.type === "LISTING_EXCHANGED") && (
                      <>Transaction marked as completed for <strong>{n.listingTitle}</strong>.</>
                    )}
                    { n.type === "REVIEW_RECEIVED" && (
                      <>You received a new review for <strong>{n.listingTitle}</strong>.</>
                    )}
                    { n.type === "REVIEW_REMINDER" && (
                      <>Don't forget to rate your experience for <strong>{n.listingTitle}</strong>!</>
                    )}
                    { n.type === "SELLER_REPORTED" && (
                      <>Your report regarding <strong>{n.listingTitle}</strong> has been received and is under review.</>
                    )}
                    { n.type === "NEW_CHAT" && (
                      <>You can now chat regarding <strong>{n.listingTitle}</strong>.</>
                    )}
                    { n.type === "NEW_MESSAGE" && (
                      <>You have a new message about <strong>{n.listingTitle}</strong>.</>
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
