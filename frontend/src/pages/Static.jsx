import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Instagram, MapPin, Phone, Send, CheckCircle2, Compass } from 'lucide-react';
import { contactApi } from '../api/endpoints';
import {
  BRAND_NAME, BUSINESS_ADDRESS, BUSINESS_LOCALITY, CONTACT, INSTAGRAM, LEGAL,
} from '../config/business';
import { useDocumentMeta } from '../hooks';
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT_RATE,
  RETURN_WINDOW_DAYS,
  ORDER_CANCEL_WINDOW_HOURS,
} from '../config/store';
import { formatPrice } from '../utils/format';
import { Button, Input, Textarea, Alert, EmptyState } from '../components/ui';

function Page({ title, lead, children }) {
  return (
    <div className="shell py-14 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-display-2">{title}</h1>
        {lead && <p className="mt-4 text-base leading-relaxed text-ink-muted">{lead}</p>}
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-ink-soft">{children}</div>
      </div>
    </div>
  );
}

const H2 = ({ children }) => <h2 className="mb-3 mt-10 text-lg first:mt-0">{children}</h2>;

/* ═════════════════════════ About ═════════════════════════════════════════ */

export function About() {
  useDocumentMeta({
    title: 'About',
    description: `${BRAND_NAME} — timeless Indian ethnic wear from ${BUSINESS_LOCALITY}, thoughtfully made for every occasion.`,
  });

  return (
    <Page
      title={`About ${BRAND_NAME}`}
      lead="Timeless Indian ethnic wear, thoughtfully made for every occasion."
    >
      <p>
        {BRAND_NAME} is an Indian ethnic wear label based in {BUSINESS_LOCALITY}, trading
        as {LEGAL.tradeName}. We bring together pieces for celebrations, festivals
        and everyday wear, and sell them directly through this store.
      </p>

      <H2>Sizing</H2>
      <p>
        Each product page lists the sizes we currently hold, and sizes that have
        sold out are shown as unavailable rather than quietly hidden. If you are
        between sizes, or want measurements for a specific piece, write to us and
        we will measure the actual garment for you.
      </p>

      <H2>Getting in touch</H2>
      <p>
        We are a small team, so you will usually be talking to one of us
        directly. The quickest way to reach us is{' '}
        <Link to="/contact" className="link">the contact form</Link>, a call on{' '}
        <a href={CONTACT.phoneHref} aria-label={`Call ${BRAND_NAME} at ${CONTACT.phoneDisplay}`} className="link whitespace-nowrap">
          {CONTACT.phoneDisplay}
        </a>, or Instagram at{' '}
        <a
          href={INSTAGRAM.url}
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          {INSTAGRAM.handle}
        </a>.
      </p>
    </Page>
  );
}

