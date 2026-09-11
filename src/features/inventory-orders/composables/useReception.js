import { computed, reactive, ref } from 'vue';

import {
  confirmReceipt,
  countReceiptLine,
  createReceipt,
  getOrder,
  saveCatalogDraft,
} from '../services/inventoryOrdersService';
import { resumenConteo, validarConteoLinea } from '../utils/counting';
import { esLineaTerminal } from '../utils/orders';
import { useOperationRecovery } from './useOperationRecovery';

export function useReception() {
  const recovery = useOperationRecovery();

  const order = ref(null);
  const receipt = ref(null);
  const loading = ref(false);
  const opening = ref(false);
  const confirming = ref(false);
  const error = ref(null);
  const successMessage = ref(null);
  const resultadoConfirmacion = ref(null);
  const contandoLinea = ref(null);
  const guardandoFicha = ref(null);

  const borradores = reactive({});
  const fichas = reactive({});

  const lineas = computed(() => order.value?.lineas ?? []);
  const lineasVigentes = computed(() => lineas.value.filter((linea) => !esLineaTerminal(linea.estado)));

  const lineasRecepcion = computed(() => (receipt.value?.lineas ?? []).map((item) => ({
    ...item,
    esperado: item.cantidad_esperada,
    conteo_total: observacionDe(item.linea_id)?.conteo_total ?? null,
    conteo_aptos: observacionDe(item.linea_id)?.conteo_aptos ?? null,
    condicion: observacionDe(item.linea_id)?.estado_condicion ?? null,
    estado: item.estado_linea,
  })));

  // Las líneas ya terminales no se recontarán (R17): el resumen y las puertas
  // de la UI miran solo las pendientes. El servidor sigue siendo la autoridad.
  const lineasPendientes = computed(() => lineasRecepcion.value.filter((linea) => !esLineaTerminal(linea.estado_linea)));
  const resumen = computed(() => resumenConteo(lineasPendientes.value));
  const totalLineas = computed(() => lineasPendientes.value.length);
  const contadas = computed(() => lineasPendientes.value.filter((linea) => linea.conteo_total !== null).length);
  const puedeConfirmar = computed(() => totalLineas.value > 0 && contadas.value === totalLineas.value);

  function observacionDe(lineaId) {
    return receipt.value?.lineas?.find((item) => item.linea_id === lineaId)?.observacion ?? null;
  }

  function borradorDe(lineaId) {
    if (!borradores[lineaId]) {
      borradores[lineaId] = {
        conteoTotal: '',
        conteoAptos: '',
        condicion: '',
        motivo: '',
        errores: {},
      };
    }

    return borradores[lineaId];
  }

  function fichaDe(lineaId) {
    if (!fichas[lineaId]) {
      fichas[lineaId] = {
        categoriaPropuestaId: '',
        alertaMinimaPropuesta: '',
        precioCostoConfirmado: '',
        unidad: '',
        errores: {},
      };
    }

    return fichas[lineaId];
  }

  async function cargarPedido(uuid) {
    loading.value = true;
    error.value = null;

    try {
      order.value = await getOrder(uuid);
      return order.value;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function abrirRecepcion() {
    if (!order.value) return null;

    opening.value = true;
    error.value = null;

    try {
      const body = await createReceipt(order.value.uuid);
      receipt.value = body?.data ?? body;

      for (const item of receipt.value?.lineas ?? []) {
        const observacion = item.observacion;
        if (!observacion) continue;

        borradores[item.linea_id] = {
          conteoTotal: observacion.conteo_total ?? '',
          conteoAptos: observacion.conteo_aptos ?? '',
          condicion: observacion.estado_condicion ?? '',
          motivo: observacion.motivo ?? '',
          errores: {},
        };
      }

      return receipt.value;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      opening.value = false;
    }
  }

  async function contarLinea(lineaId) {
    const linea = receipt.value?.lineas?.find((item) => item.linea_id === lineaId);
    const borrador = borradorDe(lineaId);
    const validacion = validarConteoLinea({
      conteoTotal: borrador.conteoTotal,
      conteoAptos: borrador.conteoAptos,
      condicion: borrador.condicion,
      motivo: borrador.motivo,
    });

    borrador.errores = validacion.errores;

    if (!validacion.ok || !linea) return false;

    contandoLinea.value = lineaId;
    error.value = null;

    try {
      const observacion = await countReceiptLine(
        order.value.uuid,
        receipt.value.recepcion_id,
        lineaId,
        {
          observacion_version: observacionDe(lineaId)?.observacion_version ?? 1,
          conteo_total: validacion.total,
          conteo_aptos: validacion.aptos,
          estado_condicion: borrador.condicion,
          motivo: borrador.motivo || null,
        },
      );

      linea.observacion = observacion;
      successMessage.value = `Conteo guardado (${linea.sku_confirmado ?? `línea ${linea.orden}`}).`;
      return true;
    } catch (err) {
      error.value = err;
      return false;
    } finally {
      contandoLinea.value = null;
    }
  }

  async function guardarFicha(lineaId) {
    const linea = lineas.value.find((item) => item.linea_id === lineaId);
    const ficha = fichaDe(lineaId);

    if (!linea) return false;

    guardandoFicha.value = lineaId;
    error.value = null;

    try {
      const actualizada = await saveCatalogDraft(order.value.uuid, lineaId, {
        version: Number(linea.version),
        categoria_propuesta_id: ficha.categoriaPropuestaId ? Number(ficha.categoriaPropuestaId) : null,
        alerta_minima_propuesta: ficha.alertaMinimaPropuesta || null,
        precio_costo_confirmado: ficha.precioCostoConfirmado || null,
        unidad: ficha.unidad || linea.unidad || null,
      });

      Object.assign(linea, actualizada);
      successMessage.value = 'Ficha propuesta guardada. El producto se creará al confirmar la recepción.';
      return true;
    } catch (err) {
      error.value = err;
      return false;
    } finally {
      guardandoFicha.value = null;
    }
  }

  async function confirmar() {
    if (!order.value || !receipt.value) return { status: 'error' };

    confirming.value = true;
    error.value = null;

    try {
      const outcome = await recovery.execute({
        command: 'confirmar_recepcion',
        orderUuid: order.value.uuid,
        signature: { receipt: receipt.value.recepcion_id, version: receipt.value.version },
        executor: (operationId) => confirmReceipt(order.value.uuid, receipt.value.recepcion_id, {
          client_operation_id: operationId,
          version: Number(receipt.value.version),
        }),
      });

      if (outcome.status === 'ok') {
        resultadoConfirmacion.value = outcome.response?.data ?? outcome.response;
        successMessage.value = 'Recepción confirmada. Solo las líneas conformes ingresaron al stock.';
        await cargarPedido(order.value.uuid).catch(() => {});
      } else if (outcome.status === 'error') {
        error.value = outcome.error;
      }

      return outcome;
    } finally {
      confirming.value = false;
    }
  }

  async function consultarConfirmacion() {
    if (!order.value) return { status: 'sin_operacion' };

    const outcome = await recovery.consult({
      command: 'confirmar_recepcion',
      orderUuid: order.value.uuid,
    });

    if (outcome.status === 'recuperada') {
      resultadoConfirmacion.value = outcome.response?.data ?? outcome.response;
      successMessage.value = 'La recepción ya estaba registrada; se recuperó el resultado original.';
      await cargarPedido(order.value.uuid).catch(() => {});
    }

    return outcome;
  }

  return {
    order,
    receipt,
    loading,
    opening,
    confirming,
    error,
    successMessage,
    resultadoConfirmacion,
    contandoLinea,
    guardandoFicha,
    lineas,
    lineasVigentes,
    lineasRecepcion,
    lineasPendientes,
    resumen,
    totalLineas,
    contadas,
    puedeConfirmar,
    borradores,
    fichas,
    borradorDe,
    fichaDe,
    observacionDe,
    cargarPedido,
    abrirRecepcion,
    contarLinea,
    guardarFicha,
    confirmar,
    consultarConfirmacion,
    recovery,
  };
}
