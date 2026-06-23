import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function AuthModal({ onClose, onSuccess, setPage }) {
  const [tab, setTab] = useState("login"); // "login" | "signup" | "forgot"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Signup fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");

  // Forgot Password fields
  const [resetEmail, setResetEmail] = useState("");

  const { signInWithGoogle, signUpWithEmail, loginWithEmail, resetPassword } = useAuth();
  const toast = useToast();

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      toast("Welcome to CampusMart!", "success");
      onSuccess();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithEmail(loginEmail, loginPass);
      toast("Welcome back!", "success");
      onSuccess();
    } catch {
      setError("Invalid email or password");
    }
    setLoading(false);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    if (!name || !email || !password || !college || !branch || !year) {
      setError("Please fill all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password, name, college, branch, year);
      toast("Account created. Welcome!", "success");
      onSuccess();
    } catch (e) {
      setError(e.code === "auth/email-already-in-use" ? "Email already registered" : e.message);
    }
    setLoading(false);
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!resetEmail) {
      setError("Please enter your email");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetEmail);
      setSuccessMsg("Password reset email sent! Please check your inbox.");
      toast("Password reset email sent!", "success");
    } catch (e) {
      setError("Failed to send reset email. Verify your email address.");
    }
    setLoading(false);
  }

  function handleOverlayClick(e) {
    if (e.target.className === "modal-overlay") {
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} style={{ zIndex: 1100 }}>
      <div className="modal" style={{ position: "relative", maxWidth: 450, padding: "30px 24px" }}>
        <button
          onClick={onClose}
          type="button"
          aria-label="Close authentication modal"
          style={{
            position: "absolute", top: 16, right: 16, border: "none", background: "none",
            fontSize: 20, color: "var(--muted-2)", cursor: "pointer", fontWeight: "bold"
          }}
        >
          ✕
        </button>

        <div className="auth-box-logo" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
          <img src="/logo-circular.png" alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
          CampusMart
        </div>

        {tab !== "forgot" ? (
          <>
            <div className="auth-box-title" style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
              {tab === "login" ? "Welcome back" : "Join CampusMart"}
            </div>
            <div className="auth-box-sub" style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              {tab === "login" ? "Sign in to your student account" : "Create your free student account"}
            </div>            <div className="auth-tabs" style={{ display: "flex", background: "var(--light)", padding: 4, borderRadius: 10, marginBottom: 16 }}>
              <button
                className={`auth-tab ${tab === "login" ? "active" : ""}`}
                onClick={() => { setTab("login"); setError(""); }}
                type="button"
                style={{ flex: 1, padding: "8px 12px", border: "none", background: tab === "login" ? "var(--card-bg)" : "transparent", borderRadius: 8, fontSize: 13, fontWeight: 700 }}
              >
                Sign In
              </button>
              <button
                className={`auth-tab ${tab === "signup" ? "active" : ""}`}
                onClick={() => { setTab("signup"); setError(""); }}
                type="button"
                style={{ flex: 1, padding: "8px 12px", border: "none", background: tab === "signup" ? "var(--card-bg)" : "transparent", borderRadius: 8, fontSize: 13, fontWeight: 700 }}
              >
                Sign Up
              </button>
            </div>

            <button className="google-btn" onClick={handleGoogle} disabled={loading} type="button" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 10, border: "1.5px solid var(--bdr)", borderRadius: 8, background: "var(--card-bg)", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 16 }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <div className="divider" style={{ textAlign: "center", position: "relative", margin: "16px 0", fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
              <span style={{ background: "var(--card-bg)", padding: "0 10px" }}>or</span>
            </div>

            {tab === "login" ? (
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>College Email</label>
                  <input className="form-input" type="email" placeholder="you@college.edu" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required style={{ width: "100%", padding: 10, border: "1.5px solid var(--bdr)", borderRadius: 8 }} />
                </div>
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Password</label>
                    <button type="button" onClick={() => { setTab("forgot"); setError(""); }} style={{ background: "none", border: "none", color: "var(--p)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Forgot password?</button>
                  </div>
                  <input className="form-input" type="password" placeholder="Your password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required style={{ width: "100%", padding: 10, border: "1.5px solid var(--bdr)", borderRadius: 8 }} />
                </div>
                {error && <div className="error-msg" style={{ color: "var(--danger)", fontSize: 12, fontWeight: 500 }}>{error}</div>}
                <button type="submit" className="btn btn-primary auth-submit" disabled={loading} style={{ width: "100%", padding: 12, borderRadius: 8, background: "var(--p)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "320px", overflowY: "auto", paddingRight: 4 }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Full Name</label>
                  <input className="form-input" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} required style={{ width: "100%", padding: 8, border: "1.5px solid var(--bdr)", borderRadius: 8 }} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>College Email</label>
                  <input className="form-input" type="email" placeholder="you@college.edu" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", padding: 8, border: "1.5px solid var(--bdr)", borderRadius: 8 }} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Password</label>
                  <input className="form-input" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%", padding: 8, border: "1.5px solid var(--bdr)", borderRadius: 8 }} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>College Name</label>
                  <input className="form-input" placeholder="e.g. IIT Delhi, DTU" value={college} onChange={e => setCollege(e.target.value)} required style={{ width: "100%", padding: 8, border: "1.5px solid var(--bdr)", borderRadius: 8 }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Branch</label>
                    <select className="form-input" value={branch} onChange={e => setBranch(e.target.value)} required style={{ width: "100%", padding: 8, border: "1.5px solid var(--bdr)", borderRadius: 8 }}>
                      <option value="">Select</option>
                      {["Computer Science","Electronics","Mechanical","Civil","Chemical","MBA","Other"].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Year</label>
                    <select className="form-input" value={year} onChange={e => setYear(e.target.value)} required style={{ width: "100%", padding: 8, border: "1.5px solid var(--bdr)", borderRadius: 8 }}>
                      <option value="">Select</option>
                      {["1st Year","2nd Year","3rd Year","4th Year","PG"].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                {error && <div className="error-msg" style={{ color: "var(--danger)", fontSize: 12, fontWeight: 500 }}>{error}</div>}
                <button type="submit" className="btn btn-primary auth-submit" disabled={loading} style={{ width: "100%", padding: 10, borderRadius: 8, background: "var(--p)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>
            )}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="auth-box-title" style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
              Reset Password
            </div>
            <div className="auth-box-sub" style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              Enter your college email address and we'll send you a password reset link.
            </div>

            <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>College Email</label>
                <input className="form-input" type="email" placeholder="you@college.edu" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required style={{ width: "100%", padding: 10, border: "1.5px solid var(--bdr)", borderRadius: 8 }} />
              </div>
              {error && <div className="error-msg" style={{ color: "var(--danger)", fontSize: 12, fontWeight: 500 }}>{error}</div>}
              {successMsg && <div style={{ color: "var(--success)", fontSize: 12, fontWeight: 500 }}>{successMsg}</div>}
              
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading} style={{ width: "100%", padding: 12, borderRadius: 8, background: "var(--p)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
                {loading ? "Sending link..." : "Send Reset Link"}
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setTab("login"); setError(""); setSuccessMsg(""); }}
                style={{ width: "100%", padding: 10, borderRadius: 8, background: "transparent", border: "1.5px solid var(--bdr)", color: "var(--txt-2)", fontWeight: 700, cursor: "pointer" }}
              >
                Back to Sign In
              </button>
            </form>
          </div>
        )}

        <div className="auth-terms" style={{ marginTop: 20, fontSize: 11, color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
          By continuing, you agree to our{" "}
          <button className="auth-terms-link" onClick={() => { onClose(); setPage("terms"); }} type="button" style={{ color: "var(--p)", background: "none", border: "none", padding: 0, font: "inherit", textDecoration: "underline", cursor: "pointer" }}>Terms of Service</button> and{" "}
          <button className="auth-terms-link" onClick={() => { onClose(); setPage("privacy"); }} type="button" style={{ color: "var(--p)", background: "none", border: "none", padding: 0, font: "inherit", textDecoration: "underline", cursor: "pointer" }}>Privacy Policy</button>
        </div>
      </div>
    </div>
  );
}
