import { test, expect } from './fixtures.js';

const adminUser = {
  id: 1,
  name: 'Fuel Test',
  role: 'admin',
  permisos_efectivos: ['combustible.read', 'combustible.write'],
};

async function seedAuthenticatedSession(page) {
  await page.addInitScript((user) => {
    localStorage.setItem('semanur_token', 'playwright-token');
    localStorage.setItem('semanur_user', JSON.stringify(user));
  }, adminUser);
}

test('reuses the same client operation id when an unchanged fuel submit is retried', async ({ page }) => {
  const createPayloads = [];
  await seedAuthenticatedSession(page);

  await page.route('**/__api__/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/__api__/, '');

    if (request.method() === 'POST' && path === '/combustible') {
      createPayloads.push(request.postDataJSON());
      if (createPayloads.length === 1) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Ambiguous temporary failure' }),
        });
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 91 }),
      });
      return;
    }

    if (path === '/user') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(adminUser) });
      return;
    }
    if (path === '/combustible') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }),
      });
      return;
    }
    if (path === '/combustible/resumen') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) });
      return;
    }

    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.goto('/#/fuel');
  await expect(page.getByRole('heading', { name: 'REGISTROS DE COMBUSTIBLE' })).toBeVisible();
  await page.getByRole('button', { name: 'REGISTRAR TANQUEO' }).click();

  const modal = page.locator('.modal').filter({ hasText: 'REGISTRAR COMBUSTIBLE' });
  await modal.locator('.input-group').filter({ hasText: 'Tipo de Destino' }).locator('select').selectOption('empleado');
  await modal.getByPlaceholder('Nombre completo').fill('Operador de prueba');
  await modal.locator('input[type="number"]').first().fill('12.5');

  await modal.getByRole('button', { name: 'REGISTRAR TANQUEO' }).click();
  await expect(modal).toContainText('Ambiguous temporary failure');
  await modal.getByRole('button', { name: 'REGISTRAR TANQUEO' }).click();
  await expect(modal).toBeHidden();

  expect(createPayloads).toHaveLength(2);
  expect(createPayloads[0].client_operation_id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(createPayloads[1].client_operation_id).toBe(createPayloads[0].client_operation_id);
});

test('does not expose the removed diagnostic route', async ({ page }) => {
  await page.goto('/#/diagnostic');
  await expect(page).toHaveURL(/#\/login$/);
});
