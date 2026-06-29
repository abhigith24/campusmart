import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import * as Icons from "lucide-react";

function AdminSkeletonLoader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px" }}>
      <div className="desktop-only" style={{ background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflow: "hidden" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid var(--bdr)", background: "var(--bg-secondary)" }}>
          <div className="skeleton" style={{ width: "30%", height: "20px", borderRadius: "4px" }}></div>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "16px", borderBottom: "1px solid var(--bdr)", gap: "16px" }}>
            <div className="skeleton" style={{ width: "20%", height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "25%", height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "15%", height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "15%", height: "24px", borderRadius: "12px" }}></div>
            <div className="skeleton" style={{ flex: 1, height: "36px", borderRadius: "8px" }}></div>
          </div>
        ))}
      </div>

      <div className="mobile-only admin-mobile-cards" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "var(--s0)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="skeleton" style={{ width: "60%", height: "20px", borderRadius: "4px" }}></div>
              <div className="skeleton" style={{ width: "80%", height: "16px", borderRadius: "4px" }}></div>
            </div>
            <div style={{ marginTop: "4px" }}>
              <div className="skeleton" style={{ width: "90px", height: "24px", borderRadius: "12px" }}></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div className="skeleton" style={{ width: "40%", height: "14px", borderRadius: "4px" }}></div>
              <div className="skeleton" style={{ width: "50%", height: "14px", borderRadius: "4px" }}></div>
            </div>
            <div style={{ marginTop: "8px", paddingTop: "12px", borderTop: "1px solid var(--bdr)", display: "flex", gap: "8px" }}>
              <div className="skeleton" style={{ flex: 1, height: "44px", borderRadius: "8px" }}></div>
              <div className="skeleton" style={{ flex: 1, height: "44px", borderRadius: "8px" }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VerificationRequestsPage({ setPage }) {
  const { userProfile } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdCardUrl, setActiveIdCardUrl] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  
  // Revoke Modal State
  const [userToRevoke, setUserToRevoke] = useState(null);

  useEffect(() => {
    loadData();
  }, [userProfile]);

  async function loadData() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast("Failed to load user verifications. ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveVerification(uid) {
    if (!window.confirm("Are you sure you want to APPROVE this user's college verification?")) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        collegeVerified: true,
        verificationStatus: "approved",
        verifiedAt: serverTimestamp()
      });

      const q = query(
        collection(db, "listings"),
        where("sellerId", "==", uid),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => updateDoc(doc(db, "listings", d.id), {
        collegeVerified: true,
        isVerified: true
      })));

      toast("College verification approved!", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to approve verification. ❌", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectVerification(uid) {
    if (!window.confirm("Are you sure you want to REJECT this user's college verification?")) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        collegeVerified: false,
        verificationStatus: "rejected"
      });

      const q = query(
        collection(db, "listings"),
        where("sellerId", "==", uid),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => updateDoc(doc(db, "listings", d.id), {
        collegeVerified: false,
        isVerified: false
      })));

      toast("College verification rejected. ❌", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to reject verification. ❌", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function executeRevokeVerification() {
    if (!userToRevoke) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "users", userToRevoke), {
        collegeVerified: false,
        verificationStatus: "rejected"
      });

      const q = query(
        collection(db, "listings"),
        where("sellerId", "==", userToRevoke),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => updateDoc(doc(db, "listings", d.id), {
        collegeVerified: false,
        isVerified: false
      })));

      toast("College verification revoked. ❌", "success");
      setUserToRevoke(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to revoke verification. ❌", "error");
    } finally {
      setActionLoading(false);
    }
  }

  const pendingUsers = users.filter(u => u.verificationStatus && u.verificationStatus !== "none");
  const uniqueColleges = Array.from(new Set(pendingUsers.map(u => u.college).filter(Boolean))).sort();

  const filteredUsers = pendingUsers
    .filter(u => {
      if (statusFilter !== "all" && u.verificationStatus !== statusFilter) return false;
      if (collegeFilter !== "all" && u.college !== collegeFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (u.name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search));
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = a.verificationSubmittedAt?.toMillis ? a.verificationSubmittedAt.toMillis() : 0;
      const dateB = b.verificationSubmittedAt?.toMillis ? b.verificationSubmittedAt.toMillis() : 0;
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const stats = {
    pending: pendingUsers.filter(u => u.verificationStatus === "pending").length,
    approved: pendingUsers.filter(u => u.verificationStatus === "approved").length,
    rejected: pendingUsers.filter(u => u.verificationStatus === "rejected").length,
    today: pendingUsers.filter(u => {
      if (!u.verificationSubmittedAt?.toDate) return false;
      const date = u.verificationSubmittedAt.toDate();
      const today = new Date();
      return date.toDateString() === today.toDateString();
    }).length
  };

  const renderVerificationActions = (u) => (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
      {u.verificationStatus === "pending" && (
        <>
          <button 
            type="button"
            className="btn btn-green admin-action-btn" 
            style={{ flex: 1, minWidth: "115px", height: "44px", display: "inline-flex", justifyContent: "center", alignItems: "center", borderRadius: "8px" }}
            onClick={() => handleApproveVerification(u.id)}
            disabled={actionLoading}
          >
            Approve
          </button>
          <button 
            type="button"
            className="btn btn-danger admin-action-btn" 
            style={{ flex: 1, minWidth: "115px", height: "44px", display: "inline-flex", justifyContent: "center", alignItems: "center", borderRadius: "8px" }}
            onClick={() => handleRejectVerification(u.id)}
            disabled={actionLoading}
          >
            Reject
          </button>
        </>
      )}
      {u.verificationStatus === "approved" && (
        <button 
          type="button"
          className="btn btn-outline admin-action-btn" 
          style={{ flex: 1, minWidth: "140px", height: "44px", display: "inline-flex", justifyContent: "center", alignItems: "center", borderRadius: "8px", borderColor: "var(--status-rejected-txt)", color: "var(--status-rejected-txt)" }}
          onClick={() => setUserToRevoke(u.id)}
          disabled={actionLoading}
        >
          Revoke
        </button>
      )}
      {u.verificationStatus === "rejected" && (
        <button 
          type="button"
          className="btn btn-green admin-action-btn" 
          style={{ flex: 1, minWidth: "140px", height: "44px", display: "inline-flex", justifyContent: "center", alignItems: "center", borderRadius: "8px" }}
          onClick={() => handleApproveVerification(u.id)}
          disabled={actionLoading}
        >
          Approve Anyway
        </button>
      )}
    </div>
  );

  return (
    <AdminLayout activePage="admin-verifications" setPage={setPage}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800 }}>🎓 Verification Requests</h2>
        <p style={{ color: "var(--muted)" }}>Review and manage student ID verification requests</p>
      </div>

      {!loading && (
        <>
          {/* Stats Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "12px", padding: "14px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "var(--surface)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                <Icons.Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "#d97706" }}>{stats.pending}</div>
                <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: "600" }}>Pending Verification</div>
              </div>
            </div>
            
            <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "12px", padding: "14px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "var(--surface)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                <Icons.CheckCircle size={24} />
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "#059669" }}>{stats.approved}</div>
                <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: "600" }}>Approved</div>
              </div>
            </div>

            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "14px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "var(--surface)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                <Icons.XCircle size={24} />
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "#dc2626" }}>{stats.rejected}</div>
                <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: "600" }}>Rejected</div>
              </div>
            </div>

            <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "12px", padding: "14px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "var(--surface)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                <Icons.Calendar size={24} />
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "#2563eb" }}>{stats.today}</div>
                <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: "600" }}>Today's Requests</div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "200px", maxWidth: "320px" }}>
              <Icons.Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input
                className="form-input"
                style={{ width: "100%", padding: "0 16px 0 40px", height: "44px", borderRadius: "12px", fontSize: "14px" }}
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select className="form-input" style={{ width: "140px", height: "44px", borderRadius: "12px", fontSize: "14px", cursor: "pointer" }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select className="form-input" style={{ minWidth: "160px", maxWidth: "200px", height: "44px", borderRadius: "12px", fontSize: "14px", cursor: "pointer" }} value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)}>
              <option value="all">All Colleges</option>
              {uniqueColleges.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-input" style={{ width: "130px", height: "44px", borderRadius: "12px", fontSize: "14px", cursor: "pointer" }} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </>
      )}

      {loading ? (
        <AdminSkeletonLoader />
      ) : (
        <>
          {filteredUsers.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", textAlign: "center" }}>
              <Icons.FileX size={48} style={{ color: "var(--muted)", marginBottom: "16px" }} />
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>No Verification Requests</h3>
              <p style={{ color: "var(--muted)", marginBottom: "20px" }}>There are currently no student verification requests matching your filters.</p>
              <button className="btn btn-outline" onClick={loadData} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <Icons.RefreshCcw size={16} /> Refresh Data
              </button>
            </div>
          ) : (
            <>
              <div className="desktop-only desktop-verifications-table-container" style={{ background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflowX: "auto" }}>
                <table className="report-table">
                  <thead style={{ fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", fontSize: "12px", color: "var(--muted)", position: "sticky", top: "64px", zIndex: 10, background: "var(--surface)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                    <tr>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)" }}>User Name</th>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)" }}>Email</th>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)" }}>College</th>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)" }}>Status</th>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)" }}>Date</th>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)" }}>ID Card</th>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const submittedAt = u.verificationSubmittedAt?.toDate
                        ? new Date(u.verificationSubmittedAt.toDate()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : "—";
                      
                      let statusBadgeColor = { bg: "var(--light)", color: "var(--txt-2)", label: "● Unverified" };
                      if (u.collegeVerified && u.verificationStatus === "approved") {
                        statusBadgeColor = { bg: "var(--status-accepted-bg)", color: "var(--status-accepted-txt)", label: "● Approved" };
                      } else if (u.verificationStatus === "pending") {
                        statusBadgeColor = { bg: "var(--status-pending-bg)", color: "var(--status-pending-txt)", label: "● Pending" };
                      } else if (u.verificationStatus === "rejected") {
                        statusBadgeColor = { bg: "var(--status-rejected-bg)", color: "var(--status-rejected-txt)", label: "● Rejected" };
                      }

                      return (
                        <tr key={u.id}>
                          <td data-label="User Name" style={{ fontWeight: 700, padding: "14px 16px" }}>{u.name}</td>
                          <td data-label="Email" style={{ fontSize: 13, padding: "14px 16px", wordBreak: "break-all" }}>{u.email}</td>
                          <td data-label="College" style={{ padding: "14px 16px" }}>{u.college || "—"}</td>
                          <td data-label="Status" style={{ padding: "14px 16px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "24px", fontSize: "12px", fontWeight: "700", background: statusBadgeColor.bg, color: statusBadgeColor.color }}>
                              {statusBadgeColor.label}
                            </span>
                          </td>
                          <td data-label="Date" style={{ fontSize: 12, color: "var(--muted)", padding: "14px 16px", whiteSpace: "nowrap" }}>{submittedAt}</td>
                          <td data-label="ID Card" style={{ padding: "14px 16px" }}>
                            {u.collegeIdCardUrl ? (
                              <button 
                                type="button"
                                className="btn btn-outline"
                                style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "32px", padding: "0 12px", borderRadius: "8px", fontSize: "13px" }}
                                onClick={() => setActiveIdCardUrl(u.collegeIdCardUrl)}
                              >
                                <Icons.Eye size={16} /> View ID
                              </button>
                            ) : (
                              <span style={{ fontSize: 12, color: "var(--muted-2)" }}>No ID Uploaded</span>
                            )}
                          </td>
                          <td data-label="Action" style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", maxWidth: "240px" }}>
                              {renderVerificationActions(u)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="mobile-only admin-mobile-cards" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredUsers.map(u => {
                  const submittedAt = u.verificationSubmittedAt?.toDate
                    ? new Date(u.verificationSubmittedAt.toDate()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : "—";
                  
                  let statusBadgeColor = { bg: "var(--light)", color: "var(--txt-2)", label: "● Unverified" };
                  if (u.collegeVerified && u.verificationStatus === "approved") {
                    statusBadgeColor = { bg: "var(--status-accepted-bg)", color: "var(--status-accepted-txt)", label: "● Approved" };
                  } else if (u.verificationStatus === "pending") {
                    statusBadgeColor = { bg: "var(--status-pending-bg)", color: "var(--status-pending-txt)", label: "● Pending" };
                  } else if (u.verificationStatus === "rejected") {
                    statusBadgeColor = { bg: "var(--status-rejected-bg)", color: "var(--status-rejected-txt)", label: "● Rejected" };
                  }

                  return (
                    <div key={u.id} className="admin-mobile-card" style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "var(--s0)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--txt)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</h3>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--txt-2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>
                            {u.college || "—"}
                          </div>
                        </div>
                        {u.collegeIdCardUrl ? (
                          <div 
                            style={{ width: "48px", height: "48px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--bdr)", flexShrink: 0, cursor: "pointer", background: "var(--bg-secondary)" }}
                            onClick={() => setActiveIdCardUrl(u.collegeIdCardUrl)}
                          >
                            <img src={u.collegeIdCardUrl} alt="ID Thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        ) : (
                          <div style={{ width: "48px", height: "48px", borderRadius: "8px", border: "1px solid var(--bdr)", flexShrink: 0, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-2)" }}>
                            <Icons.FileX size={20} />
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "24px", fontSize: "12px", fontWeight: "700", background: statusBadgeColor.bg, color: statusBadgeColor.color }}>
                          {statusBadgeColor.label}
                        </span>
                        <div style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Icons.Calendar size={14} /> {submittedAt}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--muted)", fontSize: "13px", minWidth: 0 }}>
                        <Icons.Mail size={14} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</span>
                      </div>

                      <div style={{ marginTop: "8px", paddingTop: "12px", borderTop: "1px solid var(--bdr)", width: "100%" }}>
                        {u.collegeIdCardUrl && (
                          <button 
                            type="button"
                            className="btn btn-outline admin-action-btn"
                            style={{ width: "100%", height: "44px", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "6px", borderRadius: "8px", marginBottom: "8px" }}
                            onClick={() => setActiveIdCardUrl(u.collegeIdCardUrl)}
                          >
                            <Icons.Eye size={16} /> View ID
                          </button>
                        )}
                        {renderVerificationActions(u)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Revoke Confirmation Modal */}
      {userToRevoke && (
        <div className="modal-overlay" onClick={() => setUserToRevoke(null)} style={{ zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)" }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: "90%", background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", color: "var(--status-rejected-txt)" }}>
              <Icons.AlertTriangle size={28} />
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>Revoke Verification?</h3>
            </div>
            <p style={{ color: "var(--muted)", marginBottom: "24px", lineHeight: 1.5 }}>
              This student will lose their verified badge and will need to submit a new verification request. Are you sure you want to proceed?
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" style={{ borderRadius: "8px" }} onClick={() => setUserToRevoke(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" style={{ borderRadius: "8px" }} onClick={executeRevokeVerification} disabled={actionLoading}>
                {actionLoading ? "Processing..." : "Revoke Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Card Viewer Modal */}
      {activeIdCardUrl && (
        <div className="modal-overlay" onClick={() => setActiveIdCardUrl(null)} style={{ zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)" }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650, width: "95%", background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>College ID Card View</h3>
            <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--r-md)", padding: "16px", marginBottom: "20px", textAlign: "center", minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={activeIdCardUrl} alt="College ID Card" style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain", borderRadius: "var(--r-sm)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" style={{ width: "120px", justifyContent: "center", borderRadius: "8px" }} onClick={() => setActiveIdCardUrl(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
