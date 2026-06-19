import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";
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
  const CATEGORIES = ["Textbooks", "Notes", "Lab Equipment", "Electronics", "Stationery", "Girls", "Misc"];

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
    ...(userProfile?.isAdmin ? [{
      label: "Admin Panel",
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ),
      action: () => { setPage("admin"); setMenuOpen(false); }
    }] : []),
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
          <button className="nav-logo" onClick={() => setPage("home")} type="button">
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

          <div className="drawer-nav-grid">
            {[
              {
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
                label: "Post Item",
                action: () => requireAuth("post")
              },
              {
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
                label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`,
                action: () => requireAuth("notifications")
              },
              {
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                label: "Messages",
                action: () => requireAuth("chat")
              },
              {
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
                label: "Profile",
                action: () => requireAuth("profile")
              },
              {
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
                label: "Wishlist",
                action: () => requireAuth("wishlist")
              },
              {
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
                label: "Requests",
                action: () => requireAuth("purchase-requests")
              },
              ...(userProfile?.isAdmin ? [{
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
                label: "Admin",
                action: () => requireAuth("admin")
              }] : []),
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
    </>
  );
}
