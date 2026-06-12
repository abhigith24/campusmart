import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNotifications } from "../context/NotificationsContext";
import { trackSearch } from "../utils/analytics";

export default function Navbar({ page, setPage, searchQuery, setSearchQuery, requireAuth }) {
  const { currentUser, userProfile, logout } = useAuth();
  const toast = useToast();
  const { unreadCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function h(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [page]);

  async function handleLogout() {
    await logout();
    toast("Logged out");
    setMenuOpen(false);
    setPage("home");
  }

  const initials = (userProfile?.name || currentUser?.displayName || "?")[0].toUpperCase();
  const isVerified = userProfile?.isVerified;

  const menuItems = [
    { label: "My Profile", action: () => { setPage("profile"); setMenuOpen(false); } },
    { label: "My Listings", action: () => { setPage("my-listings"); setMenuOpen(false); } },
    { label: "Wishlist", action: () => { setPage("wishlist"); setMenuOpen(false); } },
    { label: "Purchase Requests", action: () => { setPage("purchase-requests"); setMenuOpen(false); } },
    ...(userProfile?.isAdmin ? [{ label: "Admin Panel", action: () => { setPage("admin"); setMenuOpen(false); } }] : []),
    { label: "Logout", action: handleLogout, danger: true },
  ];

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <button className="nav-logo" onClick={() => setPage("home")} type="button">
            <img className="brand-logo-img" src="/logo-circular.png" alt="CampusMart" />
            <span className="logo-text">CampusMart</span>
          </button>

          <div className="nav-search">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              placeholder="Search textbooks, notes, equipment..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage("home"); }}
              onKeyDown={e => { if (e.key === "Enter" && searchQuery.trim()) trackSearch(searchQuery); }}
              onBlur={() => { if (searchQuery.trim()) trackSearch(searchQuery); }}
              aria-label="Search listings"
            />
          </div>

          <div className="nav-links">
            <button className="nav-post-btn" onClick={() => requireAuth("post")} type="button">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Post Item
            </button>

            {currentUser ? (
              <>
                <button className="nav-icon-btn" onClick={() => setPage("notifications")} aria-label="Notifications" type="button">
                  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {unreadCount > 0 && <span className="nav-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </button>

                <button className="nav-icon-btn" onClick={() => setPage("chat")} aria-label="Messages" type="button">
                  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>

                <div className="nav-avatar-wrap" ref={menuRef}>
                  <button className="nav-avatar" onClick={() => setMenuOpen(o => !o)} title="Account" type="button">
                    {currentUser?.photoURL
                      ? <img src={currentUser.photoURL} alt="" />
                      : <span>{initials}</span>}
                    {isVerified && <span className="nav-verified-dot" title="Verified Student" />}
                  </button>

                  {menuOpen && (
                    <div className="nav-dropdown">
                      <div className="nav-dropdown-user">
                        <div className="nav-dropdown-avatar">
                          {currentUser?.photoURL
                            ? <img src={currentUser.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                            : <span>{initials}</span>}
                        </div>
                        <div>
                          <div className="nav-dropdown-name">
                            {userProfile?.name || currentUser?.displayName}
                            {isVerified && <span className="verified-badge-sm">Verified</span>}
                          </div>
                          <div className="nav-dropdown-college">{userProfile?.college || "Student"}</div>
                          {userProfile?.rating > 0 && (
                            <div className="nav-dropdown-rating">{userProfile.rating.toFixed(1)} ({userProfile.totalRatings})</div>
                          )}
                        </div>
                      </div>
                      <div className="nav-dropdown-divider" />
                      {menuItems.map((item, i) => (
                        <button key={i} className={`nav-dropdown-item ${item.danger ? "danger" : ""}`} onClick={item.action} type="button">
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button className="btn btn-outline" onClick={() => requireAuth(null)} type="button" style={{ padding: "8px 16px", borderRadius: 8, height: 38, fontSize: 13, fontWeight: 700 }}>
                Sign In
              </button>
            )}
          </div>

          <button
            className="nav-hamburger"
            onClick={() => setDrawerOpen(o => !o)}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            type="button"
          >
            {drawerOpen
              ? <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>}
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <div className="nav-drawer open">
          <div className="drawer-user-card">
            <div className="drawer-user-avatar">
              {currentUser?.photoURL
                ? <img src={currentUser.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} />
                : <span>{currentUser ? initials : "?"}</span>}
            </div>
            <div className="drawer-user-info">
              <div className="drawer-user-name">
                {currentUser ? (userProfile?.name || currentUser?.displayName) : "Guest Visitor"}
                {isVerified && <span className="verified-badge-sm">Verified</span>}
              </div>
              <div className="drawer-user-college">{currentUser ? (userProfile?.college || "Student") : "Browse CampusMart"}</div>
            </div>
          </div>

          <div className="nav-search" style={{ maxWidth:"100%", borderRadius:10 }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              placeholder="Search listings..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage("home"); setDrawerOpen(false); }}
              autoFocus
              aria-label="Search"
            />
          </div>

          <div className="drawer-nav-grid">
            {[
              { icon:"+", label:"Post Item", action:() => requireAuth("post") },
              { icon:"N", label:`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`, action:() => requireAuth("notifications") },
              { icon:"M", label:"Messages", action:() => requireAuth("chat") },
              { icon:"P", label:"Profile", action:() => requireAuth("profile") },
              { icon:"W", label:"Wishlist", action:() => requireAuth("wishlist") },
              { icon:"R", label:"Requests", action:() => requireAuth("purchase-requests") },
              ...(userProfile?.isAdmin ? [{ icon:"A", label:"Admin", action:() => requireAuth("admin") }] : []),
            ].map((item, i) => (
              <button key={i} className="drawer-nav-btn" onClick={() => { item.action(); setDrawerOpen(false); }} type="button">
                <span className="drawer-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {currentUser ? (
            <button className="drawer-logout-btn" onClick={handleLogout} type="button">
              Sign Out
            </button>
          ) : (
            <button className="drawer-logout-btn" onClick={() => { setDrawerOpen(false); requireAuth(null); }} type="button" style={{ background: "var(--p)", color: "#fff" }}>
              Sign In
            </button>
          )}
        </div>
      )}
    </>
  );
}
