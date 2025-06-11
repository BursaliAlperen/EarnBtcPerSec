import React, { useState } from "react";
import { auth } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const register = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setMessage("Kayıt başarılı: " + userCredential.user.email);
    } catch (error) {
      setMessage("Kayıt hatası: " + error.message);
    }
  };

  const login = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setMessage("Giriş başarılı: " + userCredential.user.email);
    } catch (error) {
      setMessage("Giriş hatası: " + error.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Kullanıcı Kayıt ve Giriş</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", marginBottom: 10 }}
      />
      <input
        type="password"
        placeholder="Şifre"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", marginBottom: 10 }}
      />
      <button onClick={register} style={{ marginRight: 10 }}>
        Kayıt Ol
      </button>
      <button onClick={login}>Giriş Yap</button>
      <p>{message}</p>
    </div>
  );
}

export default App;
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const auth = getAuth();

signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Giriş başarılı
    const user = userCredential.user;
    console.log("Giriş başarılı:", user.email);
  })
  .catch((error) => {
    console.error("Giriş hatası:", error.message);
  });
import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

function App() {
  const [mesaj, setMesaj] = useState("");

  const veriKaydet = async () => {
    const veri = {
      mesaj,
      tarih: new Date()
    };

    try {
      await setDoc(doc(db, "uygulamaVerileri", "veri1"), veri);
      alert("Veri başarıyla kaydedildi!");
    } catch (error) {
      alert("Kaydetme hatası: " + error.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Firebase Firestore Veri Kaydet</h1>
      <input
        type="text"
        placeholder="Bir mesaj yaz..."
        value={mesaj}
        onChange={(e) => setMesaj(e.target.value)}
      />
      <button onClick={veriKaydet} style={{ marginLeft: 10 }}>
        Kaydet
      </button>
    </div>
  );
}

export default App;
import * as store from './store.js';
import * as lang from './lang.js';

let balanceChart = null;
const EARNING_INTERVAL = 1000; // 1 second
let adminPasswordModal = null;

// --- Page Navigation ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('d-none');
    });
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.remove('d-none');
    }
}

// --- Rendering ---
function renderDashboard() {
    const user = store.getLoggedInUser();
    if (!user) {
        showPage('login-page');
        return;
    }

    // Update stats
    const { total, today, weekly } = calculateEarnings(user);
    document.getElementById('total-earned').textContent = `${total.toFixed(9)} BTC`;
    document.getElementById('today-earned').textContent = `${today.toFixed(9)} BTC`;
    document.getElementById('weekly-earned').textContent = `${weekly.toFixed(9)} BTC`;

    // Update Earning Time Display
    updateEarningTimeDisplay(user);

    // Update wallet list
    const walletList = document.getElementById('wallet-list');
    walletList.innerHTML = '';
    if (user.wallets.length === 0) {
        walletList.innerHTML = `<div class="list-group-item" data-i18n="no_wallets">You have no wallets. Add one to start earning!</div>`;
    } else {
        user.wallets.forEach(wallet => {
            const walletEl = document.createElement('div');
            walletEl.className = 'list-group-item wallet-item';
            walletEl.dataset.walletAddress = wallet.address;
            walletEl.innerHTML = `
                <div class="flex-grow-1">
                    <img src="btc_icon.png" width="20" height="20" class="me-2">
                    <span class="wallet-address">${wallet.address}</span>
                </div>
                <div class="d-flex align-items-center">
                    <span class="wallet-balance me-3">${wallet.balance.toFixed(9)} BTC</span>
                    <div class="wallet-actions">
                        <button class="btn btn-sm btn-info withdraw-btn" data-address="${wallet.address}" data-i18n="withdraw_btn" data-i18n-title="withdraw_btn_title">Withdraw</button>
                        <button class="btn btn-sm btn-danger delete-wallet-btn" data-address="${wallet.address}"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            `;
            walletList.appendChild(walletEl);
        });
    }

    // Update referral code display
    const refCodeInput = document.getElementById('referral-code-display');
    if (refCodeInput) {
        refCodeInput.value = user.referralCode || '';
    }

    // Update chart
    renderBalanceChart(user.wallets);
    lang.translatePage();
}

