// ------------------------- IMPORTS -------------------------
import { showNotification } from "./notification.js";
import { dbAdapter } from "./db_adapter.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection, addDoc, query, where, onSnapshot, doc, deleteDoc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// We still need some firestore functions for the Products part as requested to keep it "directly connected"
// But we will use the db instance from adapter if needed, or just keep the imports for now as they are used in loadProducts/etc.
// The user said "creating product part will be directly connected to onlinle firebase".
// So we keep the product logic as is, but use dbAdapter for orders.

const auth = dbAdapter.getAuth();
const db = dbAdapter.getFirestore();

// ------------------------- INIT -------------------------
// DB init is handled by dbAdapter constructor



// ------------------------- GLOBALS -------------------------
let currentUser = null;
// ------------------------- AUTH CHECK -------------------------
onAuthStateChanged(auth, user => {
  if (!user) {
    showNotification("Please login first.", "warning");
    window.location.href = "index.html";
  } else {
    currentUser = user;
    renderScreen('products'); // default screen
  }
});

// ------------------------- LOGOUT -------------------------
window.logout = () => {
  signOut(auth).then(() => {
    showNotification("Logged out!", "success");
    window.location.href = "index.html";
  });
}

// ------------------------- SPA RENDER -------------------------
// ------------------------SALES SCREEN WITH COMPONENTS--------------
function salescomponents() {
  const main = document.getElementById("mainContent");
  main.innerHTML = salesScreenHTML();

  loadOrderProducts();
  // Mobile "Proceed to Cart" button functionality
  document.getElementById('proceedToCartButton')?.addEventListener('click', () => {
    document.getElementById('productView').classList.add('hidden');
    document.getElementById('cartView').classList.remove('hidden');
  });


  // Mobile "Back to Products" button in cart
  document.getElementById('closeCartButton')?.addEventListener('click', () => {
    document.getElementById('cartView').classList.add('hidden');
    document.getElementById('productView').classList.remove('hidden');
  });
  const checkoutBtn = document.getElementById("checkoutButton");

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", async () => {
      await handlePlaceOrder();
      salescomponents();
    });


  }
}
window.renderScreen = (screen) => {
  const main = document.getElementById("mainContent");
  if (!main || !currentUser) return;

  if (screen === 'products') {

    main.innerHTML = productsScreenHTML();
    loadProducts();
  } else if (screen === 'sales') {
    salescomponents();
    loadOrderProducts();
    // Mobile "Proceed to Cart" button functionality

  }


  // View Cart button in mobile footer
  // document.getElementById("checkoutButton").addEventListener("click", handlePlaceOrder);


  else if (screen === 'customers') {
    main.innerHTML = `<h2 class="text-2xl font-bold mb-4">Customers Dashboard</h2><p>Coming soon...</p>`;
  }
};

// ------------------------- PRODUCTS SCREEN -------------------------
function productsScreenHTML() {
  return `
<div class="flex justify-center gap-6 mt-8">

  <!-- Add Product Button -->
  <button onclick="showProductSubScreen('addProduct')"
    class="flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 transition-all duration-200 text-white px-6 py-4 rounded-3xl shadow-lg hover:shadow-xl w-32 h-20">
    
    <!-- Optional Icon -->
    <span class="material-icons text-3xl mb-2">add_box</span>

    <span class="text-sm font-semibold text-center">Add Product</span>
  </button>

  <!-- View Products Button -->
  <button onclick="showProductSubScreen('viewProducts')"
    class="flex flex-col items-center justify-center bg-gray-700 hover:bg-gray-800 transition-all duration-200 text-white px-6 py-4 rounded-3xl shadow-lg hover:shadow-xl w-32 h-20">
    
    <!-- Optional Icon -->
    <span class="material-icons text-3xl mb-2">inventory_2</span>

    <span class="text-sm font-semibold text-center">View Products</span>
  </button>

</div>


<div id="addProduct" class="hidden mt-4">
  <form id="addProductForm" class="bg-white p-4 rounded shadow">
    <input id="pname" type="text" placeholder="Product Name" class="border p-2 w-full mb-3 rounded" required>
    <input id="pprice" type="number" placeholder="Price" class="border p-2 w-full mb-3 rounded" >
    <input id="pqty" type="number" placeholder="stock" class="border p-2 w-full mb-3 rounded" >
    <button class="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Add Product</button>
  </form>
</div>

<div id="viewProducts" class="hidden flex flex-col gap-3 mt-4 p-2">
  <!-- Search bar -->
  <input 
    type="text" 
    id="productSearch" 
    placeholder="Search products..." 
    class="w-full border p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
  >

  <div class="overflow-x-auto">
    <table class="w-full bg-white rounded shadow text-left">
      <thead>
        <tr class=" border-b">
          <th class="p-2">Name</th>
          <th class="p-2">Price</th>
          <th class="p-2">Qty</th>
          
        </tr>
      </thead>
      <tbody id="productsTable"></tbody>
    </table>
  </div>
</div>
`;
}
// ---------------------------sales screen -------------------------
// ------------------------- GLOBALS -------------------------
let productsArray = []; // loaded products
let cart = [];

