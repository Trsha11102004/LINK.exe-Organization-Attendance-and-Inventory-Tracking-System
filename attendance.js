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

// Pillar colors
const pillarColors = {
    'Extensions': '#03508C',
    'Training': '#4CBBDE',
    'Programs': '#9FDCE0',
    'IGP': '#667eea'
};

// ==========================================
// 4. REAL-TIME LISTENER (The Fix)
// ==========================================
// This function runs automatically whenever the database changes
const q = query(collection(db, "events"), orderBy("createdAt", "desc"));

const unsubscribe = onSnapshot(q, (snapshot) => {
    // 1. Clear local array
    localEvents = [];

    // 2. Loop through documents from DB
    snapshot.forEach((doc) => {
        const eventData = doc.data();
        
        // Push to local array with the ID
        localEvents.push({
            id: doc.id,
            ...eventData,
            // Prepare an empty array for attendees if it doesn't exist
            attendees: [] 
        });

        // 3. Trigger a listener for this specific event's attendees
        listenToAttendees(doc.id);
    });

    // 4. Update the screen
    renderAll();
}, (error) => {
    console.error("Error getting events:", error);
});

// Helper: Listen to sub-collection (Attendees)
function listenToAttendees(eventId) {
    const attendeesRef = collection(db, "events", eventId, "attendees");
    
    onSnapshot(attendeesRef, (snapshot) => {
        const eventIndex = localEvents.findIndex(e => e.id === eventId);
        if (eventIndex === -1) return;

        const attendeesList = [];
        snapshot.forEach(doc => {
            attendeesList.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Update the specific event in our local array
        localEvents[eventIndex].attendees = attendeesList;
        
        // Re-render to show updated count and lists
        renderAll();
    });
}

// ==========================================
// 5. ADD & DELETE FUNCTIONS
// ==========================================

// Add Event
window.addEvent = async function(e) {
    e.preventDefault(); // Stop page reload
    
    const multiDay = document.getElementById('multiDayEvent').checked;
    let startDate, endDate;
    
    if (multiDay) {
        startDate = document.getElementById('eventStartDate').value;
        endDate = document.getElementById('eventEndDate').value;
    } else {
        startDate = document.getElementById('eventDate').value;
        endDate = startDate;
    }

    // Prepare data
    const newEventData = {
        name: document.getElementById('eventName').value,
        pillar: document.getElementById('eventPillar').value,
        startDate: startDate, // Stored as string YYYY-MM-DD
        endDate: endDate,
        isMultiDay: multiDay,
        createdAt: new Date() // Used for sorting
    };

    try {
        await addDoc(collection(db, "events"), newEventData);
        // Success! Close modal. The onSnapshot above will update the UI automatically.
        closeAddEventModal();
    } catch (error) {
        console.error("Error adding event: ", error);
        alert("Error saving event: " + error.message);
    }
}

// Add Attendee
window.addAttendee = async function(e) {
    e.preventDefault();
    if (!currentEventId) return;

    const newAttendeeData = {
        name: document.getElementById('attendeeName').value,
        role: document.getElementById('attendeeRole').value,
        dutyDate: document.getElementById('dutyDate').value
    };

    try {
        await addDoc(collection(db, "events", currentEventId, "attendees"), newAttendeeData);
        closeAddAttendeeModal();
    } catch (error) {
        console.error("Error adding attendee: ", error);
        alert("Error saving attendee.");
    }
}

// Delete Event
window.deleteEvent = async function(eventId) {
    // Prevent bubbling
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
        await deleteDoc(doc(db, "events", eventId));
        // UI updates automatically via listener
    } catch (error) {
        console.error("Error deleting event: ", error);
        alert("Error deleting event.");
    }
}

// Delete Attendee
window.deleteAttendee = async function(eventId, attendeeId) {
    if (!confirm('Remove this attendee?')) return;

    try {
        await deleteDoc(doc(db, "events", eventId, "attendees", attendeeId));
        // UI updates automatically via listener
    } catch (error) {
        console.error("Error deleting attendee: ", error);
    }
}

// ==========================================
// 6. RENDERING LOGIC (Displaying Data)
// ==========================================

// Helper: Format Date Safely
function formatDate(dateInput) {
    if (!dateInput) return '';
    
    // If it's a Firestore Timestamp object (has .toDate method)
    if (dateInput && typeof dateInput.toDate === 'function') {
        return dateInput.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    
    // If it's a standard string or Date object
    return new Date(dateInput).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Render Event Cards
function renderEventCards(filterPillar = 'all') {
    const grid = document.getElementById('eventGrid');
    
    // Filter logic
    const filteredEvents = filterPillar === 'all' 
        ? localEvents 
        : localEvents.filter(event => event.pillar === filterPillar);
    
    // Empty state
    if (localEvents.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><p>No events found in database.</p></div>`;
        return;
    }

    // Generate HTML
    grid.innerHTML = filteredEvents.map(event => `
        <div class="event-container">
            <div class="event-header" style="border-left-color: ${pillarColors[event.pillar] || '#ccc'};">
                <div class="event-header-content" onclick="toggleEvent('${event.id}')">
                    <div class="event-title">${event.name}</div>
                    <span class="pillar-badge" style="background: ${pillarColors[event.pillar] || '#ccc'}; ${event.pillar === 'Programs' ? 'color: #112653;' : ''}">${event.pillar}</span>
                    <p class="event-date">
                        <i class="fas fa-calendar"></i>
                        ${formatDate(event.startDate)}${event.endDate && event.endDate !== event.startDate ? ' - ' + formatDate(event.endDate) : ''}
                    </p>
                    <p class="event-info">
                        <i class="fas fa-users"></i> ${event.attendees ? event.attendees.length : 0} attendees
                    </p>
                </div>
                <div class="event-actions">
                    <button class="delete-event-btn" onclick="deleteEvent('${event.id}'); event.stopPropagation();">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="event-content" id="event-${event.id}">
                ${!event.attendees || event.attendees.length === 0 ? `
                    <div class="empty-state"><p style="font-size: 0.9em;">No attendees yet.</p></div>
                ` : `
                    <ul class="attendee-list">
                        ${event.attendees.map((attendee) => `
                            <li class="attendee-item">
                                <div class="attendee-info">
                                    <div class="attendee-name">${attendee.name}</div>
                                    <div class="attendee-details">${formatDate(attendee.dutyDate)} | ${attendee.role}</div>
                                </div>
                                <button class="delete-btn" onclick="deleteAttendee('${event.id}', '${attendee.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </li>
                        `).join('')}
                    </ul>
                `}
                <button class="add-attendee-btn" onclick="openAddAttendeeModal('${event.id}')">
                    <i class="fas fa-plus"></i> Add Attendee
                </button>
            </div>
        </div>
    `).join('');
}

// Render Attendance Table (Matrix)
function renderAttendanceTable() {
    const header = document.getElementById('tableHeader');
    const body = document.getElementById('tableBody');

    // Get unique members
    const memberSet = new Set();
    localEvents.forEach(event => {
        if(event.attendees) {
            event.attendees.forEach(a => memberSet.add(a.name));
        }
    });
    const members = Array.from(memberSet).sort();

    // Build Header
    let headerHTML = '<th>Member Name</th>';
    localEvents.forEach(event => { headerHTML += `<th>${event.name}</th>`; });
    header.innerHTML = headerHTML;

    // Build Body
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

// Render All Wrapper
function renderAll() {
    renderAttendanceTable();
    renderEventCards(currentFilter);
}

// Filter Function
window.filterEvents = function(pillar) {
    currentFilter = pillar;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-pillar') === pillar) btn.classList.add('active');
    });
    renderEventCards(pillar);
}

// ==========================================
// 7. UTILITY & MODAL FUNCTIONS
// ==========================================
window.toggleEvent = function(eventId) {
    const content = document.getElementById(`event-${eventId}`);
    if(content) content.classList.toggle('active');
}

window.toggleDateRange = function() {
    const checkbox = document.getElementById('multiDayEvent');
    const singleDate = document.getElementById('singleDate');
    const dateRange = document.getElementById('dateRange');
    
    if (checkbox.checked) {
        singleDate.style.display = 'none';
        dateRange.classList.add('active');
        document.getElementById('eventDate').removeAttribute('required');
        document.getElementById('eventStartDate').setAttribute('required', 'required');
        document.getElementById('eventEndDate').setAttribute('required', 'required');
    } else {
        singleDate.style.display = 'block';
        dateRange.classList.remove('active');
        document.getElementById('eventDate').setAttribute('required', 'required');
        document.getElementById('eventStartDate').removeAttribute('required');
        document.getElementById('eventEndDate').removeAttribute('required');
    }
}

window.openAddEventModal = function() {
    document.getElementById('addEventModal').style.display = 'block';
}

window.closeAddEventModal = function() {
    document.getElementById('addEventModal').style.display = 'none';
    document.getElementById('addEventForm').reset();
    document.getElementById('multiDayEvent').checked = false;
    toggleDateRange();
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

// Bind form submissions manually to prevent default reload issues
document.getElementById('addEventForm').onsubmit = window.addEvent;
document.getElementById('addAttendeeForm').onsubmit = window.addAttendee;

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}