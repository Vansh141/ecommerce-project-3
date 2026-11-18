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

/**
 * Column templates.
 *
 * Every part of the footer can be emptied in the admin panel, so no row may
 * assume how many blocks it holds: each template below is chosen from what
 * the owner actually filled in, which re-divides the row instead of leaving a
 * stranded column and a gap. They are written out in full because Tailwind
 * reads class names from the source and cannot assemble them at runtime.
 */

/** The brand, then one column per link group that has something to show. */
const LINK_ROW = {
  0: 'lg:grid-cols-1',
  1: 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]',
  2: 'lg:grid-cols-[minmax(0,1.3fr)_repeat(2,minmax(0,1fr))]',
  3: 'lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]',
};

/** Spread: the details share the width, the address — always last — taking more of it. */
const DETAILS_SPREAD = {
  1: 'grid-cols-1',
  2: 'grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]',
  3: 'grid-cols-2 xl:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,1.4fr)]',
  4: 'grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)]',
};
/** Spread, with no address: nothing needs the extra room, so the columns are equal. */
const DETAILS_SPREAD_SHORT = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-2 xl:grid-cols-3' };
/** Close together: each column is only as wide as what it holds. */
const DETAILS_COMPACT = {
  1: 'grid-cols-1',
  2: 'grid-cols-2 xl:grid-cols-[repeat(2,minmax(0,max-content))]',
  3: 'grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,max-content))]',
  4: 'grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,max-content))]',
};

function detailsGrid(count, hasAddress, layout) {
  if (layout === 'compact') return DETAILS_COMPACT[count] || DETAILS_COMPACT[4];
  if (hasAddress) return DETAILS_SPREAD[count] || DETAILS_SPREAD[4];
  return DETAILS_SPREAD_SHORT[count] || DETAILS_SPREAD_SHORT[3];
}

/** One column of links, hidden entirely when the owner has emptied it. */
function LinkColumn({ id, title, links, categories = [] }) {
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
function Detail({ label, className = '', children }) {
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
 * so it looks exactly as it always has. An empty field is left out rather
 * than leaving a heading with nothing under it, and the rows above keep the
 * remaining blocks evenly divided.
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
  const { newsletter, shop, help, contact, social, legal, bottom } = footer;

  const year = new Date().getFullYear();
  const shopCategories = shop.showCategories === false ? [] : shoppableCategories(categories).slice(0, 6);
  const shopLinks = usableLinks(shop.links);
  const helpLinks = usableLinks(help.links);
  const bottomLinks = usableLinks(bottom.links);

  const showShop = shopLinks.length > 0 || shopCategories.length > 0;
  const showHelp = helpLinks.length > 0;
  const showContact = Boolean(contact.phone || contact.email || contact.location);
  const linkColumns = [showShop, showHelp, showContact].filter(Boolean).length;

  const newsletterText = Boolean(newsletter.title || newsletter.description);
  const phoneHref = telHref(contact.phone);
  const hasSocial = Boolean(social.instagram);

  // The business details, in a fixed order, minus the ones left empty. The
  // address is always last, so it is the column that may be given more room.
  const addressLines = String(legal.address || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const details = [
    ['legalName', 'Legal name', legal.legalName, ''],
    ['tradeName', 'Trade name', legal.tradeName, ''],
    ['gstin', 'GSTIN', legal.gstin, 'tabular-nums tracking-wide'],
  ].filter(([, , value]) => value);
  const detailCount = details.length + (addressLines.length > 0 ? 1 : 0);
  const hasLegal = detailCount > 0;
  // With a single detail the grid is one column, so nothing may span two.
  const addressSpan = detailCount > 1 ? 'col-span-2 sm:col-span-1' : '';

  return (
    <footer className="mt-16 border-t border-line bg-paper-sunken sm:mt-20 lg:mt-24">
      {/* ── Newsletter ── */}
      {newsletter.enabled !== false && (
        <div className="border-b border-line">
          <div className="shell section-tight">
            <div className={`grid gap-6 ${newsletterText ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center lg:gap-16' : ''}`}>
              {newsletterText && (
                <div>
                  {newsletter.title && <h2 className="text-display-3">{newsletter.title}</h2>}
                  {newsletter.description && (
                    <p className="mt-2.5 max-w-md text-sm leading-relaxed text-ink-muted">{newsletter.description}</p>
                  )}
                </div>
              )}

              {/* With no words beside it, the field would stretch the full page. */}
              <form onSubmit={subscribe} className={`w-full ${newsletterText ? '' : 'mx-auto max-w-xl'}`}>
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
        <div className={`grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-10 ${LINK_ROW[linkColumns]}`}>
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

          {showShop && (
            <LinkColumn id="footer-shop" title={shop.title} links={shopLinks} categories={shopCategories} />
          )}
          {showHelp && <LinkColumn id="footer-help" title={help.title} links={helpLinks} />}

          {showContact && (
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
        {/* Two blocks sit side by side; one on its own takes the whole row. */}
        {(hasSocial || hasLegal) && (
          <div
            className={`mt-8 grid gap-7 border-t border-line pt-7 sm:mt-10 sm:gap-8 sm:pt-9 lg:gap-12 ${
              hasSocial && hasLegal ? 'md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]' : 'grid-cols-1'
            }`}
          >
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
                <dl
                  className={`mt-3 grid gap-x-6 gap-y-4 text-sm text-ink-soft sm:gap-x-8 ${
                    detailsGrid(detailCount, addressLines.length > 0, legal.layout)
                  }`}
                >
                  {details.map(([key, label, value, valueClass]) => (
                    <Detail key={key} label={label}>
                      {valueClass ? <span className={valueClass}>{value}</span> : value}
                    </Detail>
                  ))}
                  {addressLines.length > 0 && (
                    <Detail label="Business address" className={addressSpan}>
                      <address className="not-italic leading-relaxed">
                        {addressLines.map((line) => <span key={line} className="block">{line}</span>)}
                      </address>
                    </Detail>
                  )}
                </dl>
              </section>
            )}
          </div>
        )}
      </div>

      {/* ── Legal ── */}
      {(bottom.copyright || bottomLinks.length > 0) && (
        <div className="border-t border-line">
          {/* Whichever of the two is missing, the other keeps its own side. */}
          <div
            className={`shell flex flex-col items-center gap-1 py-4 text-center sm:flex-row sm:py-5 sm:text-left ${
              bottom.copyright ? 'sm:justify-between' : 'sm:justify-end'
            }`}
          >
            {bottom.copyright && <p className="text-xs text-ink-muted">© {year} {bottom.copyright}</p>}
            {bottomLinks.length > 0 && (
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
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
