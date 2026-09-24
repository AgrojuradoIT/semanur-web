/**
 * Etiquetas legibles de los eventos del historial del pedido (U8).
 * El historial es append-only; la UI solo lo presenta, nunca lo interpreta
 * como autorización de stock.
 */

const EVENTOS = {
  borrador_creado: 'Borrador creado',
  borrador_actualizado: 'Borrador actualizado',
  documento_cargado: 'Documento cargado',
  ocr_solicitado: 'OCR solicitado',
  ocr_completado: 'OCR completado',
  ocr_requiere_revision: 'OCR requiere revisión',
  ocr_fallido: 'OCR fallido',
  pedido_publicado: 'Pedido publicado',
  pedido_retirado: 'Pedido retirado a corrección',
  pedido_cancelado: 'Pedido cancelado',
  novedad_abierta: 'Novedad abierta',
  novedad_respondida: 'Respuesta sobre novedad',
  desfase_autorizado: 'Desfase autorizado',
  desfase_invalidado: 'Desfase invalidado',
  pedido_recibido: 'Pedido recibido',
  recibido_con_novedad: 'Recepción con novedades',
  recibido_con_desfase: 'Recepción con desfase',
  ficha_catalogo_actualizada: 'Ficha de producto actualizada',
  recepcion_creada: 'Sesión de recepción creada',
  recepcion_confirmada: 'Recepción confirmada',
};

export function eventoLabel(tipo) {
  return EVENTOS[tipo] ?? tipo ?? 'Evento';
}

export function eventoResumen(evento) {
  const datos = evento?.datos_despues ?? {};

  if (datos.estado) return `Estado: ${datos.estado}`;
  if (datos.numero) return `Número: ${datos.numero}`;
  if (Array.isArray(datos.novedades)) return `Novedades: ${datos.novedades.length}`;
  if (datos.motivo) return `Motivo: ${datos.motivo}`;
  if (datos.motivo_compra_distinta) return `Resolución auditada: ${datos.motivo_compra_distinta}`;

  return '';
}
