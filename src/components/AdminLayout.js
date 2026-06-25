import React from "react";
import { useAuth } from "../context/AuthContext";
import OfficialStaffBadge from "./OfficialStaffBadge";
import { getRoleConfig } from "../config/accessControl";

export default function AdminLayout({ children, activePage, setPage }) {
  const { userProfile, hasFeature } = useAuth();
  
  const roleConfig = getRoleConfig(userProfile?.role);
  const menuItems = roleConfig.navigation.filter(item => item.section === "admin" || item.section === "support");

  return (
    <div className="admin-layout-container" style={{ display: "flex", minHeight: "calc(100vh - 70px)", background: "var(--bg-secondary)" }}>
      {/* Sidebar for Desktop */}
      <aside className="admin-sidebar">
        <div style={{ padding: "0 8px 16px 8px", borderBottom: "1px solid var(--border-color)", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "6px" }}>
            {userProfile?.role === "admin" ? "🛡️ Admin Panel" : "🎧 Support Panel"}
          </h3>
          <OfficialStaffBadge role={userProfile?.role} size="sm" />
        </div>
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`admin-sidebar-item ${activePage === item.id ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "12px 16px",
              borderRadius: "var(--r-sm)",
              border: "none",
              background: activePage === item.id ? "var(--p-light)" : "transparent",
              color: activePage === item.id ? "var(--p)" : "var(--text-secondary)",
              fontWeight: activePage === item.id ? "700" : "500",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "14px",
              transition: "all 0.15s var(--ease)"
            }}
            type="button"
          >
            <span style={{ fontSize: "16px" }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
        
        {hasFeature("showMarketplace") && (
          <button
            onClick={() => setPage("home")}
            className="admin-sidebar-item"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "12px 16px",
              borderRadius: "var(--r-sm)",
              border: "none",
              background: "transparent",
              color: "var(--text-muted)",
              fontWeight: "500",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "14px",
              marginTop: "auto",
              transition: "all 0.15s var(--ease)"
            }}
            type="button"
          >
            <span>🏠</span>
            <span>View Marketplace</span>
          </button>
        )}
      </aside>

      {/* Main Admin Content */}
      <main className="admin-main-content">
        {children}
      </main>
    </div>
  );
}
