import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, CheckCircle2, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/endpoints';
import { useDocumentMeta } from '../hooks';
import { Button, Input, Alert, Spinner } from '../components/ui';

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

/** Catches an obvious typo before a request is spent on it. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useDocumentMeta({ title: 'Reset your password', noIndex: true });

  /**
   * "Check your inbox" is shown only after the server accepted the request.
   *
   * This used to set `sent` from the catch block too, reasoning that the
   * endpoint answers identically whether or not an account exists. That holds
   * for the server's REPLY and says nothing about a request that failed: a 429
   * from the hourly limiter, a network error or a timeout sends no email, and
   * telling the shopper one is on its way leaves them waiting for nothing. The
   * privacy property is unchanged, because it lives in that identical reply.
   */
  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setError('Enter the email address you registered with.');
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.forgotPassword(address);
      setMessage(
        data?.message ||
          'If an account exists for that email address, a password reset link has been sent.'
      );
      setSent(true);
    } catch (err) {
      // Stay on the form, with the address still filled in, so they can retry.
      setError(err.friendlyMessage || 'Could not send the reset link. Please try again.');
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
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}

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

/* ═════════════════════════ Verify email ══════════════════════════════════ */

/**
 * One request per token, however many times the page mounts.
 *
 * A verification link is single-use: the first request consumes the token and
 * any repeat is answered "invalid or expired". StrictMode runs effects twice in
 * development and a remount does the same in production, so the request is
 * shared per token — otherwise a second, failing answer could overwrite the
 * first, successful one.
 */
const verificationRequests = new Map();

function verifyOnce(token) {
  if (!verificationRequests.has(token)) {
    verificationRequests.set(token, authApi.verifyEmail(token));
  }
  return verificationRequests.get(token);
}

/** The page the welcome email's "Verify email" link opens. */
export function VerifyEmail() {
  const { token } = useParams();
  const location = useLocation();
  const { user, isAuthenticated, setUser } = useAuth();

  const [status, setStatus] = useState('verifying'); // verifying | verified | failed
  const [error, setError] = useState(null);
  const [resend, setResend] = useState({ state: 'idle', message: null }); // idle | sending | sent | failed

  // Read inside the effect without making the signed-in user one of its deps.
  const userRef = useRef(user);
  userRef.current = user;

  useDocumentMeta({ title: 'Verify your email', noIndex: true });

  useEffect(() => {
    let cancelled = false;
    setStatus('verifying');
    setError(null);

    verifyOnce(token)
      .then((data) => {
        if (cancelled) return;
        // Keep the signed-in profile in step when the link belongs to them.
        if (data?.user && userRef.current?._id === data.user._id) setUser(data.user);
        setStatus('verified');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.friendlyMessage || 'This verification link is invalid or has expired.');
        setStatus('failed');
      });

    return () => { cancelled = true; };
  }, [token, setUser]);

  const requestNewLink = async () => {
    setResend({ state: 'sending', message: null });
    try {
      const data = await authApi.resendVerification();
      setResend({ state: 'sent', message: data?.message || 'A new verification link is on its way.' });
    } catch (err) {
      setResend({
        state: 'failed',
        message: err.friendlyMessage || 'Could not send a new link. Please try again.',
      });
    }
  };

  if (status === 'verifying') {
    return (
      <AuthShell title="Verifying your email">
        <div className="flex justify-center py-6">
          <Spinner label="Verifying your email" />
        </div>
      </AuthShell>
    );
  }

  if (status === 'verified') {
    return (
      <AuthShell title="Email verified">
        <div className="text-center">
          <CheckCircle2 size={30} className="mx-auto mb-5 text-success" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-ink-muted">
            Thank you — your email address is confirmed.
          </p>
          {isAuthenticated ? (
            <Button to="/shop" fullWidth className="mt-7">Continue shopping</Button>
          ) : (
            <Button to="/login" fullWidth className="mt-7">Sign in</Button>
          )}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="We could not verify your email"
      footer={<Link to="/" className="link">Back to the shop</Link>}
    >
      <div className="space-y-5">
        <Alert tone="error">{error}</Alert>

        {isAuthenticated ? (
          <>
            {resend.state === 'sent' && <Alert tone="success">{resend.message}</Alert>}
            {resend.state === 'failed' && <Alert tone="error">{resend.message}</Alert>}
            {resend.state !== 'sent' && (
              <Button size="lg" fullWidth loading={resend.state === 'sending'} onClick={requestNewLink}>
                <Mail size={15} aria-hidden="true" /> Send a new link
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-ink-muted">
              Sign in and we will send you a fresh verification link.
            </p>
            <Button to={`/login?redirect=${encodeURIComponent(location.pathname)}`} size="lg" fullWidth>
              Sign in <ArrowRight size={15} aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    </AuthShell>
  );
}
