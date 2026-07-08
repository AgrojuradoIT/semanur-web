<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal modal-wide export-modal">
      <div class="modal-header">
        <h3>EXPORTAR A EXCEL</h3>
        <button class="modal-close" @click="closeModal">
          <span class="material-icons-round" style="font-size: 18px">close</span>
        </button>
      </div>

      <div class="modal-body">
        <div class="export-section">
          <h4 class="section-title">1. Rango de Fechas</h4>
          
          <!-- Chips de Periodos Rápidos -->
          <div class="filter-chips" style="margin-bottom: 16px;">
            <button class="chip" :class="{ active: selectedPeriod === 'today' }" @click="setPeriod('today')">Hoy</button>
            <button class="chip" :class="{ active: selectedPeriod === 'week' }" @click="setPeriod('week')">Esta Semana</button>
            <button class="chip" :class="{ active: selectedPeriod === 'month' }" @click="setPeriod('month')">Este Mes</button>
            <button class="chip" :class="{ active: selectedPeriod === 'year' }" @click="setPeriod('year')">Este Año</button>
            <button class="chip" :class="{ active: selectedPeriod === 'all' }" @click="setPeriod('all')">Todo</button>
          </div>

          <!-- Calendario con Rango Integrado -->
          <div class="date-range-container" ref="datepickerContainerRef">
            <div class="datepicker-trigger" @click="toggleCalendar" :class="{ 'is-active': showCalendar }">
              <span class="material-icons-round trigger-icon">calendar_month</span>
              <span class="trigger-text">{{ displayRange }}</span>
              <span class="material-icons-round arrow-icon" :class="{ open: showCalendar }">expand_more</span>
            </div>

            <!-- Calendario Desplegable -->
            <transition name="fade-slide">
              <div v-if="showCalendar" class="datepicker-dropdown">
                <div class="datepicker-header">
                  <button class="nav-btn" @click.stop="prevMonth">
                    <span class="material-icons-round">chevron_left</span>
                  </button>
                  <div class="current-month-year">{{ formattedCurrentMonthYear }}</div>
                  <button class="nav-btn" @click.stop="nextMonth">
                    <span class="material-icons-round">chevron_right</span>
                  </button>
                </div>

                <div class="datepicker-weekdays">
                  <span v-for="day in weekdays" :key="day">{{ day }}</span>
                </div>

                <div class="datepicker-days">
                  <button 
                    v-for="cell in calendarDays" 
                    :key="cell.dateString"
                    class="day-cell"
                    :class="{
                      'different-month': !cell.currentMonth,
                      'is-today': cell.isToday,
                      'is-start': cell.isStart,
                      'is-end': cell.isEnd,
                      'in-range': cell.inRange,
                      'in-hover-range': cell.inHoverRange
                    }"
                    @click.stop="selectDay(cell.date)"
                    @mouseenter="hoverDay(cell.date)"
                  >
                    <span class="day-number">{{ cell.dayNumber }}</span>
                  </button>
                </div>
                
                <div class="datepicker-footer" v-if="fechaDesde">
                  <button class="btn-clear-date" @click.stop="clearDateRange">Limpiar Selección</button>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <div class="export-section" style="margin-top: 28px;">
          <div class="section-header-row">
            <h4 class="section-title">2. Columnas a Exportar</h4>
            <div class="column-actions">
              <button class="btn-link" @click="selectAll">Seleccionar Todas</button>
              <span class="separator">|</span>
              <button class="btn-link" @click="deselectAll">Deseleccionar Todas</button>
            </div>
          </div>
          
          <div class="columns-grid">
            <label v-for="col in availableColumns" :key="col.key" class="checkbox-label">
              <input type="checkbox" v-model="selectedColumns" :value="col.key" />
              <span>{{ col.label }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="justify-content: flex-end;">
        <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
        <button class="btn btn-primary" @click="handleExport" :disabled="exporting || selectedColumns.length === 0">
          <span v-if="exporting" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
          <span v-else class="material-icons-round" style="font-size: 18px">download</span>
          {{ exporting ? 'GENERANDO...' : 'DESCARGAR EXCEL' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { exportFuelRecordsToExcel } from '../api/fuelExportService';

const props = defineProps({
  initialDesde: { type: String, default: '' },
  initialHasta: { type: String, default: '' }
});

const emit = defineEmits(['close']);

// Rango de Fechas Reactivo
const fechaDesde = ref('');
const fechaHasta = ref('');
const selectedPeriod = ref('all');
const exporting = ref(false);

// Control del Calendario
const showCalendar = ref(false);
const datepickerContainerRef = ref(null);
const viewDate = ref(new Date());
const hoveredDate = ref(null);

const weekdays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const availableColumns = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'tipo_combustible', label: 'Tipo Combustible' },
  { key: 'tipo_destino', label: 'Tipo Destino' },
  { key: 'destino', label: 'Destino (Placa/Nombre)' },
  { key: 'galones', label: 'Galones' },
  { key: 'horometro', label: 'Horómetro' },
  { key: 'kilometraje', label: 'Kilometraje' },
  { key: 'labor', label: 'Labor / Destino' },
  { key: 'responsable', label: 'Conductor / Responsable' },
  { key: 'registrado_por', label: 'Registrado Por' },
  { key: 'notas', label: 'Notas' }
];

const selectedColumns = ref([
  'fecha', 'tipo_combustible', 'tipo_destino', 'destino', 'galones',
  'horometro', 'kilometraje', 'labor', 'responsable', 'registrado_por'
]);

// Montaje inicial
onMounted(() => {
  fechaDesde.value = props.initialDesde;
  fechaHasta.value = props.initialHasta;
  
  if (props.initialDesde) {
    viewDate.value = new Date(props.initialDesde);
    selectedPeriod.value = 'custom';
  } else {
    selectedPeriod.value = 'all';
  }
  
  window.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  window.removeEventListener('click', handleOutsideClick);
});

// Formatear mes/año de cabecera
const formattedCurrentMonthYear = computed(() => {
  const monthName = months[viewDate.value.getMonth()];
  const year = viewDate.value.getFullYear();
  return `${monthName} ${year}`;
});

// Rango amigable para mostrar en el trigger
const displayRange = computed(() => {
  if (!fechaDesde.value && !fechaHasta.value) {
    return 'Todo el historial de registros';
  }
  
  const formatDateFriendly = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const shortMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${parts[2]} ${shortMonths[parseInt(parts[1]) - 1]} ${parts[0]}`;
  };

  if (fechaDesde.value && !fechaHasta.value) {
    return `Desde ${formatDateFriendly(fechaDesde.value)}`;
  }
  
  if (fechaDesde.value && fechaHasta.value) {
    if (fechaDesde.value === fechaHasta.value) {
      return formatDateFriendly(fechaDesde.value);
    }
    return `${formatDateFriendly(fechaDesde.value)} - ${formatDateFriendly(fechaHasta.value)}`;
  }
  
  return 'Todo el historial';
});

// Generar días del mes para el grid del calendario
const calendarDays = computed(() => {
  const year = viewDate.value.getFullYear();
  const month = viewDate.value.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();

  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const cells = [];

  // Rellenar días del mes anterior (dimmed)
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthTotalDays - i;
    const date = new Date(year, month - 1, day);
    cells.push(createCellObject(date, false));
  }

  // Rellenar días del mes actual
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    cells.push(createCellObject(date, true));
  }

  // Rellenar días del mes siguiente hasta completar múltiplos de 7 (mínimo 35 o 42 celdas)
  const remaining = cells.length <= 35 ? 35 - cells.length : 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    const date = new Date(year, month + 1, day);
    cells.push(createCellObject(date, false));
  }

  return cells;
});

function createCellObject(date, currentMonth) {
  const dateString = formatDateForInput(date);
  const isTodayVal = dateString === formatDateForInput(new Date());
  
  const isStart = fechaDesde.value && dateString === fechaDesde.value;
  const isEnd = fechaHasta.value && dateString === fechaHasta.value;
  
  let inRange = false;
  if (fechaDesde.value && fechaHasta.value) {
    inRange = dateString >= fechaDesde.value && dateString <= fechaHasta.value;
  }
  
  let inHoverRange = false;
  if (fechaDesde.value && !fechaHasta.value && hoveredDate.value) {
    const hoverStr = formatDateForInput(hoveredDate.value);
    if (hoverStr >= fechaDesde.value) {
      inHoverRange = dateString >= fechaDesde.value && dateString <= hoverStr;
    }
  }

  return {
    date,
    dayNumber: date.getDate(),
    dateString,
    currentMonth,
    isToday: isTodayVal,
    isStart,
    isEnd,
    inRange,
    inHoverRange
  };
}

// Navegación de meses
function prevMonth() {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1);
}

function nextMonth() {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1);
}

// Selección de días
function selectDay(date) {
  const dateString = formatDateForInput(date);
  
  if (!fechaDesde.value || (fechaDesde.value && fechaHasta.value)) {
    fechaDesde.value = dateString;
    fechaHasta.value = '';
    selectedPeriod.value = 'custom';
  } else {
    if (dateString < fechaDesde.value) {
      fechaDesde.value = dateString;
      fechaHasta.value = '';
    } else {
      fechaHasta.value = dateString;
      // Cerrar el calendario tras completar la selección del rango
      closeCalendar();
    }
    selectedPeriod.value = 'custom';
  }
}

function hoverDay(date) {
  if (fechaDesde.value && !fechaHasta.value) {
    hoveredDate.value = date;
  }
}

function clearDateRange() {
  fechaDesde.value = '';
  fechaHasta.value = '';
  selectedPeriod.value = 'all';
  hoveredDate.value = null;
}

// Toggle calendar
function toggleCalendar() {
  showCalendar.value = !showCalendar.value;
  if (showCalendar.value && fechaDesde.value) {
    viewDate.value = new Date(fechaDesde.value);
  }
}

function closeCalendar() {
  showCalendar.value = false;
  hoveredDate.value = null;
}

function handleOutsideClick(event) {
  if (datepickerContainerRef.value && !datepickerContainerRef.value.contains(event.target)) {
    closeCalendar();
  }
}

// Configurar periodos predefinidos (chips)
function setPeriod(period) {
  selectedPeriod.value = period;
  const today = new Date();

  if (period === 'today') {
    fechaDesde.value = formatDateForInput(today);
    fechaHasta.value = formatDateForInput(today);
    viewDate.value = new Date(today);
  } else if (period === 'week') {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    fechaDesde.value = formatDateForInput(startOfWeek);
    fechaHasta.value = formatDateForInput(today);
    viewDate.value = new Date(startOfWeek);
  } else if (period === 'month') {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    fechaDesde.value = formatDateForInput(startOfMonth);
    fechaHasta.value = formatDateForInput(today);
    viewDate.value = new Date(startOfMonth);
  } else if (period === 'year') {
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    fechaDesde.value = formatDateForInput(startOfYear);
    fechaHasta.value = formatDateForInput(today);
    viewDate.value = new Date(startOfYear);
  } else if (period === 'all') {
    fechaDesde.value = '';
    fechaHasta.value = '';
    viewDate.value = new Date();
  }
  hoveredDate.value = null;
}

function formatDateForInput(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function selectAll() {
  selectedColumns.value = availableColumns.map(c => c.key);
}

function deselectAll() {
  selectedColumns.value = [];
}

function closeModal() {
  emit('close');
}

async function handleExport() {
  if (selectedColumns.value.length === 0) return;
  
  exporting.value = true;
  try {
    await exportFuelRecordsToExcel({
      fechaDesde: fechaDesde.value,
      fechaHasta: fechaHasta.value,
      columns: selectedColumns.value
    });
    closeModal();
  } catch (e) {
    console.error("Error exporting to Excel", e);
    alert("Ocurrió un error al generar el archivo Excel.");
  } finally {
    exporting.value = false;
  }
}
</script>

<style scoped>
.export-modal {
  max-width: 600px;
}

.section-title {
  font-size: 0.9rem;
  color: var(--text-main);
  font-weight: 700;
  margin-bottom: 12px;
  text-transform: uppercase;
}

/* Datepicker Range Styles */
.date-range-container {
  position: relative;
  width: 100%;
}

.datepicker-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface-2);
  border: 1px solid var(--surface-3);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
}

.datepicker-trigger:hover,
.datepicker-trigger.is-active {
  border-color: var(--primary);
  background: var(--surface-3);
}

.trigger-icon {
  color: var(--primary);
  font-size: 20px;
}

.trigger-text {
  flex: 1;
  font-weight: 500;
  color: var(--text-main);
  font-size: 0.95rem;
}

.arrow-icon {
  color: var(--text-secondary);
  transition: transform var(--transition-fast);
}

.arrow-icon.open {
  transform: rotate(180deg);
}

/* Calendario Desplegable */
.datepicker-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  max-width: 380px;
  background: var(--surface);
  border: 1px solid var(--surface-3);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 16px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Animación */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Cabecera del calendario */
.datepicker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-month-year {
  font-weight: 700;
  color: var(--text-main);
  text-transform: capitalize;
  font-size: 0.95rem;
}

.nav-btn {
  background: var(--surface-2);
  border: 1px solid var(--surface-3);
  color: var(--text-main);
  padding: 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.nav-btn:hover {
  background: var(--surface-3);
  border-color: var(--primary);
  color: var(--primary);
}

/* Grid de días */
.datepicker-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-weight: 700;
  color: var(--text-gray);
  font-size: 0.75rem;
  text-transform: uppercase;
}

.datepicker-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  background: none;
  border: none;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-main);
  font-weight: 500;
  font-size: 0.85rem;
  position: relative;
  transition: all var(--transition-fast);
}

.day-cell:hover {
  background: var(--surface-2);
}

.day-cell.different-month {
  color: var(--text-muted);
  opacity: 0.4;
}

.day-cell.is-today::after {
  content: '';
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary);
}

/* Rango de Fechas - Estilos Visuales */
.day-cell.is-start,
.day-cell.is-end {
  background: var(--primary) !important;
  color: #000000 !important;
  font-weight: 700;
  border-radius: 6px;
  box-shadow: var(--shadow-sm);
}

.day-cell.in-range {
  background: var(--primary-20);
  color: var(--primary);
  border-radius: 0;
}

.day-cell.in-hover-range {
  background: var(--primary-10);
  color: var(--primary);
  border-style: dashed;
  border-radius: 0;
}

.datepicker-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--surface-3);
  padding-top: 8px;
}

.btn-clear-date {
  background: none;
  border: none;
  color: var(--danger);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-clear-date:hover {
  text-decoration: underline;
}

/* Estructura de Columnas */
.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header-row .section-title {
  margin-bottom: 0;
}

.column-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  padding: 0;
  font-weight: 600;
}

.btn-link:hover {
  text-decoration: underline;
}

.separator {
  color: var(--border);
}

.columns-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  background: var(--surface-2);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--surface-3);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-main);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
  cursor: pointer;
}
</style>
