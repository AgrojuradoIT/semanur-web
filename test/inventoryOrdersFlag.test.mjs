import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isEnabledFlagValue,
  isInventoryOrdersFeatureEnabled,
  INVENTORY_ORDERS_GLOBAL_FLAG,
} from '../src/features/inventory-orders/utils/flag.js';

test('la bandera solo se enciende con valores explícitos', () => {
  assert.equal(isEnabledFlagValue('true'), true);
  assert.equal(isEnabledFlagValue('1'), true);
  assert.equal(isEnabledFlagValue(true), true);
  assert.equal(isEnabledFlagValue('false'), false);
  assert.equal(isEnabledFlagValue('0'), false);
  assert.equal(isEnabledFlagValue(undefined), false);
  assert.equal(isEnabledFlagValue(''), false);
  assert.equal(isEnabledFlagValue('sí'), false);
});

test('sin variable ni override la función de pedidos queda apagada', () => {
  assert.equal(isInventoryOrdersFeatureEnabled({}, undefined), false);
  assert.equal(isInventoryOrdersFeatureEnabled({ VITE_INVENTORY_ORDERS_ENABLED: 'false' }, undefined), false);
});

test('la variable de entorno de Vite enciende la función', () => {
  assert.equal(isInventoryOrdersFeatureEnabled({ VITE_INVENTORY_ORDERS_ENABLED: 'true' }, undefined), true);
});

test('el override global solo es válido con true estricto', () => {
  assert.equal(isInventoryOrdersFeatureEnabled({}, true), true);
  assert.equal(isInventoryOrdersFeatureEnabled({}, 'true'), false);
  assert.equal(isInventoryOrdersFeatureEnabled({}, 1), false);
});

test('el nombre de la bandera global de tests es estable', () => {
  assert.equal(INVENTORY_ORDERS_GLOBAL_FLAG, '__SEMANUR_INVENTORY_ORDERS_ENABLED__');
});
