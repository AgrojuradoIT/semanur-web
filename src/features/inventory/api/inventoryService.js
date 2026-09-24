import http from '../../../shared/api/http';
import { extractList } from '../../../shared/utils/apiResponse';

export async function fetchInventoryProducts(params = {}, config = {}) {
  const { data } = await http.get('/productos', { ...config, params });
  return data; // { data: [...], meta: {...}, metrics: {...} }
}

export async function fetchCategories(config = {}) {
  const { data } = await http.get('/categorias', config);
  return extractList(data);
}

export async function fetchBodegas(config = {}) {
  const { data } = await http.get('/bodegas', config);
  return extractList(data);
}

export async function searchInventoryProducts(query, config = {}) {
  const { data } = await http.get('/productos/buscar', {
    ...config,
    params: { q: query },
  });
  return extractList(data);
}

export async function fetchInventoryMovements(params = {}, config = {}) {
  const { data } = await http.get('/movimientos', { ...config, params });

  if (Array.isArray(data)) {
    return {
      data,
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: data.length,
        total: data.length,
      },
    };
  }

  const movements = extractList(data);

  return {
    data: movements,
    meta: data?.meta ?? {
      current_page: 1,
      last_page: 1,
      per_page: movements.length,
      total: movements.length,
    },
  };
}

export async function createProduct(payload) {
  const { data } = await http.post('/productos', payload);
  return data;
}

export async function updateProduct(id, payload) {
  const { data } = await http.put(`/productos/${id}`, payload);
  return data;
}

export async function deleteProduct(id) {
  const { data } = await http.delete(`/productos/${id}`);
  return data;
}

export async function createMovement(payload) {
  const { data } = await http.post('/movimientos', payload);
  return data;
}

export async function uploadPurchasesPreview(file, options = {}, onProgress = null, config = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('dry_run', 1);

  if (options?.bodega_id) {
    formData.append('bodega_id', Number(options.bodega_id));
  }

  if (options?.categoria_id) {
    formData.append('categoria_id', Number(options.categoria_id));
  }
  if (options?.unidad_medida) {
    formData.append('unidad_medida', options.unidad_medida);
  }
  if (options?.alerta_stock_minimo !== undefined && options?.alerta_stock_minimo !== null) {
    formData.append('alerta_stock_minimo', Number(options.alerta_stock_minimo));
  }

  const { data } = await http.post('/inventario/import-compras', formData, {
    ...config,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

export async function uploadPurchasesConfirm(file, options = {}, onProgress = null, config = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('dry_run', 0);

  if (options?.bodega_id) {
    formData.append('bodega_id', Number(options.bodega_id));
  }
  if (options?.idempotency_key) {
    formData.append('idempotency_key', options.idempotency_key);
  }

  if (options?.categoria_id) {
    formData.append('categoria_id', Number(options.categoria_id));
  }
  if (options?.unidad_medida) {
    formData.append('unidad_medida', options.unidad_medida);
  }
  if (options?.alerta_stock_minimo !== undefined && options?.alerta_stock_minimo !== null) {
    formData.append('alerta_stock_minimo', Number(options.alerta_stock_minimo));
  }

  const { data } = await http.post('/inventario/import-compras', formData, {
    ...config,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}
