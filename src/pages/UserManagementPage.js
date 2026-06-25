import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";

export default function UserManagementPage({ setPage }) {
  const { userProfile } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, [userProfile]);

  async function loadData() {
    setLoading(true);
    try {
      const [userSnap, listSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "listings"))
      ]);
      setUsers(userSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setListings(listSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast("Failed to load user list. ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(uid, newRole) {
    const targetUser = users.find(u => u.id === uid);
    const currentRole = targetUser?.role || "user";
    
    // Protect last admin
    if (currentRole === "admin" && newRole !== "admin") {
      const activeAdmins = users.filter(u => u.role === "admin" && !u.banned).length;
      if (activeAdmins <= 1) {
        toast("At least one active Administrator must remain assigned to manage the platform.", "error");
        return;
      }
    }

    if (!window.confirm(`Change Role\n\n${currentRole.toUpperCase()} ↓ ${newRole.toUpperCase()}\n\nAre you sure you want to continue?`)) {
      // Re-render the dropdown by calling loadData or just ignoring
      loadData(); 
      return;
    }

    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      toast(`User role updated to ${newRole}`, "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to update user role. ❌", "error");
    }
  }

  async function banUser(uid, name) {
    const reason = window.prompt(`Ban User\n\n${name}\n\nEnter reason (optional):`);
    if (reason === null) return; // User cancelled
    
    try {
      await updateDoc(doc(db, "users", uid), { banned: true, banReason: reason || "No reason provided" });
      const userListings = listings.filter(l => l.sellerId === uid && l.status === "active");
      await Promise.all(userListings.map(l => updateDoc(doc(db, "listings", l.id), { status: "removed" })));
      toast("User banned and listings removed 🚫", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to ban user. ❌", "error");
    }
  }

  async function unbanUser(uid) {
    try {
      await updateDoc(doc(db, "users", uid), { banned: false });
      toast("User unbanned", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to unban user. ❌", "error");
    }
  }



  const filteredUsers = users.filter(u => {
    const matchesSearch = !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (roleFilter === "all") return true;
    if (roleFilter === "banned") return !!u.banned;
    if (roleFilter === "verified") return !!(u.isVerified || u.collegeVerified);
    if (roleFilter === "user") return !u.role || u.role === "user";
    return u.role === roleFilter;
  });

  return (
    <AdminLayout activePage="admin-users" setPage={setPage}>
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800 }}>👤 User Management</h2>
        <p style={{ color: "var(--muted)" }}>Manage platform users and check accounts</p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="form-input"
          style={{ maxWidth: 280, padding: "8px 14px" }}
          placeholder="🔍 Search by name or email..."
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1 }}>
          {[
            { id: "all", label: "All" },
            { id: "user", label: "Users" },
            { id: "support", label: "Support" },
            { id: "admin", label: "Administrators" },
            { id: "verified", label: "Verified" },
            { id: "banned", label: "Banned" }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              className={`btn btn-sm ${roleFilter === f.id ? "btn-primary" : "btn-outline"}`}
              style={{ fontSize: "12px", padding: "6px 12px" }}
              onClick={() => setRoleFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>
          {filteredUsers.length} users
        </div>
      </div>

      {loading ? (
        <div className="loading-center" style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }} />
        </div>
      ) : (
        <div style={{ background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflow: "auto" }}>
          <table className="report-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>College</th><th>Joined</th><th>Status</th><th>Role</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const currentRole = u.role || "user";
                const isSelf = userProfile?.uid && u.uid === userProfile.uid;
                const isStaff = currentRole === "admin" || currentRole === "support";
                
                let joinedDate = "—";
                if (u.joinedAt?.toMillis) {
                  joinedDate = new Date(u.joinedAt.toMillis()).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                }

                return (
                <tr key={u.id} style={{ background: u.banned ? "var(--status-rejected-bg)" : "transparent" }}>
                  <td style={{ fontWeight: 700 }}>
                    {u.banned && <span style={{ marginRight: 4 }} title="Banned">🚫</span>}
                    {u.name}
                  </td>
                  <td style={{ fontSize: 13 }}>{u.email}</td>
                  <td>{u.college || "—"}</td>
                  <td style={{ fontSize: 12 }}>{joinedDate}</td>
                  <td>
                    {(u.isVerified || u.collegeVerified) ? (
                       <span style={{ fontSize: 12, fontWeight: 700, color: "var(--grn)" }}>✅ Verified</span>
                    ) : (
                       <span style={{ fontSize: 12, color: "var(--muted)" }}>⚪ Unverified</span>
                    )}
                  </td>
                  <td>
                    <select
                      className="form-input"
                      style={{ padding: "4px 8px", fontSize: 13, minWidth: 110, cursor: isSelf ? "not-allowed" : "pointer" }}
                      value={currentRole}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      disabled={isSelf}
                      title={isSelf ? "You cannot change your own role." : "Change user role"}
                    >
                      <option value="user">🟢 User</option>
                      <option value="support">🟠 Support</option>
                      <option value="admin">🔵 Admin</option>
                    </select>
                  </td>
                  <td>
                    {isSelf ? (
                      <span title="You cannot ban yourself." style={{ fontSize: 12, color: "var(--muted)", cursor: "not-allowed", borderBottom: "1px dotted var(--muted)" }}>Self Protected</span>
                    ) : isStaff ? (
                      <span title="Official staff accounts cannot be banned." style={{ fontSize: 12, color: "var(--muted)", cursor: "not-allowed", borderBottom: "1px dotted var(--muted)" }}>Protected Staff</span>
                    ) : (
                      u.banned
                        ? <button type="button" className="btn btn-green btn-sm" onClick={() => unbanUser(u.id)}>✅ Unban</button>
                        : <button type="button" className="btn btn-danger btn-sm" onClick={() => banUser(u.id, u.name)}>🚫 Ban</button>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
