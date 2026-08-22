<template>
  <div class="table-container">
    <!-- Table Header (Top row: Title, metrics & Action buttons; Bottom row: Search & Filters) -->
    <div class="table-header history-header">
      <!-- Row 1: Title + Badges + Refresh -->
      <div class="history-header-top">
        <div class="history-title-group">
          <h3 class="table-title history-title">
            <span class="material-icons-round history-icon">manage_history</span>
            CENTRO DE AUDITORÍA & HISTORIAL
          </h3>
          <div class="history-badges">
            <span class="badge badge-neutral">Total: {{ allEvents.length }}</span>
            <span class="badge badge-info">Filtrados: {{ filteredEvents.length }}</span>
            <span class="badge badge-warning">Usuarios: {{ uniqueUsersCount }}</span>
            <span class="badge badge-success">Última: {{ lastActivityLabel }}</span>
          </div>
        </div>

        <button class="btn btn-secondary btn-sm" @click="loadData" :disabled="loading">
          <span class="material-icons-round" :class="{ 'spin-icon': loading }" style="font-size: 18px;">refresh</span>
          {{ loading ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </div>

      <!-- Row 2: Search + Filter Selects -->
      <div class="history-controls-bar">
        <div class="table-search history-search">
          <span class="material-icons-round">search</span>
          <input
            v-model="search"
            type="text"
            placeholder="Buscar por usuario, referencia, título..."
          />
          <button v-if="search" class="btn-clear-search" @click="search = ''">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <select class="input filter-select" v-model="selectedModule">
          <option value="Todos">Todos los módulos</option>
          <option value="Inventario">Inventario</option>
          <option value="Taller">Taller</option>
          <option value="Flota">Flota</option>
        </select>

        <select class="input filter-select" v-model="selectedAction">
          <option value="Todas">Todas las acciones</option>
          <option value="Reversiones">Reversión / Reajuste</option>
          <option value="Crear">Crear</option>
          <option value="Actualizar">Actualizar</option>
          <option value="Eliminar">Eliminar</option>
          <option value="Estado">Estado</option>
          <option value="Sesion">Sesión</option>
        </select>

        <select class="input filter-select" v-model="selectedRange">
          <option value="all">Todo el historial</option>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
        </select>

        <div class="history-user-picker">
          <SearchableSelect
            :items="['Todos', ...users]"
            v-model="selectedUser"
            placeholder="Todos los usuarios"
            empty-text="No se encontraron usuarios"
          />
        </div>
      </div>
    </div>

    <!-- Table Scroll Container -->
    <div class="table-scroll">
      <table v-if="!loading && !error && filteredEvents.length > 0" class="history-table">
        <thead>
          <tr>
            <th class="col-fecha">FECHA</th>
            <th class="col-modulo">MÓDULO</th>
            <th class="col-accion">ACCIÓN</th>
            <th class="col-usuario">USUARIO</th>
            <th class="col-titulo">TÍTULO</th>
            <th class="col-desc">DESCRIPCIÓN</th>
            <th class="col-ref">REFERENCIA</th>
            <th class="col-toggle"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="event in filteredEvents" :key="event.id">
            <tr
              class="history-row"
              :class="{
                'history-row--expanded': expandedIds.has(event.id),
                'history-row--reversal': event.isReversal,
              }"
              @click="toggleExpand(event.id)"
            >
              <td class="cell-fecha">{{ formatDate(event.timestamp) }}</td>
              <td class="cell-modulo">
                <span class="badge badge-neutral">{{ event.module }}</span>
              </td>
              <td class="cell-accion">
                <span class="badge" :class="actionBadgeClass(event.action)">{{ event.action }}</span>
              </td>
              <td class="cell-usuario" :title="event.user">{{ event.user }}</td>
              <td class="cell-titulo" :title="event.title">{{ event.title }}</td>
              <td class="cell-desc" :title="event.description">{{ event.description }}</td>
              <td class="cell-ref">
                <div class="ref-wrapper">
                  <span class="ref-badge">{{ event.reference || '—' }}</span>
                  <span v-if="event.reversalId" class="reversal-pill" title="Revierte transacción original">
                    ↩ MOV-{{ event.reversalId }}
                  </span>
                </div>
              </td>
              <td class="cell-toggle">
                <button
                  type="button"
                  class="btn-chevron"
                  :class="{ 'btn-chevron--active': expandedIds.has(event.id) }"
                  :title="expandedIds.has(event.id) ? 'Contraer detalle' : 'Expandir trazabilidad'"
                  @click.stop="toggleExpand(event.id)"
                >
                  <span class="material-icons-round">{{ expandedIds.has(event.id) ? 'expand_less' : 'expand_more' }}</span>
                </button>
              </td>
            </tr>

            <!-- Accordion Detail Row -->
            <tr v-if="expandedIds.has(event.id)" :key="`${event.id}_detail`" class="history-detail-row">
              <td colspan="8" class="history-detail-cell">
                <div class="trace-panel">
                  <div class="trace-panel__header">
                    <div class="trace-panel__title">
                      <span class="material-icons-round">account_tree</span>
                      <strong>Trazabilidad y Auditoría de Operación</strong>
                    </div>
                    <div class="trace-panel__status">
                      <span v-if="event.isReversal" class="badge badge-reversal">Contraasiento / Reversión</span>
                      <span v-else-if="event.action === 'Reajuste'" class="badge badge-adjustment">Reajuste de Kardex</span>
                      <span v-else class="badge badge-neutral">{{ event.action }}</span>
                    </div>
                  </div>

                  <div class="trace-cards-grid">
                    <!-- Card 1: Registro Actual -->
                    <div class="trace-card trace-card--current">
                      <div class="trace-card__header">
                        <span class="material-icons-round">history_edu</span>
                        <span>Movimiento Actual ({{ event.reference }})</span>
                      </div>
                      <div class="trace-card__content">
                        <div class="trace-item">
                          <span class="trace-k">Operación:</span>
                          <span class="trace-v font-bold text-primary">
                            {{ (event.raw?.transaccion_tipo || event.action || 'movimiento').toUpperCase() }} · {{ event.raw?.transaccion_cantidad || 0 }} unid
                          </span>
                        </div>
                        <div class="trace-item">
                          <span class="trace-k">Motivo:</span>
                          <span class="trace-v">{{ event.raw?.transaccion_motivo || event.title }}</span>
                        </div>
                        <div v-if="event.raw?.transaccion_notas" class="trace-item">
                          <span class="trace-k">Notas de Auditoría:</span>
                          <span class="trace-v text-notes">{{ event.raw?.transaccion_notas }}</span>
                        </div>
                        <div class="trace-item">
                          <span class="trace-k">Usuario & Fecha:</span>
                          <span class="trace-v">{{ event.user }} · {{ formatDate(event.timestamp) }}</span>
                        </div>
                        <div v-if="event.raw?.bodega?.nombre" class="trace-item">
                          <span class="trace-k">Bodega:</span>
                          <span class="trace-v">{{ event.raw?.bodega?.nombre }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Card 2: Registro Original Revertido -->
                    <div v-if="event.isReversal || event.reversalId || event.revertedTransaction" class="trace-card trace-card--reversal">
                      <div class="trace-card__header text-danger">
                        <span class="material-icons-round">undo</span>
                        <span>Registro Original Revertido (MOV-{{ event.reversalId || event.revertedTransaction?.transaccion_id }})</span>
                      </div>
                      <div class="trace-card__content">
                        <template v-if="event.revertedTransaction">
                          <div class="trace-item">
                            <span class="trace-k">Producto:</span>
                            <span class="trace-v font-semibold">{{ event.revertedTransaction.producto?.producto_nombre || 'Producto' }}</span>
                          </div>
                          <div class="trace-item">
                            <span class="trace-k">Operación Original:</span>
                            <span class="trace-v text-danger font-bold">
                              {{ (event.revertedTransaction.transaccion_tipo || 'salida').toUpperCase() }}: {{ event.revertedTransaction.transaccion_cantidad }} unid
                            </span>
                          </div>
                          <div class="trace-item">
                            <span class="trace-k">Motivo Original:</span>
                            <span class="trace-v">{{ event.revertedTransaction.transaccion_motivo || '—' }}</span>
                          </div>
                          <div v-if="event.revertedTransaction.transaccion_notas" class="trace-item">
                            <span class="trace-k">Notas Originales:</span>
                            <span class="trace-v text-notes">{{ event.revertedTransaction.transaccion_notas }}</span>
                          </div>
                          <div class="trace-item">
                            <span class="trace-k">Creado por:</span>
                            <span class="trace-v">{{ event.revertedTransaction.usuario?.name || 'Sistema' }} · {{ formatDate(event.revertedTransaction.created_at) }}</span>
                          </div>
                        </template>
                        <template v-else>
                          <p class="trace-empty-notice">
                            Este movimiento es un contraasiento generado para revertir y cuadrar contablemente la transacción <strong>MOV-{{ event.reversalId }}</strong>.
                          </p>
                        </template>
                      </div>
                    </div>

                    <!-- Card 3: Entidad Vinculada -->
                    <div v-if="event.raw?.transaccion_referencia_type" class="trace-card trace-card--entity">
                      <div class="trace-card__header text-info">
                        <span class="material-icons-round">link</span>
                        <span>Entidad Relacionada</span>
                      </div>
                      <div class="trace-card__content">
                        <div class="trace-item">
                          <span class="trace-k">Entidad:</span>
                          <span class="trace-v font-bold text-info">{{ event.raw.transaccion_referencia_type }} #{{ event.raw.transaccion_referencia_id }}</span>
                        </div>
                        <p class="trace-empty-notice">
                          La transacción impacta directamente el historial y consumo de esta entidad en el sistema.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div v-else-if="loading" class="page-loading">
        <span class="spinner"></span>
        Cargando centro de actividad y auditoría...
      </div>

      <div v-else-if="error" class="empty-state">
        <span class="material-icons-round">cloud_off</span>
        <p>{{ error }}</p>
      </div>

      <div v-else class="empty-state">
        <span class="material-icons-round">history_toggle_off</span>
        <p>No se encontraron eventos para los filtros seleccionados</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useAsyncState } from '../../../shared/composables/useAsyncState';
import { fetchHistorySources } from '../api/historyService';
import { useRefresh } from '../../../shared/composables/useRefresh';
import SearchableSelect from '../../../shared/components/SearchableSelect.vue';

const { refreshTrigger } = useRefresh();

const { loading, error, run } = useAsyncState('');
const allEvents = ref([]);
const expandedIds = ref(new Set());

const search = ref('');
const selectedModule = ref('Todos');
const selectedAction = ref('Todas');
const selectedRange = ref('all');
const selectedUser = ref('Todos');

onMounted(async () => {
  await loadData();
});

watch(refreshTrigger, loadData);

function toggleExpand(id) {
  const next = new Set(expandedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expandedIds.value = next;
}

async function loadData() {
  try {
    await run(async () => {
      const { movimientos, ordenes, combustible, prestamos } = await fetchHistorySources();

      const events = [
        ...mapMovements(movimientos),
        ...mapWorkOrders(ordenes),
        ...mapFuel(combustible),
        ...mapLoans(prestamos),
      ];

      events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      allEvents.value = events;
    }, 'Error cargando historial');
  } catch {
    // handled by composable
  }
}

const users = computed(() => {
  const set = new Set(allEvents.value.map((e) => e.user).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b));
});

const uniqueUsersCount = computed(() => users.value.length);

const lastActivityLabel = computed(() => {
  if (!allEvents.value.length) return '--';
  return formatDate(allEvents.value[0].timestamp);
});

const filteredEvents = computed(() => {
  const q = search.value.trim().toLowerCase();
  const from = rangeStartDate(selectedRange.value);

  return allEvents.value.filter((event) => {
    const matchesModule = selectedModule.value === 'Todos' || event.module === selectedModule.value;
    const matchesAction = selectedAction.value === 'Todas' 
      || (selectedAction.value === 'Reversiones' 
            ? (event.action === 'Reversión' || event.action === 'Reajuste') 
            : event.action === selectedAction.value);
    const matchesUser = selectedUser.value === 'Todos' || event.user === selectedUser.value;

    const eventDate = new Date(event.timestamp);
    const matchesRange = !from || eventDate >= from;

    const matchesSearch =
      !q ||
      event.title.toLowerCase().includes(q) ||
      event.description.toLowerCase().includes(q) ||
      event.user.toLowerCase().includes(q) ||
      (event.reference || '').toLowerCase().includes(q);

    return matchesModule && matchesAction && matchesUser && matchesRange && matchesSearch;
  });
});

function rangeStartDate(range) {
  const now = new Date();
  if (range === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null;
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actionBadgeClass(action) {
  if (action === 'Reversión') return 'badge-reversal';
  if (action === 'Reajuste') return 'badge-adjustment';
  if (action === 'Crear') return 'badge-success';
  if (action === 'Actualizar') return 'badge-info';
  if (action === 'Eliminar') return 'badge-danger';
  if (action === 'Estado') return 'badge-warning';
  if (action === 'Sesion') return 'badge-neutral';
  return 'badge-neutral';
}

function mapMovements(items) {
  return (items || []).map((m) => {
    const tipo = (m.transaccion_tipo || m.tipo || '').toLowerCase();
    const motivo = (m.transaccion_motivo || m.motivo || '').trim();
    const notas = (m.transaccion_notas || m.notas || '').trim();
    
    const isReversal = m.reverses_transaction_id != null 
      || motivo.toLowerCase().includes('revers') 
      || notas.toLowerCase().includes('revers') 
      || notas.toLowerCase().includes('contraasiento');

    const isAdjustment = !isReversal && (
      motivo.toLowerCase().includes('ajust') 
      || notas.toLowerCase().includes('ajust')
    );

    let actionLabel = 'Crear';
    if (isReversal) actionLabel = 'Reversión';
    else if (isAdjustment) actionLabel = 'Reajuste';

    const prodName = m.producto?.producto_nombre || m.producto?.nombre || m.producto_nombre || 'Producto';
    let title = `${(tipo || 'movimiento').toUpperCase()} - ${prodName}`;
    if (isReversal) {
      title = `REVERSIÓN (${(tipo || 'movimiento').toUpperCase()}) - ${prodName}`;
    } else if (isAdjustment) {
      title = `REAJUSTE (${(tipo || 'movimiento').toUpperCase()}) - ${prodName}`;
    }

    const cantidad = m.transaccion_cantidad || m.cantidad || 0;
    const description = motivo ? `${motivo} (${cantidad} unid)` : `Cantidad: ${cantidad} unid`;

    const movId = m.transaccion_id || m.id;
    const reference = movId ? `MOV-${movId}` : '—';

    return {
      id: `mov_${movId || Math.random().toString(36).slice(2)}`,
      module: 'Inventario',
      action: actionLabel,
      user: m.usuario?.name || m.usuario_nombre || m.usuarioNombre || 'Sistema',
      title,
      description,
      timestamp: m.created_at || m.fecha || new Date().toISOString(),
      reference,
      isReversal,
      reversalId: m.reverses_transaction_id,
      revertedTransaction: m.transaccion_revertida || m.transaccionRevertida,
      raw: m,
    };
  });
}

function mapWorkOrders(items) {
  return (items || []).map((o) => ({
    id: `ot_${o.orden_trabajo_id || o.id}`,
    module: 'Taller',
    action: 'Estado',
    user: o.mecanico?.name || o.mecanico_asignado?.name || 'Sistema',
    title: `OT #${o.orden_trabajo_id || o.id} - ${o.vehiculo?.placa || 'Vehículo'}`,
    description: `Estado: ${o.estado || 'N/A'} - ${o.descripcion || 'Sin descripción'}`,
    timestamp: o.fecha_inicio || o.created_at || new Date().toISOString(),
    reference: `OT-${o.orden_trabajo_id || o.id}`,
    isReversal: false,
    raw: o,
  }));
}

function mapFuel(items) {
  return (items || []).map((f) => ({
    id: `fuel_${f.registro_id || f.id || Math.random().toString(36).slice(2)}`,
    module: 'Flota',
    action: 'Crear',
    user: f.usuario?.name || f.usuario_nombre || f.usuarioNombre || f.responsable?.name || 'Sistema',
    title: `Combustible - ${f.vehiculo?.placa || f.vehiculo_placa || 'N/A'}`,
    description: `${f.galones || f.cantidad_galones || 0} gal - ${f.estacion_servicio || f.estacionServicio || 'Estación'}`,
    timestamp: f.fecha || f.created_at || new Date().toISOString(),
    reference: `FUEL-${f.registro_id || f.id || '-'}`,
    isReversal: false,
    raw: f,
  }));
}

function mapLoans(items) {
  return (items || []).map((l) => ({
    id: `loan_${l.prestamo_id || l.id || Math.random().toString(36).slice(2)}`,
    module: 'Inventario',
    action: 'Sesion',
    user: l.admin?.name || l.admin_nombre || l.adminNombre || 'Admin',
    title: `Préstamo - ${l.producto?.producto_nombre || l.producto?.nombre || l.producto_nombre || 'Herramienta'}`,
    description: `${l.prestamo_cantidad || l.cantidad || 0} unid a ${l.mecanico?.name || l.mecanico_nombre || l.mecanicoNombre || 'Mecánico'}`,
    timestamp: l.fecha_prestamo || l.created_at || new Date().toISOString(),
    reference: `PREST-${l.prestamo_id || l.id || '-'}`,
    isReversal: false,
    raw: l,
  }));
}
</script>

<style scoped>
.history-header {
  gap: 12px;
  flex-direction: column;
  align-items: stretch;
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--surface-2);
}

.history-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.history-title-group {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1.1rem;
}

.history-icon {
  color: var(--primary);
  font-size: 22px;
}

.history-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.history-controls-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.history-search {
  flex: 1 1 240px;
  min-width: 200px;
  max-width: 340px;
}

.btn-clear-search {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0;
}

.btn-clear-search:hover {
  color: var(--text-main);
}

.filter-select {
  flex: 1 1 120px;
  min-width: 110px;
  height: 38px;
}

.history-user-picker {
  flex: 1 1 160px;
  min-width: 150px;
  position: relative;
  z-index: 20;
}

/* --- Table Styles --- */
.history-table {
  width: 100%;
  border-collapse: collapse;
}

.col-fecha { width: 135px; }
.col-modulo { width: 100px; }
.col-accion { width: 110px; }
.col-usuario { width: 115px; }
.col-titulo { width: 190px; }
.col-desc { width: auto; }
.col-ref { width: 125px; }
.col-toggle { width: 40px; text-align: center; }

.history-row {
  cursor: pointer;
  transition: background 0.15s ease;
  border-bottom: 1px solid var(--surface-2);
}

.history-row:hover {
  background: var(--primary-10) !important;
}

.history-row--expanded {
  background: var(--surface-2) !important;
  border-bottom: none !important;
}

.history-row--reversal {
  border-left: 3px solid #c084fc;
}

.cell-fecha {
  white-space: nowrap;
  font-size: 0.8rem;
}

.cell-modulo, .cell-accion {
  white-space: nowrap;
}

.cell-usuario {
  color: var(--text-main) !important;
  font-weight: 500;
  white-space: nowrap;
  max-width: 115px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-titulo {
  color: var(--text-main) !important;
  font-weight: 600;
  white-space: nowrap;
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-desc {
  white-space: nowrap;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-ref {
  white-space: nowrap;
}

.ref-wrapper {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
}

.cell-toggle {
  text-align: center;
  padding: 6px !important;
}

.ref-badge {
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main);
}

.reversal-pill {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.4);
}

.btn-chevron {
  background: transparent;
  border: 1px solid var(--surface-3);
  color: var(--text-secondary);
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-chevron:hover, .btn-chevron--active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

/* --- Accordion Detail Row & Cards --- */
.history-detail-row {
  background: var(--surface-2) !important;
}

.history-detail-cell {
  padding: 0 !important;
  border-bottom: 2px solid var(--surface-3) !important;
  white-space: normal !important;
}

.trace-panel {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
}

.trace-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.trace-panel__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: var(--text-main);
}

.trace-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
}

.trace-card {
  background: var(--surface);
  border: 1px solid var(--surface-3);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  box-sizing: border-box;
}

.trace-card--reversal {
  border-color: rgba(248, 113, 113, 0.35);
  background: rgba(239, 68, 68, 0.03);
}

.trace-card--entity {
  border-color: rgba(56, 189, 248, 0.35);
}

.trace-card__header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--text-main);
  border-bottom: 1px solid var(--surface-2);
  padding-bottom: 6px;
}

.trace-card__content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8rem;
}

.trace-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.trace-k {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.76rem;
  white-space: nowrap;
}

.trace-v {
  color: var(--text-main);
  text-align: right;
  word-break: break-word;
}

.text-notes {
  font-style: italic;
  color: var(--text-secondary);
  max-width: 220px;
}

.trace-empty-notice {
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1.4;
  margin: 4px 0 0 0;
}

/* --- Badges & Utilities --- */
.badge-reversal {
  background: rgba(168, 85, 247, 0.2) !important;
  color: #c084fc !important;
  border: 1px solid rgba(168, 85, 247, 0.5) !important;
  font-weight: 700 !important;
  letter-spacing: 0.4px;
  box-shadow: 0 0 8px rgba(168, 85, 247, 0.25);
}

.badge-adjustment {
  background: rgba(56, 189, 248, 0.18) !important;
  color: #38bdf8 !important;
  border: 1px solid rgba(56, 189, 248, 0.45) !important;
  font-weight: 700 !important;
  letter-spacing: 0.4px;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.2);
}

.text-primary { color: var(--primary) !important; }
.text-danger { color: #f87171 !important; }
.text-info { color: #38bdf8 !important; }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
