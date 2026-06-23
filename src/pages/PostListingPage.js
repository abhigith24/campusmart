import React, { useState, useRef } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { uploadMultipleToCloudinary } from "../utils/cloudinary";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const CATEGORIES = ["Textbooks","Notes","Lab Equipment","Electronics","Stationery","Girls","Misc"];
const CAT_ICONS  = { Textbooks:"📖", Notes:"📝", "Lab Equipment":"🔬", Electronics:"💻", Stationery:"✏️", Girls:"👗", Misc:"📦" };
const CONDITIONS = ["New","Good","Fair","Old"];
const COND_META  = {
  New:  { label:"Brand New",    color:"#15803d", bg:"#dcfce7", desc:"Unused, original packaging" },
  Good: { label:"Good",         color:"#1d4ed8", bg:"#dbeafe", desc:"Minor wear, works perfectly" },
  Fair: { label:"Fair",         color:"#a16207", bg:"#fef9c3", desc:"Visible wear, fully functional" },
  Old:  { label:"Heavily Used", color:"#b91c1c", bg:"#fee2e2", desc:"Signs of heavy use" },
};

const MEETUP_SPOTS = [
  "Library Entrance",
  "Main Canteen",
  "Hostel Gate A",
  "Hostel Gate B",
  "Hostel Gate C",
  "Academic Block Lobby",
  "Parking Area",
  "Sports Complex",
  "Admin Block",
  "Custom location…",
];

