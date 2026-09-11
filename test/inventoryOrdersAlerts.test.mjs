import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAlertQuery, contarNoLeidas, mergeUniqueAlerts } from '../src/features/inventory-orders/utils/alerts.js';
import { createAlertsStore } from '../src/features/inventory-orders/utils/alertsStore.js';

const alerta = (id, extra = {}) => ({
  alerta_id: id,
  tipo: 'pedido_publicado',
  leida: false,
  pedido: { uuid: `pedido-${id}`, numero: `PED-${id}`, estado: 'pendiente_recepcion' },
  ...extra,
});

test('deduplica alertas por id conservando el orden de llegada', () => {
  const mezcla = mergeUniqueAlerts(
    [alerta(1), alerta(2)],
    [alerta(2), alerta(3), alerta(1)],
  );

  assert.deepEqual(mezcla.map((item) => item.alerta_id), [1, 2, 3]);
  assert.equal(contarNoLeidas(mezcla), 3);
  assert.equal(contarNoLeidas([alerta(1, { leida: true }), alerta(2)]), 1);
});

test('construye la query de la bandeja sin parámetros vacíos', () => {
  assert.deepEqual(buildAlertQuery({}), { page: 1, per_page: 25 });
  assert.deepEqual(buildAlertQuery({ tipo: 'novedad_abierta', leida: false, page: 2, perPage: 10 }), {
    page: 2,
    per_page: 10,
    tipo: 'novedad_abierta',
    leida: 0,
  });
});

test('la bandeja usa meta.unread_count del servidor y marca leídas sin inventar', async () => {
  const marcas = [];
  const store = createAlertsStore({
    api: {
      listAlerts: async () => ({
        data: [alerta(10), alerta(11, { leida: true })],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 2, unread_count: 5 },
      }),
      readAlert: async (id) => {
        marcas.push(id);
        return { alerta_id: id, leida: true, leida_at: '2026-09-10T12:00:00Z' };
      },
    },
    now: () => '2026-09-10T12:00:00Z',
  });

  await store.refresh();

  assert.equal(store.state.unreadCount, 5);
  assert.equal(store.state.loaded, true);
  assert.equal(store.state.items.length, 2);

  await store.markRead(10);

  assert.deepEqual(marcas, [10]);
  assert.equal(store.state.items[0].leida, true);
  assert.equal(store.state.unreadCount, 0);

  store.mergeIncoming([alerta(10, { leida: true }), alerta(12)]);

  assert.equal(store.state.items.length, 3);
  assert.equal(store.state.unreadCount, 1);
});

test('un fallo del contador no rompe la bandeja', async () => {
  const store = createAlertsStore({
    api: {
      listAlerts: async () => { throw new Error('offline'); },
      readAlert: async () => ({}),
    },
  });

  await store.refreshUnreadCount();

  assert.equal(store.state.unreadCount, 0);
  assert.equal(store.state.items.length, 0);
});
