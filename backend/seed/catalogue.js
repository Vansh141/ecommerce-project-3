/**
 * Demo catalogue for TOUCH — a women's fashion boutique.
 *
 * Image URLs point at Unsplash placeholders so the store looks real out of the
 * box. They are DEMO ASSETS: replace them with your own photography via
 * Admin → Products before going live. Nothing here makes a factual claim about
 * a product the business does not stock.
 */

const categories = [
  {
    key: 'new-arrivals',
    name: 'New Arrivals',
    description: 'The latest pieces to land in the studio.',
    displayOrder: 1,
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1200',
    metaTitle: 'New Arrivals',
    metaDescription: 'Discover the newest additions to the TOUCH collection.',
  },
  {
    key: 'dresses',
    name: 'Dresses',
    description: 'Easy silhouettes for every hour of the day.',
    displayOrder: 2,
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=1200',
    metaTitle: 'Dresses',
    metaDescription: 'Midi, maxi and slip dresses designed for everyday elegance.',
  },
  {
    key: 'tops',
    name: 'Tops & Blouses',
    description: 'Considered basics and quiet statement pieces.',
    displayOrder: 3,
    image: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?auto=format&fit=crop&q=80&w=1200',
    metaTitle: 'Tops & Blouses',
    metaDescription: 'Linen shirts, silk blouses and everyday knits.',
  },
  {
    key: 'co-ords',
    name: 'Co-ord Sets',
    description: 'Two pieces, one decision.',
    displayOrder: 4,
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1200',
    metaTitle: 'Co-ord Sets',
    metaDescription: 'Matching sets that work together or apart.',
  },
  {
    key: 'ethnic',
    name: 'Ethnic Wear',
    description: 'Contemporary takes on classic Indian craft.',
    displayOrder: 5,
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=1200',
    metaTitle: 'Ethnic Wear',
    metaDescription: 'Kurtas, sets and festive pieces made in India.',
  },
  {
    key: 'bottoms',
    name: 'Bottoms',
    description: 'Trousers, skirts and everything in between.',
    displayOrder: 6,
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=1200',
    metaTitle: 'Bottoms',
    metaDescription: 'Wide-leg trousers, midi skirts and tailored separates.',
  },
  {
    key: 'outerwear',
    name: 'Outerwear',
    description: 'Layers that finish the look.',
    displayOrder: 7,
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=1200',
    metaTitle: 'Outerwear',
    metaDescription: 'Overshirts, jackets and light layering pieces.',
  },
  {
    key: 'accessories',
    name: 'Accessories',
    description: 'The finishing details.',
    displayOrder: 8,
    image: 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&q=80&w=1200',
    metaTitle: 'Accessories',
    metaDescription: 'Scarves, belts and considered accessories.',
  },
];

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

/** Builds a variant row per size with the given stock counts. */
const variants = (stockBySize) =>
  Object.entries(stockBySize).map(([size, stock]) => ({ size, stock }));

