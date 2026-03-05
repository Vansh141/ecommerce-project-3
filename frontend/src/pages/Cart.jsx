import React from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, Minus, Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Cart = () => {
    const { cartItems, updateQuantity, removeFromCart, subtotal, total } = useCart();

    if (cartItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-400">
                    <Trash2 size={48} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
                <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
                <Link to="/" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2">
                    <ArrowLeft size={20} /> Continue Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="py-2">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart ({cartItems.reduce((a, c) => a + c.qty, 0)})</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Cart Items List */}
                <div className="flex-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            {cartItems.map((item, idx) => {
                                const cartItemId = item.cartItemId || (item.size ? `${item._id || item.id}-${item.size}` : String(item._id || item.id));
                                return (
                                    <div key={cartItemId} className={`flex flex-col sm:flex-row items-center gap-6 py-4 ${idx !== cartItems.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                        <div className="w-24 h-24 bg-gray-50 rounded-lg p-2 flex shrink-0">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                                        </div>

                                        <div className="flex-1 flex flex-col sm:flex-row w-full gap-4">
                                            <div className="flex-1">
                                                <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">{item.name}</h3>
                                                <p className="text-sm text-gray-500 mb-2">
                                                    {item.brand || 'Premium Brand'}
                                                    {item.size && <span className="ml-2 pl-2 border-l border-gray-300 font-medium text-gray-700">Size: {item.size}</span>}
                                                </p>
                                                <button
                                                    onClick={() => removeFromCart(cartItemId)}
                                                    className="text-red-500 text-sm font-medium flex items-center gap-1 hover:text-red-600 transition"
                                                >
                                                    <Trash2 size={16} /> Remove
                                                </button>
                                            </div>

                                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                                                <span className="font-bold text-gray-900">₹{(Number(item.price) * item.qty).toFixed(2)}</span>

                                                <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                                                    <button
                                                        onClick={() => updateQuantity(cartItemId, item.qty - 1)}
                                                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition rounded-l-lg"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="w-10 h-8 flex items-center justify-center font-medium text-gray-700 text-sm border-x border-gray-200">
                                                        {item.qty}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(cartItemId, item.qty + 1)}
                                                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition rounded-r-lg"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-between items-center sm:hidden">
                            <span className="font-medium text-gray-700">Subtotal:</span>
                            <span className="font-bold text-gray-900">₹{subtotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="w-full lg:w-80 shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

                        <div className="space-y-3 text-sm text-gray-600 mb-6">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="font-medium text-gray-900">₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Discount</span>
                                <span className="text-green-500 font-medium">-₹0.00</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax</span>
                                <span className="font-medium text-gray-900">₹0.00</span>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-4 mb-6">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-gray-900">Total</span>
                                <span className="text-xl font-bold text-gray-900">₹{total.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-gray-500 text-right">Includes taxes and shipping</p>
                        </div>

                        <Link to="/shipping" className="block text-center w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm hover:-translate-y-0.5 transform mb-3">
                            Checkout
                        </Link>
                        <Link to="/" className="w-full bg-white text-blue-600 border border-gray-200 py-3 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center">
                            Continue Shopping
                        </Link>

                        <div className="mt-6 flex justify-center gap-2 grayscale opacity-60">
                            {/* Payment icons placeholder */}
                            <div className="h-6 w-10 bg-gray-200 rounded border border-gray-300"></div>
                            <div className="h-6 w-10 bg-gray-200 rounded border border-gray-300"></div>
                            <div className="h-6 w-10 bg-gray-200 rounded border border-gray-300"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
