const sharp = require('sharp');
const { app, request, createAdmin, createUser, asUser } = require('./helpers');
const storageService = require('../services/storageService');

const URL = '/api/upload/storefront';

const png = (width, height) =>
  sharp({ create: { width, height, channels: 3, background: '#7a2334' } }).png().toBuffer();

/**
 * Homepage builder artwork keeps more resolution than product images, through
 * exactly the same validation and re-encoding.
 */
describe('Storefront image uploads', () => {
  const stored = [];

  afterEach(async () => {
    await Promise.all(stored.splice(0).map((publicId) => storageService.deleteImage(publicId)));
  });

  const upload = async (token, url, buffer, filename = 'banner.png', contentType = 'image/png') => {
    const res = await asUser(token).post(url).attach('image', buffer, { filename, contentType });
    if (res.body?.data?.image?.publicId) stored.push(res.body.data.image.publicId);
    return res;
  };

  it('keeps a full-width banner at its full 2400px resolution', async () => {
    const admin = await createAdmin();
    const res = await upload(admin.token, URL, await png(2400, 850));

    expect(res.status).toBe(201);
    expect(res.body.data.image).toMatchObject({ width: 2400, height: 850 });
    expect(res.body.data.image.url).toMatch(/\.webp$/);
  });

  it('never stores storefront artwork beyond 2560px, keeping its proportions', async () => {
    const admin = await createAdmin();
    const res = await upload(admin.token, URL, await png(3600, 1200));

    expect(res.status).toBe(201);
    expect(res.body.data.image.width).toBe(2560);
    expect(res.body.data.image.height).toBe(853);
  });

  it('leaves product uploads at the standard 1600px ceiling', async () => {
    const admin = await createAdmin();
    const res = await upload(admin.token, '/api/upload', await png(2400, 850));

    expect(res.status).toBe(201);
    expect(res.body.data.image.width).toBe(1600);
  });

  it('applies the same content checks as every other upload', async () => {
    const admin = await createAdmin();

    const shell = await upload(admin.token, URL, Buffer.from('<?php system($_GET["c"]); ?>'.padEnd(64, ' ')), 'banner.jpg', 'image/jpeg');
    expect(shell.status).toBe(400);
    expect(shell.body.error.code).toBe('INVALID_IMAGE');

    const svg = await upload(admin.token, URL, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'banner.png');
    expect(svg.status).toBe(400);

    const wrongType = await upload(admin.token, URL, await png(64, 64), 'notes.txt', 'text/plain');
    expect(wrongType.status).toBe(400);

    const big = Buffer.alloc(6 * 1024 * 1024, 1);
    big[0] = 0xff; big[1] = 0xd8; big[2] = 0xff;
    const tooLarge = await upload(admin.token, URL, big, 'huge.jpg', 'image/jpeg');
    expect(tooLarge.status).toBe(400);
    expect(tooLarge.body.error.code).toBe('LIMIT_FILE_SIZE');
  });

  it('is reachable only by administrators', async () => {
    const customer = await createUser();
    const image = await png(200, 100);

    const anon = await request(app).post(URL).attach('image', image, { filename: 'a.png', contentType: 'image/png' });
    expect(anon.status).toBe(401);

    const asCustomer = await asUser(customer.token).post(URL).attach('image', image, { filename: 'a.png', contentType: 'image/png' });
    expect(asCustomer.status).toBe(403);
  });
});
