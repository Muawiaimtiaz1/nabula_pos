import { auth, db } from "./firebase.js";
import {
    collection, addDoc, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
    initDB, saveOrderToDB, view_orders_from_indexed_db, getUnsyncedOrders, markOrderAsSynced,
    saveProductsToDB, getProductsFromDB, clearProductsDB
} from "./indexed_db.js";

class DBAdapter {
    constructor() {
        this.productListener = null; // Store Firebase listener unsubscribe function
        this.ready = this.init(); // Store the initialization promise
    }

    async init() {
        await initDB();
        console.log("DB Initialized. Checking for unsynced orders...");

        // Try to sync on startup
        this.syncOrders();

        // Listen for online status
        window.addEventListener('online', () => {
            console.log("Network is ONLINE. Attempting sync...");
            this.syncOrders();
        });

        window.addEventListener('offline', () => {
            console.log("Network is OFFLINE.");
        });

        // Sync when page becomes visible (user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && navigator.onLine) {
                console.log("Tab is now visible and online. Attempting sync...");
                this.syncOrders();
            }
        });

        // Periodic sync check (every 5 seconds) for automatic sync
        setInterval(() => {
            if (navigator.onLine) {
                this.syncOrders();
            }
        }, 5000);
    }

    // ------------------ PRODUCTS (Direct Firebase) ------------------

    getFirestore() {
        return db;
    }

    getAuth() {
        return auth;
    }

    // ------------------ ORDERS (Offline First + Sync) ------------------

    async saveOrder(order) {
        // 1. Save to IndexedDB (Always)
        order.synced = false;
        await saveOrderToDB(order);
        console.log("[SAVE] Order saved to IDB:", order.id);

        // 2. Try to Sync immediately if online
        if (navigator.onLine) {
            console.log("[SAVE] Online, trying to sync immediately...");
            await this.syncOrder(order);
        } else {
            console.log("[SAVE] Offline, sync deferred.");
        }
    }

    async getOrders(userEmail = null) {
        return await view_orders_from_indexed_db(userEmail);
    }

    // ------------------ SYNC LOGIC ------------------

    async syncOrders() {
        console.log("[SYNC] Checking sync status - Online:", navigator.onLine);

        if (!navigator.onLine) {
            console.log("[SYNC] Skipping sync: Offline");
            return;
        }

        try {
            console.log("[SYNC] Fetching unsynced orders from IndexedDB...");
            const unsynced = await getUnsyncedOrders();
            console.log("[SYNC] Unsynced orders found:", unsynced.length, unsynced);

            if (unsynced.length === 0) {
                console.log("[SYNC] No unsynced orders, nothing to do");
                return;
            }

            console.log(`[SYNC] Found ${unsynced.length} unsynced orders. Starting sync...`);

            let successCount = 0;
            let failCount = 0;

            for (const order of unsynced) {
                console.log(`[SYNC] Processing order ${order.id}...`);
                const success = await this.syncOrder(order);
                if (success) {
                    successCount++;
                    console.log(`[SYNC] ✅ Order ${order.id} synced successfully`);
                } else {
                    failCount++;
                    console.log(`[SYNC] ❌ Order ${order.id} failed to sync`);
                }
            }

            if (successCount > 0) {
                console.log(`[SYNC] ✅ Successfully synced ${successCount} orders to Firebase`);
            }
            if (failCount > 0) {
                console.error(`[SYNC] ❌ Failed to sync ${failCount} orders`);
            }
        } catch (err) {
            console.error("[SYNC] Sync process failed with error:", err);
        }
    }

    async syncOrder(order) {
        try {
            console.log(`[SYNC] Syncing order ${order.id} to Firebase...`);
            const orderData = { ...order };
            delete orderData.synced; // Don't need this in Firestore

            console.log(`[SYNC] Order data to sync:`, orderData);
            await addDoc(collection(db, 'orders'), orderData);
            console.log(`[SYNC] Order ${order.id} added to Firestore`);

            await markOrderAsSynced(order.id);
            console.log(`[SYNC] ✅ Order ${order.id} marked as synced in IndexedDB`);
            return true;
        } catch (err) {
            console.error(`[SYNC] ❌ Failed to sync order ${order.id}:`, err);
            console.error(`[SYNC] Error code:`, err.code);
            console.error(`[SYNC] Error message:`, err.message);

            // Check if it's a Firebase auth error
            if (err.code === 'permission-denied') {
                console.error("[SYNC] Permission denied - check Firebase security rules");
            }
            return false;
        }
    }

    // ------------------ PRODUCTS (Offline First + Sync) ------------------

    async getProducts(userUid) {
        try {
            const products = await getProductsFromDB(userUid);
            return products;
        } catch (err) {
            console.error("[PRODUCTS] Error getting products from IndexedDB:", err);
            return [];
        }
    }

    async setProductListener(userUid, onProductsUpdate) {
        // Stop any existing listener
        this.stopProductListener();

        if (!navigator.onLine) {
            console.log("[PRODUCTS] Offline, skipping Firebase listener");
            return;
        }

        try {
            console.log("[PRODUCTS] Setting up Firebase listener for products");
            const q = query(collection(db, 'products'), where('uid', '==', userUid));

            this.productListener = onSnapshot(q, async (snapshot) => {
                const products = [];
                snapshot.forEach(docSnap => {
                    const p = docSnap.data();
                    products.push({ id: docSnap.id, ...p });
                });

                console.log(`[PRODUCTS] Firebase updated: ${products.length} products`);

                // Save to IndexedDB
                try {
                    await saveProductsToDB(products);
                    console.log("[PRODUCTS] Products synced to IndexedDB");

                    // Notify callback
                    if (onProductsUpdate) {
                        onProductsUpdate(products);
                    }
                } catch (err) {
                    console.error("[PRODUCTS] Error saving products to IndexedDB:", err);
                }
            }, (error) => {
                console.error("[PRODUCTS] Firebase listener error:", error);
            });

            console.log("[PRODUCTS] Firebase listener active");
        } catch (err) {
            console.error("[PRODUCTS] Error setting up Firebase listener:", err);
        }
    }

    stopProductListener() {
        if (this.productListener) {
            console.log("[PRODUCTS] Stopping Firebase listener");
            this.productListener();
            this.productListener = null;
        }
    }
}

export const dbAdapter = new DBAdapter();
