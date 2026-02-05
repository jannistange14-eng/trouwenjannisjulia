const SHARED_POST_PASSWORD = "Champagne Toren";

// Client ID voor eigenaarschap
let clientId = localStorage.getItem('clientId');
if (!clientId) {
    if (window.crypto && crypto.randomUUID) clientId = crypto.randomUUID();
    else clientId = 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('clientId', clientId);
}

// Admin check functie (zelfde als in script.js)
function isAdmin() {
    return localStorage.getItem('isAdmin') === '1';
}

// Laad bestaande RSVP's
let rsvps = JSON.parse(localStorage.getItem("rsvps")) || [];
let attending = null;
let editingId = null; // Voor het bijwerken van een bestaande RSVP

function setAttendance(val) {
    attending = val;
    document.getElementById('rsvpStatus').textContent = 'Geselecteerd: ' + (val ? 'Ja' : 'Nee');
}

// Escape HTML om XSS te voorkomen
function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// RSVP formulier handler
document.getElementById('rsvpForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const provided = prompt('Vul het algemene wachtwoord in om je RSVP te plaatsen:');
    if (!provided) {
        alert('Geen wachtwoord ingevuld.');
        return;
    }
    if (provided !== SHARED_POST_PASSWORD) {
        alert('Onjuist wachtwoord.');
        return;
    }
    
    const name = document.getElementById('rsvpName').value.trim();
    const guests = document.getElementById('guests').value || '1';
    const message = document.getElementById('rsvpMessage').value.trim();
    
    if (!name) {
        alert('Vul je naam in.');
        return;
    }
    if (attending === null) {
        alert('Geef aan of je komt (Ja of Nee).');
        return;
    }

    if (editingId) {
        // Bestaande RSVP bijwerken
        const rsvp = rsvps.find(r => r.id === editingId);
        if (rsvp) {
            rsvp.name = name;
            rsvp.attending = attending;
            rsvp.guests = guests;
            rsvp.message = message;
            localStorage.setItem("rsvps", JSON.stringify(rsvps));
            document.getElementById('rsvpStatus').innerHTML = '<strong style="color: green;">Je RSVP is bijgewerkt!</strong>';
            editingId = null;
            document.querySelector('#rsvpForm button[type="submit"]').textContent = 'Verstuur RSVP';
        }
    } else {
        // Nieuwe RSVP toevoegen
        const newRsvp = {
            id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            name: name,
            attending: attending,
            guests: guests,
            message: message,
            owner: clientId,
            timestamp: new Date().toISOString()
        };

        rsvps.push(newRsvp);
        localStorage.setItem("rsvps", JSON.stringify(rsvps));
        document.getElementById('rsvpStatus').innerHTML = '<strong style="color: green;">Dankjewel ' + escapeHtml(name) + '! Je RSVP is opgeslagen.</strong>';
    }

    // Reset formulier
    document.getElementById('rsvpForm').reset();
    attending = null;
    displayAttendees();
});

// Toon aanwezigheidslijst
function displayAttendees() {
    const attendeesDiv = document.getElementById('attendeesList');
    attendeesDiv.innerHTML = "";

    // Filter alleen mensen die komen
    const attendingRsvps = rsvps.filter(r => r.attending === true);

    if (attendingRsvps.length === 0) {
        attendeesDiv.innerHTML = '<p style="text-align:center; color:#666;">Nog geen bevestigingen ontvangen.</p>';
        return;
    }

    // Sorteer op naam
    attendingRsvps.sort((a, b) => a.name.localeCompare(b.name));

    attendingRsvps.forEach((rsvp) => {
        const div = document.createElement("div");
        div.classList.add("attendee-item");

        const admin = isAdmin();
        const canEdit = admin || (rsvp.owner && rsvp.owner === clientId);
        const youLabel = (rsvp.owner && rsvp.owner === clientId) ? ' <span class="you">(Jij)</span>' : '';

        const editHTML = canEdit ? `<button class="edit-btn" data-id="${rsvp.id}">Aanpassen</button>` : "";
        const deleteHTML = canEdit ? `<button class="delete-btn" data-id="${rsvp.id}">Verwijderen</button>` : "";

        div.innerHTML = `
            <div class="attendee-header">
                <h3>${escapeHtml(rsvp.name)}${youLabel}</h3>
                <span class="guest-count">${escapeHtml(rsvp.guests)} ${parseInt(rsvp.guests) === 1 ? 'persoon' : 'personen'}</span>
            </div>
            ${rsvp.message ? `<p class="attendee-message">${escapeHtml(rsvp.message)}</p>` : ''}
            ${canEdit ? `<div class="attendee-actions">${editHTML}${deleteHTML}</div>` : ''}
        `;
        attendeesDiv.appendChild(div);
    });
}

// Event delegation voor edit en delete knoppen
document.getElementById('attendeesList').addEventListener('click', function (e) {
    if (e.target.classList.contains('delete-btn')) {
        const id = e.target.dataset.id;
        const rsvp = rsvps.find(r => r.id === id);
        
        if (!rsvp) return;
        
        // Controleer rechten
        if (!isAdmin() && (!rsvp.owner || rsvp.owner !== clientId)) {
            alert("Je kunt deze RSVP niet verwijderen.");
            return;
        }

        if (confirm(`Weet je zeker dat je de RSVP van ${rsvp.name} wilt verwijderen?`)) {
            rsvps = rsvps.filter(r => r.id !== id);
            localStorage.setItem("rsvps", JSON.stringify(rsvps));
            displayAttendees();
        }
    }

    if (e.target.classList.contains('edit-btn')) {
        const id = e.target.dataset.id;
        const rsvp = rsvps.find(r => r.id === id);
        
        if (!rsvp) return;
        
        // Controleer rechten
        if (!isAdmin() && (!rsvp.owner || rsvp.owner !== clientId)) {
            alert("Je kunt deze RSVP niet aanpassen.");
            return;
        }

        // Vul formulier met bestaande gegevens
        document.getElementById('rsvpName').value = rsvp.name;
        document.getElementById('guests').value = rsvp.guests;
        document.getElementById('rsvpMessage').value = rsvp.message || '';
        setAttendance(rsvp.attending);
        
        editingId = id;
        document.querySelector('#rsvpForm button[type="submit"]').textContent = 'Bijwerken';
        document.getElementById('rsvpStatus').innerHTML = '<strong style="color: orange;">Je past een RSVP aan</strong>';
        
        // Scroll naar formulier
        document.getElementById('rsvpForm').scrollIntoView({ behavior: 'smooth' });
    }
});

// Laad aanwezigheidslijst bij het laden van de pagina
displayAttendees();
