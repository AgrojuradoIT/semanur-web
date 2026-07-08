<template>
  <div class="date-range-picker-container" ref="containerRef">
    <button class="btn btn-secondary btn-sm date-picker-trigger" @click.stop="toggleCalendar">
      <span class="material-icons-round" style="font-size: 18px">calendar_today</span>
      <span class="trigger-text">{{ displayRangeText }}</span>
      <span class="material-icons-round arrow-icon">expand_more</span>
    </button>

    <div v-if="isOpen" class="calendar-popup" :class="{ 'popup-align-right': alignRight }">
      <!-- Chips Rápidos -->
      <div class="quick-chips">
        <button 
          v-for="chip in chips" 
          :key="chip.value"
          class="quick-chip"
          :class="{ active: activeChip === chip.value }"
          @click="selectQuickRange(chip.value)"
        >
          {{ chip.label }}
        </button>
      </div>

      <!-- Navegación del Calendario -->
      <div class="calendar-nav">
        <button class="nav-btn" @click="prevMonth" type="button">
          <span class="material-icons-round">chevron_left</span>
        </button>
        <div class="month-year-selectors">
          <select v-model="currentMonth" class="select-nav">
            <option v-for="(m, idx) in months" :key="idx" :value="idx">{{ m }}</option>
          </select>
          <select v-model="currentYear" class="select-nav">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <button class="nav-btn" @click="nextMonth" type="button">
          <span class="material-icons-round">chevron_right</span>
        </button>
      </div>

      <!-- Días de la semana -->
      <div class="calendar-grid-header">
        <span v-for="d in weekDays" :key="d" class="weekday-label">{{ d }}</span>
      </div>

      <!-- Días del mes -->
      <div class="calendar-grid">
        <button
          v-for="day in calendarDays"
          :key="day.id"
          class="calendar-day"
          :class="{
            'different-month': !day.isCurrentMonth,
            'is-start': day.isStart,
            'is-end': day.isEnd,
            'in-range': day.inRange,
            'is-today': day.isToday
          }"
          :disabled="day.disabled"
          @click="handleDayClick(day.date)"
        >
          <span class="day-number">{{ day.dayNum }}</span>
        </button>
      </div>

      <!-- Acciones de pie -->
      <div class="calendar-actions">
        <button class="btn btn-secondary btn-xs" @click="clear">Limpiar</button>
        <button class="btn btn-primary btn-xs" @click="apply">Aplicar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ start: '', end: '' })
  },
  alignRight: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const containerRef = ref(null);
const activeChip = ref('');

// Fechas temporales en el selector
const tempStart = ref(props.modelValue.start ? new Date(props.modelValue.start + 'T00:00:00') : null);
const tempEnd = ref(props.modelValue.end ? new Date(props.modelValue.end + 'T00:00:00') : null);

// Vista actual del calendario (año y mes)
const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth()); // 0-indexed

const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const chips = [
  { label: 'Hoy', value: 'today' },
  { label: 'Esta Semana', value: 'week' },
  { label: 'Este Mes', value: 'month' },
  { label: 'Este Año', value: 'year' },
  { label: 'Todo', value: 'all' }
];

watch(() => props.modelValue, (newVal) => {
  tempStart.value = newVal.start ? new Date(newVal.start + 'T00:00:00') : null;
  tempEnd.value = newVal.end ? new Date(newVal.end + 'T00:00:00') : null;
}, { deep: true });

const displayRangeText = computed(() => {
  if (tempStart.value && tempEnd.value) {
    return `${formatDateLabel(tempStart.value)} - ${formatDateLabel(tempEnd.value)}`;
  }
  if (tempStart.value) {
    return `${formatDateLabel(tempStart.value)} - ...`;
  }
  return 'Filtrar Rango Fechas';
});

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const yearOptions = computed(() => {
  const startYear = 2026;
  const current = new Date().getFullYear();
  const list = [];
  
  // Rango desde el año inicial hasta el año actual
  for (let i = startYear; i <= current; i++) {
    list.push(i);
  }
  
  // Por robustez, si hay fechas cargadas fuera del rango, las incorporamos
  if (tempStart.value) {
    const sYear = tempStart.value.getFullYear();
    if (sYear < startYear && !list.includes(sYear)) {
      list.push(sYear);
    }
  }
  if (tempEnd.value) {
    const eYear = tempEnd.value.getFullYear();
    if (eYear < startYear && !list.includes(eYear)) {
      list.push(eYear);
    }
  }
  
  return list.sort((a, b) => a - b);
});

const currentMonthYearLabel = computed(() => {
  return `${months[currentMonth.value]} ${currentYear.value}`;
});

const calendarDays = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;

  // Primer día del mes
  const firstDayInstance = new Date(year, month, 1);
  const startDayOfWeek = firstDayInstance.getDay(); // 0 is Sunday

  // Número de días en el mes actual
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Días del mes anterior para llenar la cuadrícula inicial
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const prevMonthDaysToShow = startDayOfWeek;

  const days = [];

  // Añadir días del mes anterior
  for (let i = prevMonthDaysToShow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrevMonth - i);
    days.push(createDayObject(d, false));
  }

  // Añadir días del mes actual
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push(createDayObject(d, true));
  }

  // Completar cuadrícula de 42 celdas (6 semanas) con días del siguiente mes
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push(createDayObject(d, false));
  }

  return days;
});

