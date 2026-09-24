<template>
  <div class="historial">
    <p v-if="loading" class="historial__status" role="status">Cargando historial…</p>
    <p v-else-if="error" class="historial__error" role="alert">
      {{ error?.displayMessage || 'No fue posible cargar el historial.' }}
    </p>
    <p v-else-if="eventos.length === 0" class="historial__status">
      Todavía no hay eventos registrados para este pedido.
    </p>

    <ol v-else class="historial__list">
      <li v-for="evento in eventos" :key="evento.evento_id" class="historial__item">
        <span class="historial__dot" aria-hidden="true"></span>
        <div class="historial__body">
          <div class="historial__head">
            <strong class="historial__tipo">{{ eventoLabel(evento.event_type) }}</strong>
            <time :datetime="evento.created_at">{{ formatDateTimeCO(evento.created_at) }}</time>
          </div>
          <p class="historial__meta">
            <span v-if="evento.actor">Actor: {{ evento.actor.nombre }}</span>
            <span v-if="evento.actor_rol_snapshot"> · Rol: {{ evento.actor_rol_snapshot }}</span>
            <span v-if="evento.pedido_linea_id"> · Línea #{{ evento.pedido_linea_id }}</span>
            <span v-if="evento.revision !== null && evento.revision !== undefined"> · Revisión {{ evento.revision }}</span>
          </p>
          <p v-if="eventoResumen(evento)" class="historial__resumen">{{ eventoResumen(evento) }}</p>
          <details v-if="hayDetalle(evento)" class="historial__detalle">
            <summary>Ver cambios registrados</summary>
            <pre>{{ detalleLegible(evento) }}</pre>
          </details>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { formatDateTimeCO } from '../../../shared/utils/formatters';
import { eventoLabel, eventoResumen } from '../utils/history';

defineProps({
  eventos: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null },
});

function hayDetalle(evento) {
  return Boolean(evento?.datos_antes || evento?.datos_despues);
}

function detalleLegible(evento) {
  return JSON.stringify({
    antes: evento?.datos_antes ?? null,
    despues: evento?.datos_despues ?? null,
  }, null, 2);
}
</script>

<style scoped>
.historial__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
}

.historial__list::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--border, #3a3a3a);
}

.historial__item {
  display: flex;
  gap: 12px;
  position: relative;
}

.historial__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary, #2b8cee);
  margin-top: 4px;
  flex-shrink: 0;
  z-index: 1;
}

.historial__body {
  flex: 1;
  min-width: 0;
}

.historial__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
}

.historial__tipo {
  font-size: 0.9rem;
}

.historial__head time {
  font-size: 0.76rem;
  color: var(--text-muted, #757575);
}

.historial__meta {
  margin: 2px 0 0;
  font-size: 0.78rem;
  color: var(--text-gray, #9e9e9e);
}

.historial__resumen {
  margin: 4px 0 0;
  font-size: 0.8rem;
}

.historial__detalle summary {
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--primary, #2b8cee);
  margin-top: 6px;
}

.historial__detalle pre {
  margin: 6px 0 0;
  padding: 10px;
  border-radius: 8px;
  background: var(--surface-2, #2c2c2c);
  font-size: 0.72rem;
  overflow: auto;
  max-height: 260px;
}

.historial__status {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-gray, #9e9e9e);
}

.historial__error {
  margin: 0;
  font-size: 0.85rem;
  color: #ff9a94;
}
</style>
