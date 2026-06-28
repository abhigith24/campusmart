# 📚 CampusMart — College Marketplace

> A student-focused buy, sell & rent marketplace built with React + Firebase.
> Comparable in UX quality to Facebook Marketplace, OLX, and Etsy — designed specifically for campus life.

---

## 🚀 Recent Updates (June 2026)

### v3.0 — Smart Filter Bar Enhancement
- **Smart Sticky Filters** — Filter bar hides on scroll-down, smoothly reappears on scroll-up (250ms transition)
- **Quick Filter Row** — One-tap horizontally-scrollable chips: 📚 Books · 💻 Electronics · 🆓 Free · 🧪 Lab Gear · 🏠 Hostel · ⚽ Sports · 🎮 Gaming · 📝 Notes
- **Category Dropdown with Icons** — Wide 300px panel with emoji per category, 60vh scrollable, animated open/close
- **Blue Active State Chips** — Active filters show `✓ Filter Name` in CampusMart primary blue (replaced orange)
- **Filter Count Badge** — `Filters (N)` pill auto-appears when any filter is active
- **Sort Button** — Always labeled "Sort"; added **Oldest First** option; shows `✓ Sort` when non-default selected
- **College Label** — Shortened from "Filter by College" → "College"
- **Accessibility** — `aria-expanded`, `aria-pressed`, `role="listbox"`, `role="option"`, `aria-selected`, `aria-label`, `aria-live`, visible focus rings, `Escape` to close all dropdowns

### v2.0 — Listings Discovery & Pagination System
- **Cursor-based Pagination** — Replaced full-collection `onSnapshot` with efficient `getDocs + startAfter` queries
- **40-item Initial Load** — First page: `where("status","==","active") + orderBy("createdAt","desc") + limit(40)`
- **`getCountFromServer`** — Counts total active listings cheaply (no full read) for progress display
- **Background Prefetching** — Scroll listener triggers silent background fetch before user clicks "Explore More"
- **"Explore More Listings" Button** — States: Default → Loading (spinner) → "Listings Added Successfully ✓" → Default
- **Shimmer Skeleton Cards** — 4 skeleton placeholders match `ListingCard` structure during loads
- **Card Reveal Animation** — New cards fade-in with 15px upward slide (`cardReveal` keyframe)
- **Progress Bar** — "Showing 40 of 328 Listings" + visual gradient fill bar, updates on each page
- **End-of-Feed Banner** — 🎉 "You've Reached The End" with "Post an Item" CTA
- **Empty State** — Clean SVG illustration with CTA when no listings exist on campus

### v1.0 — Listing Detail Page Redesign
- **Desktop Sidebar Layout** — Left column: image gallery + description + meetup + safety tips. Right column: sticky purchase card + seller card
- **Image Overlay Actions** — Save (❤️) and Share (🔗) as circular overlay buttons on top-right of product image (mobile & desktop)
- **Triple CTA Stack** — Buy Now (primary solid) → Message Seller (outline) → Add to Wishlist (tertiary outline)
- **Compact Seller Trust Card** — Seller name, verified badge, same-campus badge, rating stars, trust score %, response rate, joined date — below purchase card in sidebar
- **Mobile-first Stack Order** — Image → Purchase Card → Seller Card → Description → Meetup → Safety → Recommendations carousel

---

## ✨ Full Feature Set

### 🛒 Marketplace Core
| Feature | Description |
|---|---|
| Browse Listings | Grid & list views with cursor-based pagination (40/page) |
| Smart Filters | Category (with icons), Sort, Condition, College, Price range, Free Only |
| Quick Filters | One-tap chip row below filter bar for instant discovery |
| Smart Sticky Bar | Filter bar hides on scroll-down, reappears on scroll-up |
| Search | Real-time search with keyword suggestions and recent history |
| Category Shortcuts | Visual emoji category cards in hero section |
| Smart Recommendations | AI-powered personalized feed based on browsing history |
| Featured & New Sections | "🔥 Featured Listings" and "🆕 Newly Added" grids |
| Top Sellers | Rating-sorted seller cards on home page |
| College Filter | Filter listings by specific campus with live counts |

