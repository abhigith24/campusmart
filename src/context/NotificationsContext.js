import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import {
  collection, query, where, onSnapshot, doc, updateDoc, writeBatch
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
    function merge(key, docs) {
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
      unique.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(unique);
      setLoading(false);
    }

    const u1 = onSnapshot(q, s => merge("seller", s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(q2, s => merge("buyer", s.docs.map(d => ({ id: d.id, ...d.data() }))));
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
