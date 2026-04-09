import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "../api/client";
import { formatPrice, resolveImageUrl } from "../utils/product";

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  const addToCart = () => {
    if (!product) return;
    const raw = localStorage.getItem("cart_items");
    const cart = raw ? JSON.parse(raw) : [];
    const existing = cart.find((i) => i.product_id === product.id);
    const priceToStore = product.effective_price || product.price;
    if (existing) existing.quantity += 1;
    else cart.push({ product_id: product.id, name: product.name, price: priceToStore, quantity: 1 });
    localStorage.setItem("cart_items", JSON.stringify(cart));
    setMessage("Added to cart.");
  };

  const isOnSale = useMemo(() => {
    if (!product) return false;
    return product.sale_price && Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price);
  }, [product]);

  if (error) return <div className="p-6 text-red-700">{error}</div>;
  if (!product) return <div className="p-6">Loading product...</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Link className="text-sm text-brand-700 underline" to="/">Back to products</Link>
      <div className="mt-4 grid gap-6 rounded-xl bg-white p-6 shadow md:grid-cols-2">
        <div className="relative">
          {isOnSale && <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">SALE</span>}
          {product.image ? (
            <img src={resolveImageUrl(product.image)} alt={product.name} className="h-80 w-full rounded object-cover" />
          ) : (
            <div className="flex h-80 w-full items-center justify-center rounded bg-gray-100 text-sm text-gray-500">No image</div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="mt-2 text-sm text-gray-600">Sold by: {product.vendor_name}</p>
          <p className="mt-1 text-sm text-amber-600">
            {Number(product.average_rating || 0).toFixed(1)} / 5 ({product.rating_count || 0} reviews)
          </p>
          <div className="mt-4 flex items-center gap-2">
            {isOnSale ? (
              <>
                <p className="text-2xl font-bold text-red-600">${formatPrice(product.sale_price)}</p>
                <p className="text-sm text-gray-500 line-through">${formatPrice(product.price)}</p>
              </>
            ) : (
              <p className="text-2xl font-bold">${formatPrice(product.price)}</p>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-700">Stock: {product.stock > 0 ? product.stock : "Out of stock"}</p>
          <p className="mt-4 whitespace-pre-wrap text-gray-800">{product.description}</p>
          <button
            className="mt-6 rounded bg-brand-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            onClick={addToCart}
            disabled={product.stock <= 0}
          >
            Add to Cart
          </button>
          {message && <p className="mt-3 text-green-700">{message}</p>}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Customer Reviews</h2>
        <div className="mt-3 space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded border p-3">
              <p className="font-medium">{r.customer_email}</p>
              <p className="text-sm text-amber-600">Rating: {r.rating}/5</p>
              {r.review_text && <p className="mt-2 text-sm text-gray-700">{r.review_text}</p>}
              {!!r.images?.length && (
                <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-5">
                  {r.images.map((img) => (
                    <img key={img.id} src={resolveImageUrl(img.image)} alt="Review" className="h-24 w-full rounded object-cover" />
                  ))}
                </div>
              )}
            </div>
          ))}
          {!reviews.length && <p className="text-sm text-gray-600">No reviews yet.</p>}
        </div>
      </div>
    </div>
  );
}
