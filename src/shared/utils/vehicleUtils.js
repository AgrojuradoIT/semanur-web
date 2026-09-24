/**
 * Vehicle classification utilities for Semanur Web (Vue 3)
 *
 * Business rules (Semanur Zomac S.A.S.):
 *   - MACHINERY: Tractors, Excavators, Bulldozers, Retros → Hourmeter-based, NO SOAT/RTM
 *   - ROAD VEHICLES: Volquetas, Camionetas, Camión, Motos → Km-based, SOAT/RTM required
 */

const MACHINERY_KEYWORDS = ['tractor', 'maquinaria', 'buldozer', 'bulldozer', 'retro', 'excavadora', 'excavator', 'guadaña', 'motosierra', 'planta electrica'];
const ROAD_DOC_TYPES = ['volqueta', 'camioneta', 'camion', 'camión', 'moto'];

/**
 * Returns true if the vehicle is classified as heavy/yellow machinery.
 * These units do NOT have SOAT, Tecnomecánica, or meaningful odometer readings.
 * @param {object|string} vehicle - Vehicle object with `.tipo`, or a tipo string directly
 */
export function isMachinery(vehicle) {
  const tipo = (typeof vehicle === 'string' ? vehicle : vehicle?.tipo || '').toLowerCase().trim();
  return MACHINERY_KEYWORDS.some(k => tipo.includes(k));
}

/**
 * Returns true if the vehicle requires SOAT and Tecnomecánica (road documents).
 * @param {object|string} vehicle
 */
export function requiresRoadDocuments(vehicle) {
  const tipo = (typeof vehicle === 'string' ? vehicle : vehicle?.tipo || '').toLowerCase().trim();
  return ROAD_DOC_TYPES.includes(tipo);
}

/**
 * Returns the primary measurement label for the vehicle type.
 */
export function primaryMeasurementLabel(vehicle) {
  return isMachinery(vehicle) ? 'Horómetro' : 'Kilometraje';
}

/**
 * Returns the primary measurement unit suffix.
 */
export function primaryMeasurementUnit(vehicle) {
  return isMachinery(vehicle) ? 'h' : 'km';
}

/**
 * Returns the primary measurement value from the vehicle object.
 */
export function primaryMeasurementValue(vehicle) {
  return isMachinery(vehicle)
    ? Number(vehicle?.horometro_actual ?? 0)
    : Number(vehicle?.kilometraje_actual ?? 0);
}

/**
 * Returns the next maintenance threshold from the vehicle object.
 */
export function nextMaintenanceValue(vehicle) {
  return isMachinery(vehicle)
    ? Number(vehicle?.horometro_proximo_mantenimiento ?? 0)
    : Number(vehicle?.kilometraje_proximo_mantenimiento ?? 0);
}

/**
 * Returns the remaining units until next maintenance.
 * Positive = km/hours remaining. Negative = overdue.
 */
export function remainingUntilMaintenance(vehicle) {
  const current = primaryMeasurementValue(vehicle);
  const next = nextMaintenanceValue(vehicle);
  if (!next || next === 0) return null;
  return Math.round(next - current);
}

/**
 * Resolves the displayable image URL or category illustration fallback for a vehicle.
 */
export function getVehicleImageUrl(vehicle) {
  if (!vehicle) return '/fleet/generic.png';

  const rawUrl = vehicle.imagen_thumb_url || vehicle.imagen_url;
  if (rawUrl) {
    if (rawUrl.startsWith('http')) return rawUrl;
    const path = rawUrl.startsWith('/') ? rawUrl.slice(1) : rawUrl;
    const finalPath = path.includes('/') ? path : `vehiculos/${path}`;
    return `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/storage/${finalPath}`;
  }

  const type = (typeof vehicle === 'string' ? vehicle : vehicle?.tipo || '').toLowerCase();
  if (type.includes('tractor') || type.includes('camion') || type.includes('mula')) {
    return '/fleet/tractor.png';
  }
  if (type.includes('volqueta')) {
    return '/fleet/volqueta.png';
  }
  if (type.includes('camioneta') || type.includes('pickup')) {
    return '/fleet/camioneta.png';
  }
  if (type.includes('moto')) {
    return '/fleet/moto.png';
  }
  if (type.includes('maquinaria') || type.includes('excavadora')) {
    return '/fleet/maquinaria.png';
  }

  return '/fleet/generic.png';
}
