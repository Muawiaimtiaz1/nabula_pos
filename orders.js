import { saveOrderToDB } from "./indexed_db.js";
import { cart, calculateSubtotal, renderCart, currentUser } from "./app.js";
import { showNotification } from "./notification.js";

export async function handlePlaceOrder() {
  if (cart.length === 0) {
    showNotification("Cart is empty!", "warning");
    return;
  }

  const order = {
    id: Date.now(),
    date: new Date().toISOString(),
    items: [...cart],
    subtotal: calculateSubtotal(),
    total: calculateSubtotal(),
    paymentMethod: "cash",
    user: currentUser?.email || "guest"
  };

  try {
    await saveOrderToDB(order);
    showNotification("Order saved!", "success");

    // Clear cart
    cart.length = 0;
    renderCart();

  } catch (err) {
    console.error("Error saving order:", err);
  }
}
