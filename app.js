// app.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Firebase config (buraya kendi config'ini koy)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  // diğer config...
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const usernameDisplay = document.getElementById("username-display");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Giriş başarılı
      console.log("User logged in:", userCredential.user.uid);
      loginForm.reset();
    })
    .catch((error) => {
      alert("Login failed: " + error.message);
    });
});

registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const username = document.getElementById("register-username").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Kayıt başarılı
      console.log("User registered:", userCredential.user.uid);
      registerForm.reset();
    })
    .catch((error) => {
      alert("Registration failed: " + error.message);
    });
});

logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    console.log("User logged out");
  });
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Kullanıcı giriş yapmış
    userInfo.classList.remove("d-none");
    logoutBtn.classList.remove("d-none");
    usernameDisplay.textContent = user.email; // ya da user.uid istersen
    document.getElementById("login-page").classList.add("d-none");
    document.getElementById("register-page").classList.add("d-none");
    document.getElementById("dashboard-page").classList.remove("d-none");
  } else {
    // Giriş yapılmamış
    userInfo.classList.add("d-none");
    logoutBtn.classList.add("d-none");
    usernameDisplay.textContent = "";
    document.getElementById("login-page").classList.remove("d-none");
    document.getElementById("register-page").classList.add("d-none");
    document.getElementById("dashboard-page").classList.add("d-none");
  }
});
