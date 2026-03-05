import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Check, AlertCircle, Search, Package, Link as LinkIcon, Upload, Image as ImageIcon } from 'lucide-react';
import api from '../../services/api';

const EMPTY_FORM = {
    name: '', price: '', image: '', brand: '',
    category: '', countInStock: '', description: '', discount: '',
};

// ── InputField is defined at MODULE scope (outside AdminProducts) ──────────────
// If defined INSIDE AdminProducts, React recreates it as a new component type on
// every render (every keystroke), causing inputs to unmount → focus lost.
const InputField = ({ label, name, type = 'text', placeholder, required, form, onChange }) => (
    <div>
        <label className="block text-xs font-semibold text-touchDark/60 uppercase tracking-widest mb-1.5">
            {label}
        </label>
        <input
            type={type}
            name={name}
            value={form[name]}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className="w-full px-4 py-2.5 rounded-xl border border-touchPink/30 bg-touchCream/20 text-touchDark text-sm focus:outline-none focus:border-touchPink focus:ring-1 focus:ring-touchPink transition-all"
        />
    </div>
);

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [deleteId, setDeleteId] = useState(null);
    // Image source toggle
    const [imageMode, setImageMode] = useState('url');  // 'url' | 'file'
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileRef = useRef(null);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/products');
            setProducts(data);
        } catch (err) {
            setError('Failed to load products.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const openCreate = () => {
        setEditingProduct(null);
        setForm(EMPTY_FORM);
        setImageMode('url');
        setUploadError('');
        setShowModal(true);
    };

    const openEdit = (product) => {
        setEditingProduct(product);
        setForm({
            name: product.name,
            price: product.price,
            image: product.image,
            brand: product.brand,
            category: product.category,
            countInStock: product.countInStock,
            description: product.description,
            discount: product.discount || 0,
        });
        // If stored image is a local upload path use file mode, otherwise url
        setImageMode(product.image?.startsWith('/uploads/') ? 'file' : 'url');
        setUploadError('');
        setShowModal(true);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadLoading(true);
        setUploadError('');
        try {
            const data = new FormData();
            data.append('image', file);
            const { data: res } = await api.post('/upload', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // Full URL so frontend can display and backend stores a relative path
            setForm(prev => ({ ...prev, image: res.url }));
        } catch (err) {
            setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
        } finally {
            setUploadLoading(false);
        }
    };

    const handleFormChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError('');
        try {
            const payload = {
                ...form,
                price: Number(form.price),
                countInStock: Number(form.countInStock),
                discount: Number(form.discount) || 0,
            };
            if (editingProduct) {
                await api.put(`/products/${editingProduct._id}`, payload);
                setSuccess('Product updated successfully.');
            } else {
                await api.post('/products', payload);
                setSuccess('Product created successfully.');
            }
            setShowModal(false);
            fetchProducts();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save product.');
        } finally {
            setActionLoading(false);
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setActionLoading(true);
        try {
            await api.delete(`/products/${deleteId}`);
            setSuccess('Product deleted.');
            setDeleteId(null);
            fetchProducts();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete product.');
        } finally {
            setActionLoading(false);
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">

            {/* Notifications */}
            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                    <button className="ml-auto" onClick={() => setError('')}><X size={14} /></button>
                </div>
            )}
            {success && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                    <Check size={16} /> {success}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative w-full sm:w-72">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-touchDark/40" />
                    <input
                        type="text"
                        placeholder="Search products…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-touchPink/30 bg-white focus:outline-none focus:border-touchPink focus:ring-1 focus:ring-touchPink transition-all"
                    />
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-touchDark text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-touchDark/85 transition-all active:scale-[0.97] shadow-sm"
                >
                    <Plus size={16} /> Add Product
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center">
                        <div className="w-8 h-8 border-2 border-touchPink border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-3">
                        <Package size={40} className="text-touchPink/40" />
                        <p className="text-touchDark/50 font-light">No products found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Product</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Category</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Price</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Stock</th>
                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(product => (
                                    <tr key={product._id} className="hover:bg-gray-50/40 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                                                    <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-touchDark line-clamp-1">{product.name}</p>
                                                    <p className="text-xs text-touchDark/40">{product.brand}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="px-2.5 py-1 bg-touchCream/60 text-touchDark/70 rounded-lg text-xs font-medium">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 font-semibold text-touchDark">
                                            ₹{product.price?.toFixed(2)}
                                            {product.discount > 0 && (
                                                <span className="ml-2 text-xs text-emerald-500 font-medium">{product.discount}% off</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`text-sm font-semibold ${product.countInStock === 0 ? 'text-red-500' : product.countInStock < 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {product.countInStock}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(product)}
                                                    className="p-2 rounded-lg text-touchDark/50 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                                                    title="Edit"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(product._id)}
                                                    className="p-2 rounded-lg text-touchDark/50 hover:text-red-500 hover:bg-red-50 transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="px-8 pt-8 pb-4 border-b border-gray-100">
                            <h2 className="text-2xl font-serif text-touchDark tracking-wide">
                                {editingProduct ? 'Edit Product' : 'New Product'}
                            </h2>
                            <p className="text-sm text-touchDark/50 font-light mt-1">
                                {editingProduct ? 'Update the details below.' : 'Fill in the product information.'}
                            </p>
                            <button
                                onClick={() => setShowModal(false)}
                                className="absolute top-5 right-5 p-2 rounded-xl hover:bg-gray-100 text-touchDark/50 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="px-8 py-6 space-y-4">
                            <InputField label="Product Name" name="name" placeholder="e.g. Floral Midi Dress" required form={form} onChange={handleFormChange} />

                            {/* ── Image Source (URL or Upload) ─────────────────── */}
                            <div>
                                <label className="block text-xs font-semibold text-touchDark/60 uppercase tracking-widest mb-1.5">Product Image</label>

                                {/* Toggle */}
                                <div className="flex mb-2 border border-touchPink/25 rounded-xl overflow-hidden">
                                    <button type="button"
                                        onClick={() => { setImageMode('url'); setUploadError(''); }}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all
                                            ${imageMode === 'url' ? 'bg-touchDark text-white' : 'bg-white text-touchDark/50 hover:bg-gray-50'}`}
                                    >
                                        <LinkIcon size={13} /> Paste URL
                                    </button>
                                    <button type="button"
                                        onClick={() => { setImageMode('file'); setUploadError(''); }}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all
                                            ${imageMode === 'file' ? 'bg-touchDark text-white' : 'bg-white text-touchDark/50 hover:bg-gray-50'}`}
                                    >
                                        <Upload size={13} /> Upload File
                                    </button>
                                </div>

                                {imageMode === 'url' ? (
                                    <input
                                        type="text" name="image" value={form.image}
                                        onChange={handleFormChange}
                                        placeholder="https://example.com/image.jpg"
                                        required={imageMode === 'url' && !form.image}
                                        className="w-full px-4 py-2.5 rounded-xl border border-touchPink/30 bg-touchCream/20 text-touchDark text-sm focus:outline-none focus:border-touchPink focus:ring-1 focus:ring-touchPink transition-all"
                                    />
                                ) : (
                                    <div
                                        onClick={() => fileRef.current?.click()}
                                        className="relative border-2 border-dashed border-touchPink/30 rounded-xl p-5 text-center cursor-pointer hover:border-touchPink/60 hover:bg-touchPink/3 transition-all group"
                                    >
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        {uploadLoading ? (
                                            <div className="flex flex-col items-center gap-2 py-2">
                                                <div className="w-6 h-6 border-2 border-touchPink border-t-transparent rounded-full animate-spin" />
                                                <p className="text-xs text-touchDark/50">Uploading…</p>
                                            </div>
                                        ) : form.image && imageMode === 'file' ? (
                                            <div className="flex items-center gap-3">
                                                <img src={`http://localhost:5000${form.image}`} alt="preview"
                                                    className="w-14 h-14 object-cover rounded-lg border border-touchPink/20" />
                                                <div className="text-left">
                                                    <p className="text-sm font-medium text-touchDark">Image uploaded ✓</p>
                                                    <p className="text-xs text-touchDark/40 mt-0.5">Click to replace</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 py-2">
                                                <div className="w-10 h-10 bg-touchPink/10 rounded-xl flex items-center justify-center group-hover:bg-touchPink/20 transition-colors">
                                                    <ImageIcon size={20} className="text-touchPink" />
                                                </div>
                                                <p className="text-sm font-medium text-touchDark/70">Click to choose an image</p>
                                                <p className="text-xs text-touchDark/40">JPG, PNG, WebP — max 5 MB</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {uploadError && (
                                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                        <AlertCircle size={12} /> {uploadError}
                                    </p>
                                )}

                                {/* Live preview for URL mode */}
                                {imageMode === 'url' && form.image && (
                                    <div className="mt-2 flex items-center gap-3">
                                        <img
                                            src={form.image}
                                            alt="preview"
                                            onError={e => { e.target.style.display = 'none'; }}
                                            className="w-14 h-14 object-cover rounded-lg border border-touchPink/20"
                                        />
                                        <p className="text-xs text-touchDark/40">Preview</p>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Price (₹)" name="price" type="number" placeholder="999" required form={form} onChange={handleFormChange} />
                                <InputField label="Discount (%)" name="discount" type="number" placeholder="0" form={form} onChange={handleFormChange} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Brand" name="brand" placeholder="TOUCH" required form={form} onChange={handleFormChange} />
                                <InputField label="Category" name="category" placeholder="Dresses" required form={form} onChange={handleFormChange} />
                            </div>
                            <InputField label="Stock Qty" name="countInStock" type="number" placeholder="50" required form={form} onChange={handleFormChange} />
                            <div>
                                <label className="block text-xs font-semibold text-touchDark/60 uppercase tracking-widest mb-1.5">Description</label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleFormChange}
                                    rows={3}
                                    placeholder="Product description..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-touchPink/30 bg-touchCream/20 text-touchDark text-sm focus:outline-none focus:border-touchPink focus:ring-1 focus:ring-touchPink resize-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-touchDark/60 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 py-3 bg-touchDark text-white rounded-xl text-sm font-medium hover:bg-touchDark/85 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {actionLoading
                                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : editingProduct ? 'Save Changes' : 'Create Product'
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Trash2 size={28} className="text-red-400" />
                        </div>
                        <h3 className="text-xl font-serif text-touchDark mb-2">Delete Product?</h3>
                        <p className="text-sm text-touchDark/50 font-light mb-6">
                            This action cannot be undone. The product will be permanently removed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-touchDark/60 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProducts;
