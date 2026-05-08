const form = document.getElementById("messageForm"); // Selecteert het HTML-formulier voor berichten
const messagesDiv = document.getElementById("messages"); // Selecteert de container waarin berichten worden getoond
const messageStatus = document.getElementById("messageStatus"); // Selecteert het element voor statusmeldingen (bijv. "Verzonden")
const messageTypeInput = document.getElementById("messageType"); // Selecteert het verborgen veld voor berichttype (publiek/privé)
const messageTypeButtons = document.querySelectorAll(".message-option"); // Selecteert de knoppen om te wisselen tussen publiek en privé

// Zorg voor een persistent client-id om eigenaarschap te bewaren
let clientId = localStorage.getItem('clientId'); // Probeert een bestaand uniek ID uit de browseropslag te halen
if (!clientId) { // Als er nog geen ID bestaat:
    if (window.crypto && crypto.randomUUID) clientId = crypto.randomUUID(); // Gebruik een moderne methode voor een uniek ID
    else clientId = 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8); // Val terug op een tijd-gebaseerd ID
    localStorage.setItem('clientId', clientId); // Sla het nieuwe ID op voor de volgende keer
}

// Laad bestaande berichten
let messages = JSON.parse(localStorage.getItem("messages")) || []; // Haal opgeslagen berichten op of start met een lege lijst
displayMessages(); // Roep de functie aan om de berichten direct op het scherm te tonen

function getOwnerKey() { // Functie om te bepalen wie de huidige gebruiker is voor rechten
    if (isAdmin()) return 'admin'; // Als admin ingelogd is, geef 'admin' terug
    if (isGuest()) return 'guest:' + (localStorage.getItem('guestUser') || ''); // Als gast ingelogd is, geef 'guest:naam' terug
    return ''; // Anders geef niets terug
}

function isMessageOwner(msg) { // Functie om te checken of de gebruiker het bericht mag beheren
    // Admin mag alles
    if (isAdmin()) return true; // De admin heeft altijd alle rechten
    // Als je niet bent ingelogd als guest, mag je niets
    if (!isGuest()) return false; // Alleen ingelogde gasten (of admin) hebben rechten
    
    const currentOwnerKey = getOwnerKey(); // Haal de huidige identificatie op
    // Check op account-sleutel, of val terug op clientId voor oude berichten
    if (msg.ownerKey) return msg.ownerKey === currentOwnerKey; // Vergelijk de account-naam (voor nieuwere berichten)
    return msg.owner === clientId; // Vergelijk de browser ID (voor oudere berichten zonder account-koppeling)
}

