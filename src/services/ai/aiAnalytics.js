/**
 * MartGeni AI Analytics
 *
 * Centralized, non-blocking Firestore writer for all AI feature usage events.
 * Every function is fire-and-forget — it will never throw or block the caller.
 *
 * Firestore schema:
 *   aiAnalytics/{userId}/events/{autoId}
 *   {
 *     action:    string,   // e.g. "optimizerUsed"
 *     meta:      object,   // optional payload (category, riskLevel, etc.)
 *     createdAt: timestamp
 *   }
 *
 * Global aggregate (for admin dashboard):
 *   aiAnalytics/__global__/events/{autoId}
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

// Supported analytics action names
export const AI_EVENTS = {
  OPTIMIZER_USED:               "optimizerUsed",
  PRICE_SUGGESTION_USED:        "priceSuggestionUsed",
  CATEGORY_SUGGESTION_ACCEPTED: "categorySuggestionAccepted",
  CATEGORY_SUGGESTION_DISMISSED:"categorySuggestionDismissed",
  FRAUD_ALERT_SHOWN:            "fraudAlertShown",
  SMART_FEED_ENGAGED:           "smartFeedEngaged",
  ASSISTANT_QUERIED:            "assistantQueried",
};

/**
 * Track an AI usage event.
 * Fully silent — never throws, never blocks rendering.
 *
 * @param {string} action - One of AI_EVENTS values
 * @param {string|null} userId - Firebase Auth UID (null = anonymous)
 * @param {object} meta - Optional extra data (e.g. { category, riskLevel })
 */
export async function trackAIEvent(action, userId = null, meta = {}) {
  try {
    const payload = {
      action,
      event: action,
      meta,
      createdAt: serverTimestamp(),
    };

    // Write to user-scoped sub-collection if logged in
    if (userId) {
      await addDoc(
        collection(db, "aiAnalytics", userId, "events"),
        payload
      );
    }

    // Always write to global aggregate for admin dashboard
    await addDoc(
      collection(db, "aiAnalytics", "__global__", "events"),
      { ...payload, userId: userId || "anonymous" }
    );
  } catch (_err) {
    // Silently fail — analytics must never break the app
  }
}
