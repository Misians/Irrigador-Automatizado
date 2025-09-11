import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDX_HY7J29Ol1lodVhTz_TlUU0JxwO2IMc",
  authDomain: "irrigador-automatizado-web.firebaseapp.com",
  projectId: "irrigador-automatizado-web", // Isso é o que importa pro Firestore
  storageBucket: "irrigador-automatizado-web.appspot.com",
  messagingSenderId: "598472307466",
  appId: "1:598472307466:web:a8bf0f831e6f9b0d37c0f3",
  measurementId: "G-MFVCJD84YK"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
