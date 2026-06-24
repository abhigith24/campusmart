import { getListingUrl } from "./urlHelper";

const DEFAULT_TITLE = "CampusMart India — Campus Marketplace";
const DEFAULT_DESC = "CampusMart India — Trusted Campus Marketplace. Buy, sell & donate textbooks, notes and lab equipment within your college.";
const DEFAULT_IMAGE = "/logo-horizontal.png";
const DOMAIN = "https://campusmart.in";

/**
 * Sets meta tag content. Creates the tag if it doesn't exist.
 * @param {string} selector e.g. "meta[property='og:title']"
 * @param {string} attribute e.g. "content" or "property"
 * @param {string} value e.g. "My Product"
 * @param {object} createAttrs Attributes to set if creating the tag
 */
function setMeta(selector, attribute, value, createAttrs = {}) {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(createAttrs).forEach(([k, v]) => element.setAttribute(k, v));
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
}

/**
 * Updates dynamic meta tags, canonical links, and JSON-LD schemas for a specific listing.
 * @param {object} listing 
 */
export function updateSEO(listing) {
  if (!listing) {
    resetSEO();
    return;
  }

  const title = `${listing.title} | CampusMart`;
  const description = `Rent or buy ${listing.title} from verified students on CampusMart. Category: ${listing.category}. Condition: ${listing.condition}. Price: ${listing.isFree ? "Free" : `₹${listing.price || listing.rentPerDay}`}.`;
  
  const canonicalUrl = `${DOMAIN}${getListingUrl(listing)}`;
  const imageUrl = listing.images?.[0] || `${window.location.origin}/placeholder_${listing.category?.toLowerCase() || "misc"}.png`;

  // 1. Title and Description
  document.title = title;
  setMeta("meta[name='description']", "content", description, { name: "description" });

  // 2. Canonical URL
  let canonicalLink = document.querySelector("link[rel='canonical']");
  if (!canonicalLink) {
    canonicalLink = document.createElement("link");
    canonicalLink.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute("href", canonicalUrl);

  // 3. Open Graph Metadata
  setMeta("meta[property='og:title']", "content", title, { property: "og:title" });
  setMeta("meta[property='og:description']", "content", description, { property: "og:description" });
  setMeta("meta[property='og:image']", "content", imageUrl, { property: "og:image" });
  setMeta("meta[property='og:url']", "content", canonicalUrl, { property: "og:url" });
  setMeta("meta[property='og:type']", "content", "product", { property: "og:type" });

  // 4. Twitter Cards
  setMeta("meta[name='twitter:card']", "content", "summary_large_image", { name: "twitter:card" });
  setMeta("meta[name='twitter:title']", "content", title, { name: "twitter:title" });
  setMeta("meta[name='twitter:description']", "content", description, { name: "twitter:description" });
  setMeta("meta[name='twitter:image']", "content", imageUrl, { name: "twitter:image" });

  // 5. Inject Structured JSON-LD Data
  // Remove existing dynamic JSON-LD scripts to avoid duplication
  const existingScripts = document.querySelectorAll("script[data-seo-jsonld]");
  existingScripts.forEach(el => el.remove());

  // Condition schema mapping
  let itemCondition = "https://schema.org/UsedCondition";
  if (listing.condition === "New") {
    itemCondition = "https://schema.org/NewCondition";
  } else if (listing.condition === "Good") {
    itemCondition = "https://schema.org/GoodCondition";
  } else if (listing.condition === "Fair") {
    itemCondition = "https://schema.org/UsedCondition";
  } else if (listing.condition === "Old") {
    itemCondition = "https://schema.org/UsedCondition";
  }

  const availability = listing.status === "sold" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
  const price = listing.isFree ? 0 : (listing.price || listing.rentPerDay || 0);

  // Schema 1: Product Schema
  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": listing.title,
    "image": listing.images || [imageUrl],
    "description": listing.description,
    "category": listing.category,
    "brand": {
      "@type": "Brand",
      "name": "CampusMart"
    },
    "offers": {
      "@type": "Offer",
      "url": canonicalUrl,
      "priceCurrency": "INR",
      "price": price,
      "itemCondition": itemCondition,
      "availability": availability,
      "seller": {
        "@type": "Person",
        "name": listing.sellerName || "CampusMart Student"
      }
    }
  };

  // Schema 2: Student Marketplace / Community Schema (Custom extensions)
  const marketplaceSchema = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    "headline": `CampusMart Item: ${listing.title}`,
    "description": description,
    "image": imageUrl,
    "author": {
      "@type": "Person",
      "name": listing.sellerName || "CampusMart Student"
    },
    "publisher": {
      "@type": "Organization",
      "name": "CampusMart India",
      "logo": {
        "@type": "ImageObject",
        "url": `${window.location.origin}/logo-circular.png`
      }
    },
    "about": {
      "@type": "Thing",
      "name": "Student Exchange Marketplace"
    }
  };

  // Inject Schemas
  [productSchema, marketplaceSchema].forEach((schema, index) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-jsonld", `schema-${index}`);
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  });
}

/**
 * Resets SEO tags back to global platform defaults.
 */
export function resetSEO() {
  document.title = DEFAULT_TITLE;
  setMeta("meta[name='description']", "content", DEFAULT_DESC);
  
  const canonicalLink = document.querySelector("link[rel='canonical']");
  if (canonicalLink) {
    canonicalLink.setAttribute("href", DOMAIN);
  }

  // Restore Default OG
  setMeta("meta[property='og:title']", "content", DEFAULT_TITLE);
  setMeta("meta[property='og:description']", "content", DEFAULT_DESC);
  setMeta("meta[property='og:image']", "content", `${window.location.origin}${DEFAULT_IMAGE}`);
  setMeta("meta[property='og:url']", "content", DOMAIN);
  setMeta("meta[property='og:type']", "content", "website");

  // Remove schemas
  const existingScripts = document.querySelectorAll("script[data-seo-jsonld]");
  existingScripts.forEach(el => el.remove());
}
