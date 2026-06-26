export const ACCESS_CONFIG = {
  admin: {
    landingPage: "admin",
    dashboardRoute: "admin",
    allowedRoutes: [
      "admin", "admin-verifications", "admin-users", "admin-analytics",
      "support", "profile", "settings", "notifications", "home", "listing", "item", "contact", "report-bug", "feature-request", "faqs", "terms", "privacy", "auth"
    ],
    permissions: [
      "canManageUsers", "canManageVerifications", "canViewAnalytics",
      "canManageSupport", "canViewMarketplace", "canModerateMarketplace", "canInvestigateMarketplace"
    ],
    features: [
      "showAdminDashboard", "showSupportDashboard", "showMarketplace", "showSearch"
    ],
    navigation: [
      { id: "admin", label: "Dashboard", icon: "⚙️", section: "admin" },
      { id: "admin-verifications", label: "Verification Requests", icon: "🎓", section: "admin" },
      { id: "admin-users", label: "User Management", icon: "👥", section: "admin" },
      { id: "admin-analytics", label: "Analytics", icon: "📊", section: "admin" },
      { id: "support", label: "Support Dashboard", icon: "🎧", section: "support" },
      { id: "marketplace-review", label: "Marketplace Review", icon: "👁️", section: "review", route: "home" },
      { id: "notifications", label: "Notifications", icon: "🔔", section: "primary" },
      { id: "settings", label: "Settings", icon: "⚙️", section: "primary" }
    ]
  },
  support: {
    landingPage: "support",
    dashboardRoute: "support",
    allowedRoutes: [
      "support", "profile", "settings", "notifications", "home", "listing", "item", "contact", "report-bug", "feature-request", "faqs", "terms", "privacy", "auth"
    ],
    permissions: [
      "canManageSupport", "canViewMarketplace", "canInvestigateMarketplace"
    ],
    features: [
      "showSupportDashboard", "showMarketplace", "showSearch"
    ],
    navigation: [
      { id: "support", label: "Support Dashboard", icon: "🎧", section: "support" },
      { id: "marketplace-review", label: "Marketplace Review", icon: "👁️", section: "review", route: "home" },
      { id: "notifications", label: "Notifications", icon: "🔔", section: "primary" },
      { id: "profile", label: "Profile", icon: "👤", section: "primary" },
      { id: "settings", label: "Settings", icon: "⚙️", section: "primary" }
    ]
  },
  user: {
    landingPage: "home",
    dashboardRoute: "home",
    allowedRoutes: [
      "home", "post", "edit", "chat", "profile", "my-listings", "wishlist", "college-verification",
      "my-sales", "saved-items", "my-college-listings", "notifications", "purchase-requests", "settings",
      "listing", "item", "contact", "report-bug", "feature-request", "faqs", "terms", "privacy", "auth"
    ],
    permissions: [
      "canBuy", "canSell", "canWishlist", "canCreateListings", "canPurchase", "canChat", "canVerifyCollege", "canViewMarketplace"
    ],
    features: [
      "showMarketplace", "showWishlist", "showPurchaseRequests", "showPostItemButton", "showSearch", "showChat"
    ],
    navigation: [
      { id: "home", label: "Home", icon: "🏠", section: "primary" },
      { id: "my-listings", label: "My Listings", icon: "📦", section: "primary" },
      { id: "wishlist", label: "Wishlist", icon: "❤️", section: "primary" },
      { id: "notifications", label: "Notifications", icon: "🔔", section: "primary" },
      { id: "profile", label: "Profile", icon: "👤", section: "primary" },
      { id: "settings", label: "Settings", icon: "⚙️", section: "primary" },
      { id: "purchase-requests", label: "My Purchases", icon: "🛒", section: "marketplace" },
      { id: "my-sales", label: "My Sales", icon: "💰", section: "marketplace" },
      { id: "saved-items", label: "Saved Items", icon: "⭐", section: "marketplace" },
      { id: "my-college-listings", label: "My College Listings", icon: "📍", section: "marketplace" }
    ]
  }
};

export const getRoleConfig = (role) => {
  return ACCESS_CONFIG[role] || ACCESS_CONFIG.user;
};

export const hasPermission = (role, permission) => {
  const config = getRoleConfig(role);
  return config.permissions.includes(permission);
};

export const hasFeature = (role, feature) => {
  const config = getRoleConfig(role);
  return config.features.includes(feature);
};

export const canAccessRoute = (role, route) => {
  // Allow null/undefined routes to pass if needed, but normally check explicit list
  if (!route) return true;
  const config = getRoleConfig(role);
  return config.allowedRoutes.includes(route);
};

export const getLandingPage = (role) => {
  return getRoleConfig(role).landingPage;
};

export const getDashboardRoute = (role) => {
  return getRoleConfig(role).dashboardRoute;
};
