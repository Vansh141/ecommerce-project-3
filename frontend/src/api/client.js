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

const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

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

    // A 401 on a normal call means the 15-minute access token lapsed. Refresh
    // once and replay — the shopper never sees an interruption.
    const isRetryable =
      response.status === 401 &&
      config &&
      !config._retried &&
      !NO_RETRY.some((path) => config.url?.includes(path));

    if (isRetryable) {
      config._retried = true;
      try {
        const { token } = await refreshAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return api(config);
        }
      } catch {
        // Refresh itself failed → the session is genuinely over.
      }
      setAccessToken(null);
      if (onSessionExpired) onSessionExpired();
    }

    error.friendlyMessage =
      response.data?.error?.message || 'Something went wrong. Please try again.';
    error.errorCode = response.data?.error?.code;
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
