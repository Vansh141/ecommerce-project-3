import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Heart, Minus, Plus, Truck, RotateCcw, ShieldCheck, Star, ChevronDown, PackageX,
} from 'lucide-react';
import { productApi, reviewApi } from '../api/endpoints';
import { useFetch, useDocumentMeta } from '../hooks';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ProductGrid } from '../components/product/ProductCard';
import {
  Button, Breadcrumbs, Skeleton, Alert, EmptyState, SectionHeading, Textarea, Modal,
} from '../components/ui';
import { formatPrice, discountPercent, sortSizes, formatDate } from '../utils/format';

function Stars({ value = 0, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? 'fill-clay text-clay' : 'text-line-strong'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function Gallery({ images = [], name }) {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [name]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-paper-sunken text-sm text-ink-faint">
        No image available
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <div
          className="no-scrollbar flex gap-3 overflow-x-auto sm:w-20 sm:flex-col sm:overflow-visible"
          role="tablist"
          aria-label="Product images"
        >
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`View image ${i + 1}`}
              onClick={() => setActive(i)}
              className={`aspect-[3/4] w-16 shrink-0 overflow-hidden border transition-colors sm:w-full ${
                i === active ? 'border-ink' : 'border-line hover:border-line-strong'
              }`}
            >
              <img
                src={img.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden bg-paper-sunken">
        <img
          src={images[active].url}
          alt={images[active].alt || name}
          loading="eager"
          decoding="async"
          className="aspect-[4/5] w-full object-cover"
        />
      </div>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-xs font-medium uppercase tracking-wider2 text-ink">{title}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-ink-faint transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="animate-fade-in pb-5 text-sm leading-relaxed text-ink-muted">{children}</div>
      )}
    </div>
  );
}

