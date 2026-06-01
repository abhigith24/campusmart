import React from "react";

export default function TermsPage({ setPage }) {
  return (
    <div className="container legal-page">
      <div className="legal-header">
        <button className="btn btn-ghost" onClick={() => setPage("home")}>← Back</button>
        <div className="legal-badge">Legal</div>
        <h1>Terms & Conditions</h1>
        <p>Last updated: June 2025 · By using CampusMart, you agree to these terms.</p>
      </div>

      <div className="legal-card">
        <div className="legal-highlight">
          <span>📋</span>
          <div>
            <strong>Please read carefully.</strong> These Terms of Service govern your use of CampusMart. If you disagree with any part, you may not access the service.
          </div>
        </div>

        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>By registering on or accessing CampusMart ("Platform"), you agree to be bound by these Terms and Conditions, our Privacy Policy, and all applicable laws. If you are under 18, you may not use this platform. These terms may be updated periodically — continued use constitutes acceptance of revised terms.</p>
        </section>

        <section className="legal-section">
          <h2>2. Eligibility</h2>
          <p>CampusMart is exclusively for currently enrolled college/university students. By registering, you confirm that:</p>
          <ul>
            <li>You are 18 years of age or older</li>
            <li>You are a currently enrolled student at a recognized educational institution</li>
            <li>You will use a valid college email address for registration</li>
            <li>The information you provide is accurate and truthful</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. User Accounts</h2>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized access</li>
            <li>Keeping your profile information accurate and up to date</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent behavior, or misuse the platform.</p>
        </section>

        <section className="legal-section">
          <h2>4. Listings & Transactions</h2>
          <ul>
            <li>Users may only list items they own and have the right to sell</li>
            <li>Listing prices must be honest and not artificially inflated</li>
            <li>Item descriptions and photos must accurately represent the actual item</li>
            <li>Sellers must honor confirmed transactions in good faith</li>
            <li>CampusMart is a peer-to-peer platform and is <strong>not a party</strong> to any transaction between users</li>
            <li>No payment processing occurs through CampusMart — all transactions are arranged directly between users</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Prohibited Content & Behavior</h2>
          <p>The following are strictly prohibited:</p>
          <ul>
            <li>Illegal items, controlled substances, weapons, or counterfeit goods</li>
            <li>Stolen property or items obtained through fraudulent means</li>
            <li>Misleading, false, or deceptive listings</li>
            <li>Harassment, hate speech, or threatening behavior toward other users</li>
            <li>Spam, unsolicited advertising, or multi-level marketing</li>
            <li>Sharing of other users' personal information without consent</li>
            <li>Attempting to circumvent the platform's security or abuse its features</li>
            <li>Creating multiple accounts or fake accounts</li>
          </ul>
          <p>Violation of these rules may result in immediate account suspension and potential legal action.</p>
        </section>

        <section className="legal-section">
          <h2>6. Limitation of Liability</h2>
          <p>CampusMart provides a platform for student-to-student exchange. We are <strong>not responsible for</strong>:</p>
          <ul>
            <li>The quality, safety, legality, or accuracy of listed items</li>
            <li>Any disputes arising between buyers and sellers</li>
            <li>Financial losses resulting from transactions on the platform</li>
            <li>Damage or loss incurred during item exchange</li>
            <li>Any indirect, incidental, or consequential damages</li>
          </ul>
          <p>To the maximum extent permitted by law, our total liability shall not exceed ₹5,000 or the value of the disputed transaction, whichever is lower.</p>
        </section>

        <section className="legal-section">
          <h2>7. Intellectual Property</h2>
          <p>The CampusMart name, logo, design, and original content are the intellectual property of CampusMart and are protected by applicable copyright and trademark laws. User-generated content (listings, photos, reviews) remains the property of the respective users, but by posting, you grant CampusMart a non-exclusive, royalty-free license to display and use such content on the platform.</p>
        </section>

        <section className="legal-section">
          <h2>8. Safety Guidelines</h2>
          <p>For your safety, we strongly recommend:</p>
          <ul>
            <li>Meeting buyers/sellers only in public, well-lit locations on campus</li>
            <li>Inspecting items thoroughly before completing a transaction</li>
            <li>Never paying in advance without seeing the item</li>
            <li>Using our in-app chat for all communications</li>
            <li>Reporting suspicious listings or users to our admin team</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>9. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of India, including the Information Technology Act, 2000 and its amendments. Any disputes shall be subject to the exclusive jurisdiction of courts in India.</p>
        </section>

        <section className="legal-section">
          <h2>10. Contact</h2>
          <p>For terms-related queries: <a href="mailto:legal@campusmart.in" className="legal-link">legal@campusmart.in</a></p>
        </section>
      </div>
    </div>
  );
}
