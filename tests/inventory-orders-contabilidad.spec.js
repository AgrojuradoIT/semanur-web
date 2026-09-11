import { test, expect, installSession, mockApi, CONTABILIDAD_USER } from './inventory-orders-fixtures.js';

const ORDER_UUID = '11111111-1111-4111-8111-111111111111';

function borradorBase(overrides = {}) {
  return {
    pedido_id: 1,
    uuid: ORDER_UUID,
    numero: null,
    proveedor_nombre_raw: null,
    proveedor_nombre_confirmado: 'Proveedor Confirmado',
    proveedor_clave: null,
    referencia_factura: 'FV-001',
    bodega_id: 1,
    bodega: { bodega_id: 1, nombre: 'Bodega Central', tipo: 'estandar' },
    estado: 'borrador',
    version: 1,
    lineas: [
      {
        linea_id: 1,
        orden: 1,
        sku_raw: 'TO000057',
        sku_confirmado: null,
        descripcion_raw: 'TORNILLO',
        descripcion_confirmada: null,
        cantidad_esperada: '4.00',
        unidad: null,
        producto_id: null,
        version: 1,
      },
    ],
    documentos: [],
    acciones: {
      editar: true,
      publicar: true,
      retirar: false,
      cancelar: true,
      recibir: false,
      completar_ficha: false,
      responder_novedad: false,
      autorizar_desfase: false,
    },
    ...overrides,
  };
}

function documento(id, rol, revision = 1) {
  return {
    id,
    rol,
    revision,
    mime: 'image/jpeg',
    size: 2048,
    width: 800,
    height: 600,
    sha256: `sha-${id}`,
    created_by: CONTABILIDAD_USER.id,
    replaced_document_id: null,
    pedido_linea_id: null,
    created_at: '2026-09-10T10:00:00Z',
    content_url: `/api/web/inventory-orders/${ORDER_UUID}/documents/${id}/content`,
  };
}

function candidatoOcr() {
  return {
    id: 50,
    document_id: 10,
    document_revision: 1,
    proveedor: 'fake',
    proveedor_version: 'fake-1.0.0',
    mapper_version: 'siigo-mapper-1.0.0',
    schema_version: 1,
    estado: 'requiere_revision',
    intentos: 1,
    max_intentos: 3,
    error_code: null,
    error_mensaje: null,
    requires_human_revision: true,
    supplier: { raw: 'OSCAR DIAZ', value: 'OSCAR DIAZ', confidence: 0.9 },
    lines: [
      {
        candidate_id: 'cand-1',
        source_page: 1,
        source_row: 5,
        sku: { raw: 'TO000057', value: 'TO000057', confidence: 0.93 },
        description: { raw: 'TORNILLO\nCORTAMALEZA', value: 'TORNILLO CORTAMALEZA', confidence: 0.9 },
        expected_quantity: { raw: '4.00', value: '4.00', confidence: 0.94 },
        bounding_boxes: {},
        warnings: [
          { code: 'sku_posible_confusion_o_cero', message: 'Posible confusión entre O y 0; confirma contra el original.', blocking: false },
        ],
      },
    ],
    ignored_rows: [{ source_page: 1, source_row: 6, reason: 'fila_captura_vacia', raw_text: '1.00' }],
    warnings: [],
    started_at: '2026-09-10T10:00:01Z',
    finished_at: '2026-09-10T10:00:03Z',
    created_at: '2026-09-10T10:00:00Z',
  };
}

