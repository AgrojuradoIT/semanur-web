<template>
  <span
    class="linea-estado-badge"
    :data-tone="tone"
    :data-estado="estado"
  >
    <span class="linea-estado-badge__icon material-icons-round" aria-hidden="true">{{ icon }}</span>
    <span class="linea-estado-badge__label">{{ texto }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';

import {
  alertaTipo,
  condicionLabel,
  estadoLinea,
  estadoPedido,
  tipoNovedadLabel,
} from '../utils/orders';

const props = defineProps({
  estado: { type: String, default: '' },
  tipo: { type: String, default: 'pedido' },
  label: { type: String, default: '' },
  showIcon: { type: Boolean, default: true },
});

const meta = computed(() => {
  switch (props.tipo) {
    case 'linea':
      return estadoLinea(props.estado);
    case 'novedad':
      return { label: tipoNovedadLabel(props.estado), tone: 'warning' };
    case 'condicion':
      return { label: condicionLabel(props.estado), tone: props.estado === 'conforme' ? 'success' : 'warning' };
    case 'alerta':
      return alertaTipo(props.estado);
    default:
      return estadoPedido(props.estado);
  }
});

const texto = computed(() => props.label || meta.value.label);
const tone = computed(() => meta.value.tone ?? 'neutral');

const icon = computed(() => ({
  success: 'check_circle',
  warning: 'warning',
  danger: 'error',
  info: 'info',
  neutral: 'radio_button_unchecked',
}[tone.value] ?? 'info'));
</script>

<style scoped>
.linea-estado-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--border, #3a3a3a);
  background: var(--surface-2, #2c2c2c);
  color: var(--text-main, #f5f5f5);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.linea-estado-badge__icon {
  font-size: 15px;
}

.linea-estado-badge[data-tone='success'] {
  border-color: rgba(76, 175, 80, 0.55);
  color: #9ae6a0;
}

.linea-estado-badge[data-tone='warning'] {
  border-color: rgba(255, 179, 0, 0.55);
  color: #ffd166;
}

.linea-estado-badge[data-tone='danger'] {
  border-color: rgba(244, 67, 54, 0.55);
  color: #ff9a94;
}

.linea-estado-badge[data-tone='info'] {
  border-color: rgba(66, 165, 245, 0.55);
  color: #9bd0ff;
}
</style>
