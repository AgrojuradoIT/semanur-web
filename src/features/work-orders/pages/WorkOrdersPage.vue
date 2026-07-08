<template>
  <div class="table-container">
    <div class="table-header">
      <div style="display: flex; align-items: center; gap: var(--sp-md); flex-wrap: wrap">
        <h3 class="table-title">ORDENES DE TRABAJO</h3>
        <div class="filter-chips">
          <button
            v-for="chip in statusFilters"
            :key="chip.value"
            class="chip"
            :class="{ active: selectedStatus === chip.value }"
            @click="selectedStatus = chip.value"
          >
            {{ chip.label }}
          </button>
        </div>
      </div>
      <div class="table-actions">
        <div class="table-search">
          <span class="material-icons-round">search</span>
          <input v-model="search" type="text" placeholder="Buscar por descripcion o vehiculo..." />
        </div>
        <button v-if="authStore.hasPermission('taller.write')" class="btn btn-primary btn-sm" @click="openCreateModal">
          <span class="material-icons-round" style="font-size: 18px">add_circle</span>
          NUEVA ORDEN
        </button>
      </div>
    </div>

    <div class="table-scroll">
      <table v-if="!loading && !error && filteredOrders.length > 0">
        <thead>
          <tr>
            <th>ID</th>
            <th>VEHICULO</th>
            <th>DESCRIPCION</th>
            <th>ESTADO</th>
            <th>PRIORIDAD</th>
            <th>MECANICO</th>
            <th>INICIO</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in filteredOrders" :key="orderId(order)" @click="openDetailModal(order)" style="cursor: pointer;">
            <td style="color: var(--primary); font-weight: 700">#{{ orderId(order) }}</td>
            <td style="color: var(--text-main); font-weight: 600">{{ orderVehicle(order) }}</td>
            <td style="max-width: 300px; white-space: normal; line-height: 1.4">{{ orderDescription(order) }}</td>
            <td>
              <span class="badge" :class="statusBadgeClass(orderStatus(order))">{{ orderStatus(order) }}</span>
            </td>
            <td>
              <span class="badge" :class="priorityBadgeClass(orderPriority(order))">{{ orderPriority(order) }}</span>
            </td>
            <td>{{ orderMechanic(order) }}</td>
            <td>{{ orderStartDate(order) }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else-if="loading" class="page-loading">
        <span class="spinner"></span>
        Cargando ordenes...
      </div>

      <div v-else-if="error" class="empty-state">
        <span class="material-icons-round">cloud_off</span>
        <p>{{ error }}</p>
      </div>

      <div v-else class="empty-state">
        <span class="material-icons-round">build_circle</span>
        <p>No se encontraron ordenes de trabajo</p>
      </div>
    </div>

    <div class="table-footer">
      Mostrando {{ filteredOrders.length }} orden{{ filteredOrders.length === 1 ? '' : 'es' }}
    </div>
  </div>

  <div v-if="showCreate" class="modal-overlay" @click.self="closeCreateModal">
    <div class="modal modal-wide">
      <div class="modal-header">
        <h3>NUEVA ORDEN DE TRABAJO</h3>
        <button class="modal-close" @click="closeCreateModal">
          <span class="material-icons-round" style="font-size: 18px">close</span>
        </button>
      </div>
      <div class="modal-body">
        <form class="form-grid" @submit.prevent="submitCreate">
          <div class="input-group">
            <label>Vehiculo</label>
            <SearchableSelect
              v-model="createForm.vehiculo_id"
              :items="fleetOptions"
              :label-fn="vehicleOptionLabel"
              :value-fn="vehicleOptionId"
              placeholder="Seleccionar vehiculo..."
            />
          </div>

          <div class="input-group">
            <label>Mecánico Asignado</label>
            <SearchableSelect
              v-model="createForm.mecanico_asignado_id"
              :items="employeeOptions"
              :label-fn="(e) => `${e.nombres} ${e.apellidos || ''}`.trim()"
              placeholder="(Sin asignar)"
              empty-text="No se encontraron mecanicos"
            />
          </div>

          <div class="input-group">
            <label>Prioridad</label>
            <select v-model="createForm.prioridad" class="input" required>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>

          <div class="input-group"></div>

          <div class="input-group full-width">
            <label>Descripcion del trabajo</label>
            <textarea v-model="createForm.descripcion" class="input" rows="4" required placeholder="Describe el trabajo a realizar..."></textarea>
          </div>

          <div class="input-group full-width">
            <label>Evidencia (Foto Opcional)</label>
            <input type="file" @change="onFileChange" accept="image/*" class="input" />
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeCreateModal">Cancelar</button>
        <button class="btn btn-primary" :disabled="savingCreate" @click="submitCreate">
          <span class="material-icons-round" style="font-size: 18px">save</span>
          {{ savingCreate ? 'CREANDO...' : 'CREAR ORDEN' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Status change moved to detail modal -->

  <!-- Detail Modal -->
  <div v-if="showDetailModal && selectedOrder" class="modal-overlay" @click.self="closeDetailModal">
    <div class="modal modal-wide" style="max-width: 800px;">
      <div class="modal-header">
        <h3>DETALLE ORDEN #{{ orderId(selectedOrder) }}</h3>
        <button class="modal-close" @click="closeDetailModal">
          <span class="material-icons-round" style="font-size: 18px">close</span>
        </button>
      </div>
      
      <!-- Action Banner -->
      <div style="background: var(--surface-2); padding: 12px 24px; border-bottom: 1px solid var(--surface-3); display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="badge" :class="statusBadgeClass(orderStatus(selectedOrder))" style="font-size: 0.85rem; padding: 4px 10px;">{{ orderStatus(selectedOrder).toUpperCase() }}</span>
          <span class="badge" :class="priorityBadgeClass(orderPriority(selectedOrder))" style="font-size: 0.85rem; padding: 4px 10px;">{{ orderPriority(selectedOrder).toUpperCase() }}</span>
        </div>
        
        <div style="display: flex; gap: 8px;" v-if="authStore.hasPermission('taller.write') && orderStatus(selectedOrder) !== 'Cerrada'">
          <button 
            v-if="orderStatus(selectedOrder) === 'Abierta'"
            class="btn btn-warning btn-sm"
            @click="submitStatusChange('En Progreso')"
            :disabled="savingStatus || savingSession"
          >
            <span class="material-icons-round" style="font-size: 16px;">play_arrow</span>
            INICIAR TRABAJO
          </button>
          
          <template v-else-if="orderStatus(selectedOrder) === 'En Progreso'">
            <button 
              v-if="activeSession"
              class="btn btn-danger btn-sm"
              @click="handleStopSession"
              :disabled="savingSession || savingStatus"
            >
              <span class="material-icons-round" style="font-size: 16px;">pause</span>
              PAUSAR TRABAJO
            </button>
            <button 
              v-else
              class="btn btn-warning btn-sm"
              @click="handleStartSession"
              :disabled="savingSession || savingStatus"
            >
              <span class="material-icons-round" style="font-size: 16px;">play_arrow</span>
              REANUDAR TRABAJO
            </button>
          </template>
          
          <button 
            v-if="orderStatus(selectedOrder) === 'Abierta' || orderStatus(selectedOrder) === 'En Progreso'"
            class="btn btn-success btn-sm"
            @click="promptFinishOrder"
            :disabled="savingStatus || savingSession"
          >
            <span class="material-icons-round" style="font-size: 16px;">check_circle</span>
            FINALIZAR ORDEN
          </button>
        </div>
      </div>

      <div class="modal-body" style="padding: 24px;">
        
        <!-- Alerta de Rechazo -->
        <div v-if="selectedOrder.notas_auditoria && orderStatus(selectedOrder) === 'En Progreso'" style="margin-bottom: 24px; padding: 16px; background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger); border-radius: 4px;">
          <h4 style="color: var(--danger); margin: 0 0 8px 0; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round">gpp_bad</span>
            Devuelta por Auditoría
          </h4>
          <p style="margin: 0; color: var(--text-main); font-size: 0.9rem; white-space: pre-wrap;"><strong>Motivo:</strong> {{ selectedOrder.notas_auditoria }}</p>
        </div>

        <h4 style="color: var(--text-main); margin-bottom: 16px; font-size: 1rem; border-bottom: 1px solid var(--surface-2); padding-bottom: 8px;">1. Información General</h4>
        
        <div class="form-grid" style="margin-bottom: 32px;">
          <div class="input-group">
            <label>Vehículo</label>
            <div class="input" style="background: var(--surface-2); color: var(--text-main); font-weight: 600; display: flex; align-items: center; gap: 8px;">
              <span class="material-icons-round" style="font-size: 16px; color: var(--primary);">directions_car</span>
              {{ orderVehicle(selectedOrder) }}
            </div>
          </div>

          <div class="input-group">
            <label>Mecánico Asignado</label>
            <div class="input" style="background: var(--surface-2); color: var(--text-main); font-weight: 600; display: flex; align-items: center; gap: 8px;">
              <span class="material-icons-round" style="font-size: 16px; color: var(--primary);">engineering</span>
              <template v-if="selectedOrder.mecanico_asignado_id">
                {{ orderMechanic(selectedOrder) }}
              </template>
              <template v-else>
                <div v-if="authStore.hasPermission('taller.write') && (orderStatus(selectedOrder) === 'Abierta' || orderStatus(selectedOrder) === 'En Progreso')" style="flex: 1; display: flex; gap: 8px;">
                  <SearchableSelect
                    v-model="assignMechanicId"
                    :items="employeeOptions"
                    :label-fn="(e) => `${e.nombres} ${e.apellidos || ''}`.trim()"
                    placeholder="(Asignar mecánico)"
                    empty-text="No se encontraron mecanicos"
                  />
                  <button class="btn btn-primary btn-sm" :disabled="!assignMechanicId || savingUpdate" @click="submitAssignMechanic">
                    <span class="material-icons-round" style="font-size: 16px;">save</span>
                    ASIGNAR
                  </button>
                </div>
                <span v-else style="color: var(--text-muted); font-style: italic;">Sin asignar</span>
              </template>
            </div>
          </div>
          
          <div class="input-group full-width">
            <label>Descripción del Problema</label>
            <div class="input" style="background: var(--surface-2); height: auto; min-height: 60px; white-space: pre-wrap; color: var(--text-secondary); line-height: 1.5;">
              {{ selectedOrder.descripcion }}
            </div>
          </div>
          
          <div class="input-group">
            <label>Fecha de Inicio</label>
            <div class="input" style="background: var(--surface-2); color: var(--text-main);">
               {{ formatDate(selectedOrder.fecha_inicio) }}
            </div>
          </div>
        </div>

        <h4 style="color: var(--text-main); margin-bottom: 16px; font-size: 1rem; border-bottom: 1px solid var(--surface-2); padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          2. Sesiones de Trabajo
        </h4>
        
        <div v-if="!selectedOrder.sesiones?.length" class="empty-state" style="padding: 16px; min-height: auto; margin-bottom: 32px;">
          <p>No hay sesiones de trabajo registradas.</p>
        </div>
        <div v-else style="margin-bottom: 32px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--surface-2);">
                <th style="padding: 10px 8px; color: var(--text-gray);">Mecánico</th>
                <th style="padding: 10px 8px; color: var(--text-gray);">Inicio</th>
                <th style="padding: 10px 8px; color: var(--text-gray);">Fin</th>
                <th style="padding: 10px 8px; color: var(--text-gray); text-align: right;">Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sesion in selectedOrder.sesiones" :key="sesion.id" style="border-bottom: 1px solid var(--surface-2);">
                <td style="padding: 10px 8px; color: var(--primary); font-weight: 500;">{{ sesion.empleado?.nombres ? `${sesion.empleado.nombres} ${sesion.empleado.apellidos || ''}`.trim() : 'Empleado' }}</td>
                <td style="padding: 10px 8px;">{{ formatDate(sesion.fecha_inicio) }}</td>
                <td style="padding: 10px 8px;">{{ sesion.fecha_fin ? formatDate(sesion.fecha_fin) : 'En proceso...' }}</td>
                <td style="padding: 10px 8px; text-align: right; font-family: monospace; font-weight: bold; font-size: 1rem;">{{ calculateDuration(sesion.fecha_inicio, sesion.fecha_fin) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid var(--surface-2); padding-bottom: 8px;">
          <h4 style="color: var(--text-main); font-size: 1rem; display: flex; align-items: center; gap: 8px; margin: 0;">
            3. Repuestos y Materiales
          </h4>
          <button 
            v-if="authStore.hasPermission('taller.write') && canManageInventory && (orderStatus(selectedOrder) === 'Abierta' || orderStatus(selectedOrder) === 'En Progreso')" 
            class="btn btn-outline btn-sm" 
            @click="showAddRepuesto = true"
          >
            <span class="material-icons-round" style="font-size: 16px;">add</span>
            AGREGAR REPUESTO
          </button>
        </div>

        <div v-if="showAddRepuesto" style="background: var(--surface-2); padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid var(--border);">
          <div style="display: flex; gap: 16px; align-items: flex-end;">
            <div style="flex: 2;">
              <label style="font-size: 0.85rem; margin-bottom: 4px; display: block;">Producto</label>
              <SearchableSelect
                v-model="newRepuesto.producto_id"
                :items="availableProducts"
                :label-fn="(p) => `${p.producto_sku ?? p.producto_codigo ?? ''} - ${p.producto_nombre} (Stock: ${p.producto_stock_actual})`"
                :value-fn="(p) => p.producto_id"
                placeholder="Buscar producto con stock..."
                empty-text="No hay productos con stock disponible"
              />
            </div>
            <div style="width: 100px;">
              <label style="font-size: 0.85rem; margin-bottom: 4px; display: block;">Cantidad</label>
              <input type="number" v-model="newRepuesto.cantidad" class="input" min="1" :max="selectedProductStock" step="0.01" />
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary" @click="showAddRepuesto = false" :disabled="savingRepuesto">Cancelar</button>
              <button class="btn btn-primary" @click="submitAddRepuesto" :disabled="!newRepuesto.producto_id || !newRepuesto.cantidad || savingRepuesto">
                <span class="material-icons-round" style="font-size: 16px;">save</span>
                GUARDAR
              </button>
            </div>
          </div>
          <div v-if="selectedProductLowStock" style="margin-top: 12px; padding: 8px 12px; background: rgba(var(--warning-rgb), 0.1); border-left: 3px solid var(--warning); border-radius: 4px; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--warning-dark);">
            <span class="material-icons-round" style="font-size: 16px;">warning</span>
            Este repuesto está por debajo del umbral mínimo de inventario.
          </div>
        </div>
        
        <div v-if="!selectedOrder.movimientos_inventario?.length" class="empty-state" style="padding: 16px; min-height: auto;">
          <p>No hay repuestos descontados en esta orden.</p>
        </div>
        <div v-else style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--surface-2);">
                <th style="padding: 10px 8px; color: var(--text-gray);">Fecha de cargo</th>
                <th style="padding: 10px 8px; color: var(--text-gray);">Producto</th>
                <th style="padding: 10px 8px; color: var(--text-gray); text-align: right;">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mov in selectedOrder.movimientos_inventario" :key="mov.transaccion_id" style="border-bottom: 1px solid var(--surface-2);">
                <td style="padding: 10px 8px;">{{ formatDate(mov.created_at) }}</td>
                <td style="padding: 10px 8px; font-weight: 500; color: var(--text-main);">{{ mov.producto?.producto_nombre || 'Repuesto' }}</td>
                <td style="padding: 10px 8px; text-align: right;">
                  <span style="color: var(--danger); font-weight: bold; font-family: monospace; font-size: 1rem;">-{{ Number(mov.transaccion_cantidad) }} {{ mov.producto?.producto_unidad_medida || 'UNID' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  </div>

  <!-- Confirm Finish Modal -->
  <div v-if="showConfirmFinish" class="modal-overlay" @click.self="showConfirmFinish = false">
    <div class="modal" style="max-width: 450px;">
      <div class="modal-header">
        <h3>FINALIZAR ORDEN</h3>
        <button class="modal-close" @click="showConfirmFinish = false">
          <span class="material-icons-round" style="font-size: 18px">close</span>
        </button>
      </div>
      <div class="modal-body" style="text-align: center; padding: 24px;">
        <span class="material-icons-round" style="font-size: 48px; color: var(--warning); margin-bottom: 16px;">help_outline</span>
        <p style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 8px; font-weight: 600;">¿Estás seguro de finalizar esta orden?</p>
        <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; margin: 0;">La orden pasará a revisión del jefe de taller y se detendrá cualquier sesión de trabajo activa de forma automática.</p>
      </div>
      <div class="modal-footer" style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--surface-3); padding-top: 16px;">
        <button class="btn btn-secondary" @click="showConfirmFinish = false">Cancelar</button>
        <button class="btn btn-primary" @click="executeFinishOrder" :disabled="savingStatus">
          Sí, Finalizar
        </button>
      </div>
    </div>
  </div>

  <!-- Reject Modal -->
  <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
    <div class="modal" style="max-width: 450px;">
      <div class="modal-header">
        <h3>DEVOLVER ORDEN DE TRABAJO</h3>
        <button class="modal-close" @click="showRejectModal = false">
          <span class="material-icons-round" style="font-size: 18px">close</span>
        </button>
      </div>
      <div class="modal-body" style="padding: 24px;">
        <p style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 16px;">La orden volverá al estado <strong>En Progreso</strong> para que el mecánico corrija los problemas.</p>
        <div class="input-group">
          <label style="font-size: 0.85rem; margin-bottom: 4px; display: block;">Notas de Auditoría (Motivo del rechazo) <span style="color: var(--danger);">*</span></label>
          <textarea
            v-model="rejectNotes"
            class="input"
            rows="4"
            placeholder="Ej. Faltan fotos del motor, no se cargaron los repuestos..."
            style="width: 100%; box-sizing: border-box;"
          ></textarea>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--surface-3); padding-top: 16px;">
        <button class="btn btn-secondary" @click="showRejectModal = false">Cancelar</button>
        <button class="btn btn-danger" @click="executeRejectOrder" :disabled="!rejectNotes.trim() || savingStatus">
          <span class="material-icons-round" style="font-size: 16px; margin-right: 4px; vertical-align: middle;">reply</span>
          Confirmar Devolución
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncState } from '../../../shared/composables/useAsyncState';
import {
  createWorkOrder,
  fetchWorkOrders,
  updateWorkOrderStatus,
  updateWorkOrder,
  addWorkOrderRepuestos,
  startWorkSession,
  stopWorkSession
} from '../api/workOrdersService';
import { useCatalogsStore } from '../../../shared/stores/catalogs';
import { useAuthStore } from '../../../shared/stores/auth';
import { useRefresh } from '../../../shared/composables/useRefresh';
import SearchableSelect from '../../../shared/components/SearchableSelect.vue';

const { refreshTrigger } = useRefresh();

const authStore = useAuthStore();
let catalogsStore = null;

const { loading, error, run, clearError } = useAsyncState('');
const route = useRoute();
const search = ref('');
const selectedStatus = ref('all');
const orders = ref([]);
const fleetOptions = ref([]);
const employeeOptions = ref([]);

const showCreate = ref(false);
const savingCreate = ref(false);
const createForm = ref({
  vehiculo_id: '',
  mecanico_asignado_id: '',
  prioridad: 'Media',
  descripcion: '',
  foto_evidencia: null,
});

function onFileChange(event) {
  const file = event.target.files[0];
  if (file) {
    createForm.value.foto_evidencia = file;
  }
}

const savingStatus = ref(false);
const savingSession = ref(false);
const selectedOrder = ref(null);

const activeSession = computed(() => {
  if (!selectedOrder.value?.sesiones) return null;
  return selectedOrder.value.sesiones.find(s => !s.fecha_fin);
});

const showDetailModal = ref(false);
const assignMechanicId = ref('');
const savingUpdate = ref(false);

const showAddRepuesto = ref(false);
const savingRepuesto = ref(false);
const newRepuesto = ref({ producto_id: '', cantidad: 1 });
const showConfirmFinish = ref(false);
const showRejectModal = ref(false);
const rejectNotes = ref('');

const availableProducts = computed(() => {
  return (catalogsStore?.productos || []).filter(p => p.producto_stock_actual > 0);
});

const selectedProductStock = computed(() => {
  if (!newRepuesto.value.producto_id) return 999999;
  const prod = availableProducts.value.find(p => p.producto_id === newRepuesto.value.producto_id);
  return prod ? Number(prod.producto_stock_actual) : 999999;
});

const selectedProductLowStock = computed(() => {
  if (!newRepuesto.value.producto_id) return false;
  const prod = availableProducts.value.find(p => p.producto_id === newRepuesto.value.producto_id);
  if (!prod) return false;
  // Verify if it is low stock
  return Number(prod.producto_stock_actual) <= Number(prod.producto_alerta_stock_minimo || 0);
});

const canManageInventory = computed(() => {
  return authStore.user?.role === 'admin' || authStore.user?.role === 'jefe_taller' || authStore.user?.role === 'auxiliar_bodega';
});

const statusFilters = [
  { value: 'all', label: 'Todas' },
  { value: 'Abierta', label: 'Abiertas' },
  { value: 'En Progreso', label: 'En Progreso' },
  { value: 'Pendiente Auditoria', label: 'Pendiente Auditoria' },
  { value: 'Aprobada', label: 'Aprobada' },
  { value: 'Cerrada', label: 'Cerradas' },
];

onMounted(async () => {
  await loadData();

  if (route.query.action === 'new' && route.query.vehiculo_id) {
    showCreate.value = true;
    createForm.value.vehiculo_id = route.query.vehiculo_id;
  }
});

watch(refreshTrigger, loadData);

async function loadData() {
  try {
    await run(async () => {
      catalogsStore = useCatalogsStore();
      await catalogsStore.fetchEssentialCatalogs();

      const [ordersData] = await Promise.all([
        fetchWorkOrders(),
      ]);
      
      orders.value = ordersData;
      fleetOptions.value = catalogsStore.vehiculos;
      employeeOptions.value = catalogsStore.empleados.filter(e => {
        const c = (e.cargo || '').toLowerCase();
        return c.includes('mecanico') || c.includes('mecánico');
      });
    }, 'Error al cargar ordenes');
  } catch {
    // handled by composable
  }
}

const filteredOrders = computed(() => {
  const q = search.value.trim().toLowerCase();
  return orders.value.filter((order) => {
    const statusMatch =
      selectedStatus.value === 'all' || orderStatus(order) === selectedStatus.value;

    const searchMatch =
      !q ||
      orderDescription(order).toLowerCase().includes(q) ||
      orderVehicle(order).toLowerCase().includes(q);

    return statusMatch && searchMatch;
  });
});

function openDetailModal(order) {
  selectedOrder.value = order;
  assignMechanicId.value = '';
  showAddRepuesto.value = false;
  newRepuesto.value = { producto_id: '', cantidad: 1 };
  showConfirmFinish.value = false;
  showDetailModal.value = true;
}

function closeDetailModal() {
  showDetailModal.value = false;
  selectedOrder.value = null;
  assignMechanicId.value = '';
  showAddRepuesto.value = false;
  showConfirmFinish.value = false;
}

function openCreateModal() {
  showCreate.value = true;
}

function closeCreateModal() {
  showCreate.value = false;
  createForm.value = {
    vehiculo_id: '',
    mecanico_asignado_id: '',
    prioridad: 'Media',
    descripcion: '',
    foto_evidencia: null,
  };
}

async function submitCreate() {
  if (savingCreate.value) return;
  if (!createForm.value.vehiculo_id || !createForm.value.prioridad || !createForm.value.descripcion) {
    return;
  }

  savingCreate.value = true;
  clearError();
  try {
    const payload = new FormData();
    payload.append('vehiculo_id', createForm.value.vehiculo_id);
    if (createForm.value.mecanico_asignado_id) {
      payload.append('mecanico_asignado_id', createForm.value.mecanico_asignado_id);
    }
    payload.append('prioridad', createForm.value.prioridad);
    payload.append('descripcion', createForm.value.descripcion.trim());
    if (createForm.value.foto_evidencia) {
      payload.append('foto_evidencia', createForm.value.foto_evidencia);
    }

    await createWorkOrder(payload);
    closeCreateModal();
    await loadData();
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Error al crear la orden';
  } finally {
    savingCreate.value = false;
  }
}

async function submitStatusChange(newState) {
  if (savingStatus.value || !selectedOrder.value) return;

  savingStatus.value = true;
  clearError();
  try {
    await updateWorkOrderStatus(orderId(selectedOrder.value), newState);
    
    try {
      // Auto-start session if it's new
      if (newState === 'En Progreso' && !activeSession.value) {
        await startWorkSession(orderId(selectedOrder.value));
      }
      
      // Auto-stop session if closing order
      if ((newState === 'Cerrada' || newState === 'Pendiente Auditoria' || newState === 'Aprobada') && activeSession.value) {
        await stopWorkSession(activeSession.value.sesion_id, 'Orden Finalizada');
      }
    } catch (sessionError) {
      console.warn('Advertencia con la sesión de trabajo:', sessionError);
      error.value = sessionError?.response?.data?.message || 'El estado se actualizó, pero hubo un problema con la sesión de trabajo.';
    }

    await loadData();
    // Update local selection to reflect changes quickly without closing modal
    const updatedOrder = orders.value.find(o => orderId(o) === orderId(selectedOrder.value));
    if (updatedOrder) {
      selectedOrder.value = updatedOrder;
    }
  } catch (e) {
    if (!error.value) {
      error.value = e?.response?.data?.message || e?.message || 'Error al actualizar estado';
    }
  } finally {
    savingStatus.value = false;
  }
}

function promptFinishOrder() {
  showConfirmFinish.value = true;
}

async function executeFinishOrder() {
  showConfirmFinish.value = false;
  await submitStatusChange('Pendiente Auditoria');
}

async function executeRejectOrder() {
  if (!rejectNotes.value.trim() || !selectedOrder.value) return;
  savingStatus.value = true;
  clearError();
  try {
    await updateWorkOrderStatus(orderId(selectedOrder.value), 'En Progreso', rejectNotes.value);
    await loadData();
    const updatedOrder = orders.value.find(o => orderId(o) === orderId(selectedOrder.value));
    if (updatedOrder) {
      selectedOrder.value = updatedOrder;
    }
    showRejectModal.value = false;
    rejectNotes.value = '';
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Error al devolver orden';
  } finally {
    savingStatus.value = false;
  }
}

async function submitAssignMechanic() {
  if (savingUpdate.value || !selectedOrder.value || !assignMechanicId.value) return;

  savingUpdate.value = true;
  clearError();
  try {
    const payload = {
      mecanico_asignado_id: assignMechanicId.value
    };
    
    await updateWorkOrder(orderId(selectedOrder.value), payload);
    await loadData();
    const updatedOrder = orders.value.find(o => orderId(o) === orderId(selectedOrder.value));
    if (updatedOrder) {
      selectedOrder.value = updatedOrder;
    }
    assignMechanicId.value = '';
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Error al asignar mecánico';
  } finally {
    savingUpdate.value = false;
  }
}

async function submitAddRepuesto() {
  if (savingRepuesto.value || !selectedOrder.value || !newRepuesto.value.producto_id || !newRepuesto.value.cantidad) return;

  savingRepuesto.value = true;
  clearError();
  try {
    const payload = [{
      producto_id: newRepuesto.value.producto_id,
      cantidad: Number(newRepuesto.value.cantidad)
    }];
    
    await addWorkOrderRepuestos(orderId(selectedOrder.value), payload);
    await loadData();
    const updatedOrder = orders.value.find(o => orderId(o) === orderId(selectedOrder.value));
    if (updatedOrder) {
      selectedOrder.value = updatedOrder;
    }
    
    showAddRepuesto.value = false;
    newRepuesto.value = { producto_id: '', cantidad: 1 };
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Error al agregar repuesto';
  } finally {
    savingRepuesto.value = false;
  }
}

async function handleStartSession() {
  if (savingSession.value || !selectedOrder.value) return;
  savingSession.value = true;
  clearError();
  try {
    await startWorkSession(orderId(selectedOrder.value));
    await loadData();
    const updatedOrder = orders.value.find(o => orderId(o) === orderId(selectedOrder.value));
    if (updatedOrder) selectedOrder.value = updatedOrder;
  } catch (e) {
    error.value = e?.response?.data?.message || 'Error al iniciar sesión';
  } finally {
    savingSession.value = false;
  }
}

async function handleStopSession() {
  if (savingSession.value || !activeSession.value) return;
  savingSession.value = true;
  clearError();
  try {
    await stopWorkSession(activeSession.value.sesion_id, '');
    await loadData();
    const updatedOrder = orders.value.find(o => orderId(o) === orderId(selectedOrder.value));
    if (updatedOrder) selectedOrder.value = updatedOrder;
  } catch (e) {
    error.value = e?.response?.data?.message || 'Error al pausar sesión';
  } finally {
    savingSession.value = false;
  }
}

function orderId(order) {
  return order?.orden_trabajo_id ?? order?.id ?? 0;
}

function orderVehicle(order) {
  return order?.vehiculo?.placa ?? '—';
}

function orderDescription(order) {
  return order?.descripcion ?? '—';
}

function orderStatus(order) {
  return order?.estado ?? 'Abierta';
}

function orderPriority(order) {
  return order?.prioridad ?? 'Media';
}

function orderMechanic(order) {
  if (order?.mecanico?.nombres) {
    return `${order.mecanico.nombres} ${order.mecanico.apellidos || ''}`.trim();
  }
  if (order?.mecanico_asignado?.nombres) {
    return `${order.mecanico_asignado.nombres} ${order.mecanico_asignado.apellidos || ''}`.trim();
  }
  return '—';
}

function orderStartDate(order) {
  const raw = order?.fecha_inicio;
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-CO');
}

function statusBadgeClass(status) {
  if (status === 'Cerrada' || status === 'Aprobada') return 'badge-success';
  if (status === 'En Progreso') return 'badge-warning';
  if (status === 'Pendiente Auditoria') return 'badge-info';
  return 'badge-neutral';
}

function priorityBadgeClass(priority) {
  if (priority === 'Alta') return 'badge-danger';
  if (priority === 'Media') return 'badge-warning';
  return 'badge-info';
}

function vehicleOptionId(vehicle) {
  return vehicle?.vehiculo_id ?? vehicle?.id ?? 0;
}

function vehicleOptionLabel(vehicle) {
  return `${vehicle?.placa ?? 'Sin placa'} - ${vehicle?.tipo ?? vehicle?.modelo ?? ''}`.trim();
}

function calculateDuration(start, end) {
  if (!start) return '00:00:00';
  const endTime = end ? new Date(end) : new Date();
  const startTime = new Date(start);
  const diffMs = endTime - startTime;
  if (diffMs < 0) return '00:00:00';
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
</script>

<style scoped>
@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .table-actions {
    flex-direction: column;
    width: 100%;
  }

  .table-actions .table-search {
    width: 100%;
  }
}
</style>
