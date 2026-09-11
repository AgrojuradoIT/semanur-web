<template>
  <UiModal
    :model-value="visible"
    title="Firma de desfase de recepción"
    size="md"
    @update:model-value="emit('update:visible', $event)"
    @close="emit('close')"
  >
    <div class="firma-desfase">
      <p class="firma-desfase__intro">
        Vas a firmar la diferencia entre lo esperado y lo físicamente apto. La firma queda
        registrada con tu usuario y empleado activo; no mueve stock por sí sola.
      </p>

      <table class="firma-desfase__tabla">
        <caption class="firma-desfase__caption">Consecuencias numéricas de la firma</caption>
        <tbody>
          <tr>
            <th scope="row">Esperado (E)</th>
            <td>{{ formatCantidad(esperado) }}</td>
          </tr>
          <tr>
            <th scope="row">Contado físicamente (C)</th>
            <td>{{ formatCantidad(contado) }}</td>
          </tr>
          <tr>
            <th scope="row">Apto validado (A)</th>
            <td>{{ formatCantidad(apto) }}</td>
          </tr>
          <tr>
            <th scope="row">Cantidad a ingresar (Q = A)</th>
            <td><strong>{{ formatCantidad(apto) }}</strong></td>
          </tr>
          <tr>
            <th scope="row">Diferencia firmada (Q − E)</th>
            <td :class="{ 'is-negative': esNegativa, 'is-positive': esPositiva }">
              <strong>{{ diferencia }}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="esNegativa" class="firma-desfase__aviso" role="note">
        Faltante: se ingresarán solo {{ formatCantidad(apto) }} unidades. La diferencia no se
        regulariza sola; una entrega posterior exige pedido complementario vinculado.
      </p>
      <p v-else-if="esPositiva" class="firma-desfase__aviso" role="note">
        Sobrante: excluye el excedente con una devolución/separación y vuelve a contar antes de firmar.
      </p>

      <form class="firma-desfase__form" @submit.prevent="confirmar">
        <div class="firma-field">
          <label for="firma-motivo">Motivo específico del desfase (mínimo 10 caracteres)</label>
          <textarea
            id="firma-motivo"
            v-model="motivo"
            rows="3"
            required
            minlength="10"
            aria-describedby="firma-motivo-ayuda"
            :aria-invalid="motivoError ? 'true' : 'false'"
          ></textarea>
          <p id="firma-motivo-ayuda" class="firma-field__hint">
            {{ motivo.length }}/500 · describe la verificación física realizada.
          </p>
          <p v-if="motivoError" class="firma-field__error" role="alert">{{ motivoError }}</p>
        </div>

        <label class="firma-check">
          <input v-model="aceptacion" type="checkbox">
          <span>
            Asumo la responsabilidad operativa de la diferencia firmada. Entiendo que no genera
            deuda al empleado, descuento de nómina ni asiento contable automático.
          </span>
        </label>

        <label class="firma-check">
          <input v-model="confirmarInmediato" type="checkbox">
          <span>Confirmar también la recepción en el mismo acto (opcional; mismas validaciones).</span>
        </label>

        <p v-if="error" class="firma-field__error" role="alert">
          {{ error?.displayMessage || 'No fue posible registrar la firma.' }}
        </p>

        <footer class="firma-desfase__footer">
          <button type="button" class="firma-btn firma-btn--ghost" @click="emit('close')">
            Volver sin firmar
          </button>
          <button type="submit" class="firma-btn firma-btn--firma" :disabled="!puedeFirmar || saving">
            <span class="material-icons-round" aria-hidden="true">draw</span>
            {{ saving ? 'Firmando…' : 'Firmar autorización de desfase' }}
          </button>
        </footer>
      </form>
    </div>
  </UiModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

import { UiModal } from '../../../shared/components/ui';
import { formatCantidad, diferenciaCantidad, compararCantidades } from '../utils/counting';

const props = defineProps({
  visible: { type: Boolean, default: false },
  novedad: { type: Object, default: null },
  linea: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  error: { type: Object, default: null },
});

const emit = defineEmits(['update:visible', 'close', 'confirm']);

const motivo = ref('');
const aceptacion = ref(false);
const confirmarInmediato = ref(false);
const motivoError = ref('');

const esperado = computed(() => props.novedad?.esperado_snapshot ?? props.linea?.cantidad_esperada ?? null);
const contado = computed(() => props.novedad?.contado_snapshot ?? null);
const apto = computed(() => props.novedad?.aptos_snapshot ?? null);
const diferencia = computed(() => diferenciaCantidad(apto.value, esperado.value) ?? '—');

const comparacion = computed(() => compararCantidades(apto.value, esperado.value));
const esNegativa = computed(() => comparacion.value === -1);
const esPositiva = computed(() => comparacion.value === 1);

const puedeFirmar = computed(() => motivo.value.trim().length >= 10 && aceptacion.value === true);

watch(() => props.visible, (abierto) => {
  if (!abierto) return;
  motivo.value = '';
  aceptacion.value = false;
  confirmarInmediato.value = false;
  motivoError.value = '';
});

function confirmar() {
  motivoError.value = '';

  if (motivo.value.trim().length < 10) {
    motivoError.value = 'El motivo debe ser específico y tener al menos 10 caracteres.';
    return;
  }

  if (!aceptacion.value) {
    motivoError.value = 'Debes aceptar expresamente la responsabilidad.';
    return;
  }

  emit('confirm', {
    motivo: motivo.value.trim(),
    aceptacion_responsabilidad: true,
    confirmar_inmediato: confirmarInmediato.value,
  });
}

defineExpose({ motivo, aceptacion, confirmarInmediato });
</script>

<style scoped>
.firma-desfase {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.firma-desfase__intro {
  margin: 0;
  font-size: 0.86rem;
  color: var(--text-gray, #bdbdbd);
}

.firma-desfase__tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
}

.firma-desfase__caption {
  text-align: left;
  font-weight: 600;
  padding-bottom: 6px;
}

.firma-desfase__tabla th,
.firma-desfase__tabla td {
  border-bottom: 1px solid var(--border, #3a3a3a);
  padding: 6px 8px;
  text-align: left;
}

.firma-desfase__tabla td {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.firma-desfase__tabla .is-negative {
  color: #ff9a94;
}

.firma-desfase__tabla .is-positive {
  color: #ffd166;
}

.firma-desfase__aviso {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 179, 0, 0.35);
  background: rgba(255, 179, 0, 0.08);
  font-size: 0.8rem;
}

.firma-desfase__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.firma-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.firma-field label {
  font-size: 0.8rem;
  color: var(--text-gray, #9e9e9e);
}

.firma-field textarea {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: var(--surface-2, #2c2c2c);
  color: var(--text-main, #f5f5f5);
  font-size: 0.86rem;
  resize: vertical;
}

.firma-field textarea[aria-invalid='true'] {
  border-color: #f44336;
}

.firma-field__hint {
  margin: 0;
  font-size: 0.72rem;
  color: var(--text-muted, #757575);
}

.firma-field__error {
  margin: 0;
  font-size: 0.78rem;
  color: #ff9a94;
}

.firma-check {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 0.82rem;
  line-height: 1.45;
}

.firma-check input {
  margin-top: 3px;
  min-width: 18px;
  min-height: 18px;
}

.firma-desfase__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.firma-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.firma-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.firma-btn--ghost {
  background: transparent;
  color: var(--text-main, #f5f5f5);
  border: 1px solid var(--border, #3a3a3a);
}

.firma-btn--firma {
  background: #b3261e;
  border: 1px solid #b3261e;
  color: #fff;
}
</style>
