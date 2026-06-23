import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";

const STATUS_COLORS = {
  active:   { bg:"var(--status-accepted-bg)", color:"var(--status-accepted-txt)" },
  sold:     { bg:"var(--status-sold-bg)", color:"var(--status-sold-txt)" },
  removed:  { bg:"var(--status-rejected-bg)", color:"var(--status-rejected-txt)" },
  deleted:  { bg:"var(--bg-secondary)", color:"var(--text-muted)" },
  flagged:  { bg:"var(--status-pending-bg)", color:"var(--status-pending-txt)" },
  pending:  { bg:"var(--status-pending-bg)", color:"var(--status-pending-txt)" },
  accepted: { bg:"var(--status-accepted-bg)", color:"var(--status-accepted-txt)" },
  rejected: { bg:"var(--status-rejected-bg)", color:"var(--status-rejected-txt)" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.deleted;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export default function AdminDashboardPage({ setPage }) {
  const { userProfile } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("listings");
  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listingSearch, setListingSearch] = useState("");
  const [listingFilter, setListingFilter] = useState("all");

  useEffect(() => {
    if (!userProfile?.isAdmin) return;
    loadData();
  }, [userProfile]);

  async function loadData() {
    setLoading(true);
    try {
      const [listSnap, reqSnap] = await Promise.all([
        getDocs(query(collection(db, "listings"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "purchaseRequests"), orderBy("createdAt", "desc")))
      ]);
      setListings(listSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast("Failed to load admin data. ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  async function removeListing(id) {
    try {
      await updateDoc(doc(db, "listings", id), { status: "removed" });
      toast("Listing removed", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to remove listing. ❌", "error");
    }
  }

  async function restoreListing(id) {
    try {
      await updateDoc(doc(db, "listings", id), { status: "active" });
      toast("Listing restored", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to restore listing. ❌", "error");
    }
  }

  async function flagListing(id) {
    try {
      await updateDoc(doc(db, "listings", id), { flagged: true });
      toast("Listing flagged 🚩", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to flag listing. ❌", "error");
    }
  }

  async function unflagListing(id) {
    try {
      await updateDoc(doc(db, "listings", id), { flagged: false });
      toast("Flag removed", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to unflag listing. ❌", "error");
    }
  }

  if (!userProfile?.isAdmin) {
    return (
      <div className="container" style={{ paddingTop: 60, textalign: "center" }}>
        <div style={{ fontSize: 48, textAlign: "center" }}>🚫</div>
        <h2 style={{ marginTop: 16, textAlign: "center" }}>Admin Access Only</h2>
        <p style={{ color: "var(--muted)", textAlign: "center" }}>You don't have admin privileges.</p>
      </div>
    );
  }

  const TABS = [
    { id: "listings", label: `📦 Listings Moderation` },
    { id: "requests", label: `🛒 Purchase Requests` }
  ];

  return (
    <AdminLayout activePage="admin" setPage={setPage}>
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800 }}>🛡️ Admin Dashboard</h2>
        <p style={{ color: "var(--muted)" }}>Moderate Listings & View Marketplace Requests</p>
      </div>

      <div className="profile-tabs" style={{ marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} className={`profile-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center" style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }} />
        </div>
      ) : (
        <>
          {/* Listings Moderation */}
          {tab === "listings" && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  className="form-input"
                  style={{ maxWidth: 280, padding: "8px 14px" }}
                  placeholder="🔍 Search listings..."
                  value={listingSearch}
                  onChange={e => setListingSearch(e.target.value)}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  {["all", "active", "flagged", "removed"].map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`btn btn-sm ${listingFilter === s ? "btn-primary" : "btn-outline"}`}
                      onClick={() => setListingFilter(s)}
                    >
                      {s === "all" ? "All" : s === "active" ? "✅ Active" : s === "flagged" ? "🚩 Flagged" : "🚫 Removed"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflow: "auto" }}>
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
                        <tr key={l.id} style={{ background: l.flagged ? "var(--status-pending-bg)" : "transparent" }}>
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
                                  <button type="button" className="btn btn-sm" style={{ background: "var(--status-pending-bg)", color: "var(--status-pending-txt)", border: "1px solid var(--status-pending-txt)", borderRadius: 6 }} onClick={() => flagListing(l.id)}>🚩 Flag</button>
                                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeListing(l.id)}>🚫 Remove</button>
                                </>
                              )}
                              {l.status === "active" && l.flagged && (
                                <>
                                  <button type="button" className="btn btn-sm btn-outline" onClick={() => unflagListing(l.id)}>✅ Unflag</button>
                                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeListing(l.id)}>🚫 Remove</button>
                                </>
                              )}
                              {l.status === "removed" && (
                                <button type="button" className="btn btn-green btn-sm" onClick={() => restoreListing(l.id)}>♻️ Restore</button>
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

          {/* Purchase Requests */}
          {tab === "requests" && (
            <div style={{ background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflow: "auto" }}>
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
        </>
      )}
    </AdminLayout>
  );
}
