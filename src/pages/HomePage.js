import React, { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "../firebase";
import ListingCard from "../components/ListingCard";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = ["All","Textbooks","Notes","Lab Equipment","Electronics","Stationery","Girls","Misc"];
const CONDITIONS = ["All","New","Good","Fair","Old"];
const SORT_OPTS = [
  { val:"newest", label:"Newest first" },
  { val:"price-low", label:"Price: Low to High" },
  { val:"price-high", label:"Price: High to Low" },
  { val:"most-viewed", label:"Most viewed" },
];
const CATEGORY_SHORTCUTS = [
  { val: "Textbooks", label: "Textbooks", emoji: "📚" },
  { val: "Notes", label: "Notes", emoji: "📝" },
  { val: "Lab Equipment", label: "Lab Gear", emoji: "🧪" },
  { val: "Electronics", label: "Electronics", emoji: "💻" },
  { val: "Stationery", label: "Stationery", emoji: "✏️" },
  { val: "Girls", label: "Hostel Needs", emoji: "🏠" },
  { val: "Misc", label: "Miscellaneous", emoji: "📦" },
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
    opt.val !== "DIVIDER" && opt.label.toLowerCase().includes(search.toLowerCase())
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
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
                No colleges found
              </div>
            ) : (
              filtered.map(opt => {
                if (opt.val === "DIVIDER") {
                  return <div key="divider" className="dd-divider-line" style={{ margin: "6px 0", height: "1px", background: "var(--bdr)" }} />;
                }
                return (
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
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonCard({ layout = "grid" }) {
  return (
    <div className={`listing-card skeleton-card ${layout === "list" ? "layout-list-card" : ""}`}>
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
  const { userProfile } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [condition, setCondition] = useState("All");
  const [college, setCollege] = useState(() => {
    const temp = sessionStorage.getItem("tempCollegeFilter");
    if (temp) {
      sessionStorage.removeItem("tempCollegeFilter");
      return temp;
    }
    const saved = localStorage.getItem("selectedCollegeFilter");
    if (saved) return saved;
    return "All";
  });

  const [layout, setLayout] = useState(() => {
    return userProfile?.marketplacePreferences?.defaultView === "List" ? "list" : "grid";
  });

  useEffect(() => {
    if (userProfile?.marketplacePreferences?.defaultView) {
      setLayout(userProfile.marketplacePreferences.defaultView.toLowerCase());
    }
  }, [userProfile]);

  useEffect(() => {
    const temp = sessionStorage.getItem("tempCollegeFilter");
    if (temp) {
      sessionStorage.removeItem("tempCollegeFilter");
      setCollege(temp);
      localStorage.setItem("selectedCollegeFilter", temp);
      localStorage.setItem("hasVisitedCollegeFilter", "true");
      return;
    }

    const hasVisited = localStorage.getItem("hasVisitedCollegeFilter");
    if (!hasVisited && userProfile?.college) {
      localStorage.setItem("hasVisitedCollegeFilter", "true");
      localStorage.setItem("selectedCollegeFilter", userProfile.college);
      setCollege(userProfile.college);
    } else if (userProfile) {
      if (userProfile?.marketplacePreferences?.defaultFeed === "My College" && userProfile?.college) {
        setCollege(userProfile.college);
        localStorage.setItem("selectedCollegeFilter", userProfile.college);
      }
    }
  }, [userProfile]);

  const handleSelectCollege = (val) => {
    setCollege(val);
    localStorage.setItem("selectedCollegeFilter", val);
    localStorage.setItem("hasVisitedCollegeFilter", "true");
  };

  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [displayLimit, setDisplayLimit] = useState(40);
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const priceRef = useRef(null);
  const [priceAlignRight, setPriceAlignRight] = useState(false);

  const featuredListings = useMemo(() => {
    return [...listings]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 4);
  }, [listings]);

  const recentListings = useMemo(() => {
    return listings.slice(0, 4);
  }, [listings]);

  const topSellers = useMemo(() => {
    const sellersMap = {};
    listings.forEach(l => {
      if (l.sellerName) {
        if (!sellersMap[l.sellerName]) {
          sellersMap[l.sellerName] = {
            name: l.sellerName,
            college: l.sellerCollege || "Student",
            rating: l.sellerRating || 0,
            isVerified: l.isVerified || false,
            itemsCount: 0
          };
        }
        sellersMap[l.sellerName].itemsCount += 1;
        if (l.isVerified) sellersMap[l.sellerName].isVerified = true;
        if (l.sellerRating > sellersMap[l.sellerName].rating) {
          sellersMap[l.sellerName].rating = l.sellerRating;
        }
      }
    });
    return Object.values(sellersMap)
      .filter(s => s.rating > 0)
      .sort((a, b) => b.rating - a.rating || b.itemsCount - a.itemsCount)
      .slice(0, 4);
  }, [listings]);

  const handleCategoryShortcut = (cat) => {
    setCategory(cat);
    document.getElementById("listings-section")?.scrollIntoView({ behavior: "smooth" });
  };

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

  // Reset page limit when filters are updated
  useEffect(() => {
    setDisplayLimit(40);
  }, [category, condition, college, freeOnly, sortBy, priceMin, priceMax, searchQuery]);

  // Scroll to listings section when filters change, if currently scrolled down past it
  useEffect(() => {
    const section = document.getElementById("listings-section");
    if (section) {
      const rect = section.getBoundingClientRect();
      if (rect.top < 60) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [category, condition, college, freeOnly, priceMin, priceMax, sortBy]);

  const getPrice = (l) => l.listingType === "rent" ? (l.rentPerDay || 0) : (l.price || 0);

  const collegeOptions = useMemo(() => {
    // Count active listings per college
    const collegeCounts = {};
    listings.forEach(l => {
      if (l.sellerCollege) {
        collegeCounts[l.sellerCollege] = (collegeCounts[l.sellerCollege] || 0) + 1;
      }
    });

    const totalListings = listings.length;
    const userCollege = userProfile?.college || "";

    // Dynamic list of other colleges (excluding user college)
    const otherCollegesList = Object.keys(collegeCounts)
      .filter(c => c !== userCollege)
      .sort((a, b) => a.localeCompare(b));

    const opts = [];
    
    // 1. All Colleges option
    opts.push({ 
      val: "All", 
      label: `All Colleges (${totalListings})` 
    });

    // 2. My College option (prioritized on top if logged in)
    if (userCollege) {
      const userCollegeCount = collegeCounts[userCollege] || 0;
      opts.push({ 
        val: userCollege, 
        label: `📍 My College - ${userCollege} (${userCollegeCount})` 
      });
    }

    // 3. Add other colleges with a visual divider line
    if (otherCollegesList.length > 0) {
      opts.push({ 
        val: "DIVIDER", 
        label: "---"
      });

      otherCollegesList.forEach(c => {
        opts.push({ 
          val: c, 
          label: `${c} (${collegeCounts[c]})` 
        });
      });
    }

    return opts;
  }, [listings, userProfile]);

  const filtered = useMemo(() => {
    let result = listings;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.title?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.category?.toLowerCase().includes(q)
      );
    }
    if (category !== "All") result = result.filter(l => l.category === category);
    if (condition !== "All") result = result.filter(l => l.condition === condition);
    if (college !== "All") result = result.filter(l => l.sellerCollege === college);
    if (freeOnly) result = result.filter(l => l.isFree);
    if (priceMin !== "") result = result.filter(l => !l.isFree && getPrice(l) >= Number(priceMin));
    if (priceMax !== "") result = result.filter(l => !l.isFree && getPrice(l) <= Number(priceMax));

    if (sortBy === "price-low") result = [...result].sort((a,b) => getPrice(a) - getPrice(b));
    if (sortBy === "price-high") result = [...result].sort((a,b) => getPrice(b) - getPrice(a));
    if (sortBy === "most-viewed") result = [...result].sort((a,b) => (b.views||0)-(a.views||0));
    return result;
  }, [listings, searchQuery, category, condition, college, freeOnly, priceMin, priceMax, sortBy]);

  const displayedListings = filtered.slice(0, displayLimit);

  const catLabel = category === "All" ? "All categories" : category;
  const sortLabel = SORT_OPTS.find(o => o.val === sortBy)?.label || "Newest first";
  const condLabel = condition === "All" ? "Condition" : condition;
  const collegeLabel = college === "All" ? "Filter by College" : (college.length > 18 ? college.slice(0, 16) + "…" : college);
  const priceFilterActive = priceMin !== "" || priceMax !== "";
  const activeFilters = (category !== "All" ? 1 : 0) + (condition !== "All" ? 1 : 0) + (college !== "All" ? 1 : 0) + (freeOnly ? 1 : 0) + (sortBy !== "newest" ? 1 : 0) + (priceFilterActive ? 1 : 0);

  function clearAllFilters() {
    setCategory("All");
    setCondition("All");
    handleSelectCollege("All");
    setFreeOnly(false);
    setSortBy("newest");
    setPriceMin("");
    setPriceMax("");
  }

  if (loading) {
    return (
      <div className="skeleton-shimmer">
        <div className="hero" style={{ background: "var(--light)", minHeight: 280, display: "flex", alignItems: "center" }}>
          <div className="container" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ maxWidth: "680px" }}>
              <div className="skeleton" style={{ height: 18, width: 220, marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 40, width: "90%", marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 16, width: "65%", marginBottom: 28 }} />
              <div style={{ display: "flex", gap: 12 }}>
                <div className="skeleton" style={{ height: 44, width: 140, borderRadius: "var(--r-md)" }} />
                <div className="skeleton" style={{ height: 44, width: 140, borderRadius: "var(--r-md)" }} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="container" style={{ marginTop: 32 }}>
          <div className="trust-statistics-row" style={{ margin: "24px 0 40px" }}>
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="trust-stat-card" style={{ minHeight: 110, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div className="skeleton" style={{ height: 24, width: "50%", margin: "0 auto 8px" }} />
                <div className="skeleton" style={{ height: 14, width: "70%", margin: "0 auto 4px" }} />
                <div className="skeleton" style={{ height: 10, width: "40%", margin: "0 auto" }} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 40 }}>
            <div className="skeleton" style={{ height: 24, width: 200, marginBottom: 20 }} />
            <div className="category-shortcuts-row">
              {Array(7).fill(0).map((_, i) => (
                <div key={i} className="category-shortcut-card" style={{ width: 125, height: 105, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div className="skeleton" style={{ height: 28, width: 28, borderRadius: "50%", marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 12, width: 60 }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 40 }}>
            <div className="skeleton" style={{ height: 24, width: 220, marginBottom: 20 }} />
            <div className="listings-grid">
              {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="hero">
        <div className="container" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ maxWidth: "680px" }}>
            <div className="hero-eyebrow">
              <span style={{ marginRight: "6px" }}>🔒</span> Campus-Only Verified Network
            </div>
            <h1 style={{ marginTop: "12px", marginBottom: "16px" }}>
              Buy, Sell & Rent Within Your <span className="gradient-text">College Campus</span>
            </h1>
            <p style={{ fontSize: "16px", color: "var(--muted)", lineHeight: "1.7", marginBottom: "28px" }}>
              Trusted marketplace for students to exchange books, electronics, notes and hostel essentials.
            </p>
            <div className="hero-cta-row">
              <button className="btn btn-primary btn-lg" onClick={() => document.getElementById("listings-section")?.scrollIntoView({ behavior:"smooth" })}>
                Browse Listings
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => requireAuth("post")}>
                Sell an Item
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="trust-statistics-row">
          <div className="trust-stat-card">
            <div className="trust-stat-num">15k+</div>
            <div className="trust-stat-label">Exchanged Items</div>
            <div className="trust-stat-desc">Books, tech, notes & gear</div>
          </div>
          <div className="trust-stat-card">
            <div className="trust-stat-num">98%</div>
            <div className="trust-stat-label">Verified Students</div>
            <div className="trust-stat-desc">Safe campus network</div>
          </div>
          <div className="trust-stat-card">
            <div className="trust-stat-num">4.8★</div>
            <div className="trust-stat-label">Seller Rating</div>
            <div className="trust-stat-desc">High student satisfaction</div>
          </div>
          <div className="trust-stat-card">
            <div className="trust-stat-num">Rs 10L+</div>
            <div className="trust-stat-label">Savings Enabled</div>
            <div className="trust-stat-desc">Keeps value within college</div>
          </div>
        </div>

        <div className="category-shortcuts-section">
          <h2 className="homepage-section-title">Explore by Category</h2>
          <div className="category-shortcuts-row">
            {CATEGORY_SHORTCUTS.map(c => (
              <button key={c.val} className="category-shortcut-card" onClick={() => handleCategoryShortcut(c.val)}>
                <span className="category-shortcut-emoji">{c.emoji}</span>
                <span className="category-shortcut-label">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {featuredListings.length > 0 && (
          <div style={{ marginBottom: "48px" }}>
            <h2 className="homepage-section-title">
              <span>🔥 Featured Listings</span>
              <span className="homepage-section-title-link" onClick={() => document.getElementById("listings-section")?.scrollIntoView({ behavior:"smooth" })}>
                View all
              </span>
            </h2>
            <div className="listings-grid" style={{ padding: "0 0 10px 0" }}>
              {featuredListings.map(l => (
                <ListingCard key={l.id} listing={l} onClick={() => setPage("listing", l)} requireAuth={requireAuth} />
              ))}
            </div>
          </div>
        )}

        {recentListings.length > 0 && (
          <div style={{ marginBottom: "48px" }}>
            <h2 className="homepage-section-title">
              <span>🆕 Newly Added</span>
              <span className="homepage-section-title-link" onClick={() => document.getElementById("listings-section")?.scrollIntoView({ behavior:"smooth" })}>
                View all
              </span>
            </h2>
            <div className="listings-grid" style={{ padding: "0 0 10px 0" }}>
              {recentListings.map(l => (
                <ListingCard key={l.id} listing={l} onClick={() => setPage("listing", l)} requireAuth={requireAuth} />
              ))}
            </div>
          </div>
        )}

        {topSellers.length > 0 && (
          <div style={{ marginBottom: "48px" }}>
            <h2 className="homepage-section-title">Top Rated Sellers</h2>
            <div className="top-sellers-grid">
              {topSellers.map((s, idx) => (
                <div key={s.name} className="top-seller-card">
                  <div className="top-seller-avatar">{s.name[0].toUpperCase()}</div>
                  <div className="top-seller-info">
                    <div className="top-seller-name">
                      {s.name}
                      {s.isVerified && (
                        <svg className="top-seller-verified" width="12" height="12" fill="currentColor" viewBox="0 0 24 24" title="Verified Student">
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </div>
                    <div className="top-seller-college">{s.college}</div>
                    <div className="top-seller-rating">★ {s.rating.toFixed(1)} <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: 10 }}>({s.itemsCount} listing{s.itemsCount !== 1 ? 's' : ''})</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="container listings-section" id="listings-section" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--bdr)", paddingBottom: "12px", marginBottom: "16px" }}>
          <h2 className="homepage-section-title" style={{ margin: 0, border: "none", padding: 0 }}>
            All Campus Listings
          </h2>
          <div style={{ display: "flex", gap: "6px" }}>
            <button 
              type="button" 
              className={`btn btn-sm ${layout === "grid" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setLayout("grid")}
              style={{ padding: "6px 10px", minWidth: 0, fontSize: "14px", fontWeight: "700" }}
              title="Grid View"
            >
              田
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${layout === "list" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setLayout("list")}
              style={{ padding: "6px 10px", minWidth: 0, fontSize: "14px", fontWeight: "700" }}
              title="List View"
            >
              ☰
            </button>
          </div>
        </div>
        <div className={`filter-bar ${filtered.length > 6 ? "is-sticky" : ""}`}>
          <DropdownBtn label={catLabel} options={CATEGORIES.map(c => ({ val:c, label:c === "All" ? "All categories" : c }))} selected={category} onSelect={setCategory} />
          <DropdownBtn label={sortLabel} options={SORT_OPTS} selected={sortBy} onSelect={setSortBy} />
          <DropdownBtn label={condLabel} options={CONDITIONS.map(c => ({ val:c, label:c === "All" ? "All conditions" : c }))} selected={condition} onSelect={setCondition} />
          <CollegeDropdown label={collegeLabel} options={collegeOptions} selected={college} onSelect={handleSelectCollege} />

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
          <div className={layout === "list" ? "listings-list" : "listings-grid"}>
            {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} layout={layout} />)}
          </div>
        ) : filtered.length === 0 ? (
          college !== "All" && collegeOptions.length > 1 && !listings.some(l => l.sellerCollege === college) ? (
            <div className="empty-state">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted-2)", marginBottom: 16 }}>
                <path d="M22 10v12h-20v-12l10-6z"/>
                <rect x="6" y="14" width="4" height="8"/>
                <rect x="14" y="14" width="4" height="8"/>
                <circle cx="12" cy="9" r="1.5"/>
              </svg>
              <h3>{college === userProfile?.college ? "No listings available from your college yet." : "No listings in this college"}</h3>
              <p>{college === userProfile?.college ? "Be the first to list an item or view listings from other campuses." : "Try looking at listings from other campuses instead."}</p>
              <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => handleSelectCollege("All")}>
                {college === userProfile?.college ? "View All Colleges" : "Show All Colleges"}
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted-2)", marginBottom: 16 }}>
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
              <h3>No listings found</h3>
              <p>Try adjusting your filters or search keywords.</p>
              <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:16, flexWrap:"wrap" }}>
                <button className="btn btn-outline" onClick={clearAllFilters}>Clear Filters</button>
                <button className="btn btn-primary" onClick={() => setPage("post")}>Post Item</button>
              </div>
            </div>
          )
        ) : (
          <>
            <div className={layout === "list" ? "listings-list" : "listings-grid"}>
              {displayedListings.map(l => (
                <ListingCard key={l.id} listing={l} layout={layout} onClick={() => setPage("listing", l)} requireAuth={requireAuth} />
              ))}
            </div>
            {filtered.length > displayLimit && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setDisplayLimit(prev => prev + 40)}
                  style={{ padding: "10px 28px", fontSize: "14px", fontWeight: "700", borderRadius: "var(--r-md)", gap: "6px" }}
                  type="button"
                >
                  Load More Items ➔
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
