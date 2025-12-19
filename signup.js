import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBzCn2-2Oz-z5ucnUGXsBThEmNMxEv4I_U",
    authDomain: "linkexesystembackend.firebaseapp.com",
    projectId: "linkexesystembackend",
    storageBucket: "linkexesystembackend.firebasestorage.app",
    messagingSenderId: "389679307494",
    appId: "1:389679307494:web:5fc1bc368879c1a6e6f927",
    measurementId: "G-CF9WCNV3QP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Sign Up 
const submitBtn = document.getElementById('btn-signup');  

const form = document.getElementById('signupForm'); 

if (form) {
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        // 1. Get Input Values
        const fullName = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitButton = document.getElementById('btn-signup');

        // 2. Simple Validation
        if (!email || !password || !fullName) {
            alert("Please fill in all required fields.");
            return;
        }

        // 3. UI Feedback
        submitButton.textContent = "Creating Account...";
        submitButton.disabled = true;

        // 4. Create User in Firebase Auth
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Success
                const user = userCredential.user;
                alert("Account Created Successfully!");
                // Redirect to login
                window.location.href = "login.html";
            })
            .catch((error) => {
                // Error Handling
                console.error("Signup Error:", error);
                const errorMessage = error.message;
                alert(errorMessage);
                
                // Reset Button
                submitButton.textContent = "Create Account";
                submitButton.disabled = false;
            });
    });
}