import React, { useState, useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useWishlist } from "../context/WishlistContext";
import ListingCard from "../components/ListingCard";
import { Search, Heart, ShoppingBag, Tag, Grid, ArrowUpDown, HelpCircle } from "lucide-react";

export default function WishlistPage({ setPage }) {
  const { wishlistDocs, toggleWishlist } = useWishlist();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, Filters & Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Recently Added");

  // Load wishlist items details
  useEffect(() => {
    if (!wishlistDocs.length) {
      setWishlistItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const promises = wishlistDocs.map(w => getDoc(doc(db, "listings", w.listingId)));
        const snaps = await Promise.all(promises);
        if (!cancelled) {
          const items = [];
          snaps.forEach(snap => {
            if (snap.exists()) {
              const matchedDoc = wishlistDocs.find(w => w.listingId === snap.id);
              items.push({ 
                id: snap.id, 
                ...snap.data(),
                savedAt: matchedDoc ? matchedDoc.createdAt : null
              });
            }
          });
          setWishlistItems(items);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading wishlist:", err);
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [wishlistDocs]);

  // Format the savedAt timestamp to human readable text
  const formatSavedAt = (savedAt) => {
    if (!savedAt) return "Saved recently";
    const d = savedAt.toDate ? savedAt.toDate() : new Date(savedAt);
    const now = new Date();
    const diffTime = Math.abs(now - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 1 && now.getDate() === d.getDate()) {
      return "Saved Today";
    }
    if (diffDays <= 2 && now.getDate() - d.getDate() === 1) {
      return "Saved Yesterday";
    }
    if (diffDays <= 7) {
      return `Saved ${diffDays} days ago`;
    }
    return `Saved on ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  };

  // Local Filter & Sort Logic
  const filteredAndSortedItems = useMemo(() => {
    let result = [...wishlistItems];

    // Local Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(item => 
        item.title?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      );
    }

    // Filter Chips
    if (activeFilter !== "All") {
      const filterLower = activeFilter.toLowerCase();
      if (filterLower === "buy") {
        result = result.filter(item => item.listingType !== "rent" && !item.isFree);
      } else if (filterLower === "rent") {
        result = result.filter(item => item.listingType === "rent");
      } else if (filterLower === "free") {
        result = result.filter(item => item.isFree);
      } else {
        result = result.filter(item => item.category?.toLowerCase() === filterLower);
      }
    }

    // Sort options
    result.sort((a, b) => {
      if (sortBy === "Recently Added") {
        // Compare savedAt dates
        const da = a.savedAt?.seconds || 0;
        const db = b.savedAt?.seconds || 0;
        return db - da; // Descending
      }
      if (sortBy === "Newest Listing") {
        const da = a.createdAt?.seconds || 0;
        const db = b.createdAt?.seconds || 0;
        return db - da;
      }
      if (sortBy === "Price Low → High") {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === "Price High → Low") {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortBy === "Alphabetical") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return 0;
    });

    return result;
  }, [wishlistItems, searchTerm, activeFilter, sortBy]);

  // Compute local summary statistics
  const summary = useMemo(() => {
    const total = wishlistItems.length;
    const buyCount = wishlistItems.filter(item => item.listingType !== "rent" && !item.isFree).length;
    const rentCount = wishlistItems.filter(item => item.listingType === "rent").length;
    const freeCount = wishlistItems.filter(item => item.isFree).length;
    return { total, buyCount, rentCount, freeCount };
  }, [wishlistItems]);

  const handleRemove = (listingId, e) => {
    if (e) e.stopPropagation();
    toggleWishlist(listingId);
  };

  return (
    <div className="container profile-page" style={{ padding: "30px 20px 80px" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button 
            className="btn btn-ghost" 
            onClick={() => setPage("home")} 
            style={{ padding: "6px 10px", fontSize: "18px" }}
            type="button"
            aria-label="Back to home"
          >
            ←
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>My Saved Items</h1>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
              {summary.total} saved {summary.total === 1 ? "item" : "items"} · Synchronized across all your devices
            </p>
          </div>
        </div>
      </div>

      {/* Summary Statistics Panel */}
      {wishlistItems.length > 0 && (
        <div className="seller-summary-grid" style={{ marginBottom: "20px" }}>
          <div className="seller-summary-card" style={{ padding: "12px 16px" }}>
            <div className="seller-summary-header"><Heart size={14} style={{ color: "var(--red)" }} /> Total Saved</div>
            <div className="seller-summary-value" style={{ fontSize: "18px" }}>{summary.total}</div>
          </div>
          <div className="seller-summary-card" style={{ padding: "12px 16px" }}>
            <div className="seller-summary-header"><Tag size={14} style={{ color: "var(--grn)" }} /> For Buy</div>
            <div className="seller-summary-value" style={{ fontSize: "18px" }}>{summary.buyCount}</div>
          </div>
          <div className="seller-summary-card" style={{ padding: "12px 16px" }}>
            <div className="seller-summary-header"><ShoppingBag size={14} style={{ color: "var(--p)" }} /> For Rent</div>
            <div className="seller-summary-value" style={{ fontSize: "18px" }}>{summary.rentCount}</div>
          </div>
          <div className="seller-summary-card" style={{ padding: "12px 16px" }}>
            <div className="seller-summary-header"><Grid size={14} style={{ color: "#3b82f6" }} /> Free Items</div>
            <div className="seller-summary-value" style={{ fontSize: "18px" }}>{summary.freeCount}</div>
          </div>
        </div>
      )}

      {/* Search and Filters and Sorting */}
      {wishlistItems.length > 0 && (
        <div className="seller-search-filter-bar">
          <div className="seller-search-row">
            <div style={{ position: "relative", flex: 1, minWidth: "160px" }}>
              <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input 
                className="form-input" 
                type="text" 
                placeholder="Search saved items..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "38px" }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <ArrowUpDown size={16} style={{ color: "var(--muted)" }} />
              <select 
                className="form-input" 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
                style={{ width: "160px" }}
              >
                <option value="Recently Added">Recently Saved</option>
                <option value="Newest Listing">Newest Listing</option>
                <option value="Price Low → High">Price: Low to High</option>
                <option value="Price High → Low">Price: High to Low</option>
                <option value="Alphabetical">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="seller-filter-chips">
            {["All", "Buy", "Rent", "Free", "Books", "Electronics", "Furniture", "Notes", "Sports", "Lab Equipment"].map(chip => (
              <button
                key={chip}
                className={`seller-chip ${activeFilter === chip ? "active" : ""}`}
                onClick={() => setActiveFilter(chip)}
                type="button"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="spinner" />
        </div>
      ) : filteredAndSortedItems.length === 0 ? (
        <div className="empty-state">
          <Heart size={50} style={{ color: "var(--muted-2)", marginBottom: 12 }} />
          <h3>Your Wishlist is Empty</h3>
          <p>Save products you like and they'll appear here for quick access.</p>
          <div style={{ display: "flex", gap: "10px", marginTop: 16, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => setPage("home")}>Browse Marketplace</button>
            <button className="btn btn-outline" onClick={() => setPage("home")}>Start Exploring</button>
          </div>
        </div>
      ) : (
        <div className="listings-grid">
          {filteredAndSortedItems.map(l => (
            <ListingCard 
              key={l.id} 
              listing={l} 
              onClick={() => setPage("listing", l)} 
              postedOverride={formatSavedAt(l.savedAt)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
