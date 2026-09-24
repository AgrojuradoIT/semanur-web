/**
 * Feature flag U11 del realtime opt-in de alertas de pedidos.
 *
 * Default: apagado en ambos lados. Encender la UI exige
 * `VITE_INVENTORY_ORDERS_REALTIME_ENABLED=true`; el backend además exige
 * `INVENTORY_ORDERS_REALTIME_ENABLED=true` + `BROADCAST_CONNECTION` real con
 * un servidor de broadcast en marcha. Sin eso, la bandeja persistida con
 * polling/refresh sigue siendo el camino funcional.
 *
 * Igual que `flag.js`, los specs pueden forzar la bandera con
 * `window.__SEMANUR_INVENTORY_ORDERS_REALTIME_ENABLED__ = true` (solo UI,
 * sin secretos ni endpoints).
 */

import { isEnabledFlagValue } from './flag.js';

export const INVENTORY_ORDERS_REALTIME_GLOBAL_FLAG = '__SEMANUR_INVENTORY_ORDERS_REALTIME_ENABLED__';

export function isInventoryOrdersRealtimeEnabled(env = readRuntimeEnv(), globalOverride = readGlobalOverride()) {
  return isEnabledFlagValue(env?.VITE_INVENTORY_ORDERS_REALTIME_ENABLED) || globalOverride === true;
}

function readRuntimeEnv() {
  try {
    return import.meta.env || {};
  } catch {
    return {};
  }
}

function readGlobalOverride() {
  try {
    return globalThis?.[INVENTORY_ORDERS_REALTIME_GLOBAL_FLAG];
  } catch {
    return undefined;
  }
}

export function enableInventoryOrdersRealtimeForTests() {
  globalThis[INVENTORY_ORDERS_REALTIME_GLOBAL_FLAG] = true;
}

export function disableInventoryOrdersRealtimeForTests() {
  delete globalThis[INVENTORY_ORDERS_REALTIME_GLOBAL_FLAG];
}
