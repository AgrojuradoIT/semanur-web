import { reactive } from 'vue';

const state = reactive({
  show: false,
  type: 'info',
  title: '',
  message: '',
  duration: 0,
  actionLabel: '',
  onAction: null,
});

const queue = [];
let autoDismissTimer = null;
let currentShowTime = 0;

export function useDynamicIsland() {
  function notify({ type = 'info', title, message = '', duration = 0, actionLabel = '', onAction = null } = {}) {
    const item = { type, title, message, duration, actionLabel, onAction };

    if (state.show) {
      const timeShown = Date.now() - currentShowTime;
      // Hacemos morphing inmediato si:
      // 1. Es un error (alta prioridad)
      // 2. La notificación actual ya se mostró por más de 1.2 segundos
      // 3. La cola de espera está creciendo (más de 1 notificación esperando)
      if (type === 'error' || timeShown > 1200 || queue.length > 0) {
        morphTo(item);
      } else {
        queue.push(item);
      }
    } else {
      show(item);
    }
  }

  function show(item) {
    if (autoDismissTimer) clearTimeout(autoDismissTimer);
    
    currentShowTime = Date.now();
    Object.assign(state, {
      show: true,
      type: item.type,
      title: item.title,
      message: item.message,
      duration: item.duration,
      actionLabel: item.actionLabel,
      onAction: item.onAction,
    });

    setupAutoDismiss(item.duration);
  }

  function morphTo(item) {
    if (autoDismissTimer) clearTimeout(autoDismissTimer);
    
    // 1. Colapsar la isla limpiando temporalmente el mensaje
    state.message = '';
    
    // 2. Tras una animación de contracción rápida (250ms), cambiamos el contenido
    setTimeout(() => {
      currentShowTime = Date.now();
      Object.assign(state, {
        type: item.type,
        title: item.title,
        message: item.message,
        duration: item.duration,
        actionLabel: item.actionLabel,
        onAction: item.onAction,
      });
      setupAutoDismiss(item.duration);
    }, 250);
  }

  function setupAutoDismiss(duration) {
    if (autoDismissTimer) clearTimeout(autoDismissTimer);
    
    if (duration > 0) {
      autoDismissTimer = setTimeout(() => {
        if (queue.length > 0) {
          // Si hay más notificaciones esperando, transicionamos a la siguiente
          morphTo(queue.shift());
        } else {
          dismiss();
        }
      }, duration);
    }
  }

  function dismiss() {
    if (autoDismissTimer) clearTimeout(autoDismissTimer);
    state.show = false;
    
    // Si quedan elementos en la cola al cerrar, los mostramos después de la animación de cierre (400ms)
    if (queue.length > 0) {
      setTimeout(() => {
        show(queue.shift());
      }, 400);
    }
  }

  function handleAction() {
    if (state.onAction) state.onAction();
    dismiss();
  }

  return {
    islandState: state,
    notify,
    dismiss,
    handleAction,
  };
}
