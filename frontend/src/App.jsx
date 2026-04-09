import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, LogIn, Package, Search, Shield, ShoppingCart, Store, UserCircle2, UserPlus } from "lucide-react";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CartPage from "./pages/CartPage";
import VendorDashboardPage from "./pages/VendorDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CustomerOrdersPage from "./pages/CustomerOrdersPage";
import ProfilePage from "./pages/ProfilePage";
import VendorAnalyticsPage from "./pages/VendorAnalyticsPage";

export default function App() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchText, setSearchText] = useState("");

  const roleHome = () => {
    if (loading) return <div className="p-6">Loading...</div>;
    if (!user) return <HomePage />;
    if (user.role === "VENDOR") return <Navigate to="/vendor" replace />;
    if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
    return <HomePage />;
  };

  const isCustomerView = !user || user?.role === "CUSTOMER";

  useEffect(() => {
    const query = new URLSearchParams(location.search).get("q") || "";
    setSearchText(query);
  }, [location.search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchText.trim();
    navigate(query ? `/?q=${encodeURIComponent(query)}` : "/");
  };

  return (
    <div className="min-h-screen bg-transparent">
      <nav className="sticky top-0 z-50 border-b border-white/20 bg-slate-900/55 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link className="shrink-0 text-lg font-semibold tracking-tight text-slate-100 sm:text-xl" to="/">
            Marketplace
          </Link>

          {isCustomerView && !location.pathname.startsWith("/vendor") && !location.pathname.startsWith("/admin") && (
            <form onSubmit={handleSearchSubmit} className="order-3 w-full sm:order-2 sm:mx-auto sm:w-[24rem]">
              <label className="group flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-slate-200 shadow-sm transition focus-within:border-indigo-300/70 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]">
                <Search size={16} className="text-slate-300 transition group-focus-within:text-indigo-200" />
                <input
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-300"
                  placeholder="Search products..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </label>
            </form>
          )}

          <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
            {(!user || user?.role === "CUSTOMER") && (
              <Link className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-100 hover:bg-white/10" to="/cart">
                <ShoppingCart size={16} /> Cart
              </Link>
            )}
            {user?.role === "CUSTOMER" && (
              <Link className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-100 hover:bg-white/10" to="/orders">
                <Package size={16} /> My Orders
              </Link>
            )}
            {!user && (
              <Link className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-100 hover:bg-white/10" to="/login">
                <LogIn size={16} /> Login
              </Link>
            )}
            {!user && (
              <Link className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-100 hover:bg-white/10" to="/register">
                <UserPlus size={16} /> Register
              </Link>
            )}
            {user?.role === "VENDOR" && (
              <Link className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-100 hover:bg-white/10" to="/vendor">
                <Store size={16} /> Vendor
              </Link>
            )}
            {user?.role === "VENDOR" && (
              <Link className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-100 hover:bg-white/10" to="/vendor/analytics">
                <BarChart3 size={16} /> Analytics
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <Link className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-100 hover:bg-white/10" to="/admin">
                <Shield size={16} /> Admin
              </Link>
            )}
            {user && user?.role !== "VENDOR" && (
              <Link className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-100 hover:bg-white/10" to="/profile">
                <UserCircle2 size={16} /> Profile
              </Link>
            )}
            {user && (
              <button className="rounded-lg border border-white/30 px-3 py-1 text-sm text-slate-100 hover:bg-white/10" onClick={logout}>
                Logout
              </button>
            )}
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={roleHome()} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/cart" element={<ProtectedRoute roles={["CUSTOMER"]}><CartPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute roles={["CUSTOMER"]}><CustomerOrdersPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute roles={["ADMIN", "VENDOR", "CUSTOMER"]}><ProfilePage /></ProtectedRoute>} />
        <Route path="/vendor" element={<ProtectedRoute roles={["VENDOR"]}><VendorDashboardPage /></ProtectedRoute>} />
        <Route path="/vendor/analytics" element={<ProtectedRoute roles={["VENDOR"]}><VendorAnalyticsPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={["ADMIN"]}><AdminDashboardPage /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}
