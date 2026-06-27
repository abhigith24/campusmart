import React, { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ListingCard from "../components/ListingCard";
import { 
  Package, ShoppingBag, Eye, Heart, MessageSquare, Search, 
  Trash2, CheckCircle, Share2, Filter, ArrowUpDown, ChevronDown, CheckSquare, Square
} from "lucide-react";

export default function MyListingsPage({ setPage }) {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [listings, setListings] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [requests, setRequests] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter & Sort States
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest First");

  // Bulk Actions States
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Modals
  const [confirmDeleteListing, setConfirmDeleteListing] = useState(null);
  const [confirmStatusListing, setConfirmStatusListing] = useState(null);

  // Realtime Listeners
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
      console.error("Listings load error:", err);
      setLoading(false);
    });

    const wishlistsQuery = query(collection(db, "wishlists"));
    const unsubWishlists = onSnapshot(wishlistsQuery, snap => {
      setWishlists(snap.docs.map(d => d.data()));
    });

    const requestsQuery = query(
      collection(db, "purchaseRequests"),
      where("sellerId", "==", currentUser.uid)
    );
    const unsubRequests = onSnapshot(requestsQuery, snap => {
      setRequests(snap.docs.map(d => d.data()));
    });

    const chatsQuery = query(
      collection(db, "chats"),
      where("sellerId", "==", currentUser.uid)
    );
    const unsubChats = onSnapshot(chatsQuery, snap => {
      setChats(snap.docs.map(d => d.data()));
    });

    return () => {
      unsubListings();
      unsubWishlists();
      unsubRequests();
      unsubChats();
    };
  }, [currentUser]);

  // Compute wishlist saves counts per listing
  const wishlistCounts = useMemo(() => {
    const counts = {};
    wishlists.forEach(w => {
      counts[w.listingId] = (counts[w.listingId] || 0) + 1;
    });
    return counts;
  }, [wishlists]);

  // Compute pending requests counts per listing
  const pendingRequestsCounts = useMemo(() => {
    const counts = {};
    requests.forEach(r => {
      if (r.status === "PENDING") {
        counts[r.listingId] = (counts[r.listingId] || 0) + 1;
      }
    });
    return counts;
  }, [requests]);

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const active = listings.filter(l => l.status === "active").length;
    const sold = listings.filter(l => l.status === "sold" || l.status === "exchanged").length;
    const pendingRequests = requests.filter(r => r.status === "PENDING").length;
    const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
    
    // Sum saves only for user's own listings
    const totalSaves = listings.reduce((sum, l) => sum + (wishlistCounts[l.id] || 0), 0);
    const totalMessages = chats.length;

    return { active, sold, pendingRequests, totalViews, totalSaves, totalMessages };
  }, [listings, requests, wishlistCounts, chats]);

  // Quick Action Handlers
  const handleEdit = (listing) => {
    setPage("edit", listing);
  };

  const handleShare = (listing) => {
    const shareUrl = `${window.location.origin}/listing/${listing.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast("Listing link copied to clipboard! 📋", "success");
    }).catch(() => {
      toast("Failed to copy link.", "error");
    });
  };

  const handleDelete = async () => {
    if (!confirmDeleteListing) return;
    try {
      await deleteDoc(doc(db, "listings", confirmDeleteListing.id));
      toast("Listing deleted successfully.", "success");
      setConfirmDeleteListing(null);
    } catch (e) {
      console.error(e);
      toast("Failed to delete listing.", "error");
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmStatusListing) return;
    const newStatus = confirmStatusListing.status === "active" ? "exchanged" : "active";
    try {
      await updateDoc(doc(db, "listings", confirmStatusListing.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast(`Listing status updated to ${newStatus}!`, "success");
      setConfirmStatusListing(null);
    } catch (e) {
      console.error(e);
      toast("Failed to update listing status.", "error");
    }
  };

  // Bulk Handlers
  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} listings permanently?`)) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => deleteDoc(doc(db, "listings", id)))
      );
      toast("Selected listings deleted.", "success");
      setSelectedIds(new Set());
      setBulkMode(false);
    } catch (e) {
      console.error(e);
      toast("Bulk delete failed.", "error");
    }
  };

  const handleBulkMarkSold = async () => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => 
          updateDoc(doc(db, "listings", id), {
            status: "sold",
            updatedAt: serverTimestamp()
          })
        )
      );
      toast("Selected listings marked as sold.", "success");
      setSelectedIds(new Set());
      setBulkMode(false);
    } catch (e) {
      console.error(e);
      toast("Bulk status update failed.", "error");
    }
  };

  // Search & Filters filtering logic
  const filteredAndSortedListings = useMemo(() => {
    let result = [...listings];

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(l => 
        l.title?.toLowerCase().includes(q) || 
        l.category?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
      );
    }

    // Tab filter chips
    if (activeFilter !== "All") {
      const filterLower = activeFilter.toLowerCase();
      result = result.filter(l => {
        if (filterLower === "pending") return l.status === "pending" || (pendingRequestsCounts[l.id] || 0) > 0;
        return l.status === filterLower;
      });
    }

    // Sorting logic
    result.sort((a, b) => {
      if (sortBy === "Newest First") {
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }
      if (sortBy === "Oldest First") {
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      }
      if (sortBy === "Most Viewed") {
        return (b.views || 0) - (a.views || 0);
      }
      if (sortBy === "Most Requested") {
        return (pendingRequestsCounts[b.id] || 0) - (pendingRequestsCounts[a.id] || 0);
      }
      if (sortBy === "Price Low → High") {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === "Price High → Low") {
        return (b.price || 0) - (a.price || 0);
      }
      return 0;
    });

    return result;
  }, [listings, searchTerm, activeFilter, sortBy, pendingRequestsCounts]);

  return (
    <div className="container profile-page" style={{ padding: "30px 20px 80px" }}>
      
      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
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
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Seller Workspace</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setPage("post")}>
          + Post New Item
        </button>
      </div>

      {/* ================= SUMMARY STATISTIC CARDS ================= */}
      <div className="seller-summary-grid">
        <div className="seller-summary-card">
          <div className="seller-summary-header"><Package size={15} style={{ color: "var(--grn)" }} /> Active Listings</div>
          <div className="seller-summary-value">{metrics.active}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><CheckCircle size={15} style={{ color: "#3b82f6" }} /> Exchanged</div>
          <div className="seller-summary-value">{metrics.sold}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><ShoppingBag size={15} style={{ color: "var(--warn)" }} /> Pending Requests</div>
          <div className="seller-summary-value">{metrics.pendingRequests}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><Eye size={15} style={{ color: "var(--p)" }} /> Total Views</div>
          <div className="seller-summary-value">{metrics.totalViews}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><Heart size={15} style={{ color: "var(--red)" }} /> Wishlist Saves</div>
          <div className="seller-summary-value">{metrics.totalSaves}</div>
        </div>
        <div className="seller-summary-card">
          <div className="seller-summary-header"><MessageSquare size={15} style={{ color: "var(--txt)" }} /> Chats Received</div>
          <div className="seller-summary-value">{metrics.totalMessages}</div>
        </div>
      </div>

      {/* ================= SEARCH, SORT, FILTERS ================= */}
      <div className="seller-search-filter-bar">
        <div className="seller-search-row">
          <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
            <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input 
              className="form-input" 
              type="text" 
              placeholder="Search title, category, keywords..." 
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
              <option value="Newest First">Newest First</option>
              <option value="Oldest First">Oldest First</option>
              <option value="Most Viewed">Most Viewed</option>
              <option value="Most Requested">Most Requested</option>
              <option value="Price Low → High">Price: Low to High</option>
              <option value="Price High → Low">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Filter Chips */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div className="seller-filter-chips">
            {["All", "Active", "Pending", "Reserved", "Sold", "Exchanged", "Under Review"].map(chip => (
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
          
          <button 
            className={`btn btn-sm ${bulkMode ? "btn-primary" : "btn-outline"}`}
            onClick={() => {
              setBulkMode(!bulkMode);
              setSelectedIds(new Set());
            }}
            type="button"
          >
            {bulkMode ? "Cancel Bulk Mode" : "Bulk Actions"}
          </button>
        </div>
      </div>

      {/* Bulk actions control bar */}
      {bulkMode && (
        <div style={{ display: "flex", gap: "12px", background: "var(--p-light)", padding: "12px 16px", borderRadius: "var(--r-lg)", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: "650", color: "var(--p-dark)", marginRight: "auto" }}>
            Selected {selectedIds.size} listings
          </span>
          <button className="btn btn-outline btn-sm" onClick={handleBulkMarkSold} disabled={selectedIds.size === 0}>
            Mark Selected as Sold
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleBulkDelete} disabled={selectedIds.size === 0}>
            Delete Selected
          </button>
        </div>
      )}

      {/* ================= LISTING GRID ================= */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="spinner" />
        </div>
      ) : filteredAndSortedListings.length === 0 ? (
        <div className="empty-state">
          <Package size={50} style={{ color: "var(--muted-2)", marginBottom: 12 }} />
          <h3>📦 No Listings Found</h3>
          <p>We couldn't find listings matching your active search filters.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => setPage("post")}>Post Your First Listing</button>
            <button className="btn btn-outline" onClick={() => setPage("home")}>Browse Marketplace</button>
          </div>
        </div>
      ) : (
        <div className="listings-grid">
          {filteredAndSortedListings.map(l => {
            const isSelected = selectedIds.has(l.id);
            return (
              <div key={l.id} style={{ position: "relative" }}>
                {bulkMode && (
                  <button
                    type="button"
                    onClick={() => handleToggleSelect(l.id)}
                    style={{ position: "absolute", top: "10px", right: "10px", zIndex: 100, background: "var(--card-bg)", border: "none", cursor: "pointer", borderRadius: "50%", padding: "4px" }}
                  >
                    {isSelected ? <CheckSquare size={20} style={{ color: "var(--p)" }} /> : <Square size={20} style={{ color: "var(--muted)" }} />}
                  </button>
                )}
                <ListingCard 
                  listing={l} 
                  onClick={() => {
                    if (bulkMode) {
                      handleToggleSelect(l.id);
                    } else {
                      setPage("listing", l);
                    }
                  }} 
                  isSellerDashboard={true}
                  viewsCount={l.views || 0}
                  wishlistCountVal={wishlistCounts[l.id] || 0}
                  requestsCountVal={pendingRequestsCounts[l.id] || 0}
                  onEdit={handleEdit}
                  onShare={handleShare}
                  onViewRequests={() => setPage("purchase-requests")}
                  onToggleStatus={(listing) => setConfirmStatusListing(listing)}
                  onDelete={(listing) => setConfirmDeleteListing(listing)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ================= DELETE CONFIRM MODAL ================= */}
      {confirmDeleteListing && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(2px)" }}>
          <div className="modal" style={{ width: "100%", maxWidth: "400px", padding: "24px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--bdr)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--txt)", marginBottom: "10px" }}>Delete Listing?</h3>
            <p style={{ fontSize: "14px", color: "var(--txt-2)", lineHeight: "1.5", marginBottom: "20px" }}>
              Are you sure you want to permanently delete <strong>{confirmDeleteListing.title}</strong>? This action is irreversible.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setConfirmDeleteListing(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete Listing</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TOGGLE STATUS CONFIRM MODAL ================= */}
      {confirmStatusListing && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(2px)" }}>
          <div className="modal" style={{ width: "100%", maxWidth: "420px", padding: "24px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--bdr)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--txt)", marginBottom: "10px" }}>Toggle Status?</h3>
            <p style={{ fontSize: "14px", color: "var(--txt-2)", lineHeight: "1.5", marginBottom: "20px" }}>
              Would you like to toggle the status of <strong>{confirmStatusListing.title}</strong> to{" "}
              <strong>{confirmStatusListing.status === "active" ? "Exchanged 🤝" : "Active 🟢"}</strong>?
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setConfirmStatusListing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleToggleStatus}>Update Status</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
