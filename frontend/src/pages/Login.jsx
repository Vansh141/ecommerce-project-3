import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, ArrowRight } from 'lucide-react';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register, userInfo } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Determine redirect logic
    const redirect = location.search ? location.search.split('=')[1] : '/';

    useEffect(() => {
        if (userInfo) {
            navigate(redirect);
        }
    }, [navigate, userInfo, redirect]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(name, email, password);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-16 md:py-24 max-w-7xl mx-auto px-4 lg:px-0 min-h-[70vh] flex flex-col items-center justify-center">

            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-touchPink/20 w-full max-w-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-touchPink via-touchCream to-touchSage"></div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif text-touchDark mb-2">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-touchDark/60 font-light tracking-wide text-sm">
                        {isLogin
                            ? 'Enter your details to access your boutique account.'
                            : 'Join us to track orders and save your favorites.'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-500 text-sm font-medium px-4 py-3 rounded-xl mb-6 text-center border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-semibold text-touchDark/70 uppercase tracking-widest mb-2">Full Name</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-touchDark/40">
                                    <User size={18} />
                                </span>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    placeholder="Jane Doe"
                                    className="w-full bg-touchCream/30 border border-touchPink/20 rounded-xl py-3 pl-12 pr-4 text-touchDark placeholder-touchDark/40 focus:outline-none focus:border-touchPink focus:ring-1 focus:ring-touchPink transition-all"
                                />
                            </div>
                        </div>
                    )}

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

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-semibold text-touchDark/70 uppercase tracking-widest">Password</label>
                            {isLogin && <Link to="/forgot-password" className="text-xs text-touchPink font-medium hover:text-touchDark transition-colors">Forgot?</Link>}
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-touchDark/40">
                                <Lock size={18} />
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full bg-touchCream/30 border border-touchPink/20 rounded-xl py-3 pl-12 pr-4 text-touchDark placeholder-touchDark/40 focus:outline-none focus:border-touchPink focus:ring-1 focus:ring-touchPink transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-touchDark text-white rounded-xl py-3.5 mt-2 flex justify-center items-center gap-2 font-serif tracking-wide hover:bg-touchDark/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                {isLogin ? 'Sign In' : 'Create Account'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center bg-gray-50/50 -mx-8 -mb-8 p-6 lg:p-8 rounded-b-3xl border-t border-gray-100">
                    <p className="text-sm text-touchDark/70 font-light tracking-wide">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="font-medium text-touchDark border-b border-touchDark hover:text-touchPink hover:border-touchPink transition-colors pb-0.5 ml-1"
                        >
                            {isLogin ? 'Register Here' : 'Log In'}
                        </button>
                    </p>
                </div>
            </div>

        </div>
    );
};

export default Login;
