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
        <span class="alert-item__icon material-icons-round" aria-hidden="true">{{ iconFor(alert) }}</span>
        <span class="alert-item__content">
          <strong>{{ alert.entidad?.label || 'Alerta operativa' }}</strong>
          <span>{{ alert.detalle || 'Requiere revisión' }}</span>
        </span>
        <span class="alert-item__severity">{{ severityLabel(alert.severity) }}</span>
      </RouterLink>
      <span v-if="overflow" class="alerts-overflow" data-testid="alerts-overflow">+{{ overflow }}</span>
    </div>
    <div v-else class="alerts-empty" data-testid="alerts-empty">
      <span class="material-icons-round" aria-hidden="true">check_circle</span>
      Sin alertas activas
    </div>
  </PanelShell>
</template>

<script setup>
import { computed } from 'vue';
import PanelShell from './PanelShell.vue';

const props = defineProps({
  alerts: { type: Object, default: () => ({ items: [], total: 0 }) },
});

const severityRank = { vencido: 0, proximo: 1, informativo: 2 };
const orderedItems = computed(() => [...(Array.isArray(props.alerts?.items) ? props.alerts.items : [])]
  .sort((left, right) => (severityRank[left.severity] ?? 2) - (severityRank[right.severity] ?? 2))
  .slice(0, 5));
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
.alerts-list { display: flex; flex-direction: column; }
.alert-item { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; min-block-size: 56px; padding: 12px 16px; color: var(--text-main); text-decoration: none; border-bottom: 1px solid var(--surface-2); }
.alert-item:hover { background: var(--primary-10); }
.alert-item:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
.alert-item__icon { color: #fbbf24; }
.alert-item--vencido .alert-item__icon, .alert-item--vencido .alert-item__severity { color: #fca5a5; }
.alert-item--proximo .alert-item__severity { color: #fde68a; }
.alert-item__content { display: grid; gap: 2px; min-inline-size: 0; }
.alert-item__content strong, .alert-item__content span { overflow-wrap: anywhere; }
.alert-item__content span { color: var(--text-secondary); font-size: .78rem; }
.alert-item__severity { color: var(--text-secondary); font-size: .68rem; font-weight: 800; text-transform: uppercase; }
.alerts-overflow { align-self: center; margin: 12px; color: var(--text-secondary); font-size: .75rem; font-weight: 800; }
.alerts-empty { display: flex; align-items: center; justify-content: center; gap: 8px; min-block-size: 128px; padding: 20px; color: #86efac; font-weight: 700; }
</style>
