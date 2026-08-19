import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, userApi } from '../api/endpoints';
import { setAccessToken, setSessionExpiredHandler, refreshAccessToken } from '../api/client';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

/**
 * Only non-sensitive profile fields are cached, purely so the header can render
 * the right state on first paint without a flash. The cache is never trusted
 * for authorisation — the server re-derives identity from the token on every
 * request, and the cache is discarded the moment a refresh fails.
 */
const CACHE_KEY = 'touch.user';

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Whether this browser has ever had a session.
 *
 * The refresh cookie is httpOnly, so JavaScript cannot check for it directly.
 * Without this hint every anonymous visitor would fire a guaranteed-401
 * refresh request on page load — a wasted round trip on the slowest moment of
 * the visit, plus a console error on a perfectly healthy page.
 */
const hasSessionHint = () => {
  try {
    return localStorage.getItem(CACHE_KEY) !== null;
  } catch {
    return false;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readCache);
  const [initialising, setInitialising] = useState(true);

  const persist = useCallback((nextUser) => {
    setUser(nextUser);
    try {
      if (nextUser) localStorage.setItem(CACHE_KEY, JSON.stringify(nextUser));
      else localStorage.removeItem(CACHE_KEY);
    } catch {
      /* private mode — in-memory state still works */
    }
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    persist(null);
  }, [persist]);

  // On boot, trade the httpOnly refresh cookie for an access token. This is
  // what makes a reload keep you signed in without storing a token on disk.
  useEffect(() => {
    let cancelled = false;

    // Skip entirely for visitors who have never signed in on this browser.
    if (!hasSessionHint()) {
      setInitialising(false);
      return undefined;
    }

    (async () => {
      try {
        const { user: freshUser } = await refreshAccessToken();
        if (!cancelled && freshUser) persist(freshUser);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setInitialising(false);
      }
    })();

    return () => { cancelled = true; };
  }, [persist, clearSession]);

  // The axios layer calls this when a refresh attempt definitively fails.
  useEffect(() => {
    setSessionExpiredHandler(() => clearSession());
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login({ email, password });
      setAccessToken(data.accessToken);
      persist(data.user);
      return data.user;
    },
    [persist]
  );

  const register = useCallback(
    async (payload) => {
      const data = await authApi.register(payload);
      setAccessToken(data.accessToken);
      persist(data.user);
      return data.user;
    },
    [persist]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout(); // clears the httpOnly cookie server-side
    } catch {
      /* log out locally regardless */
    }
    clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(
    async (payload) => {
      const data = await userApi.updateProfile(payload);
      persist(data.user);
      return data.user;
    },
    [persist]
  );

  const changePassword = useCallback(
    async (payload) => {
      const data = await userApi.changePassword(payload);
      // The server rotates this device's token so the user stays signed in here
      // while every other session is revoked.
      if (data.accessToken) setAccessToken(data.accessToken);
      if (data.user) persist(data.user);
      return data;
    },
    [persist]
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      initialising,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      setUser: persist,
    }),
    [user, initialising, login, register, logout, updateProfile, changePassword, persist]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
