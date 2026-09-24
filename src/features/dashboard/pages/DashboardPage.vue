<template>
  <div class="dash-page">
    <!-- Loading / Error -->
    <div v-if="loading" class="dash-loading">
      <span class="spinner"></span>
      Cargando Command Center...
    </div>

    <div v-else-if="error" class="dash-error">
      <span class="material-icons-round">cloud_off</span>
      <p>{{ error }}</p>
    </div>

    <template v-else>
      <!-- ── HEADER ── -->
      <header class="dash-header">
        <div class="dash-header-left">
          <span class="dash-subtitle">{{ todayFormatted }}</span>
        </div>
      </header>

      <!-- ── 1. TANQUES DE COMBUSTIBLE (FORMA DE CISTERNA INDUSTRIAL) ── -->
      <section v-if="fuelStock.length" class="dash-fuel-hero">
        <article
          v-for="fuel in fuelStock"
          :key="fuel.producto_id"
          class="fuel-tank-card"
          :class="[`fuel-tank-${getFuelLevelStatus(fuel)}`, `fuel-type-${isAcpm(fuel) ? 'acpm' : 'gasolina'}`]"
          @click="$router.push({ path: '/fuel', query: { tipo_combustible: isAcpm(fuel) ? 'acpm' : 'gasolina' } })"
        >
          <!-- Tank Card Header -->
          <div class="tank-card-header">
            <div class="tank-card-title-group">
              <span class="fuel-dot" :class="`fuel-dot-${getFuelLevelStatus(fuel)}`"></span>
              <h3 class="tank-card-title">Stock de {{ isAcpm(fuel) ? 'ACPM' : 'Combustible' }}</h3>
            </div>
            <div class="tank-card-status-badge" :class="`status-${getFuelLevelStatus(fuel)}`">
              {{ getFuelLevelText(fuel) }}
            </div>
          </div>

          <!-- Tank Visual Graphic (Horizontal Cylinder) -->
          <div class="tank-visual-container">
            <!-- Top Inlet Hatch -->
            <div class="tank-hatch-cap"></div>

            <!-- Tank Cylinder Body -->
            <div class="tank-cylinder-body">
              <!-- Top Glare Highlight -->
              <div class="tank-glare-reflection"></div>

              <!-- Liquid Level Fill (Bottom to Top with Wave Dynamics) -->
              <div
                class="tank-liquid-chamber"
                :class="`liquid-${isAcpm(fuel) ? 'acpm' : 'gasolina'}`"
                :style="{ height: fuelBarPercent(fuel) + '%' }"
              >
                <!-- Animated Waves on Liquid Surface -->
                <div class="tank-wave wave-back"></div>
                <div class="tank-wave wave-front"></div>
                <!-- Meniscus Surface Highlight -->
                <div class="tank-liquid-meniscus"></div>
              </div>
            </div>

            <!-- Bottom Support Legs -->
            <div class="tank-support-legs">
              <span class="tank-leg leg-left"></span>
              <span class="tank-leg leg-right"></span>
            </div>
          </div>

          <!-- Tank Footer Info -->
          <div class="tank-footer-row">
            <div class="tank-type-label">
              {{ fuel.producto_nombre }}
            </div>
            <div class="tank-stock-value">
              <span class="tank-qty">{{ formatNumber(fuel.producto_stock_actual) }} {{ fuel.producto_unidad_medida || 'GAL' }}</span>
              <span class="tank-pct" :class="`pct-val-${getFuelLevelStatus(fuel)}`">
                ({{ fuelBarPercent(fuel).toFixed(0) }}%)
              </span>
            </div>
          </div>
        </article>
      </section>

      <!-- ── HISTÓRICO DE CONSUMO 15 DÍAS ── -->
      <section v-if="fuelHistory15Days.length" class="dash-fuel-history-section">
        <article class="fuel-history-panel">
          <div class="panel-header">
            <div class="panel-header-left">
              <span class="material-icons-round panel-icon">insights</span>
              <div>
                <h3 class="panel-title">Consumo de Combustible (Últimos 15 días)</h3>
                <p class="panel-desc">Evolución diaria de galones despachados</p>
              </div>
            </div>
            <div class="panel-header-right">
              <!-- Leyendas interactivas -->
              <button 
                class="legend-btn legend-gasolina" 
                :class="{ 'legend-disabled': !showGasolina }"
                @click="showGasolina = !showGasolina"
              >
                <span class="legend-dot dot-gasolina"></span>
                <span class="legend-text">Gasolina ({{ formatNumber(totalGasolina15Days) }} gal)</span>
              </button>
              <button 
                class="legend-btn legend-acpm" 
                :class="{ 'legend-disabled': !showACPM }"
                @click="showACPM = !showACPM"
              >
                <span class="legend-dot dot-acpm"></span>
                <span class="legend-text">ACPM ({{ formatNumber(totalACPM15Days) }} gal)</span>
              </button>
            </div>
          </div>

          <div class="chart-container">
            <!-- SVG responsivo -->
            <svg 
              ref="svgRef"
              class="fuel-history-svg" 
              viewBox="0 0 1000 300"
              preserveAspectRatio="xMidYMid meet"
              @mousemove="handleMouseMove"
              @mouseleave="handleMouseLeave"
            >
              <!-- Definiciones de gradientes y sombras -->
              <defs>
                <linearGradient id="gasolina-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.20"/>
                  <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.00"/>
                </linearGradient>
                <linearGradient id="acpm-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.20"/>
                  <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.00"/>
                </linearGradient>
                <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.3"/>
                </filter>
              </defs>

              <!-- Cuadrícula de Fondo -->
              <g class="chart-grid">
                <line 
                  v-for="tick in yTicks" 
                  :key="tick.y" 
                  :x1="padding.left" 
                  :y1="tick.y" 
                  :x2="width - padding.right" 
                  :y2="tick.y" 
                  stroke="var(--surface-2)" 
                  stroke-width="1"
                  stroke-dasharray="4,4"
                />
              </g>

              <!-- Eje Y Textos -->
              <g class="chart-axis-y">
                <text 
                  v-for="tick in yTicks" 
                  :key="tick.y"
                  :x="padding.left - 12"
                  :y="tick.y + 4"
                  text-anchor="end"
                  fill="var(--text-muted)"
                  font-size="11"
                  font-weight="600"
                >
                  {{ formatNumber(tick.val) }}
                </text>
              </g>

              <!-- Eje X Textos -->
              <g class="chart-axis-x">
                <text 
                  v-for="tick in xTicks" 
                  :key="tick.x"
                  :x="tick.x"
                  :y="height - padding.bottom + 22"
                  text-anchor="middle"
                  fill="var(--text-muted)"
                  font-size="11"
                  font-weight="600"
                >
                  {{ tick.data.day_name.toUpperCase() }} {{ tick.data.day_number }}
                </text>
              </g>

              <!-- Curvas y Áreas -->
              <!-- ACPM -->
              <g v-if="showACPM && acpmPoints.length" class="chart-series">
                <path 
                  :d="acpmAreaPath" 
                  fill="url(#acpm-grad)"
                />
                <path 
                  :d="acpmLinePath" 
                  fill="none" 
                  stroke="#f59e0b" 
                  stroke-width="3" 
                  stroke-linecap="round"
                  filter="url(#shadow)"
                />
              </g>

              <!-- Gasolina -->
              <g v-if="showGasolina && gasolinaPoints.length" class="chart-series">
                <path 
                  :d="gasolinaAreaPath" 
                  fill="url(#gasolina-grad)"
                />
                <path 
                  :d="gasolinaLinePath" 
                  fill="none" 
                  stroke="#06b6d4" 
                  stroke-width="3" 
                  stroke-linecap="round"
                  filter="url(#shadow)"
                />
              </g>

              <!-- Línea vertical interactiva -->
              <line 
                v-if="hoveredIndex !== null" 
                :x1="verticalLineX" 
                :y1="padding.top" 
                :x2="verticalLineX" 
                :y2="height - padding.bottom" 
                stroke="var(--surface-3)" 
                stroke-width="1.5"
              />

              <!-- Puntos interactivos destacados -->
              <g v-if="hoveredIndex !== null">
                <!-- Punto ACPM -->
                <circle 
                  v-if="showACPM && acpmPoints[hoveredIndex]"
                  :cx="acpmPoints[hoveredIndex].x" 
                  :cy="acpmPoints[hoveredIndex].y" 
                  r="6" 
                  fill="#f59e0b" 
                  stroke="#fff" 
                  stroke-width="2"
                  filter="url(#shadow)"
                />
                <!-- Punto Gasolina -->
                <circle 
                  v-if="showGasolina && gasolinaPoints[hoveredIndex]"
                  :cx="gasolinaPoints[hoveredIndex].x" 
                  :cy="gasolinaPoints[hoveredIndex].y" 
                  r="6" 
                  fill="#06b6d4" 
                  stroke="#fff" 
                  stroke-width="2"
                  filter="url(#shadow)"
                />
              </g>
            </svg>

            <!-- Tooltip Premium flotante con Glassmorphism -->
            <transition name="fade">
              <div 
                v-if="hoveredIndex !== null && hoveredData" 
                class="chart-tooltip" 
                :style="tooltipStyle"
              >
                <div class="tooltip-header">
                  <span class="material-icons-round tooltip-icon">calendar_today</span>
                  <span class="tooltip-date">{{ formatTooltipDate(hoveredData.date) }}</span>
                </div>
                <div class="tooltip-body">
                  <div v-if="showGasolina" class="tooltip-row">
                    <span class="tooltip-color-indicator indicator-gasolina"></span>
                    <span class="tooltip-label">Gasolina:</span>
                    <span class="tooltip-val">{{ formatNumber(hoveredData.gasolina) }} <span class="tooltip-unit">gal</span></span>
                  </div>
                  <div v-if="showACPM" class="tooltip-row">
                    <span class="tooltip-color-indicator indicator-acpm"></span>
                    <span class="tooltip-label">ACPM:</span>
                    <span class="tooltip-val">{{ formatNumber(hoveredData.acpm) }} <span class="tooltip-unit">gal</span></span>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </article>
      </section>

      <!-- ── 2. KPI CARDS ── -->
      <KpiStrip
        :ot-stats="otStats"
        :preop-hoy="preopHoy"
        :loans-stats="loansStats"
        :low-stock="lowStock"
        :maintenance-cost="maintenanceCost"
        :docs-counts="docsCounts"
        :top-maintenance-vehicle="maintenanceByVehicle[0]"
      />

      <!-- ── 3. ACTIVIDAD + ALERTAS ── -->
      <section class="dash-bottom-grid">

        <TallerEnVivoPanel :por-estado="otStats.porEstado" :sessions="liveSessions" />
        <ActividadRecientePanel :events="recentActivity" />
        <CentroAlertasPanel :alerts="alerts" />

      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useAsyncState } from '../../../shared/composables/useAsyncState';
