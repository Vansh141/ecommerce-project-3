import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(5);

    // Auto-redirect countdown after success
    useEffect(() => {
        if (!success) return;
        if (countdown === 0) {
            navigate('/login');
            return;
        }
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [success, countdown, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Client-side validation
        if (password.length < 6) {
            return setError('Password must be at least 6 characters long.');
        }
        if (password !== confirmPassword) {
            return setError('Passwords do not match. Please verify.');
        }

        setLoading(true);

        try {
            const { data } = await api.post(`/users/reset-password/${token}`, { password });
            // Success — trigger the countdown screen
            setSuccess(true);
        } catch (err) {
            const msg = err.response?.data?.message;
            setError(msg || 'Failed to reset password. The link may be invalid or expired.');
        } finally {
            setLoading(false);
        }
    };

    // ── Success Screen ──────────────────────────────────────────────────────────
    if (success) {
        return (
            <div className="py-24 max-w-7xl mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="bg-white rounded-3xl p-10 shadow-sm border border-touchPink/20 w-full max-w-md text-center relative overflow-hidden">
                    {/* Top accent bar */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-touchPink via-touchCream to-touchSage"></div>

                    {/* Animated check circle */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                                <CheckCircle className="text-emerald-500" size={44} strokeWidth={1.5} />
                            </div>
                            <span className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full animate-ping opacity-60"></span>
                        </div>
                    </div>

                    <h2 className="text-3xl font-serif text-touchDark mb-3">Password Reset!</h2>
                    <p className="text-touchDark/60 mb-2 font-light tracking-wide text-sm leading-relaxed">
                        Your account has been securely updated.<br />You can now log in with your new credentials.
                    </p>

                    {/* Countdown */}
                    <p className="text-touchDark/40 text-xs mb-8">
                        Redirecting to login in <span className="font-semibold text-touchDark/60">{countdown}</span>s...
                    </p>

                    <Link
                        to="/login"
                        className="inline-block bg-touchDark text-white px-8 py-3.5 rounded-xl font-medium shadow-sm hover:bg-touchDark/90 transition-all active:scale-[0.98]"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    // ── Password Strength Indicator ──────────────────────────────────────────────
    const getStrength = (pwd) => {
        if (!pwd) return { level: 0, label: '', color: '' };
        if (pwd.length < 6) return { level: 1, label: 'Too short', color: 'bg-red-400' };
        if (pwd.length < 8) return { level: 2, label: 'Weak', color: 'bg-orange-400' };
        const hasUpper = /[A-Z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
        const extras = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
        if (extras === 3) return { level: 4, label: 'Strong', color: 'bg-emerald-500' };
        if (extras >= 1) return { level: 3, label: 'Good', color: 'bg-blue-400' };
        return { level: 2, label: 'Weak', color: 'bg-orange-400' };
    };

    const strength = getStrength(password);

    // ── Main Form ────────────────────────────────────────────────────────────────
    return (
        <div className="py-16 md:py-24 max-w-7xl mx-auto px-4 lg:px-0 min-h-[70vh] flex flex-col items-center justify-center">

            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-touchPink/20 w-full max-w-md relative overflow-hidden">
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-touchPink via-touchCream to-touchSage"></div>

                {/* Back link */}
                <Link
                    to="/login"
                    className="inline-flex items-center text-touchDark/50 hover:text-touchPink transition-colors mb-6 text-sm font-medium"
                >
                    <ArrowLeft size={16} className="mr-1" />
                    Back to Login
                </Link>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif text-touchDark mb-2">New Password</h1>
                    <p className="text-touchDark/60 font-light tracking-wide text-sm">
                        Create a strong, secure password for your TOUCH boutique account.
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 text-red-500 text-sm font-medium px-4 py-3 rounded-xl mb-6 flex items-start gap-2 border border-red-100">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* New Password */}
                    <div>
                        <label className="block text-xs font-semibold text-touchDark/70 uppercase tracking-widest mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-touchDark/40">
                                <Lock size={18} />
                            </span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="••••••••"
                                className="w-full bg-touchCream/30 border border-touchPink/20 rounded-xl py-3 pl-12 pr-12 text-touchDark placeholder-touchDark/40 focus:outline-none focus:border-touchPink focus:ring-1 focus:ring-touchPink transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-touchDark/40 hover:text-touchDark/70 transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Password Strength Bar */}
                        {password && (
                            <div className="mt-2">
                                <div className="flex gap-1 mb-1">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.level ? strength.color : 'bg-touchPink/20'}`}
                                        />
                                    ))}
                                </div>
                                {strength.label && (
                                    <p className="text-xs text-touchDark/50">{strength.label}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-xs font-semibold text-touchDark/70 uppercase tracking-widest mb-2">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-touchDark/40">
                                <Lock size={18} />
                            </span>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className={`w-full bg-touchCream/30 border rounded-xl py-3 pl-12 pr-12 text-touchDark placeholder-touchDark/40 focus:outline-none transition-all ${confirmPassword && confirmPassword !== password
                                        ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-300'
                                        : confirmPassword && confirmPassword === password
                                            ? 'border-emerald-300 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300'
                                            : 'border-touchPink/20 focus:border-touchPink focus:ring-1 focus:ring-touchPink'
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword((v) => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-touchDark/40 hover:text-touchDark/70 transition-colors"
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {/* Match hint */}
                        {confirmPassword && confirmPassword !== password && (
                            <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                        )}
                        {confirmPassword && confirmPassword === password && (
                            <p className="text-xs text-emerald-500 mt-1">✓ Passwords match</p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-touchDark text-white rounded-xl py-3.5 mt-2 flex justify-center items-center gap-2 font-serif tracking-wide hover:bg-touchDark/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                Reset Password
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>

                </form>
            </div>

        </div>
    );
};

export default ResetPassword;
