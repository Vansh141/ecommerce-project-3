import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ToastProvider } from './context/ToastContext';

import ErrorBoundary from './components/ErrorBoundary';
import StoreLayout from './components/layout/StoreLayout';
import { RequireAuth, RequireAdmin, RedirectIfAuthed } from './components/layout/Guards';
import { PageLoader } from './components/ui';

/**
 * Routes are code-split so a first-time visitor downloads the homepage only —
 * not the admin panel, checkout and every policy page as well. This matters
 * most on the mobile connections our customers actually browse on.
 */
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));

/** Named exports need a small wrapper to be lazy-loadable. */
const pick = (loader, key) => lazy(() => loader().then((m) => ({ default: m[key] })));

const OrderHistory = pick(() => import('./pages/Orders'), 'OrderHistory');
const OrderDetail = pick(() => import('./pages/Orders'), 'OrderDetail');
const OrderConfirmed = pick(() => import('./pages/Orders'), 'OrderConfirmed');

const AccountLayout = pick(() => import('./pages/Account'), 'AccountLayout');
const Profile = pick(() => import('./pages/Account'), 'Profile');
const Addresses = pick(() => import('./pages/Account'), 'Addresses');
const Wishlist = pick(() => import('./pages/Account'), 'Wishlist');

const Login = pick(() => import('./pages/Auth'), 'Login');
const Register = pick(() => import('./pages/Auth'), 'Register');
const ForgotPassword = pick(() => import('./pages/Auth'), 'ForgotPassword');
const ResetPassword = pick(() => import('./pages/Auth'), 'ResetPassword');

const About = pick(() => import('./pages/Static'), 'About');
const Contact = pick(() => import('./pages/Static'), 'Contact');
const ShippingReturns = pick(() => import('./pages/Static'), 'ShippingReturns');
const Privacy = pick(() => import('./pages/Static'), 'Privacy');
const Terms = pick(() => import('./pages/Static'), 'Terms');
const NotFound = pick(() => import('./pages/Static'), 'NotFound');

const AdminLayout = pick(() => import('./pages/admin'), 'AdminLayout');
const Dashboard = pick(() => import('./pages/admin'), 'Dashboard');
const AdminProducts = pick(() => import('./pages/admin'), 'AdminProducts');
const AdminCategories = pick(() => import('./pages/admin'), 'AdminCategories');
const AdminInventory = pick(() => import('./pages/admin'), 'AdminInventory');
const AdminOrders = pick(() => import('./pages/admin'), 'AdminOrders');
const AdminCustomers = pick(() => import('./pages/admin'), 'AdminCustomers');
const AdminCoupons = pick(() => import('./pages/admin'), 'AdminCoupons');

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* ── Storefront ── */}
                    <Route element={<StoreLayout />}>
                      <Route index element={<Home />} />
                      <Route path="shop" element={<Shop />} />
                      <Route path="product/:slug" element={<ProductDetail />} />
                      <Route path="cart" element={<Cart />} />
                      <Route path="wishlist" element={<Wishlist />} />

                      {/* Auth — signed-in users are bounced away from these */}
                      <Route path="login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
                      <Route path="register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
                      <Route path="forgot-password" element={<RedirectIfAuthed><ForgotPassword /></RedirectIfAuthed>} />
                      <Route path="reset-password/:token" element={<ResetPassword />} />

                      {/* Customer-only */}
                      <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
                      <Route path="orders" element={<RequireAuth><OrderHistory /></RequireAuth>} />
                      <Route path="orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
                      <Route path="order-confirmed/:id" element={<RequireAuth><OrderConfirmed /></RequireAuth>} />

                      <Route path="account" element={<RequireAuth><AccountLayout /></RequireAuth>}>
                        <Route index element={<Profile />} />
                        <Route path="addresses" element={<Addresses />} />
                      </Route>

                      {/* Content */}
                      <Route path="about" element={<About />} />
                      <Route path="contact" element={<Contact />} />
                      <Route path="shipping-returns" element={<ShippingReturns />} />
                      <Route path="privacy" element={<Privacy />} />
                      <Route path="terms" element={<Terms />} />

                      <Route path="*" element={<NotFound />} />
                    </Route>

                    {/* ── Admin ── */}
                    <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                      <Route index element={<Dashboard />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="categories" element={<AdminCategories />} />
                      <Route path="inventory" element={<AdminInventory />} />
                      <Route path="orders" element={<AdminOrders />} />
                      <Route path="customers" element={<AdminCustomers />} />
                      <Route path="coupons" element={<AdminCoupons />} />
                    </Route>
                  </Routes>
                </Suspense>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