import { fetchDashboardSources } from '../api/dashboardService';
import { useRefresh } from '../../../shared/composables/useRefresh';
import KpiStrip from '../components/KpiStrip.vue';
import CentroAlertasPanel from '../components/CentroAlertasPanel.vue';
import TallerEnVivoPanel from '../components/TallerEnVivoPanel.vue';
import ActividadRecientePanel from '../components/ActividadRecientePanel.vue';

const { refreshTrigger } = useRefresh();
const { loading, error, run } = useAsyncState('');

const summary = ref({ total_fuel_cost: 0, total_maintenance_cost: 0, vehicle_count: 0, open_orders: 0 });
const fuelMonthly = ref([]);
const maintenanceByVehicle = ref([]);
const fuelStock = ref([]);
const fuelHistory15Days = ref([]);
const otStats = ref({});
const preopHoy = ref({});
const loansStats = ref({});
const lowStock = ref({});
const liveSessions = ref({ total: 0, items: [] });
const recentActivity = ref([]);
const maintenanceCost = ref(0);
const docsCounts = ref({});
const alerts = ref({ items: [], total: 0, counts: {} });

const showGasolina = ref(true);
const showACPM = ref(true);
const hoveredIndex = ref(null);
const svgRef = ref(null);

const padding = { top: 30, right: 40, bottom: 40, left: 60 };
const width = 1000;
const height = 300;
const chartWidth = width - padding.left - padding.right;
const chartHeight = height - padding.top - padding.bottom;

