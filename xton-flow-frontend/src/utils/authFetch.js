import { clearAuthState } from './authStorage';

const LOGIN_PATHS = ['/login', '/register'];

const redirectToLogin = () => {
  if (!LOGIN_PATHS.includes(window.location.pathname)) {
    window.location.replace('/login');
  }
};

export const authFetch = async (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (response.status === 401) {
    clearAuthState();
    sessionStorage.setItem('auth-banner', 'Session expired. Please sign in again.');
    redirectToLogin();
    throw new Error('Session expired. Please sign in again.');
  }

  return response;
};

export { clearAuthState };
