import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCeFDNoaCpY5x77NEckdC795JAZnBY3vjw",
  authDomain: "odemetakip-b094d.firebaseapp.com",
  databaseURL: "https://odemetakip-b094d-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "odemetakip-b094d",
  storageBucket: "odemetakip-b094d.firebasestorage.app",
  messagingSenderId: "224653146946",
  appId: "1:224653146946:web:3e1a276bdfa9a21b47e6db"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export default app;
