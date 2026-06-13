import React, { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "../firebase";
import ListingCard from "../components/ListingCard";

const CATEGORIES = ["All","Textbooks","Notes","Lab Equipment","Electronics","Stationery","Girls","Misc"];
const CONDITIONS = ["All","New","Good","Fair","Old"];
const SORT_OPTS = [
  { val:"newest", label:"Newest first" },
  { val:"price-low", label:"Price: Low to High" },
  { val:"price-high", label:"Price: High to Low" },
  { val:"most-viewed", label:"Most viewed" },
];

function DropdownBtn({ label, options, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [alignRight, setAlignRight] = useState(false);

  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.left + rect.width / 2 > window.innerWidth / 2) {
        setAlignRight(true);
      } else {
        setAlignRight(false);
      }
    }
  }, [open]);

  return (
    <div className="dd-wrap" ref={ref}>
      <button
        className={`dd-btn ${open ? "dd-open" : ""} ${selected !== options[0].val ? "dd-active" : ""}`}
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        {label} <span className={`dd-chevron ${open ? "flipped" : ""}`}>v</span>
      </button>
      {open && (
        <div className={`dd-menu ${alignRight ? "dd-align-right" : "dd-align-left"}`}>
          {options.map((opt) => (
            <React.Fragment key={opt.val}>
              {opt.divider && <div className="dd-divider-line" />}
              <button
                type="button"
                className={`dd-item ${selected === opt.val ? "dd-selected" : ""}`}
                onClick={() => { onSelect(opt.val); setOpen(false); }}
              >
                {opt.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function CollegeDropdown({ label, options, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  const [alignRight, setAlignRight] = useState(false);

  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.left + rect.width / 2 > window.innerWidth / 2) {
        setAlignRight(true);
      } else {
        setAlignRight(false);
      }
    }
  }, [open]);

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dd-wrap" ref={ref}>
      <button
        className={`dd-btn ${open ? "dd-open" : ""} ${selected !== "All" ? "dd-active" : ""}`}
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        {label} <span className={`dd-chevron ${open ? "flipped" : ""}`}>v</span>
      </button>
      {open && (
        <div className={`dd-menu ${alignRight ? "dd-align-right" : "dd-align-left"}`} style={{ minWidth: 230 }}>
          {/* Search box */}
          <div style={{ padding: "8px 8px 6px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "var(--light)", border: "1.5px solid var(--bdr)",
              borderRadius: "var(--r-full)", padding: "6px 12px",
              transition: "all .15s"
            }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--p)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--bdr)"}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2"
                viewBox="0 0 24 24" style={{ flexShrink: 0, color: "var(--muted-2)" }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search college..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  border: "none", background: "transparent", outline: "none",
                  fontSize: 13, width: "100%", color: "var(--txt)", fontWeight: 500,
                  fontFamily: "inherit"
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    border: "none", background: "none", cursor: "pointer",
                    color: "var(--muted-2)", fontSize: 14, lineHeight: 1,
                    padding: 0, flexShrink: 0
                  }}
                >×</button>
              )}
            </div>
          </div>
          <div className="dd-divider-line" />
          {/* Options list */}
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
                No colleges found
              </div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  className={`dd-item ${selected === opt.val ? "dd-selected" : ""}`}
                  onClick={() => { onSelect(opt.val); setOpen(false); setSearch(""); }}
                >
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"
                    viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: .5 }}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                  {opt.label}
                </button>
              ))
            )}
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

