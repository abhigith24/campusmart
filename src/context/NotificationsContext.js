import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import {
  collection, query, where, onSnapshot, doc, updateDoc, writeBatch, getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { NotificationService } from "../services/notificationService";

const NotifContext = createContext();
export const useNotifications = () => useContext(NotifContext);

export function NotificationsProvider({ children }) {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!currentUser) { setNotifications([]); return; }
    const q = query(
      collection(db, "notifications"),
      where("sellerId", "==", currentUser.uid)
    );
    // Also listen to buyer notifications
    const q2 = query(
      collection(db, "notifications"),
      where("buyerId", "==", currentUser.uid)
    );

    const results = {};
    const listingsCache = {};
    const usersCache = {};

    async function enrichNotifications(notificationsList) {
      return await Promise.all(notificationsList.map(async (n) => {
        let buyerData = {};
        if (n.buyerId) {
          if (usersCache[n.buyerId]) {
            buyerData = usersCache[n.buyerId];
          } else {
            try {
              const snap = await getDoc(doc(db, "users", n.buyerId));
              if (snap.exists()) {
                buyerData = snap.data();
                usersCache[n.buyerId] = buyerData;
              }
            } catch (err) {
              console.error("enrichNotifications buyer fetch error:", err);
            }
          }
        }

        let listingData = {};
        if (n.listingId) {
          if (listingsCache[n.listingId]) {
            listingData = listingsCache[n.listingId];
          } else {
            try {
              const snap = await getDoc(doc(db, "listings", n.listingId));
              if (snap.exists()) {
                listingData = snap.data();
                listingsCache[n.listingId] = listingData;
              }
            } catch (err) {
              console.error("enrichNotifications listing fetch error:", err);
            }
          }
        }

        return {
          ...n,
          buyerName: buyerData.name || "Unknown Student",
          listingTitle: listingData.title || "Unknown Item",
        };
      }));
    }

    async function merge(key, docs) {
      results[key] = docs;
      const all = [...(results.seller || []), ...(results.buyer || [])];
      const unique = [];
      const seen = new Set();
      for (const item of all) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      }
      const enriched = await enrichNotifications(unique);
      enriched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(enriched);
      setLoading(false);
    }

    const u1 = onSnapshot(q, s => merge("seller", s.docs.map(d => ({ id: d.id, ...d.data() }))), err => {
      console.error("Notifications seller snapshot error:", err);
      merge("seller", []);
    });
    const u2 = onSnapshot(q2, s => merge("buyer", s.docs.map(d => ({ id: d.id, ...d.data() }))), err => {
      console.error("Notifications buyer snapshot error:", err);
      merge("buyer", []);
    });
    return () => { u1(); u2(); };
  }, [currentUser]);

  const markAsRead = useCallback(async (notifId) => {
    try {
      await NotificationService.markAsRead(notifId);
    } catch (err) {
      console.error("Error marking notification as read:", err);
      toast("Failed to update notification status ❌", "error");
    }
  }, [toast]);

  const markAllAsRead = useCallback(async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, "notifications", n.id), { read: true });
      });
      await batch.commit();
      toast("All notifications marked as read", "success");
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      toast("Failed to update notifications ❌", "error");
    }
  }, [notifications, toast]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loading
  }), [notifications, unreadCount, markAsRead, markAllAsRead, loading]);

  return (
    <NotifContext.Provider value={value}>
      {children}
    </NotifContext.Provider>
  );
}
