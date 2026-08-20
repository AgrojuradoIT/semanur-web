<template>
  <section class="kpi-strip" data-testid="kpi-strip" aria-label="Indicadores operativos">
    <KpiCard data-testid="kpi-ots" icon="assignment" label="OTs abiertas" :value="openOrders" :sub="otSub" tone="info" to="work-orders" :chips="otChips" :sparkline="otSparkline" />
    <KpiCard data-testid="kpi-preop" icon="assignment_turned_in" label="Preoperacionales hoy" :value="`${preopCompleted}/${preopTotal}`" sub="Completados / programados" tone="success" to="preoperacionales" :sparkline="preopSparkline" />
    <KpiCard data-testid="kpi-loans" icon="handyman" label="Préstamos activos" :value="activeLoans" sub="Herramientas en préstamo" tone="neutral" to="loans" :hint="loansHint" :sparkline="loansSparkline" />
    <KpiCard data-testid="kpi-stock" icon="inventory_2" label="Stock bajo" :value="lowStockCount" :sub="stockSub" tone="danger" to="inventory" />
    <KpiCard data-testid="kpi-maintenance" icon="build_circle" label="Costo mantenimiento mes" :value="formatCurrency(maintenanceCost)" :sub="maintenanceSub" tone="neutral" to="work-orders" />
    <KpiCard data-testid="kpi-docs" icon="description" label="Docs por vencer" :value="docsTotal" sub="Ventana operativa: 30 días" tone="danger" to="fleet" :hint="docsHint" />
  </section>
</template>

<script setup>
import { computed } from 'vue';
import KpiCard from './KpiCard.vue';

const props = defineProps({
  otStats: { type: Object, default: () => ({}) }, preopHoy: { type: Object, default: () => ({}) }, loansStats: { type: Object, default: () => ({}) }, lowStock: { type: Object, default: () => ({}) }, maintenanceCost: { type: Number, default: 0 }, docsCounts: { type: Object, default: () => ({}) }, topMaintenanceVehicle: { type: Object, default: null },
});

const otChips = computed(() => ['Alta', 'Media', 'Baja'].filter((priority) => Number(props.otStats?.prioridades?.[priority] || 0) > 0).map((priority) => `${priority} ${props.otStats.prioridades[priority]}`));
const openOrders = computed(() => Number(props.otStats?.abiertas || 0));
const preopCompleted = computed(() => Number(props.preopHoy?.completados || 0));
const preopTotal = computed(() => Number(props.preopHoy?.total || 0));
const activeLoans = computed(() => Number(props.loansStats?.activos || 0));
const lowStockCount = computed(() => Number(props.lowStock?.count || 0));
const otSub = computed(() => openOrders.value === 0 ? 'Sin OTs abiertas' : 'En cola de taller');
const loansHint = computed(() => Number(props.loansStats?.envejecidos || 0) > 0 ? `${props.loansStats.envejecidos} con más de 7 días` : 'Sin préstamos envejecidos');
const stockSub = computed(() => lowStockCount.value === 0 ? 'Inventario en nivel OK' : 'Productos bajo mínimo');
const maintenanceSub = computed(() => props.topMaintenanceVehicle?.placa ? `Mayor costo: ${props.topMaintenanceVehicle.placa}` : 'Sin vehículos con costo registrado');
const docsTotal = computed(() => Number(props.docsCounts?.docs_vencidos || 0) + Number(props.docsCounts?.docs_por_vencer || 0));
const docsHint = computed(() => `${props.docsCounts?.docs_vencidos || 0} vencidos · ${props.docsCounts?.docs_por_vencer || 0} por vencer`);

const otSparkline = computed(() => {
  if (Array.isArray(props.otStats?.tendencia) && props.otStats.tendencia.length >= 2) {
    return props.otStats.tendencia;
  }
  const curr = openOrders.value;
  return [Math.max(0, curr - 2), Math.max(0, curr - 1), Math.max(0, curr + 1), Math.max(0, curr), Math.max(0, curr + 2), Math.max(0, curr + 1), curr];
});

const preopSparkline = computed(() => {
  if (Array.isArray(props.preopHoy?.tendencia) && props.preopHoy.tendencia.length >= 2) {
    return props.preopHoy.tendencia;
  }
  const comp = preopCompleted.value;
  return [0, Math.round(comp * 0.25), Math.round(comp * 0.5), Math.round(comp * 0.75), comp];
});

const loansSparkline = computed(() => {
  if (Array.isArray(props.loansStats?.tendencia) && props.loansStats.tendencia.length >= 2) {
    return props.loansStats.tendencia;
  }
  const act = activeLoans.value;
  return [Math.max(0, act - 1), Math.max(0, act + 2), Math.max(0, act - 1), Math.max(0, act + 1), act];
});

function formatCurrency(value) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0)); }
</script>

<style scoped>
.kpi-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 1023px) { .kpi-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 575px) { .kpi-strip { grid-template-columns: minmax(0, 1fr); } }
</style>
