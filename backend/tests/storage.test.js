const sharp = require('sharp');
const { request, app } = require('./helpers');
const MediaFile = require('../models/MediaFile');
const storageService = require('../services/storageService');

/**
 * Without Cloudinary, production images are stored in the database and served
 * by the API at /media. Their URL must carry the API's own origin: a bare path
 * would load from the storefront and come back as its HTML page, which the
 * browser shows as a broken image.
 */
describe('Image URLs served by the API', () => {
  const { publicOrigin } = storageService;

  it('prefers the configured public API origin', () => {
    expect(publicOrigin({ apiPublicUrl: 'https://api.example.com/', isProduction: true }, 'https://other.example.com'))
      .toBe('https://api.example.com');
  });

  it('otherwise uses the origin the upload arrived on', () => {
    expect(publicOrigin({ apiPublicUrl: '', isProduction: true }, 'https://touch-api.onrender.com'))
      .toBe('https://touch-api.onrender.com');
  });

  it('falls back to the local API server in development', () => {
    expect(publicOrigin({ apiPublicUrl: '', isProduction: false, port: 5000 }, '')).toBe('http://localhost:5000');
  });
});

describe('Database image storage', () => {
  async function storedImage() {
    const png = await sharp({ create: { width: 40, height: 60, channels: 3, background: '#d09494' } }).png().toBuffer();
    const processed = await storageService.processImage(png);
    return storageService.uploadToDatabase(processed, 'https://touch-api.onrender.com');
  }

  it('stores an upload and serves it back as a cacheable WebP image', async () => {
    const image = await storedImage();
    expect(image.url).toMatch(/^https:\/\/touch-api\.onrender\.com\/media\/[a-f0-9]{24}\.webp$/);
    expect(image.publicId).toMatch(/^db:/);

    const res = await request(app).get(new URL(image.url).pathname).buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/webp');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(res.headers['cache-control']).toContain('immutable');
    const meta = await sharp(res.body).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(40);
  });

  it('removes the stored image when it is deleted', async () => {
    const image = await storedImage();
    await storageService.deleteImage(image.publicId);
    expect(await MediaFile.countDocuments()).toBe(0);
    await request(app).get(new URL(image.url).pathname).expect(404);
  });

  it('answers 404 for anything that is not a stored image id', async () => {
    await request(app).get('/media/../../etc/passwd').expect(404);
    await request(app).get('/media/123.webp').expect(404);
    await request(app).get('/media/6a8a152b86c3bc131cb1085f.webp').expect(404);
  });
});
