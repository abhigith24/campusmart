import React, { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { uploadToCloudinary } from "../utils/cloudinary";

export default function CollegeVerificationPage({ setPage }) {
  const { currentUser, userProfile, fetchProfile } = useAuth();
  const toast = useToast();

  const [idFile, setIdFile] = useState(null);
  const [idPreview, setIdPreview] = useState("");
  const [uploadingId, setUploadingId] = useState(false);
  const [idCollege, setIdCollege] = useState("");

  useEffect(() => {
    if (userProfile?.college) {
      setIdCollege(userProfile.college);
    }
  }, [userProfile]);

  const handleIdFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast("Invalid file type. Please upload JPG, PNG, or WEBP only. ❌", "error");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast("File is too large. Max size is 5MB. ❌", "error");
      return;
    }

    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
  };

  const handleIdSubmit = async (e) => {
    e.preventDefault();
    if (!idFile) {
      toast("Please select an ID card image first. ❌", "error");
      return;
    }
    const finalCollegeName = idCollege.trim() || userProfile?.college || "";
    if (!finalCollegeName) {
      toast("Please enter your college name. ❌", "error");
      return;
    }

    setUploadingId(true);
    try {
      const imageUrl = await uploadToCloudinary(idFile, "campusmart/verifications");
      const userRef = doc(db, "users", currentUser.uid);
      const updates = {
        college: finalCollegeName,
        collegeVerified: false,
        verificationStatus: "pending",
        verificationMethod: "id_card",
        collegeIdCardUrl: imageUrl,
        verificationSubmittedAt: serverTimestamp()
      };
      await updateDoc(userRef, updates);
      await fetchProfile(currentUser.uid);
      toast("Verification request submitted! 🎓", "success");
      setIdFile(null);
      setIdPreview("");
    } catch (err) {
      console.error("ID upload error:", err);
      toast("Failed to submit verification request. ❌", "error");
    } finally {
      setUploadingId(false);
    }
  };

  const renderUploadForm = () => {
    return (
      <form onSubmit={handleIdSubmit} style={{ marginTop: "12px", borderTop: "1px dashed var(--bdr)", paddingTop: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>College Name</label>
            <input 
              className="form-input" 
              type="text" 
              placeholder="e.g. VGU Jaipur" 
              value={idCollege} 
              onChange={e => setIdCollege(e.target.value)} 
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>College ID Card Image</label>
            <div 
              style={{
                border: "2px dashed var(--bdr)",
                borderRadius: "var(--r-md)",
                padding: "20px",
                textAlign: "center",
                background: "var(--bg)",
                cursor: "pointer",
                position: "relative"
              }}
              onClick={() => document.getElementById("college-id-picker").click()}
            >
              <input 
                id="college-id-picker"
                type="file" 
                accept=".jpg,.jpeg,.png,.webp" 
                onChange={handleIdFileChange} 
                style={{ display: "none" }} 
              />
              {idPreview ? (
                <div style={{ position: "relative", width: "100%", height: "150px" }}>
                  <img src={idPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "var(--r-sm)" }} />
                  <button 
                    type="button" 
                    className="img-remove" 
                    onClick={(e) => { e.stopPropagation(); setIdFile(null); setIdPreview(""); }}
                    style={{ position: "absolute", top: "5px", right: "5px" }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div style={{ color: "var(--muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "28px" }}>📷</span>
                  <span style={{ fontSize: "13px", fontWeight: "700" }}>Click to select your College ID card</span>
                  <span style={{ fontSize: "11px" }}>JPG, PNG, WEBP up to 5MB</span>
                </div>
              )}
            </div>
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={uploadingId || !idFile || !idCollege.trim()}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {uploadingId ? "Uploading to Cloudinary..." : "Submit for Verification 🚀"}
          </button>
        </div>
      </form>
    );
  };

  const status = userProfile?.verificationStatus || "none";
  const isVerified = userProfile?.collegeVerified || false;

  return (
    <div className="container profile-page" style={{ padding: "30px 20px 80px", maxWidth: "600px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <button 
          className="btn btn-ghost" 
          onClick={() => setPage("home")} 
          style={{ padding: "6px 10px", fontSize: "18px" }}
          type="button"
          aria-label="Back to home"
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>College Verification</h1>
      </div>

      <div className="form-card college-verification-section">
        <h3 style={{ fontSize: "16px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", color: "var(--txt)" }}>
          🎓 College ID Verification
        </h3>
        <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>
          Verify your student status by uploading your college ID card. Verified students get a trust badge on their listings.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {(() => {
            if (isVerified || status === "approved") {
              return (
                <div style={{ background: "var(--grn-light)", border: "1.5px solid rgba(34,197,94,.2)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "24px" }}>🟢</span>
                  <div>
                    <div style={{ fontWeight: "800", color: "var(--grn)", fontSize: "14px" }}>Verified Student</div>
                    <div style={{ fontSize: "12px", color: "var(--txt-2)", marginTop: "2px" }}>
                      Your college ID has been approved. You belong to <strong>{userProfile?.college || "your campus"}</strong>.
                    </div>
                  </div>
                </div>
              );
            }

            if (status === "pending") {
              return (
                <div style={{ background: "var(--status-pending-bg)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "24px" }}>🟡</span>
                  <div>
                    <div style={{ fontWeight: "800", color: "var(--status-pending-txt)", fontSize: "14px" }}>Verification Pending</div>
                    <div style={{ fontSize: "12px", color: "var(--txt-2)", marginTop: "2px" }}>
                      Your request is currently being reviewed by our admin team. This usually takes less than 24 hours.
                    </div>
                  </div>
                </div>
              );
            }

            if (status === "rejected") {
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ background: "var(--status-rejected-bg)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "24px" }}>🔴</span>
                    <div>
                      <div style={{ fontWeight: "800", color: "var(--status-rejected-txt)", fontSize: "14px" }}>Verification Rejected</div>
                      <div style={{ fontSize: "12px", color: "var(--txt-2)", marginTop: "2px" }}>
                        Your ID card was not accepted. Please ensure the image is clear and displays your name and expiration date.
                      </div>
                    </div>
                  </div>
                  {renderUploadForm()}
                </div>
              );
            }

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ background: "var(--light)", border: "1.5px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "24px" }}>⚪</span>
                  <div>
                    <div style={{ fontWeight: "800", color: "var(--txt-2)", fontSize: "14px" }}>Not Verified</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                      Verify your campus association to trade safely with other students.
                    </div>
                  </div>
                </div>
                {renderUploadForm()}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
