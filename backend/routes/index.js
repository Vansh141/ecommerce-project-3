const express = require('express');
const validate = require('../middleware/validate');
const { protect, requireAdmin, optionalAuth } = require('../middleware/auth');
const { requireCsrfHeader } = require('../services/tokenService');
const { uploadSingleImage, uploadMultipleImages } = require('../middleware/upload');
const limiters = require('../middleware/rateLimiters');
const v = require('../validators');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const productController = require('../controllers/productController');
const categoryController = require('../controllers/categoryController');
const orderController = require('../controllers/orderController');
const paymentController = require('../controllers/paymentController');
const couponController = require('../controllers/couponController');
const reviewController = require('../controllers/reviewController');
const uploadController = require('../controllers/uploadController');
const contactController = require('../controllers/contactController');
const adminController = require('../controllers/adminController');

const router = express.Router();

/* ══════════════════════════ AUTH ══════════════════════════════════════════ */
const auth = express.Router();

auth.post('/register', limiters.authLimiter, v.registerRules, validate, authController.register);
auth.post('/login', limiters.authLimiter, v.loginRules, validate, authController.login);

// Cookie-authenticated endpoints require the custom header, which forces a CORS
// preflight that only allowlisted origins can pass — our CSRF defence.
auth.post('/refresh', requireCsrfHeader, authController.refresh);
auth.post('/logout', requireCsrfHeader, authController.logout);
auth.post('/logout-all', requireCsrfHeader, protect, authController.logoutAll);

auth.post('/forgot-password', limiters.passwordResetLimiter, v.forgotPasswordRules, validate, authController.forgotPassword);
auth.post('/reset-password/:token', limiters.passwordResetLimiter, v.resetPasswordRules, validate, authController.resetPassword);
auth.post('/verify-email/:token', limiters.authLimiter, authController.verifyEmail);
auth.post('/resend-verification', limiters.passwordResetLimiter, protect, authController.resendVerification);
auth.get('/me', protect, authController.me);

router.use('/auth', auth);

/* ══════════════════════════ USERS ═════════════════════════════════════════ */
const users = express.Router();
users.use(protect); // every route below requires a signed-in user

users.get('/profile', userController.getProfile);
users.put('/profile', v.updateProfileRules, validate, userController.updateProfile);
users.put('/password', v.changePasswordRules, validate, userController.changePassword);
users.delete('/account', v.deleteAccountRules, validate, userController.deleteAccount);

users.get('/addresses', userController.listAddresses);
users.post('/addresses', v.addressRules, validate, userController.addAddress);
users.put('/addresses/:addressId', v.objectIdParam('addressId'), v.addressRules, validate, userController.updateAddress);
users.delete('/addresses/:addressId', v.objectIdParam('addressId'), validate, userController.deleteAddress);
users.patch('/addresses/:addressId/default', v.objectIdParam('addressId'), validate, userController.setDefaultAddress);

router.use('/users', users);

/* ══════════════════════════ CATEGORIES ════════════════════════════════════ */
const categories = express.Router();

categories.get('/', optionalAuth, categoryController.listCategories);
categories.post('/', protect, requireAdmin, v.createCategoryRules, validate, categoryController.createCategory);
categories.put('/:id', protect, requireAdmin, v.updateCategoryRules, validate, categoryController.updateCategory);
categories.delete('/:id', protect, requireAdmin, v.objectIdParam('id'), validate, categoryController.deleteCategory);
// Declared last so it cannot shadow the literal routes above.
categories.get('/:slug', optionalAuth, categoryController.getCategory);

router.use('/categories', categories);

/* ══════════════════════════ PRODUCTS ══════════════════════════════════════ */
const products = express.Router();

// Literal paths first — otherwise "/facets" would be captured by "/:slug".
products.get('/', v.productListRules, validate, productController.listProducts);
products.get('/facets', productController.getFacets);
products.get('/collections/home', productController.getHomeCollections);

products.post('/', protect, requireAdmin, v.createProductRules, validate, productController.createProduct);
products.put('/:id', protect, requireAdmin, v.updateProductRules, validate, productController.updateProduct);
products.patch('/:id/archive', protect, requireAdmin, v.objectIdParam('id'), validate, productController.archiveProduct);
products.delete('/:id', protect, requireAdmin, v.objectIdParam('id'), validate, productController.deleteProduct);
products.patch('/:id/variants/:variantId/stock', protect, requireAdmin, v.stockRules, validate, productController.updateVariantStock);

// Reviews nested under a product.
products.get('/:productId/reviews', v.objectIdParam('productId'), validate, reviewController.listProductReviews);
products.get('/:productId/reviews/eligibility', protect, v.objectIdParam('productId'), validate, reviewController.getReviewEligibility);
products.post('/:productId/reviews', protect, v.createReviewRules, validate, reviewController.createReview);

products.get('/:slug/related', productController.getRelatedProducts);
products.get('/:slug', optionalAuth, productController.getProduct);

router.use('/products', products);

