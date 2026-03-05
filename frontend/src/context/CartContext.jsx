import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// ── Helpers ─────────────────────────────────────────────────────────────────
const cartKey = (uid) => uid ? `cart_${uid}` : 'cart_guest';
const addressKey = (uid) => uid ? `shippingAddress_${uid}` : 'shippingAddress_guest';
const paymentKey = (uid) => uid ? `paymentMethod_${uid}` : 'paymentMethod_guest';

const load = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

// ── Provider ─────────────────────────────────────────────────────────────────
export const CartProvider = ({ children, userId }) => {
    // Re-initialise state whenever userId changes (login / logout / switch account)
    const [cartItems, setCartItems] = useState(() => load(cartKey(userId), []));
    const [shippingAddress, setShippingAddress] = useState(() =>
        load(addressKey(userId), { fullName: '', address: '', city: '', state: '', postalCode: '', phone: '' })
    );
    const [paymentMethod, setPaymentMethod] = useState(() =>
        load(paymentKey(userId), 'Cash on Delivery')
    );

    // When userId changes (login / logout), reload from that user's storage slot
    useEffect(() => {
        setCartItems(load(cartKey(userId), []));
        setShippingAddress(load(addressKey(userId), { fullName: '', address: '', city: '', state: '', postalCode: '', phone: '' }));
        setPaymentMethod(load(paymentKey(userId), 'Cash on Delivery'));
    }, [userId]);

    // Persist whenever state changes
    useEffect(() => {
        localStorage.setItem(cartKey(userId), JSON.stringify(cartItems));
    }, [cartItems, userId]);

    useEffect(() => {
        localStorage.setItem(addressKey(userId), JSON.stringify(shippingAddress));
    }, [shippingAddress, userId]);

    useEffect(() => {
        localStorage.setItem(paymentKey(userId), paymentMethod);
    }, [paymentMethod, userId]);

    // ── Cart Actions ────────────────────────────────────────────────────────
    const addToCart = (product, quantity = 1, size = null) => {
        setCartItems((prevItems) => {
            const id = product._id || product.id;
            const uniqueId = size ? `${id}-${size}` : String(id);

            const existingItem = prevItems.find((item) => {
                const itemId = item.cartItemId || (item.size ? `${item._id || item.id}-${item.size}` : String(item._id || item.id));
                return itemId === uniqueId;
            });

            if (existingItem) {
                return prevItems.map((item) => {
                    const itemId = item.cartItemId || (item.size ? `${item._id || item.id}-${item.size}` : String(item._id || item.id));
                    return itemId === uniqueId ? { ...item, qty: item.qty + quantity } : item;
                });
            }
            return [...prevItems, { ...product, qty: quantity, size, cartItemId: uniqueId }];
        });
    };

    const removeFromCart = (targetId) => {
        setCartItems((prevItems) => prevItems.filter((item) => {
            const itemId = item.cartItemId || (item.size ? `${item._id || item.id}-${item.size}` : String(item._id || item.id));
            return itemId !== targetId;
        }));
    };

    const updateQuantity = (targetId, qty) => {
        if (qty < 1) return;
        setCartItems((prevItems) =>
            prevItems.map((item) => {
                const itemId = item.cartItemId || (item.size ? `${item._id || item.id}-${item.size}` : String(item._id || item.id));
                return itemId === targetId ? { ...item, qty } : item;
            })
        );
    };

    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem(cartKey(userId));
    };

    const subtotal = cartItems.reduce((acc, item) => acc + Number(item.price) * item.qty, 0);
    const total = subtotal;

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            subtotal,
            total,
            cartCount: cartItems.reduce((acc, item) => acc + item.qty, 0),
            shippingAddress,
            setShippingAddress,
            paymentMethod,
            setPaymentMethod,
        }}>
            {children}
        </CartContext.Provider>
    );
};
