// indexeddb.js

let db = null;

// --------------------------
// Initialize Database
// --------------------------
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("SmartPOS", 5);

    request.onupgradeneeded = function (event) {
      db = event.target.result;

      // Orders store
      if (!db.objectStoreNames.contains("orders")) {
        const objectStore = db.createObjectStore("orders", { keyPath: "id" });
        objectStore.createIndex("synced", "synced", { unique: false });
      } else {
        const objectStore = event.target.transaction.objectStore("orders");
        if (!objectStore.indexNames.contains("synced")) {
          objectStore.createIndex("synced", "synced", { unique: false });
        }
      }

      // Products store
      if (!db.objectStoreNames.contains("products")) {
        const productsStore = db.createObjectStore("products", { keyPath: "id" });
        productsStore.createIndex("uid", "uid", { unique: false });
        console.log("[IDB] Created products store with uid index");
      } else {
        const productsStore = event.target.transaction.objectStore("products");
        if (!productsStore.indexNames.contains("uid")) {
          productsStore.createIndex("uid", "uid", { unique: false });
          console.log("[IDB] Added uid index to existing products store");
        }
      }
    };

    request.onsuccess = function (event) {
      db = event.target.result;
      console.log("IndexedDB ready");
      resolve(db);
    };

    request.onerror = function (event) {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };
  });
}

// --------------------------
// Save Order
// --------------------------
export function saveOrderToDB(order) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject("DB not initialized");
      return;
    }

    if (typeof order.synced === 'undefined') {
      order.synced = false;
    }

    const tx = db.transaction("orders", "readwrite");
    const store = tx.objectStore("orders");
    const request = store.put(order);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e);
  });
}

// --------------------------
// View / get all orders
// --------------------------
export function view_orders_from_indexed_db(userEmail = null) {
  return new Promise((resolve, reject) => {
    if (!db) return reject("DB not initialized");

    const tx = db.transaction("orders", "readonly");
    const store = tx.objectStore("orders");
    const request = store.getAll();

    request.onsuccess = () => {
      let orders = request.result;
      console.log("[IDB] view_orders called with userEmail:", userEmail);
      console.log("[IDB] All orders in DB:", orders);
      if (userEmail) {
        orders = orders.filter(o => {
          console.log(`[IDB] Checking order ${o.id}, user: ${o.user} === ${userEmail}?`, o.user === userEmail);
          return o.user === userEmail;
        });
      }
      console.log("[IDB] Filtered orders:", orders);
      resolve(orders);
    };
    request.onerror = e => reject(e);
  });
}

// --------------------------
// Get Unsynced Orders
// --------------------------
export function getUnsyncedOrders() {
  return new Promise((resolve, reject) => {
    if (!db) return reject("DB not initialized");

    const tx = db.transaction("orders", "readonly");
    const store = tx.objectStore("orders");
    const request = store.getAll();

    request.onsuccess = () => {
      const allOrders = request.result || [];
      const unsyncedOrders = allOrders.filter(order => order.synced === false);
      console.log("[IDB] Total orders:", allOrders.length, "Unsynced:", unsyncedOrders.length);
      resolve(unsyncedOrders);
    };

    request.onerror = e => {
      console.error("[IDB] Error getting orders:", e);
      reject(e);
    };
  });
}

// --------------------------
// Mark Order as Synced
// --------------------------
export function markOrderAsSynced(id) {
  return new Promise((resolve, reject) => {
    if (!db) return reject("DB not initialized");

    const tx = db.transaction("orders", "readwrite");
    const store = tx.objectStore("orders");
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const order = getRequest.result;
      if (order) {
        order.synced = true;
        const updateRequest = store.put(order);
        updateRequest.onsuccess = () => {
          console.log("[IDB] Order", id, "marked as synced");
          resolve(true);
        };
        updateRequest.onerror = e => reject(e);
      } else {
        console.warn("[IDB] Order not found:", id);
        resolve(false);
      }
    };
    getRequest.onerror = e => reject(e);
  });
}

// --------------------------
// Clear All Orders
// --------------------------
export function clearAllOrders() {
  return new Promise((resolve, reject) => {
    if (!db) return reject("DB not initialized");

    const tx = db.transaction("orders", "readwrite");
    const store = tx.objectStore("orders");
    const request = store.clear();

    request.onsuccess = () => {
      console.log("[IDB] ✅ Cleared all orders from IndexedDB");
      resolve(true);
    };

    request.onerror = e => reject(e);
  });
}

// --------------------------
// Products Functions
// --------------------------

// Save products to IndexedDB
export function saveProductsToDB(products) {
  return new Promise((resolve, reject) => {
    if (!db) return reject("DB not initialized");

    // CRITICAL: Don't clear products if new list is empty (protects offline data)
    if (!products || products.length === 0) {
      console.log("[IDB] Skipping save - empty product list (protecting offline data)");
      resolve(true);
      return;
    }

    const tx = db.transaction("products", "readwrite");
    const store = tx.objectStore("products");

    // Clear existing products first
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      // Add all products
      products.forEach(product => {
        store.put(product);
      });

      tx.oncomplete = () => {
        console.log(`[IDB] Saved ${products.length} products to IndexedDB`);
        resolve(true);
      };

      tx.onerror = e => {
        console.error("[IDB] Error saving products:", e);
        reject(e);
      };
    };

    clearRequest.onerror = e => reject(e);
  });
}

// Get products from IndexedDB for a specific user
export function getProductsFromDB(userUid) {
  return new Promise((resolve, reject) => {
    if (!db) return reject("DB not initialized");

    const tx = db.transaction("products", "readonly");
    const store = tx.objectStore("products");

    // Try to use the uid index if it exists
    try {
      if (store.indexNames.contains("uid")) {
        const index = store.index("uid");
        const request = index.getAll(userUid);

        request.onsuccess = () => {
          const products = request.result || [];
          console.log(`[IDB] Retrieved ${products.length} products for user ${userUid} using index`);
          resolve(products);
        };

        request.onerror = e => {
          console.error("[IDB] Error getting products with index:", e);
          reject(e);
        };
      } else {
        // Fallback: get all products and filter by uid
        console.log("[IDB] uid index not found, using fallback method");
        const request = store.getAll();

        request.onsuccess = () => {
          const allProducts = request.result || [];
          const filteredProducts = allProducts.filter(p => p.uid === userUid);
          console.log(`[IDB] Retrieved ${filteredProducts.length} products for user ${userUid} using fallback`);
          resolve(filteredProducts);
        };

        request.onerror = e => {
          console.error("[IDB] Error getting all products:", e);
          reject(e);
        };
      }
    } catch (error) {
      console.error("[IDB] Exception in getProductsFromDB:", error);
      reject(error);
    }
  });
}

// Clear all products from IndexedDB
export function clearProductsDB() {
  return new Promise((resolve, reject) => {
    if (!db) return reject("DB not initialized");

    const tx = db.transaction("products", "readwrite");
    const store = tx.objectStore("products");
    const request = store.clear();

    request.onsuccess = () => {
      console.log("[IDB] Cleared all products");
      resolve(true);
    };

    request.onerror = e => reject(e);
  });
}