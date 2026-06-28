import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import * as Icons from "lucide-react";
import AdminLayout from "../components/AdminLayout";

const STATUS_COLORS = {
  active:   { bg:"var(--status-accepted-bg)", color:"var(--status-accepted-txt)" },
  sold:     { bg:"var(--status-sold-bg)", color:"var(--status-sold-txt)" },
  removed:  { bg:"var(--status-rejected-bg)", color:"var(--status-rejected-txt)" },
  deleted:  { bg:"var(--bg-secondary)", color:"var(--text-muted)" },
  flagged:  { bg:"var(--status-pending-bg)", color:"var(--status-pending-txt)" },
  pending:  { bg:"var(--status-pending-bg)", color:"var(--status-pending-txt)" },
  accepted: { bg:"var(--status-accepted-bg)", color:"var(--status-accepted-txt)" },
  rejected: { bg:"var(--status-rejected-bg)", color:"var(--status-rejected-txt)" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.deleted;
  const capitalized = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "24px", fontSize: "12px", fontWeight: "700", background: s.bg, color: s.color }}>
      <span style={{ fontSize: "10px" }}>●</span> {capitalized}
    </span>
  );
}

const renderPrice = (isFree, price) => {
  if (isFree) return <span style={{ color: "var(--green)", fontWeight: 700 }}>Free</span>;
  if (price !== undefined && price !== null && price !== "" && !isNaN(price)) return `₹${price}`;
  return "—";
};

