import { computed, reactive, ref } from 'vue';

import {
  createOrder,
  getOrder,
  listBodegas,
  listCategorias,
  publishOrder,
  reprocessDocument,
  returnOrderForCorrection,
  cancelOrder,
  searchProducts,
  updateOrder,
  uploadOrderDocument,
  getOcrAttempt,
} from '../services/inventoryOrdersService';
import { generateClientOperationId } from '../../../shared/utils/clientOperation';
import { useOperationRecovery } from './useOperationRecovery';
import { usePolling } from './usePolling';
import { esEstadoFinalOcr } from '../utils/polling';
import { normalizarCantidad, parseQuantityInput } from '../utils/counting';

export const ROL_PANTALLAZO = 'pantallazo_siigo';
export const ROL_FACTURA = 'factura';

function lineaVacia(orden) {
  return {
    key: `linea-${Date.now()}-${orden}`,
    linea_id: null,
    orden,
    sku_raw: '',
    sku_confirmado: '',
    descripcion_raw: '',
    descripcion_confirmada: '',
    cantidad_esperada: '',
    unidad: '',
    producto_id: null,
    producto_label: '',
    candidato_id: null,
  };
}

/**
 * Estado y flujos del borrador contable (plan sección 12): datos del pedido,
 * líneas, documentos/OCR, guardado con versión y publicación con recuperación
 * del mismo client_operation_id ante respuestas inciertas.
 */
