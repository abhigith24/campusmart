import { db } from "../firebase";
import { collection, doc, addDoc, updateDoc, getDoc, serverTimestamp, increment } from "firebase/firestore";

const logger = {
  info: (msg, meta = {}) => console.info(`[ListingService] INFO: ${msg}`, meta),
  warn: (msg, meta = {}) => console.warn(`[ListingService] WARN: ${msg}`, meta),
  error: (msg, meta = {}) => console.error(`[ListingService] ERROR: ${msg}`, meta)
};

const runFirestore = async (operation, errorMsg) => {
  try {
    return await operation();
  } catch (err) {
    logger.error(errorMsg, { error: err });
    if (err.code === "permission-denied") {
      throw new Error("Permission denied: You do not have permissions to perform this action.");
    }
    throw new Error(`${errorMsg}: ${err.message || "Unknown error"}`);
  }
};

const validateStringInput = (val, name) => {
  if (!val || typeof val !== "string" || val.trim() === "") {
    throw new Error(`Invalid input: ${name} must be a non-empty string.`);
  }
};

const ALLOWED_CATEGORIES = [
  "Books", "Textbooks", "Notes", "Electronics", "Lab Equipment", "Stationery",
  "Fashion", "Hostel", "Sports", "Gaming", "Musical Instruments", "Photography",
  "Misc", "Other"
];

const ALLOWED_CONDITIONS = ["New", "Good", "Fair", "Old"];

const ALLOWED_LISTING_TYPES = ["sell", "rent", "share", "donate", "free"];

