import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Truck, MapPin, Phone, User as UserIcon, ArrowLeft } from 'lucide-react';

// Checkout progress indicator
const CheckoutSteps = ({ step }) => {
    const steps = ['Shipping', 'Payment', 'Review'];
    return (
        <div className="flex items-center justify-center gap-0 mb-10">
            {steps.map((label, i) => {
                const idx = i + 1;
                const isCompleted = step > idx;
                const isActive = step === idx;
                return (
                    <React.Fragment key={label}>
                        <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                                ${isCompleted ? 'bg-touchDark text-white' : isActive ? 'bg-touchPink text-white ring-4 ring-touchPink/20' : 'bg-gray-100 text-gray-400'}`}>
                                {isCompleted ? '✓' : idx}
                            </div>
                            <span className={`text-xs mt-1.5 tracking-wide ${isActive ? 'text-touchDark font-semibold' : 'text-touchDark/40'}`}>{label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`h-0.5 w-16 sm:w-24 mx-1 mb-5 transition-all ${step > idx ? 'bg-touchDark' : 'bg-gray-100'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const Shipping = () => {
    const { shippingAddress, setShippingAddress } = useCart();
    const { userInfo } = useAuth();
    const navigate = useNavigate();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!userInfo) {
            navigate('/login?redirect=shipping');
        }
    }, [userInfo, navigate]);

    const [formData, setFormData] = useState({
        fullName: shippingAddress.fullName || '',
        address: shippingAddress.address || '',
        city: shippingAddress.city || '',
        state: shippingAddress.state || '',
        postalCode: shippingAddress.postalCode || '',
        phone: shippingAddress.phone || '',
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const submitHandler = (e) => {
        e.preventDefault();
        setShippingAddress(formData);
        navigate('/payment');   // ← Fixed: must go through /payment first
    };

    return (
        <div className="max-w-xl mx-auto py-12 px-4 w-full">
            <CheckoutSteps step={1} />

            {/* Back button */}
            <button
                onClick={() => navigate('/cart')}
                className="inline-flex items-center gap-2 text-sm text-touchDark/50 hover:text-touchPink font-medium transition-colors mb-6"
            >
                <ArrowLeft size={16} /> Back to Cart
            </button>

            <div className="bg-white rounded-3xl p-8 border border-touchPink/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-touchPink via-touchCream to-touchSage"></div>

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-touchPink/10 rounded-full flex items-center justify-center text-touchPink mb-4 shadow-inner">
                        <Truck size={32} />
                    </div>
                    <h1 className="text-3xl font-serif text-touchDark tracking-wide mb-2">Shipping Information</h1>
                    <p className="text-touchDark/60 font-light tracking-wide text-sm text-center">Where should we deliver your order?</p>
                </div>

                <form onSubmit={submitHandler} className="space-y-4">
                    {/* Full Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-touchDark/70 uppercase tracking-widest flex items-center gap-1.5">
                            <UserIcon size={13} /> Full Name
                        </label>
                        <input
                            type="text" name="fullName" value={formData.fullName}
                            onChange={handleChange} required
                            className="w-full px-5 py-3 rounded-xl border border-touchPink/30 focus:border-touchPink focus:ring-1 focus:ring-touchPink outline-none bg-touchCream/30 transition-all font-light tracking-wide text-touchDark"
                            placeholder="John Doe"
                        />
                    </div>

                    {/* Address */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-touchDark/70 uppercase tracking-widest flex items-center gap-1.5">
                            <MapPin size={13} /> Street Address
                        </label>
                        <input
                            type="text" name="address" value={formData.address}
                            onChange={handleChange} required
                            className="w-full px-5 py-3 rounded-xl border border-touchPink/30 focus:border-touchPink focus:ring-1 focus:ring-touchPink outline-none bg-touchCream/30 transition-all font-light tracking-wide text-touchDark"
                            placeholder="123 Boutique Ave, Apt 4B"
                        />
                    </div>

                    {/* City + State */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-touchDark/70 uppercase tracking-widest">City</label>
                            <input
                                type="text" name="city" value={formData.city}
                                onChange={handleChange} required
                                className="w-full px-5 py-3 rounded-xl border border-touchPink/30 focus:border-touchPink focus:ring-1 focus:ring-touchPink outline-none bg-touchCream/30 transition-all font-light tracking-wide text-touchDark"
                                placeholder="Mumbai"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-touchDark/70 uppercase tracking-widest">State</label>
                            <input
                                type="text" name="state" value={formData.state}
                                onChange={handleChange}
                                className="w-full px-5 py-3 rounded-xl border border-touchPink/30 focus:border-touchPink focus:ring-1 focus:ring-touchPink outline-none bg-touchCream/30 transition-all font-light tracking-wide text-touchDark"
                                placeholder="Maharashtra"
                            />
                        </div>
                    </div>

                    {/* Postal Code + Phone */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-touchDark/70 uppercase tracking-widest">Postal Code</label>
                            <input
                                type="text" name="postalCode" value={formData.postalCode}
                                onChange={handleChange} required
                                className="w-full px-5 py-3 rounded-xl border border-touchPink/30 focus:border-touchPink focus:ring-1 focus:ring-touchPink outline-none bg-touchCream/30 transition-all font-light tracking-wide text-touchDark"
                                placeholder="400001"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-touchDark/70 uppercase tracking-widest flex items-center gap-1.5">
                                <Phone size={13} /> Phone
                            </label>
                            <input
                                type="tel" name="phone" value={formData.phone}
                                onChange={handleChange} required
                                className="w-full px-5 py-3 rounded-xl border border-touchPink/30 focus:border-touchPink focus:ring-1 focus:ring-touchPink outline-none bg-touchCream/30 transition-all font-light tracking-wide text-touchDark"
                                placeholder="+91 98765 43210"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-6 bg-touchDark text-white font-serif tracking-widest py-4 rounded-xl hover:bg-touchDark/90 transition-all duration-300 shadow-sm shadow-touchDark/20 active:scale-[0.98]"
                    >
                        CONTINUE TO PAYMENT →
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Shipping;
