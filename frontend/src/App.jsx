import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/AdminLayout';
import ScrollToTop from './components/ScrollToTop';

// Store pages
import Home from './pages/Home';
import Cart from './pages/Cart';
import ProductDetails from './pages/ProductDetails';
import Wishlist from './pages/Wishlist';
import SearchResults from './pages/SearchResults';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Shipping from './pages/Shipping';
import Payment from './pages/Payment';
import PlaceOrder from './pages/PlaceOrder';
import OrderSuccess from './pages/OrderSuccess';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
// Static / info pages
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfUse from './pages/TermsOfUse';
import ShippingInfo from './pages/ShippingInfo';
import ReturnsPage from './pages/ReturnsPage';
import HelpCenter from './pages/HelpCenter';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';

import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// ── Wrapper that renders a page inside the AdminLayout ──────────────────────
const AdminPage = ({ children }) => (
  <AdminRoute>
    <AdminLayout>{children}</AdminLayout>
  </AdminRoute>
);

// ── Inner app: reads userId from AuthContext and passes it to Cart/Wishlist ──
// This component must live *inside* AuthProvider so it can call useAuth().
const AppWithUserScope = () => {
  const { userInfo } = useAuth();
  const userId = userInfo?._id || null; // null → guest keys

  return (
    <CartProvider userId={userId}>
      <WishlistProvider userId={userId}>
        <Router>
          <ScrollToTop />
          <Routes>
            {/* ── Admin Routes (no Navbar/Footer) ── */}
            <Route path="/admin" element={<AdminPage><AdminDashboard /></AdminPage>} />
            <Route path="/admin/products" element={<AdminPage><AdminProducts /></AdminPage>} />
            <Route path="/admin/orders" element={<AdminPage><AdminOrders /></AdminPage>} />
            <Route path="/admin/users" element={<AdminPage><AdminUsers /></AdminPage>} />

            {/* ── Store Routes (with Navbar/Footer) ── */}
            <Route path="/*" element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-grow container mx-auto px-4 py-6">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/product/:id" element={<ProductDetails />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/search" element={<SearchResults />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />
                    <Route path="/shipping" element={<Shipping />} />
                    <Route path="/payment" element={<Payment />} />
                    <Route path="/placeorder" element={<PlaceOrder />} />
                    <Route path="/order-success/:id" element={<OrderSuccess />} />
                    <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                    <Route path="/order-history" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                    <Route path="/order/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    {/* Static / info pages */}
                    <Route path="/about" element={<AboutUs />} />
                    <Route path="/contact" element={<ContactUs />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfUse />} />
                    <Route path="/shipping-info" element={<ShippingInfo />} />
                    <Route path="/returns" element={<ReturnsPage />} />
                    <Route path="/help" element={<HelpCenter />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            } />
          </Routes>
        </Router>
      </WishlistProvider>
    </CartProvider>
  );
};

// ── Root App ─────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <AppWithUserScope />
    </AuthProvider>
  );
}

export default App;
