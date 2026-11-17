const { app, request, createUser, createAdmin, createCategory, createProduct, asUser } = require('./helpers');
const Category = require('../models/Category');
const StorefrontContent = require('../models/StorefrontContent');
const storageService = require('../services/storageService');
const { normaliseContent, toPublicContent } = require('../services/storefrontService');

const ADMIN = '/api/admin/storefront';

const image = (name, width = 1200, height = 900) => ({
  url: `https://res.cloudinary.com/demo/image/upload/v1/touch/${name}.webp`,
  publicId: `touch/${name}`,
  width,
  height,
  alt: `${name} test image`,
});

/**
 * A complete homepage built from real categories and products — the Diwali
 * example: a full-banner hero, a hand-picked category rail and product rail,
 * an editorial panel, a campaign, a trust strip and a brand message.
 */
async function festiveHomepage({ heroPatch, sectionsPatch } = {}) {
  const category = await createCategory({ name: 'Festive Wear' });
  const product = await createProduct({ category: category._id, name: 'Anarkali Set' });

  const sections = [
    {
      id: 'sec_hero',
      type: 'hero',
      enabled: true,
      mode: 'banner',
      banner: {
        desktopImage: image('banner-desktop', 1920, 680),
        mobileImage: image('banner-mobile', 1080, 1350),
        alt: 'Diwali collection — celebrate in colour',
        link: '/shop?category=festive-wear',
      },
      structured: { heading: 'Celebrate in colour', primaryButtonText: 'Shop', primaryButtonLink: '/shop' },
      ...heroPatch,
    },
    {
      id: 'sec_categories',
      type: 'categoryRail',
      enabled: true,
      title: 'Shop by category',
      source: 'manual',
      items: [
        { enabled: true, categoryId: String(category._id), title: 'Festive', image: image('cat-festive', 400, 400) },
        { enabled: false, categoryId: String(category._id), title: 'Hidden duplicate' },
      ],
    },
    {
      id: 'sec_picks',
      type: 'productRail',
      enabled: true,
      title: 'Diwali picks',
      source: 'manual',
      productIds: [String(product._id)],
      limit: 8,
    },
    {
      id: 'sec_story',
      type: 'editorial',
      enabled: true,
      image: image('story'),
      heading: 'Lights, colour, you',
      buttonText: 'Explore',
      buttonLink: '/shop',
      layout: 'imageLeft',
      theme: 'maroon',
    },
    {
      id: 'sec_campaign',
      type: 'campaign',
      enabled: true,
      source: 'custom',
      items: [{ enabled: true, desktopImage: image('campaign'), title: 'Wedding edit', link: '/shop', tone: 'olive' }],
    },
    {
      id: 'sec_trust',
      type: 'trust',
      enabled: true,
      items: [
        { enabled: true, icon: 'truck', title: 'Free shipping', showWhen: 'always' },
        { enabled: true, icon: 'cod', title: 'Cash on delivery', showWhen: 'cod' },
        { enabled: false, icon: 'heart', title: 'Switched off message' },
      ],
    },
    {
      id: 'sec_brand',
      type: 'brandMessage',
      enabled: false,
      title: 'Made slowly',
      description: 'A hidden brand message.',
    },
    ...(sectionsPatch || []),
  ];

  return {
    category,
    product,
    content: {
      announcement: { enabled: true, items: [{ text: 'Diwali delivery before 20 October', icon: 'gift' }] },
      seo: { title: 'Celebrate in colour', description: 'Festive ethnic wear.', socialImage: image('og', 1200, 630) },
      sections,
    },
  };
}

