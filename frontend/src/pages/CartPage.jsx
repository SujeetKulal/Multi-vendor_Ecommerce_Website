import { useMemo, useState } from "react";
import apiClient from "../api/client";

export default function CartPage() {
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem("cart_items") || "[]"));
  const [message, setMessage] = useState("");

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items]
  );

  const updateQty = (productId, qty) => {
    const next = items.map((item) => (item.product_id === productId ? { ...item, quantity: Math.max(1, qty) } : item));
    setItems(next);
    localStorage.setItem("cart_items", JSON.stringify(next));
  };

  const checkout = async () => {
    const payload = { items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })) };
    const { data } = await apiClient.post("/orders/checkout/", payload);
    setItems([]);
    localStorage.removeItem("cart_items");
    setMessage(`Order #${data.id} placed successfully.`);
  };

  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-xl bg-white p-6 shadow">
      <h1 className="text-2xl font-semibold">Your Cart</h1>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.product_id} className="flex items-center justify-between rounded border p-3">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-gray-600">${item.price}</p>
            </div>
            <input
              type="number"
              min="1"
              className="w-20 rounded border p-1"
              value={item.quantity}
              onChange={(e) => updateQty(item.product_id, Number(e.target.value))}
            />
          </div>
        ))}
      </div>
      <p className="mt-6 text-lg font-semibold">Total: ${total.toFixed(2)}</p>
      <button className="mt-4 rounded bg-brand-600 px-4 py-2 text-white" onClick={checkout} disabled={!items.length}>
        Checkout
      </button>
      {message && <p className="mt-4 text-green-700">{message}</p>}
    </div>
  );
}
