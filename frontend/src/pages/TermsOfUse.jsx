import React from 'react';
import { FileText } from 'lucide-react';

const Section = ({ title, children }) => (
    <div className="mb-8">
        <h2 className="text-xl font-serif text-touchDark mb-3 tracking-wide">{title}</h2>
        <div className="text-touchDark/60 font-light text-sm leading-relaxed space-y-2">{children}</div>
    </div>
);

const TermsOfUse = () => (
    <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-touchPink/15">
            <div className="w-12 h-12 bg-touchPink/10 rounded-xl flex items-center justify-center">
                <FileText size={22} className="text-touchPink" />
            </div>
            <div>
                <h1 className="text-4xl font-serif text-touchDark tracking-wide">Terms of Use</h1>
                <p className="text-touchDark/40 text-sm font-light mt-1">Last updated: March 2026</p>
            </div>
        </div>

        <p className="text-touchDark/60 font-light text-sm leading-relaxed mb-10">
            By accessing and using the TOUCH Boutique website, you agree to be bound by these Terms of Use.
            Please read them carefully before using our services.
        </p>

        <Section title="1. Use of the Website">
            <p>You may use this website for personal, non-commercial purposes only. You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Use the site for any unlawful or fraudulent purpose</li>
                <li>Attempt to gain unauthorised access to any part of the website</li>
                <li>Reproduce, duplicate, or resell any part of our services without permission</li>
                <li>Upload or transmit any harmful, offensive, or malicious content</li>
            </ul>
        </Section>

        <Section title="2. Accounts">
            <p>When you create an account, you are responsible for maintaining the confidentiality of your credentials and for all activity under your account. Please notify us immediately at <a href="mailto:support@touchfashion.in" className="text-touchPink hover:underline">support@touchfashion.in</a> if you suspect any unauthorised use.</p>
        </Section>

        <Section title="3. Product Information & Pricing">
            <p>We make every effort to display accurate product descriptions and pricing. However, we reserve the right to modify prices and correct errors at any time. If an order is placed at an incorrect price, we will contact you before processing.</p>
        </Section>

        <Section title="4. Orders & Payment">
            <p>All orders are subject to availability and confirmation. We reserve the right to refuse or cancel any order at our discretion. Prices are listed in Indian Rupees (₹) and are inclusive of applicable taxes unless stated otherwise.</p>
        </Section>

        <Section title="5. Intellectual Property">
            <p>All content on this website — including logos, text, images, and design — is the property of TOUCH Boutique and is protected by applicable intellectual property laws. You may not use, copy, or distribute any content without prior written permission.</p>
        </Section>

        <Section title="6. Limitation of Liability">
            <p>TOUCH Boutique is not liable for any indirect, incidental, or consequential damages arising from your use of this website or our products. Our total liability shall not exceed the amount paid for the specific order in question.</p>
        </Section>

        <Section title="7. Changes to Terms">
            <p>We may update these Terms of Use at any time. Continued use of the website after any changes constitutes your acceptance of the new terms.</p>
        </Section>

        <Section title="8. Contact">
            <p>For any questions regarding these terms, please contact us at <a href="mailto:support@touchfashion.in" className="text-touchPink hover:underline">support@touchfashion.in</a>.</p>
        </Section>
    </div>
);

export default TermsOfUse;
