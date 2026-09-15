import { useEffect, useRef, useState } from 'react';
import {
  Plus, Pencil, Archive, Search, Trash2, ImageOff, ImagePlus, Crop, RefreshCw, X,
} from 'lucide-react';
import { productApi, categoryApi, uploadApi } from '../../api/endpoints';
import { useFetch, useDebounced, useDocumentMeta } from '../../hooks';
import { useToast } from '../../context/ToastContext';
import {
  Button, Input, Textarea, Select, Modal, ConfirmDialog, Alert, Skeleton,
  EmptyState, Pagination, Checkbox,
} from '../../components/ui';
import { formatPrice, discountPercent, sortSizes } from '../../utils/format';
import { framingStyle, hasCustomFraming } from '../../utils/images';
import ProductImageEditor from './ProductImageEditor';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const MAX_IMAGES = 6;
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif';

const EMPTY = {
  name: '', description: '', shortDescription: '', brand: 'TOUCHH', category: '',
  price: '', mrp: '', status: 'draft', isFeatured: false, isNewArrival: false,
  material: '', careInstructions: '', tags: '', images: [], variants: [],
};

function withFraming(image, framing) {
  const next = { ...image };
  if (framing) next.framing = framing;
  else delete next.framing;
  return next;
}

/** One photo with its actions. The first photo is the main one. */
function ImageItem({ image, index, main, disabled, replacing, progress, onEdit, onReplace, onRemove }) {
  const which = main ? 'main image' : `image ${index + 1}`;
  return (
    <div className="flex gap-3 rounded-card border border-line p-2.5 sm:gap-4">
      <div
        className={`relative aspect-[3/4] shrink-0 overflow-hidden rounded-control bg-paper-sunken ${
          main ? 'w-28 sm:w-36' : 'w-20 sm:w-24'
        }`}
      >
        <img src={image.url} alt="" className="h-full w-full object-cover" style={framingStyle(image.framing)} />
        {main && <span className="absolute left-1.5 top-1.5 badge-neutral bg-ink/80 text-paper">Main</span>}
        {replacing && (
          <span className="absolute inset-0 flex items-center justify-center bg-paper/85 text-2xs text-ink">
            {progress}%
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        {hasCustomFraming(image.framing) && <p className="text-2xs text-ink-muted">Framing adjusted</p>}
        <Button type="button" variant="ghost" size="sm" className="h-11 w-full" onClick={onEdit} disabled={disabled}>
          <Crop size={14} aria-hidden="true" /> Edit image<span className="sr-only"> ({which})</span>
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" size="sm" className="h-11 px-2" onClick={onReplace} disabled={disabled}>
            <RefreshCw size={13} aria-hidden="true" /> Replace<span className="sr-only"> {which}</span>
          </Button>
          <Button
            type="button" variant="ghost" size="sm" className="h-11 px-2 hover:text-danger"
            onClick={onRemove} disabled={disabled}
          >
            <X size={14} aria-hidden="true" /> Remove<span className="sr-only"> {which}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Image manager.
 *
 * Uploads go straight to the API, which validates magic bytes and re-encodes
 * the file. The URL returned is what gets stored — the browser never decides
 * where an image lives. Framing is saved alongside the image, never baked in.
 * `onChange` receives an updater so a slow upload cannot overwrite edits made
 * while it was running.
 */
function ImageManager({ images, onChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [progress, setProgress] = useState(0);
  const [editingUrl, setEditingUrl] = useState(null);
  const replaceInput = useRef(null);
  const replaceUrl = useRef(null);

  const runUpload = async (target, work) => {
    setBusy(target);
    try {
      await work();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Upload failed.');
    } finally {
      setBusy(null);
      setProgress(0);
    }
  };

  const addFiles = (files) => {
    const list = Array.from(files).slice(0, MAX_IMAGES - images.length);
    if (list.length === 0) return;
    runUpload('add', async () => {
      const uploaded = [];
      for (const file of list) {
        const { image } = await uploadApi.image(file, setProgress);
        uploaded.push(image);
      }
      onChange((prev) => [...prev, ...uploaded].slice(0, MAX_IMAGES));
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} uploaded.`);
    });
  };

  const replaceWith = (file) => {
    const url = replaceUrl.current;
    replaceUrl.current = null;
    if (!file || !url) return;
    runUpload(url, async () => {
      const { image } = await uploadApi.image(file, setProgress);
      onChange((prev) => prev.map((img) => (img.url === url ? { ...image, alt: img.alt || image.alt } : img)));
      toast.success('Image replaced.');
    });
  };

  const startReplace = (url) => {
    replaceUrl.current = url;
    replaceInput.current?.click();
  };

  const editing = images.find((img) => img.url === editingUrl);

  const item = (image, index) => (
    <ImageItem
      key={image.url}
      image={image}
      index={index}
      main={index === 0}
      disabled={busy !== null}
      replacing={busy === image.url}
      progress={progress}
      onEdit={() => setEditingUrl(image.url)}
      onReplace={() => startReplace(image.url)}
      onRemove={() => onChange((prev) => prev.filter((img) => img.url !== image.url))}
    />
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="field-label">Images</span>
        <span className="text-xs text-ink-muted">{images.length}/{MAX_IMAGES}</span>
      </div>
      <p className="-mt-1 mb-3 text-xs text-ink-muted">
        Use Edit image to adjust how the product is framed in the store.
      </p>

      {images.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-2xs uppercase tracking-wider2 text-ink-faint">Main image</p>
            {item(images[0], 0)}
          </div>

          {images.length > 1 && (
            <div>
              <p className="mb-2 text-2xs uppercase tracking-wider2 text-ink-faint">Other images</p>
              <div className="grid gap-3 md:grid-cols-2">
                {images.slice(1).map((image, i) => item(image, i + 1))}
              </div>
            </div>
          )}
        </div>
      )}

      {images.length < MAX_IMAGES && (
        <label
          className={`mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-card border
                      border-dashed border-line-strong px-4 py-3 text-sm text-ink-soft transition-colors
                      hover:border-ink hover:text-ink focus-within:border-ink focus-within:text-ink
                      ${images.length === 0 ? 'min-h-32 flex-col' : ''} ${busy !== null ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            className="sr-only"
            disabled={busy !== null}
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
          />
          {busy === 'add' ? (
            <span>Uploading {progress}%</span>
          ) : (
            <>
              <ImagePlus size={17} aria-hidden="true" />
              <span>{images.length === 0 ? 'Add the main image' : 'Add image'}</span>
            </>
          )}
        </label>
      )}

      <input
        ref={replaceInput}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => { replaceWith(e.target.files?.[0]); e.target.value = ''; }}
      />

      <p className="field-hint">
        JPG, PNG, WebP or AVIF up to 5 MB. Images are converted to WebP automatically.
        The main image is shown on listing pages.
      </p>

      {editing && (
        <ProductImageEditor
          key={editing.url}
          image={editing}
          onClose={() => setEditingUrl(null)}
          onSave={(framing) => {
            const url = editing.url;
            onChange((prev) => prev.map((img) => (img.url === url ? withFraming(img, framing) : img)));
            setEditingUrl(null);
          }}
        />
      )}
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

/**
 * Wording for the delete / remove-from-store dialog.
 *  • `delete`     — permanent deletion, only possible for never-ordered products
 *  • `referenced` — deletion was refused because orders include the product
 *  • `archive`    — hide from the store, keeping the product and its order history
 */
function removalDialog({ product, stage }) {
  const name = `“${product.name}”`;
  if (stage === 'delete') {
    return {
      title: 'Delete this product?',
      message: `${name} will be removed from the catalogue. This cannot be undone.`,
      confirmLabel: 'Delete product',
      tone: 'danger',
    };
  }
  if (stage === 'referenced') {
    return product.status === 'archived'
      ? {
        title: 'This product can’t be deleted',
        message: 'This product is part of existing orders, so it cannot be permanently deleted. It has already been removed from the store, so shoppers can no longer see or buy it.',
        confirmLabel: 'OK',
        tone: 'primary',
      }
      : {
        title: 'This product can’t be deleted',
        message: 'This product is part of existing orders, so it cannot be permanently deleted. You can remove it from the store instead.',
        confirmLabel: 'Remove from store',
        tone: 'primary',
      };
  }
  return {
    title: 'Remove this product from the store?',
    message: `${name} will be hidden from shoppers straight away. Existing orders keep their record, and you can bring it back by setting its status to Active.`,
    confirmLabel: 'Remove from store',
    tone: 'primary',
  };
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

  const [removal, setRemoval] = useState(null);
  const [removing, setRemoving] = useState(false);
  const removingRef = useRef(false);

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

  const setImages = (update) =>
    setForm((f) => ({ ...f, images: typeof update === 'function' ? update(f.images) : update }));

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

  const closeRemoval = () => {
    if (!removingRef.current) setRemoval(null);
  };

  const confirmRemoval = async () => {
    if (!removal || removingRef.current) return;
    const { product, stage } = removal;
    if (stage === 'referenced' && product.status === 'archived') {
      setRemoval(null);
      return;
    }

    removingRef.current = true;
    setRemoving(true);
    try {
      if (stage === 'delete') {
        await productApi.remove(product._id);
        toast.success(`“${product.name}” was deleted.`);
      } else {
        await productApi.archive(product._id);
        toast.success('Product removed from the store. Order history is preserved.');
      }
      setRemoval(null);
      if (editing?._id === product._id) setModalOpen(false);
      refetch();
    } catch (err) {
      if (stage === 'delete' && err.errorCode === 'PRODUCT_REFERENCED') {
        setRemoval({ product, stage: 'referenced' });
      } else {
        toast.error(err.friendlyMessage || 'Something went wrong. Please try again.');
      }
    } finally {
      removingRef.current = false;
      setRemoving(false);
    }
  };

  const dialog = removal ? removalDialog(removal) : null;

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
                  <li key={p._id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                    <div className="h-16 w-12 shrink-0 overflow-hidden bg-paper-sunken">
                      {p.images?.[0]?.url && (
                        <img
                          src={p.images[0].url} alt="" loading="lazy"
                          className="h-full w-full object-cover" style={framingStyle(p.images[0].framing)}
                        />
                      )}
                    </div>

                    <div className="min-w-[9rem] flex-1">
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

                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-11" onClick={() => openEdit(p)}>
                        <Pencil size={13} aria-hidden="true" /> Edit
                      </Button>
                      {p.status !== 'archived' && (
                        <Button
                          size="sm" variant="quiet" className="h-11 w-11 px-0"
                          onClick={() => setRemoval({ product: p, stage: 'archive' })}
                          aria-label={`Remove ${p.name} from store`} title="Remove from store"
                        >
                          <Archive size={14} aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        size="sm" variant="quiet" className="h-11 min-w-11 px-3 hover:text-danger"
                        onClick={() => setRemoval({ product: p, stage: 'delete' })}
                        aria-label={`Delete ${p.name}`} title="Delete product"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
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

          <ImageManager images={form.images} onChange={setImages} />

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

          {editing && (
            <section aria-labelledby="product-danger-zone" className="rounded-card border border-danger/25 p-4 sm:p-5">
              <h3 id="product-danger-zone" className="font-sans text-sm font-medium text-danger">Danger zone</h3>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">Delete this product</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    Permanently remove this product from the catalogue. Products that are part of existing
                    orders can be removed from the store instead.
                  </p>
                </div>
                <Button
                  type="button" variant="danger" className="shrink-0"
                  onClick={() => setRemoval({ product: editing, stage: 'delete' })}
                >
                  <Trash2 size={15} aria-hidden="true" /> Delete product
                </Button>
              </div>
            </section>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(removal)}
        onClose={closeRemoval}
        onConfirm={confirmRemoval}
        loading={removing}
        title={dialog?.title}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        tone={dialog?.tone}
      />
    </div>
  );
}
