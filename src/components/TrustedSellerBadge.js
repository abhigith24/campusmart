import React from "react";

export default function TrustedSellerBadge({ size = "sm" }) {
  const isLg = size === "lg";
  return (
    <span 
      className={`trusted-seller-badge-${size}`} 
      title="Trusted Seller"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: "rgba(245, 158, 11, 0.12)",
        color: "var(--yel)",
        border: "1px solid rgba(245, 158, 11, 0.35)",
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
      <span>⭐</span>
      <span>Trusted Seller</span>
    </span>
  );
}
