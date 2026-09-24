import { getCurrentInstance, onBeforeUnmount, ref } from 'vue';

import { computeBackoffDelay, shouldPollTick } from '../utils/polling';

/**
 * Polling con backoff y pausa en pestaña oculta (plan sección 10).
 *
 * `task` devuelve `false` para detener el ciclo (estado final); cualquier otro
 * valor programa el siguiente tick con backoff. Al volver a la pestaña se
 * dispara un tick inmediato.
 */
export function usePolling(task, options = {}) {
  const { immediate = false, baseMs, maxMs, jitterRatio } = options;
  const active = ref(false);
  const attempts = ref(0);
  let timer = null;

  const isHidden = () => (typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false);
  const isOnline = () => (typeof navigator !== 'undefined' ? navigator.onLine !== false : true);

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule(delay = null) {
    clearTimer();

    if (!active.value) return;

    timer = setTimeout(tick, delay ?? computeBackoffDelay(attempts.value, { baseMs, maxMs, jitterRatio }));
  }

  async function tick() {
    if (!active.value) return;

    if (!shouldPollTick({ hidden: isHidden(), online: isOnline() })) {
      schedule();
      return;
    }

    try {
      const keepGoing = await task();

      if (keepGoing === false) {
        stop();
        return;
      }

      attempts.value = 0;
    } catch {
      attempts.value += 1;
    }

    schedule();
  }

  function start() {
    if (active.value) return;
    active.value = true;
    attempts.value = 0;
    schedule(0);
  }

  function stop() {
    active.value = false;
    clearTimer();
  }

  function onVisibilityChange() {
    if (!active.value) return;
    if (!isHidden()) schedule(0);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    });
  }

  if (immediate) start();

  return { active, attempts, start, stop };
}
