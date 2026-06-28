import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import { Filter, SortDesc, Flag, Search, CheckCircle, Zap, ShieldAlert, Eye, AlertTriangle, X, Image as ImageIcon } from "lucide-react";

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

function SellerReportsSkeleton() {
  return (
    <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div className="skeleton" style={{ width: "200px", height: "32px", borderRadius: "8px" }}></div>
        <div className="skeleton" style={{ width: "300px", height: "20px", borderRadius: "8px" }}></div>
      </div>
      
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderRadius: "16px", border: "1px solid var(--bdr)" }}>
            <div className="skeleton" style={{ width: "48px", height: "48px", borderRadius: "12px", flexShrink: 0 }}></div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="skeleton" style={{ width: "60%", height: "28px", borderRadius: "4px" }}></div>
              <div className="skeleton" style={{ width: "40%", height: "14px", borderRadius: "4px" }}></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Toolbar */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <div className="skeleton" style={{ flex: 1, minWidth: "250px", height: "44px", borderRadius: "8px" }}></div>
        <div className="skeleton" style={{ width: "180px", height: "44px", borderRadius: "8px" }}></div>
        <div className="skeleton" style={{ width: "100px", height: "44px", borderRadius: "8px" }}></div>
        <div className="skeleton" style={{ width: "100px", height: "44px", borderRadius: "8px" }}></div>
      </div>

      {/* Desktop Table Skeleton */}
      <div className="desktop-only" style={{ borderRadius: "16px", border: "1px solid var(--bdr)", overflow: "hidden" }}>
        <div className="skeleton" style={{ height: "48px", width: "100%" }}></div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ display: "flex", padding: "16px", gap: "16px", borderTop: "1px solid var(--bdr)" }}>
            <div className="skeleton" style={{ flex: 1, height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ flex: 1, height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ flex: 2, height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ flex: 2, height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ flex: 1, height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ flex: 1, height: "20px", borderRadius: "4px" }}></div>
          </div>
        ))}
      </div>

      {/* Mobile Card Skeleton */}
      <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ padding: "16px", background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="skeleton" style={{ width: "80px", height: "20px", borderRadius: "4px" }}></div>
              <div className="skeleton" style={{ width: "70px", height: "24px", borderRadius: "12px" }}></div>
            </div>
            <div className="skeleton" style={{ width: "60%", height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "80%", height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "70%", height: "40px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "120px", height: "16px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "100%", height: "44px", borderRadius: "8px", marginTop: "4px" }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SellerReportsPage({ setPage }) {
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal State
  const [selectedReport, setSelectedReport] = useState(null);
  const [listingData, setListingData] = useState(null);
  const [loadingListing, setLoadingListing] = useState(false);
  const [modNote, setModNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "sellerReports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      toast("Failed to load reports.", "error");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  // Derived Stats
  const pendingCount = reports.filter(r => r.status === "Pending").length;
  const reviewCount = reports.filter(r => r.status === "Under Review").length;
  const resolvedCount = reports.filter(r => r.status === "Resolved" || r.status === "Action Taken" || r.status === "Rejected").length;
  
  // Filtering
  const filteredReports = reports.filter(r => {
    const matchesSearch = (r.reportId?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                          (r.sellerName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                          (r.productTitle?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b" };
      case "Under Review": return { bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6" };
      case "Resolved": return { bg: "rgba(34, 197, 94, 0.1)", text: "#22c55e" };
      case "Action Taken": return { bg: "rgba(239, 68, 68, 0.1)", text: "#ef4444" };
      case "Rejected": return { bg: "rgba(107, 114, 128, 0.1)", text: "#6b7280" };
      default: return { bg: "var(--light)", text: "var(--muted)" };
    }
  };

  const openReportModal = async (report) => {
    setSelectedReport(report);
    setModNote("");
    setListingData(null);
    if (report.listingId) {
      setLoadingListing(true);
      try {
        const snap = await getDoc(doc(db, "listings", report.listingId));
        if (snap.exists()) {
          setListingData({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("Failed to load listing:", err);
      } finally {
        setLoadingListing(false);
      }
    }
  };

  const updateReportStatus = async (newStatus) => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      const notes = [...(selectedReport.moderatorNotes || [])];
      if (modNote.trim()) {
        notes.push({ text: modNote.trim(), timestamp: Date.now() });
      }
      
      await updateDoc(doc(db, "sellerReports", selectedReport.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        moderatorNotes: notes
      });
      toast(`Report marked as ${newStatus}`, "success");
      setSelectedReport(null);
    } catch (err) {
      console.error("Update error:", err);
      toast("Failed to update report.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout activePage="seller-reports" setPage={setPage}>
        <SellerReportsSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activePage="seller-reports" setPage={setPage}>
      <div className="admin-content-inner" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "32px", height: "100%" }}>
        
        {/* Header */}
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: "24px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
            <Flag size={24} /> Seller Reports
          </h2>
          <p style={{ color: "var(--muted)" }}>Review and moderate abusive seller behavior.</p>
        </div>

        {/* Summary Cards */}
        <div className="sr-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div className="card stat-card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderRadius: "16px", border: "1px solid var(--bdr)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div className="stat-icon-wrapper" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", padding: "12px", borderRadius: "12px" }}><AlertTriangle size={24} /></div>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 800 }}>{pendingCount}</div>
              <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Pending</div>
            </div>
          </div>
          <div className="card stat-card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderRadius: "16px", border: "1px solid var(--bdr)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div className="stat-icon-wrapper" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "12px", borderRadius: "12px" }}><Search size={24} /></div>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 800 }}>{reviewCount}</div>
              <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Under Review</div>
            </div>
          </div>
          <div className="card stat-card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderRadius: "16px", border: "1px solid var(--bdr)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div className="stat-icon-wrapper" style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", padding: "12px", borderRadius: "12px" }}><CheckCircle size={24} /></div>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 800 }}>{resolvedCount}</div>
              <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Processed</div>
            </div>
          </div>
          <div className="card stat-card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderRadius: "16px", border: "1px solid var(--bdr)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div className="stat-icon-wrapper" style={{ background: "rgba(168, 85, 247, 0.1)", color: "#a855f7", padding: "12px", borderRadius: "12px" }}><ShieldAlert size={24} /></div>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 800 }}>{reports.length}</div>
              <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Total Reports</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="sr-filters-row" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div className="sr-search-wrapper" style={{ flex: 1, position: "relative", minWidth: "250px" }}>
            <input
              className="form-input"
              style={{ width: "100%", padding: "10px 16px", paddingLeft: "36px", fontSize: "14px", height: "44px" }}
              placeholder="Search by Seller, Product, or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex", alignItems: "center" }}><Search size={16} /></span>
          </div>
          <select 
            className="form-input sr-status-filter" 
            style={{ width: "180px", height: "44px", fontWeight: 600, cursor: "pointer", borderRadius: "8px" }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Under Review">Under Review</option>
            <option value="Action Taken">Action Taken</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button className="btn btn-outline sr-btn-filter" style={{ height: "44px", gap: "8px", borderRadius: "8px", display: "inline-flex", alignItems: "center" }}><Filter size={16}/> Filter</button>
          <button className="btn btn-outline sr-btn-sort" style={{ height: "44px", gap: "8px", borderRadius: "8px", display: "inline-flex", alignItems: "center" }}><SortDesc size={16}/> Sort</button>
        </div>

        {/* Desktop Table & Mobile Cards */}
        {filteredReports.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", flex: 1, justifyContent: "center", background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "16px" }}>
            <ShieldAlert size={48} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: "16px", fontWeight: 600 }}>No reports found matching your criteria.</span>
          </div>
        ) : (
          <>
            <div className="desktop-only card" style={{ padding: 0, overflowX: "auto", flex: 1, display: "flex", flexDirection: "column", minHeight: "400px", borderRadius: "16px", border: "1px solid var(--bdr)" }}>
              <div className="table-responsive-wrapper">
                <table className="report-table seller-reports-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ background: "var(--light)", borderBottom: "1px solid var(--bdr)" }}>
                      <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }}>Report ID</th>
                      <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }}>Seller</th>
                      <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }}>Product</th>
                      <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }}>Reason</th>
                      <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }}>Status</th>
                      <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map(report => {
                      const colors = getStatusColor(report.status);
                      return (
                        <tr key={report.id} className="seller-report-row" style={{ borderBottom: "1px solid var(--bdr)", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="var(--light)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <td data-label="Report ID" className="sr-td-id" style={{ padding: "16px", fontWeight: 700, color: "var(--p)", fontSize: "14px" }}>
                            <span style={{ cursor: "pointer" }} onClick={() => { navigator.clipboard.writeText(report.reportId || report.id); window.alert("Copied Report ID"); }}>
                              {report.reportId ? `#${report.reportId.slice(0, 6).toUpperCase()}` : "N/A"}
                            </span>
                          </td>
                          <td data-label="Status" className="sr-td-status" style={{ padding: "16px" }}>
                            <span className="sr-badge-status" style={{ 
                              padding: "4px 10px", fontSize: "11px", fontWeight: 700, borderRadius: "20px", 
                              background: colors.bg, color: colors.text, whiteSpace: "nowrap"
                            }}>
                              {report.status}
                            </span>
                          </td>
                          <td data-label="Seller" className="sr-td-user" style={{ padding: "16px" }}>
                            <div className="sr-user-name" style={{ fontWeight: 600, fontSize: "15px", color: "var(--txt)" }}>{report.sellerName || "Unknown"}</div>
                          </td>
                          <td data-label="Product" className="sr-td-product" style={{ padding: "16px" }}>
                            <div className="sr-product-title" style={{ 
                              maxWidth: "200px", 
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden", 
                              textOverflow: "ellipsis", 
                              fontWeight: 500,
                              fontSize: "14px"
                            }}>
                              {report.productTitle || "Unknown"}
                            </div>
                          </td>
                          <td data-label="Reason" className="sr-td-reason" style={{ padding: "16px" }}>
                            <span className="sr-reason-preview" style={{ 
                              fontWeight: 600, 
                              color: "var(--txt-2)",
                              fontSize: "13px",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden", 
                              textOverflow: "ellipsis",
                            }}><span style={{ color: "var(--txt)", fontWeight: 700 }}>Reason: </span>{report.reason}</span>
                          </td>
                          <td data-label="Date" className="sr-td-date" style={{ padding: "16px", fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
                            Reported &bull; {report.createdAt?.toDate ? timeAgo(report.createdAt.toDate()) : "Recently"}
                          </td>
                          <td data-label="Actions" className="sr-td-actions" style={{ padding: "16px", textAlign: "right" }}>
                            <button 
                              className={`btn btn-outline sr-btn-view ${viewingId === report.id ? "loading" : ""}`}
                              disabled={viewingId === report.id}
                              style={{ padding: "6px 12px", fontSize: "13px", height: "auto", minHeight: "32px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "6px", position: "relative" }}
                              onClick={() => {
                                setViewingId(report.id);
                                setTimeout(() => {
                                  openReportModal(report);
                                  setViewingId(null);
                                }, 400);
                              }}
                            >
                              {viewingId === report.id ? (
                                <div className="btn-spinner" style={{ width: "16px", height: "16px", border: "2px solid var(--muted)", borderTopColor: "var(--p)" }} />
                              ) : (
                                <><Eye size={14} /> View Report</>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filteredReports.map(report => {
                const colors = getStatusColor(report.status);
                return (
                  <div key={report.id} style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, color: "var(--p)", fontSize: "14px", cursor: "pointer" }} onClick={() => { navigator.clipboard.writeText(report.reportId || report.id); window.alert("Copied Report ID"); }}>
                        {report.reportId ? `#${report.reportId.slice(0, 6).toUpperCase()}` : "N/A"}
                      </span>
                      <span style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 700, borderRadius: "20px", background: colors.bg, color: colors.text, whiteSpace: "nowrap" }}>
                        {report.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--txt)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {report.sellerName || "Unknown"}
                      </div>
                      <div style={{ fontWeight: 500, fontSize: "14px", color: "var(--txt-2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {report.productTitle || "Unknown"}
                      </div>
                    </div>

                    <div style={{ background: "var(--light)", padding: "12px", borderRadius: "8px", border: "1px solid var(--bdr)" }}>
                      <div style={{ fontSize: "11px", color: "var(--txt)", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        Reason
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--p-dark)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {report.reason}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>🕒</span>
                      Reported {report.createdAt?.toDate ? timeAgo(report.createdAt.toDate()) : "Recently"}
                    </div>

                    <button 
                      className={`btn btn-outline sr-btn-view ${viewingId === report.id ? "loading" : ""}`}
                      disabled={viewingId === report.id}
                      style={{ width: "100%", padding: "0", minHeight: "44px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "14px" }}
                      onClick={() => {
                        setViewingId(report.id);
                        setTimeout(() => {
                          openReportModal(report);
                          setViewingId(null);
                        }, 400);
                      }}
                    >
                      {viewingId === report.id ? (
                        <div className="btn-spinner" style={{ width: "16px", height: "16px", border: "2px solid var(--muted)", borderTopColor: "var(--p)" }} />
                      ) : (
                        <><Eye size={16} /> View Report</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Moderation Details Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)} style={{ zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: "90%", maxWidth: "600px", maxHeight: "95vh", display: "flex", flexDirection: "column", padding: 0 }}>
            
            {/* Modal Header (Fixed) */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "var(--bg)", zIndex: 10, flexShrink: 0, borderTopLeftRadius: "var(--r-lg)", borderTopRightRadius: "var(--r-lg)" }}>
              <div>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "18px" }}>
                  <Flag size={20} color="var(--p)" />
                  Report Details
                </h3>
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px", fontWeight: 600 }}>
                  Reported by {selectedReport.reporterName} {selectedReport.createdAt ? `· ${timeAgo(selectedReport.createdAt.toDate())}` : ""}
                </div>
              </div>
              <button className="btn btn-outline" onClick={() => setSelectedReport(null)} style={{ padding: "8px", border: "none", marginTop: "-4px", marginRight: "-8px" }}><X size={20} /></button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto", flex: 1 }}>
              
              {/* Reason Box */}
              <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "11px", color: "#ef4444", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Reason</div>
                <h4 style={{ margin: "0 0 12px 0", color: "#ef4444", fontSize: "15px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={16} /> {selectedReport.reason}
                </h4>
                <div style={{ fontSize: "11px", color: "var(--txt-2)", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Description</div>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--txt)", lineHeight: "1.5" }}>
                  {selectedReport.description || <span style={{ color: "var(--muted)", fontStyle: "italic" }}>No additional description provided.</span>}
                </p>
              </div>

              {/* Subject Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ border: "1px solid var(--bdr)", borderRadius: "12px", padding: "12px" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Seller</div>
                  <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px" }}>{selectedReport.sellerName}</div>
                  <button className="btn btn-outline" style={{ fontSize: "11px", padding: "4px 10px", height: "auto", minHeight: "28px" }} onClick={() => { setSelectedReport(null); setPage("profile", { viewUserId: selectedReport.sellerId }); }}>
                    View Profile
                  </button>
                </div>
                
                <div style={{ border: "1px solid var(--bdr)", borderRadius: "12px", padding: "12px" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Product</div>
                  <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {selectedReport.productTitle}
                  </div>
                  <button className="btn btn-outline" style={{ fontSize: "11px", padding: "4px 10px", height: "auto", minHeight: "28px" }} onClick={() => { setSelectedReport(null); setPage("listing", { id: selectedReport.listingId }); }}>
                    View Listing
                  </button>
                </div>
              </div>

              {/* Listing Preview Snippet */}
              {loadingListing ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "14px" }}>Loading listing info...</div>
              ) : listingData ? (
                <div style={{ display: "flex", gap: "16px", border: "1px solid var(--bdr)", borderRadius: "12px", padding: "12px", alignItems: "center" }}>
                  <div style={{ width: "60px", height: "60px", borderRadius: "8px", background: "var(--light)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {listingData.images?.[0] ? (
                      <img src={listingData.images[0]} alt="listing" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <ImageIcon size={24} color="var(--muted)" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>{listingData.title}</div>
                    <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
                      {listingData.price > 0 ? `$${listingData.price}` : "Free"} · {listingData.status}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "12px", background: "var(--light)", borderRadius: "12px", fontSize: "13px", color: "var(--muted)", textAlign: "center" }}>
                  Listing data could not be found. It may have been deleted.
                </div>
              )}

              {/* Moderator Notes */}
              <div>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "14px" }}>Internal Moderation Notes</h4>
                {selectedReport.moderatorNotes?.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                    {selectedReport.moderatorNotes.map((n, idx) => (
                      <div key={idx} style={{ padding: "12px", background: "var(--light)", borderRadius: "8px", fontSize: "13px" }}>
                        <div style={{ color: "var(--txt)", lineHeight: 1.4 }}>{n.text}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px", fontWeight: 600 }}>
                          {timeAgo(new Date(n.timestamp))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Add private moderation notes (visible only to administrators)..."
                  value={modNote}
                  onChange={e => setModNote(e.target.value)}
                  style={{ resize: "vertical", fontSize: "14px" }}
                />
              </div>

            </div>

            {/* Modal Footer / Actions (Fixed) */}
            <div className="sr-modal-actions" style={{ padding: "12px 24px", borderTop: "1px solid var(--bdr)", background: "var(--light)", display: "flex", flexDirection: "column", gap: "8px", zIndex: 10, flexShrink: 0, borderBottomLeftRadius: "var(--r-lg)", borderBottomRightRadius: "var(--r-lg)", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
              <button 
                className="btn btn-danger" 
                disabled={actionLoading}
                onClick={() => {
                  if (window.confirm("Are you sure you want to take action against this seller? This may suspend the user or remove their listings.")) {
                    updateReportStatus("Action Taken");
                  }
                }}
                style={{ fontSize: "14px", minHeight: "44px", width: "100%", justifyContent: "center" }}
              >
                {actionLoading ? "Processing..." : "Take Action (Suspend / Remove)"}
              </button>
              
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
                <button 
                  className="btn btn-outline" 
                  disabled={actionLoading}
                  onClick={() => updateReportStatus("Under Review")}
                  style={{ fontSize: "14px", minHeight: "44px", flex: 1, justifyContent: "center" }}
                >
                  Under Review
                </button>
                <button 
                  className="btn btn-outline" 
                  disabled={actionLoading}
                  onClick={() => updateReportStatus("Resolved")}
                  style={{ fontSize: "14px", minHeight: "44px", flex: 1, justifyContent: "center", color: "#22c55e", borderColor: "rgba(34, 197, 94, 0.3)" }}
                >
                  Mark Resolved
                </button>
              </div>
              
              <button 
                className="btn btn-outline" 
                disabled={actionLoading}
                onClick={() => {
                  if (window.confirm("Are you sure you want to reject this report?")) {
                    updateReportStatus("Rejected");
                  }
                }}
                style={{ fontSize: "14px", minHeight: "44px", width: "100%", justifyContent: "center", color: "var(--muted)", borderColor: "var(--bdr)" }}
              >
                Reject Report
              </button>
            </div>
            
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
