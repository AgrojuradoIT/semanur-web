<template>
  <PanelShell title="Centro de Control · Taller en Vivo" icon="engineering" :badge="total" to="work-orders" data-testid="live-panel">
    <div class="control-center">
      <!-- Telemetry Bar -->
      <div class="control-center__bar">
        <div class="control-center__live-badge">
          <span class="live-pulse"></span>
          <span class="live-text">OPERACIONES EN TIEMPO REAL</span>
        </div>
        <span v-if="total > 0" class="control-center__active-count">
          {{ total }} bahía{{ total === 1 ? '' : 's' }} activa{{ total === 1 ? '' : 's' }}
        </span>
      </div>

      <!-- Telemetry Status Grid -->
      <ul class="live-statuses" role="list" aria-label="Estados de órdenes de trabajo">
        <li
          v-for="status in statuses"
          :key="status.label"
          class="live-status"
          :class="`live-status--${statusTone(status.label)}`"
          data-testid="live-status"
        >
          <div class="live-status__header">
            <span class="live-status__dot"></span>
            <span class="live-status__label">{{ status.label }}</span>
          </div>
          <strong class="live-status__count">{{ status.count }}</strong>
        </li>
      </ul>

      <!-- Active Workstation Sessions -->
      <div class="control-center__section-title">
        <span class="material-icons-round" aria-hidden="true">precision_manufacturing</span>
        <span>BAHÍAS DE TRABAJO ACTIVAS</span>
      </div>

      <ul v-if="visibleSessions.length" class="live-sessions" role="list" aria-label="Sesiones activas">
        <li v-for="session in visibleSessions" :key="session.sesion_id">
          <RouterLink :to="{ name: 'work-orders' }" class="live-session" data-testid="live-session">
            <div class="live-session__avatar">
              <span class="material-icons-round live-session__icon" aria-hidden="true">build_circle</span>
              <span class="live-session__online-dot"></span>
            </div>
            <div class="live-session__content">
              <div class="live-session__mechanic">
                <strong>{{ session.empleado?.nombre || 'Mecánico asignado' }}</strong>
              </div>
              <div class="live-session__meta">
                <span class="live-session__vehicle-badge">
                  <span class="material-icons-round" aria-hidden="true">directions_car</span>
                  {{ session.ordenTrabajo?.vehiculo?.placa || 'Sin vehículo' }}
                </span>
                <span v-if="session.ordenTrabajo?.orden_trabajo_id" class="live-session__ot-id">
                  OT #{{ session.ordenTrabajo.orden_trabajo_id }}
                </span>
              </div>
            </div>
            <div class="live-session__timer" :class="{ 'live-session__timer--extended': session.elapsed_min > 45 }">
              <span class="material-icons-round" aria-hidden="true">timer</span>
              <time class="live-session__time">{{ elapsedLabel(session.elapsed_min) }}</time>
            </div>
          </RouterLink>
        </li>
      </ul>

      <div v-else class="live-empty" data-testid="live-empty">
        <span class="material-icons-round live-empty__icon" aria-hidden="true">check_circle_outline</span>
        <div class="live-empty__text">
          <strong>Bahías libres</strong>
          <span>Sin sesiones activas en este momento</span>
        </div>
      </div>
    </div>
  </PanelShell>
</template>

<script setup>
import { computed } from 'vue';
import PanelShell from './PanelShell.vue';

const props = defineProps({
  porEstado: { type: Object, default: () => ({}) },
  sessions: { type: Object, default: () => ({ total: 0, items: [] }) },
});

const statuses = computed(() => ['Abierta', 'En Progreso', 'Pendiente Auditoria', 'Aprobada']
  .map((label) => ({ label, count: Number(props.porEstado?.[label] || 0) })));
const total = computed(() => Number(props.sessions?.total || 0));
const visibleSessions = computed(() => (Array.isArray(props.sessions?.items) ? props.sessions.items : []).slice(0, 8));

function elapsedLabel(value) { return `${Number(value || 0)} min`; }

function statusTone(label) {
  switch (label) {
    case 'Abierta': return 'open';
    case 'En Progreso': return 'progress';
    case 'Pendiente Auditoria': return 'audit';
    case 'Aprobada': return 'approved';
    default: return 'neutral';
  }
}
</script>

<style scoped>
.control-center {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px;
}

.control-center__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--surface) 90%, var(--primary) 10%);
  border: 1px solid var(--surface-2);
  border-radius: 8px;
}

.control-center__live-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-pulse {
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  animation: pulse-ring 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

.live-text {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: var(--text-main);
  text-transform: uppercase;
}

.control-center__active-count {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-10);
  padding: 2px 8px;
  border-radius: 12px;
}

.live-statuses {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.live-status {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.live-status:hover {
  border-color: var(--surface-3);
  transform: translateY(-1px);
}

.live-status__header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.live-status__dot {
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
}

.live-status--open .live-status__dot { background: #3b82f6; }
.live-status--progress .live-status__dot { background: #10b981; }
.live-status--audit .live-status__dot { background: #f59e0b; }
.live-status--approved .live-status__dot { background: #8b5cf6; }

.live-status__label {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.live-status__count {
  font-family: 'Oswald', sans-serif;
  font-size: 1.25rem;
  line-height: 1;
  color: var(--text-main);
}

.control-center__section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.7px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.control-center__section-title span.material-icons-round {
  font-size: 14px;
  color: var(--primary);
}

.live-sessions {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.live-session {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-block-size: 58px;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 10px;
  color: var(--text-main);
  text-decoration: none;
  transition: all 0.2s ease;
}

.live-session:hover {
  background: color-mix(in srgb, var(--surface) 92%, var(--primary) 8%);
  border-color: var(--surface-3);
  transform: translateY(-1px);
}

.live-session:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

.live-session__avatar {
  position: relative;
  display: grid;
  place-items: center;
}

.live-session__icon {
  font-size: 24px;
  color: var(--primary);
}

.live-session__online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: #10b981;
  border: 2px solid var(--surface);
}

.live-session__content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-inline-size: 0;
}

.live-session__mechanic strong {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
}

.live-session__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-session__vehicle-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  background: var(--surface-2);
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.4px;
  color: var(--primary);
}

.live-session__vehicle-badge span.material-icons-round {
  font-size: 12px;
}

.live-session__ot-id {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.live-session__timer {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--primary-10);
  border-radius: 6px;
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 800;
}

.live-session__timer span.material-icons-round {
  font-size: 14px;
}

.live-session__timer--extended {
  background: var(--warning-10);
  color: #f59e0b;
}

.live-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  min-block-size: 80px;
  padding: 16px;
  background: var(--surface);
  border: 1px dashed var(--surface-2);
  border-radius: 10px;
  color: var(--text-secondary);
}

.live-empty__icon {
  font-size: 28px;
  color: #10b981;
}

.live-empty__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.live-empty__text strong {
  font-size: 0.85rem;
  color: var(--text-main);
}

.live-empty__text span {
  font-size: 0.75rem;
}
</style>
