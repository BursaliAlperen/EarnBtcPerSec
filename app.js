// Firebase config bilgileri
const firebaseConfig = {
  apiKey: "AIzaSyD35fhSe9gdyESPY8-6Pmn2mQZlj94z2XE",
  authDomain: "earnbtcpersec.firebaseapp.com",
  projectId: "earnbtcpersec",
  storageBucket: "earnbtcpersec.appspot.com",
  messagingSenderId: "923239923427",
  appId: "1:923239923427:web:81905b081546b648b50fd6"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// DOM elemanları
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');
const usernameDisplay = document.getElementById('username-display');

const loginPage = document.getElementById('login-page');
const registerPage = document.getElementById('register-page');
const dashboardPage = document.getElementById('dashboard-page');

const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

// Sayfa geçişleri
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

// Kayıt işlemi
registerForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = registerForm['register-email'].value;
  const password = registerForm['register-password'].value;
  const username = registerForm['register-username'].value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      // Kullanıcı profilini güncelle (displayName)
      return cred.user.updateProfile({
        displayName: username
      });
    })
    .then(() => {
      registerForm.reset();
    })
    .catch(err => alert(err.message));
});

// Giriş işlemi
loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = loginForm['login-email'].value;
  const password = loginForm['login-password'].value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      loginForm.reset();
    })
    .catch(err => alert(err.message));
});

// Çıkış işlemi
logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

// Kullanıcı durumu değiştiğinde (login/logout)
auth.onAuthStateChanged(user => {
  if(user){
    loginPage.classList.add('d-none');
    registerPage.classList.add('d-none');
    dashboardPage.classList.remove('d-none');
    usernameDisplay.textContent = user.displayName || user.email;
  } else {
    loginPage.classList.remove('d-none');
    registerPage.classList.add('d-none');
    dashboardPage.classList.add('d-none');
    usernameDisplay.textContent = '';
  }
});
