import React from "react";

export default function StaffWorkspaceBanner({ theme = "blue", title, description, onBack, backLabel, isCompact }) {
  const isSupport = theme === "green";
  
  // Theme Variables
  const primaryColor = isSupport ? "var(--grn)" : "var(--p)";
  const bgSolid = "var(--surface)"; 
  const borderColor = "var(--bdr)";
  const textColor = "var(--txt)";
  const mutedColor = "var(--muted)";
  const icon = isSupport ? "🎧" : "🛡️";

  return (
    <div style={{ position: "relative", width: "100%", marginBottom: "24px" }}>
      {/* ── EXPANDED BANNER (Always Mounted, Normal Flow) ── */}
      <div style={{
        background: bgSolid,
        borderBottom: `1px solid ${borderColor}`,
        borderTop: `4px solid ${primaryColor}`,
        padding: "24px 20px",
        width: "100%",
        boxShadow: "var(--s1)"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
          {/* Title & Badge */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: textColor, display: "flex", alignItems: "center", gap: "8px", lineHeight: "1.3" }}>
                <span style={{ fontSize: "20px" }}>{icon}</span> {title}
              </h2>
              <span style={{
                fontSize: "11px",
                background: "var(--light)",
                color: primaryColor,
                border: `1px solid ${primaryColor}`,
                padding: "4px 10px",
                borderRadius: "12px",
                textTransform: "uppercase",
                fontWeight: "800",
                letterSpacing: "0.5px"
              }}>
                Read-Only
              </span>
            </div>
            
            {/* Description */}
            <p style={{ margin: 0, fontSize: "14px", color: mutedColor, fontWeight: "500", lineHeight: 1.5, maxWidth: "700px" }}>
              {description}
            </p>
          </div>

          {/* Capabilities Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
            {["Review Listings", "Flag Content", !isSupport && "Remove Listings", "Review Profiles"]
              .filter(Boolean)
              .map((cap, i) => (
              <span key={i} style={{ 
                display: "flex", alignItems: "center", gap: "6px", 
                fontSize: "12px", fontWeight: "600", color: textColor, 
                background: "var(--light)", padding: "4px 12px", 
                borderRadius: "16px", border: `1px solid ${borderColor}` 
              }}>
                <span style={{ color: primaryColor }}>✓</span> {cap}
              </span>
            ))}
          </div>

          <div style={{ fontSize: "12px", color: mutedColor, marginTop: "-4px", fontWeight: "500", lineHeight: 1.4 }}>
            Buying, Selling, Chatting and Wishlisting are disabled in this workspace.
          </div>

          {/* Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              className="btn btn-outline workspace-back-btn"
              style={{
                alignSelf: "flex-start",
                padding: "8px 16px",
                fontSize: "13px",
                marginTop: "8px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "fit-content",
                maxWidth: "70%"
              }}
            >
              ← <span style={{ marginLeft: "6px" }}>{backLabel || "Back to Dashboard"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── COMPACT STICKY BANNER (Always Mounted, Fixed, Fades In) ── */}
      <div style={{
        position: "fixed",
        top: "var(--navbar-height)",
        left: 0,
        right: 0,
        height: "var(--workspace-header-height)",
        zIndex: "var(--z-workspace)",
        background: bgSolid,
        borderBottom: `1px solid ${borderColor}`,
        borderTop: `4px solid ${primaryColor}`,
        padding: "0 20px",
        boxShadow: "var(--s2)",
        display: "flex",
        alignItems: "center",
        opacity: isCompact ? 1 : 0,
        pointerEvents: isCompact ? "auto" : "none",
        transform: isCompact ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        willChange: isCompact ? "opacity, transform" : "auto"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: textColor, display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span>{icon}</span> {title}
            </h2>
            <span style={{
              fontSize: "10px",
              background: "var(--light)",
              color: primaryColor,
              border: `1px solid ${primaryColor}`,
              padding: "3px 8px",
              borderRadius: "12px",
              textTransform: "uppercase",
              fontWeight: "800",
              letterSpacing: "0.5px",
              flexShrink: 0
            }}>
              Read-Only
            </span>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="btn btn-outline"
              style={{
                padding: "0 12px",
                fontSize: "12px",
                height: "32px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center"
              }}
            >
              ← <span className="hide-on-mobile" style={{ marginLeft: "4px" }}>{backLabel || "Dashboard"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
