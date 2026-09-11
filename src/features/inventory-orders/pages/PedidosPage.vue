<template>
  <div class="pedidos-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Pedidos</h1>
        <p class="page-subtitle">
          Lo cargado se muestra como <strong>esperado</strong>; solo la recepción física de bodega ingresa stock.
        </p>
      </div>
      <RouterLink
        v-if="puedeCrear"
        class="primary-btn"
        :to="{ name: 'inventory-orders-new' }"
      >
        <span class="material-icons-round" aria-hidden="true">add</span> Nuevo pedido
      </RouterLink>
    </header>

    <div class="filtros" role="search">
      <button
        type="button"
        class="filtros__vista"
        :aria-pressed="vista === 'todos'"
        @click="cambiarVista('todos')"
      >
        Todos
      </button>
      <button
        v-if="puedeRecibir"
        type="button"
        class="filtros__vista"
        :aria-pressed="vista === 'por-recibir'"
        @click="cambiarVista('por-recibir')"
      >
        Por recibir
      </button>

      <div class="form-field">
        <label for="filtro-estado">Estado</label>
        <select id="filtro-estado" v-model="filtros.estado" @change="cargar(1)">
          <option value="">Todos</option>
          <option v-for="(label, value) in estados" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>

      <div class="form-field">
        <label for="filtro-proveedor">Proveedor</label>
        <input id="filtro-proveedor" v-model="filtros.proveedor" type="text" autocomplete="off" @keyup.enter="cargar(1)">
      </div>

      <button type="button" class="ghost-btn" @click="cargar(1)">
        <span class="material-icons-round" aria-hidden="true">search</span> Buscar
      </button>
    </div>

    <p v-if="error" class="page-alert page-alert--error" role="alert">
      {{ error.displayMessage || 'No fue posible cargar los pedidos.' }}
    </p>

    <div class="table-wrap">
      <table class="pedidos-table">
        <caption class="visually-hidden">Listado paginado de pedidos de inventario</caption>
        <thead>
          <tr>
            <th scope="col">Número</th>
            <th scope="col">Proveedor</th>
            <th scope="col">Publicado</th>
            <th scope="col">Bodega</th>
            <th scope="col">Estado</th>
            <th scope="col">Líneas</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="pedidos-table__status" role="status">Cargando pedidos…</td>
          </tr>
          <tr v-else-if="pedidos.length === 0">
            <td colspan="7" class="pedidos-table__status">No hay pedidos con estos filtros.</td>
          </tr>
          <tr v-for="pedido in pedidos" :key="pedido.uuid">
            <td class="pedidos-table__numero">{{ pedido.numero || 'Borrador' }}</td>
            <td>{{ pedido.proveedor_nombre_confirmado || pedido.proveedor_nombre_raw || '—' }}</td>
            <td>{{ pedido.published_at ? formatDateTimeCO(pedido.published_at) : '—' }}</td>
            <td>{{ pedido.bodega?.nombre || `Bodega #${pedido.bodega_id}` }}</td>
            <td><LineaEstadoBadge :estado="pedido.estado" tipo="pedido" /></td>
            <td>{{ pedido.lineas_count ?? '—' }}</td>
            <td>
              <div class="acciones">
                <RouterLink
                  v-if="pedido.estado === 'borrador' && puedeCrear"
                  class="acciones__link"
                  :to="{ name: 'inventory-orders-review', params: { uuid: pedido.uuid } }"
                >
                  Revisar
                </RouterLink>
                <RouterLink
                  v-if="puedeRecibir && !esTerminal(pedido.estado)"
                  class="acciones__link"
                  :to="{ name: 'inventory-orders-recepcion', params: { uuid: pedido.uuid } }"
                >
                  Recibir
                </RouterLink>
                <RouterLink
                  class="acciones__link"
                  :to="{ name: 'inventory-orders-novedades', params: { uuid: pedido.uuid } }"
                >
                  Novedades
                </RouterLink>
                <RouterLink
                  class="acciones__link"
                  :to="{ name: 'inventory-orders-historial', params: { uuid: pedido.uuid } }"
                >
                  Historial
                </RouterLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <TablePagination
        :current-page="meta.current_page"
        :total-pages="meta.last_page"
        :total-items="meta.total"
        :per-page="meta.per_page"
        item-name="pedidos"
        :loading="loading"
        @change-page="cargar"
        @change-per-page="cambiarPerPage"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import LineaEstadoBadge from '../components/LineaEstadoBadge.vue';
