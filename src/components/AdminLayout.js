import React from "react";

export default function AdminLayout({ children, activePage, setPage }) {
  const menuItems = [
    { id: "admin", label: "Dashboard", icon: "⚙️" },
    { id: "admin-verifications", label: "Verification Requests", icon: "🎓" },
    { id: "admin-users", label: "User Management", icon: "👥" },
    { id: "admin-analytics", label: "Analytics", icon: "📊" }
  ];

  return (
    <div className="admin-layout-container" style={{ display: "flex", minHeight: "calc(100vh - 70px)", background: "var(--bg-secondary)" }}>
      {/* Sidebar for Desktop */}
      <aside className="admin-sidebar" style={{
        width: "260px",
        background: "var(--card-bg)",
        borderRight: "1px solid var(--border-color)",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        position: "sticky",
        top: "70px",
        height: "calc(100vh - 70px)",
        boxSizing: "border-box",
        zIndex: 10
      }}>
        <div style={{ padding: "0 8px 16px 8px", borderBottom: "1px solid var(--border-color)", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>🛡️ Admin Panel</h3>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Control Panel Options</span>
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
          <span>Back to Marketplace</span>
        </button>
      </aside>

      {/* Main Admin Content */}
      <main className="admin-main-content" style={{ flex: 1, padding: "30px 24px", boxSizing: "border-box", overflowX: "hidden" }}>
        {/* Mobile Navigation bar */}
        <div className="admin-mobile-nav" style={{
          display: "none",
          background: "var(--card-bg)",
          borderBottom: "1px solid var(--border-color)",
          padding: "12px 16px",
          marginBottom: "20px",
          borderRadius: "var(--r-md)",
          alignItems: "center",
          gap: "8px",
          overflowX: "auto"
        }}>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`btn btn-sm ${activePage === item.id ? "btn-primary" : "btn-outline"}`}
              style={{ padding: "8px 12px", fontSize: "12px", whiteSpace: "nowrap" }}
              type="button"
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
        {children}
      </main>
    </div>
  );
}
