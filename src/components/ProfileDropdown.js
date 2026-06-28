import React, { useEffect, useRef } from "react";
import VerifiedStudentBadge from "./VerifiedStudentBadge";
import OfficialStaffBadge from "./OfficialStaffBadge";
import * as LucideIcons from "lucide-react";
import { getRoleConfig } from "../config/accessControl";

const ProfileDropdown = React.memo(({
  userProfile,
  currentUser,
  initials,
  page,
  setPage,
  setMenuOpen,
  handleLogout,
  wishlistCount,
  unreadCount
}) => {
  const dropdownRef = useRef(null);

  const permissionLevel = userProfile?.permissionLevel || 0;
  const isStaff = userProfile?.role === "admin" || userProfile?.role === "System Administrator" || userProfile?.role === "support" || userProfile?.role === "Support Moderator" || permissionLevel >= 1;
  const isSystemAdmin = userProfile?.role === "admin" || userProfile?.role === "System Administrator" || permissionLevel === 4;
  const roleConfig = getRoleConfig(userProfile);

  // Keyboard navigation logic
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!dropdownRef.current) return;

      const focusableElements = dropdownRef.current.querySelectorAll(
        'button:not([disabled]), a[href]:not([disabled])'
      );

      const elements = Array.from(focusableElements);
      const currentIndex = elements.indexOf(document.activeElement);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
          elements[nextIndex]?.focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
          elements[prevIndex]?.focus();
          break;
        case 'Escape':
          e.preventDefault();
          setMenuOpen(false);
          // Return focus to the avatar button (handled in Navbar.js if possible, or just close)
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Auto-focus the first item when opened for immediate keyboard nav
    // setTimeout(() => {
    //   if (dropdownRef.current) {
    //     const firstEl = dropdownRef.current.querySelector('button');
    //     firstEl?.focus();
    //   }
    // }, 10);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setMenuOpen]);

  const renderIcon = (iconName, size = 18) => {
    const finalSize = isStaff ? 20 : size;
    const stroke = isStaff ? 2 : 1.75;
    const IconCmp = LucideIcons[iconName] || LucideIcons.Circle;
    return <IconCmp size={finalSize} strokeWidth={stroke} className="nav-icon" style={{ minWidth: `${finalSize}px`, marginRight: isStaff ? "12px" : "8px" }} />;
  };

  const getDropdownSections = () => {
    const navItems = roleConfig.navigation.filter(item => item.section !== "admin");
    return Array.from(new Set(navItems.map(i => i.section)));
  };

  const getBadgeCount = (id) => {
    if (id === "wishlist") return wishlistCount;
    if (id === "notifications") return unreadCount;
    return 0;
  };

  return (
    <div className={`nav-dropdown ${isStaff ? 'admin-dropdown' : ''}`} ref={dropdownRef} role="menu" aria-label="Account Menu" style={isStaff ? { width: "380px" } : {}}>
      <div className="nav-dropdown-user-header" style={isStaff ? { padding: "12px 16px" } : {}}>
        <div className="nav-dropdown-user-main" style={isStaff ? { alignItems: "center" } : {}}>
          <div className="nav-dropdown-avatar-wrapper" style={{ width: "48px", height: "48px", flexShrink: 0 }}>
            {(userProfile?.photoURL || currentUser?.photoURL)
              ? <img src={userProfile?.photoURL || currentUser?.photoURL} alt="" />
              : <span>{initials}</span>}
            <div className="online-indicator"></div>
          </div>
          <div className="nav-dropdown-user-info" style={{ flex: 1, minWidth: 0, paddingLeft: isStaff ? "12px" : "0", paddingRight: "8px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div className="nav-dropdown-user-name" style={{ display: "flex", flexWrap: isStaff ? "nowrap" : "wrap", gap: isStaff ? "4px" : "8px", alignItems: isStaff ? "flex-start" : "center", flexDirection: isStaff ? "column" : "row", width: "100%" }}>
              <span style={{ fontWeight: isStaff ? 700 : undefined, whiteSpace: isStaff ? "normal" : "nowrap", wordBreak: "break-word", lineHeight: 1.2, textAlign: "left" }}>
                {isStaff ? (userProfile?.role === "admin" ? "System Administrator" : "CampusMart Administrator") : (userProfile?.name || currentUser?.displayName || "Student")}
              </span>
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                <OfficialStaffBadge permissionLevel={permissionLevel} size="sm" />
              </div>
              {!isStaff && (userProfile?.collegeVerified || userProfile?.isVerified) && <VerifiedStudentBadge size="sm" />}
            </div>
            <div className="nav-dropdown-user-meta" style={{ marginTop: isStaff ? "4px" : "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2, maxWidth: isStaff ? "none" : undefined, width: "100%", textAlign: "left" }} title={isStaff ? (currentUser?.email || "Support Team Account") : (userProfile?.department || userProfile?.course || userProfile?.college || "Student")}>
              {isStaff ? (currentUser?.email || "Support Team Account") : (userProfile?.department || userProfile?.course || userProfile?.college || "Student")}
            </div>
          </div>
        </div>
      </div>

      {isStaff && (
        <div className="nav-dropdown-section-group" style={{ marginTop: "12px" }}>
          <div className="nav-dropdown-section-title" style={{ fontSize: "11px", letterSpacing: "0.5px", margin: "16px 16px 10px 16px" }}>STAFF</div>
          <button
            className={`nav-dropdown-item ${page === "admin" || page === "support" ? "active" : ""}`}
            onClick={() => { setPage(isSystemAdmin ? "admin" : "support"); setMenuOpen(false); }}
            type="button"
            role="menuitem"
            style={{ 
              margin: "2px 8px", width: "calc(100% - 16px)", padding: "0 12px", minHeight: "44px", borderRadius: "6px",
              backgroundColor: (page === "admin" || page === "support") ? "var(--p-light)" : "transparent",
              color: (page === "admin" || page === "support") ? "var(--p)" : undefined
            }}
          >
            {renderIcon("ShieldAlert", 18)}
            <span style={{ flex: 1, textAlign: "left" }}>Admin Console</span>
          </button>
        </div>
      )}

      {getDropdownSections().map((sec, idx) => {
        let items = roleConfig.navigation.filter(item => item.section === sec && item.section !== "admin");

        if (sec === "support" && isStaff) {
          // Replace all individual support pages with a single Support Console launcher
          items = [{ id: "support", route: "support", label: "Support Console", icon: "Briefcase" }];
        }

        if (items.length === 0) return null;

        let sectionTitle = sec.toUpperCase();
        if (sec === "support") sectionTitle = isStaff ? "SUPPORT WORKSPACE" : "SUPPORT";

        return (
          <div className="nav-dropdown-section-group" key={sec} style={isStaff ? { marginTop: "4px" } : {}}>
            {(idx > 0 || isStaff) && <div className="nav-dropdown-divider" style={isStaff ? { margin: "8px 0" } : {}} />}
            <div className="nav-dropdown-section-title" style={isStaff ? { fontSize: "11px", letterSpacing: "0.5px", margin: "16px 16px 10px 16px" } : {}}>{sectionTitle}</div>
            {items.map(item => {
              const isSupportDashboardItem = item.id === "support";
              const internalDashboardRoutes = ["support", "support-requests", "bug-reports", "feature-requests", "seller-reports"];
              const isActive = isSupportDashboardItem
                ? internalDashboardRoutes.includes(page)
                : page === (item.route || item.id);

              const badgeCount = getBadgeCount(item.id);
              return (
                <button
                  key={item.id}
                  className={`nav-dropdown-item ${isActive ? "active" : ""}`}
                  onClick={() => { setPage(item.route || item.id); setMenuOpen(false); }}
                  type="button"
                  role="menuitem"
                  style={isStaff ? { 
                    margin: "2px 8px", width: "calc(100% - 16px)", padding: "0 12px", minHeight: "44px", borderRadius: "6px",
                    backgroundColor: isActive ? "var(--p-light)" : "transparent",
                    color: isActive ? "var(--p)" : undefined
                  } : {}}
                >
                  {renderIcon(item.icon, 18)}
                  <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                  {badgeCount > 0 && <span className="nav-dropdown-badge">{badgeCount > 99 ? "99+" : badgeCount}</span>}
                </button>
              );
            })}
          </div>
        );
      })}

      <div className="nav-dropdown-section-group" style={isStaff ? { marginTop: "8px", borderTop: "1px solid var(--bdr)", paddingBottom: "12px", paddingTop: "16px" } : {}}>
        {!isStaff && <div className="nav-dropdown-divider" style={{ margin: "16px 0 8px 0" }} />}
        <button
          className="nav-dropdown-item danger"
          onClick={() => { handleLogout(); setMenuOpen(false); }}
          type="button"
          role="menuitem"
          style={isStaff ? { margin: "0 8px", width: "calc(100% - 16px)", padding: "0 12px", minHeight: "44px", borderRadius: "6px" } : {}}
        >
          {renderIcon("LogOut", 18)}
          <span style={{ flex: 1, textAlign: "left" }}>Logout</span>
        </button>
      </div>
    </div>
  );
});

export default ProfileDropdown;
