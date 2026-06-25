import React, { useState } from "react";

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onClose, 
  onConfirm, 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  requireReason = false,
  danger = false
}) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 400, width: "90%" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: danger ? "var(--err)" : "var(--txt)" }}>
            {title}
          </h2>
          <button className="nav-icon-btn" onClick={onClose} aria-label="Close" type="button">✕</button>
        </div>

        <div style={{ fontSize: "14px", color: "var(--txt-2)", marginBottom: "20px", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {message}
        </div>

        {requireReason && (
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: "var(--txt)" }}>
              Reason (Optional)
            </label>
            <textarea
              className="form-input"
              style={{ width: "100%", height: "80px", resize: "none" }}
              placeholder="Provide a reason for this action..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`} 
            onClick={() => {
              onConfirm(requireReason ? reason : undefined);
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