// ------------------------- SALES SCREEN -------------------------
function salesScreenHTML() {
  return `
    <div class="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 bg-gray-100 min-h-screen">
     
      <!-- Products Panel -->
      <div id="productView" class="flex-1 lg:w-2/3 h-[80vh] flex flex-col">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-3xl font-bold text-gray-800">Sales Dashboard</h2>
          <!-- Proceed to Cart Button -->
          <button 
            id="proceedToCartButton"
            class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all lg:hidden"
          >
            <i class="material-icons">add_shopping_cart</i>
          </button>
          
          <!-- View History Button -->
          <button 
            onclick="showSalesHistory()"
            class="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700 transition-all ml-2"
          >
            <i class="material-icons">history</i>
          </button>
        </div>
        
        <div class="relative mb-6">
          <input 
            type="text" 
            id="productSearch" 
            placeholder="Search products by name or SKU..." 
            class="border border-gray-300 p-3 pl-4 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
        </div>
        
        <div id="productsGrid" class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 h-full">
      
        </div>
      </div>

      <!-- Cart Panel -->
      <div id="cartView" class="hidden lg:block lg:w-1/3 h-fit lg:sticky lg:top-6">
        <div class="bg-white p-6 rounded-xl shadow-lg">
          <button id="closeCartButton" class="font-semibold text-blue-600 mb-4 lg:hidden">
            &larr; Back to Products
          </button>
        
          <h3 class="text-2xl font-semibold text-gray-700 border-b pb-3">Order Summary</h3>
          
          <!-- Customer Name Input -->
          <div class="my-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="customerName">
              Customer Name
            </label>
            <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="customerName" type="text" placeholder="Enter customer name">
          </div>

          <p class="text-sm text-gray-600 mb-4">
            User: <span class="font-medium text-gray-900">${currentUser?.email || 'Not logged in'}</span>
          </p>

          <div id="cartContainer" class="flex flex-col gap-4 mt-2 max-h-96 overflow-y-auto pr-2">
            <p id="emptyCartMessage" class="text-gray-500 text-center py-4">Your cart is empty.</p>
          </div>

          <div class="mt-6 pt-4 border-t-2 border-dashed">
            <div class="flex justify-between items-center mb-2">
              <span class="text-gray-600">Subtotal</span>
              <span id="cartSubtotal" class="font-medium text-gray-800">0.00</span>
            </div>
           
            <div class="flex justify-between items-center text-xl font-bold mb-6">
              <span class="text-gray-900">Total</span>
              <span id="cartTotal" class="text-blue-600">0.00</span>
            </div>
            
            <button 
              id="checkoutButton"
              class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all disabled:opacity-50"
            >
              Place Order
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Footer -->
      <div id="mobileCartFooter" class="lg:hidden fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 shadow-lg-top">
        <div class="flex justify-between items-center">
          <div>
            <span id="mobileItemCount" class="font-bold text-gray-800">0 items</span>
            <span class="mx-2">|</span>
            <span id="mobileCartTotal" class="font-bold text-blue-600">0.00</span>
          </div>
          <button id="viewCartButton" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">
            View Cart
          </button>
        </div>
      </div>
    </div>
  `;
}


