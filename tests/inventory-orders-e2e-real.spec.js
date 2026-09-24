/**
 * Spec opt-in contra un backend real con proveedor OCR fake (U8, plan §16).
 *
 * NO corre en CI ni en la suite mocked: se omite salvo que se exporten las
 * variables de entorno documentadas abajo. El spec actúa como proxy
 * server-side (`route.fetch`) para que el navegador siga apuntando a
 * `VITE_API_BASE_URL` (127.0.0.1:5173/__api__) sin tocar playwright.config.js
 * ni .env.test.
 *
 * Cómo ejecutarlo:
 *
 * 1. Backend con el flag encendido y SQLite/MySQL de prueba:
 *      cd backend
 *      $env:INVENTORY_ORDERS_ENABLED="true"
 *      $env:INVENTORY_ORDERS_OCR_PROVIDER="fake"
 *      php artisan serve --host=127.0.0.1 --port=8000
 *
 * 2. Token y usuario de un operador con `pedidos.read` (Sanctum):
 *      $env:INVENTORY_ORDERS_E2E_TOKEN="<token sanctum>"
 *      $env:INVENTORY_ORDERS_E2E_USER='{"id":1,"name":"E2E","role":"contabilidad","permisos_efectivos":["inventario.read","pedidos.read"]}'
 *
 * 3. Spec:
 *      cd web
 *      $env:INVENTORY_ORDERS_E2E="true"
 *      pnpm exec playwright test tests/inventory-orders-e2e-real.spec.js
 *
 * El backend persiste datos reales: usa una base DESCARTABLE nominada y nunca
 * el entorno productivo.
 */
import { test, expect } from './fixtures.js';

const E2E_ENABLED = process.env.INVENTORY_ORDERS_E2E === 'true';
const E2E_API_BASE = (process.env.INVENTORY_ORDERS_E2E_API_URL ?? 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
const E2E_TOKEN = process.env.INVENTORY_ORDERS_E2E_TOKEN ?? '';
const E2E_USER = process.env.INVENTORY_ORDERS_E2E_USER ?? '';

test.describe('pedidos contra backend real (opt-in)', () => {
  test.skip(
    !E2E_ENABLED,
    'Opt-in: exporta INVENTORY_ORDERS_E2E=true con backend + token (ver cabecera del spec).',
  );

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('semanur_token', token);
      localStorage.setItem('semanur_user', user);
      window.__SEMANUR_INVENTORY_ORDERS_ENABLED__ = true;
    }, { token: E2E_TOKEN, user: E2E_USER });

    // Proxy server-side hacia el backend real: evita CORS y mantiene el
    // contrato del cliente (baseURL /__api__) intacto.
    await page.route('**/__api__/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace(/^\/__api__/, '');
      const response = await route.fetch({
        url: `${E2E_API_BASE}${path}${new URL(request.url()).search}`,
        method: request.method(),
        headers: request.headers(),
        data: request.postDataBuffer() ?? undefined,
      });

      await route.fulfill({ response });
    });
  });

  test('la bandeja de pedidos carga contra la API real', async ({ page }) => {
    await page.goto('/#/inventory-orders');

    await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });
});
