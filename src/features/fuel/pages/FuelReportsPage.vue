<template>
  <div class="reports-page-container">
    <!-- Header -->
    <div class="rp-header">
      <div class="rp-header-left">
        <button class="rp-back-btn" @click="goBack">
          <span class="material-icons-round">arrow_back</span>
        </button>
        <div>
          <h2 class="rp-title">ANÁLISIS DE COMBUSTIBLE</h2>
          <p class="rp-subtitle" v-if="dateRange.start && dateRange.end">
            {{ formatDateLabel(dateRange.start) }} — {{ formatDateLabel(dateRange.end) }}
          </p>
        </div>
      </div>
      <DateRangeCalendar v-model="dateRange" @change="loadReports" :align-right="true" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="rp-loading">
      <span class="spinner"></span>
      Generando análisis...
    </div>

    <div v-else-if="error" class="rp-loading">
      <span class="material-icons-round" style="font-size: 40px; color: var(--danger);">error_outline</span>
      <p>{{ error }}</p>
      <button class="btn btn-primary btn-sm" @click="loadReports">Reintentar</button>
    </div>

    <template v-else>
      <!-- ═══════════════════════════════════════════════════════
           SECCIÓN: KPIs SEPARADOS POR COMBUSTIBLE
           ═══════════════════════════════════════════════════════ -->
      <div class="kpi-split">
        <!-- Gasolina -->
        <div class="kpi-group kpi-group--gasolina">
          <div class="kpi-group-header">
            <span class="material-icons-round kpi-group-icon">local_gas_station</span>
            <span class="kpi-group-label">GASOLINA</span>
          </div>
          <div class="kpi-group-cards">
            <div class="kpi-mini">
              <span class="kpi-mini-value">{{ fmtGal(data.kpis_gasolina?.total_galones) }}</span>
              <span class="kpi-mini-label">Galones</span>
            </div>
            <div class="kpi-mini">
              <span class="kpi-mini-value">{{ fmtGal(data.kpis_gasolina?.promedio_galones_diario) }}</span>
              <span class="kpi-mini-label">Promedio / día</span>
            </div>
            <div class="kpi-mini">
              <span class="kpi-mini-value">{{ data.kpis_gasolina?.total_registros || 0 }}</span>
              <span class="kpi-mini-label">Abastecimientos</span>
            </div>
          </div>
        </div>

        <!-- ACPM -->
        <div class="kpi-group kpi-group--acpm">
          <div class="kpi-group-header">
            <span class="material-icons-round kpi-group-icon">water_drop</span>
            <span class="kpi-group-label">ACPM</span>
          </div>
          <div class="kpi-group-cards">
            <div class="kpi-mini">
              <span class="kpi-mini-value">{{ fmtGal(data.kpis_acpm?.total_galones) }}</span>
              <span class="kpi-mini-label">Galones</span>
            </div>
            <div class="kpi-mini">
              <span class="kpi-mini-value">{{ fmtGal(data.kpis_acpm?.promedio_galones_diario) }}</span>
              <span class="kpi-mini-label">Promedio / día</span>
            </div>
            <div class="kpi-mini">
              <span class="kpi-mini-value">{{ data.kpis_acpm?.total_registros || 0 }}</span>
              <span class="kpi-mini-label">Abastecimientos</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           SECCIÓN: EVOLUCIÓN DIARIA COMBINADA
           ═══════════════════════════════════════════════════════ -->
      <section class="rp-card">
        <h4 class="rp-card-title">
          <span class="material-icons-round rp-card-icon">show_chart</span>
          Evolución de Consumo Diario
        </h4>
        <div class="rp-chart-area rp-chart-tall">
          <Line :data="dailyChartData" :options="lineOptions" />
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════════
           SECCIÓN: TOP CONSUMIDORES — GASOLINA vs ACPM
           ═══════════════════════════════════════════════════════ -->
      <div class="rp-row-2">
        <section class="rp-card">
          <h4 class="rp-card-title">
            <span class="rp-dot rp-dot--gasolina"></span>
            Top Consumidores — Gasolina
          </h4>
          <div class="rp-chart-area">
            <Bar :data="topGasolinaData" :options="hBarOptions" />
          </div>
        </section>

        <section class="rp-card">
          <h4 class="rp-card-title">
            <span class="rp-dot rp-dot--acpm"></span>
            Top Consumidores — ACPM
          </h4>
          <div class="rp-chart-area">
            <Bar :data="topAcpmData" :options="hBarOptions" />
          </div>
        </section>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           SECCIÓN: DESTINOS — GASOLINA vs ACPM
           ═══════════════════════════════════════════════════════ -->
      <div class="rp-row-2">
        <section class="rp-card">
          <h4 class="rp-card-title">
            <span class="rp-dot rp-dot--gasolina"></span>
            Destinos — Gasolina
          </h4>
          <div class="rp-chart-area rp-chart-doughnut">
            <Doughnut :data="destGasolinaData" :options="doughnutOpts" />
          </div>
        </section>

        <section class="rp-card">
          <h4 class="rp-card-title">
            <span class="rp-dot rp-dot--acpm"></span>
            Destinos — ACPM
          </h4>
          <div class="rp-chart-area rp-chart-doughnut">
            <Doughnut :data="destAcpmData" :options="doughnutOpts" />
          </div>
        </section>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           SECCIÓN: CONSUMO POR DÍA DE SEMANA (STACKED)
           ═══════════════════════════════════════════════════════ -->
      <section class="rp-card">
        <h4 class="rp-card-title">
          <span class="material-icons-round rp-card-icon">calendar_view_week</span>
          Consumo por Día de la Semana
        </h4>
        <div class="rp-chart-area">
          <Bar :data="weekdayData" :options="weekdayOpts" />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAsyncState } from '../../../shared/composables/useAsyncState';
