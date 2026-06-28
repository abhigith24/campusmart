import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../context/ToastContext";
import { useNotifications } from "../context/NotificationsContext";
import { useWishlist } from "../context/WishlistContext";
import { trackSearch } from "../utils/analytics";
import { useTheme } from "../context/ThemeContext";
import VerifiedStudentBadge from "./VerifiedStudentBadge";
import TrustedSellerBadge from "./TrustedSellerBadge";
import OfficialStaffBadge from "./OfficialStaffBadge";
import { getRoleConfig, getDashboardRoute } from "../config/accessControl";
import * as LucideIcons from "lucide-react";
import ProfileDropdown from "./ProfileDropdown";
import ConfirmModal from "./ConfirmModal";

export default function Navbar({ page, setPage, searchQuery, setSearchQuery, requireAuth }) {
  const { currentUser, userProfile, logout } = useAuth();
  const { theme, themeMode, setThemeMode, toggleTheme } = useTheme();
  const toast = useToast();
  const { unreadCount } = useNotifications();
  const { wishlistDocs } = useWishlist();
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
    function k(e) {
      if (e.key === "Escape") {
        setShowLogoutConfirm(false);
      }
    }
    document.addEventListener("mousedown", h);
    window.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      window.removeEventListener("keydown", k);
    };
  }, []);

  useEffect(() => { setDrawerOpen(false); setShowMobileSearchOverlay(false); }, [page]);

  const [logoutLoading, setLogoutLoading] = useState(false);

  function handleLogout() {
    setShowLogoutConfirm(true);
    setMenuOpen(false);
  }

    const [recentSearches, setRecentSearches] = useState([]);
  const [allListingTitles, setAllListingTitles] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showMobileSearchOverlay, setShowMobileSearchOverlay] = useState(false);
  const [showOverlayDropdown, setShowOverlayDropdown] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
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

  const { hasFeature, hasPermission } = useAuth();

  const roleConfig = getRoleConfig(userProfile);

  const isStaff = userProfile?.role === "admin" || userProfile?.role === "System Administrator" || userProfile?.role === "support" || userProfile?.role === "Support Moderator" || userProfile?.permissionLevel >= 1;
  const nameToUse = userProfile?.name || currentUser?.displayName || (isStaff ? "Staff" : "Student");
  const initials = nameToUse.charAt(0).toUpperCase();
  const renderIcon = (iconName, size = 16) => {
    const IconCmp = LucideIcons[iconName] || LucideIcons.Circle;
    return <IconCmp size={size} className="nav-icon" style={{ minWidth: `${size}px`, marginRight: "8px" }} />;
  };

  const getDropdownSections = () => {
    const navItems = roleConfig.navigation.filter(item => item.section !== "admin" && item.section !== "support");
    return Array.from(new Set(navItems.map(i => i.section)));
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <button className="nav-logo" onClick={() => { setPage(getDashboardRoute(userProfile)); setDrawerOpen(false); }} type="button">
            <img className="brand-logo-img" src="/logo-circular.png" alt="CampusMart" />
            <span className="logo-text">Campus<span className="logo-mart">Mart</span></span>
          </button>

          {hasFeature("showSearch") && (
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
          )}



          <div className="nav-spacer" />

          <div className="nav-links">
            {!isStaff && hasFeature("showPostItemButton") && (
              <button className="btn btn-primary" onClick={() => setPage("post")} type="button" style={{ padding: "0 20px", borderRadius: 8, height: 44, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                + Post Item
              </button>
            )}

            {currentUser ? (
              <>
                <button 
                  className="nav-icon-btn" 
                  onClick={() => setPage("notifications")} 
                  aria-label="Notifications" 
                  type="button"
                >
                  <LucideIcons.Bell size={20} strokeWidth={2} />
                  {unreadCount > 0 && <span className="nav-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </button>

                {!isStaff && (
                  <button className="nav-icon-btn" onClick={() => setPage("wishlist")} aria-label="Wishlist" type="button">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {wishlistDocs?.length > 0 && <span className="nav-badge">{wishlistDocs.length > 9 ? "9+" : wishlistDocs.length}</span>}
                  </button>
                )}

                {!isStaff && hasFeature("showChat") && (
                  <button className="nav-icon-btn" onClick={() => setPage("chat")} aria-label="Messages" type="button">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                )}

                <div className="nav-avatar-wrap" ref={menuRef}>
                  <button 
                    className="nav-avatar" 
                    onClick={() => setMenuOpen(o => !o)} 
                    title="Account" 
                    type="button"
                  >
                    {(userProfile?.photoURL || currentUser?.photoURL)
                      ? <img src={userProfile?.photoURL || currentUser?.photoURL} alt="" />
                      : <span>{initials}</span>}
                    {!isStaff && (userProfile?.collegeVerified || userProfile?.isVerified) && <span className="nav-verified-dot" title="Verified Student" />}
                  </button>

                {menuOpen && (
                  <ProfileDropdown
                    userProfile={userProfile}
                    currentUser={currentUser}
                    isStaff={isStaff}
                    initials={initials}
                    roleConfig={roleConfig}
                    page={page}
                    setPage={setPage}
                    setMenuOpen={setMenuOpen}
                    handleLogout={handleLogout}
                    wishlistCount={wishlistDocs?.length || 0}
                    unreadCount={unreadCount || 0}
                  />
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
                  {(userProfile?.photoURL || currentUser?.photoURL) ? (
                    <img src={userProfile?.photoURL || currentUser?.photoURL} alt="" />
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
                      <span className="drawer-user-name-text">{userProfile?.name || currentUser?.displayName || (isStaff ? "Staff" : "Student")}</span>
                      {userProfile?.successfulSales >= 3 && <TrustedSellerBadge size="sm" />}
                      <OfficialStaffBadge role={userProfile?.role} size="sm" />
                    </div>
                    <div className="drawer-user-email" style={{ fontSize: "12px", color: "var(--txt-2)", wordBreak: "break-all" }}>{currentUser.email}</div>
                    
                    {hasPermission("canVerifyCollege") && (
                      <>
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
                    )}
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
              {Array.from(new Set((roleConfig.navigation || []).map(i => i.section))).map(sec => {
                const items = (roleConfig.navigation || []).filter(i => i.section === sec);
                if (items.length === 0) return null;
                return (
                  <div key={sec} className={`drawer-section ${sec !== "primary" ? "border-top" : ""}`}>
                    {sec !== "primary" && <div className="drawer-section-title" style={{textTransform: "capitalize"}}>{sec}</div>}
                    <div className="drawer-card-verify" style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "8px 10px", margin: "2px 0" }}>
                      {items.map(item => (
                         <button key={item.id} className={`drawer-item-btn ${page === (item.route || item.id) ? "active" : ""}`} onClick={() => { setPage(item.route || item.id); setDrawerOpen(false); }}>
                           <span className="drawer-item-icon" style={{ display: "flex", alignItems: "center" }}>{renderIcon(item.icon, 18)}</span> {item.label}
                           {item.id === "notifications" && unreadCount > 0 && <span className="drawer-badge-count">{unreadCount}</span>}
                         </button>
                      ))}
                    </div>
                  </div>
                );
              })}

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
                      aria-label="Toggle Dark Mode"
                    />
                    <span className={`slider ${theme === "dark" ? "active" : ""}`} style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, background: theme === "dark" ? "var(--p)" : "var(--bdr-2)", transition: ".2s", borderRadius: "24px" }}>
                      <span style={{ position: "absolute", content: "", height: "16px", width: "16px", left: theme === "dark" ? "20px" : "4px", bottom: "4px", background: "white", transition: ".2s", borderRadius: "50%" }}></span>
                    </span>
                  </label>
                </div>
              </div>

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

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Logout"
        message={`Are you sure you want to logout from CampusMart?\n\nYou'll need to sign in again to access your account.`}
        confirmText={logoutLoading ? "Logging out..." : "Logout"}
        cancelText="Cancel"
        danger={true}
        disabled={logoutLoading}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          setLogoutLoading(true);
          try {
            await logout();
            toast("Logged out successfully.", "success");
            setShowLogoutConfirm(false);
            setDrawerOpen(false);
            setPage("home");
          } catch (err) {
            console.error(err);
            toast("Logout failed. Please try again.", "error");
          } finally {
            setLogoutLoading(false);
          }
        }}
      />

      {/* ================= DEACTIVATE CONFIRM MODAL ================= */}
      {showDeactivateConfirm && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(2px)" }}>
          <div className="modal" style={{ width: "100%", maxWidth: "450px", padding: "24px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--bdr)" }} role="dialog" aria-modal="true" aria-label="Deactivate Account Confirmation">
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

