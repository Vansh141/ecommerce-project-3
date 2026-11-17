import { BRAND_NAME } from '../../config/business';

/**
 * The TOUCHH wordmark, set in the display serif — or the logo picture the
 * store owner uploaded in Admin → Storefront → Menu Bar, which takes its
 * place. The picture is sized from the same `className`, so it sits exactly
 * where the words did at every screen size.
 *
 * Letter-spacing also adds space after the final letter, which pushes a
 * centred wordmark slightly left of centre; the negative right margin takes
 * that trailing space back out.
 */
export default function Wordmark({ className = '', logo = null }) {
  if (logo?.url) {
    return (
      <span className={`inline-block leading-none ${className}`}>
        <img
          src={logo.url}
          alt={logo.alt || BRAND_NAME}
          width={logo.width || undefined}
          height={logo.height || undefined}
          className="block h-[1.7em] w-auto max-w-[11rem] object-contain object-left sm:max-w-[14rem]"
        />
      </span>
    );
  }

  return (
    <span
      className={`mr-[-0.28em] inline-block font-display font-medium uppercase leading-none
                  tracking-luxe text-ink ${className}`}
    >
      {BRAND_NAME}
    </span>
  );
}
