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

function DropdownBtn({ id, label, options, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="dd-wrap" ref={ref}>
      <button
        className={`dd-btn ${open ? "dd-open" : ""} ${selected !== options[0].val ? "dd-active" : ""}`}
        onClick={() => setOpen(o => !o)}
      >
        {label} <span className={`dd-chevron ${open ? "flipped" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="dd-menu">
          {options.map((opt, i) => (
            <React.Fragment key={opt.val}>
              {opt.divider && <div className="dd-divider-line" />}
              <button
                className={`dd-item ${selected === opt.val ? "dd-selected" : ""}`}
                onClick={() => { onSelect(opt.val); setOpen(false); }}
              >
                {opt.icon && <span>{opt.icon}</span>}
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

export default function HomePage({ setPage, setSelectedListing, searchQuery }) {
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [category, setCategory] = useState("All");
  const [condition,setCondition]= useState("All");
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy,   setSortBy]   = useState("newest");
  const [stats,    setStats]    = useState({ items:0, users:0, free:0 });

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
      setStats({
        items: data.length,
        free:  data.filter(x => x.isFree).length,
        users: new Set(data.map(x => x.sellerId)).size
      });
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

  // labels shown on buttons
  const catLabel  = `${CAT_ICONS[category] || "🏠"} ${category}`;
  const sortLabel = SORT_OPTS.find(o => o.val === sortBy)?.label.split(":")[0] || "⏰ Newest";
  const condLabel = `${COND_ICONS[condition] || "✅"} ${condition === "All" ? "Condition" : condition}`;

  return (
    <div>
      <div className="hero">
        <div className="container">
          <h1>Your Campus <span>Marketplace</span> 🎒</h1>
          <p>Buy, sell & donate within your college — trusted by students, for students</p>
          <div className="hero-stats">
            <div className="hero-stat"><div className="num">{stats.items}+</div><div className="lbl">Active Listings</div></div>
            <div className="hero-stat"><div className="num">{stats.users}+</div><div className="lbl">Students</div></div>
            <div className="hero-stat"><div className="num">{stats.free}</div><div className="lbl">Free Items 💚</div></div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* ── Single filter row: 4 dropdown buttons ── */}
        <div className="filter-bar-single">

          {/* 1. Category */}
          <DropdownBtn
            id="cat"
            label={catLabel}
            selected={category}
            options={CATEGORIES.map(c => ({ val:c, label:`${CAT_ICONS[c]} ${c}`, icon:null }))}
            onSelect={setCategory}
          />

          {/* 2. Sort By */}
          <DropdownBtn
            id="sort"
            label={sortLabel}
            selected={sortBy}
            options={SORT_OPTS.map(o => ({ val:o.val, label:o.label }))}
            onSelect={setSortBy}
          />

          {/* 3. Condition */}
          <DropdownBtn
            id="cond"
            label={condLabel}
            selected={condition}
            options={CONDITIONS.map((c,i) => ({
              val: c,
              label: `${COND_ICONS[c]} ${c === "All" ? "All conditions" : c}`,
              divider: i === 1
            }))}
            onSelect={setCondition}
          />

          {/* 4. Free Only toggle */}
          <button
            className={`dd-btn ${freeOnly ? "dd-free-active" : ""}`}
            onClick={() => setFreeOnly(f => !f)}
          >
            💚 Free Only
          </button>
        </div>

        {/* Listings grid */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No items found</h3>
            <p>Try changing filters or be the first to post this category!</p>
          </div>
        ) : (
          <div className="listings-grid">
            {filtered.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onClick={() => { setSelectedListing(listing); setPage("listing"); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
