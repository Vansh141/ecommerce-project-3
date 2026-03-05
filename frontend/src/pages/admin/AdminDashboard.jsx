import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ShoppingBag, Package, TrendingUp, ArrowRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
    <div className="bg-white rounded-2xl p-6 border border-touchPink/10 shadow-sm hover:shadow-md transition-shadow flex items-center gap-5">
        <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center shrink-0`}>
            <Icon size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-touchDark/50 uppercase tracking-widest font-semibold mb-1">{label}</p>
            <p className="text-3xl font-bold text-touchDark tracking-tight">{value ?? '—'}</p>
            {sub && <p className="text-xs text-touchDark/40 mt-0.5">{sub}</p>}
        </div>
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const [statsRes, ordersRes] = await Promise.all([
                    api.get('/users/admin/stats'),
                    api.get('/orders/admin/all'),
                ]);
                setStats(statsRes.data);
                setRecentOrders(ordersRes.data.slice(0, 6));
            } catch (err) {
                console.error('Dashboard fetch error:', err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    const formatCurrency = (val) =>
        typeof val === 'number' ? `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

    const formatDate = (d) =>
        d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <div className="space-y-8">

            {/* Stats Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-touchPink/10 shadow-sm animate-pulse h-28" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    <StatCard label="Total Users" value={stats?.totalUsers} icon={Users} color="bg-touchSage" />
                    <StatCard label="Total Orders" value={stats?.totalOrders} icon={ShoppingBag} color="bg-indigo-500" />
                    <StatCard label="Total Products" value={stats?.totalProducts} icon={Package} color="bg-touchPink" sub="Active listings" />
                    <StatCard
                        label="Total Revenue"
                        value={formatCurrency(stats?.totalRevenue)}
                        icon={TrendingUp}
                        color="bg-emerald-500"
                        sub="All time"
                    />
                </div>
            )}

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-serif text-touchDark tracking-wide mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { to: '/admin/products', label: 'Manage Products', desc: 'Add, edit, or remove listings', icon: Package, color: 'from-touchPink/20 to-touchCream/50' },
                        { to: '/admin/orders', label: 'View Orders', desc: 'Track and update delivery status', icon: ShoppingBag, color: 'from-indigo-50 to-blue-50' },
                        { to: '/admin/users', label: 'Manage Users', desc: 'View and manage customer accounts', icon: Users, color: 'from-touchSage/10 to-emerald-50' },
                    ].map(({ to, label, desc, icon: Icon, color }) => (
                        <Link
                            key={to} to={to}
                            className={`bg-gradient-to-br ${color} border border-touchPink/10 rounded-2xl p-5 hover:shadow-md transition-all group flex items-center justify-between`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <Icon size={20} className="text-touchDark/70" />
                                </div>
                                <div>
                                    <p className="font-semibold text-touchDark text-sm tracking-wide">{label}</p>
                                    <p className="text-xs text-touchDark/50 font-light mt-0.5">{desc}</p>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-touchDark/30 group-hover:text-touchDark/70 group-hover:translate-x-1 transition-all" />
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Orders */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-serif text-touchDark tracking-wide">Recent Orders</h2>
                    <Link to="/admin/orders" className="text-sm text-touchPink hover:text-touchSage font-medium transition-colors flex items-center gap-1">
                        View all <ArrowRight size={14} />
                    </Link>
                </div>

                <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-touchDark/40 animate-pulse">Loading orders...</div>
                    ) : recentOrders.length === 0 ? (
                        <div className="p-8 text-center text-touchDark/40">No orders yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-100">
                                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Order ID</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Customer</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Date</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Total</th>
                                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {recentOrders.map(order => (
                                        <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-5 py-3.5 font-mono text-xs text-touchDark/60">
                                                {order._id.slice(-8).toUpperCase()}
                                            </td>
                                            <td className="px-5 py-3.5 font-medium text-touchDark">
                                                {order.user?.name || 'Unknown'}
                                            </td>
                                            <td className="px-5 py-3.5 text-touchDark/60">{formatDate(order.createdAt)}</td>
                                            <td className="px-5 py-3.5 font-semibold text-touchDark">₹{order.totalPrice?.toFixed(2)}</td>
                                            <td className="px-5 py-3.5">
                                                {order.isDelivered ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-lg border border-emerald-100">
                                                        <CheckCircle size={12} /> Delivered
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 text-xs font-semibold rounded-lg border border-amber-100">
                                                        <Clock size={12} /> Processing
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
        </div>
    );
};

export default AdminDashboard;