export default function HomePage({ setPage, setSelectedListing, searchQuery, requireAuth }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [condition, setCondition] = useState("All");
  const [college, setCollege] = useState("All");
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const priceRef = useRef(null);
  const [priceAlignRight, setPriceAlignRight] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "listings"),
      where("status","==","active"),
      orderBy("createdAt","desc"),
      limit(500)
    );
    const unsub = onSnapshot(q, snap => {
      setListings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error("Listings feed error:", err?.message || err);
      setListings([]);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    function h(e) {
      if (priceRef.current && !priceRef.current.contains(e.target)) setShowPriceFilter(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (showPriceFilter && priceRef.current) {
      const rect = priceRef.current.getBoundingClientRect();
      if (rect.left + rect.width / 2 > window.innerWidth / 2) {
        setPriceAlignRight(true);
      } else {
        setPriceAlignRight(false);
      }
    }
  }, [showPriceFilter]);

  const getPrice = (l) => l.listingType === "rent" ? (l.rentPerDay || 0) : (l.price || 0);

  // Build dynamic college list from loaded listings
  const collegeOptions = useMemo(() => {
    const seen = new Set();
    const opts = [{ val: "All", label: "All colleges" }];
    listings.forEach(l => {
      if (l.sellerCollege && !seen.has(l.sellerCollege)) {
        seen.add(l.sellerCollege);
        opts.push({ val: l.sellerCollege, label: l.sellerCollege });
      }
    });
    return opts;
  }, [listings]);

  let filtered = listings;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(l =>
      l.title?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.category?.toLowerCase().includes(q)
    );
  }
  if (category !== "All") filtered = filtered.filter(l => l.category === category);
  if (condition !== "All") filtered = filtered.filter(l => l.condition === condition);
  if (college !== "All") filtered = filtered.filter(l => l.sellerCollege === college);
  if (freeOnly) filtered = filtered.filter(l => l.isFree);
  if (priceMin !== "") filtered = filtered.filter(l => !l.isFree && getPrice(l) >= Number(priceMin));
  if (priceMax !== "") filtered = filtered.filter(l => !l.isFree && getPrice(l) <= Number(priceMax));

  if (sortBy === "price-low") filtered = [...filtered].sort((a,b) => getPrice(a) - getPrice(b));
  if (sortBy === "price-high") filtered = [...filtered].sort((a,b) => getPrice(b) - getPrice(a));
  if (sortBy === "most-viewed") filtered = [...filtered].sort((a,b) => (b.views||0)-(a.views||0));

  const catLabel = category === "All" ? "All categories" : category;
  const sortLabel = SORT_OPTS.find(o => o.val === sortBy)?.label || "Newest first";
  const condLabel = condition === "All" ? "Condition" : condition;
  const collegeLabel = college === "All" ? "College" : (college.length > 18 ? college.slice(0, 16) + "…" : college);
  const priceFilterActive = priceMin !== "" || priceMax !== "";
  const activeFilters = (category !== "All" ? 1 : 0) + (condition !== "All" ? 1 : 0) + (college !== "All" ? 1 : 0) + (freeOnly ? 1 : 0) + (sortBy !== "newest" ? 1 : 0) + (priceFilterActive ? 1 : 0);

  function clearAllFilters() {
    setCategory("All");
    setCondition("All");
    setCollege("All");
    setFreeOnly(false);
    setSortBy("newest");
    setPriceMin("");
    setPriceMax("");
  }

  return (
    <div>
      <div className="hero">
        <div className="container">
          <div className="hero-eyebrow">Verified campus marketplace</div>
          <h1>Your Campus <span className="gradient-text">Marketplace</span></h1>
          <p>Buy, sell, rent and donate textbooks, notes, lab gear and everyday essentials inside your college community.</p>
          <div className="hero-trust-row">
            {[
              { icon:"ID", label:"Students Only", desc:"College community" },
              { icon:"Chat", label:"Secure Chat", desc:"Direct messaging" },
              { icon:"Local", label:"Campus Pickup", desc:"Meet nearby" },
              { icon:"Free", label:"Donate Free", desc:"Help juniors" },
            ].map(b => (
              <div key={b.label} className="hero-trust-badge">
                <span className="hero-trust-icon">{b.icon}</span>
                <div>
                  <div className="hero-trust-label">{b.label}</div>
                  <div className="hero-trust-desc">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="hero-cta-row">
            <button className="btn btn-primary btn-lg" onClick={() => requireAuth("post")}>List an Item</button>
            <button className="btn btn-outline btn-lg" onClick={() => document.getElementById("listings-section")?.scrollIntoView({ behavior:"smooth" })}>
              Browse Listings
            </button>
          </div>
        </div>
      </div>

      <div className="container listings-section" id="listings-section" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div className="filter-bar">
          <DropdownBtn label={catLabel} options={CATEGORIES.map(c => ({ val:c, label:c === "All" ? "All categories" : c }))} selected={category} onSelect={setCategory} />
          <DropdownBtn label={sortLabel} options={SORT_OPTS} selected={sortBy} onSelect={setSortBy} />
          <DropdownBtn label={condLabel} options={CONDITIONS.map(c => ({ val:c, label:c === "All" ? "All conditions" : c }))} selected={condition} onSelect={setCondition} />
          {collegeOptions.length > 1 && (
            <CollegeDropdown label={collegeLabel} options={collegeOptions} selected={college} onSelect={setCollege} />
          )}

          <div className="dd-wrap" ref={priceRef} style={{ position:"relative" }}>
            <button
              type="button"
              className={`dd-btn ${showPriceFilter ? "dd-open" : ""} ${priceFilterActive ? "dd-active" : ""}`}
              onClick={() => setShowPriceFilter(o => !o)}
            >
              {priceFilterActive ? `Rs ${priceMin||"0"} - Rs ${priceMax||"any"}` : "Price"} <span className={`dd-chevron ${showPriceFilter ? "flipped" : ""}`}>v</span>
            </button>
            {showPriceFilter && (
              <div className={`dd-menu price-dd-menu ${priceAlignRight ? "dd-align-right" : "dd-align-left"}`} style={{ width: 220, padding: "12px 14px" }}>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--muted)", marginBottom:10 }}>Price Range (Rs)</div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <input type="number" min="0" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                    className="form-input" style={{ padding:"6px 10px", fontSize:13, flex:1 }} />
                  <span style={{ color:"var(--muted)", fontSize:12 }}>-</span>
                  <input type="number" min="0" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                    className="form-input" style={{ padding:"6px 10px", fontSize:13, flex:1 }} />
                </div>
                <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
                  {[["Under Rs 200","","200"],["Rs 200-500","200","500"],["Rs 500-2k","500","2000"],["Rs 2k+","2000",""]].map(([label,min,max]) => (
                    <button key={label} type="button" className="btn btn-outline btn-sm" style={{ fontSize:11, padding:"3px 8px" }}
                      onClick={() => { setPriceMin(min); setPriceMax(max); }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {priceFilterActive && (
                  <button type="button" className="btn btn-outline btn-sm" style={{ marginTop:8, width:"100%", justifyContent:"center", fontSize:12 }}
                    onClick={() => { setPriceMin(""); setPriceMax(""); }}
                  >
                    Clear price filter
                  </button>
                )}
              </div>
            )}
          </div>

          <button type="button" className={`dd-btn ${freeOnly ? "dd-active" : ""}`} onClick={() => setFreeOnly(f => !f)}>
            Free only
          </button>

          {activeFilters > 0 && (
            <button type="button" className="filter-clear-btn" onClick={clearAllFilters}>
              Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
            </button>
          )}

          {(activeFilters > 0 || !!searchQuery) && (
            <span className="filter-count">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {loading ? (
          <div className="listings-grid">
            {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">No results</div>
            <h3>No listings found</h3>
            <p>Try adjusting your filters or be the first to list this item.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:16, flexWrap:"wrap" }}>
              <button className="btn btn-outline" onClick={clearAllFilters}>Clear Filters</button>
              <button className="btn btn-primary" onClick={() => setPage("post")}>Post Item</button>
            </div>
          </div>
        ) : (
          <div className="listings-grid">
            {filtered.map(l => (
              <ListingCard key={l.id} listing={l} onClick={() => { setSelectedListing(l); setPage("listing"); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
