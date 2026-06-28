/**
 * CampusMart Role-Based Access Control (RBAC) Engine
 * Defines permission hierarchy, role definitions, and access validators.
 */

export const PERMISSION_LEVELS = {
  SYSTEM_ADMIN: 4,
  SUPPORT_MODERATOR: 2,
  USER: 0
};

export const ROLES = {
  SYSTEM_ADMIN: {
    level: PERMISSION_LEVELS.SYSTEM_ADMIN,
    title: "System Administrator",
    department: "Platform Administration",
    accountType: "Official Internal System Account",
    legacyRole: "admin"
  },
  SUPPORT_MODERATOR: {
    level: PERMISSION_LEVELS.SUPPORT_MODERATOR,
    title: "Support Moderator",
    department: "User Support",
    accountType: "Official Internal Support Account",
    legacyRole: "support"
  },
  USER: {
    level: PERMISSION_LEVELS.USER,
    title: "User",
    department: "General",
    accountType: "Student",
    legacyRole: "user"
  }
};

export const hasMinimumLevel = (userLevel = 0, requiredLevel) => {
  return Number(userLevel) >= requiredLevel;
};

/**
 * Validates access securely, falling back to legacy role checking if permissionLevel is absent.
 * @param {Object} userProfile - The user profile object containing permissionLevel or role
 * @param {number} requiredLevel - The minimum permission level required
 * @returns {boolean}
 */
export const canAccess = (userProfile, requiredLevel) => {
  if (!userProfile) return false;
  
  // Use new RBAC permission engine if level exists
  if (userProfile.permissionLevel !== undefined) {
    return userProfile.permissionLevel >= requiredLevel;
  }
  
  // Fallback to existing Admin/Support logic (Backward Compatibility)
  const legacyRole = userProfile.role;
  if (legacyRole === "admin") {
    return true; // Admin has highest authority (Level 4 fallback)
  }
  if (legacyRole === "support") {
    return requiredLevel <= PERMISSION_LEVELS.SUPPORT_MODERATOR; // Support falls back to Level 2
  }
  
  return requiredLevel === PERMISSION_LEVELS.USER; // Standard user fallback
};

/**
 * Checks if the actor has permission to manage a target role based on RBAC hierarchy.
 * E.g., System Admin (4) can manage Support Moderator (2), but Support Admin (3) cannot manage System Admin (4).
 * @param {number} actorLevel - The permission level of the actor performing the action
 * @param {number} targetLevel - The permission level of the target being managed
 * @returns {boolean}
 */
export const canManageRole = (actorLevel = 0, targetLevel) => {
  // Actors can only manage roles strictly beneath their own level, 
  // except System Admins (Level 4) who can manage other System Admins (or we can enforce strict <).
  // For standard RBAC, we'll allow Level 4 to manage Level 4 if needed, but normally actor > target.
  if (Number(actorLevel) === PERMISSION_LEVELS.SYSTEM_ADMIN && Number(targetLevel) === PERMISSION_LEVELS.SYSTEM_ADMIN) {
    return true; // SysAdmins can manage other SysAdmins
  }
  return Number(actorLevel) > Number(targetLevel);
};

/**
 * Helper to map legacy string roles to the new RBAC structure.
 * Useful for runtime migrations during authentication.
 * @param {string} legacyRole - The old role string (e.g. 'admin', 'support')
 * @returns {Object} The complete role configuration object
 */
export const mapLegacyRoleToRBAC = (legacyRole) => {
  if (legacyRole === "admin") return ROLES.SYSTEM_ADMIN;
  if (legacyRole === "support") return ROLES.SUPPORT_MODERATOR; // Existing support accounts map to Moderator initially
  return ROLES.USER;
};

/**
 * Base Route Protection Mapping
 * Defines the minimum required permission level for core protected routes.
 */
export const ROUTE_REQUIREMENTS = {
  // System Administration
  "admin": PERMISSION_LEVELS.SYSTEM_ADMIN,
  "admin-users": PERMISSION_LEVELS.SYSTEM_ADMIN,
  "admin-analytics": PERMISSION_LEVELS.SYSTEM_ADMIN,
  "admin-verifications": PERMISSION_LEVELS.SYSTEM_ADMIN, // or maybe SUPPORT_MODERATOR depending on how it's defined, but previously was admin only

  // Support Operations
  "support": PERMISSION_LEVELS.SUPPORT_MODERATOR,
  "support-requests": PERMISSION_LEVELS.SUPPORT_MODERATOR,
  "bug-reports": PERMISSION_LEVELS.SUPPORT_MODERATOR,
  "feature-requests": PERMISSION_LEVELS.SUPPORT_MODERATOR,
  "seller-reports": PERMISSION_LEVELS.SUPPORT_MODERATOR,
  "marketplace-review": PERMISSION_LEVELS.SUPPORT_MODERATOR,
  
  // Base Authenticated
  "profile": PERMISSION_LEVELS.USER,
  "settings": PERMISSION_LEVELS.USER
};

/**
 * Retrieves the required permission level for a given route.
 * @param {string} route - The route identifier
 * @returns {number} The minimum required permission level (defaults to 0 for public/user)
 */
export const getRequiredLevelForRoute = (route) => {
  return ROUTE_REQUIREMENTS[route] || PERMISSION_LEVELS.USER;
};
