<template>
  <section class="ocr-panel" aria-label="Revisión de OCR">
    <header class="ocr-panel__header">
      <div>
        <h3 class="ocr-panel__title">Revisión de candidatos OCR</h3>
        <p class="ocr-panel__status" role="status" aria-live="polite">
          {{ estadoTexto }}
        </p>
      </div>
      <button
        v-if="documentoId"
        type="button"
        class="ocr-panel__btn ocr-panel__btn--ghost"
        :disabled="reprocessing"
        @click="emit('reprocess', documentoId)"
      >
        <span class="material-icons-round" aria-hidden="true">refresh</span>
        {{ reprocessing ? 'Reprocesando…' : 'Reprocesar OCR' }}
      </button>
    </header>

    <ul v-if="advertenciasDocumento.length > 0" class="ocr-panel__warnings" aria-label="Advertencias del documento">
      <li v-for="(warning, index) in advertenciasDocumento" :key="index" :class="{ 'is-blocking': warning.blocking }">
        <span class="material-icons-round" aria-hidden="true">{{ warning.blocking ? 'report' : 'info' }}</span>
        {{ warning.message || warning.code }}
      </li>
    </ul>

    <div class="ocr-panel__grid">
      <EvidenciaViewer
        class="ocr-panel__evidence"
        :order-uuid="orderUuid"
        :documentos="documentos"
        tabs-label="Evidencia para comparar con los candidatos"
      />

      <div class="ocr-panel__candidates">
        <p v-if="candidatos.length === 0" class="ocr-panel__empty">
          {{ emptyMessage }}
        </p>

        <article
          v-for="(candidato, index) in candidatos"
          :key="candidato.candidate_id ?? index"
          class="ocr-candidate"
          :class="{ 'is-discarded': descartados[idDe(candidato, index)] }"
        >
          <header class="ocr-candidate__header">
            <h4 class="ocr-candidate__title">Candidato {{ index + 1 }} · fila {{ candidato.source_row ?? '—' }}</h4>
            <span v-if="candidato.warnings?.some((w) => w.blocking)" class="ocr-candidate__flag">
              <span class="material-icons-round" aria-hidden="true">report</span> Requiere corrección
            </span>
          </header>

          <ul v-if="candidato.warnings?.length" class="ocr-candidate__warnings">
            <li v-for="(warning, wIndex) in candidato.warnings" :key="wIndex" :class="{ 'is-blocking': warning.blocking }">
              {{ warning.message || warning.code }}
            </li>
          </ul>

          <div v-if="!descartados[idDe(candidato, index)]" class="ocr-candidate__fields">
            <div class="ocr-field">
              <label :for="`sku-${idDe(candidato, index)}`">SKU confirmado (texto, sin autocorrección)</label>
              <input
                :id="`sku-${idDe(candidato, index)}`"
                v-model="estado(candidato, index).sku"
                type="text"
                autocomplete="off"
                spellcheck="false"
                :aria-describedby="`sku-raw-${idDe(candidato, index)}`"
              >
              <p :id="`sku-raw-${idDe(candidato, index)}`" class="ocr-field__raw">
                OCR: {{ candidato.sku?.raw || 'no legible' }}
                <span v-if="candidato.sku?.confidence !== null && candidato.sku?.confidence !== undefined">
                  (confianza {{ porcentaje(candidato.sku.confidence) }})
                </span>
                <span v-else>(sin confianza informada)</span>
              </p>
            </div>

            <div class="ocr-field">
              <label :for="`desc-${idDe(candidato, index)}`">Descripción confirmada</label>
              <input
                :id="`desc-${idDe(candidato, index)}`"
                v-model="estado(candidato, index).descripcion"
                type="text"
                autocomplete="off"
              >
            </div>

            <div class="ocr-field ocr-field--short">
              <label :for="`cant-${idDe(candidato, index)}`">Cantidad esperada</label>
              <input
                :id="`cant-${idDe(candidato, index)}`"
                v-model="estado(candidato, index).cantidad"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                :aria-invalid="errores[idDe(candidato, index)] ? 'true' : 'false'"
                :aria-describedby="`cant-error-${idDe(candidato, index)}`"
              >
              <p :id="`cant-error-${idDe(candidato, index)}`" class="ocr-field__error" role="alert">
                {{ errores[idDe(candidato, index)] }}
              </p>
            </div>

            <div class="ocr-field">
              <label :for="`prod-${idDe(candidato, index)}`">Producto del catálogo (selección explícita)</label>
              <div class="ocr-field__row">
                <input
                  :id="`prod-${idDe(candidato, index)}`"
                  v-model="busquedas[idDe(candidato, index)]"
                  type="text"
                  placeholder="Buscar por SKU o nombre…"
                  autocomplete="off"
                >
                <button
                  type="button"
                  class="ocr-panel__btn ocr-panel__btn--ghost"
                  :disabled="buscando[idDe(candidato, index)]"
                  @click="buscar(candidato, index)"
                >
                  Buscar
                </button>
              </div>
              <p v-if="seleccionProducto[idDe(candidato, index)]" class="ocr-field__selected">
                Seleccionado: {{ seleccionProducto[idDe(candidato, index)].producto_label }}
              </p>
              <ul v-if="resultados[idDe(candidato, index)]?.length" class="ocr-field__results" aria-label="Resultados del catálogo">
                <li v-for="producto in resultados[idDe(candidato, index)]" :key="producto.producto_id">
                  <button type="button" @click="elegirProducto(candidato, index, producto)">
                    {{ producto.producto_sku }} · {{ producto.producto_nombre }}
                  </button>
                </li>
              </ul>
              <p class="ocr-field__raw">La asociación es manual: nunca se elige por parecido de nombre.</p>
            </div>

            <div class="ocr-candidate__actions">
              <button type="button" class="ocr-panel__btn" @click="aplicar(candidato, index)">
                <span class="material-icons-round" aria-hidden="true">playlist_add</span>
                Añadir a las líneas del pedido
              </button>
              <button type="button" class="ocr-panel__btn ocr-panel__btn--ghost" @click="alternarDescarte(candidato, index)">
                Descartar candidato
              </button>
            </div>
          </div>

          <div v-else class="ocr-candidate__discarded">
            <p>Candidato descartado por revisión humana.</p>
            <button type="button" class="ocr-panel__btn ocr-panel__btn--ghost" @click="alternarDescarte(candidato, index)">
              Restaurar
            </button>
          </div>
        </article>

        <article v-for="(fila, index) in filasIgnoradas" :key="`ignorada-${index}`" class="ocr-candidate ocr-candidate--ignored">
          <h4 class="ocr-candidate__title">Fila ignorada por el OCR · fila {{ fila.source_row ?? '—' }}</h4>
          <p class="ocr-field__raw">Motivo: {{ fila.reason }}. No crea líneas automáticamente.</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, watch } from 'vue';

