import { reactive } from 'vue';

import { listAlerts, readAlert } from '../services/inventoryOrdersService';
import { createAlertsStore } from '../utils/alertsStore';

const inboxState = reactive({
  items: [],
  meta: null,
  unreadCount: 0,
  loaded: false,
  loading: false,
  error: null,
});

const store = createAlertsStore({
  api: { listAlerts, readAlert },
  state: inboxState,
});

export const alertsInboxState = inboxState;

/**
 * Bandeja de alertas Web (plan sección 12). Estado compartido por la app: la
 * barra lateral usa `unreadCount` y la página usa el listado completo. La
 * fuente de verdad es el servidor; un fallo del contador nunca rompe la UI.
 */
export function useAlertsInbox() {
  return {
    state: alertsInboxState,
    refresh: store.refresh,
    refreshUnreadCount: store.refreshUnreadCount,
    markRead: store.markRead,
    mergeIncoming: store.mergeIncoming,
    // FIX-4 (#2431.1): expone el reseteo para limpiarlo al cerrar sesión.
    clearInbox: store.clearInbox,
    reset: store.reset,
  };
}

/**
 * FIX-4 (#2431.1): vacía el singleton compartido. Llamar en el logout
 * (AppShell) para que el siguiente usuario no vea la bandeja ajena.
 */
export function clearAlertsInbox() {
  store.clearInbox();
}
