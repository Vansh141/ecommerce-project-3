import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, CheckCircle, Clock, Truck, MapPin,
    CreditCard, Banknote, ShoppingBag, Package, AlertCircle
} from 'lucide-react';
import api from '../services/api';

const OrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const { data } = await api.get(`/orders/${id}`);
                setOrder(data);
            } catch (err) {
                setError(err.response?.data?.message || 'Order not found.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    const formatDate = (d) =>
        d ? new Date(d).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }) : '—';

    const addDecimals = (n) => (Math.round(n * 100) / 100).toFixed(2);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-16 px-4">
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-touchPink/10 p-6 animate-pulse h-28" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto py-24 px-4 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <AlertCircle size={30} className="text-red-400" />
                </div>
                <h2 className="text-2xl font-serif text-touchDark mb-2">Order Not Found</h2>
                <p className="text-touchDark/50 font-light mb-6">{error}</p>
                <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-touchPink font-medium hover:underline">
                    <ArrowLeft size={15} /> Back to Orders
                </Link>
            </div>
        );
    }

    const isDelivered = order.isDelivered;
    const isPaid = order.isPaid;

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 w-full">

            {/* Back link */}
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-sm text-touchDark/50 hover:text-touchPink transition-colors mb-6 font-medium"
            >
                <ArrowLeft size={15} /> Back to Orders
            </button>

            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-touchPink/20">
                <div>
                    <h1 className="text-2xl font-serif text-touchDark tracking-wide">Order Details</h1>
                    <p className="text-xs font-mono text-touchDark/40 mt-1">#{order._id}</p>
                </div>
                <div className="flex items-center gap-2">
                    {isDelivered ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-xl border border-emerald-100">
                            <Truck size={13} /> Delivered
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-500 text-xs font-semibold rounded-xl border border-indigo-100">
                            <Clock size={13} /> Processing
                        </span>
                    )}
                    <span className="text-xs text-touchDark/40 font-light">{formatDate(order.createdAt)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Left column ── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Order Items */}
                    <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                            <ShoppingBag size={17} className="text-touchPink" />
                            <h2 className="font-serif text-touchDark tracking-wide">
                                Items Ordered ({order.orderItems.reduce((a, i) => a + i.qty, 0)})
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {order.orderItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 px-6 py-4">
                                    <div className="w-16 h-16 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden shrink-0">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-contain mix-blend-multiply"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            to={`/product/${item.product}`}
                                            className="font-medium text-touchDark text-sm hover:text-touchPink transition-colors line-clamp-2 leading-snug"
                                        >
                                            {item.name}
                                        </Link>
                                        {item.size && item.size !== 'One Size' && (
                                            <p className="text-xs text-touchDark/40 mt-0.5">Size: {item.size}</p>
                                        )}
                                        <p className="text-xs text-touchDark/50 mt-1">
                                            {item.qty} × ₹{item.price?.toFixed(2)}
                                        </p>
                                    </div>
                                    <p className="font-semibold text-touchDark shrink-0">
                                        ₹{(item.qty * item.price).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                            <MapPin size={17} className="text-touchPink" />
                            <h2 className="font-serif text-touchDark tracking-wide">Shipping Address</h2>
                        </div>
                        <div className="px-6 py-5 text-sm text-touchDark/70 space-y-1">
                            <p className="font-semibold text-touchDark text-base">{order.shippingAddress.fullName}</p>
                            <p>{order.shippingAddress.address}</p>
                            <p>
                                {order.shippingAddress.city}
                                {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                                {' — '}{order.shippingAddress.postalCode}
                            </p>
                            <p className="text-touchDark/50 pt-1">📞 {order.shippingAddress.phone}</p>
                        </div>

                        {/* Delivery timeline */}
                        <div className="mx-6 mb-5 bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div className="flex items-start gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${isDelivered ? 'bg-emerald-400' : 'bg-indigo-300 animate-pulse'}`} />
                                <div>
                                    <p className="text-xs font-semibold text-touchDark">
                                        {isDelivered ? 'Delivered' : 'In Transit / Processing'}
                                    </p>
                                    <p className="text-xs text-touchDark/40 mt-0.5">
                                        {isDelivered
                                            ? formatDate(order.deliveredAt)
                                            : 'Your order is being prepared for shipment.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                            {order.paymentMethod === 'Cash on Delivery'
                                ? <Banknote size={17} className="text-amber-400" />
                                : <CreditCard size={17} className="text-blue-400" />
                            }
                            <h2 className="font-serif text-touchDark tracking-wide">Payment</h2>
                        </div>
                        <div className="px-6 py-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-touchDark">{order.paymentMethod}</p>
                                <p className="text-xs text-touchDark/40 font-light mt-0.5">
                                    {order.paymentMethod === 'Cash on Delivery'
                                        ? 'Collect payment on delivery'
                                        : 'Online payment'}
                                </p>
                            </div>
                            {isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-xl border border-emerald-100">
                                    <CheckCircle size={12} /> Paid
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 text-xs font-semibold rounded-xl border border-amber-100">
                                    <Clock size={12} /> Pending
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Right column — Summary ── */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden sticky top-24">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                            <Package size={17} className="text-touchPink" />
                            <h2 className="font-serif text-touchDark tracking-wide">Order Summary</h2>
                        </div>
                        <div className="px-6 py-5 space-y-3 text-sm">
                            <div className="flex justify-between text-touchDark/60">
                                <span>Subtotal</span>
                                <span className="font-medium text-touchDark">₹{addDecimals(order.itemsPrice)}</span>
                            </div>
                            <div className="flex justify-between text-touchDark/60">
                                <span>Shipping</span>
                                <span className={`font-medium ${order.shippingPrice === 0 ? 'text-emerald-500' : 'text-touchDark'}`}>
                                    {order.shippingPrice === 0 ? 'FREE' : `₹${addDecimals(order.shippingPrice)}`}
                                </span>
                            </div>
                            <div className="flex justify-between text-touchDark/60">
                                <span>GST (18%)</span>
                                <span className="font-medium text-touchDark">₹{addDecimals(order.taxPrice)}</span>
                            </div>

                            <div className="border-t border-gray-100 pt-3">
                                <div className="flex justify-between items-center bg-touchCream/40 px-4 py-3 rounded-xl border border-touchPink/20">
                                    <span className="font-serif text-touchDark text-base">Total</span>
                                    <span className="font-bold text-touchPink text-xl">₹{addDecimals(order.totalPrice)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pb-6">
                            <Link
                                to="/orders"
                                className="w-full flex items-center justify-center gap-2 bg-touchDark text-white py-3 rounded-xl text-sm font-medium hover:bg-touchDark/85 transition-all active:scale-[0.97]"
                            >
                                <ArrowLeft size={14} /> All Orders
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetail;