### 📄 Listing Detail Page
| Feature | Description |
|---|---|
| Image Gallery | Multi-image carousel with overlay action buttons |
| Buy Now Flow | Confirm modal → Purchase Request in Firestore → Seller notification |
| Message Seller | Opens real-time chat automatically |
| Wishlist Toggle | Heart button on image overlay + dedicated CTA in purchase card |
| Share Button | Native Web Share API with analytics tracking |
| Seller Trust Card | Rating, trust score, response rate, member since, verified badge |
| Safety Guidelines | Campus-safe meetup tips and transaction advice |
| Similar Listings | "You May Also Like" carousel at page bottom |
| Rent Support | Listings can be offered for sale or rent (per-day pricing) |
| Views Counter | Live view count displayed on listing |

### 📦 Listing Management
| Feature | Description |
|---|---|
| Post Listing | Category, condition, price/free/rent, multi-image Cloudinary upload |
| Edit Listing | Full edit form with image add/remove |
| Mark as Sold | Seller can manually close a listing |
| My Listings | Grid view of own listings with status badges |
| My College Listings | Filter to see listings from your campus only |
| My Sales | Purchase request inbox with Accept / Reject flow |

### 💬 Communication
| Feature | Description |
|---|---|
| Real-time Chat | Firebase Realtime Database powered messaging |
| Auto-open Chat | Automatically created on purchase request |
| Notifications | Realtime unread badge + notification centre page |
| Purchase Requests | Accept ✅ / Reject ❌ with automatic buyer notification |

### 👤 User Profile
| Feature | Description |
|---|---|
| 5-tab Profile | Overview, Listings, Reviews, Trust Score, Settings |
| College Verification | Upload student ID for verified badge |
| Trust Score | Calculated from ratings, response rate, and activity |
| Rating System | Star ratings from buyers after completed transactions |
| Marketplace Preferences | Default view (grid/list), default feed filter, verified sellers first |
| Saved Items | Dedicated wishlist page |

### 🔧 Admin Panel
| Feature | Description |
|---|---|
| Dashboard | Overview of marketplace activity |
| Listings Moderation | View, approve, or remove any listing |
| User Management | View all users, toggle admin role |
| Verification Requests | Review and approve student ID uploads |
| Analytics Reports | Site activity metrics and trends |

### 🤖 AI Features
| Feature | Description |
|---|---|
| Smart Recommendations | `aiService.js` suggestion engine based on browsing patterns |
| AI Event Analytics | Engagement tracking for recommendation interactions |
| MartGeni | AI assistant component for campus queries |

---

## 🖥️ HOW TO RUN

### Step 1 — Install Node.js
Download from **https://nodejs.org** → LTS version

```bash
node -v   # should print v20.x.x or higher
```

### Step 2 — Clone the Repo
```bash
git clone https://github.com/your-username/campusmart.git
cd campusmart
```

### Step 3 — Install Dependencies
```bash
npm install
```

