<template>
  <PanelShell title="Actividad Reciente" icon="history" :badge="visibleEvents.length" to="history" data-testid="recent-activity-panel">
    <ul v-if="visibleEvents.length" class="recent-activity" role="list" aria-label="Actividad operativa reciente">
      <li v-for="event in visibleEvents" :key="`${event.type}:${event.id}`" data-testid="activity-item">
        <RouterLink :to="resolveActivityLink(event)" class="recent-activity__item">
          <span class="recent-activity__icon material-icons-round" data-testid="activity-icon" aria-hidden="true">{{ iconFor(event.type) }}</span>
          <span class="recent-activity__content">
            <strong>{{ event.titulo || 'Actividad operativa' }}</strong>
            <span>{{ event.descripcion || 'Sin detalle disponible' }}</span>
          </span>
          <time class="recent-activity__time" :datetime="event.at">{{ formatAt(event.at) }}</time>
        </RouterLink>
      </li>
    </ul>
    <div v-else class="recent-activity__empty" data-testid="recent-activity-empty">
      <span class="material-icons-round" aria-hidden="true">history_toggle_off</span>
      <span>Sin actividad reciente</span>
    </div>
  </PanelShell>
</template>

<script setup>
import { computed } from 'vue';
import PanelShell from './PanelShell.vue';

const props = defineProps({ events: { type: Array, default: () => [] } });
const visibleEvents = computed(() => [...props.events]
  .sort((left, right) => Date.parse(right.at || 0) - Date.parse(left.at || 0))
  .slice(0, 8));

function iconFor(type) { return ({ ot: 'assignment', movimiento: 'inventory_2', tanqueo: 'local_gas_station' })[type] || 'history'; }
function formatAt(value) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }).format(new Date(value));
}

function resolveActivityLink(event) {
  if (event.type === 'ot' || event.link?.name === 'work-orders') {
    return {
      path: '/work-orders',
      query: {
        id: event.id,
      },
    };
  }

  if (event.type === 'tanqueo' || event.link?.name === 'fuel') {
    const query = { id: event.id };
    if (event.placa) {
      query.search = event.placa;
    }
    return {
      path: '/fuel',
      query,
    };
  }

  if (event.type === 'movimiento' || event.link?.name === 'inventory') {
    const query = {};
    if (event.producto_id) query.producto_id = event.producto_id;
    else if (event.producto_nombre || event.titulo) query.search = event.producto_nombre || event.titulo;
    return {
      path: '/inventory',
      query,
    };
  }

  return { name: event.link?.name || 'history' };
}
</script>

<style scoped>
.recent-activity {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.recent-activity__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 10px 16px;
  color: var(--text-main);
  text-decoration: none;
  border-bottom: 1px solid var(--surface-2);
  transition: background 0.15s ease;
}

.recent-activity__item:hover {
  background: var(--primary-10);
}

.recent-activity__item:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

.recent-activity__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--primary-10);
  color: var(--primary);
  font-size: 20px;
}

.recent-activity__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.recent-activity__content strong {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-activity__content span {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-activity__time {
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.recent-activity__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  flex: 1;
}

.recent-activity__empty .material-icons-round {
  font-size: 32px;
  color: var(--text-muted);
}
</style>