// ------------------------- LOAD PRODUCTS -------------------------
async function loadOrderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  // Wait for database to be ready
  await dbAdapter.ready;
  console.log('[SALES] Database ready, loading products...');

  // Function to render products (for both online and offline)
  const renderProducts = (products) => {
    grid.innerHTML = '';
    productsArray = products || [];
    console.log('[SALES] Rendering', productsArray.length, 'products');

    productsArray.forEach(p => {
      grid.innerHTML += orderProductCardHTML(p);
    });

    // Setup search filter (only once)
    const searchInput = document.getElementById('productSearch');
    if (searchInput && !searchInput.dataset.listenerAdded) {
      searchInput.dataset.listenerAdded = 'true';
      searchInput.addEventListener('input', () => {
        const queryText = searchInput.value.toLowerCase();
        grid.innerHTML = '';
        productsArray
          .filter(p => p.name.toLowerCase().includes(queryText))
          .forEach(p => grid.innerHTML += orderProductCardHTML(p));
      });
    }
  };

  // First, load from IndexedDB (works offline)
  try {
    const cachedProducts = await dbAdapter.getProducts(currentUser.uid);
    if (cachedProducts && cachedProducts.length > 0) {
      console.log('[SALES] Loaded from IndexedDB:', cachedProducts.length);
      renderProducts(cachedProducts);
    } else {
      console.log('[SALES] No products in IndexedDB');
    }
  } catch (err) {
    console.error('[SALES] Error loading from IndexedDB:', err);
  }

  // Then, setup Firebase listener for real-time updates (online only)
  if (navigator.onLine) {
    try {
      await dbAdapter.setProductListener(currentUser.uid, (products) => {
        console.log('[SALES] Firebase update received:', products.length);
        renderProducts(products);
      });
    } catch (err) {
      console.error('[SALES] Error setting up Firebase listener:', err);
    }
  } else {
    console.log('[SALES] Offline mode - using cached data only');
  }
}

// ------------------------- PRODUCT CARD -------------------------
function orderProductCardHTML(product) {
  return `
    <div 
      class="border p-3 rounded-lg shadow flex flex-col justify-between items-center bg-white hover:shadow-lg transition-shadow duration-200 cursor-pointer"
      onclick='openProductPopup(${JSON.stringify(product)})'
    >
      <h3 class="font-semibold mb-2 text-center text-sm sm:text-base md:text-lg lg:text-xl truncate">
        ${product.name}
      </h3>
      <p class="text-gray-800 font-bold mb-3 text-sm sm:text-base md:text-lg">
        ${isNaN(product.price) ? '0.00' : product.price.toFixed(2)}
      </p>
    </div>
  `;
}

// ------------------------- PRODUCT POPUP -------------------------
function createProductPopup(product) {
  return `
    <div id="productPopup" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-72 sm:w-96 shadow-lg relative border-2 border-gray-200">

        <!-- Header: Product Name -->
        <h2 class="text-xl font-bold mb-4 text-center text-gray-800">${product.name}</h2>

        <!-- Price Input -->
        <div class="mb-4">
          <label class="block mb-1 font-medium text-gray-700">Price (₹):</label>
          <div class="flex items-center gap-2 justify-center">
            <button type="button" class="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600" onclick="adjustPrice(-50)">
              <span class="material-icons text-base align-middle">arrow_back</span>
            </button>
            <input type="number" id="popupPrice" value="${product.price}" class="border p-2 rounded w-full text-center" min="1" step="1">
            <button type="button" class="px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600" onclick="adjustPrice(50)">
              <span class="material-icons text-base align-middle">arrow_forward</span>
            </button>
          </div>
        </div>

        <!-- Quantity Input -->
        <div class="mb-4">
          <label class="block mb-1 font-medium text-gray-700">Quantity:</label>
          <div class="flex items-center gap-2 justify-center">
            <button type="button" class="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600" onclick="adjustQty(-1)">
              <span class="material-icons text-base align-middle">arrow_back</span>
            </button>
            <input type="number" id="popupQty" value="1" min="1" class="border p-2 rounded w-full text-center">
            <button type="button" class="px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600" onclick="adjustQty(1)">
              <span class="material-icons text-base align-middle">arrow_forward</span>
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 mt-2">
          <button class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 font-medium" onclick="closeProductPopup()">Cancel</button>
          <button class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
            onclick='addProductToCart(${JSON.stringify(product)})'>Add</button>
        </div>

      </div>
    </div>
  `;
}

