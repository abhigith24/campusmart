import { doc, serverTimestamp, collection, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { REQUEST_STATUS } from "../constants/requestStatus";
import { LISTING_STATUS } from "../constants/listingStatus";
import { activityLogService } from "./activityLogService";

const validateStringInput = (val, name) => {
  if (!val || typeof val !== "string" || val.trim() === "") {
    throw new Error(`Invalid input: ${name} must be a non-empty string.`);
  }
};

export const transactionService = {
  createPurchaseRequest: async (buyerId, buyerName, listing) => {
    validateStringInput(buyerId, "buyerId");
    validateStringInput(buyerName, "buyerName");
    if (!listing || !listing.id || !listing.sellerId) {
      throw new Error("Invalid input: listing object is malformed.");
    }

    if (buyerId === listing.sellerId) {
      throw new Error("You cannot submit a purchase request for your own listing.");
    }

    const requestId = `${buyerId}_${listing.id}`;
    const requestRef = doc(db, "purchaseRequests", requestId);

    try {
      await runTransaction(db, async (transaction) => {
        const requestSnap = await transaction.get(requestRef);
        if (requestSnap.exists()) {
          const data = requestSnap.data();
          if (
            data.status === REQUEST_STATUS.PENDING ||
            data.status === REQUEST_STATUS.ACCEPTED ||
            data.status === REQUEST_STATUS.EXCHANGED
          ) {
            throw new Error("An active purchase request already exists for this item.");
          }
        }

        // Check listing status
        const listingRef = doc(db, "listings", listing.id);
        const listingSnap = await transaction.get(listingRef);
        if (!listingSnap.exists()) {
          throw new Error("Listing does not exist.");
        }
        const listingData = listingSnap.data();
        if (listingData.status !== LISTING_STATUS.AVAILABLE) {
          throw new Error("Listing is no longer available.");
        }

        transaction.set(requestRef, {
          buyerId,
          sellerId: listing.sellerId,
          listingId: listing.id,
          status: REQUEST_STATUS.PENDING,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
    } catch (err) {
      if (err.code === "permission-denied") {
        throw new Error("Missing or insufficient permissions to create a purchase request. ❌");
      }
      throw err;
    }

    activityLogService.logPurchaseRequest(buyerId, listing.sellerId, listing.id, requestId);
    return requestId;
  },

  acceptPurchaseRequest: async (sellerId, request) => {
    validateStringInput(sellerId, "sellerId");
    if (!request || !request.id || !request.listingId || !request.buyerId) {
      throw new Error("Invalid input: request object is malformed.");
    }

    const requestRef = doc(db, "purchaseRequests", request.id);
    const listingRef = doc(db, "listings", request.listingId);

    await runTransaction(db, async (transaction) => {
      const [listingSnap, requestSnap] = await Promise.all([
        transaction.get(listingRef),
        transaction.get(requestRef)
      ]);

      if (!listingSnap.exists()) {
        throw new Error("Listing does not exist.");
      }
      const listingData = listingSnap.data();
      if (listingData.sellerId !== sellerId) {
        throw new Error("Unauthorized seller: You do not own this listing.");
      }
      if (listingData.status !== LISTING_STATUS.AVAILABLE) {
        throw new Error("Listing is no longer available.");
      }

      if (!requestSnap.exists()) {
        throw new Error("Purchase request does not exist.");
      }
      const requestData = requestSnap.data();
      if (requestData.sellerId !== sellerId) {
        throw new Error("Unauthorized seller: This request does not belong to you.");
      }
      if (requestData.listingId !== request.listingId) {
        throw new Error("Invalid request: Listing ID mismatch.");
      }
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
    validateStringInput(sellerId, "sellerId");
    if (!request || !request.id || !request.listingId || !request.buyerId) {
      throw new Error("Invalid input: request object is malformed.");
    }

    const requestRef = doc(db, "purchaseRequests", request.id);
    const listingRef = doc(db, "listings", request.listingId);

    await runTransaction(db, async (transaction) => {
      const [listingSnap, requestSnap] = await Promise.all([
        transaction.get(listingRef),
        transaction.get(requestRef)
      ]);

      if (!listingSnap.exists()) {
        throw new Error("Listing does not exist.");
      }
      const listingData = listingSnap.data();
      if (listingData.sellerId !== sellerId) {
        throw new Error("Unauthorized seller: You do not own this listing.");
      }

      if (!requestSnap.exists()) {
        throw new Error("Purchase request does not exist.");
      }
      const requestData = requestSnap.data();
      if (requestData.sellerId !== sellerId) {
        throw new Error("Unauthorized seller: This request does not belong to you.");
      }
      if (requestData.status !== REQUEST_STATUS.PENDING) {
        throw new Error("Purchase request is no longer pending.");
      }

      transaction.update(requestRef, {
        status: REQUEST_STATUS.DECLINED,
        updatedAt: serverTimestamp()
      });
    });

    activityLogService.logRequestDeclined(sellerId, request.buyerId, request.listingId, request.id);
  },

  markListingExchanged: async (sellerId, request) => {
    validateStringInput(sellerId, "sellerId");
    if (!request || !request.id || !request.listingId || !request.buyerId) {
      throw new Error("Invalid input: request object is malformed.");
    }

    const requestRef = doc(db, "purchaseRequests", request.id);
    const listingRef = doc(db, "listings", request.listingId);

    await runTransaction(db, async (transaction) => {
      const [listingSnap, requestSnap] = await Promise.all([
        transaction.get(listingRef),
        transaction.get(requestRef)
      ]);

      if (!listingSnap.exists()) {
        throw new Error("Listing does not exist.");
      }
      const listingData = listingSnap.data();
      if (listingData.sellerId !== sellerId) {
        throw new Error("Unauthorized seller: You do not own this listing.");
      }
      if (listingData.status !== LISTING_STATUS.RESERVED) {
        throw new Error("Listing is not reserved.");
      }

      if (!requestSnap.exists()) {
        throw new Error("Purchase request does not exist.");
      }
      const requestData = requestSnap.data();
      if (requestData.sellerId !== sellerId) {
        throw new Error("Unauthorized seller: This request does not belong to you.");
      }
      if (requestData.status !== REQUEST_STATUS.ACCEPTED) {
        throw new Error("Purchase request has not been accepted.");
      }

      transaction.update(requestRef, {
        status: REQUEST_STATUS.EXCHANGED,
        updatedAt: serverTimestamp()
      });

      transaction.update(listingRef, {
        status: LISTING_STATUS.EXCHANGED,
        updatedAt: serverTimestamp()
      });
    });

    activityLogService.logListingExchanged(sellerId, request.buyerId, request.listingId, request.id);
  },

  cancelPurchaseRequestAcceptance: async (sellerId, request) => {
    validateStringInput(sellerId, "sellerId");
    if (!request || !request.id || !request.listingId || !request.buyerId) {
      throw new Error("Invalid input: request object is malformed.");
    }

    const requestRef = doc(db, "purchaseRequests", request.id);
    const listingRef = doc(db, "listings", request.listingId);

    await runTransaction(db, async (transaction) => {
      const [listingSnap, requestSnap] = await Promise.all([
        transaction.get(listingRef),
        transaction.get(requestRef)
      ]);

      if (!listingSnap.exists()) {
        throw new Error("Listing does not exist.");
      }
      const listingData = listingSnap.data();
      if (listingData.sellerId !== sellerId) {
        throw new Error("Unauthorized seller: You do not own this listing.");
      }
      if (listingData.status !== LISTING_STATUS.RESERVED) {
        throw new Error("Listing is not reserved.");
      }

      if (!requestSnap.exists()) {
        throw new Error("Purchase request does not exist.");
      }
      const requestData = requestSnap.data();
      if (requestData.sellerId !== sellerId) {
        throw new Error("Unauthorized seller: This request does not belong to you.");
      }
      if (requestData.status !== REQUEST_STATUS.ACCEPTED) {
        throw new Error("Purchase request is not accepted.");
      }

      transaction.update(requestRef, {
        status: REQUEST_STATUS.CANCELLED,
        updatedAt: serverTimestamp()
      });

      transaction.update(listingRef, {
        status: "active",
        updatedAt: serverTimestamp()
      });
    });

    activityLogService.logRequestCancelled(sellerId, request.buyerId, request.listingId, request.id);
  },

  reportSeller: async (buyerId, buyerName, sellerId, sellerName, listingId, listingTitle, reason, description = "") => {
    validateStringInput(buyerId, "buyerId");
    validateStringInput(buyerName, "buyerName");
    validateStringInput(sellerId, "sellerId");
    validateStringInput(sellerName, "sellerName");
    validateStringInput(listingId, "listingId");
    validateStringInput(listingTitle, "listingTitle");
    validateStringInput(reason, "reason");

    const reportRef = doc(collection(db, "sellerReports"));

    await runTransaction(db, async (transaction) => {
      // Check seller user exists
      const sellerRef = doc(db, "users", sellerId);
      const sellerSnap = await transaction.get(sellerRef);
      if (!sellerSnap.exists()) {
        throw new Error("Seller does not exist.");
      }

      transaction.set(reportRef, {
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
    });

    activityLogService.logSellerReported(buyerId, sellerId, listingId, reason);
  }
};
