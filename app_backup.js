/**
 * ==========================================================================
 * APP.JS - Main Application Entry Point
 * ==========================================================================
 *  
 * This is the main orchestration file that:
 * - Imports all modular components
 * - Manages navigation between screens
 * - Handles authentication state
 * - Coordinates between different modules
 * 
 * Module Structure:
 * - components/auth.js - Authentication & user management
 * - components/sales.js - Sales screen & cart functionality
 * - components/orders.js - Order processing & history
 * - components/products.js - Product management
 * - utils.js - Utility functions
 * - db_adapter.js - Database abstraction layer
 * 
 * This file is intentionally kept minimal - most logic is in the modules.
 * ==========================================================================
 */

// ------------------------- IMPORTS -------------------------
// Database adapter for offline/online data management
import { dbAdapter } from "./db_adapter.js";

// Authentication module
import { initializeAuth, logout, currentUser, setCurrentUser } from "./components/auth.js";

// Sales module (sales screen, cart, product cards)
import {
  salescomponents,
  openProductPopup,
  closeProductPopup,
  addProductToCart,
  updateQtyincart,
  adjustPrice,
  adjustQty
} from "./components/sales.js";

// Orders module (checkout, history, sync)
import {
  handlePlaceOrder,
  showSalesHistory,
  toggleOrderProducts,
  forceSync
} from "./components/orders.js";

// Products module (product CRUD operations)
import {
  productsScreenHTML,
  showProductSubScreen,
  handleAddProduct,
  editProduct,
  deleteProduct,
  loadProducts
} from "./components/products.js";

// Utility functions
import { generateId } from "./utils.js";

// ------------------------- GLOBALS -------------------------
/**
 * Store reference to auth and db instances for use throughout the app
 */
const auth = dbAdapter.getAuth();
const db = dbAdapter.getFirestore();

/**
 * Track current user - updated by auth state listener
 * @type {Object|null}
 */
let appCurrentUser = null;

// ============================================================================
// AUTHENTICATION INITIALIZATION
// ============================================================================

/**
 * Initialize authentication and set up auth state listener
 * This is called when the app loads
 * 
 * When user is authenticated:
 * - Store user reference
 * - Render the default screen (products)
 */
initializeAuth((user) => {
  appCurrentUser = user;
  setCurrentUser(user);
  renderScreen('products');  // Default screen after login
  console.log("[APP] Application initialized for user:", user.email);
});

// ============================================================================
// SCREEN NAVIGATION
// ============================================================================

/**
 * Main screen rendering function
 * Handles navigation between different screens
 * 
 * Screens:
 * - 'products' - Product management screen
 * - 'sales' - Sales/POS screen with cart
 * 
 * Flow:
 * 1. Get main content div
 * 2. Clear existing content
 * 3. Render selected screen
 * 4. Clean up listeners from previous screen
 * 
 * @param {string} screen - Screen identifier ('products', 'sales')
 */
window.renderScreen = (screen) => {
  const main = document.getElementById("mainContent");
  if (!main) {
    console.error("[APP] mainContent div not found");
    return;
  }

  // Clean up Firebase product listener when leaving sales screen
  // This prevents memory leaks
  if (screen !== 'sales') {
    dbAdapter.stopProductListener();
  }

  // Render the selected screen
  switch (screen) {
    case 'products':
      // Render product management screen
      main.innerHTML = productsScreenHTML(appCurrentUser);
      console.log("[APP] Rendered products screen");
      break;

    case 'sales':
      // Render sales/POS screen with cart
      salescomponents();
      console.log("[APP] Rendered sales screen");
      break;

    default:
      // Default to products screen
      main.innerHTML = productsScreenHTML(appCurrentUser);
      console.log("[APP] Rendered default (products) screen");
  }
};

// ============================================================================
// GLOBAL WINDOW FUNCTIONS
// ============================================================================
/**
 * Expose functions to window object so they can be called from HTML onclick attributes
 * This is necessary because ES6 modules have their own scope
 */

// Auth
window.logout = logout;

// Sales & Cart
window.openProductPopup = openProductPopup;
window.closeProductPopup = closeProductPopup;
window.addProductToCart = addProductToCart;
window.updateQtyincart = updateQtyincart;
window.adjustPrice = adjustPrice;
window.adjustQty = adjustQty;

// Orders
window.showSalesHistory = () => showSalesHistory(appCurrentUser, dbAdapter);
window.toggleOrderProducts = toggleOrderProducts;
window.forceSync = forceSync;

// Products
window.showProductSubScreen = showProductSubScreen;
window.handleAddProduct = (e) => handleAddProduct(e, appCurrentUser, db);
window.loadProducts = () => loadProducts(appCurrentUser, db);
window.editProduct = (id) => editProduct(id, db);
window.deleteProduct = (id) => deleteProduct(id, db);

// ============================================================================
// APPLICATION READY
// ============================================================================
console.log("[APP] Application modules loaded successfully");
console.log("[APP] Awaiting authentication...");