// Adjust Price Function
window.adjustPrice = function (amount) {
  const priceInput = document.getElementById('popupPrice');
  let currentPrice = parseInt(priceInput.value) || 0;
  currentPrice += amount;
  if (currentPrice < 1) currentPrice = 1;
  priceInput.value = currentPrice;
};

// Adjust Quantity Function
window.adjustQty = function (amount) {
  const qtyInput = document.getElementById('popupQty');
  let currentQty = parseInt(qtyInput.value) || 1;
  currentQty += amount;
  if (currentQty < 1) currentQty = 1;
  qtyInput.value = currentQty;
};


// --------------------product selling popup------------------------
window.openProductPopup = function (product) {
  if (!product) return;
  const popupHTML = createProductPopup(product);
  document.body.insertAdjacentHTML('beforeend', popupHTML);
}

window.closeProductPopup = function () {
  const popup = document.getElementById('productPopup');
  if (popup) popup.remove();
}

// ------------------------- CART -------------------------
window.addProductToCart = function (product) {
  if (!product) return;

  let price = parseFloat(document.getElementById('popupPrice').value);
  const qty = parseInt(document.getElementById('popupQty').value);

  if (isNaN(price) || price <= 0) {
    showNotification("Price must be greater than 0", "error");
    return;
  }

  if (isNaN(qty) || qty <= 0) {
    showNotification("Quantity must be greater than 0", "error");
    return;
  }

  const existing = cart.find(p => p.id === product.id);
  if (existing) {
    existing.qty += qty;
    existing.price = price;
  } else {
    cart.push({ ...product, qty, price });
  }

  closeProductPopup();
  renderCart();
}
// ------------------------- UPDATE QTY IN CART -------------------------
window.updateQtyincart = function (id, change) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.qty += change;

  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }

  renderCart();
}
// calculate subtotal
function calculateTotal() {
  if (!cart || cart.length === 0) return 0;

  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

// ------------------------- CALCULATe cart-------------------------
function renderCart() {
  const container = document.getElementById('cartContainer');
  const emptyMessage = document.getElementById('emptyCartMessage');
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');

  if (!container || !subtotalEl || !totalEl) return;

  container.innerHTML = '';

  if (cart.length === 0) {
    if (emptyMessage) emptyMessage.style.display = 'block';

    subtotalEl.textContent = '0.00';
    totalEl.textContent = '0.00';
    return;
  }

  if (emptyMessage) emptyMessage.style.display = 'none';

  let subtotal = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;

    container.innerHTML += `
  <div class="border rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2">

    <!-- Product Name -->
    <div class="flex justify-between items-center">
      <span class="font-semibold text-gray-800 text-lg">${item.name}</span>
      <span class="text-sm text-gray-500">Unit: ${item.price.toFixed(2)}</span>
    </div>

    <!-- Quantity & Total Price -->
    <div class="flex justify-between items-center mt-1">

      <!-- Quantity Buttons -->
      <!-- Quantity Buttons -->
<div class="flex items-center gap-1 bg-gray-100 border-grey-100 " style="border-radius: 20px;">
  <button onclick="updateQtyincart('${item.id}', -1)"
    class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 text-xl font-bold shadow-sm active:scale-95">
   &larr;
  </button>

  <span class="text-xl font-bold text-gray-900 min-w-6 text-center">
    ${item.qty}
  </span>

  <button onclick="updateQtyincart('${item.id}', 1)"
    class="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white text-xl font-bold shadow-sm active:scale-95">
    &rarr;
  </button>
</div>


      <!-- Total Price -->
      <span class="text-xl font-extra text-blue-700 tracking-tight">
        ${itemTotal.toFixed(2)}
      </span>
    </div>

  </div>
`;

  });
  subtotal = parseFloat(subtotal.toFixed(2));

  subtotalEl.textContent = subtotal.toFixed(2);
  totalEl.textContent = `${subtotal.toFixed(2)}`;
}
// --------------------------place order-------------------------
// ------------------------- this will place an order in indexed db-------------------------

