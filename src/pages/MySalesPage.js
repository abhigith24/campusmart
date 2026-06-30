import React, { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { PurchaseService } from "../services/purchaseService";
import { useToast } from "../context/ToastContext";
import { 
  CheckCircle, DollarSign, Tag, Clock, TrendingUp, Search, 
  ArrowUpDown, Package, FileText, BarChart3, User, Calendar
} from "lucide-react";

export default function MySalesPage({ setPage }) {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter & Sort States
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  // Fetch listings and requests
  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoading(true);

    const listingsQuery = query(
      collection(db, "listings"),
      where("sellerId", "==", currentUser.uid)
    );
    const unsubListings = onSnapshot(listingsQuery, snap => {
      setListings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error(err);
      setLoading(false);
    });

    const requestsQuery = query(
      collection(db, "purchaseRequests"),
      where("sellerId", "==", currentUser.uid)
    );
    const unsubRequests = onSnapshot(requestsQuery, async snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const enriched = await PurchaseService.enrichRequests(docs);
      setRequests(enriched);
    });

    return () => {
      unsubListings();
      unsubRequests();
    };
  }, [currentUser]);

  // Combine listings and requests into clean transaction history cards
  const transactions = useMemo(() => {
    const list = [];

    // 1. Process listings that are sold or exchanged
    listings.forEach(l => {
      if (l.status === "sold" || l.status === "exchanged") {
        // Try to match a completed request for buyer details
        const matchedReq = requests.find(r => r.listingId === l.id && r.status === "EXCHANGED");
        list.push({
          id: l.id,
          title: l.title,
          image: l.images?.[0] || "",
          price: l.price || 0,
          isFree: l.isFree || false,
          buyerName: matchedReq ? matchedReq.buyerName : "Campus Student",
          buyerCollege: matchedReq ? matchedReq.buyerCollege : "Main Campus",
          date: l.updatedAt || l.createdAt,
          status: "Completed"
        });
      } else if (l.status === "reserved") {
        const matchedReq = requests.find(r => r.listingId === l.id && r.status === "ACCEPTED");
        list.push({
          id: l.id,
          title: l.title,
          image: l.images?.[0] || "",
          price: l.price || 0,
          isFree: l.isFree || false,
          buyerName: matchedReq ? matchedReq.buyerName : "Campus Student",
          buyerCollege: matchedReq ? matchedReq.buyerCollege : "Main Campus",
          date: l.updatedAt || l.createdAt,
          status: "Pending Exchange"
        });
      }
    });

    // 2. Process cancelled/declined/accepted requests that aren't duplicate
    requests.forEach(r => {
      if (r.status === "DECLINED" || r.status === "CANCELLED") {
        const alreadyAdded = list.some(item => item.id === r.listingId);
        if (!alreadyAdded) {
          list.push({
            id: r.id,
            title: r.listingTitle,
            image: r.listingImage || "",
            price: r.price || 0,
            isFree: r.isFree || false,
            buyerName: r.buyerName,
            buyerCollege: r.buyerCollege,
            date: r.updatedAt || r.createdAt,
            status: "Cancelled"
          });
        }
      }
    });

    return list;
  }, [listings, requests]);

  // Calculate Metrics summary
  const metrics = useMemo(() => {
    const completed = transactions.filter(t => t.status === "Completed");
    const completedCount = completed.length;
    const revenue = completed.reduce((sum, t) => sum + (t.isFree ? 0 : Number(t.price || 0)), 0);
    const pending = transactions.filter(t => t.status === "Pending Exchange").length;
    const avgPrice = completedCount > 0 ? Math.round(revenue / completedCount) : 0;
    
    // Success rate formula: completed / (completed + cancelled)
    const cancelledCount = transactions.filter(t => t.status === "Cancelled").length;
    const totalAttempts = completedCount + cancelledCount;
    const successRate = totalAttempts > 0 ? `${Math.round((completedCount / totalAttempts) * 100)}%` : "100%";

    return { completedCount, revenue, pending, avgPrice, successRate };
  }, [transactions]);

  // Search & Filters filtering logic
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    // Local Search Query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(t => 
        t.title?.toLowerCase().includes(q) ||
        t.buyerName?.toLowerCase().includes(q) ||
        t.buyerCollege?.toLowerCase().includes(q)
      );
    }

    // Filter Chips
    if (activeFilter !== "All") {
      result = result.filter(t => t.status === activeFilter);
    }

    // Sorting
    result.sort((a, b) => {
      const da = a.date?.seconds || a.date?.toMillis?.() || 0;
      const db = b.date?.seconds || b.date?.toMillis?.() || 0;
      if (sortBy === "Newest") {
        return db - da;
      }
      if (sortBy === "Oldest") {
        return da - db;
      }
      if (sortBy === "Highest Price") {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortBy === "Lowest Price") {
        return (a.price || 0) - (b.price || 0);
      }
      return 0;
    });

    return result;
  }, [transactions, searchTerm, activeFilter, sortBy]);

  // Date formatter
  const formatExchangedDate = (ts) => {
    if (!ts) return "Recently";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

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
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Seller Sales Dashboard</h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>Analyze your sales volumes and history</p>
        </div>
      </div>

      {/* ================= SUMMARY STATISTIC CARDS ================= */}
      <div className="seller-summary-grid">
        <div className="seller-summary-card">
          <div className="seller-summary-header"><CheckCircle size={14} style={{ color: "var(--grn)" }} /> Completed Sales</div>
          <div className="seller-summary-value">{metrics.completedCount}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><DollarSign size={14} style={{ color: "var(--grn)" }} /> Total Revenue</div>
          <div className="seller-summary-value">₹{metrics.revenue.toLocaleString("en-IN")}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><Clock size={14} style={{ color: "var(--warn)" }} /> Pending Exchanges</div>
          <div className="seller-summary-value">{metrics.pending}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><TrendingUp size={14} style={{ color: "var(--p)" }} /> Avg Selling Price</div>
          <div className="seller-summary-value">₹{metrics.avgPrice.toLocaleString("en-IN")}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><CheckCircle size={14} style={{ color: "#3b82f6" }} /> Success Rate</div>
          <div className="seller-summary-value">{metrics.successRate}</div>
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
              placeholder="Search sold items..." 
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
              <option value="Newest">Newest Date</option>
              <option value="Oldest">Oldest Date</option>
              <option value="Highest Price">Highest Price</option>
              <option value="Lowest Price">Lowest Price</option>
            </select>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="seller-filter-chips">
          {["All", "Completed", "Pending Exchange", "Cancelled"].map(chip => (
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

      {/* ================= TRANSACTIONS LIST ================= */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="spinner" />
        </div>
      ) : filteredAndSortedTransactions.length === 0 ? (
        <div className="empty-state">
          <Package size={50} style={{ color: "var(--muted-2)", marginBottom: 12 }} />
          <h3>📦 No Sales Recorded</h3>
          <p>You haven't completed any transactions or listings matching this status.</p>
          <div style={{ display: "flex", gap: "10px", marginTop: 16, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => setPage("my-listings")}>Go to Seller Workspace</button>
            <button className="btn btn-outline" onClick={() => setPage("purchase-requests")}>View Purchase Requests</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filteredAndSortedTransactions.map(tx => {
            const isCompleted = tx.status === "Completed";
            const isPending = tx.status === "Pending Exchange";
            const priceVal = tx.isFree ? "Free 💚" : tx.price !== undefined ? `₹${tx.price.toLocaleString("en-IN")}` : "Price Not Available";

            return (
              <div key={tx.id} style={{ display: "flex", gap: "16px", background: "var(--card-bg)", border: "1px solid var(--bdr)", padding: "16px", borderRadius: "var(--r-xl)", flexWrap: "wrap", alignItems: "center" }}>
                
                {/* Image */}
                {tx.image ? (
                  <img src={tx.image} alt="" style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "var(--r-lg)", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: "70px", height: "70px", background: "var(--light)", borderRadius: "var(--r-lg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📦</div>
                )}

                {/* Title & Details */}
                <div style={{ flex: 1, minWidth: "220px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontSize: "15px", fontWeight: "750", color: "var(--txt)" }}>{tx.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "13px", color: "var(--txt-2)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><User size={13} /> Buyer: <strong>{tx.buyerName}</strong></span>
                    {tx.buyerCollege && <span style={{ color: "var(--muted)" }}>🎓 {tx.buyerCollege}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                    <Calendar size={12} />
                    <span>Transaction Date: {formatExchangedDate(tx.date)}</span>
                  </div>
                </div>

                {/* Price, Badge */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", minWidth: "120px", marginLeft: "auto" }}>
                  <div style={{ fontSize: "18px", fontWeight: "850", color: "var(--p)" }}>{priceVal}</div>
                  <span style={{
                    padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700",
                    background: isCompleted ? "var(--status-accepted-bg)" : isPending ? "var(--status-pending-bg)" : "var(--status-rejected-bg)",
                    color: isCompleted ? "var(--status-accepted-txt)" : isPending ? "var(--status-pending-txt)" : "var(--status-rejected-txt)"
                  }}>
                    {tx.status}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Future-Ready components placeholders structure (hidden/no-op triggers for future expansions) */}
      <div style={{ display: "none" }}>
        <button onClick={() => toast("Export Sales logs - Coming Soon!", "info")}>Export Sales</button>
        <button onClick={() => toast("Revenue Reports - Coming Soon!", "info")}>Revenue Reports</button>
      </div>

    </div>
  );
}