const todayFormatted = computed(() =>
  new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
);

onMounted(loadDashboard);

async function loadDashboard() {
  try {
    await run(async () => {
      const payload = await fetchDashboardSources();
      summary.value = payload.summary || summary.value;
      fuelMonthly.value = Array.isArray(payload.fuelMonthly) ? payload.fuelMonthly : [];
      maintenanceByVehicle.value = Array.isArray(payload.maintenanceByVehicle) ? payload.maintenanceByVehicle : [];
      fuelStock.value = Array.isArray(payload.fuelStock) ? payload.fuelStock : [];
      fuelHistory15Days.value = Array.isArray(payload.fuelHistory15Days) ? payload.fuelHistory15Days : [];
      otStats.value = payload.otStats || {};
      preopHoy.value = payload.preopHoy || {};
      loansStats.value = payload.loansStats || {};
      lowStock.value = payload.lowStock || {};
      liveSessions.value = payload.liveSessions || { total: 0, items: [] };
      recentActivity.value = Array.isArray(payload.recentActivity) ? payload.recentActivity : [];
      maintenanceCost.value = Number(payload.maintenanceCost || 0);
      docsCounts.value = payload.docsCounts || {};
      alerts.value = payload.alerts || { items: [], total: 0, counts: {} };
    }, 'Error al cargar dashboard');
  } catch { /* handled */ }
}

