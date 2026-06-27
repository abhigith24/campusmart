import { doc, writeBatch, serverTimestamp, getDoc, collection, arrayUnion, increment } from "firebase/firestore";
import { db } from "../firebase";
import { REQUEST_STATUS } from "../constants/requestStatus";
import { LISTING_STATUS } from "../constants/listingStatus";
import { NOTIFICATION_TYPES } from "../constants/notificationTypes";
import { activityLogService } from "./activityLogService";
import { trustService } from "./trustService";

const generateTimelineEvent = (event, actorId) => ({
  event,
  actorId,
  timestamp: Date.now(),
});

export const transactionService = {
  createPurchaseRequest: async (buyerId, buyerName, listing) => {
    const requestId = `${buyerId}_${listing.id}`;
    const requestRef = doc(db, "purchaseRequests", requestId);
    
    const existingSnap = await getDoc(requestRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      if (data.status === REQUEST_STATUS.PENDING || data.status === REQUEST_STATUS.ACCEPTED || data.status === REQUEST_STATUS.EXCHANGED) {
        throw new Error("An active purchase request already exists for this item.");
      }
    }

    const buyerSnap = await getDoc(doc(db, "users", buyerId));
    const buyerData = buyerSnap.exists() ? buyerSnap.data() : {};

    const batch = writeBatch(db);

    const newRequestData = {
      buyerId,
      buyerName,
      buyerCollege: buyerData.college || "",
      buyerPhoto: buyerData.photoURL || "",
      sellerId: listing.sellerId,
      sellerName: listing.sellerName || "Seller",
      listingId: listing.id,
      listingTitle: listing.title,
      price: listing.price || 0,
      isFree: listing.isFree || false,
      listingImage: listing.images?.[0] || "",
      sellerCollege: listing.sellerCollege || "",
      status: REQUEST_STATUS.PENDING,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      timeline: [generateTimelineEvent("REQUEST_CREATED", buyerId)]
    };

    batch.set(requestRef, newRequestData);

    const notifRef = doc(collection(db, "notifications"));
    batch.set(notifRef, {
      type: NOTIFICATION_TYPES.PURCHASE_REQUEST,
      sellerId: listing.sellerId,
      buyerId,
      buyerName,
      listingId: listing.id,
      listingTitle: listing.title,
      requestId,
      read: false,
      createdAt: serverTimestamp()
    });

    const notifBuyerRef = doc(collection(db, "notifications"));
    batch.set(notifBuyerRef, {
      type: NOTIFICATION_TYPES.REQUEST_SENT,
      sellerId: listing.sellerId,
      buyerId,
      buyerName,
      listingId: listing.id,
      listingTitle: listing.title,
      requestId,
      read: false,
      createdAt: serverTimestamp()
    });

    await batch.commit();
    activityLogService.logPurchaseRequest(buyerId, listing.sellerId, listing.id, requestId);
    return requestId;
  },

  acceptPurchaseRequest: async (sellerId, request) => {
    const batch = writeBatch(db);
    const requestRef = doc(db, "purchaseRequests", request.id);
    const listingRef = doc(db, "listings", request.listingId);

    batch.update(requestRef, {
      status: REQUEST_STATUS.ACCEPTED,
      updatedAt: serverTimestamp(),
      timeline: arrayUnion(generateTimelineEvent("REQUEST_ACCEPTED", sellerId))
    });

    batch.update(listingRef, {
      status: LISTING_STATUS.RESERVED,
      updatedAt: serverTimestamp()
    });

    const notifRef = doc(collection(db, "notifications"));
    batch.set(notifRef, {
      type: NOTIFICATION_TYPES.REQUEST_ACCEPTED,
      sellerId,
      buyerId: request.buyerId,
      buyerName: request.buyerName,
      listingId: request.listingId,
      listingTitle: request.listingTitle,
      requestId: request.id,
      read: false,
      createdAt: serverTimestamp()
    });

    await batch.commit();
    activityLogService.logRequestAccepted(sellerId, request.buyerId, request.listingId, request.id);
  },

  declinePurchaseRequest: async (sellerId, request) => {
    const batch = writeBatch(db);
    const requestRef = doc(db, "purchaseRequests", request.id);

    batch.update(requestRef, {
      status: REQUEST_STATUS.DECLINED,
      updatedAt: serverTimestamp(),
      timeline: arrayUnion(generateTimelineEvent("REQUEST_DECLINED", sellerId))
    });

    const notifRef = doc(collection(db, "notifications"));
    batch.set(notifRef, {
      type: NOTIFICATION_TYPES.REQUEST_DECLINED,
      sellerId,
      buyerId: request.buyerId,
      buyerName: request.buyerName,
      listingId: request.listingId,
      listingTitle: request.listingTitle,
      requestId: request.id,
      read: false,
      createdAt: serverTimestamp()
    });

    await batch.commit();
    activityLogService.logRequestDeclined(sellerId, request.buyerId, request.listingId, request.id);
  },

  markListingExchanged: async (sellerId, request) => {
    const batch = writeBatch(db);
    const requestRef = doc(db, "purchaseRequests", request.id);
    const listingRef = doc(db, "listings", request.listingId);
    const sellerRef = doc(db, "users", sellerId);

    batch.update(requestRef, {
      status: REQUEST_STATUS.EXCHANGED,
      updatedAt: serverTimestamp(),
      timeline: arrayUnion(generateTimelineEvent("LISTING_EXCHANGED", sellerId))
    });

    batch.update(listingRef, {
      status: LISTING_STATUS.EXCHANGED,
      updatedAt: serverTimestamp()
    });

    batch.update(sellerRef, {
      successfulSales: increment(1)
    });

    const notifRef = doc(collection(db, "notifications"));
    batch.set(notifRef, {
      type: NOTIFICATION_TYPES.LISTING_EXCHANGED,
      sellerId,
      buyerId: request.buyerId,
      buyerName: request.buyerName,
      listingId: request.listingId,
      listingTitle: request.listingTitle,
      requestId: request.id,
      read: false,
      createdAt: serverTimestamp()
    });

    const reminderNotifRef = doc(collection(db, "notifications"));
    batch.set(reminderNotifRef, {
      type: NOTIFICATION_TYPES.REVIEW_REMINDER,
      sellerId,
      buyerId: request.buyerId,
      buyerName: request.buyerName,
      listingId: request.listingId,
      listingTitle: request.listingTitle,
      requestId: request.id,
      read: false,
      createdAt: serverTimestamp()
    });

    await batch.commit();
    activityLogService.logListingExchanged(sellerId, request.buyerId, request.listingId, request.id);
    await trustService.recalculateTrustScore(sellerId);
  },

  reportSeller: async (buyerId, sellerId, listingId, reason, description = "") => {
    const batch = writeBatch(db);
    const reportRef = doc(collection(db, "sellerReports"));
    
    batch.set(reportRef, {
      reporterId: buyerId,
      sellerId,
      listingId,
      reason,
      description,
      status: "OPEN",
      createdAt: serverTimestamp()
    });

    await batch.commit();
    activityLogService.logSellerReported(buyerId, sellerId, listingId, reason);
    await trustService.recalculateTrustScore(sellerId);
  }
};
