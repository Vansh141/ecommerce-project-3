import React, { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const { data } = await api.post('/users/forgot-password', { email });
            setMessage(data.message || 'Password reset email sent. Please check your inbox.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send password reset email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-16 md:py-24 max-w-7xl mx-auto px-4 lg:px-0 min-h-[70vh] flex flex-col items-center justify-center">

            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-touchPink/20 w-full max-w-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-touchPink via-touchCream to-touchSage"></div>

                <Link to="/login" className="inline-flex items-center text-touchDark/50 hover:text-touchPink transition-colors mb-6 text-sm font-medium">
                    <ArrowLeft size={16} className="mr-1" />
                    Back to Login
                </Link>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif text-touchDark mb-2">Reset Password</h1>
                    <p className="text-touchDark/60 font-light tracking-wide text-sm">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                {message && (
                    <div className="bg-emerald-50 text-emerald-600 text-sm font-medium px-4 py-3 rounded-xl mb-6 text-center border border-emerald-100">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 text-red-500 text-sm font-medium px-4 py-3 rounded-xl mb-6 text-center border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-touchDark/70 uppercase tracking-widest mb-2">Email Address</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-touchDark/40">
                                <Mail size={18} />
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="jane@example.com"
                                className="w-full bg-touchCream/30 border border-touchPink/20 rounded-xl py-3 pl-12 pr-4 text-touchDark placeholder-touchDark/40 focus:outline-none focus:border-touchPink focus:ring-1 focus:ring-touchPink transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !!message}
                        className="w-full bg-touchDark text-white rounded-xl py-3.5 mt-2 flex justify-center items-center gap-2 font-serif tracking-wide hover:bg-touchDark/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                Send Reset Link
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>
            </div>

        </div>
    );
};

export default ForgotPassword;
