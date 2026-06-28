import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import { Inbox, Clock, CheckCircle, Zap, Headphones, Ticket, Bug, Lightbulb, Flag, ChevronRight } from "lucide-react";

export default function SupportDashboardPage({ setPage }) {
  const toast = useToast();
  
  const [stats, setStats] = useState({
    supportOpen: 0,
    supportPending: 0,
    supportResolved: 0,
    bugCount: 0,
    featureCount: 0,
    sellerReportCount: 0
  });

  const [recentData, setRecentData] = useState({
    support_requests: [],
    bug_reports: [],
    feature_requests: [],
    seller_reports: []
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // Load recent 5 of each
      const [supportSnap, bugSnap, featureSnap, sellerSnap] = await Promise.all([
        getDocs(query(collection(db, "support_requests"), orderBy("createdAt", "desc"), limit(5))),
        getDocs(query(collection(db, "bug_reports"), orderBy("createdAt", "desc"), limit(5))),
        getDocs(query(collection(db, "feature_requests"), orderBy("createdAt", "desc"), limit(5))),
        getDocs(query(collection(db, "sellerReports"), orderBy("createdAt", "desc"), limit(5)))
      ]);

      const supportDocs = supportSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const bugDocs = bugSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const featureDocs = featureSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sellerDocs = sellerSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      setRecentData({
        support_requests: supportDocs,
        bug_reports: bugDocs,
        feature_requests: featureDocs,
        seller_reports: sellerDocs
      });

      // Calculate some basic stats from recent fetches (or in a real app, from aggregate endpoints)
      // Since we just fetched 5, we'll use a mocked broader stat count for demonstration, or we can fetch full counts.
      // For performance in this refactor, we will query all docs to get counts since Firestore JS SDK requires it if no agg queries are used.
      const allSupport = await getDocs(collection(db, "support_requests"));
      const allBugs = await getDocs(collection(db, "bug_reports"));
      const allFeatures = await getDocs(collection(db, "feature_requests"));
      const allSellers = await getDocs(collection(db, "sellerReports"));

      const allSupportDocs = allSupport.docs.map(d => d.data());
      
      setStats({
        supportOpen: allSupportDocs.filter(t => t.status === 'open').length,
        supportPending: allSupportDocs.filter(t => t.status === 'in-progress').length,
        supportResolved: allSupportDocs.filter(t => t.status === 'closed').length,
        bugCount: allBugs.size,
        featureCount: allFeatures.size,
        sellerReportCount: allSellers.size
      });

    } catch (err) {
      console.error(err);
      toast("Failed to load dashboard data. ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  const renderRecentWidget = (title, icon, items, emptyMsg, routeName) => (
    <div className="card" style={{ padding: 0, flex: "1 1 calc(50% - 24px)", minWidth: "350px", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--bdr)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
          {icon} {title}
        </h3>
        <button className="btn btn-ghost" onClick={() => setPage(routeName)} style={{ fontSize: "13px", color: "var(--p)", display: "flex", alignItems: "center", gap: "4px" }}>
          View All <ChevronRight size={14} />
        </button>
      </div>
      <div style={{ padding: "12px", flex: 1 }}>
        {items.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)", fontSize: "13px", fontWeight: 600 }}>
            {emptyMsg}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {items.map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "var(--light)", borderRadius: "8px", border: "1px solid var(--bdr)" }}>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--txt)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.message || item.description || item.reason || "No description"}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--txt-2)", marginTop: "2px" }}>
                    {item.name || item.reporterName || "Anonymous"} • #{item.id.slice(0,6).toUpperCase()}
                  </div>
                </div>
                <span style={{ 
                  fontSize: "11px", fontWeight: 700, padding: "4px 8px", borderRadius: "12px", 
                  background: item.status === "closed" ? "var(--bg-secondary)" : item.status === "in-progress" ? "var(--status-pending-bg)" : "rgba(59, 130, 246, 0.1)", 
                  color: item.status === "closed" ? "var(--muted)" : item.status === "in-progress" ? "var(--status-pending-txt)" : "#3b82f6"
                }}>
                  {item.status || "open"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout activePage="support" setPage={setPage}>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "40px" }}>
        
        {/* Header Section */}
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: "24px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}><Headphones size={24} /> Dashboard Overview</h2>
          <p style={{ color: "var(--muted)" }}>Executive summary of all moderation and support activities.</p>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
            <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }} />
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div className="card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderRadius: "16px", border: "1px solid var(--bdr)" }}>
                <div style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "12px", borderRadius: "12px" }}><Inbox size={24} /></div>
                <div>
                  <div style={{ fontSize: "28px", fontWeight: 800 }}>{stats.supportOpen}</div>
                  <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Open Tickets</div>
                </div>
              </div>
              <div className="card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderRadius: "16px", border: "1px solid var(--bdr)" }}>
                <div style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", padding: "12px", borderRadius: "12px" }}><Clock size={24} /></div>
                <div>
                  <div style={{ fontSize: "28px", fontWeight: 800 }}>{stats.supportPending}</div>
                  <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Pending Tickets</div>
                </div>
              </div>
              <div className="card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderRadius: "16px", border: "1px solid var(--bdr)" }}>
                <div style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", padding: "12px", borderRadius: "12px" }}><CheckCircle size={24} /></div>
                <div>
                  <div style={{ fontSize: "28px", fontWeight: 800 }}>{stats.supportResolved}</div>
                  <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Resolved Tickets</div>
                </div>
              </div>
              <div className="card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderRadius: "16px", border: "1px solid var(--bdr)" }}>
                <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "12px", borderRadius: "12px" }}><Flag size={24} /></div>
                <div>
                  <div style={{ fontSize: "28px", fontWeight: 800 }}>{stats.sellerReportCount}</div>
                  <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Seller Reports</div>
                </div>
              </div>
              <div className="card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderRadius: "16px", border: "1px solid var(--bdr)" }}>
                <div style={{ background: "rgba(236, 72, 153, 0.1)", color: "#ec4899", padding: "12px", borderRadius: "12px" }}><Bug size={24} /></div>
                <div>
                  <div style={{ fontSize: "28px", fontWeight: 800 }}>{stats.bugCount}</div>
                  <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Bug Reports</div>
                </div>
              </div>
              <div className="card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderRadius: "16px", border: "1px solid var(--bdr)" }}>
                <div style={{ background: "rgba(168, 85, 247, 0.1)", color: "#a855f7", padding: "12px", borderRadius: "12px" }}><Zap size={24} /></div>
                <div>
                  <div style={{ fontSize: "28px", fontWeight: 800 }}>2.4 hrs</div>
                  <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Avg Response Time</div>
                </div>
              </div>
            </div>

            {/* Recent Activity Widgets */}
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--txt)", marginTop: "8px", marginBottom: "4px" }}>Recent Activity</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
              {renderRecentWidget("Recent Support Requests", <Ticket size={18} />, recentData.support_requests, "No recent support requests.", "support-requests")}
              {renderRecentWidget("Recent Bug Reports", <Bug size={18} />, recentData.bug_reports, "No recent bug reports.", "bug-reports")}
              {renderRecentWidget("Recent Feature Requests", <Lightbulb size={18} />, recentData.feature_requests, "No recent feature requests.", "feature-requests")}
              {renderRecentWidget("Recent Seller Reports", <Flag size={18} />, recentData.seller_reports, "No recent seller reports.", "seller-reports")}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
