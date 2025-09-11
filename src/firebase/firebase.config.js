// Import the functions you need from the SDKs you need
// src/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDX_HY7J29Ol1lodVhTz_TlUU0JxwO2IMc",
  authDomain: "irrigador-automatizado-web.firebaseapp.com",
  databaseURL: "https://irrigador-automatizado-web-default-rtdb.firebaseio.com",
  projectId: "irrigador-automatizado-web",
  storageBucket: "irrigador-automatizado-web.firebasestorage.app",
  messagingSenderId: "598472307466",
  appId: "1:598472307466:web:a8bf0f831e6f9b0d37c0f3",
  measurementId: "G-MFVCJD84YK"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };