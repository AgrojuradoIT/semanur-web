import http from '../../../shared/api/http';

export async function fetchFuelReports(params = {}) {
  const { data } = await http.get('/combustible/reportes', { params });
  return data;
}
