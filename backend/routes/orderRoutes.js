const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

// ─── POST /api/orders ──────────────────────────────────────────────────────────
// Create a new order. Auth required.
// Prices are recalculated from DB to prevent client-side tampering.
router.post('/', protect, async (req, res) => {
    try {
        const { orderItems, shippingAddress, paymentMethod } = req.body;

        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({ message: 'No order items provided' });
        }

        if (!shippingAddress || !shippingAddress.address || !shippingAddress.postalCode) {
            return res.status(400).json({ message: 'Shipping address is incomplete' });
        }

        if (!paymentMethod) {
            return res.status(400).json({ message: 'Payment method is required' });
        }

        // Fetch authoritative prices from DB — never trust client prices
        const productIds = orderItems.map((x) => x.product);
        const itemsFromDB = await Product.find({ _id: { $in: productIds } });

        // Validate each item and rebuild with DB-authoritative price
        const dbOrderItems = orderItems.map((itemFromClient) => {
            const dbProduct = itemsFromDB.find(
                (p) => p._id.toString() === itemFromClient.product
            );

            if (!dbProduct) {
                throw new Error(`Product not found: ${itemFromClient.product}`);
            }
            if (dbProduct.countInStock < itemFromClient.qty) {
                throw new Error(`Insufficient stock for "${dbProduct.name}". Only ${dbProduct.countInStock} left.`);
            }

            return {
                name: dbProduct.name,
                qty: itemFromClient.qty,
                image: dbProduct.image,
                price: dbProduct.price,          // Authoritative price from DB
                size: itemFromClient.size || 'One Size',
                product: dbProduct._id,
            };
        });

        // Recalculate all prices securely on the backend
        const itemsPrice = dbOrderItems.reduce((acc, item) => acc + item.price * item.qty, 0);
        const shippingPrice = itemsPrice > 999 ? 0 : 99;      // Free shipping over ₹999
        const taxPrice = Number((0.18 * itemsPrice).toFixed(2)); // 18% GST
        const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

        // Create and save order
        const order = new Order({
            orderItems: dbOrderItems,
            user: req.user._id,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalPrice,
        });

        const createdOrder = await order.save();

        // Decrement stock for each product
        for (const item of dbOrderItems) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { countInStock: -item.qty } }
            );
        }

        // Return just the ID and summary — frontend navigates to /order-success/:id
        res.status(201).json({
            _id: createdOrder._id,
            totalPrice: createdOrder.totalPrice,
            paymentMethod: createdOrder.paymentMethod,
            createdAt: createdOrder.createdAt,
        });

    } catch (error) {
        console.error('Create order error:', error.message);
        res.status(400).json({ message: error.message || 'Failed to create order' });
    }
});

// ─── GET /api/orders/:id ───────────────────────────────────────────────────────
// Get a single order by ID. Auth required. User can only view their own orders.
router.get('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Ensure user can only see their own orders (admins can see all)
        if (!req.user.isAdmin && order.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this order' });
        }

        res.json(order);
    } catch (error) {
        console.error('Get order error:', error.message);
        res.status(500).json({ message: 'Failed to fetch order' });
    }
});

// ─── GET /api/orders/my/orders ────────────────────────────────────────────────
// Get all orders for the logged-in user.
router.get('/my/orders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Get my orders error:', error.message);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// ─── GET /api/orders/admin/all ───────────────────────────────────────────────
// Admin: get all orders with user name + email populated
router.get('/admin/all', protect, admin, async (req, res) => {
    try {
        const orders = await Order.find({}).populate('user', 'name email').sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Admin get all orders error:', error.message);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// ─── PUT /api/orders/:id/deliver ─────────────────────────────────────────────
// Admin: mark an order as delivered
router.put('/:id/deliver', protect, admin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } catch (error) {
        console.error('Mark delivered error:', error.message);
        res.status(500).json({ message: 'Failed to update delivery status' });
    }
});

module.exports = router;
