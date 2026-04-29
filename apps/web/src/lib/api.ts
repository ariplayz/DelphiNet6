import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const url: string = err.config?.url ?? '';
      // Don't redirect on the /auth/me probe (used by AuthContext to check
      // session state — a 401 here just means "not logged in").
      // Don't redirect on /auth/login failures (LoginPage shows an error).
      // Don't redirect if we're already on /login (avoids reload loops).
      const isAuthProbe = url.includes('/auth/me') || url.includes('/auth/login');
      const onLoginPage = window.location.pathname === '/login';
      if (!isAuthProbe && !onLoginPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);
