/**
 * Cliente API del flujo de pedidos de inventario (U8).
 *
 * Capa fina sobre el http compartido (auth, baseURL, manejo de errores ya
 * centralizados). Nunca guarda tokens ni archivos: las descargas de evidencia
 * son blobs autorizados por request y se revocan al desmontar el visor.
 *
 * API_BASE_URL ya termina en /api; por eso los caminos son relativos a /web.
 */
import http from '../../../shared/api/http';
import { extractList } from '../../../shared/utils/apiResponse';

const BASE = '/web/inventory-orders';
const ALERTS = '/web/inventory-order-alerts';

export async function listOrders(params = {}, config = {}) {
  const { data } = await http.get(BASE, { ...config, params });
  return data;
}

export async function getOrder(uuid, config = {}) {
  const { data } = await http.get(`${BASE}/${uuid}`, config);
  return data?.data ?? data;
}

export async function createOrder(payload) {
  const { data } = await http.post(BASE, payload);
  return data;
}

export async function updateOrder(uuid, payload) {
  const { data } = await http.patch(`${BASE}/${uuid}`, payload);
  return data;
}

export async function uploadOrderDocument(uuid, { rol, file, replacesDocumentoId = null, pedidoLineaId = null }, onUploadProgress = null) {
  const formData = new FormData();
  formData.append('rol', rol);
  formData.append('file', file);

  if (replacesDocumentoId) formData.append('replaces_documento_id', replacesDocumentoId);
  if (pedidoLineaId) formData.append('pedido_linea_id', pedidoLineaId);

  const { data } = await http.post(`${BASE}/${uuid}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
    onUploadProgress: (event) => {
      if (onUploadProgress && event.total) {
        onUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });

  return data;
}

export function documentContentPath(uuid, documentId) {
  return `${BASE}/${uuid}/documents/${documentId}/content`;
}

export async function fetchDocumentBlob(uuid, documentId, config = {}) {
  const { data } = await http.get(documentContentPath(uuid, documentId), {
    ...config,
    responseType: 'blob',
  });

  return data;
}

export async function getOcrAttempt(uuid, attemptId, config = {}) {
  const { data } = await http.get(`${BASE}/${uuid}/ocr-attempts/${attemptId}`, config);
  return data?.data ?? data;
}

export async function reprocessDocument(uuid, documentId) {
  const { data } = await http.post(`${BASE}/${uuid}/documents/${documentId}/reprocess`, {});
  return data;
}

export async function publishOrder(uuid, payload) {
  const { data } = await http.post(`${BASE}/${uuid}/publish`, payload);
  return data;
}

export async function returnOrderForCorrection(uuid, payload) {
  const { data } = await http.post(`${BASE}/${uuid}/return-for-correction`, payload);
  return data;
}

export async function cancelOrder(uuid, payload) {
  const { data } = await http.post(`${BASE}/${uuid}/cancel`, payload);
  return data;
}

export async function createReceipt(uuid) {
  const { data } = await http.post(`${BASE}/${uuid}/receipts`, {});
  return data;
}

export async function countReceiptLine(uuid, receiptId, lineId, payload) {
  const { data } = await http.put(`${BASE}/${uuid}/receipts/${receiptId}/lines/${lineId}`, payload);
  return data?.data ?? data;
}

export async function saveCatalogDraft(uuid, lineId, payload) {
  const { data } = await http.patch(`${BASE}/${uuid}/lines/${lineId}/catalog-draft`, payload);
  return data?.data ?? data;
}

export async function confirmReceipt(uuid, receiptId, payload) {
  const { data } = await http.post(`${BASE}/${uuid}/receipts/${receiptId}/confirm`, payload);
  return data;
}

export async function respondToDiscrepancy(uuid, issueId, payload) {
  const { data } = await http.post(`${BASE}/${uuid}/discrepancies/${issueId}/responses`, payload);
  return data;
}

export async function authorizeDiscrepancy(uuid, issueId, payload) {
  const { data } = await http.post(`${BASE}/${uuid}/discrepancies/${issueId}/authorize`, payload);
  return data;
}

export async function listOrderHistory(uuid, params = {}, config = {}) {
  const { data } = await http.get(`${BASE}/${uuid}/history`, { ...config, params });
  return data;
}

export async function listAlerts(params = {}, config = {}) {
  const { data } = await http.get(ALERTS, { ...config, params });
  return data;
}

export async function readAlert(alertId) {
  const { data } = await http.post(`${ALERTS}/${alertId}/read`, {});
  return data?.data ?? data;
}

export async function getOperationResult(uuid, command, operationUuid, config = {}) {
  const { data } = await http.get(`${BASE}/${uuid}/operations/${command}/${operationUuid}`, config);
  return data;
}

export async function listBodegas(config = {}) {
  const { data } = await http.get('/bodegas', config);
  return extractList(data);
}

export async function searchProducts(query, config = {}) {
  const { data } = await http.get('/productos/buscar', {
    ...config,
    params: { q: query },
  });

  return extractList(data);
}

export async function listCategorias(config = {}) {
  const { data } = await http.get('/categorias', config);
  return extractList(data);
}
