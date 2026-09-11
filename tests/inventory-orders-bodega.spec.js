import { test, expect, installSession, mockApi, BODEGA_USER } from './inventory-orders-fixtures.js';

const ORDER_UUID = '22222222-2222-4222-8222-222222222222';

function pedidoPublicado(estado = 'pendiente_recepcion') {
  return {
    pedido_id: 2,
    uuid: ORDER_UUID,
    numero: 'PED-000002',
    proveedor_nombre_confirmado: 'Proveedor Confirmado',
    referencia_factura: 'FV-002',
    bodega_id: 1,
    bodega: { bodega_id: 1, nombre: 'Bodega Central', tipo: 'estandar' },
    estado,
    version: 3,
    lineas: [
      {
        linea_id: 1,
        orden: 1,
        sku_raw: 'SKU-A',
        sku_confirmado: 'SKU-A',
        descripcion_raw: 'PRODUCTO A',
        descripcion_confirmada: 'PRODUCTO A',
        cantidad_esperada: '4.00',
        unidad: 'unidad',
        producto_id: 7,
        version: 1,
      },
      {
        linea_id: 2,
        orden: 2,
        sku_raw: 'SKU-B',
        sku_confirmado: 'SKU-B',
        descripcion_raw: 'PRODUCTO B',
        descripcion_confirmada: 'PRODUCTO B',
        cantidad_esperada: '4.00',
        unidad: 'unidad',
        producto_id: 8,
        version: 1,
      },
    ],
    documentos: [],
    acciones: {
      editar: false,
      publicar: false,
      retirar: false,
      cancelar: false,
      recibir: true,
      completar_ficha: true,
      responder_novedad: true,
      autorizar_desfase: true,
    },
  };
}

function lineaRecepcion(lineaId, orden, sku, cantidad) {
  return {
    linea_id: lineaId,
    orden,
    sku_confirmado: sku,
    descripcion_confirmada: `PRODUCTO ${sku}`,
    cantidad_esperada: cantidad,
    unidad: 'unidad',
    producto_id: 6 + orden,
    estado_linea: 'pendiente',
    requiere_ficha: false,
    observacion: null,
  };
}

function observacion(pedidoLineaId, total, aptos) {
  return {
    recepcion_linea_id: pedidoLineaId,
    recepcion_id: 12,
    pedido_linea_id: pedidoLineaId,
    conteo_total: total,
    conteo_aptos: aptos,
    estado_condicion: 'conforme',
    motivo: null,
    esperado_snapshot: '4.00',
    observacion_version: 1,
    count_confirmed: false,
    reconteos: 0,
    registrado_at: '2026-09-10T11:00:00Z',
  };
}

