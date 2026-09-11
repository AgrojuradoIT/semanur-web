/**
 * Etiquetas y semántica visual de los estados del flujo de pedidos (U8).
 *
 * Regla de accesibilidad: cada estado tiene texto además del color; el tono es
 * solo un refuerzo visual (nunca la única señal).
 */

const ESTADOS_PEDIDO = {
  borrador: { label: 'Borrador', tone: 'neutral', terminal: false, editable: true },
  pendiente_recepcion: { label: 'Pendiente de recepción', tone: 'info', terminal: false, editable: false },
  en_validacion: { label: 'En validación', tone: 'info', terminal: false, editable: false },
  parcial_con_novedad: { label: 'Parcial con novedad', tone: 'warning', terminal: false, editable: false },
  recibido: { label: 'Recibido', tone: 'success', terminal: true, editable: false },
  recibido_con_desfase: { label: 'Recibido con desfase', tone: 'warning', terminal: true, editable: false },
  cancelado: { label: 'Cancelado', tone: 'danger', terminal: true, editable: false },
};

const ESTADOS_LINEA = {
  pendiente: { label: 'Pendiente', tone: 'neutral', terminal: false },
  conforme: { label: 'Conforme (sin ingresar)', tone: 'info', terminal: false },
  novedad: { label: 'Novedad', tone: 'warning', terminal: false },
  recibida: { label: 'Recibida', tone: 'success', terminal: true },
  recibida_con_desfase: { label: 'Recibida con desfase', tone: 'warning', terminal: true },
  cierre_sin_ingreso: { label: 'Cerrada sin ingreso', tone: 'danger', terminal: true },
};

const TIPOS_NOVEDAD = {
  faltante: 'Faltante',
  sobrante: 'Sobrante',
  danado: 'Dañado / no apto',
  sku_incorrecto: 'SKU incorrecto',
  aptos_insuficientes: 'Aptos insuficientes',
  ficha_incompleta: 'Ficha de producto incompleta',
};

export const CONDICIONES = {
  conforme: 'Conforme',
  danado: 'Dañado',
  sku_incorrecto: 'SKU incorrecto',
  otro: 'Otro',
};

const TIPOS_ALERTA = {
  pedido_publicado: { label: 'Pedido publicado', tone: 'info' },
  pedido_retirado: { label: 'Pedido retirado', tone: 'warning' },
  pedido_cancelado: { label: 'Pedido cancelado', tone: 'danger' },
  ocr_fallido: { label: 'OCR fallido', tone: 'danger' },
  requiere_revision: { label: 'OCR requiere revisión', tone: 'warning' },
  novedad_abierta: { label: 'Novedad abierta', tone: 'warning' },
  pedido_recibido: { label: 'Pedido recibido', tone: 'success' },
  recibido_con_novedad: { label: 'Recibido con novedad', tone: 'warning' },
  recibido_con_desfase: { label: 'Recibido con desfase', tone: 'warning' },
  desfase_autorizado: { label: 'Desfase autorizado', tone: 'warning' },
  respuesta_contable: { label: 'Respuesta contable', tone: 'info' },
  entrega_complementaria_informada: { label: 'Entrega complementaria informada', tone: 'info' },
};

export const TIPOS_RESPUESTA = {
  respuesta_contable: 'Respuesta contable',
  entrega_complementaria_informada: 'Entrega complementaria informada',
  nota_bodega: 'Nota de bodega',
};

const TIPOS_OCR = {
  pendiente: 'Pendiente en cola',
  procesando: 'Procesando OCR',
  completado: 'OCR completado',
  requiere_revision: 'Requiere revisión humana',
  fallido: 'OCR fallido',
  cancelado: 'OCR cancelado',
  obsoleto: 'Resultado obsoleto',
};

export function estadoPedido(estado) {
  return ESTADOS_PEDIDO[estado] ?? { label: estado || 'Desconocido', tone: 'neutral', terminal: false, editable: false };
}

export function estadoPedidoLabel(estado) {
  return estadoPedido(estado).label;
}

export function estadoPedidoTone(estado) {
  return estadoPedido(estado).tone;
}

export function esPedidoTerminal(estado) {
  return estadoPedido(estado).terminal;
}

export function esPedidoEditable(estado) {
  return estadoPedido(estado).editable;
}

export function estadoLinea(estado) {
  return ESTADOS_LINEA[estado] ?? { label: estado || 'Desconocido', tone: 'neutral', terminal: false };
}

export function estadoLineaLabel(estado) {
  return estadoLinea(estado).label;
}

export function estadoLineaTone(estado) {
  return estadoLinea(estado).tone;
}

export function esLineaTerminal(estado) {
  return estadoLinea(estado).terminal;
}

export function tipoNovedadLabel(tipo) {
  return TIPOS_NOVEDAD[tipo] ?? tipo ?? 'Novedad';
}

export function condicionLabel(condicion) {
  return CONDICIONES[condicion] ?? condicion ?? 'Sin condición';
}

export function tipoRespuestaLabel(tipo) {
  return TIPOS_RESPUESTA[tipo] ?? tipo ?? 'Respuesta';
}

export function alertaTipo(tipo) {
  return TIPOS_ALERTA[tipo] ?? { label: tipo || 'Alerta', tone: 'neutral' };
}

export function alertaTipoLabel(tipo) {
  return alertaTipo(tipo).label;
}

export function alertaTipoTone(tipo) {
  return alertaTipo(tipo).tone;
}

export function ocrEstadoLabel(estado) {
  return TIPOS_OCR[estado] ?? estado ?? 'Estado desconocido';
}

export function puedeContarLinea(estado) {
  return !esLineaTerminal(estado);
}

export function resumenLineas(lineas = []) {
  return {
    total: lineas.length,
    terminales: lineas.filter((linea) => esLineaTerminal(linea.estado)).length,
    pendientes: lineas.filter((linea) => !esLineaTerminal(linea.estado)).length,
    novedades: lineas.filter((linea) => linea.estado === 'novedad').length,
  };
}

export const ESTADOS_PEDIDO_CONOCIDOS = Object.keys(ESTADOS_PEDIDO);

export const ESTADOS_LINEA_CONOCIDOS = Object.keys(ESTADOS_LINEA);

export const TIPOS_ALERTA_CONOCIDOS = Object.keys(TIPOS_ALERTA);
