import assert from 'node:assert/strict';
import test from 'node:test';

import { createAlertsStore } from '../src/features/inventory-orders/utils/alertsStore.js';
import {
  buildPedidoAlertStub,
  handlePedidoAlertaEvent,
  pedidoAlertasChannelFor,
  PEDIDO_ALERTA_EVENT_NAME,
  subscribeToPedidoAlertasRealtime,
} from '../src/features/inventory-orders/utils/realtimeAlerts.js';
import {
  disableInventoryOrdersRealtimeForTests,
  enableInventoryOrdersRealtimeForTests,
  isInventoryOrdersRealtimeEnabled,
} from '../src/features/inventory-orders/utils/realtimeFlag.js';

const evento = (overrides = {}) => ({
  alert_id: 7,
  pedido_id: 42,
  pedido_uuid: 'pedido-uuid-7',
  tipo: 'pedido_publicado',
  revision: 3,
  ...overrides,
});

const alerta = (id, extra = {}) => ({
  alerta_id: id,
  tipo: 'pedido_publicado',
  leida: false,
  pedido: { uuid: `pedido-${id}` },
  ...extra,
});

function tiendaContador(unreadCount = 0, items = []) {
  let llamadas = 0;
  const store = createAlertsStore({
    api: {
      listAlerts: async () => {
        llamadas += 1;
        return { data: [], meta: { unread_count: unreadCount } };
      },
      readAlert: async () => ({}),
    },
  });
  store.state.items = items;
  return { store, llamadas: () => llamadas };
}

test('el flag U11 viene apagado por defecto y enciende por env u override', () => {
  disableInventoryOrdersRealtimeForTests();

  assert.equal(isInventoryOrdersRealtimeEnabled({}), false);
  assert.equal(
    isInventoryOrdersRealtimeEnabled({ VITE_INVENTORY_ORDERS_REALTIME_ENABLED: 'true' }),
    true,
  );

  enableInventoryOrdersRealtimeForTests();
  assert.equal(isInventoryOrdersRealtimeEnabled({}), true);

  disableInventoryOrdersRealtimeForTests();
  assert.equal(isInventoryOrdersRealtimeEnabled({}), false);
});

test('canal y nombre de evento namespaced por destinatario', () => {
  assert.equal(pedidoAlertasChannelFor(5), 'pedidos.alertas.5');
  assert.equal(PEDIDO_ALERTA_EVENT_NAME, '.pedido.alerta');
});

test('el stub usa el payload mínimo y rechaza eventos sin identidad', () => {
  const stub = buildPedidoAlertStub(evento());

  assert.equal(stub.alerta_id, 7);
  assert.equal(stub.tipo, 'pedido_publicado');
  assert.deepEqual(stub.pedido, { uuid: 'pedido-uuid-7' });
  assert.equal(stub.leida, false);
  assert.equal(stub.token, undefined);
  assert.equal(stub.factura, undefined);

  assert.equal(buildPedidoAlertStub(null), null);
  assert.equal(buildPedidoAlertStub({ tipo: 'pedido_publicado' }), null);
  assert.equal(buildPedidoAlertStub({}), null);
});

test('suscripción habilitada: el evento mergea por alerta_id y actualiza el contador', async () => {
  const { store } = tiendaContador(9);
  let onAlert = null;

  const stop = subscribeToPedidoAlertasRealtime({
    userId: 5,
    token: 'token-abc',
    store,
    subscribe: (args) => {
      assert.equal(args.userId, 5);
      assert.equal(args.token, 'token-abc');
      assert.equal(typeof args.onAlert, 'function');
      onAlert = args.onAlert;
      return () => {};
    },
    isEnabled: true,
  });

  assert.equal(typeof stop, 'function');

  onAlert(evento());
  await Promise.resolve();

  assert.equal(store.state.items.length, 1);
  assert.equal(store.state.items[0].alerta_id, 7);
  assert.equal(store.state.unreadCount, 9);

  // Dedupe: repetir el mismo evento no duplica la fila.
  onAlert(evento());
  await Promise.resolve();

  assert.equal(store.state.items.length, 1);

  onAlert(evento({ alert_id: 8, pedido_uuid: 'pedido-uuid-8' }));
  await Promise.resolve();

  assert.equal(store.state.items.length, 2);
  assert.equal(store.state.unreadCount, 9);
});

test('suscripción apagada o sin credenciales: no se suscribe (noop)', () => {
  const { store } = tiendaContador();
  let llamadas = 0;
  const subscribe = () => {
    llamadas += 1;
    return () => {};
  };

  subscribeToPedidoAlertasRealtime({ userId: 5, token: 't', store, subscribe, isEnabled: false });
  subscribeToPedidoAlertasRealtime({ userId: null, token: 't', store, subscribe, isEnabled: true });
  subscribeToPedidoAlertasRealtime({ userId: 5, token: null, store, subscribe, isEnabled: true });
  subscribeToPedidoAlertasRealtime({ userId: 5, token: 't', store: null, subscribe, isEnabled: true });

  assert.equal(llamadas, 0);
});

test('refreshUnreadCount solo toca el contador, no el listado visible', async () => {
  const { store } = tiendaContador(4, [alerta(1), alerta(2, { leida: true }), alerta(3)]);

  await store.refreshUnreadCount();

  assert.equal(store.state.items.length, 3);
  assert.deepEqual(store.state.items.map((item) => item.alerta_id), [1, 2, 3]);
  assert.equal(store.state.unreadCount, 4);
});

test('un evento sin identidad no rompe la bandeja', () => {
  const { store } = tiendaContador(0, [alerta(1)]);

  assert.equal(handlePedidoAlertaEvent(store, { tipo: 'pedido_publicado' }), false);
  assert.equal(store.state.items.length, 1);
});
