import axios from 'axios';

/**
 * API client.
 *
 * The access token lives in a module-scoped variable, NOT in localStorage.
 * A stored token can be read by any injected script; a variable in a closure
 * cannot. Session continuity across reloads comes from the httpOnly refresh
 * cookie instead, which JavaScript can never read.
 */

const baseURL = import.meta.env.VITE_API_URL || '/api';

let accessToken = null;
let onSessionExpired = null;

export const setAccessToken = (token) => { accessToken = token; };
export const getAccessToken = () => accessToken;
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

const api = axios.create({
  baseURL,
  // Required so the browser sends the refresh cookie on /auth calls.
  withCredentials: true,
  timeout: 25_000,
  headers: {
    // Forces a CORS preflight on cross-origin requests. Because the server
    // only approves allowlisted origins, a third-party site cannot obtain
    // that approval — this is the CSRF defence for cookie-authenticated calls.
    'X-Requested-With': 'XMLHttpRequest',
  },
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// ── Silent refresh ───────────────────────────────────────────────────────────
let refreshPromise = null;

/** Coalesces concurrent 401s into a single refresh call. */
function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh`, null, {
        withCredentials: true,
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        // The bare axios default has no timeout. A host that accepts the
        // connection and never answers (a free-tier instance cold-starting)
        // would otherwise leave this pending forever — and with it the
        // `initialising` flag every protected route waits on.
        timeout: 15_000,
      })
      .then((res) => {
        const token = res.data?.data?.accessToken;
        setAccessToken(token);
        return { token, user: res.data?.data?.user };
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export { refreshAccessToken };

/**
 * Did the server definitively end this session?
 *
 * Only a 401 or 403 from the refresh endpoint means that. A timeout, a dropped
 * connection, a 5xx from a host still waking up, or a 429 all mean "ask again
 * later": the httpOnly refresh cookie is untouched and will still work, so
 * treating them as a sign-out would throw away a perfectly valid session.
 */
export function isSessionDefinitivelyOver(error) {
  const status = error?.response?.status;
  return status === 401 || status === 403;
}

const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

/**
 * 401 codes that mean the access token itself is missing, expired, revoked or
 * no longer matches an account — the only 401s a refresh can resolve. A 401 for
 * a wrong *current password* (change password, close account) must not refresh
 * and replay: that rotates the session for nothing and submits the same
 * password guess twice. A 401 without a code is still treated as a token issue.
 */
const TOKEN_ERROR_CODES = new Set([
  'NO_TOKEN', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_REVOKED', 'USER_NOT_FOUND',
]);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (!response) {
      error.friendlyMessage =
        error.code === 'ECONNABORTED'
          ? 'That took too long. Please check your connection and try again.'
          : 'Could not reach the server. Please check your connection.';
      return Promise.reject(error);
    }

    const code = response.data?.error?.code;

    // A 401 on a normal call means the 15-minute access token lapsed. Refresh
    // once and replay — the shopper never sees an interruption.
    const isRetryable =
      response.status === 401 &&
      config &&
      !config._retried &&
      (!code || TOKEN_ERROR_CODES.has(code)) &&
      !NO_RETRY.some((path) => config.url?.includes(path));

    if (isRetryable) {
      config._retried = true;
      let sessionOver = true;

      try {
        const { token } = await refreshAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return api(config);
        }
      } catch (refreshError) {
        // Only a definitive rejection ends the session. An unreachable,
        // booting or rate-limiting server leaves the cookie worth retrying.
        sessionOver = isSessionDefinitivelyOver(refreshError);
      }

      if (!sessionOver) {
        error.friendlyMessage =
          'We could not confirm your session just now. Please try again in a moment.';
        error.errorCode = 'SESSION_UNCONFIRMED';
        return Promise.reject(error);
      }

      setAccessToken(null);
      if (onSessionExpired) onSessionExpired();
    }

    error.friendlyMessage =
      response.data?.error?.message || 'Something went wrong. Please try again.';
    error.errorCode = code;
    error.fieldErrors = response.data?.error?.details;

    return Promise.reject(error);
  }
);

/** Unwraps the { success, data, meta } envelope. */
export const unwrap = (response) => response.data?.data;
export const unwrapWithMeta = (response) => ({
  data: response.data?.data,
  meta: response.data?.meta,
});

export default api;
