import React from "react";
import { ShieldCheck, Copy, ExternalLink, Trash2, Flag, Users, FileText, Calendar, Info } from "lucide-react";

export default function ReadOnlyWorkspacePanel({
  listingId,
  sellerId,
  status,
  postedDate,
  updatedDate,
  actions = []
}) {
  return (
    <div className="detail-card-premium" style={{ background: "var(--surface)", border: "2px solid var(--border-color)", padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
        <ShieldCheck size={20} className="text-primary" />
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>Workspace Investigation Panel</h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}><FileText size={14}/> Listing ID</span>
          <code style={{ fontSize: "12px", background: "var(--bg-secondary)", padding: "4px 8px", borderRadius: "4px" }}>{listingId}</code>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}><Users size={14}/> Seller ID</span>
          <code style={{ fontSize: "12px", background: "var(--bg-secondary)", padding: "4px 8px", borderRadius: "4px" }}>{sellerId}</code>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}><Info size={14}/> Status</span>
          <span className={`status-badge ${status}`} style={{ textTransform: "capitalize" }}>{status}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}><Calendar size={14}/> Posted Date</span>
          <span style={{ fontSize: "13px", fontWeight: "600" }}>{postedDate}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: "800", color: "var(--muted)", marginBottom: "4px" }}>Actions</div>
        {actions.map((action, idx) => {
          let Icon = null;
          let btnClass = "btn-secondary-premium";
          
          if (action.id === "copy-listing-id" || action.id === "copy-seller-id") Icon = Copy;
          if (action.id === "open-seller") Icon = ExternalLink;
          if (action.id === "open-user-management" || action.id === "open-verification") Icon = Users;
          if (action.id === "flag-listing") Icon = Flag;
          if (action.id === "remove-listing") {
            Icon = Trash2;
            btnClass = "btn-danger";
          }
          if (action.id === "share-listing") Icon = ExternalLink;

          return (
            <button
              key={idx}
              className={btnClass}
              onClick={action.onClick}
              style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "8px", height: "42px", fontSize: "14px", fontWeight: "600" }}
            >
              {Icon && <Icon size={16} />}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
