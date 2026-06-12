import React from "react";

export default function PrivacyPolicyPage({ setPage }) {
  return (
    <div className="container legal-page">
      <div className="legal-header">
        <button className="btn btn-ghost" onClick={() => {
          if (window.history.state && window.history.state.page) {
            window.history.back();
          } else {
            setPage("home");
          }
        }}>← Back</button>
        <div className="legal-badge">Legal</div>
        <h1>Privacy Policy</h1>
        <p>Last updated: June 2025 · Effective immediately</p>
      </div>

      <div className="legal-card">
        <div className="legal-highlight">
          <span>🔒</span>
          <div>
            <strong>Your privacy matters to us.</strong> CampusMart collects only what's necessary to operate the platform. We never sell your data to third parties.
          </div>
        </div>

        <section className="legal-section">
          <h2>1. Information We Collect</h2>
          <p>When you use CampusMart, we collect the following categories of information:</p>
          <ul>
            <li><strong>Account Information:</strong> Name, college email address, profile photo, branch, and year of study — provided during registration.</li>
            <li><strong>Listing Data:</strong> Item titles, descriptions, photos, prices, and category information you post.</li>
            <li><strong>Usage Data:</strong> Pages visited, search queries, clicks, and time spent on the platform to improve user experience.</li>
            <li><strong>Communications:</strong> Messages exchanged between buyers and sellers through our in-app chat system.</li>
            <li><strong>Device & Technical Data:</strong> Browser type, IP address, device type, and operating system for security and analytics.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To create and manage your account and verify student status</li>
            <li>To enable buying, selling, and donating of items on the platform</li>
            <li>To facilitate real-time communication between users</li>
            <li>To send important notifications about your listings and purchase requests</li>
            <li>To improve the platform through analytics and user feedback</li>
            <li>To detect and prevent fraud, spam, and inappropriate content</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Information Sharing</h2>
          <p>We do <strong>not</strong> sell, rent, or trade your personal information. We may share limited data with:</p>
          <ul>
            <li><strong>Firebase (Google):</strong> Authentication, database, and real-time messaging services</li>
            <li><strong>Cloudinary:</strong> Image hosting and optimization services</li>
            <li><strong>Vercel:</strong> Website hosting infrastructure</li>
            <li><strong>Legal Authorities:</strong> When required by law or to protect the safety of users</li>
          </ul>
          <p>All third-party services are bound by their own privacy policies and data processing agreements.</p>
        </section>

        <section className="legal-section">
          <h2>4. Data Storage & Security</h2>
          <p>Your data is stored securely on Firebase (Google Cloud infrastructure) with industry-standard encryption. Profile images are stored on Cloudinary's secure CDN. We implement access controls, secure authentication, and regular security reviews. However, no system is 100% secure — use strong passwords and report suspicious activity immediately.</p>
        </section>

        <section className="legal-section">
          <h2>5. Cookies & Local Storage</h2>
          <p>CampusMart uses the following:</p>
          <ul>
            <li><strong>Essential Cookies:</strong> Authentication tokens to keep you logged in (cannot be disabled)</li>
            <li><strong>Analytics Cookies:</strong> Anonymous usage statistics to improve the platform (can be disabled)</li>
            <li><strong>Preference Storage:</strong> Browser local storage for filter preferences and UI settings</li>
          </ul>
          <p>You can manage cookies through your browser settings. Disabling essential cookies will prevent login.</p>
        </section>

        <section className="legal-section">
          <h2>6. Your Rights (GDPR & Indian IT Act)</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of all personal data we hold about you</li>
            <li><strong>Correction:</strong> Update inaccurate information via your profile settings</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
            <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
            <li><strong>Objection:</strong> Opt out of non-essential data processing</li>
          </ul>
          <p>To exercise any of these rights, email us at <a href="mailto:privacy@campusmart.in" className="legal-link">privacy@campusmart.in</a></p>
        </section>

        <section className="legal-section">
          <h2>7. Data Retention</h2>
          <p>We retain your personal data for as long as your account is active. Upon account deletion, your personal data is removed within 30 days, except where retention is required by law or for dispute resolution. Chat messages may be retained for 90 days post-deletion for safety purposes.</p>
        </section>

        <section className="legal-section">
          <h2>8. Children's Privacy</h2>
          <p>CampusMart is intended for college students aged 18 and above. We do not knowingly collect data from individuals under 18. If you believe a minor has created an account, please contact us immediately at <a href="mailto:support@campusmart.in" className="legal-link">support@campusmart.in</a></p>
        </section>

        <section className="legal-section">
          <h2>9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy periodically. Significant changes will be communicated via email or an in-app notification at least 7 days before taking effect. Continued use after changes constitutes acceptance.</p>
        </section>

        <section className="legal-section">
          <h2>10. Contact Us</h2>
          <p>For privacy-related inquiries:</p>
          <div className="legal-contact-grid">
            <div className="legal-contact-item">📧 <a href="mailto:privacy@campusmart.in" className="legal-link">privacy@campusmart.in</a></div>
            <div className="legal-contact-item">🐛 <a href="mailto:bugs@campusmart.in" className="legal-link">bugs@campusmart.in</a></div>
            <div className="legal-contact-item">💬 <a href="mailto:support@campusmart.in" className="legal-link">support@campusmart.in</a></div>
          </div>
        </section>
      </div>
    </div>
  );
}
