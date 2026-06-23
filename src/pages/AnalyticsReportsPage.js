import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";

export default function AnalyticsReportsPage({ setPage }) {
  const { userProfile } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.isAdmin) return;
    loadData();
  }, [userProfile]);

  async function loadData() {
    setLoading(true);
    try {
      const [listSnap, userSnap, reqSnap, ratingSnap, chatSnap] = await Promise.all([
        getDocs(query(collection(db, "listings"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "purchaseRequests"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "ratings")),
        getDocs(collection(db, "chats")),
      ]);

      const ldata = listSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const udata = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const rdata = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const ratdata = ratingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const cdata = chatSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const activeSellers = new Set(ldata.filter(l => l.status === "active").map(l => l.sellerId)).size;
      const totalListings = ldata.length;
      const sold = ldata.filter(l => l.status === "sold").length;
      const free = ldata.filter(l => l.isFree).length;
      const acceptedReqs = rdata.filter(r => r.status === "accepted").length;

      setStats({
        totalListings,
        active:        ldata.filter(l => l.status === "active" && !l.flagged).length,
        sold,
        free,
        flagged:       ldata.filter(l => l.flagged).length,
        users:         udata.length,
        banned:        udata.filter(u => u.banned).length,
        pendingReqs:   rdata.filter(r => r.status === "pending").length,
        acceptedReqs,
        totalRatings:  ratdata.length,
        avgRating:     ratdata.length ? (ratdata.reduce((s, r) => s + r.stars, 0) / ratdata.length).toFixed(1) : "—",
        totalChats:    cdata.length,
        activeSellers,
        requestsCount: rdata.length,
      });
    } catch (err) {
      console.error(err);
      toast("Failed to load analytics data. ❌", "error");
    } finally {
      setLoading(false);
    }
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

  return (
    <AdminLayout activePage="admin-analytics" setPage={setPage}>
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800 }}>📊 Analytics</h2>
        <p style={{ color: "var(--muted)" }}>Monitor platform usage and health diagnostics</p>
      </div>

      {loading ? (
        <div className="loading-center" style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }} />
        </div>
      ) : (
        <>
          <div className="admin-grid">
            {[
              { num: stats.users,         lbl: "Students",            icon: "👤", accent:"var(--p)" },
              { num: stats.active,        lbl: "Active Listings",     icon: "📦", accent:"var(--p-dark)" },
              { num: stats.free,          lbl: "Free Items",          icon: "💚", accent:"var(--grn)" },
              { num: stats.sold,          lbl: "Sold Products",       icon: "💸", accent:"var(--p-dark)" },
              { num: stats.totalRatings,  lbl: `Reviews (⭐ ${stats.avgRating})`, icon: "⭐", accent:"var(--yel)" },
              { num: stats.totalChats,    lbl: "Total Chats",         icon: "💬", accent:"var(--p)" },
              { num: stats.activeSellers, lbl: "Active Sellers",      icon: "🏪", accent:"var(--p-dark)" },
              { num: stats.flagged,       lbl: "Flagged",             icon: "🚩", accent:"var(--red)" },
              { num: stats.pendingReqs,   lbl: "Pending Requests",    icon: "⏳", accent:"var(--yel)" },
            ].map((s, i) => (
              <div className="stat-card" key={i}>
                <div style={{ fontSize:26, marginBottom:6 }}>{s.icon}</div>
                <div className="num" style={{ color: s.accent }}>{s.num ?? 0}</div>
                <div className="lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"var(--status-accepted-bg)", border:"1px solid var(--bdr)", borderRadius:"var(--r-md)", padding:20, marginTop:18 }}>
            <div style={{ fontWeight:800, color:"var(--status-accepted-txt)", marginBottom:8 }}>📊 Platform Health Metrics</div>
            <div style={{ display:"flex", gap:32, flexWrap:"wrap", fontSize:14, color:"var(--txt-2)" }}>
              <div><strong>Conversion:</strong> {stats.totalListings > 0 ? `${Math.round((stats.sold / stats.totalListings) * 100)}%` : "—"} items sold</div>
              <div><strong>Free ratio:</strong> {stats.totalListings > 0 ? `${Math.round((stats.free / stats.totalListings) * 100)}%` : "—"} donated</div>
              <div><strong>Deal rate:</strong> {stats.requestsCount > 0 ? `${Math.round((stats.acceptedReqs / stats.requestsCount) * 100)}%` : "—"} accepted</div>
              <div><strong>Avg rating:</strong> {stats.avgRating} / 5 ⭐</div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