async function handlePlaceOrder() {
  if (!cart || cart.length === 0) {
    showNotification("Cart is empty!", "warning");
    return;
  }
  let subtotal = calculateTotal();

  const customerNameInput = document.getElementById('customerName');
  const customerName = customerNameInput && customerNameInput.value.trim() !== "" ? customerNameInput.value.trim() : "Guest";

  const order = {
    id: Date.now(), // Simple ID
    date: new Date().toISOString(),
    items: [...cart],
    subtotal: subtotal,
    total: subtotal,
    paymentMethod: "cash",
    user: currentUser?.email || "guest",
    customerName: customerName
  };

  try {
    // Use Adapter
    await dbAdapter.saveOrder(order);
    showNotification("Order saved successfully!", "success");

    // Clear cart
    cart = [];
    renderCart();

  } catch (err) {
    console.error("Error saving order:", err);
    showNotification("Error saving order: " + err, "error");
  }
}


// ------------------------- SALES HISTORY -------------------------
/**
 * SALES HISTORY MODULE
 * Features: Mobile-responsive, Sticky Header, Auto-sync status, Skeleton loading
 */

// 1. ICON ASSETS (SVGs)
const Icons = {
  back: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
  sync: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>`,
  calendar: `<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`,
  creditCard: `<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>`,
  emptyBox: `<svg class="w-16 h-16 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>`
};

// 2. UI HELPERS
const getSkeletonLoader = () => `
    <div class="animate-pulse flex flex-col gap-3">
        ${[1, 2, 3, 4].map(() => `
        <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm h-24 flex justify-between">
            <div class="flex-1 space-y-3">
                <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                <div class="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
            <div class="w-16 h-8 bg-gray-200 rounded"></div>
        </div>`).join('')}
    </div>
`;

