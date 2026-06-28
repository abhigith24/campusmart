import React from "react";
import { MARTGENI_CONFIG } from "../../config/martgeniConfig";

/**
 * Reusable MartGeni Action Button
 * 
 * Conditionally renders if the feature flag provided in the `flag` prop is enabled.
 * Otherwise, resolves to `null` to avoid any footprint in production.
 */
export default function MartGeniButton({ flag, onClick, children, className, style, ...props }) {
  // Check if the specific AI feature flag is active in config
  const isEnabled = flag ? MARTGENI_CONFIG.featureFlags[flag] : false;
  if (!isEnabled) return null;

  return (
    <button
      onClick={onClick}
      className={`btn btn-primary ${className || ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: "linear-gradient(135deg, var(--p) 0%, var(--ind) 100%)",
        color: "#ffffff",
        border: "none",
        fontWeight: "700",
        boxShadow: "0 2px 8px var(--p-glow)",
        ...style
      }}
      {...props}
    >
      <span style={{ fontSize: "14px" }}>✨</span>
      {children || "Ask MartGeni"}
    </button>
  );
}
