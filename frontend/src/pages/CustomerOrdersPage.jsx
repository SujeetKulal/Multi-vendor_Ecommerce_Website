import { useEffect, useState } from "react";
import apiClient from "../api/client";

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeItemId, setActiveItemId] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, review_text: "", images: [] });

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const { data } = await apiClient.get("/orders/my-orders/");
        setOrders(data.results || data);
      } catch (err) {
        const data = err?.response?.data;
        setError(data?.detail || "Unable to load orders.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmtDate = (iso) => new Date(iso).toLocaleString();

  const openReviewForm = (itemId) => {
    setError("");
    setMessage("");
    setActiveItemId((prev) => (prev === itemId ? null : itemId));
    setReviewForm({ rating: 5, review_text: "", images: [] });
  };

  const submitReview = async (productId, itemId, e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const payload = new FormData();
      payload.append("rating", String(reviewForm.rating));
      payload.append("review_text", reviewForm.review_text);
      Array.from(reviewForm.images || []).forEach((img) => payload.append("images", img));

      await apiClient.post(`/products/${productId}/reviews/`, payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setMessage("Review submitted successfully.");
      setActiveItemId(null);
      setReviewForm({ rating: 5, review_text: "", images: [] });
    } catch (err) {
      const data = err?.response?.data;
      if (typeof data === "string") {
        setError(data);
      } else if (data?.detail) {
        setError(data.detail);
      } else if (data?.non_field_errors?.[0]) {
        setError(data.non_field_errors[0]);
      } else {
        const key = data ? Object.keys(data)[0] : null;
        setError(key ? String(Array.isArray(data[key]) ? data[key][0] : data[key]) : "Unable to submit review.");
      }
      setActiveItemId(itemId);
    }
  };

  if (loading) return <div className="p-6">Loading your orders...</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">My Orders</h1>
      {message && <p className="mt-3 rounded bg-green-50 p-3 text-green-700">{message}</p>}
      {error && <p className="mt-3 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="mt-4 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl bg-white p-4 shadow">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">Order #{order.order_number || order.id}</p>
              <p className="text-sm text-gray-600">{fmtDate(order.created_at)}</p>
            </div>
            <p className="mt-1 text-sm">
              Overall status: <span className="font-medium">{order.status}</span>
            </p>
            <p className="text-sm text-gray-700">
              Contact: <span className="font-medium">{order.customer_name} ({order.customer_email})</span>
            </p>
            <p className="text-sm text-gray-700">
              Phone: <span className="font-medium">{order.shipping_phone || "-"}</span>
            </p>
            <p className="text-sm text-gray-700">
              Shipping Address: <span className="font-medium">{order.shipping_address || "-"}</span>
            </p>
            <p className="text-sm">
              Total: <span className="font-medium">${Number(order.total_price).toFixed(2)}</span>
            </p>
            <div className="mt-3 space-y-2">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded border p-3 ${item.status === "DELIVERED" ? "cursor-pointer hover:bg-gray-50" : ""}`}
                  onClick={() => item.status === "DELIVERED" && openReviewForm(item.id)}
                >
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-sm text-gray-700">
                    Vendor: {item.vendor_name} | Qty: {item.quantity} | Item status: {item.status}
                  </p>
                  <p className="text-sm text-gray-700">Line total: ${Number(item.line_total).toFixed(2)}</p>
                  {item.status === "DELIVERED" && (
                    <p className="mt-1 text-sm text-brand-700 underline">Click to add your review</p>
                  )}
                  {activeItemId === item.id && (
                    <form
                      className="mt-3 grid gap-2 rounded bg-gray-50 p-3"
                      onClick={(ev) => ev.stopPropagation()}
                      onSubmit={(ev) => submitReview(item.product, item.id, ev)}
                    >
                      <select
                        className="rounded border p-2"
                        value={reviewForm.rating}
                        onChange={(ev) => setReviewForm({ ...reviewForm, rating: Number(ev.target.value) })}
                      >
                        <option value={5}>5 - Excellent</option>
                        <option value={4}>4 - Good</option>
                        <option value={3}>3 - Average</option>
                        <option value={2}>2 - Poor</option>
                        <option value={1}>1 - Bad</option>
                      </select>
                      <textarea
                        className="rounded border p-2"
                        rows={3}
                        placeholder="Write your review"
                        value={reviewForm.review_text}
                        onChange={(ev) => setReviewForm({ ...reviewForm, review_text: ev.target.value })}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(ev) => setReviewForm({ ...reviewForm, images: ev.target.files || [] })}
                      />
                      <div className="flex gap-2">
                        <button className="rounded bg-brand-600 px-3 py-1 text-white" type="submit">Submit</button>
                        <button className="rounded border px-3 py-1" type="button" onClick={() => setActiveItemId(null)}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {!orders.length && <div className="rounded bg-white p-4 shadow text-gray-600">No orders placed yet.</div>}
      </div>
    </div>
  );
}
