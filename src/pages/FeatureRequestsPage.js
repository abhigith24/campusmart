import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import { Filter, SortDesc, Inbox, Eye, Lightbulb, Search } from "lucide-react";

export default function FeatureRequestsPage({ setPage }) {
  const toast = useToast();
  const [featureRequests, setFeatureRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketSearch, setTicketSearch] = useState("");
  const [viewingId, setViewingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const featureSnap = await getDocs(query(collection(db, "feature_requests"), orderBy("createdAt", "desc")));
      setFeatureRequests(featureSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast("Failed to load feature requests. ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  async function updateTicketStatus(id, newStatus) {
    try {
      await updateDoc(doc(db, "feature_requests", id), { status: newStatus });
      toast(`Feature request status updated to ${newStatus}`, "success");
      setFeatureRequests(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error(err);
      toast("Failed to update feature request status. ❌", "error");
    }
  }

  const filteredTickets = featureRequests.filter(t => !ticketSearch ||
    t.name?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.email?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.message?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.id.toLowerCase().includes(ticketSearch.toLowerCase())
  );

  return (
    <AdminLayout activePage="feature-requests" setPage={setPage}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "24px" }}>
        
        {/* Header Section */}
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: "24px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}><Lightbulb size={24} /> Feature Requests</h2>
          <p style={{ color: "var(--muted)" }}>Review and prioritize suggestions from users.</p>
        </div>

        {/* Search & Filters Section */}
        <div className="sr-filters-row" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div className="sr-search-wrapper" style={{ flex: 1, position: "relative", minWidth: "250px" }}>
            <input
              className="form-input"
              style={{ width: "100%", padding: "10px 16px", paddingLeft: "36px", fontSize: "14px" }}
              placeholder="Search by ID or user..."
              value={ticketSearch}
              onChange={e => setTicketSearch(e.target.value)}
            />
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex", alignItems: "center" }}><Search size={16} /></span>
          </div>
          <button className="btn btn-outline sr-btn-filter" style={{ height: "42px", gap: "8px" }}><Filter size={16}/> Filter</button>
          <button className="btn btn-outline sr-btn-sort" style={{ height: "42px", gap: "8px" }}><SortDesc size={16}/> Sort</button>
        </div>

        {/* Feature Requests Table Section */}
        {loading ? (
          <div className="loading-center" style={{ display: "flex", justifyContent: "center", padding: "60px", flex: 1 }}>
            <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }} />
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: "auto", flex: 1, display: "flex", flexDirection: "column", minHeight: "400px" }}>
            {filteredTickets.length === 0 ? (
              <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", flex: 1, justifyContent: "center" }}>
                <Inbox size={48} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: "16px", fontWeight: 600 }}>No feature requests found matching your search.</span>
              </div>
            ) : (
              <div className="table-responsive-wrapper">
                <table className="report-table support-requests-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--light)", borderBottom: "1px solid var(--bdr)" }}>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Request ID</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Date</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>User</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Suggestion</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map(t => (
                    <tr key={t.id} className="support-table-row" style={{ 
                      borderBottom: "1px solid var(--bdr)", 
                      background: t.status === "implemented" ? "var(--bg-secondary)" : "transparent",
                      transition: "background 0.2s" 
                    }}>
                      <td data-label="Request ID" className="sr-td-id" style={{ padding: "16px", fontWeight: 700, color: "var(--muted)", fontSize: "13px", whiteSpace: "nowrap" }}>
                        #{t.id.slice(0, 6).toUpperCase()}
                      </td>
                      <td data-label="Date" className="sr-td-date" style={{ padding: "16px", fontSize: "13px", whiteSpace: "nowrap", color: "var(--txt)" }}>
                        {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently"}
                      </td>
                      <td data-label="User" className="sr-td-user" style={{ padding: "16px" }}>
                        <div className="sr-user-name" style={{ fontWeight: 600, fontSize: "14px", color: "var(--txt)" }}>{t.name || "Anonymous User"}</div>
                        <div className="sr-user-email" style={{ fontSize: "12px", color: "var(--muted)" }}>{t.email || "No email provided"}</div>
                      </td>
                      <td data-label="Suggestion" className="sr-td-message" style={{ padding: "16px", maxWidth: "250px" }}>
                        <div className="sr-message-preview" style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: "13px",
                          lineHeight: "1.5",
                          color: "var(--txt-2)"
                        }}>
                          {t.message}
                        </div>
                      </td>
                      <td data-label="Status" className="sr-td-status" style={{ padding: "16px" }}>
                        <select
                          className={`sr-select-status sr-status-${(t.status || "open").toLowerCase()}`}
                          style={{
                            padding: "6px 12px", fontSize: "12px", fontWeight: 700, borderRadius: "20px", border: "1px solid var(--bdr)", cursor: "pointer",
                            background: t.status === "implemented" ? "var(--light)" : t.status === "in-progress" ? "var(--status-pending-bg)" : "rgba(59, 130, 246, 0.1)",
                            color: t.status === "implemented" ? "var(--muted)" : t.status === "in-progress" ? "var(--status-pending-txt)" : "#3b82f6",
                            outline: "none", appearance: "none", WebkitAppearance: "none", paddingRight: "16px"
                          }}
                          value={t.status || "open"}
                          onChange={(e) => updateTicketStatus(t.id, e.target.value)}
                        >
                          <option value="open">Open</option>
                          <option value="in-progress">In Progress</option>
                          <option value="implemented">Implemented</option>
                          <option value="closed">Closed / Rejected</option>
                        </select>
                      </td>
                      <td data-label="Actions" className="sr-td-actions" style={{ padding: "16px" }}>
                        <button 
                          className={`btn btn-outline sr-btn-view ${viewingId === t.id ? "loading" : ""}`}
                          disabled={viewingId === t.id}
                          style={{ minHeight: "32px", padding: "6px 12px", fontSize: "13px", gap: "6px", display: "inline-flex", alignItems: "center", position: "relative" }}
                          onClick={() => {
                            setViewingId(t.id);
                            setTimeout(() => {
                              setViewingId(null);
                              alert(`Feature Request #${t.id.slice(0, 6).toUpperCase()}\n\nFrom: ${t.name || "Anonymous"} (${t.email || "No email"})\n\nSuggestion:\n${t.message}`);
                            }, 400);
                          }}
                        >
                          {viewingId === t.id ? (
                            <div className="btn-spinner" style={{ width: "16px", height: "16px", border: "2px solid var(--muted)", borderTopColor: "var(--p)" }} />
                          ) : (
                            <><Eye size={14} /> View</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
