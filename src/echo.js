import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

import { PEDIDO_ALERTA_EVENT_NAME, pedidoAlertasChannelFor } from './features/inventory-orders/utils/realtimeAlerts';
import { isInventoryOrdersRealtimeEnabled } from './features/inventory-orders/utils/realtimeFlag';
import { API_BASE_URL, REALTIME_ENABLED } from './shared/config/runtime';

window.Pusher = Pusher;

let echo = null;
let activeUserId = null;

function buildEcho(token) {
  const auth = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const common = {
    auth,
    authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
    bearerToken: token,
  };

  if (import.meta.env.VITE_REVERB_HOST) {
    return new Echo({
      ...common,
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST,
      wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
      wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
      forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
      enabledTransports: ['ws', 'wss'],
    });
  }

  return new Echo({
    ...common,
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
    forceTLS: true,
  });
}

export function leaveUserNotificationChannel(userId = activeUserId) {
  if (!echo || !userId) return;

  echo.leave(`user.${userId}`);
  if (String(userId) === String(activeUserId)) activeUserId = null;
}

export function subscribeToUserNotifications({ userId, token, onNotification }) {
  if (!REALTIME_ENABLED || !userId || !token || typeof onNotification !== 'function') {
    return () => {};
  }

  // FIX-4 (#2431.2): reutiliza la instancia Echo compartida de la sesión en
  // lugar de llamar a disconnectRealtime(). El teardown total tumbaba también
  // el canal de alertas de pedidos (subscribeToPedidoAlertas) que comparte
  // esta instancia; solo se reconstruye al cambiar de usuario.
  if (!echo) {
    echo = buildEcho(token);
  } else if (String(activeUserId) !== String(userId)) {
    disconnectRealtime();
    echo = buildEcho(token);
  }
  activeUserId = userId;
  echo.private(`user.${userId}`).listen('.NotificationSent', onNotification);

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    leaveUserNotificationChannel(userId);
  };
}

export function disconnectRealtime() {
  if (!echo) {
    activeUserId = null;
    return;
  }

  leaveUserNotificationChannel();
  echo.leaveAllChannels();
  echo.disconnect();
  echo = null;
  activeUserId = null;
}

/**
 * U11 realtime opt-in de alertas de pedidos (plan sección 12). Mismo contrato
 * que `subscribeToUserNotifications`, pero sobre el canal privado por
 * destinatario `pedidos.alertas.{userId}` (nunca `user.{id}` ni el pipeline
 * legacy) y con doble gate: `REALTIME_ENABLED` global + flag U11
 * (`VITE_INVENTORY_ORDERS_REALTIME_ENABLED`, default OFF).
 *
 * Comparte la instancia Echo de la sesión (mismo token/usuario); no
 * desconecta el canal legacy. La bandeja persistida sigue siendo la fuente
 * de verdad: `onAlert` recibe el payload mínimo
 * ({alert_id, pedido_id, pedido_uuid, tipo, revision}) y el detalle se lee
 * por la API con Policy.
 */
export function leavePedidoAlertasChannel(userId) {
  if (!echo || !userId) return;

  echo.leave(pedidoAlertasChannelFor(userId));
}

export function subscribeToPedidoAlertas({ userId, token, onAlert }) {
  if (!REALTIME_ENABLED || !isInventoryOrdersRealtimeEnabled() || !userId || !token || typeof onAlert !== 'function') {
    return () => {};
  }

  if (!echo) {
    echo = buildEcho(token);
  }

  echo.private(pedidoAlertasChannelFor(userId)).listen(PEDIDO_ALERTA_EVENT_NAME, onAlert);

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    leavePedidoAlertasChannel(userId);
  };
}
