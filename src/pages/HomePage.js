import React, { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, where, orderBy, getDocs, limit, startAfter, getCountFromServer } from "firebase/firestore";
import { db } from "../firebase";
import ListingCard from "../components/ListingCard";
import { useAuth } from "../context/AuthContext";
import { getSmartRecommendations } from "../services/ai/aiService";
import { trackAIEvent, AI_EVENTS } from "../services/ai/aiAnalytics";

const CATEGORIES = ["All", "Books", "Notes", "Electronics", "Lab Equipment", "Stationery", "Fashion", "Hostel", "Sports", "Gaming", "Musical Instruments", "Photography", "Other"];
const CATEGORY_ICONS = {
  "All": "🏪", "Books": "📚", "Notes": "📝", "Electronics": "💻",
  "Lab Equipment": "🧪", "Stationery": "✏️", "Fashion": "👕",
  "Hostel": "🏠", "Sports": "⚽", "Gaming": "🎮",
  "Musical Instruments": "🎵", "Photography": "📷", "Other": "📦"
};
const CONDITIONS = ["All","New","Good","Fair","Old"];
const SORT_OPTS = [
  { val: "newest",     label: "Newest First"        },
  { val: "oldest",     label: "Oldest First"         },
  { val: "price-low",  label: "Price: Low to High"   },
  { val: "price-high", label: "Price: High to Low"   },
  { val: "most-viewed",label: "Most Viewed"           },
];
const QUICK_FILTERS = [
  { type: "category", val: "Books",         label: "Books",       emoji: "📚" },
  { type: "category", val: "Electronics",   label: "Electronics", emoji: "💻" },
  { type: "free",     val: "free",          label: "Free",        emoji: "🆓" },
  { type: "category", val: "Lab Equipment", label: "Lab Gear",    emoji: "🧪" },
  { type: "category", val: "Hostel",        label: "Hostel",      emoji: "🏠" },
  { type: "category", val: "Sports",        label: "Sports",      emoji: "⚽" },
  { type: "category", val: "Gaming",        label: "Gaming",      emoji: "🎮" },
  { type: "category", val: "Notes",         label: "Notes",       emoji: "📝" },
];
const CATEGORY_SHORTCUTS = [
  { val: "Books", label: "Books", emoji: "📚" },
  { val: "Notes", label: "Notes", emoji: "📝" },
  { val: "Electronics", label: "Electronics", emoji: "💻" },
  { val: "Lab Equipment", label: "Lab Gear", emoji: "🧪" },
  { val: "Stationery", label: "Stationery", emoji: "✏️" },
  { val: "Fashion", label: "Fashion", emoji: "👕" },
  { val: "Hostel", label: "Hostel", emoji: "🏠" },
];

