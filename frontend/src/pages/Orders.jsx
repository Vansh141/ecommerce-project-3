import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    PackageSearch, ShoppingBag, CheckCircle, Clock,
    Banknote, CreditCard, ArrowRight, ChevronRight, Truck, ArrowLeft
} from 'lucide-react';
import api from '../services/api';

// ── Status badge helpers ────────────────────────────────────────────────────
const PaymentBadge = ({ isPaid, method }) => {
    if (isPaid) {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-lg border border-emerald-100">
                <CheckCircle size={11} /> Paid
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 text-xs font-semibold rounded-lg border border-amber-100">
            {method === 'Cash on Delivery'
                ? <Banknote size={11} />
                : <CreditCard size={11} />
            }
            {method === 'Cash on Delivery' ? 'COD' : 'Pending'}
        </span>
    );
};

const DeliveryBadge = ({ isDelivered }) => {
    if (isDelivered) {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-lg border border-emerald-100">
                <Truck size={11} /> Delivered
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-500 text-xs font-semibold rounded-lg border border-indigo-100">
            <Clock size={11} /> Processing
        </span>
    );
};

// ── Skeleton row ────────────────────────────────────────────────────────────
const SkeletonRow = () => (
    <tr className="border-b border-gray-50">
        {[...Array(6)].map((_, i) => (
            <td key={i} className="px-5 py-4">
                <div className="h-4 bg-gray-100 rounded-lg animate-pulse w-3/4" />
            </td>
        ))}
    </tr>
);