function AdminSkeletonLoader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px" }}>
      <div className="desktop-only" style={{ background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflow: "hidden" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid var(--bdr)", background: "var(--bg-secondary)" }}>
          <div className="skeleton" style={{ width: "30%", height: "20px", borderRadius: "4px" }}></div>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "16px", borderBottom: "1px solid var(--bdr)", gap: "16px" }}>
            <div className="skeleton" style={{ width: "30%", height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "20%", height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "15%", height: "20px", borderRadius: "4px" }}></div>
            <div className="skeleton" style={{ width: "15%", height: "24px", borderRadius: "12px" }}></div>
            <div className="skeleton" style={{ flex: 1, height: "36px", borderRadius: "8px" }}></div>
          </div>
        ))}
      </div>

      <div className="mobile-only admin-mobile-cards" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "var(--s0)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="skeleton" style={{ width: "70%", height: "20px", borderRadius: "4px" }}></div>
              <div className="skeleton" style={{ width: "30%", height: "20px", borderRadius: "4px" }}></div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div className="skeleton" style={{ width: "40%", height: "14px", borderRadius: "4px" }}></div>
              <div className="skeleton" style={{ width: "50%", height: "14px", borderRadius: "4px" }}></div>
            </div>

            <div style={{ marginTop: "4px" }}>
              <div className="skeleton" style={{ width: "80px", height: "24px", borderRadius: "12px" }}></div>
            </div>

            <div style={{ marginTop: "8px", paddingTop: "12px", borderTop: "1px solid var(--bdr)", display: "flex", gap: "8px" }}>
              <div className="skeleton" style={{ flex: 1, height: "44px", borderRadius: "8px" }}></div>
              <div className="skeleton" style={{ flex: 1, height: "44px", borderRadius: "8px" }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage({ setPage }) {
  const { userProfile } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("listings");
  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listingSearch, setListingSearch] = useState("");
  const [listingFilter, setListingFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, [userProfile]);

  async function loadData() {
    setLoading(true);
    try {
      const [listSnap, reqSnap] = await Promise.all([
        getDocs(query(collection(db, "listings"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "purchaseRequests"), orderBy("createdAt", "desc")))
      ]);
      setListings(listSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast("Failed to load admin data. ❌", "error");
    } finally {
      setLoading(false);
    }
  }

  async function removeListing(id) {
    try {
      await updateDoc(doc(db, "listings", id), { status: "removed" });
      toast("Listing removed", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to remove listing. ❌", "error");
    }
  }

  async function restoreListing(id) {
    try {
      await updateDoc(doc(db, "listings", id), { status: "active" });
      toast("Listing restored", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to restore listing. ❌", "error");
    }
  }

  async function flagListing(id) {
    try {
      await updateDoc(doc(db, "listings", id), { flagged: true });
      toast("Listing flagged 🚩", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to flag listing. ❌", "error");
    }
  }

  async function unflagListing(id) {
    try {
      await updateDoc(doc(db, "listings", id), { flagged: false });
      toast("Flag removed", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to unflag listing. ❌", "error");
    }
  }

  const TABS = [
    { id: "listings", label: `📦 Listings Moderation` },
    { id: "requests", label: `🛒 Purchase Requests` }
  ];

  const filteredListings = listings
    .filter(l => {
      if (listingFilter === "flagged")  return l.flagged;
      if (listingFilter === "removed")  return l.status === "removed";
      if (listingFilter === "active")   return l.status === "active" && !l.flagged;
      return true;
    })
    .filter(l => !listingSearch || l.title?.toLowerCase().includes(listingSearch.toLowerCase()) || l.sellerName?.toLowerCase().includes(listingSearch.toLowerCase()));

  const renderListingActions = (l) => (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
      {l.status === "active" && !l.flagged && (
        <>
          <button type="button" className="btn btn-sm admin-action-btn" style={{ flex: 1, minWidth: "115px", height: "44px", display: "inline-flex", justifyContent: "center", alignItems: "center", background: "var(--status-pending-bg)", color: "var(--status-pending-txt)", border: "1px solid var(--status-pending-txt)", borderRadius: "8px" }} onClick={() => flagListing(l.id)}>🚩 Flag</button>
          <button type="button" className="btn btn-danger btn-sm admin-action-btn" style={{ flex: 1, minWidth: "115px", height: "44px", display: "inline-flex", justifyContent: "center", alignItems: "center", borderRadius: "8px" }} onClick={() => removeListing(l.id)}>🚫 Remove</button>
        </>
      )}
      {l.status === "active" && l.flagged && (
        <>
          <button type="button" className="btn btn-sm btn-outline admin-action-btn" style={{ flex: 1, minWidth: "115px", height: "44px", display: "inline-flex", justifyContent: "center", alignItems: "center", borderRadius: "8px" }} onClick={() => unflagListing(l.id)}>✅ Unflag</button>
          <button type="button" className="btn btn-danger btn-sm admin-action-btn" style={{ flex: 1, minWidth: "115px", height: "44px", display: "inline-flex", justifyContent: "center", alignItems: "center", borderRadius: "8px" }} onClick={() => removeListing(l.id)}>🚫 Remove</button>
        </>
      )}
      {l.status === "removed" && (
        <button type="button" className="btn btn-green btn-sm admin-action-btn" style={{ flex: 1, minWidth: "115px", height: "44px", display: "inline-flex", justifyContent: "center", alignItems: "center", borderRadius: "8px" }} onClick={() => restoreListing(l.id)}>♻️ Restore</button>
      )}
    </div>
  );

  return (
    <AdminLayout activePage="admin" setPage={setPage}>
      <div className="page-header" style={{ marginBottom: "12px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800 }}>🛡️ Admin Dashboard</h2>
        <p style={{ color: "var(--muted)" }}>Manage marketplace listings, purchase requests, and platform moderation.</p>
      </div>

      <div style={{ marginBottom: "16px", display: "flex", width: "100%", maxWidth: "420px", background: "var(--bg-secondary)", padding: "4px", borderRadius: "12px", border: "1px solid var(--bdr)" }}>
        {TABS.map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: "8px",
              border: "none",
              background: tab === t.id ? "var(--surface)" : "transparent",
              color: tab === t.id ? "var(--txt)" : "var(--muted)",
              fontWeight: tab === t.id ? "700" : "600",
              boxShadow: tab === t.id ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              cursor: "pointer",
              transition: "all 0.2s var(--ease)",
              fontSize: "14px",
              textAlign: "center"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <AdminSkeletonLoader />
      ) : (
        <>
          {/* Listings Moderation */}
          {tab === "listings" && (
            <>
              <div className="admin-search-filters" style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  className="form-input"
                  style={{ flex: "1 1 300px", minWidth: 0, padding: "0 16px", height: "48px", borderRadius: "12px", fontSize: "14px" }}
                  placeholder="🔍 Search by title, seller or category..."
                  value={listingSearch}
                  onChange={e => setListingSearch(e.target.value)}
                />
                <div className="admin-filter-chips" style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: "1 1 auto" }}>
                  {["all", "active", "flagged", "removed"].map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`btn ${listingFilter === s ? "btn-primary" : "btn-outline"}`}
                      style={{ flex: 1, minWidth: "fit-content", padding: "0 16px", height: "40px", borderRadius: "20px", fontSize: "14px", fontWeight: "600" }}
                      onClick={() => setListingFilter(s)}
                    >
                      {s === "all" ? "All" : s === "active" ? "Active" : s === "flagged" ? "Flagged" : "Removed"}
                    </button>
                  ))}
                </div>
              </div>

              {filteredListings.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", textAlign: "center" }}>
                  <Icons.SearchX size={48} style={{ color: "var(--muted)", marginBottom: "16px" }} />
                  <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>No listings found</h3>
                  <p style={{ color: "var(--muted)" }}>There are currently no listings matching your filters.</p>
                </div>
              ) : (
                <>
                  <div className="desktop-only" style={{ background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflowX: "auto" }}>
                    <table className="report-table">
                      <thead style={{ fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", fontSize: "12px", color: "var(--muted)" }}>
                        <tr>
                          <th style={{ padding: "14px 16px" }}>Item</th>
                          <th style={{ padding: "14px 16px" }}>Seller</th>
                          <th style={{ padding: "14px 16px" }}>Category</th>
                          <th style={{ padding: "14px 16px" }}>Price</th>
                          <th style={{ padding: "14px 16px", paddingRight: "40px" }}>Status</th>
                          <th style={{ padding: "14px 16px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredListings.map(l => (
                            <tr key={l.id} style={{ background: l.flagged ? "rgba(59, 130, 246, 0.05)" : "transparent" }}>
                              <td data-label="Item" style={{ fontWeight: 700, maxWidth: 180, padding: "14px 16px" }}>
                                {l.flagged && <span style={{ color: "#0369a1", marginRight: 4 }}>🚩</span>}
                                {l.title}
                              </td>
                              <td data-label="Seller" style={{ padding: "14px 16px" }}>{l.sellerName}</td>
                              <td data-label="Category" style={{ padding: "14px 16px" }}>{l.category}</td>
                              <td data-label="Price" style={{ padding: "14px 16px" }}>{renderPrice(l.isFree, l.price)}</td>
                              <td data-label="Status" style={{ padding: "14px 16px", paddingRight: "40px" }}><StatusBadge status={l.flagged && l.status === "active" ? "flagged" : l.status} /></td>
                              <td data-label="Actions" style={{ padding: "14px 16px" }}>
                                {renderListingActions(l)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE LISTINGS CARDS */}
                  <div className="mobile-only admin-mobile-cards" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {filteredListings.map(l => (
                      <div key={l.id} className="admin-mobile-card" style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "var(--s0)", position: "relative" }}>
                        {l.flagged && <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "16px" }}>🚩</div>}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingRight: l.flagged ? "24px" : "0" }}>
                          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--txt)", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>{l.title}</h3>
                          <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--p)" }}>{renderPrice(l.isFree, l.price)}</div>
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--txt-2)" }}>
                            <Icons.Tag size={14} style={{ color: "var(--muted)" }} />
                            <span>{l.category}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--txt-2)" }}>
                            <Icons.User size={14} style={{ color: "var(--muted)" }} />
                            <span>Seller: <span style={{ fontWeight: 600 }}>{l.sellerName}</span></span>
                          </div>
                        </div>

                        <div style={{ marginTop: "4px" }}>
                          <StatusBadge status={l.flagged && l.status === "active" ? "flagged" : l.status} />
                        </div>

                        <div style={{ marginTop: "8px", paddingTop: "12px", borderTop: "1px solid var(--bdr)", width: "100%" }}>
                          {renderListingActions(l)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Purchase Requests */}
          {tab === "requests" && (
            <>
              {requests.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", textAlign: "center" }}>
                  <Icons.Inbox size={48} style={{ color: "var(--muted)", marginBottom: "16px" }} />
                  <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>No purchase requests</h3>
                  <p style={{ color: "var(--muted)" }}>There are currently no purchase requests to display.</p>
                </div>
              ) : (
                <>
                  <div className="desktop-only" style={{ background: "var(--surface)", borderRadius: "var(--r-md)", border: "2px solid var(--bdr)", overflowX: "auto" }}>
                    <table className="report-table">
                      <thead style={{ fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", fontSize: "12px", color: "var(--muted)" }}>
                        <tr>
                          <th style={{ padding: "14px 16px" }}>Item</th>
                          <th style={{ padding: "14px 16px" }}>Buyer</th>
                          <th style={{ padding: "14px 16px" }}>Seller</th>
                          <th style={{ padding: "14px 16px" }}>Price</th>
                          <th style={{ padding: "14px 16px", paddingRight: "40px" }}>Status</th>
                          <th style={{ padding: "14px 16px" }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map(r => (
                          <tr key={r.id}>
                            <td data-label="Item" style={{ fontWeight: 700, padding: "14px 16px" }}>{r.listingTitle}</td>
                            <td data-label="Buyer" style={{ padding: "14px 16px" }}>{r.buyerName}</td>
                            <td data-label="Seller" style={{ padding: "14px 16px" }}>{r.sellerName}</td>
                            <td data-label="Price" style={{ padding: "14px 16px" }}>{renderPrice(r.isFree, r.price)}</td>
                            <td data-label="Status" style={{ padding: "14px 16px", paddingRight: "40px" }}><StatusBadge status={r.status} /></td>
                            <td data-label="Date" style={{ fontSize: 12, color: "var(--muted)", padding: "14px 16px" }}>
                              {r.createdAt?.toDate
                                ? new Date(r.createdAt.toDate()).toLocaleDateString("en-IN")
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE PURCHASE REQUEST CARDS */}
                  <div className="mobile-only admin-mobile-cards" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {requests.map(r => (
                      <div key={r.id} className="admin-mobile-card" style={{ background: "var(--surface)", border: "1px solid var(--bdr)", borderRadius: "var(--r-md)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "var(--s0)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--txt)", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>{r.listingTitle}</h3>
                          <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--p)" }}>{renderPrice(r.isFree, r.price)}</div>
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--txt-2)" }}>
                            <Icons.User size={14} style={{ color: "var(--muted)" }} />
                            <span>Buyer: <span style={{ fontWeight: 600 }}>{r.buyerName}</span></span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--txt-2)" }}>
                            <Icons.User size={14} style={{ color: "var(--muted)" }} />
                            <span>Seller: <span style={{ fontWeight: 600 }}>{r.sellerName}</span></span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--txt-2)" }}>
                            <Icons.Calendar size={14} style={{ color: "var(--muted)" }} />
                            <span>
                              {r.createdAt?.toDate
                                ? new Date(r.createdAt.toDate()).toLocaleDateString("en-IN")
                                : "—"}
                            </span>
                          </div>
                        </div>

                        <div style={{ marginTop: "4px" }}>
                          <StatusBadge status={r.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </AdminLayout>
  );
}
