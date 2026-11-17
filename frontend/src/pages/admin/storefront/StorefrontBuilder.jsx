import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDown, ArrowUp, ChevronLeft, Copy, Eye, EyeOff, Globe, GripVertical, HelpCircle, History, Megaphone, PanelBottom,
  PanelTop, Pencil, Plus, Send, Trash2, Undo2,
} from 'lucide-react';
import { categoryApi, paymentApi, storefrontApi } from '../../../api/endpoints';
import { useDocumentMeta } from '../../../hooks';
import { useSectionProducts } from '../../../hooks/useSectionProducts';
import { useToast } from '../../../context/ToastContext';
import { Alert, Button, ConfirmDialog, Modal, Skeleton } from '../../../components/ui';
import {
  PRODUCT_SECTION_TYPES, SECTION_TYPES, STOREFRONT_ICON_KEYS, STOREFRONT_LIMITS, createSection, defaultStorefrontContent, withCategoryRail,
  heroSlides, newSectionId, normalizeSection, resolveFooter, resolveHeader,
} from '../../../config/storefront';
import { formatDate } from '../../../utils/format';
import { EditorContext, getIn, setIn } from './editorContext';
import { GLOBAL_META, SECTION_META, categoriesAsItems, sectionSummary, sectionTitle } from './sectionMeta';
import SectionPreview from './SectionPreview';
import { AnnouncementEditor, FooterEditor, HeaderEditor, SectionEditor, SeoEditor } from './SectionEditors';

/**
 * Admin → Storefront → Homepage.
 *
 * The current homepage, shown as the cards of its sections — the real banner,
 * the real category circles, the products each section shows today. The
 * store owner clicks a card to edit it, and can hide, show, move, copy and
 * delete sections or add new ones. Nothing is live until "Publish": "Save
 * Changes" keeps the work, "Preview Website" opens the real homepage rendered
 * from the saved draft (admins only), and "Undo changes" returns the draft to
 * what is live.
 *
 * The existing homepage is always the starting point. The first time the
 * editor opens and nothing has been published, the homepage customers see —
 * the built-in design, with the category circles it shows today as an
 * editable list — is saved and published once as the initial configuration.
 * It renders exactly as before, so customers notice nothing, and from then on
 * the owner edits their real homepage instead of building one.
 *
 * The editor changes content only. Layout, type, spacing and accessibility
 * belong to the site's components, so no change here can break the design.
 */

const str = (value) => (typeof value === 'string' ? value : '');
const image = (value) =>
  value && typeof value === 'object' && value.url
    ? { url: value.url, publicId: str(value.publicId), width: value.width ?? null, height: value.height ?? null, alt: str(value.alt) }
    : null;

/** Short phone labels belong to the built-in copy, not to editable content. */
function withoutBuiltInLabels(section) {
  const clean = { ...section };
  delete clean.buttonShortText;
  const strip = (structured) => {
    if (!structured) return structured;
    const copy = { ...structured };
    delete copy.primaryButtonShortText;
    return copy;
  };
  if (clean.structured) clean.structured = strip(clean.structured);
  if (Array.isArray(clean.slides)) clean.slides = clean.slides.map((slide) => ({ ...slide, structured: strip(slide.structured) }));
  return clean;
}

/**
 * The Main Banner is edited as a list of banners. A hero saved before banners
 * existed becomes a list of one, with exactly the same content.
 */
function withSlides(section) {
  if (section.type !== 'hero' || section.slides.length > 0) return section;
  return {
    ...section,
    slides: heroSlides(section).map((slide) => ({ ...slide, banner: { ...slide.banner }, structured: { ...slide.structured } })),
  };
}

const hasSavedContent = (raw) => Boolean(raw) && typeof raw === 'object' && Array.isArray(raw.sections);

/** A saved list of links, as the editor holds them — nothing else rides along. */
const linkList = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    enabled: item?.enabled !== false,
    label: str(item?.label),
    link: str(item?.link),
  }));

/** The menu bar as the editor holds it, over the built-in one. */
function editableHeader(raw) {
  const header = resolveHeader(raw);
  return {
    logo: image(header.logo),
    links: linkList(header.links),
    showCategories: header.showCategories !== false,
    sale: {
      enabled: header.sale.enabled !== false,
      label: str(header.sale.label),
      link: str(header.sale.link),
    },
  };
}

