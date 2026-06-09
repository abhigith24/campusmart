import React, { useState, useEffect } from "react";
import {
  collection, query, where, doc, getDoc, updateDoc, onSnapshot, getDocs
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import { useNotifications } from "../context/NotificationsContext";
import ListingCard from "../components/ListingCard";

const BRANCHES = ["Computer Science","Electronics","Mechanical","Civil","Chemical","MBA","Other"];
const YEARS    = ["1st Year","2nd Year","3rd Year","4th Year","PG"];

function AnalyticsTab({ listings }) {
  const [inquiries, setInquiries] = useState(0);

  const activeListings = listings.filter(l => l.status === "active");
  const soldListings   = listings.filter(l => l.status === "sold");
  const totalViews     = listings.reduce((sum, l) => sum + (l.views || 0), 0);
  const totalListed    = listings.length;
  const convRate       = totalListed > 0 ? Math.round((soldListings.length / totalListed) * 100) : 0;
  const bestListing    = [...listings].sort((a, b) => (b.views || 0) - (a.views || 0))[0];

  // Fetch total messages received as seller
  useEffect(() => {
    async function fetchInquiries() {
      try {
        const q = query(collection(db, "purchaseRequests"), where("sellerId", "==", listings[0]?.sellerId));
        const snap = await getDocs(q);
        setInquiries(snap.size);
      } catch { /* ignore */ }
    }
    if (listings.length > 0 && listings[0]?.sellerId) fetchInquiries();
  }, [listings]);

  // Simple bar chart using pure CSS
  const maxViews = Math.max(...listings.map(l => l.views || 0), 1);

  return (
    <div className="analytics-tab">
      {/* Stats row */}
      <div className="analytics-stats-grid">
        {[
          { label:"Total Views",       value: totalViews,            icon:"👁",  color:"var(--p)" },
          { label:"Active Listings",   value: activeListings.length, icon:"📦",  color:"#22c55e" },
          { label:"Items Sold",        value: soldListings.length,   icon:"✅",  color:"#6366f1" },
          { label:"Total Inquiries",   value: inquiries,             icon:"💬",  color:"#2563eb" },
          { label:"Conversion Rate",   value: `${convRate}%`,        icon:"📈",  color:"var(--p-dark)" },
        ].map(s => (
          <div key={s.label} className="analytics-stat-card">
            <div className="analytics-stat-icon">{s.icon}</div>
            <div className="analytics-stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="analytics-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Best performing listing */}
      {bestListing && (bestListing.views || 0) > 0 && (
        <div className="analytics-best">
          <div className="analytics-section-title">🏆 Best Performing Listing</div>
          <div className="analytics-best-card">
            {bestListing.images?.[0] && (
              <img src={bestListing.images[0]} alt="" className="analytics-best-img" />
            )}
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:15, color:"var(--txt)", marginBottom:4 }}>{bestListing.title}</div>
              <div style={{ fontSize:13, color:"var(--muted)" }}>
                👁 {bestListing.views || 0} views · {bestListing.category} · {bestListing.condition}
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--p)", marginTop:4 }}>
                {bestListing.isFree ? "Free 💚" : `₹${Number(bestListing.price || 0).toLocaleString("en-IN")}`}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <span className={`status-badge ${bestListing.status}`}>{bestListing.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Views per listing bar chart */}
      {listings.length > 0 && (
        <div className="analytics-chart">
          <div className="analytics-section-title">📊 Views per Listing</div>
          {listings.length === 0 ? (
            <div style={{ color:"var(--muted)", fontSize:13, textAlign:"center", padding:24 }}>No listings yet</div>
          ) : (
            <div className="analytics-bars">
              {listings.slice(0, 8).map((l, i) => {
                const pct = Math.round(((l.views || 0) / maxViews) * 100);
                return (
                  <div key={l.id} className="analytics-bar-row">
                    <div className="analytics-bar-label" title={l.title}>
                      {l.title.length > 22 ? l.title.slice(0, 22) + "…" : l.title}
                    </div>
                    <div className="analytics-bar-track">
                      <div className="analytics-bar-fill" style={{ width:`${Math.max(pct, 2)}%` }} />
                    </div>
                    <div className="analytics-bar-count">{l.views || 0}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {listings.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3>No data yet</h3>
          <p>Post your first item to start seeing analytics.</p>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage({ setPage, setSelectedListing, initialTab }) {
  const { currentUser, userProfile, fetchProfile } = useAuth();
  const toast = useToast();
  const { wishlistDocs } = useWishlist();
  const { unreadCount }  = useNotifications();

  const [tab,           setTab]           = useState(initialTab || "active");
  const [listings,      setListings]      = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [editing,       setEditing]       = useState(false);

  const [editName,    setEditName]    = useState("");
  const [editCollege, setEditCollege] = useState("");
  const [editBranch,  setEditBranch]  = useState("");
  const [editYear,    setEditYear]    = useState("");

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const q = query(collection(db, "listings"), where("sellerId", "==", currentUser.uid));
    const unsub = onSnapshot(q, snap => {
      setListings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  useEffect(() => {
    if (!wishlistDocs.length) { setWishlistItems([]); return; }
    let cancelled = false;
    async function load() {
      const items = [];
      for (const w of wishlistDocs) {
        try {
          const snap = await getDoc(doc(db, "listings", w.listingId));
          if (snap.exists() && !cancelled) items.push({ id: snap.id, ...snap.data() });
        } catch {}
      }
      if (!cancelled) setWishlistItems(items);
    }
    load();
    return () => { cancelled = true; };
  }, [wishlistDocs]);

  function startEdit() {
    setEditName(userProfile?.name || "");
    setEditCollege(userProfile?.college || "");
    setEditBranch(userProfile?.branch || "");
    setEditYear(userProfile?.year || "");
    setEditing(true);
  }

  async function saveEdit() {
    await updateDoc(doc(db, "users", currentUser.uid), {
      name: editName, college: editCollege, branch: editBranch, year: editYear
    });
    await fetchProfile(currentUser.uid);
    setEditing(false);
    toast("Profile updated! ✅", "success");
  }

  const activeListings = listings.filter(l => l.status === "active");
  const soldListings   = listings.filter(l => l.status === "sold");
  let displayListings  = tab === "active" ? activeListings : tab === "sold" ? soldListings : [];
  const initials = (userProfile?.name || currentUser?.displayName || "?")[0]?.toUpperCase();

  const TABS = [
    { id:"active",    label:`Active (${activeListings.length})` },
    { id:"sold",      label:`Sold (${soldListings.length})` },
    { id:"analytics", label:"📊 Analytics" },
    { id:"wishlist",  label:`❤️ Wishlist (${wishlistDocs.length})` },
    { id:"requests",  label:"🛒 Requests" },
    { id:"notifs",    label:`🔔 Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
  ];

  return (
    <div className="container profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="" /> : initials}
        </div>
        <div style={{ flex:1 }}>
          {editing ? (
            <div>
              <div className="form-row" style={{ marginBottom:8 }}>
                <input className="form-input" placeholder="Your name" value={editName} onChange={e => setEditName(e.target.value)} />
                <input className="form-input" placeholder="College name" value={editCollege} onChange={e => setEditCollege(e.target.value)} />
              </div>
              <div className="form-row">
                <select className="form-input" value={editBranch} onChange={e => setEditBranch(e.target.value)}>
                  {BRANCHES.map(b => <option key={b}>{b}</option>)}
                </select>
                <select className="form-input" value={editYear} onChange={e => setEditYear(e.target.value)}>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save Changes</button>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="profile-name" style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                {userProfile?.name || currentUser?.displayName}
                {userProfile?.isVerified && <span className="verified-badge-lg">✓ Verified Student</span>}
              </div>
              <div className="profile-college">
                {[userProfile?.college, userProfile?.branch, userProfile?.year].filter(Boolean).join(" • ")}
              </div>
              <div className="profile-college">{currentUser?.email}</div>
              {userProfile?.rating > 0 && (
                <div className="profile-rating-display">
                  <div className="profile-stars">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={`profile-star ${n <= Math.round(userProfile.rating) ? "filled" : ""}`}>★</span>
                    ))}
                  </div>
                  <span className="profile-rating-num">{userProfile.rating.toFixed(1)}</span>
                  <span className="profile-rating-count">({userProfile.totalRatings} review{userProfile.totalRatings !== 1 ? "s" : ""})</span>
                </div>
              )}
              <div className="profile-stats">
                <div className="profile-stat"><div className="n">{activeListings.length}</div><div className="l">Active</div></div>
                <div className="profile-stat"><div className="n">{soldListings.length}</div><div className="l">Sold</div></div>
                <div className="profile-stat"><div className="n">{wishlistDocs.length}</div><div className="l">Wishlist</div></div>
              </div>
            </>
          )}
        </div>
        {!editing && (
          <button className="btn btn-outline btn-sm profile-edit-btn" onClick={startEdit}>✏️ Edit</button>
        )}
      </div>

      {/* Tab Nav */}
      <div className="profile-tabs" style={{ flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.id} className={`profile-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {(tab === "active" || tab === "sold") && (
        loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : displayListings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{tab === "active" ? "📦" : "✅"}</div>
            <h3>{tab === "active" ? "No active listings" : "Nothing sold yet"}</h3>
            <p>{tab === "active" ? "Post your first item and start selling!" : "Accept a purchase request to mark items sold."}</p>
            {tab === "active" && <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setPage("post")}>+ Post Item</button>}
          </div>
        ) : (
          <div className="listings-grid">
            {displayListings.map(l => (
              <ListingCard key={l.id} listing={l} onClick={() => { setSelectedListing(l); setPage("listing"); }} />
            ))}
          </div>
        )
      )}

      {tab === "analytics" && (
        loading
          ? <div className="loading-center"><div className="spinner" /></div>
          : <AnalyticsTab listings={listings} />
      )}

      {tab === "wishlist" && (
        wishlistItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">❤️</div>
            <h3>Your wishlist is empty</h3>
            <p>Tap the heart icon on any listing to save it here.</p>
            <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setPage("home")}>Browse Listings</button>
          </div>
        ) : (
          <div className="listings-grid">
            {wishlistItems.map(l => (
              <ListingCard key={l.id} listing={l} onClick={() => { setSelectedListing(l); setPage("listing"); }} />
            ))}
          </div>
        )
      )}

      {tab === "requests" && (
        <div style={{ textAlign:"center", paddingTop:20 }}>
          <button className="btn btn-primary" onClick={() => setPage("purchase-requests")}>🛒 Open Purchase Requests Dashboard</button>
        </div>
      )}

      {tab === "notifs" && (
        <div style={{ textAlign:"center", paddingTop:20 }}>
          <button className="btn btn-primary" onClick={() => setPage("notifications")}>
            🔔 Open Notifications
            {unreadCount > 0 && <span className="notif-badge-inline">{unreadCount}</span>}
          </button>
        </div>
      )}
    </div>
  );
}
