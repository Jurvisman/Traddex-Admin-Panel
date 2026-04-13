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
export const createUserAccount = (token, payload) =>
  request('/users/register', { method: 'POST', body: payload, token });
export const fetchEmployees = (token) => request('/admin/employees', { token });
export const updateUser = (token, id, payload) => request(`/users/${id}`, { method: 'PUT', body: payload, token });
export const blockUser = (token, id) => request(`/users/${id}/block`, { method: 'POST', token });
export const deleteUser = (token, id) => request(`/users/${id}/delete`, { method: 'POST', token });
export const deleteUsersBulk = (token, userIds) =>
  request('/users/delete-bulk', { method: 'POST', body: { user_ids: userIds }, token });
export const createEmployee = (token, payload) =>
  request('/admin/employees', { method: 'POST', body: payload, token });
export const updateEmployee = (token, id, payload) =>
  request(`/admin/employees/${id}`, { method: 'PUT', body: payload, token });
export const deleteEmployee = (token, id) => request(`/admin/employees/${id}`, { method: 'DELETE', token });
export const listRoles = (token) => request('/roles', { token });
export const createRole = (token, payload) => request('/roles', { method: 'POST', body: payload, token });
export const updateRole = (token, id, payload) => request(`/roles/${id}`, { method: 'PUT', body: payload, token });
export const deleteRole = (token, id) => request(`/roles/${id}`, { method: 'DELETE', token });
export const fetchPermissionCatalog = (token) => request('/admin/rbac/catalog', { token });
export const fetchRolePermissions = (token, roleId) => request(`/admin/rbac/roles/${roleId}/permissions`, { token });
export const saveRolePermissions = (token, roleId, actionIds) =>
  request(`/admin/rbac/roles/${roleId}/permissions`, { method: 'PUT', body: { actionIds }, token });
export const fetchMyPermissions = (token) => request('/admin/permissions', { token });
export const fetchUserDetails = (token, id) => request(`/users/${id}/details`, { token });
export const fetchBusinessDetails = (token, id) => request(`/admin/businesses/${id}/details`, { token });
export const logoutUser = (token, id) => request(`/users/${id}/logout`, { method: 'POST', token });
export const fetchBusinesses = (token) => request('/admin/businesses', { token });
export const updateBusinessAccount = (token, id, payload) =>
  request(`/admin/businesses/${id}`, { method: 'PUT', body: payload, token });