function DropdownBtn({ label, options, selected, onSelect, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [alignRight, setAlignRight] = useState(false);
  const isActive = selected !== options[0].val;

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

  function handleKeyDown(e) {
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="dd-wrap" ref={ref} onKeyDown={handleKeyDown}>
      <button
        className={`dd-btn ${open ? "dd-open" : ""} ${isActive ? "dd-active" : ""}`}
        onClick={() => setOpen(o => !o)}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel || label}
      >
        {isActive && <span className="dd-check-prefix" aria-hidden="true">✓</span>}
        {label} <span className={`dd-chevron ${open ? "flipped" : ""}`}>▾</span>
      </button>
      {open && (
        <div className={`dd-menu ${alignRight ? "dd-align-right" : "dd-align-left"}`} role="listbox">
          {options.map((opt) => (
            <React.Fragment key={opt.val}>
              {opt.divider && <div className="dd-divider-line" />}
              <button
                type="button"
                role="option"
                aria-selected={selected === opt.val}
                className={`dd-item ${selected === opt.val ? "dd-selected" : ""}`}
                onClick={() => { onSelect(opt.val); setOpen(false); }}
              >
                <span>{opt.label}</span>
                {selected === opt.val && <span className="dd-check" aria-hidden="true">✓</span>}
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

function CategoryDropdown({ label, options, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [alignRight, setAlignRight] = useState(false);
  const isActive = selected !== "All";

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
      setAlignRight(rect.left + 310 > window.innerWidth - 16);
    }
  }, [open]);

  function handleKeyDown(e) {
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="dd-wrap" ref={ref} onKeyDown={handleKeyDown}>
      <button
        className={`dd-btn ${open ? "dd-open" : ""} ${isActive ? "dd-active" : ""}`}
        onClick={() => setOpen(o => !o)}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Filter by category"
      >
        {isActive && <span className="dd-check-prefix" aria-hidden="true">✓</span>}
        {isActive
          ? <><span aria-hidden="true">{CATEGORY_ICONS[selected] || "📦"}</span> {label}</>
          : "Category"}
        <span className={`dd-chevron ${open ? "flipped" : ""}`}>▾</span>
      </button>
      {open && (
        <div
          className={`dd-menu dd-menu-category ${alignRight ? "dd-align-right" : "dd-align-left"}`}
          role="listbox"
          aria-label="Select a category"
        >
          {options.map((opt) => (
            <button
              key={opt.val}
              type="button"
              role="option"
              aria-selected={selected === opt.val}
              className={`dd-item ${selected === opt.val ? "dd-selected" : ""}`}
              onClick={() => { onSelect(opt.val); setOpen(false); }}
            >
              <span className="dd-item-icon" aria-hidden="true">{CATEGORY_ICONS[opt.val] || "📦"}</span>
              <span>{opt.label}</span>
              {selected === opt.val && <span className="dd-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonCard({ layout = "grid" }) {
  return (
    <div className={`listing-card skeleton-card ${layout === "list" ? "layout-list-card" : ""}`} style={{ opacity: 0.8 }}>
      <div className="card-img" style={{ background: "var(--bdr-2)", position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
        <div className="skeleton" style={{ width: "100%", height: "100%" }} />
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          <div className="skeleton" style={{ height: "12px", width: "40px" }} />
          <div className="skeleton" style={{ height: "12px", width: "30px" }} />
        </div>
        <div className="skeleton" style={{ height: "16px", width: "80%" }} />
        <div className="skeleton" style={{ height: "12px", width: "60%" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
          <div className="skeleton" style={{ height: "16px", width: "50px" }} />
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <div className="skeleton" style={{ height: "14px", width: "14px", borderRadius: "50%" }} />
            <div className="skeleton" style={{ height: "10px", width: "30px" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage({ setPage, setSelectedListing, searchQuery, requireAuth }) {
  const { userProfile } = useAuth();
  
  // Required State Variables for Cursor-based Pagination
  const [products, setProducts]             = useState([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [hasMore, setHasMore]               = useState(true);
  const [error, setError]                   = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [totalCount, setTotalCount]         = useState(0);
  const [buttonState, setButtonState]       = useState("default"); // default, loading, success
  const [filterBarHidden, setFilterBarHidden] = useState(false);

  const [category, setCategory]   = useState("All");
  const [condition, setCondition] = useState("All");
  const [smartRecommendations, setSmartRecommendations] = useState([]);
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

  const [freeOnly, setFreeOnly]               = useState(false);
  const [sortBy, setSortBy]                   = useState("newest");
  const [priceMin, setPriceMin]               = useState("");
  const [priceMax, setPriceMax]               = useState("");
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const priceRef                              = useRef(null);
  const [priceAlignRight, setPriceAlignRight] = useState(false);

  // Background Prefetch Queue Refs
  const prefetchedData      = useRef(null);
  const isPrefetching       = useRef(false);
  const isMounted           = useRef(true);
  const lastScrollYRef      = useRef(0);
  const filterBarRef        = useRef(null);
  const filterBarThreshold  = useRef(600);

  // Keep track of mount state to cancel pending state updates on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Smart Sticky Filter Bar (compute scroll threshold after load) ─────────
  useEffect(() => {
    if (!initialLoading && filterBarRef.current) {
      const rect = filterBarRef.current.getBoundingClientRect();
      filterBarThreshold.current = Math.max(300, rect.top + window.scrollY - 70);
    }
  }, [initialLoading]);

  // ── Smart Sticky Filter Bar (hide on scroll-down, show on scroll-up) ──────
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const diff = currentY - lastScrollYRef.current;
          if (currentY > filterBarThreshold.current) {
            if (diff > 6) setFilterBarHidden(true);
            else if (diff < -6) setFilterBarHidden(false);
          } else {
            setFilterBarHidden(false);
          }
          lastScrollYRef.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Firestore Pagination Fetcher ─────────────────────────────────────────
  const fetchBatch = async (startDoc = null) => {
    try {
      const qConstraints = [
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(40)
      ];
      if (startDoc) {
        qConstraints.splice(2, 0, startAfter(startDoc));
      }
      const q = query(collection(db, "listings"), ...qConstraints);
      const snap = await getDocs(q);
      const docs = snap.docs;
      const newProducts = docs.map(d => ({ id: d.id, ...d.data() }));
      const lastDoc = docs[docs.length - 1] || null;
      const more = docs.length === 40;
      return { newProducts, lastDoc, more };
    } catch (err) {
      console.error("Firestore pagination batch fetch error:", err);
      throw err;
    }
  };

  // ── Initial Batch & Count Loader ────────────────────────────────────────
  const loadInitialData = async () => {
    if (!isMounted.current) return;
    setInitialLoading(true);
    setError(null);
    try {
      // 1. Get total listings count (uses lightweight Firestore count feature)
      const countQuery = query(collection(db, "listings"), where("status", "==", "active"));
      const countSnap = await getCountFromServer(countQuery);
      const count = countSnap.data().count;

      // 2. Fetch first page
      const { newProducts, lastDoc, more } = await fetchBatch(null);

      if (isMounted.current) {
        setProducts(newProducts);
        setLastVisibleDoc(lastDoc);
        setHasMore(more);
        setTotalCount(count);
        setInitialLoading(false);
        prefetchedData.current = null;
      }
    } catch (err) {
      console.error("Initial discovery data load failed:", err);
      if (isMounted.current) {
        setError("Unable to load listings. Please try again.");
        setInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Intelligent Background Prefetching ──────────────────────────────────
  const triggerPrefetch = async () => {
    if (!lastVisibleDoc || isPrefetching.current || prefetchedData.current) return;
    isPrefetching.current = true;
    try {
      const data = await fetchBatch(lastVisibleDoc);
      if (isMounted.current) {
        prefetchedData.current = data;
      }
    } catch (err) {
      console.error("Background prefetch failed:", err);
    } finally {
      isPrefetching.current = false;
    }
  };

  // Scroll listener to detect when user scrolls near the last visible row
  const handleScroll = () => {
    if (!hasMore || loadingMore || prefetchedData.current || isPrefetching.current) return;
    const section = document.getElementById("listings-section");
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Trigger prefetch when bottom of listings section is within 350px of entering viewport
    if (rect.bottom - windowHeight < 350) {
      triggerPrefetch();
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, lastVisibleDoc]);

  // ── Explore More Action Handler ──────────────────────────────────────────
  const handleExploreMore = async () => {
    if (loadingMore || buttonState !== "default") return;
    setLoadingMore(true);
    setButtonState("loading");
    setError(null);

    try {
      let data = prefetchedData.current;
      if (!data) {
        // Fallback: If prefetch hasn't finished/triggered, pull synchronously
        data = await fetchBatch(lastVisibleDoc);
      }

      const { newProducts, lastDoc, more } = data;

      // Min delay duration to keep shimmer animations stable and visually clean
      await new Promise(resolve => setTimeout(resolve, 400));

      if (isMounted.current) {
        setProducts(prev => [...prev, ...newProducts]);
        setLastVisibleDoc(lastDoc);
        setHasMore(more);
        setButtonState("success");
        setLoadingMore(false);
        prefetchedData.current = null;

        // Revert success indicator back to default after 1.2s
        setTimeout(() => {
          if (isMounted.current) {
            setButtonState("default");
          }
        }, 1200);
      }
    } catch (err) {
      console.error("Load more listings failed:", err);
      if (isMounted.current) {
        setError("Unable to load more listings.");
        setButtonState("default");
        setLoadingMore(false);
      }
    }
  };

  // ── Client-side filter mappings ──────────────────────────────────────────
  const featuredListings = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 4);
  }, [products]);

  const recentListings = useMemo(() => {
    return products.slice(0, 4);
  }, [products]);

  const topSellers = useMemo(() => {
    const sellersMap = {};
    products.forEach(l => {
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
  }, [products]);

  const handleCategoryShortcut = (cat) => {
    setCategory(cat);
    document.getElementById("listings-section")?.scrollIntoView({ behavior: "smooth" });
  };

  // Category interest map from localStorage
  const viewedCategoryMap = useMemo(() => {
    try {
      const raw = localStorage.getItem("viewedCategories");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }, []);

  useEffect(() => {
    if (products && products.length > 0) {
      const recs = getSmartRecommendations({
        listings: products,
        userProfile,
        viewedCategoryMap,
        wishlistIds: [],
      });
      setSmartRecommendations(recs);
    } else {
      setSmartRecommendations([]);
    }
  }, [products, userProfile, viewedCategoryMap]);

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

  const collegeOptions = useMemo(() => {
    const collegeCounts = {};
    products.forEach(l => {
      if (l.sellerCollege) {
        collegeCounts[l.sellerCollege] = (collegeCounts[l.sellerCollege] || 0) + 1;
      }
    });

    const currentTotal = products.length;
    const userCollege = userProfile?.college || "";

    const otherCollegesList = Object.keys(collegeCounts)
      .filter(c => c !== userCollege)
      .sort((a, b) => a.localeCompare(b));

    const opts = [];
    opts.push({ 
      val: "All", 
      label: `All Colleges (${currentTotal})` 
    });

    if (userCollege) {
      const userCollegeCount = collegeCounts[userCollege] || 0;
      opts.push({ 
        val: userCollege, 
        label: `📍 My College - ${userCollege} (${userCollegeCount})` 
      });
    }

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
  }, [products, userProfile]);

  const filtered = useMemo(() => {
    let result = products;
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

    let sortedResult = [...result];
    if (sortBy === "price-low")  sortedResult.sort((a,b) => getPrice(a) - getPrice(b));
    else if (sortBy === "price-high")  sortedResult.sort((a,b) => getPrice(b) - getPrice(a));
    else if (sortBy === "most-viewed") sortedResult.sort((a,b) => (b.views||0)-(a.views||0));
    else if (sortBy === "oldest")      sortedResult.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));

    if (userProfile?.marketplacePreferences?.showVerifiedSellersFirst) {
      sortedResult.sort((a, b) => {
        const aVer = !!(a.collegeVerified || a.isVerified);
        const bVer = !!(b.collegeVerified || b.isVerified);
        if (aVer !== bVer) {
          return aVer ? -1 : 1;
        }
        return 0;
      });
    }
    return sortedResult;
  }, [products, searchQuery, category, condition, college, freeOnly, priceMin, priceMax, sortBy, userProfile]);

  const catLabel = category === "All" ? "All categories" : category;
  const sortLabel = SORT_OPTS.find(o => o.val === sortBy)?.label || "Newest First";
  const condLabel = condition === "All" ? "Condition" : condition;
  const collegeLabel = college === "All" ? "College" : (college.length > 18 ? college.slice(0, 16) + "\u2026" : college);
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

  // ── RENDER PAGINATION UI CONTROLS ────────────────────────────────────────
  const renderPaginationControls = () => {
    if (initialLoading || totalCount === 0) return null;
    const loadedCount = products.length;
    const percentage = totalCount > 0 ? (loadedCount / totalCount) * 100 : 0;

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "32px", paddingBottom: "40px" }}>
        
        {/* Listings Counter and Progress Indicator bar */}
        {totalCount > 0 && (
          <div className="pagination-progress-container">
            <span className="pagination-progress-text">
              Showing {loadedCount} of {totalCount} Listings
            </span>
            <div className="pagination-progress-bar-bg">
              <div 
                className="pagination-progress-bar-fill" 
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Recovery */}
        {error && (
          <div className="pagination-error-msg">
            <span>⚠️ {error}</span>
            <button className="pagination-error-retry" onClick={handleExploreMore} type="button">
              Retry
            </button>
          </div>
        )}

        {/* Action Button or End of Listings State */}
        {hasMore ? (
          <button
            className="btn-explore-listings"
            onClick={handleExploreMore}
            disabled={loadingMore || buttonState !== "default"}
            aria-label="Explore more listings from campus"
            type="button"
          >
            {buttonState === "loading" && (
              <>
                <div className="btn-spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", borderTopColor: "var(--p)" }} />
                <span>Loading More Listings...</span>
              </>
            )}
            {buttonState === "success" && <span>Listings Added Successfully ✓</span>}
            {buttonState === "default" && <span>Explore More Listings ➔</span>}
          </button>
        ) : (
          /* Elegant End state Banner */
          <div className="end-listings-banner">
            <div className="end-listings-title">🎉 You've Reached The End</div>
            <p className="end-listings-sub">You've explored all available listings. Check back later for newly posted items.</p>
            <div className="end-listings-cta">
              <button className="btn btn-primary" onClick={() => requireAuth("post")} type="button" style={{ minHeight: "44px", padding: "0 24px" }}>
                Post an Item
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── INITIAL LOADING SHIMMER PAGE ─────────────────────────────────────────
  if (initialLoading) {
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
              <button className="btn btn-primary btn-lg" onClick={() => document.getElementById("listings-section")?.scrollIntoView({ behavior:"smooth" })} type="button">
                Browse Listings
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => requireAuth("post")} type="button">
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
              <button key={c.val} className="category-shortcut-card" onClick={() => handleCategoryShortcut(c.val)} type="button">
                <span className="category-shortcut-emoji">{c.emoji}</span>
                <span className="category-shortcut-label">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {smartRecommendations.length > 0 && (
          <div style={{ marginBottom: "48px" }}>
            <h2 className="homepage-section-title">
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>✨ Personalized for You</span>
              <span className="homepage-section-title-link" onClick={() => document.getElementById("listings-section")?.scrollIntoView({ behavior:"smooth" })} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key==='Enter') document.getElementById("listings-section")?.scrollIntoView({ behavior:"smooth" }) }}>
                View all
              </span>
            </h2>
            <div className="listings-grid" style={{ padding: "0 0 10px 0" }}>
              {smartRecommendations.map(l => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  onClick={() => {
                    trackAIEvent(AI_EVENTS.SMART_FEED_ENGAGED, userProfile?.uid || null, { listingId: l.id, category: l.category });
                    setPage("listing", l);
                  }}
                  requireAuth={requireAuth}
                />
              ))}
            </div>
          </div>
        )}

        {featuredListings.length > 0 && (
          <div style={{ marginBottom: "48px" }}>
            <h2 className="homepage-section-title">
              <span>🔥 Featured Listings</span>
              <span className="homepage-section-title-link" onClick={() => document.getElementById("listings-section")?.scrollIntoView({ behavior:"smooth" })} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key==='Enter') document.getElementById("listings-section")?.scrollIntoView({ behavior:"smooth" }) }}>
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
              <span className="homepage-section-title-link" onClick={() => document.getElementById("listings-section")?.scrollIntoView({ behavior:"smooth" })} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key==='Enter') document.getElementById("listings-section")?.scrollIntoView({ behavior:"smooth" }) }}>
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
        <div
          className={`filter-bar-wrapper${filterBarHidden ? " filter-bar-hidden" : ""}`}
          ref={filterBarRef}
        >
          <div className="filter-bar">
            {activeFilters > 0 && (
              <span className="filter-count-badge" aria-live="polite" aria-atomic="true">
                Filters ({activeFilters})
              </span>
            )}

            <CategoryDropdown
              label={category === "All" ? "Category" : category}
              options={CATEGORIES.map(c => ({ val: c, label: c === "All" ? "All Categories" : c }))}
              selected={category}
              onSelect={setCategory}
            />

            <DropdownBtn
              label="Sort"
              options={SORT_OPTS}
              selected={sortBy}
              onSelect={setSortBy}
              ariaLabel="Sort listings"
            />

            <DropdownBtn
              label={condLabel}
              options={CONDITIONS.map(c => ({ val: c, label: c === "All" ? "All Conditions" : c }))}
              selected={condition}
              onSelect={setCondition}
              ariaLabel="Filter by condition"
            />

            <CollegeDropdown label={collegeLabel} options={collegeOptions} selected={college} onSelect={handleSelectCollege} />

            <div className="dd-wrap" ref={priceRef} style={{ position: "relative" }}>
              <button
                type="button"
                className={`dd-btn ${showPriceFilter ? "dd-open" : ""} ${priceFilterActive ? "dd-active" : ""}`}
                onClick={() => setShowPriceFilter(o => !o)}
                aria-expanded={showPriceFilter}
                aria-label="Filter by price range"
              >
                {priceFilterActive && <span className="dd-check-prefix" aria-hidden="true">✓</span>}
                {priceFilterActive ? `Rs ${priceMin||"0"} – Rs ${priceMax||"any"}` : "Price"}{" "}
                <span className={`dd-chevron ${showPriceFilter ? "flipped" : ""}`}>▾</span>
              </button>
              {showPriceFilter && (
                <div className={`dd-menu price-dd-menu ${priceAlignRight ? "dd-align-right" : "dd-align-left"}`} style={{ width: 220, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 10 }}>Price Range (Rs)</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="number" min="0" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                      className="form-input" style={{ padding: "6px 10px", fontSize: 13, flex: 1 }} />
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>–</span>
                    <input type="number" min="0" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                      className="form-input" style={{ padding: "6px 10px", fontSize: 13, flex: 1 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {[["Under Rs 200","","200"],["Rs 200–500","200","500"],["Rs 500–2k","500","2000"],["Rs 2k+","2000",""]].map(([lbl,min,max]) => (
                      <button key={lbl} type="button" className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: "3px 8px" }}
                        onClick={() => { setPriceMin(min); setPriceMax(max); }}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                  {priceFilterActive && (
                    <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 8, width: "100%", justifyContent: "center", fontSize: 12 }}
                      onClick={() => { setPriceMin(""); setPriceMax(""); }}
                    >
                      Clear price filter
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className={`dd-btn ${freeOnly ? "dd-active dd-free-active" : ""}`}
              onClick={() => setFreeOnly(f => !f)}
              aria-pressed={freeOnly}
              aria-label={freeOnly ? "Remove free only filter" : "Show free items only"}
            >
              {freeOnly && <span className="dd-check-prefix" aria-hidden="true">✓</span>}
              Free Only
            </button>

            {activeFilters > 0 && (
              <button type="button" className="filter-clear-btn" onClick={clearAllFilters} aria-label={`Clear all ${activeFilters} active filters`}>
                Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
              </button>
            )}

            {(activeFilters > 0 || !!searchQuery) && (
              <span className="filter-count" aria-live="polite">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {/* Quick Filter Row */}
          <div className="quick-filter-row" role="group" aria-label="Quick category filters">
            {QUICK_FILTERS.map(qf => {
              const isQFActive = qf.type === "free" ? freeOnly : category === qf.val;
              return (
                <button
                  key={`qf-${qf.val}`}
                  type="button"
                  className={`quick-filter-chip${isQFActive ? " quick-filter-chip-active" : ""}`}
                  onClick={() => {
                    if (qf.type === "free") {
                      setFreeOnly(f => !f);
                    } else {
                      setCategory(prev => prev === qf.val ? "All" : qf.val);
                    }
                  }}
                  aria-pressed={isQFActive}
                  aria-label={`${isQFActive ? "Remove" : "Apply"} ${qf.label} filter`}
                >
                  <span aria-hidden="true">{qf.emoji}</span> {qf.label}
                </button>
              );
            })}
          </div>
        </div>

        {totalCount === 0 ? (
          /* Empty state for the entire marketplace (issue 9) */
          <div className="empty-state" style={{ padding: "48px 24px", textAlign: "center" }}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: "var(--muted-2)", marginBottom: 16 }}>
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <path d="M9 22V12h6v10" />
              <path d="M12 2v10" />
            </svg>
            <h3 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "8px" }}>No Listings Available Yet</h3>
            <p style={{ color: "var(--muted)", marginBottom: "20px" }}>Be the first student to post an item.</p>
            <button className="btn btn-primary" onClick={() => requireAuth("post")} type="button">
              Post Your First Listing
            </button>
          </div>
        ) : filtered.length === 0 ? (
          college !== "All" && collegeOptions.length > 1 && !products.some(l => l.sellerCollege === college) ? (
            <div className="empty-state">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted-2)", marginBottom: 16 }}>
                <path d="M22 10v12h-20v-12l10-6z"/>
                <rect x="6" y="14" width="4" height="8"/>
                <rect x="14" y="14" width="4" height="8"/>
                <circle cx="12" cy="9" r="1.5"/>
              </svg>
              <h3>{college === userProfile?.college ? "No listings available from your college yet." : "No listings in this college"}</h3>
              <p>{college === userProfile?.college ? "Be the first to list an item or view listings from other campuses." : "Try looking at listings from other campuses instead."}</p>
              <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => handleSelectCollege("All")} type="button">
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
                <button className="btn btn-outline" onClick={clearAllFilters} type="button">Clear Filters</button>
                <button className="btn btn-primary" onClick={() => setPage("post")} type="button">Post Item</button>
              </div>
            </div>
          )
        ) : (
          <>
            <div className={layout === "list" ? "listings-list" : "listings-grid"}>
              {filtered.map(l => (
                <div className="card-reveal-animate" key={l.id}>
                  <ListingCard listing={l} layout={layout} onClick={() => setPage("listing", l)} requireAuth={requireAuth} />
                </div>
              ))}
              {/* Shimmer skeleton indicators when loading pagination batch */}
              {loadingMore && Array(4).fill(0).map((_, i) => (
                <SkeletonCard key={`pagination-shimmer-${i}`} layout={layout} />
              ))}
            </div>
            
            {/* Paginated Discovery & Explore controls */}
            {renderPaginationControls()}
          </>
        )}
      </div>
    </div>
  );
}
