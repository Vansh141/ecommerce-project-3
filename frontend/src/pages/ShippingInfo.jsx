import React from 'react';
import { Truck, Clock, MapPin, Phone, CheckCircle } from 'lucide-react';

const zones = [
    { zone: 'Metro Cities', cities: 'Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Kolkata', days: '2–3 business days', charge: 'FREE above ₹999' },
    { zone: 'Tier-2 Cities', cities: 'Pune, Jaipur, Lucknow, Surat, Ahmedabad & more', days: '3–5 business days', charge: '₹49' },
    { zone: 'Rest of India', cities: 'All other pincodes we serve', days: '5–7 business days', charge: '₹79' },
];

const ShippingInfo = () => (
    <div className="max-w-3xl mx-auto py-12 px-4">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-touchPink/15">
            <div className="w-12 h-12 bg-touchPink/10 rounded-xl flex items-center justify-center">
                <Truck size={22} className="text-touchPink" />
            </div>
            <div>
                <h1 className="text-4xl font-serif text-touchDark tracking-wide">Shipping Info</h1>
                <p className="text-touchDark/40 text-sm font-light mt-1">Everything you need to know about delivery</p>
            </div>
        </div>

        {/* Key highlights */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {[
                { icon: <Truck size={20} className="text-touchPink" />, label: 'Free Shipping', sub: 'On orders above ₹999' },
                { icon: <Clock size={20} className="text-touchPink" />, label: 'Fast Dispatch', sub: 'Within 24 hours' },
                { icon: <MapPin size={20} className="text-touchPink" />, label: 'Pan India', sub: 'Delivered everywhere' },
            ].map(({ icon, label, sub }) => (
                <div key={label} className="bg-white border border-touchPink/10 rounded-2xl p-5 text-center shadow-sm">
                    <div className="w-10 h-10 bg-touchPink/10 rounded-xl flex items-center justify-center mx-auto mb-3">{icon}</div>
                    <p className="font-serif text-touchDark font-semibold">{label}</p>
                    <p className="text-touchDark/50 text-xs font-light mt-1">{sub}</p>
                </div>
            ))}
        </div>

        {/* Zones table */}
        <h2 className="text-2xl font-serif text-touchDark mb-5 tracking-wide">Delivery Zones & Timelines</h2>
        <div className="bg-white rounded-2xl border border-touchPink/10 shadow-sm overflow-hidden mb-10">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Zone</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest hidden sm:table-cell">Cities</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Time</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-touchDark/50 uppercase tracking-widest">Charge</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {zones.map(z => (
                        <tr key={z.zone} className="hover:bg-gray-50/30">
                            <td className="px-5 py-4 font-medium text-touchDark">{z.zone}</td>
                            <td className="px-5 py-4 text-touchDark/50 font-light hidden sm:table-cell">{z.cities}</td>
                            <td className="px-5 py-4 text-touchDark/70">{z.days}</td>
                            <td className="px-5 py-4">
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${z.charge.includes('FREE') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-touchCream text-touchDark'}`}>
                                    {z.charge}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Notes */}
        <h2 className="text-2xl font-serif text-touchDark mb-5 tracking-wide">Important Notes</h2>
        <div className="space-y-3 mb-10">
            {[
                'Orders placed before 2 PM IST are dispatched the same day.',
                'You will receive a tracking link via email/SMS once your order is dispatched.',
                'Delivery timelines are estimates and may vary during sales, festivals, or due to unforeseen circumstances.',
                'We currently ship within India only. International shipping is coming soon.',
                'TOUCH is not responsible for delays caused by incorrect delivery addresses.',
            ].map((note, i) => (
                <div key={i} className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-touchPink shrink-0 mt-0.5" />
                    <p className="text-touchDark/60 text-sm font-light">{note}</p>
                </div>
            ))}
        </div>

        {/* Help */}
        <div className="bg-touchDark rounded-2xl p-6 flex items-center gap-5">
            <div className="w-12 h-12 bg-touchPink/20 rounded-xl flex items-center justify-center shrink-0">
                <Phone size={20} className="text-touchPink" />
            </div>
            <div>
                <p className="text-white font-serif tracking-wide mb-1">Need shipping help?</p>
                <p className="text-white/60 text-sm font-light">Email us at <a href="mailto:support@touchfashion.in" className="text-touchPink hover:underline">support@touchfashion.in</a> or DM us on Instagram <a href="https://www.instagram.com/touchh.in" target="_blank" rel="noopener noreferrer" className="text-touchPink hover:underline">@touchh.in</a></p>
            </div>
        </div>
    </div>
);

export default ShippingInfo;
