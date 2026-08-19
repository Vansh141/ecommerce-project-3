import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Mail, MapPin, Check } from 'lucide-react';
import { contactApi } from '../../api/endpoints';
import { Button } from '../ui';

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

  return (
    <footer className="mt-24 border-t border-line bg-paper-raised">
      {/* ── Newsletter ── */}
      <div className="border-b border-line">
        <div className="shell py-14">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="eyebrow mb-3">Newsletter</p>
              <h2 className="text-2xl sm:text-3xl">Be first to know</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
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
                  className="field flex-1"
                />
                <Button type="submit" loading={state === 'loading'} disabled={state === 'done'}>
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

      {/* ── Links ── */}
      <div className="shell py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <span className="font-display text-2xl uppercase tracking-luxe text-ink">Touch</span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              Considered clothing, made in India. Pieces designed to be worn often
              and kept for a long time.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://www.instagram.com/touchh.in"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TOUCH on Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line
                           text-ink-soft transition-colors hover:border-ink hover:text-ink"
              >
                <Instagram size={16} aria-hidden="true" />
              </a>
            </div>
          </div>

          <nav aria-labelledby="footer-shop">
            <h3 id="footer-shop" className="eyebrow mb-4">Shop</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/shop" className="text-sm text-ink-muted transition-colors hover:text-ink">
                  All products
                </Link>
              </li>
              {categories.slice(0, 6).map((c) => (
                <li key={c._id}>
                  <Link
                    to={`/shop?category=${c.slug}`}
                    className="text-sm text-ink-muted transition-colors hover:text-ink"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-help">
            <h3 id="footer-help" className="eyebrow mb-4">Help</h3>
            <ul className="space-y-2.5">
              {[
                { to: '/orders', label: 'Track your order' },
                { to: '/shipping-returns', label: 'Shipping & returns' },
                { to: '/contact', label: 'Contact us' },
                { to: '/about', label: 'About TOUCH' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-ink-muted transition-colors hover:text-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="eyebrow mb-4">Get in touch</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:support@touchfashion.in"
                  className="flex items-start gap-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  <Mail size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  support@touchfashion.in
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-ink-muted">
                <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                Mumbai, India
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Legal ── */}
      <div className="border-t border-line">
        <div className="shell flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-xs text-ink-faint">© {year} TOUCH. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-xs text-ink-faint transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link to="/terms" className="text-xs text-ink-faint transition-colors hover:text-ink">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
