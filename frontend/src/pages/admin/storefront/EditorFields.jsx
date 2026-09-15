import { useId, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, Crop, HelpCircle, ImagePlus, Info, Plus, Trash2, Upload, X,
} from 'lucide-react';
import { uploadApi } from '../../../api/endpoints';
import { useToast } from '../../../context/ToastContext';
import { Button, Checkbox, Input, Select, Textarea } from '../../../components/ui';
import ImageFramer from '../../../components/admin/ImageFramer';
import { framingStyle } from '../../../utils/images';
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, getIn, useEditor } from './editorContext';

/**
 * Form controls for the homepage editor. Every field reads and writes one
 * path in the content and shows the API's message for that path, so a
 * rejected save points at the exact field. Labels and messages are written
 * for a store owner, not a developer.
 */

/** A small "?" beside a label that explains the field in one plain sentence. */
export function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative ml-1 inline-flex align-middle normal-case tracking-normal">
      <button
        type="button"
        aria-label="What is this?"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          // Inside a <label>: don't move focus to the field or toggle a checkbox.
          e.preventDefault();
          e.stopPropagation();
          setOpen((current) => !current);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        className="-my-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay"
      >
        <HelpCircle size={15} aria-hidden="true" />
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute left-0 top-7 z-40 w-64 max-w-[75vw] rounded-control bg-ink px-3 py-2 text-xs font-normal leading-relaxed text-paper shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}

const withHelp = (label, help) => (help ? <>{label}<HelpTip text={help} /></> : label);

