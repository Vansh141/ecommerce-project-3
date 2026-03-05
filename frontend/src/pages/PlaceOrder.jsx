import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Truck, CreditCard, ChevronRight, ShoppingBag, MapPin, ArrowLeft, AlertCircle } from 'lucide-react';
import api from '../services/api';

// Shared checkout step indicator
const CheckoutSteps = ({ step }) => {
    const steps = ['Shipping', 'Payment', 'Review'];
    return (
        <div className="flex items-center justify-center gap-0 mb-10">
            {steps.map((label, i) => {
                const idx = i + 1;
                const isCompleted = step > idx;
                const isActive = step === idx;
                return (
                    <React.Fragment key={label}>
                        <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                                ${isCompleted ? 'bg-touchDark text-white' : isActive ? 'bg-touchPink text-white ring-4 ring-touchPink/20' : 'bg-gray-100 text-gray-400'}`}>
                                {isCompleted ? '✓' : idx}
                            </div>
                            <span className={`text-xs mt-1.5 tracking-wide ${isActive ? 'text-touchDark font-semibold' : 'text-touchDark/40'}`}>{label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`h-0.5 w-16 sm:w-24 mx-1 mb-5 transition-all ${step > idx ? 'bg-touchDark' : 'bg-gray-100'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const PlaceOrder = () => {
    const navigate = useNavigate();
    const { cartItems, shippingAddress, paymentMethod, clearCart } = useCart();
    const { userInfo } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Price calculations — backend recalculates authoritatively, these are for display only
    const addDecimals = (num) => (Math.round(num * 100) / 100).toFixed(2);
    const itemsPrice = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
    const shippingPrice = itemsPrice > 999 ? 0 : 99;   // Free shipping over ₹999
    const taxPrice = Number((0.18 * itemsPrice).toFixed(2));  // 18% GST
    const totalPrice = itemsPrice + shippingPrice + taxPrice;

    // Guards
    useEffect(() => {
        if (!userInfo) {
            navigate('/login?redirect=shipping');
        }
    }, [userInfo, navigate]);

    useEffect(() => {
        if (userInfo) {
            if (!shippingAddress.address) {
                navigate('/shipping');
            } else if (!paymentMethod) {
                navigate('/payment');
            }
        }
    }, [shippingAddress, paymentMethod, userInfo, navigate]);

    const placeOrderHandler = async () => {
        try {
            setLoading(true);
            setError(null);

            const orderItemsReq = cartItems.map(item => ({
                name: item.name,
                qty: item.qty,
                image: item.image,
                price: item.price,
                size: item.size || 'One Size',
                product: item._id || item.id,
            }));

            const { data } = await api.post('/orders', {
                orderItems: orderItemsReq,
                shippingAddress,
                paymentMethod,
                itemsPrice,
                taxPrice,
                shippingPrice,
                totalPrice,
            });

            clearCart();
            navigate(`/order-success/${data._id}`);

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to place order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (cartItems.length === 0 && !loading) {
        return (
            <div className="text-center py-24 min-h-[50vh] flex flex-col items-center justify-center gap-4">
                <ShoppingBag size={48} className="text-touchPink/40" />
                <p className="text-xl font-serif text-touchDark/60">Your cart is empty.</p>
                <Link to="/" className="text-sm text-touchPink hover:underline font-medium">Continue Shopping →</Link>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 w-full">
            <CheckoutSteps step={3} />

            <h1 className="text-3xl font-serif text-touchDark tracking-wide mb-8 border-b-2 border-touchPink/20 pb-4 inline-block">
                Review &amp; Place Order
            </h1>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 shadow-sm flex items-start gap-3 border border-red-100">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column — Details */}
                <div className="col-span-1 lg:col-span-2 space-y-6">

                    {/* Shipping Details */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-touchPink/10 hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-serif text-touchDark tracking-wider flex items-center gap-2">
                                <Truck size={20} className="text-touchPink" />
                                Shipping Details
                            </h2>
                            <button
                                onClick={() => navigate('/shipping')}
                                className="text-xs text-touchPink/70 hover:text-touchPink font-medium tracking-wide transition-colors flex items-center gap-1"
                            >
                                <ArrowLeft size={12} /> Edit
                            </button>
                        </div>
                        <div className="text-touchDark/70 text-sm space-y-1 ml-7">
                            <p className="font-semibold text-touchDark text-base">{shippingAddress.fullName}</p>
                            <div className="flex items-start gap-1.5 text-touchDark/60">
                                <MapPin size={14} className="mt-0.5 shrink-0 text-touchPink/60" />
                                <div>
                                    <p>{shippingAddress.address}</p>
                                    <p>{shippingAddress.city}{shippingAddress.state ? `, ${shippingAddress.state}` : ''} — {shippingAddress.postalCode}</p>
                                </div>
                            </div>
                            <p className="text-touchDark/50 pt-1">📞 {shippingAddress.phone}</p>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-touchPink/10 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-serif text-touchDark tracking-wider flex items-center gap-2">
                                <CreditCard size={20} className="text-touchPink" />
                                Payment Method
                            </h2>
                            <button
                                onClick={() => navigate('/payment')}
                                className="text-xs text-touchPink/70 hover:text-touchPink font-medium tracking-wide transition-colors flex items-center gap-1"
                            >
                                <ArrowLeft size={12} /> Edit
                            </button>
                        </div>
                        <div className="ml-7 flex items-center gap-3">
                            <span className="inline-block px-3 py-1.5 bg-touchCream/50 border border-touchPink/20 rounded-lg text-sm font-semibold text-touchDark tracking-wide">
                                {paymentMethod}
                            </span>
                            {paymentMethod === 'Cash on Delivery' && (
                                <span className="text-xs text-touchDark/50 font-light">Pay when your order arrives</span>
                            )}
                            {paymentMethod === 'Card Payment' && (
                                <span className="text-xs text-touchDark/50 font-light">Visa, MasterCard, Amex, Rupay</span>
                            )}
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-touchPink/10 hover:shadow-md transition-shadow">
                        <h2 className="text-lg font-serif text-touchDark tracking-wider mb-5 border-b border-gray-50 pb-3 flex items-center gap-2">
                            <ShoppingBag size={20} className="text-touchPink" />
                            Order Items ({cartItems.reduce((a, i) => a + i.qty, 0)})
                        </h2>
                        <div className="space-y-3">
                            {cartItems.map((item, index) => {
                                const productId = item._id || item.id;
                                return (
                                    <div key={index} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0 last:pb-0">
                                        <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                                            <img
                                                src={item.image} alt={item.name}
                                                className="w-full h-full object-contain mix-blend-multiply"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                to={`/product/${productId}`}
                                                className="font-medium text-touchDark text-sm hover:text-touchPink transition-colors line-clamp-1"
                                            >
                                                {item.name}
                                            </Link>
                                            {item.size && item.size !== 'One Size' && (
                                                <p className="text-xs text-touchDark/40 mt-0.5">Size: {item.size}</p>
                                            )}
                                        </div>
                                        <div className="text-sm text-touchDark/70 text-right shrink-0">
                                            <p className="font-medium text-touchDark">₹{(item.qty * item.price).toFixed(2)}</p>
                                            <p className="text-xs text-touchDark/40">{item.qty} × ₹{item.price.toFixed(2)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column — Order Summary */}
                <div className="col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-touchPink/20 p-6 sticky top-24">
                        <h2 className="text-xl font-serif text-touchDark tracking-wider mb-6 border-b border-gray-100 pb-3">
                            Order Summary
                        </h2>

                        <div className="space-y-3 mb-6 text-sm">
                            <div className="flex justify-between text-touchDark/70">
                                <span>Items ({cartItems.reduce((a, i) => a + i.qty, 0)})</span>
                                <span className="font-medium text-touchDark">₹{addDecimals(itemsPrice)}</span>
                            </div>
                            <div className="flex justify-between text-touchDark/70">
                                <span>Shipping</span>
                                <span className={`font-medium ${shippingPrice === 0 ? 'text-emerald-500' : 'text-touchDark'}`}>
                                    {shippingPrice === 0 ? 'FREE' : `₹${addDecimals(shippingPrice)}`}
                                </span>
                            </div>
                            <div className="flex justify-between text-touchDark/70">
                                <span>GST (18%)</span>
                                <span className="font-medium text-touchDark">₹{addDecimals(taxPrice)}</span>
                            </div>
                        </div>

                        {shippingPrice > 0 && (
                            <p className="text-xs text-touchDark/40 font-light mb-4 text-center">
                                Add ₹{addDecimals(999 - itemsPrice)} more for free shipping
                            </p>
                        )}

                        <div className="border-t border-gray-200 pt-4 mb-6">
                            <div className="flex justify-between items-center bg-touchCream/30 p-3.5 rounded-xl border border-touchPink/20">
                                <span className="font-serif text-lg tracking-wide text-touchDark">Total</span>
                                <span className="text-xl font-bold text-touchPink">₹{addDecimals(totalPrice)}</span>
                            </div>
                        </div>

                        {/* COD notice */}
                        {paymentMethod === 'Cash on Delivery' && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 flex items-start gap-2">
                                <span className="text-amber-500 text-sm">💰</span>
                                <p className="text-xs text-amber-700 font-light leading-relaxed">
                                    Please keep exact change ready. Our delivery partner will collect payment at your door.
                                </p>
                            </div>
                        )}

                        <button
                            type="button"
                            className="w-full flex items-center justify-center gap-2 bg-touchDark text-white font-serif tracking-widest py-4 rounded-xl hover:bg-touchDark/90 transition-all duration-300 shadow-sm shadow-touchDark/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={cartItems.length === 0 || loading}
                            onClick={placeOrderHandler}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>PLACE ORDER <ChevronRight size={18} /></>
                            )}
                        </button>

                        <p className="text-center text-xs text-touchDark/30 mt-3 font-light">
                            By placing your order, you agree to our Terms &amp; Conditions
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaceOrder;
