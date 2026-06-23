import React from "react";

export default function VerifiedStudentBadge({ size = "sm" }) {
  const isLg = size === "lg";
  return (
    <span 
      className={`verified-student-badge-${size}`} 
      title="Verified Student"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: "var(--grn-light)",
        color: "var(--grn)",
        border: "1px solid rgba(34, 197, 94, 0.3)",
        borderRadius: "20px",
        padding: isLg ? "6px 14px" : "3px 8px",
        fontSize: isLg ? "13px" : "10px",
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        lineHeight: "1",
        width: "fit-content"
      }}
    >
      <svg 
        width={isLg ? "12" : "10"} 
        height={isLg ? "12" : "10"} 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3.5" 
        viewBox="0 0 24 24"
        style={{ flexShrink: 0 }}
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>Verified Student</span>
    </span>
  );
}
