import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. Firebase Configuration
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ==========================================
// 2. PASSWORD TOGGLE LOGIC
// ==========================================
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('enterpassword');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? 'SHOW' : 'HIDE';
    });
}

// ==========================================
// 3. LOGIN LOGIC
// ==========================================
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('btn-login');

if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault(); 

        const email = document.getElementById('enteremail').value;
        const password = document.getElementById('enterpassword').value;

        loginBtn.textContent = "Logging in...";
        loginBtn.disabled = true;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                alert("Account Successfully Logged In!");
                window.location.href = "index.html";
            })
            .catch((error) => {
                let message = "Login Failed";
                alert("Login failed. Invalid email or password."); // Simplified for brevity
                loginBtn.textContent = "Login";
                loginBtn.disabled = false;
            });
    });
}

// ==========================================
// 4. DIRECT FORGOT PASSWORD LOGIC (Updated)
// ==========================================
const forgotBtn = document.getElementById('forgotPasswordBtn');

forgotBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    // 1. Get the email directly from the Login Input field
    const emailInput = document.getElementById('enteremail');
    const email = emailInput.value.trim();

    // 2. Validation: Ensure they actually typed something
    if (!email) {
        alert("Please enter your email address in the Email field first.");
        emailInput.focus(); // Highlights the box so they know where to type
        return;
    }

    // 3. Optional: Confirmation
    if (!confirm(`Send password reset link to: ${email}?`)) {
        return;
    }

    // 4. Send the reset email
    sendPasswordResetEmail(auth, email)
        .then(() => {
            alert(`Password reset link sent to ${email}. Please check your inbox.`);
        })
        .catch((error) => {
            console.error(error);
            let msg = "Error sending email.";
            if (error.code === 'auth/user-not-found') {
                msg = "No account found with this email address.";
            } else if (error.code === 'auth/invalid-email') {
                msg = "The email address is badly formatted.";
            }
            alert(msg);
        });
});