import { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const load = async () => {
    setError("");
    try {
      const [metricsRes, vendorsRes, usersRes, ordersRes] = await Promise.all([
        apiClient.get("/analytics/admin-metrics/"),
        apiClient.get("/vendors/"),
        apiClient.get("/accounts/admin/users/", { params: { search, role: roleFilter || undefined } }),
        apiClient.get("/orders/admin/all/")
      ]);
      setMetrics(metricsRes.data);
      setVendors(vendorsRes.data.results || vendorsRes.data);
      setUsers(usersRes.data.results || usersRes.data);
      setOrders(ordersRes.data.results || ordersRes.data);
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, roleFilter]);

  const clearFlash = () => {
    setError("");
    setMessage("");
  };

  const toggleApproval = async (vendor) => {
    clearFlash();
    try {
      await apiClient.patch(`/vendors/${vendor.id}/approve/`, { is_approved: !vendor.is_approved });
      setVendors((prev) => prev.map((v) => (v.id === vendor.id ? { ...v, is_approved: !v.is_approved } : v)));
      setMessage("Vendor approval updated.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update vendor approval.");
    }
  };

  const updateUser = async (userId, payload) => {
    clearFlash();
    try {
      await apiClient.patch(`/accounts/admin/users/${userId}/`, payload);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...payload } : u)));
      setMessage("User updated.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update user.");
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    clearFlash();
    try {
      await apiClient.patch(`/orders/admin/${orderId}/status/`, { status });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      setMessage("Order status updated.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update order status.");
    }
  };

  const pendingVendors = useMemo(() => vendors.filter((v) => !v.is_approved).length, [vendors]);

  if (loading) return <div className="p-6">Loading analytics...</div>;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      {message && <p className="mt-4 rounded bg-green-50 p-3 text-green-700">{message}</p>}
      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <Card label="Revenue" value={`$${Number(metrics?.total_revenue || 0).toFixed(2)}`} />
        <Card label="Orders" value={metrics?.total_orders || 0} />
        <Card label="Users" value={metrics?.total_users || 0} />
        <Card label="Active Vendors" value={metrics?.active_vendors || 0} />
        <Card label="Pending Vendors" value={pendingVendors} />
      </div>

      <section className="mt-6 rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Vendor Requests</h2>
        <ul className="mt-3 space-y-2">
          {vendors.map((v) => (
            <li key={v.id} className="flex items-center justify-between rounded border p-2">
              <span>
                {v.store_name} ({v.email}) - {v.is_approved ? "Approved" : "Pending"}
              </span>
              <button className="rounded bg-brand-600 px-3 py-1 text-white" onClick={() => toggleApproval(v)}>
                {v.is_approved ? "Revoke" : "Approve"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded bg-white p-4 shadow">
        <div className="flex flex-wrap items-end gap-3">
          <h2 className="text-lg font-semibold">User Management</h2>
          <input
            className="rounded border p-2"
            placeholder="Search by email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="rounded border p-2" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="VENDOR">VENDOR</option>
            <option value="CUSTOMER">CUSTOMER</option>
          </select>
        </div>

        <div className="mt-3 overflow-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-sm">
                <th className="border p-2">Email</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">Role</th>
                <th className="border p-2">Active</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="text-sm">
                  <td className="border p-2">{u.email}</td>
                  <td className="border p-2">{`${u.first_name || ""} ${u.last_name || ""}`.trim() || "-"}</td>
                  <td className="border p-2">
                    <select
                      className="rounded border p-1"
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="VENDOR">VENDOR</option>
                      <option value="CUSTOMER">CUSTOMER</option>
                    </select>
                  </td>
                  <td className="border p-2">{u.is_active ? "Yes" : "No"}</td>
                  <td className="border p-2">
                    <button
                      className="rounded border px-2 py-1"
                      onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td className="border p-2 text-gray-600" colSpan={5}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">All Orders</h2>
        <div className="mt-3 space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Order #{order.order_number || order.id} - {order.customer_email || `User ${order.customer}`}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Status:</span>
                  <select
                    className="rounded border p-1"
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="PARTIALLY_SHIPPED">PARTIALLY_SHIPPED</option>
                    <option value="SHIPPED">SHIPPED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600">Total: ${Number(order.total_price).toFixed(2)}</p>
              <ul className="mt-2 space-y-1">
                {order.items.map((item) => (
                  <li key={item.id} className="text-sm text-gray-700">
                    {item.product_name} | {item.vendor_name} | Qty {item.quantity} | {item.status}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!orders.length && <p className="text-sm text-gray-600">No orders found.</p>}
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded bg-white p-4 shadow">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}
