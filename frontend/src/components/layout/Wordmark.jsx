import { BRAND_NAME } from '../../config/business';

/**
 * The TOUCHH wordmark, set in the display serif.
 *
 * Letter-spacing also adds space after the final letter, which pushes a
 * centred wordmark slightly left of centre; the negative right margin takes
 * that trailing space back out.
 */
export default function Wordmark({ className = '' }) {
  return (
    <span
      className={`mr-[-0.28em] inline-block font-display font-medium uppercase leading-none
                  tracking-luxe text-ink ${className}`}
    >
      {BRAND_NAME}
    </span>
  );
}
