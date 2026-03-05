import React, { useState } from 'react';
import { RotateCcw, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const faqs = [
    { q: 'How do I initiate a return?', a: 'Email us at support@touchfashion.in with your order ID, item(s) to return, and reason. We\'ll guide you through the next steps within 24 hours.' },
    { q: 'How long do I have to return an item?', a: 'You can return eligible items within 7 days of delivery. Items must be unworn, unwashed, and with all original tags attached.' },
    { q: 'When will I get my refund?', a: 'Once we receive and inspect the returned item, your refund is processed within 5–7 business days to the original payment method.' },
    { q: 'Can I exchange for a different size?', a: 'Yes! Exchanges for a different size are available subject to stock. Just email us and we\'ll arrange a pickup and re-delivery.' },
    { q: 'What if I received a damaged item?', a: 'We\'re so sorry! Please email us within 48 hours of delivery with photos of the damage and your order ID. We\'ll resolve it immediately.' },
];

const ReturnsPage = () => {
    const [open, setOpen] = useState(null);
    return (
        <div className="max-w-3xl mx-auto py-12 px-4">

            {/* Header */}
            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-touchPink/15">
                <div className="w-12 h-12 bg-touchPink/10 rounded-xl flex items-center justify-center">
                    <RotateCcw size={22} className="text-touchPink" />
                </div>
                <div>
                    <h1 className="text-4xl font-serif text-touchDark tracking-wide">Returns & Exchanges</h1>
                    <p className="text-touchDark/40 text-sm font-light mt-1">7-day hassle-free return policy</p>
                </div>
            </div>

            {/* Policy highlights */}
            <div className="grid sm:grid-cols-3 gap-4 mb-12">
                {[
                    { icon: <Clock size={20} className="text-touchPink" />, label: '7-Day Window', sub: 'From date of delivery' },
                    { icon: <CheckCircle size={20} className="text-emerald-500" />, label: 'Free Returns', sub: 'No questions asked' },
                    { icon: <RotateCcw size={20} className="text-touchPink" />, label: 'Easy Exchange', sub: 'Size swaps welcome' },
                ].map(({ icon, label, sub }) => (
                    <div key={label} className="bg-white border border-touchPink/10 rounded-2xl p-5 text-center shadow-sm">
                        <div className="w-10 h-10 bg-touchPink/10 rounded-xl flex items-center justify-center mx-auto mb-3">{icon}</div>
                        <p className="font-serif text-touchDark font-semibold">{label}</p>
                        <p className="text-touchDark/50 text-xs font-light mt-1">{sub}</p>
                    </div>
                ))}
            </div>

            {/* Eligible / Non-eligible */}
            <div className="grid sm:grid-cols-2 gap-6 mb-12">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
                    <h3 className="text-emerald-700 font-serif text-lg mb-4 flex items-center gap-2"><CheckCircle size={18} /> Eligible for Return</h3>
                    <ul className="space-y-2 text-sm text-emerald-700/80 font-light">
                        {['Unworn & unwashed items', 'Original tags intact', 'Returned within 7 days', 'Item in original packaging', 'Wrong item delivered'].map(i => (
                            <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />{i}</li>
                        ))}
                    </ul>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                    <h3 className="text-red-600 font-serif text-lg mb-4 flex items-center gap-2"><XCircle size={18} /> Not Eligible</h3>
                    <ul className="space-y-2 text-sm text-red-600/80 font-light">
                        {['Worn or washed items', 'Tags removed', 'Returned after 7 days', 'Sale / clearance items', 'Innerwear & accessories'].map(i => (
                            <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{i}</li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* FAQ accordion */}
            <h2 className="text-2xl font-serif text-touchDark mb-5 tracking-wide">Frequently Asked Questions</h2>
            <div className="space-y-3 mb-12">
                {faqs.map((faq, i) => (
                    <div key={i} className="bg-white border border-touchPink/10 rounded-2xl overflow-hidden shadow-sm">
                        <button
                            onClick={() => setOpen(open === i ? null : i)}
                            className="w-full flex items-center justify-between px-6 py-4 text-left"
                        >
                            <span className="font-medium text-touchDark text-sm">{faq.q}</span>
                            {open === i ? <ChevronUp size={16} className="text-touchPink shrink-0" /> : <ChevronDown size={16} className="text-touchDark/40 shrink-0" />}
                        </button>
                        {open === i && (
                            <div className="px-6 pb-4 text-sm text-touchDark/60 font-light leading-relaxed border-t border-gray-50 pt-3">
                                {faq.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* CTA */}
            <div className="bg-touchDark rounded-2xl p-6 text-center">
                <p className="text-white font-serif text-xl mb-2 tracking-wide">Ready to return?</p>
                <p className="text-white/60 text-sm font-light mb-5">Email us your order ID and we'll take it from there.</p>
                <a href="mailto:support@touchfashion.in"
                    className="inline-flex items-center gap-2 bg-touchPink text-touchDark font-semibold px-6 py-3 rounded-xl hover:bg-touchPink/85 transition-all text-sm">
                    Email Support
                </a>
            </div>
        </div>
    );
};

export default ReturnsPage;
