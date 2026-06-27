import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { uploadMultipleToCloudinary } from "../utils/cloudinary";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { categorizeProduct, optimizeListingDescription, suggestPriceRange } from "../services/ai/aiService";
import { trackAIEvent, AI_EVENTS } from "../services/ai/aiAnalytics";
import MateGeniButton from "../components/MateGeni/MateGeniButton";
import MateGeniModal from "../components/MateGeni/MateGeniModal";
import ConfirmModal from "../components/ConfirmModal";

const PRIMARY_CATEGORIES = ["Books", "Notes", "Electronics", "Lab Equipment", "Stationery", "Fashion", "Hostel"];
const MORE_CATEGORIES = ["Sports", "Gaming", "Musical Instruments", "Photography", "Other"];

const CAT_ICONS = {
  Books: "📚", Notes: "📝", Electronics: "💻", "Lab Equipment": "🧪",
  Stationery: "✏️", Fashion: "👕", Hostel: "🏠", Sports: "🚲",
  Gaming: "🎮", "Musical Instruments": "🎸", Photography: "📷", Other: "📦",
};
const CONDITIONS = ["New", "Good", "Fair", "Old"];
const COND_META = {
  New:  { icon: "✨", label: "Brand New",    color: "var(--cond-new-txt)",  bg: "var(--cond-new-bg)",  desc: "Unused, original packaging" },
  Good: { icon: "👍", label: "Good",         color: "var(--cond-good-txt)", bg: "var(--cond-good-bg)", desc: "Minor wear, works perfectly" },
  Fair: { icon: "👌", label: "Fair",         color: "var(--cond-fair-txt)", bg: "var(--cond-fair-bg)", desc: "Visible wear, fully functional" },
  Old:  { icon: "⚠️", label: "Heavily Used", color: "var(--cond-old-txt)",  bg: "var(--cond-old-bg)",  desc: "Heavy cosmetic wear" },
};
const MEETUP_SPOTS = [
  "Library Entrance", "Main Canteen", "Hostel Gate A", "Hostel Gate B",
  "Hostel Gate C", "Academic Block Lobby", "Parking Area", "Sports Complex",
  "Admin Block", "Custom location…",
];
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DRAFT_KEY = "campusmart_listing_draft";

