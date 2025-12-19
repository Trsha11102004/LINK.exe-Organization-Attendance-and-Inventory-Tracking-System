import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    query, 
    orderBy, 
    limit, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIGURATION
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
const db = getFirestore(app);

// 2. DOM ELEMENTS
const totalEventsEl = document.getElementById('totalEvents');
const totalMembersEl = document.getElementById('totalMembers');
const totalEquipmentEl = document.getElementById('totalEquipment');
const borrowedEquipmentEl = document.getElementById('borrowedEquipment');

// Activity Lists (0 = Events, 1 = Equipment)
const activityLists = document.querySelectorAll('.activity-list');
const eventActivityList = activityLists[0];
const equipmentActivityList = activityLists[1];

// =======================================================
// 3. EQUIPMENT LOGIC (Real-time Stats & Logs)
// =======================================================
const equipmentCol = collection(db, "equipment");

onSnapshot(equipmentCol, (snapshot) => {
    let total = 0;
    let borrowedCount = 0;
    const borrowedItems = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        total++;
        if (data.status === 'borrowed') {
            borrowedCount++;
            borrowedItems.push(data);
        }
    });

    // Update Stats
    animateValue(totalEquipmentEl, parseInt(totalEquipmentEl.innerText) || 0, total, 1000);
    animateValue(borrowedEquipmentEl, parseInt(borrowedEquipmentEl.innerText) || 0, borrowedCount, 1000);
    
    // Update List
    renderEquipmentLogs(borrowedItems);
}, (error) => {
    console.error("Error fetching equipment:", error);
});

function renderEquipmentLogs(items) {
    if (items.length === 0) {
        equipmentActivityList.innerHTML = `<li class="activity-item"><span class="activity-text">No equipment currently borrowed.</span></li>`;
        return;
    }
    // Sort by most recently borrowed
    items.sort((a, b) => new Date(b.borrowedDate) - new Date(a.borrowedDate));
    
    // Show top 5
    equipmentActivityList.innerHTML = items.slice(0, 5).map(item => `
        <li class="activity-item">
            <span class="activity-title">${item.name}</span>
            <span class="activity-text">
                <span class="status-badge status-borrowed" style="font-size:0.7em; padding:2px 6px; background:#fee2e2; color:#991b1b; border-radius:4px;">Borrowed</span> 
                by <strong>${item.borrower}</strong> <br>
                <small style="color:#888">${timeAgo(item.borrowedDate)}</small>
            </span>
        </li>
    `).join('');
}

// =======================================================
// 4. EVENTS & MEMBERS LOGIC (Real-time Stats)
// =======================================================

// A. Real-time Listener for ALL Events
// This calculates "Total Events" and "Active Members" (Unique attendees across all events)
onSnapshot(collection(db, "events"), async (snapshot) => {
    // 1. Update Total Events Count
    const currentTotalEvents = snapshot.size;
    animateValue(totalEventsEl, parseInt(totalEventsEl.innerText) || 0, currentTotalEvents, 1000);

    // 2. Calculate Total Unique Members
    // We use a Set because Sets automatically remove duplicates
    const allMemberNames = new Set();

    // Create an array of promises to fetch subcollections in parallel
    const promises = snapshot.docs.map(doc => getDocs(collection(db, "events", doc.id, "attendees")));
    
    try {
        const results = await Promise.all(promises);

        results.forEach(attendeeSnap => {
            attendeeSnap.forEach(attendeeDoc => {
                const name = attendeeDoc.data().name;
                if (name) {
                    // Normalize name (trim spaces, lowercase) to strictly identify unique people
                    allMemberNames.add(name.trim().toLowerCase());
                }
            });
        });

        // Update Member Stat Card with the unique count
        animateValue(totalMembersEl, parseInt(totalMembersEl.innerText) || 0, allMemberNames.size, 1000);
    } catch (err) {
        console.error("Error calculating members:", err);
    }
}, (error) => {
    console.error("Error fetching events:", error);
});

// B. Separate Listener for Recent Activity List (Top 5 Events)
const qEvents = query(collection(db, "events"), orderBy("createdAt", "desc"), limit(5));

onSnapshot(qEvents, async (snapshot) => {
    const eventDataList = [];

    // Fetch attendee counts for the recent events to display in the list
    const promises = snapshot.docs.map(async (docSnapshot) => {
        const eventData = docSnapshot.data();
        const eventId = docSnapshot.id;

        const attendeesCol = collection(db, "events", eventId, "attendees");
        const attendeeSnap = await getDocs(attendeesCol);
        
        return {
            name: eventData.name,
            count: attendeeSnap.size,
            // Fallback date if needed for sorting logic
            date: eventData.startDate 
        };
    });

    const results = await Promise.all(promises);
    renderEventLogs(results);
});

function renderEventLogs(events) {
    if (events.length === 0) {
        eventActivityList.innerHTML = `<li class="activity-item"><span class="activity-text">No recent events.</span></li>`;
        return;
    }

    eventActivityList.innerHTML = events.map(event => `
        <li class="activity-item">
            <span class="activity-title">${event.name}</span>
            <span class="activity-text"><strong>${event.count}</strong> members attended</span>
        </li>
    `).join('');
}

// =======================================================
// 5. UTILITIES
// =======================================================

// Number Counter Animation
function animateValue(obj, start, end, duration) {
    if (!obj) return;
    if (start === end) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end; // Ensure exact final number
        }
    };
    window.requestAnimationFrame(step);
}

// "Time Ago" formatter
function timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
}