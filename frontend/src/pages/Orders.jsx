import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Package, ChevronRight, ArrowLeft, MapPin, CreditCard, XCircle, CheckCircle2,
} from 'lucide-react';
import { orderApi } from '../api/endpoints';
import { useFetch, useDocumentMeta } from '../hooks';
import { useToast } from '../context/ToastContext';
import {
  Button, EmptyState, Skeleton, Alert, Pagination, ConfirmDialog, Breadcrumbs,
} from '../components/ui';
import {
  formatPriceExact, formatDate, formatDateTime,
  ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE,
} from '../utils/format';

/* ═════════════════════════ Order history ═════════════════════════════════ */

export function OrderHistory() {
  const [page, setPage] = useState(1);
  useDocumentMeta({ title: 'Your orders', noIndex: true });

  const { data, meta, loading, error } = useFetch(() => orderApi.mine({ page, limit: 10 }), [page]);
  const orders = data?.orders || [];

  return (
    <div className="shell py-10 sm:py-14">
      <h1 className="mb-9 text-3xl sm:text-4xl">Your orders</h1>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="Once you place an order it will appear here with its status."
          action={<Button to="/shop" size="lg">Start shopping</Button>}
        />
      ) : (
        <>
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order._id}>
                <Link
                  to={`/orders/${order._id}`}
                  className="group block rounded-card border border-line bg-paper-raised p-5
                             transition-colors hover:border-line-strong sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-ink-muted">{order.orderNumber}</p>
                      <p className="mt-1 text-xs text-ink-faint">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={ORDER_STATUS_TONE[order.status]}>
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                      <span className={PAYMENT_STATUS_TONE[order.payment?.status]}>
                        {order.payment?.method === 'COD' && order.payment?.status === 'pending'
                          ? 'Cash on delivery'
                          : PAYMENT_STATUS_LABEL[order.payment?.status]}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 4).map((item, i) => (
                        <div
                           
                          key={i}
                          className="h-14 w-11 overflow-hidden border border-paper-raised bg-paper-sunken"
                        >
                          {item.image && (
                            <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                          )}
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <div className="flex h-14 w-11 items-center justify-center border border-paper-raised
                                        bg-paper-sunken text-2xs text-ink-muted">
                          +{order.items.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-2xs uppercase tracking-wider2 text-ink-faint">Total</p>
                        <p className="text-sm font-medium">{formatPriceExact(order.pricing.grandTotal)}</p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-ink-faint transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {meta?.totalPages > 1 && (
            <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} className="mt-10" />
          )}
        </>
      )}
    </div>
  );
}

/* ═════════════════════════ Order detail ══════════════════════════════════ */

const TIMELINE = ['confirmed', 'packed', 'shipped', 'delivered'];

