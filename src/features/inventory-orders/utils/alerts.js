/**
 * Utilidades puras de la bandeja de alertas Web (U8).
 *
 * La bandeja persistida es la fuente de verdad; el realtime solo acelera.
 * El merge deduplica por `alerta_id` para que reconexiones o reintentos no
 * dupliquen filas en la UI.
 */

export function mergeUniqueAlerts(existing = [], incoming = []) {
  const vistos = new Set();
  const resultado = [];

  for (const alerta of [...existing, ...incoming]) {
    const id = alerta?.alerta_id ?? alerta?.id;
    if (id === null || id === undefined || vistos.has(id)) continue;
    vistos.add(id);
    resultado.push(alerta);
  }

  return resultado;
}

export function contarNoLeidas(alertas = []) {
  return alertas.filter((alerta) => !alerta.leida).length;
}

export function buildAlertQuery({ tipo = null, leida = null, page = 1, perPage = 25 } = {}) {
  const params = { page, per_page: perPage };

  if (tipo) params.tipo = tipo;
  if (leida !== null && leida !== undefined) params.leida = leida ? 1 : 0;

  return params;
}

export function rutaAlertaTipoPedido(alerta) {
  const uuid = alerta?.pedido?.uuid ?? null;
  if (!uuid) return null;

  switch (alerta?.tipo) {
    case 'requiere_revision':
    case 'ocr_fallido':
      return { name: 'inventory-orders-review', params: { uuid } };
    default:
      // Novedades es el hub de lectura del pedido: muestra estado, líneas y
      // deja accesos a recepción/historial según las acciones autorizadas.
      return { name: 'inventory-orders-novedades', params: { uuid } };
  }
}
