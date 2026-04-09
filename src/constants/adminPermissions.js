export const PRODUCT_MASTER_PERMISSIONS = {
  industry: {
    create: 'ADMIN_INDUSTRY_CREATE',
    read: 'ADMIN_INDUSTRY_READ',
    update: 'ADMIN_INDUSTRY_UPDATE',
    delete: 'ADMIN_INDUSTRY_DELETE',
  },
  mainCategory: {
    create: 'ADMIN_MAIN_CATEGORY_CREATE',
    read: 'ADMIN_MAIN_CATEGORY_READ',
    update: 'ADMIN_MAIN_CATEGORY_UPDATE',
    delete: 'ADMIN_MAIN_CATEGORY_DELETE',
  },
  category: {
    create: 'ADMIN_CATEGORY_CREATE',
    read: 'ADMIN_CATEGORY_READ',
    update: 'ADMIN_CATEGORY_UPDATE',
    delete: 'ADMIN_CATEGORY_DELETE',
  },
  collection: {
    create: 'ADMIN_COLLECTION_CREATE',
    read: 'ADMIN_COLLECTION_READ',
    update: 'ADMIN_COLLECTION_UPDATE',
    delete: 'ADMIN_COLLECTION_DELETE',
  },
  subCategory: {
    create: 'ADMIN_SUB_CATEGORY_CREATE',
    read: 'ADMIN_SUB_CATEGORY_READ',
    update: 'ADMIN_SUB_CATEGORY_UPDATE',
    delete: 'ADMIN_SUB_CATEGORY_DELETE',
  },
  brand: {
    create: 'ADMIN_BRAND_CREATE',
    read: 'ADMIN_BRAND_READ',
    update: 'ADMIN_BRAND_UPDATE',
    delete: 'ADMIN_BRAND_DELETE',
  },
};

export const BUSINESS_PERMISSIONS = {
  read: 'ADMIN_BUSINESS_READ',
  create: 'ADMIN_BUSINESS_CREATE',
  kycUpdate: 'ADMIN_BUSINESS_KYC_UPDATE',
  approve: 'ADMIN_BUSINESS_APPROVE',
};

export const PRODUCT_PERMISSIONS = {
  create: 'ADMIN_PRODUCTS_CREATE',
  view: 'ADMIN_PRODUCTS_READ',
  edit: 'ADMIN_PRODUCTS_UPDATE',
  delete: 'ADMIN_PRODUCTS_DELETE',
  approve: 'ADMIN_PRODUCTS_APPROVE',
  requestChanges: 'ADMIN_PRODUCTS_REQUEST_CHANGES',
  reject: 'ADMIN_PRODUCTS_REJECT',
};

export const REVIEW_MODERATION_PERMISSIONS = {
  read: 'ADMIN_REVIEWS_READ',
  moderate: 'ADMIN_REVIEWS_MODERATE',
};
