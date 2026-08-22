<template>
  <PanelShell title="Centro de Alertas" icon="notifications_active" :badge="total" to="fleet" data-testid="alerts-panel">
    <div v-if="orderedItems.length" class="alerts-list">
      <RouterLink
        v-for="alert in orderedItems"
        :key="alertKey(alert)"
        :to="resolveAlertLink(alert)"
        class="alert-item"
        :class="`alert-item--${alert.severity || 'informativo'}`"
        data-testid="alert-item"
      >
        <!-- Vehicle Thumbnail / Category Fallback Icon -->
        <div v-if="alert.entidad?.kind === 'vehiculo'" class="alert-item__avatar">
          <img
            :src="getVehicleImageUrl(alert.entidad)"
            :alt="alert.entidad?.label || 'Vehículo'"
            class="alert-item__img"
            @error="$event.target.src = '/fleet/generic.png'"
          />
        </div>
        <span v-else class="alert-item__icon material-icons-round" aria-hidden="true">{{ iconFor(alert) }}</span>
        <span class="alert-item__content">
          <strong>{{ alert.entidad?.label || 'Alerta operativa' }}</strong>
          <span>{{ alert.detalle || 'Requiere revisión' }}</span>
        </span>
        <span class="alert-item__severity">{{ severityLabel(alert.severity) }}</span>
      </RouterLink>
      <span v-if="overflow" class="alerts-overflow" data-testid="alerts-overflow">+{{ overflow }} más</span>
    </div>
    <div v-else class="alerts-empty" data-testid="alerts-empty">
      <span class="material-icons-round" aria-hidden="true">check_circle</span>
      <span>Sin alertas activas</span>
    </div>
  </PanelShell>
</template>

<script setup>
import { computed } from 'vue';
import PanelShell from './PanelShell.vue';
import { getVehicleImageUrl } from '../../../shared/utils/vehicleUtils';

const props = defineProps({
  alerts: { type: Object, default: () => ({ items: [], total: 0 }) },
});

const severityRank = { vencido: 0, proximo: 1, informativo: 2 };
const orderedItems = computed(() => [...(Array.isArray(props.alerts?.items) ? props.alerts.items : [])]
  .sort((left, right) => (severityRank[left.severity] ?? 2) - (severityRank[right.severity] ?? 2))
  .slice(0, 8));
const total = computed(() => Number(props.alerts?.total || 0));
const overflow = computed(() => Math.max(total.value - orderedItems.value.length, 0));

function alertKey(alert) { return `${alert.tipo || 'alert'}:${alert.subtipo || 'item'}:${alert.entidad?.id || alert.entidad?.label || alert.detalle}`; }
function severityLabel(severity) { return ({ vencido: 'Vencido', proximo: 'Próximo', informativo: 'Info' })[severity] || 'Info'; }
function iconFor(alert) { return ({ documento: 'description', servicio: 'build_circle', stock: 'inventory_2', prestamo: 'handyman' })[alert.tipo] || 'notifications'; }

function resolveAlertLink(alert) {
  const target = alert.link?.name || 'fleet';
  
  if (target === 'fleet' || alert.entidad?.kind === 'vehiculo') {
    return {
      path: '/fleet',
      query: {
        vehiculo_id: alert.entidad?.id,
        placa: alert.entidad?.label,
      },
    };
  }

  if (target === 'inventory' || alert.entidad?.kind === 'producto') {
    return {
      path: '/inventory',
      query: {
        search: alert.entidad?.label,
      },
    };
  }

  if (target === 'loans' || alert.entidad?.kind === 'prestamo') {
    return {
      path: '/loans',
      query: {
        id: alert.entidad?.id,
      },
    };
  }

  return { name: target };
}
</script>

<style scoped>
.alerts-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.alert-item {
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

.alert-item:hover {
  background: var(--primary-10);
}

.alert-item:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

.alert-item__avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--surface-3);
  flex-shrink: 0;
}

.alert-item__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.alert-item__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--primary);
  font-size: 20px;
  flex-shrink: 0;
}

.alert-item__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.alert-item__content strong {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-item__content span {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-item__severity {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.alert-item--vencido .alert-item__severity {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.alert-item--proximo .alert-item__severity {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.alert-item--informativo .alert-item__severity {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.alerts-overflow {
  padding: 8px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--bg-dark);
}

.alerts-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #10b981;
  font-size: 0.85rem;
  font-weight: 600;
  flex: 1;
}

.alerts-empty .material-icons-round {
  font-size: 32px;
}
</style>
