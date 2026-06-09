import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const STATUS_COLORS = {
  active:   { bg:"#dcfce7", color:"#15803d" },
  sold:     { bg:"#dbeafe", color:"#1d4ed8" },
  removed:  { bg:"#fee2e2", color:"#b91c1c" },
  deleted:  { bg:"#f3f4f6", color:"#6b7280" },
  flagged:  { bg:"#e0f2fe", color:"#0369a1" },
  pending:  { bg:"#fef9c3", color:"#a16207" },
  accepted: { bg:"#dcfce7", color:"#15803d" },
  rejected: { bg:"#fee2e2", color:"#b91c1c" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.deleted;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export default function AdminPage() {
  const { userProfile } = useAuth();
  const toast = useToast();
  const [tab,           setTab]           = useState("overview");
  const [listings,      setListings]      = useState([]);
  const [users,         setUsers]         = useState([]);
  const [requests,      setRequests]      = useState([]);
  const [stats,         setStats]         = useState({});
  const [loading,       setLoading]       = useState(true);
  const [listingSearch, setListingSearch] = useState("");
  const [listingFilter, setListingFilter] = useState("all");
  const [userSearch,    setUserSearch]    = useState("");

  useEffect(() => {
    if (!userProfile?.isAdmin) return;
    loadData();
  }, [userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    const [listSnap, userSnap, reqSnap, ratingSnap, chatSnap] = await Promise.all([
      getDocs(query(collection(db, "listings"),         orderBy("createdAt", "desc"))),
      getDocs(collection(db, "users")),
      getDocs(query(collection(db, "purchaseRequests"), orderBy("createdAt", "desc"))),
      getDocs(collection(db, "ratings")),
      getDocs(collection(db, "chats")),
    ]);
    const ldata = listSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const udata = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const rdata = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const ratdata = ratingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const cdata  = chatSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const activeSellers = new Set(ldata.filter(l => l.status === "active").map(l => l.sellerId)).size;
    setListings(ldata);
    setUsers(udata);
    setRequests(rdata);
    setStats({
      totalListings: ldata.length,
      active:        ldata.filter(l => l.status === "active" && !l.flagged).length,
      sold:          ldata.filter(l => l.status === "sold").length,
      free:          ldata.filter(l => l.isFree).length,
      flagged:       ldata.filter(l => l.flagged).length,
      users:         udata.length,
      banned:        udata.filter(u => u.banned).length,
      pendingReqs:   rdata.filter(r => r.status === "pending").length,
      acceptedReqs:  rdata.filter(r => r.status === "accepted").length,
      totalRatings:  ratdata.length,
      avgRating:     ratdata.length ? (ratdata.reduce((s,r) => s + r.stars, 0) / ratdata.length).toFixed(1) : "—",
      totalChats:    cdata.length,
      activeSellers,
    });
    setLoading(false);
  }

  async function removeListing(id) {
    await updateDoc(doc(db, "listings", id), { status: "removed" });
    toast("Listing removed ✅", "success");
    loadData();
  }
  async function restoreListing(id) {
    await updateDoc(doc(db, "listings", id), { status: "active" });
    toast("Listing restored ✅", "success");
    loadData();
  }
  async function flagListing(id) {
    await updateDoc(doc(db, "listings", id), { flagged: true });
    toast("Listing flagged 🚩 — seller will see a warning", "success");
    loadData();
  }
  async function unflagListing(id) {
    await updateDoc(doc(db, "listings", id), { flagged: false });
    toast("Flag removed ✅", "success");
    loadData();
  }
  async function toggleAdmin(uid, current) {
    await updateDoc(doc(db, "users", uid), { isAdmin: !current });
    toast(`Admin ${!current ? "granted" : "revoked"} ✅`, "success");
    loadData();
  }
  async function banUser(uid) {
    if (!window.confirm("Ban this user? Their listings will be hidden.")) return;
    await updateDoc(doc(db, "users", uid), { banned: true });
    // Also remove all their active listings
    const userListings = listings.filter(l => l.sellerId === uid && l.status === "active");
    for (const l of userListings) {
      await updateDoc(doc(db, "listings", l.id), { status: "removed" });
    }
    toast("User banned and listings removed 🚫", "success");
    loadData();
  }
  async function unbanUser(uid) {
    await updateDoc(doc(db, "users", uid), { banned: false });
    toast("User unbanned ✅", "success");
    loadData();
  }

  if (!userProfile?.isAdmin) {
    return (
      <div className="container" style={{ paddingTop: 60, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h2 style={{ marginTop: 16 }}>Admin Access Only</h2>
        <p style={{ color: "var(--muted)" }}>You don't have admin privileges.</p>
      </div>
    );
  }

  const TABS = [
    { id: "overview",  label: "📊 Overview" },
    { id: "listings",  label: `📦 Listings (${stats.totalListings || 0}) ${stats.flagged > 0 ? `🚩${stats.flagged}` : ""}` },
    { id: "requests",  label: `🛒 Requests (${stats.pendingReqs || 0} pending)` },
    { id: "users",     label: `👤 Users (${stats.users || 0}) ${stats.banned > 0 ? `🚫${stats.banned}` : ""}` },
  ];

  return (
    <div className="container admin-page">
      <div className="page-header">
        <h2>🛡️ Admin Panel</h2>
        <p>Platform overview and moderation</p>
      </div>

      <div className="profile-tabs" style={{ marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} className={`profile-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* ── Overview ── */}
          {tab === "overview" && (
            <>
              <div className="admin-grid">
                {[
                  { num: stats.users,         lbl: "Students",            icon: "👤", accent:"#6366f1" },
                  { num: stats.active,        lbl: "Active Listings",     icon: "📦", accent:"#0f766e" },
                  { num: stats.free,          lbl: "Free Items",          icon: "💚", accent:"#22c55e" },
                  { num: stats.sold,          lbl: "Sold Products",       icon: "💸", accent:"#3b82f6" },
                  { num: stats.totalRatings,  lbl: `Reviews (⭐ ${stats.avgRating})`, icon: "⭐", accent:"#2563eb" },
                  { num: stats.totalChats,    lbl: "Total Chats",         icon: "💬", accent:"#8b5cf6" },
                  { num: stats.activeSellers, lbl: "Active Sellers",      icon: "🏪", accent:"#ec4899" },
                  { num: stats.flagged,       lbl: "Flagged",             icon: "🚩", accent:"#ef4444" },
                  { num: stats.pendingReqs,   lbl: "Pending Requests",    icon: "⏳", accent:"#a16207" },
                ].map((s, i) => (
                  <div className="stat-card" key={i}>
                    <div style={{ fontSize:26, marginBottom:6 }}>{s.icon}</div>
                    <div className="num" style={{ color: s.accent }}>{s.num ?? 0}</div>
                    <div className="lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:"var(--r-md)", padding:20, marginTop:8 }}>
                <div style={{ fontWeight:800, color:"#15803d", marginBottom:8 }}>📊 Platform Health</div>
                <div style={{ display:"flex", gap:32, flexWrap:"wrap", fontSize:14, color:"var(--txt-2)" }}>
                  <div><strong>Conversion:</strong> {stats.totalListings > 0 ? `${Math.round((stats.sold/stats.totalListings)*100)}%` : "—"} items sold</div>
                  <div><strong>Free ratio:</strong> {stats.totalListings > 0 ? `${Math.round((stats.free/stats.totalListings)*100)}%` : "—"} donated</div>
                  <div><strong>Deal rate:</strong> {requests.length > 0 ? `${Math.round((stats.acceptedReqs/requests.length)*100)}%` : "—"} accepted</div>
                  <div><strong>Avg rating:</strong> {stats.avgRating} / 5 ⭐</div>
                </div>
              </div>
            </>
          )}

          {/* ── Listings ── */}
          {tab === "listings" && (
            <>
              {/* Search + filter bar */}
              <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  className="form-input"
                  style={{ maxWidth: 280, padding: "8px 14px" }}
                  placeholder="🔍 Search listings..."
                  value={listingSearch}
                  onChange={e => setListingSearch(e.target.value)}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  {["all","active","flagged","removed"].map(s => (
                    <button
                      key={s}
                      className={`btn btn-sm ${listingFilter === s ? "btn-primary" : "btn-outline"}`}
                      onClick={() => setListingFilter(s)}
                    >
                      {s === "all" ? "All" : s === "active" ? "✅ Active" : s === "flagged" ? "🚩 Flagged" : "🚫 Removed"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: "white", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflow: "auto" }}>
                <table className="report-table">
                  <thead>
                    <tr><th>Item</th><th>Seller</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {listings
                      .filter(l => {
                        if (listingFilter === "flagged")  return l.flagged;
                        if (listingFilter === "removed")  return l.status === "removed";
                        if (listingFilter === "active")   return l.status === "active" && !l.flagged;
                        return true;
                      })
                      .filter(l => !listingSearch || l.title?.toLowerCase().includes(listingSearch.toLowerCase()) || l.sellerName?.toLowerCase().includes(listingSearch.toLowerCase()))
                      .map(l => (
                        <tr key={l.id} style={{ background: l.flagged ? "#fff7ed" : "transparent" }}>
                          <td style={{ fontWeight: 700, maxWidth: 180 }}>
                            {l.flagged && <span style={{ color: "#0369a1", marginRight: 4 }}>🚩</span>}
                            {l.title}
                          </td>
                          <td>{l.sellerName}</td>
                          <td>{l.category}</td>
                          <td>{l.isFree ? <span style={{ color: "var(--green)", fontWeight: 700 }}>Free</span> : `₹${l.price}`}</td>
                          <td><StatusBadge status={l.flagged && l.status === "active" ? "flagged" : l.status} /></td>
                          <td>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {l.status === "active" && !l.flagged && (
                                <>
                                  <button className="btn btn-sm" style={{ background: "#e0f2fe", color: "#0369a1", border: "1px solid #0369a1", borderRadius: 6 }} onClick={() => flagListing(l.id)}>🚩 Flag</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => removeListing(l.id)}>🚫 Remove</button>
                                </>
                              )}
                              {l.status === "active" && l.flagged && (
                                <>
                                  <button className="btn btn-sm btn-outline" onClick={() => unflagListing(l.id)}>✅ Unflag</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => removeListing(l.id)}>🚫 Remove</button>
                                </>
                              )}
                              {l.status === "removed" && (
                                <button className="btn btn-green btn-sm" onClick={() => restoreListing(l.id)}>♻️ Restore</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Purchase Requests ── */}
          {tab === "requests" && (
            <div style={{ background: "white", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflow: "auto" }}>
              <table className="report-table">
                <thead>
                  <tr><th>Item</th><th>Buyer</th><th>Seller</th><th>Price</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{r.listingTitle}</td>
                      <td>{r.buyerName}</td>
                      <td>{r.sellerName}</td>
                      <td>{r.isFree ? <span style={{ color: "var(--green)", fontWeight: 700 }}>Free</span> : `₹${r.price}`}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>
                        {r.createdAt?.toDate
                          ? new Date(r.createdAt.toDate()).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Users ── */}
          {tab === "users" && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  className="form-input"
                  style={{ maxWidth: 280, padding: "8px 14px" }}
                  placeholder="🔍 Search by name or email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>
                  {users.length} students registered
                </div>
              </div>
              <div style={{ background: "white", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflow: "auto" }}>
                <table className="report-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>College</th><th>Year</th><th>Rating</th><th>Admin</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => !userSearch ||
                        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email?.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map(u => (
                        <tr key={u.id} style={{ background: u.banned ? "#fff0f0" : "transparent" }}>
                          <td style={{ fontWeight: 700 }}>
                            {u.banned && <span style={{ marginRight: 4 }}>🚫</span>}
                            {u.name}
                          </td>
                          <td style={{ fontSize: 13 }}>{u.email}</td>
                          <td>{u.college}</td>
                          <td>{u.year}</td>
                          <td>{u.rating > 0 ? `⭐ ${u.rating.toFixed(1)}` : "—"}</td>
                          <td>
                            <button
                              className={`btn btn-sm ${u.isAdmin ? "btn-danger" : "btn-outline"}`}
                              onClick={() => toggleAdmin(u.id, u.isAdmin)}
                            >
                              {u.isAdmin ? "Revoke Admin" : "Grant Admin"}
                            </button>
                          </td>
                          <td>
                            {!u.isAdmin && (
                              u.banned
                                ? <button className="btn btn-green btn-sm" onClick={() => unbanUser(u.id)}>✅ Unban</button>
                                : <button className="btn btn-danger btn-sm" onClick={() => banUser(u.id)}>🚫 Ban</button>
                            )}
                            {u.isAdmin && (
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>Protected</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
