# MartGeni AI Integration Roadmap & Developer Guidelines

This document details the planned integration phases, data structures, prompts, and database designs for **MartGeni** (Helping Students Buy & Sell Smarter).

---

## 🛠️ Architecture Overview

MartGeni features are designed to be served through a lightweight service layer ([aiService.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/services/ai/aiService.js)) controlled by centralized configuration flags ([martgeniConfig.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/config/martgeniConfig.js)). 

```
                                  +-----------------------+
                                  |   MARTGENI_CONFIG     |
                                  |   (Feature Flags)     |
                                  +-----------+-----------+
                                              |
                                              v
+------------------------+        +-----------+-----------+        +------------------------+
|      Client Views      | -----> |       aiService       | -----> |       Backend /        |
|  (Button / Card / Assistant)|  (Disabled by Default)|        |     Groq API Proxy     |
+------------------------+        +-----------------------+        +------------------------+
```

---

## 📅 Phase-by-Phase Integration Roadmap

### Phase 1: Listing Optimizer
- **Objective**: Assist students in converting brief keywords into structured, search-optimized marketplace listings.
- **Trigger**: Click `✨ Optimize Description` next to listing fields on `PostListingPage.js`.
- **System Prompt Design**:
  ```text
  You are an expert student copywriter for CampusMart. Rewrite this product title and description to be clear, trustworthy, and appealing to college students. Organize details using bullet points. Include relevant student tags (e.g. #StudyPrep). Keep the description honest about the stated condition.
  ```
- **Interface Contract**:
  - Input: `originalTitle`, `originalDescription`, `category`, `condition`
  - Output: `optimizedTitle`, `optimizedDescription`, `suggestedTags`

### Phase 2: Price Suggestion
- **Objective**: Offer price-point boundaries to prevent overpricing and speed up transactions.
- **Trigger**: User focuses on the price input field.
- **Mechanics**:
  - Queries local database for recent sales in the same category/condition.
  - Passes aggregated data bounds to the model to recommend a final target range:
    - Min Price: average minus 1.5 standard deviations.
    - Max Price: average plus 1.0 standard deviation.
- **Interface Contract**:
  - Input: `category`, `condition`, `title`
  - Output: `minPrice`, `maxPrice`, `recommendedPrice`, `confidenceScore`

### Phase 3: Fraud Detection
- **Objective**: Proactively scan message interactions and listing uploads for phishing attempts, payment fraud, and spam.
- **Trigger**: System hooks on message sending and listing publication.
- **Flagging Patterns**:
  - Off-platform payment requests (e.g., "pay via external link").
  - Fake verification requests (e.g., "confirm via email code").
  - Suspect contact patterns.
- **Interface Contract**:
  - Input: `content`, `senderId`, `recipientId`
  - Output: `isSafe`, `riskScore` (0-100), `flaggedPhrases`, `securityAction` (`none` | `flag` | `block`)

### Phase 4: Smart Product Discovery
- **Objective**: Provide personalized matching feeds based on user preferences and views.
- **Trigger**: Home page recommendations block.
- **Mechanics**:
  - Tracks user category views and saves context.
  - Queries Firestore to fetch active products in high-affinity categories.
  - Passes list to LLM with the prompt: *"Recommend 3 items matching user's recent search for electronics and notes."*

### Phase 5: Conversational Marketplace Assistant
- **Objective**: A floating screen-reader-friendly chat drawer providing interactive campus answers.
- **Trigger**: FAB toggle button in the bottom right corner.
- **Mechanics**:
  - Fetches user location (college name) and session details.
  - Conducts conversational question and answer loops using `llama-3.1-8b-instant`.
- **Interface Contract**:
  - Input: `messages` (array of role/content logs), `userContext` (campus name, permissions)
  - Output: `replyText`, `actionRedirect` (e.g. `/settings`), `suggestedChips`

---

## 🗄️ Recommended Firestore Schemas

### 1. `users/{userId}/aiHistory`
Stores historical requests to prevent double-spending tokens and to enable feedback loops.
```json
{
  "actionType": "optimize_description",
  "timestamp": "2026-06-24T03:21:47Z",
  "prompt": "calculator used, normal display",
  "response": "✨ Scientific Calculator (Excellent Condition)...",
  "feedback": "like"
}
```

### 2. `listings/{listingId}/aiAnalysis`
Attaches risk flags and structural metrics to products.
```json
{
  "suggestedCategory": "Electronics",
  "categoryMatchScore": 0.98,
  "moderationFlag": false,
  "fraudScore": 12.5,
  "riskReasons": [],
  "optimizedAt": "2026-06-24T03:21:47Z"
}
```

### 3. `aiLogs`
Diagnostic counters to monitor API quotas, cost, latency, and success rates.
```json
{
  "userId": "student_123",
  "actionType": "price_suggestion",
  "modelUsed": "llama-3.1-8b-instant",
  "latencyMs": 450,
  "promptTokens": 110,
  "completionTokens": 32,
  "createdAt": "2026-06-24T03:21:47Z"
}
```

---

## 🛡️ Best Practices & Quality Control
1. **Fallback UI**: If the AI api timeouts or returns an error, the application must silently fall back to user-generated defaults without crashing.
2. **Rate Limiting**: Cap AI requests per user (e.g., max 10 optimizations per day) using security rules on the user's `aiHistory` sub-collection.
3. **No Key Storage**: Never commit API keys or Groq keys to client-side bundles. Proxy all requests through secure Firebase cloud functions.
