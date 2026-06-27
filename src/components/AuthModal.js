import "./AuthModal.css";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { 
  Mail, Lock, Eye, EyeOff, Check, X, AlertTriangle, ArrowRight, 
  ArrowLeft, CheckCircle2, User, School, GraduationCap, 
  Calendar, Loader2, ChevronDown 
} from "lucide-react";

export default function AuthModal({ onClose, onSuccess, setPage }) {
  const [tab, setTab] = useState("login"); // "login" | "signup" | "forgot"
  const [signupStep, setSignupStep] = useState(1); // 1 | 2 | 3
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Remember Me & Caps Lock
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("rememberedEmail") ? true : false;
  });
  const [capsLock, setCapsLock] = useState(false);

  // Password visibility
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Success screens
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");
  const [isSignupSuccess, setIsSignupSuccess] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState(() => {
    return localStorage.getItem("rememberedEmail") || "";
  });
  const [loginPass, setLoginPass] = useState("");

  // Forgot password field — BUG FIX: was previously missing
  const [resetEmail, setResetEmail] = useState("");

  // Signup fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const [customBranch, setCustomBranch] = useState(""); // Support Custom Branch entry
  const [customBranchTouched, setCustomBranchTouched] = useState(false);
  const [year, setYear] = useState("");

  // Search & Dropdown states
  const [collegeSearchOpen, setCollegeSearchOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  
  const [collegeQuery, setCollegeQuery] = useState("");
  const [branchQuery, setBranchQuery] = useState("");

  // Dynamic dropdown direction states
  const [collegeDir, setCollegeDir] = useState("open-down");
  const [branchDir, setBranchDir] = useState("open-down");
  const [yearDir, setYearDir] = useState("open-down");

  // Keyboard navigation highlight indexes
  const [colHighlight, setColHighlight] = useState(0);

  const { signInWithGoogle, signUpWithEmail, loginWithEmail, resetPassword, logout } = useAuth();
  const toast = useToast();
  
  const modalRef = useRef(null);
  const bodyRef = useRef(null);

  // Input refs for measuring position
  const collegeInputRef = useRef(null);
  const branchTriggerRef = useRef(null);
  const yearTriggerRef = useRef(null);

  // Memoize static lists to prevent unnecessary re-renders
  const collegesList = useMemo(() => [
    "IIT Delhi", "IIT Bombay", "IIT Kharagpur", "IIT Madras", "IIT Kanpur",
    "BITS Pilani", "DTU (Delhi Technological University)", "NSUT (Netaji Subhas University of Technology)",
    "VIT Vellore", "SRM University", "NIT Trichy", "NIT Warangal", "NIT Surathkal",
    "RV College of Engineering", "PES University", "Manipal Institute of Technology",
    "Delhi University", "Mumbai University", "Anna University", "Jadavpur University"
  ], []);

  const branchesList = useMemo(() => [
    "Computer Science", "Electronics", "Mechanical", "Civil", 
    "Chemical", "MBA", "Information Technology", "Electrical", "Other"
  ], []);

  const yearsList = useMemo(() => [
    "1st Year", "2nd Year", "3rd Year", "4th Year", "PG"
  ], []);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleCloseAttempt = useCallback(() => {
    const hasData = 
      (tab === "signup" && (name || email || password || confirmPassword || college || branch || year)) ||
      (tab === "login" && (loginEmail !== (localStorage.getItem("rememberedEmail") || "") || loginPass));
      
    if (hasData && !showSuccessScreen && !isSignupSuccess) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  }, [tab, name, email, password, confirmPassword, college, branch, year, loginEmail, loginPass, showSuccessScreen, isSignupSuccess, onClose]);

  // Keyboard Trap & Escape
  useEffect(() => {
    const handleKeyDownGlobal = (e) => {
      if (e.key === "Escape") {
        handleCloseAttempt();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex="0"]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDownGlobal);
    return () => document.removeEventListener("keydown", handleKeyDownGlobal);
  }, [handleCloseAttempt]);

  // Auto-focus first input on tab/step change
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstInput = modalRef.current?.querySelector(
        ".auth-modal-body input:not([type='checkbox']):not([type='hidden'])"
      );
      if (firstInput) firstInput.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [tab, signupStep]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (collegeSearchOpen && collegeInputRef.current && !collegeInputRef.current.closest('.form-group-floating')?.contains(e.target)) {
        setCollegeSearchOpen(false);
      }
      if (branchDropdownOpen && branchTriggerRef.current && !branchTriggerRef.current.closest('.form-group-floating')?.contains(e.target)) {
        setBranchDropdownOpen(false);
      }
      if (yearDropdownOpen && yearTriggerRef.current && !yearTriggerRef.current.closest('.form-group-floating')?.contains(e.target)) {
        setYearDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [collegeSearchOpen, branchDropdownOpen, yearDropdownOpen]);

  // Caps Lock detector
  const handleKeyUp = (e) => {
    if (e.getModifierState) {
      setCapsLock(e.getModifierState("CapsLock"));
    }
  };

  // Helper to determine drop direction
  const determineDirection = (triggerEl) => {
    if (!triggerEl) return "open-down";
    const rect = triggerEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    return spaceBelow < 220 ? "open-up" : "open-down";
  };

  // Autocomplete filter lists
  const filteredColleges = useMemo(() => {
    return collegesList.filter(c => c.toLowerCase().includes(collegeQuery.toLowerCase()));
  }, [collegesList, collegeQuery]);

  const filteredBranches = useMemo(() => {
    return branchesList.filter(b => b.toLowerCase().includes(branchQuery.toLowerCase()));
  }, [branchesList, branchQuery]);

  // Input focus helper to auto-scroll on mobile
  const handleFocus = (e) => {
    e.target.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // Authentication logic
  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      setSuccessTitle("Welcome Back");
      setShowSuccessScreen(true);
      setTimeout(() => onSuccess(), 850);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithEmail(loginEmail, loginPass);
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", loginEmail);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
      setSuccessTitle("Welcome Back");
      setShowSuccessScreen(true);
      setTimeout(() => onSuccess(), 850);
    } catch {
      setError("Incorrect email or password");
      setLoading(false);
    }
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    const finalBranch = branch === "Other" ? customBranch.trim() : branch;
    try {
      await signUpWithEmail(email, password, name, college, finalBranch, year);
      setLoading(false);
      setIsSignupSuccess(true);
    } catch (e) {
      setError(e.code === "auth/email-already-in-use" ? "Email already registered" : e.message);
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      await resetPassword(resetEmail);
      setSuccessMsg("Password reset email sent!");
      toast("Password reset email sent!", "success");
    } catch (e) {
      setError("Failed to send reset email.");
    }
    setLoading(false);
  }

  const isEmailValid = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const getPasswordStrength = (pass) => {
    if (!pass) return "";
    let score = 0;
    if (pass.length >= 6) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (score <= 2) return "Weak";
    if (score <= 3) return "Medium";
    return "Strong";
  };

  const passStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleCollegeKeyDown = (e) => {
    if (!collegeSearchOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setColHighlight((prev) => (prev + 1) % Math.max(1, filteredColleges.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setColHighlight((prev) => (prev - 1 + filteredColleges.length) % Math.max(1, filteredColleges.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredColleges[colHighlight]) {
        setCollege(filteredColleges[colHighlight]);
        setCollegeSearchOpen(false);
      }
    }
  };

  // Step validation for Continue/Review buttons
  const canProceedStep1 = name && isEmailValid(email) && password.length >= 6 && passwordsMatch;
  const canProceedStep2 = college && branch && year && (branch !== "Other" || (customBranch.trim().length >= 2 && customBranch.trim().length <= 60));

  const handleStep1Continue = useCallback(() => {
    if (canProceedStep1) {
      setSignupStep(2);
      setError("");
    } else {
      setError("Please complete all fields correctly");
    }
  }, [canProceedStep1]);

  const handleStep2Continue = useCallback(() => {
    if (college && branch && year) {
      if (branch === "Other" && !customBranch.trim()) {
        setError("Please enter your branch name");
        return;
      }
      if (branch === "Other" && customBranch.trim().length < 2) {
        setError("Branch name must be at least 2 characters");
        return;
      }
      if (branch === "Other" && customBranch.trim().length > 60) {
        setError("Branch name must be 60 characters or less");
        return;
      }
      setSignupStep(3);
      setError("");
    } else {
      setError("Please complete all academic details");
    }
  }, [college, branch, year, customBranch]);

  // Determine the effective modal mode for CSS
  const modalMode = tab === "signup" ? "signup" : "login";

  // Compute the effective display branch for review
  const displayBranch = branch === "Other" ? customBranch.trim() : branch;

  // ─── Stepper rendering ───
  const renderStepper = () => {
    const steps = [
      { num: 1, label: "Account" },
      { num: 2, label: "Academic" },
      { num: 3, label: "Review" },
    ];

    return (
      <div className="auth-modal-stepper">
        <div className="wizard-progress">
          {steps.map((step, i) => {
            const isCompleted = signupStep > step.num;
            const isActive = signupStep === step.num;
            const isUpcoming = signupStep < step.num;

            return (
              <React.Fragment key={step.num}>
                {i > 0 && (
                  <div className={`wizard-connector ${signupStep > step.num ? "completed" : signupStep >= step.num ? "active" : ""}`} />
                )}
                <div className={`wizard-step-node ${isCompleted ? "completed" : ""} ${isActive ? "active" : ""} ${isUpcoming ? "upcoming" : ""}`}>
                  <div className="wizard-step-circle">
                    {isCompleted ? <Check size={13} strokeWidth={3} /> : step.num}
                  </div>
                  <span className="wizard-step-label">{step.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Review page rendering ───
  const renderReviewPage = () => (
    <div className="review-section">
      {/* Account Card */}
      <div className="review-card">
        <div className="review-card-header">
          <User size={16} />
          <span>Account Details</span>
        </div>
        <div className="review-card-body">
          <div className="review-row">
            <span className="review-label">Full Name</span>
            <span className="review-value">{name}</span>
          </div>
          <div className="review-row">
            <span className="review-label">Email</span>
            <span className="review-value">{email}</span>
          </div>
          <div className="review-row">
            <span className="review-label">Password</span>
            <span className="review-value">••••••••</span>
          </div>
        </div>
      </div>

      {/* Academic Card */}
      <div className="review-card">
        <div className="review-card-header">
          <GraduationCap size={16} />
          <span>Academic Details</span>
        </div>
        <div className="review-card-body">
          <div className="review-row">
            <span className="review-label">College</span>
            <span className="review-value">{college}</span>
          </div>
          <div className="review-row">
            <span className="review-label">Branch</span>
            <span className="review-value">{displayBranch}</span>
          </div>
          <div className="review-row">
            <span className="review-label">Year</span>
            <span className="review-value">{year}</span>
          </div>
        </div>
      </div>

      {/* Verification notice */}
      <div className="review-notice">
        <CheckCircle2 size={14} />
        <span>
          A verification email will be sent to your college email address. Please click the link to verify your student account.
        </span>
      </div>
    </div>
  );

  if (showConfirmClose) {
    return (
      <div className="auth-modal-overlay-enhanced" style={{ zIndex: 1200 }}>
        <div className="auth-modal-enhanced" style={{ padding: "32px 24px", textAlign: "center" }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Discard your signup progress?</h2>
          <p style={{ color: "var(--p)", marginBottom: 24, fontSize: 14 }}>
            You have unsaved information.<br/>
            Are you sure you want to close?
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-outline" onClick={() => setShowConfirmClose(false)} style={{ flex: 1 }}>
              Continue Editing
            </button>
            <button className="btn btn-primary" onClick={onClose} style={{ flex: 1, backgroundColor: "var(--danger)", border: "none" }}>
              Discard & Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="am-overlay">
      <div 
        ref={modalRef} 
        className="am-modal"
        onKeyUp={handleKeyUp}
        role="dialog"
        aria-modal="true"
        aria-label={tab === "login" ? "Sign in to CampusMart" : tab === "signup" ? "Create CampusMart account" : "Reset password"}
      >
        <div className="am-scrollable" ref={bodyRef}>
          {/* Header */}
          <div className="am-header-top">
            <div className="am-logo-container">
              <img src="/logo-circular.png" alt="CampusMart Logo" />
              CampusMart
            </div>
            <button
              onClick={handleCloseAttempt}
              type="button"
              className="am-close-btn"
              aria-label="Close authentication modal"
            >
              <X size={18} />
            </button>
          </div>

          {showSuccessScreen ? (
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <div style={{ color: "#10b981", marginBottom: 16, display: "flex", justifyContent: "center" }}>
                <CheckCircle2 size={48} />
              </div>
              <h2 className="am-title">{successTitle}</h2>
              <p className="am-subtitle">Redirecting you to campus deals...</p>
            </div>
          ) : isSignupSuccess ? (
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <div style={{ color: "#10b981", marginBottom: 16, display: "flex", justifyContent: "center" }}>
                <CheckCircle2 size={48} />
              </div>
              <h2 className="am-title">Account Created Successfully</h2>
              <p className="am-subtitle">Verification email sent to <strong>{email}</strong></p>
              <p className="am-subtitle" style={{ marginBottom: 32 }}>Please verify your email before logging in.</p>
              <button
                type="button"
                className="am-submit-btn"
                onClick={async () => {
                  await logout();
                  setIsSignupSuccess(false);
                  setTab("login");
                  setSignupStep(1);
                }}
              >
                Go to Login
              </button>
            </div>
          ) : (
            <form 
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (tab === "login") handleLoginSubmit(e);
                else if (tab === "signup" && signupStep === 3) handleSignupSubmit(e);
                else if (tab === "forgot") handleReset(e);
              }}
            >
              {tab !== "forgot" ? (
                <>
                  <h2 className="am-title">
                    {tab === "login" ? "Welcome Back" : signupStep === 3 ? "Review Your Details" : "Join CampusMart"}
                  </h2>
                  <p className="am-subtitle">
                    {tab === "login" ? "Sign in to your student account" : signupStep === 3 ? "Please review your information before creating account" : "Create your free student account"}
                  </p>

                  <div className="am-tabs">
                    <button type="button" className={`am-tab ${tab === "login" ? "active" : ""}`} onClick={() => { setTab("login"); setError(""); }}>Sign In</button>
                    <button type="button" className={`am-tab ${tab === "signup" ? "active" : ""}`} onClick={() => { setTab("signup"); setError(""); }}>Sign Up</button>
                  </div>
                  
                  {tab === "login" && (
                    <>
                      <button type="button" className="am-google-btn" onClick={handleGoogle} disabled={loading}>
                        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Continue with Google
                      </button>

                      <div className="am-divider">
                        <span>OR</span>
                      </div>

                      <div className="am-input-group">
                        <div className="am-input-wrapper">
                          <div className="am-input-icon"><Mail size={20} /></div>
                          <div className="am-input-content">
                            <label className="am-input-label">College Email</label>
                            <input 
                              type="email"
                              className="am-input-field"
                              placeholder="you@yourcollege.edu"
                              value={loginEmail}
                              onChange={e => setLoginEmail(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="am-input-wrapper">
                          <div className="am-input-icon"><Lock size={20} /></div>
                          <div className="am-input-content">
                            <label className="am-input-label">Password</label>
                            <input 
                              type={showPass ? "text" : "password"}
                              className="am-input-field"
                              placeholder="Enter your password"
                              value={loginPass}
                              onChange={e => setLoginPass(e.target.value)}
                              required
                            />
                          </div>
                          <div className="am-input-right-icon" onClick={() => setShowPass(!showPass)}>
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                          </div>
                        </div>
                      </div>
                      
                      {capsLock && <div style={{ color: "#f59e0b", fontSize: 13, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={14} /> Caps lock is on</div>}
                      {error && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={14} /> {error}</div>}

                      <div className="am-remember-row">
                        <label className="am-checkbox-label">
                          <div className={`am-checkbox ${rememberMe ? '' : 'unchecked'}`}>
                            {rememberMe && <Check size={14} strokeWidth={3} />}
                          </div>
                          <input type="checkbox" style={{ display: 'none' }} checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                          Remember Me
                        </label>
                        <button type="button" className="am-forgot-link" onClick={() => { setTab("forgot"); setError(""); }}>Forgot password?</button>
                      </div>

                      <button type="submit" className="am-submit-btn" disabled={loading}>
                        {loading ? <Loader2 className="spinner" size={20} /> : "Sign In"}
                      </button>

                      <p className="am-footer-text">
                        By continuing, you agree to our <button type="button" onClick={() => { setPage("terms"); onClose(); }}>Terms of Service</button> and <button type="button" onClick={() => { setPage("privacy"); onClose(); }}>Privacy Policy</button>
                      </p>
                    </>
                  )}

                  {tab === "signup" && (
                    <>
                      <div className="am-stepper">
                        <div className="am-step">
                          <div className={`am-step-circle ${signupStep >= 1 ? (signupStep > 1 ? 'completed' : 'active') : ''}`}>
                            {signupStep > 1 ? <Check size={16} strokeWidth={3} /> : '1'}
                          </div>
                          <span className={`am-step-label ${signupStep >= 1 ? (signupStep > 1 ? 'completed' : 'active') : ''}`}>Account</span>
                        </div>
                        <div className={`am-stepper-line ${signupStep >= 2 ? 'completed' : ''}`} />
                        <div className="am-step">
                          <div className={`am-step-circle ${signupStep >= 2 ? (signupStep > 2 ? 'completed' : 'active') : ''}`}>
                            {signupStep > 2 ? <Check size={16} strokeWidth={3} /> : '2'}
                          </div>
                          <span className={`am-step-label ${signupStep >= 2 ? (signupStep > 2 ? 'completed' : 'active') : ''}`}>Academic</span>
                        </div>
                        <div className={`am-stepper-line ${signupStep >= 3 ? 'completed' : ''}`} />
                        <div className="am-step">
                          <div className={`am-step-circle ${signupStep >= 3 ? 'active' : ''}`}>
                            3
                          </div>
                          <span className={`am-step-label ${signupStep >= 3 ? 'active' : ''}`}>Review</span>
                        </div>
                      </div>

                      {signupStep === 1 && (
                        <>
                          <div className="am-input-group">
                            <div className="am-input-wrapper">
                              <div className="am-input-icon"><User size={20} /></div>
                              <div className="am-input-content">
                                <label className="am-input-label">Full Name</label>
                                <input className="am-input-field" placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} required />
                              </div>
                            </div>
                            
                            <div className="am-input-wrapper">
                              <div className="am-input-icon"><Mail size={20} /></div>
                              <div className="am-input-content">
                                <label className="am-input-label">College Email</label>
                                <input type="email" className="am-input-field" placeholder="you@yourcollege.edu" value={email} onChange={e => setEmail(e.target.value)} required />
                              </div>
                            </div>

                            <div className="am-input-wrapper">
                              <div className="am-input-icon"><Lock size={20} /></div>
                              <div className="am-input-content">
                                <label className="am-input-label">Password</label>
                                <input type={showPass ? "text" : "password"} className="am-input-field" placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} required />
                              </div>
                              <div className="am-input-right-icon" onClick={() => setShowPass(!showPass)}>
                                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                              </div>
                            </div>

                            <div className="am-input-wrapper">
                              <div className="am-input-icon"><Lock size={20} /></div>
                              <div className="am-input-content">
                                <label className="am-input-label">Confirm Password</label>
                                <input type={showConfirmPass ? "text" : "password"} className="am-input-field" placeholder="Confirm your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                              </div>
                              <div className="am-input-right-icon" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                                {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                              </div>
                            </div>
                          </div>

                          <div className="am-password-strength">
                            <div className="am-strength-label">Password strength: 
                              <span style={{ color: password.length > 8 ? '#10b981' : password.length >= 6 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                                {password.length === 0 ? "" : password.length > 8 ? "Strong" : password.length >= 6 ? "Medium" : "Weak"}
                              </span>
                            </div>
                            <div className="am-strength-bars">
                              <div className="am-strength-bar" style={{ background: password.length > 0 ? (password.length >= 6 ? '#10b981' : '#ef4444') : '' }} />
                              <div className="am-strength-bar" style={{ background: password.length >= 6 ? '#10b981' : '' }} />
                              <div className="am-strength-bar" style={{ background: password.length > 8 ? '#10b981' : '' }} />
                              <div className="am-strength-bar" style={{ background: password.length > 10 ? '#10b981' : '' }} />
                            </div>
                          </div>

                          {error && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={14} /> {error}</div>}

                          <button type="button" className="am-submit-btn" onClick={handleStep1Continue} style={{ marginTop: 24 }}>
                            Continue <ArrowRight size={18} />
                          </button>
                        </>
                      )}

                      {signupStep === 2 && (
                        <>
                          <div className="am-input-group">
                            <div className="am-input-wrapper" style={{ overflow: 'visible' }}>
                              <div className="am-input-icon"><School size={20} /></div>
                              <div className="am-input-content">
                                <label className="am-input-label">College</label>
                                <input 
                                  className="am-input-field" 
                                  placeholder="Type or select your college"
                                  value={college}
                                  onChange={e => {
                                    setCollege(e.target.value);
                                    setCollegeSearchOpen(true);
                                  }}
                                  onFocus={() => setCollegeSearchOpen(true)}
                                  onBlur={() => setTimeout(() => setCollegeSearchOpen(false), 200)}
                                  required 
                                />
                              </div>
                              <div className="am-input-right-icon" onClick={() => setCollegeSearchOpen(!collegeSearchOpen)} style={{ cursor: 'pointer' }}>
                                <ChevronDown size={18} style={{ transform: collegeSearchOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                              </div>
                              
                              {collegeSearchOpen && collegesList.filter(c => c.toLowerCase().includes(college.toLowerCase())).length > 0 && (
                                <div className="am-autocomplete-dropdown">
                                  {collegesList.filter(c => c.toLowerCase().includes(college.toLowerCase())).map((c, i) => (
                                    <div 
                                      key={c}
                                      className={`am-autocomplete-item ${colHighlight === i ? 'highlighted' : ''}`}
                                      onClick={() => {
                                        setCollege(c);
                                        setCollegeSearchOpen(false);
                                      }}
                                      onMouseEnter={() => setColHighlight(i)}
                                    >
                                      {c}
                                      {college === c && <Check size={16} />}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="am-input-wrapper">
                              <div className="am-input-icon"><GraduationCap size={20} /></div>
                              <div className="am-input-content">
                                <label className="am-input-label">Branch</label>
                                <select className="am-input-field" value={branch} onChange={e => { setBranch(e.target.value); if(e.target.value !== 'Other') setCustomBranch(""); }} required>
                                  <option value="" disabled hidden>Select your branch</option>
                                  {branchesList.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                              </div>
                              <div className="am-input-right-icon" style={{ pointerEvents: 'none' }}><ChevronDown size={18} /></div>
                            </div>

                            {branch === "Other" && (
                              <div className="am-input-wrapper" style={{ animation: 'am-fade-in 0.2s ease-out' }}>
                                <div className="am-input-icon"><GraduationCap size={20} /></div>
                                <div className="am-input-content">
                                  <label className="am-input-label">Your Branch Name</label>
                                  <input className="am-input-field" placeholder="Enter branch name" value={customBranch} onChange={e => { setCustomBranch(e.target.value); setCustomBranchTouched(true); }} required />
                                </div>
                              </div>
                            )}

                            <div className="am-input-wrapper">
                              <div className="am-input-icon"><Calendar size={20} /></div>
                              <div className="am-input-content">
                                <label className="am-input-label">Year</label>
                                <select className="am-input-field" value={year} onChange={e => setYear(e.target.value)} required>
                                  <option value="" disabled hidden>Select year</option>
                                  {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                              </div>
                              <div className="am-input-right-icon" style={{ pointerEvents: 'none' }}><ChevronDown size={18} /></div>
                            </div>
                          </div>

                          {error && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={14} /> {error}</div>}

                          <div className="am-action-row">
                            <button type="button" className="am-outline-btn" onClick={() => { setSignupStep(1); setError(""); }}>
                              <ArrowLeft size={18} /> Back
                            </button>
                            <button type="button" className="am-submit-btn" onClick={handleStep2Continue}>
                              Review <ArrowRight size={18} />
                            </button>
                          </div>
                        </>
                      )}

                      {signupStep === 3 && (
                        <>
                          <div className="am-review-card">
                            <div className="am-review-header">
                              <div className="am-review-header-left">
                                <div className="am-review-icon"><User size={20} /></div>
                                <span className="am-review-title">Account Details</span>
                              </div>
                              <button type="button" className="am-review-edit" onClick={() => setSignupStep(1)}>
                                Edit
                              </button>
                            </div>
                            <div className="am-review-grid">
                              <span className="am-review-label">Full Name</span>
                              <span className="am-review-value">{name}</span>
                              
                              <span className="am-review-label">College Email</span>
                              <span className="am-review-value">{email}</span>
                              
                              <span className="am-review-label">Password</span>
                              <span className="am-review-value">••••••••</span>
                            </div>
                          </div>

                          <div className="am-review-card">
                            <div className="am-review-header">
                              <div className="am-review-header-left">
                                <div className="am-review-icon"><GraduationCap size={20} /></div>
                                <span className="am-review-title">Academic Details</span>
                              </div>
                              <button type="button" className="am-review-edit" onClick={() => setSignupStep(2)}>
                                Edit
                              </button>
                            </div>
                            <div className="am-review-grid">
                              <span className="am-review-label">College</span>
                              <span className="am-review-value">{college}</span>
                              
                              <span className="am-review-label">Branch</span>
                              <span className="am-review-value">{branch === 'Other' ? customBranch : branch}</span>
                              
                              <span className="am-review-label">Year</span>
                              <span className="am-review-value">{year}</span>
                            </div>
                          </div>

                          {error && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={14} /> {error}</div>}

                          <div className="am-action-row">
                            <button type="button" className="am-outline-btn" onClick={() => setSignupStep(2)}>
                              <ArrowLeft size={18} /> Back
                            </button>
                            <button type="submit" className="am-submit-btn" disabled={loading}>
                              {loading ? <Loader2 className="spinner" size={20} /> : "Create Account"}
                            </button>
                          </div>
                        </>
                      )}
                      
                      {signupStep < 3 && (
                        <p className="am-footer-text" style={{ marginTop: 24 }}>
                          By continuing, you agree to our <button type="button" onClick={() => { setPage("terms"); onClose(); }}>Terms of Service</button> and <button type="button" onClick={() => { setPage("privacy"); onClose(); }}>Privacy Policy</button>
                        </p>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <h2 className="am-title">Reset Password</h2>
                  <p className="am-subtitle">Enter your college email address and we'll send you a password reset link.</p>

                  <div className="am-input-group" style={{ marginTop: 24 }}>
                    <div className="am-input-wrapper">
                      <div className="am-input-icon"><Mail size={20} /></div>
                      <div className="am-input-content">
                        <label className="am-input-label">College Email</label>
                        <input 
                          type="email"
                          className="am-input-field"
                          placeholder="you@yourcollege.edu"
                          value={resetEmail}
                          onChange={e => setResetEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {error && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={14} /> {error}</div>}
                  {successMsg && <div style={{ color: "#10b981", fontSize: 13, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={14} /> {successMsg}</div>}
                  
                  <button type="submit" className="am-submit-btn" disabled={loading}>
                    {loading ? <Loader2 className="spinner" size={20} /> : "Send Reset Link"}
                  </button>

                  <button
                    type="button"
                    className="am-outline-btn"
                    onClick={() => { setTab("login"); setError(""); setSuccessMsg(""); }}
                    style={{ width: "100%", marginTop: 12 }}
                  >
                    Back to Sign In
                  </button>
                </>
              )}
            </form>
          )}

        </div>
        {/* Discard Confirmation Dialog */}
        {showConfirmClose && (
          <div className="am-overlay am-confirm-overlay">
            <div className="am-modal am-confirm-dialog" style={{ maxWidth: 360, textAlign: "center" }}>
              <div style={{ color: "#f59e0b", marginBottom: 16, display: "flex", justifyContent: "center" }}>
                <AlertTriangle size={40} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Discard your signup progress?</h3>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
                You have unsaved information.<br/>Are you sure you want to close?
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="am-outline-btn" onClick={() => setShowConfirmClose(false)} style={{ flex: 1, padding: 0 }}>
                  Continue Editing
                </button>
                <button className="am-submit-btn" onClick={onClose} style={{ flex: 1, marginTop: 0, background: "#ef4444", boxShadow: "none" }}>
                  Discard & Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
