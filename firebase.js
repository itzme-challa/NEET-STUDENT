// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, update, remove, push, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD54FxWUlPn03bxD0UnD0oxVcMkI9ovCeQ",
  authDomain: "community-604af.firebaseapp.com",
  databaseURL: "https://community-604af-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "community-604af",
  storageBucket: "community-604af.appspot.com",
  messagingSenderId: "735063146170",
  appId: "1:735063146170:web:725bce2c3c64afc0f30c83",
  measurementId: "G-7YD8RLH33Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { 
  auth, 
  database,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  ref, 
  set, 
  get, 
  update, 
  remove, 
  push, 
  child 
};
