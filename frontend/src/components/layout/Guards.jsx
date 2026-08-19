import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../ui';

/**
 * These guards control what is *rendered*, not what is *permitted*.
 *
 * Every protected API is enforced server-side; a user who edits their way past
 * this component reaches endpoints that reject them. The guard exists so the
 * UI does not flash content the user cannot use.
 */

export function RequireAuth({ children }) {
  const { isAuthenticated, initialising } = useAuth();
  const location = useLocation();

  // Wait for the refresh-cookie exchange before deciding, otherwise a reload
  // on a protected page would bounce a signed-in user to the login screen.
  if (initialising) return <PageLoader label="Checking your session" />;

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return children;
}

export function RequireAdmin({ children }) {
  const { isAuthenticated, isAdmin, initialising } = useAuth();
  const location = useLocation();

  if (initialising) return <PageLoader label="Checking your session" />;

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  // Send non-admins home silently rather than advertising that an admin area
  // exists at this URL.
  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
}

/** Keeps signed-in users off the login/register screens. */
export function RedirectIfAuthed({ children }) {
  const { isAuthenticated, initialising } = useAuth();
  const location = useLocation();

  if (initialising) return <PageLoader />;

  if (isAuthenticated) {
    const params = new URLSearchParams(location.search);
    const target = params.get('redirect');
    // Only same-site relative paths are honoured. A value like
    // "//evil.com" or "https://evil.com" would otherwise be an open redirect.
    const safe = target && /^\/(?!\/)/.test(target) ? target : '/';
    return <Navigate to={safe} replace />;
  }

  return children;
}
