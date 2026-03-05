const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { protect, admin } = require('../middleware/auth');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { message: 'Too many authentication attempts, please try again after 15 minutes' }
});

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Login
router.post('/login', authLimiter, [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').exists().withMessage('Password is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
});

// Register
router.post('/register', authLimiter, [
    body('name').trim().notEmpty().escape().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({ name, email, password: hashedPassword });
    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
});

// Forgot Password
router.post('/forgot-password', authLimiter, [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email to reset')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
    const message = `You are receiving this email because you recently requested to reset your password for your TOUCH Boutique account.\n\nPlease navigate to the following link to reset your password:\n\n${resetUrl}\n\nThis token will securely expire in 15 minutes.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'TOUCH Boutique - Password Reset Requested',
            message,
        });
        res.status(200).json({ success: true, message: 'Recovery email sent gracefully' });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        return res.status(500).json({ message: 'Email could not be transmitted securely' });
    }
});

// Reset Password
router.post('/reset-password/:token', [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new password reset.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successfully! You can now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
});

// ─── GET /api/users/admin/users ───────────────────────────────────────────────
// Admin: get all users
router.get('/admin/users', protect, admin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error('Get all users error:', error.message);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// ─── DELETE /api/users/admin/users/:id ───────────────────────────────────────
// Admin: delete a user
router.delete('/admin/users/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.isAdmin) {
            return res.status(400).json({ message: 'Cannot delete an admin user' });
        }
        await user.deleteOne();
        res.json({ message: 'User removed successfully' });
    } catch (error) {
        console.error('Delete user error:', error.message);
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// ─── PUT /api/users/admin/users/:id/role ─────────────────────────────────────
// Admin: toggle isAdmin for a user (cannot change own role)
router.put('/admin/users/:id/role', protect, admin, async (req, res) => {
    try {
        // Prevent self-demotion
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot change your own role.' });
        }
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.isAdmin = !user.isAdmin;
        await user.save();
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
        });
    } catch (error) {
        console.error('Toggle role error:', error.message);
        res.status(500).json({ message: 'Failed to update user role' });
    }
});

// ─── GET /api/users/admin/stats ───────────────────────────────────────────────
// Admin: get dashboard stats (users, orders, products, revenue)
router.get('/admin/stats', protect, admin, async (req, res) => {
    try {
        const Order = require('../models/Order');
        const Product = require('../models/Product');

        const [totalUsers, totalOrders, totalProducts, revenueResult] = await Promise.all([
            User.countDocuments(),
            Order.countDocuments(),
            Product.countDocuments(),
            Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        res.json({ totalUsers, totalOrders, totalProducts, totalRevenue });
    } catch (error) {
        console.error('Admin stats error:', error.message);
        res.status(500).json({ message: 'Failed to fetch stats' });
    }
});

// ─── POST /api/users/subscribe ────────────────────────────────────────────────
// Public — add an email to the newsletter list
router.post('/subscribe', [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    try {
        const Subscriber = require('../models/Subscriber');
        const { email } = req.body;
        const exists = await Subscriber.findOne({ email });
        if (exists) {
            return res.status(200).json({ message: 'You are already subscribed. Thank you!' });
        }
        await Subscriber.create({ email });
        res.status(201).json({ message: 'Thank you for subscribing! 🎉' });
    } catch (error) {
        console.error('Subscribe error:', error.message);
        res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
});

module.exports = router;
