import { test, expect } from '@playwright/test';
import path from 'node:path';

const dashboardFixture = {
  summary: { total_fuel_cost: 0, total_maintenance_cost: 1200000, vehicle_count: 12, open_orders: 99 },
  fuelMonthly: [{ year: 2026, month: 7, gallons: 42, cost: 210000 }],
  maintenanceByVehicle: [{ placa: 'ABC123', total_cost: 420000 }],
  fuelStock: [{ producto_id: 1, producto_nombre: 'Gasolina', producto_sku: 'GAS-01', producto_stock_actual: 120, producto_alerta_stock_minimo: 50, producto_unidad_medida: 'GAL', capacidad_maxima: 200 }],
  fuelHistory15Days: [
    { date: '2026-07-01', day_name: 'lun', day_number: 1, gasolina: 8, acpm: 6 },
    { date: '2026-07-02', day_name: 'mar', day_number: 2, gasolina: 12, acpm: 9 },
  ],
  otStats: { abiertas: 4, prioridades: { Alta: 2, Media: 1, Baja: 1 } },
  preopHoy: { completados: 3, total: 5 },
  loansStats: { activos: 6, envejecidos: 2 },
  lowStock: { count: 3 },
  liveSessions: {
    total: 3,
    items: [
      { sesion_id: 1, elapsed_min: 35, empleado: { nombre: 'Ana Mecánica' }, ordenTrabajo: { orden_trabajo_id: 21, vehiculo: { placa: 'TAL321' } } },
      { sesion_id: 2, elapsed_min: 18, empleado: { nombre: 'Luis Taller' }, ordenTrabajo: { orden_trabajo_id: 22, vehiculo: { placa: 'TAL654' } } },
      { sesion_id: 3, elapsed_min: 4, empleado: { nombre: 'Marta Servicio' }, ordenTrabajo: { orden_trabajo_id: 23, vehiculo: { placa: 'TAL987' } } },
    ],
  },
  recentActivity: [
    { type: 'ot', id: 31, titulo: 'OT #31 creada', descripcion: 'TAL321 · En progreso', at: '2026-07-21T11:59:00-05:00', link: { name: 'work-orders' } },
    { type: 'movimiento', id: 32, titulo: 'Filtro hidráulico', descripcion: 'Salida de inventario', at: '2026-07-21T11:55:00-05:00', link: { name: 'inventory' } },
    { type: 'tanqueo', id: 33, titulo: 'Tanqueo TAL654', descripcion: '42 gal ACPM', at: '2026-07-21T11:50:00-05:00', link: { name: 'fuel' } },
    { type: 'ot', id: 34, titulo: 'OT #34 creada', descripcion: 'TAL987 · Abierta', at: '2026-07-21T11:45:00-05:00', link: { name: 'work-orders' } },
    { type: 'movimiento', id: 35, titulo: 'Juego de llaves', descripcion: 'Ingreso de inventario', at: '2026-07-21T11:40:00-05:00', link: { name: 'inventory' } },
    { type: 'tanqueo', id: 36, titulo: 'Tanqueo TAL321', descripcion: '21 gal Gasolina', at: '2026-07-21T11:35:00-05:00', link: { name: 'fuel' } },
    { type: 'ot', id: 37, titulo: 'OT #37 creada', descripcion: 'TAL321 · Cerrada', at: '2026-07-21T11:30:00-05:00', link: { name: 'work-orders' } },
    { type: 'movimiento', id: 38, titulo: 'Aceite 15W40', descripcion: 'Salida de inventario', at: '2026-07-21T11:25:00-05:00', link: { name: 'inventory' } },
  ],
  alerts: {
    total: 5,
    counts: { docs_vencidos: 1, docs_por_vencer: 2, servicios: 1, stock: 1, prestamos: 1 },
    items: [
      { tipo: 'documento', subtipo: 'soat', severity: 'vencido', entidad: { label: 'AAA111' }, detalle: 'SOAT vencido', link: { name: 'fleet' } },
      { tipo: 'stock', subtipo: 'bajo', severity: 'proximo', entidad: { label: 'Filtro' }, detalle: 'Stock bajo', link: { name: 'inventory' } },
      { tipo: 'prestamo', subtipo: 'envejecido', severity: 'informativo', entidad: { label: 'Taladro' }, detalle: 'Préstamo activo', link: { name: 'loans' } },
    ],
  },
};

