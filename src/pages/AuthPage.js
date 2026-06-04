import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const FEATURES = [
  { icon:"📚", title:"Buy & Sell Textbooks",   desc:"Save money on course materials" },
  { icon:"🔬", title:"Lab Equipment Exchange", desc:"Share costly instruments" },
  { icon:"💚", title:"Donate for Free",         desc:"Help your juniors out" },
  { icon:"🔒", title:"Verified Students Only",  desc:"Safe campus community" },
];

export default function AuthPage() {
  const [tab,       setTab]       = useState("login");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [loginEmail,setLoginEmail]= useState("");
  const [loginPass, setLoginPass] = useState("");
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [college,   setCollege]   = useState("");
  const [branch,    setBranch]    = useState("");
  const [year,      setYear]      = useState("");

  const { signInWithGoogle, signUpWithEmail, loginWithEmail } = useAuth();
  const toast = useToast();

  async function handleGoogle() {
    setError(""); setLoading(true);
    try { await signInWithGoogle(); toast("Welcome to CampusMart! 🎉", "success"); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function handleLogin(e) {
    e.preventDefault(); setError(""); setLoading(true);
    try { await loginWithEmail(loginEmail, loginPass); toast("Welcome back! 👋", "success"); }
    catch { setError("Invalid email or password"); }
    setLoading(false);
  }

  async function handleSignup(e) {
    e.preventDefault(); setError("");
    if (!name||!email||!password||!college||!branch||!year) { setError("Please fill all fields"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try { await signUpWithEmail(email, password, name, college, branch, year); toast("Account created! Welcome 🎓", "success"); }
    catch (e) { setError(e.code === "auth/email-already-in-use" ? "Email already registered" : e.message); }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <div className="auth-brand">
            <img src="/logo-horizontal.png" alt="CampusMart India" className="auth-logo-img" />
          </div>
          <h2 className="auth-left-title">
            India's Trusted<br />
            <span className="auth-left-accent">Campus Marketplace</span>
          </h2>
          <p className="auth-left-sub">Buy, sell and donate within your college — trusted by students across India.</p>
          <div className="auth-features">
            {FEATURES.map((f, i) => (
              <div key={i} className="auth-feature">
                <div className="auth-feature-icon">{f.icon}</div>
                <div>
                  <div className="auth-feature-title">{f.title}</div>
                  <div className="auth-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="auth-left-badge">
            <span>🎓</span> 100% Student Community — Verified College Emails Only
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-box">
          <div className="auth-box-logo">
            <img src="/logo-circular.png" alt="" style={{ width:36, height:36, borderRadius:"50%" }} />
            CampusMart
          </div>
          <div className="auth-box-title">{tab === "login" ? "Welcome back 👋" : "Join CampusMart 🎓"}</div>
          <div className="auth-box-sub">{tab === "login" ? "Sign in to your student account" : "Create your free student account"}</div>

          <div className="auth-tabs">
            <button className={`auth-tab ${tab==="login"?"active":""}`} onClick={() => { setTab("login"); setError(""); }}>Sign In</button>
            <button className={`auth-tab ${tab==="signup"?"active":""}`} onClick={() => { setTab("signup"); setError(""); }}>Sign Up</button>
          </div>

          <button className="google-btn" onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="divider">or</div>

          {tab === "login" ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">College Email</label>
                <input className="form-input" type="email" placeholder="you@college.edu" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={loginPass} onChange={e => setLoginPass(e.target.value)} required />
              </div>
              {error && <div className="error-msg">⚠️ {error}</div>}
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                {loading ? <><span className="btn-spinner" /> Signing in...</> : "Sign In →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">College Email</label>
                <input className="form-input" type="email" placeholder="you@college.edu" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">College Name</label>
                <input className="form-input" placeholder="e.g. IIT Delhi, DTU, BITS Pilani" value={college} onChange={e => setCollege(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <select className="form-input" value={branch} onChange={e => setBranch(e.target.value)}>
                    <option value="">Select</option>
                    {["Computer Science","Electronics","Mechanical","Civil","Chemical","MBA","Other"].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select className="form-input" value={year} onChange={e => setYear(e.target.value)}>
                    <option value="">Select</option>
                    {["1st Year","2nd Year","3rd Year","4th Year","PG"].map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              {error && <div className="error-msg">⚠️ {error}</div>}
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                {loading ? <><span className="btn-spinner" /> Creating account...</> : "Create Account 🎓"}
              </button>
            </form>
          )}

          <div className="auth-terms">
            By continuing, you agree to our{" "}
            <span className="auth-terms-link">Terms of Service</span> and{" "}
            <span className="auth-terms-link">Privacy Policy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
