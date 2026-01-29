import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyDy7BCBM_WnfjLffKOQDup-Y6jRC_RoePA",
    authDomain: "everyotherday-db39f.firebaseapp.com",
    databaseURL: "https://everyotherday-db39f-default-rtdb.firebaseio.com",
    projectId: "everyotherday-db39f",
    storageBucket: "everyotherday-db39f.firebasestorage.app",
    messagingSenderId: "879562247905",
    appId: "1:879562247905:web:afa33c4295e4db98d3f1a0",
    measurementId: "G-Y6Z2ZDNJQW"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Add scopes for Google Calendar as per vanilla version
googleProvider.addScope('https://www.googleapis.com/auth/calendar');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

export { auth, database, googleProvider };
