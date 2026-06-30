import { db } from "../firebase";
import { doc, setDoc, updateDoc, getDocs, collection, query, where, serverTimestamp } from "firebase/firestore";
import { trustService } from "./trustService";

export const RatingService = {
  async submitRating({ listingId, sellerId, buyerId, rating, review }) {
    const ratingRef = doc(db, "ratings", `${buyerId}_${listingId}`);
    await setDoc(ratingRef, {
      listingId,
      sellerId,
      buyerId,
      purchaseRequestId: `${buyerId}_${listingId}`,
      rating,
      review: review.trim(),
      createdAt: serverTimestamp()
    });

  }
};
