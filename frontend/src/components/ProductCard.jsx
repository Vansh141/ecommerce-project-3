import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Minus, Plus, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

const ProductCard = ({ item }) => {
    const { addToCart, cartItems, updateQuantity, removeFromCart } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const isWishlisted = isInWishlist(item._id || item.id);

    // ── Find this item in the cart ───────────────────────────────────────────
    const productId = item._id || item.id;
    const cartItem = cartItems.find(ci => {
        const ciId = ci._id || ci.id;
        // match without size (product cards don't have size selection)
        return String(ciId) === String(productId);
    });
    const cartQty = cartItem ? cartItem.qty : 0;
    const inCart = cartQty > 0;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const hasDiscount = item.discount && item.discount > 0;
    const originalPrice = hasDiscount ? (item.price * (1 + item.discount / 100)) : null;

    const handleAdd = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(item);
    };

    const handleIncrease = (e) => {
        e.preventDefault();
        e.stopPropagation();
        updateQuantity(cartItem.cartItemId, cartQty + 1);
    };

    const handleDecrease = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (cartQty === 1) {
            removeFromCart(cartItem.cartItemId);
        } else {
            updateQuantity(cartItem.cartItemId, cartQty - 1);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-4 flex flex-col h-full border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">

            {/* Discount Badge */}
            {hasDiscount && (
                <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-20 shadow-sm">
                    -{item.discount}%
                </div>
            )}

            {/* ── Cart Quantity Badge on image ─────────────────────────────── */}
            {inCart && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md animate-[fadeIn_0.2s_ease]">
                    <Check size={11} strokeWidth={3} />
                    {cartQty} in cart
                </div>
            )}

            {/* Wishlist Button */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist(item);
                }}
                className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-all duration-300 hover:scale-110"
            >
                <Heart
                    size={18}
                    className={`transition-colors duration-300 ${isWishlisted ? 'fill-touchPink text-touchPink' : 'text-touchDark/50 hover:text-touchPink'}`}
                />
            </button>

            {/* Image Container */}
            <Link to={`/product/${productId}`} className="block h-48 mb-5 flex items-center justify-center bg-gray-50/50 rounded-xl overflow-hidden p-4 relative cursor-pointer">
                <div className="absolute inset-0 bg-indigo-50/0 group-hover:bg-indigo-50/30 transition-colors duration-300"></div>
                <img
                    src={item.image}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-110 z-0"
                />
            </Link>

            {/* Content Container */}
            <div className="flex flex-col flex-1 px-1">
                {/* Brand & Title */}
                <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-1">{item.brand || 'Premium'}</p>
                <Link to={`/product/${productId}`} className="flex-1" title={item.name}>
                    <h3 className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-indigo-600 transition-colors duration-300 leading-snug">
                        {item.name}
                    </h3>
                </Link>

                {/* Rating */}
                <div className="flex items-center text-amber-400 mt-2 mb-3">
                    <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                size={14}
                                fill={i < Math.round(item.rating || 0) ? "currentColor" : "none"}
                                className={i < Math.round(item.rating || 0) ? "text-amber-400" : "text-gray-200"}
                            />
                        ))}
                    </div>
                    <span className="text-xs text-gray-400 ml-2 font-medium">({item.numReviews || 0})</span>
                </div>

                {/* Price */}
                <div className="flex items-end justify-between mt-auto pt-3 border-t border-gray-50">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold tracking-tight text-gray-900">
                                ₹{Number(item.price).toFixed(2)}
                            </span>
                            {hasDiscount && (
                                <span className="text-sm text-gray-400 line-through decoration-gray-300">
                                    ₹{Number(originalPrice).toFixed(2)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Cart Action ───────────────────────────────────────────── */}
                {inCart ? (
                    /* Quantity stepper — shown when item is already in cart */
                    <div className="mt-4 flex items-center rounded-xl overflow-hidden border border-emerald-200 bg-emerald-50">
                        {/* Decrease / Remove */}
                        <button
                            onClick={handleDecrease}
                            className="flex-none w-10 h-10 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors active:scale-90"
                        >
                            <Minus size={15} strokeWidth={2.5} />
                        </button>

                        {/* Quantity display */}
                        <div className="flex-1 flex flex-col items-center justify-center py-1">
                            <span className="text-base font-bold text-emerald-700 leading-none">{cartQty}</span>
                            <span className="text-[10px] text-emerald-500 font-medium leading-none mt-0.5">in cart</span>
                        </div>

                        {/* Increase */}
                        <button
                            onClick={handleIncrease}
                            className="flex-none w-10 h-10 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors active:scale-90"
                        >
                            <Plus size={15} strokeWidth={2.5} />
                        </button>
                    </div>
                ) : (
                    /* Default Add to Cart button */
                    <button
                        onClick={handleAdd}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-medium py-2.5 rounded-xl text-sm transition-all duration-300 active:scale-95 shadow-[0_4px_14px_0_rgba(224,231,255,0.4)] group-hover:shadow-[0_4px_14px_0_rgba(79,70,229,0.3)]"
                    >
                        <ShoppingCart size={16} />
                        Add to Cart
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProductCard;