import DateRangeCalendar from '../components/DateRangeCalendar.vue';
import { fetchFuelReports } from '../api/fuelReportService';

import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
  PointElement, LineElement, ArcElement, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'vue-chartjs';

ChartJS.register(
  Title, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
  PointElement, LineElement, ArcElement, Filler
);

const router = useRouter();
const { loading, error, run } = useAsyncState('');

const dateRange = ref({ start: '', end: '' });

const data = ref({
  kpis: {}, kpis_gasolina: {}, kpis_acpm: {},
  consumo_diario: [],
  consumo_por_tipo_destino_gasolina: [], consumo_por_tipo_destino_acpm: [],
  top_consumidores_gasolina: [], top_consumidores_acpm: [],
  consumo_por_dia_semana_gasolina: [], consumo_por_dia_semana_acpm: []
});

// ── Theme detection ──
const isDark = ref(!document.documentElement.classList.contains('light-mode'));
let obs = null;

onMounted(() => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  dateRange.value = { start: fmt(start), end: fmt(today) };
  loadReports();

  obs = new MutationObserver(() => {
    isDark.value = !document.documentElement.classList.contains('light-mode');
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});

onUnmounted(() => obs?.disconnect());

function goBack() { router.push('/fuel'); }
function fmt(d) { return d.toISOString().split('T')[0]; }

function fmtGal(v) {
  if (v == null) return '0.00';
  return Number(v).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateLabel(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

async function loadReports() {
  try {
    await run(async () => {
      const params = {};
      if (dateRange.value.start) params.fecha_desde = dateRange.value.start;
      if (dateRange.value.end) params.fecha_hasta = dateRange.value.end;
      data.value = await fetchFuelReports(params);
    });
  } catch (e) { console.error(e); }
}

// ── Color palette ──
const txtC = computed(() => isDark.value ? '#e2e8f0' : '#4a5568');
const gridC = computed(() => isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)');
const tipBg = computed(() => isDark.value ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.96)');
const tipTxt = computed(() => isDark.value ? '#fff' : '#1a1c23');
const tipBody = computed(() => isDark.value ? '#cbd5e1' : '#475569');

const CYAN = '#06b6d4';
const AMBER = '#f59e0b';
const destColors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
const destMap = { vehiculo: 'Vehículo', maquinaria: 'Maquinaria', equipo_menor: 'Equipo Menor', empleado: 'Empleado', tercero: 'Tercero' };

// ── Shared tooltip / options builders ──
function tipOpts() {
  return { padding: 10, backgroundColor: tipBg.value, titleColor: tipTxt.value, bodyColor: tipBody.value, borderColor: gridC.value, borderWidth: 1, cornerRadius: 8 };
}

// ═════════ Daily Line Chart ═════════
const dailyChartData = computed(() => ({
  labels: data.value.consumo_diario.map(i => i.fecha),
  datasets: [
    { label: 'Gasolina', borderColor: CYAN, backgroundColor: 'rgba(6,182,212,0.08)', data: data.value.consumo_diario.map(i => i.gasolina), fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: CYAN },
    { label: 'ACPM', borderColor: AMBER, backgroundColor: 'rgba(245,158,11,0.08)', data: data.value.consumo_diario.map(i => i.acpm), fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: AMBER }
  ]
}));

const lineOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { labels: { color: txtC.value, font: { family: 'Inter', weight: '500' }, usePointStyle: true, pointStyle: 'circle' } }, tooltip: tipOpts() },
  scales: {
    x: { grid: { color: gridC.value }, ticks: { color: txtC.value, maxRotation: 45, autoSkip: true, maxTicksLimit: 15 } },
    y: { grid: { color: gridC.value }, ticks: { color: txtC.value }, beginAtZero: true }
  }
}));

