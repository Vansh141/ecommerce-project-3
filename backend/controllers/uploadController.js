const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendCreated } = require('../utils/apiResponse');
const storageService = require('../services/storageService');

/**
 * Image upload.
 *
 * The multer layer only screens the declared extension and MIME type; the real
 * validation happens in storageService, which inspects the file's magic bytes
 * and then re-encodes it to WebP. Anything appended to a valid image header —
 * a script, an archive, a polyglot payload — is destroyed by that re-encode.
 */

// ── POST /api/upload ─────────────────────────────────────────────────────────
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw ApiError.badRequest('No image was uploaded.');
  }

  const image = await storageService.storeImage(req.file.buffer);
  return sendCreated(res, { image });
});

// ── POST /api/upload/multiple ────────────────────────────────────────────────
const uploadImages = asyncHandler(async (req, res) => {
  if (!Array.isArray(req.files) || req.files.length === 0) {
    throw ApiError.badRequest('No images were uploaded.');
  }

  // Sequential: parallel sharp pipelines on a small dyno exhaust memory fast.
  const images = [];
  for (const file of req.files) {
    // eslint-disable-next-line no-await-in-loop
    images.push(await storageService.storeImage(file.buffer));
  }

  return sendCreated(res, { images });
});

module.exports = { uploadImage, uploadImages };
