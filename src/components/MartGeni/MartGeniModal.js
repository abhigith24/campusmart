import React from "react";
import { MARTGENI_CONFIG } from "../../config/martgeniConfig";

/**
 * Reusable MartGeni Prompt/Interactive Modal overlay
 * 
 * Shows interactive dialogs or outputs. Renders conditionally based on config flags.
 */
export default function MartGeniModal({ flag, isOpen, onClose, title, children }) {
  const isEnabled = flag ? MARTGENI_CONFIG.featureFlags[flag] : false;
  if (!isEnabled || !isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        boxSizing: "border-box"
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
          borderTop: "4px solid var(--p)",
          borderRadius: "var(--r-md)",
          padding: "24px",
          width: "90%",
          maxWidth: "460px",
          boxShadow: "var(--s3)",
          boxSizing: "border-box"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            boxSizing: "border-box"
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 800,
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>✨</span> {title || "MartGeni Assistant"}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              lineHeight: 1,
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 0
            }}
            title="Close"
          >
            &times;
          </button>
        </div>
        <div
          className="modal-body"
          style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            lineHeight: "1.6",
            boxSizing: "border-box"
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