/** The footer as the editor holds it, over the built-in one. */
function editableFooter(raw) {
  const footer = resolveFooter(raw);
  return {
    tagline: str(footer.tagline),
    newsletter: {
      enabled: footer.newsletter.enabled !== false,
      title: str(footer.newsletter.title),
      description: str(footer.newsletter.description),
    },
    shop: {
      title: str(footer.shop.title),
      showCategories: footer.shop.showCategories !== false,
      links: linkList(footer.shop.links),
    },
    help: { title: str(footer.help.title), links: linkList(footer.help.links) },
    contact: {
      title: str(footer.contact.title),
      phone: str(footer.contact.phone),
      email: str(footer.contact.email),
      location: str(footer.contact.location),
    },
    social: {
      title: str(footer.social.title),
      instagram: str(footer.social.instagram),
      handle: str(footer.social.handle),
      note: str(footer.social.note),
    },
    legal: {
      title: str(footer.legal.title),
      legalName: str(footer.legal.legalName),
      tradeName: str(footer.legal.tradeName),
      gstin: str(footer.legal.gstin),
      address: str(footer.legal.address),
    },
    bottom: { copyright: str(footer.bottom.copyright), links: linkList(footer.bottom.links) },
  };
}

/**
 * The exact document the API accepts. Before anything is saved, the editor
 * starts from the homepage customers see now: the built-in sections, with the
 * automatic category circles turned into the same categories as a list the
 * owner can edit.
 */
function toEditable(raw, payments, categories = []) {
  const defaults = defaultStorefrontContent({ payments });
  const saved = hasSavedContent(raw);
  const source = saved ? raw : defaults;
  const normalized = source.sections.map(normalizeSection).filter(Boolean).map(withSlides).map(withoutBuiltInLabels);
  // Older saved content gets Shop by Category back, as the homepage shows it.
  const sections = saved ? withCategoryRail(normalized, raw.schemaVersion) : normalized;
  if (!saved) {
    const items = categoriesAsItems(categories);
    sections.forEach((section) => {
      if (section.type === 'categoryRail' && section.source !== 'manual' && items.length > 0) {
        section.source = 'manual';
        section.items = items;
      }
    });
  }
  return {
    announcement: {
      enabled: source.announcement?.enabled !== false,
      motion: source.announcement?.motion === 'still' ? 'still' : 'moving',
      direction: source.announcement?.direction === 'ltr' ? 'ltr' : 'rtl',
      speed: ['slow', 'fast'].includes(source.announcement?.speed) ? source.announcement.speed : 'normal',
      items: (Array.isArray(source.announcement?.items) ? source.announcement.items : defaults.announcement.items).map((item) => ({
        text: str(item.text),
        icon: STOREFRONT_ICON_KEYS.includes(item.icon) ? item.icon : '',
        showWhen: item.showWhen === 'cod' ? 'cod' : 'always',
      })),
    },
    header: editableHeader(source.header),
    footer: editableFooter(source.footer),
    seo: {
      title: str(source.seo?.title),
      description: str(source.seo?.description),
      socialImage: image(source.seo?.socialImage),
    },
    sections,
  };
}

const sectionErrorPrefix = (index) => `sections.${index}`;
const hasErrorFor = (errors, prefix) =>
  Object.keys(errors).some((field) => field === prefix || field.startsWith(`${prefix}.`));

/** Never a raw status code or error name — one sentence the owner can act on. */
function requestErrorMessage(err, kind) {
  if (kind === 'restore' && err.response?.status === 400) {
    return err.errorCode === 'NO_PREVIOUS_VERSION'
      ? 'There is no earlier version to restore yet.'
      : 'The previous version uses a category or product that no longer exists, so it can’t be restored.';
  }
  if (Array.isArray(err.fieldErrors) && err.fieldErrors.length) {
    return 'A few details need attention. They’re highlighted in red.';
  }
  if (!err.response) return err.friendlyMessage || 'We couldn’t reach the website. Please check your connection and try again.';
  if (err.response.status === 429) return 'Too many changes in a short time. Please wait a minute and try again.';
  if (kind === 'publish') return 'Something went wrong while publishing. Please try again.';
  if (kind === 'discard') return 'Something went wrong while undoing your changes. Please try again.';
  return 'Something went wrong while saving. Please try again.';
}

