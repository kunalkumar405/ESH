import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    onValue 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvBkv216HVvV6L-z2kVU1Bdskon0UdaGY",
  authDomain: "elegant-escape-c7aeb.firebaseapp.com",
  databaseURL: "https://elegant-escape-c7aeb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "elegant-escape-c7aeb",
  storageBucket: "elegant-escape-c7aeb.firebasestorage.app",
  messagingSenderId: "663164914956",
  appId: "1:663164914956:web:919fa8c9df17660b9c0d29"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const rtdb = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

export { 
    app,
    auth, 
    rtdb, 
    googleProvider, 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    ref, 
    set, 
    get, 
    update, 
    remove, 
    onValue 
};
