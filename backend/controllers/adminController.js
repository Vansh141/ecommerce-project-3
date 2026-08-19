const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const ContactMessage = require('../models/ContactMessage');
const Subscriber = require('../models/Subscriber');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const config = require('../config/env');
const { sendSuccess, paginationMeta } = require('../utils/apiResponse');
const { safeSearchRegex } = require('../utils/sanitize');
const inventoryService = require('../services/inventoryService');
const { round2 } = require('../utils/money');

/** Revenue is only ever counted from orders that were actually paid for and
 *  not subsequently refunded. */
const REVENUE_MATCH = {
  'payment.status': 'paid',
  status: { $nin: ['cancelled', 'refunded'] },
};

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
const getDashboardStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    revenueAll,
    revenueThisMonth,
    revenuePrevMonth,
    orderCounts,
    totalCustomers,
    newCustomers,
    productCounts,
    lowStock,
    pendingReviews,
    unreadMessages,
    activeSubscribers,
    dailyRevenue,
  ] = await Promise.all([
    Order.aggregate([
      { $match: REVENUE_MATCH },
      { $group: { _id: null, total: { $sum: '$pricing.grandTotal' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { ...REVENUE_MATCH, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$pricing.grandTotal' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { ...REVENUE_MATCH, createdAt: { $gte: startOfPrevMonth, $lt: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$pricing.grandTotal' } } },
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'customer', isActive: true }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: thirtyDaysAgo } }),
    Product.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    inventoryService.findLowStock(config.store.lowStockThreshold, 10),
    Review.countDocuments({ isApproved: false }),
    ContactMessage.countDocuments({ status: 'new' }),
    Subscriber.countDocuments({ isActive: true }),
    Order.aggregate([
      { $match: { ...REVENUE_MATCH, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$pricing.grandTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const statusMap = Object.fromEntries(orderCounts.map((s) => [s._id, s.count]));
  const productMap = Object.fromEntries(productCounts.map((s) => [s._id, s.count]));

  const thisMonthTotal = round2(revenueThisMonth[0]?.total || 0);
  const prevMonthTotal = round2(revenuePrevMonth[0]?.total || 0);
  const growth =
    prevMonthTotal > 0
      ? Math.round(((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100)
      : null; // null, not 0 — "no comparison available" is not "no growth"

  return sendSuccess(res, {
    revenue: {
      total: round2(revenueAll[0]?.total || 0),
      thisMonth: thisMonthTotal,
      previousMonth: prevMonthTotal,
      growthPercent: growth,
      paidOrders: revenueAll[0]?.count || 0,
    },
    orders: {
      total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      pending: statusMap.pending || 0,
      confirmed: statusMap.confirmed || 0,
      packed: statusMap.packed || 0,
      shipped: statusMap.shipped || 0,
      delivered: statusMap.delivered || 0,
      cancelled: statusMap.cancelled || 0,
      refunded: statusMap.refunded || 0,
      awaitingFulfilment: (statusMap.confirmed || 0) + (statusMap.packed || 0),
    },
    customers: { total: totalCustomers, newLast30Days: newCustomers },
    products: {
      total: Object.values(productMap).reduce((a, b) => a + b, 0),
      active: productMap.active || 0,
      draft: productMap.draft || 0,
      archived: productMap.archived || 0,
      lowStockCount: lowStock.length,
    },
    lowStock,
    attention: { pendingReviews, unreadMessages },
    subscribers: activeSubscribers,
    salesTrend: dailyRevenue.map((d) => ({
      date: d._id,
      revenue: round2(d.revenue),
      orders: d.orders,
    })),
    currency: config.store.currency,
  });
});

// ── GET /api/admin/customers ─────────────────────────────────────────────────
const listCustomers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 60);

  const filter = {};
  if (req.query.role && ['customer', 'admin'].includes(req.query.role)) filter.role = req.query.role;
  if (req.query.active === 'false') filter.isActive = false;

  if (req.query.search) {
    const rx = safeSearchRegex(req.query.search);
    if (rx) filter.$or = [{ name: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email phone role isActive emailVerified createdAt lastLoginAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  // Attach lifetime value in one aggregation rather than N queries.
  const ids = users.map((u) => u._id);
  const spend = await Order.aggregate([
    { $match: { user: { $in: ids }, ...REVENUE_MATCH } },
    { $group: { _id: '$user', total: { $sum: '$pricing.grandTotal' }, orders: { $sum: 1 } } },
  ]);
  const spendMap = new Map(spend.map((s) => [String(s._id), s]));

  return sendSuccess(
    res,
    {
      customers: users.map((u) => ({
        ...u,
        totalSpent: round2(spendMap.get(String(u._id))?.total || 0),
        orderCount: spendMap.get(String(u._id))?.orders || 0,
      })),
    },
    { meta: paginationMeta({ page, limit, total }) }
  );
});

// ── GET /api/admin/customers/:id ─────────────────────────────────────────────
const getCustomer = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw ApiError.notFound('Customer not found.');

  const orders = await Order.find({ user: user._id })
    .select('orderNumber status payment pricing createdAt items')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean({ virtuals: true });

  const [spend] = await Order.aggregate([
    { $match: { user: user._id, ...REVENUE_MATCH } },
    { $group: { _id: null, total: { $sum: '$pricing.grandTotal' }, orders: { $sum: 1 } } },
  ]);

  delete user.password;
  delete user.resetPasswordToken;
  delete user.emailVerificationToken;

  return sendSuccess(res, {
    customer: user,
    orders,
    stats: { totalSpent: round2(spend?.total || 0), orderCount: spend?.orders || 0 },
  });
});

// ── PATCH /api/admin/customers/:id/role ──────────────────────────────────────
/**
 * Changing a role bumps `tokenVersion`, which immediately invalidates every
 * token the affected user holds. Without that, a demoted admin would keep
 * working admin credentials until their token expired.
 */
const updateCustomerRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['customer', 'admin'].includes(role)) throw ApiError.badRequest('Invalid role.');

  if (req.params.id === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot change your own role.');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('Customer not found.');

  if (user.role === 'admin' && role === 'customer') {
    const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (adminCount <= 1) {
      throw ApiError.badRequest('You cannot demote the last remaining administrator.');
    }
  }

  user.role = role;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  logger.info('User role changed', {
    targetUserId: user._id.toString(),
    newRole: role,
    byUserId: req.user._id.toString(),
  });

  return sendSuccess(res, { customer: user.toPublicJSON() });
});

// ── PATCH /api/admin/customers/:id/status ────────────────────────────────────
const updateCustomerStatus = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot deactivate your own account.');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('Customer not found.');

  const isActive = Boolean(req.body.isActive);

  if (!isActive && user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (adminCount <= 1) {
      throw ApiError.badRequest('You cannot deactivate the last remaining administrator.');
    }
  }

  user.isActive = isActive;
  if (!isActive) user.tokenVersion = (user.tokenVersion ?? 0) + 1; // kick them out now
  await user.save();

  return sendSuccess(res, { customer: user.toPublicJSON() });
});

// ── GET /api/admin/inventory ─────────────────────────────────────────────────
/** Flat variant-level view so the owner can restock without opening each product. */
const getInventory = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 25, 100);

  const match = { status: { $ne: 'archived' } };
  if (req.query.search) {
    const rx = safeSearchRegex(req.query.search);
    if (rx) match.$or = [{ name: rx }, { brand: rx }];
  }
  if (req.query.lowStock === 'true') {
    match.totalStock = { $lte: config.store.lowStockThreshold };
  }

  const [products, total] = await Promise.all([
    Product.find(match)
      .select('name slug images variants totalStock price status')
      .sort({ totalStock: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(match),
  ]);

  return sendSuccess(
    res,
    { products, lowStockThreshold: config.store.lowStockThreshold },
    { meta: paginationMeta({ page, limit, total }) }
  );
});

module.exports = {
  getDashboardStats,
  listCustomers,
  getCustomer,
  updateCustomerRole,
  updateCustomerStatus,
  getInventory,
};