export const ListingService = {
  async createListing(listingData) {
    if (!listingData) throw new Error("Invalid input: Listing data is required.");

    // Validation & Sanitization (Phase 2 & 9)
    validateStringInput(listingData.title, "title");
    validateStringInput(listingData.description, "description");
    validateStringInput(listingData.category, "category");
    validateStringInput(listingData.condition, "condition");
    validateStringInput(listingData.listingType, "listingType");
    validateStringInput(listingData.sellerId, "sellerId");
    validateStringInput(listingData.sellerName, "sellerName");
    validateStringInput(listingData.meetupSpot, "meetupSpot");

    const title = listingData.title.trim();
    const description = listingData.description.trim();
    const category = listingData.category.trim();
    const condition = listingData.condition.trim();
    const listingType = listingData.listingType.trim();
    const sellerId = listingData.sellerId.trim();
    const sellerName = listingData.sellerName.trim();
    const meetupSpot = listingData.meetupSpot.trim();

    if (title.length < 3 || title.length > 200) {
      throw new Error("Invalid input: Title must be between 3 and 200 characters.");
    }

    if (description.length > 2000) {
      throw new Error("Invalid input: Description cannot exceed 2000 characters.");
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      throw new Error("Invalid input: Category not supported.");
    }

    if (!ALLOWED_CONDITIONS.includes(condition)) {
      throw new Error("Invalid input: Condition not supported.");
    }

    if (!ALLOWED_LISTING_TYPES.includes(listingType)) {
      throw new Error("Invalid input: Listing type not supported.");
    }

    if (!listingData.images || !Array.isArray(listingData.images) || listingData.images.length === 0) {
      throw new Error("Invalid input: At least one listing image is required.");
    }

    const price = Number(listingData.price || 0);
    if (isNaN(price) || price < 0) {
      throw new Error("Invalid input: Price cannot be negative.");
    }
    if (listingType === "sell" && price <= 0) {
      throw new Error("Invalid input: Sell listing type requires a price greater than zero.");
    }

    return await runFirestore(async () => {
      // Create clean whitelisted creation payload (Phase 3)
      const cleanListing = {
        title,
        description,
        category,
        condition,
        listingType,
        sellerId,
        sellerName,
        meetupSpot,
        price,
        images: listingData.images,
        status: "active",
        views: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Optional fields
      if (listingData.sellerCollege) cleanListing.sellerCollege = listingData.sellerCollege.trim();
      if (listingData.rentPerDay !== undefined) cleanListing.rentPerDay = Number(listingData.rentPerDay);
      if (listingData.rentMinDays !== undefined) cleanListing.rentMinDays = Number(listingData.rentMinDays);
      if (listingData.rentMaxDays !== undefined) cleanListing.rentMaxDays = Number(listingData.rentMaxDays);
      if (listingData.rentDeposit !== undefined) cleanListing.rentDeposit = Number(listingData.rentDeposit);
      if (listingData.negotiable !== undefined) cleanListing.negotiable = Boolean(listingData.negotiable);
      if (listingData.isFree !== undefined) cleanListing.isFree = Boolean(listingData.isFree);
      if (listingData.tags && Array.isArray(listingData.tags)) {
        cleanListing.tags = listingData.tags.map(t => typeof t === "string" ? t.trim() : "").filter(Boolean);
      }

      const docRef = await addDoc(collection(db, "listings"), cleanListing);
      logger.info(`Listing created successfully with ID: ${docRef.id}`);
      return docRef;
    }, "Failed to create listing");
  },

  async updateListing(listingId, updateData) {
    validateStringInput(listingId, "listingId");
    if (!updateData) throw new Error("Invalid input: Update data is required.");

    return await runFirestore(async () => {
      const ref = doc(db, "listings", listingId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error("Listing not found.");
      }
      const currentData = snap.data();
      if (currentData.status === "deleted") {
        throw new Error("Listing has already been deleted.");
      }

      // Phase 4: Whitelisted update fields only
      const allowedUpdateFields = [
        "title", "description", "category", "condition", "price",
        "rentPerDay", "rentMinDays", "rentMaxDays", "rentDeposit",
        "meetupSpot", "images", "tags", "negotiable", "isFree"
      ];

      const cleanUpdates = {};
      let hasChanges = false;

      for (const key of allowedUpdateFields) {
        if (updateData[key] !== undefined) {
          const currentVal = currentData[key];
          const newVal = updateData[key];

          let isDifferent = false;
          if (Array.isArray(currentVal) && Array.isArray(newVal)) {
            isDifferent = JSON.stringify(currentVal) !== JSON.stringify(newVal);
          } else {
            isDifferent = currentVal !== newVal;
          }

          if (isDifferent) {
            cleanUpdates[key] = newVal;
            hasChanges = true;
          }
        }
      }

      // Phase 8: Skip updates if there are no effective changes to minimize writes
      if (!hasChanges) {
        logger.info(`No effective changes detected for listing ${listingId}. Skipping update.`);
        return;
      }

      cleanUpdates.updatedAt = serverTimestamp();
      await updateDoc(ref, cleanUpdates);
      logger.info(`Listing ${listingId} updated successfully.`);
    }, "Failed to update listing");
  },

  async incrementViews(listingId) {
    validateStringInput(listingId, "listingId");
    try {
      // Phase 7: Session storage views increment caching to prevent view counts inflation
      const storageKey = "viewed_listings";
      let viewed = [];
      try {
        const stored = sessionStorage.getItem(storageKey);
        viewed = stored ? JSON.parse(stored) : [];
      } catch (e) {
        // Safe failover
      }

      if (viewed.includes(listingId)) {
        return;
      }

      const ref = doc(db, "listings", listingId);
      await updateDoc(ref, {
        views: increment(1)
      });

      viewed.push(listingId);
      sessionStorage.setItem(storageKey, JSON.stringify(viewed));
    } catch (err) {
      logger.warn(`Failed to increment views for listing ${listingId}: ${err.message}`);
    }
  },

  async deleteListing(listingId) {
    validateStringInput(listingId, "listingId");
    return this._updateStatus(listingId, "deleted");
  },

  async reserveListing(listingId) {
    validateStringInput(listingId, "listingId");
    return this._updateStatus(listingId, "reserved");
  },

  async markExchanged(listingId) {
    validateStringInput(listingId, "listingId");
    return this._updateStatus(listingId, "exchanged");
  },

  async archiveListing(listingId) {
    validateStringInput(listingId, "listingId");
    return this._updateStatus(listingId, "inactive");
  },

  async restoreListing(listingId) {
    validateStringInput(listingId, "listingId");
    return this._updateStatus(listingId, "active");
  },

  async markSold(listingId) {
    validateStringInput(listingId, "listingId");
    return this._updateStatus(listingId, "sold");
  },

  async _updateStatus(listingId, newStatus) {
    return await runFirestore(async () => {
      const ref = doc(db, "listings", listingId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error("Listing not found.");
      }
      const currentData = snap.data();
      const currentStatus = currentData.status || "active";

      if (currentStatus === "deleted") {
        throw new Error("Cannot modify status of a deleted listing.");
      }

      // Phase 5: Valid transitions whitelist
      const allowedTransitions = {
        active: ["reserved", "sold", "removed", "inactive", "deleted"],
        reserved: ["active", "sold", "exchanged", "removed", "deleted"],
        inactive: ["active", "removed", "deleted"],
        sold: [],
        exchanged: [],
        deleted: []
      };

      const validTargets = allowedTransitions[currentStatus] || [];
      if (currentStatus !== newStatus && !validTargets.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}.`);
      }

      const updates = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      // Soft delete metadata addition (Phase 6)
      if (newStatus === "deleted") {
        updates.deletedAt = serverTimestamp();
      }

      await updateDoc(ref, updates);
      logger.info(`Listing ${listingId} status transitioned to ${newStatus}.`);
    }, `Failed to change listing status to ${newStatus}`);
  }
};
