import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";

function AnalyticsSkeletonLoader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingTop: "8px" }}>
      {/* Executive Summary Skeleton */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "20px" }}>
        <div className="skeleton" style={{ width: "160px", height: "20px", borderRadius: "4px", margin: "0 auto 16px auto" }}></div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "16px", maxWidth: "900px", margin: "0 auto" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ flex: "1 1 240px", maxWidth: "280px", display: "flex", alignItems: "center", gap: "16px", padding: "16px", background: "var(--light)", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)" }}>
              <div className="skeleton" style={{ width: "48px", height: "48px", borderRadius: "12px", flexShrink: 0 }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: "60%", height: "14px", borderRadius: "4px", marginBottom: "8px" }}></div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                  <div className="skeleton" style={{ width: "40%", height: "24px", borderRadius: "4px" }}></div>
                  <div className="skeleton" style={{ width: "25%", height: "14px", borderRadius: "4px" }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Marketplace Operations Skeleton */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "20px" }}>
        <div className="skeleton" style={{ width: "200px", height: "20px", borderRadius: "4px", marginBottom: "16px" }}></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ display: "flex", flexDirection: "column", padding: "16px", background: "var(--light)", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", minHeight: "110px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div className="skeleton" style={{ width: "24px", height: "24px", borderRadius: "4px" }}></div>
                <div className="skeleton" style={{ width: "40px", height: "14px", borderRadius: "4px" }}></div>
              </div>
              <div style={{ marginTop: "auto" }}>
                <div className="skeleton" style={{ width: "60%", height: "24px", borderRadius: "4px", marginBottom: "6px" }}></div>
                <div className="skeleton" style={{ width: "80%", height: "14px", borderRadius: "4px" }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Platform Health Skeleton */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "20px" }}>
        <div className="skeleton" style={{ width: "150px", height: "20px", borderRadius: "4px", marginBottom: "16px" }}></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ padding: "16px", background: "var(--light)", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)" }}>
              <div className="skeleton" style={{ width: "70%", height: "14px", borderRadius: "4px", marginBottom: "8px" }}></div>
              <div className="skeleton" style={{ width: "40%", height: "24px", borderRadius: "4px" }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsReportsPage({ setPage }) {
  const { userProfile } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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



  return (
    <AdminLayout activePage="admin-analytics" setPage={setPage}>
      <div className="page-header" style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "4px" }}>📊 Analytics Overview</h2>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: "14px" }}>Monitor platform usage, growth, and health diagnostics</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label htmlFor="period-filter" style={{ fontSize: "13px", color: "var(--txt-2)", fontWeight: 600 }}>Period:</label>
          <select id="period-filter" className="form-input" style={{ width: "160px", padding: "0 12px", height: "44px", fontSize: "14px", cursor: "pointer", borderRadius: "8px" }}>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all" selected>All Time</option>
          </select>
        </div>
      </div>

      {loading ? (
        <AnalyticsSkeletonLoader />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* 1. Primary KPIs */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px 0", color: "var(--txt)", textAlign: "center" }}>Executive Summary</h3>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "16px", maxWidth: "900px", margin: "0 auto" }}>
              {[
                { lbl: "Total Users", num: stats.users, icon: "👤", bg: "rgba(37, 99, 235, 0.1)", trend: "↑ +12%" },
                { lbl: "Active Listings", num: stats.active, icon: "📦", bg: "rgba(34, 197, 94, 0.1)", trend: "↑ +8%" },
                { lbl: "Active Sellers", num: stats.activeSellers, icon: "🏪", bg: "rgba(245, 158, 11, 0.1)", trend: "—" },
              ].map((s, i) => (
                <div key={i} style={{ flex: "1 1 240px", maxWidth: "280px", display: "flex", alignItems: "center", gap: "16px", padding: "16px", background: "var(--light)", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", minHeight: "82px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.lbl}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "4px" }}>
                      <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--txt)", lineHeight: "1" }}>{s.num ?? 0}</div>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: s.trend === "—" ? "var(--muted)" : "var(--grn)", minWidth: "45px" }}>{s.trend}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Secondary KPIs */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px 0", color: "var(--txt)" }}>Marketplace Operations</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
              {[
                { lbl: "Sold Products", num: stats.sold, icon: "💸", trend: "↑ +5%" },
                { lbl: "Free Items", num: stats.free, icon: "💚", trend: "—" },
                { lbl: `Reviews (⭐ ${stats.avgRating})`, num: stats.totalRatings, icon: "⭐", trend: "—" },
                { lbl: "Total Chats", num: stats.totalChats, icon: "💬", trend: "↑ +22%" },
                { lbl: "Pending Requests", num: stats.pendingReqs, icon: "⏳", trend: "↓ -2%" },
                { lbl: "Flagged Listings", num: stats.flagged, icon: "🚩", trend: "—" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "16px", background: "var(--light)", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", minHeight: "110px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{s.icon}</div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: s.trend === "—" ? "var(--muted)" : (s.trend.includes("-") ? "var(--p)" : "var(--grn)"), minWidth: "40px", textAlign: "right", height: "16px" }}>{s.trend}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--txt)", marginBottom: "4px", lineHeight: "1" }}>{s.num ?? 0}</div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>{s.lbl}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Platform Health Metrics */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px 0", color: "var(--txt)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--grn)" }}>●</span> Platform Health
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <div style={{ padding: "16px", background: "var(--light)", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "84px" }}>
                <div style={{ fontSize: "12px", color: "var(--txt-2)", fontWeight: 600, marginBottom: "4px" }}>Conversion Rate</div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--grn)", lineHeight: "1" }}>
                  {stats.totalListings > 0 ? `${Math.round((stats.sold / stats.totalListings) * 100)}%` : "—"}
                </div>
              </div>
              <div style={{ padding: "16px", background: "var(--light)", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "84px" }}>
                <div style={{ fontSize: "12px", color: "var(--txt-2)", fontWeight: 600, marginBottom: "4px" }}>Deal Acceptance</div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--grn)", lineHeight: "1" }}>
                  {stats.requestsCount > 0 ? `${Math.round((stats.acceptedReqs / stats.requestsCount) * 100)}%` : "—"}
                </div>
              </div>
              <div style={{ padding: "16px", background: "var(--light)", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "84px" }}>
                <div style={{ fontSize: "12px", color: "var(--txt-2)", fontWeight: 600, marginBottom: "4px" }}>Donation Ratio</div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--grn)", lineHeight: "1" }}>
                  {stats.totalListings > 0 ? `${Math.round((stats.free / stats.totalListings) * 100)}%` : "—"}
                </div>
              </div>
              <div style={{ padding: "16px", background: "var(--light)", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "84px" }}>
                <div style={{ fontSize: "12px", color: "var(--txt-2)", fontWeight: 600, marginBottom: "4px" }}>Average Rating</div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--grn)", lineHeight: "1" }}>
                  {stats.avgRating} <span style={{ fontSize: "14px" }}>/ 5</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Placeholder Charts Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "8px" }}>
            {[
              { title: "User Growth", type: "Line Chart" },
              { title: "Listings Growth", type: "Line Chart" },
              { title: "Marketplace Activity", type: "Bar Chart" },
              { title: "Sales Trend", type: "Area Chart" },
            ].map((chart, i) => (
              <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "20px", display: "flex", flexDirection: "column" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 16px 0", color: "var(--txt)" }}>{chart.title}</h3>
                <div style={{ flex: 1, minHeight: "220px", background: "var(--bg)", border: "1px dashed var(--bdr)", borderRadius: "var(--r-sm)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", gap: "8px", padding: "20px" }}>
                  <span style={{ fontSize: "28px", marginBottom: "4px" }}>📈</span>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--txt-2)", textAlign: "center" }}>No historical data available</span>
                  <span style={{ fontSize: "12px", textAlign: "center", maxWidth: "200px" }}>{chart.type} placeholder</span>
                </div>
              </div>
            ))}
          </div>

          {/* 5. Share & Referral Analytics */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px 0", color: "var(--txt)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔗</span> Share & Referral Performance
            </h3>
            
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px", justifyContent: "center" }}>
              <div style={{ background: "var(--light)", padding: "16px", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100px" }}>
                <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px" }}>Total Shares</div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--p)", lineHeight: "1" }}>{stats.totalShares || 0}</div>
              </div>
              <div style={{ background: "var(--light)", padding: "16px", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100px" }}>
                <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px" }}>Total Clicks</div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--p-dark)", lineHeight: "1" }}>{stats.totalClicks || 0}</div>
              </div>
              <div style={{ background: "var(--light)", padding: "16px", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100px" }}>
                <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px" }}>Click-Through Rate</div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--grn)", lineHeight: "1" }}>
                  {stats.totalShares > 0 ? ((stats.totalClicks / stats.totalShares) * 100).toFixed(1) + "%" : "0.0%"}
                </div>
              </div>
            </div>

            {/* Platform Performance Bars */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--txt-2)", marginBottom: "12px" }}>Platform Breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                {Object.keys(stats.platformShares || {}).length > 0 && Object.values(stats.platformShares || {}).some(v => v > 0) ? (
                  Object.keys(stats.platformShares || {}).map(platform => {
                    const shares = stats.platformShares?.[platform] || 0;
                    const clicks = stats.platformClicks?.[platform] || 0;
                    if (shares === 0 && clicks === 0) return null;
                    return (
                      <div key={platform} style={{ background: "var(--light)", padding: "12px", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>
                          <span style={{ textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: "8px" }}>{platform}</span>
                          <span style={{ color: "var(--muted)", flexShrink: 0 }}>{clicks} Clicks / {shares} Shares</span>
                        </div>
                        <div style={{ height: "8px", background: "var(--bdr)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ 
                            height: "100%", 
                            background: platform === "whatsapp" ? "#25D366" : platform === "telegram" ? "#0088cc" : "var(--p)", 
                            width: `${shares + clicks > 0 ? Math.min(100, ((clicks) / (stats.totalClicks || 1)) * 100) : 0}%` 
                          }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: "20px", background: "var(--bg)", border: "1px dashed var(--bdr)", borderRadius: "var(--r-sm)", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                    No platform usage data available yet.
                  </div>
                )}
              </div>
            </div>

            {/* Top Lists */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {/* Most Shared */}
              <div style={{ flex: "1 1 300px" }}>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--txt-2)", marginBottom: "12px" }}>🔥 Most Shared Listings</div>
                {stats.mostShared && stats.mostShared.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {stats.mostShared.map(l => (
                      <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "10px 14px", background: "var(--light)", borderRadius: "var(--r-sm)", fontSize: "13px", border: "1px solid var(--bdr)" }}>
                        <span style={{ fontWeight: 600, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flex: 1, minWidth: 0 }} title={l.title}>
                          {l.title}
                        </span>
                        <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--muted)", flexShrink: 0 }}>
                          <span><strong>{l.sharesCount}</strong> Shares</span>
                          <span><strong>{l.clicksCount || 0}</strong> Clicks</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "30px", background: "var(--bg)", border: "1px dashed var(--bdr)", borderRadius: "var(--r-sm)", textAlign: "center", color: "var(--muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "24px" }}>🗣️</span>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>No shared listings yet</span>
                    <span style={{ fontSize: "12px", maxWidth: "200px", lineHeight: "1.4" }}>Once users start sharing items, they will appear here.</span>
                  </div>
                )}
              </div>

              {/* Most Clicked */}
              <div style={{ flex: "1 1 300px" }}>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--txt-2)", marginBottom: "12px" }}>🖱️ Most Clicked Listings</div>
                {stats.mostClicked && stats.mostClicked.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {stats.mostClicked.map(l => (
                      <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "10px 14px", background: "var(--light)", borderRadius: "var(--r-sm)", fontSize: "13px", border: "1px solid var(--bdr)" }}>
                        <span style={{ fontWeight: 600, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flex: 1, minWidth: 0 }} title={l.title}>
                          {l.title}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--muted)", flexShrink: 0 }}>
                          <strong>{l.clicksCount}</strong> Clicks (CTR: {l.sharesCount > 0 ? ((l.clicksCount / l.sharesCount) * 100).toFixed(0) + "%" : "—"})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "30px", background: "var(--bg)", border: "1px dashed var(--bdr)", borderRadius: "var(--r-sm)", textAlign: "center", color: "var(--muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "24px" }}>📊</span>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>No click analytics available yet</span>
                    <span style={{ fontSize: "12px", maxWidth: "200px", lineHeight: "1.4" }}>Once users begin opening shared links, click analytics will appear here.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Padding for floating buttons */}
          <div style={{ height: "60px" }} />
        </div>
      )}
    </AdminLayout>
  );
}
