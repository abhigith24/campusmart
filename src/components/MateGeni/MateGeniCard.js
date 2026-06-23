import React from "react";
import { MATEGENI_CONFIG } from "../../config/mategeniConfig";

/**
 * Reusable MateGeni Suggestion/Info Card
 * 
 * Displays future recommendations or metadata analysis.
 * Conditionally checks configuration flags and renders null if deactivated.
 */
export default function MateGeniCard({ flag, title, children, className, style, ...props }) {
  const isEnabled = flag ? MATEGENI_CONFIG.featureFlags[flag] : false;
  if (!isEnabled) return null;

  return (
    <div
      className={`mategeni-card ${className || ""}`}
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
        <span>✨</span> {title || "MateGeni Suggestion"}
      </h4>
      <div
        className="mategeni-card-body"
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
