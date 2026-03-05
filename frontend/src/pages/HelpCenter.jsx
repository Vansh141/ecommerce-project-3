import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Package, CreditCard, Truck, User, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

const categories = [
    {
        icon: <Package size={18} className="text-touchPink" />, label: 'Orders',
        faqs: [
            { q: 'How do I track my order?', a: 'Once your order is dispatched, you\'ll receive a tracking link via email. You can also view all your orders in My Orders page.' },
            { q: 'Can I cancel or modify my order?', a: 'Orders can be cancelled within 1 hour of placement. After that, please email support@touchfashion.in as soon as possible.' },
            { q: 'What if my order hasn\'t arrived?', a: 'If your order is delayed beyond the estimated delivery date, please contact us at support@touchfashion.in with your order ID.' },
        ],
    },
    {
        icon: <CreditCard size={18} className="text-touchPink" />, label: 'Payments',
        faqs: [
            { q: 'What payment methods do you accept?', a: 'We accept UPI, credit/debit cards, net banking, and Cash on Delivery (COD) for eligible orders.' },
            { q: 'Is my payment information secure?', a: 'Absolutely. All transactions are encrypted with SSL. We never store your card details on our servers.' },
            { q: 'When will I be charged?', a: 'For online payments, you are charged at the time of order placement. For COD, payment is collected on delivery.' },
        ],
    },
    {
        icon: <Truck size={18} className="text-touchPink" />, label: 'Shipping',
        faqs: [
            { q: 'How long does delivery take?', a: 'Metro cities: 2–3 business days. Tier-2 cities: 3–5 days. Rest of India: 5–7 days. See our Shipping Info page for full details.' },
            { q: 'Do you offer free shipping?', a: 'Yes! Free shipping on all orders above ₹999. Orders below ₹999 have a nominal delivery charge of ₹49–₹79.' },
            { q: 'Do you ship internationally?', a: 'We currently ship within India only. International shipping is in the works — stay tuned!' },
        ],
    },
    {
        icon: <RotateCcw size={18} className="text-touchPink" />, label: 'Returns',
        faqs: [
            { q: 'What is your return policy?', a: 'We offer a 7-day hassle-free return policy for unworn, unwashed items with original tags attached.' },
            { q: 'How do I start a return?', a: 'Email support@touchfashion.in with your order ID and the item(s) you wish to return. We\'ll guide you from there.' },
            { q: 'When will I receive my refund?', a: 'Refunds are processed within 5–7 business days after we receive and inspect the returned item.' },
        ],
    },
    {
        icon: <User size={18} className="text-touchPink" />, label: 'Account',
        faqs: [
            { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page. We\'ll send a reset link to your registered email.' },
            { q: 'Can I change my email address?', a: 'For account email changes, please contact our support team directly at support@touchfashion.in.' },
            { q: 'How do I delete my account?', a: 'To delete your account and all associated data, please email us and we will process the request within 48 hours.' },
        ],
    },
];

const HelpCenter = () => {
    const [activeCategory, setActiveCategory] = useState(0);
    const [openFaq, setOpenFaq] = useState(null);

    const handleCategory = (i) => { setActiveCategory(i); setOpenFaq(null); };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">

            {/* Header */}
            <div className="text-center mb-12">
                <div className="w-16 h-16 bg-touchPink/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <HelpCircle size={28} className="text-touchPink" />
                </div>
                <h1 className="text-4xl font-serif text-touchDark tracking-wide mb-3">Help Center</h1>
                <p className="text-touchDark/55 font-light max-w-md mx-auto">
                    Find answers to common questions. Can't find what you need? <a href="mailto:support@touchfashion.in" className="text-touchPink hover:underline">Contact us</a>.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Category tabs */}
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible shrink-0 md:w-44">
                    {categories.map((cat, i) => (
                        <button key={cat.label} onClick={() => handleCategory(i)}
                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all text-left
                                ${activeCategory === i ? 'bg-touchDark text-white shadow-sm' : 'bg-white border border-touchPink/10 text-touchDark/60 hover:border-touchPink/30 hover:text-touchDark'}`}>
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>

                {/* FAQ panels */}
                <div className="flex-1 space-y-3">
                    {categories[activeCategory].faqs.map((faq, i) => (
                        <div key={i} className="bg-white border border-touchPink/10 rounded-2xl overflow-hidden shadow-sm">
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full flex items-center justify-between px-6 py-4 text-left"
                            >
                                <span className="font-medium text-touchDark text-sm">{faq.q}</span>
                                {openFaq === i
                                    ? <ChevronUp size={16} className="text-touchPink shrink-0" />
                                    : <ChevronDown size={16} className="text-touchDark/40 shrink-0" />}
                            </button>
                            {openFaq === i && (
                                <div className="px-6 pb-5 text-sm text-touchDark/60 font-light leading-relaxed border-t border-gray-50 pt-3">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Links */}
            <div className="mt-12 grid sm:grid-cols-3 gap-4">
                {[
                    { label: 'Track My Order', to: '/orders', desc: 'View all your orders' },
                    { label: 'Returns Policy', to: '/returns', desc: '7-day hassle-free returns' },
                    { label: 'Contact Us', to: '/contact', desc: 'We reply within 24–48 hrs' },
                ].map(({ label, to, desc }) => (
                    <Link key={label} to={to}
                        className="bg-white border border-touchPink/10 rounded-2xl p-5 shadow-sm hover:border-touchPink/30 hover:shadow-md transition-all group">
                        <p className="font-serif text-touchDark group-hover:text-touchPink transition-colors mb-1">{label}</p>
                        <p className="text-touchDark/50 text-xs font-light">{desc}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default HelpCenter;
