import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, AlertTriangle, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks';
import OrderSummary from '../components/product/OrderSummary';
import { Button, EmptyState, Alert } from '../components/ui';
import { formatPrice, formatPriceExact, discountPercent } from '../utils/format';

export default function Cart() {
  const { items, updateQty, removeItem, hasStockIssue, pricing, pricingLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useDocumentMeta({ title: 'Your bag', noIndex: true });

  if (items.length === 0) {
    return (
      <div className="shell">
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Once you add something, it will appear here."
          action={<Button to="/shop" size="lg">Start shopping</Button>}
        />
      </div>
    );
  }

  const goToCheckout = () => {
    navigate(isAuthenticated ? '/checkout' : '/login?redirect=%2Fcheckout');
  };

  return (
    <div className="shell py-10 pb-28 sm:py-14 lg:pb-14">
      <h1 className="mb-7 text-display-2 sm:mb-9">Your bag</h1>

      {hasStockIssue && (
        <Alert tone="warning" title="Some items need attention" className="mb-6">
          One or more items exceed the stock we have left. Reduce the quantity to continue.
        </Alert>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
        <div>
          <ul className="divide-y divide-line border-y border-line">
            {items.map((item) => {
              const discount = discountPercent(item.mrp, item.price);
              const overStock =
                typeof item.availableStock === 'number' && item.qty > item.availableStock;
              const maxQty = Math.min(item.availableStock ?? 10, 10);

              return (
                <li key={`${item.product}-${item.variantId}`} className="flex gap-3.5 py-5 sm:gap-5">
                  <Link
                    to={`/product/${item.slug}`}
                    aria-label={item.name}
                    className="aspect-[3/4] w-[4.5rem] shrink-0 overflow-hidden bg-paper-sunken sm:w-28"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xs text-ink-faint">
                        No image
                      </div>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-sm leading-snug">
                          <Link to={`/product/${item.slug}`} className="hover:text-clay-deep">
                            {item.name}
                          </Link>
                        </h2>
                        <p className="mt-1 text-xs text-ink-muted">Size {item.size}</p>
                        {item.sku && (
                          <p className="mt-0.5 text-2xs text-ink-faint">SKU {item.sku}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.product, item.variantId)}
                        aria-label={`Remove ${item.name} size ${item.size} from bag`}
                        className="icon-btn-sm -mr-2 -mt-2 shrink-0 text-ink-faint hover:text-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {overStock && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                        <AlertTriangle size={12} aria-hidden="true" />
                        Only {item.availableStock} left
                      </p>
                    )}

                    <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2.5 pt-4">
                      <div className="flex h-10 items-center rounded-control border border-line">
                        <button
                          type="button"
                          onClick={() => updateQty(item.product, item.variantId, item.qty - 1)}
                          disabled={item.qty <= 1}
                          aria-label="Decrease quantity"
                          className="flex h-full w-9 items-center justify-center text-ink-soft
                                     hover:text-ink disabled:opacity-30"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.product, item.variantId, item.qty + 1)}
                          disabled={item.qty >= maxQty}
                          aria-label="Increase quantity"
                          className="flex h-full w-9 items-center justify-center text-ink-soft
                                     hover:text-ink disabled:opacity-30"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatPriceExact(item.price * item.qty)}
                        </p>
                        {discount > 0 && (
                          <p className="text-xs text-ink-faint line-through">
                            {formatPrice(item.mrp * item.qty)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link
            to="/shop"
            className="mt-6 inline-flex items-center gap-2 text-xs font-medium uppercase
                       tracking-wider2 text-ink-muted transition-colors hover:text-ink"
          >
            Continue shopping
          </Link>
        </div>

        <div>
          <OrderSummary>
            <Button
              size="lg"
              fullWidth
              onClick={goToCheckout}
              disabled={hasStockIssue || pricingLoading || !pricing}
            >
              Checkout <ArrowRight size={15} aria-hidden="true" />
            </Button>
            {!isAuthenticated && (
              <p className="mt-3 text-center text-xs text-ink-muted">
                You will be asked to sign in first.
              </p>
            )}
          </OrderSummary>
        </div>
      </div>

      {/* Below `lg` the order summary is a full screen away from the top of the
          bag, so the total and the primary action stay pinned. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper-raised/95
                   px-5 py-3 pb-safe backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex max-w-site items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-2xs uppercase tracking-wider2 text-ink-muted">Total</p>
            <p className="truncate text-base font-medium leading-tight">
              {pricing ? formatPriceExact(pricing.grandTotal) : '—'}
            </p>
          </div>
          <Button
            onClick={goToCheckout}
            disabled={hasStockIssue || pricingLoading || !pricing}
            className="shrink-0"
          >
            Checkout <ArrowRight size={15} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
