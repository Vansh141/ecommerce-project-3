import { useState } from 'react';
import { Tag, X, Loader2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPriceExact } from '../../utils/format';
import { Button, Alert } from '../ui';

/**
 * Order summary.
 *
 * Every figure comes from `pricing`, which the server returns from the same
 * code path that creates the order. The component has no arithmetic of its own,
 * which is what guarantees the bag total and the charged total agree.
 */
export default function OrderSummary({ showCoupon = true, children, sticky = true }) {
  const { pricing, pricingLoading, pricingError, coupon, applyCoupon, removeCoupon, items } = useCart();
  const [code, setCode] = useState('');

  const submitCoupon = (e) => {
    e.preventDefault();
    if (code.trim()) applyCoupon(code);
  };

  const Row = ({ label, value, tone = 'muted', strong = false }) => (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={strong ? 'font-medium text-ink' : 'text-ink-muted'}>{label}</span>
      <span
        className={
          tone === 'success'
            ? 'font-medium text-success'
            : strong
              ? 'font-medium text-ink'
              : 'text-ink'
        }
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className={sticky ? 'lg:sticky lg:top-24' : ''}>
      <div className="card-pad">
        <h2 className="mb-5 text-base">Order summary</h2>

        {pricingLoading && !pricing ? (
          <div className="flex items-center gap-2 py-6 text-sm text-ink-muted">
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            Calculating…
          </div>
        ) : !pricing ? (
          <p className="py-4 text-sm text-ink-muted">Add something to your bag to see totals.</p>
        ) : (
          <div className="space-y-3" aria-live="polite" aria-busy={pricingLoading}>
            <Row
              label={`Subtotal (${items.reduce((s, i) => s + i.qty, 0)} items)`}
              value={formatPriceExact(pricing.itemsTotal)}
            />

            {pricing.discountTotal > 0 && (
              <Row
                label={coupon ? `Discount · ${coupon.code}` : 'Discount'}
                value={`− ${formatPriceExact(pricing.discountTotal)}`}
                tone="success"
              />
            )}

            <Row
              label="Shipping"
              value={pricing.shippingTotal === 0 ? 'Free' : formatPriceExact(pricing.shippingTotal)}
              tone={pricing.shippingTotal === 0 ? 'success' : 'muted'}
            />

            {/* Indian apparel pricing is tax-inclusive, so this is shown as a
                component of the total — never added on top of it. */}
            <Row
              label={pricing.taxInclusive ? 'GST (included)' : 'GST'}
              value={formatPriceExact(pricing.taxTotal)}
            />

            {pricing.amountToFreeShipping > 0 && (
              <p className="rounded-control bg-clay-faint px-3 py-2.5 text-xs leading-relaxed text-clay-deep">
                Add {formatPriceExact(pricing.amountToFreeShipping)} more for free shipping.
              </p>
            )}

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4">
              <span className="text-base">Total</span>
              <span className="text-lg font-medium">{formatPriceExact(pricing.grandTotal)}</span>
            </div>
          </div>
        )}

        {showCoupon && items.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            {coupon ? (
              <div className="flex items-center justify-between gap-3 rounded-control bg-success-faint px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm text-success">
                  <Tag size={14} aria-hidden="true" />
                  <span className="font-medium">{coupon.code}</span> applied
                </span>
                <button
                  type="button"
                  onClick={() => { removeCoupon(); setCode(''); }}
                  aria-label="Remove coupon"
                  className="p-1 text-success/70 hover:text-success"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <form onSubmit={submitCoupon}>
                <label htmlFor="coupon" className="field-label">Discount code</label>
                <div className="flex gap-2">
                  <input
                    id="coupon"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="field flex-1 uppercase"
                    maxLength={32}
                  />
                  <Button type="submit" variant="secondary" disabled={!code.trim()}>Apply</Button>
                </div>
              </form>
            )}

            {pricingError && (
              <Alert tone="error" className="mt-3">{pricingError}</Alert>
            )}
          </div>
        )}

        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
