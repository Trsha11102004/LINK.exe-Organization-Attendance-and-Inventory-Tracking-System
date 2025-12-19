import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBzCn2-2Oz-z5ucnUGXsBThEmNMxEv4I_U",
    authDomain: "linkexesystembackend.firebaseapp.com",
    projectId: "linkexesystembackend",
    storageBucket: "linkexesystembackend.firebasestorage.app",
    messagingSenderId: "389679307494",
    appId: "1:389679307494:web:5fc1bc368879c1a6e6f927"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const pillarColors = { 'Extensions': '#03508C', 'Training': '#4CBBDE', 'Programs': '#9FDCE0', 'IGP': '#667eea' };

let allEvents = [];

onSnapshot(collection(db, "events"), (snapshot) => {
    allEvents = [];
    snapshot.docs.forEach(eventDoc => {
        const event = { id: eventDoc.id, ...eventDoc.data(), attendees: [] };
        // Get Sub-collection
        onSnapshot(collection(db, "events", eventDoc.id, "attendees"), (attendeeSnap) => {
            event.attendees = attendeeSnap.docs.map(d => d.data());
            allEvents.push(event);
            renderAttendanceReport();
            renderPillarPerformance();
        });
    });
});

onSnapshot(collection(db, "equipment"), (snapshot) => {
    const items = snapshot.docs.map(doc => doc.data());
    const tbody = document.getElementById('equipmentTableBody');
    tbody.innerHTML = items.map(item => `
        <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.owner}</td>
            <td><span class="badge badge-${item.status}">${item.status}</span></td>
            <td>${item.borrower || '<span style="color:#ccc">None</span>'}</td>
        </tr>
    `).join('');
});

function renderAttendanceReport() {
    const tbody = document.getElementById('attendanceTableBody');
    const memberMap = {};
    const totalEvents = allEvents.length;

    allEvents.forEach(ev => {
        ev.attendees.forEach(att => {
            if (!memberMap[att.name]) memberMap[att.name] = { count: 0, pillars: {} };
            memberMap[att.name].count++;
            memberMap[att.name].pillars[ev.pillar] = (memberMap[att.name].pillars[ev.pillar] || 0) + 1;
        });
    });

    tbody.innerHTML = Object.entries(memberMap).map(([name, data]) => {
        const rate = ((data.count / totalEvents) * 100).toFixed(0);
        const topPillar = Object.entries(data.pillars).sort((a,b) => b[1]-a[1])[0][0];
        return `
            <tr>
                <td><strong>${name}</strong></td>
                <td>${data.count} Events</td>
                <td>
                    <div class="progress-container">
                        <div class="progress-bar"><div class="progress-fill" style="width: ${rate}%"></div></div>
                        <span class="percentage">${rate}%</span>
                    </div>
                </td>
                <td><span class="badge" style="background:${pillarColors[topPillar]}; color:white">${topPillar}</span></td>
            </tr>
        `;
    }).join('');
}

function renderPillarPerformance() {
    const container = document.getElementById('pillarReportCards');
    const pillars = ['Extensions', 'Training', 'Programs', 'IGP'];

    container.innerHTML = pillars.map(p => {
        const pEvents = allEvents.filter(e => e.pillar === p);
        const totalAtt = pEvents.reduce((sum, e) => sum + e.attendees.length, 0);
        return `
            <div class="report-card" style="border-left-color: ${pillarColors[p]}">
                <div class="report-card-header">
                    <span class="card-title">${p}</span>
                    <i class="fas fa-chart-line" style="color: ${pillarColors[p]}"></i>
                </div>
                <div class="card-value" style="color: ${pillarColors[p]}">${pEvents.length}</div>
                <p style="color:#666; font-size:0.9em">Total Events Held</p>
                <hr style="margin:15px 0; border:0; border-top:1px solid #eee">
                <div style="font-size:0.9em; color:#444">
                    <strong>Total Attendees:</strong> ${totalAtt}
                </div>
            </div>
        `;
    }).join('');
}