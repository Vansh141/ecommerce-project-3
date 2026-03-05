import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Sparkles, Users, Globe } from 'lucide-react';

const values = [
    { icon: <Heart size={24} className="text-touchPink" />, title: 'Crafted with Love', desc: 'Every piece in our collection is selected with care, ensuring quality you can feel.' },
    { icon: <Sparkles size={24} className="text-touchPink" />, title: 'Timeless Elegance', desc: 'We believe fashion should be timeless — pieces that transcend trends and seasons.' },
    { icon: <Users size={24} className="text-touchPink" />, title: 'For Every Woman', desc: 'Inclusive sizing and styles that celebrate women of all shapes, sizes, and stories.' },
    { icon: <Globe size={24} className="text-touchPink" />, title: 'Delivered Across India', desc: 'From Mumbai to Manali — we bring premium fashion to every corner of India.' },
];

const AboutUs = () => (
    <div className="max-w-4xl mx-auto py-12 px-4">

        {/* Hero */}
        <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-touchPink mb-3">Our Story</p>
            <h1 className="text-5xl font-serif text-touchDark tracking-wide mb-6">About TOUCH</h1>
            <p className="text-touchDark/60 font-light text-lg leading-relaxed max-w-2xl mx-auto">
                TOUCH was born from a simple belief — that every woman deserves to feel beautiful,
                confident, and truly herself. We are more than a boutique; we are a feeling.
            </p>
        </div>

        {/* Accent bar */}
        <div className="h-px w-24 bg-gradient-to-r from-touchPink to-touchSage mx-auto mb-16" />

        {/* Story section */}
        <div className="grid md:grid-cols-2 gap-12 mb-20 items-center">
            <div>
                <h2 className="text-3xl font-serif text-touchDark mb-4 tracking-wide">In the process of touching hearts</h2>
                <p className="text-touchDark/60 font-light leading-relaxed mb-4">
                    Founded with a vision to make premium fashion accessible to every Indian woman, TOUCH Boutique
                    curates collections that blend modern aesthetics with timeless elegance.
                </p>
                <p className="text-touchDark/60 font-light leading-relaxed mb-4">
                    Our team travels across the country — and the world — to find pieces that speak to the soul.
                    Each item is carefully vetted for quality, fit, and that indescribable feeling of "this is the one."
                </p>
                <p className="text-touchDark/60 font-light leading-relaxed">
                    We believe fashion is personal. It's not just about clothes — it's about how they make you feel.
                    That's the TOUCH promise.
                </p>
            </div>
            <div className="bg-gradient-to-br from-touchPink/10 to-touchSage/10 rounded-3xl p-10 flex items-center justify-center border border-touchPink/15">
                <div className="text-center">
                    <p className="text-7xl font-serif text-touchDark tracking-[0.3em] font-bold mb-3">TOUCH</p>
                    <p className="text-xs text-touchDark/40 tracking-[0.4em] uppercase">In the process of touching hearts</p>
                    <div className="mt-6 flex justify-center gap-8">
                        {[['500+', 'Products'], ['10K+', 'Customers'], ['4.9★', 'Rating']].map(([num, label]) => (
                            <div key={label} className="text-center">
                                <p className="text-xl font-bold text-touchPink font-serif">{num}</p>
                                <p className="text-xs text-touchDark/50 tracking-widest uppercase mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Values */}
        <div className="mb-16">
            <h2 className="text-3xl font-serif text-touchDark text-center mb-10 tracking-wide">What We Stand For</h2>
            <div className="grid sm:grid-cols-2 gap-6">
                {values.map(({ icon, title, desc }) => (
                    <div key={title} className="bg-white rounded-2xl border border-touchPink/10 p-6 shadow-sm hover:shadow-md hover:border-touchPink/25 transition-all">
                        <div className="w-12 h-12 bg-touchPink/10 rounded-xl flex items-center justify-center mb-4">{icon}</div>
                        <h3 className="font-serif text-touchDark text-lg mb-2">{title}</h3>
                        <p className="text-touchDark/55 text-sm font-light leading-relaxed">{desc}</p>
                    </div>
                ))}
            </div>
        </div>

        {/* CTA */}
        <div className="bg-touchDark rounded-3xl p-10 text-center">
            <h2 className="text-3xl font-serif text-white tracking-wide mb-3">Ready to feel the TOUCH?</h2>
            <p className="text-white/60 font-light mb-6">Explore our latest collections and find your perfect piece.</p>
            <Link to="/search" className="inline-flex items-center gap-2 bg-touchPink text-touchDark font-semibold px-8 py-3.5 rounded-xl hover:bg-touchPink/85 transition-all">
                Shop Now
            </Link>
        </div>
    </div>
);

export default AboutUs;