test('flujo bodega: por recibir, conteo sin precarga y confirmación con novedad', async ({ page }) => {
  await installSession(page, BODEGA_USER);

  let pedido = pedidoPublicado();

  await mockApi(page, async ({ method, path, route, json }) => {
    if (method === 'GET' && path === '/user') {
      await json(BODEGA_USER);
      return true;
    }
    if (method === 'GET' && path === '/categorias') {
      await json({ data: [] });
      return true;
    }
    if (method === 'GET' && path === '/web/inventory-order-alerts') {
      await json({ success: true, data: [], meta: { current_page: 1, last_page: 1, per_page: 1, total: 0, unread_count: 0 } });
      return true;
    }
    if (method === 'GET' && path === '/web/inventory-orders') {
      await json({
        success: true,
        data: [{
          ...pedido,
          lineas: undefined,
          lineas_count: 2,
          acciones: undefined,
        }],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
      });
      return true;
    }
    if (method === 'GET' && path === `/web/inventory-orders/${ORDER_UUID}`) {
      await json({ success: true, data: pedido });
      return true;
    }
    if (method === 'POST' && path === `/web/inventory-orders/${ORDER_UUID}/receipts`) {
      await json({
        success: true,
        created: true,
        data: {
          recepcion_id: 12,
          pedido_uuid: ORDER_UUID,
          numero: 'PED-000002',
          estado: 'borrador',
          version: 1,
          lineas: [
            lineaRecepcion(1, 1, 'SKU-A', '4.00'),
            lineaRecepcion(2, 2, 'SKU-B', '4.00'),
          ],
        },
      }, 201);
      return true;
    }
    if (method === 'PUT' && path.startsWith(`/web/inventory-orders/${ORDER_UUID}/receipts/12/lines/`)) {
      const payload = JSON.parse(route.request().postData() || '{}');
      const lineaId = Number(path.split('/').pop());
      await json({ success: true, data: observacion(lineaId, payload.conteo_total, payload.conteo_aptos) });
      return true;
    }
    if (method === 'POST' && path === `/web/inventory-orders/${ORDER_UUID}/receipts/12/confirm`) {
      pedido = pedidoPublicado('parcial_con_novedad');
      await json({
        success: true,
        data: {
          receipt_id: 12,
          order_id: ORDER_UUID,
          resulting_state: 'parcial_con_novedad',
          posted_lines: [{ line_id: 1, producto_id: 7, quantity: '4.00', transaction_id: 91 }],
          blocked_lines: [{ line_id: 2, issue_id: 2, reason: 'faltante', motivo_bloqueo: 'faltante' }],
          closed_without_stock: [],
          authorizations_invalidated: [],
          receipt_version: 2,
          order_version: 4,
          novedades_abiertas: 1,
        },
        idempotent_replay: false,
      });
      return true;
    }
    return false;
  });

  await page.goto('/#/inventory-orders');
  await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();
  await expect(page.getByText('PED-000002')).toBeVisible();

  await page.getByRole('link', { name: 'Recibir' }).click();

  await expect(page.getByRole('heading', { name: 'Recepción PED-000002' })).toBeVisible();

  const formularios = page.locator('.conteo-form');
  await expect(formularios).toHaveCount(2);

  // El esperado es solo lectura y los conteos NUNCA se precargan.
  await expect(formularios.first().getByText('Esperado (solo lectura, confirmado por contabilidad):')).toBeVisible();
  await expect(formularios.first().getByLabel('Contado físicamente (total)')).toHaveValue('');
  await expect(formularios.first().getByLabel('Cantidad apta para ingreso')).toHaveValue('');
  await expect(formularios.first().getByLabel('Condición física')).toHaveValue('');

  // Línea 1 conforme completa.
  await formularios.nth(0).getByLabel('Contado físicamente (total)').fill('4');
  await formularios.nth(0).getByLabel('Cantidad apta para ingreso').fill('4');
  await formularios.nth(0).getByLabel('Condición física').selectOption('conforme');
  await formularios.nth(0).getByRole('button', { name: 'Guardar conteo de la línea' }).click();

  // Línea 2 parcial: C = A = 3 difiere de E = 4 → novedad, sin ingreso.
  await formularios.nth(1).getByLabel('Contado físicamente (total)').fill('3');
  await formularios.nth(1).getByLabel('Cantidad apta para ingreso').fill('3');
  await formularios.nth(1).getByLabel('Condición física').selectOption('conforme');
  await formularios.nth(1).getByRole('button', { name: 'Guardar conteo de la línea' }).click();

  await expect(page.getByText('2 de 2')).toBeVisible();
  await expect(page.getByText(/Se ingresarán/)).toContainText('4.00');
  await expect(page.getByText(/quedará en novedad/)).toBeVisible();

  const confirmar = page.getByRole('button', { name: 'Confirmar recepción' });
  await expect(confirmar).toBeEnabled();
  await confirmar.click();

  await expect(page.getByText('1 líneas ingresadas al stock.')).toBeVisible();
  await expect(page.getByText('1 líneas bloqueadas con novedad.')).toBeVisible();
  await expect(page.getByText('Parcial con novedad').first()).toBeVisible();
});
