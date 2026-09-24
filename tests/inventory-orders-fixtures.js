/**
 * Helpers compartidos de los specs mocked de pedidos (U8).
 *
 * Todos los endpoints se sirven con page.route: no hay backend ni red externa.
 * La bandera de UI se enciende con el override global de tests (sin tocar
 * .env.test, que es compartido).
 */
import { test as base, expect } from './fixtures.js';

export const test = base;

export const CONTABILIDAD_USER = {
  id: 11,
  name: 'Contabilidad Test',
  role: 'contabilidad',
  permisos_efectivos: [
    'inventario.read',
    'pedidos.read',
    'pedidos.create',
    'pedidos.document.write',
    'pedidos.publish',
    'pedidos.discrepancy.respond',
    'pedidos.cancel',
  ],
};

export const BODEGA_USER = {
  id: 22,
  name: 'Bodega Test',
  role: 'auxiliar_bodega',
  permisos_efectivos: [
    'inventario.read',
    'pedidos.read',
    'pedidos.receive',
    'pedidos.catalog.complete',
    'pedidos.discrepancy.respond',
    'pedidos.discrepancy.authorize',
  ],
};

export async function installSession(page, user) {
  await page.addInitScript((sessionUser) => {
    localStorage.setItem('semanur_token', 'playwright-token');
    localStorage.setItem('semanur_user', JSON.stringify(sessionUser));
    window.__SEMANUR_INVENTORY_ORDERS_ENABLED__ = true;
  }, user);
}

export function apiPath(request) {
  return new URL(request.url()).pathname.replace(/^\/__api__/, '');
}

export function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/**
 * Registra un único dispatcher para /__api__/**. `resolver` recibe
 * { method, path, request, url } y devuelve true si ya respondió.
 */
export async function mockApi(page, resolver) {
  await page.route('**/__api__/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const handled = await resolver({
      method: request.method(),
      path: url.pathname.replace(/^\/__api__/, ''),
      request,
      url,
      route,
      json: (body, status = 200) => json(route, body, status),
    });

    if (!handled) {
      await json(route, { success: true, data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } });
    }
  });
}

export { expect };
