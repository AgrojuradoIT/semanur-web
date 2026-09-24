<template>
  <section class="evidencia-viewer" aria-label="Evidencia del pedido">
    <div class="evidencia-viewer__toolbar">
      <div class="evidencia-viewer__tabs" role="tablist" :aria-label="tabsLabel">
        <button
          v-for="documento in visibles"
          :key="documento.id"
          type="button"
          role="tab"
          class="evidencia-viewer__tab"
          :class="{ 'is-active': documento.id === activoId }"
          :aria-selected="documento.id === activoId"
          :disabled="loadingId === documento.id"
          @click="seleccionar(documento)"
        >
          <span class="material-icons-round" aria-hidden="true">image</span>
          {{ etiquetaRol(documento.rol) }} · r{{ documento.revision }}
        </button>
      </div>

      <div class="evidencia-viewer__zoom" role="group" aria-label="Controles de zoom">
        <button type="button" class="evidencia-viewer__btn" aria-label="Alejar" :disabled="zoom <= 1" @click="ajustar(-0.25)">
          <span class="material-icons-round" aria-hidden="true">zoom_out</span>
        </button>
        <span class="evidencia-viewer__zoom-value" aria-live="polite">{{ Math.round(zoom * 100) }}%</span>
        <button type="button" class="evidencia-viewer__btn" aria-label="Acercar" :disabled="zoom >= 3" @click="ajustar(0.25)">
          <span class="material-icons-round" aria-hidden="true">zoom_in</span>
        </button>
        <button type="button" class="evidencia-viewer__btn" aria-label="Restablecer zoom" :disabled="zoom === 1" @click="zoom = 1">
          <span class="material-icons-round" aria-hidden="true">restart_alt</span>
        </button>
        <button type="button" class="evidencia-viewer__btn" :aria-pressed="ampliado" aria-label="Ver a pantalla completa" @click="ampliado = !ampliado">
          <span class="material-icons-round" aria-hidden="true">{{ ampliado ? 'close_fullscreen' : 'open_in_full' }}</span>
        </button>
      </div>
    </div>

    <p v-if="visibles.length === 0" class="evidencia-viewer__empty">
      Este pedido todavía no tiene documentos visibles. Sube el pantallazo y la factura en el borrador.
    </p>

    <div v-else class="evidencia-viewer__stage" :class="{ 'is-ampliada': ampliado }">
      <p v-if="cargando" class="evidencia-viewer__status" role="status">Cargando evidencia…</p>
      <p v-else-if="errorCarga" class="evidencia-viewer__error" role="alert">{{ errorCarga }}</p>
      <img
        v-else-if="objetoUrl"
        :src="objetoUrl"
        :alt="altActivo"
        class="evidencia-viewer__imagen"
        :style="{ transform: `scale(${zoom})` }"
        @load="cargando = false"
        @error="cargando = false"
      >
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { fetchDocumentBlob } from '../services/inventoryOrdersService';

const props = defineProps({
  orderUuid: { type: String, default: '' },
  documentos: { type: Array, default: () => [] },
  tabsLabel: { type: String, default: 'Documentos del pedido' },
});

const activoId = ref(null);
const objetoUrl = ref(null);
const cargando = ref(false);
const errorCarga = ref(null);
const loadingId = ref(null);
const zoom = ref(1);
const ampliado = ref(false);

const visibles = computed(() => props.documentos ?? []);

const activo = computed(() => visibles.value.find((documento) => documento.id === activoId.value) ?? visibles.value[0] ?? null);

const altActivo = computed(() => {
  if (!activo.value) return 'Evidencia del pedido';
  return `${etiquetaRol(activo.value.rol)} del pedido, revisión ${activo.value.revision}`;
});

function etiquetaRol(rol) {
  return rol === 'pantallazo_siigo' ? 'Pantallazo Siigo' : rol === 'factura' ? 'Factura' : 'Evidencia';
}

function revocar() {
  if (objetoUrl.value) {
    URL.revokeObjectURL(objetoUrl.value);
    objetoUrl.value = null;
  }
}

function ajustar(delta) {
  zoom.value = Math.min(3, Math.max(1, Number((zoom.value + delta).toFixed(2))));
}

async function seleccionar(documento) {
  if (!props.orderUuid || !documento?.id || documento.id === activoId.value) return;
  activoId.value = documento.id;
  await cargar(documento.id);
}

async function cargar(documentoId) {
  revocar();
  cargando.value = true;
  errorCarga.value = null;
  loadingId.value = documentoId;
  zoom.value = 1;

  try {
    const blob = await fetchDocumentBlob(props.orderUuid, documentoId);
    objetoUrl.value = URL.createObjectURL(blob);
  } catch (error) {
    errorCarga.value = error?.displayMessage || 'No fue posible cargar la evidencia autorizada.';
  } finally {
    cargando.value = false;
    loadingId.value = null;
  }
}

watch(() => [props.orderUuid, visibles.value.map((documento) => documento.id).join(',')], () => {
  revocar();
  activoId.value = visibles.value[0]?.id ?? null;
  if (activoId.value) cargar(activoId.value);
}, { immediate: true });

onBeforeUnmount(revocar);
</script>

<style scoped>
.evidencia-viewer {
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  background: var(--surface, #1e1e1e);
  padding: 12px;
}

.evidencia-viewer__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.evidencia-viewer__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.evidencia-viewer__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  min-height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: var(--surface-2, #2c2c2c);
  color: var(--text-main, #f5f5f5);
  font-size: 0.8rem;
  cursor: pointer;
}

.evidencia-viewer__tab.is-active {
  border-color: var(--primary, #2b8cee);
  box-shadow: 0 0 0 2px rgba(43, 140, 238, 0.25);
}

.evidencia-viewer__zoom {
  display: flex;
  align-items: center;
  gap: 4px;
}

.evidencia-viewer__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: var(--surface-2, #2c2c2c);
  color: var(--text-main, #f5f5f5);
  cursor: pointer;
}

.evidencia-viewer__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.evidencia-viewer__zoom-value {
  min-width: 48px;
  text-align: center;
  font-size: 0.78rem;
  color: var(--text-gray, #9e9e9e);
}

.evidencia-viewer__empty {
  margin: 0;
  color: var(--text-gray, #9e9e9e);
  font-size: 0.85rem;
}

.evidencia-viewer__stage {
  overflow: auto;
  max-height: 420px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: #101010;
  border-radius: 8px;
  padding: 8px;
}

.evidencia-viewer__stage.is-ampliada {
  max-height: 72vh;
}

.evidencia-viewer__imagen {
  transform-origin: top center;
  max-width: 100%;
  height: auto;
}

.evidencia-viewer__status,
.evidencia-viewer__error {
  margin: 12px;
  font-size: 0.85rem;
}

.evidencia-viewer__error {
  color: #ff9a94;
}
</style>
