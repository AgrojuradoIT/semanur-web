import { test, expect, installSession, mockApi, BODEGA_USER } from './inventory-orders-fixtures.js';

const ORDER_UUID = '44444444-4444-4444-8444-444444444444';

function alerta(overrides = {}) {
  return {
    alerta_id: 5,
    tipo: 'novedad_abierta',
    pedido_id: 4,
    pedido: { uuid: ORDER_UUID, numero: 'PED-000004', estado: 'parcial_con_novedad' },
    leida: false,
    leida_at: null,
    created_at: '2026-09-10T11:40:00Z',
    ...overrides,
  };
}

test('bandeja de alertas: contador, enlace al pedido y marcar como leída', async ({ page }) => {
  await installSession(page, BODEGA_USER);

  let leida = false;

  await mockApi(page, async ({ method, path, json }) => {
    if (method === 'GET' && path === '/user') {
      await json(BODEGA_USER);
      return true;
    }
    if (method === 'GET' && path === '/web/inventory-order-alerts') {
      await json({
        success: true,
        data: [alerta({ leida, leida_at: leida ? '2026-09-10T12:00:00Z' : null })],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, unread_count: leida ? 0 : 1 },
      });
      return true;
    }
    if (method === 'POST' && path === '/web/inventory-order-alerts/5/read') {
      leida = true;
      await json({ success: true, data: alerta({ leida: true, leida_at: '2026-09-10T12:00:00Z' }) });
      return true;
    }
    return false;
  });

  await page.goto('/#/inventory-orders/alertas');

  await expect(page.getByRole('heading', { name: 'Bandeja de alertas de pedidos' })).toBeVisible();
  await expect(page.locator('.alertas-page__contador')).toContainText('sin leer');
  await expect(page.locator('.alertas-list__item').getByText('Novedad abierta')).toBeVisible();

  await expect(page.getByRole('link', { name: 'PED-000004' })).toHaveAttribute(
    'href',
    new RegExp(`#/inventory-orders/${ORDER_UUID}/novedades$`),
  );

  const badge = page.locator('.sidebar-item').filter({ hasText: 'Pedidos' }).locator('.sidebar-badge');
  await expect(badge).toHaveText('1');

  await page.getByRole('button', { name: 'Marcar como leída' }).click();

  await expect(page.locator('.alertas-page__contador')).toContainText('0');
  await expect(badge).toBeHidden();
});
