/**
 * Realtime opt-in U11 de la bandeja de alertas (plan sección 12).
 *
 * La bandeja persistida es la fuente de verdad; el realtime solo acelera.
 * Este módulo es puro (sin Vue, sin Echo) para poder probarlo en node:test:
 * `echo.js` aporta el `subscribe` real y la página aporta el store.
 */

import { isInventoryOrdersRealtimeEnabled } from './realtimeFlag.js';

export const PEDIDO_ALERTAS_CHANNEL_PREFIX = 'pedidos.alertas';
export const PEDIDO_ALERTA_EVENT_NAME = '.pedido.alerta';

export function pedidoAlertasChannelFor(userId) {
  return `${PEDIDO_ALERTAS_CHANNEL_PREFIX}.${userId}`;
}

/**
 * Convierte el payload mínimo del broadcast
 * ({alert_id, pedido_id, pedido_uuid, tipo, revision}) en una fila temporal
 * de la bandeja. Devuelve null si el evento no trae identidad (no se inventa
 * nada). La fila se reconcilia con el servidor en el siguiente refresh: el
 * stub solo adelanta el contador y el enlace al pedido.
 */
export function buildPedidoAlertStub(event) {
  const alertId = event?.alert_id ?? event?.id;

  if (alertId === null || alertId === undefined) return null;

  return {
    alerta_id: alertId,
    tipo: event?.tipo ?? 'pedido_publicado',
    pedido_id: event?.pedido_id ?? null,
    pedido: event?.pedido_uuid ? { uuid: event.pedido_uuid } : null,
    leida: false,
    created_at: event?.created_at ?? new Date().toISOString(),
    _realtime: true,
  };
}

/**
 * Maneja un evento realtime: merge por alerta_id (dedupe) + refresco del
 * contador. Nunca toca el listado más allá del merge; el polling/refresh
 * manual sigue siendo el camino de reconciliación.
 */
export function handlePedidoAlertaEvent(store, event) {
  const stub = buildPedidoAlertStub(event);

  if (!stub || !store || typeof store.mergeIncoming !== 'function') return false;

  store.mergeIncoming([stub]);

  if (typeof store.refreshUnreadCount === 'function') {
    store.refreshUnreadCount();
  }

  return true;
}

/**
 * Suscripción con gate: solo se suscribe con el flag U11 encendido, usuario,
 * token, store y función `subscribe` válidos. En cualquier otro caso devuelve
 * un noop (mismo contrato que `subscribeToUserNotifications`).
 */
export function subscribeToPedidoAlertasRealtime({
  userId,
  token,
  store,
  subscribe,
  isEnabled = isInventoryOrdersRealtimeEnabled(),
} = {}) {
  if (!isEnabled || !userId || !token || !store || typeof subscribe !== 'function') {
    return () => {};
  }

  return subscribe({
    userId,
    token,
    onAlert: (event) => handlePedidoAlertaEvent(store, event),
  });
}
