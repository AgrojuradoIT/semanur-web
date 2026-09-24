<template>
  <article class="conteo-form" :data-linea="linea.linea_id">
    <header class="conteo-form__header">
      <div>
        <h4 class="conteo-form__title">
          Línea {{ linea.orden }} · {{ linea.sku_confirmado || 'SKU sin confirmar' }}
        </h4>
        <p class="conteo-form__desc">{{ linea.descripcion_confirmada || 'Sin descripción confirmada' }}</p>
      </div>
      <LineaEstadoBadge :estado="linea.estado_linea" tipo="linea" />
    </header>

    <p class="conteo-form__esperado">
      <span class="conteo-form__esperado-label">Esperado (solo lectura, confirmado por contabilidad):</span>
      <output class="conteo-form__esperado-value">{{ linea.cantidad_esperada }}</output>
      <span>{{ linea.unidad || 'unidades' }}</span>
    </p>

    <p v-if="observacion" class="conteo-form__guardado">
      Último conteo guardado: contado {{ observacion.conteo_total }} / apto {{ observacion.conteo_aptos }}
      · {{ condicionLabel(observacion.estado_condicion) }}
      <template v-if="observacion.motivo"> · motivo: {{ observacion.motivo }}</template>
      (revisión {{ observacion.observacion_version }}, reconteos: {{ observacion.reconteos }}).
      Registrar un nuevo conteo reemplaza la observación vigente; no se suma a la custodia.
    </p>

    <div class="conteo-form__grid">
      <div class="conteo-field">
        <label :for="`conteo-total-${linea.linea_id}`">Contado físicamente (total)</label>
        <input
          :id="`conteo-total-${linea.linea_id}`"
          v-model="borrador.conteoTotal"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          placeholder="Vacío = no contado; 0 = ausencia explícita"
          :aria-invalid="borrador.errores?.conteoTotal ? 'true' : 'false'"
          :aria-describedby="`conteo-total-error-${linea.linea_id}`"
          :disabled="disabled"
        >
        <p :id="`conteo-total-error-${linea.linea_id}`" class="conteo-field__error" role="alert">
          {{ borrador.errores?.conteoTotal }}
        </p>
      </div>

      <div class="conteo-field">
        <label :for="`conteo-aptos-${linea.linea_id}`">Cantidad apta para ingreso</label>
        <input
          :id="`conteo-aptos-${linea.linea_id}`"
          v-model="borrador.conteoAptos"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          placeholder="Solo unidades físicamente aptas"
          :aria-invalid="borrador.errores?.conteoAptos ? 'true' : 'false'"
          :aria-describedby="`conteo-aptos-error-${linea.linea_id}`"
          :disabled="disabled"
        >
        <p :id="`conteo-aptos-error-${linea.linea_id}`" class="conteo-field__error" role="alert">
          {{ borrador.errores?.conteoAptos }}
        </p>
      </div>

      <div class="conteo-field">
        <label :for="`conteo-condicion-${linea.linea_id}`">Condición física</label>
        <select
          :id="`conteo-condicion-${linea.linea_id}`"
          v-model="borrador.condicion"
          :aria-invalid="borrador.errores?.condicion ? 'true' : 'false'"
          :aria-describedby="`conteo-condicion-error-${linea.linea_id}`"
          :disabled="disabled"
        >
          <option value="" disabled>Seleccionar condición…</option>
          <option v-for="(label, value) in condiciones" :key="value" :value="value">{{ label }}</option>
        </select>
        <p :id="`conteo-condicion-error-${linea.linea_id}`" class="conteo-field__error" role="alert">
          {{ borrador.errores?.condicion }}
        </p>
      </div>

      <div class="conteo-field conteo-field--wide">
        <label :for="`conteo-motivo-${linea.linea_id}`">Motivo de la novedad <span aria-hidden="true">(obligatorio si la condición no es conforme)</span></label>
        <textarea
          :id="`conteo-motivo-${linea.linea_id}`"
          v-model="borrador.motivo"
          rows="2"
          :aria-invalid="borrador.errores?.motivo ? 'true' : 'false'"
          :aria-describedby="`conteo-motivo-error-${linea.linea_id}`"
          :disabled="disabled"
        ></textarea>
        <p :id="`conteo-motivo-error-${linea.linea_id}`" class="conteo-field__error" role="alert">
          {{ borrador.errores?.motivo }}
        </p>
      </div>
    </div>

    <footer class="conteo-form__footer">
      <button
        type="button"
        class="conteo-form__save"
        :disabled="saving || disabled"
        @click="emit('save', linea.linea_id)"
      >
        <span class="material-icons-round" aria-hidden="true">save</span>
        {{ saving ? 'Guardando…' : 'Guardar conteo de la línea' }}
      </button>
      <span class="conteo-form__note">Guardar no ingresa stock: solo la confirmación lo hace.</span>
    </footer>
  </article>
</template>

<script setup>
import LineaEstadoBadge from './LineaEstadoBadge.vue';
import { CONDICIONES } from '../utils/orders';

const props = defineProps({
  linea: { type: Object, required: true },
  borrador: { type: Object, required: true },
  observacion: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['save']);

const condiciones = CONDICIONES;

function condicionLabel(value) {
  return condiciones[value] ?? value ?? 'Sin condición';
}
</script>

<style scoped>
.conteo-form {
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  background: var(--surface, #1e1e1e);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.conteo-form__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.conteo-form__title {
  margin: 0;
  font-size: 0.92rem;
}

.conteo-form__desc {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: var(--text-gray, #9e9e9e);
}

.conteo-form__esperado {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  margin: 0;
  font-size: 0.84rem;
}

.conteo-form__esperado-label {
  color: var(--text-gray, #9e9e9e);
}

.conteo-form__esperado-value {
  font-weight: 700;
  color: var(--text-main, #f5f5f5);
}

.conteo-form__guardado {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(66, 165, 245, 0.08);
  border: 1px solid rgba(66, 165, 245, 0.3);
  font-size: 0.78rem;
  color: var(--text-gray, #bdbdbd);
}

.conteo-form__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 720px) {
  .conteo-form__grid {
    grid-template-columns: 1fr;
  }
}

.conteo-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conteo-field--wide {
  grid-column: 1 / -1;
}

.conteo-field label {
  font-size: 0.78rem;
  color: var(--text-gray, #9e9e9e);
}

.conteo-field input,
.conteo-field select,
.conteo-field textarea {
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: var(--surface-2, #2c2c2c);
  color: var(--text-main, #f5f5f5);
  font-size: 0.85rem;
}

.conteo-field input[aria-invalid='true'],
.conteo-field select[aria-invalid='true'],
.conteo-field textarea[aria-invalid='true'] {
  border-color: #f44336;
}

.conteo-field__error {
  margin: 0;
  min-height: 14px;
  font-size: 0.72rem;
  color: #ff9a94;
}

.conteo-form__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.conteo-form__save {
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

.conteo-form__save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.conteo-form__note {
  font-size: 0.74rem;
  color: var(--text-muted, #757575);
}
</style>
