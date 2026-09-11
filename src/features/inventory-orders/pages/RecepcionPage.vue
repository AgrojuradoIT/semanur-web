<template>
  <div class="recepcion-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Recepción {{ order?.numero ?? '' }}</h1>
        <p class="page-subtitle">
          Cuenta físicamente todas las líneas. Guardar conteos no mueve stock; la confirmación
          ingresa solo lo contado conforme y apto.
        </p>
      </div>
      <LineaEstadoBadge v-if="order" :estado="order.estado" tipo="pedido" />
    </header>

    <p v-if="error" class="page-alert page-alert--error" role="alert">
      {{ error.displayMessage || error.message || 'Ocurrió un error en la recepción.' }}
    </p>
    <p v-if="successMessage" class="page-alert page-alert--ok" role="status" aria-live="polite">
      {{ successMessage }}
    </p>

    <p v-if="loading || opening" class="page-status" role="status">Abriendo la sesión de recepción…</p>

    <template v-if="order && receipt">
      <EvidenciaViewer
        v-if="order.documentos?.length"
        :order-uuid="order.uuid"
        :documentos="order.documentos"
        tabs-label="Evidencia del pedido en recepción"
      />

      <ResumenConteo :total="totalLineas" :contadas="contadas" :resumen="resumen" />

      <section class="recepcion-page__lineas" aria-label="Líneas por contar">
        <ConteoForm
          v-for="linea in lineasPendientes"
          :key="linea.linea_id"
          :linea="linea"
          :borrador="borradorDe(linea.linea_id)"
          :observacion="observacionDe(linea.linea_id)"
          :saving="contandoLinea === linea.linea_id"
          @save="contarLinea"
        />

        <p v-if="lineasPendientes.length === 0" class="page-status">
          Todas las líneas ya están cerradas. No hay conteos pendientes para esta sesión.
        </p>
      </section>

      <section
        v-for="linea in lineasPendientes.filter((item) => item.requiere_ficha)"
        :key="`ficha-${linea.linea_id}`"
        class="ficha-nuevo"
        :aria-labelledby="`ficha-titulo-${linea.linea_id}`"
      >
        <h2 :id="`ficha-titulo-${linea.linea_id}`" class="ficha-nuevo__title">
          Ficha del producto nuevo · {{ linea.sku_confirmado }}
        </h2>
        <p class="ficha-nuevo__hint">
          Se guarda en la línea; el producto se crea con stock 0 solo al confirmar una recepción que
          ingrese unidades. Nunca se inventan categorías.
        </p>
        <div class="ficha-nuevo__grid">
          <div class="form-field">
            <label :for="`ficha-categoria-${linea.linea_id}`">Categoría existente</label>
            <select :id="`ficha-categoria-${linea.linea_id}`" v-model="fichaDe(linea.linea_id).categoriaPropuestaId">
              <option value="">Seleccionar categoría…</option>
              <option v-for="categoria in categorias" :key="categoria.categoria_id" :value="categoria.categoria_id">
                {{ categoria.categoria_nombre }}
              </option>
            </select>
          </div>
          <div class="form-field">
            <label :for="`ficha-unidad-${linea.linea_id}`">Unidad</label>
            <input :id="`ficha-unidad-${linea.linea_id}`" v-model="fichaDe(linea.linea_id).unidad" type="text" maxlength="40">
          </div>
          <div class="form-field">
            <label :for="`ficha-alerta-${linea.linea_id}`">Alerta mínima (0 no alerta)</label>
            <input :id="`ficha-alerta-${linea.linea_id}`" v-model="fichaDe(linea.linea_id).alertaMinimaPropuesta" type="text" inputmode="decimal">
          </div>
          <div class="form-field">
            <label :for="`ficha-precio-${linea.linea_id}`">Precio de costo confirmado</label>
            <input :id="`ficha-precio-${linea.linea_id}`" v-model="fichaDe(linea.linea_id).precioCostoConfirmado" type="text" inputmode="decimal">
          </div>
        </div>
        <button type="button" class="ghost-btn" :disabled="guardandoFicha === linea.linea_id" @click="guardarFicha(linea.linea_id)">
          {{ guardandoFicha === linea.linea_id ? 'Guardando ficha…' : 'Guardar ficha propuesta' }}
        </button>
      </section>

      <section class="confirmacion" aria-labelledby="confirmacion-titulo">
        <h2 id="confirmacion-titulo" class="confirmacion__title">Confirmar recepción</h2>
        <p class="confirmacion__hint" role="note">
          La primera confirmación exige contar todas las líneas. Las líneas con novedad no ingresan.
        </p>

        <button
          type="button"
          class="primary-btn"
          :disabled="!puedeConfirmar || confirming"
          @click="confirmar"
        >
          <span class="material-icons-round" aria-hidden="true">inventory</span>
          {{ confirming ? 'Confirmando…' : 'Confirmar recepción' }}
        </button>

        <div v-if="recovery.uncertain.value" class="recuperacion" role="alert">
          <p>
            No sabemos si la confirmación se registró (respuesta perdida). Conserva el mismo
            identificador y consulta antes de repetir: nunca se ingresa dos veces.
          </p>
          <div class="recuperacion__acciones">
            <button type="button" class="ghost-btn" :disabled="recovery.submitting.value" @click="consultarConfirmacion">
              Consultar si se registró
            </button>
            <button type="button" class="ghost-btn" :disabled="recovery.submitting.value" @click="confirmar">
              Reintentar con el mismo identificador
            </button>
          </div>
        </div>

        <div v-if="resultadoConfirmacion" class="resultado" aria-live="polite">
          <h3 class="resultado__title">Resultado de la confirmación</h3>
          <ul class="resultado__list">
            <li>
              <span class="material-icons-round" aria-hidden="true">check_circle</span>
              {{ resultadoConfirmacion.posted_lines?.length ?? 0 }} líneas ingresadas al stock.
            </li>
            <li>
              <span class="material-icons-round" aria-hidden="true">report</span>
              {{ resultadoConfirmacion.blocked_lines?.length ?? 0 }} líneas bloqueadas con novedad.
            </li>
            <li v-if="resultadoConfirmacion.closed_without_stock?.length">
              <span class="material-icons-round" aria-hidden="true">block</span>
              {{ resultadoConfirmacion.closed_without_stock.length }} cierres sin ingreso.
            </li>
            <li v-if="resultadoConfirmacion.authorizations_invalidated?.length">
              <span class="material-icons-round" aria-hidden="true">gavel</span>
              {{ resultadoConfirmacion.authorizations_invalidated.length }} firmas invalidadas por
              contexto cambiado; requiere nueva firma.
            </li>
          </ul>
          <p class="resultado__estado">
            Estado resultante: <strong>{{ estadoPedidoLabel(resultadoConfirmacion.resulting_state) }}</strong>
          </p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import ConteoForm from '../components/ConteoForm.vue';