function cloneFixture(overrides = {}) {
  return { ...structuredClone(dashboardFixture), ...overrides };
}

async function openDashboard(page, fixture = dashboardFixture, { status = 200 } = {}) {
  const requests = [];
  const consoleIssues = [];

  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type())) consoleIssues.push(`[${message.type()}] ${message.text()}`);
  });
  page.on('pageerror', (error) => consoleIssues.push(`[pageerror] ${error.message}`));

  await page.addInitScript(() => {
    localStorage.setItem('semanur_token', 'playwright-token');
    localStorage.setItem('semanur_user', JSON.stringify({ id: 1, name: 'Dashboard Test', role: 'admin', permisos_efectivos: ['analitica.read'] }));
  });

  await page.route('http://localhost:8000/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);

    if (path === '/api/dashboard/all') {
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(fixture) });
      return;
    }
    if (path === '/api/user') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 1, name: 'Dashboard Test', role: 'admin' }) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.goto('/#/');
  return { requests, consoleIssues };
}

test('renders six zero-safe operational KPI cards from one BFF request without forbidden calls or Vue console issues', async ({ page }) => {
  const { requests, consoleIssues } = await openDashboard(page);

  await expect(page.getByTestId('kpi-strip')).toBeVisible();
  await expect(page.locator('.kpi-card')).toHaveCount(6);
  await expect(page.getByTestId('kpi-ots')).toContainText('4');
  await expect(page.getByTestId('kpi-ots')).toContainText('Alta 2');
  await expect(page.getByTestId('kpi-preop')).toContainText('3/5');
  await expect(page.getByTestId('kpi-loans')).toContainText('6');
  await expect(page.getByTestId('kpi-stock')).toContainText('3');
  await expect(page.getByTestId('kpi-maintenance')).toContainText('1.200.000');
  await expect(page.getByTestId('kpi-docs')).toContainText('3');
  await expect(page.locator('.dash-fuel-hero')).toBeVisible();
  await expect(page.locator('.fuel-history-svg path')).toHaveCount(4);

  expect(requests.filter((path) => path === '/api/dashboard/all')).toHaveLength(1);
  expect(requests.some((path) => /\/(ordenes-trabajo|prestamos|programacion|catalogos|vehiculos)(\/|$)/.test(path))).toBeFalsy();
  expect(consoleIssues).toEqual([]);
});

test('uses zero-safe defaults for every KPI without Vue warnings or errors', async ({ page }) => {
  const emptyFixture = cloneFixture({
    summary: {}, maintenanceByVehicle: [], fuelStock: [], fuelHistory15Days: [], fuelMonthly: [],
    otStats: {}, preopHoy: {}, loansStats: {}, lowStock: {}, alerts: { total: 0, counts: {}, items: [] },
  });
  const { consoleIssues } = await openDashboard(page, emptyFixture);

  await expect(page.getByTestId('kpi-ots')).toContainText('0');
  await expect(page.getByTestId('kpi-preop')).toContainText('0/0');
  await expect(page.getByTestId('kpi-loans')).toContainText('0');
  await expect(page.getByTestId('kpi-stock')).toContainText('0');
  await expect(page.getByTestId('kpi-docs')).toContainText('0');
  expect(consoleIssues).toEqual([]);
});

