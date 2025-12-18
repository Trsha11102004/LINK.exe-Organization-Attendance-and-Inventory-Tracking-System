import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";


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
const analytics = getAnalytics(app);

const auth = getAuth(app);

//Submit Button
const submit = document.getElementById('btn-login');
submit.addEventListener("click", function (event) {
    event.preventDefault()

    //Input
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;


    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed up 
            const user = userCredential.user;
            alert("Account Created Successfully!")
            window.location.href = "index.html";
            // ...
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            alert(errorMessage)
            // ..
        });
})