import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import ConfirmModal from "../components/ConfirmModal";
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
            <div className="skeleton" style={{ width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0 }}></div>
            <div className="skeleton" style={{ width: "20%", height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "20%", height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "15%", height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "15%", height: "24px", borderRadius: "12px" }}></div>
            <div className="skeleton" style={{ width: "36px", height: "36px", borderRadius: "8px" }}></div>
          </div>
        ))}
      </div>

      <div className="mobile-only admin-mobile-cards" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "var(--s0)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div className="skeleton" style={{ width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0 }}></div>
              <div className="skeleton" style={{ flex: 1, height: "24px", borderRadius: "4px" }}></div>
              <div className="skeleton" style={{ width: "24px", height: "24px", borderRadius: "4px", flexShrink: 0 }}></div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div className="skeleton" style={{ width: "80px", height: "24px", borderRadius: "12px" }}></div>
              <div className="skeleton" style={{ width: "80px", height: "24px", borderRadius: "12px" }}></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="skeleton" style={{ width: "60%", height: "14px", borderRadius: "4px" }}></div>
              <div className="skeleton" style={{ width: "70%", height: "14px", borderRadius: "4px" }}></div>
              <div className="skeleton" style={{ width: "40%", height: "14px", borderRadius: "4px" }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UserManagementPage({ setPage }) {
  const { userProfile } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [userSearch, setUserSearch] = useState("");
  const [tabFilter, setTabFilter] = useState("all");
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const [processingUid, setProcessingUid] = useState(null);
  const [openMenuUid, setOpenMenuUid] = useState(null);

  const [roleModalUser, setRoleModalUser] = useState(null);
  const [newRoleSelection, setNewRoleSelection] = useState("");

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    requireReason: false,
    danger: false,
    onConfirm: () => {}
  });

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  // Close menu if clicked outside (simple overlay strategy)
  useEffect(() => {
    const handleClick = () => setOpenMenuUid(null);
    if (openMenuUid) window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [openMenuUid]);

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

  const openRoleModal = (u, currentRole) => {
    setRoleModalUser(u);
    setNewRoleSelection(currentRole);
  };

  async function executeRoleChange() {
    if (!roleModalUser) return;
    const uid = roleModalUser.id;
    const newRoleTitle = newRoleSelection;
    const currentRole = getComputedRole(roleModalUser);

    if (currentRole === newRoleTitle) {
      setRoleModalUser(null);
      return;
    }
    
    // Protect last admin
    if (currentRole === "System Administrator" && newRoleTitle !== "System Administrator") {
      const activeAdmins = users.filter(u => u.permissionLevel >= 4 && !u.banned).length;
      if (activeAdmins <= 1) {
        toast("At least one active Administrator must remain assigned.", "error");
        return;
      }
    }

    setProcessingUid(uid);
    setRoleModalUser(null);
    try {
      const { ROLES } = await import("../config/rbac.js");
      let newRoleObj = ROLES.USER;
      if (newRoleTitle === "System Administrator") newRoleObj = ROLES.SYSTEM_ADMIN;
      else if (newRoleTitle === "Support Moderator") newRoleObj = ROLES.SUPPORT_MODERATOR;

      await updateDoc(doc(db, "users", uid), { 
        role: newRoleObj.title,
        permissionLevel: newRoleObj.level,
        department: newRoleObj.department,
        accountType: newRoleObj.accountType
      });
      toast(`User role updated to ${newRoleTitle}`, "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to update user role. ❌", "error");
    } finally {
      setProcessingUid(null);
    }
  }

  async function banUser(uid, name, roleTitle, permissionLevel) {
    // Protect last admin
    if (permissionLevel >= 4 || roleTitle === "System Administrator" || roleTitle === "admin") {
      const activeAdmins = users.filter(u => u.permissionLevel >= 4 && !u.banned).length;
      if (activeAdmins <= 1) {
        toast("At least one active Administrator must remain assigned.", "error");
        return;
      }
    }

    setModalConfig({
      isOpen: true,
      title: "Ban Confirmation",
      message: `${name}\nRole: ${roleTitle.toUpperCase()}`,
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

  function getComputedRole(u) {
    if (u.permissionLevel >= 4 || u.role === "admin" || u.role === "System Administrator") return "System Administrator";
    if (u.permissionLevel >= 1 || u.role === "support" || u.role === "Support Moderator") return "Support Moderator";
    return "User";
  }

  // Pre-calculations
  const uniqueColleges = Array.from(new Set(users.map(u => u.college).filter(Boolean))).sort();
  
  const stats = {
    total: users.length,
    verified: users.filter(u => u.isVerified || u.collegeVerified).length,
    admins: users.filter(u => u.permissionLevel >= 4 || u.role === "admin" || u.role === "System Administrator").length,
    support: users.filter(u => (u.permissionLevel >= 1 && u.permissionLevel < 4) || u.role === "support" || u.role === "Support Moderator").length,
    banned: users.filter(u => u.banned).length
  };

  const filteredUsers = users
    .filter(u => {
      // 1. Tab Filter
      if (tabFilter === "banned" && !u.banned) return false;
      if (tabFilter === "verified" && !(u.isVerified || u.collegeVerified)) return false;
      const compRole = getComputedRole(u);
      if (tabFilter === "admin" && compRole !== "System Administrator") return false;
      if (tabFilter === "support" && compRole !== "Support Moderator") return false;
      if (tabFilter === "user" && compRole !== "User") return false;

      // 2. Search
      const q = userSearch.toLowerCase();
      if (q && !(u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.college?.toLowerCase().includes(q) || u.displayName?.toLowerCase().includes(q))) return false;
      
      // 3. Dropdown Filters
      if (collegeFilter !== "all" && u.college !== collegeFilter) return false;
      if (statusFilter !== "all") {
        const isVer = u.isVerified || u.collegeVerified;
        if (statusFilter === "verified" && !isVer) return false;
        if (statusFilter === "unverified" && isVer) return false;
        if (statusFilter === "banned" && !u.banned) return false;
      }
      if (roleFilter !== "all" && getComputedRole(u) !== roleFilter) return false;

      return true;
    })
    .sort((a, b) => {
      const dateA = a.joinedAt?.toMillis ? a.joinedAt.toMillis() : 0;
      const dateB = b.joinedAt?.toMillis ? b.joinedAt.toMillis() : 0;
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  return (
    <AdminLayout activePage="admin-users" setPage={setPage}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800 }}>👤 User Management</h2>
        <p style={{ color: "var(--muted)" }}>Manage platform users and check accounts</p>
      </div>

      {!loading && (
        <>
          {/* Stats Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "12px", padding: "14px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "var(--surface)", width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", flexShrink: 0 }}>
                <Icons.Users size={20} />
              </div>
              <div>
                <div style={{ fontSize: "22px", fontWeight: "800", color: "#2563eb" }}>{stats.total}</div>
                <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>Total Users</div>
              </div>
            </div>
            
            <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "12px", padding: "14px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "var(--surface)", width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", flexShrink: 0 }}>
                <Icons.BadgeCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: "22px", fontWeight: "800", color: "#059669" }}>{stats.verified}</div>
                <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>Verified</div>
              </div>
            </div>

            <div style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)", borderRadius: "12px", padding: "14px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "var(--surface)", width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", flexShrink: 0 }}>
                <Icons.Shield size={20} />
              </div>
              <div>
                <div style={{ fontSize: "22px", fontWeight: "800", color: "#7c3aed" }}>{stats.admins}</div>
                <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>Admins</div>
              </div>
            </div>

            <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "12px", padding: "14px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "var(--surface)", width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", flexShrink: 0 }}>
                <Icons.Headphones size={20} />
              </div>
              <div>
                <div style={{ fontSize: "22px", fontWeight: "800", color: "#d97706" }}>{stats.support}</div>
                <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>Support</div>
              </div>
            </div>

            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "14px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "var(--surface)", width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", flexShrink: 0 }}>
                <Icons.Ban size={20} />
              </div>
              <div>
                <div style={{ fontSize: "22px", fontWeight: "800", color: "#dc2626" }}>{stats.banned}</div>
                <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>Banned</div>
              </div>
            </div>
          </div>

          {/* Inline Filter Bar */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "200px", maxWidth: "320px" }}>
              <Icons.Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input
                className="form-input"
                style={{ width: "100%", padding: "0 16px 0 40px", height: "44px", borderRadius: "12px", fontSize: "14px" }}
                placeholder="Search users..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            <select className="form-input" style={{ width: "140px", height: "44px", borderRadius: "12px", fontSize: "14px", cursor: "pointer" }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="System Administrator">Administrators</option>
              <option value="Support Moderator">Support</option>
              <option value="User">Users</option>
            </select>
            <select className="form-input" style={{ minWidth: "140px", maxWidth: "180px", height: "44px", borderRadius: "12px", fontSize: "14px", cursor: "pointer" }} value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)}>
              <option value="all">All Colleges</option>
              {uniqueColleges.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-input" style={{ width: "140px", height: "44px", borderRadius: "12px", fontSize: "14px", cursor: "pointer" }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="banned">Banned</option>
            </select>
            <select className="form-input" style={{ width: "140px", height: "44px", borderRadius: "12px", fontSize: "14px", cursor: "pointer" }} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* Record Count Tabs */}
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", flexWrap: "nowrap", whiteSpace: "nowrap", borderBottom: "1px solid var(--bdr)", marginBottom: "16px" }}>
            {[
              { id: "all", label: `All (${stats.total})` },
              { id: "user", label: `Users (${stats.total - stats.admins - stats.support})` },
              { id: "support", label: `Support (${stats.support})` },
              { id: "admin", label: `Administrators (${stats.admins})` },
              { id: "verified", label: `Verified (${stats.verified})` },
              { id: "banned", label: `Banned (${stats.banned})` }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                className={`btn btn-sm ${tabFilter === f.id ? "btn-primary" : "btn-outline"}`}
                style={{ fontSize: "13px", padding: "6px 14px", borderRadius: "20px" }}
                onClick={() => setTabFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}

      {loading ? (
        <AdminSkeletonLoader />
      ) : (
        <>
          {filteredUsers.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", textAlign: "center" }}>
              <Icons.Users size={48} style={{ color: "var(--muted)", marginBottom: "16px" }} />
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>No users found</h3>
              <p style={{ color: "var(--muted)", marginBottom: "20px" }}>Try changing your search or filters.</p>
              <button 
                className="btn btn-outline" 
                onClick={() => { setUserSearch(""); setTabFilter("all"); setCollegeFilter("all"); setStatusFilter("all"); setRoleFilter("all"); }} 
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <Icons.RefreshCcw size={16} /> Reset Filters
              </button>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="desktop-only" style={{ background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflowX: "auto" }}>
                <div className="table-responsive-wrapper">
                  <table className="report-table user-management-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", fontSize: "12px", color: "var(--muted)", position: "sticky", top: "64px", zIndex: 10, background: "var(--surface)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                    <tr>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", textAlign: "left" }}>Name</th>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", textAlign: "left" }}>Email</th>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", textAlign: "left" }}>College</th>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", textAlign: "left" }}>Joined</th>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", textAlign: "left" }}>Status</th>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", textAlign: "left" }}>Role</th>
                      <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const currentRole = getComputedRole(u);
                      const isSelf = userProfile?.uid && u.uid === userProfile.uid;
                      const isSystemAdmin = currentRole === "System Administrator";
                      
                      let joinedDate = "—";
                      if (u.joinedAt?.toMillis) {
                        joinedDate = new Date(u.joinedAt.toMillis()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                      }

                      // Status Badge
                      let statusBadge = { bg: "var(--light)", color: "var(--txt-2)", label: "● Unverified" };
                      if (u.banned) {
                        statusBadge = { bg: "var(--status-rejected-bg)", color: "var(--status-rejected-txt)", label: "● Banned" };
                      } else if (u.isVerified || u.collegeVerified) {
                        statusBadge = { bg: "var(--status-accepted-bg)", color: "var(--status-accepted-txt)", label: "● Verified" };
                      }

                      // Role Badge
                      let roleBadge = { bg: "var(--light)", color: "var(--txt-2)", label: "● User" };
                      if (currentRole === "System Administrator") {
                        roleBadge = { bg: "rgba(59, 130, 246, 0.1)", color: "#2563eb", label: "● System Administrator" };
                      } else if (currentRole === "Support Moderator") {
                        roleBadge = { bg: "rgba(245, 158, 11, 0.1)", color: "#d97706", label: "● Support Moderator" };
                      }

                      // Avatar
                      const initial = u.name ? u.name.charAt(0).toUpperCase() : "?";

                      return (
                      <tr key={u.id} style={{ background: u.banned ? "rgba(239, 68, 68, 0.04)" : "transparent" }}>
                        <td data-label="Name" style={{ padding: "14px 16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--p)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0, overflow: "hidden" }}>
                            {u.photoURL ? <img src={u.photoURL} alt={initial} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
                          </div>
                          <span style={{ maxWidth: "160px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</span>
                        </td>
                        <td data-label="Email" style={{ padding: "14px 16px", fontSize: 13 }}>{u.email}</td>
                        <td data-label="College" style={{ padding: "14px 16px", fontSize: 13 }}>{u.college || "—"}</td>
                        <td data-label="Joined" style={{ padding: "14px 16px", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{joinedDate}</td>
                        <td data-label="Status" style={{ padding: "14px 16px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "24px", fontSize: "12px", fontWeight: "700", background: statusBadge.bg, color: statusBadge.color }}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td data-label="Role" style={{ padding: "14px 16px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "24px", fontSize: "12px", fontWeight: "700", background: roleBadge.bg, color: roleBadge.color, whiteSpace: "nowrap" }}>
                            {roleBadge.label}
                          </span>
                        </td>
                        <td data-label="Actions" style={{ padding: "14px 16px", textAlign: "right" }}>
                          {processingUid === u.id ? (
                            <span style={{ fontSize: 12, color: "var(--p)", display: "inline-block", padding: "6px 0" }}>Processing...</span>
                          ) : isSelf || isSystemAdmin ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: 12, color: "var(--muted)", background: "var(--bg-secondary)", padding: "4px 10px", borderRadius: "16px", border: "1px solid var(--bdr)" }}>
                              <Icons.ShieldCheck size={14} /> Protected Account
                            </span>
                          ) : (
                            <div style={{ position: "relative", display: "inline-block" }}>
                              {u.banned ? (
                                 <button type="button" className="btn btn-green btn-sm" style={{ padding: "4px 12px", height: "32px", borderRadius: "6px" }} onClick={() => unbanUser(u.id)}>✅ Unban</button>
                              ) : (
                                 <button 
                                   type="button" 
                                   className="btn btn-ghost btn-sm" 
                                   style={{ padding: "4px 8px", height: "32px", borderRadius: "6px" }} 
                                   onClick={(e) => { e.stopPropagation(); setOpenMenuUid(openMenuUid === u.id ? null : u.id); }}
                                 >
                                   <Icons.MoreVertical size={18} />
                                 </button>
                              )}
                              
                              {openMenuUid === u.id && !u.banned && (
                                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: "160px", zIndex: 100, padding: "4px", textAlign: "left" }}>
                                  <button type="button" className="menu-item" style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--txt)" }}>
                                    <Icons.User size={14} /> View Profile
                                  </button>
                                  <button type="button" className="menu-item" style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--txt)" }} onClick={(e) => { e.stopPropagation(); setOpenMenuUid(null); openRoleModal(u, currentRole); }}>
                                    <Icons.Shield size={14} /> Change Role
                                  </button>
                                  <div style={{ height: "1px", background: "var(--bdr)", margin: "4px 0" }}></div>
                                  <button type="button" className="menu-item" style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "none", border: "none", cursor: "not-allowed", fontSize: "13px", color: "var(--muted)" }} disabled>
                                    <Icons.Key size={14} /> Reset Password
                                  </button>
                                  <button type="button" className="menu-item" style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "none", border: "none", cursor: "not-allowed", fontSize: "13px", color: "var(--muted)" }} disabled>
                                    <Icons.Download size={14} /> Export Data
                                  </button>
                                  <div style={{ height: "1px", background: "var(--bdr)", margin: "4px 0" }}></div>
                                  <button type="button" className="menu-item" style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--status-rejected-txt)", fontWeight: 600 }} onClick={(e) => { e.stopPropagation(); setOpenMenuUid(null); banUser(u.id, u.name, currentRole, u.permissionLevel); }}>
                                    <Icons.Ban size={14} /> Ban User
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
                </div>
              </div>

              {/* MOBILE CARDS */}
              <div className="mobile-only admin-mobile-cards" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredUsers.map(u => {
                  const currentRole = getComputedRole(u);
                  const isSelf = userProfile?.uid && u.uid === userProfile.uid;
                  const isSystemAdmin = currentRole === "System Administrator";
                  
                  let joinedDate = "—";
                  if (u.joinedAt?.toMillis) {
                    joinedDate = new Date(u.joinedAt.toMillis()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                  }

                  // Status Badge
                  let statusBadge = { bg: "var(--light)", color: "var(--txt-2)", label: "● Unverified" };
                  if (u.banned) {
                    statusBadge = { bg: "var(--status-rejected-bg)", color: "var(--status-rejected-txt)", label: "● Banned" };
                  } else if (u.isVerified || u.collegeVerified) {
                    statusBadge = { bg: "var(--status-accepted-bg)", color: "var(--status-accepted-txt)", label: "● Verified" };
                  }

                  // Role Badge
                  let roleBadge = { bg: "var(--light)", color: "var(--txt-2)", label: "● User" };
                  if (currentRole === "System Administrator") {
                    roleBadge = { bg: "rgba(59, 130, 246, 0.1)", color: "#2563eb", label: "● System Administrator" };
                  } else if (currentRole === "Support Moderator") {
                    roleBadge = { bg: "rgba(245, 158, 11, 0.1)", color: "#d97706", label: "● Support Moderator" };
                  }

                  // Avatar
                  const initial = u.name ? u.name.charAt(0).toUpperCase() : "?";

                  return (
                    <div key={`mob-${u.id}`} className="admin-mobile-card" style={{ background: u.banned ? "rgba(239, 68, 68, 0.04)" : "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "var(--s0)" }}>
                      
                      {/* Header Layer */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--p)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0, overflow: "hidden" }}>
                            {u.photoURL ? <img src={u.photoURL} alt={initial} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
                          </div>
                          <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--txt)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</h3>
                        </div>
                        
                        {/* Overflow Actions */}
                        <div style={{ flexShrink: 0, position: "relative" }}>
                          {processingUid === u.id ? (
                            <span style={{ fontSize: 12, color: "var(--p)" }}>...</span>
                          ) : isSelf || isSystemAdmin ? (
                            <Icons.ShieldCheck size={18} style={{ color: "var(--muted)", marginTop: "4px" }} />
                          ) : (
                            <>
                              {u.banned ? (
                                <button type="button" className="btn btn-green btn-sm" style={{ padding: "4px 12px", height: "32px", borderRadius: "6px" }} onClick={() => unbanUser(u.id)}>✅ Unban</button>
                              ) : (
                                <button 
                                  type="button" 
                                  className="btn btn-ghost btn-sm" 
                                  style={{ padding: "4px", height: "32px", borderRadius: "6px" }} 
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuUid(openMenuUid === `mob-${u.id}` ? null : `mob-${u.id}`); }}
                                >
                                  <Icons.MoreVertical size={20} />
                                </button>
                              )}
                              
                              {openMenuUid === `mob-${u.id}` && !u.banned && (
                                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: "180px", zIndex: 100, padding: "4px", textAlign: "left" }}>
                                  <button type="button" className="menu-item" style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "var(--txt)" }}>
                                    <Icons.User size={16} /> View Profile
                                  </button>
                                  <button type="button" className="menu-item" style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "var(--txt)" }} onClick={(e) => { e.stopPropagation(); setOpenMenuUid(null); openRoleModal(u, currentRole); }}>
                                    <Icons.Shield size={16} /> Change Role
                                  </button>
                                  <div style={{ height: "1px", background: "var(--bdr)", margin: "4px 0" }}></div>
                                  <button type="button" className="menu-item" style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "none", border: "none", cursor: "not-allowed", fontSize: "14px", color: "var(--muted)" }} disabled>
                                    <Icons.Key size={16} /> Reset Password
                                  </button>
                                  <button type="button" className="menu-item" style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "none", border: "none", cursor: "not-allowed", fontSize: "14px", color: "var(--muted)" }} disabled>
                                    <Icons.Download size={16} /> Export Data
                                  </button>
                                  <div style={{ height: "1px", background: "var(--bdr)", margin: "4px 0" }}></div>
                                  <button type="button" className="menu-item" style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "var(--status-rejected-txt)", fontWeight: 600 }} onClick={(e) => { e.stopPropagation(); setOpenMenuUid(null); banUser(u.id, u.name, currentRole, u.permissionLevel); }}>
                                    <Icons.Ban size={16} /> Ban User
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Status & Role Layer */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "24px", fontSize: "12px", fontWeight: "700", background: roleBadge.bg, color: roleBadge.color, whiteSpace: "nowrap" }}>
                          {roleBadge.label}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "24px", fontSize: "12px", fontWeight: "700", background: statusBadge.bg, color: statusBadge.color, whiteSpace: "nowrap" }}>
                          {statusBadge.label}
                        </span>
                      </div>

                      {/* Metadata Layer */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px", fontSize: "13px", color: "var(--muted)" }}>
                        {u.college && (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                            <Icons.Book size={14} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.college}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                          <Icons.Mail size={14} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Icons.Calendar size={14} style={{ flexShrink: 0 }} />
                          <span>Joined {joinedDate}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Change Role Modal */}
      {roleModalUser && (
        <div className="modal-overlay" onClick={() => setRoleModalUser(null)} style={{ zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)" }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: "90%", background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 800 }}>Change Role</h3>
            <p style={{ color: "var(--muted)", marginBottom: "20px", fontSize: "14px", lineHeight: 1.5 }}>
              Select a new role for <strong>{roleModalUser.name}</strong>.
            </p>
            
            <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", border: "1px solid var(--bdr)", borderRadius: "8px", cursor: "pointer", background: newRoleSelection === "User" ? "rgba(59, 130, 246, 0.05)" : "var(--bg-secondary)" }}>
                <input type="radio" name="role" value="User" checked={newRoleSelection === "User"} onChange={e => setNewRoleSelection(e.target.value)} style={{ width: "16px", height: "16px" }} />
                <span style={{ fontWeight: 600 }}>🟢 User</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", border: "1px solid var(--bdr)", borderRadius: "8px", cursor: "pointer", background: newRoleSelection === "Support Moderator" ? "rgba(59, 130, 246, 0.05)" : "var(--bg-secondary)" }}>
                <input type="radio" name="role" value="Support Moderator" checked={newRoleSelection === "Support Moderator"} onChange={e => setNewRoleSelection(e.target.value)} style={{ width: "16px", height: "16px" }} />
                <span style={{ fontWeight: 600 }}>🟠 Support Moderator</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", border: "1px solid var(--bdr)", borderRadius: "8px", cursor: "pointer", background: newRoleSelection === "System Administrator" ? "rgba(59, 130, 246, 0.05)" : "var(--bg-secondary)" }}>
                <input type="radio" name="role" value="System Administrator" checked={newRoleSelection === "System Administrator"} onChange={e => setNewRoleSelection(e.target.value)} style={{ width: "16px", height: "16px" }} />
                <span style={{ fontWeight: 600 }}>🔵 System Administrator</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" style={{ borderRadius: "8px" }} onClick={() => setRoleModalUser(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" style={{ borderRadius: "8px" }} onClick={executeRoleChange} disabled={processingUid === roleModalUser.id}>
                {processingUid === roleModalUser.id ? "Saving..." : "Save Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal {...modalConfig} onClose={closeModal} />
    </AdminLayout>
  );
}
