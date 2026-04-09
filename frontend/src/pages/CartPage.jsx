import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import apiClient from "../api/client";
import { resolveImageUrl } from "../utils/product";

const SHIPPING_FLAT = 0;

export default function CartPage() {
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem("cart_items") || "[]"));
  const [thumbnails, setThumbnails] = useState({});
  const [successToast, setSuccessToast] = useState(null);
  const [error, setError] = useState("");
  const [profilePrompt, setProfilePrompt] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const toastTimerRef = useRef(null);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items]
  );
  const total = subtotal + SHIPPING_FLAT;

  useEffect(() => {
    let ignore = false;

    const loadThumbs = async () => {
      const missingIds = items
        .map((item) => item.product_id)
        .filter((id) => id && !thumbnails[id]);

      if (!missingIds.length) return;

      const results = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const { data } = await apiClient.get(`/products/${id}/`);
            return [id, data?.image ? resolveImageUrl(data.image) : null];
          } catch {
            return [id, null];
          }
        })
      );

      if (ignore) return;
      setThumbnails((prev) => ({
        ...prev,
        ...Object.fromEntries(results),
      }));
    };

    loadThumbs();

    return () => {
      ignore = true;
    };
  }, [items, thumbnails]);

  const persist = (next) => {
    setItems(next);
    localStorage.setItem("cart_items", JSON.stringify(next));
  };

  const updateQty = (productId, qty) => {
    const safeQty = Math.max(1, qty);
    const next = items.map((item) => (item.product_id === productId ? { ...item, quantity: safeQty } : item));
    persist(next);
  };

  const removeItem = (productId) => {
    const next = items.filter((item) => item.product_id !== productId);
    persist(next);
  };

  const checkout = async () => {
    setError("");
    setProfilePrompt(null);
    setSuccessToast(null);
    setCheckingOut(true);
    try {
      const payload = { items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })) };
      const { data } = await apiClient.post("/orders/checkout/", payload);
      setItems([]);
      localStorage.removeItem("cart_items");
      setSuccessToast({
        title: "Order Confirmed",
        subtitle: `Order #${data.order_number || data.id} placed successfully.`
      });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.code === "profile_incomplete") {
        setProfilePrompt({
          detail: data?.detail || "Please complete your profile before checkout.",
          missing: data?.missing_fields || []
        });
      } else {
        setError(data?.detail || "Checkout failed. Please try again.");
      }
    } finally {
      setCheckingOut(false);
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="fixed right-4 top-24 z-[60] w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-emerald-200/70 bg-white/90 p-3 text-emerald-900 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-emerald-100 p-1.5 text-emerald-700">
                <CheckCircle2 size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{successToast.title}</p>
                <p className="text-xs text-emerald-800/85">{successToast.subtitle}</p>
                <Link
                  to="/orders"
                  onClick={() => setSuccessToast(null)}
                  className="mt-2 inline-flex rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-500"
                >
                  View My Orders
                </Link>
              </div>
            </div>
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 3.3, ease: "linear" }}
              className="mt-3 h-1 rounded-full bg-emerald-500/70"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {profilePrompt && (
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="fixed right-4 top-24 z-[61] w-[min(92vw,25rem)] overflow-hidden rounded-2xl border border-amber-200/80 bg-white/90 p-3 text-amber-900 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-amber-100 p-1.5 text-amber-700">
                <AlertTriangle size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Profile Incomplete</p>
                <p className="text-xs text-amber-900/85">{profilePrompt.detail}</p>
                {!!profilePrompt.missing.length && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profilePrompt.missing.map((field) => (
                      <span key={field} className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                        {field}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  to="/profile"
                  onClick={() => setProfilePrompt(null)}
                  className="mt-2 inline-flex rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-amber-500"
                >
                  Complete Profile
                </Link>
              </div>
            </div>
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 4, ease: "linear" }}
              className="mt-3 h-1 rounded-full bg-amber-500/70"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Your Cart</h1>
      <p className="mt-1 text-sm text-slate-600">Review your items and place your order.</p>
      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem]">
        <section className="rounded-3xl border border-white/35 bg-white/15 p-4 shadow-xl backdrop-blur-md sm:p-5">
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <AnimatePresence>
              {items.map((item) => (
                <motion.article
                  key={item.product_id}
                  layout
                  initial={{ opacity: 0, x: 26 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -56, scale: 0.97 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  className="rounded-2xl border border-white/50 bg-white/65 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                      {thumbnails[item.product_id] ? (
                        <img src={thumbnails[item.product_id]} alt={item.name} className="h-full w-full object-contain p-1" />
                      ) : (
                        <ShoppingBag size={20} className="text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-600">${Number(item.price).toFixed(2)} each</p>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 transition hover:bg-slate-50"
                          onClick={() => updateQty(item.product_id, item.quantity - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold text-slate-800">{item.quantity}</span>
                        <button
                          className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 transition hover:bg-slate-50"
                          onClick={() => updateQty(item.product_id, item.quantity + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">${(Number(item.price) * item.quantity).toFixed(2)}</p>
                      <button
                        className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-600 transition hover:bg-rose-50"
                        onClick={() => removeItem(item.product_id)}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>

            {!items.length && (
              <div className="rounded-2xl border border-white/45 bg-white/60 p-8 text-center text-slate-600">
                Your cart is empty.
              </div>
            )}
          </div>
        </section>

        <aside className="h-fit rounded-3xl border border-white/35 bg-white/15 p-5 shadow-xl backdrop-blur-md lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span>{SHIPPING_FLAT > 0 ? `$${SHIPPING_FLAT.toFixed(2)}` : "Free"}</span>
            </div>
          </div>
          <div className="mt-4 border-t border-white/40 pt-4">
            <div className="flex items-center justify-between text-base font-bold text-slate-900">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <button
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-900/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-400"
            onClick={checkout}
            disabled={!items.length || checkingOut}
          >
            {checkingOut ? <Loader2 size={18} className="animate-spin" /> : null}
            {checkingOut ? "Processing Order..." : "Proceed to Checkout"}
          </button>
        </aside>
      </div>
    </div>
  );
}
