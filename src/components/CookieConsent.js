import React, { useState, useEffect } from "react";

const COOKIE_KEY = "campusmart_cookie_consent";

export default function CookieConsent() {
  const [show,    setShow]    = useState(false);
  const [details, setDetails] = useState(false);
  const [prefs,   setPrefs]   = useState({ essential: true, analytics: true });

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_KEY);
    if (!saved) setTimeout(() => setShow(true), 1500);
  }, []);

  function acceptAll() {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ essential: true, analytics: true, ts: Date.now() }));
    setShow(false);
  }

  function acceptSelected() {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ ...prefs, ts: Date.now() }));
    setShow(false);
  }

  function rejectNonEssential() {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ essential: true, analytics: false, ts: Date.now() }));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="cookie-overlay">
      <div className={`cookie-banner ${details ? "cookie-banner-tall" : ""}`}>
        <div className="cookie-top">
          <div className="cookie-icon">🍪</div>
          <div className="cookie-body">
            <div className="cookie-title">We use cookies</div>
            <div className="cookie-text">
              We use essential cookies to keep you logged in and optional analytics cookies to improve CampusMart.
              {!details && (
                <button className="cookie-link" onClick={() => setDetails(true)}> Manage preferences →</button>
              )}
            </div>
          </div>
        </div>

        {details && (
          <div className="cookie-prefs">
            <div className="cookie-pref-row">
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Essential Cookies</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Required for login and core functions. Cannot be disabled.</div>
              </div>
              <div className="cookie-toggle always-on">Always On</div>
            </div>
            <div className="cookie-pref-row">
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Analytics Cookies</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Help us understand how students use the app. No personal data shared.</div>
              </div>
              <button
                className={`toggle ${prefs.analytics ? "on" : ""}`}
                onClick={() => setPrefs(p => ({ ...p, analytics: !p.analytics }))}
              />
            </div>
          </div>
        )}

        <div className="cookie-actions">
          {details ? (
            <>
              <button className="btn btn-outline btn-sm" onClick={rejectNonEssential}>Reject Optional</button>
              <button className="btn btn-outline btn-sm" onClick={acceptSelected}>Save Preferences</button>
              <button className="btn btn-primary btn-sm" onClick={acceptAll}>Accept All</button>
            </>
          ) : (
            <>
              <button className="btn btn-outline btn-sm" onClick={rejectNonEssential}>Reject Optional</button>
              <button className="btn btn-primary btn-sm" onClick={acceptAll}>Accept All 🍪</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
