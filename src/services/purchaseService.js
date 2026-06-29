import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export const PurchaseService = {
  async createRequest(requestData, buyerId) {
    return await addDoc(collection(db, "purchaseRequests"), {
      ...requestData,
      buyerId,
      status: "pending",
      createdAt: serverTimestamp()
    });
  },

  async updateRequestStatus(requestId, newStatus) {
    const ref = doc(db, "purchaseRequests", requestId);
    return await updateDoc(ref, {
      status: newStatus
    });
  }
};
