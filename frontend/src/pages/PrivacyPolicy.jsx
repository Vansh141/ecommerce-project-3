import React from 'react';
import { Shield } from 'lucide-react';

const Section = ({ title, children }) => (
    <div className="mb-8">
        <h2 className="text-xl font-serif text-touchDark mb-3 tracking-wide">{title}</h2>
        <div className="text-touchDark/60 font-light text-sm leading-relaxed space-y-2">{children}</div>
    </div>
);

const PrivacyPolicy = () => (
    <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-touchPink/15">
            <div className="w-12 h-12 bg-touchPink/10 rounded-xl flex items-center justify-center">
                <Shield size={22} className="text-touchPink" />
            </div>
            <div>
                <h1 className="text-4xl font-serif text-touchDark tracking-wide">Privacy Policy</h1>
                <p className="text-touchDark/40 text-sm font-light mt-1">Last updated: March 2026</p>
            </div>
        </div>

        <p className="text-touchDark/60 font-light text-sm leading-relaxed mb-10">
            At TOUCH Boutique, we are committed to protecting your privacy. This policy explains how we collect,
            use, and safeguard your personal information when you use our website.
        </p>

        <Section title="1. Information We Collect">
            <p>We collect information you provide directly to us, such as:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Name and email address when you create an account or subscribe to our newsletter</li>
                <li>Shipping address and phone number when you place an order</li>
                <li>Payment information (processed securely — we do not store card details)</li>
                <li>Communications when you contact our support team</li>
            </ul>
        </Section>

        <Section title="2. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Process and deliver your orders</li>
                <li>Send order confirmations and shipping updates</li>
                <li>Respond to your queries and support requests</li>
                <li>Send promotional emails (only if you have subscribed)</li>
                <li>Improve our website and product offerings</li>
            </ul>
        </Section>

        <Section title="3. Sharing of Information">
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Delivery partners to fulfil your orders</li>
                <li>Payment processors to handle transactions securely</li>
                <li>Legal authorities if required by law</li>
            </ul>
        </Section>

        <Section title="4. Data Security">
            <p>We implement industry-standard security measures including SSL encryption, secure password hashing, and JWT-based authentication to protect your personal data. However, no method of transmission over the internet is 100% secure.</p>
        </Section>

        <Section title="5. Cookies">
            <p>We use cookies to maintain your login session and improve your browsing experience. You can disable cookies through your browser settings, but some features may not function correctly.</p>
        </Section>

        <Section title="6. Your Rights">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Access the personal data we hold about you</li>
                <li>Request correction or deletion of your data</li>
                <li>Unsubscribe from marketing emails at any time</li>
                <li>Delete your account by contacting support</li>
            </ul>
        </Section>

        <Section title="7. Contact Us">
            <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@touchfashion.in" className="text-touchPink hover:underline">support@touchfashion.in</a>.</p>
        </Section>
    </div>
);

export default PrivacyPolicy;
