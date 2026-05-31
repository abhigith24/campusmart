import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNotifications } from "../context/NotificationsContext";

export default function Navbar({ page, setPage, searchQuery, setSearchQuery }) {
  const { currentUser, userProfile, logout } = useAuth();
  const toast = useToast();
  const { unreadCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await logout();
    toast("Logged out 👋");
    setMenuOpen(false);
    setPage("home");
  }

  const initials = (userProfile?.name || currentUser?.displayName || "?")[0].toUpperCase();

  const menuItems = [
    { label: "👤 My Profile",         action: () => { setPage("profile"); setMenuOpen(false); } },
    { label: "📋 My Listings",         action: () => { setPage("my-listings"); setMenuOpen(false); } },
    { label: "❤️ Wishlist",            action: () => { setPage("wishlist"); setMenuOpen(false); } },
    { label: "🛒 Purchase Requests",   action: () => { setPage("purchase-requests"); setMenuOpen(false); } },
    ...(userProfile?.isAdmin
      ? [{ label: "🛡️ Admin Panel",    action: () => { setPage("admin"); setMenuOpen(false); } }]
      : []),
    { label: "🚪 Logout",              action: handleLogout, danger: true },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <span className="logo" onClick={() => setPage("home")} style={{ cursor: "pointer" }}>
          <span>📚</span> CampusMart
        </span>

        <div className="nav-search">
          <svg width="16" height="16" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            placeholder="Search textbooks, notes, equipment..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage("home"); }}
          />
        </div>

        <div className="nav-links">
          <button className="btn btn-primary btn-sm" onClick={() => setPage("post")}>+ Post Item</button>

          {/* Notifications bell */}
          <button
            className="btn btn-ghost btn-sm nav-icon-btn"
            onClick={() => setPage("notifications")}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && <span className="nav-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>

          {/* Chat */}
          <button className="btn btn-ghost btn-sm" onClick={() => setPage("chat")} title="Messages">💬</button>

          {/* Avatar + dropdown */}
          <div style={{ position: "relative" }} ref={menuRef}>
            <div className="avatar" onClick={() => setMenuOpen(o => !o)}>
              {currentUser?.photoURL
                ? <img src={currentUser.photoURL} alt="" />
                : initials}
            </div>
            {menuOpen && (
              <div style={{
                position: "absolute", right: 0, top: "44px", background: "white",
                border: "2px solid var(--border)", borderRadius: "12px", minWidth: "200px",
                boxShadow: "var(--shadow-lg)", zIndex: 200, overflow: "hidden"
              }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{userProfile?.name || currentUser?.displayName}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{userProfile?.college || "Student"}</div>
                </div>
                {menuItems.map((item, i) => (
                  <button key={i} onClick={item.action} style={{
                    display: "block", width: "100%", padding: "11px 16px", border: "none",
                    background: "transparent", cursor: "pointer", textAlign: "left",
                    fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 14,
                    color: item.danger ? "var(--red)" : "var(--text)",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--light)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {item.label}
                    {item.label.includes("Notifications") && unreadCount > 0 && (
                      <span className="notif-badge-inline">{unreadCount}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
