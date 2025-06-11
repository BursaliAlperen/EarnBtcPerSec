// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD35fhSe9gdyESPY8-6Pmn2mQZlj94z2XE",
  authDomain: "earnbtcpersec.firebaseapp.com",
  projectId: "earnbtcpersec",
  storageBucket: "earnbtcpersec.firebasestorage.app",
  messagingSenderId: "923239923427",
  appId: "1:923239923427:web:81905b081546b648b50fd6",
  measurementId: "G-FD2BS1JHGX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD35fhSe9gdyESPY8-6Pmn2mQZlj94z2XE",
  authDomain: "earnbtcpersec.firebaseapp.com",
  projectId: "earnbtcpersec",
  storageBucket: "earnbtcpersec.firebasestorage.app",
  messagingSenderId: "923239923427",
  appId: "1:923239923427:web:81905b081546b648b50fd6",
  measurementId: "G-FD2BS1JHGX"
};

// Firebase başlat
const app = initializeApp(firebaseConfig);

// Firestore'u al
const db = getFirestore(app);

export { db };
