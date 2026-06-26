import React, { useState, useEffect } from "react";
import { doc, updateDoc, addDoc, collection, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../context/ThemeContext";
import { uploadToCloudinary } from "../utils/cloudinary";
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

export default function SettingsPage({ setPage }) {
  const { currentUser, userProfile, fetchProfile, resetPassword } = useAuth();
  const toast = useToast();
  const { themeMode, setThemeMode } = useTheme();

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
      setPrefShowVerifiedSellersFirst(userProfile.marketplacePreferences?.showVerifiedSellersFirst ?? false);
    }
  }, [userProfile]);

  // Notification toggles
  const [notifVerify, setNotifVerify] = useState(
    userProfile?.notificationSettings?.verificationUpdates ?? true
  );
  const [notifWishlist, setNotifWishlist] = useState(
    userProfile?.notificationSettings?.wishlistUpdates ?? true
  );
  const [notifMessages, setNotifMessages] = useState(
    userProfile?.notificationSettings?.messages ?? true
  );

  // Privacy toggles
  const [privShowCollege, setPrivShowCollege] = useState(
    userProfile?.privacySettings?.showCollege ?? true
  );
  const [privShowVerify, setPrivShowVerify] = useState(
    userProfile?.privacySettings?.showVerification ?? true
  );
  const [privShowPhone, setPrivShowPhone] = useState(
    userProfile?.privacySettings?.showPhone ?? false
  );
  const [privShowEmail, setPrivShowEmail] = useState(
    userProfile?.privacySettings?.showEmail ?? false
  );
  const [privShowOnline, setPrivShowOnline] = useState(
    userProfile?.privacySettings?.showOnline ?? true
  );
  const [privAllowDirectContact, setPrivAllowDirectContact] = useState(
    userProfile?.privacySettings?.allowDirectContact ?? true
  );

  // Preferences
  const [prefFeed, setPrefFeed] = useState(
    userProfile?.marketplacePreferences?.defaultFeed ?? "All Colleges"
  );
  const [prefView, setPrefView] = useState(
    userProfile?.marketplacePreferences?.defaultView ?? "Grid"
  );
  const [prefShowVerifiedSellersFirst, setPrefShowVerifiedSellersFirst] = useState(
    userProfile?.marketplacePreferences?.showVerifiedSellersFirst ?? false
  );

  // Support inputs
  const [bugDesc, setBugDesc] = useState("");
  const [submittingBug, setSubmittingBug] = useState(false);
  const [feedbackDesc, setFeedbackDesc] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Modal and Accordion states for Danger Zone and confirmation
  const [advancedActionsExpanded, setAdvancedActionsExpanded] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0 means closed, 1-4 for multi-step delete
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingUser, setDeletingUser] = useState(false);

  // Accordion state for FAQ
  const [openFaq, setOpenFaq] = useState(null);

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

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
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
      toast("Account settings updated successfully!", "success");
    } catch (err) {
      console.error(err);
      toast(`Failed to update profile: ${err.message || "Unknown error"}`, "error");
    } finally {
      setSavingAccount(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      if (!currentUser?.email) return;
      await resetPassword(currentUser.email);
      toast("Password reset email sent! Check your inbox.", "success");
    } catch (err) {
      console.error(err);
      toast("Failed to send password reset email.", "error");
    }
  };

  // Sync Notification updates to Firebase
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

  // Sync Privacy updates to Firebase
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

  // Sync Preferences updates to Firebase
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

  const handleReportBug = async (e) => {
    e.preventDefault();
    if (!bugDesc.trim()) return;
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
    if (!feedbackDesc.trim()) return;
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

  const FAQS = [
    { q: "How do I list an item for sale/rent?", a: "Click the 'Post Item' button in the navigation bar. Fill in the title, description, category, condition, price, and upload clear photos. You can list items as either For Sale or For Rent." },
    { q: "What is the Verified Student Badge?", a: "The badge (✓ Verified Student) is awarded to users who upload a valid college ID card which is then reviewed and approved by an administrator. This ensures campus safety and genuine trading." },
    { q: "How does the same-campus marker work?", a: "If you browse items posted by students belonging to the same college campus as yours, a '🟢 Same Campus' badge will dynamically show on the listing card to simplify meetups." },
    { q: "Is there any transaction fee on CampusMart?", a: "No! CampusMart is 100% free for students. All transactions are settled directly between buyers and sellers on campus, with no payment gateway charges." },
    { q: "What makes someone a Trusted Seller?", a: "A user is recognized as a '⭐ Trusted Seller' once they complete 3 or more successful transactions that are marked sold or accepted via purchase requests." }
  ];

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
      
      // Delete user profile in Firestore
      await deleteDoc(doc(db, "users", currentUser.uid));
      
      // Delete Auth user
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

  return (
    <div className="container settings-page" style={{ padding: "30px 20px 80px", maxWidth: "800px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <button 
          className="btn btn-ghost" 
          onClick={() => setPage("home")} 
          style={{ padding: "6px 10px", fontSize: "18px" }}
          type="button"
          aria-label="Back to home"
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Account & App Settings</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* ================= ACCOUNT SECTION ================= */}
        <section className="form-card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--txt)" }}>👤 Account Information</h2>
          
          {editing ? (
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
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--txt)" }}>Upload Profile Picture</div>
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
                {(!userProfile?.role || userProfile?.role === "user") && (
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
                  <small style={{ color: "var(--txt-2)", fontSize: "11px" }}>Email is managed via Authentication provider and cannot be changed.</small>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button className="btn btn-primary" type="submit" disabled={savingAccount}>
                    {savingAccount ? "Saving..." : "Save Changes"}
                  </button>
                  <button className="btn btn-outline" type="button" onClick={() => { setEditing(false); setPhotoPreview(userProfile?.photoURL || ""); setPhotoFile(null); }}>
                    Cancel
                  </button>
                </div>
                <div style={{ marginTop: "16px", padding: "16px", background: "var(--light)", borderRadius: "8px", border: "1px solid var(--bdr)" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "var(--txt)" }}>Security</h3>
                  <p style={{ fontSize: "12px", color: "var(--txt-2)", marginBottom: "12px" }}>We will send a secure password reset link to your registered email address.</p>
                  <button type="button" className="btn btn-outline btn-sm" onClick={handlePasswordReset}>
                    Reset Password
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", overflow: "hidden", background: "var(--light)", border: "1px solid var(--bdr)" }}>
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: "22px", color: "var(--txt-2)", fontWeight: 700 }}>
                      {(userProfile?.name || currentUser?.displayName || "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{userProfile?.name || "Student"}</h3>
                    {(userProfile?.collegeVerified || userProfile?.isVerified) && (
                      <span style={{ fontSize: "12px" }}>🎓 ✓</span>
                    )}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--txt-2)" }}>{currentUser?.email}</div>
                  {(!userProfile?.role || userProfile?.role === "user") && (
                    <div style={{ fontSize: "13px", color: "var(--txt-2)" }}>{userProfile?.college || "No College Linked"}</div>
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
        <section className="form-card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px", color: "var(--txt)" }}>🎨 Appearance</h2>
          <p style={{ fontSize: "13px", color: "var(--txt-2)", marginBottom: "16px" }}>Customize your display theme preferences</p>
          
          <div className="settings-theme-grid">
            {[
              { id: "light", label: "☀️ Light Mode" },
              { id: "dark", label: "🌙 Dark Mode" },
              { id: "system", label: "💻 System Theme" }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`btn ${themeMode === opt.id ? "btn-primary" : "btn-outline"}`}
                onClick={() => setThemeMode(opt.id)}
                style={{ justifyContent: "center", padding: "12px", fontSize: "13px" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* ================= NOTIFICATIONS SECTION ================= */}
        <section className="form-card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--txt)" }}>🔔 Notifications Settings</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { id: "wishlist", label: "Wishlist Updates", desc: "Receive alerts when an item in your wishlist drops in price.", value: notifWishlist, setter: setNotifWishlist, key: "wishlistUpdates" },
              { id: "messages", label: "Messages", desc: "Get notified when other users send you message requests or offers.", value: notifMessages, setter: setNotifMessages, key: "messages" },
              { id: "verify", label: "Verification Updates", desc: "Get notified when your student verification request status changes.", value: notifVerify, setter: setNotifVerify, key: "verificationUpdates" }
            ].map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--bdr)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--txt)" }}>{item.label}</div>
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
        <section className="form-card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--txt)" }}>🔒 Privacy Options</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { id: "showCollege", label: "Show College Publicly", desc: "Allow other campus members to see which college/campus you attend.", value: privShowCollege, setter: setPrivShowCollege, key: "showCollege" },
              { id: "showVerify", label: "Show Verification Badge", desc: "Display your graduation cap verification icon beside listings.", value: privShowVerify, setter: setPrivShowVerify, key: "showVerification" },
              { id: "showPhone", label: "Show Phone Number", desc: "Expose your contact number in active chats or purchase approvals.", value: privShowPhone, setter: setPrivShowPhone, key: "showPhone" },
              { id: "showEmail", label: "Show Email Address", desc: "Display your email on active user listing detail fields.", value: privShowEmail, setter: setPrivShowEmail, key: "showEmail" },
              { id: "showOnline", label: "Show Online Status", desc: "Show a green online dot to other students when you are active.", value: privShowOnline, setter: setPrivShowOnline, key: "showOnline" },
              { id: "allowDirectContact", label: "Allow Direct Contact Requests", desc: "Allow buyers to send immediate contact details via purchase approvals.", value: privAllowDirectContact, setter: setPrivAllowDirectContact, key: "allowDirectContact" }
            ].map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--bdr)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--txt)" }}>{item.label}</div>
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

        {/* ================= MARKETPLACE SECTION ================= */}
        <section className="form-card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--txt)" }}>🛒 Marketplace Feed Preferences</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Default Feed</label>
              <select 
                className="form-input" 
                value={prefFeed} 
                onChange={e => {
                  const val = e.target.value;
                  setPrefFeed(val);
                  updatePreferenceSetting("defaultFeed", val);
                }}
              >
                <option value="My College">My College</option>
                <option value="All Colleges">All Colleges</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Default Layout</label>
              <select 
                className="form-input" 
                value={prefView} 
                onChange={e => {
                  const val = e.target.value;
                  setPrefView(val);
                  updatePreferenceSetting("defaultView", val);
                }}
              >
                <option value="Grid">Grid</option>
                <option value="List">List</option>
              </select>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", paddingTop: "12px", borderTop: "1px solid var(--bdr)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--txt)" }}>Show Verified Sellers First</div>
                <div style={{ fontSize: "12px", color: "var(--txt-2)" }}>Prioritize items listed by verified campus students in search feed.</div>
              </div>
              <label className="switch" style={{ position: "relative", display: "inline-block", width: "42px", height: "24px" }}>
                <input 
                  type="checkbox" 
                  checked={prefShowVerifiedSellersFirst} 
                  onChange={e => {
                    const val = e.target.checked;
                    setPrefShowVerifiedSellersFirst(val);
                    updatePreferenceSetting("showVerifiedSellersFirst", val);
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span className={`slider ${prefShowVerifiedSellersFirst ? "active" : ""}`} style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, background: prefShowVerifiedSellersFirst ? "var(--p)" : "var(--bdr-2)", transition: ".2s", borderRadius: "24px" }}>
                  <span style={{ position: "absolute", content: "", height: "16px", width: "16px", left: prefShowVerifiedSellersFirst ? "20px" : "4px", bottom: "4px", background: "white", transition: ".2s", borderRadius: "50%" }}></span>
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* ================= SUPPORT SECTION ================= */}
        <section className="form-card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--txt)" }}>🛠️ Support & Assistance</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ borderBottom: "1px dashed var(--bdr)", paddingBottom: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>📖 FAQ</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {FAQS.map((faq, i) => (
                  <div key={i} style={{ border: "1px solid var(--bdr)", borderRadius: "6px", background: "var(--light)", overflow: "hidden" }}>
                    <button 
                      type="button"
                      onClick={() => toggleFaq(i)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: "var(--txt)", fontWeight: 600, fontSize: "13px" }}
                    >
                      <span>{faq.q}</span>
                      <span>{openFaq === i ? "▼" : "▶"}</span>
                    </button>
                    {openFaq === i && (
                      <div style={{ padding: "12px", background: "var(--surface)", borderTop: "1px solid var(--bdr)", fontSize: "13px", color: "var(--txt-2)", lineHeight: "1.4" }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleReportBug} style={{ borderBottom: "1px dashed var(--bdr)", paddingBottom: "16px" }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>🐞 Report Bug</label>
                <textarea 
                  className="form-input" 
                  rows="3" 
                  placeholder="Tell us what went wrong..."
                  value={bugDesc}
                  onChange={e => setBugDesc(e.target.value)}
                  required
                  style={{ resize: "vertical" }}
                />
              </div>
              <button className="btn btn-outline btn-sm" type="submit" disabled={submittingBug || !bugDesc.trim()}>
                {submittingBug ? "Submitting..." : "Report Bug"}
              </button>
            </form>

            <form onSubmit={handleSendFeedback}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>💬 Feedback</label>
                <textarea 
                  className="form-input" 
                  rows="3" 
                  placeholder="Share your thoughts on how we can improve CampusMart..."
                  value={feedbackDesc}
                  onChange={e => setFeedbackDesc(e.target.value)}
                  required
                  style={{ resize: "vertical" }}
                />
              </div>
              <button className="btn btn-outline btn-sm" type="submit" disabled={submittingFeedback || !feedbackDesc.trim()}>
                {submittingFeedback ? "Sending..." : "Submit Feedback"}
              </button>
            </form>
          </div>
        </section>

        {/* ================= ABOUT SECTION ================= */}
        <section className="form-card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "var(--txt)" }}>ℹ️ About</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--bdr)", paddingBottom: "8px" }}>
              <span style={{ color: "var(--txt-2)" }}>App Version</span>
              <span style={{ fontWeight: 600 }}>v1.2.0 (Build 2026.06.23)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--bdr)", paddingBottom: "8px" }}>
              <span style={{ color: "var(--txt-2)" }}>Privacy Policy</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setPage("privacy")} style={{ color: "var(--p)", padding: 0 }} type="button">View Document</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--txt-2)" }}>Terms of Service</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setPage("terms")} style={{ color: "var(--p)", padding: 0 }} type="button">View Document</button>
            </div>
          </div>
        </section>

        {/* ================= ADVANCED ACCOUNT ACTIONS (DANGER ZONE) ================= */}
        {userProfile?.role !== "admin" && (
          <section className="form-card" style={{ padding: "24px", border: "1.5px solid rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.02)" }}>
            <button 
              type="button"
              onClick={() => setAdvancedActionsExpanded(o => !o)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--red)" }}>⚙️ Advanced Account Actions</h2>
              <span style={{ color: "var(--red)", fontSize: "14px" }}>{advancedActionsExpanded ? "▲" : "▼"}</span>
            </button>
            
            {advancedActionsExpanded && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px", borderTop: "1px solid rgba(239,68,68,0.2)", paddingTop: "16px" }}>
                <p style={{ fontSize: "13px", color: "var(--txt-2)" }}>Destructive settings and permanent profile deletions.</p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button className="btn btn-danger" onClick={() => setShowDeactivateModal(true)} type="button">
                    Deactivate Account
                  </button>
                  <button className="btn btn-danger" onClick={() => setDeleteStep(1)} style={{ background: "transparent", color: "var(--red)", border: "1.5px solid var(--red)" }} type="button">
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

      </div>

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
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--red)", textTransform: "uppercase", background: "var(--red-light)", padding: "4px 8px", borderRadius: "4px" }}>
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

    </div>
  );
}
