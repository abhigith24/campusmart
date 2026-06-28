import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import { Filter, SortDesc, Inbox, Eye, Ticket, Search } from "lucide-react";

export default function SupportRequestsPage({ setPage }) {
  const toast = useToast();
  const [supportRequests, setSupportRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketSearch, setTicketSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const supportSnap = await getDocs(query(collection(db, "support_requests"), orderBy("createdAt", "desc")));
      setSupportRequests(supportSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast("Failed to load support data. ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  async function updateTicketStatus(id, newStatus) {
    try {
      await updateDoc(doc(db, "support_requests", id), { status: newStatus });
      toast(`Ticket status updated to ${newStatus}`, "success");
      setSupportRequests(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error(err);
      toast("Failed to update ticket status. ❌", "error");
    }
  }

  const filteredTickets = supportRequests.filter(t => !ticketSearch ||
    t.name?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.email?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.message?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.id.toLowerCase().includes(ticketSearch.toLowerCase())
  );

  return (
    <AdminLayout activePage="support-requests" setPage={setPage}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "24px" }}>
        
        {/* Header Section */}
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: "24px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}><Ticket size={24} /> Support Requests</h2>
          <p style={{ color: "var(--muted)" }}>Manage user inquiries and support tickets.</p>
        </div>

        {/* Search & Filters Section */}
        <div className="sr-filters-row" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div className="sr-search-wrapper" style={{ flex: 1, position: "relative", minWidth: "250px" }}>
            <input
              className="form-input"
              style={{ width: "100%", padding: "10px 16px", paddingLeft: "36px", fontSize: "14px" }}
              placeholder="Search by Ticket ID, User, Email or Keyword..."
              value={ticketSearch}
              onChange={e => setTicketSearch(e.target.value)}
            />
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex", alignItems: "center" }}><Search size={16} /></span>
          </div>
          <button className="btn btn-outline sr-btn-filter" style={{ height: "42px", gap: "8px" }}><Filter size={16}/> Filter</button>
          <button className="btn btn-outline sr-btn-sort" style={{ height: "42px", gap: "8px" }}><SortDesc size={16}/> Sort</button>
        </div>

        {/* Support Table Section */}
        {loading ? (
          <div className="loading-center" style={{ display: "flex", justifyContent: "center", padding: "60px", flex: 1 }}>
            <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }} />
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: "auto", flex: 1, display: "flex", flexDirection: "column", minHeight: "400px" }}>
            {filteredTickets.length === 0 ? (
              <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", flex: 1, justifyContent: "center" }}>
                <Inbox size={48} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: "16px", fontWeight: 600 }}>No tickets found matching your search.</span>
              </div>
            ) : (
              <div className="table-responsive-wrapper">
                <table className="report-table support-requests-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--light)", borderBottom: "1px solid var(--bdr)" }}>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Ticket ID</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Date</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>User</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Message</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Priority</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map(t => (
                    <tr key={t.id} className="support-table-row" style={{ 
                      borderBottom: "1px solid var(--bdr)", 
                      background: t.status === "closed" ? "var(--bg-secondary)" : "transparent",
                      transition: "background 0.2s" 
                    }}>
                      <td data-label="Ticket ID" className="sr-td-id" style={{ padding: "16px", fontWeight: 700, color: "var(--muted)", fontSize: "13px", whiteSpace: "nowrap" }}>
                        #{t.id.slice(0, 6).toUpperCase()}
                      </td>
                      <td data-label="Date" className="sr-td-date" style={{ padding: "16px", fontSize: "13px", whiteSpace: "nowrap", color: "var(--txt)" }}>
                        {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently"}
                      </td>
                      <td data-label="User" className="sr-td-user" style={{ padding: "16px" }}>
                        <div className="sr-user-name" style={{ fontWeight: 600, fontSize: "14px", color: "var(--txt)" }}>{t.name || "Anonymous User"}</div>
                        <div className="sr-user-email" style={{ fontSize: "12px", color: "var(--muted)" }}>{t.email || "No email provided"}</div>
                      </td>
                      <td data-label="Message" className="sr-td-message" style={{ padding: "16px", maxWidth: "250px" }}>
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
                      <td data-label="Priority" className="sr-td-priority" style={{ padding: "16px" }}>
                        <span className={`sr-badge-priority sr-priority-${(t.priority || "Normal").toLowerCase()}`} style={{ 
                          fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "12px", 
                          background: t.priority === "High" || t.priority === "Urgent" ? "var(--status-rejected-bg)" : "var(--light)", 
                          color: t.priority === "High" || t.priority === "Urgent" ? "var(--status-rejected-txt)" : "var(--muted)",
                          border: "1px solid var(--bdr)"
                        }}>
                          {t.priority || "Normal"}
                        </span>
                      </td>
                      <td data-label="Status" className="sr-td-status" style={{ padding: "16px" }}>
                        <select
                          className={`sr-select-status sr-status-${(t.status || "open").toLowerCase()}`}
                          style={{
                            padding: "6px 12px", fontSize: "12px", fontWeight: 700, borderRadius: "20px", border: "1px solid var(--bdr)", cursor: "pointer",
                            background: t.status === "closed" || t.status === "resolved" ? "var(--light)" : t.status === "in-progress" ? "var(--status-pending-bg)" : "rgba(59, 130, 246, 0.1)",
                            color: t.status === "closed" || t.status === "resolved" ? "var(--muted)" : t.status === "in-progress" ? "var(--status-pending-txt)" : "#3b82f6",
                            outline: "none", appearance: "none", WebkitAppearance: "none", paddingRight: "16px"
                          }}
                          value={t.status || "open"}
                          onChange={(e) => updateTicketStatus(t.id, e.target.value)}
                        >
                          <option value="open">Open</option>
                          <option value="in-progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td data-label="Actions" className="sr-td-actions" style={{ padding: "16px" }}>
                        <button 
                          className="btn btn-outline sr-btn-view"
                          style={{ minHeight: "32px", padding: "6px 12px", fontSize: "13px", gap: "6px", display: "inline-flex", alignItems: "center" }}
                          onClick={() => {
                            alert(`Ticket #${t.id.slice(0, 6).toUpperCase()}\n\nFrom: ${t.name || "Anonymous"} (${t.email || "No email"})\n\nMessage:\n${t.message}`);
                          }}
                        >
                          <Eye size={14} /> View
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
