const fs = require('fs');
const path = require('path');
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, doc, writeBatch, getDocs } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

// Read .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const config = {};
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

const firebaseConfig = {
  apiKey: config.VITE_FIREBASE_API_KEY,
  authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: config.VITE_FIREBASE_PROJECT_ID,
  storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const LISTINGS_COUNT = 220;
const START_INDEX = 101;

const MOCK_ITEMS = [
  // Textbooks
  { title: "Engineering Physics by Gaur & Gupta", desc: "Essential textbook for first-year engineering students. Good condition with no markings.", category: "Textbooks" },
  { title: "Thomas' Calculus, 14th Edition", desc: "Perfect for calculus classes. A few pages highlighted but overall in great shape.", category: "Textbooks" },
  { title: "Introduction to Algorithms (CLRS)", desc: "The bible of algorithms. Hardcover, almost brand new.", category: "Textbooks" },
  { title: "Concepts of Physics by H.C. Verma", desc: "Classic textbook for physics concepts. Very helpful for entrance exams and physics course.", category: "Textbooks" },
  { title: "Fundamentals of Database Systems", desc: "Elmasri Navathe DBMS textbook. Hardcover, clear pages.", category: "Textbooks" },
  { title: "Operating System Concepts (Galvin)", desc: "Silberschatz Galvin OS book. Must-have for 2nd year CS.", category: "Textbooks" },
  
  // Notes
  { title: "Machine Learning Lecture Notes", desc: "Handwritten lecture notes from professor's ML class. Includes exam questions.", category: "Notes" },
  { title: "DBMS Handwritten Short Notes", desc: "CS semester notes for fast revision. Concise and clean handwriting.", category: "Notes" },
  { title: "Data Structures Cheat Sheet", desc: "10-page guide with time complexity analysis and code snippets.", category: "Notes" },
  { title: "Discrete Math Complete Notes", desc: "Exhaustive discrete mathematics notes, covers sets, logic and graphs.", category: "Notes" },
  
  // Lab Equipment
  { title: "Digital Multimeter with Probes", desc: "Compact digital multimeter. Perfect for electrical and physics labs.", category: "Lab Equipment" },
  { title: "Engineering Drawing Board (A2)", desc: "Drafting board for mechanical drawings. Used for 1 semester. Very clean.", category: "Lab Equipment" },
  { title: "Lab Apron & Safety Glasses", desc: "White cotton apron and safety glasses. Size M, washed and ready.", category: "Lab Equipment" },
  { title: "T-Square Drawing Ruler", desc: "80cm wooden T-Square for engineering graphics labs. No cracks.", category: "Lab Equipment" },
  
  // Electronics
  { title: "Scientific Calculator fx-991EX", desc: "Classwiz calculator, allowed in university exams. Dual power solar + battery.", category: "Electronics" },
  { title: "Arduino Uno Starter Kit", desc: "Includes board, breadboard, jumper wires, LEDs, resistors, and basic sensors.", category: "Electronics" },
  { title: "Laptop Cooling Pad (Dual Fan)", desc: "USB powered cooling pad with blue LED lights. Adjustible stand. Works perfectly.", category: "Electronics" },
  { title: "Bluetooth Earbuds (boAt)", desc: "Airdopes 131, active noise reduction, 12 hours battery life. Charger included.", category: "Electronics" },
  { title: "Desktop Monitor 21-inch", desc: "Dell FHD monitor, HDMI and VGA ports. Perfect for dual screen coding setup.", category: "Electronics" },
  
  // Stationery
  { title: "Parker Vector Matte Black Pen", desc: "Sleek rollerball pen, smooth ink flow. Blue ink.", category: "Stationery" },
  { title: "Graph Notebooks (Pack of 3)", desc: "A4 size graph notebooks for mathematics or charting. Brand new, unused.", category: "Stationery" },
  { title: "Staedtler Drafting Pencil Set", desc: "0.5mm and 0.7mm mechanical pencils with lead box. Professional quality.", category: "Stationery" },
  
  // Misc
  { title: "Campus Bicycle (Hero Jet)", desc: "Reliable campus bicycle. Tires in good condition. Front basket and lock included.", category: "Misc" },
  { title: "Gym Dumbbells (5kg Pair)", desc: "Hex rubber dumbbells. Minor wear on grip but completely solid.", category: "Misc" },
  { title: "Electric Kettle (Prestige)", desc: "1.5L electric kettle. Boil water, cook noodles. Essential hostel item.", category: "Misc" },
  { title: "Hostel Table Lamp", desc: "Flexible neck desk lamp with LED bulb. Perfect for night study.", category: "Misc" }
];

const MEETUP_SPOTS = ["Central Library", "Main Canteen", "Boys Hostel Block A", "Girls Hostel Block B", "Academic Block 1", "Sports Complex", "Admin Block", "Custom location…"];
const CONDITIONS = ["New", "Good", "Fair", "Old"];

async function seedListings() {
  console.log("Authenticating as test user...");
  await signInWithEmailAndPassword(auth, "usera@college.edu", "password123");
  console.log("Authenticated successfully!");
  
  console.log("Fetching test users from Firestore...");
  const usersSnap = await getDocs(collection(db, "users"));
  const users = usersSnap.docs.map(d => d.data());
  
  const testUsers = users.filter(u => u.uid && u.uid.startsWith("test_user_"));
  if (testUsers.length === 0) {
    console.error("No test users found! Run seed-users.js first.");
    process.exit(1);
  }
  
  console.log(`Found ${testUsers.length} test users. Generating ${LISTINGS_COUNT} listings...`);
  
  const batch = writeBatch(db);
  
  for (let i = 0; i < LISTINGS_COUNT; i++) {
    const seller = testUsers[Math.floor(Math.random() * testUsers.length)];
    const item = MOCK_ITEMS[Math.floor(Math.random() * MOCK_ITEMS.length)];
    const condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
    const meetupSpot = MEETUP_SPOTS[Math.floor(Math.random() * MEETUP_SPOTS.length)];
    
    const typeRand = Math.random();
    let listingType = "sell";
    if (typeRand > 0.9) {
      listingType = "free";
    } else if (typeRand > 0.6) {
      listingType = "rent";
    }
    
    const daysAgo = Math.floor(Math.random() * 60);
    const createdAtDate = new Date();
    createdAtDate.setDate(createdAtDate.getDate() - daysAgo);
    
    const listingId = `test_listing_${i + START_INDEX}`;
    const listingRef = doc(db, "listings", listingId);
    
    const baseData = {
      id: listingId,
      title: item.title,
      description: item.desc,
      category: item.category,
      condition,
      listingType,
      isFree: listingType === "free",
      meetupSpot: meetupSpot === "Custom location…" ? "CSE Department Lobby" : meetupSpot,
      images: [],
      sellerId: seller.uid,
      sellerName: seller.name,
      sellerCollege: seller.college,
      sellerRating: seller.rating,
      status: "active",
      views: Math.floor(Math.random() * 50),
      createdAt: createdAtDate
    };
    
    if (listingType === "rent") {
      Object.assign(baseData, {
        price: 0,
        rentPerDay: Math.floor(Math.random() * 40) + 10,
        rentMinDays: Math.floor(Math.random() * 2) + 1,
        rentMaxDays: Math.floor(Math.random() * 15) + 7,
        rentDeposit: Math.random() > 0.5 ? Math.floor(Math.random() * 500) + 100 : 0
      });
    } else if (listingType === "sell") {
      baseData.price = Math.floor(Math.random() * 150) * 10 + 50;
    } else {
      baseData.price = 0;
    }
    
    batch.set(listingRef, baseData);
  }
  
  await batch.commit();
  console.log(`Successfully committed batch of ${LISTINGS_COUNT} listings!`);
}

seedListings().catch(err => {
  console.error("Listing seeding failed:", err);
  process.exit(1);
});