test('flujo contabilidad: borrador, uploads, corrección OCR y publicación', async ({ page }) => {
  await installSession(page, CONTABILIDAD_USER);

  let orden = borradorBase();

  await mockApi(page, async ({ method, path, route, json }) => {
    if (method === 'GET' && path === '/user') {
      await json(CONTABILIDAD_USER);
      return true;
    }
    if (method === 'GET' && path === '/bodegas') {
      await json({ data: [{ bodega_id: 1, nombre: 'Bodega Central', tipo: 'estandar' }] });
      return true;
    }
    if (method === 'GET' && path === '/categorias') {
      await json({ data: [] });
      return true;
    }
    if (method === 'GET' && path === '/productos/buscar') {
      await json({ data: [] });
      return true;
    }
    if (method === 'GET' && path === '/web/inventory-order-alerts') {
      await json({ success: true, data: [], meta: { current_page: 1, last_page: 1, per_page: 1, total: 0, unread_count: 0 } });
      return true;
    }
    if (method === 'POST' && path === '/web/inventory-orders') {
      orden = borradorBase();
      await json({ success: true, data: orden, idempotent_replay: false }, 201);
      return true;
    }
    if (method === 'PATCH' && path === `/web/inventory-orders/${ORDER_UUID}`) {
      const payload = JSON.parse(route.request().postData() || '{}');
      orden = borradorBase({
        version: 2,
        proveedor_nombre_raw: payload.proveedor_nombre_raw,
        proveedor_nombre_confirmado: payload.proveedor_nombre_confirmado,
        proveedor_clave: payload.proveedor_clave,
        referencia_factura: payload.referencia_factura,
        lineas: (payload.lineas ?? []).map((linea, index) => ({
          linea_id: index + 1,
          orden: linea.orden,
          sku_raw: linea.sku_raw,
          sku_confirmado: linea.sku_confirmado,
          descripcion_raw: linea.descripcion_raw,
          descripcion_confirmada: linea.descripcion_confirmada,
          cantidad_esperada: linea.cantidad_esperada,
          unidad: linea.unidad,
          producto_id: linea.producto_id ?? null,
          version: 1,
        })),
        documentos: orden.documentos,
      });
      await json({ success: true, data: orden, idempotent_replay: false });
      return true;
    }
    if (method === 'POST' && path === `/web/inventory-orders/${ORDER_UUID}/documents`) {
      const raw = route.request().postDataBuffer();
      const body = raw ? raw.toString('latin1') : (route.request().postData() || '');
      const esFactura = /name="rol"[\s\S]*?\r?\n\r?\n\s*factura/.test(body);
      const doc = esFactura ? documento(11, 'factura') : documento(10, 'pantallazo_siigo');

      orden = { ...orden, documentos: [...orden.documentos, doc] };

      if (esFactura) {
        await json({ success: true, data: doc }, 201);
      } else {
        await json({
          success: true,
          data: { documento: doc, intento: { ...candidatoOcr(), estado: 'procesando', lines: [] } },
        }, 202);
      }
      return true;
    }
    if (method === 'GET' && path === `/web/inventory-orders/${ORDER_UUID}/ocr-attempts/50`) {
      await json({ success: true, data: candidatoOcr() });
      return true;
    }
    if (method === 'GET' && path.match(new RegExp(`^/web/inventory-orders/${ORDER_UUID}/documents/\\d+/content$`))) {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      );
      await route.fulfill({ status: 200, contentType: 'image/png', body: png });
      return true;
    }
    if (method === 'POST' && path === `/web/inventory-orders/${ORDER_UUID}/publish`) {
      orden = borradorBase({ estado: 'pendiente_recepcion', numero: 'PED-000001', version: 3 });
      await json({ success: true, data: { numero: 'PED-000001', estado: 'pendiente_recepcion' }, idempotent_replay: false });
      return true;
    }
    if (method === 'GET' && path === `/web/inventory-orders/${ORDER_UUID}`) {
      await json({ success: true, data: orden });
      return true;
    }
    return false;
  });

  await page.goto('/#/inventory-orders/nuevo');

  await expect(page.getByRole('heading', { name: 'Nuevo pedido' })).toBeVisible();

  await page.getByLabel('Bodega destino (selección explícita)').selectOption('1');
  await page.getByLabel('Proveedor confirmado').fill('Proveedor Confirmado');
  await page.getByLabel('Referencia de factura (opcional)').fill('FV-001');

  await page.getByRole('button', { name: 'Agregar línea manual' }).click();
  await page.getByLabel('SKU', { exact: true }).fill('TO000057');
  await page.getByLabel('Descripción', { exact: true }).fill('TORNILLO');
  await page.getByLabel('Cantidad esperada', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Crear borrador' }).click();

  await expect(page.getByText('Borrador creado. Ya puedes cargar los documentos.')).toBeVisible();

  // La confirmación humana de la línea es explícita tras crear el borrador.
  await page.getByLabel('SKU confirmado', { exact: true }).fill('TO000057');
  await page.getByLabel('Descripción confirmada', { exact: true }).fill('TORNILLO');

  const uploaderSiigo = page.locator('.document-uploader').filter({ hasText: 'Pantallazos de Siigo' });
  await uploaderSiigo.locator('input[type=file]').setInputFiles({
    name: 'siigo.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake-png'),
  });

  await expect(uploaderSiigo.getByText('Subido · OCR en cola')).toBeVisible();
  await expect(page.getByText('Candidato 1 · fila 5')).toBeVisible();
  await expect(page.getByText('Posible confusión entre O y 0; confirma contra el original.')).toBeVisible();

  const candidato = page.locator('.ocr-candidate').first();
  await candidato.getByLabel('SKU confirmado (texto, sin autocorrección)').fill('TO000058');
  await candidato.getByRole('button', { name: 'Añadir a las líneas del pedido' }).click();
  await expect(page.getByLabel('SKU confirmado', { exact: true }).nth(1)).toHaveValue('TO000058');

  const uploaderFactura = page.locator('.document-uploader').filter({ hasText: 'Facturas del proveedor' });
  await uploaderFactura.locator('input[type=file]').setInputFiles({
    name: 'factura.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake-png'),
  });
  await expect(uploaderFactura.getByText('Subido')).toBeVisible();

  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cambios guardados.')).toBeVisible();

  const publicar = page.getByRole('button', { name: 'Publicar pedido' });
  await expect(publicar).toBeEnabled();
  await publicar.click();

  await expect(page.getByText(/Pedido publicado/)).toBeVisible();
});
