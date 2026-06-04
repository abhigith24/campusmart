import React, { useState, useEffect, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "../firebase";
import ListingCard from "../components/ListingCard";

const CATEGORIES = ["All","Textbooks","Notes","Lab Equipment","Electronics","Stationery","Misc"];
const CAT_ICONS  = { All:"🏠", Textbooks:"📖", Notes:"📝", "Lab Equipment":"🔬", Electronics:"💻", Stationery:"✏️", Misc:"📦" };
const CONDITIONS = ["All","New","Good","Fair","Old"];
const COND_ICONS = { All:"✅", New:"🟢", Good:"🔵", Fair:"🟡", Old:"🔴" };
const SORT_OPTS  = [
  { val:"newest",     label:"⏰ Newest first" },
  { val:"price-low",  label:"💰 Price: Low to High" },
  { val:"price-high", label:"💸 Price: High to Low" },
];

function DropdownBtn({ label, options, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="dd-wrap" ref={ref}>
      <button className={`dd-btn ${open ? "dd-open" : ""} ${selected !== options[0].val ? "dd-active" : ""}`}
        onClick={() => setOpen(o => !o)}>
        {label} <span className={`dd-chevron ${open ? "flipped" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="dd-menu">
          {options.map((opt) => (
            <React.Fragment key={opt.val}>
              {opt.divider && <div className="dd-divider-line" />}
              <button className={`dd-item ${selected === opt.val ? "dd-selected" : ""}`}
                onClick={() => { onSelect(opt.val); setOpen(false); }}>
                {opt.label}
                {selected === opt.val && <span className="dd-check">✓</span>}
              </button>
            </React.Fragment>
          ))}
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

export default function HomePage({ setPage, setSelectedListing, searchQuery }) {
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [category, setCategory] = useState("All");
  const [condition,setCondition]= useState("All");
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy,   setSortBy]   = useState("newest");

  useEffect(() => {
    const q = query(
      collection(db, "listings"),
      where("status","==","active"),
      orderBy("createdAt","desc"),
      limit(80)
    );
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setListings(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  let filtered = listings;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(l =>
      l.title?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.category?.toLowerCase().includes(q)
    );
  }
  if (category  !== "All") filtered = filtered.filter(l => l.category  === category);
  if (condition !== "All") filtered = filtered.filter(l => l.condition === condition);
  if (freeOnly)            filtered = filtered.filter(l => l.isFree);
  if (sortBy === "price-low")  filtered = [...filtered].sort((a,b) => (a.price||0)-(b.price||0));
  if (sortBy === "price-high") filtered = [...filtered].sort((a,b) => (b.price||0)-(a.price||0));

  const catLabel  = `${CAT_ICONS[category] || "🏠"} ${category}`;
  const sortLabel = SORT_OPTS.find(o => o.val === sortBy)?.label.split(" first")[0].split(":")[0] || "⏰ Newest";
  const condLabel = `${COND_ICONS[condition] || "✅"} ${condition === "All" ? "Condition" : condition}`;

  const activeFilters = (category !== "All" ? 1 : 0) + (condition !== "All" ? 1 : 0) + (freeOnly ? 1 : 0) + (sortBy !== "newest" ? 1 : 0);

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="container">
          <div className="hero-eyebrow">🎓 India's Campus-Only Marketplace</div>
          <h1>Your Campus <span className="gradient-text">Marketplace</span></h1>
          <p>Buy, sell & donate textbooks, notes and equipment — exclusively within your college community.</p>

          {/* Trust badges */}
          <div className="hero-trust-row">
            {[
              { icon:"🎓", label:"Students Only",  desc:"College emails only"    },
              { icon:"🔒", label:"Secure Chat",     desc:"Direct messaging"       },
              { icon:"📍", label:"Buy Locally",     desc:"Same campus deals"      },
              { icon:"💚", label:"Donate for Free", desc:"Help your juniors"      },
            ].map((b, i) => (
              <div key={i} className="hero-trust-badge">
                <span className="hero-trust-icon">{b.icon}</span>
                <div>
                  <div className="hero-trust-label">{b.label}</div>
                  <div className="hero-trust-desc">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="hero-cta-row">
            <button className="btn btn-primary hero-cta" onClick={() => setPage("post")}>+ List an Item</button>
            <button className="btn btn-outline hero-cta-outline"
              onClick={() => document.getElementById("listings-section")?.scrollIntoView({ behavior:"smooth" })}>
              Browse Listings ↓
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container" id="listings-section">
        {/* Filter bar */}
        <div className="filter-bar-single">
          <DropdownBtn label={catLabel} selected={category}
            options={CATEGORIES.map(c => ({ val:c, label:`${CAT_ICONS[c]} ${c}` }))}
            onSelect={setCategory} />
          <DropdownBtn label={sortLabel} selected={sortBy}
            options={SORT_OPTS.map(o => ({ val:o.val, label:o.label }))}
            onSelect={setSortBy} />
          <DropdownBtn label={condLabel} selected={condition}
            options={CONDITIONS.map((c,i) => ({
              val:c, label:`${COND_ICONS[c]} ${c === "All" ? "All conditions" : c}`, divider: i === 1
            }))}
            onSelect={setCondition} />
          <button className={`dd-btn ${freeOnly ? "dd-free-active" : ""}`}
            onClick={() => setFreeOnly(f => !f)}>
            💚 Free Only
          </button>
          {activeFilters > 0 && (
            <button className="dd-btn filter-clear"
              onClick={() => { setCategory("All"); setCondition("All"); setFreeOnly(false); setSortBy("newest"); }}>
              ✕ Clear ({activeFilters})
            </button>
          )}
          <div className="filter-count">
            {!loading && <span>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="listings-grid">
            {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No items found</h3>
            <p>Try adjusting your filters or be the first to post in this category!</p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setPage("post")}>
              + Post First Item
            </button>
          </div>
        ) : (
          <div className="listings-grid">
            {filtered.map(listing => (
              <ListingCard key={listing.id} listing={listing}
                onClick={() => { setSelectedListing(listing); setPage("listing"); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
