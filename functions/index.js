const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

// Phase 1: Safe initialization foundation
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Phase 11: Constants to eliminate magic values
const NOTIF_REQUEST_ACCEPTED = "REQUEST_ACCEPTED";
const NOTIF_REQUEST_DECLINED = "REQUEST_DECLINED";
const NOTIF_LISTING_EXCHANGED = "LISTING_EXCHANGED";
const NOTIF_SYSTEM = "SYSTEM";

const STATUS_ACCEPTED = "ACCEPTED";
const STATUS_DECLINED = "DECLINED";
const STATUS_EXCHANGED = "EXCHANGED";

const TRUST_BASE = 20;
const TRUST_VERIFIED_BONUS = 30;
const TRUST_SALES_TIER_1 = 10;
const TRUST_SALES_TIER_1_BONUS = 20;
const TRUST_SALES_TIER_2 = 5;
const TRUST_SALES_TIER_2_BONUS = 15;
const TRUST_SALES_TIER_3 = 1;
const TRUST_SALES_TIER_3_BONUS = 10;
const TRUST_RATING_MAX = 20;
const TRUST_REPORT_PENALTY = 15;

// Phase 1: Reusable executeSafely wrapper
async function executeSafely(fnName, contextInfo, handlerFn) {
  logger.info(`[${fnName}] Function started`, { context: contextInfo });
  try {
    const result = await handlerFn();
    logger.info(`[${fnName}] Function completed successfully`);
    return result;
  } catch (err) {
    logger.error(`[${fnName}] Function failed with error: ${err.message}`, {
      error: {
        message: err.message,
        stack: err.stack,
        code: err.code
      }
    });
    throw err;
  }
}

// Phase 2 & 3: Centralized createNotification helper with deterministic IDs for idempotency
async function createNotification(docId, notificationData) {
  const notifRef = db.collection("notifications").doc(docId);
  const allowed = {
    type: notificationData.type,
    buyerId: notificationData.buyerId,
    sellerId: notificationData.sellerId,
    read: false,
    createdAt: FieldValue.serverTimestamp()
  };
  if (notificationData.listingId) allowed.listingId = notificationData.listingId;
  if (notificationData.purchaseRequestId) allowed.purchaseRequestId = notificationData.purchaseRequestId;
  if (notificationData.title) allowed.title = notificationData.title;
  if (notificationData.message) allowed.message = notificationData.message;
  if (notificationData.actionUrl) allowed.actionUrl = notificationData.actionUrl;

  await notifRef.set(allowed, { merge: true });
  logger.info(`[createNotification] Notification created/updated with ID: ${docId}`, { type: notificationData.type });
}

// Phase 7: Recalculate seller trust score (Fake response rate logic removed completely)
async function recalculateTrustScore(userId) {
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    logger.warn(`[recalculateTrustScore] User ${userId} does not exist. Skipping update.`);
    return;
  }
  const userData = userSnap.data();

  // Verified Student (30 points max)
  let score = TRUST_BASE;
  if (userData.collegeVerified || userData.isVerified) {
    score += TRUST_VERIFIED_BONUS;
  }

  // Completed Transactions (Successful Exchanges) (up to 20 points)
  const sales = Number(userData.successfulSales || 0);
  if (sales >= TRUST_SALES_TIER_1) {
    score += TRUST_SALES_TIER_1_BONUS;
  } else if (sales >= TRUST_SALES_TIER_2) {
    score += TRUST_SALES_TIER_2_BONUS;
  } else if (sales >= TRUST_SALES_TIER_3) {
    score += TRUST_SALES_TIER_3_BONUS;
  }

  // Seller Rating (up to 20 points)
  const rating = Number(userData.rating || 0);
  if (rating > 0) {
    score += (rating / 5) * TRUST_RATING_MAX;
  }

  // Reports (Penalty)
  const reportsSnap = await db.collection("sellerReports").where("sellerId", "==", userId).get();
  const reportCount = reportsSnap.size;
  score -= (reportCount * TRUST_REPORT_PENALTY);

  // Clamp score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  if (userData.trustScore !== finalScore) {
    await userRef.update({ trustScore: finalScore });
    logger.info(`[recalculateTrustScore] Trust score updated for user ${userId}: ${finalScore}`);
  } else {
    logger.info(`[recalculateTrustScore] Trust score unchanged for user ${userId}`);
  }
}

