import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Banknote, Circle, CheckCircle2, ArrowLeft } from 'lucide-react';

// Shared checkout step indicator (duplicated for self-containment)
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

const PAYMENT_OPTIONS = [
    {
        value: 'Cash on Delivery',
        label: 'Cash on Delivery',
        description: 'Pay in cash when your order arrives',
        icon: Banknote,
    },
    {
        value: 'Card Payment',
        label: 'Card Payment',
        description: 'Visa, MasterCard, Amex, Rupay',
        icon: CreditCard,
    },
];

const Payment = () => {
    const navigate = useNavigate();
    const { shippingAddress, paymentMethod, setPaymentMethod } = useCart();
    const { userInfo } = useAuth();
    const [selectedMethod, setSelectedMethod] = useState(paymentMethod || 'Cash on Delivery');

    // Guard: must be logged in
    useEffect(() => {
        if (!userInfo) {
            navigate('/login?redirect=shipping');
        }
    }, [userInfo, navigate]);

    // Guard: must have shipping address first
    useEffect(() => {
        if (userInfo && !shippingAddress.address) {
            navigate('/shipping');
        }
    }, [shippingAddress, userInfo, navigate]);

    const submitHandler = (e) => {
        e.preventDefault();
        setPaymentMethod(selectedMethod);
        navigate('/placeorder');
    };

    return (
        <div className="max-w-xl mx-auto py-12 px-4 w-full">
            <CheckoutSteps step={2} />

            <div className="bg-white rounded-3xl p-8 border border-touchPink/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-touchPink via-touchCream to-touchSage"></div>

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-touchPink/10 rounded-full flex items-center justify-center text-touchPink mb-4 shadow-inner">
                        <CreditCard size={32} />
                    </div>
                    <h1 className="text-3xl font-serif text-touchDark tracking-wide mb-2">Payment Method</h1>
                    <p className="text-touchDark/60 font-light tracking-wide text-sm text-center">
                        Select your preferred payment option
                    </p>
                </div>

                <form onSubmit={submitHandler} className="space-y-6">
                    <div className="space-y-3">
                        {PAYMENT_OPTIONS.map(({ value, label, description, icon: Icon }) => {
                            const isSelected = selectedMethod === value;
                            return (
                                <label
                                    key={value}
                                    className={`cursor-pointer flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 ${isSelected
                                            ? 'border-touchPink bg-touchCream/20 shadow-sm'
                                            : 'border-gray-100 hover:border-touchPink/40 hover:bg-touchCream/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        {isSelected ? (
                                            <CheckCircle2 className="text-touchPink w-6 h-6 shrink-0" />
                                        ) : (
                                            <Circle className="text-gray-300 w-6 h-6 shrink-0" />
                                        )}
                                        <div>
                                            <p className={`font-semibold tracking-wide transition-colors ${isSelected ? 'text-touchDark' : 'text-touchDark/80'}`}>
                                                {label}
                                            </p>
                                            <p className="text-xs text-touchDark/50 font-light mt-0.5">{description}</p>
                                        </div>
                                    </div>
                                    {/* Payment method icon badge */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-touchPink/10 text-touchPink' : 'bg-gray-50 text-gray-300'
                                        }`}>
                                        <Icon size={20} />
                                    </div>
                                    <input
                                        type="radio"
                                        className="hidden"
                                        name="paymentMethod"
                                        value={value}
                                        checked={isSelected}
                                        onChange={(e) => setSelectedMethod(e.target.value)}
                                    />
                                </label>
                            );
                        })}
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-4 bg-touchDark text-white font-serif tracking-widest py-4 rounded-xl hover:bg-touchDark/90 transition-all duration-300 shadow-sm shadow-touchDark/20 active:scale-[0.98]"
                    >
                        CONTINUE TO REVIEW →
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/shipping')}
                        className="w-full flex items-center justify-center gap-1 text-sm font-light text-touchDark/50 hover:text-touchDark tracking-wide transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to Shipping
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Payment;