// 3. MAIN VIEW FUNCTION
window.showSalesHistory = async () => {
  const main = document.getElementById("mainContent");

  // -- Render UI Shell --
  // 'pb-24' adds bottom padding so content isn't hidden behind mobile nav bars
  main.innerHTML = `
    <div class="min-h-screen bg-gray-50 pb-24"> 
        
        <div class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all">
            <div class="max-w-3xl mx-auto px-4 py-3 md:py-4">
                <div class="flex justify-between items-center">
                    
                    <div class="flex flex-col">
                        <h2 class="text-lg md:text-2xl font-extrabold text-gray-800 tracking-tight">Sales History</h2>
                        <div id="networkStatus" class="text-[10px] md:text-xs font-medium mt-0.5 transition-colors duration-300"></div>
                    </div>
                    
                    <div class="flex gap-2">
                        <button onclick="forceSync()" id="syncBtn" class="group flex items-center justify-center gap-2 bg-blue-600 active:bg-blue-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-semibold shadow-blue-200 shadow-lg active:scale-95 transition-all touch-manipulation">
                            <span id="syncIcon" class="transform group-active:rotate-180 transition-transform">${Icons.sync}</span> 
                            <span class="hidden xs:inline">Sync</span>
                        </button>
                        
                        <button onclick="renderScreen('sales')" class="flex items-center justify-center gap-1 text-gray-600 active:bg-gray-100 border border-transparent active:border-gray-200 px-3 py-2 rounded-lg transition-all text-xs md:text-sm font-medium active:scale-95 touch-manipulation">
                            ${Icons.back} <span class="hidden xs:inline">Back</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="px-3 md:px-6 max-w-3xl mx-auto mt-3 md:mt-5">
            <div id="historyList" class="flex flex-col gap-3 md:gap-4">
                ${getSkeletonLoader()}
            </div>
        </div>
    </div>
  `;

  // -- Network Status Logic --
  const updateNetworkStatus = () => {
    const statusEl = document.getElementById("networkStatus");
    if (!statusEl) return;

    const baseClasses = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border";

    if (navigator.onLine) {
      statusEl.innerHTML = `
                <span class="${baseClasses} bg-green-50 text-green-700 border-green-200">
                    <span class="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
                    </span>
                    <span class="truncate">Online</span>
                </span>`;
    } else {
      statusEl.innerHTML = `
                <span class="${baseClasses} bg-gray-100 text-gray-600 border-gray-300">
                    <span class="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-gray-400"></span>
                    Offline
                </span>`;
    }
  };

  // Initialize Status Listeners
  updateNetworkStatus();
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);

  // -- Data Loading Logic --
  const loadOrders = async () => {
    try {
      // Fetch data
      const orders = await dbAdapter.getOrders(currentUser?.email);
      const list = document.getElementById("historyList");

      if (!list) return; // User navigated away

      // 1. Empty State
      if (!orders || orders.length === 0) {
        list.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 md:py-20 text-center px-4 animate-fade-in">
                        ${Icons.emptyBox}
                        <p class="text-gray-500 font-medium text-base md:text-lg">No sales yet</p>
                        <p class="text-gray-400 text-xs md:text-sm mt-1">Completed orders will appear here.</p>
                    </div>`;
        return;
      }

      // 2. Sort Data
      orders.sort((a, b) => new Date(b.date) - new Date(a.date));

      // 3. Build HTML string
      const htmlContent = orders.map(order => {
        const dateObj = new Date(order.date);
        const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const total = parseFloat(order.total || 0);

        // Item Formatting
        const items = order.items || [];
        const itemsSummary = items.map(i =>
          `<span class="text-gray-800 font-semibold">${i.qty}x</span> ${i.name}`
        ).join(', ');

        return `
                <div class="bg-white p-3 md:p-5 rounded-xl border border-gray-100 shadow-sm active:shadow-md active:border-blue-200 transition-all duration-200">
                    
                    <div class="flex justify-between items-start mb-2 md:mb-3">
                        <div class="flex flex-col overflow-hidden pr-2">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">#${order.id}</span>
                                <span class="text-sm md:text-base font-bold text-gray-800 truncate">${order.customerName || 'Guest'}</span>
                            </div>
                            <div class="flex items-center gap-1 mt-1 text-[11px] md:text-xs text-gray-500">
                                ${Icons.calendar} <span>${dateStr} • ${timeStr}</span>
                            </div>
                        </div>
                        
                        <div class="text-right flex-shrink-0">
                             <p class="text-base md:text-lg font-black text-emerald-600 leading-tight">${total.toFixed(2)}</p>
                             <p class="text-[10px] md:text-xs text-gray-400 mt-0.5">${order.paymentMethod || 'Cash'}</p>
                        </div>
                    </div>
                    
                    <div class="border-t border-dashed border-gray-100 pt-2 md:pt-3 mt-1">
                        <div class="text-xs md:text-sm text-gray-500 leading-relaxed line-clamp-1 md:line-clamp-2">
                            ${itemsSummary}
                        </div>
                    </div>
                </div>
                `;
      }).join('');

      // 4. Update DOM (Only if changed to reduce flicker)
      if (list.innerHTML.length !== htmlContent.length) {
        list.innerHTML = htmlContent;
      }

    } catch (err) {
      console.error("Error loading orders:", err);
      const list = document.getElementById("historyList");
      if (list) list.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 flex items-center gap-3 text-sm">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>Error loading history.</span>
                </div>`;
    }
  };

  // -- Initialization --
  await loadOrders();

  // -- Auto Refresh Loop --
  const refreshInterval = setInterval(async () => {
    if (!document.getElementById("historyList")) {
      // Cleanup if user navigates away
      clearInterval(refreshInterval);
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      return;
    }
    await loadOrders();
  }, 3000);
}

