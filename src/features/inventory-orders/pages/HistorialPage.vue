<template>
  <div class="historial-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Historial {{ order?.numero ?? '' }}</h1>
        <p class="page-subtitle">Eventos append-only con actor, revisión y cambios registrados del pedido.</p>
      </div>
      <RouterLink class="ghost-link" :to="{ name: 'inventory-orders-novedades', params: { uuid } }">
        Volver a novedades
      </RouterLink>
    </header>

    <div class="filtros">
      <div class="form-field">
        <label for="filtro-tipo">Tipo de evento</label>
        <select id="filtro-tipo" v-model="filtros.tipo" @change="cargar(1)">
          <option value="">Todos</option>
          <option v-for="tipo in tipos" :key="tipo" :value="tipo">{{ eventoLabel(tipo) }}</option>
        </select>
      </div>
      <div class="form-field">
        <label for="filtro-linea">Línea</label>
        <input id="filtro-linea" v-model="filtros.lineaId" type="text" inputmode="numeric" @keyup.enter="cargar(1)">
      </div>
      <button type="button" class="ghost-btn" @click="cargar(1)">Aplicar</button>
    </div>

    <div class="historial-page__body">
      <HistorialTimeline :eventos="eventos" :loading="loading" :error="error" />
    </div>

    <TablePagination
      v-if="meta.total > 0"
      :current-page="meta.current_page"
      :total-pages="meta.last_page"
      :total-items="meta.total"
      :per-page="meta.per_page"
      item-name="eventos"
      :loading="loading"
      @change-page="cargar"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

import HistorialTimeline from '../components/HistorialTimeline.vue';
import TablePagination from '../../../shared/components/TablePagination.vue';
import { getOrder, listOrderHistory } from '../services/inventoryOrdersService';
import { eventoLabel } from '../utils/history';

const route = useRoute();
const uuid = computed(() => route.params.uuid);

const order = ref(null);
const eventos = ref([]);
const loading = ref(false);
const error = ref(null);
const filtros = reactive({ tipo: '', lineaId: '' });
const meta = reactive({ current_page: 1, last_page: 1, per_page: 25, total: 0 });

const tipos = [
  'borrador_creado',
  'borrador_actualizado',
  'documento_cargado',
  'ocr_solicitado',
  'pedido_publicado',
  'pedido_retirado',
  'pedido_cancelado',
  'novedad_abierta',
  'novedad_respondida',
  'desfase_autorizado',
  'desfase_invalidado',
  'pedido_recibido',
  'recibido_con_novedad',
  'recibido_con_desfase',
];

async function cargar(page = 1) {
  loading.value = true;
  error.value = null;

  try {
    const body = await listOrderHistory(uuid.value, {
      page,
      per_page: meta.per_page,
      tipo: filtros.tipo || undefined,
      linea_id: filtros.lineaId ? Number(filtros.lineaId) : undefined,
    });

    eventos.value = body?.data ?? [];
    Object.assign(meta, {
      current_page: body?.meta?.current_page ?? 1,
      last_page: body?.meta?.last_page ?? 1,
      per_page: body?.meta?.per_page ?? 25,
      total: body?.meta?.total ?? eventos.value.length,
    });
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  order.value = await getOrder(uuid.value).catch(() => null);
  cargar(1);
});
</script>

<style scoped>
.historial-page {
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

.historial-page__body {
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  background: var(--surface, #1e1e1e);
  padding: 14px;
}

.ghost-link,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: transparent;
  color: var(--text-main, #f5f5f5);
  text-decoration: none;
  font-size: 0.84rem;
  cursor: pointer;
}
</style>