const totalGasolina15Days = computed(() => {
  if (!fuelHistory15Days.value) return 0;
  return fuelHistory15Days.value.reduce((acc, curr) => acc + (curr.gasolina || 0), 0);
});

const totalACPM15Days = computed(() => {
  if (!fuelHistory15Days.value) return 0;
  return fuelHistory15Days.value.reduce((acc, curr) => acc + (curr.acpm || 0), 0);
});

const maxVal = computed(() => {
  if (!fuelHistory15Days.value || fuelHistory15Days.value.length === 0) return 100;
  let max = 0;
  fuelHistory15Days.value.forEach(d => {
    if (showGasolina.value) max = Math.max(max, d.gasolina);
    if (showACPM.value) max = Math.max(max, d.acpm);
  });
  return max > 0 ? max * 1.15 : 100;
});

const getPoints = (key) => {
  if (!fuelHistory15Days.value || fuelHistory15Days.value.length === 0) return [];
  const n = fuelHistory15Days.value.length;
  return fuelHistory15Days.value.map((d, i) => {
    const x = padding.left + (i / (n - 1)) * chartWidth;
    const y = padding.top + chartHeight - (d[key] / maxVal.value) * chartHeight;
    return { x, y, data: d, index: i };
  });
};

const gasolinaPoints = computed(() => getPoints('gasolina'));
const acpmPoints = computed(() => getPoints('acpm'));

const pathLine = (points) => {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
};

const pathArea = (points) => {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  const linePath = points.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return `M ${first.x.toFixed(1)} ${(padding.top + chartHeight).toFixed(1)} ${linePath} L ${last.x.toFixed(1)} ${(padding.top + chartHeight).toFixed(1)} Z`;
};

const gasolinaLinePath = computed(() => pathLine(gasolinaPoints.value));
const gasolinaAreaPath = computed(() => pathArea(gasolinaPoints.value));
const acpmLinePath = computed(() => pathLine(acpmPoints.value));
const acpmAreaPath = computed(() => pathArea(acpmPoints.value));

const hoveredData = computed(() => {
  if (hoveredIndex.value === null || !fuelHistory15Days.value.length) return null;
  return fuelHistory15Days.value[hoveredIndex.value];
});

const verticalLineX = computed(() => {
  if (hoveredIndex.value === null || !fuelHistory15Days.value.length) return 0;
  const n = fuelHistory15Days.value.length;
  return padding.left + (hoveredIndex.value / (n - 1)) * chartWidth;
});

const tooltipStyle = computed(() => {
  if (hoveredIndex.value === null || !svgRef.value || !fuelHistory15Days.value.length) return { display: 'none' };
  const n = fuelHistory15Days.value.length;
  const x = padding.left + (hoveredIndex.value / (n - 1)) * chartWidth;
  
  // Posicionamiento inteligente del tooltip
  const isRightHalf = hoveredIndex.value > n / 2;
  const offset = isRightHalf ? -220 : 20;

  return {
    left: `calc(${(x / width) * 100}% + ${offset}px)`,
    top: '30px',
    display: 'block'
  };
});

const yTicks = computed(() => {
  const ticks = [];
  const max = maxVal.value;
  for (let i = 0; i <= 4; i++) {
    const val = (max / 4) * i;
    const y = padding.top + chartHeight - (val / max) * chartHeight;
    ticks.push({ val: Math.round(val), y });
  }
  return ticks;
});