import EvidenciaViewer from './EvidenciaViewer.vue';
import { searchProducts } from '../services/inventoryOrdersService';
import { ocrEstadoLabel } from '../utils/orders';
import { parseQuantityInput } from '../utils/counting';

const props = defineProps({
  orderUuid: { type: String, default: '' },
  ocr: { type: Object, default: null },
  documentos: { type: Array, default: () => [] },
  reprocessing: { type: Boolean, default: false },
});

const emit = defineEmits(['apply', 'reprocess', 'discard']);

const edits = reactive({});
const errores = reactive({});
const busquedas = reactive({});
const resultados = reactive({});
const buscando = reactive({});
const seleccionProducto = reactive({});
const descartados = reactive({});

const intento = computed(() => props.ocr?.intento ?? props.ocr ?? null);
const candidatos = computed(() => intento.value?.lines ?? []);
const filasIgnoradas = computed(() => intento.value?.ignored_rows ?? []);
const advertenciasDocumento = computed(() => intento.value?.warnings ?? []);
const documentoId = computed(() => intento.value?.document_id ?? null);

const estadoTexto = computed(() => {
  if (!intento.value) return 'Sin intento OCR todavía. Sube un pantallazo de Siigo para comenzar.';
  const revision = intento.value.requires_human_revision ? ' · revisión humana obligatoria' : '';
  return `${ocrEstadoLabel(intento.value.estado)}${revision}`;
});

const emptyMessage = computed(() => {
  if (!intento.value) return 'Todavía no hay candidatos.';
  if (intento.value.estado === 'pendiente' || intento.value.estado === 'procesando') {
    return 'El OCR está procesando el pantallazo; esta vista se actualiza sola.';
  }
  if (intento.value.estado === 'fallido') {
    return 'El OCR falló. Puedes reprocesar o completar las líneas manualmente.';
  }
  return 'No hay candidatos legibles en este pantallazo.';
});

function idDe(candidato, index) {
  return candidato?.candidate_id ?? `fila-${index}`;
}

function estado(candidato, index) {
  const id = idDe(candidato, index);

  if (!edits[id]) {
    edits[id] = {
      sku: candidato?.sku?.value ?? '',
      descripcion: candidato?.description?.value ?? '',
      cantidad: candidato?.expected_quantity?.value ?? '',
    };
  }

  return edits[id];
}

function porcentaje(confianza) {
  return `${Math.round(Number(confianza) * 100)}%`;
}

function validar(candidato, index) {
  const edicion = estado(candidato, index);
  const cantidad = parseQuantityInput(edicion.cantidad);
  const id = idDe(candidato, index);

  errores[id] = !cantidad.ok
    ? cantidad.error
    : (edicion.sku.trim() === '' ? 'Confirma el SKU de la línea.' : '');

  return { valida: errores[id] === '', edicion, cantidad };
}

function aplicar(candidato, index) {
  const { valida, edicion, cantidad } = validar(candidato, index);
  const id = idDe(candidato, index);

  if (!valida) return;

  emit('apply', {
    candidato,
    overrides: {
      sku: edicion.sku.trim(),
      descripcion: edicion.descripcion.trim(),
      cantidad: cantidad.value,
      productoId: seleccionProducto[id]?.producto_id ?? null,
      productoLabel: seleccionProducto[id]?.producto_label ?? '',
    },
  });
}

