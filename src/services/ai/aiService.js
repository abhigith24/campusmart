/**
 * MateGeni AI Service Layer — v2.0
 *
 * Production-grade AI service with:
 *  - In-memory LRU cache with TTL (no repeated API calls)
 *  - Retry with exponential backoff (max 2 retries on 429/5xx)
 *  - Hard timeout per request (6s)
 *  - Smart local fallbacks (app never crashes on AI failure)
 *  - Firestore analytics on every call
 *
 * Features:
 *  1. optimizeListingDescription — Title, description, key selling points, tags
 *  2. suggestPriceRange          — Min, recommended, max, confidence, reason
 *  3. categorizeProduct          — Category + confidence score
 *  4. detectFraudRisk            — isSafe, riskLevel (low/medium/high), safetyTip
 *  5. getSmartRecommendations    — 7-factor pure scoring algorithm (no LLM)
 *  6. generateChatResponse       — Marketplace-focused assistant with listing search
 */

import { MATEGENI_CONFIG } from "../../config/mategeniConfig";
import { trackAIEvent, AI_EVENTS } from "./aiAnalytics";

// ── In-Memory LRU Cache ─────────────────────────────────────────────────────

const _cache = new Map();

function _cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > MATEGENI_CONFIG.cache.ttlMs) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
}

function _cacheSet(key, value) {
  if (_cache.size >= MATEGENI_CONFIG.cache.maxEntries) {
    // Evict oldest entry
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(key, { value, ts: Date.now() });
}

function _cacheKey(...args) {
  return args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join("|");
}

// ── Groq API Helper ─────────────────────────────────────────────────────────

async function _callGroq(messages, model, jsonMode = false, attempt = 0) {
  const apiKey = process.env.REACT_APP_GROQ_API_KEY;
  if (!apiKey) throw new Error("REACT_APP_GROQ_API_KEY not set");

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    MATEGENI_CONFIG.apiConfig.timeoutMs
  );

  try {
    const payload = {
      model,
      messages,
      temperature: 0.25,
      max_tokens:  512,
    };
    if (jsonMode) payload.response_format = { type: "json_object" };

    const res = await fetch(`${MATEGENI_CONFIG.apiConfig.baseUrl}/chat/completions`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body:   JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    // Retry on rate-limit or server error
    if ((res.status === 429 || res.status >= 500) && attempt < MATEGENI_CONFIG.apiConfig.maxRetries) {
      const wait = 800 * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, wait));
      return _callGroq(messages, model, jsonMode, attempt + 1);
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new Error("Groq request timed out");
    throw err;
  }
}

