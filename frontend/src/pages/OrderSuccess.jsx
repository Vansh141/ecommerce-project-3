import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, PackageSearch, ArrowRight, Banknote, CreditCard, Clock, ShoppingBag } from 'lucide-react';
import api from '../services/api';

const OrderSuccess = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const { data } = await api.get(`/orders/${id}`);
                setOrder(data);
            } catch (err) {
                // Silently fail — we still show the success screen with just the ID
                console.error('Could not fetch order details:', err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    return (
        <div className="max-w-3xl mx-auto py-16 md:py-24 px-4 text-center min-h-[60vh] flex flex-col justify-center">
            <div className="bg-white rounded-3xl p-10 border border-touchPink/20 shadow-sm relative overflow-hidden">
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-touchPink via-touchCream to-touchSage"></div>

                {/* Animated success icon */}
                <div className="flex justify-center mb-8">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center shadow-inner relative">
                        <CheckCircle size={48} className="text-green-500 relative z-10" strokeWidth={1.5} />
                        <div className="absolute inset-0 bg-green-400 opacity-20 rounded-full animate-ping"></div>
                    </div>
                </div>

                <h1 className="text-4xl font-serif text-touchDark tracking-wide mb-3">Order Placed!</h1>
                <p className="text-touchDark/60 font-light tracking-wide text-base mb-8 max-w-lg mx-auto leading-relaxed">
                    Thank you for shopping with TOUCH Boutique. We've received your order and will begin processing it shortly.
                </p>

                {/* Order ID */}
                <div className="bg-touchCream/30 inline-block px-8 py-4 rounded-2xl border border-touchPink/10 mb-6 text-left relative overflow-hidden group hover:border-touchPink/30 transition-colors w-full max-w-sm mx-auto">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-touchPink/5 rounded-bl-full -z-10 group-hover:bg-touchPink/10 transition-colors"></div>
                    <p className="text-xs text-touchDark/50 uppercase tracking-widest font-semibold mb-1">Order ID</p>
                    <p className="font-mono text-sm text-touchDark tracking-wider select-all break-all">{id}</p>
                </div>

                {/* Order summary if loaded */}
                {!loading && order && (
                    <div className="mt-2 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        {/* Payment Method */}
                        <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center gap-2">
                            {order.paymentMethod === 'Cash on Delivery'
                                ? <Banknote size={22} className="text-amber-400" />
                                : <CreditCard size={22} className="text-blue-400" />
                            }
                            <p className="text-xs text-touchDark/50 uppercase tracking-widest font-semibold">Payment</p>
                            <p className="font-medium text-touchDark text-center leading-tight">{order.paymentMethod}</p>
                        </div>
                        {/* Total */}
                        <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center gap-2">
                            <ShoppingBag size={22} className="text-touchPink" />
                            <p className="text-xs text-touchDark/50 uppercase tracking-widest font-semibold">Total</p>
                            <p className="font-bold text-touchPink text-lg">₹{order.totalPrice?.toFixed(2)}</p>
                        </div>
                        {/* Status */}
                        <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center gap-2">
                            <Clock size={22} className="text-indigo-400" />
                            <p className="text-xs text-touchDark/50 uppercase tracking-widest font-semibold">Status</p>
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-semibold border border-amber-100">
                                Processing
                            </span>
                        </div>
                    </div>
                )}

                {/* COD note */}
                {!loading && order?.paymentMethod === 'Cash on Delivery' && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8 text-sm text-amber-700 font-light text-left flex gap-3 items-start">
                        <span className="text-lg shrink-0">💰</span>
                        <p>
                            <strong className="font-semibold">Cash on Delivery</strong> — Our delivery partner will collect{' '}
                            <strong>₹{order.totalPrice?.toFixed(2)}</strong> when your order is delivered. Please keep the exact amount ready.
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link
                        to="/order-history"
                        className="flex items-center gap-2 bg-white text-touchDark border border-touchDark px-8 py-3.5 rounded-xl font-medium tracking-wide hover:bg-touchCream transition-colors shadow-sm w-full sm:w-auto justify-center"
                    >
                        <PackageSearch size={18} /> My Orders
                    </Link>
                    <Link
                        to="/"
                        className="flex items-center gap-2 bg-touchDark text-white px-8 py-3.5 rounded-xl font-medium tracking-wide hover:bg-touchDark/90 transition-colors shadow-sm w-full sm:w-auto justify-center"
                    >
                        Continue Shopping <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;
