import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Clock, Truck, AlertCircle, X, Search, ShoppingBag } from 'lucide-react';
import api from '../../services/api';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all'); // all | pending | delivered

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/orders/admin/all');
            setOrders(data);
        } catch (err) {
            setError('Failed to fetch orders.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const markDelivered = async (orderId) => {
        setActionLoadingId(orderId);
        try {
            await api.put(`/orders/${orderId}/deliver`);
            setSuccess('Order marked as delivered.');
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, isDelivered: true, deliveredAt: new Date() } : o));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update delivery status.');
        } finally {
            setActionLoadingId(null);
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const formatDate = (d) =>
        d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const filtered = orders
        .filter(o => {
            if (filter === 'pending') return !o.isDelivered;
            if (filter === 'delivered') return o.isDelivered;
            return true;
        })
        .filter(o =>
            o._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (o.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (o.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

    const pendingCount = orders.filter(o => !o.isDelivered).length;
    const deliveredCount = orders.filter(o => o.isDelivered).length;

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
                    <CheckCircle size={16} /> {success}
                </div>
            )}

            {/* Mini Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total', count: orders.length, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                    { label: 'Processing', count: pendingCount, color: 'bg-amber-50 text-amber-600 border-amber-100' },
                    { label: 'Delivered', count: deliveredCount, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                ].map(({ label, count, color }) => (
                    <div key={label} className={`rounded-2xl border px-5 py-4 ${color.split(' ')[0]} border-${color.split(' ')[2]}`}>
                        <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${color.split(' ')[1]} opacity-70`}>{label}</p>
                        <p className={`text-2xl font-bold ${color.split(' ')[1]}`}>{loading ? '—' : count}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative w-full sm:w-72">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-touchDark/40" />
                    <input
                        type="text" placeholder="Search by ID or customer…"
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-touchPink/30 bg-white focus:outline-none focus:border-touchPink focus:ring-1 focus:ring-touchPink transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'pending', 'delivered'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filter === f ? 'bg-touchDark text-white' : 'bg-white text-touchDark/60 border border-touchPink/20 hover:bg-gray-50'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center">
                        <div className="w-8 h-8 border-2 border-touchPink border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-3">
                        <ShoppingBag size={40} className="text-touchPink/40" />
                        <p className="text-touchDark/50 font-light">No orders found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Order</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Customer</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Date</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Payment</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Total</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Status</th>
                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(order => (
                                    <tr key={order._id} className="hover:bg-gray-50/40 transition-colors">
                                        <td className="px-5 py-3.5 font-mono text-xs text-touchDark/60">
                                            #{order._id.slice(-8).toUpperCase()}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <p className="font-medium text-touchDark">{order.user?.name || 'Unknown'}</p>
                                            <p className="text-xs text-touchDark/40">{order.user?.email || ''}</p>
                                        </td>
                                        <td className="px-5 py-3.5 text-touchDark/60">{formatDate(order.createdAt)}</td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-xs px-2.5 py-1 bg-touchCream/60 text-touchDark/70 rounded-lg font-medium">
                                                {order.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 font-semibold text-touchDark">
                                            ₹{order.totalPrice?.toFixed(2)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {order.isDelivered ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-lg border border-emerald-100">
                                                    <CheckCircle size={11} /> Delivered
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 text-xs font-semibold rounded-lg border border-amber-100">
                                                    <Clock size={11} /> Processing
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            {!order.isDelivered ? (
                                                <button
                                                    onClick={() => markDelivered(order._id)}
                                                    disabled={actionLoadingId === order._id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-touchDark text-white text-xs font-medium rounded-lg hover:bg-touchDark/85 transition-all disabled:opacity-50"
                                                >
                                                    {actionLoadingId === order._id
                                                        ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                        : <><Truck size={12} /> Mark Delivered</>
                                                    }
                                                </button>
                                            ) : (
                                                <span className="text-xs text-touchDark/30 italic">
                                                    {formatDate(order.deliveredAt)}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminOrders;