/* ══════════════════════════ REVIEWS ═══════════════════════════════════════ */
const reviews = express.Router();

reviews.put('/:id', protect, v.updateReviewRules, validate, reviewController.updateReview);
reviews.delete('/:id', protect, v.objectIdParam('id'), validate, reviewController.deleteReview);
reviews.get('/', protect, requireAdmin, reviewController.listAllReviews);
reviews.patch('/:id/approval', protect, requireAdmin, v.objectIdParam('id'), validate, reviewController.setReviewApproval);

router.use('/reviews', reviews);

/* ══════════════════════════ ORDERS ════════════════════════════════════════ */
const orders = express.Router();

// Pricing a basket is a public operation — a guest must be able to see their
// bag total before being asked to sign in. `optionalAuth` still identifies a
// signed-in shopper so per-user coupon limits can be applied.
orders.post('/preview', optionalAuth, v.previewOrderRules, validate, orderController.previewOrder);
orders.post('/', protect, limiters.orderLimiter, v.createOrderRules, validate, orderController.createOrder);
orders.get('/mine', protect, orderController.listMyOrders);

orders.get('/', protect, requireAdmin, orderController.listAllOrders);
orders.patch('/:id/status', protect, requireAdmin, v.orderStatusRules, validate, orderController.updateOrderStatus);
orders.post('/:id/refund', protect, requireAdmin, v.refundRules, validate, orderController.refundOrder);

orders.post('/:id/cancel', protect, v.cancelOrderRules, validate, orderController.cancelMyOrder);
orders.get('/:id', protect, v.objectIdParam('id'), validate, orderController.getOrder);

router.use('/orders', orders);

/* ══════════════════════════ PAYMENTS ══════════════════════════════════════ */
// NOTE: POST /api/payments/webhook is mounted separately in app.js because it
// needs the raw request body for signature verification.
const payments = express.Router();

payments.get('/config', paymentController.getPaymentConfig);
payments.post('/:orderId/create', protect, limiters.paymentLimiter, v.objectIdParam('orderId'), validate, paymentController.createPaymentOrder);
payments.post('/:orderId/verify', protect, limiters.paymentLimiter, v.verifyPaymentRules, validate, paymentController.verifyPayment);
payments.patch('/:orderId/cod-paid', protect, requireAdmin, v.objectIdParam('orderId'), validate, paymentController.markCodPaid);

router.use('/payments', payments);

/* ══════════════════════════ COUPONS ═══════════════════════════════════════ */
const coupons = express.Router();

coupons.post('/validate', protect, limiters.couponLimiter, v.validateCouponRules, validate, couponController.validateCoupon);
coupons.get('/', protect, requireAdmin, couponController.listCoupons);
coupons.post('/', protect, requireAdmin, v.createCouponRules, validate, couponController.createCoupon);
coupons.get('/:id', protect, requireAdmin, v.objectIdParam('id'), validate, couponController.getCoupon);
coupons.put('/:id', protect, requireAdmin, v.updateCouponRules, validate, couponController.updateCoupon);
coupons.delete('/:id', protect, requireAdmin, v.objectIdParam('id'), validate, couponController.deleteCoupon);

router.use('/coupons', coupons);

/* ══════════════════════════ UPLOAD ════════════════════════════════════════ */
const upload = express.Router();
upload.use(protect, requireAdmin, limiters.uploadLimiter);

upload.post('/', uploadSingleImage, uploadController.uploadImage);
upload.post('/multiple', uploadMultipleImages, uploadController.uploadImages);

router.use('/upload', upload);

/* ══════════════════════════ CONTACT ═══════════════════════════════════════ */
const contact = express.Router();

contact.post('/', limiters.publicWriteLimiter, v.contactRules, validate, contactController.submitContact);
contact.post('/subscribe', limiters.publicWriteLimiter, v.subscribeRules, validate, contactController.subscribe);
contact.get('/unsubscribe/:token', contactController.unsubscribe);

contact.get('/messages', protect, requireAdmin, contactController.listMessages);
contact.patch('/messages/:id', protect, requireAdmin, v.objectIdParam('id'), validate, contactController.updateMessageStatus);
contact.get('/subscribers', protect, requireAdmin, contactController.listSubscribers);

router.use('/contact', contact);

/* ══════════════════════════ ADMIN ═════════════════════════════════════════ */
const admin = express.Router();
admin.use(protect, requireAdmin); // blanket guard — no admin route can be reached without it

admin.get('/stats', adminController.getDashboardStats);
admin.get('/inventory', adminController.getInventory);
admin.get('/customers', adminController.listCustomers);
admin.get('/customers/:id', v.objectIdParam('id'), validate, adminController.getCustomer);
admin.patch('/customers/:id/role', v.objectIdParam('id'), validate, adminController.updateCustomerRole);
admin.patch('/customers/:id/status', v.objectIdParam('id'), validate, adminController.updateCustomerStatus);

router.use('/admin', admin);

module.exports = router;
