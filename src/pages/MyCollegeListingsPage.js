import React, { useState, useEffect, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import ListingCard from "../components/ListingCard";
import { Search, MapPin, CheckCircle, Info, Calendar, ArrowUpDown, Filter, Package } from "lucide-react";

export default function MyCollegeListingsPage({ setPage }) {
  const { userProfile } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const collegeName = userProfile?.college || "";

  // Search & Filter & Sort States
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  // Fetch listings in this campus network
  useEffect(() => {
    if (!collegeName) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "listings"),
      where("status", "==", "active"),
      where("sellerCollege", "==", collegeName)
    );
    const unsub = onSnapshot(q, snap => {
      setListings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error(err);
      setLoading(false);
    });
    return unsub;
  }, [collegeName]);

  // Compute College info
  const collegeInfo = useMemo(() => {
    const activeCount = listings.length;
    const verifiedSellersCount = new Set(
      listings
        .filter(l => l.isVerified || l.collegeVerified)
        .map(l => l.sellerId)
    ).size;

    // Get last updated date
    let lastUpdatedText = "Just now";
    if (listings.length > 0) {
      const sorted = [...listings].sort((a, b) => {
        const da = a.createdAt?.seconds || 0;
        const db = b.createdAt?.seconds || 0;
        return db - da;
      });
      const newest = sorted[0];
      if (newest.createdAt) {
        const d = newest.createdAt.toDate ? newest.createdAt.toDate() : new Date(newest.createdAt);
        lastUpdatedText = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      }
    }

    return { activeCount, verifiedSellersCount, lastUpdated: lastUpdatedText };
  }, [listings]);

  // Filter & Sort Logic
  const filteredAndSortedListings = useMemo(() => {
    let result = [...listings];

    // Local Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(l => 
        l.title?.toLowerCase().includes(q) || 
        l.category?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
      );
    }

    // Filter Chips
    if (activeFilter !== "All") {
      const filterLower = activeFilter.toLowerCase();
      if (filterLower === "buy") {
        result = result.filter(l => l.listingType !== "rent" && !l.isFree);
      } else if (filterLower === "rent") {
        result = result.filter(l => l.listingType === "rent");
      } else if (filterLower === "free") {
        result = result.filter(l => l.isFree);
      } else {
        result = result.filter(l => l.category?.toLowerCase() === filterLower);
      }
    }

    // Sorting Dropdown
    result.sort((a, b) => {
      const da = a.createdAt?.seconds || 0;
      const db = b.createdAt?.seconds || 0;
      if (sortBy === "Newest" || sortBy === "Recently Added") {
        return db - da;
      }
      if (sortBy === "Price Low → High") {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === "Price High → Low") {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortBy === "Most Viewed") {
        return (b.views || 0) - (a.views || 0);
      }
      return 0;
    });

    return result;
  }, [listings, searchTerm, activeFilter, sortBy]);

  return (
    <div className="container profile-page" style={{ padding: "30px 20px 80px" }}>
      
      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
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
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>
            {collegeName ? `Listings at ${collegeName}` : "My Campus Network"}
          </h1>
          {collegeName && (
            <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
              {collegeInfo.activeCount} Active Listings · Verified listings from students of this campus.
            </p>
          )}
        </div>
      </div>

      {!collegeName ? (
        <div className="empty-state">
          <MapPin size={48} style={{ color: "var(--muted-2)", marginBottom: 12 }} />
          <h3>No College Linked</h3>
          <p>Please link your college in settings to inspect items listed in your campus network.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setPage("settings")}>Go to Settings</button>
        </div>
      ) : (
        <>
          {/* ================= CAMPUS INFORMATION PANEL ================= */}
          <div className="seller-summary-grid" style={{ marginBottom: "20px" }}>
            <div className="seller-summary-card" style={{ padding: "12px 16px" }}>
              <div className="seller-summary-header"><MapPin size={14} style={{ color: "var(--p)" }} /> College Network</div>
              <div className="seller-summary-value" style={{ fontSize: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingTop: "4px" }}>
                {collegeName}
              </div>
            </div>
            <div className="seller-summary-card" style={{ padding: "12px 16px" }}>
              <div className="seller-summary-header"><Package size={14} style={{ color: "var(--grn)" }} /> Active Listings</div>
              <div className="seller-summary-value" style={{ fontSize: "18px" }}>{collegeInfo.activeCount}</div>
            </div>
            <div className="seller-summary-card" style={{ padding: "12px 16px" }}>
              <div className="seller-summary-header"><CheckCircle size={14} style={{ color: "#3b82f6" }} /> Verified Sellers</div>
              <div className="seller-summary-value" style={{ fontSize: "18px" }}>{collegeInfo.verifiedSellersCount}</div>
            </div>
            <div className="seller-summary-card" style={{ padding: "12px 16px" }}>
              <div className="seller-summary-header"><Calendar size={14} style={{ color: "var(--warn)" }} /> Last Updated</div>
              <div className="seller-summary-value" style={{ fontSize: "14px", paddingTop: "4px" }}>{collegeInfo.lastUpdated}</div>
            </div>
          </div>

          {/* ================= SEARCH & FILTERS ================= */}
          <div className="seller-search-filter-bar">
            <div className="seller-search-row">
              <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
                <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                <input 
                  className="form-input" 
                  type="text" 
                  placeholder="Search listings in this campus..." 
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
                  <option value="Newest">Newest First</option>
                  <option value="Recently Added">Recently Added</option>
                  <option value="Price Low → High">Price: Low to High</option>
                  <option value="Price High → Low">Price: High to Low</option>
                  <option value="Most Viewed">Most Viewed</option>
                </select>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="seller-filter-chips">
              {["All", "Buy", "Rent", "Free", "Books", "Electronics", "Furniture", "Notes", "Lab Equipment"].map(chip => (
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

          {/* ================= GRID ================= */}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <div className="spinner" />
            </div>
          ) : filteredAndSortedListings.length === 0 ? (
            <div className="empty-state">
              <Package size={50} style={{ color: "var(--muted-2)", marginBottom: 12 }} />
              <h3>No Listings Available</h3>
              <p>Be the first student to list an item in this campus.</p>
              <div style={{ display: "flex", gap: "10px", marginTop: 16, justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={() => setPage("post")}>Post Item</button>
                <button className="btn btn-outline" onClick={() => setPage("home")}>Browse All Listings</button>
              </div>
            </div>
          ) : (
            <div className="listings-grid">
              {filteredAndSortedListings.map(l => (
                <ListingCard 
                  key={l.id} 
                  listing={l} 
                  onClick={() => setPage("listing", l)} 
                  hideSameCampusBadge={true}
                />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}
