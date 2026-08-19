const ContactMessage = require('../models/ContactMessage');
const Subscriber = require('../models/Subscriber');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/env');
const { sendSuccess, sendCreated, paginationMeta } = require('../utils/apiResponse');
const emailService = require('../services/emailService');

// ── POST /api/contact ────────────────────────────────────────────────────────
/**
 * Persists the enquiry first, then attempts to notify the store.
 *
 * Storing before emailing means an SMTP outage can never lose a customer's
 * message. The response tells the truth about delivery rather than always
 * claiming success — the old mailto: form reported "Message sent!"
 * unconditionally, including when nothing was sent at all.
 */
const submitContact = asyncHandler(async (req, res) => {
  const submission = await ContactMessage.create({
    name: req.body.name,
    email: req.body.email,
    subject: req.body.subject || 'General enquiry',
    message: req.body.message,
    ip: req.ip,
  });

  const notifyAddress = config.smtp.fromEmail;
  let delivered = false;

  if (notifyAddress) {
    delivered = await emailService.sendContactNotification({
      to: notifyAddress,
      submission,
    });
    if (delivered) {
      submission.emailDelivered = true;
      await submission.save();
    }
  }

  return sendCreated(res, {
    reference: submission._id,
    delivered,
    message: delivered
      ? "Thank you — your message has been sent. We'll reply within 24–48 hours."
      : "Thank you — your message has been received and saved. We'll reply within 24–48 hours.",
  });
});

// ── POST /api/contact/subscribe ──────────────────────────────────────────────
const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const existing = await Subscriber.findOne({ email });

  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      existing.unsubscribedAt = null;
      await existing.save();
    }
    // Same response either way — otherwise the endpoint reveals whether an
    // address is already on the list.
    return sendSuccess(res, { message: 'Thank you for subscribing.' });
  }

  await Subscriber.create({ email, source: req.body.source || 'footer' });
  return sendCreated(res, { message: 'Thank you for subscribing.' });
});

// ── GET /api/contact/unsubscribe/:token ──────────────────────────────────────
/** One-click unsubscribe. Required by law once marketing email is sent. */
const unsubscribe = asyncHandler(async (req, res) => {
  const subscriber = await Subscriber.findOne({ unsubscribeToken: req.params.token });
  if (!subscriber) throw ApiError.notFound('This unsubscribe link is not valid.');

  subscriber.isActive = false;
  subscriber.unsubscribedAt = new Date();
  await subscriber.save();

  return sendSuccess(res, { message: 'You have been unsubscribed.' });
});

// ── Admin ────────────────────────────────────────────────────────────────────
const listMessages = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 60);

  const filter = {};
  if (req.query.status && ['new', 'read', 'responded', 'archived'].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const [messages, total, newCount] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ContactMessage.countDocuments(filter),
    ContactMessage.countDocuments({ status: 'new' }),
  ]);

  return sendSuccess(res, { messages, newCount }, { meta: paginationMeta({ page, limit, total }) });
});

const updateMessageStatus = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id);
  if (!message) throw ApiError.notFound('Message not found.');

  if (!['new', 'read', 'responded', 'archived'].includes(req.body.status)) {
    throw ApiError.badRequest('Invalid status.');
  }

  message.status = req.body.status;
  await message.save();

  return sendSuccess(res, { message });
});

const listSubscribers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const filter = req.query.active === 'false' ? { isActive: false } : { isActive: true };

  const [subscribers, total] = await Promise.all([
    Subscriber.find(filter)
      .select('email isActive source createdAt unsubscribedAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Subscriber.countDocuments(filter),
  ]);

  return sendSuccess(res, { subscribers }, { meta: paginationMeta({ page, limit, total }) });
});

module.exports = {
  submitContact,
  subscribe,
  unsubscribe,
  listMessages,
  updateMessageStatus,
  listSubscribers,
};
