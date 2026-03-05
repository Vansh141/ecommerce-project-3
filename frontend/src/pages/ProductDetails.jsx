import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Star, ShoppingCart, ArrowLeft, Minus, Plus, Heart } from 'lucide-react';
import api from '../services/api';

const ProductDetails = () => {
    const { id } = useParams();
    const { addToCart } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState(null);
    const availableSizes = ["S", "M", "L", "XL"];

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const { data } = await api.get(`/products/${id}`);
                setProduct(data);
                setError(null);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch product');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    const handleQuantityChange = (type) => {
        if (type === 'increase') {
            if (product.countInStock && product.countInStock > quantity) {
                setQuantity(prev => prev + 1);
            } else if (!product.countInStock) {
                setQuantity(prev => prev + 1); // allow infinite if countInStock undefined
            }
        } else if (type === 'decrease') {
            if (quantity > 1) setQuantity(prev => prev - 1);
        }
    };

    const handleAddToCart = () => {
        if (!selectedSize) return;
        addToCart(product, quantity, selectedSize);
    };

    if (loading) return <ProductSkeleton />;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                <div className="bg-red-50 text-red-500 rounded-full p-4 mb-4">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
                <p className="text-gray-500 mb-6">{error}</p>
                <Link to="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-6 py-2 rounded-lg transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Products
                </Link>
            </div>
        );
    }

    if (!product) return null;

    const hasDiscount = product.discount && product.discount > 0;
    const originalPrice = hasDiscount ? (product.price * (1 + product.discount / 100)) : null;
    const isOutOfStock = product.countInStock === 0;

    return (
        <div className="max-w-6xl mx-auto pb-12">
            {/* Breadcrumb / Back button */}
            <div className="mb-8">
                <Link to="/" className="inline-flex items-center text-gray-500 hover:text-indigo-600 transition-colors font-medium text-sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Shopping
                </Link>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:gap-8">
                    {/* Left: Product Image */}
                    <div className="p-8 lg:p-12 bg-gray-50/50 flex items-center justify-center relative">
                        {hasDiscount && (
                            <div className="absolute top-8 left-8 bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-full z-10 shadow-sm">
                                -{product.discount}% OFF
                            </div>
                        )}
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full max-w-md object-contain mix-blend-multiply drop-shadow-xl hover:scale-105 transition-transform duration-500 ease-out"
                        />
                    </div>

                    {/* Right: Product Details */}
                    <div className="p-8 lg:p-12 flex flex-col justify-center">
                        <div className="mb-2 text-indigo-500 font-semibold uppercase tracking-wider text-sm">
                            {product.brand || 'Premium Brand'}
                        </div>

                        <div className="flex items-start justify-between gap-4 mb-4">
                            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                                {product.name}
                            </h1>
                            <button
                                onClick={() => toggleWishlist(product)}
                                className="mt-1 p-3 rounded-full bg-gray-50 hover:bg-touchPink/10 transition-colors duration-300 border border-gray-100 shrink-0"
                            >
                                <Heart
                                    size={24}
                                    className={`transition-all duration-300 ${isInWishlist(product._id || product.id) ? 'fill-touchPink text-touchPink scale-110' : 'text-gray-400 hover:text-touchPink'}`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex items-center text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={18}
                                        fill={i < Math.round(product.rating || 0) ? "currentColor" : "none"}
                                        className={i < Math.round(product.rating || 0) ? "text-amber-400" : "text-gray-200"}
                                    />
                                ))}
                            </div>
                            <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                                {product.numReviews || 0} Reviews
                            </span>
                        </div>

                        <div className="mb-8 flex items-end gap-4">
                            <span className="text-4xl font-extrabold tracking-tight text-gray-900 shadow-sm">
                                ₹{Number(product.price).toFixed(2)}
                            </span>
                            {hasDiscount && (
                                <span className="text-xl text-gray-400 line-through decoration-gray-300 font-medium mb-1">
                                    ₹{Number(originalPrice).toFixed(2)}
                                </span>
                            )}
                        </div>

                        <p className="text-gray-600 mb-8 leading-relaxed">
                            {product.description || 'Welcome to our premium store. Add this wonderful item to your cart.'}
                        </p>

                        <div className="space-y-6">
                            {/* Stock Status */}
                            <div className="flex items-center justify-between py-4 border-t border-gray-100 mb-2">
                                <span className="text-gray-700 font-medium">Availability</span>
                                <span className={`font-semibold ${isOutOfStock ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {isOutOfStock ? 'Out of Stock' : `In Stock (${product.countInStock !== undefined ? product.countInStock : 'Plenty'})`}
                                </span>
                            </div>

                            {!isOutOfStock && (
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-touchDark font-medium">Select Size</span>
                                    </div>
                                    <div className="flex gap-3">
                                        {availableSizes.map(size => (
                                            <button
                                                key={size}
                                                onClick={() => setSelectedSize(size)}
                                                className={`w-12 h-12 rounded-full border flex items-center justify-center text-sm font-medium transition-all duration-300 ${selectedSize === size
                                                    ? 'border-touchDark bg-touchDark text-white shadow-md'
                                                    : 'border-neutral-300 text-touchDark hover:border-touchDark'
                                                    }`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                    {!selectedSize && (
                                        <p className="text-touchDark/50 italic text-xs mt-3">Please select a size to continue</p>
                                    )}
                                </div>
                            )}

                            {!isOutOfStock && (
                                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                    {/* Quantity Selector */}
                                    <div className="flex items-center justify-between border border-neutral-300 rounded-xl px-4 py-3 bg-white w-full sm:w-32 shadow-sm">
                                        <button
                                            onClick={() => handleQuantityChange('decrease')}
                                            disabled={quantity <= 1}
                                            className="text-touchDark/60 hover:text-touchDark disabled:opacity-50 transition-colors"
                                        >
                                            <Minus size={18} />
                                        </button>
                                        <span className="font-semibold text-touchDark min-w-[3ch] text-center">
                                            {quantity}
                                        </span>
                                        <button
                                            onClick={() => handleQuantityChange('increase')}
                                            disabled={product.countInStock !== undefined && quantity >= product.countInStock}
                                            className="text-touchDark/60 hover:text-touchDark disabled:opacity-50 transition-colors"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>

                                    {/* Add to Cart Button */}
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={isOutOfStock || !selectedSize}
                                        className="flex-1 flex items-center justify-center gap-2 bg-touchDark text-white font-serif tracking-wide py-3 px-6 rounded-xl hover:bg-touchDark/90 transition-all duration-300 active:scale-[0.98] shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ShoppingCart size={20} />
                                        <span>Add to Cart</span>
                                    </button>
                                </div>
                            )}

                            {isOutOfStock && (
                                <button disabled className="w-full py-4 rounded-xl bg-gray-100 text-gray-500 font-semibold cursor-not-allowed border border-gray-200">
                                    Currently Unavailable
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProductSkeleton = () => (
    <div className="max-w-6xl mx-auto pb-12 animate-pulse">
        <div className="w-32 h-6 bg-gray-200 rounded mb-8"></div>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:gap-8">
                <div className="p-8 lg:p-12 bg-gray-50/50 aspect-square md:aspect-auto"></div>
                <div className="p-8 lg:p-12 flex flex-col justify-center space-y-6">
                    <div className="w-24 h-4 bg-gray-200 rounded"></div>
                    <div className="w-3/4 h-10 bg-gray-200 rounded"></div>
                    <div className="w-48 h-6 bg-gray-200 rounded"></div>
                    <div className="w-32 h-10 bg-gray-200 rounded"></div>
                    <div className="space-y-3">
                        <div className="w-full h-4 bg-gray-200 rounded"></div>
                        <div className="w-full h-4 bg-gray-200 rounded"></div>
                        <div className="w-5/6 h-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="w-full h-12 bg-gray-200 rounded-xl mt-4"></div>
                </div>
            </div>
        </div>
    </div>
);

export default ProductDetails;
