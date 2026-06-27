import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const trustService = {
  recalculateTrustScore: async (userId) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
      const userData = userSnap.data();

      // Verified Student (30 points max)
      let score = 20; // Base score for all users
      if (userData.collegeVerified || userData.isVerified) {
        score += 30; // Highly weighted for verified students
      }

      // Completed Transactions (Successful Exchanges) (up to 20 points)
      const sales = Number(userData.successfulSales || 0);
      if (sales >= 10) score += 20;
      else if (sales >= 5) score += 15;
      else if (sales >= 1) score += 10;

      // Seller Rating (up to 20 points)
      const rating = Number(userData.rating || 0);
      if (rating > 0) {
        score += (rating / 5) * 20;
      }

      // Response Rate (up to 10 points)
      let sum = 0;
      for (let i = 0; i < userId.length; i++) { sum += userId.charCodeAt(i); }
      const responseRateNum = 85 + (sum % 15); // Emulated response rate
      score += (responseRateNum / 100) * 10;

      // Reports (Penalty)
      const reportsQ = query(collection(db, "sellerReports"), where("sellerId", "==", userId));
      const reportsSnap = await getDocs(reportsQ);
      const reportCount = reportsSnap.size;
      
      score -= (reportCount * 15);

      // Clamp score between 0 and 100
      const finalScore = Math.max(0, Math.min(100, Math.round(score)));

      await updateDoc(userRef, { trustScore: finalScore });
      return finalScore;
    } catch (error) {
      console.error("Error recalculating trust score:", error);
    }
  }
};
