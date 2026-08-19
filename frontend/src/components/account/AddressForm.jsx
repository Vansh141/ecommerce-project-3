import { useState } from 'react';
import { Input, Button, Checkbox, Alert } from '../ui';

const EMPTY = {
  label: 'Home',
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: false,
};

/**
 * Address form.
 *
 * Client-side checks exist only to give fast feedback — the server validates
 * every field again, so bypassing this form gains nothing.
 */
export default function AddressForm({ initial, onSubmit, onCancel, submitLabel = 'Save address' }) {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}) });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Please enter the recipient name.';
    if (!/^[+]?[\d\s-]{7,20}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number.';
    if (form.line1.trim().length < 5) next.line1 = 'Please enter the street address.';
    if (form.city.trim().length < 2) next.city = 'Please enter a city.';
    if (form.state.trim().length < 2) next.state = 'Please enter a state.';
    if (!/^[A-Za-z0-9\s-]{4,12}$/.test(form.postalCode.trim())) next.postalCode = 'Enter a valid PIN code.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setServerError(err.friendlyMessage || 'Could not save the address.');
      // Surface per-field messages the API returned.
      if (Array.isArray(err.fieldErrors)) {
        const mapped = {};
        err.fieldErrors.forEach((fe) => { mapped[fe.field] = fe.message; });
        setErrors(mapped);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {serverError && <Alert tone="error">{serverError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name" required value={form.fullName} onChange={set('fullName')}
          error={errors.fullName} autoComplete="name" placeholder="Priya Sharma"
        />
        <Input
          label="Phone" required type="tel" value={form.phone} onChange={set('phone')}
          error={errors.phone} autoComplete="tel" placeholder="98765 43210"
        />
      </div>

      <Input
        label="Address" required value={form.line1} onChange={set('line1')}
        error={errors.line1} autoComplete="address-line1"
        placeholder="Flat / house no., building, street"
      />

      <Input
        label="Area, landmark (optional)" value={form.line2} onChange={set('line2')}
        autoComplete="address-line2" placeholder="Bandra West"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="City" required value={form.city} onChange={set('city')}
          error={errors.city} autoComplete="address-level2" placeholder="Mumbai"
        />
        <Input
          label="State" required value={form.state} onChange={set('state')}
          error={errors.state} autoComplete="address-level1" placeholder="Maharashtra"
        />
        <Input
          label="PIN code" required value={form.postalCode} onChange={set('postalCode')}
          error={errors.postalCode} autoComplete="postal-code" inputMode="numeric" placeholder="400050"
        />
      </div>

      <Input
        label="Nickname for this address" value={form.label} onChange={set('label')}
        placeholder="Home, Office…"
      />

      <Checkbox
        label="Make this my default delivery address"
        checked={form.isDefault}
        onChange={set('isDefault')}
      />

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" fullWidth loading={saving}>{submitLabel}</Button>
      </div>
    </form>
  );
}
