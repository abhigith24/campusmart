import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import ConfirmModal from "../components/ConfirmModal";

export default function UserManagementPage({ setPage }) {
  const { userProfile } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [processingUid, setProcessingUid] = useState(null);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    requireReason: false,
    danger: false,
    onConfirm: () => {}
  });

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

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
        toast("At least one active Administrator must remain assigned.", "error");
        // Re-render select
        loadData();
        return;
      }
    }

    setModalConfig({
      isOpen: true,
      title: "Role Change Confirmation",
      message: `${targetUser?.name || "User"}\n\n${currentRole.toUpperCase()} ↓ ${newRole.toUpperCase()}\n\nAre you sure you want to continue?`,
      requireReason: false,
      danger: true,
      onConfirm: async () => {
        closeModal();
        setProcessingUid(uid);
        try {
          await updateDoc(doc(db, "users", uid), { role: newRole });
          toast(`User role updated to ${newRole}`, "success");
          loadData();
        } catch (err) {
          console.error(err);
          toast("Failed to update user role. ❌", "error");
        } finally {
          setProcessingUid(null);
        }
      }
    });
  }

  async function banUser(uid, name, role) {
    // Protect last admin
    if (role === "admin") {
      const activeAdmins = users.filter(u => u.role === "admin" && !u.banned).length;
      if (activeAdmins <= 1) {
        toast("At least one active Administrator must remain assigned.", "error");
        return;
      }
    }

    setModalConfig({
      isOpen: true,
      title: "Ban Confirmation",
      message: `${name}\nRole: ${role.toUpperCase()}`,
      requireReason: true,
      danger: true,
      onConfirm: async (reason) => {
        closeModal();
        setProcessingUid(uid);
        try {
          await updateDoc(doc(db, "users", uid), { banned: true, banReason: reason || "No reason provided" });
          const userListings = listings.filter(l => l.sellerId === uid && l.status === "active");
          await Promise.all(userListings.map(l => updateDoc(doc(db, "listings", l.id), { status: "removed" })));
          toast("User banned and listings removed 🚫", "success");
          loadData();
        } catch (err) {
          console.error(err);
          toast("Failed to ban user. ❌", "error");
        } finally {
          setProcessingUid(null);
        }
      }
    });
  }

  async function unbanUser(uid) {
    setProcessingUid(uid);
    try {
      await updateDoc(doc(db, "users", uid), { banned: false });
      toast("User unbanned", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to unban user. ❌", "error");
    } finally {
      setProcessingUid(null);
    }
  }



  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    const matchesSearch = !userSearch || 
      u.name?.toLowerCase().includes(q) || 
      u.email?.toLowerCase().includes(q) ||
      u.college?.toLowerCase().includes(q) ||
      u.displayName?.toLowerCase().includes(q);
      
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

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        <input
          className="form-input"
          style={{ width: "100%", padding: "10px 14px" }}
          placeholder="🔍 Search by name or email..."
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
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
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700, marginLeft: "auto", display: "flex", alignItems: "center", paddingRight: "4px" }}>
            {filteredUsers.length} users
          </div>
        </div>
      </div>
      {loading ? (
        <div className="loading-center" style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }} />
        </div>
      ) : (
        <div style={{ background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflow: "auto" }}>
          <table className="report-table user-management-table">
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
                <tr key={u.id} style={{ background: u.banned ? "var(--status-rejected-bg)" : "transparent" }} data-role={currentRole} data-initial={u.name ? u.name.charAt(0).toUpperCase() : "?"}>
                  <td data-label="Name" style={{ fontWeight: 700 }}>
                    {u.banned && <span style={{ marginRight: 4 }} title="Banned">🚫</span>}
                    {u.name}
                  </td>
                  <td data-label="Email" style={{ fontSize: 13 }}>{u.email}</td>
                  <td data-label="College">{u.college || "—"}</td>
                  <td data-label="Joined" style={{ fontSize: 12 }}>{joinedDate}</td>
                  <td data-label="Status">
                    {(u.isVerified || u.collegeVerified) ? (
                       <span style={{ fontSize: 12, fontWeight: 700, color: "var(--grn)" }}>✅ Verified</span>
                    ) : (
                       <span style={{ fontSize: 12, color: "var(--muted)" }}>⚪ Unverified</span>
                    )}
                  </td>
                  <td data-label="Role">
                    <select
                      className="form-input"
                      style={{ padding: "4px 8px", fontSize: 13, minWidth: 110, cursor: isSelf ? "not-allowed" : "pointer" }}
                      value={currentRole}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      disabled={isSelf || processingUid === u.id}
                      title={isSelf ? "You cannot modify your own administrative account." : "Change user role"}
                    >
                      <option value="user">🟢 User</option>
                      <option value="support">🟠 Support</option>
                      <option value="admin">🔵 Admin</option>
                    </select>
                  </td>
                  <td data-label="Actions">
                    {isSelf ? (
                      <span title="You cannot modify your own administrative account." style={{ fontSize: 12, color: "var(--muted)", cursor: "not-allowed", borderBottom: "1px dotted var(--muted)" }}>Self Protected</span>
                    ) : processingUid === u.id ? (
                      <span style={{ fontSize: 12, color: "var(--p)" }}>Processing...</span>
                    ) : (
                      u.banned
                        ? <button type="button" className="btn btn-green btn-sm" onClick={() => unbanUser(u.id)}>✅ Unban</button>
                        : <button type="button" className="btn btn-danger btn-sm" onClick={() => banUser(u.id, u.name, currentRole)}>🚫 Ban</button>
                    )}
                  </td>
                </tr>
              )})}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--txt)" }}>No matching users found.</div>
                    <div style={{ fontSize: "13px", color: "var(--txt-2)", marginTop: "8px" }}>Try adjusting your filters or search query.</div>
                    <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: "16px" }} onClick={() => { setUserSearch(""); setRoleFilter("all"); }}>Reset Filters</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    <ConfirmModal {...modalConfig} onClose={closeModal} />
    </AdminLayout>
  );
}
