import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "CUSTOMER"
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      const data = err?.response?.data;
      if (!data) {
        setError("Registration failed. Check backend server/CORS.");
        return;
      }
      if (typeof data === "string") {
        setError(data);
        return;
      }
      if (data.detail) {
        setError(data.detail);
        return;
      }
      const firstField = Object.keys(data)[0];
      const firstMessage = Array.isArray(data[firstField]) ? data[firstField][0] : data[firstField];
      setError(String(firstMessage || "Registration failed"));
    }
  };

  return (
    <div className="mx-auto mt-12 max-w-lg rounded-xl bg-white p-6 shadow">
      <h1 className="text-2xl font-semibold text-brand-700">Create account</h1>
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <input className="rounded border p-2" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="rounded border p-2" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input className="rounded border p-2" placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <input className="rounded border p-2" placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <select className="rounded border p-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="CUSTOMER">Customer</option>
          <option value="VENDOR">Vendor</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" type="submit">Register</button>
      </form>
    </div>
  );
}
