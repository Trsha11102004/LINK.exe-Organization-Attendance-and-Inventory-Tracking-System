// ==========================================
// 1. IMPORTS & CONFIGURATION
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBzCn2-2Oz-z5ucnUGXsBThEmNMxEv4I_U",
    authDomain: "linkexesystembackend.firebaseapp.com",
    databaseURL: "https://linkexesystembackend-default-rtdb.firebaseio.com",
    projectId: "linkexesystembackend",
    storageBucket: "linkexesystembackend.firebasestorage.app",
    messagingSenderId: "389679307494",
    appId: "1:389679307494:web:5fc1bc368879c1a6e6f927",
    measurementId: "G-CF9WCNV3QP"
};

// Initialize once
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ==========================================
// 2. AUTH GUARD (Security Check)
// ==========================================
// This listener runs automatically when the page loads
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // SECURITY CHECK:
        // We only want to redirect IF the user is currently on a protected page.
        // We do NOT want to redirect if they are already on 'landing.html' or 'login.html'
        
        const currentPage = window.location.pathname;
        
        // List of pages that require login
        const protectedPages = [
            "dashboard.html", 
            "attendance.html", 
            "equipments inventory.html", 
            "reports.html", 
            "members.html"
        ];

        // If the current page is in our protected list, kick them out
        const isProtected = protectedPages.some(page => decodeURIComponent(currentPage).includes(page));

        if (isProtected) {
            console.log("User not logged in. Redirecting to Landing Page...");
            // CHANGE 1: Updated to landing.html
            window.location.href = "landing.html"; 
        }
    } else {
        console.log("User is logged in:", user.email);
    }
});

// ==========================================
// 3. LOGOUT FUNCTION
// ==========================================
// Attached to window so your HTML buttons can see it
window.handleLogout = async function() {
    if (confirm("Are you sure you want to logout?")) {
        try {
            await signOut(auth);
            // CHANGE 2: Updated to landing.html
            window.location.href = "landing.html"; 
        } catch (error) {
            console.error("Error signing out:", error);
            alert("Failed to logout. Please try again.");
        }
    }
}