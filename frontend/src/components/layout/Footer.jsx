import { useState } from 'react';
import { Instagram, Mail, MapPin, Phone, Check } from 'lucide-react';
import { contactApi } from '../../api/endpoints';
import { shoppableCategories } from '../../utils/categories';
import { defaultFooter, telHref } from '../../config/storefront';
import { Button } from '../ui';
import Wordmark from './Wordmark';
import ContentLink, { usableLinks } from './ContentLink';
import { BRAND_NAME } from '../../config/business';

// Optional so the build never depends on it: drop the file in src/assets and it appears.
const QR_FILES = import.meta.glob('../../assets/instagram-qr.{png,jpg,jpeg,webp}', { eager: true, import: 'default' });
const INSTAGRAM_QR = Object.values(QR_FILES)[0] || null;

const footerLink =
  'inline-flex min-h-[44px] items-center text-sm text-ink-muted transition-colors hover:text-ink';
const contactLink =
  'flex min-h-[44px] items-center gap-2.5 text-sm text-ink-muted transition-colors hover:text-ink';
const heading = 'mb-2 font-sans text-sm font-medium text-ink';
const detailLabel = 'text-2xs uppercase tracking-wider2 text-ink-faint';

/** One column of links, hidden entirely when the owner has emptied it. */
function LinkColumn({ id, title, links, categories = [] }) {
  if (links.length === 0 && categories.length === 0) return null;
  return (
    <nav aria-labelledby={id}>
      <h3 id={id} className={heading}>{title}</h3>
      <ul>
        {links.map((item) => (
          <li key={`${item.label}-${item.link}`}>
            <ContentLink to={item.link} className={footerLink}>{item.label}</ContentLink>
          </li>
        ))}
        {categories.map((c) => (
          <li key={c._id}>
            <ContentLink to={`/shop?category=${c.slug}`} className={footerLink}>{c.name}</ContentLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** One business detail, left out when it has not been filled in. */
function Detail({ label, children, className = '' }) {
  if (!children) return null;
  return (
    <div className={className}>
      <dt className={detailLabel}>{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

/**
 * The footer, as the store owner edits it in Admin → Storefront → Footer.
 *
 * Every piece of text, link and business detail comes from the published
 * content; a store that has never opened the editor gets the built-in footer,
 * so it looks exactly as it always has. An empty field is simply left out
 * rather than leaving a heading with nothing under it.
 */
export default function Footer({ categories = [], content, logo = null }) {
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

  const footer = content || defaultFooter();
  const {
    newsletter, shop, help, contact, social, legal, bottom,
  } = footer;

  const year = new Date().getFullYear();
  const shopCategories = shop.showCategories === false ? [] : shoppableCategories(categories).slice(0, 6);
  const shopLinks = usableLinks(shop.links);
  const helpLinks = usableLinks(help.links);
  const bottomLinks = usableLinks(bottom.links);
  const phoneHref = telHref(contact.phone);
  const hasContact = Boolean(contact.phone || contact.email || contact.location);
  const addressLines = String(legal.address || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const hasLegal = Boolean(legal.legalName || legal.tradeName || legal.gstin || addressLines.length);
  const hasSocial = Boolean(social.instagram);

  return (
    <footer className="mt-16 border-t border-line bg-paper-sunken sm:mt-20 lg:mt-24">
      {/* ── Newsletter ── */}
      {newsletter.enabled !== false && (
        <div className="border-b border-line">
          <div className="shell section-tight">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center lg:gap-16">
              <div>
                {newsletter.title && <h2 className="text-display-3">{newsletter.title}</h2>}
                {newsletter.description && (
                  <p className="mt-2.5 max-w-md text-sm leading-relaxed text-ink-muted">{newsletter.description}</p>
                )}
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
      )}

      <div className="shell section-tight">
        {/* ── Links ── */}
        {/* Phones: brand, then Shop and Help side by side, then contact — so the footer stays compact. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-10 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 lg:col-span-1">
            <Wordmark logo={logo} className="text-2xl" />
            {footer.tagline && (
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">{footer.tagline}</p>
            )}

            {hasSocial && (
              <div className="mt-5 flex items-center">
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${BRAND_NAME} on Instagram (opens in a new tab)`}
                  className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full border border-line-strong
                             text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  <Instagram size={17} aria-hidden="true" />
                </a>
              </div>
            )}
          </div>

          <LinkColumn id="footer-shop" title={shop.title} links={shopLinks} categories={shopCategories} />
          <LinkColumn id="footer-help" title={help.title} links={helpLinks} />

          {hasContact && (
            <div className="col-span-2 lg:col-span-1">
              <h3 id="footer-contact" className={heading}>{contact.title}</h3>
              <ul aria-labelledby="footer-contact">
                {contact.phone && (
                  <li>
                    <a
                      href={phoneHref}
                      aria-label={`Call ${BRAND_NAME} at ${contact.phone}`}
                      className={contactLink}
                    >
                      <Phone size={14} className="shrink-0" aria-hidden="true" />
                      <span className="whitespace-nowrap">{contact.phone}</span>
                    </a>
                  </li>
                )}
                {contact.email && (
                  <li>
                    <a
                      href={`mailto:${contact.email}`}
                      aria-label={`Email ${BRAND_NAME} at ${contact.email}`}
                      className={contactLink}
                    >
                      <Mail size={14} className="shrink-0" aria-hidden="true" />
                      <span className="min-w-0 break-all">{contact.email}</span>
                    </a>
                  </li>
                )}
                {contact.location && (
                  <li className="flex min-h-[44px] items-center gap-2.5 text-sm text-ink-muted">
                    <MapPin size={14} className="shrink-0" aria-hidden="true" />
                    {contact.location}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* ── Follow + legal ── */}
        {(hasSocial || hasLegal) && (
          <div className="mt-8 grid gap-7 border-t border-line pt-7 sm:mt-10 sm:gap-8 sm:pt-9 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-12">
            {hasSocial && (
              <section aria-labelledby="footer-follow">
                <h3 id="footer-follow" className={heading}>{social.title}</h3>
                <div className="mt-3 flex items-center gap-4">
                  {INSTAGRAM_QR && (
                    <a
                      href={social.instagram}
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
                      href={social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-clay-deep"
                    >
                      <Instagram size={16} aria-hidden="true" />
                      {social.handle || 'Instagram'}
                      <span className="sr-only"> on Instagram (opens in a new tab)</span>
                    </a>
                    {social.note && <p className="text-xs leading-relaxed text-ink-muted">{social.note}</p>}
                  </div>
                </div>
              </section>
            )}

            {hasLegal && (
              <section aria-labelledby="footer-legal">
                <h3 id="footer-legal" className={heading}>{legal.title}</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 text-sm text-ink-soft sm:gap-x-8 xl:grid-cols-[repeat(3,minmax(0,auto))_minmax(0,1.4fr)]">
                  <Detail label="Legal name">{legal.legalName}</Detail>
                  <Detail label="Trade name">{legal.tradeName}</Detail>
                  <Detail label="GSTIN">
                    {legal.gstin ? <span className="tabular-nums tracking-wide">{legal.gstin}</span> : ''}
                  </Detail>
                  <Detail label="Business address" className="col-span-2 sm:col-span-1">
                    {addressLines.length > 0 ? (
                      <address className="not-italic leading-relaxed">
                        {addressLines.map((line) => <span key={line} className="block">{line}</span>)}
                      </address>
                    ) : ''}
                  </Detail>
                </dl>
              </section>
            )}
          </div>
        )}
      </div>

      {/* ── Legal ── */}
      {(bottom.copyright || bottomLinks.length > 0) && (
        <div className="border-t border-line">
          <div className="shell flex flex-col items-center justify-between gap-1 py-4 text-center sm:flex-row sm:py-5 sm:text-left">
            {bottom.copyright && <p className="text-xs text-ink-muted">© {year} {bottom.copyright}</p>}
            <div className="flex items-center gap-4">
              {bottomLinks.map((item) => (
                <ContentLink
                  key={`${item.label}-${item.link}`}
                  to={item.link}
                  className="inline-flex min-h-[44px] items-center text-xs text-ink-muted transition-colors hover:text-ink"
                >
                  {item.label}
                </ContentLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
