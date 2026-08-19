import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { orderApi } from '../api/endpoints';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};

const keyFor = (userId) => `touch.cart.${userId || 'guest'}`;

const readCart = (userId) => {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Identity of a bag line is (product, variant) — the same shirt in two sizes
 *  is two lines. */
const lineKey = (productId, variantId) => `${productId}::${variantId}`;

export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id || null;

  const [items, setItems] = useState(() => readCart(null));
  const [pricing, setPricing] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState(null);

  const requestSeq = useRef(0);

  // Reload the correct bag when the signed-in user changes.
  useEffect(() => {
    setItems(readCart(userId));
  }, [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(items));
    } catch {
      /* ignore quota/private-mode failures */
    }
  }, [items, userId]);

  /**
   * Re-prices the bag on the server whenever it changes.
   *
   * The client stores only ids, sizes and quantities — never money. Every
   * figure shown in the bag comes back from the same endpoint the order is
   * created through, which is why the cart total and the charged total can
   * never disagree.
   */
  useEffect(() => {
    if (items.length === 0) {
      setPricing(null);
      setCoupon(null);
      setPricingError(null);
      return undefined;
    }

    const seq = requestSeq.current + 1;
    requestSeq.current = seq;

    // Debounced so rapid quantity clicks issue one request, not five.
    const timer = setTimeout(async () => {
      setPricingLoading(true);
      try {
        const payload = {
          items: items.map((i) => ({ product: i.product, variantId: i.variantId, qty: i.qty })),
          couponCode: couponCode || null,
        };
        const result = await orderApi.preview(payload);
        if (requestSeq.current !== seq) return; // a newer request won

        setPricing(result.pricing);
        setCoupon(result.coupon);
        setPricingError(result.couponError || null);

        // Reconcile with server truth: names, prices and live stock may have
        // changed since the item was added.
        setItems((prev) =>
          prev.map((local) => {
            const fresh = result.items.find(
              (s) => lineKey(s.product, s.variantId) === lineKey(local.product, local.variantId)
            );
            return fresh
              ? {
                  ...local,
                  name: fresh.name,
                  image: fresh.image,
                  price: fresh.price,
                  mrp: fresh.mrp,
                  slug: fresh.slug,
                  size: fresh.size,
                  availableStock: fresh.availableStock,
                }
              : local;
          })
        );
      } catch (err) {
        if (requestSeq.current !== seq) return;
        setPricing(null);
        setPricingError(err.friendlyMessage || 'Could not price your bag.');
      } finally {
        if (requestSeq.current === seq) setPricingLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [items, couponCode]);

  const addItem = useCallback((product, variant, qty = 1) => {
    setItems((prev) => {
      const key = lineKey(product._id, variant._id);
      const existing = prev.find((i) => lineKey(i.product, i.variantId) === key);

      if (existing) {
        const nextQty = Math.min(existing.qty + qty, variant.stock, 10);
        return prev.map((i) =>
          lineKey(i.product, i.variantId) === key ? { ...i, qty: nextQty } : i
        );
      }

      return [
        ...prev,
        {
          product: product._id,
          variantId: variant._id,
          slug: product.slug,
          name: product.name,
          image: product.images?.[0]?.url || '',
          size: variant.size,
          sku: variant.sku,
          price: product.price,
          mrp: product.mrp,
          qty: Math.min(qty, variant.stock, 10),
          availableStock: variant.stock,
        },
      ];
    });
  }, []);

  const updateQty = useCallback((productId, variantId, qty) => {
    const next = Number(qty);
    if (!Number.isInteger(next) || next < 1) return;

    setItems((prev) =>
      prev.map((i) =>
        lineKey(i.product, i.variantId) === lineKey(productId, variantId)
          ? { ...i, qty: Math.min(next, 10) }
          : i
      )
    );
  }, []);

  const removeItem = useCallback((productId, variantId) => {
    setItems((prev) =>
      prev.filter((i) => lineKey(i.product, i.variantId) !== lineKey(productId, variantId))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCouponCode('');
    setCoupon(null);
    setPricing(null);
  }, []);

  const applyCoupon = useCallback((code) => setCouponCode(String(code || '').trim().toUpperCase()), []);
  const removeCoupon = useCallback(() => { setCouponCode(''); setCoupon(null); }, []);

  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);

  /** Optimistic subtotal for instant UI feedback; the server figure in
   *  `pricing` is always what the customer is actually charged. */
  const optimisticSubtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.price || 0) * i.qty, 0),
    [items]
  );

  const hasStockIssue = useMemo(
    () => items.some((i) => typeof i.availableStock === 'number' && i.qty > i.availableStock),
    [items]
  );

  const orderPayloadItems = useMemo(
    () => items.map((i) => ({ product: i.product, variantId: i.variantId, qty: i.qty })),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      count,
      pricing,
      optimisticSubtotal,
      pricingLoading,
      pricingError,
      coupon,
      couponCode,
      hasStockIssue,
      orderPayloadItems,
      addItem,
      updateQty,
      removeItem,
      clearCart,
      applyCoupon,
      removeCoupon,
    }),
    [
      items, count, pricing, optimisticSubtotal, pricingLoading, pricingError, coupon,
      couponCode, hasStockIssue, orderPayloadItems, addItem, updateQty, removeItem,
      clearCart, applyCoupon, removeCoupon,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