test('renders the live workshop mini-board and active-session list with semantic deep links', async ({ page }) => {
  await openDashboard(page);

  const panel = page.getByTestId('live-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('live-status')).toHaveCount(4);
  await expect(panel.getByTestId('live-session')).toHaveCount(3);
  await expect(panel.getByTestId('live-session').first()).toContainText('Ana Mecánica');
  await expect(panel.getByTestId('live-session').first()).toContainText('TAL321');
  await expect(panel.getByTestId('live-session').first()).toContainText('35 min');
  await panel.getByTestId('live-session').first().click();
  await expect(page).toHaveURL(/#\/work-orders$/);
});

test('renders five newest-first activity rows with type icons and module links', async ({ page }) => {
  await openDashboard(page);

  const panel = page.getByTestId('recent-activity-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('activity-item')).toHaveCount(5);
  await expect(panel.getByTestId('activity-item').first()).toContainText('OT #31 creada');
  await expect(panel.getByTestId('activity-item').first().getByTestId('activity-icon')).toHaveText('assignment');
  await expect(panel.getByTestId('activity-item').nth(1).getByTestId('activity-icon')).toHaveText('inventory_2');
  await expect(panel.getByTestId('activity-item').nth(2).getByTestId('activity-icon')).toHaveText('local_gas_station');
  await panel.getByTestId('activity-item').nth(1).click();
  await expect(page).toHaveURL(/#\/inventory$/);
});

test('shows positive empty states for live sessions and recent activity', async ({ page }) => {
  await openDashboard(page, cloneFixture({
    liveSessions: { total: 0, items: [] },
    recentActivity: [],
  }));

  await expect(page.getByTestId('live-empty')).toContainText('Sin sesiones activas');
  await expect(page.getByTestId('recent-activity-empty')).toContainText('Sin actividad reciente');
});

test('renders BFF alerts in severity order, exposes overflow and deep-links fleet, inventory and loans', async ({ page }) => {
  await openDashboard(page);

  const panel = page.getByTestId('alerts-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('alert-item')).toHaveCount(3);
  await expect(panel.getByTestId('alert-item').nth(0)).toContainText('SOAT vencido');
  await expect(panel.getByTestId('alerts-overflow')).toHaveText('+2');

  await panel.getByTestId('alert-item').nth(0).click();
  await expect(page).toHaveURL(/#\/fleet$/);
  await page.goto('/#/');
  await panel.getByTestId('alert-item').nth(1).click();
  await expect(page).toHaveURL(/#\/inventory$/);
  await page.goto('/#/');
  await panel.getByTestId('alert-item').nth(2).click();
  await expect(page).toHaveURL(/#\/loans$/);
});

test('shows a positive empty alert state and a 403 dashboard error state', async ({ page }) => {
  await openDashboard(page, cloneFixture({ alerts: { total: 0, counts: {}, items: [] } }));
  await expect(page.getByTestId('alerts-empty')).toContainText('Sin alertas activas');

  const errorPage = await page.context().newPage();
  await openDashboard(errorPage, {}, { status: 403 });
  await expect(errorPage.locator('.dash-error')).toBeVisible();
  await errorPage.close();
});

for (const viewport of [
  { name: 'desktop', width: 1440, expectedColumns: 3 },
  { name: 'tablet', width: 768, expectedColumns: 2 },
  { name: 'mobile', width: 375, expectedColumns: 1 },
]) {
  test(`keeps the KPI grid intentional and overflow-free at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: 900 });
    await openDashboard(page);
    await expect(page.getByTestId('kpi-strip')).toBeVisible();
    if (viewport.width <= 768) {
      await page.getByRole('button', { name: 'Ocultar menú' }).click();
      await expect(page.getByRole('button', { name: /Mostrar/ })).toBeVisible();
    }

    const layout = await page.getByTestId('kpi-strip').evaluate((element) => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    expect(layout.columns).toBe(viewport.expectedColumns);
    expect(layout.documentOverflow).toBeFalsy();
    const bottomGrid = await page.locator('.dash-bottom-grid').evaluate((element) => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
      panels: element.children.length,
    }));
    expect(bottomGrid.panels).toBe(3);
    expect(bottomGrid.columns).toBe(viewport.expectedColumns);
    await page.locator('.dash-bottom-grid').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(process.env.TEMP || process.env.TMP || '.', `semanur-dashboard-final-${viewport.width}.png`),
      fullPage: true,
    });
  });
}
