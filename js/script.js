const form = document.getElementById("messageForm");
const messagesDiv = document.getElementById("messages");
const messageStatus = document.getElementById("messageStatus");
const messageTypeInput = document.getElementById("messageType");
const messageTypeButtons = document.querySelectorAll(".message-option");

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

if (form) {
    if (messageTypeButtons.length && messageTypeInput) {
        messageTypeButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                messageTypeButtons.forEach((item) => item.classList.remove("active"));
                btn.classList.add("active");
                messageTypeInput.value = btn.dataset.type || 'public';
            });
        });
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        if (!isAdmin() && !isGuest()) {
            alert("Log eerst in als guest of admin om een bericht te plaatsen.");
            return;
        }

        const name = getCurrentAuthName();
        const message = document.getElementById("message").value.trim();
        const messageType = getSelectedMessageType();

        if (!name) {
            alert("Geen geldige login gevonden.");
            return;
        }
        if (!message) {
            alert("Vul een bericht in.");
            return;
        }

        if (messageType === 'private') {
            try {
                setMessageStatus('Bezig met verzenden...');
                await sendPrivateMessage({ name: name, message: message });
                setMessageStatus('Je persoonlijke reactie is verzonden.');
                form.reset();
            } catch (err) {
                setMessageStatus('Versturen mislukt. Probeer het later opnieuw.');
            }
            return;
        }

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
        setMessageStatus('Je reactie is geplaatst.');
        displayMessages();
    });
}

function getSelectedMessageType() {
    if (!messageTypeInput) return 'public';
    return messageTypeInput.value || 'public';
}

function setMessageStatus(text) {
    if (!messageStatus) return;
    messageStatus.textContent = text;
}

async function sendPrivateMessage(payload) {
    const response = await fetch('api/private-message.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    let data = null;
    try {
        data = await response.json();
    } catch (err) {
        data = null;
    }

    if (!response.ok || !data || data.success !== true) {
        const errorMessage = data && data.error ? data.error : 'Onbekende fout.';
        throw new Error(errorMessage);
    }
}

function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function displayMessages() {
    if (!messagesDiv) return;
    messagesDiv.innerHTML = "";

    messages.forEach((msg, index) => {
        const div = document.createElement("div");
        div.classList.add("message");

        // Toon delete-knop voor eigenaar of admin
        const admin = isAdmin();
        const guest = isGuest();
        const canDelete = admin || (guest && msg.owner && (msg.owner === clientId));
        const canEdit = admin;
        const deleteHTML = canDelete ? `<button class="delete-btn" data-index="${index}" aria-label="Verwijder bericht">Verwijderen</button>` : "";
        const editHTML = canEdit ? `<button class="edit-btn" data-index="${index}" aria-label="Pas bericht aan">Aanpassen</button>` : "";
        const youLabel = (msg.owner && msg.owner === clientId) ? ' <span class="you">(Jij)</span>' : '';

        // Markeer het bericht visueel als verwijderbaar
        if (canDelete) div.classList.add('deletable');

        div.innerHTML = `
            <strong>${escapeHtml(msg.name)}${youLabel}</strong>
            <p>${escapeHtml(msg.message)}</p>
            ${editHTML}
            ${deleteHTML}
        `;
        messagesDiv.appendChild(div);
    });
}   

// Klik handler voor verwijderen (event delegation)
if (messagesDiv) {
    messagesDiv.addEventListener("click", function (e) {
        if (e.target.classList.contains("edit-btn")) {
            if (!isAdmin()) {
                alert("Alleen de admin kan berichten aanpassen.");
                return;
            }
            const idx = Number(e.target.dataset.index);
            if (Number.isInteger(idx) && messages[idx]) {
                const msg = messages[idx];
                const updated = prompt("Pas het bericht aan:", msg.message);
                if (updated === null) return;
                const trimmed = updated.trim();
                if (!trimmed) {
                    alert("Bericht mag niet leeg zijn.");
                    return;
                }
                msg.message = trimmed;
                localStorage.setItem("messages", JSON.stringify(messages));
                displayMessages();
            }
        }
        if (e.target.classList.contains("delete-btn")) {
            const idx = Number(e.target.dataset.index);
            if (Number.isInteger(idx) && messages[idx]) {
                const msg = messages[idx];
                // Controleer: admin kan alles verwijderen, anders alleen eigenaar
                if (!isAdmin() && !(isGuest() && msg.owner && msg.owner === clientId)) {
                    alert("Je kunt dit bericht niet verwijderen. Alleen de auteur of admin kan dit doen.");
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
}

// --- Admin/Guest functies & handlers ---
function deleteAllMessages() {
    if (!isAdmin()) return alert('Alleen ingelogde hoofd-eigenaar kan alle berichten verwijderen.');
    if (!confirm('Weet je zeker dat je alle berichten wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
    messages = [];
    localStorage.setItem('messages', JSON.stringify(messages));
    displayMessages();
}

// Koppel admin delete-all knop
const adminDeleteAllBtn = document.getElementById('adminDeleteAllBtn');
if (adminDeleteAllBtn) {
    adminDeleteAllBtn.addEventListener('click', deleteAllMessages);
}
