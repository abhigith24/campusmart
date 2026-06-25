import React, { useState, useEffect } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Mail, Bug, Lightbulb, HelpCircle, ChevronDown, ChevronUp, Loader2, Send } from "lucide-react";

const SUPPORT_EMAIL = "campusmart.support@gmail.com";

const FAQ_SECTIONS = [
  {
    title: "Account",
    items: [
      {
        id: "acc-1",
        q: "How do I create a CampusMart account?",
        a: "Simply sign up using your email address. You will be asked to select your college network to browse listings and connect with peers within your own campus network."
      },
      {
        id: "acc-2",
        q: "Can I change my college network?",
        a: "Currently, your college network is set during registration. If you need to transfer networks or update your college, please reach out to our team using the Contact Support form."
      }
    ]
  },
  {
    title: "Buying",
    items: [
      {
        id: "buy-1",
        q: "How do I buy items on CampusMart?",
        a: "Browse the items in your college network, click on a listing that interests you, and use the 'Chat' button to communicate directly with the seller. You can arrange a safe meetup point on campus to inspect the product and finalize the transaction."
      },
      {
        id: "buy-2",
        q: "How do I contact a seller?",
        a: "You can click on the listing and initiate a secure in-app chat with the seller. This keeps your personal information private and ensures safe exchange tracking."
      }
    ]
  },
  {
    title: "Selling",
    items: [
      {
        id: "sell-1",
        q: "How do I post an item for sale, rent, or donation?",
        a: "Click on the 'Post Listing' button in the navigation header. Fill in the details (Title, Price, Condition, Category, Description) and upload clear product photos. Select if it is for sale, rent, or a free donation, and submit it."
      },
      {
        id: "sell-2",
        q: "Is it free to sell on CampusMart?",
        a: "Yes! CampusMart is 100% free for students. We do not charge listing fees, transaction fees, or commission. Our mission is to support cost-effective peer exchange."
      }
    ]
  },
  {
    title: "Listings",
    items: [
      {
        id: "list-1",
        q: "How long does my listing stay active?",
        a: "Listings remain active indefinitely or until you mark them as sold or deleted. We recommend updating your listing status as soon as an item is sold to maintain a clean marketplace."
      },
      {
        id: "list-2",
        q: "Can I edit or delete my listing?",
        a: "Yes! Navigate to the 'My Listings' page from your profile menu. You can edit any details or permanently delete your listing from there."
      }
    ]
  },
  {
    title: "Safety Tips",
    items: [
      {
        id: "safe-1",
        q: "How can I ensure a safe transaction?",
        a: "Always meet in public, well-lit spaces, preferably on your campus grounds during day hours. Take a friend with you if possible. Thoroughly inspect the item before making any payment."
      },
      {
        id: "safe-2",
        q: "What should I do if a deal feels suspicious?",
        a: "Cancel the meeting immediately and do not share any sensitive personal information. You can report the suspicious listing or user directly from their profile or contact our support team."
      }
    ]
  },
  {
    title: "Payments",
    items: [
      {
        id: "pay-1",
        q: "Does CampusMart handle payments directly?",
        a: "No. CampusMart is a discovery and matching platform. Payment happens directly between the buyer and seller. We recommend using UPI or cash during your campus meeting after verifying the item."
      },
      {
        id: "pay-2",
        q: "What payment methods should I use?",
        a: "Most students prefer UPI (GPay, PhonePe, Paytm) for quick digital payments on campus. Avoid advance payments or transferring money online before inspecting the item."
      }
    ]
  },
  {
    title: "Reporting Users",
    items: [
      {
        id: "rep-1",
        q: "How do I report a listing or user?",
        a: "You can send us details using the Contact Support form, specifying the listing ID, seller details, and reason for the report."
      },
      {
        id: "rep-2",
        q: "What happens after I file a report?",
        a: "Our moderation team reviews reports on a daily basis. Accounts found violating community guidelines, selling prohibited items, or engaging in suspicious behavior will be restricted or permanently banned."
      }
    ]
  }
];