export const updateBusinessProfile = (token, userId, payload, status) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/admin/profile/${userId}/business${query}`, { method: 'PUT', body: payload, token });
};
export const updateBusinessProfileStatus = (token, profileId, status) =>
  request(`/admin/profile/${profileId}/status?status=${encodeURIComponent(status)}`, { method: 'POST', token });

export const listIndustries = (token) => request('/industries', { token });
export const getIndustry = (token, id) => request(`/industries/${id}`, { token });
export const sendOtp    = (mobileNumber) => request('/users/send-otp',   { method: 'POST', body: { mobileNumber } });
export const verifyOtp  = (mobileNumber, otpCode) => request('/users/verify-otp', { method: 'POST', body: { mobileNumber, otpCode } });
export const sendBusinessCreateOtp = (token, mobileNumber) =>
  request('/admin/businesses/send-otp', { method: 'POST', body: { mobileNumber }, token });
export const verifyBusinessCreateOtp = (token, mobileNumber, otpCode) =>
  request('/admin/businesses/verify-otp', { method: 'POST', body: { mobileNumber, otpCode }, token });
export const listCountries  = (token) => request('/locations/countries', { token });
export const listStates     = (token, countryCode) => request(`/locations/states?countryCode=${encodeURIComponent(countryCode)}`, { token });
export const listCities     = (token, stateCode)   => request(`/locations/cities?stateCode=${encodeURIComponent(stateCode)}`, { token });
export const listBusinessTypes = (token, segment) => {
  const params = segment ? `?segment=${encodeURIComponent(segment.toUpperCase())}` : '';
  return request(`/profile/business/types${params}`, { token });
};
export const createIndustry = (token, payload) => request('/industries', { method: 'POST', body: payload, token });
export const updateIndustry = (token, id, payload) =>
  request(`/industries/${id}`, { method: 'PUT', body: payload, token });
export const updateIndustryOrder = (token, id, position) =>
  request(`/industries/${id}/order`, { method: 'POST', body: { position }, token });
export const deleteIndustry = (token, id) => request(`/industries/${id}`, { method: 'DELETE', token });

export const listMainCategories = (token) => request('/main-categories', { token });
export const getMainCategory = (token, id) => request(`/main-categories/${id}`, { token });
export const createMainCategory = (token, payload) =>
  request('/main-categories', { method: 'POST', body: payload, token });
export const updateMainCategory = (token, id, payload) =>
  request(`/main-categories/${id}`, { method: 'PUT', body: payload, token });
export const updateMainCategoryOrder = (token, id, position, industryId) =>
  request(`/main-categories/${id}/order`, { method: 'POST', body: { position, industryId }, token });
export const deleteMainCategory = (token, id) => request(`/main-categories/${id}`, { method: 'DELETE', token });

export const listCategories = (token, mainCategoryId) => {
  const query = mainCategoryId ? `?mainCategoryId=${mainCategoryId}` : '';
  return request(`/categories${query}`, { token });
};
export const getCategory = (token, id) => request(`/categories/${id}`, { token });
export const createCategory = (token, payload) => request('/categories', { method: 'POST', body: payload, token });
export const updateCategory = (token, id, payload) =>
  request(`/categories/${id}`, { method: 'PUT', body: payload, token });
export const updateCategoryOrder = (token, id, position, mainCategoryId) =>
  request(`/categories/${id}/order`, { method: 'POST', body: { position, mainCategoryId }, token });
export const deleteCategory = (token, id) => request(`/categories/${id}`, { method: 'DELETE', token });

export const listProductCollections = (token, active) => {
  const query = active === true || active === false ? `?active=${active}` : '';
  return request(`/collections${query}`, { token });
};
export const createProductCollection = (token, payload) =>
  request('/collections', { method: 'POST', body: payload, token });
export const updateProductCollection = (token, id, payload) =>
  request(`/collections/${id}`, { method: 'PUT', body: payload, token });
export const deleteProductCollection = (token, id) =>
  request(`/collections/${id}`, { method: 'DELETE', token });

export const listSubCategories = (token, categoryId) => {
  const query = categoryId ? `?categoryId=${categoryId}` : '';
  return request(`/sub-categories${query}`, { token });
};
export const getSubCategory = (token, id) => request(`/sub-categories/${id}`, { token });
export const createSubCategory = (token, payload) =>
  request('/sub-categories', { method: 'POST', body: payload, token });
export const updateSubCategory = (token, id, payload) =>
  request(`/sub-categories/${id}`, { method: 'PUT', body: payload, token });
export const updateSubCategoryOrder = (token, id, position, categoryId) =>
  request(`/sub-categories/${id}/order`, { method: 'POST', body: { position, categoryId }, token });
export const deleteSubCategory = (token, id) => request(`/sub-categories/${id}`, { method: 'DELETE', token });

export const listProducts = (token, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.query) params.set('query', filters.query);
  if (filters.category) params.set('category', filters.category);
  if (filters.business) params.set('business', filters.business);
  if (filters.brand) params.set('brand', filters.brand);
  if (filters.page !== null && filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.size !== null && filters.size !== undefined) params.set('size', String(filters.size));
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/admin/product/getall${query}`, { token });
};
export const listProductsByUser = (token, userId) => request(`/admin/product/by-user?userId=${userId}`, { token });
export const listProductsByBusinessUser = (token, userId) => request(`/admin/businesses/${userId}/products`, { token });
export const getBusinessLeadSummary = (token, userId) => request(`/admin/businesses/${userId}/leads`, { token });
export const getBusinessOrderSummary = (token, userId) => request(`/admin/businesses/${userId}/orders`, { token });
export const getBusinessPaymentSummary = (token, userId) => request(`/admin/businesses/${userId}/payments`, { token });
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
export const reviewProductBrand = (token, productId, payload) =>
  request(`/admin/product/${productId}/brand/review`, { method: 'PUT', body: payload, token });