export function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data, loading, error, refetch } = useFetch(() => orderApi.get(id), [id]);
  const order = data?.order;

  useDocumentMeta({ title: order ? `Order ${order.orderNumber}` : 'Order', noIndex: true });

  const cancel = async () => {
    setCancelling(true);
    try {
      await orderApi.cancel(id, 'Cancelled by customer');
      toast.success('Your order has been cancelled.');
      setCancelOpen(false);
      refetch();
    } catch (err) {
      toast.error(err.friendlyMessage);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="shell py-10">
        <Skeleton className="mb-6 h-8 w-56" />
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="shell">
        <EmptyState
          icon={Package}
          title="Order not found"
          description="We could not find this order on your account."
          action={<Button to="/orders">Back to orders</Button>}
        />
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const isRefunded = order.status === 'refunded';
  const currentStep = TIMELINE.indexOf(order.status);
  const canCancel = ['pending', 'confirmed'].includes(order.status);

  return (
    <div className="shell py-10 sm:py-14">
      <Breadcrumbs items={[{ label: 'Orders', to: '/orders' }, { label: order.orderNumber }]} />

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl">Order {order.orderNumber}</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</span>
          <span className={PAYMENT_STATUS_TONE[order.payment?.status]}>
            {PAYMENT_STATUS_LABEL[order.payment?.status]}
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:gap-12">
        <div className="space-y-6">
          {/* ── Timeline ── */}
          {!isCancelled && !isRefunded && (
            <div className="card-pad">
              <h2 className="mb-6 text-sm font-medium">Progress</h2>
              <ol className="relative flex justify-between">
                <span className="absolute left-0 right-0 top-3 h-px bg-line" aria-hidden="true" />
                <span
                  className="absolute left-0 top-3 h-px bg-ink transition-all duration-500"
                  style={{ width: `${Math.max(0, (currentStep / (TIMELINE.length - 1)) * 100)}%` }}
                  aria-hidden="true"
                />
                {TIMELINE.map((s, i) => {
                  const reached = i <= currentStep;
                  return (
                    <li key={s} className="relative z-10 flex flex-col items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          reached ? 'border-ink bg-ink text-paper' : 'border-line bg-paper-raised'
                        }`}
                      >
                        {reached && <CheckCircle2 size={12} aria-hidden="true" />}
                      </span>
                      <span className={`text-2xs uppercase tracking-wider2 ${
                        reached ? 'text-ink' : 'text-ink-faint'
                      }`}>
                        {ORDER_STATUS_LABEL[s]}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {order.trackingNumber && (
                <p className="mt-6 border-t border-line pt-4 text-sm text-ink-muted">
                  Tracking reference: <span className="font-medium text-ink">{order.trackingNumber}</span>
                </p>
              )}
            </div>
          )}

          {isCancelled && (
            <Alert tone="warning" title="This order was cancelled">
              {order.cancellation?.reason}
              {order.cancellation?.at && ` · ${formatDateTime(order.cancellation.at)}`}
              {order.refund?.status === 'pending' &&
                ' A refund has been initiated and will reach your account within 5–7 business days.'}
            </Alert>
          )}

          {isRefunded && (
            <Alert tone="info" title="This order was refunded">
              {formatPriceExact(order.refund?.amount || order.pricing.grandTotal)} was refunded
              {order.refund?.at && ` on ${formatDate(order.refund.at)}`}.
            </Alert>
          )}

          {/* ── Items ── */}
          <div className="card">
            <h2 className="border-b border-line px-5 py-4 text-sm font-medium sm:px-6">
              Items ({order.items.reduce((s, i) => s + i.qty, 0)})
            </h2>
            <ul className="divide-y divide-line">
              {order.items.map((item, i) => (
                 
                <li key={i} className="flex gap-4 p-5 sm:p-6">
                  <div className="aspect-[3/4] w-16 shrink-0 overflow-hidden bg-paper-sunken sm:w-20">
                    {item.image && (
                      <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">
                        {item.slug ? (
                          <Link to={`/product/${item.slug}`} className="hover:text-clay-deep">{item.name}</Link>
                        ) : item.name}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">Size {item.size} · Qty {item.qty}</p>
                      <p className="mt-0.5 text-2xs text-ink-faint">SKU {item.sku}</p>
                    </div>
                    <p className="text-sm font-medium">{formatPriceExact(item.lineTotal)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Address & payment ── */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="card-pad">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <MapPin size={15} className="text-clay" aria-hidden="true" /> Delivery address
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                <span className="font-medium text-ink">{order.shippingAddress.fullName}</span><br />
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
                {order.shippingAddress.phone}
              </p>
            </div>

            <div className="card-pad">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <CreditCard size={15} className="text-clay" aria-hidden="true" /> Payment
              </h2>
              <p className="text-sm text-ink-muted">
                {order.payment.method === 'COD' ? 'Cash on delivery' : 'Paid online (Razorpay)'}
              </p>
              {order.payment.paidAt && (
                <p className="mt-1 text-xs text-ink-faint">Paid {formatDateTime(order.payment.paidAt)}</p>
              )}
              {order.payment.razorpayPaymentId && (
                <p className="mt-1 font-mono text-2xs text-ink-faint">{order.payment.razorpayPaymentId}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Summary ── */}
        <div>
          <div className="card-pad lg:sticky lg:top-24">
            <h2 className="mb-5 text-sm font-medium">Summary</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd>{formatPriceExact(order.pricing.itemsTotal)}</dd>
              </div>
              {order.pricing.discountTotal > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">
                    Discount{order.coupon?.code ? ` · ${order.coupon.code}` : ''}
                  </dt>
                  <dd className="text-success">− {formatPriceExact(order.pricing.discountTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Shipping</dt>
                <dd>{order.pricing.shippingTotal === 0 ? 'Free' : formatPriceExact(order.pricing.shippingTotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">
                  GST{order.pricing.taxInclusive ? ' (included)' : ''}
                </dt>
                <dd>{formatPriceExact(order.pricing.taxTotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="text-base font-medium">{formatPriceExact(order.pricing.grandTotal)}</dd>
              </div>
            </dl>

            {canCancel && (
              <Button
                variant="ghost"
                fullWidth
                className="mt-6"
                onClick={() => setCancelOpen(true)}
              >
                <XCircle size={14} aria-hidden="true" /> Cancel order
              </Button>
            )}

            <Button to="/orders" variant="quiet" fullWidth className="mt-2">
              <ArrowLeft size={14} aria-hidden="true" /> All orders
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancel}
        loading={cancelling}
        title="Cancel this order?"
        message="This cannot be undone. Any items will be returned to stock, and if you have already paid, a refund will be initiated."
        confirmLabel="Yes, cancel order"
        cancelLabel="Keep order"
      />
    </div>
  );
}

/* ═════════════════════════ Confirmation ══════════════════════════════════ */

export function OrderConfirmed() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading } = useFetch(() => orderApi.get(id), [id]);
  const order = data?.order;

  useDocumentMeta({ title: 'Order confirmed', noIndex: true });

  return (
    <div className="shell py-16 sm:py-24">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-success-faint">
          <CheckCircle2 size={30} className="text-success" aria-hidden="true" />
        </div>

        <h1 className="text-3xl sm:text-4xl">Thank you</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          {loading
            ? 'Confirming your order…'
            : order
              ? order.payment.method === 'COD'
                ? 'Your order is confirmed. Please keep the exact amount ready for the delivery partner.'
                : 'Your payment was received and your order is confirmed.'
              : 'Your order has been placed.'}
        </p>

        {order && (
          <div className="mt-8 rounded-card border border-line bg-paper-raised p-6 text-left">
            <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
              <span className="text-xs uppercase tracking-wider2 text-ink-faint">Order number</span>
              <span className="select-all font-mono text-sm">{order.orderNumber}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-4">
              <span className="text-xs uppercase tracking-wider2 text-ink-faint">Total</span>
              <span className="text-base font-medium">{formatPriceExact(order.pricing.grandTotal)}</span>
            </div>
          </div>
        )}

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => navigate(`/orders/${id}`)} size="lg">View order</Button>
          <Button to="/shop" variant="secondary" size="lg">Continue shopping</Button>
        </div>
      </div>
    </div>
  );
}
