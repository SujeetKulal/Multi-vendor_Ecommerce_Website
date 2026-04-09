import { useEffect, useState } from "react";
import apiClient from "../api/client";
import { formatPrice } from "../utils/product";

export default function VendorDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [categories, setCategories] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [bulkMode, setBulkMode] = useState("set");
  const [bulkQuantities, setBulkQuantities] = useState({});
  const [selectedProductIds, setSelectedProductIds] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    sale_price: "",
    category: "",
    stock: "",
    image: null
  });

  const loadVendorData = async () => {
    setError("");
    try {
      const profileRes = await apiClient.get("/vendors/me/");
      const vendorProfile = profileRes.data;
      setProfile(vendorProfile);

      if (!vendorProfile.is_approved) {
        setProducts([]);
        setOrderItems([]);
        setFinancials(null);
        return;
      }

      const [productRes, orderRes, financialRes, categoryRes, lowStockRes] = await Promise.all([
        apiClient.get("/products/mine/"),
        apiClient.get("/orders/vendor/items/"),
        apiClient.get("/orders/vendor/financials/"),
        apiClient.get("/products/categories/"),
        apiClient.get("/products/low_stock/", { params: { threshold: 5 } })
      ]);
      const productList = productRes.data.results || productRes.data;
      setProducts(productList);
      setOrderItems(orderRes.data.results || orderRes.data);
      setFinancials(financialRes.data);
      setCategories(categoryRes.data.categories || []);
      setLowStockProducts(lowStockRes.data.results || lowStockRes.data);
      setBulkQuantities(
        Object.fromEntries(productList.map((p) => [p.id, ""]))
      );
      setSelectedProductIds(
        Object.fromEntries(productList.map((p) => [p.id, false]))
      );
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || "Unable to load vendor dashboard.");
    }
  };

  useEffect(() => {
    loadVendorData();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      sale_price: "",
      category: "",
      stock: "",
      image: null
    });
    setEditingProductId(null);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("description", form.description);
      payload.append("price", form.price);
      if (form.sale_price !== "") payload.append("sale_price", form.sale_price);
      payload.append("category", form.category);
      payload.append("stock", form.stock);
      if (form.image) payload.append("image", form.image);

      if (editingProductId) {
        await apiClient.patch(`/products/${editingProductId}/`, payload, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setMessage("Product updated.");
      } else {
        await apiClient.post("/products/", payload, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setMessage("Product created.");
      }

      resetForm();
      await loadVendorData();
    } catch (err) {
      const data = err?.response?.data;
      if (!data) {
        setError("Unable to save product.");
      } else if (typeof data === "string") {
        setError(data);
      } else if (data.detail) {
        setError(data.detail);
      } else {
        const firstField = Object.keys(data)[0];
        const firstMessage = Array.isArray(data[firstField]) ? data[firstField][0] : data[firstField];
        setError(String(firstMessage || "Unable to save product."));
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (product) => {
    setEditingProductId(product.id);
    setForm({
      name: product.name ?? "",
      description: product.description ?? "",
      price: product.price ?? "",
      sale_price: product.sale_price ?? "",
      category: product.category ?? "",
      stock: product.stock ?? "",
      image: null
    });
  };

  const deleteProduct = async (productId) => {
    setError("");
    setMessage("");
    try {
      await apiClient.delete(`/products/${productId}/`);
      setMessage("Product deleted.");
      await loadVendorData();
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || "Unable to delete product.");
    }
  };

  const updateItemStatus = async (itemId, status) => {
    setError("");
    setMessage("");
    try {
      await apiClient.patch(`/orders/vendor/items/${itemId}/status/`, { status });
      setMessage("Order item status updated.");
      await loadVendorData();
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || "Unable to update item status.");
    }
  };

  const submitBulkStockUpdate = async () => {
    setError("");
    setMessage("");
    const selectedIds = Object.keys(selectedProductIds).filter((id) => selectedProductIds[id]);
    if (!selectedIds.length) {
      setError("Select at least one product for bulk update.");
      return;
    }

    const items = selectedIds.map((id) => ({
      product_id: Number(id),
      quantity: Number(bulkQuantities[id] || 0),
    }));
    try {
      const res = await apiClient.patch("/products/bulk_stock_update/", {
        mode: bulkMode,
        items,
      });
      setMessage(`Bulk stock update complete. Updated ${res.data.updated_count} products.`);
      await loadVendorData();
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || "Unable to run bulk stock update.");
    }
  };

  const categoryLabel = (value) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  if (error) return <div className="p-6 text-red-700">{error}</div>;
  if (!profile) return <div className="p-6">Loading vendor data...</div>;
  if (!profile.is_approved) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded bg-yellow-50 p-6 text-yellow-900">
        Your vendor account is pending approval.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Vendor Dashboard</h1>
      <p className="mt-1 text-gray-700">{profile.store_name}</p>

      {message && <p className="mt-4 rounded bg-green-50 p-3 text-green-700">{message}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="mt-2 text-xl font-bold">${Number(financials?.total_sales || 0).toFixed(2)}</p>
        </div>
        <div className="rounded bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Earnings</p>
          <p className="mt-2 text-xl font-bold">${Number(financials?.earnings || 0).toFixed(2)}</p>
        </div>
        <div className="rounded bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Items to Process</p>
          <p className="mt-2 text-xl font-bold">{orderItems.filter((i) => i.status === "PROCESSING").length}</p>
        </div>
      </div>

      <div className="mt-6 rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">{editingProductId ? "Edit Product" : "Add Product"}</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleProductSubmit}>
          <input className="rounded border p-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="rounded border p-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
          <input className="rounded border p-2" placeholder="Price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input className="rounded border p-2" placeholder="Sale Price (optional)" type="number" min="0" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
          <input className="rounded border p-2" placeholder="Stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
          <input className="rounded border p-2 md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <input className="md:col-span-2" type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })} />
          <div className="md:col-span-2 flex gap-2">
            <button className="rounded bg-brand-600 px-4 py-2 text-white" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingProductId ? "Update Product" : "Create Product"}
            </button>
            {editingProductId && (
              <button className="rounded border px-4 py-2" type="button" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="mt-6 rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">My Products</h2>
        <ul className="mt-3 space-y-2">
          {products.map((p) => (
            <li key={p.id} className="rounded border p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-gray-600">
                    ${formatPrice(p.effective_price)} | Stock: {p.stock} | Category: {p.category}
                  </p>
                  {p.sale_price && Number(p.sale_price) < Number(p.price) && (
                    <p className="text-xs text-red-600">
                      Sale: ${formatPrice(p.sale_price)} (orig ${formatPrice(p.price)})
                    </p>
                  )}
                  <p className="text-xs text-amber-600">
                    Rating: {Number(p.average_rating || 0).toFixed(1)} ({p.rating_count || 0} reviews)
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded border px-3 py-1" onClick={() => startEdit(p)}>Edit</button>
                  <button className="rounded bg-red-600 px-3 py-1 text-white" onClick={() => deleteProduct(p.id)}>Delete</button>
                </div>
              </div>
            </li>
          ))}
          {!products.length && <li className="rounded border p-3 text-gray-600">No products yet.</li>}
        </ul>
      </div>

      <div className="mt-6 rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Inventory Tools</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select className="rounded border p-2" value={bulkMode} onChange={(e) => setBulkMode(e.target.value)}>
            <option value="set">Set stock to value</option>
            <option value="increment">Increase stock by value</option>
          </select>
          <button className="rounded bg-brand-600 px-4 py-2 text-white" onClick={submitBulkStockUpdate}>
            Apply Bulk Stock Update
          </button>
        </div>
        <div className="mt-3 overflow-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-sm">
                <th className="border p-2">Select</th>
                <th className="border p-2">Product</th>
                <th className="border p-2">Current Stock</th>
                <th className="border p-2">{bulkMode === "set" ? "New Stock" : "Increase By"}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="border p-2">
                    <input
                      type="checkbox"
                      checked={!!selectedProductIds[p.id]}
                      onChange={(e) => setSelectedProductIds({ ...selectedProductIds, [p.id]: e.target.checked })}
                    />
                  </td>
                  <td className="border p-2">{p.name}</td>
                  <td className="border p-2">{p.stock}</td>
                  <td className="border p-2">
                    <input
                      className="w-28 rounded border p-1"
                      type="number"
                      min="0"
                      value={bulkQuantities[p.id] ?? ""}
                      onChange={(e) => setBulkQuantities({ ...bulkQuantities, [p.id]: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Low Stock Warnings</h2>
        <ul className="mt-3 space-y-2">
          {lowStockProducts.map((p) => (
            <li key={p.id} className="rounded border border-orange-200 bg-orange-50 p-3 text-orange-900">
              {p.name}: only {p.stock} left in stock
            </li>
          ))}
          {!lowStockProducts.length && <li className="rounded border p-3 text-gray-600">No low stock warnings.</li>}
        </ul>
      </div>

      <div className="mt-6 rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Order Fulfillment</h2>
        <ul className="mt-3 space-y-2">
          {orderItems.map((item) => (
            <li key={item.id} className="rounded border p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-sm text-gray-600">
                    Qty: {item.quantity} | Status: {item.status}
                  </p>
                  <p className="text-sm text-gray-700">
                    Customer: {item.customer_name} ({item.customer_email})
                  </p>
                  <p className="text-sm text-gray-700">
                    Contact: {item.shipping_phone}
                  </p>
                  <p className="text-sm text-gray-700">
                    Address: {item.shipping_address}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded border px-3 py-1" onClick={() => updateItemStatus(item.id, "PROCESSING")}>Processing</button>
                  <button className="rounded border px-3 py-1" onClick={() => updateItemStatus(item.id, "SHIPPED")}>Mark Shipped</button>
                  <button className="rounded border px-3 py-1" onClick={() => updateItemStatus(item.id, "DELIVERED")}>Delivered</button>
                </div>
              </div>
            </li>
          ))}
          {!orderItems.length && <li className="rounded border p-3 text-gray-600">No vendor order items yet.</li>}
        </ul>
      </div>
    </div>
  );
}
