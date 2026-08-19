import { Link } from 'react-router-dom';
import {
  IndianRupee, ShoppingBag, Users, Package, TrendingUp, TrendingDown,
  AlertTriangle, ArrowRight, MessageSquare, Star,
} from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { useFetch, useDocumentMeta } from '../../hooks';
import { Skeleton, Alert, Button } from '../../components/ui';
import { formatPriceExact } from '../../utils/format';

function StatCard({ label, value, sub, icon: Icon, trend }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-2xs uppercase tracking-wider2 text-ink-faint">{label}</p>
        <Icon size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />
      </div>
      <p className="mt-3 font-display text-2xl">{value}</p>
      {(sub || trend !== null) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          {typeof trend === 'number' && (
            <span className={`inline-flex items-center gap-0.5 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend)}%
            </span>
          )}
          {sub && <span className="text-ink-faint">{sub}</span>}
        </div>
      )}
    </div>
  );
}

/** Simple bar chart. A dependency-free SVG beats adding a charting library
 *  for one 30-day series. */
function SalesChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-ink-muted">
        No paid orders in the last 30 days yet.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div>
      <div className="flex h-40 items-end gap-1" role="img" aria-label="Revenue over the last 30 days">
        {data.map((d) => (
          <div key={d.date} className="group relative flex-1">
            <div
              className="w-full rounded-t-sm bg-clay/70 transition-colors group-hover:bg-clay"
              style={{ height: `${Math.max((d.revenue / max) * 150, 2)}px` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden
                            -translate-x-1/2 whitespace-nowrap rounded-control bg-ink px-2 py-1
                            text-2xs text-paper group-hover:block">
              {d.date} · {formatPriceExact(d.revenue)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-2xs text-ink-faint">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  useDocumentMeta({ title: 'Dashboard', noIndex: true });
  const { data, loading, error } = useFetch(() => adminApi.stats(), []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) return <Alert tone="error" title="Could not load the dashboard">{error}</Alert>;

  const { revenue, orders, customers, products, lowStock, attention, salesTrend, subscribers } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Revenue counts paid orders only — unpaid and cancelled orders are excluded.
        </p>
      </div>

      {/* ── Headline numbers ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue this month"
          value={formatPriceExact(revenue.thisMonth)}
          icon={IndianRupee}
          trend={revenue.growthPercent}
          sub={revenue.growthPercent === null ? 'No prior month to compare' : 'vs last month'}
        />
        <StatCard
          label="Paid orders"
          value={revenue.paidOrders}
          icon={ShoppingBag}
          sub={`${formatPriceExact(revenue.total)} all time`}
        />
        <StatCard
          label="Customers"
          value={customers.total}
          icon={Users}
          sub={`${customers.newLast30Days} new in 30 days`}
        />
        <StatCard
          label="Active products"
          value={products.active}
          icon={Package}
          sub={`${products.draft} draft · ${products.archived} archived`}
        />
      </div>

      {/* ── Needs attention ── */}
      {(orders.awaitingFulfilment > 0 || products.lowStockCount > 0 ||
        attention.unreadMessages > 0 || attention.pendingReviews > 0) && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {orders.awaitingFulfilment > 0 && (
            <Link to="/admin/orders?status=confirmed" className="card p-4 transition-colors hover:border-line-strong">
              <p className="flex items-center gap-2 text-sm font-medium">
                <ShoppingBag size={15} className="text-info" aria-hidden="true" />
                {orders.awaitingFulfilment} to fulfil
              </p>
              <p className="mt-1 text-xs text-ink-muted">Confirmed or packed orders</p>
            </Link>
          )}
          {products.lowStockCount > 0 && (
            <Link to="/admin/inventory?lowStock=true" className="card p-4 transition-colors hover:border-line-strong">
              <p className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle size={15} className="text-warning" aria-hidden="true" />
                {products.lowStockCount} low on stock
              </p>
              <p className="mt-1 text-xs text-ink-muted">At or below the threshold</p>
            </Link>
          )}
          {attention.unreadMessages > 0 && (
            <div className="card p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare size={15} className="text-clay" aria-hidden="true" />
                {attention.unreadMessages} new messages
              </p>
              <p className="mt-1 text-xs text-ink-muted">Customer enquiries</p>
            </div>
          )}
          {attention.pendingReviews > 0 && (
            <div className="card p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Star size={15} className="text-clay" aria-hidden="true" />
                {attention.pendingReviews} hidden reviews
              </p>
              <p className="mt-1 text-xs text-ink-muted">Awaiting approval</p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* ── Trend ── */}
        <section className="card p-5 sm:p-6">
          <h2 className="mb-6 text-base">Revenue · last 30 days</h2>
          <SalesChart data={salesTrend} />
        </section>

        {/* ── Order pipeline ── */}
        <section className="card p-5 sm:p-6">
          <h2 className="mb-5 text-base">Order pipeline</h2>
          <ul className="space-y-2.5">
            {[
              ['Awaiting payment', orders.pending, 'text-warning'],
              ['Confirmed', orders.confirmed, 'text-info'],
              ['Packed', orders.packed, 'text-info'],
              ['Shipped', orders.shipped, 'text-info'],
              ['Delivered', orders.delivered, 'text-success'],
              ['Cancelled', orders.cancelled, 'text-ink-faint'],
              ['Refunded', orders.refunded, 'text-ink-faint'],
            ].map(([label, value, tone]) => (
              <li key={label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-muted">{label}</span>
                <span className={`font-medium ${value > 0 ? tone : 'text-ink-faint'}`}>{value}</span>
              </li>
            ))}
          </ul>

          <Button to="/admin/orders" variant="ghost" size="sm" fullWidth className="mt-5">
            View all orders <ArrowRight size={13} aria-hidden="true" />
          </Button>
        </section>
      </div>

      {/* ── Low stock ── */}
      {lowStock.length > 0 && (
        <section className="card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <h2 className="text-base">Low stock</h2>
            <Link to="/admin/inventory" className="text-xs text-ink-muted hover:text-ink">
              Manage inventory →
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {lowStock.map((p) => (
              <li key={p._id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
                <div className="h-12 w-9 shrink-0 overflow-hidden bg-paper-sunken">
                  {p.images?.[0]?.url && (
                    <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{p.name}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {p.variants
                      .filter((v) => v.stock <= 5)
                      .map((v) => `${v.size}: ${v.stock}`)
                      .join(' · ')}
                  </p>
                </div>
                <span className={`badge-${p.totalStock === 0 ? 'danger' : 'warning'}`}>
                  {p.totalStock} left
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-ink-faint">
        {subscribers} active newsletter {subscribers === 1 ? 'subscriber' : 'subscribers'}.
      </p>
    </div>
  );
}
