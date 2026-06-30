import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Tracks a click on a shared link (short link or SEO link with params).
 * Fired when a page with utm_source or ref is loaded.
 * 
 * @param {string} listingId 
 * @param {string|null} source E.g. "whatsapp", "telegram", "email", "linkedin", "facebook", "twitter", "discord", "generic"
 * @param {string|null} refId User ID of the referrer
 * @param {string|null} visitorId Current logged-in user ID
 */
export async function trackShareClick(listingId, source = "generic", refId = null, visitorId = null) {
  if (!listingId) return;

  const cleanSource = source ? source.toLowerCase().trim() : "generic";
  
  try {
    const listingRef = doc(db, "listings", listingId);
    
    // Build update object
    const updateData = {
      clicksCount: increment(1),
      [`platformClicks.${cleanSource}`]: increment(1)
    };

    // If there is a referrer, increment referral stats
    if (refId) {
      // In Firestore, if a nested object doesn't exist, updating with dot notation
      // will create it automatically. We increment clicks and views.
      updateData[`referralStats.${refId}.clicks`] = increment(1);
      updateData[`referralStats.${refId}.views`] = increment(1);
    }

    await updateDoc(listingRef, updateData);

    // Write a detailed click log for audits/history
    await addDoc(collection(db, "shareClicksLog"), {
      listingId,
      source: cleanSource,
      platform: cleanSource,
      referrerId: refId || null,
      visitorId: visitorId || null,
      userId: visitorId || null,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });

  } catch (error) {
    console.error("Error tracking share click:", error);
  }
}

/**
 * Tracks when a user performs a share action (clicks share button/target).
 * 
 * @param {string} listingId 
 * @param {string} platform E.g. "whatsapp", "telegram", "email", "linkedin", "facebook", "twitter", "discord", "clipboard", "native"
 * @param {string|null} sharerId User ID of the person sharing
 */
export async function trackShareAction(listingId, platform, sharerId = null) {
  if (!listingId || !platform) return;

  const cleanPlatform = platform.toLowerCase().trim();

  try {
    const listingRef = doc(db, "listings", listingId);

    // Build update object
    const updateData = {
      sharesCount: increment(1),
      [`platformShares.${cleanPlatform}`]: increment(1)
    };

    await updateDoc(listingRef, updateData);

    // Add detail to log
    await addDoc(collection(db, "shareActionsLog"), {
      listingId,
      platform: cleanPlatform,
      action: cleanPlatform,
      sharerId: sharerId || null,
      userId: sharerId || null,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });

  } catch (error) {
    console.error("Error tracking share action:", error);
  }
}

/**
 * Tracks an inquiry (when chat is opened or buy initiated) from a referred click.
 * 
 * @param {string} listingId 
 * @param {string|null} refId Referral User ID
 */
export async function trackReferralInquiry(listingId, refId) {
  if (!listingId || !refId) return;

  try {
    const listingRef = doc(db, "listings", listingId);
    await updateDoc(listingRef, {
      [`referralStats.${refId}.inquiries`]: increment(1)
    });
  } catch (error) {
    console.error("Error tracking referral inquiry:", error);
  }
}

/**
 * Tracks a purchase (offer accepted or transaction complete) from a referred click.
 * 
 * @param {string} listingId 
 * @param {string|null} refId Referral User ID
 */
export async function trackReferralPurchase(listingId, refId) {
  if (!listingId || !refId) return;

  try {
    const listingRef = doc(db, "listings", listingId);
    await updateDoc(listingRef, {
      [`referralStats.${refId}.purchases`]: increment(1)
    });
  } catch (error) {
    console.error("Error tracking referral purchase:", error);
  }
}
