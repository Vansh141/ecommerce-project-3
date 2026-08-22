import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Boxes, FolderTree, Users, Ticket, Save } from 'lucide-react';
import { categoryApi, adminApi, productApi, couponApi, uploadApi } from '../../api/endpoints';
import { useFetch, useDebounced, useDocumentMeta } from '../../hooks';
import { useToast } from '../../context/ToastContext';
import {
  Button, Input, Textarea, Select, Modal, ConfirmDialog, Skeleton,
  EmptyState, Pagination, Alert, Checkbox,
} from '../../components/ui';
import { formatPrice, formatPriceExact, formatDate, sortSizes } from '../../utils/format';

/* ═════════════════════════ Categories ════════════════════════════════════ */

const EMPTY_CATEGORY = {
  name: '', description: '', displayOrder: 0, isActive: true, showInNav: true,
  image: { url: '', publicId: '', alt: '' },
};

export function AdminCategories() {
  useDocumentMeta({ title: 'Categories', noIndex: true });
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data, loading, refetch } = useFetch(() => categoryApi.list({ all: 'true' }), []);
  const categories = data?.categories || [];

  const openCreate = () => { setEditing(null); setForm(EMPTY_CATEGORY); setError(null); setModalOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name, description: c.description || '', displayOrder: c.displayOrder ?? 0,
      isActive: c.isActive, showInNav: c.showInNav,
      image: c.image || { url: '', publicId: '', alt: '' },
    });
    setError(null);
    setModalOpen(true);
  };

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { image } = await uploadApi.image(file);
      setForm((f) => ({ ...f, image }));
    } catch (err) {
      toast.error(err.friendlyMessage || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, displayOrder: Number(form.displayOrder) || 0 };
      if (editing) await categoryApi.update(editing._id, payload);
      else await categoryApi.create(payload);
      toast.success(editing ? 'Category updated.' : 'Category created.');
      setModalOpen(false);
      refetch();
    } catch (err) {
      setError(err.friendlyMessage);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await categoryApi.remove(deleting._id);
      toast.success('Category deleted.');
      setDeleting(null);
      refetch();
    } catch (err) {
      // The API refuses to delete a category still in use, which protects the
      // catalogue from being silently orphaned.
      toast.error(err.friendlyMessage);
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-display-3">Categories</h1>
          <p className="mt-1 text-sm text-ink-muted">{categories.length} categories</p>
        </div>
        <Button onClick={openCreate}><Plus size={15} aria-hidden="true" /> New category</Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="Categories organise your catalogue and power the shop navigation."
          action={<Button onClick={openCreate}>Create your first category</Button>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {categories.map((c) => (
            <li key={c._id} className="card flex gap-4 p-4">
              <div className="h-20 w-16 shrink-0 overflow-hidden bg-paper-sunken">
                {c.image?.url && <img src={c.image.url} alt="" loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  {!c.isActive && <span className="badge-neutral">Hidden</span>}
                  {c.showInNav && <span className="badge-info">In nav</span>}
                </div>
                <p className="mt-1 truncate text-xs text-ink-muted">/{c.slug}</p>
                <p className="mt-1 text-xs text-ink-faint">{c.productCount} products</p>

                <div className="mt-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                    <Pencil size={12} aria-hidden="true" /> Edit
                  </Button>
                  <Button size="sm" variant="quiet" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}>
                    <Trash2 size={12} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit category' : 'New category'}
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={save} loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Input label="Name" required value={form.name} onChange={set('name')} placeholder="Dresses" />
          <Textarea label="Description" rows={3} value={form.description} onChange={set('description')} />

          <div>
            <span className="field-label">Category image</span>
            <div className="flex items-center gap-4">
              <div className="h-24 w-20 shrink-0 overflow-hidden bg-paper-sunken">
                {form.image?.url && <img src={form.image.url} alt="" className="h-full w-full object-cover" />}
              </div>
              <label className="btn-ghost btn-sm cursor-pointer">
                <input
                  type="file" accept="image/*" className="sr-only" disabled={uploading}
                  onChange={(e) => { uploadImage(e.target.files?.[0]); e.target.value = ''; }}
                />
                {uploading ? 'Uploading…' : form.image?.url ? 'Replace image' : 'Upload image'}
              </label>
            </div>
          </div>

          <Input label="Display order" type="number" value={form.displayOrder} onChange={set('displayOrder')} />

          <div className="space-y-3 border-t border-line pt-4">
            <Checkbox label="Active — visible in the store" checked={form.isActive} onChange={set('isActive')} />
            <Checkbox label="Show in main navigation" checked={form.showInNav} onChange={set('showInNav')} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete this category?"
        message="Categories that still contain products cannot be deleted — deactivate them instead."
        confirmLabel="Delete"
      />
    </div>
  );
}

/* ═════════════════════════ Inventory ═════════════════════════════════════ */

export function AdminInventory() {
  useDocumentMeta({ title: 'Inventory', noIndex: true });
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const debouncedSearch = useDebounced(search, 400);

  const { data, meta, loading, refetch } = useFetch(
    () => adminApi.inventory({ page, limit: 25, search: debouncedSearch, lowStock: lowOnly ? 'true' : undefined }),
    [page, debouncedSearch, lowOnly]
  );

  const products = data?.products || [];
  const threshold = data?.lowStockThreshold ?? 5;

  const saveStock = async (productId, variantId, value) => {
    const key = `${productId}:${variantId}`;
    setSavingId(key);
    try {
      await productApi.setVariantStock(productId, variantId, Number(value));
      toast.success('Stock updated.');
      setDrafts((d) => { const next = { ...d }; delete next[key]; return next; });
      refetch();
    } catch (err) {
      toast.error(err.friendlyMessage);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-3">Inventory</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Update stock per size. Low stock is {threshold} or fewer.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products"
            aria-label="Search inventory"
            className="field py-2.5 pl-9 text-sm"
          />
        </div>
        <Checkbox
          label="Low stock only"
          checked={lowOnly}
          onChange={(e) => { setLowOnly(e.target.checked); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : products.length === 0 ? (
        <EmptyState icon={Boxes} title="Nothing to show" description="No products match this filter." />
      ) : (
        <>
          <ul className="space-y-3">
            {products.map((p) => (
              <li key={p._id} className="card p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-12 w-9 shrink-0 overflow-hidden bg-paper-sunken">
                    {p.images?.[0]?.url && <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-ink-muted">
                      {formatPrice(p.price)} · <span className={p.totalStock === 0 ? 'text-danger' : p.totalStock <= threshold ? 'text-warning' : ''}>
                        {p.totalStock} total
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[...p.variants]
                    .sort((a, b) => sortSizes([a.size, b.size]).indexOf(a.size) - sortSizes([a.size, b.size]).indexOf(b.size))
                    .map((v) => {
                      const key = `${p._id}:${v._id}`;
                      const draft = drafts[key];
                      const value = draft !== undefined ? draft : v.stock;
                      const dirty = draft !== undefined && Number(draft) !== v.stock;

                      return (
                        <div
                          key={v._id}
                          className={`flex items-center gap-2 rounded-control border px-2.5 py-1.5 ${
                            v.stock === 0 ? 'border-danger/30 bg-danger-faint'
                              : v.stock <= threshold ? 'border-warning/30 bg-warning-faint'
                              : 'border-line'
                          }`}
                        >
                          <span className="w-8 text-xs font-medium">{v.size}</span>
                          <input
                            type="number"
                            min="0"
                            value={value}
                            onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                            aria-label={`Stock for ${p.name} size ${v.size}`}
                            className="w-16 rounded-control border border-line bg-paper-raised px-2 py-1 text-sm"
                          />
                          {dirty && (
                            <button
                              type="button"
                              onClick={() => saveStock(p._id, v._id, value)}
                              disabled={savingId === key}
                              aria-label={`Save stock for size ${v.size}`}
                              className="p-1 text-ink-soft hover:text-ink disabled:opacity-40"
                            >
                              <Save size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </li>
            ))}
          </ul>

          {meta?.totalPages > 1 && <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />}
        </>
      )}
    </div>
  );
}

/* ═════════════════════════ Customers ═════════════════════════════════════ */

export function AdminCustomers() {
  useDocumentMeta({ title: 'Customers', noIndex: true });
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null);
  const debouncedSearch = useDebounced(search, 400);

  const { data, meta, loading, refetch } = useFetch(
    () => adminApi.customers({ page, limit: 20, search: debouncedSearch }),
    [page, debouncedSearch]
  );

  const customers = data?.customers || [];

  const applyChange = async () => {
    try {
      if (confirm.kind === 'role') await adminApi.setRole(confirm.user._id, confirm.value);
      else await adminApi.setStatus(confirm.user._id, confirm.value);
      toast.success('Customer updated.');
      setConfirm(null);
      refetch();
    } catch (err) {
      toast.error(err.friendlyMessage);
      setConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-3">Customers</h1>
        <p className="mt-1 text-sm text-ink-muted">{meta?.total ?? 0} accounts</p>
      </div>

      <div className="relative sm:max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name or email"
          aria-label="Search customers"
          className="field py-2.5 pl-9 text-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-sunken text-left">
                  {['Customer', 'Joined', 'Orders', 'Spent', 'Role', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-2xs font-medium uppercase tracking-wider2 text-ink-faint">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {customers.map((c) => (
                  <tr key={c._id} className={!c.isActive ? 'opacity-55' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-ink-muted">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">{c.orderCount}</td>
                    <td className="px-4 py-3 font-medium">{formatPriceExact(c.totalSpent)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge-${c.role === 'admin' ? 'info' : 'neutral'}`}>{c.role}</span>
                      {!c.isActive && <span className="ml-1.5 badge-danger">Disabled</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm" variant="quiet"
                          onClick={() => setConfirm({
                            kind: 'role', user: c,
                            value: c.role === 'admin' ? 'customer' : 'admin',
                          })}
                        >
                          {c.role === 'admin' ? 'Demote' : 'Make admin'}
                        </Button>
                        <Button
                          size="sm" variant="quiet"
                          onClick={() => setConfirm({ kind: 'status', user: c, value: !c.isActive })}
                        >
                          {c.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta?.totalPages > 1 && <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />}
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={applyChange}
        title={confirm?.kind === 'role' ? 'Change this role?' : 'Change account status?'}
        message={
          confirm?.kind === 'role'
            ? `${confirm?.user?.name} will become ${confirm?.value}. They will be signed out immediately and must sign in again.`
            : `${confirm?.user?.name} will be ${confirm?.value ? 'enabled' : 'disabled'}. Disabling signs them out immediately.`
        }
        confirmLabel="Confirm"
      />
    </div>
  );
}

/* ═════════════════════════ Coupons ═══════════════════════════════════════ */

const EMPTY_COUPON = {
  code: '', description: '', discountType: 'percentage', discountValue: 10,
  maxDiscountAmount: 0, minOrderValue: 0, totalUsageLimit: 0, perUserLimit: 1,
  expiresAt: '', isActive: true,
};

export function AdminCoupons() {
  useDocumentMeta({ title: 'Coupons', noIndex: true });
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_COUPON);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [page, setPage] = useState(1);

  const { data, meta, loading, refetch } = useFetch(() => couponApi.list({ page, limit: 20 }), [page]);
  const coupons = data?.coupons || [];

  const openCreate = () => {
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    setEditing(null);
    setForm({ ...EMPTY_COUPON, expiresAt: in30 });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code, description: c.description || '', discountType: c.discountType,
      discountValue: c.discountValue, maxDiscountAmount: c.maxDiscountAmount,
      minOrderValue: c.minOrderValue, totalUsageLimit: c.totalUsageLimit,
      perUserLimit: c.perUserLimit, isActive: c.isActive,
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : '',
    });
    setError(null);
    setModalOpen(true);
  };

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        discountValue: Number(form.discountValue),
        maxDiscountAmount: Number(form.maxDiscountAmount) || 0,
        minOrderValue: Number(form.minOrderValue) || 0,
        totalUsageLimit: Number(form.totalUsageLimit) || 0,
        perUserLimit: Number(form.perUserLimit) || 0,
        expiresAt: new Date(`${form.expiresAt}T23:59:59`).toISOString(),
      };
      if (editing) await couponApi.update(editing._id, payload);
      else await couponApi.create(payload);
      toast.success(editing ? 'Coupon updated.' : 'Coupon created.');
      setModalOpen(false);
      refetch();
    } catch (err) {
      setError(err.friendlyMessage);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      const res = await couponApi.remove(deleting._id);
      toast.success(res.message || 'Coupon deleted.');
      setDeleting(null);
      refetch();
    } catch (err) {
      toast.error(err.friendlyMessage);
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-display-3">Coupons</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Discounts are calculated on the server — a customer cannot alter the amount.
          </p>
        </div>
        <Button onClick={openCreate}><Plus size={15} aria-hidden="true" /> New coupon</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No coupons yet"
          description="Create a discount code to run a promotion."
          action={<Button onClick={openCreate}>Create a coupon</Button>}
        />
      ) : (
        <>
          <ul className="space-y-3">
            {coupons.map((c) => {
              const expired = new Date(c.expiresAt) < new Date();
              return (
                <li key={c._id} className="card flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium">{c.code}</span>
                      {!c.isActive && <span className="badge-neutral">Inactive</span>}
                      {expired && <span className="badge-danger">Expired</span>}
                      {c.totalUsageLimit > 0 && c.usedCount >= c.totalUsageLimit && (
                        <span className="badge-warning">Fully used</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {c.discountType === 'percentage'
                        ? `${c.discountValue}% off${c.maxDiscountAmount ? ` (max ${formatPrice(c.maxDiscountAmount)})` : ''}`
                        : `${formatPrice(c.discountValue)} off`}
                      {c.minOrderValue > 0 && ` · min ${formatPrice(c.minOrderValue)}`}
                      {' · '}used {c.usedCount}{c.totalUsageLimit > 0 ? `/${c.totalUsageLimit}` : ''}
                      {' · '}expires {formatDate(c.expiresAt)}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil size={12} aria-hidden="true" /> Edit
                    </Button>
                    <Button size="sm" variant="quiet" onClick={() => setDeleting(c)} aria-label={`Delete ${c.code}`}>
                      <Trash2 size={12} aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {meta?.totalPages > 1 && <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit coupon' : 'New coupon'}
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={save} loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Input
            label="Code" required value={form.code} onChange={set('code')}
            className="uppercase" placeholder="WELCOME10" disabled={Boolean(editing)}
            hint={editing ? 'The code cannot be changed after creation.' : 'Letters, numbers, hyphens.'}
          />

          <Input label="Description" value={form.description} onChange={set('description')} placeholder="10% off your first order" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Type" value={form.discountType} onChange={set('discountType')}>
              <option value="percentage">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
            </Select>
            <Input
              label={form.discountType === 'percentage' ? 'Percent off' : 'Amount off (₹)'}
              type="number" required min="0" max={form.discountType === 'percentage' ? 100 : undefined}
              value={form.discountValue} onChange={set('discountValue')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {form.discountType === 'percentage' && (
              <Input
                label="Max discount (₹)" type="number" min="0"
                value={form.maxDiscountAmount} onChange={set('maxDiscountAmount')}
                hint="0 = no cap"
              />
            )}
            <Input
              label="Minimum order (₹)" type="number" min="0"
              value={form.minOrderValue} onChange={set('minOrderValue')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Total uses" type="number" min="0" value={form.totalUsageLimit} onChange={set('totalUsageLimit')} hint="0 = unlimited" />
            <Input label="Per customer" type="number" min="0" value={form.perUserLimit} onChange={set('perUserLimit')} />
            <Input label="Expires on" type="date" required value={form.expiresAt} onChange={set('expiresAt')} />
          </div>

          <Checkbox label="Active" checked={form.isActive} onChange={set('isActive')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete this coupon?"
        message="Coupons that have already been used are deactivated instead of deleted, so order history stays intact."
        confirmLabel="Delete"
      />
    </div>
  );
}
