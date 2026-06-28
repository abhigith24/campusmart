import React from "react";
import { useAuth } from "../context/AuthContext";
import OfficialStaffBadge from "./OfficialStaffBadge";
import { getRoleConfig } from "../config/accessControl";
import * as Icons from "lucide-react";

export default function AdminLayout({ children, activePage, setPage }) {
  const { userProfile, hasFeature } = useAuth();
  
  const roleConfig = getRoleConfig(userProfile);
  const itemsBySection = {
    admin: roleConfig.navigation.filter(item => item.section === "admin"),
    support: roleConfig.navigation.filter(item => item.section === "support"),
    review: roleConfig.navigation.filter(item => item.section === "review")
  };

  const isSystemAdmin = userProfile?.role === "admin" || userProfile?.role === "System Administrator" || userProfile?.permissionLevel === 2;

  return (
    <div className="admin-layout-container" style={{ display: "flex", minHeight: "calc(100vh - 70px)", background: "var(--bg-secondary)" }}>
      {/* Sidebar for Desktop */}
      <aside className="admin-sidebar" style={{ width: "270px", minWidth: "270px", flexShrink: 0, borderRight: "1px solid var(--bdr)", position: "sticky", top: "70px", height: "calc(100vh - 70px)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 16px 20px 16px", borderBottom: "1px solid var(--bdr)", marginBottom: "16px", flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--txt)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            {isSystemAdmin ? <><Icons.Shield size={18} /> Admin Panel</> : <><Icons.Headphones size={18} /> Support Panel</>}
          </h3>
          <OfficialStaffBadge role={userProfile?.role} permissionLevel={userProfile?.permissionLevel} size="sm" />
        </div>
        
        <div style={{ padding: "0 12px 20px 12px", display: "flex", flexDirection: "column", gap: "20px", flex: 1, overflowY: "auto" }}>
          {["admin", "support", "review"].map(sectionKey => {
            const items = itemsBySection[sectionKey];
            if (!items || items.length === 0) return null;
            return (
              <div key={sectionKey} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 12px", marginBottom: "4px" }}>
                  {sectionKey}
                </div>
                {items.map(item => {
                  const IconComp = Icons[item.icon] || Icons.Circle;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPage(item.route || item.id)}
                      className={`admin-sidebar-item ${activePage === item.id ? "active" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        width: "100%",
                        height: "40px",
                        padding: "0 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: activePage === item.id ? "var(--p-light)" : "transparent",
                        color: activePage === item.id ? "var(--p)" : "var(--muted)",
                        fontWeight: activePage === item.id ? "600" : "500",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        transition: "all 0.15s var(--ease)"
                      }}
                      type="button"
                    >
                      <IconComp size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="admin-main-content" style={{ flex: 1, overflowX: "hidden" }}>
        {children}
      </main>
    </div>
  );
}
