# MateGeni AI Features Overview

This document provides a summary of the active **MateGeni** AI features integrated into CampusMart, including their functionality, user benefits, and integration points in the codebase.

---

## 🚀 Key Implemented AI Features

### 1. MateGeni Conversational Floating Assistant
* **Description**: A floating conversational chat drawer available in the bottom-right corner of the application. Students can chat with MateGeni to get listing advice, pricing tips, and transaction safety guidelines.
* **Component Location**: [MateGeniFloatingAssistant.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/components/MateGeni/MateGeniFloatingAssistant.js)
* **Main App Mounting**: Mounted globally in [App.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/App.js).
* **Key API Hook**: `generateChatResponse` in [aiService.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/services/ai/aiService.js).

### 2. Listing Title & Description Optimizer
* **Description**: Helps students write high-quality, professional, and readable listing details. Based on simple user keywords, AI constructs a clean, catchy product title (under 80 characters) and a structured description with bullets highlighting key specs.
* **Page Location**: [PostListingPage.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/pages/PostListingPage.js)
* **User Trigger**: Clicking the `✨ Optimize Details with MateGeni` button next to the Title/Description fields. Opens a modal comparing the original details with the optimized recommendation.
* **Key API Hook**: `optimizeListingDescription` in [aiService.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/services/ai/aiService.js).

### 3. Smart Product Categorization
* **Description**: Suggests the most appropriate primary/secondary category based on the inputted listing title and description. This ensures correct inventory indexing.
* **Page Location**: [PostListingPage.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/pages/PostListingPage.js)
* **User Trigger**: As the user types their product title, a non-intrusive banner suggests the best matching category (e.g., "Books", "Electronics"). The user can apply it with a single tap.
* **Key API Hook**: `categorizeProduct` in [aiService.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/services/ai/aiService.js).

### 4. Smart Price Suggestions
* **Description**: Estimates a realistic second-hand price range (Min and Max range in INR) and a recommended listing price based on the product's title, category, and condition (New, Good, Fair, Old). Includes a confidence score and a helpful breakdown explaining the range.
* **Page Location**: [PostListingPage.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/pages/PostListingPage.js)
* **User Trigger**: An alert suggestions box appears automatically under the Price field based on listing details.
* **Key API Hook**: `suggestPriceRange` in [aiService.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/services/ai/aiService.js).

### 5. Chat Fraud Detection & Safety Scanner
* **Description**: Real-time safety scanner auditing active chat conversations for security risks. It flags phrases associated with common marketplace scams (such as requests for advance payment before meetup, off-platform communication bypasses, or requests for verification OTPs/PINs).
* **Page Location**: [ChatPage.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/pages/ChatPage.js)
* **User Feedback**: A prominent red alert banner warns the student when safety risks are detected in a thread, highlighting safety precautions.
* **Key API Hook**: `detectFraudRisk` in [aiService.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/services/ai/aiService.js).

### 6. Smart Discovery Feed (Personalized Recommendations)
* **Description**: Ranks active product listings based on a student affinity algorithm (matching the user's home college campus, verified seller badges, listing view counts, and randomized exploration flags).
* **Page Location**: [HomePage.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/pages/HomePage.js)
* **User Interface**: Displays a dedicated "Personalized for You by MateGeni ✨" feed on the marketplace home.
* **Key API Hook**: `getSmartRecommendations` in [aiService.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/services/ai/aiService.js).

---

## 🛡️ Reliability & Resiliency (API + Local Fallbacks)

All AI functions are routed through a central gatekeeping file:
* **Config Manager**: [mategeniConfig.js](file:///c:/Users/kumar/OneDrive/Desktop/CampusMart/src/config/mategeniConfig.js) contains feature flags (`enableFloatingAssistant`, `enableListingOptimizer`, etc.) allowing developers to easily toggle individual features.
* **Resilience**: The service is fully integrated with the **Groq API** (`Llama 3.1` model family). However, if no API key is supplied in the environment (`REACT_APP_GROQ_API_KEY`) or if API limits/errors occur, the service **silently and instantly falls back** to robust local keyword matching and deterministic rule-based algorithms. This guarantees zero client-side crashes.
