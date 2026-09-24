import http from '../../../shared/api/http';
import { extractList } from '../../../shared/utils/apiResponse';

export async function fetchHistorySources() {
  const { data } = await http.get('/history/all');
  const result = data || {};

  return {
    movimientos: extractList(result.movimientos),
    ordenes: extractList(result.ordenes),
    combustible: extractList(result.combustible),
    prestamos: extractList(result.prestamos),
  };
}
