import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import EditorialHero from './EditorialHero';
import FullBannerHero from './FullBannerHero';
import { BUILT_IN_HERO_NOTE, HERO_INTERVALS, heroSlides } from '../../config/storefront';

/**
 * Main Banner — one to four banners taking turns at the top of the homepage.
 *
 * Each banner is a full banner (one complete piece of artwork, shown whole)
 * or the structured hero, drawn by the same components as a single banner,
 * so every design and height rule still applies.
 *
 * Behaviour:
 *  - A soft cross-fade. With autoplay on, each banner stays for the chosen
 *    3, 4 or 5 seconds, then the next one appears, looping.
 *  - One timer at a time: every change of banner, pause or setting replaces
 *    it, and it is cleared on unmount. A manual change starts the full wait
 *    again, so the banner never switches straight after a click.
 *  - Waits while a mouse is over the banner, while keyboard focus is inside it
 *    and while the tab is hidden, and resumes shortly after.
 *  - Arrows (from tablets), dots and swipe; arrow keys on the controls.
 *  - Reduced motion: never changes by itself; manual controls still work.
 *
 * Loading: all banners keep their layout in the page (so the height never
 * changes when one appears), but only the current banner loads images, and
 * the next one a moment later. Phones download only phone images, through
 * each banner's own <picture>.
 *
 * Accessibility: only the current banner is exposed (the others are hidden
 * and inert); the first banner holds the page's h1. A banner whose artwork
 * fails is skipped; with none left, the built-in hero is shown.
 */

const RESUME_DELAY_MS = 700;
const PRELOAD_NEXT_AFTER_MS = 1200;
const SWIPE_DISTANCE = 40;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const usable = (slide) => Boolean(slide) && slide.enabled !== false
  && (slide.mode === 'banner' ? Boolean(slide.banner?.desktopImage?.url) : Boolean(slide.structured?.heading));

const slideKey = (slide) => `${slide.id}|${slide.mode}|${slide.mode === 'banner' ? slide.banner?.desktopImage?.url : ''}`;

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(REDUCED_MOTION).matches)
  );
  useEffect(() => {
    const query = window.matchMedia?.(REDUCED_MOTION);
    if (!query) return undefined;
    const change = () => setReduced(query.matches);
    query.addEventListener?.('change', change);
    return () => query.removeEventListener?.('change', change);
  }, []);
  return reduced;
}

function Slide({ slide, position, fromCms, categories, showImages, onFailed }) {
  const title = position === 0
    ? { titleId: 'hero-title', titleAs: 'h1' }
    : { titleId: `hero-title-${position + 1}`, titleAs: 'h2' };

  if (slide.mode === 'banner') {
    return (
      <FullBannerHero
        banner={slide.banner}
        onError={() => onFailed(slide)}
        priority={position === 0}
        deferImage={!showImages}
        className="h-full"
        {...title}
      />
    );
  }
  return (
    <EditorialHero
      hero={slide.structured}
      // The built-in two-line closing note stays while the caption is unchanged.
      builtIn={!fromCms || slide.structured.detailCaption === BUILT_IN_HERO_NOTE}
      categories={categories}
      priority={position === 0}
      deferImages={!showImages}
      className="h-full"
      {...title}
    />
  );
}

