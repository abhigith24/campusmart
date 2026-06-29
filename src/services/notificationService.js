import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export const NotificationService = {
  async createNotification(notificationData) {
    return await addDoc(collection(db, "notifications"), {
      ...notificationData,
      read: false,
      createdAt: serverTimestamp()
    });
  },

  async markAsRead(notificationId) {
    const ref = doc(db, "notifications", notificationId);
    return await updateDoc(ref, {
      read: true
    });
  }
};
