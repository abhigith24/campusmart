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
      { id: "admin", label: "Dashboard", icon: "LayoutDashboard", section: "admin" },
      { id: "admin-verifications", label: "Verification Requests", icon: "UserCheck", section: "admin" },
      { id: "admin-users", label: "User Management", icon: "Users", section: "admin" },
      { id: "admin-analytics", label: "Analytics", icon: "BarChart", section: "admin" },
      { id: "support", label: "Support Dashboard", icon: "Headset", section: "admin" },
      { id: "marketplace-review", label: "Marketplace Review", icon: "Eye", section: "review", route: "home" },
      { id: "contact", label: "Help & Support", icon: "LifeBuoy", section: "support" },
      { id: "settings", label: "Settings", icon: "Settings", section: "account" }
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
      { id: "support", label: "Support Dashboard", icon: "Headset", section: "admin" },
      { id: "marketplace-review", label: "Marketplace Review", icon: "Eye", section: "review", route: "home" },
      { id: "profile", label: "Profile", icon: "User", section: "account" },
      { id: "settings", label: "Settings", icon: "Settings", section: "account" },
      { id: "contact", label: "Help & Support", icon: "LifeBuoy", section: "support" }
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
      { id: "profile", label: "Profile", icon: "User", section: "account" },
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
