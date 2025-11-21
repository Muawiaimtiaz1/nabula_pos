// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEKxy2RfmuRQcQus-INI5l4zkFtQHD-cg",
  authDomain: "shoppingpos-fb492.firebaseapp.com",
  projectId: "shoppingpos-fb492",
  storageBucket: "shoppingpos-fb492.firebasestorage.app",
  messagingSenderId: "910034502015",
  appId: "1:910034502015:web:2cef5b2c892913c066da4a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export for use in other JS files
export { auth, db };
