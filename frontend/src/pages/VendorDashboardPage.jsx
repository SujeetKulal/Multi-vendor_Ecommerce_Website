import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DollarSign,
  Edit2,
  Loader2,
  Package,
  PlusCircle,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import apiClient from "../api/client";
import { formatPrice, resolveImageUrl } from "../utils/product";

function CountUpNumber({ value, prefix = "", suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 900;
    let frame;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return `${prefix}${Number(display).toFixed(decimals)}${suffix}`;
}

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
  const [activeTab, setActiveTab] = useState("overview");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    sale_price: "",
    category: "",
    stock: "",
    image: null
  });

  const customPreviewRef = useRef(null);

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
      setBulkQuantities(Object.fromEntries(productList.map((p) => [p.id, ""])));
      setSelectedProductIds(Object.fromEntries(productList.map((p) => [p.id, false])));
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || "Unable to load vendor dashboard.");
    }
  };

  useEffect(() => {
    loadVendorData();
  }, []);

  useEffect(() => {
    return () => {
      if (customPreviewRef.current) URL.revokeObjectURL(customPreviewRef.current);
    };
  }, []);

  const closeModal = () => {
    setIsProductModalOpen(false);
    setEditingProductId(null);
    setForm({
      name: "",
      description: "",
      price: "",
      sale_price: "",
      category: "",
      stock: "",
      image: null
    });
    setImagePreview("");
    if (customPreviewRef.current) {
      URL.revokeObjectURL(customPreviewRef.current);
      customPreviewRef.current = null;
    }
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

      closeModal();
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

  const startCreate = () => {
    setEditingProductId(null);
    setForm({
      name: "",
      description: "",
      price: "",
      sale_price: "",
      category: "",
      stock: "",
      image: null
    });
    setImagePreview("");
    setIsProductModalOpen(true);
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
    setImagePreview(product.image ? resolveImageUrl(product.image) : "");
    setIsProductModalOpen(true);
  };

  const onImageChange = (file) => {
    setForm((prev) => ({ ...prev, image: file || null }));
    if (customPreviewRef.current) {
      URL.revokeObjectURL(customPreviewRef.current);
      customPreviewRef.current = null;
    }
    if (file) {
      const obj = URL.createObjectURL(file);
      customPreviewRef.current = obj;
      setImagePreview(obj);
    } else if (!editingProductId) {
      setImagePreview("");
    }
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

  const pendingOrdersCount = orderItems.filter((i) => i.status === "PROCESSING").length;
  const recentOrders = [...orderItems].slice(0, 3);

  const productModalFields = ["name", "category", "price", "sale_price", "stock", "description", "image"];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "products", label: "Product Management" },
    { key: "fulfillment", label: "Order Fulfillment" },
  ];

  if (!profile) return <div className="p-6">Loading vendor data...</div>;

  if (!profile.is_approved) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-3xl border border-amber-200/60 bg-white/65 p-8 text-center shadow-2xl backdrop-blur-md"
        >
          <motion.div
            animate={{ y: [0, -6, 0], rotate: [0, -3, 3, 0] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700"
          >
            <ShieldAlert size={30} />
          </motion.div>
          <h1 className="text-2xl font-semibold text-slate-900">Pending Approval</h1>
          <p className="mt-2 text-sm text-slate-700">Your store is currently under review by our admins.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Vendor Control Center</h1>
          <p className="mt-1 text-sm text-slate-600">{profile.store_name}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-900/20 hover:bg-indigo-500"
          onClick={startCreate}
        >
          <PlusCircle size={16} /> Add New Product
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${activeTab === tab.key ? "bg-indigo-600 text-white" : "bg-white/60 text-slate-700 hover:bg-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <section className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-12">
            <div className="rounded-2xl border border-white/40 bg-white/20 p-5 shadow-xl backdrop-blur-md md:col-span-4">
              <p className="inline-flex items-center gap-2 text-sm text-slate-600"><DollarSign size={16} /> Total Sales</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                <CountUpNumber value={Number(financials?.total_sales || 0)} prefix="$" decimals={2} />
              </p>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/20 p-5 shadow-xl backdrop-blur-md md:col-span-4">
              <p className="inline-flex items-center gap-2 text-sm text-slate-600"><Package size={16} /> Active Products</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                <CountUpNumber value={products.length} />
              </p>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/20 p-5 shadow-xl backdrop-blur-md md:col-span-4">
              <p className="inline-flex items-center gap-2 text-sm text-slate-600"><ShoppingCart size={16} /> Pending Orders</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                <CountUpNumber value={pendingOrdersCount} />
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/40 bg-white/20 p-4 shadow-xl backdrop-blur-md">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[580px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-2">Product</th>
                    <th className="pb-2">Qty</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((item) => (
                    <tr key={item.id} className="border-t border-white/40 text-slate-700">
                      <td className="py-2">{item.product_name}</td>
                      <td className="py-2">{item.quantity}</td>
                      <td className="py-2">{item.customer_name || item.customer_email}</td>
                      <td className="py-2">{item.status}</td>
                    </tr>
                  ))}
                  {!recentOrders.length && (
                    <tr>
                      <td className="py-3 text-slate-500" colSpan={4}>No recent orders.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeTab === "products" && (
        <section className="mt-5 space-y-5">
          <div className="rounded-2xl border border-white/40 bg-white/20 p-4 shadow-xl backdrop-blur-md">
            <h2 className="text-lg font-semibold text-slate-900">Inventory</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-2">Image</th>
                    <th className="pb-2">Product</th>
                    <th className="pb-2">Price</th>
                    <th className="pb-2">Stock</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const inStock = Number(p.stock) > 0;
                    const low = Number(p.stock) > 0 && Number(p.stock) <= 5;
                    return (
                      <tr key={p.id} className="border-t border-white/40 text-slate-700">
                        <td className="py-2">
                          <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-100">
                            {p.image ? (
                              <img src={resolveImageUrl(p.image)} alt={p.name} className="h-full w-full object-contain p-1" />
                            ) : null}
                          </div>
                        </td>
                        <td className="py-2">
                          <p className="font-medium text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">{categoryLabel(p.category || "other")}</p>
                        </td>
                        <td className="py-2">${formatPrice(p.effective_price)}</td>
                        <td className="py-2">{p.stock}</td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${!inStock ? "bg-rose-100 text-rose-700" : low ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {!inStock ? "Out of stock" : low ? "Low stock" : "In stock"}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            <button className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white/70 px-2 py-1 hover:bg-white" onClick={() => startEdit(p)}>
                              <Edit2 size={13} /> Edit
                            </button>
                            <button className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-rose-700 hover:bg-rose-100" onClick={() => deleteProduct(p.id)}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!products.length && (
                    <tr>
                      <td className="py-3 text-slate-500" colSpan={6}>No products yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-white/40 bg-white/20 p-4 shadow-xl backdrop-blur-md">
            <h2 className="text-lg font-semibold text-slate-900">Bulk Inventory Update</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select className="rounded-lg border border-slate-300 bg-white/80 p-2 text-sm" value={bulkMode} onChange={(e) => setBulkMode(e.target.value)}>
                <option value="set">Set stock to value</option>
                <option value="increment">Increase stock by value</option>
              </select>
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500" onClick={submitBulkStockUpdate}>
                Apply Bulk Update
              </button>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-2">Select</th>
                    <th className="pb-2">Product</th>
                    <th className="pb-2">Current Stock</th>
                    <th className="pb-2">{bulkMode === "set" ? "New Stock" : "Increase By"}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-white/40 text-slate-700">
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={!!selectedProductIds[p.id]}
                          onChange={(e) => setSelectedProductIds({ ...selectedProductIds, [p.id]: e.target.checked })}
                        />
                      </td>
                      <td className="py-2">{p.name}</td>
                      <td className="py-2">{p.stock}</td>
                      <td className="py-2">
                        <input
                          className="w-28 rounded border border-slate-300 bg-white/80 p-1"
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

            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700">Low Stock Alerts</p>
              <div className="mt-2 space-y-1">
                {lowStockProducts.map((p) => (
                  <p key={p.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {p.name}: only {p.stock} left
                  </p>
                ))}
                {!lowStockProducts.length && <p className="text-sm text-slate-500">No low stock alerts.</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "fulfillment" && (
        <section className="mt-5 space-y-3">
          {orderItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/40 bg-white/20 p-4 shadow-lg backdrop-blur-md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{item.product_name}</p>
                  <p className="text-sm text-slate-700">Qty: {item.quantity} | Status: {item.status}</p>
                  <p className="mt-2 text-sm text-slate-700">Customer: {item.customer_name} ({item.customer_email})</p>
                  <p className="text-sm text-slate-700">Contact: {item.shipping_phone}</p>
                  <p className="text-sm text-slate-700">Address: {item.shipping_address}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "PROCESSING", label: "Processing" },
                    { value: "SHIPPED", label: "Shipped" },
                    { value: "DELIVERED", label: "Delivered" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateItemStatus(item.id, opt.value)}
                      className={`rounded-lg px-3 py-1.5 text-sm transition ${item.status === opt.value ? "bg-indigo-600 text-white" : "bg-white/70 text-slate-700 hover:bg-white"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {!orderItems.length && (
            <div className="rounded-2xl border border-white/40 bg-white/20 p-5 text-slate-600 shadow-lg backdrop-blur-md">
              No vendor order items yet.
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {isProductModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-slate-900/40"
              onClick={closeModal}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="fixed right-0 top-0 z-[71] flex h-full w-full max-w-lg flex-col border-l border-white/30 bg-white/90 p-5 shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">{editingProductId ? "Edit Product" : "Add New Product"}</h2>
                <button className="rounded-lg p-1 text-slate-600 hover:bg-slate-100" onClick={closeModal}>
                  <X size={18} />
                </button>
              </div>

              <motion.form
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                className="mt-4 grid flex-1 gap-3 overflow-y-auto pr-1"
                onSubmit={handleProductSubmit}
              >
                {productModalFields.map((field) => (
                  <motion.div key={field} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
                    {field === "category" && (
                      <select className="w-full rounded-lg border border-slate-300 bg-white p-2.5" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{categoryLabel(c)}</option>
                        ))}
                      </select>
                    )}

                    {field === "name" && (
                      <input className="w-full rounded-lg border border-slate-300 bg-white p-2.5" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    )}

                    {field === "price" && (
                      <input className="w-full rounded-lg border border-slate-300 bg-white p-2.5" placeholder="Price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                    )}

                    {field === "sale_price" && (
                      <input className="w-full rounded-lg border border-slate-300 bg-white p-2.5" placeholder="Sale Price (optional)" type="number" min="0" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
                    )}

                    {field === "stock" && (
                      <input className="w-full rounded-lg border border-slate-300 bg-white p-2.5" placeholder="Stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
                    )}

                    {field === "description" && (
                      <textarea className="w-full rounded-lg border border-slate-300 bg-white p-2.5" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                    )}

                    {field === "image" && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                        <label className="inline-flex cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500">
                          Upload Image
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageChange(e.target.files?.[0] || null)} />
                        </label>
                        <div className="mt-3 flex h-40 items-center justify-center overflow-hidden rounded-lg bg-white">
                          {imagePreview ? <img src={imagePreview} alt="Preview" className="h-full w-full object-contain p-2" /> : <p className="text-sm text-slate-500">Image preview</p>}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}

                <button className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-white hover:bg-indigo-500" type="submit" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {saving ? "Saving..." : editingProductId ? "Update Product" : "Create Product"}
                </button>
              </motion.form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
