const stripTrailingSlashes = (value) => String(value || '').replace(/\/+$/, '');

export const API_ORIGIN = stripTrailingSlashes(
  process.env.REACT_APP_API_BASE || 'http://localhost:8080'
);

export const STOREFRONT_BASE_URL = stripTrailingSlashes(
  process.env.REACT_APP_STOREFRONT_BASE_URL || 'http://localhost:3001'
);
