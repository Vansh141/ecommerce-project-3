import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Minus, Plus, RotateCcw } from 'lucide-react';
import { Button, Modal } from '../ui';
import { DEFAULT_FRAMING, framingStyle, hasCustomFraming, normaliseFraming } from '../../utils/images';

/**
 * Image framing editor, shared by product photos and homepage images.
 *
 * `frames` are the real shapes the image is shown in on the website, so the
 * preview frames it exactly as customers see it. The saved focus point and
 * zoom are applied at render time; the uploaded file is never changed.
 *
 * With `fit="contain"` the website shows the whole image, so there is nothing
 * to reposition: the preview shows it whole and the controls are locked.
 *
 * frames: [{ key, label, aspect: 'aspect-[3/4]', frameClass?: 'mx-auto max-w-[16rem]' }]
 */

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;
const NUDGE_PX = 12;

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const round = (n, places = 2) => Number(n.toFixed(places));

// Along one axis, the photo point shown at the frame's centre is linear in the
// focus percentage: centre(p) = size / 2z + p/100 · span. Dragging and zooming
// both solve that for p, so the picture tracks the pointer and zoom keeps the
// middle of the view in place.
const span = (size, overflow, zoom) => size - size / zoom + overflow;

function movedFocus(p, deltaPx, size, overflow, zoom) {
  const pxPerHundred = span(size, overflow, zoom) * zoom;
  if (pxPerHundred < 1) return p;
  return clamp(p - (100 * deltaPx) / pxPerHundred, 0, 100);
}

function refocusedForZoom(p, size, overflow, zoom, nextZoom) {
  const centre = size / (2 * zoom) + (p / 100) * span(size, overflow, zoom);
  const nextSpan = span(size, overflow, nextZoom);
  if (nextSpan < 1) return 50;
  return clamp(((centre - size / (2 * nextZoom)) * 100) / nextSpan, 0, 100);
}