export function Card({ title, description, children }) {
  return (
    <section className="card p-5 sm:p-6">
      {(title || description) && (
        <header className="mb-5">
          {title && <h3 className="text-base font-medium text-ink">{title}</h3>}
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </header>
      )}
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function Notice({ tone = 'warning', children }) {
  const tones = { warning: 'bg-warning-faint text-warning', info: 'bg-info-faint text-info' };
  const Icon = tone === 'info' ? Info : AlertTriangle;
  return (
    <p className={`flex items-start gap-2 rounded-control px-3 py-2 text-xs leading-relaxed ${tones[tone] || tones.warning}`}>
      <Icon size={14} className="mt-px shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function TextField({ path, label, max, hint, help, required = false, multiline = false, rows = 3, placeholder }) {
  const { form, errors, update } = useEditor();
  const value = getIn(form, path) ?? '';
  const counter = `${String(value).length}/${max}`;
  const shared = {
    label: withHelp(label, help),
    required,
    value,
    maxLength: max,
    placeholder,
    onChange: (e) => update(path, e.target.value),
    error: errors[path.join('.')],
    hint: hint ? `${hint} · ${counter}` : counter,
  };
  return multiline ? <Textarea {...shared} rows={rows} /> : <Input {...shared} />;
}

export function NumberField({ path, label, min, max, hint, help }) {
  const { form, errors, update } = useEditor();
  const value = getIn(form, path);
  return (
    <Input
      type="number"
      inputMode="numeric"
      label={withHelp(label, help)}
      min={min}
      max={max}
      step={1}
      value={value ?? ''}
      onChange={(e) => update(path, e.target.value === '' ? '' : Number(e.target.value))}
      error={errors[path.join('.')]}
      hint={hint}
    />
  );
}

export function ToggleField({ path, label }) {
  const { form, update } = useEditor();
  return (
    <Checkbox
      label={label}
      checked={Boolean(getIn(form, path))}
      onChange={(e) => update(path, e.target.checked)}
      className="min-h-[44px] items-center"
    />
  );
}

export function SelectField({ path, label, options, help, numeric = false }) {
  const { form, errors, update } = useEditor();
  return (
    <Select
      label={withHelp(label, help)}
      value={String(getIn(form, path) ?? '')}
      onChange={(e) => update(path, numeric ? Number(e.target.value) : e.target.value)}
      error={errors[path.join('.')]}
    >
      {options.map(([value, text]) => (
        <option key={value} value={value}>{text}</option>
      ))}
    </Select>
  );
}

/** Large, clearly explained choices: one card per option, each with a sentence. */
export function SegmentedControl({ label, help, value, options, onChange }) {
  return (
    <fieldset>
      <legend className="field-label">{withHelp(label, help)}</legend>
      <div role="radiogroup" aria-label={label} className="grid gap-3 sm:grid-cols-2">
        {options.map(([key, title, description]) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(key)}
              className={`min-h-[44px] rounded-control border p-4 text-left transition-colors ${
                active ? 'border-ink bg-paper-raised ring-1 ring-ink' : 'border-line bg-paper-raised hover:border-ink/40'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? 'border-ink' : 'border-line-strong'}`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-ink" />}
                </span>
                {title}
              </span>
              {description && <span className="mt-1.5 block text-xs leading-relaxed text-ink-muted">{description}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A friendly sentence for an upload that did not work — never a raw error code. */
function uploadErrorMessage(err) {
  const code = String(err?.errorCode || '');
  if (!err?.response) return err?.friendlyMessage || 'That image couldn’t be uploaded. Please try again.';
  if (/SIZE/.test(code) || err.response.status === 413) return 'That image is too large. Please use an image under 5 MB.';
  if (/IMAGE|TYPE|FILE/.test(code)) return 'Please upload a JPG, PNG or WebP image.';
  if (err.response.status === 429) return 'Too many uploads in a short time. Please wait a few minutes and try again.';
  return 'That image couldn’t be uploaded. Please try another image.';
}

/**
 * Image upload through the existing hardened endpoint: the API checks the
 * file's bytes, re-encodes it and stores it (Cloudinary in production). Only
 * the resulting URL, storage id and dimensions are kept in the content.
 *
 * With `framingFrames`, an "Edit image" button opens the framing editor in
 * those shapes; the chosen focus and zoom are saved on the image as `framing`.
 */
export function ImageField({
  path, label, hint, help, recommended, aspect = 'aspect-[4/3]', emptyText = 'No image yet', required = false,
  showAlt = true, advice, framingFrames, fit = 'cover', framingNotice = null, framingSize = 'lg',
}) {
  const { form, errors, update, trackUpload } = useEditor();
  const toast = useToast();
  const inputId = useId();
  const value = getIn(form, path);
  const [progress, setProgress] = useState(null);
  const [brokenUrl, setBrokenUrl] = useState(null);
  const [framing, setFraming] = useState(false);
  const uploading = progress !== null;
  const broken = Boolean(value?.url) && brokenUrl === value.url;
  const key = path.join('.');
  const fieldError = errors[`${key}.url`] || errors[`${key}.framing`] || errors[key];
  const canFrame = Boolean(value?.url) && framingFrames?.length > 0;

  const saveFraming = (next) => {
    if (next) {
      update([...path, 'framing'], next);
    } else {
      const image = { ...value };
      delete image.framing;
      update(path, image);
    }
    setFraming(false);
  };

  const choose = async (file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('That image is too large. Please use an image under 5 MB.');
      return;
    }

    setProgress(0);
    trackUpload(1);
    try {
      const { image } = await uploadApi.storefrontImage(file, setProgress);
      update(path, {
        url: image.url,
        publicId: image.publicId || '',
        width: image.width ?? null,
        height: image.height ?? null,
        alt: value?.alt || '',
      });
      toast.success('Image added. Remember to save or publish your changes.');
    } catch (err) {
      toast.error(uploadErrorMessage(err));
    } finally {
      setProgress(null);
      trackUpload(-1);
    }
  };

  // Guidance about the uploaded image — shown, never enforced.
  const notes = value?.width && value?.height && advice ? advice(value) : [];
  const tooSmall = value?.width && recommended && value.width < recommended.width * 0.6;

  return (
    <div>
      <span className="field-label">
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-danger">*</span>}
        {help && <HelpTip text={help} />}
      </span>

      <div className={`relative ${aspect} w-full overflow-hidden rounded-control border border-line bg-paper-sunken`}>
        {value?.url && broken ? (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-danger-faint px-3 text-center text-danger">
            <ImagePlus size={20} aria-hidden="true" />
            <span className="text-2xs">This image can’t be shown. Please replace it or remove it.</span>
          </div>
        ) : value?.url ? (
          <img
            src={value.url}
            alt=""
            onError={() => setBrokenUrl(value.url)}
            style={framingFrames && fit === 'cover' ? framingStyle(value.framing) : undefined}
            className={`absolute inset-0 h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center text-ink-faint">
            <ImagePlus size={20} aria-hidden="true" />
            <span className="text-2xs">{emptyText}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-paper-raised/85 text-xs font-medium text-ink">
            Uploading… {progress}%
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {canFrame && (
          <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={() => setFraming(true)} disabled={uploading || broken}>
            <Crop size={13} aria-hidden="true" /> Edit image
          </Button>
        )}
        <label
          htmlFor={inputId}
          className={`btn-ghost btn-sm min-h-[44px] cursor-pointer focus-within:ring-2 focus-within:ring-clay ${
            uploading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <input
            id={inputId}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <Upload size={13} aria-hidden="true" />
          {value?.url ? 'Replace image' : 'Upload image'}
        </label>
        {value?.url && (
          <Button size="sm" variant="quiet" className="min-h-[44px]" onClick={() => update(path, null)} disabled={uploading}>
            <X size={13} aria-hidden="true" /> Remove image
          </Button>
        )}
      </div>

      {hint && <p className="field-hint">{hint}</p>}
      {recommended && (
        <p className="field-hint">
          Recommended size: {recommended.width} × {recommended.height}. Use a high-quality JPG, PNG or WebP image (up to 5 MB).
        </p>
      )}
      {value?.width && value?.height && (
        <p className="field-hint">Uploaded: {value.width} × {value.height}px.</p>
      )}
      {notes.map((note) => (
        <Notice key={note.text} tone={note.tone}>{note.text}</Notice>
      ))}
      {tooSmall && <Notice>This image may look blurry on large screens.</Notice>}
      {fieldError && <p className="field-msg-error">{fieldError}</p>}

      {showAlt && value?.url && (
        <Input
          className="mt-3"
          label={withHelp('Image description', 'A few words about the picture. It helps people using screen readers and helps Google understand your page.')}
          value={value.alt || ''}
          maxLength={160}
          placeholder="Model wearing a red silk saree"
          onChange={(e) => update([...path, 'alt'], e.target.value)}
          error={errors[`${key}.alt`]}
        />
      )}

      {framing && canFrame && (
        <ImageFramer
          image={value}
          frames={framingFrames}
          size={framingSize}
          fit={fit}
          notice={framingNotice}
          onClose={() => setFraming(false)}
          onSave={saveFraming}
        />
      )}
    </div>
  );
}

/**
 * A list of items inside a section — categories, promotions, benefits. Each
 * item can have a visual heading (renderTitle), and can be moved or removed.
 */
export function ListEditor({ path, max, itemLabel, addLabel, createItem, emptyText, renderTitle, children }) {
  const { form, errors, modify } = useEditor();
  const items = getIn(form, path) || [];
  const listError = errors[path.join('.')];

  const move = (from, to) =>
    modify(path, (current = []) => {
      if (to < 0 || to >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  return (
    <div className="space-y-3">
      {listError && <p className="field-msg-error">{listError}</p>}
      {items.length === 0 ? (
        <p className="rounded-control border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-muted">
          {emptyText}
        </p>
      ) : (
        <ol className="space-y-3">
          {items.map((item, index) => (
            // Index keys are safe: every field is controlled by the form state.
            <li key={index} className="rounded-control border border-line bg-paper-raised p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {renderTitle ? renderTitle(item, index) : (
                    <p className="text-2xs font-medium uppercase tracking-wider2 text-ink-muted">
                      {itemLabel} {index + 1}
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    className="icon-btn h-11 w-11 disabled:opacity-30"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} up`}
                    title="Move up"
                  >
                    <ArrowUp size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn h-11 w-11 disabled:opacity-30"
                    onClick={() => move(index, index + 1)}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} down`}
                    title="Move down"
                  >
                    <ArrowDown size={15} aria-hidden="true" />
                  </button>
                  <Button
                    size="sm"
                    variant="quiet"
                    className="min-h-[44px] text-danger"
                    onClick={() => modify(path, (current = []) => current.filter((_, i) => i !== index))}
                    aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                  >
                    <Trash2 size={14} aria-hidden="true" /> Remove
                  </Button>
                </div>
              </div>
              <div className="space-y-4">{children([...path, index], item, index)}</div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="min-h-[44px]"
          onClick={() => modify(path, (current = []) => (current.length >= max ? current : [...current, createItem()]))}
          disabled={items.length >= max}
        >
          <Plus size={14} aria-hidden="true" /> {addLabel}
        </Button>
        <p className="text-xs text-ink-faint">
          {items.length} of {max} · shown on your website in this order
        </p>
      </div>
    </div>
  );
}
