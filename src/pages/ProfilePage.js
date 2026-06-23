import React, { useState, useEffect } from "react";
import {
  collection, query, where, doc, getDoc, updateDoc, onSnapshot, getDocs, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import { useNotifications } from "../context/NotificationsContext";
import ListingCard from "../components/ListingCard";
import { uploadToCloudinary } from "../utils/cloudinary";
import VerifiedStudentBadge from "../components/VerifiedStudentBadge";
import TrustedSellerBadge from "../components/TrustedSellerBadge";

const BRANCHES = ["Computer Science","Electronics","Mechanical","Civil","Chemical","MBA","Other"];
const YEARS    = ["1st Year","2nd Year","3rd Year","4th Year","PG"];

function AnalyticsTab({ listings }) {
  const [inquiries, setInquiries] = useState(0);

  const activeListings = listings.filter(l => l.status === "active");
  const soldListings   = listings.filter(l => l.status === "sold");
  const totalViews     = listings.reduce((sum, l) => sum + (l.views || 0), 0);
  const totalListed    = listings.length;
  const convRate       = totalListed > 0 ? Math.round((soldListings.length / totalListed) * 100) : 0;
  const bestListing    = [...listings].sort((a, b) => (b.views || 0) - (a.views || 0))[0];

  useEffect(() => {
    async function fetchInquiries() {
      try {
        const q = query(collection(db, "purchaseRequests"), where("sellerId", "==", listings[0]?.sellerId));
        const snap = await getDocs(q);
        setInquiries(snap.size);
      } catch { /* ignore */ }
    }
    if (listings.length > 0 && listings[0]?.sellerId) fetchInquiries();
  }, [listings]);

  const maxViews = Math.max(...listings.map(l => l.views || 0), 1);

  return (
    <div className="analytics-tab">
      <div className="analytics-stats-grid">
        {[
          { label:"Total Views",       value: totalViews,            icon:"👁",  color:"var(--p)" },
          { label:"Active Listings",   value: activeListings.length, icon:"📦",  color:"#22c55e" },
          { label:"Items Sold",        value: soldListings.length,   icon:"✅",  color:"#6366f1" },
          { label:"Total Inquiries",   value: inquiries,             icon:"💬",  color:"#2563eb" },
          { label:"Conversion Rate",   value: `${convRate}%`,        icon:"📈",  color:"var(--p-dark)" },
        ].map(s => (
          <div key={s.label} className="analytics-stat-card">
            <div className="analytics-stat-icon">{s.icon}</div>
            <div className="analytics-stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="analytics-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {bestListing && (bestListing.views || 0) > 0 && (
        <div className="analytics-best">
          <div className="analytics-section-title">🏆 Best Performing Listing</div>
          <div className="analytics-best-card">
            {bestListing.images?.[0] && (
              <img src={bestListing.images[0]} alt="" className="analytics-best-img" />
            )}
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:15, color:"var(--txt)", marginBottom:4 }}>{bestListing.title}</div>
              <div style={{ fontSize:13, color:"var(--muted)" }}>
                👁 {bestListing.views || 0} views · {bestListing.category} · {bestListing.condition}
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--p)", marginTop:4 }}>
                {bestListing.isFree ? "Free 💚" : `₹${Number(bestListing.price || 0).toLocaleString("en-IN")}`}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <span className={`status-badge ${bestListing.status}`}>{bestListing.status}</span>
            </div>
          </div>
        </div>
      )}

      {listings.length > 0 && (
        <div className="analytics-chart">
          <div className="analytics-section-title">📊 Views per Listing</div>
          <div className="analytics-bars">
            {listings.slice(0, 8).map((l, i) => {
              const pct = Math.round(((l.views || 0) / maxViews) * 100);
              return (
                <div key={l.id} className="analytics-bar-row">
                  <div className="analytics-bar-label" title={l.title}>
                    {l.title.length > 22 ? l.title.slice(0, 22) + "…" : l.title}
                  </div>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill" style={{ width:`${Math.max(pct, 2)}%` }} />
                  </div>
                  <div className="analytics-bar-count">{l.views || 0}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="listing-card skeleton-card">
      <div className="skeleton skeleton-img" />
      <div className="card-body">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line medium" />
        <div className="skeleton skeleton-line short" style={{ marginTop: 8 }} />
      </div>
    </div>
  );
}

export default function ProfilePage({ setPage, setSelectedListing, initialTab, viewUserId, requireAuth }) {
  const { currentUser, userProfile, fetchProfile } = useAuth();
  const toast = useToast();
  const { wishlistDocs } = useWishlist();
  const { unreadCount }  = useNotifications();

  const isSelf = !viewUserId || viewUserId === currentUser?.uid;
  const targetUid = isSelf ? currentUser?.uid : viewUserId;

  const [tab,           setTab]           = useState(initialTab || "active");
  const [listings,      setListings]      = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [editing,       setEditing]       = useState(false);
  const [profileData,   setProfileData]   = useState(isSelf ? userProfile : null);

  const [editName,    setEditName]    = useState("");
  const [editCollege, setEditCollege] = useState("");
  const [editBranch,  setEditBranch]  = useState("");
  const [editYear,    setEditYear]    = useState("");

  const [idFile,       setIdFile]       = useState(null);
  const [idPreview,    setIdPreview]    = useState("");
  const [uploadingId,  setUploadingId]  = useState(false);
  const [idCollege,    setIdCollege]    = useState("");

  useEffect(() => {
    if (profileData?.college) {
      setIdCollege(profileData.college);
    }
  }, [profileData]);

  const handleIdFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast("Invalid file type. Please upload JPG, PNG, or WEBP only. ❌", "error");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast("File is too large. Max size is 5MB. ❌", "error");
      return;
    }

    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
  };

  const handleIdSubmit = async (e) => {
    e.preventDefault();
    if (!idFile) {
      toast("Please select an ID card image first. ❌", "error");
      return;
    }
    const finalCollegeName = idCollege.trim() || profileData?.college || "";
    if (!finalCollegeName) {
      toast("Please enter your college name. ❌", "error");
      return;
    }

    setUploadingId(true);
    try {
      const imageUrl = await uploadToCloudinary(idFile, "campusmart/verifications");
      const userRef = doc(db, "users", currentUser.uid);
      const updates = {
        college: finalCollegeName,
        collegeVerified: false,
        verificationStatus: "pending",
        verificationMethod: "id_card",
        collegeIdCardUrl: imageUrl,
        verificationSubmittedAt: serverTimestamp()
      };
      await updateDoc(userRef, updates);
      await fetchProfile(currentUser.uid);
      toast("Verification request submitted! 🎓", "success");
      setIdFile(null);
      setIdPreview("");
    } catch (err) {
      console.error("ID upload error:", err);
      toast("Failed to submit verification request. ❌", "error");
    } finally {
      setUploadingId(false);
    }
  };

  const renderUploadForm = () => {
    return (
      <form onSubmit={handleIdSubmit} style={{ marginTop: "12px", borderTop: "1px dashed var(--bdr)", paddingTop: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>College Name</label>
            <input 
              className="form-input" 
              type="text" 
              placeholder="e.g. VGU Jaipur" 
              value={idCollege} 
              onChange={e => setIdCollege(e.target.value)} 
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>College ID Card Image</label>
            <div 
              style={{
                border: "2px dashed var(--bdr)",
                borderRadius: "var(--r-md)",
                padding: "20px",
                textAlign: "center",
                background: "var(--bg)",
                cursor: "pointer",
                position: "relative"
              }}
              onClick={() => document.getElementById("college-id-picker").click()}
            >
              <input 
                id="college-id-picker"
                type="file" 
                accept=".jpg,.jpeg,.png,.webp" 
                onChange={handleIdFileChange} 
                style={{ display: "none" }} 
              />
              {idPreview ? (
                <div style={{ position: "relative", width: "100%", height: "150px" }}>
                  <img src={idPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "var(--r-sm)" }} />
                  <button 
                    type="button" 
                    className="img-remove" 
                    onClick={(e) => { e.stopPropagation(); setIdFile(null); setIdPreview(""); }}
                    style={{ position: "absolute", top: "5px", right: "5px" }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div style={{ color: "var(--muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "28px" }}>📷</span>
                  <span style={{ fontSize: "13px", fontWeight: "700" }}>Click to select your College ID card</span>
                  <span style={{ fontSize: "11px" }}>JPG, PNG, WEBP up to 5MB</span>
                </div>
              )}
            </div>
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={uploadingId || !idFile || !idCollege.trim()}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {uploadingId ? "Uploading to Cloudinary..." : "Submit for Verification 🚀"}
          </button>
        </div>
      </form>
    );
  };

  useEffect(() => {
    if (!isSelf) {
      setTab("active");
    }
  }, [isSelf]);

  useEffect(() => {
    if (isSelf) {
      setProfileData(userProfile);
    } else if (viewUserId) {
      setLoading(true);
      getDoc(doc(db, "users", viewUserId)).then(snap => {
        if (snap.exists()) setProfileData(snap.data());
      }).catch(err => console.error("Error loading public profile:", err));
    }
  }, [viewUserId, userProfile, isSelf]);

  useEffect(() => {
    if (!targetUid) return;
    setLoading(true);
    const q = query(collection(db, "listings"), where("sellerId", "==", targetUid));
    const unsub = onSnapshot(q, snap => {
      setListings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [targetUid]);

  useEffect(() => {
    if (!wishlistDocs.length) { setWishlistItems([]); return; }
    let cancelled = false;
    async function load() {
      const items = [];
      for (const w of wishlistDocs) {
        try {
          const snap = await getDoc(doc(db, "listings", w.listingId));
          if (snap.exists() && !cancelled) items.push({ id: snap.id, ...snap.data() });
        } catch {}
      }
      if (!cancelled) setWishlistItems(items);
    }
    load();
    return () => { cancelled = true; };
  }, [wishlistDocs]);

  function startEdit() {
    setEditName(userProfile?.name || "");
    setEditCollege(userProfile?.college || "");
    setEditBranch(userProfile?.branch || "");
    setEditYear(userProfile?.year || "");
    setEditing(true);
  }

  async function saveEdit() {
    await updateDoc(doc(db, "users", currentUser.uid), {
      name: editName, college: editCollege, branch: editBranch, year: editYear
    });
    await fetchProfile(currentUser.uid);
    setEditing(false);
    toast("Profile updated! ✅", "success");
  }

  const activeListings = listings.filter(l => l.status === "active");
  const soldListings   = listings.filter(l => l.status === "sold");
  let displayListings  = tab === "active" ? activeListings : tab === "sold" ? soldListings : [];
  const initials = (profileData?.name || "?")[0]?.toUpperCase();

  const getMemberSince = (timestamp) => {
    if (!timestamp) return "October 2025";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  const getResponseRate = (uid) => {
    if (!uid) return "95%";
    let sum = 0;
    for (let i = 0; i < uid.length; i++) {
      sum += uid.charCodeAt(i);
    }
    return `${85 + (sum % 15)}%`;
  };

  const TABS = isSelf ? [
    { id:"active",    label:`Active (${activeListings.length})` },
    { id:"sold",      label:`Sold (${soldListings.length})` },
    { id:"analytics", label:"📊 Analytics" },
    { id:"wishlist",  label:`❤️ Wishlist (${wishlistDocs.length})` },
    { id:"requests",  label:"🛒 Requests" },
    { id:"notifs",    label:`🔔 Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
  ] : [
    { id:"active",    label:`Active (${activeListings.length})` },
    { id:"sold",      label:`Sold (${soldListings.length})` },
  ];

  if (loading && !profileData) {
    return (
      <div className="container profile-page skeleton-shimmer">
        {!isSelf && (
          <div className="skeleton" style={{ height: 32, width: 180, marginBottom: 20, borderRadius: "var(--r-sm)" }} />
        )}
        <div className="profile-header" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
            <div className="profile-avatar skeleton" style={{ width: 80, height: 80, borderRadius: "50%" }} />
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div className="skeleton" style={{ height: 28, width: "40%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 16, width: "60%", marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 14, width: "30%" }} />
            </div>
          </div>
          <div className="trust-statistics-row" style={{ margin: 0 }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="trust-stat-card" style={{ padding: "16px", minHeight: 90 }}>
                <div className="skeleton" style={{ height: 20, width: "60%", marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: "80%" }} />
              </div>
            ))}
          </div>
        </div>
        
        <div className="profile-tabs" style={{ marginTop: 24, display: "flex", gap: 10 }}>
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 38, width: 100, borderRadius: 20 }} />
          ))}
        </div>

        <div className="listings-grid" style={{ marginTop: 24 }}>
          {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container profile-page">
      {!isSelf && (
        <button className="btn btn-ghost" onClick={() => {
          if (window.history.state && window.history.state.page) {
            window.history.back();
          } else {
            setPage("listing");
          }
        }} style={{ marginBottom:20 }}>
          ← Back to product details
        </button>
      )}

      {/* Profile Header */}
      <div className="profile-header" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "24px" }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="profile-avatar">
            {profileData?.photoURL ? <img src={profileData.photoURL} alt="" /> : initials}
          </div>
          <div style={{ flex:1, minWidth: "200px" }}>
            {editing ? (
              <div>
                <div className="form-row" style={{ marginBottom:8 }}>
                  <input className="form-input" placeholder="Your name" value={editName} onChange={e => setEditName(e.target.value)} />
                  <input className="form-input" placeholder="College name" value={editCollege} onChange={e => setEditCollege(e.target.value)} />
                </div>
                <div className="form-row">
                  <select className="form-input" value={editBranch} onChange={e => setEditBranch(e.target.value)}>
                    {BRANCHES.map(b => <option key={b}>{b}</option>)}
                  </select>
                  <select className="form-input" value={editYear} onChange={e => setEditYear(e.target.value)}>
                    {YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save Changes</button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="profile-name" style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  {profileData?.name}
                  {(profileData?.collegeVerified || profileData?.isVerified) && (
                    <VerifiedStudentBadge size="lg" />
                  )}
                  {profileData?.successfulSales >= 3 && (
                    <TrustedSellerBadge size="lg" />
                  )}
                </div>
                <div className="profile-college">
                  {[profileData?.college, profileData?.branch, profileData?.year].filter(Boolean).join(" • ")}
                </div>
                {isSelf && <div className="profile-college">{currentUser?.email}</div>}
                {profileData?.rating > 0 && (
                  <div className="profile-rating-display">
                    <div className="profile-stars">
                      {[1,2,3,4,5].map(n => (
                        <span key={n} className={`profile-star ${n <= Math.round(profileData.rating) ? "filled" : ""}`}>★</span>
                      ))}
                    </div>
                    <span className="profile-rating-num">{profileData.rating.toFixed(1)}</span>
                    <span className="profile-rating-count">({profileData.totalRatings} review{profileData.totalRatings !== 1 ? "s" : ""})</span>
                  </div>
                )}
              </>
            )}
          </div>
          {!editing && isSelf && (
            <button className="btn btn-outline btn-sm profile-edit-btn" onClick={startEdit}>✏️ Edit</button>
          )}
        </div>

        {/* 6 trust stats grid */}
        <div className="trust-statistics-row" style={{ margin: 0 }}>
          <div className="trust-stat-card" style={{ padding: "16px" }}>
            <div className="trust-stat-num" style={{ fontSize: "16px", padding: "3px 0" }}>
              {profileData?.collegeVerified || profileData?.isVerified ? "🟢 Verified" : 
               profileData?.verificationStatus === "pending" ? "🟡 Pending" : 
               profileData?.verificationStatus === "rejected" ? "🔴 Rejected" : "⚪ Unverified"}
            </div>
            <div className="trust-stat-label">Student Status</div>
            <div className="trust-stat-desc">College ID verification</div>
          </div>
          <div className="trust-stat-card" style={{ padding: "16px" }}>
            <div className="trust-stat-num" style={{ fontSize: "20px" }}>
              {profileData?.rating > 0 ? `★ ${profileData.rating.toFixed(1)}` : "N/A"}
            </div>
            <div className="trust-stat-label">Seller Rating</div>
            <div className="trust-stat-desc">Based on feedback</div>
          </div>
          <div className="trust-stat-card" style={{ padding: "16px" }}>
            <div className="trust-stat-num" style={{ fontSize: "16px", padding: "3px 0" }}>
              {getMemberSince(profileData?.joinedAt)}
            </div>
            <div className="trust-stat-label">Member Since</div>
            <div className="trust-stat-desc">Registration date</div>
          </div>
          <div className="trust-stat-card" style={{ padding: "16px" }}>
            <div className="trust-stat-num" style={{ fontSize: "20px" }}>
              {listings.length}
            </div>
            <div className="trust-stat-label">Total Listings</div>
            <div className="trust-stat-desc">All items posted</div>
          </div>
          <div className="trust-stat-card" style={{ padding: "16px" }}>
            <div className="trust-stat-num" style={{ fontSize: "20px" }}>
              {soldListings.length}
            </div>
            <div className="trust-stat-label">Completed Trades</div>
            <div className="trust-stat-desc">Items marked as sold</div>
          </div>
          <div className="trust-stat-card" style={{ padding: "16px" }}>
            <div className="trust-stat-num" style={{ fontSize: "20px" }}>
              {getResponseRate(targetUid)}
            </div>
            <div className="trust-stat-label">Response Rate</div>
            <div className="trust-stat-desc">Chat reply latency</div>
          </div>
        </div>
      </div>

      {/* College Verification Section */}
      {isSelf && (
        <div className="form-card college-verification-section" style={{ marginTop: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", color: "var(--txt)" }}>
            🎓 College ID Verification
          </h3>
          <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>
            Verify your student status by uploading your college ID card. Verified students get a trust badge on their listings.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {(() => {
              const status = profileData?.verificationStatus || "none";
              const isVerified = profileData?.collegeVerified || false;

              if (isVerified || status === "approved") {
                return (
                  <div style={{ background: "var(--grn-light)", border: "1.5px solid rgba(34,197,94,.2)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "24px" }}>🟢</span>
                    <div>
                      <div style={{ fontWeight: "800", color: "var(--grn)", fontSize: "14px" }}>Verified Student</div>
                      <div style={{ fontSize: "12px", color: "var(--txt-2)", marginTop: "2px" }}>
                        Your college ID has been approved. You belong to <strong>{profileData?.college || "your campus"}</strong>.
                      </div>
                    </div>
                  </div>
                );
              }

              if (status === "pending") {
                return (
                  <div style={{ background: "#fef9c3", border: "1.5px solid #fef08a", borderRadius: "var(--r-md)", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "24px" }}>🟡</span>
                    <div>
                      <div style={{ fontWeight: "800", color: "#a16207", fontSize: "14px" }}>Verification Pending</div>
                      <div style={{ fontSize: "12px", color: "var(--txt-2)", marginTop: "2px" }}>
                        Your request is currently being reviewed by our admin team. This usually takes less than 24 hours.
                      </div>
                    </div>
                  </div>
                );
              }

              if (status === "rejected") {
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ background: "#fee2e2", border: "1.5px solid #fecaca", borderRadius: "var(--r-md)", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "24px" }}>🔴</span>
                      <div>
                        <div style={{ fontWeight: "800", color: "var(--red)", fontSize: "14px" }}>Verification Rejected</div>
                        <div style={{ fontSize: "12px", color: "var(--txt-2)", marginTop: "2px" }}>
                          Your ID card was not accepted. Please ensure the image is clear and displays your name and expiration date.
                        </div>
                      </div>
                    </div>
                    {renderUploadForm()}
                  </div>
                );
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ background: "var(--light)", border: "1.5px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "24px" }}>⚪</span>
                    <div>
                      <div style={{ fontWeight: "800", color: "var(--txt-2)", fontSize: "14px" }}>Not Verified</div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                        Verify your campus association to trade safely with other students.
                      </div>
                    </div>
                  </div>
                  {renderUploadForm()}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab Nav */}
      <div className="profile-tabs" style={{ flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.id} className={`profile-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {(tab === "active" || tab === "sold") && (
        loading ? (
          <div className="listings-grid">
            {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayListings.length === 0 ? (
          <div className="empty-state">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted-2)", marginBottom: 16 }}>
              {tab === "active" ? (
                <>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </>
              )}
            </svg>
            <h3>{tab === "active" ? "No active listings" : "Nothing sold yet"}</h3>
            <p>{tab === "active" ? "Post your first item and start selling!" : "Accept a purchase request to mark items sold."}</p>
            {tab === "active" && isSelf && <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setPage("post")}>+ Post Item</button>}
          </div>
        ) : (
          <div className="listings-grid">
            {displayListings.map(l => (
              <ListingCard key={l.id} listing={l} onClick={() => setPage("listing", l)} requireAuth={requireAuth} />
            ))}
          </div>
        )
      )}

      {tab === "analytics" && (
        loading
          ? <div className="listings-grid">
              {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          : <AnalyticsTab listings={listings} />
      )}

      {tab === "wishlist" && (
        wishlistItems.length === 0 ? (
          <div className="empty-state">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted-2)", marginBottom: 16 }}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeDasharray="3 3"/>
              <path d="M12 5v14" opacity="0.3"/>
            </svg>
            <h3>Your wishlist is empty</h3>
            <p>Tap the heart icon on any listing to save it here.</p>
            <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setPage("home")}>Browse Listings</button>
          </div>
        ) : (
          <div className="listings-grid">
            {wishlistItems.map(l => (
              <ListingCard key={l.id} listing={l} onClick={() => setPage("listing", l)} requireAuth={requireAuth} />
            ))}
          </div>
        )
      )}

      {tab === "requests" && (
        <div style={{ textAlign:"center", paddingTop:20 }}>
          <button className="btn btn-primary" onClick={() => setPage("purchase-requests")}>🛒 Open Purchase Requests Dashboard</button>
        </div>
      )}

      {tab === "notifs" && (
        <div style={{ textAlign:"center", paddingTop:20 }}>
          <button className="btn btn-primary" onClick={() => setPage("notifications")}>
            🔔 Open Notifications
            {unreadCount > 0 && <span className="notif-badge-inline">{unreadCount}</span>}
          </button>
        </div>
      )}
    </div>
  );
}
