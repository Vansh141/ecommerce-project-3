const mongoose = require('mongoose');

/**
 * An uploaded image stored in the database.
 *
 * Used in production when Cloudinary is not configured: the host's disk is
 * wiped on every redeploy, but the database is not. Only re-encoded WebP from
 * storageService ever lands here, never a file as the browser sent it.
 */
const mediaFileSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true, enum: ['image/webp'] },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MediaFile', mediaFileSchema);
