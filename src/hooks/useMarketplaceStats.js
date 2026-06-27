import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function useMarketplaceStats(userId) {
  const [stats, setStats] = useState({
    totalListings: 0,
    purchases: 0,
    sales: 0
  });

  useEffect(() => {
    if (!userId) {
      setStats({ totalListings: 0, purchases: 0, sales: 0 });
      return;
    }

    // 1. Total Listings (Active/Sold)
    const listingsQuery = query(collection(db, "listings"), where("sellerId", "==", userId));
    const unsubscribeListings = onSnapshot(listingsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalListings: snapshot.size }));
    }, (error) => {
      console.error("Error fetching listings count:", error);
    });

    // 2. Purchases (Exchanged)
    const purchasesQuery = query(
      collection(db, "purchaseRequests"), 
      where("buyerId", "==", userId),
      where("status", "==", "exchanged")
    );
    const unsubscribePurchases = onSnapshot(purchasesQuery, (snapshot) => {
      setStats(prev => ({ ...prev, purchases: snapshot.size }));
    }, (error) => {
      console.error("Error fetching purchases count:", error);
    });

    // 3. Sales (Exchanged)
    const salesQuery = query(
      collection(db, "purchaseRequests"), 
      where("sellerId", "==", userId),
      where("status", "==", "exchanged")
    );
    const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      setStats(prev => ({ ...prev, sales: snapshot.size }));
    }, (error) => {
      console.error("Error fetching sales count:", error);
    });

    return () => {
      unsubscribeListings();
      unsubscribePurchases();
      unsubscribeSales();
    };
  }, [userId]);

  return stats;
}
