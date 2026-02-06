function isAdmin() {
    return localStorage.getItem('isAdmin') === '1';
}

function isGuest() {
    return localStorage.getItem('isGuest') === '1';
}

function updateAuthUI() {
    const loginBtn = document.getElementById('adminLoginBtn');
    const guestLoginBtn = document.getElementById('guestLoginBtn');
    const logoutBtn = document.getElementById('adminLogoutBtn');
    const guestLogoutBtn = document.getElementById('guestLogoutBtn');
    const status = document.getElementById('adminStatus');
    const deleteAllBtn = document.getElementById('adminDeleteAllBtn');

    if (!loginBtn || !guestLoginBtn || !logoutBtn || !guestLogoutBtn || !status) return;

    const adminLogged = isAdmin();
    const guestLogged = isGuest();

    loginBtn.style.display = adminLogged ? 'none' : 'inline-block';
    guestLoginBtn.style.display = guestLogged ? 'none' : 'inline-block';
    logoutBtn.style.display = adminLogged ? 'inline-block' : 'none';
    guestLogoutBtn.style.display = guestLogged ? 'inline-block' : 'none';
    if (deleteAllBtn) deleteAllBtn.style.display = adminLogged ? 'inline-block' : 'none';

    if (adminLogged) status.textContent = 'Ingelogd als admin';
    else if (guestLogged) status.textContent = 'Ingelogd als guest';
    else status.textContent = 'Niet ingelogd';
}

function refreshAuthDependentViews() {
    if (typeof displayMessages === 'function') displayMessages();
    if (typeof displayAttendees === 'function') displayAttendees();
}

function adminLogin() {
    const username = prompt('Voer admin gebruikersnaam in:');
    if (!username) {
        alert('Geen gebruikersnaam ingevuld.');
        return;
    }
    const password = prompt('Voer admin wachtwoord in:');
    if (!password) {
        alert('Geen wachtwoord ingevuld.');
        return;
    }
    if (username.trim() !== ADMIN_USERNAME || password.trim() !== ADMIN_PASSWORD) {
        alert('Onjuiste admin-gegevens.');
        return;
    }

    localStorage.setItem('isAdmin', '1');
    localStorage.removeItem('isGuest');
    alert('Ingelogd als admin.');
    updateAuthUI();
    refreshAuthDependentViews();
}

function adminLogout() {
    localStorage.removeItem('isAdmin');
    alert('Uitgelogd.');
    updateAuthUI();
    refreshAuthDependentViews();
}

function guestLogin() {
    const provided = prompt('Vul het algemene wachtwoord in om als guest in te loggen:');
    if (!provided) {
        alert('Geen wachtwoord ingevuld.');
        return;
    }
    if (provided !== SHARED_POST_PASSWORD) {
        alert('Onjuist wachtwoord.');
        return;
    }

    localStorage.setItem('isGuest', '1');
    localStorage.removeItem('isAdmin');
    alert('Ingelogd als guest.');
    updateAuthUI();
    refreshAuthDependentViews();
}

function guestLogout() {
    localStorage.removeItem('isGuest');
    alert('Guest uitgelogd.');
    updateAuthUI();
    refreshAuthDependentViews();
}

function bindAuthButtons() {
    const loginBtn = document.getElementById('adminLoginBtn');
    const guestLoginBtn = document.getElementById('guestLoginBtn');
    const logoutBtn = document.getElementById('adminLogoutBtn');
    const guestLogoutBtn = document.getElementById('guestLogoutBtn');

    if (!loginBtn || !guestLoginBtn || !logoutBtn || !guestLogoutBtn) return;

    loginBtn.addEventListener('click', adminLogin);
    guestLoginBtn.addEventListener('click', guestLogin);
    logoutBtn.addEventListener('click', adminLogout);
    guestLogoutBtn.addEventListener('click', guestLogout);

    updateAuthUI();
}

bindAuthButtons();
