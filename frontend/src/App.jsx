import { Link, Navigate, Route, Routes } from "react-router-dom";
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

  const roleHome = () => {
    if (loading) return <div className="p-6">Loading...</div>;
    if (!user) return <HomePage />;
    if (user.role === "VENDOR") return <Navigate to="/vendor" replace />;
    if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
    return <HomePage />;
  };

  return (
    <div>
      <nav className="bg-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <Link className="text-xl font-semibold text-brand-700" to="/">Marketplace</Link>
          <div className="flex items-center gap-4">
            {(!user || user?.role === "CUSTOMER") && <Link to="/cart">Cart</Link>}
            {user?.role === "CUSTOMER" && <Link to="/orders">My Orders</Link>}
            {!user && <Link to="/login">Login</Link>}
            {!user && <Link to="/register">Register</Link>}
            {user?.role === "VENDOR" && <Link to="/vendor">Vendor</Link>}
            {user?.role === "VENDOR" && <Link to="/vendor/analytics">Analytics</Link>}
            {user?.role === "ADMIN" && <Link to="/admin">Admin</Link>}
            {user && user?.role !== "VENDOR" && <Link to="/profile">Profile</Link>}
            {user && (
              <button className="rounded border px-3 py-1" onClick={logout}>
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
