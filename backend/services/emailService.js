const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');
const { stripCRLF, escapeHtml } = require('../utils/sanitize');

/**
 * Transactional email.
 *
 * Two rules govern everything here:
 *  1. Email failure must never corrupt an otherwise successful operation.
 *     Every send is awaited defensively and returns a boolean; callers treat
 *     `false` as "not delivered", never as a reason to roll back an order.
 *  2. No user-supplied value reaches a header un-sanitised. CRLF in a name or
 *     subject is an SMTP header-injection vector.
 */

let transporter = null;
let transporterReady = false;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtp.enabled) return null;

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
    pool: true,
    maxConnections: 3,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  transporterReady = true;
  return transporter;
}

const BRAND = {
  name: config.store.name,
  dark: '#1C1917',
  muted: '#78716C',
  accent: '#B08D74',
  bg: '#FAF8F5',
  border: '#E7E1D9',
};

/** Shared responsive shell so every email looks like it came from one brand. */
function layout({ heading, intro, bodyHtml = '', ctaLabel, ctaUrl, footerNote }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.dark};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${BRAND.border};border-radius:4px;">
        <tr><td style="padding:32px 32px 24px;border-bottom:1px solid ${BRAND.border};">
          <div style="font-size:20px;letter-spacing:0.28em;font-weight:600;text-transform:uppercase;">${escapeHtml(BRAND.name)}</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;line-height:1.3;">${heading}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${BRAND.muted};">${intro}</p>
          ${bodyHtml}
          ${
            ctaUrl && ctaLabel
              ? `<div style="margin:28px 0 8px;"><a href="${ctaUrl}" style="display:inline-block;background:${BRAND.dark};color:#FFFFFF;text-decoration:none;padding:14px 32px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;border-radius:2px;">${escapeHtml(ctaLabel)}</a></div>
                 <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${BRAND.muted};word-break:break-all;">If the button does not work, paste this link into your browser:<br>${escapeHtml(ctaUrl)}</p>`
              : ''
          }
        </td></tr>
        <tr><td style="padding:20px 32px 28px;border-top:1px solid ${BRAND.border};">
          <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.muted};">
            ${footerNote ? `${footerNote}<br><br>` : ''}© ${new Date().getFullYear()} ${escapeHtml(BRAND.name)}. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function itemsTable(order) {
  const rows = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">
        <strong style="font-weight:600;">${escapeHtml(item.name)}</strong><br>
        <span style="color:${BRAND.muted};font-size:13px;">Size ${escapeHtml(item.size)} &middot; Qty ${item.qty}</span>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};text-align:right;font-size:14px;white-space:nowrap;">₹${item.lineTotal.toFixed(2)}</td>
    </tr>`
    )
    .join('');

  const line = (label, value, bold = false) => `
    <tr>
      <td style="padding:6px 0;font-size:${bold ? '15px' : '14px'};${bold ? 'font-weight:600;' : `color:${BRAND.muted};`}">${label}</td>
      <td style="padding:6px 0;text-align:right;font-size:${bold ? '15px' : '14px'};${bold ? 'font-weight:600;' : ''}white-space:nowrap;">${value}</td>
    </tr>`;

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
    ${rows}
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BRAND.border};padding-top:8px;">
    ${line('Subtotal', `₹${order.pricing.itemsTotal.toFixed(2)}`)}
    ${order.pricing.discountTotal > 0 ? line(`Discount${order.coupon?.code ? ` (${escapeHtml(order.coupon.code)})` : ''}`, `−₹${order.pricing.discountTotal.toFixed(2)}`) : ''}
    ${line('Shipping', order.pricing.shippingTotal === 0 ? 'Free' : `₹${order.pricing.shippingTotal.toFixed(2)}`)}
    ${line(`Tax${order.pricing.taxInclusive ? ' (included)' : ''}`, `₹${order.pricing.taxTotal.toFixed(2)}`)}
    ${line('Total', `₹${order.pricing.grandTotal.toFixed(2)}`, true)}
  </table>`;
}

/**
 * Sends a message. Returns true only on confirmed hand-off to the MTA.
 * Never throws — callers must be able to ignore the result safely.
 */
