import { useState } from 'react';
import { Search, ChevronRight, Truck, IndianRupee } from 'lucide-react';
import { orderApi, paymentApi } from '../../api/endpoints';
import { useFetch, useDebounced, useDocumentMeta } from '../../hooks';
import { useToast } from '../../context/ToastContext';
import {
  Button, Input, Select, Modal, Skeleton, EmptyState, Pagination, Alert, ConfirmDialog,
} from '../../components/ui';
import {
  formatPriceExact, formatDate, formatDateTime,
  ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE,
} from '../../utils/format';

/** Mirrors the server's allowed transitions — the API rejects anything else. */
const NEXT_STATUS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
};

function OrderDrawer({ order, onClose, onChanged }) {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [tracking, setTracking] = useState(order?.trackingNumber || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  if (!order) return null;

  const options = NEXT_STATUS[order.status] || [];

  const updateStatus = async () => {
    if (!status) return;
    setBusy(true);
    try {
      await orderApi.updateStatus(order._id, {
        status,
        note,
        ...(status === 'shipped' ? { trackingNumber: tracking } : {}),
      });
      toast.success(`Order marked as ${ORDER_STATUS_LABEL[status].toLowerCase()}.`);
      setStatus('');
      setNote('');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(err.friendlyMessage);
    } finally {
      setBusy(false);
    }
  };

  const markCodPaid = async () => {
    setBusy(true);
    try {
      await paymentApi.markCodPaid(order._id);
      toast.success('Payment recorded.');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(err.friendlyMessage);
    } finally {
      setBusy(false);
    }
  };

  const refund = async () => {
    setBusy(true);
    try {
      await orderApi.refund(order._id, { reason: 'Refunded by store' });
      toast.success('Refund recorded.');
      setRefundOpen(false);
      onChanged();
      onClose();
    } catch (err) {
      toast.error(err.friendlyMessage);
    } finally {
      setBusy(false);
    }
  };

  const canMarkCodPaid =
    order.payment.method === 'COD' && order.payment.status === 'pending' && order.status !== 'cancelled';
  const canRefund = order.payment.status === 'paid' && order.status !== 'refunded';

  return (
    <Modal open onClose={onClose} title={`Order ${order.orderNumber}`} size="lg">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</span>
          <span className={PAYMENT_STATUS_TONE[order.payment.status]}>
            {PAYMENT_STATUS_LABEL[order.payment.status]}
          </span>
          <span className="badge-neutral">
            {order.payment.method === 'COD' ? 'Cash on delivery' : 'Razorpay'}
          </span>
          <span className="ml-auto text-xs text-ink-muted">{formatDateTime(order.createdAt)}</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="field-label">Customer</h3>
            <p className="text-sm">{order.user?.name}</p>
            <p className="text-xs text-ink-muted">{order.user?.email}</p>
          </div>
          <div>
            <h3 className="field-label">Ship to</h3>
            <p className="text-sm leading-relaxed text-ink-muted">
              <span className="text-ink">{order.shippingAddress.fullName}</span><br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
              {order.shippingAddress.phone}
            </p>
          </div>
        </div>

        <div>
          <h3 className="field-label">Items</h3>
          <ul className="divide-y divide-line rounded-card border border-line">
            {order.items.map((item, i) => (
               
              <li key={i} className="flex items-center gap-3 p-3">
                <div className="h-14 w-10 shrink-0 overflow-hidden bg-paper-sunken">
                  {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.name}</p>
                  <p className="text-xs text-ink-muted">
                    {item.size} · Qty {item.qty} · <span className="font-mono">{item.sku}</span>
                  </p>
                </div>
                <p className="text-sm font-medium">{formatPriceExact(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </div>

        <dl className="space-y-2 rounded-card bg-paper-sunken p-4 text-sm">
          <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd>{formatPriceExact(order.pricing.itemsTotal)}</dd></div>
          {order.pricing.discountTotal > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Discount {order.coupon?.code && `(${order.coupon.code})`}</dt>
              <dd className="text-success">− {formatPriceExact(order.pricing.discountTotal)}</dd>
            </div>
          )}
          <div className="flex justify-between"><dt className="text-ink-muted">Shipping</dt><dd>{formatPriceExact(order.pricing.shippingTotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-muted">GST {order.pricing.taxInclusive && '(incl.)'}</dt><dd>{formatPriceExact(order.pricing.taxTotal)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Total</dt><dd>{formatPriceExact(order.pricing.grandTotal)}</dd></div>
        </dl>

        {order.statusHistory?.length > 0 && (
          <div>
            <h3 className="field-label">History</h3>
            <ol className="space-y-2">
              {order.statusHistory.map((h, i) => (
                 
                <li key={i} className="flex gap-3 text-xs">
                  <span className="w-32 shrink-0 text-ink-faint">{formatDateTime(h.at)}</span>
                  <span className="font-medium">{ORDER_STATUS_LABEL[h.status]}</span>
                  {h.note && <span className="text-ink-muted">— {h.note}</span>}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="space-y-3 border-t border-line pt-5">
          {options.length > 0 ? (
            <>
              <Select label="Update status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Choose…</option>
                {options.map((s) => (
                  <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
                ))}
              </Select>

              {status === 'shipped' && (
                <Input
                  label="Tracking reference" value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="Courier tracking number"
                />
              )}

              {status && (
                <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              )}

              <Button fullWidth disabled={!status} loading={busy} onClick={updateStatus}>
                <Truck size={14} aria-hidden="true" /> Update order
              </Button>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              This order is {ORDER_STATUS_LABEL[order.status].toLowerCase()} — no further changes are possible.
            </p>
          )}

          <div className="flex gap-3">
            {canMarkCodPaid && (
              <Button variant="ghost" fullWidth loading={busy} onClick={markCodPaid}>
                <IndianRupee size={14} aria-hidden="true" /> Mark cash received
              </Button>
            )}
            {canRefund && (
              <Button variant="ghost" fullWidth onClick={() => setRefundOpen(true)}>Issue refund</Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        onConfirm={refund}
        loading={busy}
        title="Refund this order?"
        message={`${formatPriceExact(order.pricing.grandTotal)} will be refunded and the stock returned. For online payments this is sent to Razorpay.`}
        confirmLabel="Refund"
      />
    </Modal>
  );
}

export default function AdminOrders() {
  useDocumentMeta({ title: 'Orders', noIndex: true });

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const debouncedSearch = useDebounced(search, 400);

  const { data, meta, loading, error, refetch } = useFetch(
    () => orderApi.listAll({ page, limit: 20, status, paymentStatus, search: debouncedSearch }),
    [page, status, paymentStatus, debouncedSearch]
  );

  const orders = data?.orders || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-3">Orders</h1>
        <p className="mt-1 text-sm text-ink-muted">{meta?.total ?? 0} orders</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search order number"
            aria-label="Search orders"
            className="field py-2.5 pl-9 text-sm uppercase"
          />
        </div>

        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>

        <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} aria-label="Filter by payment">
          <option value="">All payments</option>
          {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : orders.length === 0 ? (
        <EmptyState title="No orders found" description="Orders will appear here as customers place them." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-sunken text-left">
                  {['Order', 'Customer', 'Date', 'Total', 'Payment', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-2xs font-medium uppercase tracking-wider2 text-ink-faint">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o._id} className="transition-colors hover:bg-paper-sunken/50">
                    <td className="px-4 py-3 font-mono text-xs">{o.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p className="truncate">{o.user?.name || 'Unknown'}</p>
                      <p className="truncate text-xs text-ink-faint">{o.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">{formatPriceExact(o.pricing.grandTotal)}</td>
                    <td className="px-4 py-3">
                      <span className={PAYMENT_STATUS_TONE[o.payment.status]}>
                        {PAYMENT_STATUS_LABEL[o.payment.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(o)}
                        aria-label={`Open order ${o.orderNumber}`}
                        className="p-1 text-ink-faint hover:text-ink"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta?.totalPages > 1 && <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />}
        </>
      )}

      {selected && (
        <OrderDrawer order={selected} onClose={() => setSelected(null)} onChanged={refetch} />
      )}
    </div>
  );
}