export default function PostListingPage({ setPage, editListing }) {
  const { currentUser, userProfile } = useAuth();
  const toast = useToast();
  const userId = currentUser?.uid || null;
  const isEdit = !!editListing;

  // ── Core form state ──
  const [title,         setTitle]         = useState(editListing?.title         || "");
  const [description,   setDescription]   = useState(editListing?.description   || "");
  const [category,      setCategory]      = useState(editListing?.category      || "Books");
  const [showMoreCategories, setShowMoreCategories] = useState(() =>
    editListing?.category ? MORE_CATEGORIES.includes(editListing.category) : false
  );
  const [condition,     setCondition]     = useState(editListing?.condition     || "Good");
  const [listingType,   setListingType]   = useState(editListing?.listingType   || "sell");
  const [price,         setPrice]         = useState(editListing?.price         || "");
  const [,              setIsFree]        = useState(editListing?.isFree        || false);
  const [rentPerDay,    setRentPerDay]    = useState(editListing?.rentPerDay    || "");
  const [rentMinDays,   setRentMinDays]   = useState(editListing?.rentMinDays   || "1");
  const [rentMaxDays,   setRentMaxDays]   = useState(editListing?.rentMaxDays   || "30");
  const [rentDeposit,   setRentDeposit]   = useState(editListing?.rentDeposit   || "");
  const [meetupSpot,    setMeetupSpot]    = useState(editListing?.meetupSpot    || "");
  const [customMeetup,  setCustomMeetup]  = useState("");

  // ── Unified image array ──
  // Each entry: { id, src (preview URL), file (File|null for existing URLs) }
  const [images, setImages] = useState(() =>
    (editListing?.images || []).map((url, i) => ({ id: `existing_${i}`, src: url, file: null }))
  );
  const [imageError,    setImageError]    = useState(false);
  const [dragIdx,       setDragIdx]       = useState(null);
  const [replaceIdx,    setReplaceIdx]    = useState(-1);

  // ── Loading / AI ──
  const [loading,       setLoading]       = useState(false);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState(null);
  const [dragOver,      setDragOver]      = useState(false);

  // ── MateGeni ──
  const [suggestedCat,       setSuggestedCat]       = useState("");
  const [suggestedCatConf,   setSuggestedCatConf]   = useState(0);
  const [optimizerModalOpen, setOptimizerModalOpen] = useState(false);
  const [optimizedData,      setOptimizedData]      = useState(null);
  const [optimizerLoading,   setOptimizerLoading]   = useState(false);

  // ── Draft & dirty tracking ──
  const [isDirty,       setIsDirty]       = useState(false);
  const [draftSavedAt,  setDraftSavedAt]  = useState(null);
  const [showDiscard,   setShowDiscard]   = useState(false);
  const [pendingNav,    setPendingNav]    = useState(null);

  const fileRef    = useRef();
  const replaceRef = useRef();
  const totalImages = images.length;

  // ── Sync listingType with isFree ──
  function handleTypeChange(type) {
    setListingType(type);
    setIsFree(type === "free");
  }

  // ── Section-based progress ──
  const sections = useMemo(() => {
    const photosDone  = totalImages >= 1;
    const detailsDone = title.trim().length >= 3 && description.length >= 10 && !!category && !!condition;
    const pricingDone = listingType === "free" || (listingType === "sell" && !!price) || (listingType === "rent" && !!rentPerDay);
    const meetupDone  = !!meetupSpot;
    return [
      { label: "Photos",       done: photosDone },
      { label: "Item Details", done: detailsDone },
      { label: "Pricing",      done: pricingDone },
      { label: "Meetup",       done: meetupDone },
    ];
  }, [totalImages, title, description, category, condition, listingType, price, rentPerDay, meetupSpot]);

  const completedSections = sections.filter(s => s.done).length;
  const progressPercent   = Math.round((completedSections / sections.length) * 100);

  // ── Can submit? ──
  const canSubmit = useMemo(() => {
    if (totalImages === 0) return false;
    if (!title.trim()) return false;
    if (!category) return false;
    if (!condition) return false;
    if (listingType === "sell" && !price) return false;
    if (listingType === "rent" && !rentPerDay) return false;
    return true;
  }, [totalImages, title, category, condition, listingType, price, rentPerDay]);

  // ── Quality score ──
  const qualityData = useMemo(() => {
    let score = 0;
    const good = [], missing = [];
    if (totalImages >= 1) { score += 10; good.push("Photos uploaded"); }
    else missing.push("Add at least one photo");
    if (totalImages >= 2) score += 8;
    if (totalImages >= 3) { score += 7; good.push("Multiple photos"); }
    else if (totalImages >= 1) missing.push("Additional photo recommended");
    if (title.length >= 5)       { score += 20; good.push("Clear title"); }
    else missing.push("Add a descriptive title");
    if (description.length >= 30) { score += 25; good.push("Good description"); }
    else if (description.length >= 10) { score += 10; missing.push("Better description (30+ chars)"); }
    else missing.push("Better description (30+ chars)");
    if (category) score += 10;
    if (condition) score += 5;
    if (meetupSpot) { score += 10; good.push("Meetup location set"); }
    else missing.push("Meetup location");
    if (listingType === "free" || price || (listingType === "rent" && rentPerDay)) score += 5;
    return { score, good, missing };
  }, [totalImages, title, description, category, condition, meetupSpot, listingType, price, rentPerDay]);

  // ── Tips checklist ──
  const tips = useMemo(() => [
    { label: "Photos uploaded",       done: totalImages >= 1 },
    { label: "Clear title added",     done: title.length >= 5 },
    { label: "Good description",      done: description.length >= 30 },
    { label: "Category selected",     done: !!category },
    { label: "Price entered",         done: listingType === "free" || !!price || (listingType === "rent" && !!rentPerDay) },
    { label: "Meetup location set",   done: !!meetupSpot },
  ], [totalImages, title, description, category, listingType, price, rentPerDay, meetupSpot]);
  const tipsCompleted = tips.filter(t => t.done).length;

  // ── Dirty tracking ──
  useEffect(() => {
    if (isEdit) return;
    if (title || description || totalImages > 0 || meetupSpot || price) setIsDirty(true);
  }, [title, description, totalImages, meetupSpot, price, isEdit]);

  // ── Draft autosave (new listings only, debounced 3s) ──
  useEffect(() => {
    if (isEdit) return;
    if (!isDirty) return;
    const timer = setTimeout(() => {
      try {
        const draft = { title, description, category, condition, listingType, price, rentPerDay, rentMinDays, rentMaxDays, rentDeposit, meetupSpot, customMeetup };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setDraftSavedAt(new Date());
      } catch {}
    }, 3000);
    return () => clearTimeout(timer);
  }, [isEdit, isDirty, title, description, category, condition, listingType, price, rentPerDay, rentMinDays, rentMaxDays, rentDeposit, meetupSpot, customMeetup]);

  // ── Load draft on mount ──
  useEffect(() => {
    if (isEdit) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.title) setTitle(d.title);
        if (d.description) setDescription(d.description);
        if (d.category) setCategory(d.category);
        if (d.condition) setCondition(d.condition);
        if (d.listingType) { setListingType(d.listingType); setIsFree(d.listingType === "free"); }
        if (d.price) setPrice(d.price);
        if (d.rentPerDay) setRentPerDay(d.rentPerDay);
        if (d.rentMinDays) setRentMinDays(d.rentMinDays);
        if (d.rentMaxDays) setRentMaxDays(d.rentMaxDays);
        if (d.rentDeposit) setRentDeposit(d.rentDeposit);
        if (d.meetupSpot) setMeetupSpot(d.meetupSpot);
        if (d.customMeetup) setCustomMeetup(d.customMeetup);
        setDraftSavedAt(new Date());
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navigation guard ──
  const navigateAway = useCallback((page) => {
    if (isDirty && !isEdit) {
      setPendingNav(page);
      setShowDiscard(true);
    } else {
      setPage(page);
    }
  }, [isDirty, isEdit, setPage]);

  function confirmDiscard() {
    setShowDiscard(false);
    localStorage.removeItem(DRAFT_KEY);
    setPage(pendingNav);
  }

  // ── SOLD GUARD ──
  if (isEdit && editListing?.status === "sold") {
    return (
      <div className="post-page">
        <div className="post-container" style={{ maxWidth: 600 }}>
          <div className="post-header">
            <button className="post-back" onClick={() => setPage("home")}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <h1 className="post-title">Listing Sold</h1>
              <p className="post-subtitle">This item has been marked as sold</p>
            </div>
          </div>
          <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--bdr)", borderRadius: "var(--r-lg)", padding: 32, textAlign: "center", boxShadow: "var(--s1)" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Cannot Edit Sold Listing</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>
              This listing has been sold and can no longer be edited.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-outline" onClick={() => setPage("home")}>← Back to Feed</button>
              <button className="btn btn-primary" onClick={() => setPage("post")}>+ Post New Item</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Image Handlers ──
  function validateAndAddFiles(fileList) {
    const remaining = 4 - totalImages;
    if (remaining <= 0) return;
    const arr = Array.from(fileList);
    const valid = [];
    for (const f of arr) {
      if (valid.length >= remaining) break;
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast("Unsupported format. Use JPG, PNG, or WebP.", "error");
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast(`"${f.name}" exceeds 5 MB limit.`, "error");
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;
    const entries = valid.map((f, i) => ({
      id: `new_${Date.now()}_${i}`,
      src: URL.createObjectURL(f),
      file: f,
    }));
    setImages(prev => [...prev, ...entries]);
    setImageError(false);
  }

  function handleImageChange(e) { validateAndAddFiles(e.target.files); e.target.value = ""; }
  function handleDrop(e) { e.preventDefault(); setDragOver(false); validateAndAddFiles(e.dataTransfer.files); }

  function removeImage(index) {
    setImages(prev => {
      const updated = [...prev];
      if (updated[index]?.file) URL.revokeObjectURL(updated[index].src);
      updated.splice(index, 1);
      return updated;
    });
  }

  function setCover(index) {
    if (index === 0) return;
    setImages(prev => {
      const updated = [...prev];
      const [item] = updated.splice(index, 1);
      updated.unshift(item);
      return updated;
    });
    toast("Cover photo updated ✓", "success");
  }

  function handleReplace(index) {
    setReplaceIdx(index);
    replaceRef.current.click();
  }
  function handleReplaceFile(e) {
    const file = e.target.files[0];
    if (!file || replaceIdx < 0) return;
    if (!ALLOWED_TYPES.includes(file.type)) { toast("Unsupported format.", "error"); e.target.value = ""; return; }
    if (file.size > MAX_FILE_SIZE) { toast("File too large. Max 5 MB.", "error"); e.target.value = ""; return; }
    setImages(prev => {
      const updated = [...prev];
      if (updated[replaceIdx]?.file) URL.revokeObjectURL(updated[replaceIdx].src);
      updated[replaceIdx] = { id: `new_${Date.now()}`, src: URL.createObjectURL(file), file };
      return updated;
    });
    setReplaceIdx(-1);
    e.target.value = "";
  }

  // Drag-and-drop reorder
  function onImgDragStart(index) { setDragIdx(index); }
  function onImgDragOver(e) { e.preventDefault(); }
  function onImgDrop(e, dropIndex) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIndex) { setDragIdx(null); return; }
    setImages(prev => {
      const updated = [...prev];
      const [dragged] = updated.splice(dragIdx, 1);
      updated.splice(dropIndex, 0, dragged);
      return updated;
    });
    setDragIdx(null);
  }

  // ── AI Categorization Hook — debounced 800ms ──
  useEffect(() => {
    if (!title || title.trim().length < 4) {
      setSuggestedCat("");
      setSuggestedCatConf(0);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await categorizeProduct({ title, description }, userId);
        if (result && result.suggestedCategory) {
          setSuggestedCat(result.suggestedCategory);
          setSuggestedCatConf(result.confidence || 0);
        }
      } catch (err) {
        console.error("AI categorization error:", err);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [title, description, userId]);

  async function handleOptimizeDescription() {
    if (!title || !description) {
      toast("Enter both name and description first", "error");
      return;
    }
    setOptimizerLoading(true);
    try {
      const result = await optimizeListingDescription({ title, description, category, condition }, userId);
      setOptimizedData(result);
      setOptimizerModalOpen(true);
    } catch (err) {
      console.error("Optimizer error:", err);
      toast("Failed to optimize description", "error");
    } finally {
      setOptimizerLoading(false);
    }
  }

  async function suggestPrice() {
    if (!title) { toast("Enter item name first", "error"); return; }
    setAiLoading(true);
    setPriceSuggestion(null);
    try {
      const result = await suggestPriceRange({ title, category, condition }, userId);
      setPriceSuggestion(result);
    } catch (err) {
      console.error("AI Price suggest error:", err);
      toast("Failed to estimate price", "error");
    }
    setAiLoading(false);
  }

  // ── Submit ──
  async function handleSubmit(e) {
    e.preventDefault();
    if (totalImages === 0) { setImageError(true); toast("Add at least one photo to publish your listing.", "error"); return; }
    if (listingType === "sell" && !price) { toast("Please enter a price or mark as free", "error"); return; }
    if (listingType === "rent" && !rentPerDay) { toast("Please enter rent per day amount", "error"); return; }
    if (!title || !description) { toast("Please fill all required fields", "error"); return; }
    const finalMeetup = meetupSpot === "Custom location…" ? customMeetup : meetupSpot;

    setLoading(true);
    try {
      // Cover is already at index 0 (setCover moves it there)
      const newFileEntries = images.filter(entry => entry.file);
      const uploadedUrls = newFileEntries.length > 0
        ? await uploadMultipleToCloudinary(newFileEntries.map(entry => entry.file))
        : [];

      let newIdx = 0;
      const allImages = images.map(entry => {
        if (!entry.file) return entry.src;
        return uploadedUrls[newIdx++];
      });

      const baseData = {
        title, description, category, condition,
        listingType,
        isFree: listingType === "free",
        meetupSpot: finalMeetup,
        images: allImages,
        sellerId:      currentUser.uid,
        sellerName:    userProfile?.name || currentUser.displayName || "Student",
        sellerCollege: userProfile?.college || "",
        sellerRating:  userProfile?.rating  || 0,
        collegeVerified: userProfile?.collegeVerified || false,
        isVerified: userProfile?.collegeVerified || false,
        sellerSuccessfulSales: userProfile?.successfulSales || 0,
      };

      if (listingType === "rent") {
        Object.assign(baseData, {
          price: 0,
          rentPerDay:  Number(rentPerDay),
          rentMinDays: Number(rentMinDays),
          rentMaxDays: Number(rentMaxDays),
          rentDeposit: Number(rentDeposit) || 0,
        });
      } else {
        baseData.price = listingType === "free" ? 0 : Number(price);
      }

      if (isEdit) {
        await updateDoc(doc(db, "listings", editListing.id), baseData);
        toast("Listing updated!", "success");
      } else {
        await addDoc(collection(db, "listings"), {
          ...baseData,
          status: "active", createdAt: serverTimestamp(), views: 0,
        });
        toast("Listing posted! 🎉", "success");
        localStorage.removeItem(DRAFT_KEY);
      }
      setIsDirty(false);
      setPage("home");
    } catch (err) {
      console.error(err);
      toast(isEdit ? "Failed to update" : "Failed to post. Check Cloudinary config.", "error");
    }
    setLoading(false);
  }

  const isRent = listingType === "rent";
  const previewPrice = isRent
    ? (rentPerDay ? `₹${Number(rentPerDay).toLocaleString("en-IN")}/day` : "Set rent/day")
    : (listingType === "free" ? "Free 💚" : (price ? `₹${Number(price).toLocaleString("en-IN")}` : "Set price"));
  const finalMeetupDisplay = meetupSpot === "Custom location…" ? (customMeetup || "Custom") : meetupSpot;

  // ── RENDER ──
  return (
    <div className="post-page">
      <div className="post-container">

        {/* ═══ Header ═══ */}
        <div className="post-header">
          <button className="post-back" onClick={() => navigateAway("home")} aria-label="Go back">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 className="post-title">{isEdit ? "Edit Listing" : "Post New Item"}</h1>
            <p className="post-subtitle">{isEdit ? "Update your listing details" : "Reach hundreds of students on your campus"}</p>
          </div>
          {draftSavedAt && !isEdit && (
            <span className="post-draft-badge" aria-live="polite">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              Draft saved
            </span>
          )}
          {!isEdit && (
            <div className="post-progress">
              <div className="post-progress-sections">
                {sections.map((s, i) => (
                  <span key={i} className={`post-progress-step ${s.done ? "done" : ""}`} title={s.label}>
                    {s.done ? "✓" : i + 1}
                  </span>
                ))}
              </div>
              <div className="post-progress-bar"><div className="post-progress-fill" style={{ width: `${progressPercent}%` }} /></div>
              <span className="post-progress-text">{completedSections} / {sections.length} Sections Complete</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="post-form">
          <div className="post-grid">
            <div className="post-left">

              {/* ═══ Section 1: Photos ═══ */}
              <div className="post-section">
                <div className="post-section-header">
                  <div className={`post-section-num ${totalImages >= 1 ? "done" : ""}`}>{totalImages >= 1 ? "✓" : "1"}</div>
                  <div>
                    <div className="post-section-title">Photos <span className="req">*</span></div>
                    <div className="post-section-desc">Good photos = faster sale · Up to 4 images</div>
                  </div>
                  {totalImages > 0 && (
                    <span className="post-img-count">
                      {totalImages === 4 ? "✓" : ""} {totalImages}/4
                    </span>
                  )}
                </div>

                {/* Hidden file inputs */}
                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={handleImageChange} style={{ display: "none" }} aria-label="Upload photos" />
                <input ref={replaceRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleReplaceFile} style={{ display: "none" }} aria-label="Replace photo" />

                {/* Empty state */}
                {totalImages === 0 && (
                  <div
                    className={`post-dropzone post-dropzone-empty ${dragOver ? "dragover" : ""}`}
                    onClick={() => fileRef.current.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                    aria-label="Upload photos"
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") fileRef.current.click(); }}
                  >
                    <div className="post-dropzone-icon">
                      <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                    <div className="post-dropzone-title">📷 Add your first photo</div>
                    <div className="post-dropzone-text">Listings with photos receive significantly more views.</div>
                    <div className="post-dropzone-meta">
                      <span>Minimum: <strong>1 photo required</strong></span>
                      <span>Maximum: <strong>4 photos</strong></span>
                      <span>Supported: JPG, PNG, WebP</span>
                      <span>Up to 5 MB each</span>
                    </div>
                    <div className="post-dropzone-cta">
                      <span className="post-dropzone-link">Browse files</span> or drag and drop
                    </div>
                  </div>
                )}

                {/* Max reached state */}
                {totalImages >= 4 && (
                  <div className="post-upload-max">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    Maximum photos reached (4/4)
                  </div>
                )}

                {/* Progress counter */}
                {totalImages > 0 && totalImages < 4 && (
                  <div className="post-upload-progress">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    {totalImages} of 4 photos uploaded
                  </div>
                )}

                {/* Image grid with drag reorder */}
                {totalImages > 0 && (
                  <div className="post-img-grid">
                    {images.map((entry, i) => (
                      <div
                        key={entry.id}
                        className={`post-img-item ${i === 0 ? "main" : ""} ${dragIdx === i ? "dragging" : ""}`}
                        draggable
                        onDragStart={() => onImgDragStart(i)}
                        onDragOver={onImgDragOver}
                        onDrop={e => onImgDrop(e, i)}
                      >
                        <img src={entry.src} alt={`Photo ${i + 1}`} loading="lazy" />
                        {i === 0 && <span className="post-img-main-badge">Cover</span>}
                        {entry.file && <span className="post-img-new-badge">New</span>}
                        {/* Action overlay */}
                        <div className="post-img-actions">
                          {i !== 0 && (
                            <button type="button" className="post-img-action-btn" onClick={() => setCover(i)} title="Set as cover photo" aria-label="Set as cover">
                              ⭐
                            </button>
                          )}
                          <button type="button" className="post-img-action-btn" onClick={() => handleReplace(i)} title="Replace photo" aria-label="Replace">
                            🔄
                          </button>
                          <button type="button" className="post-img-action-btn remove" onClick={() => removeImage(i)} title="Remove photo" aria-label="Remove">
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    {totalImages < 4 && (
                      <div
                        className={`post-img-add ${dragOver ? "dragover" : ""}`}
                        onClick={() => fileRef.current.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        role="button"
                        tabIndex={0}
                        aria-label="Add more photos"
                        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") fileRef.current.click(); }}
                      >
                        <span>+</span>
                        <span>Add</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline validation error */}
                {imageError && totalImages === 0 && (
                  <div className="post-img-error" role="alert">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Add at least one photo to publish your listing.
                  </div>
                )}
              </div>

              {/* ═══ Section 2: Item Details ═══ */}
              <div className="post-section">
                <div className="post-section-header">
                  <div className={`post-section-num ${sections[1].done ? "done" : ""}`}>{sections[1].done ? "✓" : "2"}</div>
                  <div>
                    <div className="post-section-title">Item Details</div>
                    <div className="post-section-desc">Be specific to attract serious buyers</div>
                  </div>
                </div>

                {/* Item Name */}
                <div className="form-group">
                  <label className="form-label" htmlFor="post-title">Item Name <span className="req">*</span></label>
                  <input
                    id="post-title"
                    className={`form-input ${title ? "filled" : ""}`}
                    placeholder="e.g. Engineering Mathematics by R.K. Jain, 4th Edition"
                    value={title} onChange={e => setTitle(e.target.value)} required
                    aria-required="true"
                  />
                  {title && <div className="form-input-check">✓</div>}
                  {suggestedCat && category !== suggestedCat && (
                    <div className="post-ai-cat-banner" style={{ marginTop: 8 }}>
                      <span className="post-ai-icon">✨</span>
                      <div style={{ flex: 1 }}>
                        <div className="post-ai-label">MateGeni suggests</div>
                        <div className="post-ai-value">
                          <strong>{CAT_ICONS[suggestedCat]} {suggestedCat}</strong>
                          <span className="post-ai-conf">{Math.round(suggestedCatConf * 100)}% confidence</span>
                        </div>
                      </div>
                      <button type="button" className="post-ai-apply-btn" onClick={() => {
                        setCategory(suggestedCat); setSuggestedCat("");
                        trackAIEvent(AI_EVENTS.CATEGORY_SUGGESTION_ACCEPTED, userId, { category: suggestedCat });
                        toast(`Category set to ${suggestedCat} ✓`, "success");
                      }}>Apply</button>
                      <button type="button" className="post-ai-dismiss-btn" onClick={() => {
                        setSuggestedCat("");
                        trackAIEvent(AI_EVENTS.CATEGORY_SUGGESTION_DISMISSED, userId, { category: suggestedCat });
                      }} title="Dismiss suggestion">✕</button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label className="form-label" htmlFor="post-desc" style={{ margin: 0 }}>Description <span className="req">*</span></label>
                    <MateGeniButton
                      flag="enableListingOptimizer"
                      type="button"
                      onClick={handleOptimizeDescription}
                      disabled={optimizerLoading || description.length < 20}
                      style={{ padding: "4px 10px", fontSize: "12px", minHeight: "unset" }}
                    >
                      {optimizerLoading ? "Optimizing..." : "Optimize"}
                    </MateGeniButton>
                  </div>
                  <div style={{ position: "relative" }}>
                    <textarea
                      id="post-desc"
                      className={`form-input ${description ? "filled" : ""}`}
                      rows={4} placeholder="Describe condition, edition, any highlights or damage..."
                      value={description} onChange={e => setDescription(e.target.value)}
                      required style={{ resize: "vertical", width: "100%" }}
                      maxLength={500}
                      aria-required="true"
                    />
                    <div className="char-count">{description.length} / 500</div>
                  </div>
                  {description.length > 0 && description.length < 30 && (
                    <div className="post-desc-hint">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      Recommended: Minimum 30 characters for better visibility
                    </div>
                  )}
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Category <span className="req">*</span></label>
                  <div className="post-cat-grid" style={{ marginBottom: "10px" }} role="radiogroup" aria-label="Select category">
                    {PRIMARY_CATEGORIES.map(c => {
                      const isActive = category === c;
                      return (
                        <button key={c} type="button" role="radio" aria-checked={isActive}
                          className={`post-cat-btn ${isActive ? "active" : ""}`}
                          onClick={() => { setCategory(c); if (suggestedCat === c) setSuggestedCat(""); }}
                        >
                          <span className="post-cat-icon">{CAT_ICONS[c]}</span>
                          <span className="post-cat-label">{c}</span>
                          {isActive && <span className="post-cat-check">✓</span>}
                        </button>
                      );
                    })}
                    {(() => {
                      const isMoreSelected = MORE_CATEGORIES.includes(category);
                      return (
                        <button type="button"
                          className={`post-cat-btn ${isMoreSelected || showMoreCategories ? "active" : ""}`}
                          onClick={() => setShowMoreCategories(prev => !prev)}
                        >
                          <span className="post-cat-icon">➕</span>
                          <span className="post-cat-label">{isMoreSelected ? `More: ${category}` : "More"}</span>
                          {isMoreSelected && <span className="post-cat-check">✓</span>}
                        </button>
                      );
                    })()}
                  </div>
                  {showMoreCategories && (
                    <div style={{ padding: "14px 12px 12px", background: "var(--bg-secondary)", borderRadius: "var(--r-md)", border: "1.5px solid var(--bdr)", marginTop: "10px", transition: "all 0.25s ease" }}>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px" }}>More Categories</div>
                      <div className="post-cat-grid">
                        {MORE_CATEGORIES.map(c => {
                          const isActive = category === c;
                          return (
                            <button key={c} type="button" role="radio" aria-checked={isActive}
                              className={`post-cat-btn ${isActive ? "active" : ""}`}
                              onClick={() => { setCategory(c); if (suggestedCat === c) setSuggestedCat(""); }}
                            >
                              <span className="post-cat-icon">{CAT_ICONS[c]}</span>
                              <span className="post-cat-label">{c}</span>
                              {isActive && <span className="post-cat-check">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {category === "Other" && (
                    <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--muted)", fontStyle: "italic", display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-secondary)", padding: "8px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--bdr)" }}>
                      <span>💡</span> <span>Use Other only if your item does not fit any category.</span>
                    </div>
                  )}
                </div>

                {/* Condition */}
                <div className="form-group">
                  <label className="form-label">Condition <span className="req">*</span></label>
                  <div className="post-cond-grid" role="radiogroup" aria-label="Select condition">
                    {CONDITIONS.map(c => {
                      const meta = COND_META[c];
                      const isActive = condition === c;
                      return (
                        <button key={c} type="button" role="radio" aria-checked={isActive}
                          className={`post-cond-btn ${isActive ? "active" : ""}`}
                          onClick={() => setCondition(c)}
                          style={isActive ? { borderColor: meta.color, background: meta.bg } : {}}
                        >
                          <div className="post-cond-icon-row">
                            <span className="post-cond-emoji">{meta.icon}</span>
                            <span className="post-cond-label" style={isActive ? { color: meta.color } : {}}>{meta.label}</span>
                            {isActive && <span className="post-cond-check" style={{ color: meta.color }}>✓</span>}
                          </div>
                          <div className="post-cond-desc">{meta.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ═══ Section 3: Listing Type & Pricing ═══ */}
              <div className="post-section">
                <div className="post-section-header">
                  <div className={`post-section-num ${sections[2].done ? "done" : ""}`}>{sections[2].done ? "✓" : "3"}</div>
                  <div>
                    <div className="post-section-title">Listing Type & Pricing</div>
                    <div className="post-section-desc">Choose how you want to list this item</div>
                  </div>
                </div>

                <div className="post-type-grid">
                  {[
                    { val: "sell", icon: "💰", label: "Sell", desc: "One-time sale" },
                    { val: "free", icon: "💚", label: "Donate Free", desc: "Help a fellow student" },
                    { val: "rent", icon: "🔄", label: "Rent/Borrow", desc: "Lend for daily rent" },
                  ].map(t => (
                    <button key={t.val} type="button"
                      className={`post-type-btn ${listingType === t.val ? "active" : ""}`}
                      onClick={() => handleTypeChange(t.val)}
                      role="radio" aria-checked={listingType === t.val}
                    >
                      <span style={{ fontSize: 22 }}>{t.icon}</span>
                      <span className="post-type-label">{t.label}</span>
                      <span className="post-type-desc">{t.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Sell price */}
                {listingType === "sell" && (
                  <div style={{ marginTop: 16 }}>
                    <label className="form-label" htmlFor="post-price">Your Price (₹) <span className="req">*</span></label>
                    <div className="post-price-row">
                      <div className="post-price-input-wrap">
                        <span className="post-price-symbol">₹</span>
                        <input id="post-price" className="form-input post-price-input" type="number" min="1"
                          placeholder="Enter selling price" value={price} onChange={e => setPrice(e.target.value)}
                          aria-required="true" />
                      </div>
                      <button type="button" className="post-ai-btn" onClick={suggestPrice} disabled={aiLoading}>
                        {aiLoading ? <><span className="post-ai-spinner" /> Getting…</> : <>✨ AI Price Suggestion</>}
                      </button>
                    </div>

                    {/* AI Price Suggestion Card */}
                    {priceSuggestion && (
                      <div className="mategeni-price-card">
                        <div className="mategeni-price-card-header">
                          <span>✨ AI Price Suggestion</span>
                          <span className="mategeni-price-conf">{Math.round((priceSuggestion.confidenceScore || 0) * 100)}% confidence</span>
                        </div>
                        <div className="mategeni-price-cols">
                          <div className="mategeni-price-col">
                            <div className="mategeni-price-col-label">Min</div>
                            <div className="mategeni-price-col-val">₹{(priceSuggestion.minPrice || 0).toLocaleString("en-IN")}</div>
                          </div>
                          <div className="mategeni-price-col recommended">
                            <div className="mategeni-price-col-label">Suggested ★</div>
                            <div className="mategeni-price-col-val">₹{(priceSuggestion.recommendedPrice || 0).toLocaleString("en-IN")}</div>
                          </div>
                          <div className="mategeni-price-col">
                            <div className="mategeni-price-col-label">Max</div>
                            <div className="mategeni-price-col-val">₹{(priceSuggestion.maxPrice || 0).toLocaleString("en-IN")}</div>
                          </div>
                        </div>
                        {priceSuggestion.reason && (
                          <div className="mategeni-price-reason">💡 {priceSuggestion.reason}</div>
                        )}
                        <div className="mategeni-price-actions">
                          <button type="button" className="mategeni-price-apply-btn" onClick={() => {
                            setPrice(String(priceSuggestion.recommendedPrice || ""));
                            setPriceSuggestion(null);
                            toast(`Price set to ₹${(priceSuggestion.recommendedPrice || 0).toLocaleString("en-IN")} ✓`, "success");
                          }}>
                            Apply Suggestion
                          </button>
                          <button type="button" className="mategeni-price-dismiss-btn" onClick={() => setPriceSuggestion(null)}>
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Suggestion hint under input */}
                    {priceSuggestion && (
                      <div className="post-price-hint">
                        Suggested: ₹{(priceSuggestion.minPrice || 0).toLocaleString("en-IN")}–₹{(priceSuggestion.maxPrice || 0).toLocaleString("en-IN")}
                        <span className="post-price-demand">
                          Estimated Demand: <strong>{priceSuggestion.recommendedPrice && price && Number(price) <= priceSuggestion.recommendedPrice ? "High" : Number(price) <= (priceSuggestion.maxPrice || 0) ? "Medium" : "Low"}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Free message */}
                {listingType === "free" && (
                  <div className="post-free-toggle active" style={{ marginTop: 16, cursor: "default" }}>
                    <div className="post-free-left">
                      <div className="post-free-icon">💚</div>
                      <div>
                        <div className="post-free-title">Donating for Free</div>
                        <div className="post-free-sub">This item will be listed at ₹0 — great karma! 🙏</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rent fields */}
                {listingType === "rent" && (
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="post-rent-info">
                      🔄 Rental listings let students borrow your item for a daily fee with optional security deposit.
                    </div>
                    <div>
                      <label className="form-label" htmlFor="post-rent">Rent per Day (₹) <span className="req">*</span></label>
                      <div className="post-price-input-wrap">
                        <span className="post-price-symbol">₹</span>
                        <input id="post-rent" className="form-input post-price-input" type="number" min="1"
                          placeholder="e.g. 50" value={rentPerDay} onChange={e => setRentPerDay(e.target.value)} required={isRent}
                          aria-required="true" />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="post-min-days">Min. Days</label>
                        <input id="post-min-days" className="form-input" type="number" min="1"
                          value={rentMinDays} onChange={e => setRentMinDays(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="post-max-days">Max. Days</label>
                        <input id="post-max-days" className="form-input" type="number" min="1"
                          value={rentMaxDays} onChange={e => setRentMaxDays(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label" htmlFor="post-deposit">Security Deposit (₹) <span style={{ color: "var(--muted-2)", fontSize: 12, fontWeight: 400 }}>— optional</span></label>
                      <div className="post-price-input-wrap">
                        <span className="post-price-symbol">₹</span>
                        <input id="post-deposit" className="form-input post-price-input" type="number" min="0"
                          placeholder="0" value={rentDeposit} onChange={e => setRentDeposit(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ═══ Section 4: Meetup Spot ═══ */}
              <div className="post-section">
                <div className="post-section-header">
                  <div className={`post-section-num ${sections[3].done ? "done" : ""}`}>{sections[3].done ? "✓" : "4"}</div>
                  <div>
                    <div className="post-section-title">📍 Preferred Meetup Spot</div>
                    <div className="post-section-desc">Where will you hand over the item on campus?</div>
                  </div>
                </div>
                <div className="post-meetup-grid" role="radiogroup" aria-label="Select meetup spot">
                  {MEETUP_SPOTS.map(spot => (
                    <button key={spot} type="button" role="radio" aria-checked={meetupSpot === spot}
                      className={`post-meetup-btn ${meetupSpot === spot ? "active" : ""}`}
                      onClick={() => setMeetupSpot(spot)}
                    >
                      <span className="post-meetup-icon">
                        {spot.includes("Library") ? "📚" : spot.includes("Canteen") ? "🍽️" : spot.includes("Hostel") ? "🏠" : spot.includes("Academic") ? "🎓" : spot.includes("Parking") ? "🚗" : spot.includes("Sports") ? "⚽" : spot.includes("Admin") ? "🏢" : "📍"}
                      </span>
                      {spot}
                      {meetupSpot === spot && <span className="post-meetup-check">✓</span>}
                    </button>
                  ))}
                </div>
                {meetupSpot === "Custom location…" && (
                  <div style={{ marginTop: 12 }}>
                    <input id="post-custom-meetup" className="form-input" placeholder="e.g. Near CSE Department, Room 204"
                      value={customMeetup} onChange={e => setCustomMeetup(e.target.value)} aria-label="Custom meetup location" />
                  </div>
                )}
                {!meetupSpot && (
                  <div style={{ fontSize: 12, color: "var(--muted-2)", marginTop: 8 }}>
                    Optional — buyers will see this on the listing
                  </div>
                )}
              </div>

            </div>{/* end post-left */}

            {/* ═══ RIGHT: Preview & Quality ═══ */}
            <div className="post-right">
              <div className="post-preview-sticky">

                {/* Live Preview */}
                <div className="post-preview-label">Live Preview</div>
                <div className="post-preview-card">
                  <div className="post-preview-img">
                    {images[0]
                      ? <img src={images[0].src} alt="Cover" />
                      : <div className="post-preview-placeholder">
                          <span style={{ fontSize: 36 }}>{CAT_ICONS[category]}</span>
                          <span>Add photos above</span>
                        </div>
                    }
                    {listingType === "free" && <span className="free-badge">FREE</span>}
                    {listingType === "rent" && <span className="rent-badge">RENT</span>}
                    {listingType === "sell" && condition && (
                      <span className="condition-badge-new"
                        style={{ background: COND_META[condition]?.bg, color: COND_META[condition]?.color }}>
                        {condition}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: "14px 15px 15px" }}>
                    <div className="card-cat">{CAT_ICONS[category]} {category}</div>
                    <div className="card-title" style={{ fontSize: 15, fontWeight: 700 }}>
                      {title || <span style={{ color: "var(--muted-2)", fontWeight: 500 }}>Item name…</span>}
                    </div>
                    {finalMeetupDisplay && (
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>📍 {finalMeetupDisplay}</div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--bdr)" }}>
                      <div className={`card-price ${listingType === "free" ? "free" : ""}`} style={{ fontSize: 18, color: isRent ? "var(--p-dark)" : undefined }}>
                        {previewPrice}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>{userProfile?.name || "You"}</span>
                        {userProfile?.collegeVerified && (
                          <span title="Verified" style={{ fontSize: 12, color: "var(--grn)" }}>✓</span>
                        )}
                        <div className="card-seller-avatar">{(userProfile?.name || "Y")[0].toUpperCase()}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Listing Quality Score ── */}
                <div className="post-quality-card">
                  <div className="post-quality-header">
                    <span className="post-quality-title">Listing Quality</span>
                    <span className={`post-quality-score ${qualityData.score >= 80 ? "high" : qualityData.score >= 50 ? "mid" : "low"}`}>
                      {qualityData.score}%
                    </span>
                  </div>
                  <div className="post-quality-bar">
                    <div
                      className={`post-quality-fill ${qualityData.score >= 80 ? "high" : qualityData.score >= 50 ? "mid" : "low"}`}
                      style={{ width: `${qualityData.score}%` }}
                    />
                  </div>
                  {qualityData.good.length > 0 && (
                    <div className="post-quality-list">
                      {qualityData.good.map((g, i) => (
                        <div key={i} className="post-quality-item good">✓ {g}</div>
                      ))}
                    </div>
                  )}
                  {qualityData.missing.length > 0 && (
                    <div className="post-quality-list">
                      <div className="post-quality-missing-label">Missing:</div>
                      {qualityData.missing.map((m, i) => (
                        <div key={i} className="post-quality-item missing">• {m}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Dynamic Tips Checklist ── */}
                <div className="post-tips">
                  <div className="post-tips-header">
                    <span className="post-tips-title">💡 Listing Checklist</span>
                    <span className="post-tips-count">{tipsCompleted} / {tips.length}</span>
                  </div>
                  {tips.map((tip, i) => (
                    <div key={i} className={`post-tip ${tip.done ? "done" : ""}`}>
                      <span className="post-tip-icon">{tip.done ? "✓" : "○"}</span>
                      {tip.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Sticky Submit Bar ═══ */}
          <div className="post-submit-bar">
            <div className="post-submit-bar-left">
              {!canSubmit && (
                <span className="post-submit-hint">Complete required fields to publish.</span>
              )}
              {canSubmit && (
                <span className="post-submit-ready">✓ Ready to publish</span>
              )}
            </div>
            <div className="post-submit-bar-right">
              <button type="button" className="post-cancel-btn" onClick={() => navigateAway("home")}>Cancel</button>
              <button type="submit" className="post-submit-btn" disabled={loading || !canSubmit}>
                {loading
                  ? <><span className="post-ai-spinner" style={{ borderColor: "rgba(255,255,255,.3)", borderTopColor: "#fff" }} />{isEdit ? "Saving…" : "Uploading…"}</>
                  : isEdit
                    ? <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Save Changes</>
                    : <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Post Listing</>
                }
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ═══ Modals ═══ */}
      <MateGeniModal
        flag="enableListingOptimizer"
        isOpen={optimizerModalOpen}
        onClose={() => setOptimizerModalOpen(false)}
        title="MateGeni Listing Optimizer"
      >
        {optimizedData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div className="mategeni-modal-section-label">✨ Optimized Title</div>
              <div className="mategeni-modal-value" style={{ fontWeight: 700 }}>
                {optimizedData.optimizedTitle}
              </div>
            </div>
            {optimizedData.keySellingPoints && optimizedData.keySellingPoints.length > 0 && (
              <div>
                <div className="mategeni-modal-section-label">🎯 Key Selling Points</div>
                <ul className="mategeni-ksp-list">
                  {optimizedData.keySellingPoints.map((pt, i) => (
                    <li key={i} className="mategeni-ksp-item">✓ {pt}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <div className="mategeni-modal-section-label">📝 Optimized Description</div>
              <div className="mategeni-modal-value" style={{ whiteSpace: "pre-line", lineHeight: "1.7" }}>
                {optimizedData.optimizedDescription}
              </div>
            </div>
            {optimizedData.suggestedTags && optimizedData.suggestedTags.length > 0 && (
              <div>
                <div className="mategeni-modal-section-label">🏷️ Suggested Tags</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                  {optimizedData.suggestedTags.map(tag => (
                    <span key={tag} className="mategeni-tag-chip">#{tag}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" style={{ fontSize: "13px", padding: "8px 16px" }} onClick={() => setOptimizerModalOpen(false)}>
                Keep Original
              </button>
              <button type="button" className="btn btn-primary" style={{ fontSize: "13px", padding: "8px 16px" }}
                onClick={() => {
                  setTitle(optimizedData.optimizedTitle);
                  setDescription(optimizedData.optimizedDescription);
                  setOptimizerModalOpen(false);
                  toast("Applied MateGeni suggestions! ✨", "success");
                }}>
                ✨ Apply All
              </button>
            </div>
          </div>
        )}
      </MateGeniModal>

      {/* Discard confirmation */}
      <ConfirmModal
        isOpen={showDiscard}
        title="Discard Listing?"
        message={"You have unsaved changes. Are you sure you want to leave?\n\nYour draft will be discarded."}
        onClose={() => setShowDiscard(false)}
        onConfirm={confirmDiscard}
        confirmText="Discard Listing"
        cancelText="Continue Editing"
        danger
      />
    </div>
  );
}