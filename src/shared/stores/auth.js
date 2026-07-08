import { defineStore } from 'pinia';
import http from '../api/http';
import {
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  persistStoredSession,
} from '../auth/session';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
    loading: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    isJefeDeTaller: (state) => state.user?.role === 'jefe_taller',
    permisos: (state) => state.user?.permisos ?? [],
    canAccessModule: (state) => (modulo) => {
      if (!state.user) return false;
      if (state.user.role === 'admin') return true;
      // Usar permisos_efectivos que ya incluye los defaults del rol
      const p = state.user.permisos_efectivos ?? state.user.permisos ?? [];
      if (!Array.isArray(p)) return false;
      return p.includes(`${modulo}.read`) || p.includes(`${modulo}.write`) || p.includes(modulo);
    },
    hasPermission: (state) => (permission) => {
      if (!state.user) return false;
      if (state.user.role === 'admin') return true;
      const p = state.user.permisos_efectivos ?? state.user.permisos ?? [];
      if (!Array.isArray(p)) return false;
      return p.includes(permission) || p.includes(permission.split('.')[0]);
    },
  },
  actions: {
    hydrateFromStorage() {
      this.token = getStoredToken();
      this.user = getStoredUser();
    },
    persistSession(token, user) {
      this.token = token;
      this.user = user;
      persistStoredSession(token, user);
    },
    clearSession() {
      this.token = null;
      this.user = null;
      this.error = null;
      clearStoredSession();
    },
    async login({ email, password }) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await http.post('/login', {
          email,
          password,
          device_name: 'Semanur Web Vue',
        });

        this.persistSession(data.token, data.user);
        return true;
      } catch (error) {
        this.error =
          error?.response?.data?.message ||
          error?.message ||
          'No fue posible iniciar sesion';
        return false;
      } finally {
        this.loading = false;
      }
    },
    async logout() {
      try {
        if (this.token) {
          await http.post('/logout');
        }
      } catch {
        // ignore API logout failures and clear local session anyway
      } finally {
        this.clearSession();
      }
    },
    async refreshUser() {
      if (!this.token) return;
      try {
        const { data } = await http.get('/user');
        this.user = data;
        persistStoredSession(this.token, data);
      } catch {
        // ignore refresh failures
      }
    },
  },
});
