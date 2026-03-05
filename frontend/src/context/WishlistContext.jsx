import React, { createContext, useContext, useState, useEffect } from 'react';

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

// ── Helpers ──────────────────────────────────────────────────────────────────
const wishlistKey = (uid) => uid ? `wishlist_${uid}` : 'wishlist_guest';

const load = (key) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const WishlistProvider = ({ children, userId }) => {
    const [wishlistItems, setWishlistItems] = useState(() => load(wishlistKey(userId)));

    // Reload when userId changes (login / logout / switch account)
    useEffect(() => {
        setWishlistItems(load(wishlistKey(userId)));
    }, [userId]);

    // Persist on every change
    useEffect(() => {
        localStorage.setItem(wishlistKey(userId), JSON.stringify(wishlistItems));
    }, [wishlistItems, userId]);

    const addToWishlist = (product) => {
        setWishlistItems((prev) => {
            if (!prev.find(item => (item._id || item.id) === (product._id || product.id))) {
                return [...prev, product];
            }
            return prev;
        });
    };

    const removeFromWishlist = (productId) => {
        setWishlistItems((prev) => prev.filter(item => (item._id || item.id) !== productId));
    };

    const toggleWishlist = (product) => {
        const id = product._id || product.id;
        setWishlistItems((prev) => {
            const exists = prev.find(item => (item._id || item.id) === id);
            return exists
                ? prev.filter(item => (item._id || item.id) !== id)
                : [...prev, product];
        });
    };

    const isInWishlist = (productId) =>
        wishlistItems.some(item => (item._id || item.id) === productId);

    return (
        <WishlistContext.Provider value={{
            wishlistItems,
            addToWishlist,
            removeFromWishlist,
            toggleWishlist,
            isInWishlist,
            wishlistCount: wishlistItems.length,
        }}>
            {children}
        </WishlistContext.Provider>
    );
};
