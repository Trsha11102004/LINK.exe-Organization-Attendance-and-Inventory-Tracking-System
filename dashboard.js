import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Firebase Configuration (Matches your other files)
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. Real-time Listeners for Stats
const equipmentCollection = collection(db, "equipment");

// Listener for Equipment Stats
onSnapshot(equipmentCollection, (snapshot) => {
    let total = 0;
    let borrowed = 0;

    snapshot.docs.forEach(doc => {
        total++;
        if (doc.data().status === 'borrowed') {
            borrowed++;
        }
    });

    // Animate the numbers
    animateValue("totalEquipment", 0, total, 1000);
    animateValue("borrowedEquipment", 0, borrowed, 1000);
});

// Listener for Members (Example - Assuming you will create a 'members' collection later)
// const membersCollection = collection(db, "members");
// onSnapshot(membersCollection, (snapshot) => {
//     animateValue("totalMembers", 0, snapshot.size, 1000);
// });

// 3. Helper Function to Animate Numbers
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}