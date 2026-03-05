import React, { useState } from 'react';
import { Mail, MapPin, Instagram, MessageCircle, Send, CheckCircle } from 'lucide-react';

const ContactUs = () => {
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [sent, setSent] = useState(false);

    const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = e => {
        e.preventDefault();
        // Open default mail client with pre-filled details
        const mailto = `mailto:support@touchfashion.in?subject=${encodeURIComponent(form.subject || 'Customer Enquiry')}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`;
        window.location.href = mailto;
        setSent(true);
        setForm({ name: '', email: '', subject: '', message: '' });
    };

    return (
        <div className="max-w-5xl mx-auto py-12 px-4">

            {/* Header */}
            <div className="text-center mb-14">
                <p className="text-xs font-semibold tracking-[0.3em] uppercase text-touchPink mb-3">Get in Touch</p>
                <h1 className="text-5xl font-serif text-touchDark tracking-wide mb-4">Contact Us</h1>
                <p className="text-touchDark/55 font-light text-base max-w-xl mx-auto">
                    Have a question, feedback, or just want to say hello? We'd love to hear from you.
                </p>
            </div>

            <div className="grid lg:grid-cols-5 gap-10">

                {/* Contact info sidebar */}
                <div className="lg:col-span-2 space-y-5">

                    <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm p-6">
                        <h2 className="font-serif text-touchDark text-xl mb-5 tracking-wide">Contact Info</h2>
                        <div className="space-y-5">
                            <a href="mailto:support@touchfashion.in" className="flex items-start gap-4 group">
                                <div className="w-10 h-10 bg-touchPink/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-touchPink/20 transition-colors">
                                    <Mail size={18} className="text-touchPink" />
                                </div>
                                <div>
                                    <p className="text-xs text-touchDark/40 uppercase tracking-widest font-semibold mb-0.5">Email</p>
                                    <p className="text-sm text-touchDark font-medium group-hover:text-touchPink transition-colors">support@touchfashion.in</p>
                                </div>
                            </a>

                            <a href="https://www.instagram.com/touchh.in" target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 group">
                                <div className="w-10 h-10 bg-touchPink/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-touchPink/20 transition-colors">
                                    <Instagram size={18} className="text-touchPink" />
                                </div>
                                <div>
                                    <p className="text-xs text-touchDark/40 uppercase tracking-widest font-semibold mb-0.5">Instagram</p>
                                    <p className="text-sm text-touchDark font-medium group-hover:text-touchPink transition-colors">@touchh.in</p>
                                </div>
                            </a>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-touchPink/10 rounded-xl flex items-center justify-center shrink-0">
                                    <MapPin size={18} className="text-touchPink" />
                                </div>
                                <div>
                                    <p className="text-xs text-touchDark/40 uppercase tracking-widest font-semibold mb-0.5">Location</p>
                                    <p className="text-sm text-touchDark font-medium">Mumbai, India</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-touchDark rounded-2xl p-6 text-white">
                        <div className="flex items-center gap-3 mb-3">
                            <MessageCircle size={20} className="text-touchPink" />
                            <h3 className="font-serif tracking-wide">Response Time</h3>
                        </div>
                        <p className="text-white/60 text-sm font-light leading-relaxed">
                            We typically respond within <strong className="text-white font-medium">24–48 hours</strong> on business days.
                            For urgent queries, reach out via Instagram DM for a faster response.
                        </p>
                    </div>
                </div>

                {/* Form */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden">
                        <div className="h-1 w-full bg-gradient-to-r from-touchPink via-touchCream to-touchSage" />
                        <div className="p-8">
                            {sent ? (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={32} className="text-emerald-500" />
                                    </div>
                                    <h3 className="text-xl font-serif text-touchDark mb-2">Message Sent!</h3>
                                    <p className="text-touchDark/50 text-sm font-light">Your email client should have opened. We'll respond within 24–48 hours.</p>
                                    <button onClick={() => setSent(false)} className="mt-6 text-sm text-touchPink hover:underline">Send another message</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-touchDark/60 uppercase tracking-widest mb-1.5">Your Name</label>
                                            <input name="name" value={form.name} onChange={handleChange} required placeholder="Priya Sharma"
                                                className="w-full px-4 py-3 rounded-xl border border-touchPink/30 text-sm text-touchDark outline-none focus:ring-2 focus:ring-touchPink/30 focus:border-touchPink transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-touchDark/60 uppercase tracking-widest mb-1.5">Email</label>
                                            <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="priya@gmail.com"
                                                className="w-full px-4 py-3 rounded-xl border border-touchPink/30 text-sm text-touchDark outline-none focus:ring-2 focus:ring-touchPink/30 focus:border-touchPink transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-touchDark/60 uppercase tracking-widest mb-1.5">Subject</label>
                                        <input name="subject" value={form.subject} onChange={handleChange} placeholder="Order query, product question, feedback…"
                                            className="w-full px-4 py-3 rounded-xl border border-touchPink/30 text-sm text-touchDark outline-none focus:ring-2 focus:ring-touchPink/30 focus:border-touchPink transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-touchDark/60 uppercase tracking-widest mb-1.5">Message</label>
                                        <textarea name="message" value={form.message} onChange={handleChange} required rows={5}
                                            placeholder="Tell us how we can help you…"
                                            className="w-full px-4 py-3 rounded-xl border border-touchPink/30 text-sm text-touchDark outline-none focus:ring-2 focus:ring-touchPink/30 focus:border-touchPink resize-none transition-all" />
                                    </div>
                                    <button type="submit"
                                        className="w-full flex items-center justify-center gap-2 bg-touchDark text-white py-3.5 rounded-xl font-medium hover:bg-touchDark/85 transition-all active:scale-[0.98]">
                                        <Send size={16} /> Send Message
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactUs;
