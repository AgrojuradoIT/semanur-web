<template>
  <article class="novedad-panel" :data-linea="novedad?.pedido_linea_id">
    <header class="novedad-panel__header">
      <div>
        <h4 class="novedad-panel__title">
          {{ tipoNovedadLabel(novedad?.tipo) }}
          <span v-if="linea"> · línea {{ linea.orden }} {{ linea.sku_confirmado || '' }}</span>
        </h4>
        <p v-if="novedad?.motivo" class="novedad-panel__motivo">Motivo registrado: {{ novedad.motivo }}</p>
      </div>
      <LineaEstadoBadge :estado="novedad?.tipo" tipo="novedad" />
    </header>

    <dl class="novedad-panel__numeros">
      <div>
        <dt>Esperado (E)</dt>
        <dd>{{ formatCantidad(esperado) }}</dd>
      </div>
      <div>
        <dt>Contado (C)</dt>
        <dd>{{ formatCantidad(contado) }}</dd>
      </div>
      <div>
        <dt>Apto (A)</dt>
        <dd>{{ formatCantidad(apto) }}</dd>
      </div>
      <div>
        <dt>Diferencia (A − E)</dt>
        <dd :class="{ 'is-negative': diferenciaSigno === -1, 'is-positive': diferenciaSigno === 1 }">
          <strong>{{ diferencia }}</strong>
        </dd>
      </div>
      <div>
        <dt>Condición</dt>
        <dd>{{ observacionCondicion }}</dd>
      </div>
    </dl>

    <EvidenciaViewer
      v-if="documentos.length > 0"
      :order-uuid="orderUuid"
      :documentos="documentos"
      tabs-label="Evidencia asociada a la novedad"
    />

    <section v-if="canRespond && novedad?.estado === 'abierta'" class="novedad-panel__responder">
      <h5 class="novedad-panel__subtitle">Respuesta documental (no mueve stock)</h5>
      <form class="novedad-panel__form" @submit.prevent="responder">
        <div class="novedad-field">
          <label :for="`respuesta-tipo-${novedad.novedad_id}`">Tipo de respuesta</label>
          <select :id="`respuesta-tipo-${novedad.novedad_id}`" v-model="respuestaTipo">
            <option v-for="(label, value) in tiposRespuesta" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
        <div class="novedad-field">
          <label :for="`respuesta-mensaje-${novedad.novedad_id}`">Mensaje (mínimo 3 caracteres)</label>
          <textarea
            :id="`respuesta-mensaje-${novedad.novedad_id}`"
            v-model="respuestaMensaje"
            rows="3"
            required
            minlength="3"
            :aria-invalid="respuestaError ? 'true' : 'false'"
            :aria-describedby="`respuesta-error-${novedad.novedad_id}`"
          ></textarea>
          <p v-if="respuestaError" :id="`respuesta-error-${novedad.novedad_id}`" class="novedad-field__error" role="alert">
            {{ respuestaError }}
          </p>
        </div>
        <div v-if="documentos.length > 0" class="novedad-field">
          <label :for="`respuesta-doc-${novedad.novedad_id}`">Adjuntar evidencia del pedido (opcional)</label>
          <select :id="`respuesta-doc-${novedad.novedad_id}`" v-model="respuestaDocumentoId">
            <option value="">Sin adjunto</option>
            <option v-for="documento in documentos" :key="documento.id" :value="String(documento.id)">
              {{ documento.rol === 'factura' ? 'Factura' : 'Pantallazo' }} · revisión {{ documento.revision }}
            </option>
          </select>
        </div>
        <button type="submit" class="novedad-btn" :disabled="savingResponse">
          {{ savingResponse ? 'Enviando…' : 'Enviar respuesta' }}
        </button>
      </form>
    </section>

    <section v-if="canAuthorize && novedad?.estado === 'abierta'" class="novedad-panel__firma">
      <p class="novedad-panel__firma-aviso">
        La firma de desfase es una acción con responsabilidad: revisa las consecuencias numéricas
        antes de firmar. No comparte ubicación con el guardado rutinario.
      </p>
      <button type="button" class="novedad-btn novedad-btn--firma" @click="emit('firmar')">
        <span class="material-icons-round" aria-hidden="true">draw</span>
        Firmar autorización de desfase…
      </button>
    </section>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue';

