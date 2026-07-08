<template>
  <div v-if="visible && schedule" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal modal-detail">
      <div class="modal-header">
        <h3>DETALLE DE PROGRAMACIÓN</h3>
        <button class="modal-close" @click="$emit('close')">
          <span class="material-icons-round" style="font-size: 18px">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Banner de Labor -->
        <div class="labor-banner">
          <div class="labor-icon-wrapper">
            <span class="material-icons-round labor-icon">assignment</span>
          </div>
          <div class="labor-meta">
            <h4 class="labor-title">{{ schedule.labor || 'Sin labor' }}</h4>
            <span class="labor-subtitle">Actividad asignada</span>
          </div>
          <span class="status-badge" :class="statusInfo.class">
            {{ statusInfo.label }}
          </span>
        </div>

        <!-- Grilla de Detalles -->
        <div class="details-grid">
          <div class="detail-item detail-item--clickable" @click="$emit('employee-click', schedule.empleado_id || schedule.empleado?.id)">
            <span class="material-icons-round detail-icon">person</span>
            <div class="detail-content">
              <span class="detail-label">Empleado</span>
              <span class="detail-value">{{ scheduleEmployeeLabel(schedule) }}</span>
            </div>
          </div>

          <div class="detail-item">
            <span class="material-icons-round detail-icon">event</span>
            <div class="detail-content">
              <span class="detail-label">Fecha de Ejecución</span>
              <span class="detail-value">{{ scheduleDateLabel(schedule) }}</span>
            </div>
          </div>

          <div class="detail-item">
            <span class="material-icons-round detail-icon">local_shipping</span>
            <div class="detail-content">
              <span class="detail-label">Vehículo</span>
              <span class="detail-value">{{ scheduleVehicleLabel(schedule) }}</span>
            </div>
          </div>

          <div class="detail-item">
            <span class="material-icons-round detail-icon">place</span>
            <div class="detail-content">
              <span class="detail-label">Ubicación</span>
              <span class="detail-value">{{ schedule.ubicacion || 'No especificada' }}</span>
            </div>
          </div>
        </div>

        <!-- Tarjeta de OT Vinculada -->
        <div v-if="schedule.orden_trabajo || schedule.orden_trabajo_id" class="ot-card">
          <div class="ot-card-body">
            <div class="ot-icon-wrapper">
              <span class="material-icons-round ot-icon">build_circle</span>
            </div>
            <div class="ot-details">
              <span class="ot-label">Orden de Trabajo Vinculada</span>
              <span class="ot-value">OT #{{ schedule.orden_trabajo?.orden_trabajo_id || schedule.orden_trabajo_id }}</span>
            </div>
            <span v-if="schedule.orden_trabajo?.estado" class="ot-status-badge" :class="otStatusClass">
              {{ schedule.orden_trabajo.estado }}
            </span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Cerrar</button>
        <button v-if="authStore.hasPermission('personal.write')" class="btn btn-primary-outline" @click="$emit('edit')">
          <span class="material-icons-round" style="font-size: 16px; margin-right: 4px;">edit</span>
          Editar
        </button>
        <button v-if="authStore.hasPermission('personal.write')" class="btn btn-danger-outline" :disabled="deleting" @click="$emit('delete')">
          <span class="material-icons-round" style="font-size: 16px; margin-right: 4px;">delete</span>
          {{ deleting ? 'ELIMINANDO...' : 'Eliminar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../../../shared/stores/auth';

const props = defineProps({
  visible: { type: Boolean, required: true },
  schedule: { type: Object, default: null },
  deleting: { type: Boolean, required: true },
  scheduleEmployeeLabel: { type: Function, required: true },
  scheduleDateLabel: { type: Function, required: true },
  scheduleVehicleLabel: { type: Function, required: true },
});

defineEmits(['close', 'edit', 'delete', 'employee-click']);

const authStore = useAuthStore();

const statusInfo = computed(() => {
  const state = String(props.schedule?.estado || 'pendiente').toLowerCase();
  const isIssue = props.schedule?.es_novedad === true || state === 'novedad' || state === 'pausado';
  
  if (isIssue) {
    return { label: 'Novedad / Pausado', class: 'status--issue' };
  }
  if (state === 'completado' || state === 'cerrado') {
    return { label: 'Completado', class: 'status--done' };
  }
  return { label: 'Pendiente', class: 'status--pending' };
});

const otStatusClass = computed(() => {
  const state = String(props.schedule?.orden_trabajo?.estado || '').toLowerCase();
  if (state === 'completada' || state === 'cerrada' || state === 'finalizada' || state === 'completado') return 'ot-status--done';
  if (state === 'en proceso' || state === 'ejecucion' || state === 'abierta') return 'ot-status--progress';
  return 'ot-status--pending';
});
</script>

<style scoped>
.modal-detail {
  width: 520px !important;
  height: auto !important;
  max-height: 95vh !important;
  overflow: hidden !important;
}

.modal-detail .modal-body {
  overflow-y: visible !important;
  padding-bottom: 8px;
}

/* Banner de Labor */
.labor-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--surface-2);
  border: 1px solid var(--surface-3);
  padding: 16px;
  border-radius: var(--radius-lg);
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.labor-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: var(--primary-10);
  color: var(--primary);
  border-radius: 12px;
  flex-shrink: 0;
}

