const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');
const { objectIdParam, paginationRules, safeText } = require('./common');
const auth = require('./authValidators');

// ── User / address ───────────────────────────────────────────────────────────
const updateProfileRules = [
  safeText('name', { min: 2, max: 100, optional: true, fieldLabel: 'Name' })
    .matches(/^[\p{L}\p{M}\s.'-]+$/u)
    .withMessage('Name contains invalid characters.'),
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .bail()
    .trim()
    .matches(/^[+]?[\d\s-]{7,20}$/)
    .withMessage('Please enter a valid phone number.'),
];

const addressRules = [
  safeText('fullName', { min: 2, max: 100, fieldLabel: 'Full name' }),
  body('phone')
    .isString().bail().trim()
    .matches(/^[+]?[\d\s-]{7,20}$/)
    .withMessage('Please enter a valid phone number.'),
  safeText('line1', { min: 5, max: 200, fieldLabel: 'Address' }),
  safeText('line2', { min: 0, max: 200, optional: true, fieldLabel: 'Address line 2' }),
  safeText('city', { min: 2, max: 80, fieldLabel: 'City' }),
  safeText('state', { min: 2, max: 80, fieldLabel: 'State' }),
  body('postalCode')
    .isString().bail().trim()
    .matches(/^[A-Za-z0-9\s-]{4,12}$/)
    .withMessage('Please enter a valid postal code.'),
  safeText('country', { min: 2, max: 60, optional: true, fieldLabel: 'Country' }),
  safeText('label', { min: 1, max: 40, optional: true, fieldLabel: 'Label' }),
  body('isDefault').optional().isBoolean().toBoolean(),
];

const deleteAccountRules = [
  body('password').isString().withMessage('Password is required.').bail().notEmpty(),
];

// ── Products ─────────────────────────────────────────────────────────────────
const productListRules = [
  ...paginationRules,
  query('search').optional().isString().isLength({ max: 80 }),
  query('sort').optional().isIn(['newest', 'oldest', 'price-asc', 'price-desc', 'popular', 'rating'])
    .withMessage('Invalid sort option.'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Invalid minimum price.'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Invalid maximum price.'),
  query('status').optional().isIn(['draft', 'active', 'archived']),
];

const variantRules = body('variants')
  .optional()
  .isArray({ max: 12 })
  .withMessage('A product can have at most 12 variants.')
  .custom((variants) => {
    for (const v of variants) {
      if (!v || typeof v !== 'object') throw new Error('Each variant must be an object.');
      if (typeof v.size !== 'string' || !v.size.trim()) throw new Error('Every variant needs a size.');
      if (v.stock !== undefined && (!Number.isInteger(Number(v.stock)) || Number(v.stock) < 0)) {
        throw new Error('Variant stock must be a whole number of 0 or more.');
      }
    }
    return true;
  });

const imagesRule = body('images')
  .optional()
  .isArray({ max: 6 })
  .withMessage('A product can have at most 6 images.')
  .custom((images) => {
    for (const img of images) {
      if (!img || typeof img.url !== 'string' || !img.url.trim()) {
        throw new Error('Every image needs a URL.');
      }
      if (!/^(https?:\/\/|\/uploads\/)/i.test(img.url)) {
        throw new Error('Image URLs must be absolute or point at the uploads directory.');
      }
    }
    return true;
  });

const createProductRules = [
  safeText('name', { min: 2, max: 160, fieldLabel: 'Product name' }),
  safeText('description', { min: 10, max: 5000, fieldLabel: 'Description' }),
  safeText('shortDescription', { min: 0, max: 300, optional: true, fieldLabel: 'Short description' }),
  safeText('brand', { min: 1, max: 80, fieldLabel: 'Brand' }),
  body('category').custom((v) => mongoose.isValidObjectId(v)).withMessage('Please choose a category.'),
  body('price').isFloat({ min: 0, max: 10_000_000 }).withMessage('Price must be 0 or more.').toFloat(),
  body('mrp').isFloat({ min: 0, max: 10_000_000 }).withMessage('MRP must be 0 or more.').toFloat(),
  body('status').optional().isIn(['draft', 'active', 'archived']),
  body('isFeatured').optional().isBoolean().toBoolean(),
  body('isNewArrival').optional().isBoolean().toBoolean(),
  body('tags').optional().isArray({ max: 15 }),
  imagesRule,
  variantRules,
];

const updateProductRules = [
  objectIdParam('id'),
  safeText('name', { min: 2, max: 160, optional: true, fieldLabel: 'Product name' }),
  safeText('description', { min: 10, max: 5000, optional: true, fieldLabel: 'Description' }),
  body('price').optional().isFloat({ min: 0, max: 10_000_000 }).withMessage('Price must be 0 or more.').toFloat(),
  body('mrp').optional().isFloat({ min: 0, max: 10_000_000 }).withMessage('MRP must be 0 or more.').toFloat(),
  body('category').optional().custom((v) => mongoose.isValidObjectId(v)).withMessage('Invalid category.'),
  body('status').optional().isIn(['draft', 'active', 'archived']),
  imagesRule,
  variantRules,
];

const stockRules = [
  objectIdParam('id'),
  objectIdParam('variantId'),
  body('stock').isInt({ min: 0, max: 1_000_000 }).withMessage('Stock must be a whole number of 0 or more.').toInt(),
];

// ── Categories ───────────────────────────────────────────────────────────────
const createCategoryRules = [
  safeText('name', { min: 2, max: 80, fieldLabel: 'Category name' }),
  safeText('description', { min: 0, max: 500, optional: true, fieldLabel: 'Description' }),
  body('displayOrder').optional().isInt({ min: 0, max: 9999 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('showInNav').optional().isBoolean().toBoolean(),
  body('parent').optional({ nullable: true }).custom((v) => !v || mongoose.isValidObjectId(v))
    .withMessage('Invalid parent category.'),
];

const updateCategoryRules = [objectIdParam('id'), ...createCategoryRules.map((r) => r.optional())];

// ── Orders ───────────────────────────────────────────────────────────────────
/**
 * Item-level guards. Quantity must be a positive integer — the single most
 * important validation in the whole API, since a negative quantity previously
 * produced a negative order total and credited stock back to the seller.
 */
const orderItemsRule = body('items')
  .isArray({ min: 1, max: 40 })
  .withMessage('Your bag is empty.')
  .custom((items) => {
    for (const item of items) {
      if (!item || typeof item !== 'object') throw new Error('Malformed item in bag.');
      if (!mongoose.isValidObjectId(item.product ?? item.productId)) {
        throw new Error('An item references an invalid product.');
      }
      if (!mongoose.isValidObjectId(item.variantId ?? item.variant)) {
        throw new Error('Please select a size for every item.');
      }
      const qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
        throw new Error('Quantity must be a whole number between 1 and 100.');
      }
    }
    return true;
  });

const previewOrderRules = [
  orderItemsRule,
  body('couponCode').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 32 }),
];

const createOrderRules = [
  orderItemsRule,
  body('paymentMethod').isIn(['COD', 'RAZORPAY']).withMessage('Please choose a valid payment method.'),
  body('addressId').optional({ nullable: true }).custom((v) => !v || mongoose.isValidObjectId(v))
    .withMessage('Invalid address.'),
  body('couponCode').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 32 }),
  safeText('customerNote', { min: 0, max: 500, optional: true, fieldLabel: 'Note' }),
  // A literal address is only validated when no saved address id was supplied.
  body('shippingAddress')
    .if(body('addressId').not().exists({ checkFalsy: true }))
    .isObject()
    .withMessage('A delivery address is required.'),
];

