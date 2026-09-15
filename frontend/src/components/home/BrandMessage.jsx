import { Button } from '../ui';
import { contentLinkProps } from '../../utils/links';

/**
 * Brand message: a short editorial statement in the site's own type.
 * Plain text only — line breaks are kept, markup never reaches the page.
 */
export default function BrandMessage({ section }) {
  const titleId = `${section.id}-title`;
  const centred = section.alignment !== 'left';
  const sand = section.theme === 'sand';
  const buttonLink = contentLinkProps(section.link);

  return (
    <section aria-labelledby={titleId} className="shell pt-12 sm:pt-16 lg:pt-20">
      <div
        className={`${sand ? 'rounded-card bg-paper-sunken px-6 py-10 sm:px-12 sm:py-14' : 'border-y border-line py-10 sm:py-14'} ${
          centred ? 'text-center' : ''
        }`}
      >
        <div className={`max-w-2xl ${centred ? 'mx-auto' : ''}`}>
          {section.eyebrow && (
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-clay-deep">{section.eyebrow}</p>
          )}
          <h2
            id={titleId}
            className={`font-display text-[1.75rem] leading-tight text-ink sm:text-display-2 ${section.eyebrow ? 'mt-3' : ''}`}
          >
            {section.title}
          </h2>
          {section.description && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-muted sm:text-base">
              {section.description}
            </p>
          )}
          {section.buttonText && buttonLink && (
            <Button {...buttonLink} variant="secondary" className="mt-6">
              {section.buttonText}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