export default function ImageFramer({
  image,
  frames,
  title = 'Edit image',
  description = 'Drag the photo to adjust how it is framed on your website.',
  size = 'md',
  fit = 'cover',
  notice = null,
  onClose,
  onSave,
}) {
  const frameRef = useRef(null);
  const drag = useRef(null);
  const [framing, setFraming] = useState(() => normaliseFraming(image.framing));
  const [natural, setNatural] = useState(null);
  const [view, setView] = useState(frames[0].key);
  const [dragging, setDragging] = useState(false);

  const frame = frames.find((f) => f.key === view) || frames[0];
  const locked = fit === 'contain';

  /** Frame size and how far the covered photo overflows it, in CSS pixels. */
  const geometry = () => {
    const el = frameRef.current;
    if (!el || !natural) return null;
    const width = el.clientWidth;
    const height = el.clientHeight;
    const cover = Math.max(width / natural.width, height / natural.height);
    return { width, height, overflowX: natural.width * cover - width, overflowY: natural.height * cover - height };
  };

  const move = (dx, dy) => {
    const g = geometry();
    if (!g || locked) return;
    setFraming((f) => ({
      ...f,
      x: movedFocus(f.x, dx, g.width, g.overflowX, f.zoom),
      y: movedFocus(f.y, dy, g.height, g.overflowY, f.zoom),
    }));
  };

  const zoomTo = (value) => {
    if (locked) return;
    const g = geometry();
    setFraming((f) => {
      const zoom = clamp(round(value), ZOOM_MIN, ZOOM_MAX);
      if (!g) return { ...f, zoom };
      return {
        zoom,
        x: refocusedForZoom(f.x, g.width, g.overflowX, f.zoom, zoom),
        y: refocusedForZoom(f.y, g.height, g.overflowY, f.zoom, zoom),
      };
    });
  };

  const onPointerDown = (event) => {
    if (locked || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  };

  const onPointerMove = (event) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current = { x: event.clientX, y: event.clientY };
    move(dx, dy);
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const onKeyDown = (event) => {
    if (locked) return;
    const actions = {
      ArrowLeft: () => move(-NUDGE_PX, 0),
      ArrowRight: () => move(NUDGE_PX, 0),
      ArrowUp: () => move(0, -NUDGE_PX),
      ArrowDown: () => move(0, NUDGE_PX),
      '+': () => zoomTo(framing.zoom + ZOOM_STEP),
      '=': () => zoomTo(framing.zoom + ZOOM_STEP),
      '-': () => zoomTo(framing.zoom - ZOOM_STEP),
      '0': () => setFraming(DEFAULT_FRAMING),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const save = () => {
    const f = normaliseFraming(framing);
    onSave(hasCustomFraming(f) ? { x: round(f.x, 1), y: round(f.y, 1), zoom: round(f.zoom) } : null);
  };

  const canMove = Boolean(natural) && !locked;
  const nudges = [
    { label: 'Move image left', icon: ArrowLeft, run: () => move(-NUDGE_PX, 0) },
    { label: 'Move image up', icon: ArrowUp, run: () => move(0, -NUDGE_PX) },
    { label: 'Move image down', icon: ArrowDown, run: () => move(0, NUDGE_PX) },
    { label: 'Move image right', icon: ArrowRight, run: () => move(NUDGE_PX, 0) },
  ];

  return createPortal(
    <Modal
      open
      onClose={onClose}
      title={title}
      description={locked ? 'Your whole image is shown on the website.' : description}
      size={size}
      footer={
        locked ? (
          <Button variant="ghost" fullWidth onClick={onClose}>Close</Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
            <Button fullWidth onClick={save}>Save image</Button>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {notice}

        {frames.length > 1 && (
          <div
            role="radiogroup"
            aria-label="Preview as"
            className="grid gap-1 rounded-control bg-paper-sunken p-1"
            style={{ gridTemplateColumns: `repeat(${frames.length}, minmax(0, 1fr))` }}
          >
            {frames.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={view === f.key}
                onClick={() => setView(f.key)}
                className={`h-11 rounded-control px-2 text-sm transition-colors ${
                  view === f.key ? 'bg-paper-raised text-ink shadow-card' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        <div
          ref={frameRef}
          role="group"
          tabIndex={locked ? -1 : 0}
          aria-label={
            locked
              ? 'Image preview'
              : 'Photo framing. Drag, or use the arrow keys to move the photo and plus or minus to zoom.'
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className={`relative select-none overflow-hidden rounded-card bg-paper-sunken outline-none ring-offset-2
                      focus-visible:ring-2 focus-visible:ring-clay ${locked ? '' : 'touch-none'}
                      ${frame.aspect} ${frame.frameClass || 'mx-auto w-full'}
                      ${locked ? '' : dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <img
            src={image.url}
            alt=""
            draggable={false}
            onLoad={(e) => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
            style={locked ? undefined : framingStyle(framing)}
            className={`pointer-events-none h-full w-full ${locked ? 'object-contain' : 'object-cover'}`}
          />
          {dragging && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="border border-paper/40" />
              ))}
            </div>
          )}
        </div>

        {!locked && (
          <>
            <div>
              <span className="field-label" id="framer-zoom-label">Zoom</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button" variant="ghost" size="sm" className="h-11 w-11 shrink-0 px-0"
                  onClick={() => zoomTo(framing.zoom - ZOOM_STEP)} disabled={framing.zoom <= ZOOM_MIN}
                  aria-label="Zoom out"
                >
                  <Minus size={15} aria-hidden="true" />
                </Button>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step={0.05}
                  value={framing.zoom}
                  onChange={(e) => zoomTo(Number(e.target.value))}
                  aria-labelledby="framer-zoom-label"
                  aria-valuetext={`${Math.round(framing.zoom * 100)}%`}
                  className="h-11 min-w-0 flex-1 cursor-pointer accent-ink"
                />
                <Button
                  type="button" variant="ghost" size="sm" className="h-11 w-11 shrink-0 px-0"
                  onClick={() => zoomTo(framing.zoom + ZOOM_STEP)} disabled={framing.zoom >= ZOOM_MAX}
                  aria-label="Zoom in"
                >
                  <Plus size={15} aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div>
              <span className="field-label">Move image</span>
              <div className="flex flex-wrap items-center gap-2">
                {nudges.map(({ label, icon: Icon, run }) => (
                  <Button
                    key={label} type="button" variant="ghost" size="sm" className="h-11 w-11 px-0"
                    onClick={run} disabled={!canMove} aria-label={label} title={label}
                  >
                    <Icon size={15} aria-hidden="true" />
                  </Button>
                ))}
                <Button
                  type="button" variant="quiet" size="sm" className="ml-auto h-11"
                  onClick={() => setFraming(DEFAULT_FRAMING)} disabled={!hasCustomFraming(framing)}
                >
                  <RotateCcw size={14} aria-hidden="true" /> Reset
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>,
    document.body
  );
}
