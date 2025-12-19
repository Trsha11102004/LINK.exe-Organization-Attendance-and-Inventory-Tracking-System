// 1. CONFIGURATION & IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc, 
    deleteField, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const equipmentCollection = collection(db, "equipment");

// Global State
let localEquipmentList = [];
let borrowedView = false;
let editMode = false;
let currentEditId = null;

// ==========================================
// 2. REAL-TIME LISTENER
// ==========================================
onSnapshot(equipmentCollection, (snapshot) => {
    localEquipmentList = [];
    snapshot.docs.forEach((doc) => {
        localEquipmentList.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    // Refresh both tables immediately
    renderTable(); 
    renderBorrowedList(); 
});

// ==========================================
// 3. UI RENDERING
// ==========================================

// Renders the main inventory table
window.renderTable = function() {
    const tbody = document.getElementById('tableBody');
    
    if (localEquipmentList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><i class="fas fa-box-open"></i><p>No equipment found.</p></td></tr>`;
        return;
    }

    tbody.innerHTML = localEquipmentList.map(item => `
        <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.owner}</td>
            <td>
                <span class="status-badge ${item.status === 'available' ? 'status-available' : 'status-borrowed'}">
                    ${item.status === 'available' ? 'Available' : 'Borrowed'}
                </span>
            </td>
            <td>${item.borrowedDate ? formatDate(item.borrowedDate) : '–'}</td>
            <td class="action-cell">
                ${item.status === 'available' ? `
                    <button class="table-btn btn-edit" onclick="openBorrowModalForItem('${item.id}')" style="background: #03508C;">
                        <i class="fas fa-hand-holding"></i> Borrow
                    </button>
                ` : ''}
                <button class="table-btn btn-edit" onclick="editEquipment('${item.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="table-btn btn-delete" onclick="deleteEquipment('${item.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Renders the "Currently Borrowed" section
window.renderBorrowedList = function() {
    const list = document.getElementById('borrowedList');
    
    // FILTER: Only show items where status is 'borrowed'
    const borrowed = localEquipmentList.filter(item => item.status === 'borrowed');
    
    if (borrowed.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>No equipment currently borrowed.</p>
            </div>`;
        return;
    }

    list.innerHTML = borrowed.map(item => `
        <div class="borrowed-item">
            <div class="borrowed-item-header">
                <div class="borrowed-item-name">
                    <i class="fas fa-box"></i> ${item.name}
                </div>
                <button class="return-btn" onclick="returnEquipment('${item.id}')">
                    <i class="fas fa-undo"></i> Return
                </button>
            </div>
            <div class="borrowed-details">
                <div><strong>Owner:</strong> ${item.owner}</div>
                <div><strong>Borrower:</strong> ${item.borrower || 'N/A'}</div>
                <div><strong>Event:</strong> ${item.eventName || 'N/A'}</div>
                <div><strong>Borrowed Date:</strong> ${formatDate(item.borrowedDate)}</div>
                <div><strong>Date of Use:</strong> ${formatDate(item.dateOfUse)}</div>
                <div><strong>Expected Return:</strong> ${formatDate(item.estimatedReturn)}</div>
                ${item.notes ? `<div><strong>Notes:</strong> ${item.notes}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function formatDate(dateStr) {
    if(!dateStr) return '-';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
}

// ==========================================
// 4. DATABASE ACTIONS (C.R.U.D)
// ==========================================

// ADD / EDIT Equipment
window.saveEquipment = async function(e) {
    e.preventDefault();
    const name = document.getElementById('equipmentName').value;
    const owner = document.getElementById('equipmentOwner').value;
    const id = document.getElementById('equipmentId').value;
    const btn = document.getElementById('equipmentSubmitBtn');

    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
        if (editMode && id) {
            // Update existing document
            const itemRef = doc(db, "equipment", id);
            await updateDoc(itemRef, { name, owner });
        } else {
            // Create new document (State A)
            await addDoc(equipmentCollection, {
                name,
                owner,
                status: 'available',
                createdAt: serverTimestamp()
            });
        }
        closeAddEquipmentModal();
    } catch (error) {
        console.error("Error saving:", error);
        alert("Error saving data. Check console.");
    } finally {
        btn.disabled = false;
        btn.textContent = editMode ? "Update Equipment" : "Add Equipment";
    }
}

// BORROW Equipment
window.borrowEquipment = async function(e) {
    e.preventDefault();
    const itemId = document.getElementById('borrowEquipmentId').value;
    
    // 1. Prepare data for the Main Document (State B)
    const borrowData = {
        status: 'borrowed',
        borrower: document.getElementById('borrowerName').value,
        eventName: document.getElementById('eventName').value,
        borrowedDate: new Date().toISOString().split('T')[0],
        dateOfUse: document.getElementById('dateOfUse').value,
        estimatedReturn: document.getElementById('estimatedReturn').value,
        notes: document.getElementById('borrowNotes').value
    };

    try {
        const itemRef = doc(db, "equipment", itemId);
        
        // 2. Update the Equipment Document
        await updateDoc(itemRef, borrowData);

        // 3. Create a History Log (Subcollection)
        await addDoc(collection(db, "equipment", itemId, "history"), {
            action: "borrow",
            ...borrowData,
            timestamp: serverTimestamp()
        });

        closeBorrowModal();
    } catch (error) {
        console.error("Error borrowing:", error);
        alert("Failed to borrow item");
    }
}

// RETURN Equipment
window.returnEquipment = async function(itemId) {
    if (confirm('Mark this equipment as returned?')) {
        try {
            const itemRef = doc(db, "equipment", itemId);
            const item = localEquipmentList.find(eq => eq.id === itemId);

            // 1. Create a Return Log (Subcollection)
            await addDoc(collection(db, "equipment", itemId, "history"), {
                action: "return",
                returnedBy: item.borrower,
                timestamp: serverTimestamp()
            });

            // 2. Clean the Equipment Document (Revert to State A)
            await updateDoc(itemRef, {
                status: 'available',
                borrowedDate: null,
                borrower: deleteField(),
                eventName: deleteField(),
                dateOfUse: deleteField(),
                estimatedReturn: deleteField(),
                notes: deleteField()
            });
        } catch (error) {
            console.error("Error returning:", error);
        }
    }
}

// DELETE Equipment
window.deleteEquipment = async function(itemId) {
    const item = localEquipmentList.find(eq => eq.id === itemId);
    
    if (item.status === 'borrowed') {
        alert('Cannot delete equipment that is currently borrowed. Please return it first.');
        return;
    }

    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
        try {
            await deleteDoc(doc(db, "equipment", itemId));
        } catch (error) {
            console.error("Error deleting:", error);
        }
    }
}

// ==========================================
// 5. MODAL LOGIC
// ==========================================
window.openAddEquipmentModal = function() {
    editMode = false;
    currentEditId = null;
    document.getElementById('equipmentModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add New Equipment';
    document.getElementById('equipmentSubmitBtn').textContent = 'Add Equipment';
    document.getElementById('addEquipmentForm').reset();
    document.getElementById('addEquipmentModal').style.display = 'block';
}

window.editEquipment = function(itemId) {
    const item = localEquipmentList.find(eq => eq.id === itemId);
    if (!item) return;
    editMode = true;
    currentEditId = itemId;
    document.getElementById('equipmentModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Equipment';
    document.getElementById('equipmentSubmitBtn').textContent = 'Update Equipment';
    document.getElementById('equipmentId').value = itemId;
    document.getElementById('equipmentName').value = item.name;
    document.getElementById('equipmentOwner').value = item.owner;
    document.getElementById('addEquipmentModal').style.display = 'block';
}

window.closeAddEquipmentModal = function() {
    document.getElementById('addEquipmentModal').style.display = 'none';
    document.getElementById('addEquipmentForm').reset();
    editMode = false;
    currentEditId = null;
}

window.openBorrowModalForItem = function(itemId) {
    const item = localEquipmentList.find(eq => eq.id === itemId);
    if (!item || item.status !== 'available') return;
    document.getElementById('borrowEquipmentName').value = `${item.name} (${item.owner})`;
    document.getElementById('borrowEquipmentId').value = itemId;
    document.getElementById('borrowModal').style.display = 'block';
}

window.closeBorrowModal = function() {
    document.getElementById('borrowModal').style.display = 'none';
    document.getElementById('borrowForm').reset();
}

window.toggleBorrowedView = function() {
    borrowedView = !borrowedView;
    const section = document.getElementById('borrowedSection');
    const btn = document.querySelector('.btn-secondary');
    
    if (borrowedView) {
        section.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-list"></i> Hide Borrowed';
    } else {
        section.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-list"></i> View Borrowed';
    }
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}