function createDayObject(date, isCurrentMonth) {
  const dateStr = formatDateStr(date);
  const startStr = tempStart.value ? formatDateStr(tempStart.value) : null;
  const endStr = tempEnd.value ? formatDateStr(tempEnd.value) : null;

  const isStart = startStr === dateStr;
  const isEnd = endStr === dateStr;

  let inRange = false;
  if (tempStart.value && tempEnd.value) {
    const sDate = new Date(tempStart.value);
    sDate.setHours(0,0,0,0);
    const eDate = new Date(tempEnd.value);
    eDate.setHours(0,0,0,0);
    const currDate = new Date(date);
    currDate.setHours(0,0,0,0);
    inRange = currDate > sDate && currDate < eDate;
  }

  const todayStr = formatDateStr(new Date());

  return {
    id: dateStr,
    date: new Date(date),
    dayNum: date.getDate(),
    isCurrentMonth,
    isStart,
    isEnd,
    inRange,
    isToday: dateStr === todayStr
  };
}

function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear().toString().substring(2)}`;
}

function toggleCalendar() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    // Sincronizar vista con selección actual
    const targetDate = tempStart.value || new Date();
    currentYear.value = targetDate.getFullYear();
    currentMonth.value = targetDate.getMonth();
  }
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
}

function handleDayClick(date) {
  activeChip.value = '';
  // Limpiar horas para la comparación
  const clickedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (!tempStart.value || (tempStart.value && tempEnd.value)) {
    tempStart.value = clickedDate;
    tempEnd.value = null;
  } else if (tempStart.value && !tempEnd.value) {
    if (clickedDate < tempStart.value) {
      tempStart.value = clickedDate;
    } else {
      tempEnd.value = clickedDate;
    }
  }
}

function selectQuickRange(period) {
  activeChip.value = period;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (period === 'today') {
    tempStart.value = today;
    tempEnd.value = today;
  } else if (period === 'week') {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    tempStart.value = startOfWeek;
    tempEnd.value = today;
  } else if (period === 'month') {
    tempStart.value = new Date(today.getFullYear(), today.getMonth(), 1);
    tempEnd.value = today;
  } else if (period === 'year') {
    tempStart.value = new Date(today.getFullYear(), 0, 1);
    tempEnd.value = today;
  } else if (period === 'all') {
    tempStart.value = null;
    tempEnd.value = null;
  }

  // Sincronizar calendario con el rango seleccionado
  const targetDate = tempStart.value || new Date();
  currentYear.value = targetDate.getFullYear();
  currentMonth.value = targetDate.getMonth();
}

function clear() {
  tempStart.value = null;
  tempEnd.value = null;
  activeChip.value = '';
  apply();
}

function apply() {
  const result = {
    start: tempStart.value ? formatDateStr(tempStart.value) : '',
    end: tempEnd.value ? formatDateStr(tempEnd.value) : ''
  };
  emit('update:modelValue', result);
  emit('change', result);
  isOpen.value = false;
}

// Cerrar al hacer click afuera
function handleClickOutside(event) {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.date-range-picker-container {
  position: relative;
  display: inline-block;
}

.date-picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--surface-2);
  color: var(--text-main);
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-picker-trigger:hover {
  background: var(--surface-2);
  border-color: var(--text-gray);
}

.arrow-icon {
  font-size: 18px;
  color: var(--text-gray);
  margin-left: 4px;
}

.calendar-popup {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 1000;
  width: 320px;
  background: var(--surface);
  border: 1px solid var(--surface-2);
  box-shadow: var(--shadow-lg);
  border-radius: 12px;
  padding: 16px;
  user-select: none;
  font-family: inherit;
}

.calendar-popup.popup-align-right {
  left: auto;
  right: 0;
}

.quick-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--surface-2);
  padding-bottom: 12px;
}

.quick-chip {
  background: var(--surface-2);
  border: 1px solid var(--surface-3);
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-chip:hover {
  background: var(--surface-3);
  color: var(--text-main);
}

.quick-chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #121212;
  font-weight: 600;
}

.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.nav-btn {
  background: transparent;
  border: none;
  color: var(--text-gray);
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.nav-btn:hover {
  background: var(--surface-2);
  color: var(--text-main);
}

.month-year-selectors {
  display: flex;
  gap: 6px;
  align-items: center;
}

.select-nav {
  background: var(--surface-2);
  border: 1px solid var(--surface-3);
  color: var(--text-main);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: pointer;
  outline: none;
  font-family: inherit;
  transition: all 0.2s ease;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 10px;
  padding-right: 18px;
}

.select-nav:hover {
  background-color: var(--surface-3);
  border-color: var(--text-gray);
}

.calendar-grid-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 6px;
}

.weekday-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-gray);
  text-transform: uppercase;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 14px;
}

.calendar-day {
  aspect-ratio: 1;
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s ease;
}

.calendar-day:hover:not(:disabled) {
  background: var(--surface-2);
}

.calendar-day.different-month {
  color: var(--text-muted);
}

.calendar-day.is-today {
  border: 1px solid var(--primary);
  color: var(--primary);
}

:root.light-mode .calendar-day.is-today {
  color: #c69c00; /* Un tono más oscuro de amarillo para legibilidad en tema claro */
  border-color: #c69c00;
}

.calendar-day.is-start {
  background: var(--primary) !important;
  color: #121212 !important;
  font-weight: 600;
  border-radius: 6px 0 0 6px;
}

.calendar-day.is-end {
  background: var(--primary) !important;
  color: #121212 !important;
  font-weight: 600;
  border-radius: 0 6px 6px 0;
}

.calendar-day.is-start.is-end {
  border-radius: 6px !important;
}

.calendar-day.in-range {
  background: var(--primary-20) !important;
  border-radius: 0;
  color: var(--text-main);
}

.day-number {
  position: relative;
  z-index: 2;
}

.calendar-actions {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--surface-2);
  padding-top: 12px;
}

.btn-xs {
  padding: 4px 10px;
  font-size: 0.75rem;
  border-radius: 4px;
}
</style>
