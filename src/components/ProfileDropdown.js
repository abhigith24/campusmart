import React, { useEffect, useRef } from "react";
import VerifiedStudentBadge from "./VerifiedStudentBadge";
import OfficialStaffBadge from "./OfficialStaffBadge";
import * as LucideIcons from "lucide-react";
const ProfileDropdown = React.memo(({ 
  userProfile, 
  currentUser, 
  isStaff, 
  initials, 
  roleConfig, 
  page, 
  setPage, 
  setMenuOpen, 
  handleLogout, 
  role,
  wishlistCount,
  unreadCount
}) => {
  const dropdownRef = useRef(null);

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

  const renderIcon = (iconName, size = 16) => {
    const IconCmp = LucideIcons[iconName] || LucideIcons.Circle;
    return <IconCmp size={size} className="nav-icon" style={{ minWidth: `${size}px`, marginRight: "8px" }} />;
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
    <div className="nav-dropdown" ref={dropdownRef} role="menu" aria-label="Account Menu">
      <div className="nav-dropdown-user-header">
        <div className="nav-dropdown-user-main">
          <div className="nav-dropdown-avatar-wrapper">
            {(userProfile?.photoURL || currentUser?.photoURL)
              ? <img src={userProfile?.photoURL || currentUser?.photoURL} alt="" />
              : <span>{initials}</span>}
            <div className="online-indicator"></div>
          </div>
          <div className="nav-dropdown-user-info">
            <div className="nav-dropdown-user-name">
              {userProfile?.name || currentUser?.displayName || (isStaff ? "Staff" : "Student")}
              {(userProfile?.collegeVerified || userProfile?.isVerified) && <VerifiedStudentBadge size="sm" />}
              <OfficialStaffBadge role={userProfile?.role} size="sm" />
            </div>
            {!isStaff && <div className="nav-dropdown-user-meta">{(userProfile?.department || userProfile?.course || userProfile?.college || "Student")}</div>}
          </div>
        </div>
      </div>

      {isStaff && (
        <>
          <div className="nav-dropdown-section-title">Staff</div>
          <button 
            className="nav-dropdown-item" 
            onClick={() => { setPage(role === "admin" ? "admin" : "support"); setMenuOpen(false); }} 
            type="button"
            role="menuitem"
          >
            {renderIcon("ShieldAlert", 16)}
            <span>Admin Console</span>
          </button>
          <div className="nav-dropdown-divider" />
        </>
      )}

      {getDropdownSections().map((sec, idx) => {
        const items = roleConfig.navigation.filter(item => item.section === sec && item.section !== "admin");
        return (
          <React.Fragment key={sec}>
            {idx > 0 && <div className="nav-dropdown-divider" />}
            <div className="nav-dropdown-section-title">{sec}</div>
            {items.map(item => {
              const isActive = page === (item.route || item.id);
              const badgeCount = getBadgeCount(item.id);
              return (
                <button 
                  key={item.id} 
                  className={`nav-dropdown-item ${isActive ? "active" : ""}`} 
                  onClick={() => { setPage(item.route || item.id); setMenuOpen(false); }} 
                  type="button"
                  role="menuitem"
                >
                  {renderIcon(item.icon, 16)}
                  <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                  {badgeCount > 0 && <span className="nav-dropdown-badge">{badgeCount > 99 ? "99+" : badgeCount}</span>}
                </button>
              );
            })}
          </React.Fragment>
        );
      })}

      <div className="nav-dropdown-divider" />
      <button 
        className="nav-dropdown-item danger" 
        onClick={() => { handleLogout(); setMenuOpen(false); }} 
        type="button"
        role="menuitem"
      >
        {renderIcon("LogOut", 16)}
        <span>Logout</span>
      </button>
    </div>
  );
});

export default ProfileDropdown;
