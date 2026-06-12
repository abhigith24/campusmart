const fs = require('fs');
const path = require('path');
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, doc, writeBatch } = require("firebase/firestore");

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
  apiKey: config.REACT_APP_FIREBASE_API_KEY,
  authDomain: config.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: config.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: config.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const USERS_COUNT = 500;
const BATCH_SIZE = 100;

const firstNames = ["Amit", "Rahul", "Priya", "Neha", "Rohit", "Sneha", "Rohan", "Pooja", "Anjali", "Vicky", "Divya", "Manish", "Simran", "Karan", "Akash", "Ritu", "Arjun", "Jyoti", "Deepak", "Aarti"];
const lastNames = ["Sharma", "Verma", "Gupta", "Kumar", "Singh", "Patel", "Joshi", "Mehta", "Sen", "Das", "Roy", "Nair", "Reddy", "Rao", "Dwivedi", "Mishra", "Yadav", "Choudhary", "Kapoor", "Bhasin"];
const colleges = ["IIT Delhi", "DTU", "BITS Pilani", "NSUT", "IIIT Delhi", "Delhi University"];
const branches = ["Computer Science", "Electronics", "Mechanical", "Civil", "Chemical", "MBA"];
const years = ["1st Year", "2nd Year", "3rd Year", "4th Year", "PG"];

async function seedUsers() {
  console.log(`Starting to seed ${USERS_COUNT} users...`);
  
  for (let i = 0; i < USERS_COUNT; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const end = Math.min(i + BATCH_SIZE, USERS_COUNT);
    
    for (let j = i; j < end; j++) {
      const uid = `test_user_${j + 1}`;
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;
      const email = `testuser_${j + 1}@college.edu`;
      const college = colleges[Math.floor(Math.random() * colleges.length)];
      const branch = branches[Math.floor(Math.random() * branches.length)];
      const year = years[Math.floor(Math.random() * years.length)];
      const rating = parseFloat((Math.random() * 1.5 + 3.5).toFixed(1));
      const totalRatings = Math.floor(Math.random() * 15) + 1;
      
      const daysAgo = Math.floor(Math.random() * 180);
      const joinedAtDate = new Date();
      joinedAtDate.setDate(joinedAtDate.getDate() - daysAgo);
      
      const userRef = doc(db, "users", uid);
      batch.set(userRef, {
        uid,
        name,
        email,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
        college,
        branch,
        year,
        rating,
        totalRatings,
        joinedAt: joinedAtDate,
        isAdmin: false,
        banned: false
      });
    }
    
    await batch.commit();
    console.log(`Committed batch for users ${i + 1} to ${end}`);
  }
  
  console.log("Seeding completed successfully!");
}

seedUsers().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
