import React, { useState, useEffect, useRef } from "react";
import { doc, updateDoc, addDoc, collection, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../context/ThemeContext";
import { uploadToCloudinary } from "../utils/cloudinary";
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { User, Palette, Bell, Shield, ShoppingCart, Headset, Info, 
  AlertTriangle, Check, RefreshCw, Key, ShieldAlert, Download, 
  LogOut, HelpCircle, ChevronDown, ChevronUp, Loader2
} from "lucide-react";

export default function SettingsPage({ setPage }) {
  const { currentUser, userProfile, fetchProfile, resetPassword } = useAuth();
  const toast = useToast();
  const { themeMode, setThemeMode } = useTheme();
    const isSupport = userProfile?.role === "admin" || userProfile?.role === "System Administrator" || userProfile?.role === "support" || userProfile?.role === "Support Moderator" || userProfile?.permissionLevel >= 1;

  // Account states
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name || "");
  const [college, setCollege] = useState(userProfile?.college || "");
  const [phone, setPhone] = useState(userProfile?.phoneNumber || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(userProfile?.photoURL || "");
  const [savingAccount, setSavingAccount] = useState(false);

  // Sync state when profile changes
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || "");
      setCollege(userProfile.college || "");
      setPhone(userProfile.phoneNumber || "");
      setPhotoPreview(userProfile.photoURL || "");

      // Sync notifications
      setNotifVerify(userProfile.notificationSettings?.verificationUpdates ?? true);
      setNotifWishlist(userProfile.notificationSettings?.wishlistUpdates ?? true);
      setNotifMessages(userProfile.notificationSettings?.messages ?? true);

      // Sync privacy
      setPrivShowCollege(userProfile.privacySettings?.showCollege ?? true);
      setPrivShowVerify(userProfile.privacySettings?.showVerification ?? true);
      setPrivShowPhone(userProfile.privacySettings?.showPhone ?? false);
      setPrivShowEmail(userProfile.privacySettings?.showEmail ?? false);
      setPrivShowOnline(userProfile.privacySettings?.showOnline ?? true);
      setPrivAllowDirectContact(userProfile.privacySettings?.allowDirectContact ?? true);

      // Sync preferences
      setPrefFeed(userProfile.marketplacePreferences?.defaultFeed ?? "All Colleges");
      setPrefView(userProfile.marketplacePreferences?.defaultView ?? "Grid");
      setPrefSort(userProfile.marketplacePreferences?.defaultSort ?? "Newest");
      setPrefCategories(userProfile.marketplacePreferences?.preferredCategories ?? []);
      setPrefBudget(userProfile.marketplacePreferences?.budgetPreference ?? "");
      setPrefShowVerifiedSellersFirst(userProfile.marketplacePreferences?.showVerifiedSellersFirst ?? false);
      setPrefPrioritizeSameCampus(userProfile.marketplacePreferences?.prioritizeSameCampus ?? true);
      setPrefHideSoldListings(userProfile.marketplacePreferences?.hideSoldListings ?? false);
      setPrefRememberFilters(userProfile.marketplacePreferences?.rememberFilters ?? true);

      // Sync AI
      setAiEnabled(userProfile.aiPreferences?.enableAI ?? true);
    }
  }, [userProfile]);

  // Notification toggles
  const [notifVerify, setNotifVerify] = useState(true);
  const [notifWishlist, setNotifWishlist] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);

  // Privacy toggles
  const [privShowCollege, setPrivShowCollege] = useState(true);
  const [privShowVerify, setPrivShowVerify] = useState(true);
  const [privShowPhone, setPrivShowPhone] = useState(false);
  const [privShowEmail, setPrivShowEmail] = useState(false);
  const [privShowOnline, setPrivShowOnline] = useState(true);
  const [privAllowDirectContact, setPrivAllowDirectContact] = useState(true);

  // Preferences
  const [prefFeed, setPrefFeed] = useState("All Colleges");
  const [prefView, setPrefView] = useState("Grid");
  const [prefSort, setPrefSort] = useState("Newest");
  const [prefCategories, setPrefCategories] = useState([]);
  const [prefBudget, setPrefBudget] = useState("");
  const [prefShowVerifiedSellersFirst, setPrefShowVerifiedSellersFirst] = useState(false);
  const [prefPrioritizeSameCampus, setPrefPrioritizeSameCampus] = useState(true);
  const [prefHideSoldListings, setPrefHideSoldListings] = useState(false);
  const [prefRememberFilters, setPrefRememberFilters] = useState(true);

  // AI Preferences
  const [aiEnabled, setAiEnabled] = useState(true);

  // Support inputs
  const [bugDesc, setBugDesc] = useState("");
  const [submittingBug, setSubmittingBug] = useState(false);
  const [feedbackDesc, setFeedbackDesc] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Modal and Accordion states
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); 
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingUser, setDeletingUser] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  // Navigation Scrollspy & Active Tab States
  const [activeSection, setActiveSection] = useState("general");
  const sectionRefs = {
    general: useRef(null),
    appearance: useRef(null),
    notifications: useRef(null),
    privacy: useRef(null),
    marketplace: useRef(null),
    support: useRef(null),
    about: useRef(null),
    advanced: useRef(null),
    security: useRef(null)
  };

  const navItems = [
    { id: "general", label: "General", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "marketplace", label: isSupport ? "Moderation Preferences" : "Marketplace", icon: ShoppingCart },
    { id: "support", label: isSupport ? "Support Tools" : "Support", icon: Headset },
    { id: "about", label: "About", icon: Info },
    { id: "advanced", label: "Advanced", icon: ShieldAlert },
    ...(isSupport ? [{ id: "security", label: "Security", icon: Key }] : [])
  ];

  // Scrollspy logic
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      for (const sectionId of Object.keys(sectionRefs)) {
        const ref = sectionRefs[sectionId].current;
        if (ref) {
          const top = ref.offsetTop;
          const height = ref.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const ref = sectionRefs[id].current;
    if (ref) {
      const offset = ref.offsetTop - 80;
      window.scrollTo({ top: offset, behavior: "smooth" });
      setActiveSection(id);
    }
  };

  // Keyboard Navigation for Sidebar
  const handleSidebarKeyDown = (e, idx) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = (idx + 1) % navItems.length;
      document.getElementById(`nav-btn-${navItems[nextIdx].id}`).focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = (idx - 1 + navItems.length) % navItems.length;
      document.getElementById(`nav-btn-${navItems[prevIdx].id}`).focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      scrollToSection(navItems[idx].id);
    }
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast("Invalid file type. Please upload JPG, PNG, or WEBP only. ❌", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("Profile photo must be under 2MB. ❌", "error");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!name || !String(name).trim()) {
      toast("Name cannot be empty. ❌", "error");
      return;
    }

    setSavingAccount(true);
    try {
      let finalPhotoURL = userProfile?.photoURL || "";
      if (photoFile) {
        finalPhotoURL = await uploadToCloudinary(photoFile, "campusmart/avatars");
      }

      await updateDoc(doc(db, "users", currentUser.uid), {
        name: String(name || "").trim(),
        college: String(college || "").trim(),
        phoneNumber: String(phone || "").trim(),
        photoURL: finalPhotoURL
      });

      await fetchProfile(currentUser.uid);
      setEditing(false);
      setPhotoFile(null);
      toast("Account settings updated successfully! 🎉", "success");
    } catch (err) {
      console.error(err);
      toast(`Failed to update profile: ${err.message || "Unknown error"} ❌`, "error");
    } finally {
      setSavingAccount(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      if (!currentUser?.email) return;
      await resetPassword(currentUser.email);
      toast("Password reset email sent! Check your inbox. 🔑", "success");
    } catch (err) {
      console.error(err);
      toast("Failed to send password reset email. ❌", "error");
    }
  };

  const updateNotificationSetting = async (key, val) => {
    try {
      const current = userProfile?.notificationSettings || {};
      const updated = { ...current, [key]: val };
      await updateDoc(doc(db, "users", currentUser.uid), {
        notificationSettings: updated
      });
      await fetchProfile(currentUser.uid);
    } catch (e) {
      console.error("Error saving notification preference:", e);
    }
  };

  const updatePrivacySetting = async (key, val) => {
    try {
      const current = userProfile?.privacySettings || {};
      const updated = { ...current, [key]: val };
      await updateDoc(doc(db, "users", currentUser.uid), {
        privacySettings: updated
      });
      await fetchProfile(currentUser.uid);
    } catch (e) {
      console.error("Error saving privacy preference:", e);
    }
  };

  const updatePreferenceSetting = async (key, val) => {
    try {
      const current = userProfile?.marketplacePreferences || {};
      const updated = { ...current, [key]: val };
      await updateDoc(doc(db, "users", currentUser.uid), {
        marketplacePreferences: updated
      });
      await fetchProfile(currentUser.uid);
    } catch (e) {
      console.error("Error saving preference:", e);
    }
  };

  const updateAIPerf = async (key, val) => {
    try {
      const current = userProfile?.aiPreferences || {};
      const updated = { ...current, [key]: val };
      await updateDoc(doc(db, "users", currentUser.uid), {
        aiPreferences: updated
      });
      await fetchProfile(currentUser.uid);
    } catch (e) {
      console.error("Error saving AI personalization config:", e);
    }
  };

  const handleCategoryToggle = (category) => {
    let updated;
    if (prefCategories.includes(category)) {
      updated = prefCategories.filter(c => c !== category);
    } else {
      updated = [...prefCategories, category];
    }
    setPrefCategories(updated);
    updatePreferenceSetting("preferredCategories", updated);
  };

  const handleResetPreferences = async () => {
    try {
      const defaults = {
        defaultFeed: "All Colleges",
        defaultView: "Grid",
        defaultSort: "Newest",
        preferredCategories: [],
        budgetPreference: "",
        showVerifiedSellersFirst: false,
        prioritizeSameCampus: true,
        hideSoldListings: false,
        rememberFilters: true
      };
      await updateDoc(doc(db, "users", currentUser.uid), {
        marketplacePreferences: defaults,
        aiPreferences: { enableAI: true }
      });
      await fetchProfile(currentUser.uid);
      setShowResetModal(false);
      toast("Marketplace preferences restored to default! 🔄", "success");
    } catch (e) {
      console.error("Error resetting preferences:", e);
      toast("Failed to reset preferences.", "error");
    }
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      profile: {
        uid: currentUser.uid,
        name: userProfile?.name,
        email: currentUser.email,
        college: userProfile?.college,
        role: userProfile?.role,
        phoneNumber: userProfile?.phoneNumber,
        joinedAt: userProfile?.joinedAt
      },
      settings: {
        notificationSettings: userProfile?.notificationSettings,
        privacySettings: userProfile?.privacySettings,
        marketplacePreferences: userProfile?.marketplacePreferences,
        aiPreferences: userProfile?.aiPreferences
      }
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `campusmart_profile_${currentUser.uid}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast("Profile data exported successfully! 💾", "success");
  };

  const handleReportBug = async (e) => {
    e.preventDefault();
    if (!bugDesc.trim() || bugDesc.length > 1000) return;
    setSubmittingBug(true);
    try {
      await addDoc(collection(db, "bugReports"), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        description: bugDesc.trim(),
        createdAt: serverTimestamp()
      });
      toast("Bug report submitted! Thank you. 🐞", "success");
      setBugDesc("");
    } catch (err) {
      console.error(err);
      toast("Failed to submit bug report. ❌", "error");
    } finally {
      setSubmittingBug(false);
    }
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackDesc.trim() || feedbackDesc.length > 1000) return;
    setSubmittingFeedback(true);
    try {
      await addDoc(collection(db, "feedback"), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        description: feedbackDesc.trim(),
        createdAt: serverTimestamp()
      });
      toast("Feedback sent! We appreciate your support. 💬", "success");
      setFeedbackDesc("");
    } catch (err) {
      console.error(err);
      toast("Failed to send feedback. ❌", "error");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingUser(true);
    try {
      const providerId = currentUser?.providerData[0]?.providerId;
      if (providerId === "password") {
        if (!deletePassword) {
          toast("Please enter your password. ❌", "error");
          setDeletingUser(false);
          return;
        }
        const credential = EmailAuthProvider.credential(currentUser.email, deletePassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      await deleteDoc(doc(db, "users", currentUser.uid));
      await deleteUser(auth.currentUser);
      toast("Your account has been permanently deleted. Goodbye! 👋", "info");
      setDeleteStep(0);
      setPage("home");
    } catch (err) {
      console.error("Error deleting user:", err);
      toast(err?.message || "Failed to delete account. Please verify your password. ❌", "error");
    } finally {
      setDeletingUser(false);
    }
  };

  const FAQS = [
    { q: "How do I list an item for sale/rent?", a: "Click the 'Post Item' button in the navigation bar. Fill in the title, description, category, condition, price, and upload clear photos. You can list items as either For Sale or For Rent." },
    { q: "What is the Verified Student Badge?", a: "The badge (✓ Verified Student) is awarded to users who upload a valid college ID card which is then reviewed and approved by an administrator. This ensures campus safety and genuine trading." },
    { q: "How does the same-campus marker work?", a: "If you browse items posted by students belonging to the same college campus as yours, a '🟢 Same Campus' badge will dynamically show on the listing card to simplify meetups." },
    { q: "Is there any transaction fee on CampusMart?", a: "No! CampusMart is 100% free for students. All transactions are settled directly between buyers and sellers on campus, with no payment gateway charges." },
    { q: "What makes someone a Trusted Seller?", a: "A user is recognized as a '⭐ Trusted Seller' once they complete 3 or more successful transactions that are marked sold or accepted via purchase requests." }
  ];

  return (
    <div className="container settings-page" style={{ padding: "20px 20px 80px", maxWidth: "1050px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <button 
          className="btn btn-ghost" 
          onClick={() => setPage("home")} 
          style={{ padding: "6px 12px", fontSize: "18px" }}
          type="button"
          aria-label="Back to home"
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Account & App Settings</h1>
      </div>

      <div className="settings-container">
        {/* ================= SIDEBAR NAVIGATION ================= */}
        <nav 
          className="settings-sidebar" 
          role="tablist" 
          aria-label="Settings Navigation"
        >
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                className={`settings-nav-btn ${isActive ? "active" : ""}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${item.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => scrollToSection(item.id)}
                onKeyDown={(e) => handleSidebarKeyDown(e, index)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ================= SETTINGS CONTENT ================= */}
        <div className="settings-content">
          
          {/* ================= GENERAL SECTION ================= */}
          <section id="panel-general" ref={sectionRefs.general} className="form-card" style={{ padding: "24px" }} role="tabpanel" aria-labelledby="nav-btn-general">
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--txt)" }}>👤 General Information</h2>
            
            {isSupport ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "50%", overflow: "hidden", background: "var(--light)", border: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShieldAlert size={32} color="var(--p)" />
                  </div>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>CampusMart Support</h3>
                      <span style={{ fontSize: "10px", fontWeight: 700, background: "var(--p)", color: "white", padding: "2px 6px", borderRadius: "12px", letterSpacing: "0.5px" }}>OFFICIAL</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--txt-2)", marginBottom: "2px" }}>{currentUser?.email || "support@campusmart.com"}</div>
                    <div style={{ fontSize: "12px", color: "var(--p)" }}>Role: Support Moderator</div>
                  </div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px", padding: "16px", background: "var(--surface)", borderRadius: "8px", border: "1px solid var(--bdr)" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", rowGap: "4px" }}>
                    <span style={{ color: "var(--txt-2)", fontSize: "13px", width: "150px", flexShrink: 0 }}>Account Status</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--green, #10b981)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--green, #10b981)", display: "inline-block" }}></span> Active
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", rowGap: "4px" }}>
                    <span style={{ color: "var(--txt-2)", fontSize: "13px", width: "150px", flexShrink: 0 }}>Permission Level</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center" }}>Level 2 (Moderator)</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", rowGap: "4px" }}>
                    <span style={{ color: "var(--txt-2)", fontSize: "13px", width: "150px", flexShrink: 0 }}>Joined Date</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center" }}>{userProfile?.joinedAt?.toDate ? userProfile.joinedAt.toDate().toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", rowGap: "4px" }}>
                    <span style={{ color: "var(--txt-2)", fontSize: "13px", width: "150px", flexShrink: 0 }}>Last Login</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center" }}>{currentUser?.metadata?.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleString() : "Just now"}</span>
                  </div>
                </div>
              </div>
            ) : editing ? (
              <form onSubmit={handleSaveAccount}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                  <div style={{ position: "relative", width: "70px", height: "70px", borderRadius: "50%", overflow: "hidden", background: "var(--light)", border: "1px solid var(--bdr)" }}>
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: "24px", color: "var(--txt-2)" }}>
                        {(name || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <label htmlFor="settings-avatar-upload" style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "9px", textAlign: "center", padding: "2px 0", cursor: "pointer" }}>
                      Change
                    </label>
                    <input 
                      id="settings-avatar-upload" 
                      type="file" 
                      accept=".jpg,.jpeg,.png,.webp" 
                      onChange={handlePhotoChange} 
                      style={{ display: "none" }} 
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--txt)" }}>Upload Profile Picture</div>
                    <div style={{ fontSize: "11px", color: "var(--txt-2)" }}>JPG, PNG or WEBP (Max 2MB)</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Full Name</label>
                    <input 
                      className="form-input" 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      required 
                    />
                  </div>
                  {(!userProfile?.permissionLevel || userProfile?.permissionLevel === 0) && (
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>College / Campus</label>
                      <input 
                      className="form-input" 
                      type="text" 
                      value={college} 
                      onChange={e => setCollege(e.target.value)} 
                    />
                  </div>
                  )}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Phone Number</label>
                    <input 
                      className="form-input" 
                      type="tel" 
                      placeholder="e.g. +91 9876543210" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Email Address</label>
                    <input 
                      className="form-input" 
                      type="email" 
                      value={currentUser?.email || ""} 
                      disabled 
                      style={{ opacity: 0.6, cursor: "not-allowed" }}
                    />
                    <small style={{ color: "var(--txt-2)", fontSize: "11px" }}>Email is managed via your college authentication provider.</small>
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                    <button className="btn btn-primary" type="submit" disabled={savingAccount}>
                      {savingAccount ? "Saving..." : "Save Changes"}
                    </button>
                    <button className="btn btn-outline" type="button" onClick={() => { setEditing(false); setPhotoPreview(userProfile?.photoURL || ""); setPhotoFile(null); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "50%", overflow: "hidden", background: "var(--light)", border: "1px solid var(--bdr)" }}>
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: "22px", color: "var(--txt-2)", fontWeight: 700 }}>
                        {(userProfile?.name || currentUser?.displayName || "?")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{userProfile?.name || "Student"}</h3>
                      {(userProfile?.collegeVerified || userProfile?.isVerified) && (
                        <span style={{ fontSize: "12px" }} title="Verified Student">🎓 ✓</span>
                      )}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--txt-2)" }}>{currentUser?.email}</div>
                    {(!userProfile?.permissionLevel || userProfile?.permissionLevel === 0) && (
                      <div style={{ fontSize: "13px", color: "var(--txt-2)" }}>🏫 {userProfile?.college || "No College Linked"}</div>
                    )}
                    {userProfile?.phoneNumber && (
                      <div style={{ fontSize: "13px", color: "var(--txt-2)" }}>📞 {userProfile.phoneNumber}</div>
                    )}
                  </div>
                </div>
                <button className="btn btn-outline" onClick={() => setEditing(true)} style={{ width: "fit-content" }} type="button">
                  ✏️ Edit Profile
                </button>
              </div>
            )}
          </section>

          {/* ================= APPEARANCE SECTION ================= */}
          <section id="panel-appearance" ref={sectionRefs.appearance} className="form-card" style={{ padding: "24px" }} role="tabpanel" aria-labelledby="nav-btn-appearance">
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px", color: "var(--txt)" }}>🎨 Appearance Preference</h2>
            <p style={{ fontSize: "13px", color: "var(--txt-2)", marginBottom: "16px" }}>Choose your theme layout settings.</p>
            
            <div className="appearance-theme-cards" role="radiogroup" aria-label="Theme Selection">
              {[
                { id: "light", label: "☀️ Light Theme" },
                { id: "dark", label: "🌙 Dark Theme" },
                { id: "system", label: "💻 System Default" }
              ].map(opt => {
                const isActive = themeMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={`theme-radio-card ${isActive ? "active" : ""}`}
                    onClick={() => setThemeMode(opt.id)}
                  >
                    <span>{opt.label}</span>
                    {isActive && <Check size={16} style={{ color: "var(--p)" }} />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ================= NOTIFICATIONS SECTION ================= */}
          <section id="panel-notifications" ref={sectionRefs.notifications} className="form-card" style={{ padding: "24px" }} role="tabpanel" aria-labelledby="nav-btn-notifications">
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--txt)" }}>🔔 Notifications Settings</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {(isSupport ? [
                { id: "sup_ticket", label: "New Support Ticket", desc: "Get notified when a new student ticket is created.", value: notifVerify, setter: setNotifVerify, key: "sup_ticket" },
                { id: "sup_report", label: "New Seller Report", desc: "Get notified for new moderation reports on sellers.", value: notifWishlist, setter: setNotifWishlist, key: "sup_report" },
                { id: "sup_bug", label: "New Bug Report", desc: "Get notified when a bug report is filed.", value: notifMessages, setter: setNotifMessages, key: "sup_bug" },
                { id: "sup_feat", label: "New Feature Request", desc: "Get notified for feature requests.", value: notifVerify, setter: setNotifVerify, key: "sup_feat" },
                { id: "sup_high", label: "High Priority Ticket", desc: "Immediate alert for critical user issues.", value: notifWishlist, setter: setNotifWishlist, key: "sup_high" },
                { id: "sup_esc", label: "Escalated Ticket", desc: "Alert for tickets escalated by other moderators.", value: notifMessages, setter: setNotifMessages, key: "sup_esc" },
                { id: "sup_mod", label: "Marketplace Moderation Alert", desc: "System alerts regarding suspicious listings.", value: notifVerify, setter: setNotifVerify, key: "sup_mod" },
                { id: "sup_sec", label: "Security Alert", desc: "Critical system security and login alerts.", value: notifWishlist, setter: setNotifWishlist, key: "sup_sec" },
                { id: "sup_maint", label: "System Maintenance Notification", desc: "Scheduled downtime and deployment alerts.", value: notifMessages, setter: setNotifMessages, key: "sup_maint" }
              ] : [
                { id: "wishlist", label: "Wishlist Updates", desc: "Receive immediate updates when saved listings drop in price.", value: notifWishlist, setter: setNotifWishlist, key: "wishlistUpdates" },
                { id: "messages", label: "Messages & Chats", desc: "Get notified when sellers or buyers text you regarding active listings.", value: notifMessages, setter: setNotifMessages, key: "messages" },
                { id: "verify", label: "Student Verification Updates", desc: "Stay informed about your college ID verification approval updates.", value: notifVerify, setter: setNotifVerify, key: "verificationUpdates" }
              ]).map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--bdr)" }}>
                  <div>
                    <div style={{ fontWeight: 650, fontSize: "14px", color: "var(--txt)" }}>{item.label}</div>
                    <div style={{ fontSize: "12px", color: "var(--txt-2)" }}>{item.desc}</div>
                  </div>
                  <label className="switch" style={{ position: "relative", display: "inline-block", width: "42px", height: "24px" }}>
                    <input 
                      type="checkbox" 
                      checked={item.value} 
                      onChange={e => {
                        const val = e.target.checked;
                        item.setter(val);
                        updateNotificationSetting(item.key, val);
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span className={`slider ${item.value ? "active" : ""}`} style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, background: item.value ? "var(--p)" : "var(--bdr-2)", transition: ".2s", borderRadius: "24px" }}>
                      <span style={{ position: "absolute", content: "", height: "16px", width: "16px", left: item.value ? "20px" : "4px", bottom: "4px", background: "white", transition: ".2s", borderRadius: "50%" }}></span>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* ================= PRIVACY SECTION ================= */}
          <section id="panel-privacy" ref={sectionRefs.privacy} className="form-card" style={{ padding: "24px" }} role="tabpanel" aria-labelledby="nav-btn-privacy">
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--txt)" }}>🔒 Privacy Settings</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {(isSupport ? [
                { id: "priv_onl", label: "Show Online Status", desc: "Display your online presence to other moderators.", value: privShowOnline, setter: setPrivShowOnline, key: "showOnline" },
                { id: "priv_bdg", label: "Display Moderator Badge", desc: "Show your official moderator badge in internal interactions.", value: privShowVerify, setter: setPrivShowVerify, key: "showVerification" },
                { id: "priv_cnt", label: "Allow Internal Contact Visibility", desc: "Let other admins see your registered email address.", value: privShowEmail, setter: setPrivShowEmail, key: "showEmail" },
                { id: "priv_ses", label: "Session Privacy", desc: "Hide your active session locations from non-admins.", value: privShowCollege, setter: setPrivShowCollege, key: "showCollege" },
                { id: "priv_act", label: "Login Activity Visibility", desc: "Allow team leads to view your login history.", value: privAllowDirectContact, setter: setPrivAllowDirectContact, key: "allowDirectContact" }
              ] : [
                { id: "showCollege", label: "Display College Publicly", desc: "Allow listings and chat profiles to show your verified campus affiliation.", value: privShowCollege, setter: setPrivShowCollege, key: "showCollege" },
                { id: "showVerify", label: "Display Verification Status Badge", desc: "Show your student validation badge checkmark alongside search cards.", value: privShowVerify, setter: setPrivShowVerify, key: "showVerification" },
                { id: "showPhone", label: "Expose Mobile Number", desc: "Expose your contact number in active chats or purchase approvals.", value: privShowPhone, setter: setPrivShowPhone, key: "showPhone" },
                { id: "showEmail", label: "Expose Email Address", desc: "Make your email address available to buyers once an offer is accepted.", value: privShowEmail, setter: setPrivShowEmail, key: "showEmail" },
                { id: "showOnline", label: "Show Online Presence Indicators", desc: "Show a green online status dot when active on the platform.", value: privShowOnline, setter: setPrivShowOnline, key: "showOnline" },
                { id: "allowDirectContact", label: "Accept Direct Info Requests", desc: "Allow buyers to send immediate contact details via purchase approvals.", value: privAllowDirectContact, setter: setPrivAllowDirectContact, key: "allowDirectContact" }
              ]).map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--bdr)" }}>
                  <div>
                    <div style={{ fontWeight: 650, fontSize: "14px", color: "var(--txt)" }}>{item.label}</div>
                    <div style={{ fontSize: "12px", color: "var(--txt-2)" }}>{item.desc}</div>
                  </div>
                  <label className="switch" style={{ position: "relative", display: "inline-block", width: "42px", height: "24px" }}>
                    <input 
                      type="checkbox" 
                      checked={item.value} 
                      onChange={e => {
                        const val = e.target.checked;
                        item.setter(val);
                        updatePrivacySetting(item.key, val);
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span className={`slider ${item.value ? "active" : ""}`} style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, background: item.value ? "var(--p)" : "var(--bdr-2)", transition: ".2s", borderRadius: "24px" }}>
                      <span style={{ position: "absolute", content: "", height: "16px", width: "16px", left: item.value ? "20px" : "4px", bottom: "4px", background: "white", transition: ".2s", borderRadius: "50%" }}></span>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* ================= MARKETPLACE PREFERENCES ================= */}
          <section id="panel-marketplace" ref={sectionRefs.marketplace} className="form-card" style={{ padding: "24px" }} role="tabpanel" aria-labelledby="nav-btn-marketplace">
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--txt)" }}>
              {isSupport ? "🛡️ Moderation Preferences" : "🛒 Marketplace Feed Preferences"}
            </h2>
            
            {isSupport ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Review Queue Sorting</label>
                  <select className="form-input">
                    <option>Show unresolved reports first</option>
                    <option>Show oldest tickets first</option>
                  </select>
                </div>
                
                {[
                  { label: "Auto-refresh moderation queue", desc: "Automatically fetch new reports in real-time." },
                  { label: "Highlight urgent reports", desc: "Apply visual indicators for high priority items." },
                  { label: "Confirmation before closing tickets", desc: "Require an extra click before a ticket is closed." },
                  { label: "Confirmation before rejecting reports", desc: "Require an extra click before discarding a report." },
                  { label: "Show flagged listings first", desc: "Prioritize reported items in feed." },
                  { label: "Highlight repeat offenders", desc: "Add visual markers for users with multiple reports." },
                  { label: "Collapse resolved reports", desc: "Hide resolved items to save space." }
                ].map((opt, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", paddingTop: "14px", borderTop: "1px solid var(--bdr)" }}>
                    <div>
                      <div style={{ fontWeight: 650, fontSize: "14px", color: "var(--txt)" }}>{opt.label}</div>
                      <div style={{ fontSize: "12px", color: "var(--txt-2)" }}>{opt.desc}</div>
                    </div>
                    <label className="switch" style={{ position: "relative", display: "inline-block", width: "42px", height: "24px" }}>
                      <input type="checkbox" defaultChecked={true} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span className="slider active" style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, background: "var(--p)", transition: ".2s", borderRadius: "24px" }}>
                        <span style={{ position: "absolute", content: "", height: "16px", width: "16px", left: "20px", bottom: "4px", background: "white", transition: ".2s", borderRadius: "50%" }}></span>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Default Feed Affiliation</label>
                    <select 
                      className="form-input" 
                      value={prefFeed} 
                      onChange={e => {
                        const val = e.target.value;
                    setPrefFeed(val);
                    updatePreferenceSetting("defaultFeed", val);
                  }}
                >
                  <option value="My College">My College Network</option>
                  <option value="Nearby Colleges">Nearby Colleges</option>
                  <option value="All Colleges">All College Networks</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Default Layout Style</label>
                <select 
                  className="form-input" 
                  value={prefView} 
                  onChange={e => {
                    const val = e.target.value;
                    setPrefView(val);
                    updatePreferenceSetting("defaultView", val);
                  }}
                >
                  <option value="Grid">Grid Cards</option>
                  <option value="List">List Rows</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Default Feed Sorting</label>
                <select 
                  className="form-input" 
                  value={prefSort} 
                  onChange={e => {
                    const val = e.target.value;
                    setPrefSort(val);
                    updatePreferenceSetting("defaultSort", val);
                  }}
                >
                  <option value="Newest">Newest Listed First</option>
                  <option value="Price Low → High">Price: Low to High</option>
                  <option value="Price High → Low">Price: High to Low</option>
                  <option value="Most Viewed">Most Popular</option>
                  <option value="Most Wishlisted">Most Wishlisted</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Preferred Categories</label>
                <div className="categories-preference-grid">
                  {["Books", "Electronics", "Furniture", "Notes", "Sports", "Cycles", "Lab Equipment"].map(cat => {
                    const active = prefCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`category-checkbox-card ${active ? "active" : ""}`}
                        onClick={() => handleCategoryToggle(cat)}
                      >
                        {active ? "✓ " : ""} {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Default Budget Selection Range</label>
                <div className="budget-preference-grid" role="radiogroup" aria-label="Budget Range Preference">
                  {["₹0–500", "₹500–1000", "₹1000–3000", "₹3000+"].map(range => {
                    const active = prefBudget === range;
                    return (
                      <button
                        key={range}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`budget-radio-card ${active ? "active" : ""}`}
                        onClick={() => {
                          const val = active ? "" : range;
                          setPrefBudget(val);
                          updatePreferenceSetting("budgetPreference", val);
                        }}
                      >
                        {range}
                      </button>
                    );
                  })}
                </div>
              </div>

              {[
                { label: "Show Verified Sellers First", desc: "Always prioritize items posted by college-verified users.", value: prefShowVerifiedSellersFirst, setter: setPrefShowVerifiedSellersFirst, key: "showVerifiedSellersFirst" },
                { label: "Prioritize Same Campus Listings", desc: "Prioritize showing items physically on your campus layout first.", value: prefPrioritizeSameCampus, setter: setPrefPrioritizeSameCampus, key: "prioritizeSameCampus" },
                { label: "Hide Sold Listings", desc: "Automatically filter out items marked sold from current feed searches.", value: prefHideSoldListings, setter: setPrefHideSoldListings, key: "hideSoldListings" },
                { label: "Remember Active Search Filters", desc: "Keep search keywords, category filters, and conditions active across pages.", value: prefRememberFilters, setter: setPrefRememberFilters, key: "rememberFilters" }
              ].map(opt => (
                <div key={opt.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", paddingTop: "14px", borderTop: "1px solid var(--bdr)" }}>
                  <div>
                    <div style={{ fontWeight: 650, fontSize: "14px", color: "var(--txt)" }}>{opt.label}</div>
                    <div style={{ fontSize: "12px", color: "var(--txt-2)" }}>{opt.desc}</div>
                  </div>
                  <label className="switch" style={{ position: "relative", display: "inline-block", width: "42px", height: "24px" }}>
                    <input 
                      type="checkbox" 
                      checked={opt.value} 
                      onChange={e => {
                        const val = e.target.checked;
                        opt.setter(val);
                        updatePreferenceSetting(opt.key, val);
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span className={`slider ${opt.value ? "active" : ""}`} style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, background: opt.value ? "var(--p)" : "var(--bdr-2)", transition: ".2s", borderRadius: "24px" }}>
                      <span style={{ position: "absolute", content: "", height: "16px", width: "16px", left: opt.value ? "20px" : "4px", bottom: "4px", background: "white", transition: ".2s", borderRadius: "50%" }}></span>
                    </span>
                  </label>
                </div>
              ))}

              <div style={{ paddingTop: "16px", borderTop: "1.5px solid var(--bdr)" }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setShowResetModal(true)}
                  style={{ gap: "6px", width: "fit-content" }}
                >
                  <RefreshCw size={14} /> Reset Feed Preferences
                </button>
              </div>
            </div>

            {/* CampusMart AI Personalization */}
            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1.5px solid var(--bdr)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>🤖 CampusMart AI Personalization</h3>
                  <p style={{ fontSize: "12px", color: "var(--txt-2)", margin: "4px 0 0" }}>Auto-sort recommendations based on browsing history, wishlist trends, recently viewed, and same campus purchases.</p>
                </div>
                <label className="switch" style={{ position: "relative", display: "inline-block", width: "42px", height: "24px" }}>
                  <input 
                    type="checkbox" 
                    checked={aiEnabled} 
                    onChange={e => {
                      const val = e.target.checked;
                      setAiEnabled(val);
                      updateAIPerf("enableAI", val);
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className={`slider ${aiEnabled ? "active" : ""}`} style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, background: aiEnabled ? "var(--p)" : "var(--bdr-2)", transition: ".2s", borderRadius: "24px" }}>
                    <span style={{ position: "absolute", content: "", height: "16px", width: "16px", left: aiEnabled ? "20px" : "4px", bottom: "4px", background: "white", transition: ".2s", borderRadius: "50%" }}></span>
                  </span>
                </label>
              </div>
              <small style={{ display: "block", color: "var(--txt-2)", fontSize: "11px", background: "var(--light)", padding: "10px", borderRadius: "6px", border: "1px solid var(--bdr)" }}>
                AI prioritizes rank positioning of listings matching your interests without hiding any regular results. Same department ranking will automatically apply.
              </small>
            </div>
              </>
            )}
          </section>

          {/* ================= SUPPORT SECTION ================= */}
          <section id="panel-support" ref={sectionRefs.support} className="form-card" style={{ padding: "24px" }} role="tabpanel" aria-labelledby="nav-btn-support">
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--txt)" }}>🛠️ {isSupport ? "Support Tools" : "Support & Assistance"}</h2>
            
            {isSupport ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  "Internal Knowledge Base", "Moderator Guidelines", "Escalation Handbook", 
                  "Contact System Administrator", "Platform Status", "Incident Dashboard", 
                  "API Health Monitor", "Internal Documentation"
                ].map(tool => (
                  <button key={tool} className="btn btn-outline" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "not-allowed", opacity: 0.8 }} disabled type="button">
                    <span>{tool}</span>
                    <span style={{ fontSize: "11px", color: "var(--txt-2)", background: "var(--light)", padding: "2px 6px", borderRadius: "4px" }}>Coming Soon</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ padding: "30px 20px", background: "var(--surface)", borderRadius: "16px", border: "1px solid var(--bdr)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <Headset size={40} color="var(--p)" style={{ background: "rgba(var(--p-rgb, 102, 102, 102), 0.1)", padding: "8px", borderRadius: "50%" }} />
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>CampusMart Help Center</h3>
                <p style={{ fontSize: "14px", color: "var(--txt-2)", maxWidth: "400px", margin: "0 0 8px 0" }}>
                  Visit our dedicated support portal to search FAQs, submit support tickets, report bugs, or suggest features.
                </p>
                <button className="btn btn-primary" onClick={() => setPage("contact")} type="button" style={{ padding: "10px 24px", borderRadius: "8px" }}>
                  Go to Help Center
                </button>
              </div>
            )}
          </section>

          {/* ================= ABOUT SECTION ================= */}
          <section id="panel-about" ref={sectionRefs.about} className="form-card" style={{ padding: "24px" }} role="tabpanel" aria-labelledby="nav-btn-about">
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "var(--txt)" }}>ℹ️ About</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--bdr)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--txt-2)" }}>App Version</span>
                <span style={{ fontWeight: 600 }}>v2.0.0 (Production Release)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--bdr)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--txt-2)" }}>Build Date</span>
                <span style={{ fontWeight: 600 }}>June 27, 2026</span>
              </div>
              {isSupport && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--bdr)", paddingBottom: "8px" }}>
                    <span style={{ color: "var(--txt-2)" }}>Frontend Version</span>
                    <span style={{ fontWeight: 600 }}>React 18.2</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--bdr)", paddingBottom: "8px" }}>
                    <span style={{ color: "var(--txt-2)" }}>Firebase Version</span>
                    <span style={{ fontWeight: 600 }}>10.12</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--bdr)", paddingBottom: "8px" }}>
                    <span style={{ color: "var(--txt-2)" }}>Environment</span>
                    <span style={{ fontWeight: 600 }}>Production</span>
                  </div>
                </>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--bdr)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--txt-2)" }}>Privacy Policy</span>
                <button className="btn btn-ghost btn-xs" onClick={() => setPage("privacy")} style={{ color: "var(--p)", padding: 0 }} type="button">View Document</button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--bdr)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--txt-2)" }}>Terms of Service</span>
                <button className="btn btn-ghost btn-xs" onClick={() => setPage("terms")} style={{ color: "var(--p)", padding: 0 }} type="button">View Document</button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--txt-2)" }}>Open Source Licenses</span>
                <button className="btn btn-ghost btn-xs" onClick={() => setShowLicenseModal(true)} style={{ color: "var(--p)", padding: 0 }} type="button">View Credits</button>
              </div>
            </div>
          </section>

          {/* ================= ADVANCED SECTION ================= */}
          <section id="panel-advanced" ref={sectionRefs.advanced} className="form-card" style={{ padding: "24px", border: "1.5px solid rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.01)" }} role="tabpanel" aria-labelledby="nav-btn-advanced">
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "var(--red)" }}>⚙️ Advanced Actions</h2>
            <p style={{ fontSize: "13px", color: "var(--txt-2)", marginBottom: "16px" }}>Manage credentials, export data, or de-register your account profile.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--bdr)" }}>
                <div>
                  <div style={{ fontWeight: 650, fontSize: "14px", color: "var(--txt)" }}>Change Account Password</div>
                  <div style={{ fontSize: "12px", color: "var(--txt-2)" }}>Send a secure password reset link to your email address.</div>
                </div>
                <button className="btn btn-outline btn-sm" type="button" onClick={handlePasswordReset}>
                  <Key size={14} style={{ marginRight: "6px" }} /> Reset Password
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--bdr)" }}>
                <div>
                  <div style={{ fontWeight: 650, fontSize: "14px", color: "var(--txt)" }}>Export Profile Data</div>
                  <div style={{ fontSize: "12px", color: "var(--txt-2)" }}>Download a copy of your personal settings, listings, and profile metadata.</div>
                </div>
                <button className="btn btn-outline btn-sm" type="button" onClick={handleExportData}>
                  <Download size={14} style={{ marginRight: "6px" }} /> Export JSON
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", paddingBottom: !isSupport ? "12px" : "0", borderBottom: !isSupport ? "1px solid var(--bdr)" : "none" }}>
                <div>
                  <div style={{ fontWeight: 650, fontSize: "14px", color: "var(--txt)" }}>Deactivate Profile</div>
                  <div style={{ fontSize: "12px", color: "var(--txt-2)" }}>Temporarily hide all listed marketplace ads until your next log in.</div>
                </div>
                <button className="btn btn-outline btn-sm" type="button" onClick={() => setShowDeactivateModal(true)}>
                  <LogOut size={14} style={{ marginRight: "6px" }} /> Deactivate Account
                </button>
              </div>

              {!isSupport && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <div>
                    <div style={{ fontWeight: 650, fontSize: "14px", color: "var(--txt)" }}>Permanently Erase Profile</div>
                    <div style={{ fontSize: "12px", color: "var(--red)" }}>Irreversibly delete all your student data and listings from CampusMart.</div>
                  </div>
                  <button className="btn btn-danger btn-sm" type="button" onClick={() => setDeleteStep(1)}>
                    <AlertTriangle size={14} style={{ marginRight: "6px" }} /> Delete Profile
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ================= SECURITY SECTION ================= */}
          {isSupport && (
            <section id="panel-security" ref={sectionRefs.security} className="form-card" style={{ padding: "24px" }} role="tabpanel" aria-labelledby="nav-btn-security">
              <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--txt)" }}>🔒 Security Center</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  { label: "Active Sessions", value: "1 (This device)" },
                  { label: "Last Login", value: currentUser?.metadata?.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleString() : "Just now" },
                  { label: "Last Password Change", value: "30 days ago" },
                  { label: "Two-Factor Authentication", value: "Disabled", isBtn: true, btnText: "Enable 2FA" },
                  { label: "Trusted Devices", value: "View List", isBtn: true, btnText: "Manage Devices" },
                  { label: "Login History", value: "View Log", isBtn: true, btnText: "View Activity" }
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < 5 ? "1px solid var(--bdr)" : "none", paddingBottom: i < 5 ? "12px" : "0" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--txt)" }}>{item.label}</span>
                    {item.isBtn ? (
                      <button className="btn btn-outline btn-sm" disabled type="button" style={{ opacity: 0.7, cursor: "not-allowed" }}>{item.btnText}</button>
                    ) : (
                      <span style={{ fontSize: "14px", color: "var(--txt-2)" }}>{item.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* ================= RESET PREFERENCES CONFIRM MODAL ================= */}
      {showResetModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(2px)" }}>
          <div className="modal" style={{ width: "100%", maxWidth: "400px", padding: "24px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--bdr)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--txt)", marginBottom: "10px" }}>Reset Preferences?</h3>
            <p style={{ fontSize: "14px", color: "var(--txt-2)", lineHeight: "1.5", marginBottom: "20px" }}>
              Are you sure you want to revert all your default feed layouts, sorting styles, budget parameters, and category preferences back to baseline values?
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setShowResetModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleResetPreferences}>Reset to Defaults</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DEACTIVATE CONFIRM MODAL ================= */}
      {showDeactivateModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(2px)" }}>
          <div className="modal" style={{ width: "100%", maxWidth: "450px", padding: "24px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--bdr)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--txt)", marginBottom: "10px" }}>Deactivate Account?</h3>
            <p style={{ fontSize: "14px", color: "var(--txt-2)", lineHeight: "1.5", marginBottom: "20px" }}>
              Deactivating your account will temporarily hide your profile and all active listings from the campus feed. You can reactivate your account at any time by logging back in.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setShowDeactivateModal(false)}>Cancel</button>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  setShowDeactivateModal(false);
                  toast("Account successfully deactivated! 🔒", "info");
                  setPage("home");
                }}
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 4-STEP DELETE FLOW MODAL ================= */}
      {deleteStep > 0 && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}>
          <div className="modal" style={{ width: "100%", maxWidth: "450px", padding: "28px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--bdr)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--red)", textTransform: "uppercase", background: "rgba(239,68,68,0.1)", padding: "4px 8px", borderRadius: "4px" }}>
                Step {deleteStep} of 4
              </span>
              <button 
                type="button" 
                onClick={() => { setDeleteStep(0); setDeleteConfirmText(""); setDeletePassword(""); }} 
                style={{ background: "transparent", border: "none", fontSize: "16px", cursor: "pointer", color: "var(--txt-2)" }}
              >
                ✕
              </button>
            </div>

            {deleteStep === 1 && (
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--red)", marginBottom: "12px" }}>Delete Account Permanently?</h3>
                <p style={{ fontSize: "14px", color: "var(--txt-2)", lineHeight: "1.6", marginBottom: "24px" }}>
                  This action is irreversible. All your active listings, purchase requests, message history, saved items, and student verification status will be permanently erased.
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button className="btn btn-outline" onClick={() => setDeleteStep(0)}>Cancel</button>
                  <button className="btn btn-danger" onClick={() => setDeleteStep(2)}>I Understand, Proceed</button>
                </div>
              </div>
            )}

            {deleteStep === 2 && (
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--txt)", marginBottom: "12px" }}>Confirm Intention</h3>
                <p style={{ fontSize: "14px", color: "var(--txt-2)", lineHeight: "1.5", marginBottom: "16px" }}>
                  To confirm you wish to delete your account, please type the word <strong style={{ color: "var(--red)" }}>DELETE</strong> in the box below:
                </p>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Type DELETE"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  style={{ marginBottom: "24px" }}
                />
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button className="btn btn-outline" onClick={() => setDeleteStep(1)}>Back</button>
                  <button 
                    className="btn btn-danger" 
                    disabled={deleteConfirmText !== "DELETE"} 
                    onClick={() => {
                      const providerId = currentUser?.providerData[0]?.providerId;
                      if (providerId === "google.com") {
                        setDeleteStep(4);
                      } else {
                        setDeleteStep(3);
                      }
                    }}
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 3 && (
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--txt)", marginBottom: "12px" }}>Verify Password</h3>
                <p style={{ fontSize: "14px", color: "var(--txt-2)", lineHeight: "1.5", marginBottom: "16px" }}>
                  Please enter your password to confirm identity verification:
                </p>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="Enter Password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  style={{ marginBottom: "24px" }}
                />
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button className="btn btn-outline" onClick={() => setDeleteStep(2)}>Back</button>
                  <button className="btn btn-danger" disabled={!deletePassword} onClick={() => setDeleteStep(4)}>Verify & Continue</button>
                </div>
              </div>
            )}

            {deleteStep === 4 && (
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--red)", marginBottom: "12px" }}>⚠️ Final Confirmation</h3>
                <p style={{ fontSize: "14px", color: "var(--txt-2)", lineHeight: "1.6", marginBottom: "24px" }}>
                  This is the last step. Once you confirm, your account will be immediately deleted and you will be signed out.
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button className="btn btn-outline" onClick={() => {
                    const providerId = currentUser?.providerData[0]?.providerId;
                    if (providerId === "google.com") {
                      setDeleteStep(2);
                    } else {
                      setDeleteStep(3);
                    }
                  }}>Back</button>
                  <button className="btn btn-danger" onClick={handleDeleteAccount} disabled={deletingUser}>
                    {deletingUser ? "Deleting Account..." : "Permanently Delete Account 👋"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ================= OPEN SOURCE CREDITS MODAL ================= */}
      {showLicenseModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(2px)" }}>
          <div className="modal" style={{ width: "100%", maxWidth: "500px", padding: "24px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--bdr)", maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--txt)", marginBottom: "12px" }}>Open Source Licenses</h3>
            <p style={{ fontSize: "13px", color: "var(--txt-2)", lineHeight: "1.5", marginBottom: "16px" }}>
              CampusMart is built using the following open source software libraries:
            </p>
            <div style={{ fontSize: "12px", color: "var(--txt-2)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <strong>React & React DOM (MIT License)</strong>
                <p style={{ margin: "2px 0 0" }}>Copyright (c) Meta Platforms, Inc. and affiliates.</p>
              </div>
              <div>
                <strong>Firebase SDK (Apache 2.0 License)</strong>
                <p style={{ margin: "2px 0 0" }}>Copyright 2026 Google LLC. Licensed under Apache 2.0.</p>
              </div>
              <div>
                <strong>Lucide React (ISC License)</strong>
                <p style={{ margin: "2px 0 0" }}>Copyright (c) Lucide Contributors.</p>
              </div>
              <div>
                <strong>Vite (MIT License)</strong>
                <p style={{ margin: "2px 0 0" }}>Copyright (c) Yuxi (Evan) You and Vite Contributors.</p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button className="btn btn-outline" onClick={() => setShowLicenseModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