export function useOrderDraft() {
  const recovery = useOperationRecovery();

  const loading = ref(false);
  const saving = ref(false);
  const publishing = ref(false);
  const order = ref(null);
  const pedidoUuid = ref(null);
  const bodegas = ref([]);
  const categorias = ref([]);
  const documentos = ref([]);
  const error = ref(null);
  const successMessage = ref(null);
  const conflictosPublicacion = ref([]);
  const ocr = ref(null);
  const dirty = ref(false);

  const uploads = reactive({ [ROL_PANTALLAZO]: [], [ROL_FACTURA]: [] });

  const form = reactive({
    proveedorRaw: '',
    proveedorConfirmado: '',
    proveedorClave: '',
    referenciaFactura: '',
    bodegaId: '',
    lineas: [],
  });

  const version = computed(() => Number(order.value?.version ?? 0));
  const estado = computed(() => order.value?.estado ?? 'borrador');
  const esBorrador = computed(() => estado.value === 'borrador');
  const tienePantallazo = computed(() => documentosVigentes.value.some((doc) => doc.rol === ROL_PANTALLAZO));
  const tieneFactura = computed(() => documentosVigentes.value.some((doc) => doc.rol === ROL_FACTURA));
  const lineasValidas = computed(() => form.lineas.filter((linea) => {
    const cantidad = parseQuantityInput(linea.cantidad_esperada);
    return cantidad.ok
      && String(linea.sku_confirmado ?? '').trim() !== ''
      && String(linea.descripcion_confirmada ?? '').trim() !== '';
  }).length);
  const puedePublicar = computed(() => esBorrador.value
    && String(form.proveedorConfirmado).trim() !== ''
    && lineasValidas.value > 0
    && tienePantallazo.value
    && tieneFactura.value
    && bodegaIdValido.value);
  const bodegaIdValido = computed(() => form.bodegaId !== '' && form.bodegaId !== null);
  const documentosVigentes = computed(() => {
    const reemplazados = new Set(
      documentos.value
        .map((doc) => Number(doc.replaced_document_id))
        .filter((id) => Number.isInteger(id) && id > 0),
    );

    return documentos.value.filter((doc) => !reemplazados.has(Number(doc.id)));
  });

  const ocrPolling = usePolling(async () => {
    const attemptId = ocr.value?.intento?.id;
    if (!attemptId || !pedidoUuid.value) return false;

    const intento = await getOcrAttempt(pedidoUuid.value, attemptId);
    ocr.value = { ...ocr.value, intento };

    return !esEstadoFinalOcr(intento?.estado);
  }, { baseMs: 2000, maxMs: 15000 });

  function marcarDirty() {
    dirty.value = true;
    successMessage.value = null;
  }

  async function cargarCatalogos() {
    const [bodegasData, categoriasData] = await Promise.all([
      listBodegas().catch(() => []),
      listCategorias().catch(() => []),
    ]);

    bodegas.value = bodegasData;
    categorias.value = categoriasData;
  }

  function hidratarDesdePedido(pedido) {
    order.value = pedido;
    pedidoUuid.value = pedido.uuid;
    form.proveedorRaw = pedido.proveedor_nombre_raw ?? '';
    form.proveedorConfirmado = pedido.proveedor_nombre_confirmado ?? '';
    form.proveedorClave = pedido.proveedor_clave ?? '';
    form.referenciaFactura = pedido.referencia_factura ?? '';
    form.bodegaId = pedido.bodega_id ?? '';
    form.lineas = (pedido.lineas ?? []).map((linea) => ({
      key: `server-${linea.linea_id}`,
      linea_id: linea.linea_id,
      orden: linea.orden,
      sku_raw: linea.sku_raw ?? '',
      sku_confirmado: linea.sku_confirmado ?? '',
      descripcion_raw: linea.descripcion_raw ?? '',
      descripcion_confirmada: linea.descripcion_confirmada ?? '',
      cantidad_esperada: linea.cantidad_esperada ?? '',
      unidad: linea.unidad ?? '',
      producto_id: linea.producto_id ?? null,
      producto_label: linea.producto_id ? `Producto #${linea.producto_id}` : '',
      candidato_id: null,
    }));
    documentos.value = pedido.documentos ?? [];
    dirty.value = false;
  }

  async function cargarPedido(uuid) {
    loading.value = true;
    error.value = null;

    try {
      const pedido = await getOrder(uuid);
      hidratarDesdePedido(pedido);
      return pedido;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function payloadLineas({ soloDefinidos = false } = {}) {
    return form.lineas.map((linea) => {
      const cantidad = parseQuantityInput(linea.cantidad_esperada);
      const payload = {
        orden: Number(linea.orden),
        sku_raw: linea.sku_raw || null,
        sku_confirmado: linea.sku_confirmado || null,
        descripcion_raw: linea.descripcion_raw || null,
        descripcion_confirmada: linea.descripcion_confirmada || null,
        cantidad_esperada: cantidad.ok ? cantidad.value : linea.cantidad_esperada,
        unidad: linea.unidad || null,
      };

      if (linea.producto_id) payload.producto_id = Number(linea.producto_id);
      if (soloDefinidos && linea.linea_id) payload.linea_id = linea.linea_id;

      return payload;
    });
  }

  async function crearBorrador() {
    if (!bodegaIdValido.value || form.lineas.length === 0) {
      error.value = new Error('Selecciona la bodega destino y agrega al menos una línea.');
      return null;
    }

    saving.value = true;
    error.value = null;

    try {
      const response = await createOrder({
        client_operation_id: generateClientOperationId(),
        proveedor_nombre_raw: form.proveedorRaw || form.proveedorConfirmado || null,
        referencia_factura: form.referenciaFactura || null,
        bodega_id: Number(form.bodegaId),
        lineas: payloadLineas().map(({ sku_confirmado, descripcion_confirmada, unidad, producto_id, ...linea }) => linea),
      });

      hidratarDesdePedido(response?.data ?? response);
      successMessage.value = 'Borrador creado. Ya puedes cargar los documentos.';
      return pedidoUuid.value;
    } catch (err) {
      error.value = err;
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function guardarCambios() {
    if (!pedidoUuid.value || !esBorrador.value) return false;

    const invalidas = form.lineas.filter((linea) => !parseQuantityInput(linea.cantidad_esperada).ok);
    if (invalidas.length > 0) {
      error.value = new Error('Revisa las cantidades esperadas: deben ser decimales exactos de hasta 2 decimales.');
      return false;
    }

    saving.value = true;
    error.value = null;

    try {
      const response = await updateOrder(pedidoUuid.value, {
        client_operation_id: generateClientOperationId(),
        version: version.value,
        proveedor_nombre_raw: form.proveedorRaw || null,
        proveedor_nombre_confirmado: form.proveedorConfirmado || null,
        proveedor_clave: form.proveedorClave || null,
        referencia_factura: form.referenciaFactura || null,
        bodega_id: Number(form.bodegaId),
        lineas: payloadLineas(),
      });

      hidratarDesdePedido(response?.data ?? response);
      successMessage.value = 'Cambios guardados.';
      return true;
    } catch (err) {
      error.value = err;
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function subirDocumento({ rol, file }) {
    if (!pedidoUuid.value) {
      error.value = new Error('Primero crea el borrador del pedido.');
      return null;
    }

    const entrada = reactive({
      id: `${rol}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      progress: 0,
      state: 'uploading',
      error: null,
      documento: null,
    });

    uploads[rol].push(entrada);

    try {
      const body = await uploadOrderDocument(
        pedidoUuid.value,
        { rol, file },
        (progress) => { entrada.progress = progress; },
      );

      const documento = body?.data?.documento ?? body?.data ?? null;
      const intento = body?.data?.intento ?? null;
      entrada.documento = documento;
      entrada.state = 'done';
      entrada.progress = 100;

      if (documento) {
        documentos.value = [...documentos.value, documento];
      }

      if (intento) {
        ocr.value = { intento };
        ocrPolling.start();
      }

      return documento;
    } catch (err) {
      entrada.state = 'error';
      entrada.error = err;
      error.value = err;
      return null;
    }
  }

  async function reintentarOcr(documentoId) {
    if (!pedidoUuid.value) return null;

    try {
      const body = await reprocessDocument(pedidoUuid.value, documentoId);
      const intento = body?.data?.intento ?? null;

      if (intento) {
        ocr.value = { intento };
        ocrPolling.start();
      }

      return intento;
    } catch (err) {
      error.value = err;
      return null;
    }
  }

  async function consultarIntento(attemptId) {
    if (!pedidoUuid.value) return null;

    const intento = await getOcrAttempt(pedidoUuid.value, attemptId);
    ocr.value = { intento };
    return intento;
  }

  function agregarLinea() {
    form.lineas.push(lineaVacia(form.lineas.length + 1));
    marcarDirty();
  }

  function agregarLineaDesdeCandidato(candidato, { sku, descripcion, cantidad, unidad = '', productoId = null, productoLabel = '' } = {}) {
    const cantidadOk = parseQuantityInput(cantidad ?? candidato?.expected_quantity?.value);

    form.lineas.push({
      key: `cand-${candidato?.candidate_id ?? Date.now()}-${form.lineas.length + 1}`,
      linea_id: null,
      orden: form.lineas.length + 1,
      sku_raw: candidato?.sku?.raw ?? '',
      sku_confirmado: sku ?? candidato?.sku?.value ?? '',
      descripcion_raw: candidato?.description?.raw ?? '',
      descripcion_confirmada: descripcion ?? candidato?.description?.value ?? '',
      cantidad_esperada: cantidadOk.ok ? cantidadOk.value : '',
      unidad,
      producto_id: productoId,
      producto_label: productoLabel,
      candidato_id: candidato?.candidate_id ?? null,
    });
    marcarDirty();
  }

  function quitarLinea(index) {
    form.lineas.splice(index, 1);
    form.lineas.forEach((linea, i) => { linea.orden = i + 1; });
    marcarDirty();
  }

  async function publicar({ motivoCompraDistinta = null } = {}) {
    if (!pedidoUuid.value) return { status: 'error', error: new Error('No hay borrador.') };

    publishing.value = true;
    error.value = null;
    conflictosPublicacion.value = [];

    try {
      const outcome = await recovery.execute({
        command: 'publicar_pedido',
        orderUuid: pedidoUuid.value,
        signature: { version: version.value, motivo: motivoCompraDistinta ?? null },
        executor: (operationId) => publishOrder(pedidoUuid.value, {
          client_operation_id: operationId,
          version: version.value,
          ...(motivoCompraDistinta ? { motivo_compra_distinta: motivoCompraDistinta } : {}),
        }),
      });

      if (outcome.status === 'ok') {
        const body = outcome.response;
        const numero = body?.data?.numero ?? order.value?.numero ?? '';
        successMessage.value = `Pedido publicado ${numero ? `(${numero})` : ''}. Bodega fue notificada.`;
        await cargarPedido(pedidoUuid.value).catch(() => {});
      } else if (outcome.status === 'error') {
        const status = outcome.error?.response?.status;
        const candidatos = outcome.error?.response?.data?.candidatos;
        if (status === 409 && Array.isArray(candidatos)) {
          conflictosPublicacion.value = candidatos;
        }
        error.value = outcome.error;
      }

      return outcome;
    } finally {
      publishing.value = false;
    }
  }

  async function retirar(motivo) {
    if (!pedidoUuid.value) return null;
    const response = await returnOrderForCorrection(pedidoUuid.value, {
      client_operation_id: generateClientOperationId(),
      version: version.value,
      motivo,
    });
    await cargarPedido(pedidoUuid.value);
    return response;
  }

  async function cancelar(motivo) {
    if (!pedidoUuid.value) return null;
    const response = await cancelOrder(pedidoUuid.value, {
      client_operation_id: generateClientOperationId(),
      version: version.value,
      motivo,
    });
    await cargarPedido(pedidoUuid.value);
    return response;
  }

  async function buscarProducto(query) {
    return searchProducts(query).catch(() => []);
  }

  function aplicarProducto(linea, producto) {
    if (!linea || !producto) return;
    linea.producto_id = producto.producto_id ?? producto.id ?? null;
    linea.producto_label = producto.producto_nombre ?? '';
    linea.sku_confirmado = producto.producto_sku ?? linea.sku_confirmado;
    marcarDirty();
  }

  return {
    loading,
    saving,
    publishing,
    order,
    pedidoUuid,
    bodegas,
    categorias,
    form,
    version,
    estado,
    esBorrador,
    documentos,
    documentosVigentes,
    uploads,
    ocr,
    error,
    successMessage,
    conflictosPublicacion,
    dirty,
    puedePublicar,
    lineasValidas,
    tienePantallazo,
    tieneFactura,
    ocrPolling,
    marcarDirty,
    cargarCatalogos,
    cargarPedido,
    crearBorrador,
    guardarCambios,
    subirDocumento,
    reintentarOcr,
    consultarIntento,
    agregarLinea,
    agregarLineaDesdeCandidato,
    quitarLinea,
    publicar,
    retirar,
    cancelar,
    buscarProducto,
    aplicarProducto,
    recovery,
    normalizarCantidad,
    parseQuantityInput,
  };
}
