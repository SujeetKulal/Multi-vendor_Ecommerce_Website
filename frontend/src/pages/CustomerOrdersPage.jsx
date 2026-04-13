import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronUp, PackageSearch, Star } from "lucide-react";
import apiClient from "../api/client";
import { resolveImageUrl } from "../utils/product";

const STATUS_STYLES = {
  PROCESSING: "bg-amber-100 text-amber-700 border-amber-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  SHIPPED: "bg-sky-100 text-sky-700 border-sky-200",
  DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-700 border-rose-200"
};

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [activeItemId, setActiveItemId] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
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
    setHoverRating(0);
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
      setHoverRating(0);
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

  const statusClass = (status) => STATUS_STYLES[status] || "bg-slate-100 text-slate-700 border-slate-200";

  if (loading) return <div className="p-6">Loading your orders...</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">My Orders</h1>
      <p className="mt-1 text-sm text-slate-600">Your purchase timeline and order details.</p>

      {message && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 space-y-4">
        {orders.map((order, index) => {
          const isExpanded = expandedOrderId === order.id;
          return (
            <motion.article
              key={order.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: index * 0.04, ease: "easeOut" }}
              className="rounded-2xl border border-white/35 bg-white/20 p-4 shadow-lg backdrop-blur-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">Order #{order.order_number || order.id}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600">
                    <CalendarDays size={13} /> {fmtDate(order.created_at)}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <p>Total: <span className="font-semibold text-slate-900">${Number(order.total_price).toFixed(2)}</span></p>
                <p>Contact: <span className="font-medium">{order.customer_name} ({order.customer_email})</span></p>
                <p>Phone: <span className="font-medium">{order.shipping_phone || "-"}</span></p>
                <p>Address: <span className="font-medium">{order.shipping_address || "-"}</span></p>
              </div>

              <button
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300/70 bg-white/60 px-3 py-1.5 text-sm text-slate-700 hover:bg-white/80"
                onClick={() => setExpandedOrderId((prev) => (prev === order.id ? null : order.id))}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />} View Items
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                    className="mt-4 overflow-hidden"
                  >
                    <div className="space-y-3">
                      {(order.items || []).map((item) => (
                        <div key={item.id} className="rounded-xl border border-white/50 bg-white/65 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                                {item.product_image ? (
                                  <img
                                    src={resolveImageUrl(item.product_image)}
                                    alt={item.product_name}
                                    className="h-full w-full object-contain p-1"
                                  />
                                ) : (
                                  <PackageSearch size={18} className="text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                              <p className="font-medium text-slate-900">{item.product_name}</p>
                              <p className="text-sm text-slate-700">
                                Vendor: {item.vendor_name} | Qty: {item.quantity} | Item status: {item.status}
                              </p>
                              <p className="text-sm text-slate-700">Line total: ${Number(item.line_total).toFixed(2)}</p>
                            </div>
                            </div>
                            {item.status === "DELIVERED" && (
                              <button
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-100"
                                onClick={() => openReviewForm(item.id)}
                              >
                                <Star size={13} /> Add Review
                              </button>
                            )}
                          </div>

                          {activeItemId === item.id && (
                            <form
                              className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
                              onSubmit={(ev) => submitReview(item.product, item.id, ev)}
                            >
                              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Your Rating</p>
                                <div className="mt-1 flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, idx) => {
                                    const starValue = idx + 1;
                                    const active = starValue <= (hoverRating || reviewForm.rating);
                                    return (
                                      <button
                                        key={`${item.id}-review-star-${starValue}`}
                                        type="button"
                                        className="rounded p-0.5 transition hover:scale-110"
                                        onMouseEnter={() => setHoverRating(starValue)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setReviewForm({ ...reviewForm, rating: starValue })}
                                      >
                                        <Star size={20} className={active ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                                      </button>
                                    );
                                  })}
                                  <span className="ml-1 text-xs font-medium text-slate-600">{reviewForm.rating}/5</span>
                                </div>
                              </div>

                              <textarea
                                className="rounded border p-2"
                                rows={3}
                                placeholder="Write your review"
                                value={reviewForm.review_text}
                                onChange={(ev) => setReviewForm({ ...reviewForm, review_text: ev.target.value })}
                              />

                              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3">
                                <label htmlFor={`review-files-${item.id}`} className="inline-flex cursor-pointer items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500">
                                  Choose Images
                                </label>
                                <input
                                  id={`review-files-${item.id}`}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={(ev) => setReviewForm({ ...reviewForm, images: Array.from(ev.target.files || []) })}
                                />
                                <p className="mt-2 text-xs text-slate-500">
                                  {reviewForm.images?.length ? `${reviewForm.images.length} file(s) selected` : "PNG, JPG up to your browser limit"}
                                </p>
                                {!!reviewForm.images?.length && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {reviewForm.images.map((file, idx) => (
                                      <span key={`${file.name}-${idx}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                                        {file.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <button className="rounded bg-indigo-600 px-3 py-1 text-sm text-white" type="submit">Submit</button>
                                <button
                                  className="rounded border px-3 py-1 text-sm"
                                  type="button"
                                  onClick={() => {
                                    setHoverRating(0);
                                    setActiveItemId(null);
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      ))}

                      {!order.items?.length && (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white/45 p-4 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-2"><PackageSearch size={16} /> No items found for this order.</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}

        {!orders.length && (
          <div className="rounded-2xl border border-white/35 bg-white/20 p-6 text-slate-600 shadow-lg backdrop-blur-md">
            No orders placed yet.
          </div>
        )}
      </div>
    </div>
  );
}
