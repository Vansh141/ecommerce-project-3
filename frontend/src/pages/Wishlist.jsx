import React from 'react';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';
import { Heart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Wishlist = () => {
    const { wishlistItems } = useWishlist();

    if (wishlistItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-24 h-24 bg-touchCream rounded-full flex items-center justify-center mb-6 text-touchPink">
                    <Heart size={40} className="opacity-80" />
                </div>
                <h2 className="text-3xl font-serif text-touchDark mb-3">Your wishlist is empty</h2>
                <p className="text-touchDark/60 mb-8 font-light tracking-wide max-w-md">Save your favorite boutique pieces here to review and shop later when you're ready.</p>
                <Link to="/" className="bg-touchDark text-white px-8 py-3.5 rounded-xl font-serif tracking-wide hover:bg-touchDark/90 transition-all duration-300 flex items-center gap-2 shadow-sm">
                    <ArrowLeft size={18} /> Continue Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="py-8 max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10 px-2.5">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-serif text-touchDark mb-2">My Wishlist</h1>
                    <p className="text-touchDark/60 font-light tracking-wide">{wishlistItems.length} {wishlistItems.length === 1 ? 'Item' : 'Items'} Saved</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2.5">
                {wishlistItems.map((product) => (
                    <ProductCard key={product._id || product.id} item={product} />
                ))}
            </div>
        </div>
    );
};

export default Wishlist;