import EvidenciaViewer from '../components/EvidenciaViewer.vue';
import LineaEstadoBadge from '../components/LineaEstadoBadge.vue';
import ResumenConteo from '../components/ResumenConteo.vue';
import { listCategorias } from '../services/inventoryOrdersService';
import { useReception } from '../composables/useReception';
import { estadoPedidoLabel } from '../utils/orders';

const route = useRoute();
const reception = useReception();

const {
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
  lineasPendientes,
  resumen,
  totalLineas,
  contadas,
  puedeConfirmar,
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
} = reception;

const categorias = ref([]);

async function iniciar() {
  const uuid = route.params.uuid;

  await cargarPedido(uuid).catch(() => {});

  if (!order.value?.acciones?.recibir) {
    error.value = new Error('No tienes la capacidad pedidos.receive para esta bodega.');
    return;
  }

  await abrirRecepcion().catch(() => {});
}

onMounted(() => {
  listCategorias().then((data) => { categorias.value = data; }).catch(() => {});
  iniciar();
});
</script>

<style scoped>
.recepcion-page {
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
  font-size: 0.85rem;
  color: var(--text-gray, #9e9e9e);
}

.recepcion-page__lineas {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.ficha-nuevo {
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  background: var(--surface, #1e1e1e);
  padding: 14px;
}

.ficha-nuevo__title {
  margin: 0 0 4px;
  font-size: 0.95rem;
}

.ficha-nuevo__hint {
  margin: 0 0 10px;
  font-size: 0.78rem;
  color: var(--text-gray, #9e9e9e);
}

.ficha-nuevo__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field label {
  font-size: 0.78rem;
  color: var(--text-gray, #9e9e9e);
}

.form-field input,
.form-field select {
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: var(--surface-2, #2c2c2c);
  color: var(--text-main, #f5f5f5);
  font-size: 0.85rem;
}

.confirmacion {
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  background: var(--surface, #1e1e1e);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.confirmacion__title {
  margin: 0;
  font-size: 1rem;
}

.confirmacion__hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-gray, #9e9e9e);
}

.recuperacion {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 179, 0, 0.4);
  background: rgba(255, 179, 0, 0.08);
  font-size: 0.82rem;
}

.recuperacion p {
  margin: 0 0 8px;
}

.recuperacion__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.resultado {
  border-top: 1px solid var(--border, #3a3a3a);
  padding-top: 10px;
}

.resultado__title {
  margin: 0 0 8px;
  font-size: 0.9rem;
}

.resultado__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}

.resultado__list li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.resultado__estado {
  margin: 8px 0 0;
  font-size: 0.85rem;
}

.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  padding: 8px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.86rem;
  cursor: pointer;
  align-self: flex-start;
}

.primary-btn {
  background: var(--primary, #2b8cee);
  border: 1px solid var(--primary, #2b8cee);
  color: #fff;
}

.ghost-btn {
  background: transparent;
  border: 1px solid var(--border, #3a3a3a);
  color: var(--text-main, #f5f5f5);
}

.primary-btn:disabled,
.ghost-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
