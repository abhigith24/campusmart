import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Activity Log Service
 * Records important marketplace actions without interrupting the user workflow.
 * Failures to log should be caught and ignored to prevent transaction blocking.
 */

const logActivity = async (action, actorId, targetUserId, listingId, requestId = null, metadata = {}) => {
  try {
    await addDoc(collection(db, "activityLogs"), {
      action,
      actorId: actorId || "unknown",
      targetUserId: targetUserId || null,
      listingId: listingId || null,
      requestId: requestId || null,
      metadata,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error(`Failed to log activity [${action}]:`, err);
  }
};

export const activityLogService = {
  logPurchaseRequest: (actorId, sellerId, listingId, requestId) => 
    logActivity("PURCHASE_REQUEST_CREATED", actorId, sellerId, listingId, requestId),

  logRequestAccepted: (actorId, buyerId, listingId, requestId) => 
    logActivity("PURCHASE_REQUEST_ACCEPTED", actorId, buyerId, listingId, requestId),

  logRequestDeclined: (actorId, buyerId, listingId, requestId) => 
    logActivity("PURCHASE_REQUEST_DECLINED", actorId, buyerId, listingId, requestId),

  logRequestCancelled: (actorId, sellerId, listingId, requestId) => 
    logActivity("PURCHASE_REQUEST_CANCELLED", actorId, sellerId, listingId, requestId),

  logListingExchanged: (actorId, buyerId, listingId, requestId) => 
    logActivity("LISTING_MARKED_EXCHANGED", actorId, buyerId, listingId, requestId),

  logSellerReported: (actorId, sellerId, listingId, reason) => 
    logActivity("SELLER_REPORTED", actorId, sellerId, listingId, null, { reason }),

  logReviewSubmitted: (actorId, sellerId, listingId) => 
    logActivity("SELLER_REVIEW_SUBMITTED", actorId, sellerId, listingId)
};
