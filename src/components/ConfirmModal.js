import React, { useState, useEffect } from "react";

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onClose, 
  onConfirm, 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  requireReason = false,
  danger = false,
  disabled = false
}) {
  const [reason, setReason] = useState("");

  // Accessibility: ESC key support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ zIndex: 9999 }}
    >
      <div 
        className="modal" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 400, width: "90%", position: "relative" }}
        role="dialog" 
        aria-modal="true" 
        aria-label={title}
      >
        {/* Header with close button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: danger ? "var(--red)" : "var(--txt)" }}>
            {title}
          </h2>
          <button 
            onClick={onClose} 
            aria-label="Close modal" 
            type="button"
            style={{
              border: "none", background: "none", fontSize: 20, 
              color: "var(--muted-2)", cursor: "pointer", fontWeight: "bold",
              lineHeight: 1, padding: "4px"
            }}
          >
            ✕
          </button>
        </div>

        {/* Message */}
        <div style={{ fontSize: "14px", color: "var(--txt-2)", marginBottom: "24px", whiteSpace: "pre-wrap", lineHeight: 1.5, textAlign: "left" }}>
          {message}
        </div>

        {/* Conditional Reason */}
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

        {/* Buttons Panel */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={onClose}
            style={{ flex: 1 }}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`} 
            disabled={disabled}
            onClick={() => {
              onConfirm(requireReason ? reason : undefined);
            }}
            style={{ flex: 1 }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
