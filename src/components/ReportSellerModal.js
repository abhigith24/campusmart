import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { transactionService } from "../services/transactionService";

const REPORT_REASONS = [
  "Scam / Fraud",
  "Fake Listing",
  "Misleading Information",
  "Inappropriate Content",
  "Harassment",
  "Spam",
  "Counterfeit Item",
  "Duplicate Listing",
  "Other"
];

export default function ReportSellerModal({ sellerId, sellerName, listingId, listingTitle, onClose }) {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast("Please select a reason.", "error");
      return;
    }
    
    setLoading(true);
    try {
      await transactionService.reportSeller(currentUser.uid, currentUser.displayName || "User", sellerId, sellerName, listingId, listingTitle || "Unknown Product", reason, description.trim());
      toast("Report submitted successfully.", "success");
      onClose();
    } catch (err) {
      console.error("Report error:", err);
      toast("Failed to submit report.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "400px" }} role="dialog" aria-modal="true" aria-label={`Report ${sellerName}`}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        
        <h3 style={{ marginBottom: "8px" }}>Report {sellerName}</h3>
        <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "20px" }}>
          Your report will be reviewed by administrators. This action is confidential.
        </p>

        <div className="form-group">
          <label className="form-label">Reason for reporting</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {REPORT_REASONS.map(r => (
              <label key={r} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
                <input 
                  type="radio" 
                  name="reportReason" 
                  value={r}
                  checked={reason === r}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ accentColor: "var(--p)" }}
                />
                {r}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginTop: "16px" }}>
          <label className="form-label">Additional Details <span style={{ color: "var(--muted-2)", fontWeight: 400, fontSize: 12 }}>— optional</span></label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Please provide more context..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ resize: "vertical" }}
            maxLength={500}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>
            Cancel
          </button>
          <button 
            className="btn btn-danger" 
            onClick={handleSubmit} 
            disabled={loading || !reason}
            style={{ flex: 1, justifyContent: "center" }}
          >
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
