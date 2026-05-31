# 📚 CampusMart — College Marketplace

---

## 🖥️ HOW TO RUN (Step by Step)

### Step 1 — Install Node.js (only once on your PC)
Download from: **https://nodejs.org** → choose the **LTS** version → install it

To check if it's installed, open terminal/cmd and type:
```
node -v
```
You should see something like `v20.x.x`

---

### Step 2 — Extract the ZIP
Extract this ZIP file to any folder on your computer (Desktop, Documents, etc.)

---

### Step 3 — Run the setup script

**Windows:** Double-click `setup.bat`

**Mac / Linux:** Open terminal in the project folder and run:
```bash
chmod +x setup.sh
./setup.sh
```

**OR manually run:**
```bash
npm install
npm start
```

> `npm install` downloads React, Firebase, and all other packages automatically.
> This is only needed **once**. After that just run `npm start`.

---

### Step 4 — Fill in your API keys

Open the `.env` file (created automatically) and fill in:

```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
...
REACT_APP_CLOUDINARY_CLOUD_NAME=...
REACT_APP_CLOUDINARY_UPLOAD_PRESET=...
```

**Where to get Firebase keys:**
1. Go to https://console.firebase.google.com
2. Create a project (or open existing one)
3. Click the gear icon → Project Settings
4. Scroll down → Your apps → click `</>` Web
5. Register app → copy the `firebaseConfig` values

**Where to get Cloudinary keys:**
1. Go to https://cloudinary.com and sign up (free)
2. Dashboard → copy your **Cloud Name**
3. Settings → Upload → Upload presets → **Add upload preset**
4. Set signing mode to **Unsigned** → Save → copy the preset name

---

### Step 5 — Set up Firebase services

In your Firebase Console, enable these one by one:

| Service | How to enable |
|---|---|
| Authentication | Build → Authentication → Get Started → Email/Password ✅ + Google ✅ |
| Firestore | Build → Firestore Database → Create database → Start in test mode |
| Realtime Database | Build → Realtime Database → Create database → Start in locked mode |

Then paste your **Firestore Rules**:
- Firestore → Rules tab → paste contents of `firestore.rules` → Publish

---

### Step 6 — Start the app
```bash
npm start
```
Opens at **http://localhost:3000** 🎉

---

## 📦 What's installed by `npm install`

| Package | What it does |
|---|---|
| `firebase` | Auth, Firestore database, Realtime chat |
| `react` + `react-dom` | The UI framework |
| `react-scripts` | Build tools |

Images are uploaded to **Cloudinary** (no Firebase Storage needed).

---

## 🌐 Deploy for FREE

### Option A — Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# → Public directory: build
# → Single page app: Yes
npm run build
firebase deploy
```
Your app goes live at `https://your-project.web.app`

### Option B — Netlify (easiest)
```bash
npm run build
```
Drag the `build/` folder to → https://app.netlify.com/drop

---

## 🔑 Make yourself Admin
1. Run the app and sign up
2. Go to Firebase Console → Firestore → `users` collection
3. Find your document → Add field: `isAdmin = true` (boolean)

---

## 📁 Project Structure
```
src/
├── components/
│   ├── ListingCard.js      ← Item card with ❤️ wishlist heart
│   ├── Navbar.js           ← Top bar with 🔔 notification badge
│   └── RatingModal.js      ← Star rating popup
├── context/
│   ├── AuthContext.js      ← Firebase login state
│   ├── WishlistContext.js  ← Global wishlist state
│   ├── NotificationsContext.js ← Realtime unread count
│   └── ToastContext.js     ← Notification toasts
├── pages/
│   ├── AuthPage.js             ← Login / Sign up
│   ├── HomePage.js             ← Browse feed + filters
│   ├── PostListingPage.js      ← Create/edit listing + Cloudinary upload
│   ├── ListingDetailPage.js    ← Item view + Buy Now + Wishlist
│   ├── ChatPage.js             ← Real-time messaging
│   ├── ProfilePage.js          ← 5-tab profile page
│   ├── NotificationsPage.js    ← Notification centre
│   ├── PurchaseRequestsPage.js ← Accept/Reject requests
│   └── AdminPage.js            ← Admin panel
├── utils/
│   └── cloudinary.js       ← Image upload utility
└── firebase.js             ← Firebase config
```

---

## 🔄 How it all works
```
Buyer → Browse → ❤️ Wishlist  (saved for later)
     → 🛒 Buy Now → Confirm Modal
            → Purchase Request created in Firestore
            → 🔔 Seller gets notification
            → Chat opens automatically
                  → Seller: Accept ✅ → listing marked Sold + buyer notified
                  → Seller: Reject ❌ → buyer notified
```
