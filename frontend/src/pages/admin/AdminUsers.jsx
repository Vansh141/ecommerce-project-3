import React, { useEffect, useState, useCallback } from 'react';
import { Trash2, Shield, ShieldOff, AlertCircle, X, Search, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const AdminUsers = () => {
    const { userInfo } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteId, setDeleteId] = useState(null);
    const [roleId, setRoleId] = useState(null); // user whose role we're toggling

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/users/admin/users');
            setUsers(data);
        } catch (err) {
            setError('Failed to load users.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleDelete = async () => {
        if (!deleteId) return;
        setActionLoadingId(deleteId);
        try {
            await api.delete(`/users/admin/users/${deleteId}`);
            setSuccess('User deleted successfully.');
            setUsers(prev => prev.filter(u => u._id !== deleteId));
            setDeleteId(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete user.');
        } finally {
            setActionLoadingId(null);
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const handleToggleRole = async () => {
        if (!roleId) return;
        setActionLoadingId(roleId);
        try {
            const { data } = await api.put(`/users/admin/users/${roleId}/role`);
            setUsers(prev => prev.map(u => u._id === roleId ? { ...u, isAdmin: data.isAdmin } : u));
            setSuccess(`${data.name} is now ${data.isAdmin ? 'an Admin' : 'a Customer'}.`);
            setRoleId(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update role.');
        } finally {
            setActionLoadingId(null);
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const formatDate = (d) =>
        d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const adminCount = users.filter(u => u.isAdmin).length;
    const customerCount = users.filter(u => !u.isAdmin).length;

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
                    { label: 'Total Users', count: users.length, color: 'bg-indigo-50 text-indigo-600' },
                    { label: 'Customers', count: customerCount, color: 'bg-touchCream text-touchDark' },
                    { label: 'Admins', count: adminCount, color: 'bg-touchPink/20 text-touchDark' },
                ].map(({ label, count, color }) => (
                    <div key={label} className={`rounded-2xl px-5 py-4 border border-touchPink/10 ${color.split(' ')[0]}`}>
                        <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${color.split(' ')[1]} opacity-60`}>{label}</p>
                        <p className={`text-2xl font-bold ${color.split(' ')[1]}`}>{loading ? '—' : count}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-touchDark/40" />
                <input
                    type="text" placeholder="Search users…"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-touchPink/30 bg-white focus:outline-none focus:border-touchPink focus:ring-1 focus:ring-touchPink transition-all"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center">
                        <div className="w-8 h-8 border-2 border-touchPink border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-3">
                        <Users size={40} className="text-touchPink/40" />
                        <p className="text-touchDark/50 font-light">No users found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">User</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Email</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Joined</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Role</th>
                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(user => {
                                    const isMe = user._id === userInfo?._id;
                                    return (
                                        <tr key={user._id} className={`hover:bg-gray-50/40 transition-colors ${isMe ? 'bg-touchCream/20' : ''}`}>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-gradient-to-br from-touchPink/60 to-touchSage/60 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                                        {user.name[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-touchDark">
                                                            {user.name}
                                                            {isMe && <span className="ml-2 text-xs text-touchSage font-normal">(you)</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-touchDark/60">{user.email}</td>
                                            <td className="px-5 py-3.5 text-touchDark/60">{formatDate(user.createdAt)}</td>
                                            <td className="px-5 py-3.5">
                                                {user.isAdmin ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-touchPink/20 text-touchDark text-xs font-semibold rounded-lg border border-touchPink/30">
                                                        <Shield size={11} className="text-touchSage" /> Admin
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-touchDark/60 text-xs font-medium rounded-lg border border-gray-100">
                                                        <ShieldOff size={11} /> Customer
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {isMe ? (
                                                    <span className="text-xs text-touchDark/20 italic px-2">Protected</span>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* Role toggle */}
                                                        <button
                                                            onClick={() => setRoleId(user._id)}
                                                            disabled={actionLoadingId === user._id}
                                                            title={user.isAdmin ? 'Demote to Customer' : 'Promote to Admin'}
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50
                                                                ${user.isAdmin
                                                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                                                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
                                                                }`}
                                                        >
                                                            {actionLoadingId === user._id
                                                                ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                                                : user.isAdmin
                                                                    ? <><ShieldOff size={12} /> Demote</>
                                                                    : <><Shield size={12} /> Make Admin</>
                                                            }
                                                        </button>
                                                        {/* Delete — only for customers */}
                                                        {!user.isAdmin && (
                                                            <button
                                                                onClick={() => setDeleteId(user._id)}
                                                                className="p-1.5 rounded-lg text-touchDark/40 hover:text-red-500 hover:bg-red-50 transition-all"
                                                                title="Delete user"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirm Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Trash2 size={28} className="text-red-400" />
                        </div>
                        <h3 className="text-xl font-serif text-touchDark mb-2">Delete User?</h3>
                        <p className="text-sm text-touchDark/50 font-light mb-6">
                            This will permanently remove the user account and cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-touchDark/60 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete} disabled={!!actionLoadingId}
                                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoadingId ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role-change Confirm Modal */}
            {roleId && (() => {
                const target = users.find(u => u._id === roleId);
                const willBeAdmin = target && !target.isAdmin;
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRoleId(null)} />
                        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${willBeAdmin ? 'bg-indigo-50' : 'bg-amber-50'}`}>
                                {willBeAdmin ? <Shield size={28} className="text-indigo-500" /> : <ShieldOff size={28} className="text-amber-500" />}
                            </div>
                            <h3 className="text-xl font-serif text-touchDark mb-2">
                                {willBeAdmin ? 'Promote to Admin?' : 'Demote to Customer?'}
                            </h3>
                            <p className="text-sm text-touchDark/50 font-light mb-1">
                                <strong className="text-touchDark font-medium">{target?.name}</strong>
                            </p>
                            <p className="text-sm text-touchDark/50 font-light mb-6">
                                {willBeAdmin
                                    ? 'This user will gain full admin access to the panel, products, orders and users.'
                                    : 'This user will lose admin access and become a regular customer.'}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setRoleId(null)}
                                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-touchDark/60 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleToggleRole}
                                    disabled={!!actionLoadingId}
                                    className={`flex-1 py-3 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2
                                        ${willBeAdmin ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-amber-500 hover:bg-amber-600'}`}
                                >
                                    {actionLoadingId ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : willBeAdmin ? 'Yes, Promote' : 'Yes, Demote'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default AdminUsers;