/** Safely parse a JSON response, stripping markdown fences if present */
function _parseJSON(text, fallback) {
  try {
    let cleaned = text.trim();
    const fence = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    if (fence) cleaned = fence[1];
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 1 — LISTING OPTIMIZER
// ══════════════════════════════════════════════════════════════════════════════

export async function optimizeListingDescription({ title, description, category, condition }, userId = null) {
  if (!MATEGENI_CONFIG.featureFlags.enableListingOptimizer) {
    return { optimizedTitle: title, optimizedDescription: description, keySellingPoints: [], suggestedTags: [] };
  }

  const cacheKey = _cacheKey("optimizer", title, description, category, condition);
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  // Track usage (fire-and-forget)
  trackAIEvent(AI_EVENTS.OPTIMIZER_USED, userId, { category, condition });

  const localFallback = () => {
    const condMap = { New: "brand new", Good: "good condition", Fair: "fair condition", Old: "well-used" };
    return {
      optimizedTitle: `${title.trim()} | ${condMap[condition] || condition} | ${category}`,
      optimizedDescription: description.trim(),
      keySellingPoints: [
        `Condition: ${condition}`,
        `Category: ${category}`,
        "Available for campus meetup",
      ],
      suggestedTags: [category.toLowerCase(), condition.toLowerCase()].filter(Boolean),
    };
  };

  const apiKey = process.env.REACT_APP_GROQ_API_KEY;
  if (!apiKey) return localFallback();

  try {
    const prompt = `You are an expert marketplace copywriter for CampusMart, a student-to-student campus marketplace in India.
Optimize this product listing for a student seller. Be honest, clear, and student-friendly.

Product:
- Title: "${title}"
- Description: "${description}"
- Category: "${category}"
- Condition: "${condition}"

Rules:
- Title: max 80 chars, include brand/model if mentioned, mention condition, be search-friendly
- Description: easy to read, bullet points, honest condition, mention accessories/usage
- Key Selling Points: 3-4 short bullet strings, no bullet symbols, just the text
- Tags: 3-5 relevant strings
- NEVER use fake urgency, clickbait, or exaggeration

Return ONLY valid JSON:
{
  "optimizedTitle": "...",
  "optimizedDescription": "...",
  "keySellingPoints": ["...", "..."],
  "suggestedTags": ["...", "..."]
}`;

    const raw = await _callGroq(
      [{ role: "user", content: prompt }],
      MATEGENI_CONFIG.models.quality,
      true
    );

    const result = _parseJSON(raw, null);
    if (result?.optimizedTitle && result?.optimizedDescription) {
      const final = {
        optimizedTitle:      result.optimizedTitle,
        optimizedDescription: result.optimizedDescription,
        keySellingPoints:    Array.isArray(result.keySellingPoints) ? result.keySellingPoints : [],
        suggestedTags:       Array.isArray(result.suggestedTags) ? result.suggestedTags : [],
      };
      _cacheSet(cacheKey, final);
      return final;
    }
    return localFallback();
  } catch (err) {
    console.warn("[MateGeni] Optimizer fallback:", err.message);
    return localFallback();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 2 — SMART PRICE SUGGESTION
// ══════════════════════════════════════════════════════════════════════════════

const PRICE_BASES = {
  Books: 350, Notes: 120, Electronics: 5000, "Lab Equipment": 600,
  Stationery: 90, Fashion: 500, Hostel: 400, Sports: 600,
  Gaming: 3000, "Musical Instruments": 2000, Photography: 4000, Other: 300,
};
const COND_MULTIPLIERS = { New: 1.0, Good: 0.65, Fair: 0.40, Old: 0.20 };

export async function suggestPriceRange({ title, category, condition }, userId = null) {
  if (!MATEGENI_CONFIG.featureFlags.enablePriceSuggestion) {
    return { minPrice: 0, maxPrice: 0, recommendedPrice: 0, confidenceScore: 0, reason: "" };
  }

  const cacheKey = _cacheKey("price", title, category, condition);
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  trackAIEvent(AI_EVENTS.PRICE_SUGGESTION_USED, userId, { category, condition });

  const localFallback = () => {
    const base = PRICE_BASES[category] || 300;
    const mult = COND_MULTIPLIERS[condition] || 0.5;
    const rec  = Math.round(base * mult);
    const min  = Math.round(rec * 0.75);
    const max  = Math.round(rec * 1.3);
    return {
      minPrice:        min,
      maxPrice:        max,
      recommendedPrice: rec,
      confidenceScore: 0.60,
      reason: `Based on typical campus prices for ${category} in ${condition} condition.`,
    };
  };

  const apiKey = process.env.REACT_APP_GROQ_API_KEY;
  if (!apiKey) return localFallback();

  try {
    const prompt = `You are a price estimation assistant for CampusMart, a student-to-student campus marketplace in India.
Estimate a realistic second-hand price range in Indian Rupees (INR) for this item.
Students are price-sensitive — keep prices fair and campus-appropriate.

Item:
- Title: "${title}"
- Category: "${category}"
- Condition: "${condition}"

Return ONLY valid JSON:
{
  "minPrice": <number>,
  "maxPrice": <number>,
  "recommendedPrice": <number>,
  "confidenceScore": <0.0-1.0>,
  "reason": "<one sentence explanation>"
}`;

    const raw = await _callGroq(
      [{ role: "user", content: prompt }],
      MATEGENI_CONFIG.models.fast,
      true
    );

    const result = _parseJSON(raw, null);
    if (result && typeof result.minPrice === "number" && typeof result.maxPrice === "number") {
      const final = {
        minPrice:        result.minPrice,
        maxPrice:        result.maxPrice,
        recommendedPrice: result.recommendedPrice || Math.round((result.minPrice + result.maxPrice) / 2),
        confidenceScore: result.confidenceScore   || 0.75,
        reason:          result.reason             || `Suggested for ${category} in ${condition} condition.`,
      };
      _cacheSet(cacheKey, final);
      return final;
    }
    return localFallback();
  } catch (err) {
    console.warn("[MateGeni] Price suggestion fallback:", err.message);
    return localFallback();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — SMART CATEGORY DETECTION
// ══════════════════════════════════════════════════════════════════════════════

const CATEGORIES = [
  "Books", "Notes", "Electronics", "Lab Equipment", "Stationery",
  "Fashion", "Hostel", "Sports", "Gaming", "Musical Instruments", "Photography", "Other",
];

const CATEGORY_KEYWORDS = {
  Books:               ["book", "textbook", "novel", "edition", "author", "calculus", "physics", "chemistry", "biology", "mathematics", "literature", "engineering"],
  Notes:               ["notes", "lecture", "handwritten", "syllabus", "slide", "handout", "study material"],
  Electronics:         ["laptop", "phone", "mobile", "charger", "earphone", "headphone", "keyboard", "mouse", "monitor", "calculator", "tablet", "speaker", "smartwatch", "cable", "adapter", "pen drive", "hard disk"],
  "Lab Equipment":     ["lab", "microscope", "apron", "pipette", "beaker", "flask", "coat", "chemistry kit", "goggles", "spatula", "burner"],
  Stationery:          ["pen", "pencil", "ruler", "compass", "notebook", "file", "folder", "eraser", "highlighter", "marker", "drafting", "stapler", "binder"],
  Fashion:             ["shirt", "tshirt", "t-shirt", "hoodie", "jacket", "shoes", "sneakers", "watch", "bag", "backpack", "jeans", "dress", "skirt", "cap", "sandals", "belt", "sunglasses", "kurta"],
  Hostel:              ["mattress", "table", "chair", "bucket", "kettle", "bottle", "extension cord", "lamp", "rack", "fan", "iron", "pillow", "bedsheet", "curtain"],
  Sports:              ["bat", "ball", "racket", "badminton", "cricket", "football", "basketball", "gym", "dumbbell", "fitness", "cycling", "sports", "shuttle"],
  Gaming:              ["xbox", "ps4", "ps5", "playstation", "controller", "console", "gaming", "nintendo", "switch", "joystick"],
  "Musical Instruments": ["guitar", "piano", "violin", "flute", "drum", "keyboard", "ukulele", "harmonium", "instrument", "music"],
  Photography:         ["camera", "lens", "tripod", "gimbal", "dslr", "gopro", "photography", "mirrorless", "flash"],
};

function _localCategorize(title, description = "") {
  const text = (title + " " + description).toLowerCase();
  let best = { cat: "Other", score: 0 };
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score += kw.length > 5 ? 2 : 1;
    }
    if (score > best.score) best = { cat, score };
  }
  const confidence = best.score > 0 ? Math.min(0.95, 0.55 + best.score * 0.06) : 0.35;
  return { suggestedCategory: best.cat, confidence };
}

export async function categorizeProduct({ title, description }, userId = null) {
  if (!MATEGENI_CONFIG.featureFlags.enableCategorySuggestion) {
    return { suggestedCategory: "Other", confidence: 1.0 };
  }

  const cacheKey = _cacheKey("category", title, description);
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.REACT_APP_GROQ_API_KEY;
  if (!apiKey) return _localCategorize(title, description);

  try {
    const prompt = `Classify this campus marketplace product into exactly one category.

Product Title: "${title}"
Product Description: "${description || ''}"

Available categories: ${CATEGORIES.join(", ")}

Return ONLY valid JSON:
{
  "suggestedCategory": "<exact category name from list>",
  "confidence": <0.0-1.0>
}`;

    const raw = await _callGroq(
      [{ role: "user", content: prompt }],
      MATEGENI_CONFIG.models.fast,
      true
    );

    const result = _parseJSON(raw, null);
    if (result && CATEGORIES.includes(result.suggestedCategory)) {
      const final = {
        suggestedCategory: result.suggestedCategory,
        confidence:        typeof result.confidence === "number" ? result.confidence : 0.80,
      };
      _cacheSet(cacheKey, final);
      return final;
    }
    return _localCategorize(title, description);
  } catch (err) {
    console.warn("[MateGeni] Categorization fallback:", err.message);
    return _localCategorize(title, description);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — FRAUD DETECTION
// ══════════════════════════════════════════════════════════════════════════════

const FRAUD_KEYWORDS = [
  { phrase: "pay advance",       weight: 40, tip: "Never pay before physically verifying the item." },
  { phrase: "advance payment",   weight: 40, tip: "Never pay before physically verifying the item." },
  { phrase: "pay first",         weight: 35, tip: "Always inspect first, pay at campus meetup." },
  { phrase: "gpay me first",     weight: 45, tip: "Never send money before seeing the item." },
  { phrase: "share otp",         weight: 55, tip: "Never share OTPs or verification codes with anyone." },
  { phrase: "send otp",          weight: 55, tip: "Never share OTPs or verification codes with anyone." },
  { phrase: "share pin",         weight: 55, tip: "Never share PINs or passwords with sellers." },
  { phrase: "send pin",          weight: 55, tip: "Never share PINs or passwords with sellers." },
  { phrase: "verify your account", weight: 45, tip: "CampusMart never asks for account verification via chat." },
  { phrase: "whatsapp me",       weight: 25, tip: "Keep all communication inside CampusMart for safety." },
  { phrase: "telegram me",       weight: 25, tip: "Keep all communication inside CampusMart for safety." },
  { phrase: "call me at",        weight: 20, tip: "Avoid sharing personal phone numbers — meet on campus." },
  { phrase: "click here to pay", weight: 45, tip: "Never click external payment links from sellers." },
  { phrase: "transfer the amount", weight: 35, tip: "Always pay at campus meetup, never transfer in advance." },
  { phrase: "western union",     weight: 60, tip: "Western Union transfers are a common scam — never use this." },
  { phrase: "google play gift",  weight: 60, tip: "Gift card payment requests are always scams." },
];

function _localFraudCheck(content) {
  const lower = content.toLowerCase();
  let topWeight = 0;
  const flagged = [];
  let tipText = "";

  for (const item of FRAUD_KEYWORDS) {
    if (lower.includes(item.phrase)) {
      flagged.push(item.phrase);
      if (item.weight > topWeight) {
        topWeight = item.weight;
        tipText = item.tip;
      }
    }
  }

  let riskLevel = "low";
  if (topWeight >= 50) riskLevel = "high";
  else if (topWeight >= 30) riskLevel = "medium";

  return {
    isSafe:        topWeight < 25,
    riskLevel,
    riskScore:     topWeight,
    flaggedPhrases: flagged,
    safetyTip:     tipText || "Always meet on campus and pay only after inspecting the item.",
  };
}

export async function detectFraudRisk({ content, listingId }, userId = null) {
  if (!MATEGENI_CONFIG.featureFlags.enableFraudDetection) {
    return { isSafe: true, riskLevel: "low", riskScore: 0, flaggedPhrases: [], safetyTip: "" };
  }

  // Always run local check first (fast, no API cost)
  const localResult = _localFraudCheck(content);

  // If local check already found a clear signal, return immediately
  if (localResult.riskScore >= 35) {
    if (!localResult.isSafe) {
      trackAIEvent(AI_EVENTS.FRAUD_ALERT_SHOWN, userId, { riskLevel: localResult.riskLevel, listingId });
    }
    return localResult;
  }

  // For borderline cases, ask Groq for deeper analysis
  const apiKey = process.env.REACT_APP_GROQ_API_KEY;
  if (!apiKey) return localResult;

  const cacheKey = _cacheKey("fraud", content.slice(0, 120));
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `You are a trust & safety moderator for a student campus marketplace.
Analyze this chat message for scam signals: advance payment requests, OTP/PIN sharing, off-platform contact, or fake verification.

Message: "${content}"

Return ONLY valid JSON:
{
  "isSafe": <boolean>,
  "riskLevel": "low" | "medium" | "high",
  "riskScore": <0-100>,
  "flaggedPhrases": ["..."],
  "safetyTip": "<one action student should take>"
}`;

    const raw = await _callGroq(
      [{ role: "user", content: prompt }],
      MATEGENI_CONFIG.models.quality,
      true
    );

    const result = _parseJSON(raw, null);
    if (result && typeof result.isSafe === "boolean") {
      const final = {
        isSafe:         result.isSafe,
        riskLevel:      result.riskLevel || "low",
        riskScore:      result.riskScore || 0,
        flaggedPhrases: Array.isArray(result.flaggedPhrases) ? result.flaggedPhrases : [],
        safetyTip:      result.safetyTip || "Always meet on campus and pay only after inspecting the item.",
      };
      _cacheSet(cacheKey, final);
      if (!final.isSafe) {
        trackAIEvent(AI_EVENTS.FRAUD_ALERT_SHOWN, userId, { riskLevel: final.riskLevel, listingId });
      }
      return final;
    }
    return localResult;
  } catch (err) {
    console.warn("[MateGeni] Fraud detection fallback:", err.message);
    return localResult;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 5 — SMART DISCOVERY FEED (7-factor pure scoring, no LLM)
// ══════════════════════════════════════════════════════════════════════════════

export function getSmartRecommendations({ listings, userProfile, wishlistIds = [], viewedCategoryMap = {} }) {
  if (!MATEGENI_CONFIG.featureFlags.enableSmartFeed || !listings?.length) return [];

  const userCollege = userProfile?.college || "";
  const now = Date.now();
  const ONE_DAY_MS = 86_400_000;

  const scored = listings
    .filter(l => l.status === "active")
    .map(listing => {
      let score = 0;

      // 1. Same College — highest priority
      if (userCollege && listing.sellerCollege === userCollege) score += 100;

      // 2. Verified Seller
      if (listing.isVerified || listing.collegeVerified) score += 40;

      // 3. Category Interest Match (based on recently viewed categories)
      const catInterest = viewedCategoryMap[listing.category] || 0;
      score += Math.min(catInterest * 10, 30);

      // 4. Product Freshness (listed within last 24h)
      const createdMs = listing.createdAt?.seconds
        ? listing.createdAt.seconds * 1000
        : listing.createdAt?.toMillis?.() || 0;
      if (createdMs && now - createdMs < ONE_DAY_MS) score += 20;

      // 5. Popularity (views, capped so viral items don't dominate)
      score += Math.min((listing.views || 0) * 0.3, 15);

      // 6. Has Photos (quality signal)
      if (listing.images?.length > 0) score += 10;

      // 7. In Wishlist
      if (wishlistIds.includes(listing.id)) score += 25;

      // Tiny randomization prevents the feed from being completely static
      score += Math.random() * 3;

      return { listing, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(x => x.listing);

  return scored;
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 6 — MARKETPLACE-FOCUSED MATEGENI ASSISTANT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Returns relevant listings from a query (e.g. "laptops under ₹20000")
 * without hitting any AI API — purely local search.
 */
export function searchListingsLocally({ query, listings = [] }) {
  if (!query || !listings.length) return [];
  const q = query.toLowerCase();

  // Extract price ceiling from natural language
  const priceMatch = q.match(/under\s*[₹rs]?\s*(\d[\d,]*)/i);
  const priceCeil  = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ""), 10) : Infinity;

  const keywords = q
    .replace(/under\s*[₹rs]?\s*\d[\d,]*/gi, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !["the","and","for","buy","find","show","want"].includes(w));

  return listings
    .filter(l => {
      if (l.status !== "active") return false;
      const price = l.listingType === "rent" ? (l.rentPerDay || 0) : (l.price || 0);
      if (price > priceCeil) return false;
      const text = `${l.title} ${l.description} ${l.category}`.toLowerCase();
      return keywords.some(kw => text.includes(kw));
    })
    .slice(0, 4);
}

export async function generateChatResponse({ messages, userContext, listings = [] }) {
  if (!MATEGENI_CONFIG.featureFlags.enableMateGeniAssistant) {
    return {
      replyText:      "Hi! MateGeni is currently offline. Please try again later.",
      matchedListings: [],
      suggestedChips:  [],
    };
  }

  trackAIEvent(AI_EVENTS.ASSISTANT_QUERIED, userContext?.userId || null, {});

  const lastMsg     = messages[messages.length - 1]?.content || "";
  const lastMsgLow  = lastMsg.toLowerCase();

  // ── Local listing search ──────────────────────────────────────────────────
  const matchedListings = searchListingsLocally({ query: lastMsg, listings });
  if (matchedListings.length > 0) {
    return {
      replyText:       `I found ${matchedListings.length} listing${matchedListings.length > 1 ? "s" : ""} matching your request on campus:`,
      matchedListings,
      suggestedChips:  ["🔍 Search again", "💰 Price guide", "🛡️ Safety tips"],
    };
  }

  // ── Local rule-based fallback for common marketplace questions ────────────
  const localReply = () => {
    let replyText = "I'm your campus marketplace assistant! Ask me to find listings, help price an item, or give selling tips.";
    let chips     = ["🔍 Find electronics", "💰 Price guide", "📝 Listing tips", "🛡️ Safety tips"];

    if (lastMsgLow.includes("price") || lastMsgLow.includes("cost") || lastMsgLow.includes("how much")) {
      replyText = "📊 Typical campus price ranges:\n• 📚 Textbooks (Good): ₹250–₹500\n• 💻 Laptops (Good): ₹12k–₹30k\n• 📝 Notes: ₹80–₹200\n• ✏️ Stationery kits: ₹50–₹200\n\nTip: Price 10-15% lower than similar listings to sell faster!";
      chips     = ["📚 Find books", "💻 Find electronics", "📝 Optimize my listing"];
    } else if (lastMsgLow.includes("sell") || lastMsgLow.includes("listing") || lastMsgLow.includes("post")) {
      replyText = "📝 Tips to sell faster:\n• Upload clear, well-lit photos\n• Write an honest condition description\n• Set a competitive price\n• Choose a convenient campus meetup spot\n• Respond quickly to messages";
      chips     = ["💰 Price guide", "🛡️ Safety tips"];
    } else if (lastMsgLow.includes("safe") || lastMsgLow.includes("scam") || lastMsgLow.includes("fraud")) {
      replyText = "🛡️ CampusMart Safety Rules:\n• Always meet on campus (library, canteen)\n• Inspect before paying\n• Pay in person via UPI — never advance\n• Never share OTPs or PINs\n• Report suspicious messages immediately";
      chips     = ["🔍 Find listings", "📝 Listing tips"];
    }

    return { replyText, matchedListings: [], suggestedChips: chips };
  };

  const apiKey = process.env.REACT_APP_GROQ_API_KEY;
  if (!apiKey) return localReply();

  try {
    const systemPrompt = {
      role:    "system",
      content: `You are MateGeni, the intelligent marketplace assistant for CampusMart — a campus-only student marketplace in India.
You help students buy and sell items on their college campus.

STRICT RULES:
- ONLY answer questions related to: buying, selling, pricing, listing optimization, campus safety, or product discovery on CampusMart.
- If asked anything unrelated to the marketplace, politely redirect to campus marketplace topics.
- Keep answers concise (max 4 sentences or 5 bullet points).
- Use ₹ (Indian Rupees) for all prices.
- Always encourage safe campus meetups and UPI payments at meetup.
- Be friendly, encouraging, and student-appropriate.`,
    };

    const groqMessages = [
      systemPrompt,
      ...messages.map(m => ({
        role:    m.role || (m.sender === "user" ? "user" : "assistant"),
        content: m.content || m.text || "",
      })),
    ];

    const raw = await _callGroq(groqMessages, MATEGENI_CONFIG.models.fast, false);

    return {
      replyText:       raw || "I'm here to help you buy and sell smarter on campus!",
      matchedListings: [],
      suggestedChips:  ["🔍 Find listings", "💰 Price guide", "📝 Listing tips", "🛡️ Safety tips"],
    };
  } catch (err) {
    console.warn("[MateGeni] Chat fallback:", err.message);
    return localReply();
  }
}
