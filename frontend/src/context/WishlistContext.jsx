import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
};

const keyFor = (userId) => `touch.wishlist.${userId || 'guest'}`;

const read = (userId) => {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id || null;
  const [items, setItems] = useState(() => read(null));

  useEffect(() => setItems(read(userId)), [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, userId]);

  const toggle = useCallback((product) => {
    setItems((prev) => {
      const exists = prev.some((p) => p._id === product._id);
      if (exists) return prev.filter((p) => p._id !== product._id);

      // Store a slim snapshot — enough to render a card without refetching.
      return [
        ...prev,
        {
          _id: product._id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          mrp: product.mrp,
          images: product.images?.slice(0, 1) || [],
          totalStock: product.totalStock,
          brand: product.brand,
        },
      ];
    });
  }, []);

  const remove = useCallback((productId) => {
    setItems((prev) => prev.filter((p) => p._id !== productId));
  }, []);

  const has = useCallback((productId) => items.some((p) => p._id === productId), [items]);

  const value = useMemo(
    () => ({ items, count: items.length, toggle, remove, has, clear: () => setItems([]) }),
    [items, toggle, remove, has]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
