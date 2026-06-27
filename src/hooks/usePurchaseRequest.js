import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function usePurchaseRequest(buyerId, listingId) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!buyerId || !listingId) {
      setRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const requestId = `${buyerId}_${listingId}`;
    const requestRef = doc(db, "purchaseRequests", requestId);

    const unsubscribe = onSnapshot(requestRef, (docSnap) => {
      if (docSnap.exists()) {
        setRequest({ id: docSnap.id, ...docSnap.data() });
      } else {
        setRequest(null);
      }
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("usePurchaseRequest error:", err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [buyerId, listingId]);

  return { request, loading, error };
}
