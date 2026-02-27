const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log("Firebase: Using service account from Environment Variable");
    } catch (e) {
        console.error("Firebase: Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", e.message);
    }
} else if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
    console.log("Firebase: Using service account from Local File");
}

try {
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://everyotherday-db39f-default-rtdb.firebaseio.com"
        });
        db = admin.database();
        firebaseReady = true;
        console.log("Firebase Admin initialized successfully");
    } else {
        console.error(`Firebase error: Service account NOT FOUND (env var or file)`);
    }
} catch (error) {
    console.error("Firebase initialization failed:", error.message);
}

module.exports = { admin, db, firebaseReady };
