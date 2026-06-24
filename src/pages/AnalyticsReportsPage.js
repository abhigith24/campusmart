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

      // Accumulate share metrics
      let totalShares = 0;
      let totalClicks = 0;
      const platformSharesSum = { whatsapp: 0, telegram: 0, email: 0, linkedin: 0, facebook: 0, twitter: 0, discord: 0, messages: 0, instagram: 0, generic: 0, clipboard: 0, native: 0 };
      const platformClicksSum = { whatsapp: 0, telegram: 0, email: 0, linkedin: 0, facebook: 0, twitter: 0, discord: 0, messages: 0, instagram: 0, generic: 0, shortlink: 0 };

      ldata.forEach(l => {
        const shares = l.sharesCount || 0;
        const clicks = l.clicksCount || 0;
        totalShares += shares;
        totalClicks += clicks;

        if (l.platformShares) {
          Object.entries(l.platformShares).forEach(([platform, count]) => {
            if (platformSharesSum[platform] !== undefined) {
              platformSharesSum[platform] += count;
            } else {
              platformSharesSum[platform] = count;
            }
          });
        }
        if (l.platformClicks) {
          Object.entries(l.platformClicks).forEach(([platform, count]) => {
            if (platformClicksSum[platform] !== undefined) {
              platformClicksSum[platform] += count;
            } else {
              platformClicksSum[platform] = count;
            }
          });
        }
      });

      // Top 5 shared listings
      const mostShared = [...ldata]
        .filter(l => (l.sharesCount || 0) > 0)
        .sort((a, b) => (b.sharesCount || 0) - (a.sharesCount || 0))
        .slice(0, 5);

      // Top 5 clicked listings
      const mostClicked = [...ldata]
        .filter(l => (l.clicksCount || 0) > 0)
        .sort((a, b) => (b.clicksCount || 0) - (a.clicksCount || 0))
        .slice(0, 5);

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
        totalShares,
        totalClicks,
        platformShares: platformSharesSum,
        platformClicks: platformClicksSum,
        mostShared,
        mostClicked
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

          {/* Share & Referral Analytics */}
          <div style={{ marginTop: 24, padding: 20, background: "var(--surface)", border: "1.5px solid var(--bdr)", borderRadius: "var(--r-md)" }}>
            <div style={{ fontWeight: 800, fontSize: "16px", display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span>🔗</span> Share & Referral Analytics
            </div>
            
            {/* Top Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "var(--light)", padding: 14, borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Total Shares</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--p)", marginTop: 4 }}>{stats.totalShares || 0}</div>
              </div>
              <div style={{ background: "var(--light)", padding: 14, borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Total Clicks</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--p-dark)", marginTop: 4 }}>{stats.totalClicks || 0}</div>
              </div>
              <div style={{ background: "var(--light)", padding: 14, borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Share CTR</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--grn)", marginTop: 4 }}>
                  {stats.totalShares > 0 ? ((stats.totalClicks / stats.totalShares) * 100).toFixed(1) + "%" : "0.0%"}
                </div>
              </div>
            </div>

            {/* Lists and breakdowns */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              
              {/* Most Shared */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--txt-2)", marginBottom: 10 }}>🔥 Most Shared Listings</div>
                {stats.mostShared && stats.mostShared.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {stats.mostShared.map(l => (
                      <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--light)", borderRadius: "var(--r-xs)", fontSize: 13, border: "1px solid var(--bdr)" }}>
                        <span style={{ fontWeight: 600, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "160px" }} title={l.title}>
                          {l.title}
                        </span>
                        <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--muted)" }}>
                          <span>🗣️ <strong>{l.sharesCount}</strong> shares</span>
                          <span>🖱️ <strong>{l.clicksCount || 0}</strong> clicks</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 10, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>No shared listings yet.</div>
                )}
              </div>

              {/* Most Clicked */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--txt-2)", marginBottom: 10 }}>🖱️ Most Clicked Listings</div>
                {stats.mostClicked && stats.mostClicked.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {stats.mostClicked.map(l => (
                      <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--light)", borderRadius: "var(--r-xs)", fontSize: 13, border: "1px solid var(--bdr)" }}>
                        <span style={{ fontWeight: 600, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "160px" }} title={l.title}>
                          {l.title}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          🖱️ <strong>{l.clicksCount}</strong> clicks (CTR: {l.sharesCount > 0 ? ((l.clicksCount / l.sharesCount) * 100).toFixed(0) + "%" : "—"})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 10, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>No clicked listings yet.</div>
                )}
              </div>

            </div>

            {/* Platform Performance */}
            <div style={{ marginTop: 20, borderTop: "1px solid var(--bdr)", paddingTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--txt-2)", marginBottom: 12 }}>📈 Platform Performance (Clicks / Shares)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {Object.keys(stats.platformShares || {}).map(platform => {
                  const shares = stats.platformShares?.[platform] || 0;
                  const clicks = stats.platformClicks?.[platform] || 0;
                  if (shares === 0 && clicks === 0) return null;
                  
                  return (
                    <div key={platform} style={{ display: "flex", flexDirection: "column", gap: 4, background: "var(--light)", padding: "10px 12px", borderRadius: "var(--r-xs)", border: "1px solid var(--bdr)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                        <span style={{ textTransform: "capitalize" }}>{platform}</span>
                        <span style={{ color: "var(--muted)" }}>🖱️ {clicks} / 🗣️ {shares}</span>
                      </div>
                      <div style={{ height: 6, background: "var(--bdr)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ 
                          height: "100%", 
                          background: platform === "whatsapp" ? "#25D366" : platform === "telegram" ? "#0088cc" : "var(--p)", 
                          width: `${shares + clicks > 0 ? Math.min(100, ((clicks) / (stats.totalClicks || 1)) * 100) : 0}%` 
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </>
      )}
    </AdminLayout>
  );
}
