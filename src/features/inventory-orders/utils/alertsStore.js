import { mergeUniqueAlerts, contarNoLeidas, buildAlertQuery } from './alerts.js';

/**
 * Estado de la bandeja de alertas (fuente de verdad persistida en servidor).
 * Fábrica sin Vue para poder probarla en node:test; el composable la envuelve
 * en reactividad. El merge deduplica por alerta_id y nunca inventa leídas.
 */
export function createAlertsStore({ api, now = () => new Date().toISOString(), state: initialState } = {}) {
  // El estado puede inyectarse (p. ej. reactivo desde el composable) para que
  // las mutaciones disparen la reactividad de Vue. Sin inyección se usa un
  // objeto plano, suficiente para las pruebas de node.
  const state = initialState ?? {
    items: [],
    meta: null,
    unreadCount: 0,
    loaded: false,
    loading: false,
    error: null,
  };

  async function refresh({ tipo = null, leida = null, page = 1, perPage = 25 } = {}) {
    state.loading = true;
    state.error = null;

    try {
      const payload = await api.listAlerts(buildAlertQuery({ tipo, leida, page, perPage }));
      const incoming = Array.isArray(payload?.data) ? payload.data : [];

      state.items = page === 1 ? incoming : mergeUniqueAlerts(state.items, incoming);
      state.meta = payload?.meta ?? null;
      state.unreadCount = Number(payload?.meta?.unread_count ?? contarNoLeidas(state.items));
      state.loaded = true;

      return payload;
    } catch (error) {
      state.error = error;
      throw error;
    } finally {
      state.loading = false;
    }
  }

  async function refreshUnreadCount() {
    // U11: solo el contador. No toca items/meta para que un ping realtime no
    // colapse el listado visible; la reconciliación del listado es de refresh().
    try {
      const payload = await api.listAlerts(buildAlertQuery({ page: 1, perPage: 1, leida: false }));
      state.unreadCount = Number(payload?.meta?.unread_count ?? contarNoLeidas(state.items));
    } catch {
      // La bandeja es recuperable: un fallo del contador no rompe la pantalla.
    }
  }

  async function markRead(alertId) {
    const payload = await api.readAlert(alertId);
    const index = state.items.findIndex((alerta) => alerta.alerta_id === alertId);

    if (index >= 0) {
      state.items[index] = {
        ...state.items[index],
        leida: true,
        leida_at: payload?.leida_at ?? now(),
      };
    }

    state.unreadCount = contarNoLeidas(state.items);

    return payload;
  }

  function mergeIncoming(incoming = []) {
    state.items = mergeUniqueAlerts(state.items, incoming);
    state.unreadCount = contarNoLeidas(state.items);
  }

  return { state, refresh, refreshUnreadCount, markRead, mergeIncoming };
}