const products = [
  {
    name: 'Amara Linen Midi Dress',
    category: 'dresses',
    price: 2890,
    mrp: 3600,
    shortDescription: 'A softly gathered midi in washed European linen.',
    description:
      'Cut from washed European linen with a gently gathered waist and a full midi skirt, the Amara is built for warm days and long evenings. Side seam pockets, a concealed back zip, and a relaxed bodice that skims rather than clings. Fully opaque, no lining required.',
    material: '100% washed linen',
    careInstructions: 'Machine wash cold on a gentle cycle. Line dry in shade. Warm iron.',
    images: [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['linen', 'midi', 'summer', 'dress'],
    stock: { XS: 6, S: 12, M: 14, L: 9, XL: 4 },
    isNewArrival: true,
    isFeatured: true,
  },
  {
    name: 'Noor Silk Slip Dress',
    category: 'dresses',
    price: 4250,
    mrp: 4250,
    shortDescription: 'Bias-cut mulberry silk with adjustable straps.',
    description:
      'A true bias cut in 19-momme mulberry silk, finished with French seams and adjustable straps. The Noor falls in a clean column and moves with you. Wear it alone in summer or layered over a fine knit when the evening turns.',
    material: '100% mulberry silk',
    careInstructions: 'Dry clean recommended. Cool iron on reverse.',
    images: [
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['silk', 'slip', 'evening', 'dress'],
    stock: { XS: 3, S: 7, M: 8, L: 5, XL: 2 },
    isFeatured: true,
  },
  {
    name: 'Ira Cotton Poplin Shirt Dress',
    category: 'dresses',
    price: 2450,
    mrp: 2990,
    shortDescription: 'A crisp shirt dress with a removable belt.',
    description:
      'Structured cotton poplin with a full button placket, dropped shoulders and a removable self-belt. Wear it buttoned and belted, or open as a light layer over the Rhea trousers.',
    material: '100% cotton poplin',
    careInstructions: 'Machine wash cold. Tumble dry low. Warm iron.',
    images: [
      'https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['cotton', 'shirt dress', 'workwear'],
    stock: { XS: 5, S: 10, M: 11, L: 7, XL: 5 },
    isNewArrival: true,
  },
  {
    name: 'Leila Oversized Linen Shirt',
    category: 'tops',
    price: 1890,
    mrp: 2400,
    shortDescription: 'A relaxed shirt that works untucked or knotted.',
    description:
      'An oversized shirt in mid-weight linen with a camp collar, patch pocket and a slightly dropped shoulder. Deliberately roomy — size down for a closer fit.',
    material: '100% linen',
    careInstructions: 'Machine wash cold. Line dry. Warm iron while damp.',
    images: [
      'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['linen', 'shirt', 'oversized'],
    stock: { XS: 8, S: 14, M: 16, L: 10, XL: 6 },
    isNewArrival: true,
  },
  {
    name: 'Mira Ribbed Knit Top',
    category: 'tops',
    price: 1290,
    mrp: 1290,
    shortDescription: 'A fine-gauge rib that holds its shape.',
    description:
      'Fine-gauge ribbed cotton with a scoop neck and a close, stretchy fit. A quiet base layer that sits neatly under the Sana overshirt.',
    material: '92% cotton, 8% elastane',
    careInstructions: 'Machine wash cold. Reshape and dry flat.',
    images: [
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['knit', 'basic', 'rib'],
    stock: { XS: 10, S: 18, M: 20, L: 12, XL: 8 },
  },
  {
    name: 'Sana Cotton Overshirt',
    category: 'outerwear',
    price: 2690,
    mrp: 3400,
    shortDescription: 'A light layer for transitional weather.',
    description:
      'A boxy overshirt in brushed cotton twill with horn-effect buttons and two chest pockets. Substantial enough to work as a light jacket, soft enough to wear indoors.',
    material: '100% brushed cotton twill',
    careInstructions: 'Machine wash cold. Tumble dry low.',
    images: [
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['overshirt', 'layer', 'cotton'],
    stock: { XS: 4, S: 8, M: 9, L: 6, XL: 3 },
    isFeatured: true,
  },
  {
    name: 'Rhea Wide-Leg Trousers',
    category: 'bottoms',
    price: 2290,
    mrp: 2890,
    shortDescription: 'High-waisted, fluid, and endlessly wearable.',
    description:
      'A high-waisted wide leg in a fluid tencel blend, with a flat front, side pockets and a concealed hook closure. Cut long — designed to break just above the shoe.',
    material: '65% tencel, 35% viscose',
    careInstructions: 'Machine wash cold on gentle. Line dry. Cool iron.',
    images: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['trousers', 'wide leg', 'workwear'],
    stock: { XS: 6, S: 11, M: 13, L: 8, XL: 5 },
    isNewArrival: true,
  },
  {
    name: 'Devi Handblock Kurta Set',
    category: 'ethnic',
    price: 3450,
    mrp: 4200,
    shortDescription: 'Hand-block printed cotton, made in Jaipur.',
    description:
      'A straight-cut kurta with matching palazzo, hand-block printed on soft cotton by artisans in Jaipur. Natural dyes mean slight variation between pieces — that is the mark of the craft, not a flaw.',
    material: '100% cotton, hand-block printed',
    careInstructions: 'First wash separately in cold water. Do not bleach. Line dry in shade.',
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['ethnic', 'kurta', 'handblock', 'cotton'],
    stock: { XS: 4, S: 9, M: 10, L: 7, XL: 4 },
    isFeatured: true,
  },
  {
    name: 'Zara Cotton Co-ord Set',
    category: 'co-ords',
    price: 3190,
    mrp: 3990,
    shortDescription: 'A cropped shirt and matching midi skirt.',
    description:
      'A two-piece in textured cotton: cropped boxy shirt above a bias midi skirt with an elasticated back waist. Sold as a set, styled just as easily apart.',
    material: '100% textured cotton',
    careInstructions: 'Machine wash cold. Line dry. Warm iron.',
    images: [
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['co-ord', 'set', 'cotton'],
    stock: { XS: 3, S: 8, M: 9, L: 5, XL: 2 },
    isNewArrival: true,
  },
  {
    name: 'Anaya Tiered Maxi Dress',
    category: 'dresses',
    price: 3290,
    mrp: 4100,
    shortDescription: 'Three tiers of cotton voile with a smocked bodice.',
    description:
      'A floor-skimming maxi in lightweight cotton voile, with a smocked bodice, tie shoulders and three gathered tiers. Lined to the knee.',
    material: '100% cotton voile, cotton lining',
    careInstructions: 'Machine wash cold on gentle. Line dry in shade.',
    images: [
      'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['maxi', 'cotton', 'summer', 'dress'],
    stock: { XS: 5, S: 9, M: 12, L: 6, XL: 3 },
  },
  {
    name: 'Kiara Pleated Midi Skirt',
    category: 'bottoms',
    price: 1990,
    mrp: 2490,
    shortDescription: 'Knife pleats with a soft, satin finish.',
    description:
      'A knife-pleated midi with an elasticated waist and a soft satin finish that catches the light without shine. Falls mid-calf on most heights.',
    material: '100% recycled polyester satin',
    careInstructions: 'Hand wash cold or dry clean. Do not tumble dry. Cool iron.',
    images: [
      'https://images.unsplash.com/photo-1583496661160-fb5886a13d77?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['skirt', 'pleated', 'midi'],
    stock: { XS: 4, S: 10, M: 11, L: 7, XL: 4 },
  },
  {
    name: 'Sia Silk Scarf',
    category: 'accessories',
    price: 1450,
    mrp: 1450,
    shortDescription: 'A hand-rolled square in printed silk twill.',
    description:
      'A 70cm square of silk twill with hand-rolled edges and an in-house print. Wear it at the neck, in the hair, or knotted to a bag handle.',
    material: '100% silk twill',
    careInstructions: 'Dry clean only.',
    images: [
      'https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['scarf', 'silk', 'accessory'],
    // Accessories are one-size — the variant model handles this without a
    // separate schema, which is exactly why sizes are not hardcoded.
    sizes: ['ONE SIZE'],
    stock: { 'ONE SIZE': 25 },
  },
  {
    name: 'Tara Woven Belt',
    category: 'accessories',
    price: 1150,
    mrp: 1450,
    shortDescription: 'A soft leather belt with a brushed brass buckle.',
    description:
      'Full-grain leather, hand-finished, with a brushed brass buckle and five adjustment holes. Softens and darkens with wear.',
    material: 'Full-grain leather, brass hardware',
    careInstructions: 'Wipe with a dry cloth. Condition occasionally.',
    images: [
      'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['belt', 'leather', 'accessory'],
    sizes: ['S', 'M', 'L'],
    stock: { S: 8, M: 12, L: 7 },
  },
  {
    name: 'Meher Embroidered Blouse',
    category: 'tops',
    price: 2190,
    mrp: 2790,
    shortDescription: 'Fine cotton with hand-embroidered detailing.',
    description:
      'A relaxed blouse in fine cotton with hand-embroidered detail at the yoke and cuffs. Each piece is finished by hand, so no two are identical.',
    material: '100% cotton, hand embroidery',
    careInstructions: 'Hand wash cold. Do not wring. Dry flat in shade.',
    images: [
      'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['blouse', 'embroidered', 'cotton'],
    stock: { XS: 3, S: 6, M: 8, L: 4, XL: 2 },
  },
  {
    name: 'Nila Cotton Lounge Set',
    category: 'co-ords',
    price: 2490,
    mrp: 3200,
    shortDescription: 'Soft cotton for slow mornings.',
    description:
      'A relaxed short-sleeve top with matching drawstring trousers in brushed cotton. Cut generously for genuine comfort rather than a decorative fit.',
    material: '100% brushed cotton',
    careInstructions: 'Machine wash warm. Tumble dry low.',
    images: [
      'https://images.unsplash.com/photo-1616627561950-9f746e330187?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['loungewear', 'co-ord', 'cotton'],
    stock: { XS: 6, S: 12, M: 14, L: 9, XL: 6 },
  },
  {
    name: 'Reva Quilted Jacket',
    category: 'outerwear',
    price: 4490,
    mrp: 5600,
    shortDescription: 'A lightly quilted jacket with a corduroy collar.',
    description:
      'Diamond-quilted cotton shell with a fine corduroy collar, snap fastening and deep side pockets. Lightly wadded — warm enough for a Mumbai winter or a hill-station evening.',
    material: 'Cotton shell, recycled polyester wadding',
    careInstructions: 'Machine wash cold on gentle. Do not tumble dry.',
    images: [
      'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['jacket', 'quilted', 'outerwear'],
    stock: { XS: 2, S: 5, M: 6, L: 4, XL: 2 },
  },
  {
    name: 'Priya Chikankari Kurta',
    category: 'ethnic',
    price: 2790,
    mrp: 3500,
    shortDescription: 'Lucknowi chikankari on soft cotton mul.',
    description:
      'A straight kurta in cotton mul with traditional Lucknowi chikankari embroidery worked by hand. Light enough for summer, detailed enough for an occasion.',
    material: '100% cotton mul, hand embroidery',
    careInstructions: 'Hand wash cold separately. Dry flat in shade. Iron on reverse.',
    images: [
      'https://images.unsplash.com/photo-1614251055880-ee96e4803393?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['ethnic', 'chikankari', 'kurta'],
    stock: { XS: 4, S: 8, M: 10, L: 6, XL: 3 },
    isNewArrival: true,
  },
  {
    name: 'Ela Linen Shorts',
    category: 'bottoms',
    price: 1590,
    mrp: 1990,
    shortDescription: 'Tailored linen shorts with a paperbag waist.',
    description:
      'Mid-length linen shorts with a paperbag waist, self-tie belt and side pockets. Sits at the natural waist.',
    material: '55% linen, 45% viscose',
    careInstructions: 'Machine wash cold. Line dry. Warm iron.',
    images: [
      'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&q=80&w=1000',
    ],
    tags: ['shorts', 'linen', 'summer'],
    // Deliberately zero stock in two sizes so the out-of-stock UI is exercised
    // by the demo data rather than only in theory.
    stock: { XS: 0, S: 6, M: 8, L: 0, XL: 3 },
  },
];

module.exports = { categories, products, APPAREL_SIZES, variants };
