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

  useEffect(() => {
    if (!userProfile?.isAdmin) return;
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

  async function toggleAdmin(uid, current) {
    try {
      await updateDoc(doc(db, "users", uid), { isAdmin: !current });
      toast(`Admin ${!current ? "granted" : "revoked"} ✅`, "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to update admin role. ❌", "error");
    }
  }

  async function banUser(uid) {
    if (!window.confirm("Ban this user? Their listings will be hidden.")) return;
    try {
      await updateDoc(doc(db, "users", uid), { banned: true });
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
      toast("User unbanned ✅", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to unban user. ❌", "error");
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

  const filteredUsers = users.filter(u => !userSearch ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

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
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>
          {users.length} students registered
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
              <tr><th>Name</th><th>Email</th><th>College</th><th>Year</th><th>Rating</th><th>Admin</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} style={{ background: u.banned ? "var(--status-rejected-bg)" : "transparent" }}>
                  <td style={{ fontWeight: 700 }}>
                    {u.banned && <span style={{ marginRight: 4 }}>🚫</span>}
                    {u.name}
                  </td>
                  <td style={{ fontSize: 13 }}>{u.email}</td>
                  <td>{u.college || "—"}</td>
                  <td>{u.year || "—"}</td>
                  <td>{u.rating > 0 ? `⭐ ${u.rating.toFixed(1)}` : "—"}</td>
                  <td>
                    <button
                      type="button"
                      className={`btn btn-sm ${u.isAdmin ? "btn-danger" : "btn-outline"}`}
                      onClick={() => toggleAdmin(u.id, u.isAdmin)}
                    >
                      {u.isAdmin ? "Revoke Admin" : "Grant Admin"}
                    </button>
                  </td>
                  <td>
                    {!u.isAdmin && (
                      u.banned
                        ? <button type="button" className="btn btn-green btn-sm" onClick={() => unbanUser(u.id)}>✅ Unban</button>
                        : <button type="button" className="btn btn-danger btn-sm" onClick={() => banUser(u.id)}>🚫 Ban</button>
                    )}
                    {u.isAdmin && (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>Protected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
