import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";

const listingsCache = {};
const usersCache = {};

export const PurchaseService = {
  async createRequest(requestData, buyerId) {
    const allowedData = {
      buyerId,
      sellerId: requestData.sellerId,
      listingId: requestData.listingId,
      status: "PENDING",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (requestData.message) allowedData.message = requestData.message;
    if (requestData.negotiatedPrice !== undefined) allowedData.negotiatedPrice = requestData.negotiatedPrice;

    return await addDoc(collection(db, "purchaseRequests"), allowedData);
  },

  async updateRequestStatus(requestId, newStatus) {
    const ref = doc(db, "purchaseRequests", requestId);
    return await updateDoc(ref, {
      status: newStatus.toUpperCase(),
      updatedAt: serverTimestamp()
    });
  },

  async enrichRequests(requestsList) {
    return await Promise.all(requestsList.map(async (req) => {
      let listingData = {};
      if (req.listingId) {
        if (listingsCache[req.listingId]) {
          listingData = listingsCache[req.listingId];
        } else {
          try {
            const snap = await getDoc(doc(db, "listings", req.listingId));
            if (snap.exists()) {
              listingData = snap.data();
              listingsCache[req.listingId] = listingData;
            }
          } catch (err) {
            console.error("enrichRequests listing fetch error:", err);
          }
        }
      }

      let buyerData = {};
      if (req.buyerId) {
        if (usersCache[req.buyerId]) {
          buyerData = usersCache[req.buyerId];
        } else {
          try {
            const snap = await getDoc(doc(db, "users", req.buyerId));
            if (snap.exists()) {
              buyerData = snap.data();
              usersCache[req.buyerId] = buyerData;
            }
          } catch (err) {
            console.error("enrichRequests buyer fetch error:", err);
          }
        }
      }

      let sellerData = {};
      if (req.sellerId) {
        if (usersCache[req.sellerId]) {
          sellerData = usersCache[req.sellerId];
        } else {
          try {
            const snap = await getDoc(doc(db, "users", req.sellerId));
            if (snap.exists()) {
              sellerData = snap.data();
              usersCache[req.sellerId] = sellerData;
            }
          } catch (err) {
            console.error("enrichRequests seller fetch error:", err);
          }
        }
      }

      return {
        ...req,
        listingTitle: listingData.title || "Unknown Item",
        listingImage: listingData.images?.[0] || "",
        price: req.negotiatedPrice !== undefined ? req.negotiatedPrice : (listingData.price || 0),
        isFree: listingData.isFree || (listingData.price === 0),
        buyerName: buyerData.name || "Unknown Buyer",
        buyerPhoto: buyerData.photoURL || "",
        buyerCollege: buyerData.college || "",
        sellerName: sellerData.name || "Unknown Seller",
        sellerCollege: sellerData.college || "",
      };
    }));
  }
};
