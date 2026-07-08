import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import http from '../api/http.js';

export const useNotificacionesStore = defineStore('notificaciones', () => {
  const notificaciones = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const total = ref(0);
  const currentPage = ref(1);
  const lastPage = ref(1);
  const serverUnreadCount = ref(0);

  const unreadCount = computed(() => serverUnreadCount.value);

  const sinLeer = computed(() =>
    notificaciones.value.filter((n) => !n.fecha_leido)
  );

  async function fetchNotificaciones(page = 1) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await http.get('/notifications', {
        params: { page, per_page: 20 },
      });
      if (data?.success) {
        notificaciones.value = data.data;
        total.value = data.total || data.data.length;
        currentPage.value = data.current_page || page;
        lastPage.value = data.last_page || 1;
        if (data.unread_count !== undefined) {
          serverUnreadCount.value = data.unread_count;
        }
      }
    } catch (e) {
      error.value = 'Error al cargar notificaciones';
      console.error('Error cargando notificaciones:', e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchUnreadCount() {
    try {
      const { data } = await http.get('/notifications/unread-count');
      if (data?.success) {
        serverUnreadCount.value = data.unread_count;
      }
    } catch (e) {
      console.error('Error obteniendo conteo de no leídas:', e);
    }
  }

  async function marcarLeida(id) {
    const item = notificaciones.value.find((n) => n.id === id);
    if (!item || item.fecha_leido) return;

    const previous = item.fecha_leido;
    item.fecha_leido = new Date().toISOString();
    serverUnreadCount.value = Math.max(0, serverUnreadCount.value - 1);

    try {
      await http.post(`/notifications/${id}/read`);
    } catch (e) {
      item.fecha_leido = previous;
      serverUnreadCount.value += 1;
      console.error('Error marcando notificación:', e);
    }
  }

  async function marcarTodasLeidas() {
    const anteriores = notificaciones.value
      .filter((n) => !n.fecha_leido)
      .map((n) => ({ id: n.id, fecha_leido: n.fecha_leido }));

    if (!anteriores.length) return;

    // Optimistic
    anteriores.forEach(({ id }) => {
      const n = notificaciones.value.find((n) => n.id === id);
      if (n) n.fecha_leido = new Date().toISOString();
    });
    
    const countAnteriores = anteriores.length;
    serverUnreadCount.value = Math.max(0, serverUnreadCount.value - countAnteriores);

    try {
      await http.post('/notifications/read-all');
    } catch (e) {
      // Rollback
      anteriores.forEach(({ id, fecha_leido }) => {
        const n = notificaciones.value.find((n) => n.id === id);
        if (n) n.fecha_leido = fecha_leido;
      });
      serverUnreadCount.value += countAnteriores;
      console.error('Error marcando todas:', e);
    }
  }

  /** Elimina una notificación específica del servidor y del estado local */
  async function eliminarNotificacion(id) {
    const index = notificaciones.value.findIndex((n) => n.id === id);
    if (index === -1) return;

    // Optimistic remove
    const [removed] = notificaciones.value.splice(index, 1);
    total.value = Math.max(0, total.value - 1);
    if (!removed.fecha_leido) {
      serverUnreadCount.value = Math.max(0, serverUnreadCount.value - 1);
    }

    try {
      await http.delete(`/notifications/${id}`);
    } catch (e) {
      // Rollback
      notificaciones.value.splice(index, 0, removed);
      total.value += 1;
      if (!removed.fecha_leido) {
        serverUnreadCount.value += 1;
      }
      console.error('Error eliminando notificación:', e);
    }
  }

  /** Elimina todas las notificaciones ya leídas */
  async function eliminarLeidas() {
    const leidas = notificaciones.value.filter((n) => !!n.fecha_leido);
    if (!leidas.length) return;

    // Optimistic remove
    notificaciones.value = notificaciones.value.filter((n) => !n.fecha_leido);
    total.value = notificaciones.value.length;

    try {
      await http.delete('/notifications/read');
    } catch (e) {
      // Rollback
      notificaciones.value = [...notificaciones.value, ...leidas];
      total.value = notificaciones.value.length;
      console.error('Error eliminando leídas:', e);
    }
  }

  /** Devuelve el ícono de Material Icons según el tipo */
  function iconoPorTipo(tipo) {
    const iconos = {
      stock_bajo: 'inventory_2',
      vencimiento_soat: 'description',
      vencimiento_tecnomecanica: 'description',
      mantenimiento_preventivo: 'build',
      orden: 'build_circle',
      orden_creada: 'assignment_add',
      orden_estado: 'swap_horiz',
      orden_reasignada: 'person_pin',
      programacion_asignada: 'event_available',
      novedad_reportada: 'report_problem',
    };
    return iconos[tipo] || 'notifications';
  }

  /** Devuelve la ruta de navegación según tipo y relacionado_id */
  function rutaPorNotificacion(tipo, relacionadoId) {
    const stockTypes = ['stock_bajo', 'inventory'];
    const soatTecnoTypes = ['vencimiento_soat', 'vencimiento_tecnomecanica', 'mantenimiento_preventivo'];

    if (soatTecnoTypes.includes(tipo)) {
      const vehiculoId = relacionadoId?.split('|')[0] || null;
      return { path: '/fleet', query: vehiculoId ? { vehiculo_id: vehiculoId } : {} };
    }
    if (stockTypes.includes(tipo)) {
      return { path: '/inventory', query: relacionadoId ? { producto_id: relacionadoId } : {} };
    }

    const ordenTypes = ['orden', 'orden_creada', 'orden_estado', 'orden_reasignada'];
    if (ordenTypes.includes(tipo)) {
      return '/work-orders';
    }

    if (tipo === 'programacion_asignada' || tipo === 'novedad_reportada') {
      return '/scheduler';
    }

    return null;
  }

  function addNotification(notification) {
    // Evitar duplicados por id
    if (!notificaciones.value.find((n) => n.id === notification.id)) {
      notificaciones.value.unshift(notification);
      serverUnreadCount.value++;
      total.value++;
    }
  }

  return {
    notificaciones,
    loading,
    error,
    total,
    currentPage,
    lastPage,
    unreadCount,
    serverUnreadCount,
    sinLeer,
    fetchNotificaciones,
    fetchUnreadCount,
    marcarLeida,
    marcarTodasLeidas,
    eliminarNotificacion,
    eliminarLeidas,
    iconoPorTipo,
    rutaPorNotificacion,
    addNotification,
  };
});