async function send({ to, subject, html, text }) {
  const tx = getTransporter();

  if (!tx) {
    logger.warn('Email not sent — SMTP is not configured', { subject: stripCRLF(subject) });
    return false;
  }

  try {
    const info = await tx.sendMail({
      from: `"${stripCRLF(config.smtp.fromName)}" <${stripCRLF(config.smtp.fromEmail)}>`,
      to: stripCRLF(to),
      subject: stripCRLF(subject),
      html,
      text: text || String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    });
    logger.info('Email sent', { messageId: info.messageId, subject: stripCRLF(subject) });
    return true;
  } catch (err) {
    logger.error('Email delivery failed', { subject: stripCRLF(subject), message: err.message });
    return false;
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

const sendPasswordReset = ({ to, name, resetUrl }) =>
  send({
    to,
    subject: `Reset your ${BRAND.name} password`,
    html: layout({
      heading: 'Reset your password',
      intro: `Hi ${escapeHtml(name || 'there')}, we received a request to reset the password for your ${escapeHtml(BRAND.name)} account. This link expires in 15 minutes.`,
      ctaLabel: 'Reset password',
      ctaUrl: resetUrl,
      footerNote: 'If you did not request this, you can safely ignore this email — your password will not change.',
    }),
  });

const sendWelcome = ({ to, name, verifyUrl }) =>
  send({
    to,
    subject: `Welcome to ${BRAND.name}`,
    html: layout({
      heading: `Welcome, ${escapeHtml(name || 'there')}`,
      intro: verifyUrl
        ? 'Thanks for creating an account. Please confirm your email address to secure your account.'
        : 'Thanks for creating an account. You can now track orders and save your favourites.',
      ...(verifyUrl ? { ctaLabel: 'Verify email', ctaUrl: verifyUrl } : {}),
    }),
  });

const sendOrderConfirmation = ({ to, name, order, orderUrl }) =>
  send({
    to,
    subject: `Order ${order.orderNumber} confirmed`,
    html: layout({
      heading: 'Thank you for your order',
      intro: `Hi ${escapeHtml(name || 'there')}, we have received order <strong>${escapeHtml(order.orderNumber)}</strong>${
        order.payment.method === 'COD'
          ? ' and will collect payment on delivery.'
          : ' and your payment has been received.'
      }`,
      bodyHtml: itemsTable(order),
      ctaLabel: 'View order',
      ctaUrl: orderUrl,
    }),
  });

const sendPaymentConfirmation = ({ to, name, order, orderUrl }) =>
  send({
    to,
    subject: `Payment received for ${order.orderNumber}`,
    html: layout({
      heading: 'Payment received',
      intro: `Hi ${escapeHtml(name || 'there')}, we have received your payment of <strong>₹${order.pricing.grandTotal.toFixed(2)}</strong> for order ${escapeHtml(order.orderNumber)}.`,
      ctaLabel: 'View order',
      ctaUrl: orderUrl,
    }),
  });

const sendOrderShipped = ({ to, name, order, orderUrl }) =>
  send({
    to,
    subject: `Order ${order.orderNumber} has shipped`,
    html: layout({
      heading: 'Your order is on its way',
      intro: `Hi ${escapeHtml(name || 'there')}, order ${escapeHtml(order.orderNumber)} has been dispatched.${
        order.trackingNumber ? ` Tracking reference: <strong>${escapeHtml(order.trackingNumber)}</strong>.` : ''
      }`,
      ctaLabel: 'Track order',
      ctaUrl: orderUrl,
    }),
  });

const sendOrderDelivered = ({ to, name, order, orderUrl }) =>
  send({
    to,
    subject: `Order ${order.orderNumber} delivered`,
    html: layout({
      heading: 'Your order has arrived',
      intro: `Hi ${escapeHtml(name || 'there')}, order ${escapeHtml(order.orderNumber)} has been delivered. We would love to hear what you think.`,
      ctaLabel: 'Write a review',
      ctaUrl: orderUrl,
    }),
  });

const sendOrderCancelled = ({ to, name, order, reason }) =>
  send({
    to,
    subject: `Order ${order.orderNumber} cancelled`,
    html: layout({
      heading: 'Your order has been cancelled',
      intro: `Hi ${escapeHtml(name || 'there')}, order ${escapeHtml(order.orderNumber)} has been cancelled.${
        reason ? ` Reason: ${escapeHtml(reason)}.` : ''
      }${
        order.payment.status === 'paid'
          ? ' Any amount paid will be refunded to the original payment method within 5–7 business days.'
          : ''
      }`,
    }),
  });

const sendContactNotification = ({ to, submission }) =>
  send({
    to,
    subject: `New enquiry: ${submission.subject}`,
    html: layout({
      heading: 'New customer enquiry',
      intro: `From <strong>${escapeHtml(submission.name)}</strong> &lt;${escapeHtml(submission.email)}&gt;`,
      bodyHtml: `<div style="background:${BRAND.bg};border:1px solid ${BRAND.border};padding:16px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(submission.message)}</div>`,
    }),
  });

module.exports = {
  send,
  sendPasswordReset,
  sendWelcome,
  sendOrderConfirmation,
  sendPaymentConfirmation,
  sendOrderShipped,
  sendOrderDelivered,
  sendOrderCancelled,
  sendContactNotification,
  isEnabled: () => config.smtp.enabled,
  isReady: () => transporterReady,
};
