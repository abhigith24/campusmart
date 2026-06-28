import React from "react";
import { MARTGENI_CONFIG } from "../../config/martgeniConfig";

/**
 * MartGeni AI Configuration and Diagnostic Dashboard
 * 
 * Admin controls to audit token usage, latency logs, model choices, and feature status.
 */
export default function MartGeniDashboard() {
  const flags = MARTGENI_CONFIG.featureFlags;

  return (
    <div className="container" style={{ padding: "40px 20px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
        <span style={{ fontSize: "28px" }}>✨</span>
        <div>
          <h2 style={{ margin: 0, fontWeight: 900 }}>MartGeni AI Dashboard</h2>
          <p style={{ margin: "2px 0 0 0", color: "var(--text-muted)", fontSize: "14px" }}>
            Campus co-pilot controls and telemetry reports
          </p>
        </div>
      </div>

      <div className="settings-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginTop: "24px" }}>
        
        {/* Model Status Cards */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: "var(--r-md)", padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 800 }}>🤖 Target Models</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>Text Generation</div>
              <strong style={{ fontFamily: "monospace" }}>{MARTGENI_CONFIG.models.defaultTextModel}</strong>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>Premium Query Model</div>
              <strong style={{ fontFamily: "monospace" }}>{MARTGENI_CONFIG.models.premiumTextModel}</strong>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>Image / Vision Scanner</div>
              <strong style={{ fontFamily: "monospace" }}>{MARTGENI_CONFIG.models.defaultVisionModel}</strong>
            </div>
          </div>
        </div>

        {/* Feature Flag Status */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: "var(--r-md)", padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 800 }}>⚡ Feature Flag Status</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            {Object.entries(flags).map(([key, enabled]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>{key}</span>
                <span 
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: enabled ? "var(--grn-light)" : "var(--red-light)",
                    color: enabled ? "var(--grn)" : "var(--red)"
                  }}
                >
                  {enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Simulated Telemetry Logs */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: "var(--r-md)", padding: "20px", gridColumn: "1 / -1" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 800 }}>📊 Future Telemetry Logs</h3>
          <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--r-xs)", padding: "16px", fontFamily: "monospace", fontSize: "12px", border: "1px solid var(--border-color)", color: "var(--text-muted)", textAlign: "center" }}>
            Telemetry logging is currently offline. Enable one or more feature flags to collect transaction telemetry.
          </div>
        </div>

      </div>
    </div>
  );
}
