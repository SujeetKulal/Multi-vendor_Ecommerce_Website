import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Loader2, LogOut, Mail, Shield, User2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function ProfilePage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
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

        setMe(meRes.data);
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
      const { data } = await apiClient.get("/accounts/me/");
      setMe(data);
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = useMemo(() => {
    const first = form.first_name?.trim() || me?.first_name || "";
    const last = form.last_name?.trim() || me?.last_name || "";
    const full = `${first} ${last}`.trim();
    return full || user?.email || me?.email || "User";
  }, [form.first_name, form.last_name, me, user]);

  const roleLabel = (me?.role || user?.role || "CUSTOMER").toString();

  if (loading) return <div className="p-6">Loading profile...</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="mx-auto rounded-3xl border border-white/35 bg-white/20 p-6 shadow-xl backdrop-blur-md"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 shadow">
              <User2 size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{displayName}</h1>
              <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Verified {roleLabel === "CUSTOMER" ? "Customer" : roleLabel}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => document.getElementById("profile-edit-form")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="rounded-lg border border-slate-300 bg-white/65 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              Edit Profile
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white/70 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/45 bg-white/60 p-4">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500"><Mail size={14} /> Email</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{me?.email || user?.email || "-"}</p>
          </div>
          <div className="rounded-2xl border border-white/45 bg-white/60 p-4">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500"><CalendarDays size={14} /> Date Joined</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{me?.date_joined ? new Date(me.date_joined).toLocaleDateString() : "-"}</p>
          </div>
          <div className="rounded-2xl border border-white/45 bg-white/60 p-4">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500"><Shield size={14} /> Account Type</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{roleLabel}</p>
          </div>
        </div>

        {message && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <form id="profile-edit-form" className="mt-6 grid gap-3 rounded-2xl border border-white/45 bg-white/55 p-4 md:grid-cols-2" onSubmit={save}>
          <input
            className="rounded-lg border border-slate-300/70 bg-white/80 p-2.5"
            placeholder="First Name"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-300/70 bg-white/80 p-2.5"
            placeholder="Last Name"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-300/70 bg-white/80 p-2.5"
            placeholder="Contact Number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
          <input
            className="rounded-lg border border-slate-300/70 bg-white/80 p-2.5"
            placeholder="Landmark"
            value={form.landmark}
            onChange={(e) => setForm({ ...form, landmark: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-300/70 bg-white/80 p-2.5 md:col-span-2"
            placeholder="Address Line 1"
            value={form.address_line1}
            onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
            required
          />
          <input
            className="rounded-lg border border-slate-300/70 bg-white/80 p-2.5 md:col-span-2"
            placeholder="Address Line 2"
            value={form.address_line2}
            onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-300/70 bg-white/80 p-2.5"
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            required
          />
          <input
            className="rounded-lg border border-slate-300/70 bg-white/80 p-2.5"
            placeholder="State"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            required
          />
          <input
            className="rounded-lg border border-slate-300/70 bg-white/80 p-2.5"
            placeholder="Postal Code"
            value={form.postal_code}
            onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
            required
          />
          <input
            className="rounded-lg border border-slate-300/70 bg-white/80 p-2.5"
            placeholder="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            required
          />

          <div className="md:col-span-2">
            <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-white" type="submit" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </motion.section>
    </div>
  );
}