### Step 4 — Configure Environment Variables
Create `.env` in the project root:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_DATABASE_URL=...
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
```

**Firebase keys:** console.firebase.google.com → Project Settings → Your Apps → Web → `firebaseConfig`
**Cloudinary:** cloudinary.com → Dashboard (Cloud Name) + Settings → Upload presets (Unsigned)

### Step 5 — Enable Firebase Services

| Service | How to enable |
|---|---|
| **Authentication** | Build → Authentication → Get Started → Email/Password ✅ + Google ✅ |
| **Firestore** | Build → Firestore Database → Create database → Start in test mode |
| **Realtime Database** | Build → Realtime Database → Create database |
| **Firestore Rules** | Firestore → Rules → paste `firestore.rules` → Publish |

### Step 6 — Run the App
```bash
npm start
```
Opens at **http://localhost:3000** 🎉

### Step 7 — Make Yourself Admin
1. Sign up in the app
2. Firebase Console → Firestore → `users` collection → your document
3. Add field: `isAdmin = true` (boolean)

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Navbar.js                    ← Sticky navbar with search, notifications, theme toggle
│   ├── ListingCard.js               ← Card with wishlist heart, condition badge, pricing
│   ├── RatingModal.js               ← Star rating popup after transactions
│   ├── ShareButton.js               ← Native Web Share API button
│   ├── ShareModal.js                ← Fallback share modal
│   ├── AuthModal.js                 ← Auth gate modal (no redirect)
│   ├── VerifiedStudentBadge.js      ← Green ✓ verified student badge
│   ├── TrustedSellerBadge.js        ← Blue shield trusted seller badge
│   ├── SameCampusBadge.js           ← Same campus indicator badge
│   ├── Footer.js                    ← Site footer with links
│   └── MartGeni/
│       └── MartGeniCard.js          ← AI assistant component
├── context/
│   ├── AuthContext.js               ← Firebase Auth + Firestore user profile
│   ├── WishlistContext.js           ← Global wishlist state management
│   ├── NotificationsContext.js      ← Realtime unread notification count
│   ├── ToastContext.js              ← Toast notification system
│   └── ThemeContext.js              ← Dark/light mode with localStorage persistence
├── pages/
│   ├── HomePage.js                  ← Discovery feed, smart filter bar, quick chips, cursor pagination
│   ├── ListingDetailPage.js         ← Full listing view, sidebar layout, trust card, CTAs
│   ├── PostListingPage.js           ← Create/edit listing + Cloudinary multi-image upload
│   ├── AuthPage.js                  ← Login / Sign up page
│   ├── ChatPage.js                  ← Real-time messaging (Firebase Realtime DB)
│   ├── ProfilePage.js               ← 5-tab profile (Overview, Listings, Reviews, Trust, Settings)
│   ├── MyListingsPage.js            ← Seller's own listings management
│   ├── MySalesPage.js               ← Purchase request inbox
│   ├── WishlistPage.js              ← Saved/wishlisted items
│   ├── NotificationsPage.js         ← Notification centre
│   ├── PurchaseRequestsPage.js      ← Accept/Reject purchase requests
│   ├── SettingsPage.js              ← Account + marketplace preference settings
│   ├── CollegeVerificationPage.js   ← Upload college ID for verified badge
│   ├── MyCollegeListingsPage.js     ← College-filtered listing view
│   ├── SavedItemsPage.js            ← Alternative saved items view
│   ├── AdminDashboardPage.js        ← Admin overview panel
│   ├── VerificationRequestsPage.js  ← Admin: Review student verifications
│   ├── UserManagementPage.js        ← Admin: Manage all users
│   ├── AnalyticsReportsPage.js      ← Admin: Site metrics and analytics
│   ├── ContactPage.js               ← Contact form
│   ├── PrivacyPolicyPage.js         ← Privacy policy
│   └── TermsPage.js                 ← Terms of service
├── services/
│   └── ai/
│       ├── aiService.js             ← Smart recommendation engine
│       └── aiAnalytics.js           ← AI interaction event tracking
├── styles/
│   └── main.css                     ← 6,900+ line design system (tokens, components, animations)
├── utils/
│   ├── analytics.js                 ← Page view + search event tracking
│   ├── shareAnalytics.js            ← Share click tracking
│   └── urlHelper.js                 ← SEO-friendly listing URL utilities
└── firebase.js                      ← Firebase SDK initialization + config
```

---

## 🔄 Purchase Flow

```
Buyer → Browse Listings (paginated, 40 per load, prefetched)
     → Apply Filters (Category / Sort / Condition / College / Price / Free / Quick chips)
     → Open Listing Detail Page
           → Heart  Add to Wishlist (image overlay or CTA button)
           → Buy Now → Confirm modal
                 → Purchase Request created in Firestore
                 → Seller receives realtime notification
                 → Chat room opens automatically
                       → Seller: Accept
                             → Listing marked Sold
                             → Buyer notified
                             → Rating prompt after exchange
                       → Seller: Reject
                             → Buyer notified with reason
```

---

## 🗄️ Firestore Collections

| Collection | Purpose |
|---|---|
| `listings` | All marketplace listings (status, category, price, images, seller info, views) |
| `users` | User profiles, preferences, trust scores, college verification status |
| `purchaseRequests` | Buy requests with status (pending / accepted / rejected) |
| `notifications` | Per-user notification documents with read/unread state |
| `ratings` | Star ratings from buyers keyed by transaction |
| `analytics` | Page view and interaction events |

> **Pagination:** `where("status","==","active") + orderBy("createdAt","desc") + limit(40)` with `startAfter(lastVisibleDoc)` for next pages. Client-side memoized filtering on top.

---

## 🌐 Deploy for FREE

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```
Live at `https://your-project.web.app`

### Netlify (drag & drop)
```bash
npm run build
# Drag the build/ folder to https://app.netlify.com/drop
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 8 |
| Styling | Vanilla CSS (6,900+ line custom design system) |
| Database | Firebase Firestore (listings, users, requests) |
| Realtime | Firebase Realtime Database (chat) |
| Auth | Firebase Authentication (Email/Password + Google OAuth) |
| Images | Cloudinary (unsigned upload preset, no backend needed) |
| Fonts | Inter + Sora via Google Fonts |
| Deployment | Firebase Hosting / Netlify |

---

## 📄 License

MIT — free to use and modify for educational and personal projects.
