import React from "react";
import { MARTGENI_CONFIG } from "../../config/martgeniConfig";

/**
 * Reusable MartGeni Suggestion/Info Card
 * 
 * Displays future recommendations or metadata analysis.
 * Conditionally checks configuration flags and renders null if deactivated.
 */
export default function MartGeniCard({ flag, title, children, className, style, ...props }) {
  const isEnabled = flag ? MARTGENI_CONFIG.featureFlags[flag] : false;
  if (!isEnabled) return null;

  return (
    <div
      className={`martgeni-card ${className || ""}`}
      style={{
        border: "1.5px solid var(--p-mid)",
        background: "var(--p-glow)",
        padding: "16px",
        borderRadius: "var(--r-md)",
        position: "relative",
        boxSizing: "border-box",
        ...style
      }}
      {...props}
    >
      <h4
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          margin: "0 0 12px 0",
          color: "var(--p)",
          fontSize: "14px",
          fontWeight: 800
        }}
      >
        <span>✨</span> {title || "MartGeni Suggestion"}
      </h4>
      <div
        className="martgeni-card-body"
        style={{
          fontSize: "13px",
          lineHeight: "1.5",
          color: "var(--text-primary)"
        }}
      >
        {children}
      </div>
    </div>
  );
}
