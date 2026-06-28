import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const YEAR = new Date().getFullYear();

import { getDashboardRoute } from "../config/accessControl";

export default function Footer({ setPage }) {
  const { userProfile, hasFeature } = useAuth();
  
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  const toggleAccordion = (name) => {
    setActiveAccordion(prev => prev === name ? null : name);
  };

  const isSupport = userProfile?.role === "admin" || userProfile?.role === "System Administrator" || userProfile?.role === "support" || userProfile?.role === "Support Moderator" || userProfile?.permissionLevel >= 1;

  return (
    <footer className="site-footer">
      {/* Desktop Footer (Visible on desktop only) */}
      <div className="container footer-desktop-only">
        <div className="footer-grid">
          <div className="footer-brand">
            <button className="footer-logo" onClick={() => setPage(getDashboardRoute(userProfile))} type="button">
              <img className="footer-logo-img" src="/logo-circular.png" alt="CampusMart" />
              <span>CampusMart</span>
            </button>
            <p className="footer-tagline">
              {isSupport ? "Official Support and Moderation Console for CampusMart." : "India's trusted campus marketplace - buy, sell and donate within your college community."}
            </p>
            <div className="footer-badge">{isSupport ? "Internal Support Operations" : "Student-only platform"}</div>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">{isSupport ? "Support Console" : "Platform"}</div>
            {isSupport ? (
              <>
                <button className="footer-link" onClick={() => setPage(getDashboardRoute(userProfile))}>Support Dashboard</button>
                <button className="footer-link" onClick={() => setPage("support-requests")}>Support Requests</button>
                <button className="footer-link" onClick={() => setPage("seller-reports")}>Seller Reports</button>
                <button className="footer-link" onClick={() => setPage("bug-reports")}>Bug Reports</button>
                <button className="footer-link" onClick={() => setPage("feature-requests")}>Feature Requests</button>
              </>
            ) : (
              <>
                <button className="footer-link" onClick={() => setPage("home")}>About CampusMart</button>
                <button className="footer-link" onClick={() => setPage("home")}>Browse Listings</button>
                {hasFeature("showPostItemButton") && <button className="footer-link" onClick={() => setPage("post")}>Post an Item</button>}
                {hasFeature("showChat") && <button className="footer-link" onClick={() => setPage("chat")}>Messages</button>}
                {(hasFeature("showAdminDashboard") || hasFeature("showSupportDashboard")) && <button className="footer-link" onClick={() => setPage(getDashboardRoute(userProfile))}>Dashboard</button>}
                <button className="footer-link" onClick={() => setPage("profile")}>My Profile</button>
              </>
            )}
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Support</div>
            {isSupport ? (
              <>
                <button className="footer-link" style={{ opacity: 0.7, cursor: "not-allowed" }} disabled type="button">Internal Knowledge Base</button>
                <button className="footer-link" style={{ opacity: 0.7, cursor: "not-allowed" }} disabled type="button">Moderator Guidelines</button>
                <button className="footer-link" style={{ opacity: 0.7, cursor: "not-allowed" }} disabled type="button">Escalation Policy</button>
                <button className="footer-link" style={{ opacity: 0.7, cursor: "not-allowed" }} disabled type="button">System Status</button>
              </>
            ) : (
              <>
                <button className="footer-link" onClick={() => setPage("contact")}>Help Center</button>
                <button className="footer-link" onClick={() => setPage("contact")}>Contact Us</button>
                <button className="footer-link" onClick={() => setPage("contact")}>Report a Bug</button>
                <button className="footer-link" onClick={() => setPage("contact")}>Feature Requests</button>
              </>
            )}
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Legal</div>
            <button className="footer-link" onClick={() => setPage("privacy")}>Privacy Policy</button>
            <button className="footer-link" onClick={() => setPage("terms")}>Terms & Conditions</button>
            <button className="footer-link" onClick={() => setPage("terms")}>Cookie Policy</button>
            <button className="footer-link" onClick={() => setPage("contact")}>Legal Inquiries</button>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Follow Us</div>
            <button className="footer-link footer-social-link" style={{ opacity: 0.5, cursor: "not-allowed", display: "flex", alignItems: "center", gap: "8px" }} disabled type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              Instagram
            </button>
            <button className="footer-link footer-social-link" style={{ opacity: 0.5, cursor: "not-allowed", display: "flex", alignItems: "center", gap: "8px" }} disabled type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              LinkedIn
            </button>
            <button className="footer-link footer-social-link" style={{ opacity: 0.5, cursor: "not-allowed", display: "flex", alignItems: "center", gap: "8px" }} disabled type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733-16z"></path><path d="M4 20l6.768-6.768m2.46-2.46l6.772-6.772"></path></svg>
              X (Twitter)
            </button>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <div className="footer-copyright">
            {isSupport ? (
              <>
                <p style={{ color: "var(--txt-2)", fontSize: "12px", marginBottom: "8px", fontWeight: 600 }}>Support Console v2.0.0 • Production • Build 2026.06.28</p>
                <p>© {YEAR} <strong>CampusMart Support Console</strong>. All rights reserved.</p>
                <p className="footer-legal-note">
                  This internal console is intended exclusively for authorized CampusMart Support Team members.
                </p>
              </>
            ) : (
              <>
                <p>© {YEAR} <strong>CampusMart</strong>. All rights reserved.</p>
                <p className="footer-legal-note">
                  CampusMart is a peer-to-peer marketplace platform. All trademarks, product names, and logos appearing on listings are the property of their respective owners. CampusMart does not endorse, guarantee, or take responsibility for user-generated content, listings, transactions, or disputes between users.
                </p>
              </>
            )}
          </div>
          <div className="footer-badges">
            {isSupport ? (
              <>
                <span className="footer-trust-badge">Secure Access</span>
                <span className="footer-trust-badge">Official Support</span>
                <span className="footer-trust-badge">Production</span>
              </>
            ) : (
              <>
                <span className="footer-trust-badge">Secure</span>
                <span className="footer-trust-badge">Students Only</span>
                <span className="footer-trust-badge">Made in India</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Footer (Visible on mobile only) */}
      <div className="container footer-mobile-only">
        {/* Brand Section */}
        <div className="footer-mobile-brand">
          <button className="footer-logo" onClick={() => setPage(getDashboardRoute(userProfile))} type="button">
            <img className="footer-logo-img" src="/logo-circular.png" alt="CampusMart" />
            <span>CampusMart</span>
          </button>
          <p className="footer-tagline">
            {isSupport ? "Official Support and Moderation Console." : "India's trusted campus marketplace."}
          </p>
          <div className="footer-badge">{isSupport ? "Internal Support" : "Student-only"}</div>
        </div>

        {/* Accordions */}
        <div className="footer-mobile-accordions">
          {/* Accordion 1: Platform / Support Console */}
          <div className={`footer-accordion-item ${activeAccordion === "platform" ? "expanded" : ""}`}>
            <button 
              type="button" 
              className="footer-accordion-header" 
              onClick={() => toggleAccordion("platform")}
              aria-expanded={activeAccordion === "platform"}
            >
              <span>{isSupport ? "Support Console" : "Platform"}</span>
              <svg className="accordion-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div className="footer-accordion-content">
              {isSupport ? (
                <div className="footer-accordion-links">
                  <button className="footer-link" onClick={() => setPage(getDashboardRoute(userProfile))}>Support Dashboard</button>
                  <button className="footer-link" onClick={() => setPage("support-requests")}>Support Requests</button>
                  <button className="footer-link" onClick={() => setPage("seller-reports")}>Seller Reports</button>
                  <button className="footer-link" onClick={() => setPage("bug-reports")}>Bug Reports</button>
                  <button className="footer-link" onClick={() => setPage("feature-requests")}>Feature Requests</button>
                </div>
              ) : (
                <div className="footer-accordion-links">
                  <button className="footer-link" onClick={() => setPage("home")}>About CampusMart</button>
                  <button className="footer-link" onClick={() => setPage("home")}>Browse Listings</button>
                  {hasFeature("showPostItemButton") && <button className="footer-link" onClick={() => setPage("post")}>Post an Item</button>}
                  {hasFeature("showChat") && <button className="footer-link" onClick={() => setPage("chat")}>Messages</button>}
                  {(hasFeature("showAdminDashboard") || hasFeature("showSupportDashboard")) && <button className="footer-link" onClick={() => setPage(getDashboardRoute(userProfile))}>Dashboard</button>}
                  <button className="footer-link" onClick={() => setPage("profile")}>My Profile</button>
                </div>
              )}
            </div>
          </div>

          {/* Accordion 2: Support */}
          <div className={`footer-accordion-item ${activeAccordion === "support" ? "expanded" : ""}`}>
            <button 
              type="button" 
              className="footer-accordion-header" 
              onClick={() => toggleAccordion("support")}
              aria-expanded={activeAccordion === "support"}
            >
              <span>Support</span>
              <svg className="accordion-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div className="footer-accordion-content">
              {isSupport ? (
                <div className="footer-accordion-links">
                  <button className="footer-link" style={{ opacity: 0.7, cursor: "not-allowed" }} disabled type="button">Internal Knowledge Base</button>
                  <button className="footer-link" style={{ opacity: 0.7, cursor: "not-allowed" }} disabled type="button">Moderator Guidelines</button>
                  <button className="footer-link" style={{ opacity: 0.7, cursor: "not-allowed" }} disabled type="button">Escalation Policy</button>
                  <button className="footer-link" style={{ opacity: 0.7, cursor: "not-allowed" }} disabled type="button">System Status</button>
                </div>
              ) : (
                <div className="footer-accordion-links">
                  <button className="footer-link" onClick={() => setPage("contact")}>Help Center</button>
                  <button className="footer-link" onClick={() => setPage("contact")}>Contact Us</button>
                  <button className="footer-link" onClick={() => setPage("contact")}>Report a Bug</button>
                  <button className="footer-link" onClick={() => setPage("contact")}>Feature Requests</button>
                </div>
              )}
            </div>
          </div>

          {/* Accordion 3: Legal */}
          <div className={`footer-accordion-item ${activeAccordion === "legal" ? "expanded" : ""}`}>
            <button 
              type="button" 
              className="footer-accordion-header" 
              onClick={() => toggleAccordion("legal")}
              aria-expanded={activeAccordion === "legal"}
            >
              <span>Legal</span>
              <svg className="accordion-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div className="footer-accordion-content">
              <div className="footer-accordion-links">
                <button className="footer-link" onClick={() => setPage("privacy")}>Privacy Policy</button>
                <button className="footer-link" onClick={() => setPage("terms")}>Terms & Conditions</button>
                <button className="footer-link" onClick={() => setPage("terms")}>Cookie Policy</button>
                <button className="footer-link" onClick={() => setPage("contact")}>Legal Inquiries</button>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Section */}
        <div className="footer-mobile-social">
          <div className="footer-mobile-social-title">Follow Us</div>
          <div className="footer-social-row">
            <button className="footer-social-btn" style={{ opacity: 0.7, cursor: "not-allowed" }} disabled type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              <span>Instagram</span>
            </button>
            <button className="footer-social-btn" style={{ opacity: 0.7, cursor: "not-allowed" }} disabled type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              <span>LinkedIn</span>
            </button>
            <button className="footer-social-btn" style={{ opacity: 0.7, cursor: "not-allowed" }} disabled type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733-16z"></path><path d="M4 20l6.768-6.768m2.46-2.46l6.772-6.772"></path></svg>
              <span>X</span>
            </button>
          </div>
        </div>

        <div className="footer-divider" />

        {/* Copyright & Disclaimer Section */}
        <div className="footer-mobile-bottom">
          <div className="footer-mobile-copyright">
            {isSupport ? (
              <>
                <p className="footer-mobile-build-info">Support Console v2.0.0 • Production</p>
                <p>© {YEAR} <strong>CampusMart Support</strong>. All Rights Reserved.</p>
                
                <div className="footer-mobile-disclaimer-wrapper">
                  <button 
                    type="button" 
                    className="footer-disclaimer-toggle"
                    onClick={() => setDisclaimerOpen(!disclaimerOpen)}
                    aria-expanded={disclaimerOpen}
                  >
                    <svg className={`disclaimer-chevron ${disclaimerOpen ? "expanded" : ""}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    <span>Internal Disclaimer</span>
                  </button>
                  <div className={`footer-legal-note-mobile-container ${disclaimerOpen ? "expanded" : ""}`}>
                    <p className="footer-legal-note-mobile">
                      This internal console is intended exclusively for authorized CampusMart Support Team members.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p>© {YEAR} <strong>CampusMart</strong>. All Rights Reserved.</p>
                
                <div className="footer-mobile-disclaimer-wrapper">
                  <button 
                    type="button" 
                    className="footer-disclaimer-toggle"
                    onClick={() => setDisclaimerOpen(!disclaimerOpen)}
                    aria-expanded={disclaimerOpen}
                  >
                    <svg className={`disclaimer-chevron ${disclaimerOpen ? "expanded" : ""}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    <span>Marketplace Disclaimer</span>
                  </button>
                  <div className={`footer-legal-note-mobile-container ${disclaimerOpen ? "expanded" : ""}`}>
                    <p className="footer-legal-note-mobile">
                      CampusMart is a peer-to-peer marketplace platform. All trademarks, product names, and logos appearing on listings are the property of their respective owners. CampusMart does not endorse, guarantee, or take responsibility for user-generated content, listings, transactions, or disputes between users.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Trust Badges */}
          <div className="footer-mobile-badges">
            {isSupport ? (
              <>
                <span className="footer-trust-badge">Secure Access</span>
                <span className="footer-trust-badge">Official Support</span>
                <span className="footer-trust-badge">Production</span>
              </>
            ) : (
              <>
                <span className="footer-trust-badge">Secure</span>
                <span className="footer-trust-badge">Students Only</span>
                <span className="footer-trust-badge">Made in India</span>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
