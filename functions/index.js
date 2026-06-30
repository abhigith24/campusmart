const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Recalculate seller trust score on server side
async function recalculateTrustScore(userId) {
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return;
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
  const reportsSnap = await db.collection("sellerReports").where("sellerId", "==", userId).get();
  const reportCount = reportsSnap.size;
  
  score -= (reportCount * 15);

  // Clamp score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  await userRef.update({ trustScore: finalScore });
}

// 1. Purchase Request Update Trigger (Issue 3 & 4)
exports.onPurchaseRequestUpdate = onDocumentUpdated("purchaseRequests/{requestId}", async (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const requestId = event.params.requestId;

  // Check if status changed
  if (beforeData.status !== afterData.status) {
    const sellerId = afterData.sellerId;
    const buyerId = afterData.buyerId;
    const listingId = afterData.listingId;

    if (afterData.status === "ACCEPTED") {
      // Create REQUEST_ACCEPTED notification
      await db.collection("notifications").add({
        type: "REQUEST_ACCEPTED",
        sellerId,
        buyerId,
        listingId,
        purchaseRequestId: requestId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else if (afterData.status === "DECLINED") {
      // Create REQUEST_DECLINED notification
      await db.collection("notifications").add({
        type: "REQUEST_DECLINED",
        sellerId,
        buyerId,
        listingId,
        purchaseRequestId: requestId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else if (afterData.status === "EXCHANGED") {
      // Create LISTING_EXCHANGED notification
      await db.collection("notifications").add({
        type: "LISTING_EXCHANGED",
        sellerId,
        buyerId,
        listingId,
        purchaseRequestId: requestId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Create REVIEW_REMINDER notification
      await db.collection("notifications").add({
        type: "SYSTEM",
        title: "REVIEW_REMINDER",
        sellerId,
        buyerId,
        listingId,
        purchaseRequestId: requestId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Increment successfulSales
      await db.collection("users").doc(sellerId).update({
        successfulSales: admin.firestore.FieldValue.increment(1)
      });

      // Recalculate trust score
      await recalculateTrustScore(sellerId);
    }
  }
});

// 2. Rating Creation Trigger (Issue 3 & 4)
exports.onRatingCreate = onDocumentCreated("ratings/{ratingId}", async (event) => {
  const data = event.data.data();
  const sellerId = data.sellerId;

  // Recalculate aggregates
  const ratingsSnap = await db.collection("ratings").where("sellerId", "==", sellerId).get();
  const allStars = [];
  ratingsSnap.forEach(docSnap => {
    const rData = docSnap.data();
    if (rData.rating !== undefined) {
      allStars.push(rData.rating);
    }
  });

  const totalRatings = allStars.length;
  const avgRating = totalRatings > 0
    ? parseFloat((allStars.reduce((s, n) => s + n, 0) / totalRatings).toFixed(2))
    : 0;

  await db.collection("users").doc(sellerId).update({
    rating: avgRating,
    totalRatings: totalRatings
  });

  // Recalculate trust score
  await recalculateTrustScore(sellerId);

  // Create REVIEW_RECEIVED notification
  await db.collection("notifications").add({
    type: "SYSTEM",
    title: "REVIEW_RECEIVED",
    sellerId,
    buyerId: data.buyerId,
    listingId: data.listingId,
    purchaseRequestId: data.purchaseRequestId,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
});

// 3. Report Creation Trigger
exports.onReportCreate = onDocumentCreated("sellerReports/{reportId}", async (event) => {
  const data = event.data.data();
  if (data.sellerId) {
    await recalculateTrustScore(data.sellerId);
  }
});