function renderBalanceChart(wallets) {
    const ctx = document.getElementById('balance-chart').getContext('2d');
    const labels = wallets.map(w => w.address.substring(0, 10) + '...');
    const data = wallets.map(w => w.balance);

    if (balanceChart) {
        balanceChart.destroy();
    }

    if (wallets.length === 0) return;

    balanceChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Balance',
                data: data,
                backgroundColor: [
                    '#F7931A', '#FFB155', '#FFC98E', '#FFE0C8',
                    '#4D4D4D', '#666666', '#808080', '#999999'
                ],
                borderColor: '#2c2c2c',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                     labels: {
                        color: '#e0e0e0'
                    }
                }
            }
        }
    });
}

function updateEarningTimeDisplay(user) {
    const timeLeft = user.earningTimeLeft || 0;
    const totalTime = 6 * 60 * 60;
    const timeLeftContainer = document.getElementById('earning-time-left-container');
    const timeUpMessage = document.getElementById('earning-time-up-message');

    if (timeLeftContainer && timeUpMessage) {
        if (timeLeft > 0) {
            timeLeftContainer.classList.remove('d-none');
            timeUpMessage.classList.add('d-none');

            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);
            const seconds = Math.floor(timeLeft % 60);

            document.getElementById('earning-time-left-text').textContent = `${hours}h ${minutes}m ${seconds}s`;
            const progressBar = document.getElementById('earning-time-progress-bar');
            const progressPercent = (timeLeft / totalTime) * 100;
            progressBar.style.width = `${progressPercent}%`;
            progressBar.setAttribute('aria-valuenow', timeLeft);
            progressBar.setAttribute('aria-valuemax', totalTime);
        } else {
            timeLeftContainer.classList.add('d-none');
            timeUpMessage.classList.remove('d-none');
        }
    }
}

function updateDashboardDisplay() {
    const user = store.getLoggedInUser();
    if (!user) return;

    // Update stats
    const { total, today, weekly } = calculateEarnings(user);
    document.getElementById('total-earned').textContent = `${total.toFixed(9)} BTC`;
    document.getElementById('today-earned').textContent = `${today.toFixed(9)} BTC`;
    document.getElementById('weekly-earned').textContent = `${weekly.toFixed(9)} BTC`;

    // Update wallet balances
    user.wallets.forEach(wallet => {
        const walletItemEl = document.querySelector(`.wallet-item[data-wallet-address="${wallet.address}"]`);
        if (walletItemEl) {
            const balanceEl = walletItemEl.querySelector('.wallet-balance');
            if(balanceEl) {
                balanceEl.textContent = `${wallet.balance.toFixed(9)} BTC`;
            }
        }
    });

    // Update Earning Time Limit display
    updateEarningTimeDisplay(user);

    // Update chart
    if(balanceChart && user.wallets.length > 0) {
        balanceChart.data.datasets[0].data = user.wallets.map(w => w.balance);
        balanceChart.update('none'); // 'none' for no animation
    }
}

function renderAdminPanel() {
    renderUserList();
    renderWithdrawalRequests();
    renderOnlineUsers();
    lang.translatePage();
}