/* ═════════════════════════ Contact ═══════════════════════════════════════ */

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);

  useDocumentMeta({
    title: 'Contact',
    description: `Get in touch with ${BRAND_NAME} about an order, a product or a return.`,
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      // Real backend submission. The old build only opened a mailto: link and
      // claimed success regardless of whether anything was actually sent.
      const data = await contactApi.submit(form);
      setResult(data);
      setStatus('done');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setResult({ message: err.friendlyMessage || 'Could not send your message.' });
      setStatus('error');
    }
  };

  return (
    <div className="shell py-14 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <p className="eyebrow mb-3">Get in touch</p>
          <h1 className="text-display-2">Contact us</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
            Questions about an order, a size or a return — we read everything and
            reply within 24–48 hours on business days.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
          <div className="space-y-5">
            <a
              href={CONTACT.phoneHref}
              aria-label={`Call ${BRAND_NAME} at ${CONTACT.phoneDisplay}`}
              className="flex min-h-[44px] items-start gap-3.5 text-sm transition-colors hover:text-clay-deep"
            >
              <Phone size={17} className="mt-0.5 shrink-0 text-clay" aria-hidden="true" />
              <span>
                <span className="block text-2xs uppercase tracking-wider2 text-ink-faint">Phone</span>
                <span className="whitespace-nowrap">{CONTACT.phoneDisplay}</span>
              </span>
            </a>

            <a
              href={CONTACT.emailHref}
              aria-label={`Email ${BRAND_NAME} at ${CONTACT.email}`}
              className="flex min-h-[44px] items-start gap-3.5 text-sm transition-colors hover:text-clay-deep"
            >
              <Mail size={17} className="mt-0.5 shrink-0 text-clay" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-2xs uppercase tracking-wider2 text-ink-faint">Email</span>
                <span className="break-all">{CONTACT.email}</span>
              </span>
            </a>

            <a
              href={INSTAGRAM.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-start gap-3.5 text-sm transition-colors hover:text-clay-deep"
            >
              <Instagram size={17} className="mt-0.5 shrink-0 text-clay" aria-hidden="true" />
              <span>
                <span className="block text-2xs uppercase tracking-wider2 text-ink-faint">Instagram</span>
                {INSTAGRAM.handle}
              </span>
            </a>

            <div className="flex items-start gap-3.5 text-sm">
              <MapPin size={17} className="mt-0.5 shrink-0 text-clay" aria-hidden="true" />
              <span>
                <span className="block text-2xs uppercase tracking-wider2 text-ink-faint">Business address</span>
                <address className="not-italic leading-relaxed">
                  {BUSINESS_ADDRESS.map((line) => <span key={line} className="block">{line}</span>)}
                </address>
              </span>
            </div>
          </div>

          <div className="card-pad">
            {status === 'done' ? (
              <div className="py-10 text-center">
                <CheckCircle2 size={30} className="mx-auto mb-5 text-success" aria-hidden="true" />
                <h2 className="text-lg">Message received</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
                  {result?.message}
                </p>
                {result?.reference && (
                  <p className="mt-3 font-mono text-2xs text-ink-faint">
                    Reference: {String(result.reference).slice(-8).toUpperCase()}
                  </p>
                )}
                <Button variant="ghost" className="mt-7" onClick={() => setStatus('idle')}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                {status === 'error' && <Alert tone="error">{result?.message}</Alert>}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Your name" required value={form.name} onChange={set('name')} />
                  <Input label="Email" type="email" required value={form.email} onChange={set('email')} />
                </div>

                <Input
                  label="Subject" value={form.subject} onChange={set('subject')}
                  placeholder="Order query, sizing question…"
                />

                <Textarea
                  label="Message" required rows={6} value={form.message} onChange={set('message')}
                  minLength={10} maxLength={2000}
                  placeholder="Tell us how we can help."
                  hint={`${form.message.length}/2000`}
                />

                <Button type="submit" size="lg" fullWidth loading={status === 'loading'}>
                  <Send size={15} aria-hidden="true" /> Send message
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════ Policies ══════════════════════════════════════ */

/**
 * ⚠️  PLACEHOLDER POLICY CONTENT — CONFIRM WITH THE BUSINESS OWNER BEFORE LAUNCH.
 *
 * The numbers below (free-shipping threshold, flat rate, return window,
 * cancellation window) are read from `config/store`, which mirrors the values
 * the API actually enforces — change them there, or via the matching backend
 * env vars, and these pages follow.
 *
 * The PROSE is a different matter. These commitments have not been agreed with
 * anyone and are not enforced by any code:
 *   • "dispatched within 1–2 business days"
 *   • "refunds ... typically within 5–7 business days of receipt"
 *   • "we read everything and reply within 24–48 hours on business days"
 *   • the dispatch location and the support address (from config/business)
 *   • which items are non-returnable for hygiene reasons
 *   • the "final sale" concept — nothing in the product model marks an item
 *     as final sale today, so that sentence currently describes nothing
 *
 * Every one of these is a promise the business has to be able to keep. Read
 * them with the owner and edit to match reality before the store goes live.
 */
export function ShippingReturns() {
  useDocumentMeta({
    title: 'Shipping & returns',
    description: `How ${BRAND_NAME} ships orders across India and how to return an unworn piece within ${RETURN_WINDOW_DAYS} days.`,
  });

  return (
    <Page title="Shipping & returns" lead="How your order reaches you, and what to do if it is not right.">
      <H2>Shipping</H2>
      <p>
        We ship across India from {BUSINESS_LOCALITY}. Shipping is free on orders
        over {formatPrice(FREE_SHIPPING_THRESHOLD)}. Below that, a flat{' '}
        {formatPrice(SHIPPING_FLAT_RATE)} applies, shown at checkout before you pay.
      </p>
      <p>
        Orders are dispatched within 1–2 business days. Once dispatched you will
        receive a tracking reference by email, and it will also appear on your{' '}
        <Link to="/orders" className="link">order page</Link>. Delivery timelines
        depend on the courier and your location; we do not quote a guaranteed
        delivery date because that is not something we control.
      </p>

      <H2>Returns</H2>
      <p>
        Unworn, unwashed items in original condition with tags attached can be
        returned within {RETURN_WINDOW_DAYS} days of delivery. Write to us at{' '}
        <a href={CONTACT.emailHref} className="link break-all">{CONTACT.email}</a>{' '}
        with your order number and we will arrange it.
      </p>
      <p>
        Refunds are issued to the original payment method once the item reaches us
        and passes a quick condition check, typically within 5–7 business days of receipt.
      </p>

      <H2>Cancellations</H2>
      <p>
        You can cancel an order yourself from your order page any time before it is
        packed, within {ORDER_CANCEL_WINDOW_HOURS} hours of placing it. After that,
        write to us and we will help if it has not already shipped.
      </p>

      <H2>Exceptions</H2>
      <p>
        For hygiene reasons we cannot accept returns on accessories that are worn
        close to the body. Items marked final sale are not returnable; this is
        stated clearly on the product page where it applies.
      </p>
    </Page>
  );
}

export function Privacy() {
  useDocumentMeta({ title: 'Privacy policy', description: `How ${BRAND_NAME} handles your personal data.` });

  return (
    <Page title="Privacy policy" lead="What we collect, why, and what we do not do with it.">
      <H2>What we collect</H2>
      <p>
        When you create an account we store your name, email address and, if you
        provide them, your phone number and delivery addresses. When you order, we
        store the order contents, the address it shipped to, and a payment
        reference from our payment provider.
      </p>

      <H2>Card details</H2>
      <p>
        We never see or store your card number. Online payments are handled
        entirely by Razorpay, our payment provider. We receive only a payment
        identifier and a status.
      </p>

      <H2>How we use it</H2>
      <p>
        To fulfil your orders, respond to your enquiries, and — only if you opted
        in — send occasional emails about new arrivals. Every marketing email has
        a one-click unsubscribe link.
      </p>

      <H2>Who we share it with</H2>
      <p>
        Only the parties needed to complete your order: our courier partner,
        our payment provider, and our email provider. We do not sell personal data.
      </p>

      <H2>Your choices</H2>
      <p>
        You can update your details from your account, unsubscribe from emails at
        any time, and ask us to close your account by writing to{' '}
        <a href={CONTACT.emailHref} className="link break-all">{CONTACT.email}</a>.
        Closing an account anonymises your profile; order records are retained where
        we are required to keep them for tax purposes.
      </p>
    </Page>
  );
}

export function Terms() {
  useDocumentMeta({ title: 'Terms of use', description: `Terms governing purchases from ${BRAND_NAME}.` });

  return (
    <Page title="Terms of use" lead="The basis on which we sell to you.">
      <H2>Orders</H2>
      <p>
        Placing an order is an offer to buy. We accept it when we confirm the order.
        If an item turns out to be unavailable after you order, we will cancel that
        line and refund it in full.
      </p>

      <H2>Pricing</H2>
      <p>
        All prices are in Indian Rupees and include GST. The price you see at
        checkout is the price you pay — shipping is shown separately before you
        confirm. Where a piece shows a reduced price, the crossed-out figure is the
        price it was previously offered at.
      </p>

      <H2>Product representation</H2>
      <p>
        We photograph pieces as accurately as we can. Colour can vary slightly
        between screens, and handmade pieces vary a little by nature. If something
        arrives materially different from its description, treat it as a return and
        we will make it right.
      </p>

      <H2>Accounts</H2>
      <p>
        You are responsible for keeping your password secure. Tell us promptly if
        you think someone else has accessed your account.
      </p>

      <H2>Governing law</H2>
      <p>These terms are governed by the laws of India, with jurisdiction in {BUSINESS_LOCALITY}.</p>
    </Page>
  );
}

/* ═════════════════════════ 404 ═══════════════════════════════════════════ */

export function NotFound() {
  useDocumentMeta({ title: 'Page not found', noIndex: true });

  return (
    <div className="shell">
      <EmptyState
        icon={Compass}
        title="We could not find that page"
        description="The link may be out of date, or the piece may no longer be available."
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button to="/" size="lg">Go home</Button>
            <Button to="/shop" variant="secondary" size="lg">Browse the collection</Button>
          </div>
        }
      />
    </div>
  );
}
