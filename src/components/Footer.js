import React from "react";
import { useAuth } from "../context/AuthContext";

const YEAR = new Date().getFullYear();

import { getDashboardRoute } from "../config/accessControl";

export default function Footer({ setPage }) {
  const { userProfile, hasFeature } = useAuth();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <button className="footer-logo" onClick={() => setPage(getDashboardRoute(userProfile?.role))} type="button">
              <img className="footer-logo-img" src="/logo-circular.png" alt="CampusMart" />
              <span>CampusMart</span>
            </button>
            <p className="footer-tagline">
              India's trusted campus marketplace - buy, sell and donate within your college community.
            </p>
            <div className="footer-badge">Student-only platform</div>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Platform</div>
            <button className="footer-link" onClick={() => setPage("home")}>Browse Listings</button>
            {hasFeature("showPostItemButton") && <button className="footer-link" onClick={() => setPage("post")}>Post an Item</button>}
            {hasFeature("showChat") && <button className="footer-link" onClick={() => setPage("chat")}>Messages</button>}
            {(hasFeature("showAdminDashboard") || hasFeature("showSupportDashboard")) && <button className="footer-link" onClick={() => setPage(getDashboardRoute(userProfile?.role))}>Dashboard</button>}
            <button className="footer-link" onClick={() => setPage("profile")}>My Profile</button>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Support</div>
            <button className="footer-link" onClick={() => setPage("contact")}>Contact Us</button>
            <button className="footer-link" onClick={() => setPage("report-bug")}>Report Bug</button>
            <button className="footer-link" onClick={() => setPage("feature-request")}>Feature Request</button>
            <button className="footer-link" onClick={() => setPage("faqs")}>FAQs</button>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Legal</div>
            <button className="footer-link" onClick={() => setPage("privacy")}>Privacy Policy</button>
            <button className="footer-link" onClick={() => setPage("terms")}>Terms & Conditions</button>
            <button className="footer-link" onClick={() => setPage("terms")}>Cookie Policy</button>
            <button className="footer-link" onClick={() => setPage("contact")}>Legal Inquiries</button>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <div className="footer-copyright">
            <p>© {YEAR} <strong>CampusMart</strong>. All rights reserved.</p>
            <p className="footer-legal-note">
              CampusMart is a peer-to-peer marketplace platform. All trademarks, product names, and logos appearing on listings are the property of their respective owners. CampusMart does not endorse, guarantee, or take responsibility for user-generated content, listings, transactions, or disputes between users.
            </p>
          </div>
          <div className="footer-badges">
            <span className="footer-trust-badge">Secure</span>
            <span className="footer-trust-badge">Students Only</span>
            <span className="footer-trust-badge">Made in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
