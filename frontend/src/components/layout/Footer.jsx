import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Mail, MapPin, Phone, Check } from 'lucide-react';
import { contactApi } from '../../api/endpoints';
import { shoppableCategories } from '../../utils/categories';
import { Button } from '../ui';
import Wordmark from './Wordmark';
import {
  BRAND_NAME, BUSINESS_ADDRESS, BUSINESS_LOCALITY, CONTACT, INSTAGRAM, LEGAL,
} from '../../config/business';

// Optional so the build never depends on it: drop the file in src/assets and it appears.
const QR_FILES = import.meta.glob('../../assets/instagram-qr.{png,jpg,jpeg,webp}', { eager: true, import: 'default' });
const INSTAGRAM_QR = Object.values(QR_FILES)[0] || null;

const footerLink =
  'inline-flex min-h-[44px] items-center text-sm text-ink-muted transition-colors hover:text-ink';
const contactLink =
  'flex min-h-[44px] items-center gap-2.5 text-sm text-ink-muted transition-colors hover:text-ink';
const heading = 'mb-2 font-sans text-sm font-medium text-ink';
const detailLabel = 'text-2xs uppercase tracking-wider2 text-ink-faint';

export default function Footer({ categories = [] }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [message, setMessage] = useState('');

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setState('loading');
    try {
      const data = await contactApi.subscribe(email.trim());
      setState('done');
      setMessage(data.message || 'Thank you for subscribing.');
      setEmail('');
    } catch (err) {
      setState('error');
      setMessage(err.friendlyMessage || 'Could not subscribe. Please try again.');
    }
  };

  const year = new Date().getFullYear();
  const footerCategories = shoppableCategories(categories).slice(0, 6);

  return (
    <footer className="mt-16 border-t border-line bg-paper-sunken sm:mt-20 lg:mt-24">
      {/* ── Newsletter ── */}
      <div className="border-b border-line">
        <div className="shell section-tight">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center lg:gap-16">
            <div>
              <h2 className="text-display-3">Be first to know</h2>
              <p className="mt-2.5 max-w-md text-sm leading-relaxed text-ink-muted">
                New arrivals, restocks and studio notes. No more than twice a month.
              </p>
            </div>

            <form onSubmit={subscribe} className="w-full">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (state !== 'idle') setState('idle'); }}
                  placeholder="your@email.com"
                  disabled={state === 'loading'}
                  className="field min-w-0 flex-1 text-base sm:text-sm"
                />
                <Button
                  type="submit"
                  loading={state === 'loading'}
                  disabled={state === 'done'}
                  className="shrink-0"
                >
                  {state === 'done' ? <><Check size={14} aria-hidden="true" /> Subscribed</> : 'Subscribe'}
                </Button>
              </div>

              {message && (
                <p
                  role="status"
                  className={`mt-2.5 text-xs ${state === 'error' ? 'text-danger' : 'text-success'}`}
                >
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      <div className="shell section-tight">
        {/* ── Links ── */}
        {/* Phones: brand, then Shop and Help side by side, then contact — so the footer stays compact. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-10 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 lg:col-span-1">
            <Wordmark className="text-2xl" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              Timeless Indian ethnic wear, thoughtfully made for every occasion.
            </p>

            <div className="mt-5 flex items-center">
              <a
                href={INSTAGRAM.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${BRAND_NAME} on Instagram (opens in a new tab)`}
                className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full border border-line-strong
                           text-ink-soft transition-colors hover:border-ink hover:text-ink"
              >
                <Instagram size={17} aria-hidden="true" />
              </a>
            </div>
          </div>

          <nav aria-labelledby="footer-shop">
            <h3 id="footer-shop" className={heading}>Shop</h3>
            <ul>
              <li><Link to="/shop" className={footerLink}>All products</Link></li>
              <li><Link to="/shop?newArrival=true" className={footerLink}>New arrivals</Link></li>
              {footerCategories.map((c) => (
                <li key={c._id}>
                  <Link to={`/shop?category=${c.slug}`} className={footerLink}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-help">
            <h3 id="footer-help" className={heading}>Help</h3>
            <ul>
              {[
                { to: '/orders', label: 'Track your order' },
                { to: '/shipping-returns', label: 'Shipping & returns' },
                { to: '/contact', label: 'Contact us' },
                { to: '/about', label: `About ${BRAND_NAME}` },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className={footerLink}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="col-span-2 lg:col-span-1">
            <h3 id="footer-contact" className={heading}>Get in touch</h3>
            <ul aria-labelledby="footer-contact">
              <li>
                <a
                  href={CONTACT.phoneHref}
                  aria-label={`Call ${BRAND_NAME} at ${CONTACT.phoneDisplay}`}
                  className={contactLink}
                >
                  <Phone size={14} className="shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{CONTACT.phoneDisplay}</span>
                </a>
              </li>
              <li>
                <a
                  href={CONTACT.emailHref}
                  aria-label={`Email ${BRAND_NAME} at ${CONTACT.email}`}
                  className={contactLink}
                >
                  <Mail size={14} className="shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-all">{CONTACT.email}</span>
                </a>
              </li>
              <li className="flex min-h-[44px] items-center gap-2.5 text-sm text-ink-muted">
                <MapPin size={14} className="shrink-0" aria-hidden="true" />
                {BUSINESS_LOCALITY}
              </li>
            </ul>
          </div>
        </div>

        {/* ── Follow + legal ── */}
        <div className="mt-8 grid gap-7 border-t border-line pt-7 sm:mt-10 sm:gap-8 sm:pt-9 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-12">
          <section aria-labelledby="footer-follow">
            <h3 id="footer-follow" className={heading}>Follow {BRAND_NAME}</h3>
            <div className="mt-3 flex items-center gap-4">
              {INSTAGRAM_QR && (
                <a
                  href={INSTAGRAM.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-control bg-white p-2.5 shadow-card"
                >
                  <img
                    src={INSTAGRAM_QR}
                    alt={`Scan to follow ${BRAND_NAME} on Instagram`}
                    width={112}
                    height={112}
                    loading="lazy"
                    decoding="async"
                    className="block h-28 w-28 object-contain"
                  />
                </a>
              )}
              <div className="min-w-0">
                <a
                  href={INSTAGRAM.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-clay-deep"
                >
                  <Instagram size={16} aria-hidden="true" />
                  {INSTAGRAM.handle}
                  <span className="sr-only"> on Instagram (opens in a new tab)</span>
                </a>
                <p className="text-xs leading-relaxed text-ink-muted">Follow us on Instagram</p>
              </div>
            </div>
          </section>

          <section aria-labelledby="footer-legal">
            <h3 id="footer-legal" className={heading}>Legal &amp; business details</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 text-sm text-ink-soft sm:gap-x-8 xl:grid-cols-[repeat(3,minmax(0,auto))_minmax(0,1.4fr)]">
              <div>
                <dt className={detailLabel}>Legal name</dt>
                <dd className="mt-1">{LEGAL.legalName}</dd>
              </div>
              <div>
                <dt className={detailLabel}>Trade name</dt>
                <dd className="mt-1">{LEGAL.tradeName}</dd>
              </div>
              <div>
                <dt className={detailLabel}>GSTIN</dt>
                <dd className="mt-1 tabular-nums tracking-wide">{LEGAL.gstin}</dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className={detailLabel}>Business address</dt>
                <dd className="mt-1">
                  <address className="not-italic leading-relaxed">
                    {BUSINESS_ADDRESS.map((line) => <span key={line} className="block">{line}</span>)}
                  </address>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {/* ── Legal ── */}
      <div className="border-t border-line">
        <div className="shell flex flex-col items-center justify-between gap-1 py-4 text-center sm:flex-row sm:py-5 sm:text-left">
          <p className="text-xs text-ink-muted">© {year} {BRAND_NAME}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="inline-flex min-h-[44px] items-center text-xs text-ink-muted transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link to="/terms" className="inline-flex min-h-[44px] items-center text-xs text-ink-muted transition-colors hover:text-ink">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