const orderStatusRules = [
  objectIdParam('id'),
  body('status')
    .isIn(['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Invalid order status.'),
  safeText('note', { min: 0, max: 300, optional: true, fieldLabel: 'Note' }),
  safeText('trackingNumber', { min: 0, max: 80, optional: true, fieldLabel: 'Tracking number' }),
];

const cancelOrderRules = [
  objectIdParam('id'),
  safeText('reason', { min: 0, max: 300, optional: true, fieldLabel: 'Reason' }),
];

const refundRules = [
  objectIdParam('id'),
  body('amount').optional().isFloat({ min: 0 }).toFloat(),
  safeText('reason', { min: 0, max: 300, optional: true, fieldLabel: 'Reason' }),
];

// ── Payments ─────────────────────────────────────────────────────────────────
const verifyPaymentRules = [
  objectIdParam('orderId'),
  body('razorpay_payment_id').isString().bail().trim().isLength({ min: 5, max: 100 })
    .withMessage('Invalid payment reference.'),
  body('razorpay_signature').isString().bail().trim().isLength({ min: 32, max: 200 })
    .withMessage('Invalid payment signature.'),
  body('razorpay_order_id').optional().isString().trim().isLength({ max: 100 }),
];

// ── Coupons ──────────────────────────────────────────────────────────────────
const validateCouponRules = [
  body('code').isString().bail().trim().isLength({ min: 2, max: 32 })
    .withMessage('Please enter a valid coupon code.'),
  orderItemsRule,
];

const createCouponRules = [
  body('code').isString().bail().trim().isLength({ min: 3, max: 32 })
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Coupon codes may contain only letters, numbers, hyphens and underscores.'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type.'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be 0 or more.').toFloat()
    .custom((value, { req }) => {
      if (req.body.discountType === 'percentage' && value > 100) {
        throw new Error('A percentage discount cannot exceed 100.');
      }
      return true;
    }),
  body('expiresAt').isISO8601().withMessage('Please provide a valid expiry date.').toDate(),
  body('startsAt').optional().isISO8601().toDate(),
  body('minOrderValue').optional().isFloat({ min: 0 }).toFloat(),
  body('maxDiscountAmount').optional().isFloat({ min: 0 }).toFloat(),
  body('totalUsageLimit').optional().isInt({ min: 0, max: 1_000_000 }).toInt(),
  body('perUserLimit').optional().isInt({ min: 0, max: 100 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  safeText('description', { min: 0, max: 200, optional: true, fieldLabel: 'Description' }),
];

const updateCouponRules = [objectIdParam('id'), ...createCouponRules.map((r) => r.optional())];

// ── Reviews ──────────────────────────────────────────────────────────────────
const createReviewRules = [
  objectIdParam('productId'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Please give a rating between 1 and 5.').toInt(),
  safeText('comment', { min: 10, max: 2000, fieldLabel: 'Review' }),
  safeText('title', { min: 0, max: 120, optional: true, fieldLabel: 'Title' }),
];

const updateReviewRules = [
  objectIdParam('id'),
  body('rating').optional().isInt({ min: 1, max: 5 }).toInt(),
  safeText('comment', { min: 10, max: 2000, optional: true, fieldLabel: 'Review' }),
  safeText('title', { min: 0, max: 120, optional: true, fieldLabel: 'Title' }),
];

// ── Contact / newsletter ─────────────────────────────────────────────────────
const contactRules = [
  safeText('name', { min: 2, max: 100, fieldLabel: 'Name' }),
  auth.emailRule(),
  safeText('subject', { min: 0, max: 150, optional: true, fieldLabel: 'Subject' }),
  safeText('message', { min: 10, max: 2000, fieldLabel: 'Message' }),
];

const subscribeRules = [auth.emailRule()];

module.exports = {
  ...auth,
  objectIdParam,
  paginationRules,
  updateProfileRules,
  addressRules,
  deleteAccountRules,
  productListRules,
  createProductRules,
  updateProductRules,
  stockRules,
  createCategoryRules,
  updateCategoryRules,
  previewOrderRules,
  createOrderRules,
  orderStatusRules,
  cancelOrderRules,
  refundRules,
  verifyPaymentRules,
  validateCouponRules,
  createCouponRules,
  updateCouponRules,
  createReviewRules,
  updateReviewRules,
  contactRules,
  subscribeRules,
};