.labor-icon {
  font-size: 22px;
}

.labor-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.labor-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  word-break: break-word;
}

.labor-subtitle {
  font-size: 0.78rem;
  color: var(--text-gray);
  font-weight: 500;
}

/* Badges de estado */
.status-badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.status--done {
  background: var(--success-10);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.status--issue {
  background: var(--danger-10);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.status--pending {
  background: var(--warning-10);
  color: var(--warning);
  border: 1px solid rgba(245, 158, 11, 0.2);
}

/* Grilla de Detalles */
.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-dark);
  border: 1px solid var(--surface-2);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.detail-item:hover:not(.detail-item--clickable) {
  border-color: var(--surface-3);
}

.detail-item--clickable {
  cursor: pointer;
}

.detail-item--clickable:hover {
  border-color: var(--primary-20, rgba(255, 214, 0, 0.2));
  background: var(--primary-10, rgba(255, 214, 0, 0.08));
}

.detail-item--clickable:hover .detail-value {
  color: var(--primary);
}

.detail-icon {
  font-size: 20px;
  color: var(--text-gray);
  margin-top: 2px;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.detail-label {
  font-size: 0.7rem;
  color: var(--text-gray);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-main);
  word-break: break-word;
  line-height: 1.3;
}

/* Tarjeta de OT Vinculada */
.ot-card {
  background: var(--surface-2);
  border: 1px solid var(--surface-3);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  margin-top: 10px;
  transition: transform 0.2s ease, border-color 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.ot-card:hover {
  transform: translateY(-1px);
  border-color: var(--primary-10);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

.ot-card-body {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ot-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--primary-10);
  color: var(--primary);
  border-radius: 10px;
  flex-shrink: 0;
}

.ot-icon {
  font-size: 18px;
}

.ot-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.ot-label {
  font-size: 0.72rem;
  color: var(--text-gray);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ot-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--primary);
}

.ot-status-badge {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.ot-status--done {
  background: var(--success-10);
  color: var(--success);
}

.ot-status--progress {
  background: var(--info-10);
  color: var(--info);
}

.ot-status--pending {
  background: var(--warning-10);
  color: var(--warning);
}

/* Estilos de botones adicionales para el footer */
.btn-primary-outline {
  background: transparent;
  border: 1px solid var(--primary);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary-outline:hover {
  background: var(--primary-10);
}

.btn-danger-outline {
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-danger-outline:hover:not(:disabled) {
  background: var(--danger-10);
}

.btn-danger-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 520px) {
  .modal-detail {
    width: 95vw !important;
  }
  .details-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
