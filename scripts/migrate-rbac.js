const admin = require("firebase-admin");

// To run this script:
// 1. Download your Firebase Admin Service Account Key JSON from Firebase Console -> Project Settings -> Service Accounts.
// 2. Save it locally as 'serviceAccountKey.json' in the same folder as this script.
// 3. Run: npm install firebase-admin
// 4. Run: node migrate-rbac.js

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  console.log("Starting RBAC Migration...");
  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      console.log("No users found.");
      return;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      let newRole = "user";

      // Existing admin mapped to 'admin' role
      if (data.isAdmin === true) {
        newRole = "admin";
      }

      // Explicitly check for the support email
      if (data.email === "support.campusmart@gmail.com") {
        newRole = "support";
      }

      // IMPORTANT: We do NOT delete isAdmin yet. We just add `role`.
      // This ensures backwards compatibility and rollback capability.
      batch.update(doc.ref, { role: newRole });
      count++;
    });

    console.log(`Prepared ${count} user documents for migration.`);
    
    // Commit the batch
    await batch.commit();
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

migrate();
