import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ShoppingCart, Star, Store } from "lucide-react";
import apiClient from "../api/client";
import { formatPrice, resolveImageUrl } from "../utils/product";

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const load = async () => {
    setError("");
    try {
      const [productRes, reviewRes] = await Promise.all([
        apiClient.get(`/products/${id}/`),
        apiClient.get(`/products/${id}/reviews/`)
      ]);
      setProduct(productRes.data);
      setReviews(reviewRes.data || []);
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || "Unable to load product.");
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const addToCart = () => {
    if (!product) return;
    const raw = localStorage.getItem("cart_items");
    const cart = raw ? JSON.parse(raw) : [];
    const existing = cart.find((i) => i.product_id === product.id);
    const priceToStore = product.effective_price || product.price;
    if (existing) existing.quantity += 1;
    else cart.push({ product_id: product.id, name: product.name, price: priceToStore, quantity: 1 });
    localStorage.setItem("cart_items", JSON.stringify(cart));

    setToast({
      title: "Added to cart",
      subtitle: `${product.name} is in your cart`
    });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  };

  const isOnSale = useMemo(() => {
    if (!product) return false;
    return product.sale_price && Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price);
  }, [product]);

  if (error) return <div className="p-6 text-red-700">{error}</div>;
  if (!product) return <div className="p-6">Loading product...</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed right-4 top-24 z-[60] w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-emerald-200/70 bg-white/85 p-3 text-emerald-900 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-emerald-100 p-1.5 text-emerald-700">
                <CheckCircle2 size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold">{toast.title}</p>
                <p className="text-xs text-emerald-800/80">{toast.subtitle}</p>
                <Link
                  to="/cart"
                  onClick={() => setToast(null)}
                  className="mt-2 inline-flex items-center rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-500"
                >
                  View Cart
                </Link>
              </div>
            </div>
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 2.1, ease: "linear" }}
              className="mt-3 h-1 rounded-full bg-emerald-500/70"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Link className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white/70 text-slate-700 transition hover:bg-white" to="/" aria-label="Back to products">
        <ArrowLeft size={16} />
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mt-4 grid gap-6 rounded-3xl border border-white/35 bg-white/15 p-5 shadow-xl backdrop-blur-md md:grid-cols-2 md:p-7"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/45 bg-white/40 shadow-lg">
          {isOnSale && <span className="absolute left-3 top-3 z-10 rounded-full bg-rose-600 px-2 py-1 text-xs font-semibold text-white">SALE</span>}
          {product.image ? (
            <img src={resolveImageUrl(product.image)} alt={product.name} className="h-[24rem] w-full bg-white object-contain p-3" />
          ) : (
            <div className="flex h-[24rem] w-full items-center justify-center text-sm text-slate-500">No image</div>
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100/80 px-3 py-1 text-indigo-700">
              <Store size={14} /> {product.vendor_name}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-3 py-1 text-amber-700">
              <Star size={14} className="fill-amber-400 text-amber-500" />
              {Number(product.average_rating || 0).toFixed(1)} ({product.rating_count || 0} reviews)
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            {isOnSale ? (
              <>
                <p className="text-3xl font-bold text-rose-600">${formatPrice(product.sale_price)}</p>
                <p className="text-base text-slate-500 line-through">${formatPrice(product.price)}</p>
              </>
            ) : (
              <p className="text-3xl font-bold text-slate-900">${formatPrice(product.price)}</p>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-700">Stock: {product.stock > 0 ? product.stock : "Out of stock"}</p>

          <div className="mt-6 rounded-2xl border border-white/45 bg-white/55 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{product.description || "No description provided."}</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white shadow-lg shadow-indigo-900/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-400"
            onClick={addToCart}
            disabled={product.stock <= 0}
          >
            <ShoppingCart size={18} /> Add to Cart
          </motion.button>
        </div>
      </motion.section>

      <section className="mt-7 rounded-3xl border border-white/35 bg-white/15 p-5 shadow-lg backdrop-blur-md md:p-6">
        <h2 className="text-xl font-semibold text-slate-900">Customer Reviews</h2>
        <div className="mt-4 space-y-3">
          {reviews.map((r) => (
            <article key={r.id} className="rounded-2xl border border-white/45 bg-white/55 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                  {(r.customer_email || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{r.customer_email}</p>
                  <div className="mt-0.5 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={`${r.id}-star-${i}`}
                        size={14}
                        className={i < Number(r.rating || 0) ? "fill-amber-400 text-amber-500" : "text-slate-300"}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {r.review_text && <p className="mt-3 text-sm leading-6 text-slate-700">{r.review_text}</p>}

              {!!r.images?.length && (
                <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
                  {r.images.map((img) => (
                    <img key={img.id} src={resolveImageUrl(img.image)} alt="Review" className="h-20 w-full rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </article>
          ))}
          {!reviews.length && <p className="text-sm text-slate-600">No reviews yet.</p>}
        </div>
      </section>
    </div>
  );
}