// 4. MANUAL SYNC FUNCTION
window.forceSync = async () => {
  const btn = document.getElementById('syncBtn');
  const icon = document.getElementById('syncIcon');

  // Visual Loading State
  if (btn) btn.classList.add('opacity-75', 'cursor-wait');
  if (icon) icon.classList.add('animate-spin');

  console.log("Manual sync triggered");

  try {
    await dbAdapter.syncOrders();

    // Delay refresh slightly for better UX
    setTimeout(() => {
      showSalesHistory();
      // Reset button state is handled by the full re-render in showSalesHistory
    }, 800);
  } catch (e) {
    console.error(e);
    // Error State Reset
    if (btn) btn.classList.remove('opacity-75', 'cursor-wait');
    if (icon) icon.classList.remove('animate-spin');
    alert("Sync failed. Please check your internet connection.");
  }
};

// ------------------------- SHOW SUBSCREEN -------------------------
window.showProductSubScreen = (id) => {
  document.getElementById('addProduct')?.classList.add('hidden');
  document.getElementById('viewProducts')?.classList.add('hidden');

  const screen = document.getElementById(id);
  if (screen) screen.classList.remove('hidden');

  if (id === 'addProduct') {
    document.getElementById('addProductForm').onsubmit = handleAddProduct;
  }
}


// ------------------------- ADD PRODUCT -------------------------
async function handleAddProduct(e) {
  e.preventDefault();
  const name = document.getElementById('pname').value;
  const price = parseFloat(document.getElementById('pprice').value);
  const qty = parseInt(document.getElementById('pqty').value);

  try {
    await addDoc(collection(db, 'products'), { uid: currentUser.uid, name, price, quantity: qty, createdAt: new Date() });
    e.target.reset();
    showNotification("Product added!", "success");
  } catch (err) { showNotification(err.message, "error"); }
}


// ------------------------- LOAD PRODUCTS & SEARCH -------------------------
async function loadProducts() {
  const tbody = document.getElementById('productsTable');
  if (!tbody) return;

  // Wait for database to be ready
  await dbAdapter.ready;

  let productsArray = [];

  // Function to render products (for both online and offline)
  const renderProducts = (products) => {
    console.log('[INVENTORY] renderProducts called with:', products);
    console.log('[INVENTORY] tbody element:', tbody);

    tbody.innerHTML = '';
    productsArray = products || [];

    console.log('[INVENTORY] About to render', productsArray.length, 'products');

    productsArray.forEach((p, index) => {
      const html = productRowHTML(p);
      console.log(`[INVENTORY] Product ${index}:`, p.name, 'HTML length:', html ? html.length : 0);
      tbody.innerHTML += html;
    });

    console.log('[INVENTORY] Final tbody.innerHTML length:', tbody.innerHTML.length);

    // Setup search filter (only once)
    const searchInput = document.getElementById('productSearch');
    if (searchInput && !searchInput.dataset.listenerAdded) {
      searchInput.dataset.listenerAdded = 'true';
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        tbody.innerHTML = '';
        productsArray
          .filter(p => p.name.toLowerCase().includes(query))
          .forEach(p => tbody.innerHTML += productRowHTML(p));
      });
    }
  };

  // First, load from IndexedDB (works offline)
  try {
    const cachedProducts = await dbAdapter.getProducts(currentUser.uid);
    if (cachedProducts && cachedProducts.length > 0) {
      console.log('[INVENTORY] Loaded from IndexedDB:', cachedProducts.length);
      renderProducts(cachedProducts);
    }
  } catch (err) {
    console.error('[INVENTORY] Error loading from IndexedDB:', err);
  }

  // Then, setup Firebase listener for real-time updates (online only)
  if (navigator.onLine) {
    try {
      await dbAdapter.setProductListener(currentUser.uid, (products) => {
        console.log('[INVENTORY] Firebase update received:', products.length);
        renderProducts(products);
      });
    } catch (err) {
      console.error('[INVENTORY] Error setting up Firebase listener:', err);
    }
  } else {
    console.log('[INVENTORY] Offline mode - using cached data only');
  }
}
// ------------------------- TOGGLE ACTION BUTTONS -------------------------
function toggleAction(row) {
  // Hide all other open action divs
  document.querySelectorAll('.action-buttons').forEach(div => {
    if (!row.contains(div)) {
      div.classList.add('opacity-0');
    }
  });

  // Toggle the clicked row's action div
  const actionDiv = row.querySelector('.action-buttons');
  if (actionDiv) {
    actionDiv.classList.toggle('opacity-0');
  }
}