function renderOnlineUsers() {
    const tbody = document.getElementById('online-users-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const allUsers = store.getAllUsers();
    const now = Date.now();
    const TWO_MINUTES = 2 * 60 * 1000;

    const onlineUsers = allUsers.filter(user => user.lastSeen && (now - user.lastSeen < TWO_MINUTES))
        .sort((a, b) => b.lastSeen - a.lastSeen); 

    if (onlineUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted" data-i18n="no_online_users">${lang.get('no_online_users')}</td></tr>`;
        return;
    }
    
    onlineUsers.forEach(user => {
        const timeAgoSeconds = Math.round((now - user.lastSeen) / 1000);
        let timeAgoText = '';
        if (timeAgoSeconds < 5) {
            timeAgoText = lang.get('just_now');
        } else if (timeAgoSeconds < 60) {
            timeAgoText = `${timeAgoSeconds} ${lang.get('seconds_ago')}`;
        } else {
            timeAgoText = lang.get('about_a_minute_ago');
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.email}</td>
            <td>${user.username}</td>
            <td>${timeAgoText}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderUserList() {
    const users = store.getAllUsers();
    const tbody = document.getElementById('user-list-tbody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        if (user.isAdmin) return; // Don't show admin in the list

        const totalBalance = user.wallets.reduce((sum, w) => sum + w.balance, 0);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.email}</td>
            <td>${user.username}</td>
            <td>${user.wallets.length}</td>
            <td>${totalBalance.toFixed(9)} BTC</td>
            <td>
                <button class="btn btn-sm btn-primary edit-user-btn" data-email="${user.email}" data-i18n="edit_btn">Edit</button>
                <button class="btn btn-sm btn-danger delete-user-btn" data-email="${user.email}" data-i18n="delete_btn">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderWithdrawalRequests() {
    const tbody = document.getElementById('withdrawal-requests-tbody');
    tbody.innerHTML = '';
    const requests = store.getWithdrawalRequests(); // Show all requests
    const pendingRequests = requests.filter(r => r.status === 'pending');
    
    const pendingCountBadge = document.getElementById('pending-requests-count');
    if (pendingRequests.length > 0) {
        pendingCountBadge.textContent = pendingRequests.length;
        pendingCountBadge.classList.remove('d-none');
    } else {
        pendingCountBadge.classList.add('d-none');
    }

    if (requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted" data-i18n="no_withdrawal_requests">${lang.get('no_withdrawal_requests')}</td></tr>`;
        return;
    }

    requests.forEach(req => {
        const tr = document.createElement('tr');
        
        let statusBadge;
        switch(req.status) {
            case 'approved':
                statusBadge = `<span class="badge bg-success">${lang.get('status_approved')}</span>`;
                break;
            case 'denied':
                statusBadge = `<span class="badge bg-danger">${lang.get('status_denied')}</span>`;
                break;
            default: // pending
                statusBadge = `<span class="badge bg-warning text-dark">${lang.get('status_pending')}</span>`;
        }

        const actions = req.status === 'pending' ? `
            <button class="btn btn-sm btn-success approve-wr-btn" data-id="${req.id}">${lang.get('approve_btn')}</button>
            <button class="btn btn-sm btn-danger deny-wr-btn ms-1" data-id="${req.id}">${lang.get('deny_btn')}</button>
        ` : '—';

        tr.innerHTML = `
            <td>${req.userEmail}</td>
            <td class="font-monospace small">${req.walletAddress}</td>
            <td>${req.amount.toFixed(9)} BTC</td>
            <td>${new Date(req.timestamp).toLocaleString()}</td>
            <td>${statusBadge}</td>
            <td>${actions}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Calculations ---
function calculateEarnings(user) {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;

    const today = user.earningsLog
        .filter(e => now - e.timestamp < oneDay)
        .reduce((sum, e) => sum + e.amount, 0);

    const weekly = user.earningsLog
        .filter(e => now - e.timestamp < sevenDays)
        .reduce((sum, e) => sum + e.amount, 0);

    const total = user.wallets.reduce((sum, w) => sum + w.balance, 0);

    return { total, today, weekly };
}

// --- Event Handlers ---
function setupEventListeners() {
    // Auth
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('show-register').addEventListener('click', () => showPage('register-page'));
    document.getElementById('show-login').addEventListener('click', () => showPage('login-page'));

    // Language
    document.getElementById('lang-en').addEventListener('click', () => lang.setLang('en'));
    document.getElementById('lang-tr').addEventListener('click', () => lang.setLang('tr'));
    
    // Dashboard
    document.getElementById('dashboard-page').addEventListener('click', handleDashboardActions);
    document.getElementById('add-wallet-form').addEventListener('submit', handleAddWallet);
    document.getElementById('wallet-list').addEventListener('click', handleWalletActions);

    // Admin
    document.getElementById('admin-panel-btn').addEventListener('click', handleAdminPanelClick);
    document.getElementById('back-to-dashboard-btn').addEventListener('click', () => {
        showPage('dashboard-page');
    });
    document.getElementById('user-list-tbody').addEventListener('click', handleAdminUserActions);
    document.getElementById('withdrawal-requests-tbody').addEventListener('click', handleWithdrawalRequestActions);
    document.getElementById('edit-user-form').addEventListener('submit', handleEditUserSubmit);
    
    // Admin password modal
    document.getElementById('admin-password-form').addEventListener('submit', handleAdminPasswordVerify);
    document.getElementById('cancel-admin-access-btn').addEventListener('click', () => adminPasswordModal.hide());
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (store.login(email, password)) {
        store.updateUserActivity(email);
        initializeAppState();
    } else {
        alert(lang.get('alert_login_failed'));
    }
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const referralCode = document.getElementById('register-referral').value;
    
    if (store.addUser(username, email, password, referralCode)) {
        store.login(email, password);
        initializeAppState();
    } else {
        alert(lang.get('alert_registration_failed'));
    }
}

function handleLogout() {
    store.logout();
    initializeAppState();
}

function handleAddWallet(e) {
    e.preventDefault();
    const address = document.getElementById('wallet-address').value;
    const user = store.getLoggedInUser();
    if (user && address) {
        if (store.addWallet(user.email, address)) {
            renderDashboard();
            const modal = bootstrap.Modal.getInstance(document.getElementById('add-wallet-modal'));
            modal.hide();
            e.target.reset();
        } else {
            alert(lang.get('alert_wallet_exists'));
        }
    }
}

function handleWalletActions(e) {
    const user = store.getLoggedInUser();
    if (!user) return;

    if (e.target.classList.contains('delete-wallet-btn') || e.target.closest('.delete-wallet-btn')) {
        const button = e.target.closest('.delete-wallet-btn');
        const address = button.dataset.address;
        if (confirm(lang.get('alert_confirm_delete_wallet'))) {
            store.deleteWallet(user.email, address);
            renderDashboard();
        }
    }
    
    if (e.target.classList.contains('withdraw-btn')) {
        const address = e.target.dataset.address;
        const wallet = user.wallets.find(w => w.address === address);
        if (wallet.balance >= 0.00001) {
            if (store.createWithdrawalRequest(user.email, address)) {
                alert(lang.get('alert_withdraw_request_submitted'));
                renderDashboard();
            }
        } else {
            alert(lang.get('alert_withdraw_min_balance'));
        }
    }
}

function handleDashboardActions(e) {
    const target = e.target.closest('#copy-referral-btn');
    if (target) {
        const refCodeInput = document.getElementById('referral-code-display');
        refCodeInput.select();
        refCodeInput.setSelectionRange(0, 99999); // For mobile devices
        navigator.clipboard.writeText(refCodeInput.value);

        const originalIcon = target.innerHTML;
        target.innerHTML = `<i class="bi bi-check-lg"></i>`;
        setTimeout(() => {
            target.innerHTML = originalIcon;
        }, 1500);
    }
}

function handleAdminUserActions(e) {
    const target = e.target;
    const email = target.dataset.email;

    if (target.classList.contains('delete-user-btn')) {
        if (confirm(`${lang.get('alert_confirm_delete_user')} ${email}?`)) {
            store.deleteUser(email);
            renderAdminPanel();
        }
    }

    if (target.classList.contains('edit-user-btn')) {
        const user = store.getUser(email);
        if (user && user.wallets.length > 0) {
            // For simplicity, we'll edit the first wallet. A more complex UI would let admin choose.
            const wallet = user.wallets[0];
            document.getElementById('edit-user-email').value = user.email;
            document.getElementById('edit-wallet-address').value = wallet.address;
            document.getElementById('edit-user-email-display').textContent = user.email;
            document.getElementById('edit-wallet-address-display').textContent = wallet.address;
            document.getElementById('edit-wallet-balance').value = wallet.balance.toFixed(9);
            const modal = new bootstrap.Modal(document.getElementById('edit-user-modal'));
            modal.show();
        } else {
            alert(lang.get('alert_user_no_wallets'));
        }
    }
}

function handleWithdrawalRequestActions(e) {
    const target = e.target;
    const requestId = target.dataset.id;
    if (!requestId) return;

    if (target.classList.contains('approve-wr-btn')) {
        store.processWithdrawalRequest(requestId, 'approved');
        renderAdminPanel(); // Re-render to update the list
    }

    if (target.classList.contains('deny-wr-btn')) {
        store.processWithdrawalRequest(requestId, 'denied');
        renderAdminPanel(); // Re-render
    }
}

function handleEditUserSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('edit-user-email').value;
    const address = document.getElementById('edit-wallet-address').value;
    const newBalance = parseFloat(document.getElementById('edit-wallet-balance').value);
    
    if (!isNaN(newBalance)) {
        store.updateBalance(email, address, newBalance);
        renderAdminPanel();
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-user-modal'));
        modal.hide();
    }
}

function handleAdminPanelClick() {
    adminPasswordModal.show();
}

function handleAdminPasswordVerify(e) {
    e.preventDefault();
    const passwordInput = document.getElementById('admin-verify-password');
    const password = passwordInput.value;
    const user = store.getLoggedInUser();

    if (user && user.password === password) {
        adminPasswordModal.hide();
        passwordInput.value = ''; // Clear password field
        renderAdminPanel();
        showPage('admin-page');
    } else {
        alert(lang.get('alert_admin_password_incorrect'));
        passwordInput.select();
    }
}

// --- Earning Mechanism ---
function startEarningCycle() {
    setInterval(() => {
        store.processEarnings(0.00000000001);
        const loggedInUser = store.getLoggedInUser();
        if (loggedInUser) {
            store.updateUserActivity(loggedInUser.email);
            // Re-render dashboard only if a user is logged in and viewing it
            if (!document.getElementById('dashboard-page').classList.contains('d-none')) {
                updateDashboardDisplay();
            }
        }
    }, EARNING_INTERVAL);
}

// --- App Initialization ---
function initializeAppState() {
    const user = store.getLoggedInUser();
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const adminBtn = document.getElementById('admin-panel-btn');

    if (user) {
        logoutBtn.classList.remove('d-none');
        userInfo.classList.remove('d-none');
        document.getElementById('username-display').textContent = user.username;

        // Always render dashboard data for logged-in user
        renderDashboard();
        
        if (user.isAdmin) {
            adminBtn.classList.remove('d-none');
        } else {
            adminBtn.classList.add('d-none');
        }
        showPage('dashboard-page'); // All users land on dashboard first

    } else {
        showPage('login-page');
        logoutBtn.classList.add('d-none');
        userInfo.classList.add('d-none');
        adminBtn.classList.add('d-none');
    }
    lang.translatePage();
}

document.addEventListener('DOMContentLoaded', async () => {
    store.init();
    await lang.init();
    adminPasswordModal = new bootstrap.Modal(document.getElementById('admin-password-modal'));
    setupEventListeners();
    initializeAppState();
    startEarningCycle();
});
