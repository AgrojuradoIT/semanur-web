const DEFAULT_DEVELOPMENT_API_URL = 'http://localhost:8000/api';

function normalizedUrl(value) {
  return value.trim().replace(/\/+$/, '');
}

function isLoopbackHost(hostname) {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
}

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (import.meta.env.PROD && !configuredApiUrl) {
  throw new Error('VITE_API_BASE_URL is required for a production build.');
}

export const API_BASE_URL = normalizedUrl(configuredApiUrl || DEFAULT_DEVELOPMENT_API_URL);

const parsedApiUrl = new URL(API_BASE_URL);

if (import.meta.env.PROD && parsedApiUrl.protocol !== 'https:') {
  throw new Error('VITE_API_BASE_URL must use HTTPS in production.');
}

if (import.meta.env.MODE === 'test' && !isLoopbackHost(parsedApiUrl.hostname)) {
  throw new Error('Test mode refuses a non-loopback VITE_API_BASE_URL.');
}

export const REALTIME_ENABLED =
  import.meta.env.VITE_REALTIME_ENABLED !== 'false' &&
  Boolean(import.meta.env.VITE_REVERB_APP_KEY || import.meta.env.VITE_PUSHER_APP_KEY);
