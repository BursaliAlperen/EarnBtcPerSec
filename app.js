// 1. Firebase yapılandırma ve başlatma
const firebaseConfig = {
  apiKey: "AIzaSyD35fhSe9gdyESPY8-6Pmn2mQZlj94z2XE",
  authDomain: "earnbtcpersec.firebaseapp.com",
  projectId: "earnbtcpersec",
  storageBucket: "earnbtcpersec.appspot.com",
  messagingSenderId: "923239923427",
  appId: "1:923239923427:web:81905b081546b648b50fd6"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2. DOM Elemanları
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');
const usernameDisplay = document.getElementById('username-display');

const loginPage = document.getElementById('login-page');
const registerPage = document.getElementById('register-page');
const dashboardPage = document.getElementById('dashboard-page');

const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

let btcInterval = null;

// 3. Sayfa geçişleri
showRegisterLink.addEventListener('click', e => {
  e.preventDefault();
  loginPage.classList.add('d-none');
  registerPage.classList.remove('d-none');
});
showLoginLink.addEventListener('click', e => {
  e.preventDefault();
  registerPage.classList.add('d-none');
  loginPage.classList.remove('d-none');
});

// 4. Kayıt işlemi
registerForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = registerForm['register-email'].value;
  const password = registerForm['register-password'].value;
  const username = registerForm['register-username'].value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => cred.user.updateProfile({ displayName: username }))
    .then(() => {
      registerForm.reset();
      alert('Kayıt başarılı! Giriş yapabilirsiniz.');
      registerPage.classList.add('d-none');
      loginPage.classList.remove('d-none');
    })
    .catch(err => alert(err.message));
});

// 5. Giriş işlemi
loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = loginForm['login-email'].value;
  const password = loginForm['login-password'].value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => loginForm.reset())
    .catch(err => alert(err.message));
});

// 6. Çıkış işlemi
logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

// 7. Firestore'a BTC verisi kaydetme
function saveBtcDataToFirestore(userId, btcValue) {
  db.collection('users').doc(userId).collection('btcData').add({
    btcValue,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    console.log('BTC verisi Firestore\'a kaydedildi.');
  }).catch(err => {
    console.error('Firestore kaydetme hatası:', err);
  });
}

// 8. Örnek BTC verisi alma (gerçek API ile değiştirilmeli)
function getBtcValueFromYourSource() {
  return (30000 + Math.random() * 1000).toFixed(2);
}

// 9. Kullanıcı durumu değiştiğinde işlemler
auth.onAuthStateChanged(user => {
  if (user) {
    loginPage.classList.add('d-none');
    registerPage.classList.add('d-none');
    dashboardPage.classList.remove('d-none');
    usernameDisplay.textContent = user.displayName || user.email;

    if (btcInterval) clearInterval(btcInterval);
    btcInterval = setInterval(() => {
      const btcValue = getBtcValueFromYourSource();
      saveBtcDataToFirestore(user.uid, btcValue);
    }, 1000);

  } else {
    loginPage.classList.remove('d-none');
    registerPage.classList.add('d-none');
    dashboardPage.classList.add('d-none');
    usernameDisplay.textContent = '';

    if (btcInterval) {
      clearInterval(btcInterval);
      btcInterval = null;
    }
  }
});

// 10. --- Admin ve Kullanıcı Dashboard Script ---

import * as store from './store.js';
import * as lang from './lang.js';

let balanceChart = null;
const EARNING_INTERVAL = 1000; // 1 saniye

// Sayfa gösterme fonksiyonu
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('d-none'));
  const page = document.getElementById(pageId);
  if (page) page.classList.remove('d-none');
}

// Dashboard render fonksiyonu
function renderDashboard() {
  const user = store.getLoggedInUser();
  if (!user) {
    showPage('login-page');
    return;
  }

  const { total, today, weekly } = calculateEarnings(user);
  document.getElementById('total-earned').textContent = `${total.toFixed(9)} BTC`;
  document.getElementById('today-earned').textContent = `${today.toFixed(9)} BTC`;
  document.getElementById('weekly-earned').textContent = `${weekly.toFixed(9)} BTC`;

  updateEarningTimeDisplay(user);

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

  // Referral kodu gösterimi
  const refCodeInput = document.getElementById('referral-code-display');
  if (refCodeInput) refCodeInput.value = user.referralCode || '';

  renderBalanceChart(user.wallets);
  lang.translatePage();
}

// Grafik çizme
function renderBalanceChart(wallets) {
  const ctx = document.getElementById('balance-chart').getContext('2d');
  const labels = wallets.map(w => w.address.substring(0, 10) + '...');
  const data = wallets.map(w => w.balance);

  if (balanceChart) balanceChart.destroy();
  if (wallets.length === 0) return;

  balanceChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'Balance',
        data,
        backgroundColor: ['#F7931A', '#FFB155', '#FFC98E', '#FFE0C8', '#4D4D4D', '#666666', '#808080', '#999999'],
        borderColor: '#2c2c2c',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#e0e0e0' }
        }
      }
    }
  });
}

// Kazanç zamanını gösterme
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

// Kazanç hesaplama fonksiyonu
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

// Event listenerlar ve handlerlar burada devam eder...

// Örneğin, giriş, kayıt, çıkış, cüzdan ekleme, çekim