const requestMultipart = async (path, { method = 'POST', formData, token: authToken } = {}) => {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const response = await fetch(buildUrl(path), { method, headers, body: formData });
  if (!response.ok) throw new Error(await parseError(response));
  if (response.status === 204) return null;
  return response.json();
};

export const downloadCatalogTemplate = (token) =>
  fetch(buildUrl('/admin/catalog/import/template'), {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => {
    if (!r.ok) throw new Error('Template download failed');
    return r.blob();
  });

export const previewCatalogImport = (token, industryId, mode, file) => {
  const formData = new FormData();
  formData.append('industryId', industryId);
  formData.append('mode', mode);
  formData.append('file', file);
  return requestMultipart('/admin/catalog/import/preview', { formData, token });
};

export const commitCatalogImport = (token, payload) =>
  request('/admin/catalog/import/commit', { method: 'POST', body: payload, token });

export const listBrandOptions = (token, query) => {
  const search = query ? `?query=${encodeURIComponent(query)}` : '';
  return request(`/admin/brands/options${search}`, { token });
};
export const listBrands = (token, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.query) params.set('query', filters.query);
  if (filters.approvalStatus) params.set('approvalStatus', filters.approvalStatus);
  if (filters.isActive === true || filters.isActive === false) params.set('isActive', filters.isActive);
  if (filters.excludeMerged === true) params.set('excludeMerged', 'true');
  const search = params.toString() ? `?${params.toString()}` : '';
  return request(`/admin/brands${search}`, { token });
};
export const getBrand = (token, id) => request(`/admin/brands/${id}`, { token });
export const createBrand = (token, payload) =>
  request('/admin/brands', { method: 'POST', body: payload, token });
export const updateBrand = (token, id, payload) =>
  request(`/admin/brands/${id}`, { method: 'PUT', body: payload, token });
export const deleteBrand = (token, id) => request(`/admin/brands/${id}`, { method: 'DELETE', token });

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
export const purgeAllAttributeDefinitions = (token) =>
  request('/admin/product-attribute/purge-all', { method: 'DELETE', token });

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
export const getAppConfigPresets = (token) => request('/admin/app-config/presets', { token });
export const getPublishedAppConfig = () => request('/app-config');
export const getHomeCategoryPreview = (token, { ids = [], limit = 2, rankingWindowDays } = {}) => {
  const cleanIds = Array.isArray(ids)
    ? ids
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    : [];
  const params = new URLSearchParams();
  params.set('ids', cleanIds.join(','));
  params.set('limit', String(limit || 2));
  if (rankingWindowDays !== undefined && rankingWindowDays !== null && rankingWindowDays !== '') {
    params.set('rankingWindowDays', String(rankingWindowDays));
  }
  return request(`/home/category-preview?${params.toString()}`, { token });
};

export const getBrandFeedPreview = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.industryId) params.set('industryId', String(filters.industryId));
  if (filters.mainCategoryId) params.set('mainCategoryId', String(filters.mainCategoryId));
  if (filters.limit !== undefined && filters.limit !== null && filters.limit !== '') {
    params.set('limit', String(filters.limit));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/brand/getall${query}`);
};

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

export const importTimeZones = async (token, file, replace = true) => {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const body = new FormData();
  if (file) {
    body.append('file', file);
  }

  const response = await fetch(
    buildUrl(`/admin/locations/timezones/import?replace=${replace ? 'true' : 'false'}`),
    {
      method: 'POST',
      headers,
      body,
    }
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  if (response.status === 204) return null;

  const payload = await response.json();
  if (payload?.success === false) {
    throw new Error(payload?.message || 'Failed to import timezones.');
  }
  return payload?.data || payload;
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

export const activateSubscriptionPlan = (token, payload) =>
  request('/admin/subscription/assign', { method: 'POST', body: payload, token });





export const assignSubscriptionPlan = (token, payload) =>
  request('/admin/subscription/assign', { method: 'POST', body: payload, token });
export const listSubscriptionAssignments = (token, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.user_id) params.set('user_id', filters.user_id);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/admin/subscription/list${query}`, { token });
};

export const getBusinessFeatureUsage = (token, userId) =>
  request(`/admin/subscription/feature-usage?user_id=${userId}`, { token });

// Addon pricing management
export const upsertAddonPricing = (token, payload) =>
  request('/admin/addon/pricing', { method: 'POST', body: payload, token });

