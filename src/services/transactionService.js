import { doc, writeBatch, serverTimestamp, getDoc, collection, increment, runTransaction } from "firebase/firestore";
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

    const batch = writeBatch(db);

    const newRequestData = {
      buyerId,
      sellerId: listing.sellerId,
      listingId: listing.id,
      status: REQUEST_STATUS.PENDING,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    batch.set(requestRef, newRequestData);

    const notifRef = doc(collection(db, "notifications"));
    batch.set(notifRef, {
      type: "PURCHASE_REQUEST",
      sellerId: listing.sellerId,
      buyerId,
      listingId: listing.id,
      purchaseRequestId: requestId,
      read: false,
      createdAt: serverTimestamp()
    });

    const notifBuyerRef = doc(collection(db, "notifications"));
    batch.set(notifBuyerRef, {
      type: "PURCHASE_REQUEST",
      sellerId: listing.sellerId,
      buyerId,
      listingId: listing.id,
      purchaseRequestId: requestId,
      read: false,
      createdAt: serverTimestamp()
    });

    await batch.commit();
    activityLogService.logPurchaseRequest(buyerId, listing.sellerId, listing.id, requestId);
    return requestId;
  },

  acceptPurchaseRequest: async (sellerId, request) => {
    const requestRef = doc(db, "purchaseRequests", request.id);
    const listingRef = doc(db, "listings", request.listingId);

    await runTransaction(db, async (transaction) => {
      const listingSnap = await transaction.get(listingRef);
      if (!listingSnap.exists()) {
        throw new Error("Listing does not exist.");
      }
      const listingData = listingSnap.data();
      if (listingData.status !== LISTING_STATUS.AVAILABLE) {
        throw new Error("Listing is no longer available.");
      }

      const requestSnap = await transaction.get(requestRef);
      if (!requestSnap.exists()) {
        throw new Error("Purchase request does not exist.");
      }
      const requestData = requestSnap.data();
      if (requestData.status !== REQUEST_STATUS.PENDING) {
        throw new Error("Purchase request is no longer pending.");
      }

      transaction.update(requestRef, {
        status: REQUEST_STATUS.ACCEPTED,
        updatedAt: serverTimestamp()
      });

      transaction.update(listingRef, {
        status: LISTING_STATUS.RESERVED,
        updatedAt: serverTimestamp()
      });
    });

    activityLogService.logRequestAccepted(sellerId, request.buyerId, request.listingId, request.id);
  },

  declinePurchaseRequest: async (sellerId, request) => {
    const batch = writeBatch(db);
    const requestRef = doc(db, "purchaseRequests", request.id);

    batch.update(requestRef, {
      status: REQUEST_STATUS.DECLINED,
      updatedAt: serverTimestamp()
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
      updatedAt: serverTimestamp()
    });

    batch.update(listingRef, {
      status: LISTING_STATUS.EXCHANGED,
      updatedAt: serverTimestamp()
    });

    await batch.commit();
    activityLogService.logListingExchanged(sellerId, request.buyerId, request.listingId, request.id);

  },

  reportSeller: async (buyerId, buyerName, sellerId, sellerName, listingId, listingTitle, reason, description = "") => {
    const batch = writeBatch(db);
    const reportRef = doc(collection(db, "sellerReports"));
    
    batch.set(reportRef, {
      reportId: reportRef.id,
      reporterId: buyerId,
      reporterName: buyerName,
      sellerId,
      sellerName,
      listingId,
      productId: listingId,
      productTitle: listingTitle,
      reason,
      description,
      status: "Pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reviewedBy: null,
      moderatorNotes: []
    });

    await batch.commit();
    activityLogService.logSellerReported(buyerId, sellerId, listingId, reason);
  }
};
