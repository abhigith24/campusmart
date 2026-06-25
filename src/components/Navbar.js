import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../context/ToastContext";
import { useNotifications } from "../context/NotificationsContext";
import { trackSearch } from "../utils/analytics";
import { useTheme } from "../context/ThemeContext";
import VerifiedStudentBadge from "./VerifiedStudentBadge";
import TrustedSellerBadge from "./TrustedSellerBadge";

export default function Navbar({ page, setPage, searchQuery, setSearchQuery, requireAuth }) {
  const { currentUser, userProfile, logout } = useAuth();
  const { theme, themeMode, setThemeMode, toggleTheme } = useTheme();
  const toast = useToast();
  const { unreadCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminControlsExpanded, setAdminControlsExpanded] = useState(false);
  const menuRef = useRef(null);

  // Redesigned hamburger drawer modals
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    function h(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { setDrawerOpen(false); setShowMobileSearchOverlay(false); }, [page]);

  async function handleLogout() {
    await logout();
    toast("Logged out");
    setMenuOpen(false);
    setPage("home");
  }

    const [recentSearches, setRecentSearches] = useState([]);
  const [allListingTitles, setAllListingTitles] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showMobileSearchOverlay, setShowMobileSearchOverlay] = useState(false);
  const [showOverlayDropdown, setShowOverlayDropdown] = useState(false);
  const searchRef = useRef(null);
  const mobileOverlaySearchRef = useRef(null);

  const TRENDING_TAGS = ["Calculator", "Lab coat", "HCV", "Notes", "Mattress", "Kettle"];
  const CATEGORIES = ["Books", "Notes", "Electronics", "Lab Equipment", "Stationery", "Fashion", "Hostel", "Sports", "Gaming", "Musical Instruments", "Photography", "Other"];

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("recentSearches") || "[]");
      setRecentSearches(saved);
    } catch (e) {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    async function loadTitles() {
      try {
        const q = query(collection(db, "listings"), where("status", "==", "active"), limit(150));
        const snap = await getDocs(q);
        const titles = snap.docs.map(d => d.data().title || "");
        setAllListingTitles([...new Set(titles.filter(Boolean))]);
      } catch (err) {
        console.error("Error loading search suggestions:", err);
      }
    }
    loadTitles();
  }, []);

  const addRecentSearch = (term) => {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    const updated = [clean, ...recentSearches.filter(s => s !== clean)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const removeRecentSearch = (e, term) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const handleSelectSearch = (term) => {
    setSearchQuery(term);
    addRecentSearch(term);
    setPage("home");
    setShowSearchDropdown(false);
    setShowMobileSearchOverlay(false);
    setTimeout(() => {
      document.getElementById("listings-section")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  useEffect(() => {
    function clickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
      if (mobileOverlaySearchRef.current && !mobileOverlaySearchRef.current.contains(e.target)) {
        setShowOverlayDropdown(false);
      }
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const getKeywordSuggestions = () => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matchingCats = CATEGORIES.filter(cat => cat.toLowerCase().includes(q))
      .map(cat => ({ term: cat, type: "category", label: `Category: ${cat}` }));
    const matchingTitles = allListingTitles.filter(t => t.toLowerCase().includes(q))
      .slice(0, 5).map(title => ({ term: title, type: "listing", label: title }));
    return [...matchingCats, ...matchingTitles].slice(0, 6);
  };

  const renderDropdownContent = (isOpen, setOpen) => {
    if (!isOpen) return null;
    const isQueryEmpty = searchQuery.trim() === "";
    const suggestions = getKeywordSuggestions();

    return (
      <div className="search-suggestions-dropdown">
        {isQueryEmpty ? (
          <>
            {recentSearches.length > 0 && (
              <div className="search-dropdown-section">
                <div className="search-dropdown-title">Recent Searches</div>
                <div className="recent-searches-list">
                  {recentSearches.map((term, i) => (
                    <div key={i} className="recent-search-item" onClick={() => handleSelectSearch(term)}>
                      <span className="recent-icon">⏱️</span>
                      <span className="recent-term">{term}</span>
                      <button type="button" className="recent-remove-btn" onClick={(e) => removeRecentSearch(e, term)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="search-dropdown-section">
              <div className="search-dropdown-title">🔥 Trending on Campus</div>
              <div className="trending-tags-grid">
                {TRENDING_TAGS.map((tag, i) => (
                  <button key={i} type="button" className="trending-tag-btn" onClick={() => handleSelectSearch(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="search-dropdown-section">
            <div className="search-dropdown-title">Suggestions</div>
            {suggestions.length === 0 ? (
              <div className="no-suggestions-item">
                🔍 Press Enter to search for "{searchQuery}"
              </div>
            ) : (
              <div className="suggestions-list">
                {suggestions.map((item, i) => (
                  <div key={i} className="suggestion-item" onClick={() => handleSelectSearch(item.term)}>
                    <span className="suggestion-icon">{item.type === "category" ? "🏷️" : "🔍"}</span>
                    <span className="suggestion-term">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const initials = (userProfile?.name || currentUser?.displayName || "?")[0].toUpperCase();
  const isVerified = userProfile?.isVerified;

  const menuItems = [
    {
      label: "My Profile",
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
      action: () => { setPage("profile"); setMenuOpen(false); }
    },
    {
      label: "My Listings",
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
        </svg>
      ),
      action: () => { setPage("my-listings"); setMenuOpen(false); }
    },
    {
      label: "Wishlist",
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
      ),
      action: () => { setPage("wishlist"); setMenuOpen(false); }
    },
    {
      label: "Purchase Requests",
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
        </svg>
      ),
      action: () => { setPage("purchase-requests"); setMenuOpen(false); }
    },
    ...(userProfile?.role === "admin" ? [{
      label: "Admin Panel",
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ),
      action: () => { setPage("admin"); setMenuOpen(false); }
    }] : []),
    ...(userProfile?.role === "support" || userProfile?.role === "admin" ? [{
      label: "Support Dashboard",
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      action: () => { setPage("support"); setMenuOpen(false); }
    }] : []),
    {
      label: "Settings",
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      ),
      action: () => { setPage("settings"); setMenuOpen(false); }
    },
    {
      label: "Logout",
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      ),
      action: handleLogout,
      danger: true
    },
  ];

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <button className="nav-logo" onClick={() => { setPage("home"); setDrawerOpen(false); }} type="button">
            <img className="brand-logo-img" src="/logo-circular.png" alt="CampusMart" />
            <span className="logo-text">Campus<span className="logo-mart">Mart</span></span>
          </button>

          <div className="nav-search" ref={searchRef} style={{ position: "relative" }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              placeholder="Search textbooks, notes, equipment..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage("home"); }}
              onFocus={() => setShowSearchDropdown(true)}
              onKeyDown={e => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  trackSearch(searchQuery);
                  addRecentSearch(searchQuery);
                  setShowSearchDropdown(false);
                  setPage("home");
                  setTimeout(() => {
                    document.getElementById("listings-section")?.scrollIntoView({ behavior: "smooth" });
                  }, 150);
                }
              }}
              aria-label="Search listings"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => { setSearchQuery(""); setShowSearchDropdown(false); }}
                aria-label="Clear search"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
            {renderDropdownContent(showSearchDropdown, setShowSearchDropdown)}
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
                    {(userProfile?.collegeVerified || userProfile?.isVerified) && <span className="nav-verified-dot" title="Verified Student" />}
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
                        <div className="nav-dropdown-name" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {userProfile?.name || currentUser?.displayName}
                          {(userProfile?.collegeVerified || userProfile?.isVerified) && <VerifiedStudentBadge size="sm" />}
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
                        {item.icon}
                        <span>{item.label}</span>
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

          {/* Mobile search toggle button */}
          <button 
            className="nav-mobile-search-toggle" 
            onClick={() => setShowMobileSearchOverlay(o => !o)}
            aria-label="Toggle search"
            type="button"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>

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
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="nav-drawer-modern open">
            
            {/* Drawer Header */}
            <div className="drawer-header-modern" onClick={() => { setPage("profile"); setDrawerOpen(false); }} style={{ cursor: "pointer" }}>
              <div className="drawer-header-top-row">
                <div className="drawer-user-avatar">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="" />
                  ) : (
                    <span>{currentUser ? initials : "?"}</span>
                  )}
                </div>
                <button className="drawer-close-btn" onClick={(e) => { e.stopPropagation(); setDrawerOpen(false); }} type="button">✕</button>
              </div>

              <div className="drawer-user-info-modern">
                {currentUser ? (
                  <>
                    <div className="drawer-user-name-row" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span className="drawer-user-name-text">{userProfile?.name || currentUser?.displayName || "Student"}</span>
                      {userProfile?.successfulSales >= 3 && <TrustedSellerBadge size="sm" />}
                    </div>
                    <div className="drawer-user-email" style={{ fontSize: "12px", color: "var(--txt-2)", wordBreak: "break-all" }}>{currentUser.email}</div>
                    <div className="drawer-user-college" style={{ fontSize: "12px", color: "var(--txt-2)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                      📍 {userProfile?.college || "No College Linked"}
                    </div>
                    
                    {/* Verification Status Display */}
                    <div className="drawer-verification-status-row" style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px" }}>
                      {userProfile?.collegeVerified || userProfile?.isVerified ? (
                        <span className="verified-status-drawer-text" style={{ color: "var(--grn)", fontSize: "12px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px", background: "var(--grn-light)", padding: "3px 8px", borderRadius: "12px", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
                          ✓ Verified Student
                        </span>
                      ) : (
                        <span className="verified-status-drawer-text" style={{ color: "var(--txt-2)", fontSize: "12px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px", background: "var(--light)", padding: "3px 8px", borderRadius: "12px", border: "1px solid var(--bdr)" }}>
                          ⚪ Not Verified
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="drawer-user-name-row">
                      <span className="drawer-user-name-text">Guest Visitor</span>
                    </div>
                    <div className="drawer-user-email">Sign in to browse or list items</div>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 8, width: "fit-content" }} onClick={(e) => { e.stopPropagation(); setDrawerOpen(false); requireAuth(null); }}>Sign In</button>
                  </>
                )}
              </div>
            </div>

            {/* Scrollable Drawer Content */}
            <div className="drawer-scroll-content">
              
              {/* PRIMARY MENU ITEMS */}
              <div className="drawer-section">
                <button className={`drawer-item-btn ${page === "home" ? "active" : ""}`} onClick={() => { setPage("home"); setDrawerOpen(false); }}>
                  <span className="drawer-item-icon">🏠</span> Home
                </button>
                <button className={`drawer-item-btn ${page === "my-listings" ? "active" : ""}`} onClick={() => { setPage("my-listings"); setDrawerOpen(false); }}>
                  <span className="drawer-item-icon">📦</span> My Listings
                </button>
                <button className={`drawer-item-btn ${page === "wishlist" ? "active" : ""}`} onClick={() => { setPage("wishlist"); setDrawerOpen(false); }}>
                  <span className="drawer-item-icon">❤️</span> Wishlist
                </button>
                <button className={`drawer-item-btn ${page === "notifications" ? "active" : ""}`} onClick={() => { setPage("notifications"); setDrawerOpen(false); }}>
                  <span className="drawer-item-icon">🔔</span> Notifications {unreadCount > 0 && <span className="drawer-badge-count">{unreadCount}</span>}
                </button>
                <button className={`drawer-item-btn ${page === "profile" ? "active" : ""}`} onClick={() => { setPage("profile"); setDrawerOpen(false); }}>
                  <span className="drawer-item-icon">👤</span> Profile
                </button>
                <button className={`drawer-item-btn ${page === "settings" ? "active" : ""}`} onClick={() => { setPage("settings"); setDrawerOpen(false); }}>
                  <span className="drawer-item-icon">⚙️</span> Settings
                </button>
              </div>

              {/* MARKETPLACE CARD CONTAINER */}
              <div className="drawer-section border-top">
                <div className="drawer-section-title">Marketplace</div>
                <div className="drawer-card-verify" style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "8px 10px", margin: "2px 0" }}>
                  <button className="drawer-item-btn" style={{ padding: "7px 0" }} onClick={() => { setPage("purchase-requests"); setDrawerOpen(false); }}>
                    <span className="drawer-item-icon">🛒</span> My Purchases
                  </button>
                  <button className={`drawer-item-btn ${page === "my-sales" ? "active" : ""}`} style={{ padding: "7px 0" }} onClick={() => { setPage("my-sales"); setDrawerOpen(false); }}>
                    <span className="drawer-item-icon">💰</span> My Sales
                  </button>
                  <button className={`drawer-item-btn ${page === "saved-items" ? "active" : ""}`} style={{ padding: "7px 0" }} onClick={() => { setPage("saved-items"); setDrawerOpen(false); }}>
                    <span className="drawer-item-icon">⭐</span> Saved Items
                  </button>
                  <button className={`drawer-item-btn ${page === "my-college-listings" ? "active" : ""}`} style={{ padding: "7px 0" }} onClick={() => { setPage("my-college-listings"); setDrawerOpen(false); }}>
                    <span className="drawer-item-icon">📍</span> My College Listings
                  </button>
                </div>
              </div>

              {/* QUICK SETTINGS */}
              <div className="drawer-section border-top">
                <div className="drawer-section-title">Quick Settings</div>
                <div className="drawer-card-verify" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px" }}>
                  <span style={{ fontWeight: 600, fontSize: "12.5px", color: "var(--txt)" }}>🌙 Dark Mode</span>
                  <label className="switch" style={{ position: "relative", display: "inline-block", width: "42px", height: "24px" }}>
                    <input 
                      type="checkbox" 
                      checked={theme === "dark"} 
                      onChange={toggleTheme}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span className={`slider ${theme === "dark" ? "active" : ""}`} style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, background: theme === "dark" ? "var(--p)" : "var(--bdr-2)", transition: ".2s", borderRadius: "24px" }}>
                      <span style={{ position: "absolute", content: "", height: "16px", width: "16px", left: theme === "dark" ? "20px" : "4px", bottom: "4px", background: "white", transition: ".2s", borderRadius: "50%" }}></span>
                    </span>
                  </label>
                </div>
              </div>

              {/* SUPPORT SECTION */}
              {(userProfile?.role === "support" || userProfile?.role === "admin") && (
                <div className="drawer-section border-top">
                  <div 
                    className={`drawer-item ${page === "support" ? "active" : ""}`}
                    onClick={() => { setPage("support"); setDrawerOpen(false); }}
                  >
                    <span className="drawer-item-icon">🎧</span>
                    Support Dashboard
                  </div>
                </div>
              )}

              {/* ADMIN SECTION */}
              {userProfile?.role === "admin" && (
                <div className="drawer-section border-top admin-section-highlight">
                  <button 
                    className="drawer-item-btn admin-toggle-btn"
                    onClick={() => setAdminControlsExpanded(o => !o)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "transparent", border: "none", padding: "10px 14px", cursor: "pointer", color: "var(--txt)", fontWeight: "600", fontSize: "14px" }}
                    type="button"
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><span className="drawer-item-icon">⚡</span> Admin Controls</span>
                    <span style={{ fontSize: "12px", transition: "transform 0.2s", transform: adminControlsExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                  </button>
                  {adminControlsExpanded && (
                    <div className="admin-sub-menu" style={{ display: "flex", flexDirection: "column", gap: "2px", paddingLeft: "16px", marginTop: "4px" }}>
                      <button className={`drawer-item-btn admin-btn ${page === "admin" ? "active" : ""}`} onClick={() => { setPage("admin"); setDrawerOpen(false); }}>
                        <span className="drawer-item-icon">⚙️</span> Dashboard
                      </button>
                      <button className={`drawer-item-btn admin-btn ${page === "admin-verifications" ? "active" : ""}`} onClick={() => { setPage("admin-verifications"); setDrawerOpen(false); }}>
                        <span className="drawer-item-icon">🎓</span> Verification Requests
                      </button>
                      <button className={`drawer-item-btn admin-btn ${page === "admin-users" ? "active" : ""}`} onClick={() => { setPage("admin-users"); setDrawerOpen(false); }}>
                        <span className="drawer-item-icon">👥</span> User Management
                      </button>
                      <button className={`drawer-item-btn admin-btn ${page === "admin-analytics" ? "active" : ""}`} onClick={() => { setPage("admin-analytics"); setDrawerOpen(false); }}>
                        <span className="drawer-item-icon">📊</span> Analytics
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* LOGOUT BUTTON */}
              {currentUser ? (
                <div style={{ padding: "10px 4px 20px" }}>
                  <button className="drawer-logout-btn-modern" onClick={() => setShowLogoutConfirm(true)} type="button">
                    Sign Out
                  </button>
                </div>
              ) : (
                <div style={{ padding: "10px 4px 20px" }}>
                  <button className="drawer-logout-btn-modern sign-in" onClick={() => { setDrawerOpen(false); requireAuth(null); }} type="button">
                    Sign In
                  </button>
                </div>
              )}

            </div>
          </div>
        </>
      )}

      {showMobileSearchOverlay && (
        <div className="mobile-search-overlay">
          <div className="mobile-search-overlay-inner" ref={mobileOverlaySearchRef}>
            <button className="mobile-search-back-btn" onClick={() => setShowMobileSearchOverlay(false)} type="button">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div className="nav-search" style={{ margin: 0 }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                placeholder="Search CampusMart..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage("home"); }}
                onFocus={() => setShowOverlayDropdown(true)}
                onKeyDown={e => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    trackSearch(searchQuery);
                    addRecentSearch(searchQuery);
                    setShowOverlayDropdown(false);
                    setShowMobileSearchOverlay(false);
                    setPage("home");
                    setTimeout(() => {
                      document.getElementById("listings-section")?.scrollIntoView({ behavior: "smooth" });
                    }, 150);
                  }
                }}
                autoFocus
                aria-label="Search"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => { setSearchQuery(""); setShowOverlayDropdown(false); }}
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
              {renderDropdownContent(showOverlayDropdown, setShowOverlayDropdown)}
            </div>
          </div>
        </div>
      )}

      {/* ================= LOGOUT CONFIRM MODAL ================= */}
      {showLogoutConfirm && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(2px)" }}>
          <div className="modal" style={{ width: "100%", maxWidth: "400px", padding: "24px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--bdr)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--txt)", marginBottom: "10px" }}>Sign Out?</h3>
            <p style={{ fontSize: "14px", color: "var(--txt-2)", lineHeight: "1.5", marginBottom: "20px" }}>
              Are you sure you want to sign out of your CampusMart account?
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowLogoutConfirm(false);
                  setDrawerOpen(false);
                  handleLogout();
                }}
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DEACTIVATE CONFIRM MODAL ================= */}
      {showDeactivateConfirm && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(2px)" }}>
          <div className="modal" style={{ width: "100%", maxWidth: "450px", padding: "24px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--bdr)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--txt)", marginBottom: "10px" }}>Deactivate Account?</h3>
            <p style={{ fontSize: "14px", color: "var(--txt-2)", lineHeight: "1.5", marginBottom: "20px" }}>
              Deactivating your account will temporarily hide your profile and active listings. You can reactivate by logging back in.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setShowDeactivateConfirm(false)}>Cancel</button>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  setShowDeactivateConfirm(false);
                  setDrawerOpen(false);
                  toast("Account deactivated successfully! 🔒", "info");
                  setPage("home");
                }}
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRM MODAL ================= */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(2px)" }}>
          <div className="modal" style={{ width: "100%", maxWidth: "450px", padding: "24px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--bdr)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--red)", marginBottom: "10px" }}>Delete Account Permanently?</h3>
            <p style={{ fontSize: "14px", color: "var(--txt-2)", lineHeight: "1.5", marginBottom: "20px" }}>
              Warning: This is permanent. All listings, wishlist items, chat history, and verification records will be permanently deleted.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDrawerOpen(false);
                  toast("Account permanently deleted! 👋", "info");
                  setPage("home");
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

