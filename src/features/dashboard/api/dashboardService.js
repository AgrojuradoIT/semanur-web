import http from '../../../shared/api/http';
import { extractList } from '../../../shared/utils/apiResponse';

async function safeGet(path, fallback = [], { rethrow = false } = {}) {
  try {
    const { data } = await http.get(path);
    return Array.isArray(fallback) ? extractList(data) : data ?? fallback;
  } catch (error) {
    if (rethrow) throw error;
    return fallback;
  }
}

export async function fetchDashboardSources() {
  const data = await safeGet('/dashboard/all', {
    summary: { total_fuel_cost: 0, total_maintenance_cost: 0, vehicle_count: 0, open_orders: 0 },
    fuelMonthly: [],
    maintenanceByVehicle: [],
    fuelStock: [],
    fuelHistory15Days: [],
    otStats: {},
    preopHoy: {},
    loansStats: {},
    lowStock: {},
    liveSessions: { total: 0, items: [] },
    recentActivity: [],
    alerts: { items: [], total: 0, counts: {} },
  }, { rethrow: true });

  return {
    summary: data.summary || { total_fuel_cost: 0, total_maintenance_cost: 0, vehicle_count: 0, open_orders: 0 },
    fuelMonthly: extractList(data.fuelMonthly),
    maintenanceByVehicle: extractList(data.maintenanceByVehicle),
    fuelStock: extractList(data.fuelStock),
    fuelHistory15Days: extractList(data.fuelHistory15Days),
    otStats: data.otStats || { abiertas: 0, prioridades: {} },
    preopHoy: data.preopHoy || { completados: 0, total: 0 },
    loansStats: data.loansStats || { activos: 0, envejecidos: 0 },
    lowStock: data.lowStock || { count: 0 },
    liveSessions: {
      total: Number(data.liveSessions?.total || 0),
      items: extractList(data.liveSessions?.items),
    },
    recentActivity: extractList(data.recentActivity),
    maintenanceCost: Number(data.summary?.total_maintenance_cost || 0),
    docsCounts: data.alerts?.counts || {},
    alerts: data.alerts || { items: [], total: 0, counts: {} },
  };
}