if (form) { // Als het formulier aanwezig is op deze pagina:
    if (messageTypeButtons.length && messageTypeInput) { // Als er knoppen zijn voor publiek/privé:
        messageTypeButtons.forEach((btn) => { // Loop door de knoppen heen
            btn.addEventListener("click", () => { // Luister naar een klik op een knop
                messageTypeButtons.forEach((item) => item.classList.remove("active")); // Maak alle knoppen visueel inactief
                btn.classList.add("active"); // Maak de geklikte knop visueel actief
                messageTypeInput.value = btn.dataset.type || 'public'; // Zet de waarde van het verborgen veld op de juiste stand
            });
        });
    }

    form.addEventListener("submit", async function (e) { // Wanneer het formulier wordt verzonden:
        e.preventDefault(); // Voorkom dat de pagina ververst

        if (!isAdmin() && !isGuest()) { // Controleer of de gebruiker wel is ingelogd
            alert("Log eerst in als guest of admin om een bericht te plaatsen."); // Waarschuwing als men niet ingelogd is
            return; // Stop de functie
        }

        const name = getCurrentAuthName(); // Haal de naam op van de ingelogde persoon
        const message = document.getElementById("message").value.trim(); // Haal het getypte bericht op
        const messageType = getSelectedMessageType(); // Kijk of het een publiek of privé bericht is

        if (!name) { // Extra check of de naam wel bekend is
            alert("Geen geldige login gevonden."); // Foutmelding
            return; // Stop de functie
        }
        if (!message) { // Check of er wel iets getypt is
            alert("Vul een bericht in."); // Vraag om tekst
            return; // Stop de functie
        }

        if (messageType === 'private') { // Als het bericht 'privé' is:
            try {
                setMessageStatus('Bezig met verzenden...'); // Toon voortgang
                await sendPrivateMessage({ name: name, message: message }); // Roep de functie aan om de mail te versturen
                setMessageStatus('Je persoonlijke reactie is verzonden.'); // Succesmelding
                form.reset(); // Maak het tekstveld leeg
            } catch (err) {
                setMessageStatus('Versturen mislukt. Probeer het later opnieuw.'); // Foutmelding bij mailen
            }
            return; // Stop hier (privéberichten worden niet in de lijst getoond)
        }

        const newMessage = { // Maak een object voor een nieuw publiek bericht
            id: Date.now() + '_' + Math.random().toString(36).slice(2,8), // Genereer een uniek ID voor dit specifieke bericht
            name: name, // De naam van de afzender
            message: message, // De inhoud van het bericht
            owner: clientId, // Browser ID voor herkenning
            ownerKey: getOwnerKey() // Accountnaam voor herkenning tussen apparaten
        };

        // Voeg nieuw bericht bovenaan toe zodat nieuwste bericht altijd bovenaan staat
        messages.unshift(newMessage); // Voeg het bericht toe aan het begin van de lijst
        localStorage.setItem("messages", JSON.stringify(messages)); // Sla de hele lijst weer op in de browser

        form.reset(); // Maak het tekstveld leeg
        setMessageStatus('Je reactie is geplaatst.'); // Melding aan de gebruiker
        displayMessages(); // Werk de lijst op het scherm direct bij
    });
}

function getSelectedMessageType() { // Helper functie om berichttype uit te lezen
    if (!messageTypeInput) return 'public'; // Standaard is publiek als het veld ontbreekt
    return messageTypeInput.value || 'public'; // Geef de waarde terug (public of private)
}

function setMessageStatus(text) { // Helper functie om tekstberichten onder het formulier te tonen
    if (!messageStatus) return; // Doe niets als het element niet bestaat op de pagina
    messageStatus.textContent = text; // Zet de tekst in het element
}

async function sendPrivateMessage(payload) { // Functie die contact maakt met de server
    // Bepaal het juiste pad naar de API, afhankelijk van of we in de root of in de /pages/ map zitten
    const apiPath = window.location.pathname.includes('/pages/') ? '../api/private-message.php' : 'api/private-message.php'; // Pad-correctie
    
    const response = await fetch(apiPath, { // Start de verbinding met het PHP script
        method: 'POST', // Verstuur gegevens via POST
        headers: { 'Content-Type': 'application/json' }, // We sturen JSON-data
        body: JSON.stringify(payload) // Zet de naam en bericht om in een JSON tekst
    });

    let data = null; // Voorbereiding voor het antwoord van de server
    try {
        data = await response.json(); // Probeer het antwoord te begrijpen als JSON
    } catch (err) {
        data = null; // Als de server iets anders teruggeeft dan JSON
    }

    if (!response.ok || !data || data.success !== true) { // Als er iets mis is gegaan op de server:
        const errorMessage = data && data.error ? data.error : 'Onbekende fout.'; // Pak de foutmelding
        throw new Error(errorMessage); // Stop en laat de fout zien aan de 'catch' in de submit handler
    }
}

