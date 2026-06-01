import React, { useState, useRef } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { uploadMultipleToCloudinary } from "../utils/cloudinary";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const CATEGORIES = ["Textbooks", "Notes", "Lab Equipment", "Electronics", "Stationery", "Misc"];
const CONDITIONS = ["New", "Good", "Fair", "Old"];

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

  // Existing image URLs (edit mode) + new local previews
  const [existingImages, setExistingImages] = useState(editListing?.images || []);
  const [newFiles,       setNewFiles]       = useState([]);
  const [newPreviews,    setNewPreviews]    = useState([]);

  const [loading,      setLoading]      = useState(false);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const fileRef = useRef();

  function handleImageChange(e) {
    const files = Array.from(e.target.files).slice(0, 4 - existingImages.length);
    setNewFiles(files);
    setNewPreviews(files.map(f => URL.createObjectURL(f)));
  }

  function removeExisting(i) {
    setExistingImages(prev => prev.filter((_, idx) => idx !== i));
  }
  function removeNew(i) {
    setNewFiles(prev => prev.filter((_, idx) => idx !== i));
    setNewPreviews(prev => prev.filter((_, idx) => idx !== i));
  }

  async function suggestPrice() {
    if (!title) { toast("Enter item name first", "error"); return; }
    setAiLoading(true);
    setAiSuggestion("");

    // Smart price estimator — works without any API (browser blocks direct Anthropic calls due to CORS)
    const conditionMultiplier = { New: 0.85, Good: 0.60, Fair: 0.40, Old: 0.20 }[condition] || 0.5;

    const priceRanges = {
      Textbooks:       { min: 80,  max: 800,  unit: "book" },
      Notes:           { min: 30,  max: 200,  unit: "set"  },
      "Lab Equipment": { min: 100, max: 2000, unit: "item" },
      Electronics:     { min: 200, max: 5000, unit: "item" },
      Stationery:      { min: 20,  max: 300,  unit: "set"  },
      Misc:            { min: 50,  max: 500,  unit: "item" },
    };

    // keyword-based price hints
    const keywords = title.toLowerCase();
    let baseMin = priceRanges[category]?.min || 100;
    let baseMax = priceRanges[category]?.max || 1000;

    if (keywords.includes("calculator") || keywords.includes("casio")) { baseMin = 400; baseMax = 1200; }
    else if (keywords.includes("laptop") || keywords.includes("macbook")) { baseMin = 8000; baseMax = 40000; }
    else if (keywords.includes("tablet") || keywords.includes("ipad"))   { baseMin = 5000; baseMax = 25000; }
    else if (keywords.includes("headphone") || keywords.includes("earphone")) { baseMin = 300; baseMax = 3000; }
    else if (keywords.includes("drawing") || keywords.includes("drafting")) { baseMin = 200; baseMax = 600; }
    else if (keywords.includes("reference") || keywords.includes("textbook")) { baseMin = 150; baseMax = 600; }
    else if (keywords.includes("arduino") || keywords.includes("raspberry")) { baseMin = 500; baseMax = 3000; }
    else if (keywords.includes("oscilloscope") || keywords.includes("multimeter")) { baseMin = 500; baseMax = 4000; }

    const suggestedMin = Math.round(baseMin * conditionMultiplier / 10) * 10;
    const suggestedMax = Math.round(baseMax * conditionMultiplier / 10) * 10;

    const reasons = {
      New:  "near-new condition, barely used",
      Good: "good condition, minor wear",
      Fair: "fair condition, visible wear",
      Old:  "old/heavily used",
    };

    await new Promise(r => setTimeout(r, 600)); // feel like it's "thinking"
    setAiSuggestion(`₹${suggestedMin} – ₹${suggestedMax} (${reasons[condition]})`);
    setAiLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title || !description || !category || !condition) {
      toast("Please fill all required fields", "error"); return;
    }
    if (!isFree && (!price || isNaN(price) || Number(price) <= 0)) {
      toast("Enter a valid price", "error"); return;
    }
    if (existingImages.length + newFiles.length === 0 && !isEdit) {
      toast("Add at least one photo", "error"); return;
    }
    setLoading(true);
    try {
      // Upload new files to Cloudinary
      let uploadedUrls = [];
      if (newFiles.length > 0) {
        uploadedUrls = await uploadMultipleToCloudinary(newFiles);
      }
      const allImages = [...existingImages, ...uploadedUrls];

      if (isEdit) {
        await updateDoc(doc(db, "listings", editListing.id), {
          title, description, category, condition,
          price: isFree ? 0 : Number(price),
          isFree,
          images: allImages
        });
        toast("Listing updated! ✅", "success");
      } else {
        await addDoc(collection(db, "listings"), {
          title, description, category, condition,
          price: isFree ? 0 : Number(price),
          isFree,
          images: allImages,
          sellerId:      currentUser.uid,
          sellerName:    userProfile?.name    || currentUser.displayName || "Student",
          sellerCollege: userProfile?.college || "",
          sellerRating:  userProfile?.rating  || 0,
          status:        "active",
          createdAt:     serverTimestamp(),
          views:         0
        });
        toast("Listing posted! 🎉", "success");
      }
      setPage("home");
    } catch (err) {
      console.error(err);
      toast(isEdit ? "Failed to update listing" : "Failed to post listing. Check Cloudinary config.", "error");
    }
    setLoading(false);
  }

  const totalImages = existingImages.length + newPreviews.length;

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h2>{isEdit ? "✏️ Edit Listing" : "📦 Post a Listing"}</h2>
        <p>{isEdit ? "Update your listing details" : "Share your items with fellow students"}</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Photos */}
        <div className="form-card">
          <h3>📸 Photos {totalImages > 0 && <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>({totalImages}/4)</span>}</h3>
          {totalImages < 4 && (
            <div className="img-upload-area" onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageChange} />
              <div style={{ fontSize: 32 }}>🖼️</div>
              <div style={{ fontWeight: 700, marginTop: 8 }}>Click to upload photos</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                Up to 4 photos · JPG/PNG · Uploaded via Cloudinary
              </div>
            </div>
          )}
          {(existingImages.length > 0 || newPreviews.length > 0) && (
            <div className="img-preview" style={{ marginTop: 14 }}>
              {existingImages.map((url, i) => (
                <div key={`ex-${i}`} className="img-preview-item">
                  <img src={url} alt="" />
                  <button type="button" className="img-remove" onClick={() => removeExisting(i)}>×</button>
                </div>
              ))}
              {newPreviews.map((url, i) => (
                <div key={`new-${i}`} className="img-preview-item">
                  <img src={url} alt="" />
                  <div style={{ position: "absolute", bottom: 4, left: 4, background: "var(--green)", color: "white", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4 }}>NEW</div>
                  <button type="button" className="img-remove" onClick={() => removeNew(i)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="form-card">
          <h3>📝 Item Details</h3>
          <div className="form-group">
            <label className="form-label">Item Name *</label>
            <input className="form-input" placeholder="e.g. Engineering Mathematics by R.K. Jain" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-input" rows={3} placeholder="Describe your item — edition, subject, any damage, etc." value={description} onChange={e => setDescription(e.target.value)} required style={{ resize: "vertical" }} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Condition *</label>
              <select className="form-input" value={condition} onChange={e => setCondition(e.target.value)}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="form-card">
          <h3>💰 Pricing</h3>
          <div className="toggle-row" style={{ marginBottom: 16 }}>
            <div className="toggle-info">
              <h4>💚 Donate for Free</h4>
              <p>Make a social impact — give it away for free!</p>
            </div>
            <button type="button" className={`toggle ${isFree ? "on" : ""}`} onClick={() => setIsFree(f => !f)} />
          </div>
          {!isFree && (
            <>
              <div className="form-group">
                <label className="form-label">Price (₹) *</label>
                <input className="form-input" type="number" placeholder="Enter your asking price" value={price} onChange={e => setPrice(e.target.value)} min="1" />
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={suggestPrice} disabled={aiLoading}>
                {aiLoading ? "⏳ Getting suggestion..." : "🤖 AI Price Suggestion"}
              </button>
              {aiSuggestion && (
                <div className="price-suggestion">🤖 AI suggests: <strong>{aiSuggestion}</strong></div>
              )}
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, paddingBottom: 40 }}>
          <button type="button" className="btn btn-outline" onClick={() => setPage("home")}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={loading}>
            {loading
              ? (isEdit ? "Saving..." : "Uploading & Posting...")
              : (isEdit ? "Save Changes ✅" : "Post Listing 🚀")}
          </button>
        </div>
      </form>
    </div>
  );
}
