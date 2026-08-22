import { test, expect } from './fixtures.js';

const adminUser = {
  id: 1,
  name: 'Work Order Test',
  role: 'admin',
  permisos_efectivos: ['taller.read', 'taller.write'],
};

test('reuses the same client operation id when an unchanged work-order submit is retried', async ({ page }) => {
  const operationIds = [];

  await page.addInitScript((user) => {
    localStorage.setItem('semanur_token', 'playwright-token');
    localStorage.setItem('semanur_user', JSON.stringify(user));
  }, adminUser);

  await page.route('**/__api__/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/__api__/, '');

    if (request.method() === 'POST' && path === '/ordenes-trabajo') {
      const body = request.postData() || '';
      const operationId = body.match(/name="client_operation_id"\r?\n\r?\n([^\r\n]+)/)?.[1];
      operationIds.push(operationId);

      if (operationIds.length === 1) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Ambiguous work-order failure' }),
        });
        return;
      }

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 123 }),
      });
      return;
    }

    if (path === '/user') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(adminUser) });
      return;
    }
    if (path === '/vehiculos') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: [{ vehiculo_id: 7, placa: 'TST007', tipo: 'Camioneta' }] }),
      });
      return;
    }
    if (path === '/empleados') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [] }) });
      return;
    }
    if (path === '/productos') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [] }) });
      return;
    }
    if (path === '/ordenes-trabajo') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [] }) });
      return;
    }

    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.goto('/#/work-orders');
  await expect(page.getByRole('heading', { name: 'ORDENES DE TRABAJO' })).toBeVisible();
  await page.getByRole('button', { name: 'NUEVA ORDEN' }).click();

  const modal = page.locator('.modal').filter({ hasText: 'NUEVA ORDEN DE TRABAJO' });
  const vehicleDropdown = modal.locator('.input-group').filter({ hasText: 'Vehiculo' }).locator('.searchable-dropdown').first();
  await vehicleDropdown.locator('.dropdown-trigger').click();
  await vehicleDropdown.locator('.dropdown-item').filter({ hasText: 'TST007' }).click();
  await modal.getByPlaceholder('Describe el trabajo a realizar...').fill('Diagnóstico de frenos');

  await modal.getByRole('button', { name: 'CREAR ORDEN' }).click();
  await expect(page.getByText('Ambiguous work-order failure')).toBeVisible();
  await modal.getByRole('button', { name: 'CREAR ORDEN' }).click();
  await expect(modal).toBeHidden();

  expect(operationIds).toHaveLength(2);
  expect(operationIds[0]).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(operationIds[1]).toBe(operationIds[0]);
});
