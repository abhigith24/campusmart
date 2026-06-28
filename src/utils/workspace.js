/**
 * Pure helper functions to determine the active workspace
 * and UI mode without duplicating state or embedding authorization logic.
 */

import { PERMISSION_LEVELS, hasMinimumLevel } from "../config/rbac";

export const WORKSPACES = {
  USER: "user",
  SUPPORT_REVIEW: "support-review",
  ADMIN_REVIEW: "admin-review"
};

/**
 * Derives the current workspace based on the user's role and the active page route.
 * 
 * @param {Object} userProfile - The current user's profile object
 * @param {string} currentPage - The current active page route
 * @returns {string} The derived workspace identifier
 */
export const getWorkspace = (userProfile, currentPage) => {
  // Any marketplace routes viewed by staff are considered "review" mode
  const isMarketplaceRoute = ["home", "listing", "profile"].includes(currentPage);
  
  if (isMarketplaceRoute) {
    if (hasMinimumLevel(userProfile?.permissionLevel, PERMISSION_LEVELS.SYSTEM_ADMIN)) {
      return WORKSPACES.ADMIN_REVIEW;
    }
    if (hasMinimumLevel(userProfile?.permissionLevel, PERMISSION_LEVELS.SUPPORT_MODERATOR)) {
      return WORKSPACES.SUPPORT_REVIEW;
    }
  }

  return WORKSPACES.USER;
};

/**
 * Checks if the current context is any type of review workspace.
 */
export const isReviewWorkspace = (userProfile, currentPage) => {
  const workspace = getWorkspace(userProfile, currentPage);
  return workspace === WORKSPACES.ADMIN_REVIEW || workspace === WORKSPACES.SUPPORT_REVIEW;
};

/**
 * Checks if the current context is specifically the Admin review workspace.
 */
export const isAdminReviewWorkspace = (userProfile, currentPage) => {
  return getWorkspace(userProfile, currentPage) === WORKSPACES.ADMIN_REVIEW;
};

/**
 * Checks if the current context is specifically the Support review workspace.
 */
export const isSupportReviewWorkspace = (userProfile, currentPage) => {
  return getWorkspace(userProfile, currentPage) === WORKSPACES.SUPPORT_REVIEW;
};
