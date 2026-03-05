import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    User, Mail, Lock, Eye, EyeOff, CheckCircle,
    AlertCircle, Package, Shield, Edit2, Save, X, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Profile = () => {
    const { userInfo, setUserInfo } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState(userInfo?.name || '');
    const [email] = useState(userInfo?.email || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    const [editingProfile, setEditingProfile] = useState(false);
    const [editingPassword, setEditingPassword] = useState(false);

    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
    const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

    // ── Update Name ─────────────────────────────────────────────────────────
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setProfileLoading(true);
        setProfileMsg({ type: '', text: '' });
        try {
            const { data } = await api.put('/users/profile', { name });
            // Update context + localStorage atomically
            const updated = { ...userInfo, name: data.name };
            setUserInfo(updated);
            setProfileMsg({ type: 'success', text: 'Name updated successfully!' });
            setEditingProfile(false);
        } catch (err) {
            setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
        } finally {
            setProfileLoading(false);
        }
    };

    // ── Update Password ──────────────────────────────────────────────────────
    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setPasswordMsg({ type: '', text: '' });
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }
        setPasswordLoading(true);
        try {
            await api.put('/users/profile', { password: newPassword });
            setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setEditingPassword(false);
        } catch (err) {
            setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' });
        } finally {
            setPasswordLoading(false);
        }
    };

    const initials = userInfo?.name
        ? userInfo.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    return (
        <div className="max-w-3xl mx-auto py-10 px-4 w-full">

            {/* Page Header */}
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-touchPink/20">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center justify-center w-9 h-9 rounded-xl border border-touchPink/20 text-touchDark/50 hover:text-touchPink hover:border-touchPink/40 hover:bg-touchPink/5 transition-all shrink-0"
                    aria-label="Go back"
                >
                    <ArrowLeft size={17} />
                </button>
                <div className="flex-1">
                    <h1 className="text-3xl font-serif text-touchDark tracking-wide">My Profile</h1>
                    <p className="text-touchDark/50 font-light text-sm mt-1 tracking-wide">
                        Manage your account details
                    </p>
                </div>
                <Link
                    to="/orders"
                    className="hidden sm:inline-flex items-center gap-2 text-sm text-touchDark/60 hover:text-touchPink font-medium transition-colors"
                >
                    <Package size={16} /> My Orders
                </Link>
            </div>

            {/* Avatar + Info card */}
            <div className="bg-white rounded-3xl border border-touchPink/10 shadow-sm overflow-hidden mb-6 relative">
                <div className="h-1 w-full bg-gradient-to-r from-touchPink via-touchCream to-touchSage" />
                <div className="p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-touchPink/40 to-touchSage/40 flex items-center justify-center text-touchDark text-2xl font-bold font-serif shrink-0 shadow-sm border border-touchPink/20">
                        {initials}
                    </div>
                    <div className="text-center sm:text-left">
                        <h2 className="text-xl font-serif text-touchDark">{userInfo?.name}</h2>
                        <p className="text-touchDark/50 text-sm font-light mt-1">{userInfo?.email}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                            {userInfo?.isAdmin && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-touchSage/10 text-touchSage text-xs font-semibold rounded-lg border border-touchSage/20">
                                    <Shield size={11} /> Admin
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-touchPink/10 text-touchPink text-xs font-semibold rounded-lg border border-touchPink/20">
                                <CheckCircle size={11} /> Verified Account
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Update Name Section ── */}
            <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden mb-5">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <User size={17} className="text-touchPink" />
                        <h2 className="font-serif text-touchDark tracking-wide">Personal Information</h2>
                    </div>
                    {!editingProfile && (
                        <button
                            onClick={() => { setEditingProfile(true); setProfileMsg({ type: '', text: '' }); }}
                            className="inline-flex items-center gap-1.5 text-xs text-touchDark/50 hover:text-touchPink font-medium transition-colors"
                        >
                            <Edit2 size={13} /> Edit
                        </button>
                    )}
                </div>

                <div className="px-6 py-5">
                    {profileMsg.text && (
                        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mb-4 ${profileMsg.type === 'success'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-red-50 text-red-500 border border-red-100'
                            }`}>
                            {profileMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                            {profileMsg.text}
                        </div>
                    )}

                    {editingProfile ? (
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div>
                                <label className="block text-xs text-touchDark/50 font-medium mb-1.5 tracking-wide uppercase">Display Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    className="w-full border border-touchPink/30 rounded-xl px-4 py-3 text-sm text-touchDark outline-none focus:ring-2 focus:ring-touchPink/30 focus:border-touchPink transition-all"
                                    placeholder="Your full name"
                                />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="submit"
                                    disabled={profileLoading}
                                    className="inline-flex items-center gap-2 bg-touchDark text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-touchDark/85 transition-all disabled:opacity-60 active:scale-[0.97]"
                                >
                                    <Save size={14} />
                                    {profileLoading ? 'Saving…' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setEditingProfile(false); setName(userInfo?.name || ''); setProfileMsg({ type: '', text: '' }); }}
                                    className="inline-flex items-center gap-1.5 text-sm text-touchDark/50 hover:text-red-400 font-medium transition-colors px-3"
                                >
                                    <X size={14} /> Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-touchCream rounded-lg flex items-center justify-center shrink-0">
                                    <User size={14} className="text-touchPink" />
                                </div>
                                <div>
                                    <p className="text-xs text-touchDark/40 font-medium uppercase tracking-wide mb-0.5">Name</p>
                                    <p className="text-sm font-medium text-touchDark">{userInfo?.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-touchCream rounded-lg flex items-center justify-center shrink-0">
                                    <Mail size={14} className="text-touchPink" />
                                </div>
                                <div>
                                    <p className="text-xs text-touchDark/40 font-medium uppercase tracking-wide mb-0.5">Email</p>
                                    <p className="text-sm font-medium text-touchDark">{userInfo?.email}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Change Password Section ── */}
            <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lock size={17} className="text-touchPink" />
                        <h2 className="font-serif text-touchDark tracking-wide">Change Password</h2>
                    </div>
                    {!editingPassword && (
                        <button
                            onClick={() => { setEditingPassword(true); setPasswordMsg({ type: '', text: '' }); }}
                            className="inline-flex items-center gap-1.5 text-xs text-touchDark/50 hover:text-touchPink font-medium transition-colors"
                        >
                            <Edit2 size={13} /> Change
                        </button>
                    )}
                </div>

                <div className="px-6 py-5">
                    {passwordMsg.text && (
                        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mb-4 ${passwordMsg.type === 'success'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-red-50 text-red-500 border border-red-100'
                            }`}>
                            {passwordMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                            {passwordMsg.text}
                        </div>
                    )}

                    {editingPassword ? (
                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            {/* New Password */}
                            <div>
                                <label className="block text-xs text-touchDark/50 font-medium mb-1.5 tracking-wide uppercase">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNewPw ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                        className="w-full border border-touchPink/30 rounded-xl px-4 py-3 pr-11 text-sm text-touchDark outline-none focus:ring-2 focus:ring-touchPink/30 focus:border-touchPink transition-all"
                                        placeholder="Min. 6 characters"
                                    />
                                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-touchDark/30 hover:text-touchDark/60 transition-colors">
                                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs text-touchDark/50 font-medium mb-1.5 tracking-wide uppercase">Confirm New Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPw ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full border border-touchPink/30 rounded-xl px-4 py-3 pr-11 text-sm text-touchDark outline-none focus:ring-2 focus:ring-touchPink/30 focus:border-touchPink transition-all"
                                        placeholder="Re-enter new password"
                                    />
                                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-touchDark/30 hover:text-touchDark/60 transition-colors">
                                        {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="inline-flex items-center gap-2 bg-touchDark text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-touchDark/85 transition-all disabled:opacity-60 active:scale-[0.97]"
                                >
                                    <Lock size={14} />
                                    {passwordLoading ? 'Updating…' : 'Update Password'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setEditingPassword(false); setNewPassword(''); setConfirmPassword(''); setCurrentPassword(''); setPasswordMsg({ type: '', text: '' }); }}
                                    className="inline-flex items-center gap-1.5 text-sm text-touchDark/50 hover:text-red-400 font-medium transition-colors px-3"
                                >
                                    <X size={14} /> Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-touchCream rounded-lg flex items-center justify-center shrink-0">
                                <Lock size={14} className="text-touchPink" />
                            </div>
                            <div>
                                <p className="text-xs text-touchDark/40 font-medium uppercase tracking-wide mb-0.5">Password</p>
                                <p className="text-sm font-medium text-touchDark tracking-[0.25em]">••••••••</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