const xTicks = computed(() => {
  if (gasolinaPoints.value.length === 0) return [];
  return gasolinaPoints.value.filter((p, i) => i % 2 === 0);
});

const handleMouseMove = (event) => {
  if (!svgRef.value || !fuelHistory15Days.value || fuelHistory15Days.value.length === 0) return;
  const rect = svgRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const n = fuelHistory15Days.value.length;
  
  const svgX = (x / rect.width) * width;
  const relativeX = svgX - padding.left;
  const pct = relativeX / chartWidth;
  let idx = Math.round(pct * (n - 1));
  
  if (idx < 0) idx = 0;
  if (idx >= n) idx = n - 1;
  hoveredIndex.value = idx;
};

const handleMouseLeave = () => {
  hoveredIndex.value = null;
};

const formatTooltipDate = (rawDate) => {
  if (!rawDate) return '';
  const parts = rawDate.split('-');
  if (parts.length !== 3) return rawDate;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' });
};

watch(refreshTrigger, loadDashboard);

// --- Utilities ---
function formatMonth(year, month) {
  const d = new Date(Number(year), Number(month) - 1, 1);
  return Number.isNaN(d.getTime()) ? 'N/D'
    : d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function fuelIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('gasolina')) return 'gas_meter';
  if (n.includes('acpm') || n.includes('diesel')) return 'oil_barrel';
  return 'propane_tank';
}

function fuelBarPercent(fuel) {
  const stock = Number(fuel.producto_stock_actual || 0);
  if (fuel.capacidad_maxima && Number(fuel.capacidad_maxima) > 0)
    return Math.min(Math.max((stock / Number(fuel.capacidad_maxima)) * 100, 0), 100);
  const min = Number(fuel.producto_alerta_stock_minimo || 1);
  return Math.min((stock / Math.max(min * 3, stock)) * 100, 100);
}

function getFuelLevelStatus(fuel) {
  const stock = Number(fuel.producto_stock_actual || 0);
  const min = Number(fuel.producto_alerta_stock_minimo || 0);
  const criticalThreshold = min / 2;

  if (stock <= criticalThreshold) return 'danger';
  if (stock <= min) return 'warning';
  return 'ok';
}

function getFuelLevelText(fuel) {
  const status = getFuelLevelStatus(fuel);
  if (status === 'danger') return 'Nivel Crítico';
  if (status === 'warning') return 'Nivel Bajo';
  return 'Nivel Óptimo';
}

function isAcpm(fuel) {
  const name = (fuel.producto_nombre || fuel.nombre || '').toLowerCase();
  const sku = (fuel.producto_sku || '').toLowerCase();
  return name.includes('acpm') || name.includes('diesel') || sku.includes('acpm') || sku.includes('dsl');
}
</script>

<style scoped>
/* ═══ BASE ═══ */
.dash-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
  min-width: 0;
}

.dash-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-gray);
  padding: 40px;
  font-size: 0.9rem;
}

.dash-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px;
  color: var(--danger);
}

/* ═══ HEADER ═══ */
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--surface-2);
}

.dash-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.dash-subtitle {
  font-size: 0.85rem;
  color: var(--text-gray);
  font-weight: 500;
  text-transform: capitalize;
}

/* ═══ TANQUES DE COMBUSTIBLE (FORMA INDUSTRIAL CISTERNA) ═══ */
.dash-fuel-hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 20px;
  width: 100%;
}

.fuel-tank-card {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: var(--radius-lg);
  padding: 22px 24px 18px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  cursor: pointer;
  transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
  position: relative;
  overflow: hidden;
}

.fuel-tank-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 214, 0, 0.35);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.tank-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tank-card-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fuel-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.fuel-dot-ok {
  background: var(--success);
  box-shadow: 0 0 8px var(--success);
}

.fuel-dot-warning {
  background: #f59e0b;
  box-shadow: 0 0 8px #f59e0b;
  animation: pulseDot 2s infinite;
}

.fuel-dot-danger {
  background: #ef4444;
  box-shadow: 0 0 8px #ef4444;
  animation: pulseDot 1.4s infinite;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.tank-card-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  letter-spacing: 0.2px;
}

