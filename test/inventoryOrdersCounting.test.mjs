import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cantidadACentavos,
  clasificarLineaContada,
  compararCantidades,
  diferenciaCantidad,
  formatCantidad,
  normalizarCantidad,
  parseQuantityInput,
  resumenConteo,
  validarConteoLinea,
} from '../src/features/inventory-orders/utils/counting.js';

test('parsea cantidades exactas y rechaza formatos peligrosos', () => {
  assert.deepEqual(parseQuantityInput('4'), { ok: true, empty: false, value: '4.00', error: null });
  assert.equal(parseQuantityInput('4,00').value, '4.00');
  assert.equal(parseQuantityInput(' 0.5 ').value, '0.50');

  for (const invalido of ['', '1e3', '-2', '1,234', '1.234', '0.001', '123456789', 'NaN', 'abc']) {
    assert.equal(parseQuantityInput(invalido).ok, false, `debe rechazar ${invalido}`);
  }
});

test('normaliza sin floats y con escala del ledger', () => {
  assert.equal(normalizarCantidad('004'), '4.00');
  assert.equal(normalizarCantidad('010.5'), '10.50');
  assert.equal(normalizarCantidad('0'), '0.00');
});

test('compara y resta cantidades en centavos exactos', () => {
  assert.equal(compararCantidades('4.00', '3.00'), 1);
  assert.equal(compararCantidades('0.10', '0.1'), 0);
  assert.equal(compararCantidades('0.2', '0.19'), 1);
  assert.equal(compararCantidades('no', '1.00'), null);

  assert.equal(diferenciaCantidad('3.00', '4.00'), '-1.00');
  assert.equal(diferenciaCantidad('5.00', '4.00'), '1.00');
  assert.equal(diferenciaCantidad('4.00', '4.00'), '0.00');
  assert.equal(formatCantidad(null), '—');
  assert.equal(formatCantidad('12.5'), '12.50');
  assert.equal(cantidadACentavos('12345678.99'), 1234567899n);
});

test('validarConteoLinea exige total, aptos, condición y motivo cuando hay novedad', () => {
  const vacio = validarConteoLinea({});
  assert.equal(vacio.ok, false);
  assert.ok(vacio.errores.conteoTotal);
  assert.ok(vacio.errores.conteoAptos);
  assert.ok(vacio.errores.condicion);

  const aptosMayores = validarConteoLinea({
    conteoTotal: '3.00',
    conteoAptos: '4.00',
    condicion: 'conforme',
  });
  assert.equal(aptosMayores.ok, false);
  assert.match(aptosMayores.errores.conteoAptos, /no puede superar/);

  const sinMotivo = validarConteoLinea({
    conteoTotal: '3.00',
    conteoAptos: '3.00',
    condicion: 'danado',
  });
  assert.equal(sinMotivo.ok, false);
  assert.ok(sinMotivo.errores.motivo);

  const ok = validarConteoLinea({
    conteoTotal: '0',
    conteoAptos: '0',
    condicion: 'conforme',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.total, '0.00');
  assert.equal(ok.aptos, '0.00');
});

test('clasificarLineaContada replica la regla E=C=A sin inventar conformidades', () => {
  const conforme = clasificarLineaContada({
    cantidad_esperada: '4.00',
    conteo_total: '4.00',
    conteo_aptos: '4.00',
    condicion: 'conforme',
  });
  assert.equal(conforme.estado, 'conforme');
  assert.equal(conforme.ingresa, true);
  assert.equal(conforme.diferencia, '0.00');

  const faltante = clasificarLineaContada({
    cantidad_esperada: '4.00',
    conteo_total: '3.00',
    conteo_aptos: '3.00',
    condicion: 'conforme',
  });
  assert.equal(faltante.estado, 'novedad');
  assert.equal(faltante.ingresa, false);
  assert.equal(faltante.diferencia, '-1.00');

  const sinContar = clasificarLineaContada({ cantidad_esperada: '4.00' });
  assert.equal(sinContar.estado, 'sin_contar');
});

test('resumenConteo previsualiza el efecto en stock sin confirmar nada', () => {
  const resumen = resumenConteo([
    { cantidad_esperada: '4.00', conteo_total: '4.00', conteo_aptos: '4.00', condicion: 'conforme' },
    { cantidad_esperada: '4.00', conteo_total: '3.00', conteo_aptos: '3.00', condicion: 'conforme' },
    { cantidad_esperada: '2.00' },
  ]);

  assert.equal(resumen.total, 3);
  assert.equal(resumen.contadas, 2);
  assert.equal(resumen.sinContar, 1);
  assert.equal(resumen.conformes, 1);
  assert.equal(resumen.conNovedad, 1);
  assert.equal(resumen.unidadesIngresables, '4.00');
});
