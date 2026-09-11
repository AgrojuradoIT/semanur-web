<template>
  <div class="novedades-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Novedades {{ order?.numero ?? '' }}</h1>
        <p class="page-subtitle">
          Esperado, contado, apto y diferencia. Responder o firmar no ingresa stock: la confirmación
          de recepción sigue siendo la única puerta.
        </p>
      </div>
      <LineaEstadoBadge v-if="order" :estado="order.estado" tipo="pedido" />
    </header>

    <p v-if="error" class="page-alert page-alert--error" role="alert">
      {{ error.displayMessage || error.message || 'No fue posible cargar las novedades.' }}
    </p>
    <p v-if="successMessage" class="page-alert page-alert--ok" role="status" aria-live="polite">
      {{ successMessage }}
    </p>

    <p v-if="loading" class="page-status" role="status">Cargando novedades…</p>

    <template v-if="order && !loading">
      <nav class="page-links" aria-label="Accesos del pedido">
        <RouterLink class="page-links__item" :to="{ name: 'inventory-orders-historial', params: { uuid: order.uuid } }">
          <span class="material-icons-round" aria-hidden="true">history</span> Ver historial
        </RouterLink>
        <RouterLink
          v-if="order.acciones?.recibir && !esTerminal(order.estado)"
          class="page-links__item"
          :to="{ name: 'inventory-orders-recepcion', params: { uuid: order.uuid } }"
        >
          <span class="material-icons-round" aria-hidden="true">inventory</span> Ir a recepción
        </RouterLink>
        <RouterLink
          v-if="order.estado === 'borrador' && order.acciones?.editar"
          class="page-links__item"
          :to="{ name: 'inventory-orders-review', params: { uuid: order.uuid } }"
        >
          <span class="material-icons-round" aria-hidden="true">edit</span> Revisar borrador
        </RouterLink>
      </nav>

      <section v-if="novedadesAbiertas.length > 0" class="novedades-page__abiertas" aria-label="Novedades abiertas">
        <h2 class="section-title">Abiertas ({{ novedadesAbiertas.length }})</h2>
        <NovedadPanel
          v-for="novedad in novedadesAbiertas"
          :key="novedad.novedad_id"
          :novedad="novedad"
          :linea="lineaDe(novedad.pedido_linea_id)"
          :order-uuid="order.uuid"
          :documentos="documentosNovedad(novedad)"
          :can-respond="order.acciones?.responder_novedad === true"
          :can-authorize="order.acciones?.autorizar_desfase === true"
          :saving-response="respondiendoId === novedad.novedad_id"
          @respond="responder(novedad, $event)"
          @firmar="abrirFirma(novedad)"
        />
      </section>

      <section v-else class="novedades-page__vacio">
        <p>No hay novedades abiertas en este pedido.</p>
      </section>

      <section v-if="novedadesCerradas.length > 0" class="novedades-page__cerradas" aria-label="Novedades cerradas">
        <h2 class="section-title">Historial de novedades cerradas ({{ novedadesCerradas.length }})</h2>
        <ul class="novedades-cerradas">
          <li v-for="novedad in novedadesCerradas" :key="novedad.novedad_id">
            <strong>{{ tipoNovedadLabel(novedad.tipo) }}</strong>
            · línea {{ lineaDe(novedad.pedido_linea_id)?.orden ?? novedad.pedido_linea_id }}
            · E {{ novedad.esperado_snapshot }} / C {{ novedad.contado_snapshot }} / A {{ novedad.aptos_snapshot }}
            <span v-if="novedad.cerrada_at"> · cerrada {{ formatDateTimeCO(novedad.cerrada_at) }}</span>
          </li>
        </ul>
      </section>
    </template>

    <FirmaDesfaseModal
      :visible="firmaVisible"
      :novedad="firmaNovedad"
      :linea="firmaNovedad ? lineaDe(firmaNovedad.pedido_linea_id) : null"
      :saving="firmando"
      :error="errorFirma"
      @close="firmaVisible = false"
      @confirm="confirmarFirma"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import FirmaDesfaseModal from '../components/FirmaDesfaseModal.vue';
