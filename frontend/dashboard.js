import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();

// Strict System Theme Management
const initTheme = () => {
    // Just listen for system changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applySystemTheme = () => {
        const theme = mediaQuery.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    };

    // Apply init
    applySystemTheme();

    // Listen
    mediaQuery.addEventListener('change', applySystemTheme);
};

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const backBtn = document.getElementById('back-home-btn');
    const logoutBtnSmall = document.getElementById('signout-btn');

    const userPhotoSmall = document.getElementById('user-photo');
    const userNameHeader = document.getElementById('user-name-header');

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    const handleSignout = () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    };

    if (logoutBtnSmall) logoutBtnSmall.addEventListener('click', handleSignout);

    auth.onAuthStateChanged((user) => {
        if (user) {
            const photoURL = user.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
            if (userPhotoSmall) userPhotoSmall.src = photoURL;
            if (userNameHeader) userNameHeader.textContent = user.displayName || 'Tobi Awolaju';

        } else {
            // Redirect to home if not logged in
            window.location.href = 'index.html';
        }
    });
});