export const getAddonHistory = (token, userId) =>
  request(`/admin/addon/history?user_id=${userId}`, { token });

// Order disputes
export const listOrderDisputes = (token, status) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/admin/orders/disputes${query}`, { token });
};
export const resolveOrderDispute = (token, disputeId, payload) =>
  request(`/admin/orders/disputes/${disputeId}/resolve`, { method: 'POST', body: payload, token });

export const listOrderReturns = (token, status) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/admin/orders/returns${query}`, { token });
};
export const overrideOrderReturn = (token, returnId, payload) =>
  request(`/admin/orders/returns/${returnId}/override`, { method: 'POST', body: payload, token });

export const getUserBusinessScore = (token, userId) =>
  request(`/admin/business-score?user_id=${userId}`, { token });

export const getUserBusinessScoreHistory = (token, userId, limit = 25) =>
  request(`/admin/business-score/history?user_id=${userId}&limit=${limit}`, { token });

// ── Advertisements ────────────────────────────────────────────────────────────

// Admin: subscription revenue dashboard
export const getSubscriptionRevenue = (token) =>
  request('/admin/subscription/revenue', { token });

// Admin: audit logs
export const getAuditLogs = (token, { category, actorId, sensitiveOnly, dateFrom, dateTo, page = 0, size = 50 } = {}) => {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (actorId) params.set('actorId', actorId);
  if (sensitiveOnly) params.set('sensitiveOnly', 'true');
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  params.set('page', page);
  params.set('size', size);
  return request(`/admin/audit-logs?${params.toString()}`, { token });
};

// Admin: list all ads, optionally filtered by status (PENDING, ACTIVE, EXPIRED, REJECTED)
export const listAllAds = (token, status = null) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/admin/advertisements${query}`, { token });
};

// Admin: get single ad detail
export const getAdById = (token, adId) =>
  request(`/admin/advertisements/${adId}`, { token });

// Admin: approve / reject / force-expire an ad
// payload: { status: 'ACTIVE' | 'REJECTED' | 'EXPIRED', adminNote?: string }
export const updateAdStatus = (token, adId, payload) =>
  request(`/admin/advertisements/${adId}/status`, { method: 'PATCH', body: payload, token });

// Admin: Pricing Config
export const getAdPricingConfig = (token) =>
  request('/advertisements/pricing-config', { token });

export const updateAdPricingConfig = (token, payload) =>
  request('/admin/advertisements/pricing-config', { method: 'PUT', body: payload, token });

// Review moderation
export const listAdminProductReviews = (token, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.productId !== null && filters.productId !== undefined && filters.productId !== '') {
    params.set('productId', String(filters.productId));
  }
  if (filters.status) params.set('status', filters.status);
  if (filters.reportedOnly === true) params.set('reportedOnly', 'true');
  if (filters.query) params.set('query', filters.query);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/admin/reviews/products${query}`, { token });
};

export const listAdminBusinessReviews = (token, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.reportedOnly === true) params.set('reportedOnly', 'true');
  if (filters.query) params.set('query', filters.query);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/admin/reviews/businesses${query}`, { token });
};

export const updateAdminProductReviewStatus = (token, reviewId, status) =>
  request(`/admin/reviews/products/${reviewId}/status`, { method: 'PATCH', body: { status }, token });

export const updateAdminBusinessReviewStatus = (token, reviewId, status) =>
  request(`/admin/reviews/businesses/${reviewId}/status`, { method: 'PATCH', body: { status }, token });

export const updateAdminReviewReportStatus = (token, reportId, status) =>
  request(`/admin/reviews/reports/${reportId}`, { method: 'PATCH', body: { status }, token });

export const fetchKycAssistanceRequests = (token) =>
  request('/admin/support/kyc-assistance', { token });

export const updateKycAssistanceStatus = (token, id, status, adminNote = null) =>
  request(`/admin/support/kyc-assistance/${id}/status`, { method: 'PATCH', body: { status, adminNote }, token });

export const assignKycAssistanceRequest = (token, id, adminId) =>
  request(`/admin/support/kyc-assistance/${id}/assign`, { method: 'PATCH', body: { adminId }, token });