.tank-card-status-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-ok {
  background: var(--success-10);
  color: var(--success);
}

.status-warning {
  background: var(--warning-10);
  color: #f59e0b;
}

.status-danger {
  background: var(--danger-10);
  color: #ef4444;
}

/* ── TANK VISUAL CONTAINER ── */
.tank-visual-container {
  position: relative;
  width: 100%;
  padding: 6px 4px 4px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tank-hatch-cap {
  width: 40px;
  height: 8px;
  background: var(--tank-metal-part);
  border: 2px solid var(--tank-metal-border);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  margin-bottom: -1px;
  margin-left: -55%;
  z-index: 2;
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.15);
}

.tank-cylinder-body {
  position: relative;
  width: 100%;
  height: 94px;
  background: var(--tank-body-bg);
  border: var(--tank-body-border);
  border-radius: 47px;
  overflow: hidden;
  box-shadow: var(--tank-body-shadow);
  transition: background var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
}

.tank-glare-reflection {
  position: absolute;
  top: 3px;
  left: 24px;
  right: 24px;
  height: 14px;
  background: var(--tank-glare);
  border-radius: 7px;
  z-index: 5;
  pointer-events: none;
}

.tank-liquid-chamber {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  transition: height 1.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: visible;
}

/* ── REALISTIC DUAL WAVE SURFACE ── */
.tank-wave {
  position: absolute;
  top: -10px;
  left: 0;
  width: 200%;
  height: 14px;
  background-repeat: repeat-x;
  background-size: 50% 100%;
  pointer-events: none;
}

.wave-front {
  z-index: 3;
  animation: waveMotionFront 4s linear infinite;
  opacity: 0.95;
}

.wave-back {
  top: -12px;
  z-index: 2;
  animation: waveMotionBack 6.5s linear infinite;
  opacity: 0.6;
}

@keyframes waveMotionFront {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@keyframes waveMotionBack {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0); }
}

/* ── LIQUID THEMES & WAVES ── */
/* ACPM (Emerald / Cyan Fluid Dynamics) */
.liquid-acpm {
  background: linear-gradient(180deg, #10b981 0%, #059669 30%, #044e37 70%, #02291d 100%);
  box-shadow: 0 -4px 18px rgba(16, 185, 129, 0.5), inset 0 2px 8px rgba(255, 255, 255, 0.25);
}

.liquid-acpm .wave-front {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 30' preserveAspectRatio='none'%3E%3Cpath d='M0,15 C150,28 350,2 600,15 C850,28 1050,2 1200,15 L1200,30 L0,30 Z' fill='%2310b981'/%3E%3C/svg%3E");
}

.liquid-acpm .wave-back {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 30' preserveAspectRatio='none'%3E%3Cpath d='M0,15 C200,2 400,28 600,15 C800,2 1000,28 1200,15 L1200,30 L0,30 Z' fill='%23059669'/%3E%3C/svg%3E");
}

/* Gasolina (Amber / Golden Orange Fluid Dynamics) */
.liquid-gasolina {
  background: linear-gradient(180deg, #f59e0b 0%, #d97706 30%, #92400e 70%, #451a03 100%);
  box-shadow: 0 -4px 18px rgba(245, 158, 11, 0.5), inset 0 2px 8px rgba(255, 255, 255, 0.25);
}

.liquid-gasolina .wave-front {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 30' preserveAspectRatio='none'%3E%3Cpath d='M0,15 C150,28 350,2 600,15 C850,28 1050,2 1200,15 L1200,30 L0,30 Z' fill='%23f59e0b'/%3E%3C/svg%3E");
}

.liquid-gasolina .wave-back {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 30' preserveAspectRatio='none'%3E%3Cpath d='M0,15 C200,2 400,28 600,15 C800,2 1000,28 1200,15 L1200,30 L0,30 Z' fill='%23d97706'/%3E%3C/svg%3E");
}

/* Danger / Critical level */
.fuel-tank-danger .tank-liquid-chamber {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 30%, #991b1b 70%, #450a0a 100%) !important;
  box-shadow: 0 -4px 20px rgba(239, 68, 68, 0.6), inset 0 2px 8px rgba(255, 255, 255, 0.25) !important;
}

.fuel-tank-danger .wave-front {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 30' preserveAspectRatio='none'%3E%3Cpath d='M0,15 C150,28 350,2 600,15 C850,28 1050,2 1200,15 L1200,30 L0,30 Z' fill='%23ef4444'/%3E%3C/svg%3E") !important;
}

.fuel-tank-danger .wave-back {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 30' preserveAspectRatio='none'%3E%3Cpath d='M0,15 C200,2 400,28 600,15 C800,2 1000,28 1200,15 L1200,30 L0,30 Z' fill='%23dc2626'/%3E%3C/svg%3E") !important;
}

.tank-liquid-meniscus {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.9), 0 0 4px #ffffff;
  z-index: 4;
}

.tank-support-legs {
  display: flex;
  justify-content: space-between;
  width: 65%;
  margin-top: -1px;
  z-index: 1;
}

.tank-leg {
  width: 22px;
  height: 8px;
  background: var(--tank-metal-part);
  border: 2px solid var(--tank-metal-border);
  border-top: none;
  border-radius: 0 0 4px 4px;
}

/* ── FOOTER ROW ── */
.tank-footer-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 4px;
}