// ═════════ Top Consumidores ═════════
function buildTopData(arr, color) {
  return computed(() => ({
    labels: (arr.value || []).map(i => i.destino),
    datasets: [{ label: 'Galones', data: (arr.value || []).map(i => i.galones), backgroundColor: color + 'cc', borderColor: color, borderWidth: 1, borderRadius: 4 }]
  }));
}
const topGasolinaData = buildTopData(computed(() => data.value.top_consumidores_gasolina), CYAN);
const topAcpmData = buildTopData(computed(() => data.value.top_consumidores_acpm), AMBER);

const hBarOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
  plugins: { legend: { display: false }, tooltip: tipOpts() },
  scales: {
    x: { grid: { color: gridC.value }, ticks: { color: txtC.value } },
    y: { grid: { display: false }, ticks: { color: txtC.value, font: { size: 10, family: 'Inter' } } }
  }
}));

// ═════════ Destinos Doughnut ═════════
function buildDestData(arr) {
  return computed(() => ({
    labels: (arr.value || []).map(i => destMap[i.tipo_destino] || i.tipo_destino),
    datasets: [{ data: (arr.value || []).map(i => i.galones), backgroundColor: destColors, borderWidth: 0 }]
  }));
}
const destGasolinaData = buildDestData(computed(() => data.value.consumo_por_tipo_destino_gasolina));
const destAcpmData = buildDestData(computed(() => data.value.consumo_por_tipo_destino_acpm));

const doughnutOpts = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'right', labels: { color: txtC.value, font: { family: 'Inter', size: 11 }, usePointStyle: true, pointStyle: 'circle', padding: 12 } }, tooltip: tipOpts() },
  cutout: '65%'
}));

// ═════════ Weekday Stacked Bar ═════════
const weekdayData = computed(() => {
  const gasD = data.value.consumo_por_dia_semana_gasolina || [];
  const acpmD = data.value.consumo_por_dia_semana_acpm || [];
  const labels = gasD.map(i => i.dia);
  return {
    labels,
    datasets: [
      { label: 'Gasolina', data: gasD.map(i => i.galones), backgroundColor: CYAN + 'cc', borderColor: CYAN, borderWidth: 1, borderRadius: 4 },
      { label: 'ACPM', data: acpmD.map(i => i.galones), backgroundColor: AMBER + 'cc', borderColor: AMBER, borderWidth: 1, borderRadius: 4 }
    ]
  };
});

const weekdayOpts = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: txtC.value, font: { family: 'Inter', weight: '500' }, usePointStyle: true, pointStyle: 'circle' } }, tooltip: tipOpts() },
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { color: txtC.value } },
    y: { stacked: true, grid: { color: gridC.value }, ticks: { color: txtC.value }, beginAtZero: true }
  }
}));
</script>

<style scoped>
/* ── Page Container ── */
.reports-page-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
}

/* ── Header ── */
.rp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.rp-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.rp-back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--surface-2);
  color: var(--text-main);
  transition: background var(--transition-fast);
}

.rp-back-btn:hover {
  background: var(--surface-2);
}

.rp-title {
  margin: 0;
  font-size: 1.3rem;
  color: var(--text-main);
  line-height: 1.2;
}

.rp-subtitle {
  margin: 2px 0 0;
  font-size: 0.78rem;
  color: var(--text-gray);
  font-family: 'Inter', sans-serif;
  font-weight: 400;
}

/* ── KPI Split (Gasolina | ACPM) ── */
.kpi-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .kpi-split { grid-template-columns: 1fr; }
}

.kpi-group {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.kpi-group-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kpi-group-icon {
  font-size: 22px;
  padding: 6px;
  border-radius: var(--radius-sm);
}

.kpi-group--gasolina .kpi-group-icon {
  color: #06b6d4;
  background: rgba(6, 182, 212, 0.12);
}

.kpi-group--acpm .kpi-group-icon {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
}

.kpi-group-label {
  font-family: 'Oswald', sans-serif;
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 1.5px;
  color: var(--text-secondary);
}

.kpi-group-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.kpi-mini {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}

.kpi-mini-value {
  font-family: 'Oswald', sans-serif;
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.2;
}

.kpi-mini-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-gray);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* ── Card ── */
.rp-card {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.rp-card-title {
  margin: 0 0 16px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 10px;
}

.rp-card-icon {
  font-size: 20px;
  color: var(--text-gray);
}

.rp-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rp-dot--gasolina { background: #06b6d4; }
.rp-dot--acpm { background: #f59e0b; }

/* ── Chart Areas ── */
.rp-chart-area {
  position: relative;
  width: 100%;
  height: 260px;
}

.rp-chart-tall {
  height: 300px;
}

.rp-chart-doughnut {
  max-width: 380px;
  margin: 0 auto;
  height: 240px;
}

/* ── 2-col row ── */
.rp-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 900px) {
  .rp-row-2 { grid-template-columns: 1fr; }
}

/* ── Loading state ── */
.rp-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px;
  color: var(--text-gray);
  background: var(--surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-2);
}
</style>
