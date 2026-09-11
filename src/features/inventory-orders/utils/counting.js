/**
 * Aritmética decimal exacta del cliente (U8) sin depender de floats.
 *
 * Igual que el ledger (decimal(10,2)): las cantidades viajan y se comparan en
 * centavos con BigInt. El servidor sigue siendo la autoridad; este módulo solo
 * valida formularios y previsualiza el efecto en stock sin inventar datos.
 */

const CANTIDAD_RE = /^\d{1,8}([.,]\d{1,2})?$/;

export function parseQuantityInput(raw) {
  if (raw === null || raw === undefined) {
    return { ok: false, empty: true, value: null, error: 'Ingresa una cantidad.' };
  }

  const text = String(raw).trim();

  if (text === '') {
    return { ok: false, empty: true, value: null, error: 'Ingresa una cantidad.' };
  }

  if (!CANTIDAD_RE.test(text)) {
    return {
      ok: false,
      empty: false,
      value: null,
      error: 'Usa un decimal exacto de hasta 2 decimales (por ejemplo 4 o 4.00). No se admite notación exponencial ni signos.',
    };
  }

  return { ok: true, empty: false, value: normalizarCantidad(text), error: null };
}

export function normalizarCantidad(value) {
  const text = String(value).trim().replace(',', '.');
  const [entera, decimales = ''] = text.split('.');
  const enteros = entera.replace(/^0+(?=\d)/, '');
  return `${enteros}.${(decimales + '00').slice(0, 2)}`;
}

export function cantidadACentavos(value) {
  if (value === null || value === undefined || value === '') return null;

  const text = String(value).trim().replace(',', '.');

  if (!CANTIDAD_RE.test(text)) return null;

  const [entera, decimales = ''] = text.split('.');
  const centavos = `${entera}${(decimales + '00').slice(0, 2)}`.replace(/^0+(?=\d)/, '');

  try {
    return BigInt(centavos);
  } catch {
    return null;
  }
}

export function compararCantidades(a, b) {
  const ca = cantidadACentavos(a);
  const cb = cantidadACentavos(b);

  if (ca === null || cb === null) return null;
  if (ca === cb) return 0;
  return ca > cb ? 1 : -1;
}

export function formatCantidad(value) {
  if (value === null || value === undefined || value === '') return '—';
  const centavos = cantidadACentavos(value);
  if (centavos === null) return String(value);

  const negativo = centavos < 0n;
  const absoluto = negativo ? -centavos : centavos;

  return `${negativo ? '-' : ''}${formatCentavos(absoluto)}`;
}

export function diferenciaCantidad(cantidadAutorizada, esperado) {
  const q = cantidadACentavos(cantidadAutorizada);
  const e = cantidadACentavos(esperado);

  if (q === null || e === null) return null;

  const diferencia = q - e;
  const negativo = diferencia < 0n;
  const absoluto = negativo ? -diferencia : diferencia;

  return `${negativo ? '-' : ''}${formatCentavos(absoluto)}`;
}

export function validarConteoLinea({ conteoTotal, conteoAptos, condicion, motivo } = {}) {
  const errores = {};
  const total = parseQuantityInput(conteoTotal);
  const aptos = parseQuantityInput(conteoAptos);

  if (!total.ok) {
    errores.conteoTotal = total.error;
  }

  if (!aptos.ok) {
    errores.conteoAptos = aptos.error;
  }

  if (total.ok && aptos.ok && compararCantidades(aptos.value, total.value) > 0) {
    errores.conteoAptos = 'La cantidad apta no puede superar la cantidad contada.';
  }

  if (!condicion) {
    errores.condicion = 'Selecciona la condición física de la mercancía.';
  }

  if (condicion && condicion !== 'conforme' && String(motivo ?? '').trim() === '') {
    errores.motivo = 'Una condición distinta de conforme exige motivo.';
  }

  return {
    ok: Object.keys(errores).length === 0,
    errores,
    total: total.ok ? total.value : null,
    aptos: aptos.ok ? aptos.value : null,
  };
}

/**
 * Clasifica una línea contada sin mutar nada: conforme cuando C = A = E y la
 * condición es conforme; novedad en cualquier otro caso. Es la misma regla que
 * aplica el servidor (R05/§4), usada solo para la previsualización.
 */
export function clasificarLineaContada(linea = {}) {
  const esperado = linea.cantidad_esperada ?? linea.esperado;
  const contado = linea.conteo_total ?? linea.conteoTotal ?? null;
  const aptos = linea.conteo_aptos ?? linea.conteoAptos ?? null;
  const condicion = linea.condicion ?? linea.estado_condicion ?? null;

  if (contado === null || aptos === null || !condicion) {
    return { estado: 'sin_contar', diferencia: null, ingresa: false, unidades: '0.00' };
  }

  const conforme = condicion === 'conforme'
    && compararCantidades(contado, esperado) === 0
    && compararCantidades(aptos, esperado) === 0;

  return {
    estado: conforme ? 'conforme' : 'novedad',
    diferencia: diferenciaCantidad(aptos, esperado),
    ingresa: conforme,
    unidades: conforme ? normalizarCantidad(aptos) : '0.00',
  };
}

export function resumenConteo(lineas = []) {
  const resumen = {
    total: lineas.length,
    contadas: 0,
    sinContar: 0,
    conformes: 0,
    conNovedad: 0,
    unidadesIngresables: '0.00',
  };

  let ingresablesCents = 0n;

  for (const linea of lineas) {
    const clasificacion = clasificarLineaContada(linea);

    if (clasificacion.estado === 'sin_contar') {
      resumen.sinContar += 1;
      continue;
    }

    resumen.contadas += 1;

    if (clasificacion.estado === 'conforme') {
      resumen.conformes += 1;
      const cents = cantidadACentavos(clasificacion.unidades) ?? 0n;
      ingresablesCents += cents;
    } else {
      resumen.conNovedad += 1;
    }
  }

  resumen.unidadesIngresables = formatCentavos(ingresablesCents);

  return resumen;
}

function formatCentavos(centavos) {
  const texto = centavos.toString().padStart(3, '0');
  const enteros = texto.slice(0, -2).replace(/^0+(?=\d)/, '');
  return `${enteros}.${texto.slice(-2)}`;
}
