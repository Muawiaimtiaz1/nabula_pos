import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { showNotification } from "./notification.js";

// Show login form
window.showLogin = function () {
  const appDiv = document.getElementById("app");
  if (!appDiv) return;

  appDiv.innerHTML = `
    <div class="flex items-center justify-center h-screen bg-gray-100">
      <div class="bg-white shadow-lg rounded-2xl p-8 w-80">
        <h2 class="text-2xl font-bold text-center mb-4 text-blue-600">Login</h2>
        <form id="loginForm">
          <input type="email" id="email" placeholder="Email" class="border w-full p-2 mb-3 rounded-md" required />
          <input type="password" id="password" placeholder="Password" class="border w-full p-2 mb-3 rounded-md" required />
          <button type="submit" class="bg-blue-600 text-white w-full py-2 rounded-md hover:bg-blue-700">Login</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById("loginForm").onsubmit = handleLogin;
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    showNotification(`Welcome, ${userCredential.user.email}!`, "success");
    window.location.href = "dashboard.html";
  } catch (err) {
    showNotification(err.message, "error");
  }
}

// Attach event to Get Started button
window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("getStartedBtn");
  if (btn) btn.addEventListener("click", showLogin);
});
