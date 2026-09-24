/**
 * Feature flag U8 del flujo de pedidos.
 *
 * El backend es la autoridad real (INVENTORY_ORDERS_ENABLED responde 404 con el
 * flag apagado); este helper solo decide si la UI Web muestra las pantallas.
 * Default: apagado. Se enciende con VITE_INVENTORY_ORDERS_ENABLED=true en el
 * entorno de desarrollo/tests.
 *
 * Playwright corre `vite --mode test` sin poder editar .env.test (archivo
 * compartido), por eso los specs mocked encienden la bandera con
 * `page.addInitScript(() => { window.__SEMANUR_INVENTORY_ORDERS_ENABLED__ = true })`.
 * Ese override es SOLO una bandera de UI para tests: no guarda secretos ni
 * habilita endpoints (el backend sigue respondiendo 404 sin su propio flag).
 */

export const INVENTORY_ORDERS_GLOBAL_FLAG = '__SEMANUR_INVENTORY_ORDERS_ENABLED__';

export function isEnabledFlagValue(value) {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
}

export function isInventoryOrdersFeatureEnabled(env = readRuntimeEnv(), globalOverride = readGlobalOverride()) {
  return isEnabledFlagValue(env?.VITE_INVENTORY_ORDERS_ENABLED) || globalOverride === true;
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
    return globalThis?.[INVENTORY_ORDERS_GLOBAL_FLAG];
  } catch {
    return undefined;
  }
}

export function enableInventoryOrdersForTests() {
  globalThis[INVENTORY_ORDERS_GLOBAL_FLAG] = true;
}

export function disableInventoryOrdersForTests() {
  delete globalThis[INVENTORY_ORDERS_GLOBAL_FLAG];
}