import EvidenciaViewer from './EvidenciaViewer.vue';
import LineaEstadoBadge from './LineaEstadoBadge.vue';
import { compararCantidades, formatCantidad, diferenciaCantidad } from '../utils/counting';
import { condicionLabel, tipoNovedadLabel, TIPOS_RESPUESTA } from '../utils/orders';

const props = defineProps({
  novedad: { type: Object, required: true },
  linea: { type: Object, default: null },
  orderUuid: { type: String, default: '' },
  documentos: { type: Array, default: () => [] },
  canRespond: { type: Boolean, default: false },
  canAuthorize: { type: Boolean, default: false },
  savingResponse: { type: Boolean, default: false },
});

const emit = defineEmits(['respond', 'firmar']);

const respuestaTipo = ref('respuesta_contable');
const respuestaMensaje = ref('');
const respuestaDocumentoId = ref('');
const respuestaError = ref('');

const tiposRespuesta = TIPOS_RESPUESTA;

const esperado = computed(() => props.novedad?.esperado_snapshot ?? props.linea?.cantidad_esperada ?? null);
const contado = computed(() => props.novedad?.contado_snapshot ?? null);
const apto = computed(() => props.novedad?.aptos_snapshot ?? null);
const diferencia = computed(() => diferenciaCantidad(apto.value, esperado.value) ?? '—');
const diferenciaSigno = computed(() => compararCantidades(apto.value, esperado.value));
const observacionCondicion = computed(() => condicionLabel(props.novedad?.estado_condicion));

function responder() {
  respuestaError.value = '';

  if (respuestaMensaje.value.trim().length < 3) {
    respuestaError.value = 'El mensaje debe tener al menos 3 caracteres.';
    return;
  }

  emit('respond', {
    tipo: respuestaTipo.value,
    mensaje: respuestaMensaje.value.trim(),
    documento_id: respuestaDocumentoId.value ? Number(respuestaDocumentoId.value) : null,
  });

  respuestaMensaje.value = '';
  respuestaDocumentoId.value = '';
}
</script>

<style scoped>
.novedad-panel {
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  background: var(--surface, #1e1e1e);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.novedad-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.novedad-panel__title {
  margin: 0;
  font-size: 0.92rem;
}

.novedad-panel__motivo {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--text-gray, #9e9e9e);
}

.novedad-panel__numeros {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin: 0;
}

.novedad-panel__numeros div {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface-2, #2c2c2c);
}

.novedad-panel__numeros dt {
  font-size: 0.72rem;
  color: var(--text-gray, #9e9e9e);
}

.novedad-panel__numeros dd {
  margin: 2px 0 0;
  font-size: 0.92rem;
  font-variant-numeric: tabular-nums;
}

.novedad-panel__numeros .is-negative {
  color: #ff9a94;
}

.novedad-panel__numeros .is-positive {
  color: #ffd166;
}

.novedad-panel__subtitle {
  margin: 0 0 8px;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-gray, #9e9e9e);
}

.novedad-panel__form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.novedad-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.novedad-field label {
  font-size: 0.78rem;
  color: var(--text-gray, #9e9e9e);
}

.novedad-field select,
.novedad-field textarea {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: var(--surface-2, #2c2c2c);
  color: var(--text-main, #f5f5f5);
  font-size: 0.84rem;
}

.novedad-field textarea[aria-invalid='true'] {
  border-color: #f44336;
}

.novedad-field__error {
  margin: 0;
  font-size: 0.76rem;
  color: #ff9a94;
}

.novedad-panel__firma-aviso {
  margin: 0 0 8px;
  font-size: 0.78rem;
  color: var(--text-gray, #bdbdbd);
}

.novedad-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--primary, #2b8cee);
  background: var(--primary, #2b8cee);
  color: #fff;
  font-weight: 600;
  font-size: 0.84rem;
  cursor: pointer;
}

.novedad-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.novedad-btn--firma {
  background: #b3261e;
  border-color: #b3261e;
}
</style>