// ── Main Page ───────────────────────────────────────────────────────────────
const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data } = await api.get('/orders/my/orders');
                setOrders(data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load orders. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const formatDate = (d) =>
        d
            ? new Date(d).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
            })
            : '—';

    // ── Empty State ──────────────────────────────────────────────────────────
    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-24 h-24 bg-touchCream rounded-full flex items-center justify-center mb-6 shadow-inner">
                <PackageSearch size={40} className="text-touchPink/60" />
            </div>
            <h2 className="text-2xl font-serif text-touchDark mb-3">No Orders Yet</h2>
            <p className="text-touchDark/50 font-light tracking-wide text-sm mb-8 max-w-xs">
                You have not placed any orders yet. Start shopping to see your orders here.
            </p>
            <Link
                to="/"
                className="inline-flex items-center gap-2 bg-touchDark text-white px-8 py-3.5 rounded-xl font-medium hover:bg-touchDark/90 transition-all active:scale-[0.98] shadow-sm"
            >
                Start Shopping <ArrowRight size={16} />
            </Link>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 w-full">

            {/* Page Header */}
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-touchPink/20">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center justify-center w-9 h-9 rounded-xl border border-touchPink/20 text-touchDark/50 hover:text-touchPink hover:border-touchPink/40 hover:bg-touchPink/5 transition-all shrink-0"
                    aria-label="Go back"
                >
                    <ArrowLeft size={17} />
                </button>
                <div className="flex-1">
                    <h1 className="text-3xl font-serif text-touchDark tracking-wide">My Orders</h1>
                    <p className="text-touchDark/50 font-light text-sm mt-1 tracking-wide">
                        {!loading && !error && `${orders.length} order${orders.length !== 1 ? 's' : ''} placed`}
                    </p>
                </div>
                <Link
                    to="/"
                    className="hidden sm:inline-flex items-center gap-2 text-sm text-touchDark/60 hover:text-touchPink font-medium transition-colors"
                >
                    <ShoppingBag size={16} /> Continue Shopping
                </Link>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-5 py-4 rounded-2xl mb-6">
                    {error}
                </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
                <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100">
                                {['Order ID', 'Date', 'Total', 'Payment', 'Delivery', ''].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/40 uppercase tracking-widest">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && orders.length === 0 && (
                <div className="bg-white rounded-3xl border border-touchPink/10 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-touchPink via-touchCream to-touchSage" />
                    <EmptyState />
                </div>
            )}

            {/* Orders Table — Desktop */}
            {!loading && orders.length > 0 && (
                <>
                    {/* ── TABLE (md+) ── */}
                    <div className="hidden md:block bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Order ID</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Date</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Items</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Total</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Payment</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Delivery</th>
                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {orders.map((order) => (
                                    <tr
                                        key={order._id}
                                        className="hover:bg-touchCream/10 transition-colors group"
                                    >
                                        {/* Order ID */}
                                        <td className="px-5 py-4">
                                            <span className="font-mono text-xs text-touchDark/60 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                                #{order._id.slice(-8).toUpperCase()}
                                            </span>
                                        </td>

                                        {/* Date */}
                                        <td className="px-5 py-4 text-touchDark/60 text-xs">
                                            {formatDate(order.createdAt)}
                                        </td>

                                        {/* Items count + thumbnail strip */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1">
                                                {order.orderItems.slice(0, 3).map((item, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-9 h-9 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden shrink-0"
                                                    >
                                                        <img
                                                            src={item.image}
                                                            alt={item.name}
                                                            className="w-full h-full object-contain mix-blend-multiply"
                                                        />
                                                    </div>
                                                ))}
                                                {order.orderItems.length > 3 && (
                                                    <span className="w-9 h-9 bg-touchCream/60 rounded-lg border border-touchPink/20 flex items-center justify-center text-xs text-touchDark/50 font-semibold shrink-0">
                                                        +{order.orderItems.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Total */}
                                        <td className="px-5 py-4 font-semibold text-touchDark">
                                            ₹{order.totalPrice?.toFixed(2)}
                                        </td>

                                        {/* Payment Status */}
                                        <td className="px-5 py-4">
                                            <PaymentBadge isPaid={order.isPaid} method={order.paymentMethod} />
                                        </td>

                                        {/* Delivery Status */}
                                        <td className="px-5 py-4">
                                            <DeliveryBadge isDelivered={order.isDelivered} />
                                        </td>

                                        {/* View Details */}
                                        <td className="px-5 py-4 text-right">
                                            <Link
                                                to={`/order/${order._id}`}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-touchDark text-white text-xs font-medium rounded-xl hover:bg-touchDark/85 transition-all active:scale-[0.97] shadow-sm group-hover:shadow"
                                            >
                                                View <ChevronRight size={13} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── CARDS (mobile) ── */}
                    <div className="md:hidden space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order._id}
                                className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden relative"
                            >
                                {/* Top accent */}
                                <div className="h-0.5 w-full bg-gradient-to-r from-touchPink via-touchCream to-touchSage" />

                                <div className="p-5">
                                    {/* Header row */}
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div>
                                            <span className="font-mono text-xs text-touchDark/50 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                #{order._id.slice(-8).toUpperCase()}
                                            </span>
                                            <p className="text-xs text-touchDark/40 mt-1.5">{formatDate(order.createdAt)}</p>
                                        </div>
                                        <p className="font-bold text-touchDark text-lg">₹{order.totalPrice?.toFixed(2)}</p>
                                    </div>

                                    {/* Item thumbnails */}
                                    <div className="flex items-center gap-1.5 mb-4">
                                        {order.orderItems.slice(0, 4).map((item, i) => (
                                            <div key={i} className="w-11 h-11 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                                            </div>
                                        ))}
                                        {order.orderItems.length > 4 && (
                                            <span className="w-11 h-11 bg-touchCream/60 rounded-xl flex items-center justify-center text-xs font-semibold text-touchDark/50">
                                                +{order.orderItems.length - 4}
                                            </span>
                                        )}
                                    </div>

                                    {/* Badges + CTA */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex gap-2 flex-wrap">
                                            <PaymentBadge isPaid={order.isPaid} method={order.paymentMethod} />
                                            <DeliveryBadge isDelivered={order.isDelivered} />
                                        </div>
                                        <Link
                                            to={`/order/${order._id}`}
                                            className="inline-flex items-center gap-1 px-4 py-2 bg-touchDark text-white text-xs font-medium rounded-xl hover:bg-touchDark/85 transition-all shrink-0"
                                        >
                                            View <ChevronRight size={12} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Orders;