export default function PostListingPage({ setPage, editListing }) {
  const { currentUser, userProfile } = useAuth();
  const toast = useToast();
  const isEdit = !!editListing;

  const [title,         setTitle]         = useState(editListing?.title         || "");
  const [description,   setDescription]   = useState(editListing?.description   || "");
  const [category,      setCategory]      = useState(editListing?.category      || "Textbooks");
  const [condition,     setCondition]     = useState(editListing?.condition     || "Good");
  const [listingType,   setListingType]   = useState(editListing?.listingType   || "sell"); // "sell" | "free" | "rent"
  const [price,         setPrice]         = useState(editListing?.price         || "");
  const [,              setIsFree]        = useState(editListing?.isFree        || false);
  // Rent fields
  const [rentPerDay,    setRentPerDay]    = useState(editListing?.rentPerDay    || "");
  const [rentMinDays,   setRentMinDays]   = useState(editListing?.rentMinDays   || "1");
  const [rentMaxDays,   setRentMaxDays]   = useState(editListing?.rentMaxDays   || "30");
  const [rentDeposit,   setRentDeposit]   = useState(editListing?.rentDeposit   || "");
  // Meetup
  const [meetupSpot,    setMeetupSpot]    = useState(editListing?.meetupSpot    || "");
  const [customMeetup,  setCustomMeetup]  = useState("");
  const [existingImages, setExistingImages] = useState(editListing?.images || []);
  const [newFiles,      setNewFiles]      = useState([]);
  const [newPreviews,   setNewPreviews]   = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiSuggestion,  setAiSuggestion]  = useState("");
  const [dragOver,      setDragOver]      = useState(false);
  const fileRef = useRef();

  const totalImages = existingImages.length + newPreviews.length;
  const progress = [title, description, totalImages > 0].filter(Boolean).length;

  // Sync listingType with isFree state
  function handleTypeChange(type) {
    setListingType(type);
    setIsFree(type === "free");
  }

  // SOLD GUARD
  if (isEdit && editListing?.status === "sold") {
    return (
      <div className="post-page">
        <div className="post-container" style={{ maxWidth:600 }}>
          <div className="post-header">
            <button className="post-back" onClick={() => setPage("home")}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <h1 className="post-title">Listing Sold</h1>
              <p className="post-subtitle">This item has been marked as sold</p>
            </div>
          </div>
          <div style={{ background:"#fff", border:"1.5px solid var(--bdr)", borderRadius:"var(--r-lg)", padding:32, textAlign:"center", boxShadow:"var(--s1)" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🔒</div>
            <h2 style={{ fontSize:20, fontWeight:800, marginBottom:10 }}>Cannot Edit Sold Listing</h2>
            <p style={{ fontSize:14, color:"var(--muted)", lineHeight:1.7, marginBottom:24, maxWidth:360, margin:"0 auto 24px" }}>
              This listing has been sold and can no longer be edited.
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <button className="btn btn-outline" onClick={() => setPage("home")}>← Back to Feed</button>
              <button className="btn btn-primary" onClick={() => setPage("post")}>+ Post New Item</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function handleFiles(files) {
    const picked = Array.from(files).slice(0, 4 - existingImages.length);
    setNewFiles(picked);
    setNewPreviews(picked.map(f => URL.createObjectURL(f)));
  }
  function handleImageChange(e) { handleFiles(e.target.files); }
  function handleDrop(e) { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }
  function removeExisting(i) { setExistingImages(p => p.filter((_,x) => x !== i)); }
  function removeNew(i) { setNewFiles(p => p.filter((_,x) => x !== i)); setNewPreviews(p => p.filter((_,x) => x !== i)); }

  async function suggestPrice() {
    if (!title) { toast("Enter item name first", "error"); return; }
    setAiLoading(true); setAiSuggestion("");
    const GROQ_KEY = process.env.REACT_APP_GROQ_API_KEY;
    if (!GROQ_KEY) { localFallback(); return; }
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model:"llama-3.1-8b-instant",
          messages:[{
            role:"user",
            content:`You are a price advisor for a college marketplace in India. Suggest a fair second-hand price in INR for: "${title}" (condition: ${condition}). Reply with just 1-2 sentences with a price range.`
          }],
          max_tokens:80, temperature:0.4
        })
      });
      const data = await res.json();
      setAiSuggestion(data.choices?.[0]?.message?.content || "");
    } catch { localFallback(); }
    setAiLoading(false);
  }

  function localFallback() {
    const base = { Textbooks:300, Notes:100, "Lab Equipment":500, Electronics:2000, Stationery:80, Misc:200 };
    const mult = { New:1, Good:0.65, Fair:0.4, Old:0.2 };
    const est = Math.round((base[category]||300) * (mult[condition]||0.5));
    setAiSuggestion(`Suggested price: ₹${Math.round(est*0.8).toLocaleString("en-IN")} – ₹${Math.round(est*1.2).toLocaleString("en-IN")} based on condition and category.`);
    setAiLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (totalImages === 0) { toast("Please upload at least one photo", "error"); return; }
    if (listingType === "sell" && !price) { toast("Please enter a price or mark as free", "error"); return; }
    if (listingType === "rent" && !rentPerDay) { toast("Please enter rent per day amount", "error"); return; }
    if (!title || !description) { toast("Please fill all required fields", "error"); return; }

    const finalMeetup = meetupSpot === "Custom location…" ? customMeetup : meetupSpot;

    setLoading(true);
    try {
      const newUrls = newFiles.length > 0
        ? await uploadMultipleToCloudinary(newFiles)
        : [];
      const allImages = [...existingImages, ...newUrls];

      const baseData = {
        title, description, category, condition,
        listingType, // "sell" | "free" | "rent"
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
        toast("Listing updated! ✅", "success");
      } else {
        await addDoc(collection(db, "listings"), {
          ...baseData,
          status:"active", createdAt:serverTimestamp(), views:0
        });
        toast("Listing posted! 🎉", "success");
      }
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

  return (
    <div className="post-page">
      <div className="post-container">

        {/* Header */}
        <div className="post-header">
          <button className="post-back" onClick={() => setPage("home")}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="post-title">{isEdit ? "Edit Listing" : "Post New Item"}</h1>
            <p className="post-subtitle">{isEdit ? "Update your listing details" : "Reach hundreds of students on your campus"}</p>
          </div>
          {!isEdit && (
            <div className="post-progress">
              <div className="post-progress-bar"><div className="post-progress-fill" style={{ width:`${(progress/3)*100}%` }} /></div>
              <span className="post-progress-text">{progress}/3 fields</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="post-form">
          <div className="post-grid">
            <div className="post-left">

              {/* ── Photos ── */}
              <div className="post-section">
                <div className="post-section-header">
                  <div className="post-section-num">1</div>
                  <div>
                    <div className="post-section-title">Photos <span className="req">*</span></div>
                    <div className="post-section-desc">Good photos = faster sale · Up to 4 images</div>
                  </div>
                  {totalImages > 0 && <span className="post-img-count">{totalImages}/4</span>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display:"none" }} />
                {totalImages < 4 && (
                  <div className={`post-dropzone ${dragOver ? "dragover" : ""}`}
                    onClick={() => fileRef.current.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}>
                    <div className="post-dropzone-icon">
                      <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <div className="post-dropzone-text">Drop photos here or <span className="post-dropzone-link">browse</span></div>
                    <div className="post-dropzone-hint">JPG, PNG up to 5MB each</div>
                  </div>
                )}
                {totalImages > 0 && (
                  <div className="post-img-grid">
                    {existingImages.map((url, i) => (
                      <div key={`e${i}`} className={`post-img-item ${i===0?"main":""}`}>
                        <img src={url} alt="" />
                        {i === 0 && <span className="post-img-main-badge">Main</span>}
                        <button type="button" className="post-img-remove" onClick={() => removeExisting(i)}>✕</button>
                      </div>
                    ))}
                    {newPreviews.map((url, i) => (
                      <div key={`n${i}`} className={`post-img-item ${existingImages.length===0&&i===0?"main":""}`}>
                        <img src={url} alt="" />
                        {existingImages.length===0&&i===0 && <span className="post-img-main-badge">Main</span>}
                        <span className="post-img-new-badge">New</span>
                        <button type="button" className="post-img-remove" onClick={() => removeNew(i)}>✕</button>
                      </div>
                    ))}
                    {totalImages < 4 && (
                      <div className="post-img-add" onClick={() => fileRef.current.click()}><span>+</span><span>Add</span></div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Item Details ── */}
              <div className="post-section">
                <div className="post-section-header">
                  <div className="post-section-num">2</div>
                  <div>
                    <div className="post-section-title">Item Details</div>
                    <div className="post-section-desc">Be specific to attract serious buyers</div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Item Name <span className="req">*</span></label>
                  <input className={`form-input ${title ? "filled" : ""}`}
                    placeholder="e.g. Engineering Mathematics by R.K. Jain, 4th Edition"
                    value={title} onChange={e => setTitle(e.target.value)} required />
                  {title && <div className="form-input-check">✓</div>}
                </div>
                <div className="form-group" style={{ position:"relative" }}>
                  <label className="form-label">Description <span className="req">*</span></label>
                  <textarea className={`form-input ${description ? "filled" : ""}`}
                    rows={4} placeholder="Describe condition, edition, any highlights or damage..."
                    value={description} onChange={e => setDescription(e.target.value)}
                    required style={{ resize:"vertical" }} />
                  <div className="char-count">{description.length}/500</div>
                </div>
                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Category <span className="req">*</span></label>
                  <div className="post-cat-grid">
                    {CATEGORIES.map(c => (
                      <button key={c} type="button"
                        className={`post-cat-btn ${category === c ? "active" : ""}`}
                        onClick={() => setCategory(c)}>
                        <span className="post-cat-icon">{CAT_ICONS[c]}</span>
                        <span className="post-cat-label">{c}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Condition */}
                <div className="form-group">
                  <label className="form-label">Condition <span className="req">*</span></label>
                  <div className="post-cond-grid">
                    {CONDITIONS.map(c => {
                      const meta = COND_META[c];
                      return (
                        <button key={c} type="button"
                          className={`post-cond-btn ${condition === c ? "active" : ""}`}
                          onClick={() => setCondition(c)}
                          style={condition === c ? { borderColor: meta.color, background: meta.bg } : {}}>
                          <div className="post-cond-label" style={condition === c ? { color: meta.color } : {}}>{meta.label}</div>
                          <div className="post-cond-desc">{meta.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Pricing / Listing Type ── */}
              <div className="post-section">
                <div className="post-section-header">
                  <div className="post-section-num">3</div>
                  <div>
                    <div className="post-section-title">Listing Type & Pricing</div>
                    <div className="post-section-desc">Choose how you want to list this item</div>
                  </div>
                </div>

                {/* Type selector */}
                <div className="post-type-grid">
                  {[
                    { val:"sell", icon:"💰", label:"Sell", desc:"One-time sale" },
                    { val:"free", icon:"💚", label:"Donate Free", desc:"Help a fellow student" },
                    { val:"rent", icon:"🔄", label:"Rent/Borrow", desc:"Lend for daily rent" },
                  ].map(t => (
                    <button key={t.val} type="button"
                      className={`post-type-btn ${listingType === t.val ? "active" : ""}`}
                      onClick={() => handleTypeChange(t.val)}>
                      <span style={{ fontSize:22 }}>{t.icon}</span>
                      <span className="post-type-label">{t.label}</span>
                      <span className="post-type-desc">{t.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Sell price */}
                {listingType === "sell" && (
                  <div style={{ marginTop:16 }}>
                    <label className="form-label">Your Price (₹) <span className="req">*</span></label>
                    <div className="post-price-row">
                      <div className="post-price-input-wrap">
                        <span className="post-price-symbol">₹</span>
                        <input className="form-input post-price-input" type="number" min="1"
                          placeholder="0" value={price} onChange={e => setPrice(e.target.value)} />
                      </div>
                      <button type="button" className="post-ai-btn" onClick={suggestPrice} disabled={aiLoading}>
                        {aiLoading ? <><span className="post-ai-spinner" /> Getting…</> : <><span>🤖</span> AI Suggest</>}
                      </button>
                    </div>
                    {aiSuggestion && (
                      <div className="post-ai-result">
                        <span className="post-ai-icon">✨</span>
                        <div>
                          <div className="post-ai-label">AI Suggestion</div>
                          <div className="post-ai-value">{aiSuggestion}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Free message */}
                {listingType === "free" && (
                  <div className="post-free-toggle active" style={{ marginTop:16, cursor:"default" }}>
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
                  <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:12 }}>
                    <div className="post-rent-info">
                      🔄 Rental listings let students borrow your item for a daily fee with optional security deposit.
                    </div>
                    <div>
                      <label className="form-label">Rent per Day (₹) <span className="req">*</span></label>
                      <div className="post-price-input-wrap">
                        <span className="post-price-symbol">₹</span>
                        <input className="form-input post-price-input" type="number" min="1"
                          placeholder="e.g. 50" value={rentPerDay} onChange={e => setRentPerDay(e.target.value)} required={isRent} />
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:12 }}>
                      <div style={{ flex:1 }}>
                        <label className="form-label">Min. Days</label>
                        <input className="form-input" type="number" min="1"
                          value={rentMinDays} onChange={e => setRentMinDays(e.target.value)} />
                      </div>
                      <div style={{ flex:1 }}>
                        <label className="form-label">Max. Days</label>
                        <input className="form-input" type="number" min="1"
                          value={rentMaxDays} onChange={e => setRentMaxDays(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Security Deposit (₹) <span style={{ color:"var(--muted-2)", fontSize:12, fontWeight:400 }}>— optional</span></label>
                      <div className="post-price-input-wrap">
                        <span className="post-price-symbol">₹</span>
                        <input className="form-input post-price-input" type="number" min="0"
                          placeholder="0" value={rentDeposit} onChange={e => setRentDeposit(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Meetup Spot ── */}
              <div className="post-section">
                <div className="post-section-header">
                  <div className="post-section-num">4</div>
                  <div>
                    <div className="post-section-title">📍 Preferred Meetup Spot</div>
                    <div className="post-section-desc">Where will you hand over the item on campus?</div>
                  </div>
                </div>
                <div className="post-meetup-grid">
                  {MEETUP_SPOTS.map(spot => (
                    <button key={spot} type="button"
                      className={`post-meetup-btn ${meetupSpot === spot ? "active" : ""}`}
                      onClick={() => setMeetupSpot(spot)}>
                      <span className="post-meetup-icon">
                        {spot.includes("Library") ? "📚" : spot.includes("Canteen") ? "🍽️" : spot.includes("Hostel") ? "🏠" : spot.includes("Academic") ? "🎓" : spot.includes("Parking") ? "🚗" : spot.includes("Sports") ? "⚽" : spot.includes("Admin") ? "🏢" : "📍"}
                      </span>
                      {spot}
                    </button>
                  ))}
                </div>
                {meetupSpot === "Custom location…" && (
                  <div style={{ marginTop:12 }}>
                    <input className="form-input" placeholder="e.g. Near CSE Department, Room 204"
                      value={customMeetup} onChange={e => setCustomMeetup(e.target.value)} />
                  </div>
                )}
                {!meetupSpot && (
                  <div style={{ fontSize:12, color:"var(--muted-2)", marginTop:8 }}>
                    Optional — buyers will see this on the listing
                  </div>
                )}
              </div>

            </div>{/* end post-left */}

            {/* ── RIGHT: Preview ── */}
            <div className="post-right">
              <div className="post-preview-sticky">
                <div className="post-preview-label">Live Preview</div>
                <div className="post-preview-card">
                  <div className="post-preview-img">
                    {newPreviews[0] || existingImages[0]
                      ? <img src={newPreviews[0] || existingImages[0]} alt="" />
                      : <div className="post-preview-placeholder">
                          <span style={{ fontSize:36 }}>{CAT_ICONS[category]}</span>
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
                  <div style={{ padding:"14px 15px 15px" }}>
                    <div className="card-cat">{CAT_ICONS[category]} {category}</div>
                    <div className="card-title" style={{ fontSize:15, fontWeight:700 }}>
                      {title || <span style={{ color:"var(--muted-2)", fontWeight:500 }}>Item name…</span>}
                    </div>
                    {meetupSpot && meetupSpot !== "Custom location…" && (
                      <div style={{ fontSize:11, color:"var(--muted)", marginTop:4 }}>📍 {meetupSpot}</div>
                    )}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8, paddingTop:10, borderTop:"1px solid var(--bdr)" }}>
                      <div className={`card-price ${listingType === "free" ? "free" : ""}`} style={{ fontSize:18, color: isRent ? "#2563eb" : undefined }}>
                        {previewPrice}
                      </div>
                      <div className="card-seller-avatar">{(userProfile?.name || "Y")[0].toUpperCase()}</div>
                    </div>
                  </div>
                </div>

                <div className="post-tips">
                  <div className="post-tips-title">💡 Tips for faster sales</div>
                  {["Use natural light for photos","Set a competitive price","Mention edition/year","Be honest about condition"].map((tip,i) => (
                    <div key={i} className="post-tip">✓ {tip}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit bar */}
          <div className="post-submit-bar">
            <button type="button" className="post-cancel-btn" onClick={() => setPage("home")}>Cancel</button>
            <button type="submit" className="post-submit-btn" disabled={loading}>
              {loading
                ? <><span className="post-ai-spinner" style={{ borderColor:"rgba(255,255,255,.3)", borderTopColor:"#fff" }} />{isEdit ? "Saving…" : "Uploading…"}</>
                : isEdit
                  ? <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Save Changes</>
                  : <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Post Listing</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}