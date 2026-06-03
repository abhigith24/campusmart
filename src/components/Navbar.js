import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNotifications } from "../context/NotificationsContext";

export default function Navbar({ page, setPage, searchQuery, setSearchQuery }) {
  const { currentUser, userProfile, logout } = useAuth();
  const toast = useToast();
  const { unreadCount } = useNotifications();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function h(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [page]);

  async function handleLogout() {
    await logout();
    toast("Logged out 👋");
    setMenuOpen(false);
    setPage("home");
  }

  const initials = (userProfile?.name || currentUser?.displayName || "?")[0].toUpperCase();

  const menuItems = [
    { label: "👤 My Profile",       action: () => { setPage("profile"); setMenuOpen(false); } },
    { label: "📋 My Listings",       action: () => { setPage("my-listings"); setMenuOpen(false); } },
    { label: "❤️ Wishlist",          action: () => { setPage("wishlist"); setMenuOpen(false); } },
    { label: "🛒 Purchase Requests", action: () => { setPage("purchase-requests"); setMenuOpen(false); } },
    ...(userProfile?.isAdmin ? [{ label: "🛡️ Admin Panel", action: () => { setPage("admin"); setMenuOpen(false); } }] : []),
    { label: "🚪 Logout",            action: handleLogout, danger: true },
  ];

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Logo */}
          <span className="logo" onClick={() => setPage("home")}>
            <span className="logo-icon">📚</span>
            CampusMart
          </span>

          {/* Desktop search */}
          <div className="nav-search">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              placeholder="Search textbooks, notes, equipment..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage("home"); }}
              aria-label="Search listings"
            />
          </div>

          {/* Desktop nav links */}
          <div className="nav-links">
            <button className="btn-post btn" onClick={() => setPage("post")}>+ Post Item</button>

            {/* Notifications */}
            <button className="nav-icon-btn" onClick={() => setPage("notifications")} aria-label="Notifications" title="Notifications">
              🔔
              {unreadCount > 0 && <span className="nav-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>

            {/* Chat */}
            <button className="nav-icon-btn" onClick={() => setPage("chat")} aria-label="Messages" title="Messages">
              💬
            </button>

            {/* Avatar dropdown */}
            <div style={{ position: "relative" }} ref={menuRef}>
              <div className="avatar" onClick={() => setMenuOpen(o => !o)} title="Account" role="button" aria-label="Account menu">
                {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="" /> : initials}
              </div>
              {menuOpen && (
                <div className="nav-dropdown">
                  <div className="nav-dropdown-header">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{userProfile?.name || currentUser?.displayName}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{userProfile?.college || "Student"}</div>
                  </div>
                  {menuItems.map((item, i) => (
                    <button key={i} className={`nav-dropdown-item ${item.danger ? "danger" : ""}`} onClick={item.action}>
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

          {/* Hamburger (mobile) */}
          <button
            className="nav-hamburger"
            onClick={() => setDrawerOpen(o => !o)}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
          >
            {drawerOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="nav-drawer open">
          {/* Mobile search */}
          <div className="nav-search" style={{ maxWidth: "100%", borderRadius: 12 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              placeholder="Search listings..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage("home"); setDrawerOpen(false); }}
              aria-label="Search listings"
              autoFocus
            />
          </div>

          {/* Mobile nav links */}
          <div className="nav-drawer-links">
            <button className="btn btn-primary btn-sm" onClick={() => setPage("post")}>+ Post Item</button>
            <button className="btn btn-outline btn-sm" onClick={() => setPage("notifications")}>
              🔔 Notifications {unreadCount > 0 && <span className="notif-badge-inline">{unreadCount}</span>}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setPage("chat")}>💬 Messages</button>
            <button className="btn btn-outline btn-sm" onClick={() => setPage("profile")}>👤 Profile</button>
            <button className="btn btn-outline btn-sm" onClick={() => setPage("wishlist")}>❤️ Wishlist</button>
            <button className="btn btn-outline btn-sm" onClick={() => setPage("purchase-requests")}>🛒 Requests</button>
            {userProfile?.isAdmin && (
              <button className="btn btn-outline btn-sm" onClick={() => setPage("admin")}>🛡️ Admin</button>
            )}
            <button className="btn btn-danger btn-sm" onClick={handleLogout}>🚪 Logout</button>
          </div>

          {/* Mobile user info */}
          <div style={{ paddingTop: 8, borderTop: "1px solid var(--bdr)", display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar" style={{ flexShrink: 0 }}>
              {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="" /> : initials}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{userProfile?.name || currentUser?.displayName}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{userProfile?.college || "Student"}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
