import { useState, useEffect, useCallback } from 'react';
import { auth, googleProvider } from '../firebase-config';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accessToken, setAccessToken] = useState(() => {
        const storedToken = localStorage.getItem('googleAccessToken');
        console.log("Auth: Initial token from storage:", storedToken ? "Exists" : "Empty");
        return storedToken;
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("Auth: State changed. User:", user ? user.email : "Logged Out");
            setUser(user);
            setLoading(false);
            if (!user) {
                console.log("Auth: Clearing token from storage");
                setAccessToken(null);
                localStorage.removeItem('googleAccessToken');
                localStorage.removeItem('googleAccessTokenExpiry');
            }
        });
        return unsubscribe;
    }, []);

    const login = async () => {
        console.log("Auth: Starting login flow...");
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;

            if (token) {
                console.log("Auth: Successfully obtained Google Access Token");
                setAccessToken(token);
                localStorage.setItem('googleAccessToken', token);
                // Store token expiry (tokens typically last 1 hour)
                const expiry = Date.now() + 55 * 60 * 1000; // 55 minutes to be safe
                localStorage.setItem('googleAccessTokenExpiry', expiry.toString());
            } else {
                console.warn("Auth: Login succeeded but no Access Token found in credential");
            }

            return result.user;
        } catch (error) {
            console.error("Auth: Login failed:", error);
            throw error;
        }
    };

    // Get a fresh access token for Google API calls
    const getFreshAccessToken = useCallback(async () => {
        const storedExpiry = localStorage.getItem('googleAccessTokenExpiry');
        const currentToken = localStorage.getItem('googleAccessToken');

        // Check if token is still valid (with 5 minute buffer)
        if (currentToken && storedExpiry && Date.now() < parseInt(storedExpiry) - 5 * 60 * 1000) {
            console.log("Auth: Using existing valid token");
            return currentToken;
        }

        // Token expired or missing - need to re-authenticate
        console.log("Auth: Token expired or missing, re-authenticating...");
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;

            if (token) {
                console.log("Auth: Successfully refreshed Google Access Token");
                setAccessToken(token);
                localStorage.setItem('googleAccessToken', token);
                const expiry = Date.now() + 55 * 60 * 1000;
                localStorage.setItem('googleAccessTokenExpiry', expiry.toString());
                return token;
            } else {
                console.warn("Auth: Re-auth succeeded but no Access Token found");
                return null;
            }
        } catch (error) {
            console.error("Auth: Token refresh failed:", error);
            return null;
        }
    }, []);

    const logout = () => {
        console.log("Auth: Logging out...");
        localStorage.removeItem('googleAccessTokenExpiry');
        return signOut(auth);
    };

    return { user, loading, accessToken, login, logout, getFreshAccessToken };
}
