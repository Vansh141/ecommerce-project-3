import { useState } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, CheckCircle2, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/endpoints';
import { useDocumentMeta } from '../hooks';
import { Button, Input, Alert } from '../components/ui';

/** Only same-site relative paths are honoured, blocking open-redirect abuse. */
function safeRedirect(value) {
  return value && /^\/(?!\/)/.test(value) ? value : '/';
}

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="shell flex min-h-[70vh] items-center justify-center py-14">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-display-3">{title}</h1>
          {subtitle && <p className="mt-2.5 text-sm text-ink-muted">{subtitle}</p>}
        </div>
        <div className="card p-7 sm:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
}

function PasswordInput({ label = 'Password', value, onChange, ...rest }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        label={label}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-[2.15rem] p-1 text-ink-faint transition-colors hover:text-ink"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

/* ═════════════════════════ Login ═════════════════════════════════════════ */

export function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useDocumentMeta({ title: 'Sign in', noIndex: true });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(safeRedirect(params.get('redirect')), { replace: true });
    } catch (err) {
      setError(err.friendlyMessage || 'Could not sign you in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Track orders, save addresses and keep your wishlist."
      footer={
        <>
          New to TOUCH?{' '}
          <Link
            to={`/register${params.get('redirect') ? `?redirect=${encodeURIComponent(params.get('redirect'))}` : ''}`}
            className="link font-medium"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        <Input
          label="Email" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <div>
          <PasswordInput
            required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-xs text-ink-muted hover:text-ink">
              Forgot your password?
            </Link>
          </div>
        </div>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          Sign in <ArrowRight size={15} aria-hidden="true" />
        </Button>
      </form>
    </AuthShell>
  );
}

/* ═════════════════════════ Register ══════════════════════════════════════ */

export function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useDocumentMeta({ title: 'Create an account', noIndex: true });

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (fieldErrors[key]) setFieldErrors((p) => ({ ...p, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      await register(form);
      navigate(safeRedirect(params.get('redirect')), { replace: true });
    } catch (err) {
      setError(err.friendlyMessage || 'Could not create your account.');
      if (Array.isArray(err.fieldErrors)) {
        const mapped = {};
        err.fieldErrors.forEach((fe) => { mapped[fe.field] = fe.message; });
        setFieldErrors(mapped);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create an account"
      subtitle="It takes a moment and makes checkout faster next time."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to={`/login${params.get('redirect') ? `?redirect=${encodeURIComponent(params.get('redirect'))}` : ''}`}
            className="link font-medium"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        <Input
          label="Full name" required autoComplete="name"
          value={form.name} onChange={set('name')} error={fieldErrors.name}
          placeholder="Priya Sharma"
        />
        <Input
          label="Email" type="email" required autoComplete="email"
          value={form.email} onChange={set('email')} error={fieldErrors.email}
          placeholder="you@example.com"
        />
        <PasswordInput
          required autoComplete="new-password"
          value={form.password} onChange={set('password')} error={fieldErrors.password}
          placeholder="At least 8 characters"
          hint="Use at least 8 characters with a letter and a number."
        />

        <Button type="submit" size="lg" fullWidth loading={loading}>
          Create account <ArrowRight size={15} aria-hidden="true" />
        </Button>
      </form>
    </AuthShell>
  );
}

/* ═════════════════════════ Forgot password ═══════════════════════════════ */

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useDocumentMeta({ title: 'Reset your password', noIndex: true });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.forgotPassword(email);
      setMessage(data.message);
      setSent(true);
    } catch (err) {
      // The endpoint answers identically whether or not the account exists, so
      // there is nothing here that could reveal which emails are registered.
      setMessage(err.friendlyMessage || 'Please try again.');
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title="Check your inbox">
        <div className="text-center">
          <Mail size={30} className="mx-auto mb-5 text-clay" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-ink-muted">{message}</p>
          <p className="mt-4 text-xs text-ink-faint">
            The link expires in 15 minutes. Check your spam folder if it does not arrive.
          </p>
          <Button to="/login" variant="secondary" fullWidth className="mt-7">Back to sign in</Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We will email you a link to set a new one."
      footer={<Link to="/login" className="link">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-5">
        <Input
          label="Email" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Button type="submit" size="lg" fullWidth loading={loading}>Send reset link</Button>
      </form>
    </AuthShell>
  );
}

/* ═════════════════════════ Reset password ════════════════════════════════ */

export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useDocumentMeta({ title: 'Set a new password', noIndex: true });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err.friendlyMessage || 'That reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Password updated">
        <div className="text-center">
          <CheckCircle2 size={30} className="mx-auto mb-5 text-success" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-ink-muted">
            You have been signed out of all devices for security. Redirecting you to sign in…
          </p>
          <Button to="/login" fullWidth className="mt-7">Sign in now</Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose something you have not used before.">
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        <PasswordInput
          label="New password" required autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters with a letter and a number."
        />
        <PasswordInput
          label="Confirm new password" required autoComplete="new-password"
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
          error={confirm && confirm !== password ? 'Passwords do not match.' : undefined}
        />

        <Button type="submit" size="lg" fullWidth loading={loading}>Update password</Button>
      </form>
    </AuthShell>
  );
}
