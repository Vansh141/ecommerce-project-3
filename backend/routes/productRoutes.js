const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

// ─── GET /api/products ────────────────────────────────────────────────────────
// Public: get all products (supports ?keyword= and ?category= filters)
router.get('/', async (req, res) => {
    try {
        const keyword = req.query.keyword
            ? { name: { $regex: req.query.keyword, $options: 'i' } }
            : {};
        const category = req.query.category ? { category: req.query.category } : {};
        const products = await Product.find({ ...keyword, ...category });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
// Public: get single product
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// ─── POST /api/products ───────────────────────────────────────────────────────
// Admin: create a new product (seeded with sample data for immediate editing)
router.post('/', protect, admin, async (req, res) => {
    try {
        const {
            name, price, image, brand, category,
            countInStock, description, discount
        } = req.body;

        const product = new Product({
            name: name || 'New Product',
            price: price || 0,
            image: image || 'https://via.placeholder.com/300',
            brand: brand || 'TOUCH',
            category: category || 'Uncategorized',
            countInStock: countInStock || 0,
            numReviews: 0,
            rating: 0,
            description: description || 'Product description',
            discount: discount || 0,
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        console.error('Create product error:', error.message);
        res.status(500).json({ message: 'Failed to create product' });
    }
});

// ─── PUT /api/products/:id ────────────────────────────────────────────────────
// Admin: update an existing product
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const {
            name, price, image, brand, category,
            countInStock, description, discount
        } = req.body;

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        product.name = name ?? product.name;
        product.price = price ?? product.price;
        product.image = image ?? product.image;
        product.brand = brand ?? product.brand;
        product.category = category ?? product.category;
        product.countInStock = countInStock ?? product.countInStock;
        product.description = description ?? product.description;
        product.discount = discount ?? product.discount;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        console.error('Update product error:', error.message);
        res.status(500).json({ message: 'Failed to update product' });
    }
});

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
// Admin: delete a product
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        await product.deleteOne();
        res.json({ message: 'Product removed successfully' });
    } catch (error) {
        console.error('Delete product error:', error.message);
        res.status(500).json({ message: 'Failed to delete product' });
    }
});

module.exports = router;