// ------------------------- HELPER: PRODUCT ROW -------------------------
/**
 * Generates the HTML for a single product row using Google Material Icons.
 * All original Tailwind CSS class names are preserved.
 *
 * @param {object} p - The product object (must have id, name, price, quantity).
 * @param {number} index - The zero-based index of the product in the list.
 * @returns {string} The HTML string for the table row.
 */
/**
 * Generates the HTML for a single product row using Google Material Icons.
 * All original Tailwind CSS class names are preserved.
 *
 * @param {object} p - The product object (must have id, name, price, quantity).
 * @param {number} index - The zero-based index of the product in the list.
 * @returns {string} The HTML string for the table row.
 */
function productRowHTML(p) {
  return `
    <tr class="border-b relative group hover:bg-gray-50 transition-colors duration-200" >
<td class="p-2 font-medium">${p.name}</td>
<td class="p-2 text-gray-700">
  ${isNaN(p.price) || p.price === null || p.price === undefined ? '—' : `${p.price.toFixed(2)}`}
</td>
<td class="p-2 text-gray-700">
  ${isNaN(p.quantity) || p.quantity === null || p.quantity === undefined ? '—' : p.quantity}
</td>

  <td class="p-2 relative">
  
    <div class="absolute right-2 top-1/2 transform -translate-y-1/2 
                hidden group-hover:flex items-center gap-2 
                bg-white border border-gray-200 p-1.5 rounded-full shadow-md 
                transition-all duration-200">

      

      <button 
        onclick="editProduct('${p.id}')" 
        title="Edit ${p.name}"
        class="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded-full text-xs shadow-sm transition-colors duration-150"
      >
        <span class="material-icons text-sm">edit</span>
        Edit
      </button>

      <button 
        onclick="deleteProduct('${p.id}')" 
        title="Delete ${p.name}"
        class="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-full text-xs shadow-sm transition-colors duration-150"
      >
        <span class="material-icons text-sm">delete</span>
        Del
      </button>
      
    </div>
  </td>
</tr >
    `;
}


// ------------------------- DELETE PRODUCT -------------------------
window.deleteProduct = async (id) => {
  if (!confirm("Delete this product?")) return;
  try { await deleteDoc(doc(db, 'products', id)); }
  catch (err) { showNotification(err.message, "error"); }
}

// ------------------------- EDIT PRODUCT -------------------------
window.editProduct = async (id) => {
  const docRef = doc(db, 'products', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return showNotification("Product not found", "error");

  const data = docSnap.data();
  showProductSubScreen('addProduct');

  document.getElementById('pname').value = data.name;
  document.getElementById('pprice').value = data.price;
  document.getElementById('pqty').value = data.quantity;

  document.getElementById('addProductForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(docRef, {
        name: document.getElementById('pname').value,
        price: parseFloat(document.getElementById('pprice').value),
        quantity: parseInt(document.getElementById('pqty').value)
      });
      showNotification("Product updated!", "success");
      e.target.reset();
      showProductSubScreen('viewProducts');
      document.getElementById('addProductForm').onsubmit = handleAddProduct;
    } catch (err) { showNotification(err.message, "error"); }
  };
};