/** "today at 8:42 pm", "yesterday at 7:18 pm" or "on 12 Sept 2026 at 6:05 pm". */
function publishedWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((dayStart(new Date()) - dayStart(date)) / 86400000);
  if (days === 0) return `today at ${time}`;
  if (days === 1) return `yesterday at ${time}`;
  return `on ${formatDate(date)} at ${time}`;
}

function StatusBadge({ meta, dirty }) {
  if (dirty) return <span className="badge-warning">Changes not saved yet</span>;
  if (!meta.published) return <span className="badge-neutral">Not published yet</span>;
  if (meta.hasUnpublishedChanges) return <span className="badge-info">Saved — not live yet</span>;
  return <span className="badge-success">Live on your website</span>;
}

const HOW_IT_WORKS = [
  ['Edit', 'Click any section to change its images, text or products.', Pencil],
  ['Preview', 'See how the homepage will look before publishing.', Eye],
  ['Publish', 'Make your changes live.', Send],
];

export default function StorefrontBuilder() {
  useDocumentMeta({ title: 'Homepage', noIndex: true });
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loadState, setLoadState] = useState({ loading: true, error: null });
  const [meta, setMeta] = useState(null);
  const [payments, setPayments] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null);
  const [savedJson, setSavedJson] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null);
  const [uploads, setUploads] = useState(0);
  const [selected, setSelected] = useState(null);
  const [mobileEditing, setMobileEditing] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [adding, setAdding] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [imported, setImported] = useState(false);
  const [dragOver, setDragOver] = useState(null);
  const dragIndex = useRef(null);
  // Set synchronously, so a second click in the same tick cannot start another request.
  const inFlight = useRef(false);
  // The first-time import runs once, even if the page loads twice.
  const importStarted = useRef(false);

  const applyServer = useCallback((data, paymentConfig, categoryList) => {
    const editable = toEditable(data.draft || data.published, paymentConfig, categoryList);
    setMeta(data);
    setForm(editable);
    setSavedJson(JSON.stringify(editable));
    setSelected((current) => {
      if (current?.kind !== 'section') return current;
      return editable.sections.some((s) => s.id === current.id) ? current : null;
    });
    return editable;
  }, []);

  const load = useCallback(async () => {
    setLoadState({ loading: true, error: null });
    try {
      const [data, paymentConfig, categoryData] = await Promise.all([
        storefrontApi.admin(),
        paymentApi.config().catch(() => null),
        categoryApi.list({ all: 'true' }).catch(() => null),
      ]);
      const categoryList = categoryData?.categories || [];
      setPayments(paymentConfig);
      setCategories(categoryList);
      const editable = applyServer(data, paymentConfig, categoryList);

      // Nothing published yet: the homepage customers see becomes the saved,
      // published starting point, once. It looks exactly the same. Skipped if
      // the categories could not be loaded, so their list is never lost.
      const nothingSaved = !hasSavedContent(data.draft) && !hasSavedContent(data.published);
      if (nothingSaved && categoryData && !importStarted.current) {
        importStarted.current = true;
        try {
          const published = await storefrontApi.publish(editable);
          applyServer(published, paymentConfig, categoryList);
          setImported(true);
        } catch {
          // Still editable from the same starting point; publishing later saves it.
        }
      }
      setLoadState({ loading: false, error: null });
    } catch {
      setLoadState({ loading: false, error: 'Please check your connection and try again.' });
    }
  }, [applyServer]);

  useEffect(() => {
    load();
  }, [load]);

  // "Publish Changes" on the preview page brings the owner back here with the
  // publish question already open.
  const wantsPublish = searchParams.get('publish') === '1';
  useEffect(() => {
    if (!wantsPublish || loadState.loading || !meta) return;
    setSearchParams({}, { replace: true });
    if (meta.hasUnpublishedChanges || (!meta.draft && !meta.published)) setConfirm({ type: 'publish' });
    else toast.info('There are no saved changes to publish.');
  }, [wantsPublish, loadState.loading, meta, setSearchParams, toast]);

  const dirty = Boolean(form) && JSON.stringify(form) !== savedJson;
  const neverSaved = Boolean(meta) && !meta.draft && !meta.published;
  const locked = Boolean(busy) || uploads > 0;

  // A reload or closed tab would lose unsaved edits.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // The router here is not a data router, so it cannot block navigation itself.
  // Instead, while there are unsaved edits, a click on any in-app link — the
  // admin sidebar, a "Categories" shortcut — asks first. Listening in the
  // capture phase on the document runs before the router's own link handler.
  useEffect(() => {
    if (!dirty) return undefined;
    const confirmLeave = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      if (!window.confirm('You have changes that aren’t saved. Leave this page without saving them?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', confirmLeave, true);
    return () => document.removeEventListener('click', confirmLeave, true);
  }, [dirty]);

  const update = useCallback((path, value) => setForm((current) => setIn(current, path, value)), []);
  /** Updates from the current value, so rapid clicks never work from a stale list. */
  const modify = useCallback(
    (path, change) => setForm((current) => setIn(current, path, change(getIn(current, path)))),
    []
  );
  const trackUpload = useCallback((delta) => setUploads((n) => Math.max(0, n + delta)), []);

  // The products each product section shows today, for its picture on the
  // card — one batched request, refreshed only when a product choice changes.
  const productKey = JSON.stringify(
    (form?.sections || [])
      .filter((s) => PRODUCT_SECTION_TYPES.includes(s.type))
      .map(({ id, type, source, categoryId, productIds, limit }) => ({ id, type, source, categoryId, productIds, limit }))
  );
  const productSections = useMemo(
    () => (form?.sections || []).filter((s) => PRODUCT_SECTION_TYPES.includes(s.type)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productKey]
  );
  const { data: sectionProducts } = useSectionProducts(productSections);

  /* ── Section list operations ── */

  const setSections = (next) => setForm((current) => ({ ...current, sections: next }));

  const moveSection = (from, to) => {
    if (to < 0 || to >= form.sections.length || from === to) return;
    const next = [...form.sections];
    const [section] = next.splice(from, 1);
    next.splice(to, 0, section);
    setSections(next);
    setErrors({});
  };

  const addSection = (type) => {
    const section = createSection(type);
    setSections([...form.sections, section]);
    setSelected({ kind: 'section', id: section.id });
    setMobileEditing(true);
    setAdding(false);
  };

  const duplicateSection = (index) => {
    const copy = { ...JSON.parse(JSON.stringify(form.sections[index])), id: newSectionId(form.sections[index].type) };
    const next = [...form.sections];
    next.splice(index + 1, 0, copy);
    setSections(next);
    setSelected({ kind: 'section', id: copy.id });
    setErrors({});
  };

  const deleteSection = (id) => {
    setSections(form.sections.filter((section) => section.id !== id));
    if (selected?.id === id) setSelected(null);
    setConfirm(null);
    setErrors({});
  };

  const select = (next) => {
    setSelected(next);
    setMobileEditing(true);
  };

  /* ── Requests ── */

  const run = async (kind, request, successMessage) => {
    if (inFlight.current || uploads > 0) return false;
    inFlight.current = true;
    setBusy(kind);
    setErrors({});
    try {
      const data = await request();
      applyServer(data, payments, categories);
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (err) {
      // A restore's problems belong to the earlier version, not to the fields on screen.
      const details = kind !== 'restore' && Array.isArray(err.fieldErrors) ? err.fieldErrors : [];
      setErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      const first = details[0]?.field || '';
      const match = first.match(/^sections\.(\d+)/);
      if (match && form.sections[Number(match[1])]) select({ kind: 'section', id: form.sections[Number(match[1])].id });
      else if (first.startsWith('announcement')) select({ kind: 'announcement' });
      else if (first.startsWith('header')) select({ kind: 'header' });
      else if (first.startsWith('footer')) select({ kind: 'footer' });
      else if (first.startsWith('seo')) select({ kind: 'seo' });
      toast.error(requestErrorMessage(err, kind));
      return false;
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const saveDraft = () => run('save', () => storefrontApi.saveDraft(form), 'Changes saved. Customers won’t see them until you publish.');

  const publish = () => {
    setConfirm(null);
    run('publish', () => storefrontApi.publish(form), 'Homepage updated successfully.');
  };

  const discard = () => {
    setConfirm(null);
    if (meta?.hasUnpublishedChanges) {
      run(
        'discard',
        () => storefrontApi.discard(),
        meta.published
          ? 'Your changes were discarded. The editor matches your live homepage again.'
          : 'Your changes were discarded. The editor shows the homepage customers see now.'
      );
    } else {
      setForm(JSON.parse(savedJson));
      setErrors({});
    }
  };

  const restorePrevious = () => {
    setConfirm(null);
    run('restore', () => storefrontApi.restorePrevious(), 'Previous homepage restored.');
  };

  const openPreview = async () => {
    if (locked) return;
    // Opened before the save so the browser does not treat it as a pop-up.
    const win = window.open('', '_blank');
    if (win) win.opener = null;
    const ok = dirty || neverSaved
      ? await run('preview', () => storefrontApi.saveDraft(form), 'Your changes were saved for the preview.')
      : true;
    if (!ok) {
      win?.close();
      return;
    }
    if (win) win.location.href = '/storefront-preview';
    else toast.info('Your browser blocked the preview window. Please allow pop-ups for this website and try again.');
  };

  /* ── Render ── */

  if (loadState.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 lg:grid-cols-[23rem_1fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (loadState.error) {
    return (
      <div className="space-y-4">
        <h1 className="text-display-3">Homepage</h1>
        <Alert tone="error" title="We couldn’t load your homepage right now">{loadState.error}</Alert>
        <Button variant="secondary" onClick={load}>Try again</Button>
      </div>
    );
  }

  const sections = form.sections;
  const hasHero = sections.some((section) => section.type === 'hero');
  const selectedIndex = selected?.kind === 'section' ? sections.findIndex((s) => s.id === selected.id) : -1;
  const errorEntries = Object.entries(errors);
  const canDiscard = dirty || meta.hasUnpublishedChanges;
  const deleting = confirm?.type === 'delete' ? sections.find((s) => s.id === confirm.id) : null;
  // The main banner is offered first when the homepage doesn't have one.
  const addTypes = [...SECTION_TYPES].sort((a, b) => (a === 'hero' ? -1 : b === 'hero' ? 1 : 0)).filter((type) => type !== 'hero' || !hasHero);

  const previousVersion = meta.history?.[0] || null;

  const errorLocation = (field) => {
    const match = field.match(/^sections\.(\d+)/);
    if (match) return sections[Number(match[1])] ? sectionTitle(sections[Number(match[1])]) : 'Section';
    if (field.startsWith('announcement')) return GLOBAL_META.announcement.label;
    if (field.startsWith('header')) return GLOBAL_META.header.label;
    if (field.startsWith('footer')) return GLOBAL_META.footer.label;
    if (field.startsWith('seo')) return GLOBAL_META.seo.label;
    return 'Homepage';
  };

  let editor = (
    <div className="card flex min-h-[16rem] flex-col items-center justify-center gap-2 p-8 text-center">
      <Pencil size={20} className="text-ink-faint" aria-hidden="true" />
      <p className="text-base font-medium text-ink">Select a section to edit it</p>
      <p className="max-w-sm text-sm text-ink-muted">Each card on the left is part of your homepage, in the same order customers see it.</p>
    </div>
  );
  let editorHeading = null;
  if (selected?.kind === 'announcement') {
    editor = <AnnouncementEditor />;
    editorHeading = GLOBAL_META.announcement;
  }
  if (selected?.kind === 'header') {
    editor = <HeaderEditor />;
    editorHeading = GLOBAL_META.header;
  }
  if (selected?.kind === 'footer') {
    editor = <FooterEditor />;
    editorHeading = GLOBAL_META.footer;
  }
  if (selected?.kind === 'seo') {
    editor = <SeoEditor />;
    editorHeading = GLOBAL_META.seo;
  }
  if (selectedIndex >= 0) {
    const current = sections[selectedIndex];
    editor = (
      <div className="space-y-5">
        <div className="card p-3">
          <SectionPreview section={current} categories={categories} products={sectionProducts?.[current.id]?.products} />
        </div>
        <SectionEditor index={selectedIndex} />
      </div>
    );
    editorHeading = { label: sectionTitle(current), description: SECTION_META[current.type].description, kind: SECTION_META[current.type].label };
  }

  const GlobalRow = ({ kind, Icon }) => {
    const info = GLOBAL_META[kind];
    const active = selected?.kind === kind;
    const hasError = hasErrorFor(errors, kind);
    return (
      <button
        type="button"
        onClick={() => select({ kind })}
        aria-current={active || undefined}
        className={`flex min-h-[56px] w-full items-center gap-3 rounded-control border px-2 py-2 text-left transition-colors ${
          active ? 'border-ink bg-paper-raised' : 'border-transparent hover:bg-paper-sunken'
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-paper-sunken text-ink-muted">
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
            {info.label}
            {hasError && <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-label="needs attention" />}
          </span>
          <span className="block text-xs text-ink-muted">{info.description}</span>
        </span>
        <span className="ml-auto shrink-0 text-xs font-medium text-ink-soft underline underline-offset-4">Edit</span>
      </button>
    );
  };

  return (
    <EditorContext.Provider value={{ form, errors, update, modify, trackUpload, categories, payments }}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-display-3">Homepage</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              This is the same homepage your customers see. Select a section to edit it.
            </p>
            {meta.publishedAt && (
              <p className="mt-2 text-xs text-ink-faint">
                Last published on {formatDate(meta.publishedAt)}
                {meta.publishedBy?.name ? ` by ${meta.publishedBy.name}` : ''}
              </p>
            )}
          </div>
          <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={() => setHelpOpen(true)}>
            <HelpCircle size={15} aria-hidden="true" /> How does this work?
          </Button>
        </div>

        {imported && (
          <Alert tone="success" title="Your current homepage is ready to edit">
            We’ve loaded every section of your homepage exactly as customers see it. Click any section to change it.
          </Alert>
        )}

        {/* Actions stay in reach while scrolling through a long section. */}
        <div className="sticky top-14 z-30 -mx-4 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
              <StatusBadge meta={meta} dirty={dirty} />
              {uploads > 0 && <span className="text-ink-muted">Waiting for images to finish uploading…</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {canDiscard && (
                <Button size="sm" variant="quiet" className="min-h-[44px]" onClick={() => setConfirm({ type: 'discard' })} disabled={locked} loading={busy === 'discard'}>
                  <Undo2 size={14} aria-hidden="true" /> Discard Changes
                </Button>
              )}
              <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={openPreview} disabled={locked} loading={busy === 'preview'}>
                <Eye size={14} aria-hidden="true" /> Preview Website
              </Button>
              <Button size="sm" variant="secondary" className="min-h-[44px]" onClick={saveDraft} disabled={locked} loading={busy === 'save'}>
                Save Changes
              </Button>
              <Button
                size="sm"
                className="min-h-[44px]"
                onClick={() => setConfirm({ type: 'publish' })}
                disabled={locked || (!dirty && !meta.hasUnpublishedChanges && !neverSaved)}
                loading={busy === 'publish'}
              >
                <Send size={14} aria-hidden="true" /> Publish
              </Button>
            </div>
          </div>
        </div>

        {errorEntries.length > 0 && (
          <Alert tone="error" title={`Please check ${errorEntries.length === 1 ? 'one detail' : `${errorEntries.length} details`} before saving`}>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {errorEntries.slice(0, 6).map(([field, message]) => (
                <li key={field}>
                  <span className="font-medium">{errorLocation(field)}:</span> {message}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {/* An explicit minmax(0, 1fr) column: an automatic one grows to the
            width of the longest section summary and pushes the page sideways. */}
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
          {/* ── Sections ── */}
          <aside className={`space-y-4 ${mobileEditing ? 'hidden lg:block' : ''}`}>
            {meta.published && (
              <div className="card p-4" data-live-version>
                <p className="text-2xs font-medium uppercase tracking-wider2 text-ink-muted">Live website</p>
                <p className="mt-1 text-sm text-ink">Published {publishedWhen(meta.publishedAt)}</p>
                {previousVersion ? (
                  <>
                    <p className="mt-1 text-xs text-ink-muted">Previous version · published {publishedWhen(previousVersion.publishedAt)}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-3 min-h-[44px] w-full"
                      onClick={() => setConfirm({ type: 'restore' })}
                      disabled={locked}
                      loading={busy === 'restore'}
                    >
                      <History size={14} aria-hidden="true" /> Restore Previous Version
                    </Button>
                    <p className="mt-2 text-xs text-ink-faint">Restore the last published version of your homepage.</p>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-ink-faint">After your next publish, the version before it can be restored here.</p>
                )}
              </div>
            )}
            <div className="card p-2">
              <div className="px-2 pb-3 pt-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xs font-medium uppercase tracking-wider2 text-ink-muted">Your homepage, top to bottom</h2>
                  <span className="text-2xs text-ink-faint">{sections.length} sections</span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">Sections are shown in the same order they appear on your homepage.</p>
              </div>

              {sections.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-ink-muted">Your homepage has no sections. Add one below.</p>
              ) : (
                <ol className="space-y-2">
                  {sections.map((section, index) => {
                    const info = SECTION_META[section.type];
                    const title = sectionTitle(section);
                    const active = selected?.kind === 'section' && selected.id === section.id;
                    const hasError = hasErrorFor(errors, sectionErrorPrefix(index));
                    const canCopy = section.type !== 'hero';
                    return (
                      <li
                        key={section.id}
                        draggable
                        onDragStart={(e) => {
                          dragIndex.current = index;
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', section.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(index);
                        }}
                        onDragLeave={() => setDragOver((current) => (current === index ? null : current))}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragIndex.current !== null) moveSection(dragIndex.current, index);
                          dragIndex.current = null;
                          setDragOver(null);
                        }}
                        onDragEnd={() => {
                          dragIndex.current = null;
                          setDragOver(null);
                        }}
                        className={`rounded-control border bg-paper-raised p-3 transition-shadow ${
                          active ? 'border-ink ring-1 ring-ink' : 'border-line'
                        } ${dragOver === index ? 'ring-2 ring-clay' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            {title !== info.label && (
                              <p className="text-2xs font-medium uppercase tracking-wider2 text-ink-faint">{info.label}</p>
                            )}
                            <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink" data-section-name>
                              {title}
                              {hasError && <span className="badge-danger">Needs attention</span>}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-medium ${section.enabled ? 'bg-success-faint text-success' : 'bg-paper-sunken text-ink-muted'}`}
                          >
                            {section.enabled ? 'Visible ●' : 'Hidden'}
                          </span>
                          <span className="hidden cursor-grab pt-0.5 text-ink-faint lg:block" title="Drag to move" aria-hidden="true">
                            <GripVertical size={16} />
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => select({ kind: 'section', id: section.id })}
                          className="mt-2 block w-full rounded-control text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay"
                          aria-label={`Edit ${title}`}
                        >
                          <SectionPreview section={section} categories={categories} products={sectionProducts?.[section.id]?.products} />
                        </button>
                        <p className="mt-1.5 truncate text-xs text-ink" title={sectionSummary(section, { categories })}>
                          {sectionSummary(section, { categories })}
                        </p>
                        <p className="text-xs text-ink-muted">{info.listText}</p>

                        <div className="mt-2 flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="min-h-[44px] flex-1"
                            onClick={() => select({ kind: 'section', id: section.id })}
                            aria-current={active || undefined}
                          >
                            <Pencil size={13} aria-hidden="true" /> {active ? 'Editing' : 'Edit'}
                          </Button>
                          <button type="button" className="icon-btn h-11 w-11 shrink-0 border border-line disabled:opacity-30" onClick={() => moveSection(index, index - 1)} disabled={index === 0} aria-label={`Move ${title} up`} title="Move up">
                            <ArrowUp size={15} aria-hidden="true" />
                          </button>
                          <button type="button" className="icon-btn h-11 w-11 shrink-0 border border-line disabled:opacity-30" onClick={() => moveSection(index, index + 1)} disabled={index === sections.length - 1} aria-label={`Move ${title} down`} title="Move down">
                            <ArrowDown size={15} aria-hidden="true" />
                          </button>
                        </div>

                        <div className={`mt-1.5 grid gap-1.5 ${canCopy ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="min-h-[44px] px-2"
                            onClick={() => update(['sections', index, 'enabled'], !section.enabled)}
                            aria-label={`${section.enabled ? 'Hide' : 'Show'} ${title}`}
                          >
                            {section.enabled ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                            {section.enabled ? 'Hide' : 'Show'}
                          </Button>
                          {canCopy && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="min-h-[44px] px-2"
                              onClick={() => duplicateSection(index)}
                              disabled={sections.length >= STOREFRONT_LIMITS.sections}
                              aria-label={`Duplicate ${title}`}
                              title="Make a copy"
                            >
                              <Copy size={13} aria-hidden="true" /> Copy
                            </Button>
                          )}
                          <Button size="sm" variant="quiet" className="min-h-[44px] px-2 text-danger" onClick={() => setConfirm({ type: 'delete', id: section.id })} aria-label={`Delete ${title}`}>
                            <Trash2 size={13} aria-hidden="true" /> Delete
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              <Button
                fullWidth
                variant="secondary"
                className="mt-3 min-h-[48px]"
                onClick={() => setAdding(true)}
                disabled={sections.length >= STOREFRONT_LIMITS.sections}
              >
                <Plus size={15} aria-hidden="true" /> Add Section
              </Button>
              <p className="px-2 pt-2 text-center text-xs text-ink-faint">For adding something new, like a festive promotion.</p>
            </div>

            <div className="card p-2">
              <p className="px-2 pb-1 pt-1 text-2xs font-medium uppercase tracking-wider2 text-ink-muted">On every page</p>
              <GlobalRow kind="announcement" Icon={Megaphone} />
              <GlobalRow kind="header" Icon={PanelTop} />
              <GlobalRow kind="footer" Icon={PanelBottom} />
              <GlobalRow kind="seo" Icon={Globe} />
            </div>
          </aside>

          {/* ── Editor ── */}
          <div className={`min-w-0 space-y-4 ${mobileEditing ? '' : 'hidden lg:block'}`}>
            <div className="lg:hidden">
              <button type="button" className="link-arrow min-h-[44px]" onClick={() => setMobileEditing(false)}>
                <ChevronLeft size={15} aria-hidden="true" /> All sections
              </button>
            </div>
            {editorHeading && (
              <div>
                {editorHeading.kind && editorHeading.kind !== editorHeading.label && (
                  <p className="text-2xs font-medium uppercase tracking-wider2 text-ink-faint">{editorHeading.kind}</p>
                )}
                <h2 className="font-display text-2xl text-ink">Edit {editorHeading.label}</h2>
                <p className="mt-1 text-sm text-ink-muted">{editorHeading.description}</p>
              </div>
            )}
            {/* Editing pauses while a request runs, so a reply never overwrites typing. */}
            <fieldset disabled={Boolean(busy)} className="min-w-0">
              {editor}
            </fieldset>
          </div>
        </div>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="What would you like to add?" description="Your existing sections stay as they are. New sections are added at the bottom — you can move them afterwards." size="lg">
        <ul className="grid gap-3 sm:grid-cols-2">
          {addTypes.map((type) => {
            const info = SECTION_META[type];
            return (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => addSection(type)}
                  className="flex h-full min-h-[64px] w-full items-start gap-3 rounded-control border border-line bg-paper-raised p-4 text-left transition-colors hover:border-ink"
                >
                  <info.icon size={20} className="mt-0.5 shrink-0 text-clay-deep" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-medium text-ink">{info.addTitle}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{info.addText}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="How does this work?" size="md">
        <ol className="space-y-4">
          {HOW_IT_WORKS.map(([title, text, Icon], i) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-sunken text-ink">
                <Icon size={16} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-medium text-ink">{i + 1}. {title}</span>
                <span className="block text-sm text-ink-muted">{text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs text-ink-faint">
          Nothing changes on your website until you click “Publish”. “Save Changes” keeps your work for later.
        </p>
      </Modal>

      <ConfirmDialog
        open={confirm?.type === 'publish'}
        onClose={() => setConfirm(null)}
        onConfirm={publish}
        tone="primary"
        title="Publish these changes?"
        message="Your homepage will be updated for customers."
        confirmLabel="Publish Changes"
      />
      <ConfirmDialog
        open={confirm?.type === 'restore'}
        onClose={() => setConfirm(null)}
        onConfirm={restorePrevious}
        tone="primary"
        title="Restore the previous homepage?"
        message={`This will replace the current live homepage with the previous published version.${
          dirty ? ' Changes you haven’t saved will also be lost.' : ''
        }`}
        confirmLabel="Restore Previous Version"
      />
      <ConfirmDialog
        open={confirm?.type === 'discard'}
        onClose={() => setConfirm(null)}
        onConfirm={discard}
        title="Discard your changes?"
        message={
          !meta.hasUnpublishedChanges
            ? 'The changes you haven’t saved will be removed.'
            : meta.published
              ? 'Everything you’ve changed since you last published will be removed. Your live homepage stays as it is.'
              : 'Everything you’ve saved or changed here will be removed, and the editor goes back to the homepage customers see now. Images uploaded only for these changes will be deleted.'
        }
        confirmLabel="Discard Changes"
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteSection(confirm.id)}
        title={`Delete “${deleting ? sectionTitle(deleting) : 'this section'}”?`}
        message="It will be removed from your homepage when you publish your changes."
        confirmLabel="Delete"
      />
    </EditorContext.Provider>
  );
}
