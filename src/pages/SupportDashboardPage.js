import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";

export default function SupportDashboardPage({ setPage }) {
  const toast = useToast();
  const [tab, setTab] = useState("support_requests");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketSearch, setTicketSearch] = useState("");

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, tab), orderBy("createdAt", "desc")));
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast("Failed to load support data. ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  async function updateTicketStatus(id, newStatus) {
    try {
      await updateDoc(doc(db, tab, id), { status: newStatus });
      toast(`Ticket status updated to ${newStatus}`, "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to update ticket status. ❌", "error");
    }
  }

  const TABS = [
    { id: "support_requests", label: `🎫 Support Requests` },
    { id: "bug_reports", label: `🐛 Bug Reports` },
    { id: "feature_requests", label: `💡 Feature Requests` }
  ];

  const filteredTickets = tickets.filter(t => !ticketSearch ||
    t.name?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.email?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.message?.toLowerCase().includes(ticketSearch.toLowerCase())
  );

  return (
    <AdminLayout activePage="support" setPage={setPage}>
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800 }}>🎧 Support Dashboard</h2>
        <p style={{ color: "var(--muted)" }}>View and manage user requests and feedback.</p>
      </div>

      <div className="profile-tabs" style={{ marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} className={`profile-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="form-input"
          style={{ maxWidth: 300, padding: "8px 14px" }}
          placeholder="🔍 Search tickets..."
          value={ticketSearch}
          onChange={e => setTicketSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-center" style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }} />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          {filteredTickets.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              No tickets found.
            </div>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => (
                  <tr key={t.id} style={{ background: t.status === "closed" ? "var(--bg-secondary)" : "transparent" }}>
                    <td data-label="Date" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                      {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : "Unknown"}
                    </td>
                    <td data-label="User">
                      <div style={{ fontWeight: 600 }}>{t.name || "Anonymous"}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.email || "No email"}</div>
                    </td>
                    <td data-label="Message" style={{ maxWidth: "300px" }}>
                      <div style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontSize: "13px"
                      }}>
                        {t.message}
                      </div>
                    </td>
                    <td data-label="Status">
                      <select
                        className="form-input"
                        style={{ padding: "4px 8px", fontSize: 13, minWidth: 100 }}
                        value={t.status || "open"}
                        onChange={(e) => updateTicketStatus(t.id, e.target.value)}
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td data-label="Actions">
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          alert(`Full Message:\n\n${t.message}\n\n(A full modal viewer can be implemented here)`);
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
