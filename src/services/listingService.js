import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, increment } from "firebase/firestore";

export const ListingService = {
  async createListing(listingData) {
    return await addDoc(collection(db, "listings"), {
      ...listingData,
      status: "active",
      views: 0,
      createdAt: serverTimestamp()
    });
  },

  async updateListing(listingId, updateData) {
    const ref = doc(db, "listings", listingId);
    return await updateDoc(ref, updateData);
  },

  async incrementViews(listingId) {
    const ref = doc(db, "listings", listingId);
    return await updateDoc(ref, {
      views: increment(1)
    });
  },

  async deleteListing(listingId) {
    const ref = doc(db, "listings", listingId);
    return await deleteDoc(ref);
  }
};
