// Route data - alleen geladen na authenticatie
(function() {
    // Verificatie dat gebruiker is ingelogd
    if (typeof isAdmin !== 'function' || typeof isGuest !== 'function') {
        console.error('Auth functies niet beschikbaar');
        return;
    }
    
    if (!isAdmin() && !isGuest()) {
        console.error('Geen toegang');
        return;
    }

    // Locatie gegevens
    const locationData = {
        name: 'Onspan',
        street: 'Chijnsgoed 14',
        postal: '6026 EZ Maarheeze',
        mapUrl: 'https://www.google.com/maps/embed?pb=!1m26!1m12!1m3!1d19951.38176691654!2d5.606853280520792!3d51.31254607182088!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m11!3e0!4m3!3m2!1d51.312659499999995!2d5.6071038!4m5!1s0x47c72f3a4db7611b%3A0xac4d8393ed878a3!2sOnspan%2C%20Chijnsgoed%2014%2C%206026%20EZ%20Maarheeze!3m2!1d51.3270151!2d5.6319186!5e0!3m2!1snl!2snl!4v1770976385674!5m2!1snl!2snl',
        parking: 'Er is voldoende parkeergelegenheid beschikbaar op het terrein.'
    };

    // Inject data in de pagina
    window.loadLocationData = function() {
        const mapIframe = document.querySelector('#protectedContent iframe');
        if (mapIframe) {
            mapIframe.src = locationData.mapUrl;
        }

        const addressSection = document.querySelector('.address-section');
        if (addressSection) {
            addressSection.innerHTML = `
                <h3>📍 Adres</h3>
                <p><strong>${locationData.name}</strong><br>
                ${locationData.street}<br>
                ${locationData.postal}</p>

                <h3>🅿️ Parkeren</h3>
                <p>${locationData.parking}</p>
            `;
        }
    };

    // Laad data direct als script is geladen
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.loadLocationData);
    } else {
        window.loadLocationData();
    }
})();
