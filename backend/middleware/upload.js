const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = /^\.(jpe?g|png|gif|webp|avif)$/i;
const ALLOWED_MIME = /^image\/(jpeg|png|gif|webp|avif)$/i;

/**
 * Files are buffered in memory rather than written to disk.
 *
 * Nothing untrusted ever touches the filesystem: the buffer is magic-byte
 * checked and re-encoded by sharp before storage, so a polyglot or malformed
 * file is destroyed rather than served.
 */
const storage = multer.memoryStorage();

/**
 * A cheap pre-filter only. Extension and MIME are client-controlled, so this
 * exists to reject obvious junk early; `imageValidation.detectImage` performs
 * the authoritative content check afterwards.
 *
 * The extension regex is anchored — an unanchored `/jpg|png/` would happily
 * accept ".htmljpg".
 */
function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.test(ext)) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
  }
  if (!ALLOWED_MIME.test(file.mimetype || '')) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 6,
    fields: 12,
    parts: 20,
    // Caps deeply nested field names, the vector behind the multer DoS advisory.
    fieldNameSize: 120,
    fieldSize: 8 * 1024,
  },
});

module.exports = {
  uploadSingleImage: upload.single('image'),
  uploadMultipleImages: upload.array('images', 6),
  MAX_FILE_SIZE,
};
