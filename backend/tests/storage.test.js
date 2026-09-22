const { localUploadBase } = require('../services/storageService');

/**
 * Without Cloudinary, uploaded images are served by the API itself. Their URL
 * must point at the API: a bare `/uploads/...` path loads from the storefront
 * and comes back as its HTML page, which the browser shows as a broken image.
 */
describe('Local upload URLs', () => {
  it('uses the configured public API origin', () => {
    expect(localUploadBase({ apiPublicUrl: 'https://touch-api.onrender.com/', isProduction: true, port: 5000 }))
      .toBe('https://touch-api.onrender.com');
  });

  it('falls back to the local API server in development', () => {
    expect(localUploadBase({ apiPublicUrl: '', isProduction: false, port: 5000 })).toBe('http://localhost:5000');
  });

  it('refuses to form a URL in production without an API origin', () => {
    expect(localUploadBase({ apiPublicUrl: '', isProduction: true, port: 5000 })).toBeNull();
  });
});
