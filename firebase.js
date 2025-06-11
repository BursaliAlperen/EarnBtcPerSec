// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
