import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Heart, Mail, MapPin, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../services/api';

// ── Pinterest icon (not in lucide) ──────────────────────────────────────────
const PinterestIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9 17c.5-2 1.5-5 1.5-5s-.5-1.5 0-3c.5-1.5 2.5-1.5 2.5.5 0 2-1.5 5-1.5 5s1.5 1 3-.5" />
    </svg>
);

const Footer = () => {
    const year = new Date().getFullYear();
    const [subEmail, setSubEmail] = useState('');
    const [subLoading, setSubLoading] = useState(false);
    const [subMsg, setSubMsg] = useState({ type: '', text: '' });

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!subEmail.trim()) return;
        setSubLoading(true);
        setSubMsg({ type: '', text: '' });
        try {
            const { data } = await api.post('/users/subscribe', { email: subEmail });
            setSubMsg({ type: 'success', text: data.message });
            setSubEmail('');
        } catch (err) {
            setSubMsg({ type: 'error', text: err.response?.data?.message || 'Something went wrong. Please try again.' });
        } finally {
            setSubLoading(false);
        }
    };

    return (
        <footer className="bg-touchDark text-white mt-16">

            {/* ── Newsletter strip ─────────────────────────────────────────── */}
            <div className="border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-touchPink mb-1">Stay in the loop</p>
                        <h3 className="text-xl font-serif text-white tracking-wide">Get exclusive offers & new arrivals</h3>
                    </div>
                    <form
                        onSubmit={handleSubscribe}
                        className="flex flex-col gap-2 w-full md:w-auto"
                    >
                        <div className="flex min-w-[320px] border border-white/15 rounded-2xl overflow-hidden bg-white/5 focus-within:border-touchPink/60 transition-all">
                            <div className="flex items-center px-4 text-white/30">
                                <Mail size={16} />
                            </div>
                            <input
                                type="email"
                                value={subEmail}
                                onChange={e => setSubEmail(e.target.value)}
                                placeholder="Your email address"
                                disabled={subLoading}
                                required
                                className="flex-1 bg-transparent py-3 text-sm text-white placeholder-white/30 outline-none disabled:opacity-60"
                            />
                            <button
                                type="submit"
                                disabled={subLoading}
                                className="bg-touchPink text-touchDark px-5 py-3 text-sm font-semibold hover:bg-touchPink/85 transition-colors shrink-0 disabled:opacity-70 flex items-center gap-2"
                            >
                                {subLoading ? <Loader size={15} className="animate-spin" /> : 'Subscribe'}
                            </button>
                        </div>
                        {/* Inline feedback */}
                        {subMsg.text && (
                            <div className={`flex items-center gap-2 text-xs px-1 ${subMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                {subMsg.type === 'success'
                                    ? <CheckCircle size={13} />
                                    : <AlertCircle size={13} />}
                                {subMsg.text}
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* ── Main grid ────────────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

                {/* Brand */}
                <div className="sm:col-span-2 lg:col-span-1">
                    <Link to="/" className="inline-block group mb-5">
                        <span className="text-4xl font-serif tracking-[0.25em] font-bold text-white uppercase block leading-none">
                            TOUCH
                        </span>
                        <span className="text-[10px] text-white/40 tracking-[0.3em] uppercase font-medium block mt-1">
                            In the process of touching hearts
                        </span>
                    </Link>

                    <p className="text-sm text-white/50 font-light leading-relaxed max-w-xs mb-6">
                        Premium fashion crafted with love. Discover pieces that make every moment beautiful.
                    </p>

                    {/* Socials */}
                    <div className="flex items-center gap-3">
                        {[
                            { icon: <Instagram size={17} strokeWidth={1.5} />, href: 'https://www.instagram.com/touchh.in?igsh=NnJqY296ZHJ5OGRt', label: 'Instagram' },
                            { icon: <Facebook size={17} strokeWidth={1.5} />, href: '#', label: 'Facebook' },
                            { icon: <PinterestIcon size={17} />, href: '#', label: 'Pinterest' },
                        ].map(({ icon, href, label }) => (
                            <a
                                key={label}
                                href={href}
                                aria-label={label}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-xl bg-white/8 hover:bg-touchPink hover:text-touchDark border border-white/10 hover:border-transparent flex items-center justify-center text-white/60 hover:text-touchDark transition-all duration-300"
                            >
                                {icon}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Shop */}
                <div>
                    <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-touchPink mb-5">Shop</h4>
                    <ul className="space-y-3">
                        {[
                            { label: 'New Arrivals', to: '/search?q=New Arrivals' },
                            { label: 'Dresses', to: '/search?q=Dresses' },
                            { label: 'Accessories', to: '/search?q=Accessories' },
                            { label: 'Sale', to: '/search?q=Sale', highlight: true },
                            { label: 'All Products', to: '/search' },
                        ].map(({ label, to, highlight }) => (
                            <li key={label}>
                                <Link
                                    to={to}
                                    className={`text-sm font-light transition-colors duration-200 hover:text-touchPink flex items-center gap-1.5 group
                                        ${highlight ? 'text-touchPink font-medium' : 'text-white/55'}`}
                                >
                                    {highlight && <span className="w-1.5 h-1.5 rounded-full bg-touchPink shrink-0" />}
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Company */}
                <div>
                    <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-touchPink mb-5">Company</h4>
                    <ul className="space-y-3">
                        {[
                            { label: 'About Us', to: '/about' },
                            { label: 'Our Story', to: '/about' },
                            { label: 'Contact', to: '/contact' },
                            { label: 'Careers', to: '/contact' },
                        ].map(({ label, to }) => (
                            <li key={label}>
                                <Link to={to} className="text-sm font-light text-white/55 hover:text-touchPink transition-colors duration-200">
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Support + Contact */}
                <div>
                    <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-touchPink mb-5">Support</h4>
                    <ul className="space-y-3 mb-7">
                        {[
                            { label: 'Help Center', to: '/help' },
                            { label: 'Track My Order', to: '/orders' },
                            { label: 'Shipping Info', to: '/shipping-info' },
                            { label: 'Returns', to: '/returns' },
                        ].map(({ label, to }) => (
                            <li key={label}>
                                <Link to={to} className="text-sm font-light text-white/55 hover:text-touchPink transition-colors duration-200">
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* Contact snippet */}
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5 text-xs text-white/40">
                            <Mail size={13} className="text-touchPink/60 shrink-0" />
                            <span>support@touchfashion.in</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-white/40">
                            <MapPin size={13} className="text-touchPink/60 shrink-0" />
                            <span>Mumbai, India</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Bottom bar ───────────────────────────────────────────────── */}
            <div className="border-t border-white/8">
                <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
                    <p>© {year} TOUCH. All rights reserved.</p>
                    <div className="flex items-center gap-1">
                        <span>Made with</span>
                        <Heart size={11} className="text-touchPink fill-touchPink mx-0.5" />
                        <span>in India</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/privacy-policy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-white/60 transition-colors">Terms of Use</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