import LineaEstadoBadge from '../components/LineaEstadoBadge.vue';
import NovedadPanel from '../components/NovedadPanel.vue';
import { getOrder, respondToDiscrepancy, authorizeDiscrepancy } from '../services/inventoryOrdersService';
import { generateClientOperationId } from '../../../shared/utils/clientOperation';
import { formatDateTimeCO } from '../../../shared/utils/formatters';
import { esPedidoTerminal, tipoNovedadLabel } from '../utils/orders';

const route = useRoute();

const order = ref(null);
const loading = ref(false);
const error = ref(null);
const successMessage = ref(null);
const respondiendoId = ref(null);
const firmaVisible = ref(false);
const firmaNovedad = ref(null);
const firmando = ref(false);
const errorFirma = ref(null);

const novedades = computed(() => order.value?.novedades ?? []);
const novedadesAbiertas = computed(() => novedades.value.filter((novedad) => novedad.estado === 'abierta'));
const novedadesCerradas = computed(() => novedades.value.filter((novedad) => novedad.estado !== 'abierta'));

function esTerminal(estado) {
  return esPedidoTerminal(estado);
}

function lineaDe(lineaId) {
  return order.value?.lineas?.find((linea) => linea.linea_id === lineaId) ?? null;
}

function documentosNovedad(novedad) {
  const documentos = order.value?.documentos ?? [];

  if (!novedad?.documento_id) return documentos;

  const propio = documentos.find((documento) => documento.id === novedad.documento_id);

  return propio ? [propio] : documentos;
}

async function cargar() {
  loading.value = true;
  error.value = null;

  try {
    order.value = await getOrder(route.params.uuid);
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
}

async function responder(novedad, payload) {
  respondiendoId.value = novedad.novedad_id;
  error.value = null;

  try {
    await respondToDiscrepancy(order.value.uuid, novedad.novedad_id, {
      ...payload,
      client_operation_id: generateClientOperationId(),
    });
    successMessage.value = 'Respuesta registrada. Bodega fue avisada si requiere nuevo conteo.';
    await cargar();
  } catch (err) {
    error.value = err;
  } finally {
    respondiendoId.value = null;
  }
}

function abrirFirma(novedad) {
  firmaNovedad.value = novedad;
  errorFirma.value = null;
  firmaVisible.value = true;
}

async function confirmarFirma(payload) {
  if (!firmaNovedad.value) return;

  firmando.value = true;
  errorFirma.value = null;

  try {
    await authorizeDiscrepancy(order.value.uuid, firmaNovedad.value.novedad_id, {
      ...payload,
      client_operation_id: generateClientOperationId(),
    });
    firmaVisible.value = false;
    successMessage.value = 'Desfase autorizado. La recepción consumirá la firma si el contexto no cambió.';
    await cargar();
  } catch (err) {
    errorFirma.value = err;
  } finally {
    firmando.value = false;
  }
}

onMounted(cargar);
</script>

<style scoped>
.novedades-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 1.35rem;
}

.page-subtitle {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: var(--text-gray, #9e9e9e);
  max-width: 70ch;
}

.page-status {
  margin: 0;
  color: var(--text-gray, #9e9e9e);
  font-size: 0.85rem;
}

.page-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.page-links__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  color: var(--text-main, #f5f5f5);
  text-decoration: none;
  font-size: 0.82rem;
}

.section-title {
  margin: 0 0 10px;
  font-size: 1rem;
}

.novedades-page__abiertas {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.novedades-page__vacio {
  padding: 16px;
  border-radius: 10px;
  border: 1px dashed var(--border, #3a3a3a);
  color: var(--text-gray, #9e9e9e);
  font-size: 0.85rem;
}

.novedades-cerradas {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--text-gray, #bdbdbd);
}

.page-alert {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
}

.page-alert--error {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.4);
  color: #ff9a94;
}

.page-alert--ok {
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.4);
  color: #9ae6a0;
}
</style>
