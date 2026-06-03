import React, { useState, useRef } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { uploadMultipleToCloudinary } from "../utils/cloudinary";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const CATEGORIES = ["Textbooks","Notes","Lab Equipment","Electronics","Stationery","Misc"];
const CAT_ICONS  = { Textbooks:"📖", Notes:"📝", "Lab Equipment":"🔬", Electronics:"💻", Stationery:"✏️", Misc:"📦" };
const CONDITIONS = ["New","Good","Fair","Old"];
const COND_META  = {
  New:  { label:"Brand New",     color:"#15803d", bg:"#dcfce7", desc:"Unused, original packaging" },
  Good: { label:"Good",          color:"#1d4ed8", bg:"#dbeafe", desc:"Minor wear, works perfectly" },
  Fair: { label:"Fair",          color:"#a16207", bg:"#fef9c3", desc:"Visible wear, fully functional" },
  Old:  { label:"Heavily Used",  color:"#b91c1c", bg:"#fee2e2", desc:"Signs of heavy use" },
};

export default function PostListingPage({ setPage, editListing }) {
  const { currentUser, userProfile } = useAuth();
  const toast = useToast();
  const isEdit = !!editListing;

  const [title,       setTitle]       = useState(editListing?.title       || "");
  const [description, setDescription] = useState(editListing?.description || "");
  const [category,    setCategory]    = useState(editListing?.category    || "Textbooks");
  const [condition,   setCondition]   = useState(editListing?.condition   || "Good");
  const [price,       setPrice]       = useState(editListing?.price       || "");
  const [isFree,      setIsFree]      = useState(editListing?.isFree      || false);
  const [existingImages, setExistingImages] = useState(editListing?.images || []);
  const [newFiles,    setNewFiles]    = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiSuggestion,setAiSuggestion]= useState("");
  const [dragOver,    setDragOver]    = useState(false);
  const fileRef = useRef();

  const totalImages = existingImages.length + newPreviews.length;
  const progress = [title, description, (totalImages > 0 || isEdit)].filter(Boolean).length;

  function handleFiles(files) {
    const picked = Array.from(files).slice(0, 4 - existingImages.length);
    setNewFiles(picked);
    setNewPreviews(picked.map(f => URL.createObjectURL(f)));
  }
  function handleImageChange(e) { handleFiles(e.target.files); }
  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }
  function removeExisting(i) { setExistingImages(p => p.filter((_,x) => x !== i)); }
  function removeNew(i) {
    setNewFiles(p => p.filter((_,x) => x !== i));
    setNewPreviews(p => p.filter((_,x) => x !== i));
  }

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
          model:"llama3-8b-8192", max_tokens:80, temperature:0.3,
          messages:[
            { role:"system", content:"You are a price advisor for a college student marketplace in India. Give concise resale price suggestions in INR only." },
            { role:"user",   content:`Item: "${title}", Category: ${category}, Condition: ${condition}. Reply ONLY: ₹MIN – ₹MAX (reason max 8 words). No extra text.` }
          ]
        })
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setAiSuggestion(data.choices?.[0]?.message?.content?.trim() || "");
    } catch { localFallback(); }
    setAiLoading(false);
  }

  function localFallback() {
    const m = { New:0.85, Good:0.60, Fair:0.40, Old:0.20 }[condition]||0.5;
    const r = { Textbooks:{a:80,b:800}, Notes:{a:30,b:200}, "Lab Equipment":{a:100,b:2000}, Electronics:{a:200,b:5000}, Stationery:{a:20,b:300}, Misc:{a:50,b:500} };
    let a = r[category]?.a||100, b = r[category]?.b||1000;
    const kw = title.toLowerCase();
    if (kw.includes("laptop")||kw.includes("macbook"))        { a=8000; b=40000; }
    else if (kw.includes("tablet")||kw.includes("ipad"))      { a=5000; b=25000; }
    else if (kw.includes("calculator")||kw.includes("casio")) { a=400;  b=1200;  }
    else if (kw.includes("headphone")||kw.includes("earphone")){ a=300; b=3000;  }
    else if (kw.includes("arduino")||kw.includes("raspberry")){ a=500;  b=3000;  }
    else if (kw.includes("oscilloscope")||kw.includes("multimeter")){ a=500; b=4000; }
    const lo = Math.round(a*m/10)*10, hi = Math.round(b*m/10)*10;
    const desc = { New:"near-new, barely used", Good:"good, minor wear", Fair:"fair, visible wear", Old:"heavily used" };
    setTimeout(() => { setAiSuggestion(`₹${lo} – ₹${hi} (${desc[condition]})`); setAiLoading(false); }, 500);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title || !description) { toast("Fill title and description", "error"); return; }
    if (!isFree && (!price || isNaN(price) || Number(price) <= 0)) { toast("Enter a valid price", "error"); return; }
    if (totalImages === 0 && !isEdit) { toast("Add at least one photo", "error"); return; }
    setLoading(true);
    try {
      let uploaded = [];
      if (newFiles.length > 0) uploaded = await uploadMultipleToCloudinary(newFiles);
      const allImages = [...existingImages, ...uploaded];
      if (isEdit) {
        await updateDoc(doc(db, "listings", editListing.id), {
          title, description, category, condition,
          price: isFree ? 0 : Number(price), isFree, images: allImages
        });
        toast("Listing updated! ✅", "success");
      } else {
        await addDoc(collection(db, "listings"), {
          title, description, category, condition,
          price: isFree ? 0 : Number(price), isFree,
          images: allImages,
          sellerId:      currentUser.uid,
          sellerName:    userProfile?.name || currentUser.displayName || "Student",
          sellerCollege: userProfile?.college || "",
          sellerRating:  userProfile?.rating  || 0,
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

  return (
    <div className="post-page">
      <div className="post-container">

        {/* ── Header ── */}
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
              <div className="post-progress-bar">
                <div className="post-progress-fill" style={{ width:`${(progress/3)*100}%` }} />
              </div>
              <span className="post-progress-text">{progress}/3 fields</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="post-form">
          <div className="post-grid">

            {/* ── LEFT: Main form ── */}
            <div className="post-left">

              {/* Photos */}
              <div className="post-section">
                <div className="post-section-header">
                  <div className="post-section-num">1</div>
                  <div>
                    <div className="post-section-title">Photos</div>
                    <div className="post-section-desc">Good photos = faster sale · Up to 4 images</div>
                  </div>
                  {totalImages > 0 && <span className="post-img-count">{totalImages}/4</span>}
                </div>

                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display:"none" }} />

                {totalImages < 4 && (
                  <div
                    className={`post-dropzone ${dragOver ? "dragover" : ""}`}
                    onClick={() => fileRef.current.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
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
                      <div key={`e${i}`} className={`post-img-item ${i===0 ? "main" : ""}`}>
                        <img src={url} alt="" />
                        {i === 0 && <span className="post-img-main-badge">Main</span>}
                        <button type="button" className="post-img-remove" onClick={() => removeExisting(i)}>✕</button>
                      </div>
                    ))}
                    {newPreviews.map((url, i) => (
                      <div key={`n${i}`} className={`post-img-item ${existingImages.length===0&&i===0 ? "main" : ""}`}>
                        <img src={url} alt="" />
                        {existingImages.length===0&&i===0 && <span className="post-img-main-badge">Main</span>}
                        <span className="post-img-new-badge">New</span>
                        <button type="button" className="post-img-remove" onClick={() => removeNew(i)}>✕</button>
                      </div>
                    ))}
                    {totalImages < 4 && (
                      <div className="post-img-add" onClick={() => fileRef.current.click()}>
                        <span>+</span>
                        <span>Add</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Details */}
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
                  <input
                    className={`form-input ${title ? "filled" : ""}`}
                    placeholder="e.g. Engineering Mathematics by R.K. Jain, 4th Edition"
                    value={title} onChange={e => setTitle(e.target.value)} required
                  />
                  {title && <div className="form-input-check">✓</div>}
                </div>

                <div className="form-group" style={{ position:"relative" }}>
                  <label className="form-label">Description <span className="req">*</span></label>
                  <textarea
                    className={`form-input ${description ? "filled" : ""}`}
                    rows={4}
                    placeholder="Describe condition, edition, any highlights or damage..."
                    value={description} onChange={e => setDescription(e.target.value)}
                    required style={{ resize:"vertical" }}
                  />
                  <div className="char-count">{description.length}/500</div>
                </div>

                {/* Category pills */}
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

                {/* Condition cards */}
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

              {/* Pricing */}
              <div className="post-section">
                <div className="post-section-header">
                  <div className="post-section-num">3</div>
                  <div>
                    <div className="post-section-title">Pricing</div>
                    <div className="post-section-desc">Set a fair price or donate for free</div>
                  </div>
                </div>

                {/* Free toggle */}
                <div className={`post-free-toggle ${isFree ? "active" : ""}`} onClick={() => setIsFree(f => !f)}>
                  <div className="post-free-left">
                    <div className="post-free-icon">💚</div>
                    <div>
                      <div className="post-free-title">Donate for Free</div>
                      <div className="post-free-sub">Help fellow students — makes a real impact</div>
                    </div>
                  </div>
                  <div className={`post-free-switch ${isFree ? "on" : ""}`}>
                    <div className="post-free-thumb" />
                  </div>
                </div>

                {!isFree && (
                  <div style={{ marginTop:16 }}>
                    <label className="form-label">Your Price (₹) <span className="req">*</span></label>
                    <div className="post-price-row">
                      <div className="post-price-input-wrap">
                        <span className="post-price-symbol">₹</span>
                        <input
                          className="form-input post-price-input"
                          type="number" min="1"
                          placeholder="0"
                          value={price} onChange={e => setPrice(e.target.value)}
                        />
                      </div>
                      <button type="button" className="post-ai-btn" onClick={suggestPrice} disabled={aiLoading}>
                        {aiLoading ? (
                          <><span className="post-ai-spinner" /> Getting...</>
                        ) : (
                          <><span>🤖</span> AI Suggest</>
                        )}
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
              </div>
            </div>

            {/* ── RIGHT: Preview card ── */}
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
                    {isFree && <span className="free-badge">FREE</span>}
                    {!isFree && condition && (
                      <span className="condition-badge-new"
                        style={{ background: COND_META[condition]?.bg, color: COND_META[condition]?.color }}>
                        {condition}
                      </span>
                    )}
                  </div>
                  <div style={{ padding:"14px 15px 15px" }}>
                    <div className="card-cat">{CAT_ICONS[category]} {category}</div>
                    <div className="card-title" style={{ fontSize:15, fontWeight:700 }}>
                      {title || <span style={{ color:"var(--muted-2)", fontWeight:500 }}>Item name...</span>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8, paddingTop:10, borderTop:"1px solid var(--bdr)" }}>
                      <div className={`card-price ${isFree ? "free" : ""}`} style={{ fontSize:18 }}>
                        {isFree ? "Free 💚" : price ? <>₹{Number(price).toLocaleString("en-IN")}</> : <span style={{ color:"var(--muted-2)", fontSize:14, fontWeight:500 }}>Set price</span>}
                      </div>
                      <div className="card-seller-avatar">{(userProfile?.name || "Y")[0].toUpperCase()}</div>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="post-tips">
                  <div className="post-tips-title">💡 Tips for faster sales</div>
                  {["Use natural light for photos","Set a competitive price","Mention edition/year","Be honest about condition"].map((tip,i) => (
                    <div key={i} className="post-tip">✓ {tip}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Submit bar ── */}
          <div className="post-submit-bar">
            <button type="button" className="post-cancel-btn" onClick={() => setPage("home")}>
              Cancel
            </button>
            <button type="submit" className="post-submit-btn" disabled={loading}>
              {loading ? (
                <><span className="post-ai-spinner" style={{ borderColor:"rgba(255,255,255,.3)", borderTopColor:"#fff" }} />{isEdit ? "Saving..." : "Uploading..."}</>
              ) : isEdit ? (
                <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Save Changes</>
              ) : (
                <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Post Listing</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
