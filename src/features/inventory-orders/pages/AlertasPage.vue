<template>
  <div class="alertas-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Bandeja de alertas de pedidos</h1>
        <p class="page-subtitle">
          Alertas Web persistentes y deduplicadas del flujo de pedidos; no son las notificaciones móviles.
        </p>
      </div>
      <button type="button" class="ghost-btn" :disabled="state.loading" @click="recargar">
        <span class="material-icons-round" aria-hidden="true">refresh</span>
        {{ state.loading ? 'Actualizando…' : 'Actualizar' }}
      </button>
    </header>

    <p class="alertas-page__contador" role="status" aria-live="polite">
      <strong>{{ state.unreadCount }}</strong> sin leer de {{ state.meta?.total ?? state.items.length }} alertas.
    </p>

    <div class="filtros">
      <div class="form-field">
        <label for="filtro-alerta-tipo">Tipo</label>
        <select id="filtro-alerta-tipo" v-model="filtros.tipo" @change="recargar">
          <option value="">Todas</option>
          <option v-for="(label, value) in tipos" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
      <div class="form-field">
        <label for="filtro-alerta-leida">Lectura</label>
        <select id="filtro-alerta-leida" v-model="filtros.leida" @change="recargar">
          <option value="">Todas</option>
          <option value="no">No leídas</option>
          <option value="si">Leídas</option>
        </select>
      </div>
    </div>

    <p v-if="state.error" class="page-alert page-alert--error" role="alert">
      {{ state.error.displayMessage || 'No fue posible cargar la bandeja.' }}
    </p>

    <ul v-if="state.items.length > 0" class="alertas-list" aria-label="Alertas de pedidos">
      <li v-for="alerta in state.items" :key="alerta.alerta_id" class="alertas-list__item" :class="{ 'is-unread': !alerta.leida }">
        <div class="alertas-list__body">
          <div class="alertas-list__head">
            <LineaEstadoBadge :estado="alerta.tipo" tipo="alerta" />
            <time :datetime="alerta.created_at">{{ formatDateTimeCO(alerta.created_at) }}</time>
          </div>
          <p class="alertas-list__pedido">
            <RouterLink v-if="rutaDe(alerta)" class="alertas-list__link" :to="rutaDe(alerta)">
              {{ alerta.pedido?.numero || alerta.pedido?.uuid || 'Pedido' }}
            </RouterLink>
            <span v-if="alerta.pedido?.estado"> · estado {{ estadoPedidoLabel(alerta.pedido.estado) }}</span>
          </p>
          <p v-if="!alerta.leida" class="alertas-list__unread">Sin leer</p>
          <p v-else class="alertas-list__leida">Leída {{ alerta.leida_at ? formatDateTimeCO(alerta.leida_at) : '' }}</p>
        </div>
        <div class="alertas-list__actions">
          <button
            v-if="!alerta.leida"
            type="button"
            class="ghost-btn ghost-btn--small"
            :disabled="marcandoId === alerta.alerta_id"
            @click="marcarLeida(alerta)"
          >
            {{ marcandoId === alerta.alerta_id ? 'Marcando…' : 'Marcar como leída' }}
          </button>
        </div>
      </li>
    </ul>

    <p v-else-if="!state.loading" class="page-status">No hay alertas con estos filtros.</p>

    <TablePagination
      v-if="(state.meta?.total ?? 0) > 0"
      :current-page="state.meta?.current_page ?? 1"
      :total-pages="state.meta?.last_page ?? 1"
      :total-items="state.meta?.total ?? 0"
      :per-page="state.meta?.per_page ?? 25"
      item-name="alertas"
      :loading="state.loading"
      @change-page="cargar"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';

import LineaEstadoBadge from '../components/LineaEstadoBadge.vue';
import TablePagination from '../../../shared/components/TablePagination.vue';
import { formatDateTimeCO } from '../../../shared/utils/formatters';
import { useAlertsInbox } from '../composables/useAlertsInbox';
import { rutaAlertaTipoPedido } from '../utils/alerts';
import { estadoPedidoLabel, TIPOS_ALERTA_CONOCIDOS, alertaTipoLabel } from '../utils/orders';

const { state, refresh, markRead } = useAlertsInbox();

const filtros = reactive({ tipo: '', leida: '' });
const marcandoId = ref(null);

const tipos = TIPOS_ALERTA_CONOCIDOS.reduce((acc, key) => {
  acc[key] = alertaTipoLabel(key);
  return acc;
}, {});

const leidaParam = computed(() => {
  if (filtros.leida === 'no') return false;
  if (filtros.leida === 'si') return true;
  return null;
});

function rutaDe(alerta) {
  return rutaAlertaTipoPedido(alerta);
}

async function cargar(page = 1) {
  await refresh({
    tipo: filtros.tipo || null,
    leida: leidaParam.value,
    page,
    perPage: 25,
  }).catch(() => {});
}

function recargar() {
  cargar(1);
}

async function marcarLeida(alerta) {
  marcandoId.value = alerta.alerta_id;

  try {
    await markRead(alerta.alerta_id);
  } finally {
    marcandoId.value = null;
  }
}

onMounted(recargar);
</script>

<style scoped>
.alertas-page {
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

.alertas-page__contador {
  margin: 0;
  font-size: 0.88rem;
}

.filtros {
  display: flex;
  flex-wrap: wrap;
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
  min-width: 180px;
}

.form-field label {
  font-size: 0.78rem;
  color: var(--text-gray, #9e9e9e);
}

.form-field select {
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: var(--surface-2, #2c2c2c);
  color: var(--text-main, #f5f5f5);
  font-size: 0.85rem;
}

.alertas-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alertas-list__item {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--border, #3a3a3a);
  background: var(--surface, #1e1e1e);
}

.alertas-list__item.is-unread {
  border-left: 4px solid var(--primary, #2b8cee);
}

.alertas-list__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.alertas-list__head time {
  font-size: 0.75rem;
  color: var(--text-muted, #757575);
}

.alertas-list__pedido {
  margin: 6px 0 0;
  font-size: 0.85rem;
}

.alertas-list__link {
  color: var(--primary, #2b8cee);
}

.alertas-list__unread {
  margin: 4px 0 0;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--primary, #2b8cee);
}

.alertas-list__leida {
  margin: 4px 0 0;
  font-size: 0.76rem;
  color: var(--text-muted, #757575);
}

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
  font-size: 0.84rem;
  cursor: pointer;
}

.ghost-btn--small {
  min-height: 32px;
  padding: 4px 10px;
  font-size: 0.78rem;
}

.ghost-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-status {
  margin: 0;
  color: var(--text-gray, #9e9e9e);
  font-size: 0.85rem;
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
</style>
