import React, { useState, useEffect, useMemo } from "react";
import { addDoc, collection, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { 
  Mail, Bug, Lightbulb, HelpCircle, ChevronDown, ChevronUp, 
  Loader2, Send, Search, CheckCircle, Clock, FileText, Trash2, Calendar,
  ShieldCheck, AlertTriangle, Book, Zap, FileSpreadsheet, Lock, MessageSquare,
  Copy, UploadCloud
} from "lucide-react";

const SUPPORT_EMAIL = "campusmart.support@gmail.com";

const FAQ_SECTIONS = [
  {
    title: "Account",
    items: [
      { id: "acc-1", q: "How do I create a CampusMart account?", a: "Simply sign up using your email address. You will be asked to select your college network to browse listings and connect with peers within your own campus network." },
      { id: "acc-2", q: "Can I change my college network?", a: "Currently, your college network is set during registration. If you need to transfer networks or update your college, please reach out to our team using the Contact Support form." }
    ]
  },
  {
    title: "Buying",
    items: [
      { id: "buy-1", q: "How do I buy items on CampusMart?", a: "Browse the items in your college network, click on a listing that interests you, and use the 'Chat' button to communicate directly with the seller. You can arrange a safe meetup point on campus to inspect the product and finalize the transaction." },
      { id: "buy-2", q: "How do I contact a seller?", a: "You can click on the listing and initiate a secure in-app chat with the seller. This keeps your personal information private and ensures safe exchange tracking." }
    ]
  },
  {
    title: "Selling",
    items: [
      { id: "sell-1", q: "How do I post an item for sale, rent, or donation?", a: "Click on the 'Post Listing' button in the navigation header. Fill in the details (Title, Price, Condition, Category, Description) and upload clear product photos. Select if it is for sale, rent, or a free donation, and submit it." },
      { id: "sell-2", q: "Is it free to sell on CampusMart?", a: "Yes! CampusMart is 100% free for students. We do not charge listing fees, transaction fees, or commission. Our mission is to support cost-effective peer exchange." }
    ]
  },
  {
    title: "Verification",
    items: [
      { id: "ver-1", q: "What is student verification?", a: "By uploading your student ID, we verify that you are an active student at the selected college network. This badge helps keep the community secure and reliable." }
    ]
  },
  {
    title: "Privacy",
    items: [
      { id: "priv-1", q: "Who can see my contact details?", a: "Only buyers who submit a purchase request that you accept can contact you. Your personal details are kept private and never indexed publicly on the web." }
    ]
  }
];

export default function ContactPage({ setPage, mode = "contact" }) {
  const { currentUser, userProfile } = useAuth();
  const toast = useToast();

  // Contact Support Form states
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactCollege, setContactCollege] = useState("");
  const [contactSubject, setContactSubject] = useState("General Support");
  const [contactPriority, setContactPriority] = useState("Medium");
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);

  // File Upload states
  const [fileAttachment, setFileAttachment] = useState(null);
  const [fileProgress, setFileProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Success Card States
  const [submittedTicket, setSubmittedTicket] = useState(null); // { id, responseTime }

  // Support Requests History logs
  const [supportHistory, setSupportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Bug Report Form states
  const [bugTitle, setBugTitle] = useState("");
  const [bugDesc, setBugDesc] = useState("");
  const [bugScreenshot, setBugScreenshot] = useState("");
  const [bugDevice, setBugDevice] = useState("");
  const [bugBrowser, setBugBrowser] = useState("");
  const [bugSteps, setBugSteps] = useState("");
  const [bugLoading, setBugLoading] = useState(false);

  // Feature Request Form states
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDesc, setFeatureDesc] = useState("");
  const [featureWhy, setFeatureWhy] = useState("");
  const [featureLoading, setFeatureLoading] = useState(false);

  // FAQ states
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCategory, setFaqCategory] = useState("All");
  const [expandedFaqs, setExpandedFaqs] = useState({});

  // Auto-fill logged-in user profile details
  useEffect(() => {
    if (userProfile) {
      setContactName(userProfile.name || "");
      setContactCollege(userProfile.college || "");
    }
    if (currentUser?.email) {
      setContactEmail(currentUser.email);
    }
  }, [currentUser, userProfile]);

  // Set browser/device defaults on bug form load
  useEffect(() => {
    if (mode === "bug") {
      setBugBrowser(navigator.userAgent || "Unknown Browser");
      setBugDevice(navigator.platform || "Unknown Device");
    }
  }, [mode]);

  // Fetch support ticket history in real-time
  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoadingHistory(true);
    const q = query(
      collection(db, "support_requests"),
      where("userId", "==", currentUser.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSupportHistory(docs);
      setLoadingHistory(false);
    }, err => {
      console.error(err);
      setLoadingHistory(false);
    });
    return unsub;
  }, [currentUser]);

  // Handle file uploads with progress simulation
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast("Invalid format! Please upload PNG, JPG, or PDF only. ❌", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast("File exceeds 10MB limit! ❌", "error");
      return;
    }

    setFileAttachment(file);
    setUploadingFile(true);
    setFileProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setFileProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadingFile(false);
          toast("Attachment ready! 📎", "success");
          return 100;
        }
        return prev + 25;
      });
    }, 100);
  };

  const handleRemoveFile = () => {
    setFileAttachment(null);
    setFileProgress(0);
    setUploadingFile(false);
  };

  // Handlers
  const handleClearForm = () => {
    setContactSubject("General Support");
    setContactPriority("Medium");
    setContactMessage("");
    handleRemoveFile();
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast("⚠️ Please fill in all required fields", "error");
      return;
    }
    if (contactMessage.length < 10) {
      toast("⚠️ Message is too short (min 10 characters)", "error");
      return;
    }

    setContactLoading(true);
    const generatedId = "CM-" + Math.random().toString(36).substring(2, 9).toUpperCase();

    try {
      const finalMessage = `[Priority: ${contactPriority}]\n\n${contactMessage}`;
      await addDoc(collection(db, "support_requests"), {
        ticketId: generatedId,
        name: contactName,
        email: contactEmail,
        college: contactCollege,
        subject: contactSubject,
        message: finalMessage,
        attachmentName: fileAttachment ? fileAttachment.name : null,
        createdAt: serverTimestamp(),
        status: "open",
        userId: currentUser?.uid || "guest"
      });

      setSubmittedTicket({
        id: generatedId,
        responseTime: "24 hours"
      });
      toast("🎉 Support request submitted successfully!", "success");
      handleClearForm();
    } catch (err) {
      console.error(err);
      toast("❌ Failed to send message. Please try again.", "error");
    } finally {
      setContactLoading(false);
    }
  };

  const handleBugSubmit = async (e) => {
    e.preventDefault();
    if (!bugTitle.trim() || !bugDesc.trim() || !bugSteps.trim()) {
      toast("⚠️ Please fill in all required fields", "error");
      return;
    }
    setBugLoading(true);
    try {
      await addDoc(collection(db, "bug_reports"), {
        title: bugTitle,
        description: bugDesc,
        screenshot: bugScreenshot || null,
        device: bugDevice,
        browser: bugBrowser,
        steps: bugSteps,
        createdAt: serverTimestamp(),
        status: "open",
        userId: currentUser?.uid || "guest"
      });
      toast("🎉 Bug report submitted successfully! 🐞", "success");
      setBugTitle("");
      setBugDesc("");
      setBugScreenshot("");
      setBugSteps("");
    } catch (err) {
      console.error(err);
      toast("❌ Failed to submit bug report.", "error");
    } finally {
      setBugLoading(false);
    }
  };

  const handleFeatureSubmit = async (e) => {
    e.preventDefault();
    if (!featureTitle.trim() || !featureDesc.trim() || !featureWhy.trim()) {
      toast("⚠️ Please fill in all required fields", "error");
      return;
    }
    setFeatureLoading(true);
    try {
      await addDoc(collection(db, "feature_requests"), {
        title: featureTitle,
        description: featureDesc,
        whyUseful: featureWhy,
        createdAt: serverTimestamp(),
        status: "open",
        userId: currentUser?.uid || "guest"
      });
      toast("🎉 Feature request submitted. Thank you! 💡", "success");
      setFeatureTitle("");
      setFeatureDesc("");
      setFeatureWhy("");
    } catch (err) {
      console.error(err);
      toast("❌ Failed to submit suggestion.", "error");
    } finally {
      setFeatureLoading(false);
    }
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast("⚠️ Image size should be less than 2MB", "error");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBugScreenshot(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFaq = (faqId) => {
    setExpandedFaqs((prev) => ({
      ...prev,
      [faqId]: !prev[faqId]
    }));
  };

  // Local Search & Category Filter FAQ calculations
  const filteredFaqs = useMemo(() => {
    const list = [];
    FAQ_SECTIONS.forEach(sec => {
      // Category Chip Filter
      if (faqCategory !== "All" && sec.title !== faqCategory) return;
      
      const matchedItems = sec.items.filter(item => {
        if (!faqSearch.trim()) return true;
        const q = faqSearch.toLowerCase().trim();
        return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
      });

      if (matchedItems.length > 0) {
        list.push({ title: sec.title, items: matchedItems });
      }
    });
    return list;
  }, [faqSearch, faqCategory]);

  const scrollToHistory = () => {
    const el = document.getElementById("support-history-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  if (mode === "contact") {
    return (
      <div className="support-container" style={{ paddingBottom: "96px" }}>
        
        {/* Header */}
        <div className="support-header" style={{ padding: "40px 20px 20px" }}>
          <button 
            className="btn btn-ghost" 
            onClick={() => setPage("home")}
            aria-label="Back to home page"
            style={{ marginBottom: "8px", minHeight: "40px", padding: "0 12px" }}
          >
            ← Back to Home
          </button>
          <div>
            <span className="support-badge" style={{ marginBottom: "8px" }}>Help Center</span>
          </div>
          <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Help Center & Support</h1>
          <p style={{ margin: 0, fontSize: "15px" }}>Get immediate responses, report bugs, or submit support tickets directly from campus.</p>
        </div>

        {/* Dashboard two column grid */}
        <div className="contact-dashboard-grid">
          
          {/* Left Column (Support Information) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Direct Channels */}
            <div className="support-card" style={{ padding: "24px", alignItems: "flex-start", textAlign: "left" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ background: "rgba(34, 197, 94, 0.1)", padding: "10px", borderRadius: "12px", color: "#22c55e" }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "800" }}>Campus Support Team</h3>
                  <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>Official Moderation</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg)", padding: "12px", borderRadius: "12px", border: "1px solid var(--bdr)", width: "100%" }}>
                <a 
                  href={`mailto:${SUPPORT_EMAIL}`} 
                  style={{ fontSize: "14px", color: "var(--p)", fontWeight: "700", wordBreak: "break-all", display: "flex", alignItems: "center", gap: "8px", flex: 1 }}
                  aria-label={`Send email to ${SUPPORT_EMAIL}`}
                >
                  <Mail size={16} /> {SUPPORT_EMAIL}
                </a>
                <button 
                  className="btn btn-ghost" 
                  style={{ padding: "8px", height: "auto", minHeight: "0", color: "var(--muted)" }}
                  onClick={() => {
                    navigator.clipboard.writeText(SUPPORT_EMAIL);
                    toast("Copied email to clipboard! 📋", "success");
                  }}
                  title="Copy email address"
                  aria-label="Copy support email"
                >
                  <Copy size={16} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px", width: "100%" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "var(--light)", border: "1px solid var(--bdr)", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "650", color: "var(--txt-2)", width: "fit-content" }}>
                  <Clock size={14} color="var(--muted)"/> Support Hours: 9:00 AM – 6:00 PM
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "var(--light)", border: "1px solid var(--bdr)", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "650", color: "var(--txt-2)", width: "fit-content" }}>
                  <Zap size={14} color="var(--muted)"/> Avg Response Time: &lt; 24 hours
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "var(--light)", border: "1px solid var(--bdr)", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "650", color: "var(--txt-2)", width: "fit-content" }}>
                  <CheckCircle size={14} color="var(--muted)"/> Resolution Time: 1–2 business days
                </div>
              </div>
            </div>

            {/* F.A.Q Shortcut */}
            <div className="support-card" style={{ padding: "24px", alignItems: "flex-start", textAlign: "left" }}>
              <HelpCircle size={24} style={{ color: "#3b82f6", marginBottom: "12px" }} />
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "750" }}>F.A.Q Shortcut</h3>
              <p style={{ fontSize: "13px", color: "var(--txt-2)", margin: "0 0 16px 0" }}>Search the FAQ base first to get instant answers regarding campus exchanges.</p>
              <button 
                onClick={() => {
                  const faqEl = document.getElementById("faq-section-block");
                  if (faqEl) faqEl.scrollIntoView({ behavior: "smooth" });
                }} 
                className="btn btn-outline btn-sm"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Search FAQs →
              </button>
            </div>

            {/* Community Guidelines */}
            <div className="support-card" style={{ padding: "24px", alignItems: "flex-start", textAlign: "left" }}>
              <Book size={24} style={{ color: "#a855f7", marginBottom: "12px" }} />
              <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "750" }}>Community Guidelines</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                <button className="action-row-btn">Marketplace Rules</button>
                <button className="action-row-btn">Buying & Selling Guidelines</button>
                <button className="action-row-btn">Safety Tips</button>
              </div>
            </div>

            {/* Popular Questions */}
            <div className="support-card" style={{ padding: "24px", alignItems: "flex-start", textAlign: "left" }}>
              <MessageSquare size={24} style={{ color: "#ef4444", marginBottom: "12px" }} />
              <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "750" }}>Popular Questions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                <button className="action-row-btn">How to verify my account?</button>
                <button className="action-row-btn">How to report a seller?</button>
                <button className="action-row-btn">How to edit a listing?</button>
              </div>
            </div>

            {currentUser && supportHistory.length > 0 && (
              <button 
                onClick={scrollToHistory}
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "14px" }}
              >
                View Support History ({supportHistory.length})
              </button>
            )}
          </div>

          {/* Right Column (Form Panel / Success Card) */}
          <div>
            {submittedTicket ? (
              <div className="legal-card" style={{ padding: "40px 32px", textAlign: "center", borderRadius: "20px", border: "2px solid var(--grn)" }}>
                <CheckCircle size={56} style={{ color: "var(--grn)", margin: "0 auto 16px" }} />
                <h3 style={{ fontSize: "22px", fontWeight: "850", marginBottom: "10px" }}>Ticket Submitted Successfully!</h3>
                <p style={{ fontSize: "14px", color: "var(--txt-2)", marginBottom: "20px" }}>
                  Your support request has been compiled. Estimated response time is under <strong>{submittedTicket.responseTime}</strong>.
                </p>
                <div style={{ background: "var(--light)", padding: "12px", borderRadius: "8px", border: "1px solid var(--bdr)", display: "inline-block", fontSize: "15px", fontWeight: "700", marginBottom: "24px" }}>
                  Ticket ID: <span style={{ color: "var(--p)" }}>{submittedTicket.id}</span>
                </div>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button className="btn btn-primary" onClick={() => setSubmittedTicket(null)}>Submit Another Ticket</button>
                  {currentUser && (
                    <button className="btn btn-outline" onClick={() => { setSubmittedTicket(null); setTimeout(scrollToHistory, 100); }}>
                      View Support Requests
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="legal-card" style={{ padding: "32px", borderRadius: "20px" }}>
                <h3 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "8px" }}>Submit Support Ticket</h3>
                <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "24px" }}>Fill in the details below, and our campus moderation team will resolve it.</p>
                
                <form onSubmit={handleContactSubmit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-name">Full Name *</label>
                    <input 
                      type="text" 
                      id="contact-name" 
                      className="form-input" 
                      placeholder="e.g. John Doe" 
                      value={contactName} 
                      onChange={(e) => setContactName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label className="form-label" htmlFor="contact-email">Email Address *</label>
                      <input 
                        type="email" 
                        id="contact-email" 
                        className="form-input" 
                        placeholder="your@college.edu" 
                        value={contactEmail} 
                        onChange={(e) => setContactEmail(e.target.value)} 
                        required 
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="contact-college">Linked College</label>
                      <input 
                        type="text" 
                        id="contact-college" 
                        className="form-input" 
                        placeholder="College Name" 
                        value={contactCollege} 
                        onChange={(e) => setContactCollege(e.target.value)} 
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-subject">Support Category *</label>
                    <select 
                      id="contact-subject" 
                      className="form-input" 
                      value={contactSubject} 
                      onChange={(e) => setContactSubject(e.target.value)}
                      required
                    >
                      <option value="General Support">General Support</option>
                      <option value="Account Issue">Account Issue</option>
                      <option value="Verification Issue">Verification Issue</option>
                      <option value="Marketplace Issue">Marketplace Issue</option>
                      <option value="Report Seller">Report Seller</option>
                      <option value="Bug Report">Bug Report</option>
                      <option value="Feature Request">Feature Request</option>
                      <option value="Payment Issue">Payment Issue</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", background: "var(--light)", padding: "4px", borderRadius: "10px", border: "1px solid var(--bdr)" }}>
                      {["Low", "Medium", "High"].map(p => (
                        <button 
                          key={p} 
                          type="button" 
                          onClick={() => setContactPriority(p)}
                          style={{ 
                            flex: 1, 
                            padding: "8px 12px", 
                            borderRadius: "8px", 
                            fontSize: "14px", 
                            fontWeight: "600",
                            border: "none",
                            background: contactPriority === p ? "var(--bg)" : "transparent",
                            color: contactPriority === p ? "var(--p)" : "var(--txt-2)",
                            boxShadow: contactPriority === p ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <label className="form-label" htmlFor="contact-message">Message Details *</label>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>{contactMessage.length}/2000</span>
                    </div>
                    <textarea 
                      id="contact-message" 
                      className="form-input" 
                      rows={7} 
                      placeholder="Describe your issue in detail." 
                      value={contactMessage} 
                      onChange={(e) => setContactMessage(e.target.value)} 
                      maxLength={2000}
                      required 
                      style={{ resize: "vertical" }}
                    />
                  </div>

                  {/* Attachment Section */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: "700" }}>Attach Screenshot/PDF (Max 10MB)</label>
                    <div 
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      style={{ 
                        border: dragActive ? "2px dashed var(--p)" : "2px dashed var(--bdr)", 
                        padding: "24px", 
                        borderRadius: "12px", 
                        background: dragActive ? "var(--p-light)" : "var(--light)",
                        textAlign: "center",
                        transition: "all 0.2s ease",
                        position: "relative",
                        cursor: "pointer"
                      }}
                    >
                      <input 
                        type="file" 
                        accept=".png,.jpg,.jpeg,.pdf"
                        onChange={handleFileChange}
                        disabled={uploadingFile}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                      />
                      <UploadCloud size={32} style={{ color: dragActive ? "var(--p)" : "var(--muted)", margin: "0 auto 12px" }} />
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--txt)", marginBottom: "4px" }}>
                        {dragActive ? "Drop file here" : "Drag & drop a file here, or click to browse"}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>PNG, JPG, or PDF up to 10MB</div>
                    </div>
                    
                    {uploadingFile && (
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                          <span>Uploading attachment...</span>
                          <span>{fileProgress}%</span>
                        </div>
                        <div style={{ height: "4px", width: "100%", background: "var(--bdr)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${fileProgress}%`, background: "var(--p)", transition: "width 0.1s" }} />
                        </div>
                      </div>
                    )}

                    {fileAttachment && !uploadingFile && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--card-bg)", padding: "8px 12px", border: "1px solid var(--bdr)", borderRadius: "6px", marginTop: "12px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--txt)" }} className="text-truncate">
                          📎 {fileAttachment.name} ({Math.round(fileAttachment.size / (1024 * 1024) * 10) / 10} MB)
                        </span>
                        <button type="button" onClick={handleRemoveFile} style={{ background: "transparent", border: "none", color: "var(--red)", cursor: "pointer" }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="contact-form-actions">
                    <button 
                      type="submit" 
                      className="support-btn-primary submit-ticket-btn" 
                      disabled={contactLoading || uploadingFile}
                    >
                      {contactLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Submit Support Ticket
                        </>
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline reset-ticket-btn" 
                      onClick={handleClearForm}
                      disabled={contactLoading}
                    >
                      Reset Form
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

        </div>

        {/* ================= MY SUPPORT REQUESTS TICKET HISTORY ================= */}
        {currentUser && (
          <div id="support-history-section" style={{ marginTop: "60px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "22px", fontWeight: "800", margin: 0, color: "var(--txt)" }}>My Recent Support Tickets</h2>
              <span style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "700" }}>{supportHistory.length} Tickets</span>
            </div>
            
            {loadingHistory ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}><div className="spinner" /></div>
            ) : supportHistory.length === 0 ? (
              <div style={{ padding: "48px 24px", background: "var(--light)", borderRadius: "16px", border: "1px dashed var(--bdr)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "16px", borderRadius: "50%" }}>
                  <MessageSquare size={32} />
                </div>
                <div>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "800", color: "var(--txt)" }}>No active support tickets</h3>
                  <p style={{ margin: 0, fontSize: "14px", color: "var(--txt-2)" }}>You haven't submitted any help requests yet.</p>
                </div>
                <button 
                  className="btn btn-outline" 
                  style={{ marginTop: "12px" }}
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  Create Ticket
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                {supportHistory.map(ticket => {
                  let statusBg = "var(--light)";
                  let statusTxt = "var(--muted)";
                  let statusLabel = ticket.status || "open";
                  if (statusLabel === "open") {
                    statusBg = "var(--bg)"; statusTxt = "var(--txt-2)"; statusLabel = "Submitted";
                  } else if (statusLabel === "in-progress" || statusLabel === "under review" || statusLabel === "Under Review") {
                    statusBg = "rgba(245, 158, 11, 0.1)"; statusTxt = "#f59e0b"; statusLabel = "In Review";
                  } else if (statusLabel === "resolved" || statusLabel === "Resolved") {
                    statusBg = "rgba(34, 197, 94, 0.1)"; statusTxt = "#22c55e"; statusLabel = "Resolved";
                  } else if (statusLabel === "closed" || statusLabel === "Closed") {
                    statusBg = "rgba(239, 68, 68, 0.1)"; statusTxt = "#ef4444"; statusLabel = "Closed";
                  }

                  return (
                    <div key={ticket.id} className="card" style={{ padding: "20px", borderRadius: "16px", border: "1px solid var(--bdr)", display: "flex", flexDirection: "column", gap: "12px", cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.06)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "800", color: "var(--p)", fontSize: "13px" }}>{ticket.ticketId || "CM-UNKNOWN"}</span>
                        <span style={{ background: statusBg, color: statusTxt, padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>{statusLabel}</span>
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "750", color: "var(--txt)" }}>{ticket.subject}</div>
                      {ticket.message && (
                        <p style={{ fontSize: "13px", color: "var(--txt-2)", margin: 0, lineClamp: 2, WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.5" }}>
                          {ticket.message}
                        </p>
                      )}
                      <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--light)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>
                        <span>Submitted on {new Date(ticket.createdAt?.toDate ? ticket.createdAt.toDate() : Date.now()).toLocaleDateString()}</span>
                        {ticket.attachmentName && <FileText size={14} color="var(--p)" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= FAQ SECTION BLOCK ================= */}
        <div id="faq-section-block" style={{ marginTop: "40px", paddingTop: "32px", borderTop: "1.5px solid var(--bdr)" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "850", marginBottom: "6px" }}>❓ FAQ Search Base</h2>
          <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>Instant answers to guide your campus marketplace trades.</p>
          
          <div className="seller-search-filter-bar" style={{ position: "sticky", top: "70px", zIndex: 10, background: "var(--surface)", padding: "16px 0", borderBottom: "1px solid var(--bdr)", margin: "0 -20px", paddingLeft: "20px", paddingRight: "20px" }}>
            <div className="seller-search-row">
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                <input 
                  className="form-input" 
                  type="text" 
                  placeholder="Search FAQ answers..." 
                  value={faqSearch}
                  onChange={e => setFaqSearch(e.target.value)}
                  style={{ paddingLeft: "38px" }}
                />
              </div>
            </div>
            <div className="seller-filter-chips">
              {["All", "Account", "Buying", "Selling", "Verification", "Privacy"].map(chip => (
                <button
                  key={chip}
                  className={`seller-chip ${faqCategory === chip ? "active" : ""}`}
                  onClick={() => setFaqCategory(chip)}
                  type="button"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="legal-card" style={{ padding: "28px", borderRadius: "20px", marginTop: "16px" }}>
            {filteredFaqs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>No matching FAQ answers found.</div>
            ) : (
              filteredFaqs.map((sec, idx) => (
                <div key={idx} className="faq-accordion-section" style={{ borderBottom: idx < filteredFaqs.length - 1 ? "1px solid var(--bdr)" : "none", paddingBottom: "16px", marginBottom: "16px" }}>
                  <h4 style={{ margin: "10px 0 12px", fontSize: "14px", textTransform: "uppercase", color: "var(--p)", letterSpacing: "0.5px" }}>{sec.title}</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {sec.items.map((item) => {
                      const isOpen = !!expandedFaqs[item.id];
                      return (
                        <div key={item.id} className={`faq-accordion-item ${isOpen ? "open" : ""}`}>
                          <button 
                            className="faq-question-btn" 
                            onClick={() => toggleFaq(item.id)}
                            aria-expanded={isOpen}
                            style={{ padding: "12px 16px" }}
                          >
                            <span>{item.q}</span>
                            {isOpen ? <ChevronUp size={15} style={{ color: "var(--p)" }} /> : <ChevronDown size={15} />}
                          </button>
                          {isOpen && (
                            <div className="faq-answer-content" style={{ padding: "0 16px 16px 16px" }}>
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    );
  }

  // Bug Report form & Feature Suggestion forms (unchanged)
  if (mode === "bug") {
    return (
      <div className="support-container" style={{ maxWidth: "700px" }}>
        <div className="support-header" style={{ marginBottom: "32px" }}>
          <button className="btn btn-ghost" onClick={() => setPage("home")} aria-label="Back to home page" style={{ marginBottom: "16px", minHeight: "44px" }}>← Back to Home</button>
          <div><span className="support-badge" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}>Issue Reporting</span></div>
          <h1>Report a Bug</h1>
        </div>
        <div className="legal-card" style={{ padding: "32px", borderRadius: "20px" }}>
          <form onSubmit={handleBugSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="bug-title">Bug Title *</label>
              <input type="text" id="bug-title" className="form-input" placeholder="e.g. Chat messages failing to deliver" value={bugTitle} onChange={(e) => setBugTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bug-desc">Description of Bug *</label>
              <textarea id="bug-desc" className="form-input" rows={4} placeholder="Describe the issue..." value={bugDesc} onChange={(e) => setBugDesc(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bug-steps">Steps to Reproduce *</label>
              <textarea id="bug-steps" className="form-input" rows={3} placeholder="1. Go to Messages..." value={bugSteps} onChange={(e) => setBugSteps(e.target.value)} required />
            </div>
            <button type="submit" className="support-btn-primary" style={{ width: "100%", background: "#ef4444", marginTop: "16px" }} disabled={bugLoading}>
              {bugLoading ? "Submitting..." : "Submit Bug Report"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === "feature") {
    return (
      <div className="support-container" style={{ maxWidth: "700px" }}>
        <div className="support-header" style={{ marginBottom: "32px" }}>
          <button className="btn btn-ghost" onClick={() => setPage("home")} aria-label="Back to home page" style={{ marginBottom: "16px", minHeight: "44px" }}>← Back to Home</button>
          <div><span className="support-badge" style={{ background: "rgba(234,179,8,0.1)", color: "#eab308", borderColor: "rgba(234,179,8,0.2)" }}>Feedback</span></div>
          <h1>Feature Suggestion</h1>
        </div>
        <div className="legal-card" style={{ padding: "32px", borderRadius: "20px" }}>
          <form onSubmit={handleFeatureSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="feature-title">Feature Title *</label>
              <input type="text" id="feature-title" className="form-input" placeholder="e.g. Dark mode option" value={featureTitle} onChange={(e) => setFeatureTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="feature-desc">Feature Description *</label>
              <textarea id="feature-desc" className="form-input" rows={4} placeholder="Explain suggest details..." value={featureDesc} onChange={(e) => setFeatureDesc(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="feature-why">Why is this feature useful? *</label>
              <textarea id="feature-why" className="form-input" rows={3} placeholder="Describe value..." value={featureWhy} onChange={(e) => setFeatureWhy(e.target.value)} required />
            </div>
            <button type="submit" className="support-btn-primary" style={{ width: "100%", background: "#eab308", marginTop: "16px" }} disabled={featureLoading}>
              {featureLoading ? "Submitting..." : "Suggest Feature"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
