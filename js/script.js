const form = document.getElementById("messageForm");
const messagesDiv = document.getElementById("messages");

// Zorg voor een persistent client-id om eigenaarschap te bewaren
let clientId = localStorage.getItem('clientId');
if (!clientId) {
    if (window.crypto && crypto.randomUUID) clientId = crypto.randomUUID();
    else clientId = 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
    localStorage.setItem('clientId', clientId);
}

// Laad bestaande berichten
let messages = JSON.parse(localStorage.getItem("messages")) || [];
displayMessages();

form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const message = document.getElementById("message").value.trim();

    const newMessage = {
        id: Date.now() + '_' + Math.random().toString(36).slice(2,8),
        name: name,
        message: message,
        owner: clientId
    };

    // Voeg nieuw bericht bovenaan toe zodat nieuwste bericht altijd bovenaan staat
    messages.unshift(newMessage);
    localStorage.setItem("messages", JSON.stringify(messages));

    form.reset();
    displayMessages();
});

function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function displayMessages() {
    messagesDiv.innerHTML = "";

    messages.forEach((msg, index) => {
        const div = document.createElement("div");
        div.classList.add("message");

        // Toon delete-knop voor eigenaar of admin
        const admin = isAdmin ? isAdmin() : false;
        const canDelete = admin || (msg.owner && (msg.owner === clientId));
        const deleteHTML = canDelete ? `<button class="delete-btn" data-index="${index}" aria-label="Verwijder bericht">Verwijderen</button>` : "";
        const youLabel = (msg.owner && msg.owner === clientId) ? ' <span class="you">(Jij)</span>' : '';

        // Markeer het bericht visueel als verwijderbaar
        if (canDelete) div.classList.add('deletable');

        div.innerHTML = `
            <strong>${escapeHtml(msg.name)}${youLabel}</strong>
            <p>${escapeHtml(msg.message)}</p>
            ${deleteHTML}
        `;
        messagesDiv.appendChild(div);
    });
}   

// Klik handler voor verwijderen (event delegation)
messagesDiv.addEventListener("click", function (e) {
    if (e.target.classList.contains("delete-btn")) {
        const idx = Number(e.target.dataset.index);
        if (Number.isInteger(idx) && messages[idx]) {
            const msg = messages[idx];
            // Controleer: admin kan alles verwijderen, anders alleen eigenaar
            if (!isAdmin() && (!msg.owner || msg.owner !== clientId)) {
                alert("Je kunt dit bericht niet verwijderen. Alleen de auteur kan dit doen.");
                return;
            }
            if (confirm("Weet je zeker dat je dit bericht wilt verwijderen?")) {
                messages.splice(idx, 1);
                localStorage.setItem("messages", JSON.stringify(messages));
                displayMessages();
            }
        }
    }
});

// --- Admin functies & handlers ---
function isAdmin() {
    return localStorage.getItem('isAdmin') === '1';
}

function updateAdminUI() {
    const setBtn = document.getElementById('setAdminBtn');
    const loginBtn = document.getElementById('adminLoginBtn');
    const logoutBtn = document.getElementById('adminLogoutBtn');
    const deleteAllBtn = document.getElementById('adminDeleteAllBtn');
    const status = document.getElementById('adminStatus');

    const adminExists = !!localStorage.getItem('admin');
    const logged = isAdmin();

    // Laat het instellen van een hoofd-wachtwoord toe bij eerste gebruik
    if (!adminExists) {
        setBtn.style.display = 'inline-block';
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
        deleteAllBtn.style.display = 'none';
        status.textContent = 'Geen hoofd-eigenaar ingesteld';
    } else {
        setBtn.style.display = logged ? 'inline-block' : 'none';
        loginBtn.style.display = logged ? 'none' : 'inline-block';
        logoutBtn.style.display = logged ? 'inline-block' : 'none';
        deleteAllBtn.style.display = logged ? 'inline-block' : 'none';
        status.textContent = logged ? 'Ingelogd als hoofd-eigenaar' : 'Niet ingelogd';
    }
}

async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(salt + password);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt() {
    const arr = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function setAdminPassword() {
    const existing = localStorage.getItem('admin');
    if (existing && !isAdmin()) {
        alert('Alleen een ingelogde hoofd-eigenaar kan het hoofd-wachtwoord wijzigen. Log eerst in.');
        return;
    }

    const pw1 = prompt('Voer nieuw hoofd-wachtwoord in:');
    if (!pw1) return alert('Wachtwoord niet ingesteld.');
    const pw2 = prompt('Bevestig nieuw hoofd-wachtwoord:');
    if (pw1 !== pw2) return alert('Wachtwoordconfirmatie komt niet overeen.');

    const salt = generateSalt();
    const hash = await hashPassword(pw1, salt);
    localStorage.setItem('admin', JSON.stringify({ salt, hash }));
    alert('Hoofd-wachtwoord succesvol ingesteld.');
    updateAdminUI();
}

async function adminLogin() {
    const admin = localStorage.getItem('admin');
    if (!admin) return alert('Er is geen hoofd-wachtwoord ingesteld. Stel eerst een wachtwoord in.');
    const { salt, hash } = JSON.parse(admin);

    const pw = prompt('Voer hoofd-wachtwoord in:');
    if (!pw) return;
    const h = await hashPassword(pw, salt);
    if (h === hash) {
        localStorage.setItem('isAdmin', '1');
        alert('Ingelogd als hoofd-eigenaar.');
        updateAdminUI();
        displayMessages();
    } else {
        alert('Onjuist wachtwoord.');
    }
}

function adminLogout() {
    localStorage.removeItem('isAdmin');
    alert('Uitgelogd.');
    updateAdminUI();
    displayMessages();
}

function deleteAllMessages() {
    if (!isAdmin()) return alert('Alleen ingelogde hoofd-eigenaar kan alle berichten verwijderen.');
    if (!confirm('Weet je zeker dat je alle berichten wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
    messages = [];
    localStorage.setItem('messages', JSON.stringify(messages));
    displayMessages();
}

// Koppel admin knoppen
const setAdminBtn = document.getElementById('setAdminBtn');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const adminDeleteAllBtn = document.getElementById('adminDeleteAllBtn');

setAdminBtn.addEventListener('click', setAdminPassword);
adminLoginBtn.addEventListener('click', adminLogin);
adminLogoutBtn.addEventListener('click', adminLogout);
adminDeleteAllBtn.addEventListener('click', deleteAllMessages);

// Update UI on load
updateAdminUI();
