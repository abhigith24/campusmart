import React, { createContext, useContext, useEffect, useState } from "react";
import {
  collection, query, where, onSnapshot, doc, updateDoc, writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const NotifContext = createContext();
export const useNotifications = () => useContext(NotifContext);

export function NotificationsProvider({ children }) {
  const { currentUser } = useAuth();
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
      all.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(all);
      setLoading(false);
    }

    const u1 = onSnapshot(q, s => merge("seller", s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(q2, s => merge("buyer", s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, [currentUser]);

  async function markAsRead(notifId) {
    await updateDoc(doc(db, "notifications", notifId), { read: true });
  }

  async function markAllAsRead() {
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, "notifications", n.id), { read: true });
    });
    await batch.commit();
  }

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, loading }}>
      {children}
    </NotifContext.Provider>
  );
}
