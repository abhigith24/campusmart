const fs = require('fs');
const path = require('path');
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getDocs } = require("firebase/firestore");

// Helper to load local environment configuration from .env file
const envPath = path.join(__dirname, '..', '.env');
const config = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      config[key] = value;
    }
  });
}

const firebaseConfig = {
  apiKey: config.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain: config.VITE_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: config.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.VITE_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID
};

// Check if credentials are present
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_API_KEY")) {
  console.warn("WARNING: Firebase credentials not set or contain placeholders. Sitemap script will try to fetch or fallback.");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function generateSlug(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars except spaces, hyphens, alphanumeric
    .replace(/[\s_]+/g, "-") // replace spaces and underscores with hyphens
    .replace(/-+/g, "-") // replace multiple consecutive hyphens with a single hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

async function run() {
  console.log("Generating sitemap.xml for CampusMart...");
  
  const staticPages = [
    { loc: "https://campusmart.in/", priority: "1.0", changefreq: "daily" },
    { loc: "https://campusmart.in/terms-of-service", priority: "0.3", changefreq: "monthly" },
    { loc: "https://campusmart.in/privacy-policy", priority: "0.3", changefreq: "monthly" },
    { loc: "https://campusmart.in/contact", priority: "0.5", changefreq: "monthly" }
  ];

  let dynamicPages = [];
  try {
    const q = query(collection(db, "listings"), where("status", "==", "active"));
    const snap = await getDocs(q);
    console.log(`Fetched ${snap.size} active listings from Firestore.`);
    
    snap.forEach(doc => {
      const listing = doc.data();
      const slug = generateSlug(listing.title);
      const id = doc.id;
      const url = `https://campusmart.in/item/${slug ? `${slug}-` : ""}${id}`;
      
      let lastmod = new Date().toISOString().split('T')[0];
      if (listing.createdAt) {
        // Handle Firestore Timestamp or standard JS Date
        const dateObj = listing.createdAt.toDate ? listing.createdAt.toDate() : new Date(listing.createdAt);
        if (!isNaN(dateObj.getTime())) {
          lastmod = dateObj.toISOString().split('T')[0];
        }
      }
      
      dynamicPages.push({
        loc: url,
        lastmod,
        changefreq: "weekly",
        priority: "0.8"
      });
    });
  } catch (err) {
    console.error("Error fetching listings from Firestore:", err.message);
    console.log("Proceeding with static pages sitemap only.");
  }

  const allPages = [...staticPages, ...dynamicPages];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  allPages.forEach(p => {
    xml += '  <url>\n';
    xml += `    <loc>${p.loc}</loc>\n`;
    if (p.lastmod) {
      xml += `    <lastmod>${p.lastmod}</lastmod>\n`;
    }
    xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
    xml += `    <priority>${p.priority}</priority>\n`;
    xml += '  </url>\n';
  });
  
  xml += '</urlset>\n';

  const sitemapOutputPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapOutputPath, xml, 'utf8');
  console.log(`Sitemap written successfully with ${allPages.length} urls to: ${sitemapOutputPath}`);
}

run().catch(console.error);