function ReviewSection({ product }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [writeOpen, setWriteOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, refetch } = useFetch(
    () => reviewApi.forProduct(product._id, { limit: 5 }),
    [product._id]
  );

  const { data: eligibility, refetch: refetchEligibility } = useFetch(
    () => reviewApi.eligibility(product._id),
    [product._id, isAuthenticated],
    { skip: !isAuthenticated }
  );

  const reviews = data?.reviews || [];

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await reviewApi.create(product._id, { rating, comment });
      toast.success('Thank you — your review has been published.');
      setWriteOpen(false);
      setComment('');
      refetch();
      refetchEligibility();
    } catch (err) {
      toast.error(err.friendlyMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="border-t border-line py-16">
      <div className="shell">
        <SectionHeading
          eyebrow="Feedback"
          title={product.ratingCount > 0 ? `Reviews (${product.ratingCount})` : 'Reviews'}
          action={
            eligibility?.eligible && (
              <Button variant="secondary" size="sm" onClick={() => setWriteOpen(true)}>
                Write a review
              </Button>
            )
          }
        />

        {product.ratingCount > 0 && (
          <div className="mb-8 flex items-center gap-4">
            <span className="font-display text-4xl">{product.ratingAverage.toFixed(1)}</span>
            <div>
              <Stars value={product.ratingAverage} size={16} />
              <p className="mt-1 text-xs text-ink-muted">
                Based on {product.ratingCount} verified {product.ratingCount === 1 ? 'purchase' : 'purchases'}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No reviews yet.
            {' '}
            {eligibility?.reason === 'NOT_PURCHASED'
              ? 'Only customers who have received this item can review it.'
              : 'Be the first to share your thoughts once you have received your order.'}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {reviews.map((r) => (
              <li key={r._id} className="py-5">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <Stars value={r.rating} />
                  <span className="text-sm font-medium text-ink">{r.userName}</span>
                  {r.isVerifiedPurchase && (
                    <span className="badge-success">Verified purchase</span>
                  )}
                  <span className="text-xs text-ink-faint">{formatDate(r.createdAt)}</span>
                </div>
                {r.title && <p className="mb-1 text-sm font-medium text-ink">{r.title}</p>}
                <p className="text-sm leading-relaxed text-ink-muted">{r.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={writeOpen}
        onClose={() => setWriteOpen(false)}
        title="Write a review"
        description={product.name}
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setWriteOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={submit} loading={submitting} disabled={comment.trim().length < 10}>
              Publish
            </Button>
          </div>
        }
      >
        <form onSubmit={submit} className="space-y-5">
          <div>
            <span className="field-label">Your rating</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  aria-label={`${i} star${i > 1 ? 's' : ''}`}
                  aria-pressed={rating === i}
                  className="p-1"
                >
                  <Star
                    size={24}
                    className={i <= rating ? 'fill-clay text-clay' : 'text-line-strong'}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Your review"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How does it fit? How does the fabric feel?"
            required
            minLength={10}
            maxLength={2000}
            hint={`${comment.length}/2000 — at least 10 characters`}
          />
        </form>
      </Modal>
    </section>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();
  const toast = useToast();

  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  const { data, loading, error } = useFetch(() => productApi.get(slug), [slug]);
  const { data: relatedData } = useFetch(() => productApi.related(slug), [slug]);

  const product = data?.product;

  // Reset selection whenever the product changes.
  useEffect(() => {
    setSelectedVariantId(null);
    setQty(1);
    setSizeError(false);
  }, [slug]);

  const variants = useMemo(() => {
    if (!product?.variants) return [];
    const order = sortSizes(product.variants.map((v) => v.size));
    return [...product.variants]
      .filter((v) => v.isActive !== false)
      .sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size));
  }, [product]);

  const selectedVariant = variants.find((v) => v._id === selectedVariantId) || null;
  const requiresSize = variants.length > 1 || variants[0]?.size !== 'ONE SIZE';

  // A single one-size product needs no selector — auto-select it.
  useEffect(() => {
    if (variants.length === 1 && !requiresSize) setSelectedVariantId(variants[0]._id);
  }, [variants, requiresSize]);

  useDocumentMeta({
    title: product?.name,
    description: product?.metaDescription || product?.shortDescription || product?.description?.slice(0, 160),
    image: product?.images?.[0]?.url,
  });

  if (loading) {
    return (
      <div className="shell py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-[4/5] w-full" />
          <div className="space-y-4 pt-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="shell">
        <EmptyState
          icon={PackageX}
          title="Product not found"
          description="This piece may have sold out or been removed from the collection."
          action={<Button to="/shop">Browse the collection</Button>}
        />
      </div>
    );
  }

  const discount = discountPercent(product.mrp, product.price);
  const outOfStock = product.totalStock <= 0;
  const maxQty = Math.min(selectedVariant?.stock ?? 10, 10);
  const lowStock = selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 5;

  const handleAdd = () => {
    // The gate that the old build was missing: no size, no purchase.
    if (requiresSize && !selectedVariant) {
      setSizeError(true);
      document.getElementById('size-selector')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (!selectedVariant || selectedVariant.stock < qty) {
      toast.error('That size is not available in the quantity requested.');
      return;
    }

    addItem(product, selectedVariant, qty);
    toast.success(`${product.name} (${selectedVariant.size}) added to your bag.`);
  };

  return (
    <>
      <div className="shell py-8 sm:py-10">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Shop', to: '/shop' },
            ...(product.category
              ? [{ label: product.category.name, to: `/shop?category=${product.category.slug}` }]
              : []),
            { label: product.name },
          ]}
        />

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Gallery images={product.images} name={product.name} />

          <div className="lg:pt-4">
            {product.brand && <p className="eyebrow mb-3">{product.brand}</p>}

            <h1 className="text-3xl leading-tight sm:text-4xl">{product.name}</h1>

            {product.ratingCount > 0 && (
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
                <Stars value={product.ratingAverage} />
                <span>({product.ratingCount})</span>
              </a>
            )}

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-medium">{formatPrice(product.price)}</span>
              {discount > 0 && (
                <>
                  <span className="text-base text-ink-faint line-through">{formatPrice(product.mrp)}</span>
                  <span className="badge-sale">−{discount}%</span>
                </>
              )}
            </div>
            <p className="mt-1.5 text-xs text-ink-faint">Inclusive of all taxes</p>

            {product.shortDescription && (
              <p className="mt-6 text-sm leading-relaxed text-ink-muted">{product.shortDescription}</p>
            )}

            {/* ── Size ── */}
            <div id="size-selector" className="mt-8">
              {requiresSize && (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider2 text-ink">
                      Size {selectedVariant && <span className="text-ink-muted">· {selectedVariant.size}</span>}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Select a size">
                    {variants.map((v) => {
                      const soldOut = v.stock <= 0;
                      const selected = v._id === selectedVariantId;
                      return (
                        <button
                          key={v._id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={soldOut}
                          onClick={() => {
                            setSelectedVariantId(v._id);
                            setSizeError(false);
                            setQty(1);
                          }}
                          className={`h-12 min-w-[3.25rem] rounded-control border px-4 text-sm font-medium
                                      transition-all disabled:cursor-not-allowed disabled:border-line
                                      disabled:bg-paper-sunken disabled:text-ink-faint disabled:line-through ${
                                        selected
                                          ? 'border-ink bg-ink text-paper'
                                          : 'border-line-strong text-ink hover:border-ink'
                                      }`}
                        >
                          {v.size}
                        </button>
                      );
                    })}
                  </div>

                  {sizeError && (
                    <p role="alert" className="field-msg-error">Please select a size to continue.</p>
                  )}
                  {lowStock && (
                    <p className="mt-2.5 text-xs text-warning">
                      Only {selectedVariant.stock} left in {selectedVariant.size}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* ── Quantity + add ── */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <div className="flex h-[3.25rem] items-center rounded-control border border-line-strong">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1 || outOfStock}
                  aria-label="Decrease quantity"
                  className="flex h-full w-12 items-center justify-center text-ink-soft
                             transition-colors hover:text-ink disabled:opacity-30"
                >
                  <Minus size={15} />
                </button>
                <span className="w-10 text-center text-sm font-medium" aria-live="polite">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty || outOfStock || !selectedVariant}
                  aria-label="Increase quantity"
                  className="flex h-full w-12 items-center justify-center text-ink-soft
                             transition-colors hover:text-ink disabled:opacity-30"
                >
                  <Plus size={15} />
                </button>
              </div>

              <Button
                size="lg"
                fullWidth
                onClick={handleAdd}
                disabled={outOfStock}
                className="flex-1"
              >
                {outOfStock ? 'Sold out' : 'Add to bag'}
              </Button>

              <Button
                variant="ghost"
                size="lg"
                onClick={() => toggle(product)}
                aria-label={has(product._id) ? 'Remove from wishlist' : 'Save to wishlist'}
                aria-pressed={has(product._id)}
                className="sm:w-[3.25rem] sm:px-0"
              >
                <Heart
                  size={17}
                  className={has(product._id) ? 'fill-danger text-danger' : ''}
                  aria-hidden="true"
                />
                <span className="sm:hidden">Save</span>
              </Button>
            </div>

            {outOfStock && (
              <Alert tone="warning" className="mt-4">
                This piece is currently sold out. Save it to your wishlist and we will
                keep it on your list.
              </Alert>
            )}

            {/* ── Service facts. These reflect real configuration, not promises
                 the business has not made. ── */}
            <ul className="mt-8 space-y-2.5 border-t border-line pt-6">
              {[
                { icon: Truck, text: 'Free shipping on orders over ₹1,499' },
                { icon: RotateCcw, text: '7-day returns on unworn items' },
                { icon: ShieldCheck, text: 'Secure payment · Cash on delivery available' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm text-ink-muted">
                  <Icon size={15} className="shrink-0 text-clay" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>

            {/* ── Details ── */}
            <div className="mt-8">
              <Accordion title="Description" defaultOpen>
                <p className="whitespace-pre-line">{product.description}</p>
              </Accordion>

              {(product.material || product.careInstructions || product.countryOfOrigin) && (
                <Accordion title="Fabric & care">
                  <dl className="space-y-3">
                    {product.material && (
                      <div>
                        <dt className="text-xs uppercase tracking-wider2 text-ink-faint">Material</dt>
                        <dd className="mt-0.5">{product.material}</dd>
                      </div>
                    )}
                    {product.careInstructions && (
                      <div>
                        <dt className="text-xs uppercase tracking-wider2 text-ink-faint">Care</dt>
                        <dd className="mt-0.5">{product.careInstructions}</dd>
                      </div>
                    )}
                    {product.countryOfOrigin && (
                      <div>
                        <dt className="text-xs uppercase tracking-wider2 text-ink-faint">Origin</dt>
                        <dd className="mt-0.5">{product.countryOfOrigin}</dd>
                      </div>
                    )}
                  </dl>
                </Accordion>
              )}

              <Accordion title="Shipping & returns">
                <p>
                  Orders are dispatched from Mumbai. Shipping is free on orders over ₹1,499;
                  below that a flat ₹79 applies. Unworn items in original condition can be
                  returned within 7 days of delivery.
                </p>
                <Link to="/shipping-returns" className="link mt-3 inline-block text-sm">
                  Read the full policy
                </Link>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      <div id="reviews">
        <ReviewSection product={product} />
      </div>

      {relatedData?.products?.length > 0 && (
        <section className="border-t border-line py-16">
          <div className="shell">
            <SectionHeading eyebrow="You may also like" title="Complete the look" />
            <ProductGrid products={relatedData.products.slice(0, 4)} />
          </div>
        </section>
      )}
    </>
  );
}
