import assert from 'node:assert/strict';
import test from 'node:test';

import { createRecoveryFlow } from '../src/features/inventory-orders/utils/recoveryFlow.js';
import {
  buildOperationPath,
  classifyOperationLookup,
  needsOperationLookup,
} from '../src/features/inventory-orders/utils/recovery.js';

function httpError(status) {
  return { response: { status } };
}

test('construye la ruta de recuperación con alcance comando y UUID', () => {
  assert.equal(
    buildOperationPath('abc-123', 'confirmar_recepcion', 'op-9'),
    '/web/inventory-orders/abc-123/operations/confirmar_recepcion/op-9',
  );
  assert.equal(
    buildOperationPath('abc-123', 'publicar_pedido'),
    '/web/inventory-orders/abc-123/operations/publicar_pedido',
  );
});

test('solo timeout, red o 5xx exigen consultar antes de reintentar', () => {
  assert.equal(needsOperationLookup(httpError(0)), true);
  assert.equal(needsOperationLookup(httpError(503)), true);
  assert.equal(needsOperationLookup({ code: 'ECONNABORTED' }), true);
  assert.equal(needsOperationLookup(httpError(409)), false);
  assert.equal(needsOperationLookup(httpError(422)), false);
  assert.equal(needsOperationLookup(null), false);
});

test('clasifica la consulta de operación', () => {
  assert.equal(classifyOperationLookup(200), 'recuperada');
  assert.equal(classifyOperationLookup(404), 'no_registrada');
  assert.equal(classifyOperationLookup(403), 'sin_acceso');
  assert.equal(classifyOperationLookup(500), 'error');
});

test('conserva el mismo UUID tras una respuesta incierta y lo consulta', async () => {
  const ids = ['00000000-0000-4000-8000-000000000001'];
  const consultas = [];
  const flow = createRecoveryFlow({
    uuidFactory: () => ids.shift(),
    apiGetOperation: async (orderUuid, command, operationUuid) => {
      consultas.push({ orderUuid, command, operationUuid });
      return { idempotent_replay: true, data: { receipt_id: 7 } };
    },
  });

  const intento = { command: 'confirmar_recepcion', orderUuid: 'pedido-1', signature: { version: 1 } };
  const primero = await flow.execute({
    ...intento,
    executor: async () => { throw httpError(0); },
  });

  assert.equal(primero.status, 'uncertain');
  assert.equal(primero.operationId, '00000000-0000-4000-8000-000000000001');
  assert.equal(flow.currentOperationId(), primero.operationId);

  const recuperada = await flow.consult(intento);

  assert.equal(recuperada.status, 'recuperada');
  assert.equal(recuperada.response.data.receipt_id, 7);
  assert.deepEqual(consultas[0], {
    orderUuid: 'pedido-1',
    command: 'confirmar_recepcion',
    operationUuid: '00000000-0000-4000-8000-000000000001',
  });
  assert.equal(flow.currentOperationId(), null, 'tras recuperar, el UUID se libera');
});

test('un 404 de operación no registrada habilita el reintento con el mismo UUID', async () => {
  const ids = ['00000000-0000-4000-8000-000000000002'];
  const flow = createRecoveryFlow({
    uuidFactory: () => ids.shift(),
    apiGetOperation: async () => { throw httpError(404); },
  });

  const intento = { command: 'confirmar_recepcion', orderUuid: 'pedido-2', signature: { version: 3 } };
  await flow.execute({ ...intento, executor: async () => { throw httpError(503); } });

  assert.equal(flow.currentOperationId(), '00000000-0000-4000-8000-000000000002');

  const consulta = await flow.consult(intento);
  assert.equal(consulta.status, 'no_registrada');
  assert.equal(flow.currentOperationId(), '00000000-0000-4000-8000-000000000002');

  // Reintento con el MISMO UUID (el executor recibe el uuid vigente).
  const reintento = await flow.execute({
    ...intento,
    executor: async (operationId) => ({ idempotent_replay: false, operationId }),
  });

  assert.equal(reintento.status, 'ok');
  assert.equal(reintento.operationId, '00000000-0000-4000-8000-000000000002');
});

test('un rechazo definido libera el UUID y un cambio de intención genera otro', async () => {
  const ids = ['00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004'];
  const flow = createRecoveryFlow({
    uuidFactory: () => ids.shift(),
    apiGetOperation: async () => ({}),
  });

  const base = { command: 'confirmar_recepcion', orderUuid: 'pedido-3', signature: { version: 1 } };
  const rechazo = await flow.execute({ ...base, executor: async () => { throw httpError(409); } });

  assert.equal(rechazo.status, 'error');
  assert.equal(flow.currentOperationId(), null);

  const nuevo = await flow.execute({
    ...base,
    signature: { version: 2 },
    executor: async (operationId) => ({ operationId }),
  });

  assert.equal(nuevo.operationId, '00000000-0000-4000-8000-000000000004');
});