describe('Storefront homepage builder', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('public API', () => {
    it('returns null content, not an error, when nothing has been published', async () => {
      const res = await request(app).get('/api/storefront');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ content: null, version: 0, publishedAt: null });
      expect(res.headers['cache-control']).toContain('public');
    });

    it('never exposes a draft that has not been published', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      await asUser(admin.token).put(`${ADMIN}/draft`).send({ content }).expect(200);

      const res = await request(app).get('/api/storefront');
      expect(res.body.data.content).toBeNull();
      expect(JSON.stringify(res.body)).not.toContain('Diwali');
    });

    it('serves published sections in order, without drafts, storage ids, identities or switched-off content', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      await asUser(admin.token).post(`${ADMIN}/publish`).send({ content }).expect(200);

      // A later draft edit must not leak.
      const edited = JSON.parse(JSON.stringify(content));
      edited.sections[0].banner.alt = 'Secret sale next week';
      await asUser(admin.token).put(`${ADMIN}/draft`).send({ content: edited }).expect(200);

      const res = await request(app).get('/api/storefront');
      const published = res.body.data.content;
      const body = JSON.stringify(res.body);

      expect(res.body.data.version).toBe(1);
      expect(published.sections.map((s) => s.type)).toEqual(['hero', 'categoryRail', 'productRail', 'editorial', 'campaign', 'trust']);
      expect(published.sections[0].banner.desktopImage.url).toContain('banner-desktop');
      expect(published.sections[1].items).toHaveLength(1);
      expect(body).not.toContain('Secret sale');
      expect(body).not.toContain('publicId');
      expect(body).not.toContain('Switched off message');
      expect(body).not.toContain('A hidden brand message');
      expect(body).not.toContain(String(admin.user._id));
      expect(body).not.toContain(admin.user.email);
      expect(res.body.data.draft).toBeUndefined();
    });
  });

  describe('admin access', () => {
    it('rejects anonymous callers and customers on every admin route', async () => {
      const customer = await createUser();
      const { content } = await festiveHomepage();

      for (const [method, url] of [['get', ADMIN], ['put', `${ADMIN}/draft`], ['post', `${ADMIN}/publish`], ['post', `${ADMIN}/discard`]]) {
        // eslint-disable-next-line no-await-in-loop
        const anon = await request(app)[method](url).send({ content });
        expect(anon.status, `anon ${method} ${url}`).toBe(401);
        // eslint-disable-next-line no-await-in-loop
        const asCustomer = await asUser(customer.token)[method](url).send({ content });
        expect(asCustomer.status, `customer ${method} ${url}`).toBe(403);
      }
      expect(await StorefrontContent.countDocuments()).toBe(0);
    });
  });

  describe('draft and publish workflow', () => {
    it('saves a draft without touching the live copy, then publishes explicitly', async () => {
      const admin = await createAdmin({ name: 'Mona Admin' });
      const { content } = await festiveHomepage();

      const saved = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(saved.status).toBe(200);
      expect(saved.body.data.published).toBeNull();
      expect(saved.body.data.hasUnpublishedChanges).toBe(true);
      expect(saved.body.data.draftUpdatedBy).toEqual({ name: 'Mona Admin' });

      const published = await asUser(admin.token).post(`${ADMIN}/publish`).send({});
      expect(published.status).toBe(200);
      expect(published.body.data.version).toBe(1);
      expect(published.body.data.hasUnpublishedChanges).toBe(false);
      expect(published.body.data.publishedBy).toEqual({ name: 'Mona Admin' });

      const reloaded = await asUser(admin.token).get(ADMIN);
      expect(reloaded.body.data.published.sections).toHaveLength(7);
    });

    it('refuses to publish when there is no draft', async () => {
      const admin = await createAdmin();
      const res = await asUser(admin.token).post(`${ADMIN}/publish`).send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NO_DRAFT');
    });

    it('discards draft changes back to the live version', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      await asUser(admin.token).post(`${ADMIN}/publish`).send({ content }).expect(200);

      const reordered = { ...content, sections: [...content.sections].reverse() };
      await asUser(admin.token).put(`${ADMIN}/draft`).send({ content: reordered }).expect(200);

      const res = await asUser(admin.token).post(`${ADMIN}/discard`).send({});
      expect(res.status).toBe(200);
      expect(res.body.data.draft.sections[0].type).toBe('hero');
      expect(res.body.data.hasUnpublishedChanges).toBe(false);
    });

    it('discards a draft that was never published, back to the built-in homepage', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      await asUser(admin.token).put(`${ADMIN}/draft`).send({ content }).expect(200);

      const res = await asUser(admin.token).post(`${ADMIN}/discard`).send({});
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ draft: null, published: null, hasUnpublishedChanges: false });

      const live = await request(app).get('/api/storefront');
      expect(live.body.data.content).toBeNull();
    });

    it('re-validates references at publish time', async () => {
      const admin = await createAdmin();
      const { content, category } = await festiveHomepage();
      await asUser(admin.token).put(`${ADMIN}/draft`).send({ content }).expect(200);

      await Category.deleteOne({ _id: category._id });

      const res = await asUser(admin.token).post(`${ADMIN}/publish`).send({});
      expect(res.status).toBe(400);
      expect(res.body.error.details.map((d) => d.field)).toContain('sections.1.items.0.categoryId');
    });

    it('keeps a replaced banner stored while an earlier version still uses it', async () => {
      const deleteImage = vi.spyOn(storageService, 'deleteImage').mockResolvedValue();
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      await asUser(admin.token).post(`${ADMIN}/publish`).send({ content }).expect(200);

      const replaced = JSON.parse(JSON.stringify(content));
      replaced.sections[0].banner.desktopImage = image('banner-diwali', 1920, 680);
      replaced.sections[0].banner.mobileImage = null;

      await asUser(admin.token).put(`${ADMIN}/draft`).send({ content: replaced }).expect(200);
      expect(deleteImage).not.toHaveBeenCalledWith('touch/banner-desktop');

      await asUser(admin.token).post(`${ADMIN}/publish`).send({}).expect(200);
      // The version it replaced is kept for "Restore Previous Version", so its images stay stored.
      expect(deleteImage).not.toHaveBeenCalledWith('touch/banner-desktop');
      expect(deleteImage).not.toHaveBeenCalledWith('touch/banner-mobile');
      expect(deleteImage).not.toHaveBeenCalledWith('touch/banner-diwali');
      expect(deleteImage).not.toHaveBeenCalledWith('touch/story');
    });
  });

  describe('hero modes', () => {
    it('requires a desktop banner and a description in full-banner mode', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage({ heroPatch: { banner: { desktopImage: null, alt: '' } } });

      const res = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(res.status).toBe(400);
      const fields = res.body.error.details.map((d) => d.field);
      expect(fields).toContain('sections.0.banner.desktopImage');
      expect(fields).toContain('sections.0.banner.alt');
    });

    it('keeps the banner and structured content side by side, so switching modes loses nothing', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage({ heroPatch: { mode: 'structured' } });

      const res = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(res.status).toBe(200);
      const hero = res.body.data.draft.sections[0];
      expect(hero.mode).toBe('structured');
      expect(hero.banner.desktopImage.url).toContain('banner-desktop');
      expect(hero.structured.heading).toBe('Celebrate in colour');
    });

    it('allows only one hero', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      content.sections.push({ ...content.sections[0], id: 'sec_hero_two' });

      const res = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('only one hero');
    });
  });

  describe('structured banner height and shade', () => {
    it('saves the banner height and image shade, and fills in compact and 90% when they are missing', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage({ heroPatch: { mode: 'structured' } });

      const defaults = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(defaults.status).toBe(200);
      expect(defaults.body.data.draft.sections[0].structured).toMatchObject({ size: 'compact', shade: 90 });

      Object.assign(content.sections[0].structured, { size: 'medium', shade: 40 });
      const saved = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(saved.status).toBe(200);
      expect(saved.body.data.draft.sections[0].structured).toMatchObject({ size: 'medium', shade: 40 });
    });

    it('rejects an unknown banner height and a shade outside 0 to 100', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage({ heroPatch: { mode: 'structured' } });
      Object.assign(content.sections[0].structured, { size: 'huge', shade: 150 });

      const res = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(res.status).toBe(400);
      const fields = res.body.error.details.map((d) => d.field);
      expect(fields).toContain('sections.0.structured.size');
      expect(fields).toContain('sections.0.structured.shade');
    });
  });

  describe('story shade and framing', () => {
    it('saves the Story shade strength and image framing, and keeps 100% when the shade is missing', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();

      const defaults = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(defaults.status).toBe(200);
      expect(defaults.body.data.draft.sections[3].shade).toBe(100);

      content.sections[3].shade = 35;
      content.sections[3].image = { ...image('story', 1600, 900), framing: { x: 20, y: 30, zoom: 1.4 } };
      const saved = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(saved.status).toBe(200);
      expect(saved.body.data.draft.sections[3]).toMatchObject({ shade: 35, image: { framing: { x: 20, y: 30, zoom: 1.4 } } });
    });

    it('rejects a Story shade outside 0 to 100', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      content.sections[3].shade = -5;
      const res = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(res.status).toBe(400);
      expect(res.body.error.details.map((d) => d.field)).toContain('sections.3.shade');
    });
  });

  describe('restoring the previous version', () => {
    const versionOf = (content, name) => {
      const next = JSON.parse(JSON.stringify(content));
      next.sections[0].banner.desktopImage = image(name, 1920, 680);
      next.sections[0].banner.alt = `Banner ${name}`;
      return next;
    };

    it('restores the previous published version, keeps its images and can be undone the same way', async () => {
      const deleteImage = vi.spyOn(storageService, 'deleteImage').mockResolvedValue();
      const admin = await createAdmin({ name: 'Mona Admin' });
      const { content } = await festiveHomepage();

      await asUser(admin.token).post(`${ADMIN}/publish`).send({ content }).expect(200);
      const b = await asUser(admin.token).post(`${ADMIN}/publish`).send({ content: versionOf(content, 'banner-b') }).expect(200);
      expect(b.body.data.history).toEqual([expect.objectContaining({ version: 1, publishedBy: { name: 'Mona Admin' } })]);
      expect(JSON.stringify(b.body.data.history)).not.toContain('sections');
      // Version A still needs its banner, so it stays stored.
      expect(deleteImage).not.toHaveBeenCalledWith('touch/banner-desktop');

      const restored = await asUser(admin.token).post(`${ADMIN}/restore`).send({});
      expect(restored.status).toBe(200);
      expect(restored.body.data.version).toBe(3);
      expect(restored.body.data.hasUnpublishedChanges).toBe(false);
      expect(restored.body.data.draft.sections[0].banner.alt).toBe(content.sections[0].banner.alt);
      expect(restored.body.data.history[0].version).toBe(2);

      const live = (await request(app).get('/api/storefront')).body.data.content;
      expect(live.sections[0].banner.desktopImage.url).toContain('banner-desktop');
      expect(deleteImage).not.toHaveBeenCalledWith('touch/banner-b');

      const back = await asUser(admin.token).post(`${ADMIN}/restore`).send({}).expect(200);
      expect(back.body.data.published.sections[0].banner.alt).toBe('Banner banner-b');
      expect(deleteImage).not.toHaveBeenCalled();
    });

    it('keeps five earlier versions and releases images only once no kept version uses them', async () => {
      const deleteImage = vi.spyOn(storageService, 'deleteImage').mockResolvedValue();
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      for (let n = 1; n <= 7; n += 1) {
        // eslint-disable-next-line no-await-in-loop
        await asUser(admin.token).post(`${ADMIN}/publish`).send({ content: versionOf(content, `v${n}`) }).expect(200);
      }
      const view = (await asUser(admin.token).get(ADMIN)).body.data;
      expect(view.history.map((entry) => entry.version)).toEqual([6, 5, 4, 3, 2]);
      expect(deleteImage).toHaveBeenCalledWith('touch/v1');
      expect(deleteImage).not.toHaveBeenCalledWith('touch/v2');
    });

    it('adds nothing to the history when the same content is published again', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      await asUser(admin.token).post(`${ADMIN}/publish`).send({ content }).expect(200);
      const again = await asUser(admin.token).post(`${ADMIN}/publish`).send({ content }).expect(200);
      expect(again.body.data.history).toEqual([]);
    });

    it('refuses when there is no earlier version', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      await asUser(admin.token).post(`${ADMIN}/publish`).send({ content }).expect(200);
      const res = await asUser(admin.token).post(`${ADMIN}/restore`).send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NO_PREVIOUS_VERSION');
    });

    it('re-checks the earlier version before restoring it', async () => {
      const admin = await createAdmin();
      const { content, category } = await festiveHomepage();
      await asUser(admin.token).post(`${ADMIN}/publish`).send({ content }).expect(200);
      const withoutRail = JSON.parse(JSON.stringify(content));
      withoutRail.sections.splice(1, 1);
      await asUser(admin.token).post(`${ADMIN}/publish`).send({ content: withoutRail }).expect(200);

      await Category.deleteOne({ _id: category._id });
      const res = await asUser(admin.token).post(`${ADMIN}/restore`).send({});
      expect(res.status).toBe(400);
      expect(res.body.error.details.map((d) => d.field)).toContain('sections.1.items.0.categoryId');
      const live = (await request(app).get('/api/storefront')).body.data.content;
      expect(live.sections.map((s) => s.type)).not.toContain('categoryRail');
    });
  });

  describe('words over images', () => {
    it('saves banner overlay words and the Story full-image settings, and publishes them', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      Object.assign(content.sections[0].banner, {
        eyebrow: 'New season', heading: 'Timeless', accentText: 'elegance', description: 'Soft fabrics.',
        buttonText: 'Explore', buttonLink: '/shop', textPosition: 'center', overlay: 'dark',
      });
      Object.assign(content.sections[3], { display: 'fullImage', textPosition: 'right', overlay: 'light' });

      await asUser(admin.token).post(`${ADMIN}/publish`).send({ content }).expect(200);
      const live = (await request(app).get('/api/storefront')).body.data.content;
      expect(live.sections[0].banner).toMatchObject({ heading: 'Timeless', buttonLink: '/shop', textPosition: 'center', overlay: 'dark' });
      expect(live.sections[3]).toMatchObject({ display: 'fullImage', textPosition: 'right', overlay: 'light' });
    });

    it('defaults to left-aligned words, medium shading and the split Story', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      const res = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content }).expect(200);
      expect(res.body.data.draft.sections[0].banner).toMatchObject({ textPosition: 'left', overlay: 'medium', heading: '' });
      expect(res.body.data.draft.sections[3]).toMatchObject({ display: 'split', textPosition: 'left', overlay: 'medium' });
    });

    it('rejects unknown choices, unsafe links and a button without a link', async () => {
      const admin = await createAdmin();
      const fields = async (mutate) => {
        const { content } = await festiveHomepage();
        mutate(content);
        const res = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
        return (res.body.error?.details || []).map((d) => d.field);
      };
      expect(await fields((c) => { c.sections[0].banner.textPosition = 'top'; })).toContain('sections.0.banner.textPosition');
      expect(await fields((c) => { c.sections[0].banner.overlay = 'neon'; })).toContain('sections.0.banner.overlay');
      expect(await fields((c) => { c.sections[0].banner.buttonText = 'Shop'; })).toContain('sections.0.banner.buttonLink');
      expect(await fields((c) => { c.sections[0].banner.buttonText = 'Shop'; c.sections[0].banner.buttonLink = 'javascript:alert(1)'; })).toContain('sections.0.banner.buttonLink');
      expect(await fields((c) => { c.sections[0].banner.heading = '<b>x</b>'; })).toContain('sections.0.banner.heading');
      expect(await fields((c) => { c.sections[3].display = 'mosaic'; })).toContain('sections.3.display');
    });
  });

  describe('main banners and top message', () => {
    const slide = (id, patch = {}) => ({
      id,
      enabled: true,
      mode: 'banner',
      banner: { desktopImage: image(`${id}-desktop`, 1920, 680), mobileImage: image(`${id}-mobile`, 1080, 1350), alt: `${id} banner`, link: '/shop' },
      structured: { heading: '' },
      ...patch,
    });
    const saveHero = async (heroPatch) => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage({ heroPatch });
      return asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
    };
    const fieldsOf = (res) => (res.body.error?.details || []).map((d) => d.field);

    it('saves up to four banners with their timing, mirrors the first and publishes only visible banners', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage({
        heroPatch: {
          slides: [
            slide('diwali'),
            slide('wedding', { enabled: false }),
            slide('edit', { mode: 'structured', structured: { heading: 'The festive edit', primaryButtonText: 'Shop', primaryButtonLink: '/shop' } }),
          ],
          autoplay: true,
          interval: 5,
        },
      });
      const saved = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(saved.status).toBe(200);
      const hero = saved.body.data.draft.sections[0];
      expect(hero.slides.map((s) => s.id)).toEqual(['diwali', 'wedding', 'edit']);
      expect(hero.interval).toBe(5);
      expect(hero.banner.desktopImage.url).toContain('diwali-desktop');

      await asUser(admin.token).post(`${ADMIN}/publish`).send({}).expect(200);
      const live = (await request(app).get('/api/storefront')).body.data.content.sections[0];
      expect(live.slides.map((s) => s.id)).toEqual(['diwali', 'edit']);
      expect(live.autoplay).toBe(true);
      expect(JSON.stringify(live)).not.toContain('publicId');
    });

    it('checks each shown banner on its own and skips hidden ones', async () => {
      const empty = { banner: { desktopImage: null, alt: '' } };
      const res = await saveHero({ slides: [slide('ok'), slide('empty', empty), slide('later', { ...empty, enabled: false })] });
      expect(res.status).toBe(400);
      expect(fieldsOf(res)).toEqual(expect.arrayContaining(['sections.0.slides.1.banner.desktopImage', 'sections.0.slides.1.banner.alt']));
      expect(fieldsOf(res).some((field) => field.startsWith('sections.0.slides.2'))).toBe(false);
    });

    it('allows at most four banners, needs one shown, only 3, 4 or 5 seconds and safe links', async () => {
      expect(fieldsOf(await saveHero({ slides: ['a', 'b', 'c', 'd', 'e'].map((id) => slide(id)) }))).toContain('sections.0.slides');
      expect(fieldsOf(await saveHero({ slides: [slide('a', { enabled: false })] }))).toContain('sections.0.slides');
      expect(fieldsOf(await saveHero({ slides: [slide('a')], interval: 60 }))).toContain('sections.0.interval');
      const unsafe = slide('a');
      unsafe.banner.link = 'javascript:alert(1)';
      expect(fieldsOf(await saveHero({ slides: [unsafe] }))).toContain('sections.0.slides.0.banner.link');
    });

    it('keeps a hero saved before banners existed working as one banner', async () => {
      const res = await saveHero({});
      expect(res.status).toBe(200);
      const hero = res.body.data.draft.sections[0];
      expect(hero.slides).toEqual([]);
      expect(hero).toMatchObject({ mode: 'banner', autoplay: true, interval: 4 });
    });

    it('saves how the top message moves and rejects unknown choices', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      content.announcement = { ...content.announcement, motion: 'still', direction: 'ltr', speed: 'fast' };
      const res = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(res.status).toBe(200);
      expect(res.body.data.draft.announcement).toMatchObject({ motion: 'still', direction: 'ltr', speed: 'fast' });
      await asUser(admin.token).post(`${ADMIN}/publish`).send({}).expect(200);
      const live = (await request(app).get('/api/storefront')).body.data.content;
      expect(live.announcement).toMatchObject({ motion: 'still', direction: 'ltr', speed: 'fast' });

      content.announcement.speed = 'warp';
      const bad = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(bad.status).toBe(400);
      expect(fieldsOf(bad)).toContain('announcement.speed');
    });

    it('treats a top message saved before movement settings existed as moving at normal speed', () => {
      const pub = toPublicContent({ announcement: { enabled: true, items: [] }, sections: [] });
      expect(pub.announcement).toMatchObject({ motion: 'moving', direction: 'rtl', speed: 'normal' });
    });
  });

  describe('promotions', () => {
    const PROMO = 4;
    const itemField = (key) => `sections.${PROMO}.items.0.${key}`;
    const fullImagePromotion = (patch = {}) => ({
      enabled: true,
      layout: 'fullImage',
      desktopImage: { ...image('sale-wide', 2400, 800), framing: { x: 30, y: 62.5, zoom: 1.5 } },
      mobileImage: { ...image('sale-phone', 1080, 1080), framing: { x: 50, y: 20, zoom: 2 } },
      eyebrow: 'Festive',
      title: 'Diwali sale',
      description: 'Up to 40% off festive wear.',
      buttonText: 'Shop now',
      link: '/shop',
      textPosition: 'right',
      overlay: 'dark',
      imageFit: 'cover',
      ...patch,
    });
    const save = async (mutate) => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      mutate(content.sections[PROMO].items, content);
      return asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
    };
    const fieldsOf = (res) => (res.body.error?.details || []).map((d) => d.field);

    it('treats a promotion saved before layouts existed as a Split Layout promotion and publishes it unchanged', async () => {
      const admin = await createAdmin();
      const storedItem = {
        enabled: true,
        desktopImage: image('campaign'),
        mobileImage: null,
        eyebrow: '',
        title: 'Wedding edit',
        description: '',
        buttonText: '',
        link: '/shop',
        tone: 'olive',
      };
      await StorefrontContent.create({
        key: 'homepage',
        draft: {
          schemaVersion: 2,
          announcement: { enabled: true, items: [] },
          seo: { title: '', description: '', socialImage: null },
          sections: [{ id: 'sec_campaign', type: 'campaign', enabled: true, title: '', source: 'custom', items: [storedItem] }],
        },
      });

      const res = await asUser(admin.token).post(`${ADMIN}/publish`).send({});
      expect(res.status).toBe(200);
      const defaults = { layout: 'split', textPosition: 'left', overlay: 'medium', imageFit: 'contain' };
      expect(res.body.data.published.sections[0].items[0]).toEqual({ ...storedItem, ...defaults });
      // An older document keeps its version, so the storefront still restores Shop by Category for it.
      expect(res.body.data.published.schemaVersion).toBe(2);

      const liveContent = (await request(app).get('/api/storefront')).body.data.content;
      expect(liveContent.schemaVersion).toBe(2);
      const live = liveContent.sections[0].items[0];
      const { publicId, ...publicImage } = storedItem.desktopImage;
      expect(publicId).toBeTruthy();
      expect(live).toEqual({ ...storedItem, ...defaults, desktopImage: publicImage });
    });

    it('fills in the defaults when a promotion is saved without the new settings', async () => {
      const res = await save(() => {});
      expect(res.status).toBe(200);
      const item = res.body.data.draft.sections[PROMO].items[0];
      expect(item).toMatchObject({ layout: 'split', textPosition: 'left', overlay: 'medium', imageFit: 'contain', title: 'Wedding edit', tone: 'olive' });
      expect(item.desktopImage).not.toHaveProperty('framing');
    });

    it('saves and publishes a Full Image promotion with its framing, without storage ids', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      content.sections[PROMO].items = [fullImagePromotion()];

      const published = await asUser(admin.token).post(`${ADMIN}/publish`).send({ content });
      expect(published.status).toBe(200);
      expect(published.body.data.hasUnpublishedChanges).toBe(false);
      expect(published.body.data.published.sections[PROMO].items[0]).toMatchObject({
        layout: 'fullImage',
        textPosition: 'right',
        overlay: 'dark',
        imageFit: 'cover',
        desktopImage: { publicId: 'touch/sale-wide', framing: { x: 30, y: 62.5, zoom: 1.5 } },
        mobileImage: { publicId: 'touch/sale-phone', framing: { x: 50, y: 20, zoom: 2 } },
      });

      // Content saved by the current builder is version 3: its section list is kept exactly.
      expect(published.body.data.published.schemaVersion).toBe(3);

      const res = await request(app).get('/api/storefront');
      expect(res.body.data.content.schemaVersion).toBe(3);
      const live = res.body.data.content.sections[PROMO].items[0];
      expect(live.desktopImage).toEqual({
        url: image('sale-wide').url, width: 2400, height: 800, alt: 'sale-wide test image', framing: { x: 30, y: 62.5, zoom: 1.5 },
      });
      expect(live.mobileImage).toEqual({
        url: image('sale-phone').url, width: 1080, height: 1080, alt: 'sale-phone test image', framing: { x: 50, y: 20, zoom: 2 },
      });
      expect(live).toMatchObject({ layout: 'fullImage', textPosition: 'right', overlay: 'dark', imageFit: 'cover', title: 'Diwali sale' });
      expect(JSON.stringify(res.body)).not.toContain('publicId');
    });

    it('rejects framing that is out of range or not a set of numbers', async () => {
      const framed = (framing, key = 'desktopImage') => (items) => {
        items[0] = fullImagePromotion();
        items[0][key].framing = framing;
      };
      for (const framing of [{ x: 50, y: 50, zoom: 4 }, { x: -1, y: 50, zoom: 1 }, 'center', { x: '50', y: 50, zoom: 1 }, { x: 50, y: 50 }, [50, 50, 1]]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await save(framed(framing));
        expect(res.status, JSON.stringify(framing)).toBe(400);
        expect(fieldsOf(res)).toContain(itemField('desktopImage.framing'));
      }
      const phone = await save(framed({ x: 50, y: 101, zoom: 1 }, 'mobileImage'));
      expect(phone.status).toBe(400);
      expect(fieldsOf(phone)).toContain(itemField('mobileImage.framing'));
      expect(phone.body.error.details.find((d) => d.field === itemField('mobileImage.framing')).message)
        .toBe('The position or zoom saved for promotion 1 phone image is not valid. Open Edit image and save it again.');
    });

    it('needs a banner image for a Full Image promotion', async () => {
      const res = await save((items) => { items[0] = fullImagePromotion({ desktopImage: null }); });
      expect(res.status).toBe(400);
      expect(res.body.error.details).toContainEqual({
        field: itemField('desktopImage'),
        message: 'Upload a banner image for promotion 1, or switch it to Split Layout.',
      });
    });

    it('accepts a Full Image promotion without a heading when the image is described, and needs one or the other', async () => {
      const described = await save((items) => { items[0] = fullImagePromotion({ title: '', eyebrow: '', description: '', buttonText: '' }); });
      expect(described.status).toBe(200);
      expect(described.body.data.draft.sections[PROMO].items[0]).toMatchObject({ layout: 'fullImage', title: '' });

      const bare = await save((items) => {
        items[0] = fullImagePromotion({ title: '' });
        items[0].desktopImage.alt = '';
      });
      expect(bare.status).toBe(400);
      expect(bare.body.error.details).toContainEqual({
        field: itemField('title'),
        message: 'Add a main heading or an image description for promotion 1.',
      });
    });

    it('still needs a main heading and a link for a Split Layout promotion', async () => {
      const untitled = await save((items) => { items[0].title = ''; });
      expect(untitled.status).toBe(400);
      expect(untitled.body.error.details).toContainEqual({ field: itemField('title'), message: 'Add a main heading for promotion 1.' });

      const unlinked = await save((items) => { items[0].link = ''; });
      expect(fieldsOf(unlinked)).toContain(itemField('link'));
    });

    it('rejects unknown layout, image display, text position and shade choices', async () => {
      expect(fieldsOf(await save((items) => { items[0].layout = 'mosaic'; }))).toContain(itemField('layout'));
      expect(fieldsOf(await save((items) => { items[0] = fullImagePromotion({ imageFit: 'stretch' }); }))).toContain(itemField('imageFit'));
      expect(fieldsOf(await save((items) => { items[0] = fullImagePromotion({ textPosition: 'top' }); }))).toContain(itemField('textPosition'));
      expect(fieldsOf(await save((items) => { items[0] = fullImagePromotion({ overlay: 'neon' }); }))).toContain(itemField('overlay'));
    });

    it('checks only promotions that are shown, like banners, but still needs a link on every promotion', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      const unfinished = { enabled: false, layout: 'fullImage', desktopImage: null, title: '', link: '/shop' };
      content.sections[PROMO].items.push(unfinished, { enabled: false, layout: 'split', title: '', link: '/shop' });

      const saved = await asUser(admin.token).post(`${ADMIN}/publish`).send({ content });
      expect(saved.status).toBe(200);
      const live = (await request(app).get('/api/storefront')).body.data.content.sections[PROMO];
      expect(live.items.map((item) => item.title)).toEqual(['Wedding edit']);

      const res = await save((items) => { items.push({ ...unfinished, link: '' }); });
      expect(res.status).toBe(400);
      expect(fieldsOf(res)).toEqual([`sections.${PROMO}.items.1.link`]);
    });

    it('does not check stored promotions while the automatic promotions are chosen', async () => {
      const res = await save((items, content) => {
        content.sections[PROMO].source = 'categories';
        items.push({ enabled: true, layout: 'fullImage', desktopImage: null, title: '', link: '/shop' });
      });
      expect(res.status).toBe(200);
      expect(res.body.data.draft.sections[PROMO].source).toBe('categories');
    });
  });

  describe('menu bar and footer', () => {
    const MENU = {
      logo: null,
      links: [
        { enabled: true, label: 'Shop all', link: '/shop' },
        { enabled: false, label: 'Clearance', link: '/shop?onSale=true' },
      ],
      showCategories: false,
      sale: { enabled: true, label: 'Festive', link: '/shop?category=festive-wear' },
    };

    const FOOTER = {
      tagline: 'Handwoven pieces, made to last.',
      newsletter: { enabled: false, title: '', description: '' },
      shop: { title: 'Browse', showCategories: true, links: [{ enabled: true, label: 'All products', link: '/shop' }] },
      help: { title: 'Help', links: [{ enabled: false, label: 'Retired page', link: '/about' }] },
      contact: { title: 'Get in touch', phone: '+91 91633 99339', email: 'hello@touchh.in', location: 'Howrah, West Bengal' },
      social: { title: 'Follow us', instagram: 'https://www.instagram.com/touchh.in/', handle: '@touchh.in', note: '' },
      legal: {
        title: 'Legal & business details',
        legalName: 'ROMIUL KARIM MULLICK',
        tradeName: 'RNR CREATIONS',
        gstin: '19FCRPM5613K1ZW',
        address: 'K.F.MARKET, MUNSHIDANGA MORE,\nHowrah, West Bengal, 711403',
      },
      bottom: { copyright: 'TOUCHH. All rights reserved.', links: [{ enabled: true, label: 'Privacy', link: '/privacy' }] },
    };

    it('leaves both unset until they are edited, so the built-in ones are used', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();

      await asUser(admin.token).post(`${ADMIN}/publish`).send({ content }).expect(200);

      const stored = await StorefrontContent.findOne().lean();
      expect(stored.published.header).toBeNull();
      expect(stored.published.footer).toBeNull();

      const live = await request(app).get('/api/storefront');
      expect(live.body.data.content.header).toBeNull();
      expect(live.body.data.content.footer).toBeNull();
    });

    it('publishes an edited menu bar and footer, and hides switched-off links from shoppers', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      content.header = MENU;
      content.footer = FOOTER;

      await asUser(admin.token).post(`${ADMIN}/publish`).send({ content }).expect(200);

      // The draft keeps every link, switched off or not, so the owner can bring one back.
      const stored = await StorefrontContent.findOne().lean();
      expect(stored.published.header.links).toHaveLength(2);
      expect(stored.published.header.showCategories).toBe(false);
      expect(stored.published.footer.help.links).toHaveLength(1);

      const { header, footer } = (await request(app).get('/api/storefront')).body.data.content;
      expect(header.links.map((l) => l.label)).toEqual(['Shop all']);
      expect(header.sale).toEqual({ enabled: true, label: 'Festive', link: '/shop?category=festive-wear' });
      expect(footer.help.links).toEqual([]);
      expect(footer.shop.links.map((l) => l.label)).toEqual(['All products']);
      expect(footer.contact.email).toBe('hello@touchh.in');
      expect(footer.legal.address).toContain('Howrah, West Bengal, 711403');
      expect(footer.newsletter.enabled).toBe(false);
    });

    it('stores a logo like any other uploaded image, without its storage reference', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      content.header = { ...MENU, logo: image('logo', 600, 150) };

      await asUser(admin.token).post(`${ADMIN}/publish`).send({ content }).expect(200);

      const stored = await StorefrontContent.findOne().lean();
      expect(stored.published.header.logo.publicId).toBe('touch/logo');

      const { header } = (await request(app).get('/api/storefront')).body.data.content;
      expect(header.logo.url).toBe(content.header.logo.url);
      expect(header.logo.publicId).toBeUndefined();
    });
  });

  describe('validation', () => {
    const rejects = async (mutate, field) => {
      const admin = await createAdmin();
      const { content, ...fixtures } = await festiveHomepage();
      mutate(content, fixtures);
      const res = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      if (field) expect(res.body.error.details.map((d) => d.field)).toContain(field);
      expect(await StorefrontContent.countDocuments()).toBe(0);
    };

    it('rejects unsupported section types and duplicate ids', async () => {
      await rejects((c) => c.sections.push({ id: 'sec_custom', type: 'customHtml', html: '<script>' }), 'sections.7.type');
      await rejects((c) => { c.sections[3].id = 'sec_hero'; }, 'sections.3.id');
    });

    it('rejects HTML in text and script or protocol-relative links', async () => {
      await rejects((c) => { c.sections[3].heading = '<img src=x onerror=alert(1)>'; }, 'sections.3.heading');
      await rejects((c) => { c.sections[0].banner.link = 'javascript:alert(1)'; }, 'sections.0.banner.link');
      await rejects((c) => { c.sections[3].buttonLink = '//evil.example.com'; }, 'sections.3.buttonLink');
    });

    it('rejects inline or non-uploaded images', async () => {
      await rejects(
        (c) => { c.sections[0].banner.desktopImage = { url: 'data:image/png;base64,iVBORw0KGgo=' }; },
        'sections.0.banner.desktopImage.url'
      );
    });

    it('rejects malformed and non-existent category and product references', async () => {
      await rejects((c) => { c.sections[1].items[0].categoryId = 'not-an-id'; }, 'sections.1.items.0.categoryId');
      await rejects((c) => { c.sections[1].items[0].categoryId = '64b000000000000000000001'; }, 'sections.1.items.0.categoryId');
      await rejects((c) => { c.sections[2].productIds = ['64b000000000000000000002']; }, 'sections.2.productIds.0');
      await rejects((c) => { c.sections[2].source = 'category'; c.sections[2].categoryId = null; }, 'sections.2.categoryId');
    });

    it('rejects unknown options, too many items and excessive lengths', async () => {
      await rejects((c) => { c.sections[5].items[0].icon = 'skull'; }, 'sections.5.items.0.icon');
      await rejects((c) => { c.sections[2].source = 'everything'; }, 'sections.2.source');
      await rejects((c) => { c.sections[2].limit = 500; }, 'sections.2.limit');
      await rejects(
        (c) => { c.announcement.items = Array.from({ length: 7 }, (_, i) => ({ text: `Message ${i}` })); },
        'announcement.items'
      );
      await rejects((c) => { c.sections[3].heading = 'x'.repeat(61); }, 'sections.3.heading');
    });

    it('rejects unsafe or malformed menu bar and footer details', async () => {
      await rejects((c) => { c.header = { links: [{ enabled: true, label: 'Deals', link: 'javascript:alert(1)' }] }; }, 'header.links.0.link');
      await rejects((c) => { c.header = { links: [{ enabled: true, label: '', link: '/shop' }] }; }, 'header.links.0.label');
      await rejects(
        (c) => { c.header = { links: Array.from({ length: 7 }, (_, i) => ({ enabled: true, label: `Link ${i}`, link: '/shop' })) }; },
        'header.links'
      );
      await rejects((c) => { c.footer = { contact: { email: 'not-an-address' } }; }, 'footer.contact.email');
      await rejects((c) => { c.footer = { contact: { phone: 'call us anytime' } }; }, 'footer.contact.phone');
      await rejects((c) => { c.footer = { legal: { legalName: '<b>RNR CREATIONS</b>' } }; }, 'footer.legal.legalName');
      await rejects((c) => { c.footer = { social: { instagram: '//evil.example.com' } }; }, 'footer.social.instagram');
    });

    it('stores only whitelisted fields', async () => {
      const admin = await createAdmin();
      const { content } = await festiveHomepage();
      content.sections[3].style = 'display:none';
      content.sections[3].onClick = 'alert(1)';
      content.customCss = 'body{display:none}';

      const res = await asUser(admin.token).put(`${ADMIN}/draft`).send({ content, published: content });
      expect(res.status).toBe(200);
      expect(res.body.data.published).toBeNull();

      const stored = JSON.stringify(await StorefrontContent.findOne().lean());
      expect(stored).not.toContain('onClick');
      expect(stored).not.toContain('display:none');
    });
  });

  describe('cash on delivery messaging', () => {
    it('hides COD-only messages whenever the payments config cannot honour them', async () => {
      const { content } = await festiveHomepage();
      const normalised = await normaliseContent(content);

      const withoutCod = toPublicContent(normalised, { codAvailable: false });
      const trust = withoutCod.sections.find((s) => s.type === 'trust');
      expect(trust.items.map((i) => i.title)).toEqual(['Free shipping']);

      const withCod = toPublicContent(normalised, { codAvailable: true });
      expect(withCod.sections.find((s) => s.type === 'trust').items).toHaveLength(2);
    });
  });
});
