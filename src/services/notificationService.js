import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export const NotificationService = {
  async createNotification(notificationData) {
    const allowed = {
      type: notificationData.type,
      buyerId: notificationData.buyerId,
      sellerId: notificationData.sellerId,
      read: false,
      createdAt: serverTimestamp()
    };
    
    // Map non-supported enums to supported rule types
    if (allowed.type === "NEW_CHAT") allowed.type = "CHAT";
    if (allowed.type === "NEW_MESSAGE") allowed.type = "CHAT";
    if (allowed.type === "REVIEW_RECEIVED") allowed.type = "SYSTEM";
    if (allowed.type === "REVIEW_REMINDER") allowed.type = "SYSTEM";

    if (notificationData.listingId) allowed.listingId = notificationData.listingId;
    if (notificationData.purchaseRequestId) allowed.purchaseRequestId = notificationData.purchaseRequestId;
    if (notificationData.requestId) allowed.purchaseRequestId = notificationData.requestId;
    
    // Use title field to store the original sub-type or visual context
    if (notificationData.type === "NEW_CHAT" || notificationData.type === "NEW_MESSAGE" || notificationData.type === "REVIEW_RECEIVED" || notificationData.type === "REVIEW_REMINDER") {
      allowed.title = notificationData.type;
    } else if (notificationData.title) {
      allowed.title = notificationData.title;
    }

    if (notificationData.message) allowed.message = notificationData.message;
    if (notificationData.actionUrl) allowed.actionUrl = notificationData.actionUrl;

    return await addDoc(collection(db, "notifications"), allowed);
  },

  async markAsRead(notificationId) {
    const ref = doc(db, "notifications", notificationId);
    return await updateDoc(ref, {
      read: true,
      readAt: serverTimestamp()
    });
  }
};