.tank-type-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.tank-stock-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.tank-qty {
  font-family: 'Oswald', sans-serif;
  font-size: 1.85rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: 0.5px;
  line-height: 1;
}

.tank-pct {
  font-family: 'Oswald', sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1;
}

.pct-val-ok { color: var(--text-main); }
.pct-val-warning { color: #f59e0b; }
.pct-val-danger { color: #ef4444; }

/* ═══ KPI GRID ═══ */
.dash-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.kpi-card {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 16px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

.kpi-card:hover {
  transform: translateY(-2px);
  border-color: var(--surface-3);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.kpi-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-icon-wrap .material-icons-round {
  font-size: 22px;
}

.kpi-primary { background: var(--primary-10); color: var(--primary); }
.kpi-blue    { background: var(--info-10); color: #60a5fa; }
.kpi-danger  { background: var(--danger-10);  color: #f87171; }
.kpi-neutral { background: rgba(100, 116, 139, 0.15); color: var(--text-gray); }

.kpi-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kpi-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-gray);
}

.kpi-value {
  font-family: 'Oswald', sans-serif;
  font-size: 2.4rem;
  font-weight: 900;
  color: var(--text-main);
  line-height: 1.1;
}

.kpi-value-sm {
  font-size: 1.3rem;
}

.kpi-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 700;
}

.kpi-trend .material-icons-round { font-size: 14px; }
.kpi-trend-up { color: var(--success); }

.kpi-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.kpi-tag {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tag-danger  { background: var(--danger-10);  color: #f87171; }
.tag-warning { background: var(--warning-10); color: #fbbf24; }
.tag-ok      { background: var(--success-10);  color: var(--success); }

.kpi-hint {
  font-size: 0.7rem;
  color: #fbbf24;
  font-weight: 600;
  font-style: italic;
}

/* ═══ BOTTOM GRID ═══ */
.dash-bottom-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  color: var(--text-main);
}

/* Activity list */
.activity-list {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--surface-2);
  transition: background 0.2s ease;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-item:hover {
  background: var(--primary-10);
}

.activity-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon .material-icons-round { font-size: 20px; }

.activity-icon-fuel    { background: var(--primary-10); color: var(--primary); }
.activity-icon-danger  { background: var(--danger-10);  color: #f87171; }
.activity-icon-warning { background: var(--warning-10); color: #fbbf24; }

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-desc {
  font-size: 0.75rem;
  color: var(--text-gray);
  margin-top: 2px;
}

.activity-right {
  flex-shrink: 0;
  text-align: right;
}

.activity-cost {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-gray);
}

/* Empty states */
.dash-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 30px 20px;
  font-size: 0.82rem;
  color: var(--text-muted);
  font-style: italic;
  flex: 1;
}

.dash-empty-ok {
  color: var(--success);
  font-style: normal;
  font-weight: 600;
}

.dash-empty-ok .material-icons-round {
  font-size: 20px;
}

/* Badges reutilizables */
.badge {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-info    { background: var(--info-10); color: #60a5fa; }
.badge-warning { background: var(--warning-10); color: #fbbf24; }
.badge-danger  { background: var(--danger-10);  color: #f87171; }
.badge-neutral { background: rgba(100,116,139,0.15); color: var(--text-gray); }

/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--surface-2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Responsive ─── */
@media (max-width: 1200px) {
  .dash-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .dash-bottom-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 768px) {
  .dash-kpi-grid { grid-template-columns: 1fr 1fr; }
  .dash-bottom-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fuel-tank-card { padding: 20px; }
  .fuel-tank-name { font-size: 1.6rem; }
  .fuel-tank-value { font-size: 2.4rem; }
}

@media (max-width: 575px) {
  .dash-bottom-grid { grid-template-columns: minmax(0, 1fr); }
}

/* ═══ HISTÓRICO DE COMBUSTIBLE 15 DÍAS ═══ */
.dash-fuel-history-section {
  width: 100%;
}

.fuel-history-panel {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 20px;
  padding: 24px 32px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-icon {
  font-size: 28px;
  color: var(--primary);
  background: var(--primary-10);
  padding: 8px;
  border-radius: 12px;
}

.panel-title {
  font-family: 'Oswald', sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--text-main);
  text-transform: uppercase;
}

.panel-desc {
  font-size: 0.75rem;
  color: var(--text-gray);
  margin-top: 2px;
}

.panel-header-right {
  display: flex;
  gap: 12px;
}

.legend-btn {
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.legend-btn:hover {
  background: var(--surface-3);
}

.legend-disabled {
  opacity: 0.4;
  background: transparent;
  border-color: var(--surface-2);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-gasolina {
  background: #06b6d4;
  box-shadow: 0 0 6px #06b6d4;
}

.dot-acpm {
  background: #f59e0b;
  box-shadow: 0 0 6px #f59e0b;
}

.legend-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-main);
}

.chart-container {
  position: relative;
  width: 100%;
}

.fuel-history-svg {
  width: 100%;
  height: auto;
  overflow: visible;
}

/* Tooltip Premium flotante con Glassmorphism */
.chart-tooltip {
  position: absolute;
  width: 200px;
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  z-index: 10;
  transition: left 0.15s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.15s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 6px;
}

.tooltip-icon {
  font-size: 14px;
  color: var(--text-muted);
}

.tooltip-date {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-main);
  text-transform: capitalize;
}

.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tooltip-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tooltip-color-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.indicator-gasolina {
  background: #06b6d4;
}

.indicator-acpm {
  background: #f59e0b;
}

.tooltip-label {
  font-size: 0.7rem;
  color: var(--text-gray);
  flex-grow: 1;
}

.tooltip-val {
  font-family: 'Oswald', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
}

.tooltip-unit {
  font-size: 0.65rem;
  font-weight: 400;
  color: var(--text-muted);
}

/* Animations */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* ═══ MODO CLARO (LIGHT MODE ADAPTATIONS) ═══ */
:global(.light-mode) .fuel-tank-card {
  background: var(--surface);
  border-color: var(--surface-2);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

:global(.light-mode) .fuel-tank-card:hover {
  border-color: rgba(255, 214, 0, 0.6);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

:global(.light-mode) .tank-hatch-cap {
  background: #cbd5e1;
  border-color: #94a3b8;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.06);
}

:global(.light-mode) .tank-cylinder-body {
  background: radial-gradient(ellipse at 50% 25%, #f8fafc 0%, #e2e8f0 100%);
  border-color: #cbd5e1;
  box-shadow: inset 0 6px 14px rgba(0, 0, 0, 0.08), inset 0 -4px 10px rgba(0, 0, 0, 0.04), 0 4px 14px rgba(0, 0, 0, 0.05);
}

:global(.light-mode) .tank-glare-reflection {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0) 100%);
}

:global(.light-mode) .tank-leg {
  background: #cbd5e1;
  border-color: #94a3b8;
}

:global(.light-mode) .liquid-acpm {
  background: linear-gradient(180deg, #10b981 0%, #059669 35%, #047857 75%, #065f46 100%);
  box-shadow: 0 -4px 16px rgba(16, 185, 129, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.35);
}

:global(.light-mode) .liquid-gasolina {
  background: linear-gradient(180deg, #f59e0b 0%, #d97706 35%, #b45309 75%, #92400e 100%);
  box-shadow: 0 -4px 16px rgba(245, 158, 11, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.35);
}

:global(.light-mode) .fuel-history-panel {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

:global(.light-mode) .chart-tooltip {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}

:global(.light-mode) .tooltip-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
</style>
