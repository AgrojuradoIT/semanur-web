import { test, expect, installSession, mockApi, BODEGA_USER } from './inventory-orders-fixtures.js';

const ORDER_UUID = '33333333-3333-4333-8333-333333333333';

function pedidoConNovedad() {
  return {
    pedido_id: 3,
    uuid: ORDER_UUID,
    numero: 'PED-000003',
    proveedor_nombre_confirmado: 'Proveedor Confirmado',
    bodega_id: 1,
    bodega: { bodega_id: 1, nombre: 'Bodega Central', tipo: 'estandar' },
    estado: 'parcial_con_novedad',
    version: 5,
    lineas: [
      {
        linea_id: 1,
        orden: 1,
        sku_confirmado: 'SKU-A',
        descripcion_confirmada: 'PRODUCTO A',
        cantidad_esperada: '4.00',
        unidad: 'unidad',
        producto_id: 7,
        estado: 'recibida',
        version: 2,
      },
      {
        linea_id: 2,
        orden: 2,
        sku_confirmado: 'SKU-B',
        descripcion_confirmada: 'PRODUCTO B',
        cantidad_esperada: '4.00',
        unidad: 'unidad',
        producto_id: 8,
        estado: 'novedad',
        version: 2,
      },
    ],
    documentos: [],
    novedades: [
      {
        novedad_id: 2,
        pedido_linea_id: 2,
        tipo: 'faltante',
        estado: 'abierta',
        motivo: 'Faltó una unidad verificada en doble conteo',
        esperado_snapshot: '4.00',
        contado_snapshot: '3.00',
        aptos_snapshot: '3.00',
        documento_id: null,
        abierta_at: '2026-09-10T11:30:00Z',
        cerrada_at: null,
      },
    ],
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

test('firma de desfase: consecuencias numéricas y botón separado del guardado rutinario', async ({ page }) => {
  await installSession(page, BODEGA_USER);

  let pedido = pedidoConNovedad();

  await mockApi(page, async ({ method, path, json }) => {
    if (method === 'GET' && path === '/user') {
      await json(BODEGA_USER);
      return true;
    }
    if (method === 'GET' && path === '/web/inventory-order-alerts') {
      await json({ success: true, data: [], meta: { current_page: 1, last_page: 1, per_page: 1, total: 0, unread_count: 0 } });
      return true;
    }
    if (method === 'GET' && path === `/web/inventory-orders/${ORDER_UUID}`) {
      await json({ success: true, data: pedido });
      return true;
    }
    if (method === 'POST' && path === `/web/inventory-orders/${ORDER_UUID}/discrepancies/2/authorize`) {
      pedido = { ...pedido, novedades: [{ ...pedido.novedades[0], estado: 'cerrada', cerrada_at: '2026-09-10T12:00:00Z' }] };
      await json({
        success: true,
        data: {
          autorizacion: {
            autorizacion_id: 9,
            novedad_id: 2,
            cantidad_autorizada: '3.00',
            diferencia_cantidad: '-1.00',
          },
          confirmacion: null,
        },
        idempotent_replay: false,
      });
      return true;
    }
    return false;
  });

  await page.goto(`/#/inventory-orders/${ORDER_UUID}/novedades`);

  await expect(page.getByRole('heading', { name: 'Novedades PED-000003' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Faltante/ })).toBeVisible();
  await expect(page.locator('.novedad-panel__numeros').getByText('-1.00')).toBeVisible();

  const panelFirma = page.locator('.novedad-panel__firma');
  await expect(panelFirma.getByRole('button', { name: 'Firmar autorización de desfase…' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar respuesta' })).toBeVisible();
  await panelFirma.getByRole('button', { name: 'Firmar autorización de desfase…' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Firma de desfase de recepción')).toBeVisible();
  await expect(dialog.getByText('Consecuencias numéricas de la firma')).toBeVisible();

  const celda = (etiqueta) => dialog.locator('tr').filter({ hasText: etiqueta }).locator('td');

  await expect(celda('Esperado (E)')).toHaveText('4.00');
  await expect(celda('Contado físicamente (C)')).toHaveText('3.00');
  await expect(celda('Apto validado (A)')).toHaveText('3.00');
  await expect(celda('Cantidad a ingresar (Q = A)')).toHaveText('3.00');
  await expect(celda('Diferencia firmada')).toHaveText('-1.00');

  const firmar = dialog.getByRole('button', { name: 'Firmar autorización de desfase' });
  await expect(firmar).toBeDisabled();

  await dialog.getByLabel('Motivo específico del desfase (mínimo 10 caracteres)')
    .fill('Faltante verificado físicamente en doble conteo');

  await expect(firmar).toBeDisabled();

  await dialog.getByRole('checkbox').first().check();
  await expect(firmar).toBeEnabled();
  await firmar.click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('Desfase autorizado. La recepción consumirá la firma si el contexto no cambió.')).toBeVisible();
});