function escapeHtml(unsafe) { // Veiligheidsfunctie: voorkomt dat mensen HTML of script kunnen typen in hun bericht
    return String(unsafe) // Zorg dat het tekst is
        .replace(/&/g, "&amp;") // Zet & om naar veilige code
        .replace(/</g, "&lt;") // Zet < om naar veilige code
        .replace(/>/g, "&gt;") // Zet > om naar veilige code
        .replace(/"/g, "&quot;") // Zet " om naar veilige code
        .replace(/'/g, "&#039;"); // Zet ' om naar veilige code
}

function displayMessages() { // De functie die de berichten op de pagina tekent
    if (!messagesDiv) return; // Stop als er geen plek is om berichten te tonen
    messagesDiv.innerHTML = ""; // Maak de lijst eerst helemaal leeg

    messages.forEach((msg, index) => { // Loop door elk bericht in de lijst
        const div = document.createElement("div"); // Maak een nieuw bericht-blokje aan
        div.classList.add("message"); // Geef het de vormgeving van een bericht
        
        // Rechten-check via de nieuwe helper functie
        const canDelete = isMessageOwner(msg); // Kijk of de huidige bezoeker dit specifieke bericht mag wissen
        // Admin mag alles aanpassen, gasten kunnen berichten alleen verwijderen en opnieuw plaatsen
        const canEdit = isAdmin(); // Alleen de admin krijgt de 'aanpassen' knop

        const deleteHTML = canDelete ? `<button class="delete-btn feedback-submit" data-index="${index}" aria-label="Verwijder bericht">Verwijderen</button>` : ""; // Maak de HTML voor de wis-knop
        const editHTML = canEdit ? `<button class="edit-btn feedback-submit" data-index="${index}" aria-label="Pas bericht aan">Aanpassen</button>` : ""; // Maak de HTML voor de aanpas-knop
        const youLabel = (msg.owner && msg.owner === clientId) ? ' <span class="you">(Jij)</span>' : ''; // Zet "(Jij)" achter de naam als het je eigen bericht is

        // Markeer het bericht visueel als verwijderbaar
        if (canDelete) div.classList.add('deletable'); // Geef extra class mee voor styling van eigen berichten

        div.innerHTML = ` 
            <strong>${escapeHtml(msg.name)}${youLabel}</strong>
            <p>${escapeHtml(msg.message)}</p>
            ${editHTML}
            ${deleteHTML}
        `; // Zet alle onderdelen (naam, tekst, knoppen) in het blokje
        messagesDiv.appendChild(div); // Voeg het blokje echt toe aan de pagina
    });
}   

// Klik handler voor verwijderen (event delegation)
if (messagesDiv) { // Als de berichten-lijst bestaat:
    messagesDiv.addEventListener("click", function (e) { // Luister naar elke klik binnen de lijst
        if (e.target.classList.contains("edit-btn")) { // Is er op een 'aanpassen' knop geklikt?
            if (!isAdmin()) { // Veiligheidscheck: ben je wel admin?
                alert("Alleen de admin kan berichten aanpassen."); // Waarschuwing
                return; // Stop
            }
            const idx = Number(e.target.dataset.index); // Haal op welk bericht uit de lijst het is
            if (Number.isInteger(idx) && messages[idx]) { // Bestaat dit bericht?
                const msg = messages[idx]; // Pak het bericht erbij
                const updated = prompt("Pas het bericht aan:", msg.message); // Vraag de admin om de nieuwe tekst
                if (updated === null) return; // Niets doen als er op annuleren wordt geklikt
                const trimmed = updated.trim(); // Haal onnodige spaties weg
                if (!trimmed) { // Bericht mag niet leeg zijn
                    alert("Bericht mag niet leeg zijn."); // Foutmelding
                    return; // Stop
                }
                msg.message = trimmed; // Werk de tekst van het bericht bij
                localStorage.setItem("messages", JSON.stringify(messages)); // Sla de gewijzigde lijst op
                displayMessages(); // Teken de lijst opnieuw
            }
        }
        if (e.target.classList.contains("delete-btn")) { // Is er op een 'verwijderen' knop geklikt?
            const idx = Number(e.target.dataset.index); // Haal op welk bericht het is
            if (Number.isInteger(idx) && messages[idx]) { // Bestaat dit bericht?
                const msg = messages[idx]; // Pak het bericht erbij
                // Extra veiligheidscheck bij het klikken
                if (!isMessageOwner(msg)) { // Mag de bezoeker dit wel wissen?
                    alert("Je kunt dit bericht niet verwijderen. Alleen de auteur of admin kan dit doen."); // Foutmelding
                    return; // Stop
                }
                if (confirm("Weet je zeker dat je dit bericht wilt verwijderen?")) { // Vraag om bevestiging
                    messages.splice(idx, 1); // Verwijder het bericht uit de lijst (array)
                    localStorage.setItem("messages", JSON.stringify(messages)); // Sla de kortere lijst op
                    displayMessages(); // Teken de lijst opnieuw
                }
            }
        }
    });
}

// --- Admin/Guest functies & handlers ---
function deleteAllMessages() { // Functie voor de admin om alles in één keer te wissen
    if (!isAdmin()) return alert('Alleen ingelogde hoofd-eigenaar kan alle berichten verwijderen.'); // Extra check op admin-status
    if (!confirm('Weet je zeker dat je alle berichten wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) return; // Dubbele bevestiging
    messages = []; // Maak de lijst in het geheugen leeg
    localStorage.setItem('messages', JSON.stringify(messages)); // Sla een lege lijst op in de browser
    displayMessages(); // Laat een lege pagina zien
}

// Koppel admin delete-all knop
const adminDeleteAllBtn = document.getElementById('adminDeleteAllBtn'); // Zoek de rode knop voor admin
if (adminDeleteAllBtn) { // Als de knop op deze pagina staat:
    adminDeleteAllBtn.addEventListener('click', deleteAllMessages); // Laat hem de wis-functie uitvoeren bij een klik
}
// ===== COUNTDOWN TIMER =====
// Pas deze datum aan naar jouw trouwdatum (YYYY-MM-DD)
const weddingDate = new Date("2026-09-12T12:00:00").getTime(); // De exacte tijd van de bruiloft in milliseconden

function updateCountdown() { // De functie die elke seconde de klok ververst
    const now = new Date().getTime(); // De huidige tijd nu
    const difference = weddingDate - now; // Hoeveel tijd zit er nog tussen nu en de bruiloft?

    const days = Math.floor(difference / (1000 * 60 * 60 * 24)); // Bereken het aantal volle dagen
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); // Bereken de overgebleven uren
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)); // Bereken de overgebleven minuten
    const seconds = Math.floor((difference % (1000 * 60)) / 1000); // Bereken de overgebleven seconden

    const daysElement = document.getElementById("days"); // Zoek het getal voor dagen op de pagina
    const hoursElement = document.getElementById("hours"); // Zoek het getal voor uren
    const minutesElement = document.getElementById("minutes"); // Zoek het getal voor minuten
    const secondsElement = document.getElementById("seconds"); // Zoek het getal voor seconden

    if (daysElement) daysElement.textContent = days < 0 ? 0 : days; // Zet het getal op de pagina (nooit lager dan 0)
    if (hoursElement) hoursElement.textContent = hours < 0 ? 0 : String(hours).padStart(2, '0'); // Zet uren neer (altijd 2 cijfers)
    if (minutesElement) minutesElement.textContent = minutes < 0 ? 0 : String(minutes).padStart(2, '0'); // Zet minuten neer (altijd 2 cijfers)
    if (secondsElement) secondsElement.textContent = seconds < 0 ? 0 : String(seconds).padStart(2, '0'); // Zet seconden neer (altijd 2 cijfers)

    // Als de bruiloft voorbij is
    if (difference < 0) { // Wanneer de datum bereikt is:
        const countdownTitle = document.querySelector(".countdown-title"); // Zoek de titel boven de klok
        if (countdownTitle) { // Als de titel bestaat:
            countdownTitle.textContent = "Bedankt voor je aanwezigheid!"; // Pas de tekst aan naar een bedankje
        }
    }
}

// Update countdown om de seconde
updateCountdown(); // Start de klok direct bij het openen van de pagina
setInterval(updateCountdown, 1000); // Zorg dat de klok elke 1000ms (1 seconde) ververst