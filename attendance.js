// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// 2. CONFIG
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

// STATE
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
// 3. LISTENERS
// ==========================================
const q = query(collection(db, "events"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
    localEvents = [];
    snapshot.forEach((doc) => {
        localEvents.push({
            id: doc.id,
            ...doc.data(),
            attendees: [] 
        });
        listenToAttendees(doc.id);
    });
    if (snapshot.empty) renderAll();
}, (error) => console.error(error));

function listenToAttendees(eventId) {
    const attendeesRef = collection(db, "events", eventId, "attendees");
    
    onSnapshot(attendeesRef, (snapshot) => {
        const eventIndex = localEvents.findIndex(e => e.id === eventId);
        if (eventIndex === -1) return;

        const attendeesList = [];
        snapshot.forEach(doc => {
            attendeesList.push({ id: doc.id, ...doc.data() });
        });

        // Update Data
        localEvents[eventIndex].attendees = attendeesList;
        
        // Update UI
        renderAll();

        // REAL-TIME UPDATE FOR MODAL:
        const listModal = document.getElementById('attendeeListModal');
        if (listModal.style.display === 'block' && currentEventId === eventId) {
            renderModalList(attendeesList, eventId);
            document.getElementById('attendeeCountDisplay').innerText = `${attendeesList.length} Attendees`;
        }
    });
}

// ==========================================
// 4. RENDERING UI
// ==========================================
function formatDate(dateInput) {
    if (!dateInput) return '';
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
            <div class="event-header" style="border-left-color: ${pillarColors[event.pillar]}; cursor: default;">
                <div class="event-header-content">
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
                     <button class="btn-see-list" onclick="openAttendeeListModal('${event.id}')">
                        <i class="fas fa-list-ul"></i> List
                     </button>
                     <button class="delete-event-btn" onclick="deleteEvent('${event.id}')" title="Delete Event">
                        <i class="fas fa-trash"></i>
                     </button>
                </div>
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
// 5. ATTENDEE LIST POPUP LOGIC
// ==========================================
window.openAttendeeListModal = function(eventId) {
    const event = localEvents.find(e => e.id === eventId);
    if (!event) return;

    currentEventId = eventId; 

    // Update Header
    document.getElementById('modalEventTitle').innerText = `${event.name} - Attendees`;
    document.getElementById('attendeeCountDisplay').innerText = `${event.attendees ? event.attendees.length : 0} Attendees`;

    // Setup Add Button
    document.getElementById('modalAddBtn').onclick = function() {
        openAddAttendeeModal(eventId);
    };

    // Render List
    renderModalList(event.attendees, eventId);

    // Show
    document.getElementById('attendeeListModal').style.display = 'block';
}

function renderModalList(attendees, eventId) {
    const listContainer = document.getElementById('modalAttendeeList');
    
    if (!attendees || attendees.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users" style="font-size: 2em; color: #ddd;"></i>
                <p>No attendees yet.</p>
            </div>`;
        return;
    }

    listContainer.innerHTML = attendees.map(attendee => `
        <li class="attendee-item">
            <div class="attendee-info">
                <div class="attendee-name">${attendee.name}</div>
                <div class="attendee-details">
                    ${formatDate(attendee.dutyDate)} | ${attendee.role}
                </div>
            </div>
            <button class="delete-btn" onclick="deleteAttendee('${eventId}', '${attendee.id}')" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        </li>
    `).join('');
}

window.closeAttendeeListModal = function() {
    document.getElementById('attendeeListModal').style.display = 'none';
}

// ==========================================
// 6. CRUD ACTIONS
// ==========================================
window.addEvent = async function(e) {
    e.preventDefault();
    const btn = document.querySelector('#addEventForm .submit-btn');
    btn.innerText = "Creating..."; btn.disabled = true;

    const multiDay = document.getElementById('multiDayEvent').checked;
    let startDate = multiDay ? document.getElementById('eventStartDate').value : document.getElementById('eventDate').value;
    let endDate = multiDay ? document.getElementById('eventEndDate').value : startDate;

    try {
        await addDoc(collection(db, "events"), {
            name: document.getElementById('eventName').value,
            pillar: document.getElementById('eventPillar').value,
            startDate, endDate, isMultiDay: multiDay, createdAt: new Date()
        });
        closeAddEventModal();
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        btn.innerText = "Create Event"; btn.disabled = false;
    }
}

window.addAttendee = async function(e) {
    e.preventDefault();
    if (!currentEventId) return;

    const btn = document.querySelector('#addAttendeeForm .submit-btn');
    btn.innerText = "Saving..."; btn.disabled = true;

    try {
        await addDoc(collection(db, "events", currentEventId, "attendees"), {
            name: document.getElementById('attendeeName').value,
            role: document.getElementById('attendeeRole').value,
            dutyDate: document.getElementById('dutyDate').value
        });
        closeAddAttendeeModal();
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        btn.innerText = "Add Attendee"; btn.disabled = false;
    }
}

window.deleteEvent = async function(eventId) {
    if (!confirm('Delete this event?')) return;
    try { await deleteDoc(doc(db, "events", eventId)); } 
    catch (error) { console.error(error); }
}

window.deleteAttendee = async function(eventId, attendeeId) {
    if (!confirm('Remove this attendee?')) return;
    try { await deleteDoc(doc(db, "events", eventId, "attendees", attendeeId)); }
    catch (error) { console.error(error); }
}

// ==========================================
// 7. UTILS
// ==========================================
window.filterEvents = function(pillar) {
    currentFilter = pillar;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-pillar') === pillar) btn.classList.add('active');
    });
    renderEventCards(pillar);
}

window.openAddEventModal = () => document.getElementById('addEventModal').style.display = 'block';
window.closeAddEventModal = () => { document.getElementById('addEventModal').style.display = 'none'; document.getElementById('addEventForm').reset(); }

window.openAddAttendeeModal = (eventId) => {
    if(eventId) currentEventId = eventId; 
    document.getElementById('addAttendeeModal').style.display = 'block';
}
window.closeAddAttendeeModal = () => { document.getElementById('addAttendeeModal').style.display = 'none'; document.getElementById('addAttendeeForm').reset(); }

window.toggleDateRange = () => {
    const chk = document.getElementById('multiDayEvent');
    document.getElementById('singleDate').style.display = chk.checked ? 'none' : 'block';
    document.getElementById('dateRange').style.display = chk.checked ? 'block' : 'none';
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) event.target.style.display = 'none';
}

document.getElementById('addEventForm').onsubmit = window.addEvent;
document.getElementById('addAttendeeForm').onsubmit = window.addAttendee;