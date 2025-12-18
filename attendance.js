// 1. Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// 2. Firebase Configuration
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

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Data storage (Local Sync)
let localEvents = []; 
let currentEventId = null;
let currentFilter = 'all';

const pillarColors = {
    'Extensions': '#03508C',
    'Training': '#4CBBDE',
    'Programs': '#9FDCE0',
    'IGP': '#667eea'
};

// ==========================================
// 4. REAL-TIME LISTENER (The Sync Engine)
// ==========================================
const q = query(collection(db, "events"), orderBy("createdAt", "desc"));

// Listen for EVENTS
onSnapshot(q, (snapshot) => {
    localEvents = [];
    snapshot.forEach((doc) => {
        // Push event to local list
        localEvents.push({
            id: doc.id,
            ...doc.data(),
            attendees: [] // Start empty, filled by sub-listener below
        });

        // Trigger listener for this specific event's ATTENDEES
        listenToAttendees(doc.id);
    });
    
    // If no events, render immediately
    if (snapshot.empty) renderAll();
}, (error) => {
    console.error("Database connection error:", error);
});

// Listen for ATTENDEES (Sub-collection)
function listenToAttendees(eventId) {
    const attendeesRef = collection(db, "events", eventId, "attendees");
    
    onSnapshot(attendeesRef, (snapshot) => {
        // Find the event in our local list
        const eventIndex = localEvents.findIndex(e => e.id === eventId);
        if (eventIndex === -1) return;

        // Map the attendees
        const attendeesList = [];
        snapshot.forEach(doc => {
            attendeesList.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Update local data and Refresh UI
        localEvents[eventIndex].attendees = attendeesList;
        renderAll();
    });
}

// ==========================================
// 5. ADD ATTENDEE (Database Write)
// ==========================================
window.addAttendee = async function(e) {
    e.preventDefault();

    if (!currentEventId) {
        alert("Error: No event selected.");
        return;
    }

    // 1. Get the button and change text to "Saving..."
    const btn = document.querySelector('#addAttendeeForm .submit-btn');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    // 2. Prepare Data
    const newAttendeeData = {
        name: document.getElementById('attendeeName').value,
        role: document.getElementById('attendeeRole').value,
        dutyDate: document.getElementById('dutyDate').value
    };

    try {
        // 3. Send to Firestore Sub-collection
        // Path: events -> [Event ID] -> attendees -> [New ID]
        await addDoc(collection(db, "events", currentEventId, "attendees"), newAttendeeData);
        
        console.log("Attendee saved to database successfully!");
        closeAddAttendeeModal();
        
    } catch (error) {
        console.error("Error adding attendee:", error);
        alert("Failed to save to database: " + error.message);
    } finally {
        // 4. Reset Button
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// ==========================================
// 6. ADD EVENT (Database Write)
// ==========================================
window.addEvent = async function(e) {
    e.preventDefault();
    
    const btn = document.querySelector('#addEventForm .submit-btn');
    const originalText = btn.innerText;
    btn.innerText = "Creating...";
    btn.disabled = true;

    const multiDay = document.getElementById('multiDayEvent').checked;
    let startDate = multiDay ? document.getElementById('eventStartDate').value : document.getElementById('eventDate').value;
    let endDate = multiDay ? document.getElementById('eventEndDate').value : startDate;

    const newEventData = {
        name: document.getElementById('eventName').value,
        pillar: document.getElementById('eventPillar').value,
        startDate: startDate,
        endDate: endDate,
        isMultiDay: multiDay,
        createdAt: new Date()
    };

    try {
        await addDoc(collection(db, "events"), newEventData);
        closeAddEventModal();
    } catch (error) {
        console.error("Error adding event:", error);
        alert("Error: " + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// ==========================================
// 7. DELETE FUNCTIONS
// ==========================================
window.deleteEvent = async function(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
        await deleteDoc(doc(db, "events", eventId));
    } catch (error) {
        console.error("Error deleting event:", error);
    }
}

window.deleteAttendee = async function(eventId, attendeeId) {
    if (!confirm('Remove this attendee?')) return;
    try {
        await deleteDoc(doc(db, "events", eventId, "attendees", attendeeId));
    } catch (error) {
        console.error("Error deleting attendee:", error);
    }
}

// ==========================================
// 8. RENDER & UI LOGIC
// ==========================================
function formatDate(dateInput) {
    if (!dateInput) return '';
    // Handle Firestore Timestamp
    if (dateInput && typeof dateInput.toDate === 'function') {
        return dateInput.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    // Handle String YYYY-MM-DD
    return new Date(dateInput).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderEventCards(filterPillar = 'all') {
    const grid = document.getElementById('eventGrid');
    const filteredEvents = filterPillar === 'all' ? localEvents : localEvents.filter(e => e.pillar === filterPillar);
    
    if (localEvents.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><p>No events found.</p></div>`;
        return;
    }

    grid.innerHTML = filteredEvents.map(event => `
        <div class="event-container">
            <div class="event-header" style="border-left-color: ${pillarColors[event.pillar]};">
                <div class="event-header-content" onclick="toggleEvent('${event.id}')">
                    <div class="event-title">${event.name}</div>
                    <span class="pillar-badge" style="background: ${pillarColors[event.pillar]};">${event.pillar}</span>
                    <p class="event-date">
                        <i class="fas fa-calendar"></i>
                        ${formatDate(event.startDate)}${event.endDate && event.endDate !== event.startDate ? ' - ' + formatDate(event.endDate) : ''}
                    </p>
                    <p class="event-info">
                        <i class="fas fa-users"></i> ${event.attendees ? event.attendees.length : 0} attendees
                    </p>
                </div>
                <div class="event-actions">
                    <button class="delete-event-btn" onclick="deleteEvent('${event.id}'); event.stopPropagation();"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="event-content" id="event-${event.id}">
                ${!event.attendees || event.attendees.length === 0 ? 
                    `<div class="empty-state"><p style="font-size: 0.9em;">No attendees yet.</p></div>` : 
                    `<ul class="attendee-list">
                        ${event.attendees.map(attendee => `
                            <li class="attendee-item">
                                <div class="attendee-info">
                                    <div class="attendee-name">${attendee.name}</div>
                                    <div class="attendee-details">${formatDate(attendee.dutyDate)} | ${attendee.role}</div>
                                </div>
                                <button class="delete-btn" onclick="deleteAttendee('${event.id}', '${attendee.id}')"><i class="fas fa-trash"></i></button>
                            </li>
                        `).join('')}
                    </ul>`
                }
                <button class="add-attendee-btn" onclick="openAddAttendeeModal('${event.id}')">
                    <i class="fas fa-plus"></i> Add Attendee
                </button>
            </div>
        </div>
    `).join('');
}

function renderAttendanceTable() {
    const header = document.getElementById('tableHeader');
    const body = document.getElementById('tableBody');
    
    const memberSet = new Set();
    localEvents.forEach(e => e.attendees && e.attendees.forEach(a => memberSet.add(a.name)));
    const members = Array.from(memberSet).sort();

    let headerHTML = '<th>Member Name</th>';
    localEvents.forEach(event => { headerHTML += `<th>${event.name}</th>`; });
    header.innerHTML = headerHTML;

    if (members.length === 0) {
        body.innerHTML = `<tr><td colspan="${localEvents.length + 1}" style="text-align:center; padding:30px;">No members recorded yet.</td></tr>`;
        return;
    }

    let bodyHTML = '';
    members.forEach(member => {
        bodyHTML += `<tr><td>${member}</td>`;
        localEvents.forEach(event => {
            const attended = event.attendees && event.attendees.some(a => a.name === member);
            bodyHTML += `<td class="td-center"><span class="${attended ? 'present' : 'absent'}">${attended ? '✓' : '✗'}</span></td>`;
        });
        bodyHTML += '</tr>';
    });
    body.innerHTML = bodyHTML;
}

function renderAll() {
    renderAttendanceTable();
    renderEventCards(currentFilter);
}

// ==========================================
// 9. MODALS & UTILITIES
// ==========================================
window.toggleEvent = function(eventId) {
    const content = document.getElementById(`event-${eventId}`);
    if(content) content.classList.toggle('active');
}

window.filterEvents = function(pillar) {
    currentFilter = pillar;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-pillar') === pillar) btn.classList.add('active');
    });
    renderEventCards(pillar);
}

window.openAddEventModal = function() { document.getElementById('addEventModal').style.display = 'block'; }
window.closeAddEventModal = function() { 
    document.getElementById('addEventModal').style.display = 'none'; 
    document.getElementById('addEventForm').reset();
}

window.openAddAttendeeModal = function(eventId) {
    currentEventId = eventId;
    document.getElementById('addAttendeeModal').style.display = 'block';
}
window.closeAddAttendeeModal = function() {
    document.getElementById('addAttendeeModal').style.display = 'none';
    document.getElementById('addAttendeeForm').reset();
    currentEventId = null;
}

window.toggleDateRange = function() {
    const checkbox = document.getElementById('multiDayEvent');
    if (checkbox.checked) {
        document.getElementById('singleDate').style.display = 'none';
        document.getElementById('dateRange').style.display = 'block';
    } else {
        document.getElementById('singleDate').style.display = 'block';
        document.getElementById('dateRange').style.display = 'none';
    }
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) event.target.style.display = 'none';
}

// Attach listeners
document.getElementById('addEventForm').onsubmit = window.addEvent;
document.getElementById('addAttendeeForm').onsubmit = window.addAttendee;