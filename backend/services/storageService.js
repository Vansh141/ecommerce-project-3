const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { detectImage } = require('../utils/imageValidation');

const MAX_DIMENSION = 1600;
const THUMB_DIMENSION = 600;
const LOCAL_UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

let cloudinary = null;
if (config.cloudinary.enabled) {
  // eslint-disable-next-line global-require
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  logger.info('Cloudinary storage enabled');
} else {
  logger.warn(
    'Cloudinary is not configured — uploads use local disk. This is fine for development but ephemeral in production.'
  );
}

/**
 * Validates and normalises an uploaded image buffer.
 *
 * Re-encoding through sharp is the security step that matters: the output is
 * freshly generated pixel data, so any appended payload, embedded script, or
 * malformed chunk in the original file is discarded rather than stored.
 * EXIF (which can carry GPS coordinates) is dropped in the process.
 */
async function processImage(buffer, { maxDimension = MAX_DIMENSION } = {}) {
  const detection = detectImage(buffer);
  if (!detection.valid) {
    throw ApiError.badRequest(detection.reason, { code: 'INVALID_IMAGE' });
  }

  let pipeline;
  try {
    pipeline = sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 });
    const metadata = await pipeline.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('missing dimensions');
    }

    const output = await sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 })
      .rotate() // apply EXIF orientation, then discard the metadata
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: output.data,
      width: output.info.width,
      height: output.info.height,
      format: 'webp',
      mime: 'image/webp',
    };
  } catch (err) {
    logger.warn('Image processing failed', { message: err.message });
    throw ApiError.badRequest('That image could not be processed. Please try a different file.', {
      code: 'IMAGE_PROCESSING_FAILED',
    });
  }
}

async function uploadToCloudinary(processed, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'webp',
        overwrite: false,
        // Never let a client-supplied name influence the stored public_id.
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );
    stream.end(processed.buffer);
  });
}

async function uploadToLocalDisk(processed) {
  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });

  // The filename is generated entirely server-side from random bytes — no part
  // of the client's original name reaches the filesystem, so path traversal
  // and extension smuggling are impossible by construction.
  const filename = `product-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`;
  const destination = path.join(LOCAL_UPLOAD_DIR, filename);

  // Defence in depth: confirm the resolved path stays inside the upload dir.
  if (!destination.startsWith(LOCAL_UPLOAD_DIR + path.sep)) {
    throw ApiError.internal('Resolved upload path escaped the uploads directory.');
  }

  await fs.writeFile(destination, processed.buffer);

  // The storefront usually runs on a different origin than the API, so a bare
  // `/uploads/...` path would resolve against the storefront and 404. Prefer an
  // explicitly configured public API origin; fall back to the dev server.
  const base = config.apiPublicUrl
    ? config.apiPublicUrl.replace(/\/$/, '')
    : config.isProduction
      ? ''
      : `http://localhost:${config.port}`;

  if (config.isProduction && !base) {
    logger.warn(
      'Storing an upload on local disk with no API_PUBLIC_URL set. The image URL will be relative and will not load from a storefront on another origin. Configure Cloudinary, or set API_PUBLIC_URL.'
    );
  }

  return {
    url: `${base}/uploads/${filename}`,
    publicId: `local:${filename}`,
    width: processed.width,
    height: processed.height,
  };
}

/** Validates, re-encodes and stores an image. Returns a persistable descriptor. */
async function storeImage(buffer, { folder = config.cloudinary.folder, thumbnail = false } = {}) {
  const processed = await processImage(buffer, {
    maxDimension: thumbnail ? THUMB_DIMENSION : MAX_DIMENSION,
  });

  const result = cloudinary
    ? await uploadToCloudinary(processed, folder)
    : await uploadToLocalDisk(processed);

  return { ...result, alt: '' };
}

/** Best-effort deletion. A storage failure must never block a product update. */
async function deleteImage(publicId) {
  if (!publicId) return;

  try {
    if (publicId.startsWith('local:')) {
      const filename = path.basename(publicId.slice('local:'.length));
      const target = path.join(LOCAL_UPLOAD_DIR, filename);
      if (target.startsWith(LOCAL_UPLOAD_DIR + path.sep)) {
        await fs.unlink(target).catch(() => {});
      }
      return;
    }
    if (cloudinary) await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    logger.warn('Failed to delete stored image', { publicId, message: err.message });
  }
}

module.exports = {
  storeImage,
  deleteImage,
  processImage,
  isCloudStorage: () => Boolean(cloudinary),
  LOCAL_UPLOAD_DIR,
};
