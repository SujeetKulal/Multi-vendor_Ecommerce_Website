import { useEffect, useState } from "react";
import apiClient from "../api/client";

export default function ProfilePage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    landmark: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const [meRes, shippingRes] = await Promise.all([
          apiClient.get("/accounts/me/"),
          apiClient.get("/accounts/shipping-profile/")
        ]);
        setForm({
          first_name: meRes.data.first_name || "",
          last_name: meRes.data.last_name || "",
          phone: shippingRes.data.phone || "",
          address_line1: shippingRes.data.address_line1 || "",
          address_line2: shippingRes.data.address_line2 || "",
          city: shippingRes.data.city || "",
          state: shippingRes.data.state || "",
          postal_code: shippingRes.data.postal_code || "",
          country: shippingRes.data.country || "",
          landmark: shippingRes.data.landmark || ""
        });
      } catch (err) {
        setError(err?.response?.data?.detail || "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await Promise.all([
        apiClient.patch("/accounts/me/", {
          first_name: form.first_name,
          last_name: form.last_name
        }),
        apiClient.patch("/accounts/shipping-profile/", {
          phone: form.phone,
          address_line1: form.address_line1,
          address_line2: form.address_line2,
          city: form.city,
          state: form.state,
          postal_code: form.postal_code,
          country: form.country,
          landmark: form.landmark,
          is_default: true
        })
      ]);
      setMessage("Profile saved successfully.");
    } catch (err) {
      const data = err?.response?.data;
      if (typeof data === "string") setError(data);
      else if (data?.detail) setError(data.detail);
      else {
        const key = data ? Object.keys(data)[0] : null;
        setError(key ? String(Array.isArray(data[key]) ? data[key][0] : data[key]) : "Unable to save profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading profile...</div>;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">My Profile</h1>
      <p className="mt-1 text-sm text-gray-600">Update contact and shipping details for deliveries.</p>

      {message && <p className="mt-4 rounded bg-green-50 p-3 text-green-700">{message}</p>}
      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}

      <form className="mt-6 grid gap-3 rounded bg-white p-4 shadow md:grid-cols-2" onSubmit={save}>
        <input
          className="rounded border p-2"
          placeholder="First Name"
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
        />
        <input
          className="rounded border p-2"
          placeholder="Last Name"
          value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
        />
        <input
          className="rounded border p-2"
          placeholder="Contact Number"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />
        <input
          className="rounded border p-2"
          placeholder="Landmark"
          value={form.landmark}
          onChange={(e) => setForm({ ...form, landmark: e.target.value })}
        />
        <input
          className="rounded border p-2 md:col-span-2"
          placeholder="Address Line 1"
          value={form.address_line1}
          onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
          required
        />
        <input
          className="rounded border p-2 md:col-span-2"
          placeholder="Address Line 2"
          value={form.address_line2}
          onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
        />
        <input
          className="rounded border p-2"
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          required
        />
        <input
          className="rounded border p-2"
          placeholder="State"
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          required
        />
        <input
          className="rounded border p-2"
          placeholder="Postal Code"
          value={form.postal_code}
          onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
          required
        />
        <input
          className="rounded border p-2"
          placeholder="Country"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          required
        />

        <div className="md:col-span-2">
          <button className="rounded bg-brand-600 px-4 py-2 text-white" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
