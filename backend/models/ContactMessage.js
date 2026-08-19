const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    subject: { type: String, trim: true, maxlength: 150, default: 'General enquiry' },
    message: { type: String, required: true, trim: true, maxlength: 2000 },

    status: {
      type: String,
      enum: ['new', 'read', 'responded', 'archived'],
      default: 'new',
      index: true,
    },
    /** Records whether the notification email actually went out, so the UI
     *  never claims delivery that did not happen. */
    emailDelivered: { type: Boolean, default: false },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
