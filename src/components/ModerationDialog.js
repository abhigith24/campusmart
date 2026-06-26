import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const REMOVAL_REASONS = [
  "Scam",
  "Duplicate Listing",
  "Fake Listing",
  "Prohibited Item",
  "Spam",
  "Copyright Violation",
  "Other"
];

export default function ModerationDialog({ isOpen, onClose, onConfirm, listingTitle }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      background: "rgba(0,0,0,0.6)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "var(--surface)",
        width: "100%", maxWidth: "480px",
        borderRadius: "var(--r-lg)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border-color)",
          background: "rgba(239, 68, 68, 0.05)"
        }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", color: "var(--txt)" }}>
            <AlertTriangle size={18} color="var(--red)" /> Moderation Action
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)" }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "var(--txt)", lineHeight: "1.5" }}>
            You are about to remove the listing: <strong style={{color: "var(--txt)"}}>{listingTitle}</strong>. 
            This action cannot be undone. Please provide a reason for the audit log.
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "6px", color: "var(--txt)" }}>
              Removal Reason (Required)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%", padding: "10px", borderRadius: "var(--r-sm)",
                border: "1px solid var(--border-color)", background: "var(--bg)",
                color: "var(--txt)", fontSize: "14px"
              }}
            >
              <option value="" disabled>Select a reason...</option>
              {REMOVAL_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "6px", color: "var(--txt)" }}>
              Internal Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any additional context for other moderators..."
              rows={3}
              style={{
                width: "100%", padding: "10px", borderRadius: "var(--r-sm)",
                border: "1px solid var(--border-color)", background: "var(--bg)",
                color: "var(--txt)", fontSize: "14px", resize: "vertical"
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px",
          padding: "16px 20px", borderTop: "1px solid var(--border-color)", background: "var(--bg-secondary)"
        }}>
          <button onClick={onClose} className="btn btn-outline" style={{ height: "40px", padding: "0 16px", fontWeight: "600" }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason, note)}
            disabled={!reason}
            className="btn btn-danger"
            style={{ height: "40px", padding: "0 16px", fontWeight: "600", opacity: !reason ? 0.5 : 1 }}
          >
            Confirm Removal
          </button>
        </div>
      </div>
    </div>
  );
}
