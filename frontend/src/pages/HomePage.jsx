import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/client";
import { formatPrice, resolveImageUrl } from "../utils/product";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

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

  const addToCart = (product) => {
    const raw = localStorage.getItem("cart_items");
    const cart = raw ? JSON.parse(raw) : [];
    const existing = cart.find((i) => i.product_id === product.id);
    const priceToStore = product.effective_price || product.price;
    if (existing) existing.quantity += 1;
    else cart.push({ product_id: product.id, name: product.name, price: priceToStore, quantity: 1 });
    localStorage.setItem("cart_items", JSON.stringify(cart));
    setToast("Item added successfully");
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 1800);
  };

  const categoryLabel = (value) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-6">
      {toast && (
        <div className="mb-4 rounded bg-green-50 p-3 text-green-700">
          {toast}
        </div>
      )}
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full rounded border p-2" />
        <select className="rounded border p-2" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{categoryLabel(c)}</option>
          ))}
        </select>
        <select className="rounded border p-2" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="rating">Top Rated</option>
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="relative rounded-lg bg-white p-4 shadow">
            {p.sale_price && Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price) && (
              <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                SALE
              </span>
            )}
            {p.image ? (
              <img
                src={resolveImageUrl(p.image)}
                alt={p.name}
                className="mb-3 h-44 w-full rounded object-cover"
              />
            ) : (
              <div className="mb-3 flex h-44 w-full items-center justify-center rounded bg-gray-100 text-sm text-gray-500">
                No image
              </div>
            )}
            <h3 className="font-semibold">{p.name}</h3>
            <p className="mt-1 text-sm text-gray-600">{p.vendor_name}</p>
            <p className="mt-1 text-sm text-amber-600">
              Rating: {Number(p.average_rating || 0).toFixed(1)}/5 ({p.rating_count || 0})
            </p>
            <div className="mt-2 flex items-center gap-2">
              {p.sale_price && Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price) ? (
                <>
                  <p className="text-lg font-bold text-red-600">${formatPrice(p.sale_price)}</p>
                  <p className="text-sm text-gray-500 line-through">${formatPrice(p.price)}</p>
                </>
              ) : (
                <p className="text-lg font-bold">${formatPrice(p.price)}</p>
              )}
            </div>
            {Number(p.stock) <= 5 && (
              <p className="mt-1 text-xs text-orange-600">Low stock</p>
            )}
            <div className="mt-3 flex gap-2">
              <Link className="rounded border px-3 py-1" to={`/products/${p.id}`}>
                View Details
              </Link>
              <button className="rounded bg-brand-600 px-3 py-1 text-white" onClick={() => addToCart(p)}>
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
