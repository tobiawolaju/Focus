const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Render provides secrets at /etc/secrets/
const serviceAccountPath = process.env.RENDER
    ? '/etc/secrets/serviceAccountKey.json'
    : path.join(__dirname, 'serviceAccountKey.json');

let firebaseReady = false;
let db = null;

try {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://everyotherday-db39f-default-rtdb.firebaseio.com"
        });
        db = admin.database();
        firebaseReady = true;
        console.log("Firebase Admin initialized successfully");
    } else {
        console.error(`Firebase error: Service account file NOT FOUND at ${serviceAccountPath}`);
    }
} catch (error) {
    console.error("Firebase initialization failed:", error.message);
}

module.exports = { admin, db, firebaseReady };
