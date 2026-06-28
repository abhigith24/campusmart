import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import { Filter, SortDesc, Inbox, Eye, Bug, Search } from "lucide-react";

export default function BugReportsPage({ setPage }) {
  const toast = useToast();
  const [bugReports, setBugReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketSearch, setTicketSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const bugSnap = await getDocs(query(collection(db, "bug_reports"), orderBy("createdAt", "desc")));
      setBugReports(bugSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast("Failed to load bug reports. ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  async function updateTicketStatus(id, newStatus) {
    try {
      await updateDoc(doc(db, "bug_reports", id), { status: newStatus });
      toast(`Bug status updated to ${newStatus}`, "success");
      setBugReports(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error(err);
      toast("Failed to update bug status. ❌", "error");
    }
  }

  const filteredTickets = bugReports.filter(t => !ticketSearch ||
    t.name?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.email?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.description?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.message?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.id.toLowerCase().includes(ticketSearch.toLowerCase())
  );

  return (
    <AdminLayout activePage="bug-reports" setPage={setPage}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "24px" }}>
        
        {/* Header Section */}
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: "24px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}><Bug size={24} /> Bug Reports</h2>
          <p style={{ color: "var(--muted)" }}>Track and manage reported issues and errors.</p>
        </div>

        {/* Search & Filters Section */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative", minWidth: "250px" }}>
            <input
              className="form-input"
              style={{ width: "100%", padding: "10px 16px", paddingLeft: "36px", fontSize: "14px" }}
              placeholder="Search by ID, User, Email or Description..."
              value={ticketSearch}
              onChange={e => setTicketSearch(e.target.value)}
            />
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex", alignItems: "center" }}><Search size={16} /></span>
          </div>
          <button className="btn btn-outline" style={{ height: "42px", gap: "8px" }}><Filter size={16}/> Filter</button>
          <button className="btn btn-outline" style={{ height: "42px", gap: "8px" }}><SortDesc size={16}/> Sort</button>
        </div>

        {/* Bug Reports Table Section */}
        {loading ? (
          <div className="loading-center" style={{ display: "flex", justifyContent: "center", padding: "60px", flex: 1 }}>
            <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }} />
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: "auto", flex: 1, display: "flex", flexDirection: "column", minHeight: "400px" }}>
            {filteredTickets.length === 0 ? (
              <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", flex: 1, justifyContent: "center" }}>
                <Inbox size={48} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: "16px", fontWeight: 600 }}>No bug reports found matching your search.</span>
              </div>
            ) : (
              <table className="report-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--light)", borderBottom: "1px solid var(--bdr)" }}>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Bug ID</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Date</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Reporter</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Description</th>
                    <th style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>Severity</th>
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
                      <td style={{ padding: "16px", fontWeight: 700, color: "var(--muted)", fontSize: "13px", whiteSpace: "nowrap" }}>
                        #{t.id.slice(0, 6).toUpperCase()}
                      </td>
                      <td style={{ padding: "16px", fontSize: "13px", whiteSpace: "nowrap", color: "var(--txt)" }}>
                        {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently"}
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--txt)" }}>{t.name || "Anonymous User"}</div>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>{t.userEmail || t.email || "No email"}</div>
                      </td>
                      <td style={{ padding: "16px", maxWidth: "250px" }}>
                        <div style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: "13px",
                          lineHeight: "1.5",
                          color: "var(--txt-2)"
                        }}>
                          {t.description || t.message}
                        </div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span style={{ 
                          fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "12px", 
                          background: t.priority === "High" ? "var(--status-rejected-bg)" : "var(--light)", 
                          color: t.priority === "High" ? "var(--status-rejected-txt)" : "var(--muted)",
                          border: "1px solid var(--bdr)"
                        }}>
                          {t.priority || "Normal"}
                        </span>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <select
                          style={{
                            padding: "6px 12px", fontSize: "12px", fontWeight: 700, borderRadius: "20px", border: "1px solid var(--bdr)", cursor: "pointer",
                            background: t.status === "closed" ? "var(--light)" : t.status === "in-progress" ? "var(--status-pending-bg)" : "rgba(59, 130, 246, 0.1)",
                            color: t.status === "closed" ? "var(--muted)" : t.status === "in-progress" ? "var(--status-pending-txt)" : "#3b82f6",
                            outline: "none", appearance: "none", WebkitAppearance: "none", paddingRight: "16px"
                          }}
                          value={t.status || "open"}
                          onChange={(e) => updateTicketStatus(t.id, e.target.value)}
                        >
                          <option value="open">Open</option>
                          <option value="in-progress">In Progress</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <button 
                          className="btn btn-outline"
                          style={{ minHeight: "32px", padding: "6px 12px", fontSize: "13px", gap: "6px", display: "inline-flex", alignItems: "center" }}
                          onClick={() => {
                            alert(`Bug Report #${t.id.slice(0, 6).toUpperCase()}\n\nFrom: ${t.name || "Anonymous"} (${t.userEmail || t.email || "No email"})\n\nDescription:\n${t.description || t.message}`);
                          }}
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
