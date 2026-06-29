import { db } from "../firebase";
import { doc, setDoc, updateDoc, getDocs, collection, query, where, serverTimestamp } from "firebase/firestore";
import { trustService } from "./trustService";

export const RatingService = {
  async submitRating({ listingId, sellerId, buyerId, buyerName, rating, review, tags }) {
    const ratingRef = doc(db, "ratings", `${buyerId}_${listingId}`);
    await setDoc(ratingRef, {
      listingId,
      sellerId,
      buyerId,
      buyerName,
      stars: rating,
      review: review.trim(),
      tags,
      createdAt: serverTimestamp()
    });

    // Recalculate seller's average rating
    const allQ = query(collection(db, "ratings"), where("sellerId", "==", sellerId));
    const allSnap = await getDocs(allQ);
    const allStars = allSnap.docs.map(d => d.data().stars).filter(Boolean);
    
    // Prevent race conditions
    const containsNew = allSnap.docs.some(d => d.data().listingId === listingId && d.data().buyerId === buyerId);
    if (!containsNew) {
      allStars.push(rating);
    }

    const avg = allStars.length > 0
      ? allStars.reduce((s, n) => s + n, 0) / allStars.length
      : rating;

    // Update seller user doc
    await updateDoc(doc(db, "users", sellerId), {
      rating: parseFloat(avg.toFixed(2)),
      totalRatings: allStars.length
    });

    // Recalculate dynamic trust score
    await trustService.recalculateTrustScore(sellerId);
  }
};
