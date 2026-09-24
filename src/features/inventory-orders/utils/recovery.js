/**
 * Recuperación de operaciones idempotentes (plan secciones 9 y 17).
 *
 * Tras un timeout o 5xx la confirmación es INCIERTA: se conserva el mismo
 * `client_operation_id` y se consulta la operación almacenada con la nueva ruta
 * GET /{order}/operations/{command}/{operation_uuid} antes de ofrecer repetir.
 * Un 404 significa que la operación no se registró (reintento seguro con el
 * MISMO UUID); 2xx devuelve el resultado original (replay).
 */

export function buildOperationPath(orderUuid, command, operationUuid) {
  const base = `/web/inventory-orders/${encodeURIComponent(orderUuid)}/operations/${encodeURIComponent(command)}`;

  if (!operationUuid) return base;

  return `${base}/${encodeURIComponent(operationUuid)}`;
}

export function needsOperationLookup(error) {
  if (!error) return false;

  const status = error?.response?.status ?? 0;

  if (status === 0) return true;
  if (status >= 500) return true;
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') return true;

  return false;
}

export function classifyOperationLookup(status) {
  const code = Number(status) || 0;

  if (code >= 200 && code < 300) return 'recuperada';
  if (code === 404) return 'no_registrada';
  if (code === 401 || code === 403) return 'sin_acceso';

  return 'error';
}

export function esReplaySeguro(response) {
  return response?.data?.idempotent_replay === true || response?.idempotent_replay === true;
}