import TablePagination from '../../../shared/components/TablePagination.vue';
import { formatDateTimeCO } from '../../../shared/utils/formatters';
import { useAuthStore } from '../../../shared/stores/auth';
import { listOrders } from '../services/inventoryOrdersService';
import { esPedidoTerminal, ESTADOS_PEDIDO_CONOCIDOS, estadoPedidoLabel } from '../utils/orders';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const pedidos = ref([]);
const loading = ref(false);
const error = ref(null);
const filtros = reactive({ estado: '', proveedor: '' });
const meta = reactive({ current_page: 1, last_page: 1, per_page: 25, total: 0 });

const puedeCrear = computed(() => auth.hasPermission('pedidos.create'));
const puedeRecibir = computed(() => auth.hasPermission('pedidos.receive'));
const vista = computed(() => (route.query.vista === 'por-recibir' && puedeRecibir.value ? 'por-recibir' : 'todos'));
const estados = ESTADOS_PEDIDO_CONOCIDOS.reduce((acc, key) => {
  acc[key] = estadoPedidoLabel(key);
  return acc;
}, {});

function esTerminal(estado) {
  return esPedidoTerminal(estado);
}

async function cargar(page = 1) {
  loading.value = true;
  error.value = null;

  try {
    const body = await listOrders({
      page,
      per_page: meta.per_page,
      estado: vista.value === 'por-recibir' ? 'pendiente_recepcion' : (filtros.estado || undefined),
      proveedor: filtros.proveedor || undefined,
    });

    pedidos.value = body?.data ?? [];
    Object.assign(meta, {
      current_page: body?.meta?.current_page ?? 1,
      last_page: body?.meta?.last_page ?? 1,
      per_page: body?.meta?.per_page ?? 25,
      total: body?.meta?.total ?? pedidos.value.length,
    });
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
}

function cambiarVista(nueva) {
  router.replace({ query: nueva === 'por-recibir' ? { vista: 'por-recibir' } : {} });
  cargar(1);
}

function cambiarPerPage(perPage) {
  meta.per_page = perPage;
  cargar(1);
}

onMounted(() => cargar(1));
</script>

<style scoped>
.pedidos-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 1.35rem;
}

.page-subtitle {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: var(--text-gray, #9e9e9e);
}

.filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  background: var(--surface, #1e1e1e);
}

.filtros__vista {
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: transparent;
  color: var(--text-main, #f5f5f5);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.84rem;
}

.filtros__vista[aria-pressed='true'] {
  border-color: var(--primary, #2b8cee);
  background: rgba(43, 140, 238, 0.15);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field label {
  font-size: 0.78rem;
  color: var(--text-gray, #9e9e9e);
}

.form-field input,
.form-field select {
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: var(--surface-2, #2c2c2c);
  color: var(--text-main, #f5f5f5);
  font-size: 0.85rem;
}

.table-wrap {
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  overflow: hidden;
}

.pedidos-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.pedidos-table th,
.pedidos-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border, #3a3a3a);
}

.pedidos-table th {
  background: var(--surface-2, #2c2c2c);
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-gray, #9e9e9e);
}

.pedidos-table__numero {
  font-weight: 600;
}

.pedidos-table__status {
  text-align: center;
  color: var(--text-gray, #9e9e9e);
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.acciones__link {
  color: var(--primary, #2b8cee);
  font-size: 0.8rem;
  text-decoration: underline;
}

.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  padding: 8px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.86rem;
  text-decoration: none;
  cursor: pointer;
}

.primary-btn {
  background: var(--primary, #2b8cee);
  border: 1px solid var(--primary, #2b8cee);
  color: #fff;
}

.ghost-btn {
  background: transparent;
  border: 1px solid var(--border, #3a3a3a);
  color: var(--text-main, #f5f5f5);
}

.page-alert {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
}

.page-alert--error {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.4);
  color: #ff9a94;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