async function buscar(candidato, index) {
  const id = idDe(candidato, index);
  const query = String(busquedas[id] ?? '').trim();

  if (query.length < 2) return;

  buscando[id] = true;

  try {
    resultados[id] = await searchProducts(query);
  } finally {
    buscando[id] = false;
  }
}

function elegirProducto(candidato, index, producto) {
  const id = idDe(candidato, index);

  // Selección humana explícita: el SKU confirmado se alinea al del catálogo
  // para que la validación exacta del servidor coincida, sin fuzzy matching.
  estado(candidato, index).sku = producto.producto_sku ?? estado(candidato, index).sku;
  seleccionProducto[id] = {
    producto_id: producto.producto_id,
    producto_label: producto.producto_nombre ?? '',
  };
  resultados[id] = [];
}

function alternarDescarte(candidato, index) {
  const id = idDe(candidato, index);
  descartados[id] = !descartados[id];
  emit('discard', { candidato, descartado: descartados[id] });
}

watch(candidatos, (lista) => {
  lista.forEach((candidato, index) => estado(candidato, index));
}, { immediate: true });
</script>

<style scoped>
.ocr-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ocr-panel__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ocr-panel__title {
  margin: 0;
  font-size: 1rem;
}

.ocr-panel__status {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--text-gray, #9e9e9e);
}

.ocr-panel__warnings {
  list-style: none;
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 179, 0, 0.08);
  border: 1px solid rgba(255, 179, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.82rem;
}

.ocr-panel__warnings li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.ocr-panel__warnings .is-blocking {
  color: #ffd166;
  font-weight: 600;
}

.ocr-panel__grid {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.4fr);
  gap: 14px;
  align-items: start;
}

@media (max-width: 900px) {
  .ocr-panel__grid {
    grid-template-columns: 1fr;
  }
}

.ocr-panel__candidates {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 70vh;
  overflow: auto;
  padding-right: 4px;
}

.ocr-panel__empty {
  margin: 0;
  padding: 16px;
  border-radius: 8px;
  border: 1px dashed var(--border, #3a3a3a);
  color: var(--text-gray, #9e9e9e);
  font-size: 0.85rem;
}

.ocr-candidate {
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  background: var(--surface, #1e1e1e);
  padding: 12px;
}

.ocr-candidate.is-discarded {
  opacity: 0.75;
}

.ocr-candidate--ignored {
  border-style: dashed;
  background: transparent;
}

.ocr-candidate__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ocr-candidate__title {
  margin: 0;
  font-size: 0.88rem;
}

.ocr-candidate__flag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #ffd166;
  font-size: 0.78rem;
  font-weight: 600;
}

.ocr-candidate__warnings {
  list-style: disc;
  margin: 8px 0;
  padding-left: 18px;
  font-size: 0.8rem;
  color: var(--text-gray, #9e9e9e);
}

.ocr-candidate__warnings .is-blocking {
  color: #ffd166;
}

.ocr-candidate__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 8px;
}

@media (max-width: 640px) {
  .ocr-candidate__fields {
    grid-template-columns: 1fr;
  }
}

.ocr-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ocr-field label {
  font-size: 0.78rem;
  color: var(--text-gray, #9e9e9e);
}

.ocr-field input {
  min-height: 38px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: var(--surface-2, #2c2c2c);
  color: var(--text-main, #f5f5f5);
  font-size: 0.85rem;
}

.ocr-field input[aria-invalid='true'] {
  border-color: #f44336;
}

.ocr-field__raw {
  margin: 0;
  font-size: 0.72rem;
  color: var(--text-muted, #757575);
}

.ocr-field__error {
  margin: 0;
  min-height: 14px;
  font-size: 0.72rem;
  color: #ff9a94;
}

.ocr-field__row {
  display: flex;
  gap: 6px;
}

.ocr-field__row input {
  flex: 1;
}

.ocr-field__selected {
  margin: 0;
  font-size: 0.76rem;
  color: #9ae6a0;
}

.ocr-field__results {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 8px;
  overflow: hidden;
}

.ocr-field__results button {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  background: var(--surface-2, #2c2c2c);
  border: none;
  color: var(--text-main, #f5f5f5);
  cursor: pointer;
  font-size: 0.8rem;
}

.ocr-field__results button:hover,
.ocr-field__results button:focus-visible {
  background: var(--surface-light, #3a3a3a);
}

.ocr-candidate__actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ocr-candidate__discarded {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--text-gray, #9e9e9e);
}

.ocr-panel__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--primary, #2b8cee);
  background: var(--primary, #2b8cee);
  color: #fff;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
}

.ocr-panel__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ocr-panel__btn--ghost {
  background: transparent;
  color: var(--text-main, #f5f5f5);
  border-color: var(--border, #3a3a3a);
}

.ocr-panel__btn .material-icons-round {
  font-size: 18px;
}
</style>
