const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
const API_KEY = 'TradeX-API-Key-2024';

const buildUrl = (path) => `${API_BASE}/api${path}`;

const parseError = async (response) => {
  const fallback = `Request failed. Status ${response.status}`;
  try {
    const text = await response.text();
    if (!text) return fallback;
    try {
      const data = JSON.parse(text);
      if (data?.message) return data.message;
    } catch (error) {
      // Ignore JSON parse errors and return raw text.
    }
    return text;
  } catch (error) {
    return fallback;
  }
};

const request = async (path, { method = 'GET', body, token } = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) return null;
  return response.json();
};

export const fetchUsers = (token) => request('/users/all', { token });

export const listIndustries = (token) => request('/industries', { token });
export const createIndustry = (token, payload) => request('/industries', { method: 'POST', body: payload, token });
export const deleteIndustry = (token, id) => request(`/industries/${id}`, { method: 'DELETE', token });

export const listMainCategories = (token) => request('/main-categories', { token });
export const createMainCategory = (token, payload) =>
  request('/main-categories', { method: 'POST', body: payload, token });
export const deleteMainCategory = (token, id) => request(`/main-categories/${id}`, { method: 'DELETE', token });

export const listCategories = (token, mainCategoryId) => {
  const query = mainCategoryId ? `?mainCategoryId=${mainCategoryId}` : '';
  return request(`/categories${query}`, { token });
};
export const createCategory = (token, payload) => request('/categories', { method: 'POST', body: payload, token });
export const deleteCategory = (token, id) => request(`/categories/${id}`, { method: 'DELETE', token });

export const listSubCategories = (token, categoryId) => {
  const query = categoryId ? `?categoryId=${categoryId}` : '';
  return request(`/sub-categories${query}`, { token });
};
export const createSubCategory = (token, payload) =>
  request('/sub-categories', { method: 'POST', body: payload, token });
export const deleteSubCategory = (token, id) => request(`/sub-categories/${id}`, { method: 'DELETE', token });

export const listProducts = (token) => request('/admin/product/getall', { token });
export const createProduct = (token, payload) =>
  request('/admin/product/create', { method: 'POST', body: payload, token });
export const getProduct = (token, id) => request(`/admin/product/${id}`, { token });
export const updateProduct = (token, id, payload) =>
  request(`/admin/product/${id}/update`, { method: 'PUT', body: payload, token });
export const deleteProduct = (token, id) => request(`/admin/product/${id}`, { method: 'DELETE', token });

export const listAttributeDefinitions = (token, active) => {
  const query = active === true || active === false ? `?active=${active}` : '';
  return request(`/admin/product-attribute/getall${query}`, { token });
};
export const createAttributeDefinition = (token, payload) =>
  request('/admin/product-attribute/create', { method: 'POST', body: payload, token });
export const updateAttributeDefinition = (token, id, payload) =>
  request(`/admin/product-attribute/${id}/update`, { method: 'PUT', body: payload, token });
export const deleteAttributeDefinition = (token, id) =>
  request(`/admin/product-attribute/${id}`, { method: 'DELETE', token });

export const listAttributeMappings = (token, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.mainCategoryId) params.set('mainCategoryId', filters.mainCategoryId);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.subCategoryId) params.set('subCategoryId', filters.subCategoryId);
  if (filters.active === true || filters.active === false) params.set('active', filters.active);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/admin/product-attribute-map/getall${query}`, { token });
};
export const createAttributeMapping = (token, payload) =>
  request('/admin/product-attribute-map/create', { method: 'POST', body: payload, token });
export const updateAttributeMapping = (token, id, payload) =>
  request(`/admin/product-attribute-map/${id}/update`, { method: 'PUT', body: payload, token });
export const deleteAttributeMapping = (token, id) =>
  request(`/admin/product-attribute-map/${id}`, { method: 'DELETE', token });
