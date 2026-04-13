import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formContainer = {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  };

  const formItem = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="auth-mesh auth-mesh-a" />
      <div className="auth-mesh auth-mesh-b" />
      <motion.div
        variants={formContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/35 bg-white/10 p-6 text-slate-100 shadow-2xl backdrop-blur-md sm:p-8"
      >
        <motion.p variants={formItem} className="text-xs uppercase tracking-[0.22em] text-indigo-200/90">
          Welcome Back
        </motion.p>
        <motion.h1 variants={formItem} className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Sign In
        </motion.h1>

        <motion.form variants={formContainer} onSubmit={handleSubmit} className="mt-8 space-y-4">
          <motion.label variants={formItem} className="block">
            <span className="mb-2 block text-sm text-slate-200">Email</span>
            <div className="auth-input-wrap">
              <Mail size={18} className="text-slate-300" />
              <input
                className="auth-input"
                placeholder="you@example.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </motion.label>

          <motion.label variants={formItem} className="block">
            <span className="mb-2 block text-sm text-slate-200">Password</span>
            <div className="auth-input-wrap">
              <Lock size={18} className="text-slate-300" />
              <input
                className="auth-input"
                placeholder="Enter your password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </motion.label>

          <motion.div variants={formItem}>
            {error && <p className="rounded-lg border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          </motion.div>

          <motion.button
            variants={formItem}
            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.99 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-900/25 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-75"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {isSubmitting ? "Signing In..." : "Sign In"}
          </motion.button>
        </motion.form>

        <motion.p variants={formItem} className="mt-6 text-sm text-slate-200">
          No account?{" "}
          <Link className="font-medium text-indigo-200 underline decoration-indigo-300/70 underline-offset-4 hover:text-white" to="/register">
            Register
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
