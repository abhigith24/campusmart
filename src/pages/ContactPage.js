import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const ISSUE_TYPES = [
  { val: "bug",       label: "🐛 Bug Report",         desc: "Something isn't working correctly" },
  { val: "safety",    label: "🚨 Safety Concern",      desc: "Report inappropriate content or user" },
  { val: "account",   label: "👤 Account Issue",       desc: "Login, profile, or access problems" },
  { val: "listing",   label: "📦 Listing Issue",       desc: "Problem with a listing or transaction" },
  { val: "feedback",  label: "💡 Feature Suggestion",  desc: "Suggest an improvement or new feature" },
  { val: "other",     label: "✉️ Other",               desc: "General inquiry or question" },
];

export default function ContactPage({ setPage }) {
  const { currentUser, userProfile } = useAuth();
  const toast = useToast();
  const [type,        setType]        = useState("bug");
  const [subject,     setSubject]     = useState("");
  const [message,     setMessage]     = useState("");
  const [email,       setEmail]       = useState(currentUser?.email || "");
  const [loading,     setLoading]     = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!subject || !message) { toast("Please fill all fields", "error"); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "supportTickets"), {
        type,
        subject,
        message,
        email,
        userId:    currentUser?.uid || "guest",
        userName:  userProfile?.name || currentUser?.displayName || "Anonymous",
        status:    "open",
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
      toast("Message sent! We'll respond within 24 hours 🎉", "success");
    } catch (err) {
      toast("Failed to send. Please email us directly.", "error");
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="container legal-page">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Message Sent!</h2>
          <p style={{ color: "var(--muted)", fontSize: 15, marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>
            Thanks for reaching out. Our team will respond to <strong>{email}</strong> within 24 hours.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => setPage("home")}>Back to Home</button>
            <button className="btn btn-outline" onClick={() => { setSubmitted(false); setSubject(""); setMessage(""); }}>Send Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container legal-page">
      <div className="legal-header">
        <button className="btn btn-ghost" onClick={() => setPage("home")}>← Back</button>
        <div className="legal-badge">Support</div>
        <h1>Contact & Support</h1>
        <p>We usually respond within 24 hours on business days.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        {/* Form */}
        <div className="legal-card" style={{ padding: 0 }}>
          <form onSubmit={handleSubmit} style={{ padding: 28 }}>
            {/* Issue type */}
            <div className="form-group">
              <label className="form-label">What's this about?</label>
              <div className="contact-type-grid">
                {ISSUE_TYPES.map(t => (
                  <button
                    key={t.val}
                    type="button"
                    className={`contact-type-btn ${type === t.val ? "active" : ""}`}
                    onClick={() => setType(t.val)}
                  >
                    <span className="ct-label">{t.label}</span>
                    <span className="ct-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Your Email *</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@college.edu" required />
            </div>

            <div className="form-group">
              <label className="form-label">Subject *</label>
              <input className="form-input" placeholder="Brief description of your issue" value={subject} onChange={e => setSubject(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Message *</label>
              <textarea className="form-input" rows={5} placeholder="Describe your issue in detail. For bugs, include: what you did, what happened, and what you expected." value={message} onChange={e => setMessage(e.target.value)} required style={{ resize: "vertical" }} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 13 }} disabled={loading}>
              {loading ? "Sending..." : "Send Message →"}
            </button>
          </form>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { icon: "📧", title: "General Support", email: "support@campusmart.in", desc: "Account, listings, general queries" },
            { icon: "🔒", title: "Privacy & Data", email: "privacy@campusmart.in", desc: "Data requests, GDPR, deletion" },
            { icon: "⚖️", title: "Legal & Compliance", email: "legal@campusmart.in", desc: "Terms, copyright, legal notices" },
            { icon: "🐛", title: "Bug Reports", email: "bugs@campusmart.in", desc: "Technical issues, crashes" },
          ].map((item, i) => (
            <div key={i} className="legal-card" style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 6px" }}>{item.desc}</div>
              <a href={`mailto:${item.email}`} className="legal-link" style={{ fontSize: 13, fontWeight: 600 }}>
                {item.email}
              </a>
            </div>
          ))}

          <div className="legal-card" style={{ padding: "16px 18px", background: "var(--primary-light)", borderColor: "rgba(249,115,22,.2)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--p)", marginBottom: 6 }}>⏱️ Response Times</div>
            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
              <div>🐛 Bugs: <strong>within 4 hours</strong></div>
              <div>🚨 Safety: <strong>within 1 hour</strong></div>
              <div>📧 General: <strong>within 24 hours</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
