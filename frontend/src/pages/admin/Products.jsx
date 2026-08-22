import { useEffect, useState } from 'react';
import { Plus, Pencil, Archive, Search, Upload, X, Trash2, ImageOff } from 'lucide-react';
import { productApi, categoryApi, uploadApi } from '../../api/endpoints';
import { useFetch, useDebounced, useDocumentMeta } from '../../hooks';
import { useToast } from '../../context/ToastContext';
import {
  Button, Input, Textarea, Select, Modal, ConfirmDialog, Alert, Skeleton,
  EmptyState, Pagination, Checkbox,
} from '../../components/ui';
import { formatPrice, discountPercent, sortSizes } from '../../utils/format';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const EMPTY = {
  name: '', description: '', shortDescription: '', brand: 'TOUCH', category: '',
  price: '', mrp: '', status: 'draft', isFeatured: false, isNewArrival: false,
  material: '', careInstructions: '', tags: '', images: [], variants: [],
};

/**
 * Image manager.
 *
 * Uploads go straight to the API, which validates magic bytes and re-encodes
 * the file. The URL returned is what gets stored — the browser never decides
 * where an image lives.
 */
function ImageManager({ images, onChange }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFiles = async (files) => {
    const list = Array.from(files).slice(0, 6 - images.length);
    if (list.length === 0) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of list) {
         
        const { image } = await uploadApi.image(file, setProgress);
        uploaded.push(image);
      }
      onChange([...images, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} uploaded.`);
    } catch (err) {
      toast.error(err.friendlyMessage || 'Upload failed.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div>
      <span className="field-label">Images ({images.length}/6)</span>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img, i) => (
          <div key={img.url} className="group relative aspect-[3/4] overflow-hidden bg-paper-sunken">
            <img src={img.url} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 badge-neutral bg-ink/80 text-paper">Main</span>
            )}
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              aria-label={`Remove image ${i + 1}`}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center
                         rounded-full bg-ink/80 text-paper opacity-0 transition-opacity
                         group-hover:opacity-100 focus:opacity-100"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {images.length < 6 && (
          <label
            className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2
                       border border-dashed border-line-strong text-ink-faint transition-colors
                       hover:border-ink hover:text-ink"
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
            {uploading ? (
              <>
                <span className="text-2xs">{progress}%</span>
                <span className="text-2xs">Uploading</span>
              </>
            ) : (
              <>
                <Upload size={17} aria-hidden="true" />
                <span className="text-2xs">Add</span>
              </>
            )}
          </label>
        )}
      </div>

      <p className="field-hint">
        JPG, PNG, WebP or AVIF up to 5 MB. Images are converted to WebP automatically.
        The first image is used on listing pages.
      </p>
    </div>
  );
}

/** Size + stock editor. Sizes are per-product, never a fixed global list. */
function VariantEditor({ variants, onChange }) {
  const [newSize, setNewSize] = useState('');

  const addSize = (size) => {
    const clean = size.trim().toUpperCase();
    if (!clean || variants.some((v) => v.size === clean)) return;
    onChange([...variants, { size: clean, stock: 0, isActive: true }]);
    setNewSize('');
  };

  const update = (index, patch) =>
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));

  const unusedDefaults = DEFAULT_SIZES.filter((s) => !variants.some((v) => v.size === s));

  return (
    <div>
      <span className="field-label">Sizes & stock</span>

      {variants.length === 0 ? (
        <p className="mb-3 rounded-control bg-warning-faint px-3 py-2.5 text-xs text-warning">
          Add at least one size. A product with no sizes cannot be purchased.
        </p>
      ) : (
        <ul className="mb-3 space-y-2">
          {variants.map((v, i) => (
            <li key={v.size} className="flex items-center gap-3 rounded-control border border-line p-2.5">
              <span className="w-14 shrink-0 text-sm font-medium">{v.size}</span>

              <label className="flex flex-1 items-center gap-2">
                <span className="text-2xs uppercase tracking-wider2 text-ink-faint">Stock</span>
                <input
                  type="number"
                  min="0"
                  value={v.stock}
                  onChange={(e) => update(i, { stock: Math.max(0, Number(e.target.value) || 0) })}
                  className="field w-24 py-1.5 text-sm"
                  aria-label={`Stock for size ${v.size}`}
                />
              </label>

              {v.sku && <span className="hidden font-mono text-2xs text-ink-faint sm:block">{v.sku}</span>}

              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={v.isActive !== false}
                  onChange={(e) => update(i, { isActive: e.target.checked })}
                  className="h-3.5 w-3.5 accent-ink"
                  aria-label={`Size ${v.size} active`}
                />
                <span className="text-2xs text-ink-muted">Active</span>
              </label>

              <button
                type="button"
                onClick={() => onChange(variants.filter((_, idx) => idx !== i))}
                aria-label={`Remove size ${v.size}`}
                className="p-1 text-ink-faint hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {unusedDefaults.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => addSize(s)}
            className="rounded-control border border-line px-3 py-1.5 text-xs text-ink-soft
                       transition-colors hover:border-ink hover:text-ink"
          >
            + {s}
          </button>
        ))}

        <div className="flex items-center gap-1.5">
          <input
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize(newSize); } }}
            placeholder="Custom"
            aria-label="Custom size"
            className="field w-24 py-1.5 text-xs uppercase"
            maxLength={12}
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => addSize(newSize)}>Add</Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProducts() {
  useDocumentMeta({ title: 'Products', noIndex: true });
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounced(search, 400);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [archiving, setArchiving] = useState(null);

  const { data, meta, loading, refetch } = useFetch(
    () => productApi.list({ page, limit: 20, search: debouncedSearch, status: statusFilter || undefined }),
    [page, debouncedSearch, statusFilter]
  );
  const { data: catData } = useFetch(() => categoryApi.list({ all: 'true' }), []);

  const products = data?.products || [];
  const categories = catData?.categories || [];

  useEffect(() => setPage(1), [debouncedSearch, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, category: categories[0]?._id || '' });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description || '',
      shortDescription: product.shortDescription || '',
      brand: product.brand,
      category: product.category?._id || product.category || '',
      price: product.price,
      mrp: product.mrp,
      status: product.status,
      isFeatured: product.isFeatured,
      isNewArrival: product.isNewArrival,
      material: product.material || '',
      careInstructions: product.careInstructions || '',
      tags: (product.tags || []).join(', '),
      images: product.images || [],
      variants: product.variants || [],
    });
    setFormError(null);
    setModalOpen(true);
  };

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (form.variants.length === 0) {
      setFormError('Add at least one size before saving.');
      return;
    }
    if (form.images.length === 0) {
      setFormError('Add at least one image.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        mrp: Number(form.mrp) || Number(form.price),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      if (editing) await productApi.update(editing._id, payload);
      else await productApi.create(payload);

      toast.success(editing ? 'Product updated.' : 'Product created.');
      setModalOpen(false);
      refetch();
    } catch (err) {
      setFormError(err.friendlyMessage || 'Could not save the product.');
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    try {
      await productApi.archive(archiving._id);
      toast.success('Product archived. Order history is preserved.');
      setArchiving(null);
      refetch();
    } catch (err) {
      toast.error(err.friendlyMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display-3">Products</h1>
          <p className="mt-1 text-sm text-ink-muted">{meta?.total ?? 0} in catalogue</p>
        </div>
        <Button onClick={openCreate} disabled={categories.length === 0}>
          <Plus size={15} aria-hidden="true" /> New product
        </Button>
      </div>

      {categories.length === 0 && (
        <Alert tone="warning" title="Create a category first">
          Products must belong to a category. <a href="/admin/categories" className="link">Add one now</a>.
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className="field py-2.5 pl-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-44" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title="No products found"
          description={search ? 'Try a different search.' : 'Create your first product to get started.'}
          action={!search && categories.length > 0 && <Button onClick={openCreate}>New product</Button>}
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <ul className="divide-y divide-line">
              {products.map((p) => {
                const discount = discountPercent(p.mrp, p.price);
                return (
                  <li key={p._id} className="flex items-center gap-4 p-4">
                    <div className="h-16 w-12 shrink-0 overflow-hidden bg-paper-sunken">
                      {p.images?.[0]?.url && (
                        <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <span className={`badge-${p.status === 'active' ? 'success' : p.status === 'draft' ? 'warning' : 'neutral'}`}>
                          {p.status}
                        </span>
                        {p.isFeatured && <span className="badge-info">Featured</span>}
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        {formatPrice(p.price)}
                        {discount > 0 && <span className="ml-1.5 line-through">{formatPrice(p.mrp)}</span>}
                        <span className="mx-1.5">·</span>
                        <span className={p.totalStock === 0 ? 'text-danger' : p.totalStock <= 5 ? 'text-warning' : ''}>
                          {p.totalStock} in stock
                        </span>
                        <span className="mx-1.5">·</span>
                        {sortSizes(p.variants?.map((v) => v.size) || []).join(' ')}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil size={13} aria-hidden="true" /> Edit
                      </Button>
                      {p.status !== 'archived' && (
                        <Button size="sm" variant="quiet" onClick={() => setArchiving(p)} aria-label={`Archive ${p.name}`}>
                          <Archive size={13} aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {meta?.totalPages > 1 && (
            <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />
          )}
        </>
      )}

      {/* ── Editor ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit product' : 'New product'}
        size="xl"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={save} loading={saving}>
              {editing ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        }
      >
        <form onSubmit={save} className="space-y-5">
          {formError && <Alert tone="error">{formError}</Alert>}

          <Input label="Product name" required value={form.name} onChange={set('name')} placeholder="Amara Linen Midi Dress" />

          <Input
            label="Short description" value={form.shortDescription} onChange={set('shortDescription')}
            placeholder="One line shown on listing pages" maxLength={300}
          />

          <Textarea
            label="Description" required rows={5} value={form.description} onChange={set('description')}
            placeholder="Fabric, fit, and what makes this piece worth owning."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" required value={form.category} onChange={set('category')}>
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}{!c.isActive ? ' (inactive)' : ''}</option>
              ))}
            </Select>
            <Input label="Brand" required value={form.brand} onChange={set('brand')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Selling price (₹)" type="number" required min="0" step="1"
              value={form.price} onChange={set('price')}
            />
            <Input
              label="Compare-at price (₹)" type="number" min="0" step="1"
              value={form.mrp} onChange={set('mrp')}
              hint="Leave equal to price for no discount"
            />
            <Select label="Status" value={form.status} onChange={set('status')}>
              <option value="draft">Draft — hidden from the store</option>
              <option value="active">Active — visible to shoppers</option>
              <option value="archived">Archived</option>
            </Select>
          </div>

          <ImageManager images={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} />

          <VariantEditor variants={form.variants} onChange={(variants) => setForm((f) => ({ ...f, variants }))} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Material" value={form.material} onChange={set('material')} placeholder="100% washed linen" />
            <Input label="Care" value={form.careInstructions} onChange={set('careInstructions')} placeholder="Machine wash cold" />
          </div>

          <Input
            label="Tags" value={form.tags} onChange={set('tags')}
            placeholder="linen, midi, summer" hint="Comma separated — used for search and related products"
          />

          <div className="flex flex-wrap gap-6 border-t border-line pt-4">
            <Checkbox label="Featured on the homepage" checked={form.isFeatured} onChange={set('isFeatured')} />
            <Checkbox label="Show as a new arrival" checked={form.isNewArrival} onChange={set('isNewArrival')} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        onConfirm={archive}
        title="Archive this product?"
        message="It will be hidden from the store immediately. Existing orders keep their record, and you can restore it by setting the status back to active."
        confirmLabel="Archive"
        tone="danger"
      />
    </div>
  );
}
