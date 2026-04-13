import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, CircleDollarSign, Funnel, ShoppingBag, Star, Tag } from "lucide-react";
import apiClient from "../api/client";
import { formatPrice, resolveImageUrl } from "../utils/product";

export default function HomePage() {
  const heroText = "Curated Finds For Everyday Life";
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [toast, setToast] = useState(null);
  const [typedTitle, setTypedTitle] = useState("");
  const toastTimerRef = useRef(null);

  const gridContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const gridItem = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      const [productsRes, categoriesRes] = await Promise.all([
        apiClient.get("/products/", { params: { search, category: category || undefined } }),
        apiClient.get("/products/categories/")
      ]);

      let next = productsRes.data.results || productsRes.data;
      if (sort === "price_low") {
        next = [...next].sort((a, b) => Number(a.effective_price) - Number(b.effective_price));
      } else if (sort === "price_high") {
        next = [...next].sort((a, b) => Number(b.effective_price) - Number(a.effective_price));
      } else if (sort === "rating") {
        next = [...next].sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0));
      }

      setProducts(next);
      setCategories(categoriesRes.data.categories || []);
    };
    fetchProducts();
  }, [search, category, sort]);

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    let idx = 0;
    const timer = setInterval(() => {
      idx += 1;
      setTypedTitle(heroText.slice(0, idx));
      if (idx >= heroText.length) clearInterval(timer);
    }, 45);
    return () => clearInterval(timer);
  }, []);

  const addToCart = (product) => {
    const raw = localStorage.getItem("cart_items");
    const cart = raw ? JSON.parse(raw) : [];
    const existing = cart.find((i) => i.product_id === product.id);
    const priceToStore = product.effective_price || product.price;
    if (existing) existing.quantity += 1;
    else cart.push({ product_id: product.id, name: product.name, price: priceToStore, quantity: 1 });
    localStorage.setItem("cart_items", JSON.stringify(cart));
    setToast({
      title: "Added to cart",
      subtitle: `${product.name} is ready for checkout`
    });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  };

  const categoryLabel = (value) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <div className="nordic-canvas mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="nordic-blob nordic-blob-peach" />
      <div className="nordic-blob nordic-blob-sage" />
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

      <section className="relative z-10 mb-8 rounded-3xl border border-white/55 bg-white/45 p-6 shadow-[0_24px_60px_-40px_rgba(120,113,108,0.45)] backdrop-blur-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Discover</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800 sm:text-4xl">
          {typedTitle}
          <span className="ml-0.5 inline-block h-[1.05em] w-[2px] animate-pulse bg-slate-500 align-middle" />
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Browse quality products from trusted vendors. Use filters to quickly narrow by category, price, and ratings.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <label className="group flex items-center gap-2 rounded-xl border border-stone-200/70 bg-white/70 px-3 py-2 focus-within:border-indigo-300/70 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.18)]">
            <ShoppingBag size={16} className="text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-stone-200/70 bg-white/70 px-3 py-2">
            <Funnel size={16} className="text-slate-500" />
            <select className="w-full bg-transparent text-sm text-slate-700 outline-none" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-stone-200/70 bg-white/70 px-3 py-2">
            <CircleDollarSign size={16} className="text-slate-500" />
            <select className="w-full bg-transparent text-sm text-slate-700 outline-none" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </label>
        </div>
      </section>

      <motion.div
        variants={gridContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 grid grid-cols-1 gap-5 md:grid-cols-12"
      >
        {products.map((p, index) => {
          const featured = index === 0;
          const ratingValue = Number(p.average_rating || 0);
          const ratingRounded = Math.round(ratingValue);
          return (
            <motion.article
              key={p.id}
              variants={gridItem}
              whileHover={{ y: -6 }}
              className={`group relative overflow-hidden rounded-3xl border border-white/65 bg-white/42 p-5 shadow-[0_26px_55px_-42px_rgba(120,113,108,0.5)] backdrop-blur-lg ${featured ? "md:col-span-8" : "md:col-span-4"}`}
            >
              {p.sale_price && Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price) && (
                <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50/70 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  <Tag size={12} />
                  Sale
                </span>
              )}
              <Link to={`/products/${p.id}`} className={`relative mx-auto block w-full overflow-hidden rounded-2xl border border-stone-200/60 bg-white ${featured ? "aspect-[4/3] max-w-[36rem]" : "aspect-square max-w-[19rem]"}`}>
                <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-0.5 rounded-full border border-stone-200/80 bg-white/85 px-2 py-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={`${p.id}-grid-star-${i}`}
                      size={11}
                      className={i < ratingRounded ? "fill-amber-400 text-amber-500" : "text-stone-300"}
                    />
                  ))}
                </div>
                {p.image ? (
                  <img
                    src={resolveImageUrl(p.image)}
                    alt={p.name}
                    className="h-full w-full object-contain p-5 transition duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
                    No image
                  </div>
                )}
              </Link>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className={`font-bold tracking-tight text-slate-900 ${featured ? "text-2xl" : "text-xl"}`}>{p.name}</h3>
                  <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-500">{p.vendor_name}</p>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="flex items-center gap-2">
                  {p.sale_price && Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price) ? (
                    <>
                      <p className="text-xl font-bold text-rose-600">${formatPrice(p.sale_price)}</p>
                      <p className="text-sm text-slate-500 line-through">${formatPrice(p.price)}</p>
                    </>
                  ) : (
                    <p className="text-xl font-bold text-slate-900">${formatPrice(p.price)}</p>
                  )}
                </div>
                {Number(p.stock) <= 5 && <p className="text-xs text-orange-700">Low stock</p>}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="inline-flex items-center gap-1 rounded-full border border-stone-300/80 bg-white/75 px-3 py-1.5 text-sm text-slate-700 hover:bg-white" to={`/products/${p.id}`}>
                  View Details <ArrowRight size={14} />
                </Link>
                <button
                  className="rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-600"
                  onClick={() => addToCart(p)}
                >
                  Add to Cart
                </button>
              </div>
            </motion.article>
          );
        })}
      </motion.div>

      {!products.length && (
        <div className="relative z-10 rounded-2xl border border-white/40 bg-white/35 p-8 text-center text-slate-600 backdrop-blur-md">
          No products found for your current filters.
        </div>
      )}
    </div>
  );
}
