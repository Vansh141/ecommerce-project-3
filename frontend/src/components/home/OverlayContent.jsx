import { ArrowRight } from 'lucide-react';
import { Button } from '../ui';
import { contentLinkProps } from '../../utils/links';
import { OVERLAY_LAYER, OVERLAY_TEXT, TEXT_BOX } from './imageOverlay';

/**
 * The words and button laid over a full photograph, with the shading that
 * keeps them readable. Renders nothing — not even shading — when there are no
 * words, so an uploaded artwork is shown untouched.
 *
 * The parent is `relative` and sized by the design; this fills it.
 */

const SIZES = {
  hero: {
    heading: 'text-[2.125rem] leading-[1.04] sm:text-5xl lg:text-[3.75rem]',
    box: 'max-w-[36rem]',
    pad: 'px-5 pb-16 pt-10 sm:px-8 md:py-12 lg:px-12',
  },
  section: {
    heading: 'text-[clamp(1.625rem,7.4vw,2rem)] leading-[1.1] sm:text-[2.125rem] lg:text-[2.625rem]',
    box: 'max-w-[28rem]',
    pad: 'p-6 pb-8 sm:p-10 lg:p-14',
    rule: true,
    phoneDescription: true,
  },
  // A promotion banner can be much shorter than a hero, so everything is tighter.
  promotion: {
    heading: 'text-[1.5rem] leading-[1.12] sm:text-[1.875rem] lg:text-[2.25rem]',
    box: 'max-w-[26rem]',
    pad: 'p-5 sm:p-8 md:px-10 md:py-6 lg:p-12',
    button: 'mt-4 h-11 max-w-full whitespace-nowrap sm:px-6 lg:mt-6',
  },
};

export function hasOverlayWords(content) {
  return Boolean(content.eyebrow || content.heading || content.accentText || content.description || content.buttonText);
}

export default function OverlayContent({
  content, position = 'left', overlay = 'medium', titleId, titleAs: Title = 'h2', size = 'section', loading = false,
  shade,
}) {
  if (!hasOverlayWords(content)) return null;

  const { eyebrow, heading, accentText, description, buttonText, buttonShortText, link } = content;
  const tone = OVERLAY_TEXT[overlay] || OVERLAY_TEXT.medium;
  const layer = (OVERLAY_LAYER[overlay] || OVERLAY_LAYER.medium)[position] || OVERLAY_LAYER.medium.left;
  const box = TEXT_BOX[position] || TEXT_BOX.left;
  const scale = SIZES[size] || SIZES.section;
  const buttonLink = contentLinkProps(link);

  return (
    <>
      {/* `shade` (0–100) scales the shading, when a section offers that setting. */}
      <div
        aria-hidden="true"
        style={typeof shade === 'number' ? { opacity: shade / 100 } : undefined}
        className={`pointer-events-none absolute inset-0 ${layer}`}
      />
      <div className={`pointer-events-none relative mx-auto flex h-full w-full max-w-site items-end md:items-center ${scale.pad}`}>
        <div className={`pointer-events-auto flex w-full flex-col ${scale.box} ${box}`}>
          {eyebrow && (
            <p className={`text-[0.6875rem] font-medium uppercase tracking-[0.22em] ${tone.eyebrow}`}>{eyebrow}</p>
          )}
          {(heading || accentText) && (
            <Title id={titleId} className={`mt-2.5 font-display ${scale.heading} ${tone.heading}`}>
              {heading && <span className="block">{heading}</span>}
              {accentText && <span className={`block italic ${tone.accent}`}>{accentText}</span>}
            </Title>
          )}
          {scale.rule && (
            <span aria-hidden="true" className={`mt-5 block h-px w-10 ${overlay === 'light' ? 'bg-clay' : 'bg-gold'}`} />
          )}
          {description && !loading && (
            <p
              className={`max-w-[40ch] text-sm leading-relaxed ${scale.rule ? 'mt-5' : 'mt-3'} ${
                scale.phoneDescription ? '' : 'hidden sm:block'
              } ${tone.body}`}
            >
              {description}
            </p>
          )}
          {buttonText && buttonLink && !loading && (
            <Button
              {...buttonLink}
              size="sm"
              className={`btn-pill ${scale.button || 'mt-5 h-11 max-w-full whitespace-nowrap sm:mt-7 sm:px-6'} ${tone.button}`}
            >
              {buttonShortText ? (
                <>
                  <span className="sm:hidden">{buttonShortText}</span>
                  <span className="hidden sm:inline">{buttonText}</span>
                </>
              ) : (
                <span className="truncate">{buttonText}</span>
              )}
              <ArrowRight size={14} aria-hidden="true" className="shrink-0" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
