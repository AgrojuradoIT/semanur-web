<template>
  <RouterLink :to="{ name: to }" class="kpi-card" :class="[`kpi-card--${tone}`, { 'kpi-card--has-sparkline': Boolean(sparklinePath) }]">
    <span class="kpi-card__icon material-icons-round" aria-hidden="true">{{ icon }}</span>
    <span class="kpi-card__label">{{ label }}</span>
    <strong class="kpi-card__value">{{ value }}</strong>
    
    <div v-if="sparklinePath" class="kpi-card__sparkline-wrap" data-testid="kpi-sparkline">
      <svg class="kpi-card__sparkline" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="sparkColor" stop-opacity="0.45" />
            <stop offset="100%" :stop-color="sparkColor" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <path :d="sparklinePath.areaPath" :fill="`url(#${gradientId})`" />
        <path :d="sparklinePath.linePath" fill="none" :stroke="sparkColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <span class="kpi-card__sub">{{ sub }}</span>
    <span v-if="hint" class="kpi-card__hint">{{ hint }}</span>
    <span v-if="chips?.length" class="kpi-card__chips" aria-label="Indicadores de prioridad"><span v-for="chip in chips" :key="chip" class="kpi-card__chip">{{ chip }}</span></span>
  </RouterLink>
</template>

<script setup>
import { computed, useId } from 'vue';

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  sub: { type: String, default: '' },
  tone: { type: String, default: 'neutral' },
  to: { type: String, required: true },
  chips: { type: Array, default: () => [] },
  hint: { type: String, default: '' },
  sparkline: { type: Array, default: null },
  sparklineColor: { type: String, default: '' },
});

const instanceId = typeof useId === 'function' ? useId() : Math.random().toString(36).substring(2, 9);
const gradientId = computed(() => `kpi-spark-grad-${instanceId}`);

const sparkColor = computed(() => {
  if (props.sparklineColor) return props.sparklineColor;
  switch (props.tone) {
    case 'info':
      return '#3b82f6';
    case 'success':
      return '#10b981';
    case 'danger':
      return '#ef4444';
    case 'warning':
      return '#f59e0b';
    case 'neutral':
    default:
      return '#8b5cf6';
  }
});

const sparklinePath = computed(() => {
  if (!Array.isArray(props.sparkline) || props.sparkline.length < 2) return null;
  const data = props.sparkline.map(Number);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max === min ? 1 : max - min;
  const width = 100;
  const height = 24;
  const paddingTop = 4;
  const paddingBottom = 4;
  const usableHeight = height - paddingTop - paddingBottom;

  const pts = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - paddingBottom - ((val - min) / range) * usableHeight;
    return { x, y };
  });

  let linePath = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cp1x = (p0.x + p1.x) / 2;
    const cp1y = p0.y;
    const cp2x = (p0.x + p1.x) / 2;
    const cp2y = p1.y;
    linePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }

  const areaPath = `${linePath} L 100,32 L 0,32 Z`;
  return { linePath, areaPath };
});
</script>

<style scoped>
.kpi-card { display: grid; grid-template-columns: auto 1fr; gap: 5px 10px; min-inline-size: 0; padding: 18px; border: 1px solid var(--surface-2); border-radius: 14px; background: var(--surface); color: var(--text-main); text-decoration: none; transition: border-color .2s ease, transform .2s ease, background .2s ease; }
.kpi-card:hover { transform: translateY(-2px); border-color: var(--surface-3); background: color-mix(in srgb, var(--surface) 92%, var(--primary) 8%); }
.kpi-card:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
.kpi-card__icon { grid-row: span 2; display: grid; place-items: center; inline-size: 38px; block-size: 38px; border-radius: 10px; background: var(--primary-10); color: var(--primary); }
.kpi-card__label { align-self: end; overflow-wrap: anywhere; font-size: .68rem; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; color: var(--text-secondary); }
.kpi-card__value { font-family: 'Oswald', sans-serif; font-size: 2rem; line-height: 1; letter-spacing: .3px; }
.kpi-card__sparkline-wrap { grid-column: 1 / -1; inline-size: 100%; block-size: 26px; margin-block: 2px 4px; overflow: hidden; border-radius: 4px; }
.kpi-card__sparkline { display: block; inline-size: 100%; block-size: 100%; }
.kpi-card__sub, .kpi-card__hint { grid-column: 1 / -1; min-inline-size: 0; color: var(--text-secondary); font-size: .72rem; }
.kpi-card__hint { color: #fbbf24; font-weight: 700; }
.kpi-card__chips { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 4px; }
.kpi-card__chip { padding: 2px 7px; border-radius: 4px; background: var(--warning-10); color: #fbbf24; font-size: .62rem; font-weight: 800; letter-spacing: .35px; text-transform: uppercase; }
.kpi-card--danger .kpi-card__icon { background: var(--danger-10); color: #f87171; }
.kpi-card--info .kpi-card__icon { background: var(--info-10); color: #60a5fa; }
.kpi-card--success .kpi-card__icon { background: var(--success-10); color: var(--success); }
.kpi-card--neutral .kpi-card__icon { background: rgba(100, 116, 139, .15); color: var(--text-gray); }
</style>
