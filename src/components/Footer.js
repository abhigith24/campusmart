import React from "react";

const YEAR = new Date().getFullYear();

export default function Footer({ setPage }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo" onClick={() => setPage("home")}>
              <span style={{ fontSize:22, WebkitTextFillColor:"initial" }}>📚</span>
              <span>CampusMart</span>
            </div>
            <p className="footer-tagline">
              India's trusted campus marketplace — buy, sell & donate within your college community.
            </p>
            <div className="footer-badge">🎓 Student-only platform</div>
          </div>

          {/* Links */}
          <div className="footer-col">
            <div className="footer-col-title">Platform</div>
            <button className="footer-link" onClick={() => setPage("home")}>Browse Listings</button>
            <button className="footer-link" onClick={() => setPage("post")}>Post an Item</button>
            <button className="footer-link" onClick={() => setPage("chat")}>Messages</button>
            <button className="footer-link" onClick={() => setPage("profile")}>My Profile</button>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Support</div>
            <button className="footer-link" onClick={() => setPage("contact")}>Contact Us</button>
            <button className="footer-link" onClick={() => setPage("contact")}>Report a Bug 🐛</button>
            <button className="footer-link" onClick={() => setPage("contact")}>Give Feedback 💡</button>
            <a href="mailto:support@campusmart.in" className="footer-link">support@campusmart.in</a>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Legal</div>
            <button className="footer-link" onClick={() => setPage("privacy")}>Privacy Policy</button>
            <button className="footer-link" onClick={() => setPage("terms")}>Terms & Conditions</button>
            <button className="footer-link" onClick={() => setPage("terms")}>Cookie Policy</button>
            <button className="footer-link" onClick={() => setPage("contact")}>Legal Inquiries</button>
          </div>
        </div>

        {/* Divider */}
        <div className="footer-divider" />

        {/* Copyright */}
        <div className="footer-bottom">
          <div className="footer-copyright">
            <p>© {YEAR} <strong>CampusMart</strong>. All rights reserved.</p>
            <p className="footer-legal-note">
              CampusMart is a peer-to-peer marketplace platform. All trademarks, product names, and logos appearing on listings are the property of their respective owners. CampusMart does not endorse, guarantee, or take responsibility for any user-generated content, listings, transactions, or disputes between users. Unauthorized copying, reproduction, or redistribution of any content on this platform is strictly prohibited under applicable copyright and intellectual property laws.
            </p>
          </div>
          <div className="footer-badges">
            <span className="footer-trust-badge">🔒 Secure</span>
            <span className="footer-trust-badge">🎓 Students Only</span>
            <span className="footer-trust-badge">🇮🇳 Made in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
