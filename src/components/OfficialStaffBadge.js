import React from "react";

export default function OfficialStaffBadge({ role, size = "md" }) {
  if (role !== "admin" && role !== "support") return null;

  const isAdmin = role === "admin";
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
