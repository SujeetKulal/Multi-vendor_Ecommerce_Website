import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      const data = err?.response?.data;
      if (!data) {
        setError("Login failed. Check backend server/CORS.");
        return;
      }
      setError(data.detail || "Invalid credentials");
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl bg-white p-6 shadow">
      <h1 className="text-2xl font-semibold text-brand-700">Login</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input className="w-full rounded border p-2" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full rounded border p-2" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" type="submit">Sign In</button>
      </form>
      <p className="mt-4 text-sm">
        No account? <Link className="text-brand-700 underline" to="/register">Register</Link>
      </p>
    </div>
  );
}
