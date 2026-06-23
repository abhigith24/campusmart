/**
 * MateGeni Centralized AI Configuration
 *
 * Central hub for all AI models, API parameters, feature flags, and cache settings.
 * Feature flags default to `true` — all features are live.
 * Flip any flag to `false` to instantly gate that feature in production.
 */

export const MATEGENI_CONFIG = {
  // Brand
  aiName:  "MateGeni",
  tagline: "Helping Students Buy & Sell Smarter",
  version: "2.0.0",

  // ── Feature Flags ────────────────────────────────────────────────────────
  // Named exactly per spec — each flag independently gates one UI surface.
  featureFlags: {
    enableListingOptimizer:    true,  // ✨ Title/description/key-points optimizer (PostListingPage)
    enablePriceSuggestion:     true,  // 💰 Min/Recommended/Max price card (PostListingPage)
    enableCategorySuggestion:  true,  // 🏷️ Auto-detect category from title (PostListingPage)
    enableFraudDetection:      true,  // 🛡️ Risk-level safety banners (ChatPage)
    enableSmartFeed:           true,  // ✨ Personalized feed on homepage (HomePage)
    enableMateGeniAssistant:   true,  // 💬 Floating marketplace assistant (App-wide)
  },

  // ── Groq API ─────────────────────────────────────────────────────────────
  apiConfig: {
    baseUrl:    "https://api.groq.com/openai/v1",
    timeoutMs:  6000,   // Hard timeout per request
    maxRetries: 2,      // Exponential backoff on 429 / 5xx
  },

  // ── Models ───────────────────────────────────────────────────────────────
  models: {
    fast:    "llama-3.1-8b-instant",       // Category, price, chat — low latency
    quality: "llama-3.1-70b-versatile",   // Listing optimizer, fraud — better reasoning
  },

  // ── In-Memory Cache ───────────────────────────────────────────────────────
  cache: {
    ttlMs:     60_000,   // 60 s TTL for all cached results
    maxEntries: 100,     // Evict LRU after 100 cached keys
  },
};
