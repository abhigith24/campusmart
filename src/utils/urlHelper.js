/**
 * urlHelper.js — Helpers for SEO-friendly slugs and share URLs.
 */

/**
 * Converts a listing title to a URL-friendly slug.
 * - Converts spaces to hyphens
 * - Removes special characters
 * - Converts to lowercase
 * - Reduces multiple consecutive hyphens
 * @param {string} title 
 * @returns {string}
 */
export function generateSlug(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars except spaces, hyphens, alphanumeric
    .replace(/[\s_]+/g, "-") // replace spaces and underscores with hyphens
    .replace(/-+/g, "-") // replace multiple consecutive hyphens with a single hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

/**
 * Generates the full SEO-friendly URL path for a listing.
 * @param {object} listing 
 * @returns {string} E.g., "/item/scientific-calculator-fx-991ex-a7x92k"
 */
export function getListingUrl(listing) {
  if (!listing) return "/";
  const slug = generateSlug(listing.title);
  const id = listing.id;
  return `/item/${slug ? `${slug}-` : ""}${id}`;
}

/**
 * Generates the short share URL for a listing.
 * @param {object} listing 
 * @returns {string} E.g., "https://campusmart.in/i/a7x92k"
 */
export function getShortShareUrl(listing) {
  if (!listing) return "";
  return `${window.location.origin}/i/${listing.id}`;
}

/**
 * Parses a listing ID from a URL pathname.
 * Handles:
 * - /i/:id -> id
 * - /item/:slug-id -> id
 * - /listing/:slug-id -> id
 * - /listing/:id -> id
 * @param {string} path 
 * @returns {string|null}
 */
export function parseListingIdFromPath(path) {
  if (!path) return null;
  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  
  const prefix = segments[0]; // "i", "item", or "listing"
  const rest = segments[1];   // "slug-id" or "id"
  
  if (prefix === "i") {
    return rest;
  }
  
  // Extract ID from the end (e.g. "scientific-calculator-fx-991ex-a7x92k")
  const parts = rest.split("-");
  const id = parts[parts.length - 1];
  return id || null;
}
