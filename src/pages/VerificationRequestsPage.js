import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";

export default function VerificationRequestsPage({ setPage }) {
  const { userProfile } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdCardUrl, setActiveIdCardUrl] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!userProfile?.isAdmin) return;
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

      toast("College verification approved! ✅", "success");
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

  if (!userProfile?.isAdmin) {
    return (
      <div className="container" style={{ paddingTop: 60, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h2 style={{ marginTop: 16 }}>Admin Access Only</h2>
        <p style={{ color: "var(--muted)" }}>You don't have admin privileges.</p>
      </div>
    );
  }

  const pendingUsers = users.filter(u => u.verificationStatus && u.verificationStatus !== "none");

  return (
    <AdminLayout activePage="admin-verifications" setPage={setPage}>
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800 }}>🎓 Verification Requests</h2>
        <p style={{ color: "var(--muted)" }}>Review and manage student ID verification requests</p>
      </div>

      {loading ? (
        <div className="loading-center" style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }} />
        </div>
      ) : (
        <div style={{ background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflow: "auto" }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email</th>
                <th>College</th>
                <th>Status</th>
                <th>Submitted Date</th>
                <th>View ID Card</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map(u => {
                const submittedAt = u.verificationSubmittedAt?.toDate
                  ? new Date(u.verificationSubmittedAt.toDate()).toLocaleDateString("en-IN")
                  : "—";
                
                let statusBadgeColor = { bg: "var(--light)", color: "var(--txt-2)", label: "Unverified" };
                if (u.collegeVerified && u.verificationStatus === "approved") {
                  statusBadgeColor = { bg: "var(--status-accepted-bg)", color: "var(--status-accepted-txt)", label: "🟢 Approved" };
                } else if (u.verificationStatus === "pending") {
                  statusBadgeColor = { bg: "var(--status-pending-bg)", color: "var(--status-pending-txt)", label: "🟡 Pending" };
                } else if (u.verificationStatus === "rejected") {
                  statusBadgeColor = { bg: "var(--status-rejected-bg)", color: "var(--status-rejected-txt)", label: "🔴 Rejected" };
                }

                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700 }}>{u.name}</td>
                    <td style={{ fontSize: 13 }}>{u.email}</td>
                    <td>{u.college || "—"}</td>
                    <td>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: statusBadgeColor.bg, color: statusBadgeColor.color }}>
                        {statusBadgeColor.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{submittedAt}</td>
                    <td>
                      {u.collegeIdCardUrl ? (
                        <button 
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => setActiveIdCardUrl(u.collegeIdCardUrl)}
                        >
                          View ID Card 👁️
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--muted-2)" }}>No ID Uploaded</span>
                      )}
                    </td>
                    <td>
                      {u.verificationStatus === "pending" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button 
                            type="button"
                            className="btn btn-green btn-xs" 
                            onClick={() => handleApproveVerification(u.id)}
                            disabled={actionLoading}
                          >
                            Approve
                          </button>
                          <button 
                            type="button"
                            className="btn btn-danger btn-xs" 
                            onClick={() => handleRejectVerification(u.id)}
                            disabled={actionLoading}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {u.verificationStatus === "approved" && (
                        <button 
                          type="button"
                          className="btn btn-danger btn-xs" 
                          onClick={() => handleRejectVerification(u.id)}
                          disabled={actionLoading}
                        >
                          Revoke Verification
                        </button>
                      )}
                      {u.verificationStatus === "rejected" && (
                        <button 
                          type="button"
                          className="btn btn-green btn-xs" 
                          onClick={() => handleApproveVerification(u.id)}
                          disabled={actionLoading}
                        >
                          Approve Anyway
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pendingUsers.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
                    No college ID verification requests found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeIdCardUrl && (
        <div className="modal-overlay" onClick={() => setActiveIdCardUrl(null)} style={{ zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: "90%", background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "20px" }}>
            <h3>College ID Card View</h3>
            <div style={{ background: "var(--light)", borderRadius: "var(--r-md)", padding: "16px", margin: "16px 0", textAlign: "center" }}>
              <img src={activeIdCardUrl} alt="College ID Card" style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "var(--r-sm)" }} />
            </div>
            <button type="button" className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={() => setActiveIdCardUrl(null)}>Close</button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
