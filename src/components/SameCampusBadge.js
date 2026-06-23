import React from "react";

export default function SameCampusBadge({ size = "sm" }) {
  const isLg = size === "lg";
  return (
    <span 
      className={`same-campus-badge-${size}`} 
      title="Same Campus"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        background: "var(--p-light)",
        color: "var(--p)",
        border: "1px solid var(--p-mid)",
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
      <span 
        style={{
          width: isLg ? "8px" : "6px",
          height: isLg ? "8px" : "6px",
          borderRadius: "50%",
          background: "var(--grn)",
          display: "inline-block",
          flexShrink: 0
        }}
      />
      <span>Same Campus</span>
    </span>
  );
}
