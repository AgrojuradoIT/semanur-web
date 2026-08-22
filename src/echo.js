import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

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

  disconnectRealtime();
  echo = buildEcho(token);
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