// Phase 5 & 6: Refactored onPurchaseRequestUpdate with Batch Writes & event validation
exports.onPurchaseRequestUpdate = onDocumentUpdated("purchaseRequests/{requestId}", async (event) => {
  // Phase 4: Event validation early return
  if (!event || !event.data || !event.data.before || !event.data.after || !event.params || !event.params.requestId) {
    logger.warn("onPurchaseRequestUpdate skipped: invalid event data structure");
    return;
  }

  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const requestId = event.params.requestId;

  if (!beforeData || !afterData) {
    logger.warn("onPurchaseRequestUpdate skipped: missing snapshots");
    return;
  }

  // Early return if status has not changed
  if (beforeData.status === afterData.status) {
    return;
  }

  // Phase 12: Defensive programming validates sellerId, buyerId and listingId
  const sellerId = afterData.sellerId;
  const buyerId = afterData.buyerId;
  const listingId = afterData.listingId;

  if (!sellerId || !buyerId || !listingId) {
    logger.warn(`onPurchaseRequestUpdate skipped: missing required IDs for request ${requestId}`);
    return;
  }

  await executeSafely("onPurchaseRequestUpdate", { requestId }, async () => {
    switch (afterData.status) {
      case STATUS_ACCEPTED: {
        const [sellerSnap, buyerSnap, listingSnap] = await Promise.all([
          db.collection("users").doc(sellerId).get(),
          db.collection("users").doc(buyerId).get(),
          db.collection("listings").doc(listingId).get()
        ]);

        if (!sellerSnap.exists || !buyerSnap.exists || !listingSnap.exists) {
          logger.warn(`onPurchaseRequestUpdate STATUS_ACCEPTED skipped: one or more referenced documents do not exist for request ${requestId}`);
          return;
        }

        await createNotification(`REQUEST_ACCEPTED_${requestId}`, {
          type: NOTIF_REQUEST_ACCEPTED,
          sellerId,
          buyerId,
          listingId,
          purchaseRequestId: requestId
        });
        logger.info(`Purchase accepted: request ${requestId}`);
        break;
      }
      case STATUS_DECLINED: {
        const [sellerSnap, buyerSnap, listingSnap] = await Promise.all([
          db.collection("users").doc(sellerId).get(),
          db.collection("users").doc(buyerId).get(),
          db.collection("listings").doc(listingId).get()
        ]);

        if (!sellerSnap.exists || !buyerSnap.exists || !listingSnap.exists) {
          logger.warn(`onPurchaseRequestUpdate STATUS_DECLINED skipped: one or more referenced documents do not exist for request ${requestId}`);
          return;
        }

        await createNotification(`REQUEST_DECLINED_${requestId}`, {
          type: NOTIF_REQUEST_DECLINED,
          sellerId,
          buyerId,
          listingId,
          purchaseRequestId: requestId
        });
        logger.info(`Purchase declined: request ${requestId}`);
        break;
      }
      case STATUS_EXCHANGED: {
        // Phase 13: Retry safety: check listing exchanged status to prevent duplicate increments
        const listingRef = db.collection("listings").doc(listingId);
        const listingSnap = await listingRef.get();
        if (!listingSnap.exists) {
          logger.warn(`onPurchaseRequestUpdate STATUS_EXCHANGED skipped: listing ${listingId} does not exist`);
          return;
        }
        const listingData = listingSnap.data();
        if (listingData.status === "exchanged") {
          logger.info(`Listing ${listingId} is already marked exchanged. Skipping successfulSales increment.`);
          return;
        }

        const sellerRef = db.collection("users").doc(sellerId);
        const sellerSnap = await sellerRef.get();
        if (!sellerSnap.exists) {
          logger.warn(`onPurchaseRequestUpdate STATUS_EXCHANGED skipped: seller user ${sellerId} does not exist`);
          return;
        }

        const batch = db.batch();

        // 1. LISTING_EXCHANGED notification
        const notif1Ref = db.collection("notifications").doc(`LISTING_EXCHANGED_${requestId}`);
        batch.set(notif1Ref, {
          type: NOTIF_LISTING_EXCHANGED,
          sellerId,
          buyerId,
          listingId,
          purchaseRequestId: requestId,
          read: false,
          createdAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // 2. REVIEW_REMINDER notification
        const notif2Ref = db.collection("notifications").doc(`REVIEW_REMINDER_${requestId}`);
        batch.set(notif2Ref, {
          type: NOTIF_SYSTEM,
          title: "REVIEW_REMINDER",
          sellerId,
          buyerId,
          listingId,
          purchaseRequestId: requestId,
          read: false,
          createdAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // 3. successfulSales increment
        batch.update(sellerRef, {
          successfulSales: FieldValue.increment(1)
        });

        // 4. Update listing status to exchanged
        batch.update(listingRef, {
          status: "exchanged",
          updatedAt: FieldValue.serverTimestamp()
        });

        await batch.commit();
        logger.info(`Listing exchanged: request ${requestId}. Batch committed successfully.`);

        // Recalculate trust score only after successful batch commit
        await recalculateTrustScore(sellerId);
        break;
      }
      default:
        logger.info(`onPurchaseRequestUpdate: unhandled status ${afterData.status}`);
    }
  });
});

// Phase 8 & 9: Optimized Rating Aggregation trigger
exports.onRatingCreate = onDocumentCreated("ratings/{ratingId}", async (event) => {
  // Phase 4: Event validation
  if (!event || !event.data || !event.params || !event.params.ratingId) {
    logger.warn("onRatingCreate skipped: invalid event data structure");
    return;
  }

  const data = event.data.data();
  if (!data) {
    logger.warn("onRatingCreate skipped: missing snapshot data");
    return;
  }

  const sellerId = data.sellerId;
  const buyerId = data.buyerId;
  const listingId = data.listingId;
  const purchaseRequestId = data.purchaseRequestId;

  if (!sellerId) {
    logger.warn("onRatingCreate skipped: missing sellerId");
    return;
  }

  await executeSafely("onRatingCreate", { ratingId: event.params.ratingId }, async () => {
    // Phase 12: Defensive check referenced documents exist
    const sellerRef = db.collection("users").doc(sellerId);
    const [sellerSnap, ratingsSnap] = await Promise.all([
      sellerRef.get(),
      db.collection("ratings").where("sellerId", "==", sellerId).get()
    ]);

    if (!sellerSnap.exists) {
      logger.warn(`onRatingCreate skipped: seller user ${sellerId} does not exist`);
      return;
    }

    // Phase 8: Optimized rating aggregates (single traversal, running total/count, no temporary arrays)
    let totalStars = 0;
    let totalRatings = 0;

    ratingsSnap.forEach(docSnap => {
      const rData = docSnap.data();
      const ratingVal = rData.rating !== undefined ? rData.rating : rData.stars;
      if (ratingVal) {
        totalStars += ratingVal;
        totalRatings += 1;
      }
    });

    const avgRating = totalRatings > 0
      ? parseFloat((totalStars / totalRatings).toFixed(2))
      : 0;

    const sellerData = sellerSnap.data();

    // Skip user document update if average rating and total ratings are unchanged
    if (sellerData.rating !== avgRating || sellerData.totalRatings !== totalRatings) {
      await sellerRef.update({
        rating: avgRating,
        totalRatings: totalRatings
      });
      logger.info(`Rating recalculated for ${sellerId}: avgRating=${avgRating}, totalRatings=${totalRatings}`);
    } else {
      logger.info(`Rating aggregates unchanged for ${sellerId}`);
    }

    // Recalculate trust score
    await recalculateTrustScore(sellerId);

    // Create REVIEW_RECEIVED notification
    if (buyerId && listingId && purchaseRequestId) {
      await createNotification(`REVIEW_RECEIVED_${purchaseRequestId}`, {
        type: NOTIF_SYSTEM,
        title: "REVIEW_RECEIVED",
        sellerId,
        buyerId,
        listingId,
        purchaseRequestId
      });
    }
  });
});

// Report trigger to update trust score
exports.onReportCreate = onDocumentCreated("sellerReports/{reportId}", async (event) => {
  // Phase 4: Event validation
  if (!event || !event.data || !event.params || !event.params.reportId) {
    logger.warn("onReportCreate skipped: invalid event data structure");
    return;
  }

  const data = event.data.data();
  if (!data) {
    logger.warn("onReportCreate skipped: missing snapshot data");
    return;
  }

  const sellerId = data.sellerId;
  if (!sellerId) {
    logger.warn("onReportCreate skipped: missing sellerId");
    return;
  }

  await executeSafely("onReportCreate", { reportId: event.params.reportId }, async () => {
    await recalculateTrustScore(sellerId);
    logger.info(`Trust score recalculated for user ${sellerId} due to report`);
  });
});