export default function HeroCarousel({ section, fromCms, categories = [], loading = false, fallbackHero }) {
  const [failed, setFailed] = useState(() => new Set());
  const slides = useMemo(
    () => heroSlides(section).filter((slide) => usable(slide) && !failed.has(slideKey(slide))),
    [section, failed]
  );
  const count = slides.length;

  const [position, setPosition] = useState(0);
  const [restart, setRestart] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [loaded, setLoaded] = useState(() => new Set());
  const reduced = useReducedMotion();
  const hoverTimer = useRef(null);
  const focusTimer = useRef(null);
  const touchStart = useRef(null);
  const swipedAt = useRef(0);

  const active = count > 0 ? position % count : 0;
  const seconds = HERO_INTERVALS.includes(Number(section.interval)) ? Number(section.interval) : 4;
  const autoplay = section.autoplay !== false && count > 1 && !reduced;
  const paused = hovered || focused || pageHidden;

  // The one autoplay timer.
  useEffect(() => {
    if (!autoplay || paused) return undefined;
    const timer = setTimeout(() => setPosition((current) => ((current % count) + 1) % count), seconds * 1000);
    return () => clearTimeout(timer);
  }, [autoplay, paused, active, count, seconds, restart]);

  useEffect(() => {
    const change = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);

  useEffect(() => () => {
    clearTimeout(hoverTimer.current);
    clearTimeout(focusTimer.current);
  }, []);

  // Images: the current banner now, the next one shortly after.
  const currentKey = count > 0 ? slideKey(slides[active]) : null;
  const nextKey = count > 1 ? slideKey(slides[(active + 1) % count]) : null;
  useEffect(() => {
    if (!currentKey) return undefined;
    setLoaded((set) => (set.has(currentKey) ? set : new Set(set).add(currentKey)));
    if (!nextKey) return undefined;
    const timer = setTimeout(
      () => setLoaded((set) => (set.has(nextKey) ? set : new Set(set).add(nextKey))),
      PRELOAD_NEXT_AFTER_MS
    );
    return () => clearTimeout(timer);
  }, [currentKey, nextKey]);

  const markFailed = (slide) => setFailed((set) => new Set(set).add(slideKey(slide)));

  if (loading) {
    const first = heroSlides(section)[0];
    const structured = first?.mode === 'structured';
    return (
      <EditorialHero
        hero={structured ? first.structured : fallbackHero}
        builtIn={!fromCms || !structured || first.structured.detailCaption === BUILT_IN_HERO_NOTE}
        categories={categories}
        loading
      />
    );
  }

  // Never an empty hero.
  if (count === 0) return <EditorialHero hero={fallbackHero} builtIn categories={categories} />;

  if (count === 1) {
    return <Slide slide={slides[0]} position={0} fromCms={fromCms} categories={categories} showImages onFailed={markFailed} />;
  }

  const goTo = (target) => {
    setPosition(((target % count) + count) % count);
    setRestart((n) => n + 1);
  };

  // Next and previous step from the latest banner, so presses in quick succession never skip one.
  const step = (delta) => {
    setPosition((current) => ((((current % count) + delta) % count) + count) % count);
    setRestart((n) => n + 1);
  };

  const pointerEnter = (event) => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(hoverTimer.current);
    setHovered(true);
  };
  const pointerLeave = (event) => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(false), RESUME_DELAY_MS);
  };
  // Keyboard focus only: a mouse click leaves focus behind, which must not stop the banners for good.
  const focusIn = (event) => {
    if (!event.target.matches?.(':focus-visible')) return;
    clearTimeout(focusTimer.current);
    setFocused(true);
  };
  const focusOut = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => setFocused(false), RESUME_DELAY_MS);
  };
  const touchBegin = (event) => {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const touchFinish = (event) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swipedAt.current = Date.now();
    step(dx < 0 ? 1 : -1);
  };
  const touchCancel = () => {
    touchStart.current = null;
  };
  // A swipe across a clickable banner changes the banner; it must not also open its link.
  const clickCapture = (event) => {
    if (Date.now() - swipedAt.current < 500) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const keyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Main banner"
      // pan-y: sideways finger movement belongs to the banner, up and down still scrolls the page.
      className="relative touch-pan-y"
      onPointerEnter={pointerEnter}
      onPointerLeave={pointerLeave}
      onFocus={focusIn}
      onBlur={focusOut}
      onTouchStart={touchBegin}
      onTouchEnd={touchFinish}
      onTouchCancel={touchCancel}
      onClickCapture={clickCapture}
    >
      <div className="grid">
        {slides.map((slide, index) => {
          const current = index === active;
          const key = slideKey(slide);
          return (
            <div
              key={key}
              role="group"
              aria-roledescription="slide"
              aria-label={`Banner ${index + 1} of ${count}`}
              aria-hidden={current ? undefined : 'true'}
              {...(current ? {} : { inert: '' })}
              className={`min-w-0 transition-opacity duration-700 ease-luxe [grid-area:1/1] ${
                current ? 'relative z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
              }`}
            >
              <Slide
                slide={slide}
                position={index}
                fromCms={fromCms}
                categories={categories}
                showImages={current || loaded.has(key)}
                onFailed={markFailed}
              />
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center sm:bottom-4">
        <div
          data-hero-controls
          onKeyDown={keyDown}
          className="pointer-events-auto flex items-center rounded-full bg-paper/85 px-1 shadow-sm ring-1 ring-ink/10 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous banner"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 md:flex"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          {slides.map((slide, index) => (
            <button
              key={slideKey(slide)}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to banner ${index + 1}`}
              aria-current={index === active ? 'true' : undefined}
              className="flex h-8 w-7 items-center justify-center rounded-full"
            >
              <span
                aria-hidden="true"
                className={`block h-1.5 rounded-full transition-all duration-500 ease-luxe ${index === active ? 'w-5 bg-ink' : 'w-1.5 bg-ink/30'}`}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next banner"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 md:flex"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live={autoplay && !paused ? 'off' : 'polite'} aria-atomic="true">
        Banner {active + 1} of {count}
      </p>
    </section>
  );
}
