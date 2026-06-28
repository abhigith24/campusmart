import React from "react";
import { PERMISSION_LEVELS, hasMinimumLevel } from "../config/rbac";

export default function OfficialStaffBadge({ permissionLevel, role, size = "md" }) {
  let level = permissionLevel;
  if (level === undefined) {
    if (role === "admin" || role === "System Administrator") level = PERMISSION_LEVELS.SYSTEM_ADMIN;
    else if (role === "support" || role?.includes("Support")) level = PERMISSION_LEVELS.SUPPORT_MODERATOR;
    else level = 0;
  }

  if (level < 1) return null;

  const isAdmin = hasMinimumLevel(level, PERMISSION_LEVELS.SYSTEM_ADMIN);
  const label = isAdmin ? "🔵 Official Administrator" : "🟢 Official Support Team";
  
  const styles = isAdmin 
    ? { 
        background: "var(--primary-light, rgba(59, 130, 246, 0.1))", 
        color: "var(--primary, #3b82f6)", 
        border: "1px solid var(--primary, #3b82f6)" 
      }
    : { 
        background: "rgba(34, 197, 94, 0.1)", 
        color: "var(--grn, #22c55e)", 
        border: "1px solid rgba(34, 197, 94, 0.3)" 
      };

  const fontSize = size === "lg" ? "14px" : size === "sm" ? "11px" : "12px";
  const padding = size === "lg" ? "4px 10px" : size === "sm" ? "2px 6px" : "2px 8px";

  return (
    <span 
      className="official-staff-badge" 
      style={{ 
        ...styles, 
        fontSize, 
        padding, 
        borderRadius: "12px", 
        fontWeight: "bold", 
        display: "inline-flex", 
        alignItems: "center", 
        whiteSpace: "nowrap" 
      }}
      title={label}
    >
      {label}
    </span>
  );
}