export default function ContactPage({ setPage, mode = "contact" }) {
  const { currentUser } = useAuth();
  const toast = useToast();

  // Contact Support Form states
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);

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

  // FAQ Expanded states
  const [expandedFaqs, setExpandedFaqs] = useState({});

  // Auto-fill user email on auth state load
  useEffect(() => {
    if (currentUser?.email) {
      setContactEmail(currentUser.email);
    }
  }, [currentUser]);

  // Set browser/device defaults on bug form load
  useEffect(() => {
    if (mode === "bug") {
      setBugBrowser(navigator.userAgent || "Unknown Browser");
      setBugDevice(navigator.platform || "Unknown Device");
    }
  }, [mode]);

  // Validation Helpers
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handlers
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactSubject.trim() || !contactMessage.trim()) {
      toast("⚠️ Please fill in all fields", "error");
      return;
    }
    if (!isValidEmail(contactEmail)) {
      toast("⚠️ Please enter a valid email address", "error");
      return;
    }
    if (contactMessage.length > 2000) {
      toast("⚠️ Message character limit is 2000", "error");
      return;
    }

    setContactLoading(true);
    try {
      await addDoc(collection(db, "support_requests"), {
        name: contactName,
        email: contactEmail,
        subject: contactSubject,
        message: contactMessage,
        createdAt: serverTimestamp(),
        status: "open",
        userId: currentUser?.uid || "guest"
      });
      toast("🎉 Support request submitted successfully!", "success");
      setContactName("");
      setContactSubject("");
      setContactMessage("");
    } catch (err) {
      console.error(err);
      toast("❌ Failed to send message. Please try again or email us directly.", "error");
    } finally {
      setContactLoading(false);
    }
  };

  const handleBugSubmit = async (e) => {
    e.preventDefault();
    if (!bugTitle.trim() || !bugDesc.trim() || !bugSteps.trim()) {
      toast("⚠️ Please fill in Title, Description, and Steps to Reproduce", "error");
      return;
    }
    if (bugDesc.length > 2000) {
      toast("⚠️ Description character limit is 2000", "error");
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
      toast("🎉 Bug report submitted. Thank you for helping us improve!", "success");
      setBugTitle("");
      setBugDesc("");
      setBugScreenshot("");
      setBugSteps("");
    } catch (err) {
      console.error(err);
      toast("❌ Failed to submit bug report. Please try again.", "error");
    } finally {
      setBugLoading(false);
    }
  };

  const handleFeatureSubmit = async (e) => {
    e.preventDefault();
    if (!featureTitle.trim() || !featureDesc.trim() || !featureWhy.trim()) {
      toast("⚠️ Please fill in all fields", "error");
      return;
    }
    if (featureDesc.length > 2000) {
      toast("⚠️ Description character limit is 2000", "error");
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
      toast("🎉 Feature request submitted. We appreciate your ideas!", "success");
      setFeatureTitle("");
      setFeatureDesc("");
      setFeatureWhy("");
    } catch (err) {
      console.error(err);
      toast("❌ Failed to submit feature request. Please try again.", "error");
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

  // ==========================================
  // RENDER DEDICATED CONTACT SUPPORT PAGE
  // ==========================================
  if (mode === "contact") {
    return (
      <div className="support-container">
        <div className="support-header">
          <button 
            className="btn btn-ghost" 
            onClick={() => setPage("home")}
            aria-label="Back to home page"
            style={{ marginBottom: "16px", minHeight: "44px" }}
          >
            ← Back to Home
          </button>
          <div>
            <span className="support-badge">Help Center</span>
          </div>
          <h1>Contact Us</h1>
          <p>Have questions or need help? Send us a message or email us directly.</p>
        </div>

        <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px", alignItems: "start" }}>
          {/* Card */}
          <div className="support-card" style={{ padding: "40px 28px", height: "auto" }}>
            <div className="support-icon-wrapper" aria-hidden="true">
              <Mail size={36} style={{ color: "var(--p)" }} />
            </div>
            <h3>📩 Contact Support</h3>
            <p>Need help with your account, listings, or general questions? Our team is here to help.</p>
            
            <a 
              href={`mailto:${SUPPORT_EMAIL}`} 
              className="support-email-clickable"
              style={{ fontSize: "16px", marginBottom: "32px" }}
              aria-label={`Send email to ${SUPPORT_EMAIL}`}
            >
              📧 {SUPPORT_EMAIL}
            </a>

            <div className="support-button-group" style={{ flexDirection: "column", gap: "12px" }}>
              <a 
                href={`mailto:${SUPPORT_EMAIL}`}
                className="support-btn-primary"
                role="button"
                style={{ textDecoration: "none", width: "100%" }}
              >
                Email Us
              </a>
              <button 
                onClick={() => {
                  const formEl = document.getElementById("contact-form-container");
                  if (formEl) formEl.scrollIntoView({ behavior: "smooth" });
                }} 
                className="support-btn-secondary"
                style={{ width: "100%" }}
              >
                Send Message
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="legal-card" id="contact-form-container" style={{ padding: "32px", borderRadius: "20px" }}>
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "8px" }}>Send a Message</h3>
              <p style={{ fontSize: "14px", color: "var(--muted)" }}>Fill out this form and we'll reply to your email within 24 hours.</p>
            </div>
            <form onSubmit={handleContactSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-name">Full Name *</label>
                <input 
                  type="text" 
                  id="contact-name" 
                  className="form-input" 
                  placeholder="John Doe" 
                  value={contactName} 
                  onChange={(e) => setContactName(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
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
              <div className="form-group">
                <label className="form-label" htmlFor="contact-subject">Subject *</label>
                <input 
                  type="text" 
                  id="contact-subject" 
                  className="form-input" 
                  placeholder="Brief description of the issue" 
                  value={contactSubject} 
                  onChange={(e) => setContactSubject(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <label className="form-label" htmlFor="contact-message">Message *</label>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>{contactMessage.length}/2000</span>
                </div>
                <textarea 
                  id="contact-message" 
                  className="form-input" 
                  rows={5} 
                  placeholder="Describe your question or issue in detail..." 
                  value={contactMessage} 
                  onChange={(e) => setContactMessage(e.target.value)} 
                  maxLength={2000}
                  required 
                  style={{ resize: "vertical" }}
                />
              </div>
              <button 
                type="submit" 
                className="support-btn-primary" 
                style={{ width: "100%", marginTop: "16px" }}
                disabled={contactLoading}
              >
                {contactLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending Message...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER DEDICATED BUG REPORT PAGE
  // ==========================================
  if (mode === "bug") {
    return (
      <div className="support-container" style={{ maxWidth: "700px" }}>
        <div className="support-header" style={{ marginBottom: "32px" }}>
          <button 
            className="btn btn-ghost" 
            onClick={() => setPage("home")}
            aria-label="Back to home page"
            style={{ marginBottom: "16px", minHeight: "44px" }}
          >
            ← Back to Home
          </button>
          <div>
            <span className="support-badge" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}>
              Issue Reporting
            </span>
          </div>
          <h1>🐞 Report a Bug</h1>
          <p>Found a bug or technical issue? Help us improve CampusMart by reporting it below.</p>
        </div>

        <div className="legal-card" style={{ padding: "32px", borderRadius: "20px" }}>
          <form onSubmit={handleBugSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="bug-title">Bug Title *</label>
              <input 
                type="text" 
                id="bug-title" 
                className="form-input" 
                placeholder="e.g. Chat messages failing to deliver" 
                value={bugTitle} 
                onChange={(e) => setBugTitle(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label className="form-label" htmlFor="bug-desc">Description of Bug *</label>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>{bugDesc.length}/2000</span>
              </div>
              <textarea 
                id="bug-desc" 
                className="form-input" 
                rows={4} 
                placeholder="Describe the issue and what you expected to happen..." 
                value={bugDesc} 
                onChange={(e) => setBugDesc(e.target.value)} 
                maxLength={2000}
                required 
                style={{ resize: "vertical" }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bug-steps">Steps to Reproduce *</label>
              <textarea 
                id="bug-steps" 
                className="form-input" 
                rows={3} 
                placeholder="1. Go to Messages page&#13;2. Type a message and hit send&#13;3. Message delivery spinner spins indefinitely" 
                value={bugSteps} 
                onChange={(e) => setBugSteps(e.target.value)} 
                required 
                style={{ resize: "vertical" }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bug-screenshot">Screenshot (Optional, under 2MB)</label>
              <input 
                type="file" 
                id="bug-screenshot" 
                className="form-input" 
                accept="image/*" 
                onChange={handleScreenshotChange} 
              />
              {bugScreenshot && (
                <div style={{ marginTop: "10px", position: "relative", display: "inline-block" }}>
                  <img 
                    src={bugScreenshot} 
                    alt="Screenshot preview" 
                    style={{ maxHeight: "150px", borderRadius: "8px", border: "1px solid var(--bdr)" }} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setBugScreenshot("")}
                    style={{
                      position: "absolute", top: "-6px", right: "-6px", background: "#ef4444", color: "#fff",
                      border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px"
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label className="form-label" htmlFor="bug-device">Device info</label>
                <input 
                  type="text" 
                  id="bug-device" 
                  className="form-input" 
                  placeholder="e.g. iPhone 13, Windows 11" 
                  value={bugDevice} 
                  onChange={(e) => setBugDevice(e.target.value)} 
                />
              </div>
              <div>
                <label className="form-label" htmlFor="bug-browser">Browser info</label>
                <input 
                  type="text" 
                  id="bug-browser" 
                  className="form-input" 
                  placeholder="e.g. Chrome 120, Safari mobile" 
                  value={bugBrowser} 
                  onChange={(e) => setBugBrowser(e.target.value)} 
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="support-btn-primary" 
              style={{ width: "100%", background: "#ef4444", marginTop: "16px" }}
              disabled={bugLoading}
            >
              {bugLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting Report...
                </>
              ) : (
                "Submit Bug Report"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER DEDICATED FEATURE REQUEST PAGE
  // ==========================================
  if (mode === "feature") {
    return (
      <div className="support-container" style={{ maxWidth: "700px" }}>
        <div className="support-header" style={{ marginBottom: "32px" }}>
          <button 
            className="btn btn-ghost" 
            onClick={() => setPage("home")}
            aria-label="Back to home page"
            style={{ marginBottom: "16px", minHeight: "44px" }}
          >
            ← Back to Home
          </button>
          <div>
            <span className="support-badge" style={{ background: "rgba(234,179,8,0.1)", color: "#eab308", borderColor: "rgba(234,179,8,0.2)" }}>
              Feedback
            </span>
          </div>
          <h1>💡 Feature Request</h1>
          <p>Have an idea that could improve CampusMart? We'd love to hear your suggestions below.</p>
        </div>

        <div className="legal-card" style={{ padding: "32px", borderRadius: "20px" }}>
          <form onSubmit={handleFeatureSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="feature-title">Feature Title *</label>
              <input 
                type="text" 
                id="feature-title" 
                className="form-input" 
                placeholder="e.g. Dark mode option in Settings" 
                value={featureTitle} 
                onChange={(e) => setFeatureTitle(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label className="form-label" htmlFor="feature-desc">Feature Description *</label>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>{featureDesc.length}/2000</span>
              </div>
              <textarea 
                id="feature-desc" 
                className="form-input" 
                rows={4} 
                placeholder="Explain your feature suggestion in detail..." 
                value={featureDesc} 
                onChange={(e) => setFeatureDesc(e.target.value)} 
                maxLength={2000}
                required 
                style={{ resize: "vertical" }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="feature-why">Why is this feature useful? *</label>
              <textarea 
                id="feature-why" 
                className="form-input" 
                rows={3} 
                placeholder="Describe the value this feature adds to the community..." 
                value={featureWhy} 
                onChange={(e) => setFeatureWhy(e.target.value)} 
                required 
                style={{ resize: "vertical" }}
              />
            </div>
            <button 
              type="submit" 
              className="support-btn-primary" 
              style={{ width: "100%", background: "#eab308", marginTop: "16px" }}
              disabled={featureLoading}
            >
              {featureLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting Request...
                </>
              ) : (
                "Suggest Feature"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER DEDICATED FAQS ACCORDION PAGE
  // ==========================================
  if (mode === "faqs") {
    return (
      <div className="support-container" style={{ maxWidth: "800px" }}>
        <div className="support-header" style={{ marginBottom: "32px" }}>
          <button 
            className="btn btn-ghost" 
            onClick={() => setPage("home")}
            aria-label="Back to home page"
            style={{ marginBottom: "16px", minHeight: "44px" }}
          >
            ← Back to Home
          </button>
          <div>
            <span className="support-badge" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", borderColor: "rgba(59,130,246,0.2)" }}>
              FAQ Base
            </span>
          </div>
          <h1>❓ FAQs</h1>
          <p>Find quick answers to common questions about buying, selling, and using CampusMart.</p>
        </div>

        <div className="legal-card" style={{ padding: "32px", borderRadius: "20px" }}>
          <div className="faq-modal-body" style={{ padding: 0 }}>
            {FAQ_SECTIONS.map((sec, idx) => (
              <div key={idx} className="faq-accordion-section">
                <h4 style={{ margin: "20px 0 10px" }}>{sec.title}</h4>
                {sec.items.map((item) => {
                  const isOpen = !!expandedFaqs[item.id];
                  return (
                    <div key={item.id} className={`faq-accordion-item ${isOpen ? "open" : ""}`}>
                      <button 
                        className="faq-question-btn" 
                        onClick={() => toggleFaq(item.id)}
                        aria-expanded={isOpen}
                      >
                        <span>{item.q}</span>
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {isOpen && (
                        <div className="faq-answer-content">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
