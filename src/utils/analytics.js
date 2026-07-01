/**
 * analytics.js — Google Analytics 4 helpers for CampusMart
 *
 * All GA4 calls flow through here so the rest of the codebase
 * never references window.gtag directly.  If GA hasn't loaded yet
 * (e.g. script blocked by an ad-blocker) every call is silently
 * ignored instead of crashing.
 */

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Safe wrapper — no-ops when GA is unavailable
function gtag(...args) {
  if (typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

// ─── Page Views ──────────────────────────────────────────────────────────────

/**
 * Call this whenever the SPA navigates to a new "page".
 * @param {string} pageName  - Internal page key, e.g. "home", "listing", "chat"
 * @param {string} pageTitle - Human-readable page title for GA reports
 */
export function trackPageView(pageName, pageTitle) {
  const path = window.location.pathname || `/${pageName}`;
  gtag("event", "page_view", {
    page_title:    pageTitle || pageName,
    page_location: window.location.href,
    page_path:     path,
    send_to:       GA_ID,
  });
}

// ─── Listing Events ──────────────────────────────────────────────────────────

/**
 * Fired when a user opens a listing detail page.
 */
export function trackListingView(listing) {
  gtag("event", "view_item", {
    currency: "INR",
    value:    listing?.price ?? 0,
    items: [{
      item_id:       listing?.id,
      item_name:     listing?.title,
      item_category: listing?.category,
      price:         listing?.price ?? 0,
    }],
  });
}

/**
 * Fired when a user clicks "Make an Offer" or initiates a purchase.
 */
export function trackInitiatePurchase(listing) {
  gtag("event", "begin_checkout", {
    currency: "INR",
    value:    listing?.price ?? 0,
    items: [{
      item_id:   listing?.id,
      item_name: listing?.title,
      price:     listing?.price ?? 0,
    }],
  });
}

/**
 * Fired when a listing is successfully posted.
 */
export function trackListingPosted(listing) {
  gtag("event", "post_listing", {
    event_category: "Seller",
    event_label:    listing?.category,
    value:          listing?.price ?? 0,
  });
}

// ─── Search ──────────────────────────────────────────────────────────────────

/**
 * Fired when a user submits a search query.
 */
export function trackSearch(query) {
  if (!query || !query.trim()) return;
  gtag("event", "search", {
    search_term: query.trim(),
  });
}

// ─── Auth Events ─────────────────────────────────────────────────────────────

/**
 * Fired on successful sign-up.
 */
export function trackSignUp(method = "email") {
  gtag("event", "sign_up", { method });
}

/**
 * Fired on successful login.
 */
export function trackLogin(method = "email") {
  gtag("event", "login", { method });
}

// ─── Engagement ───────────────────────────────────────────────────────────────

/**
 * Generic event helper for one-off custom events.
 * @param {string} eventName
 * @param {object} params
 */
export function trackEvent(eventName, params = {}) {
  gtag("event", eventName, params);
}
