const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
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
export const updateUser = (token, id, payload) => request(`/users/${id}`, { method: 'PUT', body: payload, token });
export const blockUser = (token, id) => request(`/users/${id}/block`, { method: 'POST', token });
export const deleteUser = (token, id) => request(`/users/${id}/delete`, { method: 'POST', token });
export const deleteUsersBulk = (token, userIds) =>
  request('/users/delete-bulk', { method: 'POST', body: { user_ids: userIds }, token });
export const fetchUserDetails = (token, id) => request(`/users/${id}/details`, { token });
export const logoutUser = (token, id) => request(`/users/${id}/logout`, { method: 'POST', token });
export const updateBusinessProfile = (token, userId, payload, status) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/admin/profile/${userId}/business${query}`, { method: 'PUT', body: payload, token });
};
export const updateBusinessProfileStatus = (token, profileId, status) =>
  request(`/admin/profile/${profileId}/status?status=${encodeURIComponent(status)}`, { method: 'POST', token });

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
export const listProductsByUser = (token, userId) => request(`/admin/product/by-user?userId=${userId}`, { token });
export const createProduct = (token, payload) =>
  request('/admin/product/create', { method: 'POST', body: payload, token });
export const getProduct = (token, id) => request(`/admin/product/${id}`, { token });
export const updateProduct = (token, id, payload) =>
  request(`/admin/product/${id}/update`, { method: 'PUT', body: payload, token });
export const deleteProduct = (token, id) => request(`/admin/product/${id}`, { method: 'DELETE', token });
export const deleteProductsBulk = (token, productIds) =>
  request('/admin/product/delete-bulk', { method: 'POST', body: { product_ids: productIds }, token });
export const updateProductVariantStatus = (token, productId, variantId, payload) =>
  request(`/admin/product/${productId}/variants/${variantId}/status`, { method: 'PUT', body: payload, token });

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

export const listUoms = (token) => request('/uom/getall', { token });
export const createUom = (token, payload) => request('/uom/create', { method: 'POST', body: payload, token });
export const updateUom = (token, id, payload) => request(`/uom/${id}/update`, { method: 'PUT', body: payload, token });
export const deleteUom = (token, id) => request(`/uom/${id}`, { method: 'DELETE', token });

export const getInquiryConfig = (token) => request('/admin/inquiry/config', { token });
export const updateInquiryConfig = (token, payload) =>
  request('/admin/inquiry/config', { method: 'PUT', body: payload, token });

export const getInquiryReport = (token, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.user_id) params.set('user_id', filters.user_id);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/admin/inquiry/report${query}`, { token });
};

// App config management
export const getAppConfigDraft = (token) => request('/admin/app-config/draft', { token });
export const saveAppConfigDraft = (token, payload) =>
  request('/admin/app-config/draft', { method: 'PUT', body: payload, token });
export const validateAppConfig = (token, payload) =>
  request('/admin/app-config/validate', { method: 'POST', body: payload, token });
export const publishAppConfig = (token) => request('/admin/app-config/publish', { method: 'POST', token });
export const listAppConfigVersions = (token) => request('/admin/app-config/versions', { token });
export const rollbackAppConfig = (token, payload) =>
  request('/admin/app-config/rollback', { method: 'POST', body: payload, token });
export const getPublishedAppConfig = () => request('/app-config');

export const uploadBannerImages = async (token, files) => {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const body = new FormData();
  Array.from(files || []).forEach((file) => body.append('files', file));

  const response = await fetch(buildUrl('/user/product/images'), {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  if (response.status === 204) return null;
  return response.json();
};

// Subscription management
export const listSubscriptionFeatures = (token) => request('/admin/feature/list', { token });
export const createSubscriptionFeature = (token, payload) =>
  request('/admin/feature/create', { method: 'POST', body: payload, token });
export const updateSubscriptionFeature = (token, id, payload) =>
  request(`/admin/feature/${id}`, { method: 'PUT', body: payload, token });
export const deleteSubscriptionFeature = (token, id) =>
  request(`/admin/feature/${id}`, { method: 'DELETE', token });

export const listSubscriptionPlans = (token) => request('/admin/plan/list', { token });
export const createSubscriptionPlan = (token, payload) =>
  request('/admin/plan/create', { method: 'POST', body: payload, token });
export const updateSubscriptionPlan = (token, id, payload) =>
  request(`/admin/plan/${id}`, { method: 'PUT', body: payload, token });
export const deleteSubscriptionPlan = (token, id) =>
  request(`/admin/plan/${id}`, { method: 'DELETE', token });

export const assignSubscriptionPlan = (token, payload) =>
  request('/admin/subscription/assign', { method: 'POST', body: payload, token });
export const listSubscriptionAssignments = (token, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.user_id) params.set('user_id', filters.user_id);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/admin/subscription/list${query}`, { token });
};
