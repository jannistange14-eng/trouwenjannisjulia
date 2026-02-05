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
    const loginBtn = document.getElementById('adminLoginBtn');
    const logoutBtn = document.getElementById('adminLogoutBtn');
    const deleteAllBtn = document.getElementById('adminDeleteAllBtn');
    const status = document.getElementById('adminStatus');

    const logged = isAdmin();

    loginBtn.style.display = logged ? 'none' : 'inline-block';
    logoutBtn.style.display = logged ? 'inline-block' : 'none';
    deleteAllBtn.style.display = logged ? 'inline-block' : 'none';
    status.textContent = logged ? 'Ingelogd als hoofd-eigenaar' : 'Niet ingelogd';
}

async function sendMagicLink() {
    try {
        const res = await fetch('/api/send-magic-link', { method: 'POST' });
        if (!res.ok) throw new Error('send_failed');
        alert('Check je e-mail voor de login link.');
    } catch (err) {
        alert('Kon geen login link sturen. Probeer later opnieuw.');
    }
}

async function verifyMagicLink(token) {
    try {
        const url = `/api/verify-token?token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('verify_failed');
        const data = await res.json();
        if (!data || !data.ok) throw new Error('verify_failed');
        localStorage.setItem('isAdmin', '1');
        alert('Ingelogd als hoofd-eigenaar.');
        updateAdminUI();
        displayMessages();
    } catch (err) {
        alert('Login link ongeldig of verlopen.');
    }
}

function consumeTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;
    verifyMagicLink(token);
    const newUrl = window.location.pathname + window.location.hash;
    history.replaceState(null, '', newUrl);
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
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const adminDeleteAllBtn = document.getElementById('adminDeleteAllBtn');

adminLoginBtn.addEventListener('click', sendMagicLink);
adminLogoutBtn.addEventListener('click', adminLogout);
adminDeleteAllBtn.addEventListener('click', deleteAllMessages);

// Update UI on load
consumeTokenFromUrl();
updateAdminUI();
