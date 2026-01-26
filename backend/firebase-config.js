const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // <-- downloaded from Firebase console

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://everyotherday-db39f-default-rtdb.firebaseio.com"
});

const db = admin.database();
console.log("Firebase Admin initialized");

module.exports = { admin, db };
