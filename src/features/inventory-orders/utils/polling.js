/**
 * Polling moderado con backoff y pausa en pestaña oculta (plan sección 10).
 *
 * Sin realtime, la UI consulta el estado de OCR / bandeja con un intervalo que
 * crece exponencialmente hasta un tope y se detiene cuando la pestaña no es
 * visible (el evento visibilitychange reanuda con un tick inmediato).
 */

export const POLLING_DEFAULTS = {
  baseMs: 2500,
  maxMs: 30000,
  jitterRatio: 0.2,
};

export function computeBackoffDelay(attempt = 0, options = {}, random = Math.random) {
  const { baseMs, maxMs, jitterRatio } = { ...POLLING_DEFAULTS, ...options };
  const intento = Math.max(0, Number(attempt) || 0);
  const techo = Math.min(maxMs, baseMs * 2 ** intento);
  const jitter = techo * jitterRatio * (random() * 2 - 1);

  return Math.max(baseMs, Math.round(techo + jitter));
}

export function shouldPollTick({ hidden = false, online = true } = {}) {
  return !hidden && online !== false;
}

export function esEstadoFinalOcr(estado) {
  return ['completado', 'requiere_revision', 'fallido', 'cancelado', 'obsoleto'].includes(estado);
}
