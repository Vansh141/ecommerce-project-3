/**
 * Content-based image validation.
 *
 * The filename extension and the Content-Type header are both supplied by the
 * client and are trivially forged. The only trustworthy signal is the file's
 * own leading bytes, so that is what we check.
 */

const SIGNATURES = [
  { format: 'jpeg', mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    format: 'png',
    mime: 'image/png',
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    format: 'gif',
    mime: 'image/gif',
    test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  },
  {
    format: 'webp',
    mime: 'image/webp',
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // "RIFF"
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50, // "WEBP"
  },
  {
    format: 'avif',
    mime: 'image/avif',
    test: (b) =>
      b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 && // "ftyp"
      b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x66, // "avif"
  },
];

/**
 * SVG is explicitly rejected: it is an XML document that can carry <script>,
 * making it a stored-XSS vector when served from our own origin.
 */
function looksLikeSvgOrMarkup(buffer) {
  const head = buffer.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  return head.startsWith('<?xml') || head.startsWith('<svg') || head.startsWith('<!doctype') || head.startsWith('<html');
}

/**
 * Returns { valid, format, mime, reason }. `valid: false` should always be
 * surfaced as a 400 — never as a server error.
 */
function detectImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) {
    return { valid: false, reason: 'File is empty or too small to be a valid image.' };
  }
  if (looksLikeSvgOrMarkup(buffer)) {
    return { valid: false, reason: 'SVG and markup files are not accepted.' };
  }

  const match = SIGNATURES.find((sig) => {
    try {
      return sig.test(buffer);
    } catch {
      return false;
    }
  });

  if (!match) {
    return {
      valid: false,
      reason: 'File contents are not a recognised image (JPEG, PNG, GIF, WebP or AVIF).',
    };
  }

  return { valid: true, format: match.format, mime: match.mime };
}

module.exports = { detectImage, SIGNATURES };
