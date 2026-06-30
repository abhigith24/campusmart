import { PERMISSION_LEVELS, ROLES, getRequiredLevelForRoute, canAccess } from "./rbac";

// Legacy configuration mapping preserved for specific feature/permission checks during transition
export const ACCESS_CONFIG = {
  [PERMISSION_LEVELS.SYSTEM_ADMIN]: {
    landingPage: "admin",
    dashboardRoute: "admin",
    permissions: [
      "canManageUsers", "canManageVerifications", "canViewAnalytics",
      "canManageSupport", "canViewMarketplace", "canModerateMarketplace", "canInvestigateMarketplace"
    ],
    features: [
      "showAdminDashboard", "showSupportDashboard", "showMarketplace", "showSearch"
    ],
    navigation: [
      { id: "admin", label: "Dashboard", icon: "LayoutDashboard", section: "admin" },
      { id: "admin-verifications", label: "Verification Requests", icon: "UserCheck", section: "admin" },
      { id: "admin-users", label: "User Management", icon: "Users", section: "admin" },
      { id: "admin-analytics", label: "Analytics", icon: "BarChart", section: "admin" },
      { id: "support", label: "Support Dashboard", icon: "LayoutDashboard", section: "support" },
      { id: "support-requests", label: "Support Requests", icon: "Inbox", section: "support" },
      { id: "bug-reports", label: "Bug Reports", icon: "Bug", section: "support" },
      { id: "feature-requests", label: "Feature Requests", icon: "Lightbulb", section: "support" },
      { id: "seller-reports", label: "Seller Reports", icon: "Flag", section: "support" },
      { id: "marketplace-review", label: "Marketplace Review", icon: "Eye", section: "review", route: "home" },
      { id: "settings", label: "Settings", icon: "Settings", section: "account" }
    ]
  },

  [PERMISSION_LEVELS.SUPPORT_MODERATOR]: {
    landingPage: "support",
    dashboardRoute: "support",
    permissions: [
      "canManageSupport", "canViewMarketplace", "canInvestigateMarketplace"
    ],
    features: [
      "showSupportDashboard", "showMarketplace", "showSearch"
    ],
    navigation: [
      { id: "support", label: "Support Dashboard", icon: "LayoutDashboard", section: "support" },
      { id: "support-requests", label: "Support Requests", icon: "Inbox", section: "support" },
      { id: "bug-reports", label: "Bug Reports", icon: "Bug", section: "support" },
      { id: "feature-requests", label: "Feature Requests", icon: "Lightbulb", section: "support" },
      { id: "seller-reports", label: "Seller Reports", icon: "Flag", section: "support" },
      { id: "marketplace-review", label: "Marketplace Review", icon: "Eye", section: "review", route: "home" },
      { id: "profile", label: "Profile", icon: "User", section: "account" },
      { id: "settings", label: "Settings", icon: "Settings", section: "account" }
    ]
  },
  [PERMISSION_LEVELS.USER]: {
    landingPage: "home",
    dashboardRoute: "home",
    permissions: [
      "canBuy", "canSell", "canWishlist", "canCreateListings", "canPurchase", "canChat", "canVerifyCollege", "canViewMarketplace"
    ],
    features: [
      "showMarketplace", "showWishlist", "showPurchaseRequests", "showPostItemButton", "showSearch", "showChat"
    ],
    navigation: [
      { id: "profile", label: "Profile", icon: "User", section: "account" },
      { id: "college-verification", label: "College Verification", icon: "ShieldCheck", section: "account", route: "college-verification" },
      { id: "settings", label: "Settings", icon: "Settings", section: "account" },
      { id: "my-listings", label: "Seller Workspace", icon: "Package", section: "marketplace" },
      { id: "wishlist", label: "Wishlist", icon: "Heart", section: "marketplace" },
      { id: "purchase-requests", label: "My Purchases", icon: "ShoppingBag", section: "marketplace" },
      { id: "my-sales", label: "My Sales", icon: "DollarSign", section: "marketplace" },
      { id: "my-college-listings", label: "My College Listings", icon: "MapPin", section: "campus" },
      { id: "contact", label: "Help & Support", icon: "LifeBuoy", section: "support" }
    ]
  }
};

export const getRoleConfig = (arg) => {
  let level;
  if (typeof arg === "number") {
    level = arg;
  } else if (arg && typeof arg === "object") {
    level = arg.permissionLevel;
    if (level === undefined) {
      if (arg.role === "admin" || arg.role === "System Administrator") level = PERMISSION_LEVELS.SYSTEM_ADMIN;
      else if (arg.role === "support" || arg.role === "Support Moderator") level = PERMISSION_LEVELS.SUPPORT_MODERATOR;
      else level = PERMISSION_LEVELS.USER;
    }
  }
  return ACCESS_CONFIG[level] || ACCESS_CONFIG[PERMISSION_LEVELS.USER];
};

export const hasPermission = (userProfile, permission) => {
  const config = getRoleConfig(userProfile);
  if (!config) return false;
  return config.permissions.includes(permission);
};

export const hasFeature = (userProfile, feature) => {
  const config = getRoleConfig(userProfile);
  if (!config) return false;
  return config.features.includes(feature);
};

export const canAccessRoute = (userProfile, route) => {
  if (!route) return true;
  
  const requiredLevel = getRequiredLevelForRoute(route);
  
  if (requiredLevel === PERMISSION_LEVELS.USER) {
    const allowed = [
      "home", "post", "edit", "chat", "profile", "my-listings", "wishlist", "college-verification",
      "my-sales", "saved-items", "my-college-listings", "notifications", "purchase-requests", "settings",
      "listing", "item", "contact", "report-bug", "feature-request", "faqs", "terms", "privacy", "auth"
    ];
    return allowed.includes(route);
  }
  
  return canAccess(userProfile, requiredLevel);
};

export const getLandingPage = (userProfile) => {
  return getRoleConfig(userProfile).landingPage;
};

export const getDashboardRoute = (userProfile) => {
  return getRoleConfig(userProfile).dashboardRoute;
};
