import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { User, MapPin, Package, Heart, Lock, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { userApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFetch, useDocumentMeta } from '../hooks';
import AddressForm from '../components/account/AddressForm';
import { ProductGrid } from '../components/product/ProductCard';
import { useWishlist } from '../context/WishlistContext';
import {
  Button, Input, Alert, Modal, ConfirmDialog, EmptyState, Skeleton,
} from '../components/ui';
import { initialsOf } from '../utils/format';

const NAV = [
  { to: '/account', label: 'Profile', icon: User, end: true },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/orders', label: 'Orders', icon: Package },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
];

export function AccountLayout() {
  const { user } = useAuth();

  return (
    <div className="shell py-10 sm:py-14">
      <h1 className="mb-7 text-display-2 sm:mb-9">My account</h1>

      <div className="grid gap-9 lg:grid-cols-[15rem_1fr] lg:gap-14">
        {/* `min-w-0` is load-bearing: a grid item defaults to `min-width:auto`,
            so without it the column stretches to the nav rail's min-content
            width and the whole page scrolls sideways on a narrow phone —
            the rail's own `overflow-x-auto` never gets a chance to scroll. */}
        <aside className="min-w-0">
          <div className="mb-6 flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full
                            bg-clay-faint font-display text-base text-clay-deep">
              {initialsOf(user?.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-ink-muted">{user?.email}</p>
            </div>
          </div>

          {/* A scrollable rail on a phone, a stacked list from `lg`. The
              negative gutter lets the rail bleed to the screen edge so the
              last tab is never clipped mid-word. */}
          <nav
            className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5 pb-1
                       sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-col lg:px-0 lg:pb-0"
            aria-label="Account"
          >
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-[2.75rem] shrink-0 items-center gap-2.5 whitespace-nowrap
                   rounded-control px-3.5 py-2.5 text-sm transition-colors ${
                     isActive
                       ? 'bg-paper-sunken font-medium text-ink'
                       : 'text-ink-muted hover:bg-paper-sunken hover:text-ink'
                   }`
                }
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}

/* ═════════════════════════ Profile ═══════════════════════════════════════ */

export function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState(null);
  const [savingPw, setSavingPw] = useState(false);

  useDocumentMeta({ title: 'Profile', noIndex: true });

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ name, phone });
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.friendlyMessage);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwError(null);

    if (pw.newPassword !== pw.confirm) {
      setPwError('Those passwords do not match.');
      return;
    }

    setSavingPw(true);
    try {
      await changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Password changed. Other devices have been signed out.');
      setPwOpen(false);
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwError(err.friendlyMessage);
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card-pad">
        <h2 className="mb-5 text-base">Personal details</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Phone (optional)" type="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210"
          />
          <Input
            label="Email" value={user?.email || ''} disabled
            hint="Email cannot be changed here. Contact us if you need to update it."
          />
          <Button type="submit" loading={savingProfile}>Save changes</Button>
        </form>
      </section>

      <section className="card-pad">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base">Password</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Changing your password signs you out everywhere else.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setPwOpen(true)}>
            <Lock size={14} aria-hidden="true" /> Change password
          </Button>
        </div>
      </section>

      <Modal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change your password"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={savePassword} loading={savingPw}>Update password</Button>
          </div>
        }
      >
        <form onSubmit={savePassword} className="space-y-4" noValidate>
          {pwError && <Alert tone="error">{pwError}</Alert>}

          {/* The current password is genuinely required by the API — this is
              not a decorative field. */}
          <Input
            label="Current password" type="password" required autoComplete="current-password"
            value={pw.currentPassword}
            onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
          />
          <Input
            label="New password" type="password" required autoComplete="new-password"
            value={pw.newPassword}
            onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
            hint="At least 8 characters with a letter and a number."
          />
          <Input
            label="Confirm new password" type="password" required autoComplete="new-password"
            value={pw.confirm}
            onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
          />
        </form>
      </Modal>
    </div>
  );
}

/* ═════════════════════════ Addresses ═════════════════════════════════════ */

export function Addresses() {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useDocumentMeta({ title: 'Addresses', noIndex: true });

  const { data, loading, refetch } = useFetch(() => userApi.listAddresses(), []);
  const addresses = data?.addresses || [];

  const save = async (form) => {
    if (editing) await userApi.updateAddress(editing._id, form);
    else await userApi.addAddress(form);
    await refetch();
    setFormOpen(false);
    setEditing(null);
    toast.success(editing ? 'Address updated.' : 'Address added.');
  };

  const remove = async () => {
    setBusy(true);
    try {
      await userApi.deleteAddress(deleting._id);
      await refetch();
      setDeleting(null);
      toast.success('Address removed.');
    } catch (err) {
      toast.error(err.friendlyMessage);
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (id) => {
    try {
      await userApi.setDefaultAddress(id);
      await refetch();
      toast.success('Default address updated.');
    } catch (err) {
      toast.error(err.friendlyMessage);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-base">Saved addresses</h2>
        <Button variant="secondary" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={14} aria-hidden="true" /> Add address
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No addresses yet"
          description="Save an address to make checkout faster."
          action={<Button onClick={() => setFormOpen(true)}>Add your first address</Button>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a._id} className="card-pad flex flex-col">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{a.fullName}</span>
                {a.label && <span className="badge-neutral">{a.label}</span>}
                {a.isDefault && <span className="badge-info">Default</span>}
              </div>

              <p className="flex-1 text-sm leading-relaxed text-ink-muted">
                {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />
                {a.city}, {a.state} {a.postalCode}<br />
                {a.phone}
              </p>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setFormOpen(true); }}>
                  <Pencil size={13} aria-hidden="true" /> Edit
                </Button>
                {!a.isDefault && (
                  <>
                    <Button size="sm" variant="quiet" onClick={() => makeDefault(a._id)}>
                      <Star size={13} aria-hidden="true" /> Set default
                    </Button>
                    <Button size="sm" variant="quiet" onClick={() => setDeleting(a)}>
                      <Trash2 size={13} aria-hidden="true" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? 'Edit address' : 'Add an address'}
      >
        <AddressForm
          initial={editing}
          onSubmit={save}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
          submitLabel={editing ? 'Save changes' : 'Add address'}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete this address?"
        message="This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}

/* ═════════════════════════ Wishlist ══════════════════════════════════════ */

export function Wishlist() {
  const { items } = useWishlist();
  useDocumentMeta({ title: 'Wishlist', noIndex: true });

  return (
    <div className="shell py-10 sm:py-14">
      <h1 className="mb-7 text-display-2 sm:mb-9">Wishlist</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Tap the heart on any piece to save it here."
          action={<Button to="/shop" size="lg">Browse the collection</Button>}
        />
      ) : (
        <>
          <p className="mb-8 text-sm text-ink-muted">
            {items.length} saved {items.length === 1 ? 'piece' : 'pieces'}
          </p>
          <ProductGrid products={items} />
        </>
      )}
    </div>
  );
}
