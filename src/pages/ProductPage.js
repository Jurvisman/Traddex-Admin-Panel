import { useEffect, useMemo, useRef, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components';
import {
  createProduct,
  createUom,
  deleteProduct,
  deleteUom,
  fetchUsers,
  getProduct,
  listAttributeDefinitions,
  listAttributeMappings,
  listCategories,
  listMainCategories,
  listProducts,
  listSubCategories,
  listUoms,
  uploadBannerImages,
  updateUom,
  updateProduct,
  updateProductVariantStatus,
} from '../services/adminApi';

const createUomConversionEntry = () => ({
  rowId: `uom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  uomId: '',
  conversionFactor: '',
});
const createVariantAttributeEntry = () => ({ key: '', value: '' });
const createVariantEntry = () => ({
  variantName: '',
  sku: '',
  barcode: '',
  sellingPrice: '',
  mrp: '',
  stockQuantity: '',
  lowStockAlert: '',
  thumbnailImage: '',
  galleryImagesText: '',
  attributes: [createVariantAttributeEntry()],
});

const ADMIN_API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';

const normalize = (value) => String(value || '').toLowerCase();
const normalizeDynamicKey = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
const humanizeKey = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
const resolveMediaUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^(data:|blob:|https?:\/\/)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `${ADMIN_API_BASE}${trimmed}`;
  return `${ADMIN_API_BASE}/${trimmed.replace(/^\.?\//, '')}`;
};
const extractImageUrls = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') return item;
      return item?.url || item?.imageUrl || '';
    })
    .filter(Boolean);
};
const getProductGalleryUrls = (product) => extractImageUrls(product?.galleryImages);
const parseUiConfigValue = (value) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return {};
};
const buildProductUiConfigValue = (currentValue, defaults) => {
  const current = parseUiConfigValue(currentValue);
  const next = { ...current };
  const normalizedDefaults = Object.entries(defaults || {}).reduce((acc, [key, value]) => {
    if (value) acc[key] = value;
    return acc;
  }, {});
  if (Object.keys(normalizedDefaults).length > 0) {
    next.uomDefaults = normalizedDefaults;
  } else {
    delete next.uomDefaults;
  }
  return Object.keys(next).length > 0 ? JSON.stringify(next) : null;
};
const buildProductUomConversions = (product) => {
  const merged = [
    ...(Array.isArray(product?.purchaseUoms) ? product.purchaseUoms : []),
    ...(Array.isArray(product?.salesUoms) ? product.salesUoms : []),
  ];
  const seen = new Set();
  return merged.reduce((rows, entry, index) => {
    const uomId = entry?.uomId ? String(entry.uomId) : '';
    if (uomId && seen.has(uomId)) return rows;
    if (uomId) seen.add(uomId);
    rows.push({
      rowId: `uom-existing-${index}-${uomId || 'blank'}`,
      uomId,
      conversionFactor:
        entry?.conversionFactor !== null && entry?.conversionFactor !== undefined ? String(entry.conversionFactor) : '',
    });
    return rows;
  }, []);
};
const orderUomEntriesByDefault = (entries, defaultUomId) => {
  const normalizedDefault = String(defaultUomId || '');
  if (!normalizedDefault) return [...entries];
  const next = [...entries];
  const matchIndex = next.findIndex((entry) => String(entry?.uomId || '') === normalizedDefault);
  if (matchIndex <= 0) return next;
  const [selected] = next.splice(matchIndex, 1);
  next.unshift(selected);
  return next;
};
const buildMirroredUomLists = (rows, baseUomId, defaultStockInUomId, defaultStockOutUomId) => {
  const normalizedBaseUomId = String(baseUomId || '');
  const normalizedRows = (Array.isArray(rows) ? rows : [])
    .slice(0, 3)
    .map((row) => ({
      rowId: row?.rowId || createUomConversionEntry().rowId,
      uomId: String(row?.uomId || ''),
      conversionFactor:
        String(row?.uomId || '') && String(row?.uomId || '') === normalizedBaseUomId
          ? '1'
          : row?.conversionFactor ?? '',
    }));
  const payloadRows = normalizedRows.map(({ uomId, conversionFactor }) => ({ uomId, conversionFactor }));
  return {
    uomConversions: normalizedRows,
    purchaseUoms: orderUomEntriesByDefault(payloadRows, defaultStockInUomId),
    salesUoms: orderUomEntriesByDefault(payloadRows, defaultStockOutUomId),
  };
};
const getPrimaryProductImage = (product) => product?.thumbnailImage || getProductGalleryUrls(product)[0] || '';
const getVariantGalleryUrls = (variant) => extractImageUrls(variant?.images);
const getPrimaryVariantImage = (variant) => variant?.thumbnailImage || getVariantGalleryUrls(variant)[0] || '';
const getProductSortTimestamp = (product) => {
  const candidates = [product?.updatedOn, product?.updated_on, product?.createdOn, product?.created_on];
  for (const value of candidates) {
    const timestamp = Date.parse(value || '');
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
};
const getProductSortId = (product) => {
  const numericId = Number(product?.id ?? product?.productId ?? 0);
  return Number.isFinite(numericId) ? numericId : 0;
};
const getScopedSubCategoryLabel = (categoryName, subCategoryName, appliesToAll = false) => {
  const resolvedSubCategory = String(subCategoryName || '').trim();
  if (resolvedSubCategory) return resolvedSubCategory;
  if (appliesToAll && String(categoryName || '').trim()) return 'All sub-categories';
  return '';
};

const formatDynamicByType = (type, value, unit) => {
  if (value === null || value === undefined || value === '') return '-';
  const normalized = String(type || '').toUpperCase();
  if (normalized === 'BOOLEAN') {
    if (value === true || value === 'true') return 'Yes';
    if (value === false || value === 'false') return 'No';
  }
  if (normalized === 'LIST') {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'string') return value;
  }
  if (normalized === 'NUMBER') {
    const numeric = typeof value === 'number' ? value : Number(value);
    const base = Number.isFinite(numeric) ? String(numeric) : String(value);
    return unit ? `${base} ${unit}` : base;
  }
  if (normalized === 'OBJECT') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
};

const ACTION_ICONS = {
  view: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5c5.2 0 9.3 3.6 10.6 6.7a1 1 0 0 1 0 .6C21.3 15.4 17.2 19 12 19S2.7 15.4 1.4 12.3a1 1 0 0 1 0-.6C2.7 8.6 6.8 5 12 5Zm0 2c-4 0-7.2 2.7-8.4 5 1.2 2.3 4.4 5 8.4 5s7.2-2.7 8.4-5c-1.2-2.3-4.4-5-8.4-5Zm0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
        fill="currentColor"
      />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 16.7V19h2.3l9.9-9.9-2.3-2.3-9.9 9.9Zm13.7-8.4a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1.3 1.3 2.3 2.3 1.3-1.3Z"
        fill="currentColor"
      />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM7 9h2v9H7V9Z"
        fill="currentColor"
      />
    </svg>
  ),
  approve: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9.5 16.2 5.8 12.5l1.4-1.4 2.3 2.3 6.3-6.3 1.4 1.4-7.7 7.7Z"
        fill="currentColor"
      />
    </svg>
  ),
  reject: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m7.4 6 10.6 10.6-1.4 1.4L6 7.4 7.4 6Zm9.2 0 1.4 1.4L8.4 18.9 7 17.5 16.6 6Z"
        fill="currentColor"
      />
    </svg>
  ),
  requestChanges: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3a9 9 0 1 1-6.4 2.6L4.2 7 3 5.8l2.4-2.4L7.8 5l-1.2 1.2A7 7 0 1 0 12 5c-1.6 0-3 .5-4.2 1.4L6.6 8A9 9 0 0 1 12 3Zm-.8 5h1.6v5h-1.6V8Zm0 6.5h1.6V16h-1.6v-1.5Z"
        fill="currentColor"
      />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 7a1.75 1.75 0 1 1 0-3.5A1.75 1.75 0 0 1 12 7Zm0 6.75a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Zm0 6.75a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z"
        fill="currentColor"
      />
    </svg>
  ),
};

const initialForm = {
  productName: '',
  brandName: '',
  shortDescription: '',
  thumbnailImage: '',
  galleryImagesText: '',
  mainCategoryId: '',
  categoryId: '',
  subCategoryId: '',
  sellingPrice: '',
  mrp: '',
  gstRate: '',
  userId: '',
  useAllSubCategories: false,
  baseUomId: '',
  uomConversions: [],
  defaultStockInUomId: '',
  defaultStockOutUomId: '',
  purchaseUoms: [],
  salesUoms: [],
  uiConfig: '',
  variants: [],
};

const createReviewForm = () => ({
  mainCategoryId: '',
  categoryId: '',
  subCategoryId: '',
});

const createProductSelectorForm = () => ({
  userId: '',
  mainCategoryId: '',
  categoryId: '',
  subCategoryId: '',
});

const CHANGE_REQUEST_OPTIONS = [
  { key: 'category', label: 'Category mapping', hint: 'Main category, category, or sub-category is incorrect or incomplete.' },
  { key: 'dynamic_fields', label: 'Dynamic fields', hint: 'Required category-specific specifications are missing or incorrect.' },
  { key: 'pricing', label: 'Pricing', hint: 'Selling price, MRP, GST, or B2B price needs correction.' },
  { key: 'media', label: 'Media quality', hint: 'Thumbnail/gallery images are missing, wrong, or low quality.' },
  { key: 'description', label: 'Descriptions', hint: 'Product copy, brand, or naming needs clarification.' },
  { key: 'inventory', label: 'Inventory & MOQ', hint: 'Stock, MOQ, shipping, or warehouse details need updates.' },
  { key: 'compliance', label: 'Compliance', hint: 'HSN, country of origin, certifications, or policy details are missing.' },
];

function ProductTableThumbnail({ imageUrl, alt }) {
  const [hasError, setHasError] = useState(false);
  const resolvedImage = hasError ? '' : resolveMediaUrl(imageUrl);

  return (
    <div className={`product-row-thumb${resolvedImage ? '' : ' is-empty'}`}>
      {resolvedImage ? (
        <img src={resolvedImage} alt={alt} loading="lazy" onError={() => setHasError(true)} />
      ) : (
        <div className="product-row-thumb-placeholder">
          <span>No image</span>
        </div>
      )}
    </div>
  );
}

function ProductPage({ token, adminUserId }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mainCategories, setMainCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [attributeDefinitions, setAttributeDefinitions] = useState([]);
  const [attributeMappings, setAttributeMappings] = useState([]);
  const [viewAttributeMappings, setViewAttributeMappings] = useState([]);
  const [reviewForm, setReviewForm] = useState(createReviewForm);
  const [reviewCategories, setReviewCategories] = useState([]);
  const [reviewSubCategories, setReviewSubCategories] = useState([]);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestForm, setChangeRequestForm] = useState({ issues: [], note: '' });
  const [dynamicValues, setDynamicValues] = useState({});
  const [uoms, setUoms] = useState([]);
  const [uomForm, setUomForm] = useState({
    uomCode: '',
    uomName: '',
    description: '',
    isActive: true,
  });
  const [editingUomId, setEditingUomId] = useState(null);
  const [isUomSaving, setIsUomSaving] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [showCreateSelector, setShowCreateSelector] = useState(false);
  const [showCreateUomModal, setShowCreateUomModal] = useState(false);
  const [businessAccounts, setBusinessAccounts] = useState([]);
  const [createSelectorForm, setCreateSelectorForm] = useState(() => createProductSelectorForm());
  const [createSelectorCategories, setCreateSelectorCategories] = useState([]);
  const [createSelectorSubCategories, setCreateSelectorSubCategories] = useState([]);
  const [isCreateSelectorLoading, setIsCreateSelectorLoading] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productFormTab, setProductFormTab] = useState('general');
  const [activeProductViewTab, setActiveProductViewTab] = useState('overview');
  const [showViewActionMenu, setShowViewActionMenu] = useState(false);
  const [openProductActionId, setOpenProductActionId] = useState(null);
  const didInitRef = useRef(false);
  const mediaInputRef = useRef(null);
  const uomSectionRef = useRef(null);
  const viewActionMenuRef = useRef(null);
  const productActionMenuRef = useRef(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const editMatch = useMatch('/admin/products/:id/edit');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaTarget, setMediaTarget] = useState(null);

  const definitionById = useMemo(() => {
    const mapping = new Map();
    attributeDefinitions.forEach((definition) => {
      mapping.set(definition.id, definition);
    });
    return mapping;
  }, [attributeDefinitions]);

  const definitionByKey = useMemo(() => {
    const mapping = new Map();
    attributeDefinitions.forEach((definition) => {
      const key = definition.key || definition.attributeKey;
      if (!key) return;
      mapping.set(normalizeDynamicKey(key), definition);
    });
    return mapping;
  }, [attributeDefinitions]);

  const filteredProducts = useMemo(() => {
    const term = normalize(query);
    const visibleProducts = term
      ? products.filter((product) => {
          const haystack = [
            product?.productName,
            product?.brandName,
            product?.businessName,
            product?.category?.subCategoryName,
            product?.category?.categoryName,
            product?.category?.mainCategoryName,
            product?.approvalStatus,
          ]
            .map(normalize)
            .join(' ');
          return haystack.includes(term);
        })
      : products;

    return [...visibleProducts].sort((left, right) => {
      const timestampDiff = getProductSortTimestamp(right) - getProductSortTimestamp(left);
      if (timestampDiff !== 0) return timestampDiff;
      return getProductSortId(right) - getProductSortId(left);
    });
  }, [products, query]);

  const selectedProductId = id && !Number.isNaN(Number(id)) ? Number(id) : null;
  const isEditing = Boolean(editingProductId);
  const isViewing = Boolean(selectedProductId);
  const showViewOnly = isViewing && !showForm;
  const isEditRoute = Boolean(editMatch);

  const loadProducts = async () => {
    const response = await listProducts(token);
    setProducts(response?.data?.products || []);
    setSelectedIds(new Set());
  };

  const loadProductDetail = async (productId) => {
    const response = await getProduct(token, productId);
    setSelectedProduct(response?.data || null);
  };

  const loadMainCategories = async () => {
    const response = await listMainCategories(token);
    setMainCategories(response?.data || []);
  };

  const loadBusinessAccounts = async (force = false) => {
    if (!force && businessAccounts.length > 0) {
      return businessAccounts;
    }
    setIsCreateSelectorLoading(true);
    try {
      const response = await fetchUsers(token);
      const items = Array.isArray(response?.data) ? response.data : [];
      const filtered = items
        .filter((user) => isBusinessAccount(user))
        .sort((left, right) => getBusinessName(left).localeCompare(getBusinessName(right)));
      setBusinessAccounts(filtered);
      return filtered;
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load business accounts.' });
      return [];
    } finally {
      setIsCreateSelectorLoading(false);
    }
  };

  const loadUoms = async () => {
    const response = await listUoms(token);
    const items = response?.data?.uoms || [];
    const sorted = [...items].sort((a, b) => (a.uomName || '').localeCompare(b.uomName || ''));
    setUoms(sorted);
    syncUomSelections(sorted);
  };

  const loadAttributeDefinitions = async () => {
    const response = await listAttributeDefinitions(token, true);
    setAttributeDefinitions(response?.data?.definitions || []);
  };

  const mergeAttributeMappings = (mappingSets) => {
    const merged = new Map();
    mappingSets.forEach((mappings) => {
      mappings.forEach((mapping) => {
        if (!mapping?.attributeKey) return;
        merged.set(mapping.attributeKey, mapping);
      });
    });
    return Array.from(merged.values()).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  };

  const loadAttributeMappings = async (mainCategoryId, categoryId, subCategoryId) => {
    if (!mainCategoryId && !categoryId && !subCategoryId) {
      setAttributeMappings([]);
      setDynamicValues({});
      return;
    }
    const [mainMappings, categoryMappings, subMappings] = await Promise.all([
      mainCategoryId
        ? listAttributeMappings(token, { mainCategoryId, active: true })
        : Promise.resolve({ data: { mappings: [] } }),
      categoryId
        ? listAttributeMappings(token, { categoryId, active: true })
        : Promise.resolve({ data: { mappings: [] } }),
      subCategoryId
        ? listAttributeMappings(token, { subCategoryId, active: true })
        : Promise.resolve({ data: { mappings: [] } }),
    ]);
    const merged = mergeAttributeMappings([
      mainMappings?.data?.mappings || [],
      categoryMappings?.data?.mappings || [],
      subMappings?.data?.mappings || [],
    ]);
    setAttributeMappings(merged);
    setDynamicValues((prev) => {
      const next = {};
      merged.forEach((mapping) => {
        const type = mapping.dataType || 'STRING';
        if (Object.prototype.hasOwnProperty.call(prev, mapping.attributeKey)) {
          next[mapping.attributeKey] = prev[mapping.attributeKey];
          return;
        }
        if (mapping.defaultValue !== null && mapping.defaultValue !== undefined) {
          if (type === 'LIST') {
            if (Array.isArray(mapping.defaultValue)) {
              next[mapping.attributeKey] = mapping.defaultValue.join(', ');
            } else if (typeof mapping.defaultValue === 'string') {
              next[mapping.attributeKey] = mapping.defaultValue;
            } else {
              next[mapping.attributeKey] = String(mapping.defaultValue);
            }
          } else if (type === 'OBJECT') {
            next[mapping.attributeKey] =
              typeof mapping.defaultValue === 'string'
                ? mapping.defaultValue
                : JSON.stringify(mapping.defaultValue);
          } else if (type === 'BOOLEAN') {
            next[mapping.attributeKey] = Boolean(mapping.defaultValue);
          } else {
            next[mapping.attributeKey] = mapping.defaultValue;
          }
          return;
        }
        next[mapping.attributeKey] = '';
      });
      return next;
    });
  };

  const loadViewAttributeMappings = async (mainCategoryId, categoryId, subCategoryId) => {
    if (!mainCategoryId && !categoryId && !subCategoryId) {
      setViewAttributeMappings([]);
      return;
    }
    const [mainMappings, categoryMappings, subMappings] = await Promise.all([
      mainCategoryId
        ? listAttributeMappings(token, { mainCategoryId, active: true })
        : Promise.resolve({ data: { mappings: [] } }),
      categoryId
        ? listAttributeMappings(token, { categoryId, active: true })
        : Promise.resolve({ data: { mappings: [] } }),
      subCategoryId
        ? listAttributeMappings(token, { subCategoryId, active: true })
        : Promise.resolve({ data: { mappings: [] } }),
    ]);
    const merged = mergeAttributeMappings([
      mainMappings?.data?.mappings || [],
      categoryMappings?.data?.mappings || [],
      subMappings?.data?.mappings || [],
    ]);
    setViewAttributeMappings(merged);
  };

  const normalizeListValue = (value) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'string') return value;
    return String(value);
  };

  const normalizeObjectValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch (error) {
      return '';
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (error) {
        return '[Object]';
      }
    }
    return String(value);
  };

  const parseDateValue = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDateOnlyFromDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateOnly = (value) => {
    const date = parseDateValue(value);
    return date ? formatDateOnlyFromDate(date) : formatValue(value);
  };

  const formatDateTime = (value) => {
    const date = parseDateValue(value);
    if (!date) return formatValue(value);
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${formatDateOnlyFromDate(date)} ${hh}:${min}`;
  };

  const formatTimeOnly = (value) => {
    const date = parseDateValue(value);
    if (!date) return '-';
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  };

  const formatStatus = (status) => {
    if (!status) return 'Pending';
    return status
      .toLowerCase()
      .split('_')
      .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ''))
      .join(' ');
  };

  const formatCategoryParts = (category) => {
    if (!category) return { primary: '-', secondary: '' };
    const subCategoryLabel = getScopedSubCategoryLabel(category.categoryName, category.subCategoryName, true);
    const primary =
      category.mainCategoryName || category.categoryName || subCategoryLabel || '-';
    const secondary = [category.categoryName, subCategoryLabel]
      .filter((part) => part && part !== primary)
      .join(' / ');
    return { primary, secondary };
  };

  const formatPrice = (value, currency = 'INR') => {
    if (value === null || value === undefined || value === '') return '-';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return formatValue(value);
    const normalizedCurrency = String(currency || 'INR').trim().toUpperCase();
    if (!normalizedCurrency || normalizedCurrency === 'INR' || normalizedCurrency === 'RS') {
      return `Rs ${amount.toLocaleString('en-IN', {
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      })}`;
    }
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: normalizedCurrency,
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      return amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    }
  };

  const isBusinessAccount = (user) =>
    String(user?.userType || user?.type || user?.role || '').trim().toUpperCase() === 'BUSINESS';

  const getBusinessName = (user) =>
    user?.businessName ||
    user?.companyName ||
    user?.name ||
    user?.full_name ||
    user?.fullName ||
    user?.mobile ||
    `Business #${user?.id || ''}`;

  const formatUomLabel = (uom) => {
    if (!uom) return '';
    return uom.uomCode ? `${uom.uomName} (${uom.uomCode})` : uom.uomName;
  };

  // eslint-disable-next-line no-unused-vars
  const formatUomEntry = (entry, includePrice) => {
    if (!entry) return '';
    const name = entry.uomCode ? `${entry.uomName} (${entry.uomCode})` : entry.uomName;
    const factorValue =
      entry.effectiveConversionFactor !== null && entry.effectiveConversionFactor !== undefined
        ? entry.effectiveConversionFactor
        : entry.conversionFactor;
    const factorText = factorValue ? ` • ${factorValue} to base` : '';
    const priceText =
      includePrice && entry.pricePerUom !== null && entry.pricePerUom !== undefined
        ? ` • Price: ${entry.pricePerUom}`
        : '';
    return `${name || 'UOM'}${factorText}${priceText}`;
  };

  const hasReviewValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };

  const buildReviewCategoryPayload = (source) => {
    const payload = {};
    if (source.mainCategoryId) payload.mainCategoryId = Number(source.mainCategoryId);
    if (source.categoryId) payload.categoryId = Number(source.categoryId);
    if (source.subCategoryId) payload.subCategoryId = Number(source.subCategoryId);
    if (source.categoryId && !source.subCategoryId) payload.applyToAllSubCategories = true;
    return payload;
  };

  const buildChangeRequestRemarks = ({ issues, note, missingFields }) => {
    const selectedIssues = CHANGE_REQUEST_OPTIONS.filter((item) => issues.includes(item.key));
    const lines = ['Please update this product and resubmit it for review.'];

    if (selectedIssues.length > 0) {
      lines.push('', 'Requested updates:');
      selectedIssues.forEach((item) => {
        lines.push(`- ${item.label}`);
      });
    }

    if (missingFields.length > 0) {
      lines.push('', 'Missing required dynamic fields:');
      missingFields.forEach((field) => {
        lines.push(`- ${field}`);
      });
    }

    if (String(note || '').trim()) {
      lines.push('', 'Admin note:');
      lines.push(String(note).trim());
    }

    return lines.join('\n');
  };

  const resetUomForm = () => {
    setUomForm({ uomCode: '', uomName: '', description: '', isActive: true });
    setEditingUomId(null);
  };

  const syncUomSelections = (nextUoms) => {
    const ids = new Set((nextUoms || []).map((item) => String(item?.id)));
    setForm((prev) => ({
      ...prev,
      baseUomId: prev.baseUomId && ids.has(String(prev.baseUomId)) ? prev.baseUomId : '',
      purchaseUoms: (prev.purchaseUoms || []).filter((entry) => entry?.uomId && ids.has(String(entry.uomId))),
      salesUoms: (prev.salesUoms || []).filter((entry) => entry?.uomId && ids.has(String(entry.uomId))),
    }));
  };

  const handleUomChange = (key, value) => {
    setUomForm((prev) => {
      if (key === 'isActive') {
        return { ...prev, isActive: value === true || value === 'true' };
      }
      return { ...prev, [key]: value };
    });
  };

  const parseList = (value) => {
    if (!value) return [];
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const buildUomPayload = (entries, label) => {
    if (!Array.isArray(entries) || entries.length === 0) return [];
    const payload = [];
    const seen = new Set();
    for (const entry of entries) {
      if (!entry?.uomId) continue;
      const uomId = Number(entry.uomId);
      if (Number.isNaN(uomId)) {
        setMessage({ type: 'error', text: `Select a valid ${label} UOM.` });
        return null;
      }
      if (seen.has(uomId)) {
        setMessage({ type: 'error', text: `Duplicate ${label} UOMs are not allowed.` });
        return null;
      }
      seen.add(uomId);
      const payloadEntry = { uomId };
      if (entry.conversionFactor !== '' && entry.conversionFactor !== null && entry.conversionFactor !== undefined) {
        const factor = Number(entry.conversionFactor);
        if (Number.isNaN(factor) || factor <= 0) {
          setMessage({ type: 'error', text: `Conversion factor must be positive for ${label} UOMs.` });
          return null;
        }
        payloadEntry.conversionFactor = factor;
      }
      payload.push(payloadEntry);
    }
    if (payload.length > 3) {
      setMessage({ type: 'error', text: `Only 3 ${label} UOMs are allowed.` });
      return null;
    }
    return payload;
  };

  const buildDynamicAttributes = () => {
    if (attributeMappings.length === 0) return null;
    const payload = {};
    const errors = [];
    attributeMappings.forEach((mapping) => {
      const key = mapping.attributeKey;
      const type = mapping.dataType || 'STRING';
      const rawValue = dynamicValues[key];
      const isEmpty =
        rawValue === null ||
        rawValue === undefined ||
        rawValue === '' ||
        (type === 'LIST' && Array.isArray(rawValue) && rawValue.length === 0);

      if (isEmpty) {
        if (mapping.required) {
          errors.push(`${mapping.label || key} is required`);
        }
        return;
      }

      if (type === 'NUMBER') {
        const numberValue = Number(rawValue);
        if (Number.isNaN(numberValue)) {
          errors.push(`${mapping.label || key} must be a number`);
          return;
        }
        payload[key] = numberValue;
        return;
      }

      if (type === 'BOOLEAN') {
        payload[key] = rawValue === true || rawValue === 'true';
        return;
      }

      if (type === 'LIST') {
        if (typeof rawValue === 'string') {
          const trimmed = rawValue.trim();
          if (!trimmed) return;
          if (trimmed.startsWith('[')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (!Array.isArray(parsed)) {
                errors.push(`${mapping.label || key} must be a JSON array`);
                return;
              }
              payload[key] = parsed;
            } catch (error) {
              errors.push(`${mapping.label || key} must be a JSON array or comma-separated values`);
            }
            return;
          }
          const items = trimmed
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
          if (!items.length) return;
          payload[key] = items;
          return;
        }
        if (Array.isArray(rawValue)) {
          payload[key] = rawValue;
          return;
        }
        errors.push(`${mapping.label || key} must be a list`);
        return;
      }

      if (type === 'OBJECT') {
        if (typeof rawValue === 'string') {
          try {
            const parsed = JSON.parse(rawValue);
            if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
              errors.push(`${mapping.label || key} must be a JSON object`);
              return;
            }
            payload[key] = parsed;
          } catch (error) {
            errors.push(`${mapping.label || key} must be valid JSON`);
          }
          return;
        }
        if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
          payload[key] = rawValue;
          return;
        }
        errors.push(`${mapping.label || key} must be a JSON object`);
        return;
      }

      payload[key] = rawValue;
    });

    if (errors.length) {
      setMessage({ type: 'error', text: errors[0] });
      return null;
    }

    return payload;
  };

  const renderDynamicFieldInput = (mapping) => {
    const type = mapping.dataType || 'STRING';
    const options = getAttributeOptions(mapping);
    const definition = definitionById.get(mapping.attributeId);
    const value = dynamicValues[mapping.attributeKey] ?? '';
    const label = `${mapping.label || mapping.attributeKey}${mapping.required ? ' *' : ''}`;
    const description = definition?.description;
    const unitText = type === 'NUMBER' && definition?.unit ? `Unit: ${definition.unit}` : '';

    if (type === 'BOOLEAN') {
      const boolValue = value === true ? 'true' : value === false ? 'false' : '';
      return (
        <label className="field" key={mapping.id || mapping.attributeKey}>
          <span>{label}</span>
          <select
            value={boolValue}
            onChange={(event) => handleDynamicChange(mapping.attributeKey, event.target.value)}
            required={mapping.required}
          >
            <option value="">Select</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          {description ? <span className="field-help">{description}</span> : null}
        </label>
      );
    }

    if (type === 'ENUM' && Array.isArray(options)) {
      return (
        <label className="field" key={mapping.id || mapping.attributeKey}>
          <span>{label}</span>
          <select
            value={value}
            onChange={(event) => handleDynamicChange(mapping.attributeKey, event.target.value)}
            required={mapping.required}
          >
            <option value="">Select</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {description ? <span className="field-help">{description}</span> : null}
        </label>
      );
    }

    if (type === 'LIST') {
      return (
        <label className="field field-span" key={mapping.id || mapping.attributeKey}>
          <span>{label}</span>
          <input
            type="text"
            value={normalizeListValue(value)}
            onChange={(event) => handleDynamicChange(mapping.attributeKey, event.target.value)}
            placeholder="e.g. red, blue"
            required={mapping.required}
          />
          <span className="field-help">Enter comma-separated values.</span>
          {description ? <span className="field-help">{description}</span> : null}
        </label>
      );
    }

    if (type === 'OBJECT') {
      return (
        <label className="field field-span" key={mapping.id || mapping.attributeKey}>
          <span>{label}</span>
          <textarea
            rows={3}
            value={normalizeObjectValue(value)}
            onChange={(event) => handleDynamicChange(mapping.attributeKey, event.target.value)}
            placeholder='{"key":"value"}'
            required={mapping.required}
          />
          <span className="field-help">Advanced JSON field.</span>
          {description ? <span className="field-help">{description}</span> : null}
        </label>
      );
    }

    return (
      <label className="field" key={mapping.id || mapping.attributeKey}>
        <span>{label}</span>
        <input
          type={type === 'NUMBER' ? 'number' : type === 'DATE' ? 'date' : 'text'}
          value={value}
          onChange={(event) => handleDynamicChange(mapping.attributeKey, event.target.value)}
          placeholder={mapping.attributeKey}
          required={mapping.required}
        />
        {description ? <span className="field-help">{description}</span> : null}
        {unitText ? <span className="field-help">{unitText}</span> : null}
      </label>
    );
  };

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    Promise.all([loadProducts(), loadMainCategories(), loadAttributeDefinitions(), loadUoms()])
      .catch((error) => {
        setMessage({ type: 'error', text: error.message || 'Failed to load products.' });
      })
      .finally(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedProductId) {
      setSelectedProduct(null);
      return;
    }
    setSelectedProduct(null);
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    loadProductDetail(selectedProductId)
      .catch((error) => {
        setMessage({ type: 'error', text: error.message || 'Failed to load product details.' });
      })
      .finally(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId, token]);

  useEffect(() => {
    if (!showViewOnly) return;
    setActiveProductViewTab('general');
    setShowViewActionMenu(false);
  }, [showViewOnly, selectedProductId]);

  useEffect(() => {
    if (!showViewActionMenu) return undefined;

    const handlePointerDown = (event) => {
      if (viewActionMenuRef.current && !viewActionMenuRef.current.contains(event.target)) {
        setShowViewActionMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [showViewActionMenu]);

  useEffect(() => {
    if (openProductActionId == null) return undefined;
    const handlePointerDown = (event) => {
      if (productActionMenuRef.current && !productActionMenuRef.current.contains(event.target)) {
        setOpenProductActionId(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openProductActionId]);

  useEffect(() => {
    if (!selectedProduct) {
      setReviewForm(createReviewForm());
      setReviewCategories([]);
      setReviewSubCategories([]);
      return;
    }
    const category = selectedProduct.category;
    const nextReviewForm = {
      mainCategoryId: category?.mainCategoryId ? String(category.mainCategoryId) : '',
      categoryId: category?.categoryId ? String(category.categoryId) : '',
      subCategoryId: category?.subCategoryId ? String(category.subCategoryId) : '',
    };
    setReviewForm(nextReviewForm);
    hydrateCategoryOptionsForReview(nextReviewForm.mainCategoryId, nextReviewForm.categoryId).catch(() => {
      setReviewCategories([]);
      setReviewSubCategories([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id, token]);

  useEffect(() => {
    const mainId = reviewForm.mainCategoryId ? Number(reviewForm.mainCategoryId) : null;
    const categoryId = reviewForm.categoryId ? Number(reviewForm.categoryId) : null;
    const subCategoryId = reviewForm.subCategoryId ? Number(reviewForm.subCategoryId) : null;
    if (!mainId && !categoryId && !subCategoryId) {
      setViewAttributeMappings([]);
      return;
    }
    loadViewAttributeMappings(mainId, categoryId, subCategoryId).catch(() => {
      setViewAttributeMappings([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewForm.mainCategoryId, reviewForm.categoryId, reviewForm.subCategoryId]);

  useEffect(() => {
    if (!isEditRoute) {
      if (editingProductId) {
        setEditingProductId(null);
        setShowForm(false);
      }
      return;
    }
    if (!selectedProduct) return;
    if (editingProductId === selectedProduct.id && showForm) return;
    populateEditForm(selectedProduct).catch((error) => {
      setMessage({ type: 'error', text: error.message || 'Failed to load product form.' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditRoute, selectedProduct]);

  useEffect(() => {
    if (!form.mainCategoryId) {
      setCategories([]);
      setSubCategories([]);
      return;
    }
    listCategories(token, form.mainCategoryId)
      .then((response) => setCategories(response?.data || []))
      .catch(() => setCategories([]));
  }, [form.mainCategoryId, token]);

  useEffect(() => {
    if (!form.categoryId) {
      setSubCategories([]);
      return;
    }
    listSubCategories(token, form.categoryId)
      .then((response) => setSubCategories(response?.data || []))
      .catch(() => setSubCategories([]));
  }, [form.categoryId, token]);

  useEffect(() => {
    if (!reviewForm.mainCategoryId) {
      setReviewCategories([]);
      setReviewSubCategories([]);
      return;
    }
    listCategories(token, reviewForm.mainCategoryId)
      .then((response) => setReviewCategories(response?.data || []))
      .catch(() => setReviewCategories([]));
  }, [reviewForm.mainCategoryId, token]);

  useEffect(() => {
    if (!reviewForm.categoryId) {
      setReviewSubCategories([]);
      return;
    }
    listSubCategories(token, reviewForm.categoryId)
      .then((response) => setReviewSubCategories(response?.data || []))
      .catch(() => setReviewSubCategories([]));
  }, [reviewForm.categoryId, token]);

  useEffect(() => {
    if (!showCreateSelector) return;
    if (!createSelectorForm.mainCategoryId) {
      setCreateSelectorCategories([]);
      setCreateSelectorSubCategories([]);
      return;
    }
    listCategories(token, createSelectorForm.mainCategoryId)
      .then((response) => setCreateSelectorCategories(response?.data || []))
      .catch(() => setCreateSelectorCategories([]));
  }, [createSelectorForm.mainCategoryId, showCreateSelector, token]);

  useEffect(() => {
    if (!showCreateSelector) return;
    if (!createSelectorForm.categoryId) {
      setCreateSelectorSubCategories([]);
      return;
    }
    listSubCategories(token, createSelectorForm.categoryId)
      .then((response) => setCreateSelectorSubCategories(response?.data || []))
      .catch(() => setCreateSelectorSubCategories([]));
  }, [createSelectorForm.categoryId, showCreateSelector, token]);

  useEffect(() => {
    const mainId = form.mainCategoryId ? Number(form.mainCategoryId) : null;
    const categoryId = form.categoryId ? Number(form.categoryId) : null;
    const subCategoryId = form.subCategoryId ? Number(form.subCategoryId) : null;
    loadAttributeMappings(mainId, categoryId, subCategoryId).catch((error) => {
      setMessage({ type: 'error', text: error.message || 'Failed to load attribute mappings.' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.mainCategoryId, form.categoryId, form.subCategoryId]);

  const handleChange = (key, value) => {
    if (
      key === 'baseUomId' &&
      value &&
      (message?.text === 'Select the Base UOM first, then add conversion rows.' ||
        message?.text === 'Base UOM is required when adding purchase or sales UOMs.')
    ) {
      setMessage({ type: 'info', text: '' });
    }
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'mainCategoryId') {
        next.categoryId = '';
        next.subCategoryId = '';
        next.useAllSubCategories = false;
      }
      if (key === 'categoryId') {
        next.subCategoryId = '';
        next.useAllSubCategories = Boolean(value);
      }
      if (key === 'subCategoryId') {
        next.useAllSubCategories = !value && Boolean(next.categoryId);
      }
      if (key === 'baseUomId') {
        next.uomConversions = (next.uomConversions || []).map((entry) =>
          String(entry?.uomId || '') === String(value || '')
            ? { ...entry, uomId: '', conversionFactor: '' }
            : entry
        );
        const synced = buildMirroredUomLists(
          next.uomConversions,
          value,
          next.defaultStockInUomId,
          next.defaultStockOutUomId
        );
        next.uomConversions = synced.uomConversions;
        next.purchaseUoms = synced.purchaseUoms;
        next.salesUoms = synced.salesUoms;
      }
      return next;
    });
  };

  const handleCreateSelectorChange = (key, value) => {
    setCreateSelectorForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'mainCategoryId') {
        next.categoryId = '';
        next.subCategoryId = '';
      }
      if (key === 'categoryId') {
        next.subCategoryId = '';
      }
      return next;
    });
  };

  const openCreateSelector = async (preserveCurrent = false) => {
    if (preserveCurrent) {
      setCreateSelectorForm({
        userId: form.userId || '',
        mainCategoryId: form.mainCategoryId || '',
        categoryId: form.categoryId || '',
        subCategoryId: form.useAllSubCategories ? '' : form.subCategoryId || '',
      });
      setCreateSelectorCategories(categories);
      setCreateSelectorSubCategories(subCategories);
    } else {
      setCreateSelectorForm(createProductSelectorForm());
      setCreateSelectorCategories([]);
      setCreateSelectorSubCategories([]);
    }
    setShowCreateSelector(true);
    await loadBusinessAccounts();
  };

  const handleApplyCreateSelector = () => {
    if (!createSelectorForm.userId || !createSelectorForm.mainCategoryId || !createSelectorForm.categoryId) {
      setMessage({ type: 'error', text: 'Select business, main category, and category first.' });
      return;
    }

    const useAllSubCategories = !createSelectorForm.subCategoryId;
    const resolvedSubCategoryId = createSelectorForm.subCategoryId || '';

    const categorySelectionChanged =
      !showForm ||
      String(form.mainCategoryId || '') !== String(createSelectorForm.mainCategoryId || '') ||
      String(form.categoryId || '') !== String(createSelectorForm.categoryId || '') ||
      String(form.subCategoryId || '') !== String(resolvedSubCategoryId || '') ||
      Boolean(form.useAllSubCategories) !== useAllSubCategories;

    setForm((prev) => ({
      ...(showForm ? prev : initialForm),
      userId: createSelectorForm.userId,
      mainCategoryId: createSelectorForm.mainCategoryId,
      categoryId: createSelectorForm.categoryId,
      subCategoryId: resolvedSubCategoryId,
      useAllSubCategories,
    }));
    setCategories(createSelectorCategories);
    setSubCategories(createSelectorSubCategories);
    setAttributeMappings([]);
    setDynamicValues((prev) => (categorySelectionChanged ? {} : prev));
    setProductFormTab('general');
    setShowCreateSelector(false);
    setShowForm(true);
    setMessage({ type: 'info', text: '' });
  };

  const handleReviewCategoryChange = (key, value) => {
    setReviewForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'mainCategoryId') {
        next.categoryId = '';
        next.subCategoryId = '';
      }
      if (key === 'categoryId') {
        next.subCategoryId = '';
      }
      return next;
    });
  };

  const handleUomEntryChange = (type, index, key, value) => {
    setForm((prev) => {
      const listKey = type === 'purchase' ? 'purchaseUoms' : 'salesUoms';
      const nextList = [...prev[listKey]];
      const nextEntry = { ...nextList[index], [key]: value };
      if (key === 'uomId' && value && prev.baseUomId && value === prev.baseUomId) {
        nextEntry.conversionFactor = '1';
      }
      if (key === 'uomId' && value && prev.baseUomId && value !== prev.baseUomId && nextEntry.conversionFactor === '1') {
        nextEntry.conversionFactor = '';
      }
      nextList[index] = nextEntry;
      const mergedRows =
        type === 'purchase'
          ? buildProductUomConversions({ purchaseUoms: nextList, salesUoms: prev.salesUoms })
          : buildProductUomConversions({ purchaseUoms: prev.purchaseUoms, salesUoms: nextList });
      const synced = buildMirroredUomLists(
        mergedRows,
        prev.baseUomId,
        prev.defaultStockInUomId,
        prev.defaultStockOutUomId
      );
      return { ...prev, ...synced };
    });
  };

  const handleAddUomEntry = (type) => {
    if (!form.baseUomId) {
      setMessage({ type: 'error', text: 'Select the Base UOM first, then add conversion rows.' });
      return;
    }
    setForm((prev) => {
      if ((prev.uomConversions || []).length >= 3) return prev;
      const nextRows = [...(prev.uomConversions || []), createUomConversionEntry()];
      const synced = buildMirroredUomLists(nextRows, prev.baseUomId, prev.defaultStockInUomId, prev.defaultStockOutUomId);
      return { ...prev, ...synced };
    });
  };

  const handleRemoveUomEntry = (type, index) => {
    setForm((prev) => {
      const nextRows = (prev.uomConversions || []).filter((_, itemIndex) => itemIndex !== index);
      const availableIds = new Set([
        String(prev.baseUomId || ''),
        ...nextRows.map((entry) => String(entry?.uomId || '')).filter(Boolean),
      ]);
      const nextDefaults = {
        defaultStockInUomId: availableIds.has(String(prev.defaultStockInUomId || ''))
          ? prev.defaultStockInUomId
          : '',
        defaultStockOutUomId: availableIds.has(String(prev.defaultStockOutUomId || ''))
          ? prev.defaultStockOutUomId
          : '',
      };
      const synced = buildMirroredUomLists(
        nextRows,
        prev.baseUomId,
        nextDefaults.defaultStockInUomId,
        nextDefaults.defaultStockOutUomId
      );
      return { ...prev, ...nextDefaults, ...synced };
    });
  };
  const handleUomConversionChange = (index, key, value) => {
    setForm((prev) => {
      const nextRows = [...(prev.uomConversions || [])];
      const currentRow = nextRows[index];
      if (!currentRow) return prev;
      const nextRow = { ...currentRow, [key]: value };
      if (key === 'uomId' && value && prev.baseUomId && value === prev.baseUomId) {
        nextRow.conversionFactor = '1';
      }
      if (key === 'uomId' && value && prev.baseUomId && value !== prev.baseUomId && nextRow.conversionFactor === '1') {
        nextRow.conversionFactor = '';
      }
      nextRows[index] = nextRow;
      const synced = buildMirroredUomLists(nextRows, prev.baseUomId, prev.defaultStockInUomId, prev.defaultStockOutUomId);
      return { ...prev, ...synced };
    });
  };
  const handleUomDefaultChange = (key, value) => {
    setForm((prev) => {
      const nextDefaults = {
        defaultStockInUomId: key === 'defaultStockInUomId' ? value : prev.defaultStockInUomId,
        defaultStockOutUomId: key === 'defaultStockOutUomId' ? value : prev.defaultStockOutUomId,
      };
      const synced = buildMirroredUomLists(prev.uomConversions, prev.baseUomId, nextDefaults.defaultStockInUomId, nextDefaults.defaultStockOutUomId);
      return {
        ...prev,
        ...synced,
        defaultStockInUomId: nextDefaults.defaultStockInUomId,
        defaultStockOutUomId: nextDefaults.defaultStockOutUomId,
      };
    });
  };

  const handleVariantChange = (index, key, value) => {
    setForm((prev) => {
      const nextVariants = [...prev.variants];
      const nextVariant = { ...nextVariants[index], [key]: value };
      nextVariants[index] = nextVariant;
      return { ...prev, variants: nextVariants };
    });
  };

  const handleAddVariant = () => {
    setForm((prev) => {
      if (prev.variants.length >= 20) return prev;
      return { ...prev, variants: [...prev.variants, createVariantEntry()] };
    });
  };

  const handleRemoveVariant = (index) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleVariantAttributeChange = (variantIndex, attributeIndex, key, value) => {
    setForm((prev) => {
      const nextVariants = [...prev.variants];
      const variant = { ...nextVariants[variantIndex] };
      const nextAttributes = [...(variant.attributes || [])];
      const nextAttribute = { ...nextAttributes[attributeIndex], [key]: value };
      nextAttributes[attributeIndex] = nextAttribute;
      variant.attributes = nextAttributes;
      nextVariants[variantIndex] = variant;
      return { ...prev, variants: nextVariants };
    });
  };

  const handleAddVariantAttribute = (variantIndex) => {
    setForm((prev) => {
      const nextVariants = [...prev.variants];
      const variant = { ...nextVariants[variantIndex] };
      const attributes = [...(variant.attributes || [])];
      attributes.push(createVariantAttributeEntry());
      variant.attributes = attributes;
      nextVariants[variantIndex] = variant;
      return { ...prev, variants: nextVariants };
    });
  };

  const handleRemoveVariantAttribute = (variantIndex, attributeIndex) => {
    setForm((prev) => {
      const nextVariants = [...prev.variants];
      const variant = { ...nextVariants[variantIndex] };
      const attributes = (variant.attributes || []).filter((_, idx) => idx !== attributeIndex);
      variant.attributes = attributes.length ? attributes : [createVariantAttributeEntry()];
      nextVariants[variantIndex] = variant;
      return { ...prev, variants: nextVariants };
    });
  };

  const handleDynamicChange = (key, value) => {
    setDynamicValues((prev) => ({ ...prev, [key]: value }));
  };

  const getAttributeOptions = (mapping) => {
    const definition = definitionById.get(mapping.attributeId);
    if (!definition?.options || !Array.isArray(definition.options.values)) return null;
    return definition.options.values;
  };

  const getAdminId = () => {
    if (!adminUserId) {
      setMessage({ type: 'error', text: 'Admin user ID missing. Please log in again.' });
      return null;
    }
    return Number(adminUserId);
  };

  const hydrateCategoryOptionsForEdit = async (mainCategoryId, categoryId) => {
    let nextCategories = [];
    let nextSubCategories = [];

    if (mainCategoryId) {
      const categoryResponse = await listCategories(token, mainCategoryId);
      nextCategories = categoryResponse?.data || [];
    }

    if (categoryId) {
      const subCategoryResponse = await listSubCategories(token, categoryId);
      nextSubCategories = subCategoryResponse?.data || [];
    }

    setCategories(nextCategories);
    setSubCategories(nextSubCategories);
  };

  const hydrateCategoryOptionsForReview = async (mainCategoryId, categoryId) => {
    let nextCategories = [];
    let nextSubCategories = [];

    if (mainCategoryId) {
      const categoryResponse = await listCategories(token, mainCategoryId);
      nextCategories = categoryResponse?.data || [];
    }

    if (categoryId) {
      const subCategoryResponse = await listSubCategories(token, categoryId);
      nextSubCategories = subCategoryResponse?.data || [];
    }

    setReviewCategories(nextCategories);
    setReviewSubCategories(nextSubCategories);
  };

  const populateEditForm = async (product) => {
    const nextMainCategoryId = product.category?.mainCategoryId ? String(product.category.mainCategoryId) : '';
    const nextCategoryId = product.category?.categoryId ? String(product.category.categoryId) : '';
    const nextSubCategoryId = product.category?.subCategoryId ? String(product.category.subCategoryId) : '';

    try {
      await hydrateCategoryOptionsForEdit(nextMainCategoryId, nextCategoryId);
    } catch {
      setCategories([]);
      setSubCategories([]);
    }

    setEditingProductId(product.id);
    const productUiConfig = parseUiConfigValue(product.uiConfig);
    const uomDefaults = productUiConfig?.uomDefaults || {};
    const uomConversions = buildProductUomConversions(product);
    const defaultStockInUomId = String(
      uomDefaults.stockInUomId ||
        (Array.isArray(product.purchaseUoms) && product.purchaseUoms[0]?.uomId ? product.purchaseUoms[0].uomId : product.baseUomId || '')
    );
    const defaultStockOutUomId = String(
      uomDefaults.stockOutUomId ||
        (Array.isArray(product.salesUoms) && product.salesUoms[0]?.uomId ? product.salesUoms[0].uomId : product.baseUomId || '')
    );
    const mirroredUoms = buildMirroredUomLists(
      uomConversions,
      product.baseUomId ? String(product.baseUomId) : '',
      defaultStockInUomId,
      defaultStockOutUomId
    );
    setForm({
      productName: product.productName || '',
      brandName: product.brandName || '',
      shortDescription: product.shortDescription || '',
      thumbnailImage: getPrimaryProductImage(product) || '',
      galleryImagesText: getProductGalleryUrls(product).join(', '),
      mainCategoryId: nextMainCategoryId,
      categoryId: nextCategoryId,
      subCategoryId: nextSubCategoryId,
      sellingPrice:
        product.sellingPrice !== null && product.sellingPrice !== undefined
          ? String(product.sellingPrice)
          : '',
      mrp: product.mrp !== null && product.mrp !== undefined ? String(product.mrp) : '',
      gstRate:
        product.gstRate !== null && product.gstRate !== undefined ? String(product.gstRate) : '',
      userId: '',
      useAllSubCategories: !nextSubCategoryId && Boolean(nextCategoryId),
      baseUomId: product.baseUomId ? String(product.baseUomId) : '',
      uomConversions: mirroredUoms.uomConversions,
      defaultStockInUomId,
      defaultStockOutUomId,
      purchaseUoms: mirroredUoms.purchaseUoms,
      salesUoms: mirroredUoms.salesUoms,
      uiConfig: Object.keys(productUiConfig || {}).length > 0 ? JSON.stringify(productUiConfig) : '',
      variants: Array.isArray(product.variants)
        ? product.variants.map((variant) => ({
            variantName: variant.variantName || '',
            sku: variant.sku || '',
            barcode: variant.barcode || '',
            sellingPrice:
              variant.sellingPrice !== null && variant.sellingPrice !== undefined
                ? String(variant.sellingPrice)
                : '',
            mrp: variant.mrp !== null && variant.mrp !== undefined ? String(variant.mrp) : '',
            stockQuantity:
              variant.stockQuantity !== null && variant.stockQuantity !== undefined
                ? String(variant.stockQuantity)
                : '',
            lowStockAlert:
              variant.lowStockAlert !== null && variant.lowStockAlert !== undefined
                ? String(variant.lowStockAlert)
                : '',
            thumbnailImage: variant.thumbnailImage || '',
            galleryImagesText: Array.isArray(variant.images)
              ? variant.images.map((img) => img?.url).filter(Boolean).join(', ')
              : '',
            attributes: Array.isArray(variant.attributes) && variant.attributes.length > 0
              ? variant.attributes.map((attr) => ({
                  key: attr?.key || '',
                  value: attr?.value || '',
                }))
              : [createVariantAttributeEntry()],
          }))
        : [],
    });
    setDynamicValues(product.dynamicAttributes || {});
    setProductFormTab('general');
    setShowForm(true);
  };

  const handleOpenCreateForm = () => {
    setEditingProductId(null);
    setForm(initialForm);
    setAttributeMappings([]);
    setDynamicValues({});
    setProductFormTab('general');
    setShowCreateUomModal(false);
    setShowForm(false);
    openCreateSelector(false).catch(() => {
      // loadBusinessAccounts already surfaces the error banner
    });
  };

  const handleOpenEditForm = () => {
    if (!selectedProduct) return;
    navigate(`/admin/products/${selectedProduct.id}/edit`);
    populateEditForm(selectedProduct).catch((error) => {
      setMessage({ type: 'error', text: error.message || 'Failed to load product form.' });
    });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setShowCreateSelector(false);
    setShowCreateUomModal(false);
    setEditingProductId(null);
    if (isEditRoute && selectedProductId) {
      navigate(`/admin/products/${selectedProductId}`);
    }
  };

  const handleViewProduct = (productId) => {
    navigate(`/admin/products/${productId}`);
    setShowForm(false);
    setEditingProductId(null);
  };

  const handleBackToList = () => {
    setSelectedProduct(null);
    setMessage({ type: 'info', text: '' });
    navigate('/admin/products');
  };

  const mergeMediaList = (currentValue, nextUrls, append = true) => {
    const merged = append ? [...parseList(currentValue), ...nextUrls] : nextUrls;
    return Array.from(new Set(merged.filter(Boolean))).join(', ');
  };

  const openMediaUpload = (target) => {
    setMediaTarget(target);
    if (mediaInputRef.current) {
      mediaInputRef.current.value = '';
      mediaInputRef.current.click();
    }
  };

  const clearMediaField = (target) => {
    setForm((prev) => {
      if (target.kind === 'product') {
        if (target.field === 'thumbnailImage') {
          return { ...prev, thumbnailImage: '' };
        }
        return { ...prev, galleryImagesText: '' };
      }

      const nextVariants = [...prev.variants];
      const currentVariant = { ...nextVariants[target.index] };
      if (target.field === 'thumbnailImage') {
        currentVariant.thumbnailImage = '';
      } else {
        currentVariant.galleryImagesText = '';
      }
      nextVariants[target.index] = currentVariant;
      return { ...prev, variants: nextVariants };
    });
  };

  const handleMediaFiles = async (event) => {
    const files = event?.target?.files;
    if (!files || files.length === 0 || !mediaTarget) return;
    setIsUploadingMedia(true);
    setMessage({ type: 'info', text: '' });

    try {
      const response = await uploadBannerImages(token, Array.from(files));
      const urls = response?.data?.urls || [];
      if (!urls.length) {
        throw new Error('Upload failed. No image URLs returned.');
      }

      setForm((prev) => {
        if (mediaTarget.kind === 'product') {
          if (mediaTarget.field === 'thumbnailImage') {
            return { ...prev, thumbnailImage: urls[0] };
          }
          return {
            ...prev,
            galleryImagesText: mergeMediaList(prev.galleryImagesText, urls, true),
            thumbnailImage: prev.thumbnailImage || urls[0],
          };
        }

        const nextVariants = [...prev.variants];
        const currentVariant = { ...nextVariants[mediaTarget.index] };
        if (mediaTarget.field === 'thumbnailImage') {
          currentVariant.thumbnailImage = urls[0];
        } else {
          currentVariant.galleryImagesText = mergeMediaList(currentVariant.galleryImagesText, urls, true);
          currentVariant.thumbnailImage = currentVariant.thumbnailImage || urls[0];
        }
        nextVariants[mediaTarget.index] = currentVariant;
        return { ...prev, variants: nextVariants };
      });

      setMessage({ type: 'success', text: 'Image updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload image.' });
    } finally {
      setIsUploadingMedia(false);
      setMediaTarget(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (
      !form.productName.trim() ||
      !form.mainCategoryId ||
      !form.categoryId ||
      !form.sellingPrice ||
      !form.mrp ||
      !form.gstRate
    ) {
      setMessage({ type: 'error', text: 'Fill all required product fields.' });
      return;
    }

    if (isEditing && !editingProductId) {
      setMessage({ type: 'error', text: 'Select a product to edit.' });
      return;
    }

    const adminId = isEditing ? getAdminId() : null;
    if (isEditing && !adminId) return;

    try {
      setIsLoading(true);
      const dynamicAttributes = buildDynamicAttributes();
      if (attributeMappings.length > 0 && dynamicAttributes === null) {
        setIsLoading(false);
        return;
      }
      const payload = {
        productName: form.productName.trim(),
        brandName: form.brandName || null,
        shortDescription: form.shortDescription || null,
        thumbnailImage: form.thumbnailImage?.trim() || '',
        galleryImages: parseList(form.galleryImagesText),
        mainCategoryId: Number(form.mainCategoryId),
        categoryId: Number(form.categoryId),
        sellingPrice: Number(form.sellingPrice),
        mrp: Number(form.mrp),
        gstRate: Number(form.gstRate),
      };
      if (form.subCategoryId) {
        payload.subCategoryId = Number(form.subCategoryId);
      } else if (form.categoryId) {
        payload.applyToAllSubCategories = true;
      }
      const purchaseUoms = buildUomPayload(form.purchaseUoms, 'purchase');
      if (purchaseUoms === null) {
        setIsLoading(false);
        return;
      }
      const salesUoms = buildUomPayload(form.salesUoms, 'sales');
      if (salesUoms === null) {
        setIsLoading(false);
        return;
      }
      const hasUomPayload = Boolean(form.baseUomId || purchaseUoms.length || salesUoms.length);
      if (hasUomPayload && !form.baseUomId) {
        setMessage({ type: 'error', text: 'Base UOM is required when adding purchase or sales UOMs.' });
        setIsLoading(false);
        return;
      }
      if (form.uomConversions.length > 0 && !form.defaultStockInUomId) {
        setMessage({ type: 'error', text: 'Select Default UOM For Stock In.' });
        setIsLoading(false);
        return;
      }
      if (form.uomConversions.length > 0 && !form.defaultStockOutUomId) {
        setMessage({ type: 'error', text: 'Select Default UOM For Stock Out.' });
        setIsLoading(false);
        return;
      }
      if (hasUomPayload) {
        payload.baseUomId = Number(form.baseUomId);
        payload.purchaseUoms = purchaseUoms;
        payload.salesUoms = salesUoms;
      }
      const nextUiConfig = buildProductUiConfigValue(form.uiConfig, {
        stockInUomId: form.defaultStockInUomId || form.baseUomId || '',
        stockOutUomId: form.defaultStockOutUomId || form.baseUomId || '',
      });
      if (nextUiConfig) {
        payload.uiConfig = nextUiConfig;
      }
      if (dynamicAttributes && Object.keys(dynamicAttributes).length > 0) {
        payload.dynamicAttributes = dynamicAttributes;
      }

      if (Array.isArray(form.variants) && form.variants.length > 0) {
        const variantPayload = form.variants
          .map((variant) => {
            if (!variant) return null;
            const hasContent =
              (variant.variantName && variant.variantName.trim()) ||
              (variant.sku && variant.sku.trim()) ||
              (variant.barcode && variant.barcode.trim()) ||
              (variant.thumbnailImage && variant.thumbnailImage.trim()) ||
              (variant.galleryImagesText && variant.galleryImagesText.trim()) ||
              (Array.isArray(variant.attributes) &&
                variant.attributes.some((attr) => attr?.key || attr?.value));

            if (!hasContent) return null;

            const payloadVariant = {
              variantName: variant.variantName?.trim() || null,
              sku: variant.sku?.trim() || null,
              barcode: variant.barcode?.trim() || null,
              thumbnailImage: variant.thumbnailImage?.trim() || '',
              galleryImages: parseList(variant.galleryImagesText),
            };

            if (variant.sellingPrice !== '' && variant.sellingPrice !== null && variant.sellingPrice !== undefined) {
              payloadVariant.sellingPrice = Number(variant.sellingPrice);
            }
            if (variant.mrp !== '' && variant.mrp !== null && variant.mrp !== undefined) {
              payloadVariant.mrp = Number(variant.mrp);
            }
            if (
              variant.stockQuantity !== '' &&
              variant.stockQuantity !== null &&
              variant.stockQuantity !== undefined
            ) {
              payloadVariant.stockQuantity = Number(variant.stockQuantity);
            }
            if (
              variant.lowStockAlert !== '' &&
              variant.lowStockAlert !== null &&
              variant.lowStockAlert !== undefined
            ) {
              payloadVariant.lowStockAlert = Number(variant.lowStockAlert);
            }

            if (Array.isArray(variant.attributes)) {
              const attributes = variant.attributes
                .filter((attr) => attr?.key && attr.key.trim())
                .map((attr) => ({
                  key: attr.key.trim(),
                  value: attr.value ?? '',
                }));
              if (attributes.length) {
                payloadVariant.attributes = attributes;
              }
            }

            return payloadVariant;
          })
          .filter(Boolean);

        if (variantPayload.length) {
          payload.variants = variantPayload;
        }
      }

      if (isEditing) {
        await updateProduct(token, editingProductId, { ...payload, userId: adminId });
        await loadProducts();
        if (selectedProductId) {
          loadProductDetail(selectedProductId).catch(() => null);
        }
        setShowForm(false);
        setEditingProductId(null);
        if (isEditRoute && selectedProductId) {
          navigate(`/admin/products/${selectedProductId}`);
        }
        setMessage({ type: 'success', text: 'Product updated successfully.' });
      } else {
        await createProduct(token, {
          ...payload,
          userId: form.userId ? Number(form.userId) : null,
        });
        setForm(initialForm);
        setAttributeMappings([]);
        setDynamicValues({});
        setShowForm(false);
        await loadProducts();
        setMessage({ type: 'success', text: 'Product created successfully.' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || (isEditing ? 'Failed to update product.' : 'Failed to create product.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUomSave = async () => {
    const uomCode = uomForm.uomCode.trim();
    const uomName = uomForm.uomName.trim();
    if (!uomCode || !uomName) {
      setMessage({ type: 'error', text: 'UOM code and name are required.' });
      return;
    }
    const payload = {
      uomCode: uomCode.toUpperCase(),
      uomName,
      description: uomForm.description ? uomForm.description.trim() : null,
      isActive: Boolean(uomForm.isActive),
    };
    try {
      setIsUomSaving(true);
      if (editingUomId) {
        await updateUom(token, editingUomId, payload);
        setMessage({ type: 'success', text: 'UOM updated successfully.' });
      } else {
        await createUom(token, payload);
        setMessage({ type: 'success', text: 'UOM created successfully.' });
      }
      await loadUoms();
      resetUomForm();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save UOM.' });
    } finally {
      setIsUomSaving(false);
    }
  };

  const handleUomRefresh = async () => {
    try {
      setIsUomSaving(true);
      await loadUoms();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load UOMs.' });
    } finally {
      setIsUomSaving(false);
    }
  };

  const handleUomEdit = (uom) => {
    if (!uom) return;
    setEditingUomId(uom.id);
    setUomForm({
      uomCode: uom.uomCode || '',
      uomName: uom.uomName || '',
      description: uom.description || '',
      isActive: uom.isActive !== false,
    });
  };

  const handleUomDelete = async (uom) => {
    if (!uom?.id) return;
    const ok = window.confirm(`Delete UOM ${uom.uomName || uom.uomCode || ''}?`);
    if (!ok) return;
    try {
      setIsUomSaving(true);
      await deleteUom(token, uom.id);
      await loadUoms();
      if (editingUomId === uom.id) {
        resetUomForm();
      }
      setMessage({ type: 'success', text: 'UOM deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete UOM.' });
    } finally {
      setIsUomSaving(false);
    }
  };

  const toggleSelect = (productId) => {
    if (!productId) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectableIds = filteredProducts.map((product) => product?.id).filter(Boolean);
    if (selectableIds.length === 0) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = selectableIds.every((id) => next.has(id));
      if (allSelected) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('Delete this product? This will remove it from the list.');
    if (!ok) return;
    try {
      setShowViewActionMenu(false);
      setIsLoading(true);
      await deleteProduct(token, id);
      await loadProducts();
      setMessage({ type: 'success', text: 'Product deleted.' });
      if (selectedProductId && Number(id) === Number(selectedProductId)) {
        setSelectedProduct(null);
        navigate('/admin/products');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete product.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReviewCategory = async () => {
    if (!selectedProductId) return;
    const adminId = getAdminId();
    if (!adminId) return;
    if (!reviewCategoryComplete) {
      setMessage({ type: 'error', text: 'Select main category and category first.' });
      return;
    }
    try {
      setIsLoading(true);
      await updateProduct(token, selectedProductId, {
        userId: adminId,
        ...buildReviewCategoryPayload(reviewForm),
      });
      await loadProducts();
      await loadProductDetail(selectedProductId);
      setMessage({ type: 'success', text: 'Category assignment saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save category assignment.' });
    } finally {
      setIsLoading(false);
    }
  };

  const openChangeRequestModal = () => {
    if (!reviewCategoryComplete) {
      setMessage({ type: 'error', text: 'Assign main category and category before requesting changes.' });
      return;
    }
    const suggestedIssues = [];
    if (missingRequiredDynamicFields.length > 0) suggestedIssues.push('dynamic_fields');
    if (!selectedProductGallery.length) suggestedIssues.push('media');
    if (
      selectedProduct?.sellingPrice === null ||
      selectedProduct?.sellingPrice === undefined ||
      selectedProduct?.mrp === null ||
      selectedProduct?.mrp === undefined
    ) {
      suggestedIssues.push('pricing');
    }
    setChangeRequestForm({
      issues: Array.from(new Set(suggestedIssues)),
      note: '',
    });
    setShowChangeRequestModal(true);
  };

  const handleSubmitChangeRequest = async () => {
    if (!selectedProductId) return;
    const adminId = getAdminId();
    if (!adminId) return;
    const structuredRemarks = buildChangeRequestRemarks({
      issues: changeRequestForm.issues,
      note: changeRequestForm.note,
      missingFields: missingRequiredDynamicFields,
    });
    if (!structuredRemarks.trim()) {
      setMessage({ type: 'error', text: 'Add at least one requested update or admin note.' });
      return;
    }
    try {
      setIsLoading(true);
      await updateProduct(token, selectedProductId, {
        approvalStatus: 'CHANGES_REQUIRED',
        userId: adminId,
        review_remarks: structuredRemarks,
        ...buildReviewCategoryPayload(reviewForm),
      });
      await loadProducts();
      await loadProductDetail(selectedProductId);
      setShowChangeRequestModal(false);
      setMessage({ type: 'success', text: 'Changes requested successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to request changes.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (nextStatus) => {
    if (!selectedProductId) return;
    const adminId = getAdminId();
    if (!adminId) return;
    if (nextStatus === 'CHANGES_REQUIRED') {
      openChangeRequestModal();
      return;
    }
    if (nextStatus === 'APPROVED') {
      if (!reviewCategoryComplete) {
        setMessage({ type: 'error', text: 'Assign main category and category before approval.' });
        return;
      }
      if (missingRequiredDynamicFields.length > 0) {
        setMessage({
          type: 'error',
          text: `Cannot approve until ${missingRequiredDynamicFields.length} required dynamic field${
            missingRequiredDynamicFields.length > 1 ? 's are' : ' is'
          } completed.`,
        });
        return;
      }
    }
    try {
      setIsLoading(true);
      await updateProduct(token, selectedProductId, {
        approvalStatus: nextStatus,
        userId: adminId,
        ...buildReviewCategoryPayload(reviewForm),
      });
      await loadProducts();
      await loadProductDetail(selectedProductId);
      setMessage({
        type: 'success',
        text:
          nextStatus === 'APPROVED'
            ? 'Product approved successfully.'
            : 'Product rejected successfully.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update product status.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowStatusUpdate = async (productId, nextStatus) => {
    if (!productId) return;
    if (nextStatus === 'CHANGES_REQUIRED') {
      navigate(`/admin/products/${productId}`);
      setMessage({ type: 'info', text: 'Open the review workspace to request structured changes.' });
      return;
    }
    const adminId = getAdminId();
    if (!adminId) return;
    try {
      setIsLoading(true);
      await updateProduct(token, productId, {
        approvalStatus: nextStatus,
        userId: adminId,
      });
      await loadProducts();
      setMessage({
        type: 'success',
        text:
          nextStatus === 'APPROVED'
            ? 'Product approved successfully.'
            : nextStatus === 'REJECTED'
              ? 'Product rejected successfully.'
              : 'Changes requested successfully.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update product status.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVariantStatusUpdate = async (variantId, nextStatus) => {
    if (!selectedProductId || !variantId) return;
    const adminId = getAdminId();
    if (!adminId) return;
    try {
      setIsLoading(true);
      await updateProductVariantStatus(token, selectedProductId, variantId, {
        approvalStatus: nextStatus,
        adminUserId: adminId,
      });
      await loadProductDetail(selectedProductId);
      setMessage({
        type: 'success',
        text: `Variant ${nextStatus === 'APPROVED' ? 'approved' : 'rejected'} successfully.`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update variant status.' });
    } finally {
      setIsLoading(false);
    }
  };

  const statusValue = selectedProduct?.approvalStatus || '';
  const statusLabel = formatStatus(statusValue);
  const productPreviewUrl = resolveMediaUrl(form.thumbnailImage || getPrimaryProductImage(selectedProduct));
  const productGalleryPreview = parseList(form.galleryImagesText).map(resolveMediaUrl).filter(Boolean);
  const selectedBaseUom = uoms.find((item) => String(item?.id || '') === String(form.baseUomId || '')) || null;
  const selectedBaseUomLabel = selectedBaseUom ? formatUomLabel(selectedBaseUom) : 'Select base unit';
  const getConfiguredUomLabel = (uomId) => {
    const matched = uoms.find((item) => String(item?.id || '') === String(uomId || ''));
    return matched ? formatUomLabel(matched) : '';
  };
  const getConfiguredUomOptions = (entries) => {
    const seen = new Set();
    return (entries || []).reduce((list, entry) => {
      const value = String(entry?.uomId || '');
      if (!value || seen.has(value)) return list;
      const label = getConfiguredUomLabel(value);
      if (!label) return list;
      seen.add(value);
      list.push({ value, label });
      return list;
    }, []);
  };
  const combinedDefaultOptions = [];
  if (form.baseUomId && selectedBaseUomLabel) {
    combinedDefaultOptions.push({ value: String(form.baseUomId), label: selectedBaseUomLabel });
  }
  getConfiguredUomOptions(form.uomConversions).forEach((option) => {
    if (!combinedDefaultOptions.some((item) => item.value === option.value)) {
      combinedDefaultOptions.push(option);
    }
  });
  const mediaCount = productGalleryPreview.length + (productPreviewUrl ? 1 : 0);
  const dynamicViewGroups = useMemo(() => {
    const attributes = selectedProduct?.dynamicAttributes;
    if (!attributes) return [];
    const normalizedMap = new Map();
    Object.entries(attributes).forEach(([rawKey, value]) => {
      const normalized = normalizeDynamicKey(rawKey);
      if (!normalized || normalizedMap.has(normalized)) return;
      normalizedMap.set(normalized, { rawKey, value });
    });

    const groupOrder = [
      { id: 'sub', label: 'Subcategory Fields' },
      { id: 'cat', label: 'Category Fields' },
      { id: 'main', label: 'Main Category Fields' },
      { id: 'other', label: 'Other Fields' },
    ];
    const groups = new Map(groupOrder.map((group) => [group.id, { ...group, items: [] }]));
    const used = new Set();

    viewAttributeMappings.forEach((mapping) => {
      const mappingKey = mapping.attributeKey || mapping.key || mapping.label || '';
      const normalized = normalizeDynamicKey(mappingKey);
      if (!normalized) return;
      used.add(normalized);
      const definition =
        (mapping.attributeId !== null && mapping.attributeId !== undefined
          ? definitionById.get(mapping.attributeId)
          : null) || definitionByKey.get(normalized);
      const unit = definition?.unit;
      const label = mapping.label || definition?.label || humanizeKey(mappingKey || normalized);
      const rawValue = normalizedMap.get(normalized)?.value;
      const value = formatDynamicByType(mapping.dataType || definition?.dataType, rawValue, unit);
      if (value === '-') return;
      const groupId = mapping.subCategoryId
        ? 'sub'
        : mapping.categoryId
          ? 'cat'
          : mapping.mainCategoryId
            ? 'main'
            : 'other';
      const target = groups.get(groupId);
      if (target) {
        target.items.push({ label, value, unit });
      }
    });

    Object.entries(attributes)
      .filter(([rawKey, value]) => {
        const normalized = normalizeDynamicKey(rawKey);
        return normalized && !used.has(normalized) && value !== null && value !== undefined && value !== '';
      })
      .forEach(([rawKey, value]) => {
        const target = groups.get('other');
        if (!target) return;
        target.items.push({
          label: humanizeKey(rawKey),
          value: formatDynamicByType(null, value, null),
        });
      });

    return groupOrder
      .map((group) => groups.get(group.id))
      .filter((group) => group && group.items.length > 0);
  }, [selectedProduct?.dynamicAttributes, viewAttributeMappings, definitionById, definitionByKey]);
  const variants = Array.isArray(selectedProduct?.variants) ? selectedProduct.variants : [];
  const disableApprove = isLoading || !selectedProduct || statusValue === 'APPROVED';
  const disableReject = isLoading || !selectedProduct || statusValue === 'REJECTED';
  const disableRequestChanges =
    isLoading ||
    !selectedProduct ||
    statusValue === 'APPROVED' ||
    statusValue === 'REJECTED';
  const disableEdit = isLoading || !selectedProduct;
  const productViewTabs = [
    { key: 'general', label: 'General Details' },
    { key: 'classification', label: 'Classification' },
    { key: 'pricing', label: 'Pricing Details' },
    { key: 'company', label: 'Company Mapping' },
    { key: 'variants', label: `Variants (${variants.length})` },
    { key: 'review', label: 'Review Workspace' },
  ];
  const resolvedProductViewTab = productViewTabs.some((tab) => tab.key === activeProductViewTab)
    ? activeProductViewTab
    : productViewTabs[0]?.key || 'general';
  const selectedBusinessAccount = businessAccounts.find((item) => String(item?.id || '') === String(form.userId || '')) || null;
  const selectedMainCategory = mainCategories.find((item) => String(item?.id || '') === String(form.mainCategoryId || '')) || null;
  const selectedCategory = categories.find((item) => String(item?.id || '') === String(form.categoryId || '')) || null;
  const selectedSubCategory = subCategories.find((item) => String(item?.id || '') === String(form.subCategoryId || '')) || null;
  const selectedSubCategoryLabel =
    selectedSubCategory?.name ||
    getScopedSubCategoryLabel(selectedCategory?.name, '', Boolean(form.useAllSubCategories)) ||
    '-';
  const selectorBusinessAccount =
    businessAccounts.find((item) => String(item?.id || '') === String(createSelectorForm.userId || '')) || null;
  const selectorMainCategory =
    mainCategories.find((item) => String(item?.id || '') === String(createSelectorForm.mainCategoryId || '')) || null;
  const selectorCategory =
    createSelectorCategories.find((item) => String(item?.id || '') === String(createSelectorForm.categoryId || '')) || null;
  const selectorSubCategory =
    createSelectorSubCategories.find((item) => String(item?.id || '') === String(createSelectorForm.subCategoryId || '')) || null;
  const selectorSubCategoryLabel =
    selectorSubCategory?.name ||
    getScopedSubCategoryLabel(selectorCategory?.name, '', Boolean(createSelectorForm.categoryId)) ||
    '';
  const selectableIds = filteredProducts.map((product) => product?.id).filter(Boolean);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const selectedProductPrimaryImage = selectedProduct
    ? resolveMediaUrl(getPrimaryProductImage(selectedProduct))
    : '';
  const selectedProductGallery = selectedProduct
    ? getProductGalleryUrls(selectedProduct).map(resolveMediaUrl).filter(Boolean)
    : [];
  const reviewUsesAllSubCategories = Boolean(reviewForm.categoryId) && !reviewForm.subCategoryId;
  const reviewCategoryComplete = Boolean(reviewForm.mainCategoryId && reviewForm.categoryId);
  const reviewCategoryDirty = Boolean(
    selectedProduct &&
      (String(selectedProduct?.category?.mainCategoryId || '') !== String(reviewForm.mainCategoryId || '') ||
        String(selectedProduct?.category?.categoryId || '') !== String(reviewForm.categoryId || '') ||
        String(selectedProduct?.category?.subCategoryId || '') !== String(reviewForm.subCategoryId || ''))
  );
  const dynamicAttributeLookup = useMemo(() => {
    const lookup = new Map();
    const attributes = selectedProduct?.dynamicAttributes;
    if (!attributes) return lookup;
    Object.entries(attributes).forEach(([rawKey, value]) => {
      const normalized = normalizeDynamicKey(rawKey);
      if (!normalized || lookup.has(normalized)) return;
      lookup.set(normalized, value);
    });
    return lookup;
  }, [selectedProduct?.dynamicAttributes]);
  const missingRequiredDynamicFields = useMemo(() => {
    return viewAttributeMappings
      .filter((mapping) => Boolean(mapping?.required))
      .map((mapping) => {
        const key = normalizeDynamicKey(mapping.attributeKey || mapping.key || mapping.label || '');
        if (!key) return null;
        const definition =
          (mapping.attributeId !== null && mapping.attributeId !== undefined
            ? definitionById.get(mapping.attributeId)
            : null) || definitionByKey.get(key);
        const label = mapping.label || definition?.label || humanizeKey(mapping.attributeKey || key);
        return {
          key,
          label,
          present: hasReviewValue(dynamicAttributeLookup.get(key)),
        };
      })
      .filter((item) => item && !item.present)
      .map((item) => item.label);
  }, [viewAttributeMappings, definitionById, definitionByKey, dynamicAttributeLookup]);
  const reviewChecklist = [
    {
      label: 'Category assignment',
      status: reviewCategoryComplete ? 'ready' : 'warning',
      detail: reviewCategoryComplete
        ? reviewUsesAllSubCategories
          ? 'Main category and category selected, applies to all sub-categories'
          : 'Main category, category, and sub-category selected'
        : 'Select main category and category',
    },
    {
      label: 'Required dynamic fields',
      status: missingRequiredDynamicFields.length === 0 ? 'ready' : 'warning',
      detail:
        missingRequiredDynamicFields.length === 0
          ? 'No required fields missing'
          : `${missingRequiredDynamicFields.length} required field${missingRequiredDynamicFields.length > 1 ? 's' : ''} missing`,
    },
    {
      label: 'Media assets',
      status: selectedProductGallery.length > 0 ? 'ready' : 'warning',
      detail:
        selectedProductGallery.length > 0
          ? `${selectedProductGallery.length} image${selectedProductGallery.length > 1 ? 's' : ''} attached`
          : 'No product image uploaded',
    },
    {
      label: 'Pricing data',
      status:
        selectedProduct?.sellingPrice !== null &&
        selectedProduct?.sellingPrice !== undefined &&
        selectedProduct?.mrp !== null &&
        selectedProduct?.mrp !== undefined
          ? 'ready'
          : 'warning',
      detail:
        selectedProduct?.sellingPrice !== null &&
        selectedProduct?.sellingPrice !== undefined &&
        selectedProduct?.mrp !== null &&
        selectedProduct?.mrp !== undefined
          ? 'Selling price and MRP present'
          : 'Pricing information is incomplete',
    },
  ];
  const viewSubCategoryLabel = selectedProduct
    ? getScopedSubCategoryLabel(
        selectedProduct?.category?.categoryName,
        selectedProduct?.category?.subCategoryName,
        Boolean(selectedProduct?.category?.categoryId && !selectedProduct?.category?.subCategoryId)
      ) || '-'
    : '-';
  const viewMediaImages = Array.from(new Set([selectedProductPrimaryImage, ...selectedProductGallery].filter(Boolean)));
  const purchaseUomRows = Array.isArray(selectedProduct?.purchaseUoms)
    ? selectedProduct.purchaseUoms.map((entry) => ({
        type: 'Purchase',
        uom: formatUomLabel(entry),
        factor:
          entry?.effectiveConversionFactor !== null && entry?.effectiveConversionFactor !== undefined
            ? entry.effectiveConversionFactor
            : entry?.conversionFactor,
        price:
          entry?.pricePerUom !== null && entry?.pricePerUom !== undefined
            ? formatPrice(entry.pricePerUom, selectedProduct?.currency)
            : '-',
      }))
    : [];
  const salesUomRows = Array.isArray(selectedProduct?.salesUoms)
    ? selectedProduct.salesUoms.map((entry) => ({
        type: 'Sales',
        uom: formatUomLabel(entry),
        factor:
          entry?.effectiveConversionFactor !== null && entry?.effectiveConversionFactor !== undefined
            ? entry.effectiveConversionFactor
            : entry?.conversionFactor,
        price:
          entry?.pricePerUom !== null && entry?.pricePerUom !== undefined
            ? formatPrice(entry.pricePerUom, selectedProduct?.currency)
            : '-',
      }))
    : [];
  const baseUomLabel =
    selectedProduct?.baseUomName
      ? formatUomLabel({
          uomName: selectedProduct.baseUomName,
          uomCode: selectedProduct.baseUomCode,
        })
      : '-';
  const uomViewRows = [...purchaseUomRows, ...salesUomRows].map((entry) => ({
    type: entry.type,
    leftUom: entry.uom,
    leftQty: '1',
    rightUom: baseUomLabel,
    rightQty: formatValue(entry.factor),
  }));
  const uomDisplayRows =
    uomViewRows.length > 0
      ? uomViewRows
      : baseUomLabel !== '-'
        ? [
            {
              type: 'Base',
              leftUom: baseUomLabel,
              leftQty: '1',
              rightUom: baseUomLabel,
              rightQty: '1',
            },
          ]
        : [];
  const uomSummaryFields = [
    { label: 'Base UOM', value: baseUomLabel },
    {
      label: 'Purchase UOMs',
      value: purchaseUomRows.length > 0 ? purchaseUomRows.map((entry) => entry.uom).join(', ') : '-',
    },
    {
      label: 'Sales UOMs',
      value: salesUomRows.length > 0 ? salesUomRows.map((entry) => entry.uom).join(', ') : '-',
    },
  ];
  const generalViewFields = [
    { label: 'Product ID', value: formatValue(selectedProduct?.id) },
    { label: 'Product Type', value: formatValue(selectedProduct?.productType) },
    { label: 'Product Name', value: formatValue(selectedProduct?.productName) },
    { label: 'SKU', value: formatValue(selectedProduct?.sku) },
    { label: 'Main Category', value: formatValue(selectedProduct?.category?.mainCategoryName) },
    { label: 'Category', value: formatValue(selectedProduct?.category?.categoryName) },
    { label: 'Sub-category', value: viewSubCategoryLabel },
    {
      label: 'Base UOM',
      value: baseUomLabel,
    },
    { label: 'Brand', value: formatValue(selectedProduct?.brandName) },
    { label: 'Business', value: formatValue(selectedProduct?.businessName) },
    { label: 'HSN Code', value: formatValue(selectedProduct?.hsnCode) },
    { label: 'Country Of Origin', value: formatValue(selectedProduct?.countryOfOrigin) },
  ];
  const descriptionViewFields = [
    { label: 'Short Description', value: formatValue(selectedProduct?.shortDescription), spanFull: true },
    { label: 'Long Description', value: formatValue(selectedProduct?.longDescription), spanFull: true },
  ];
  const classificationViewFields = [
    { label: 'Model Variant', value: formatValue(selectedProduct?.modelVariant) },
    { label: 'Keywords', value: formatValue(selectedProduct?.keywords) },
    { label: 'Product Label', value: formatValue(selectedProduct?.productLabel) },
    { label: 'Certifications', value: formatValue(selectedProduct?.certifications) },
    { label: 'Warranty Period', value: formatValue(selectedProduct?.warrantyPeriod) },
    { label: 'Attributes', value: formatValue(selectedProduct?.attributes), spanFull: true },
    { label: 'Specifications', value: formatValue(selectedProduct?.specifications), spanFull: true },
  ];
  const pricingViewFields = [
    { label: 'Selling Price', value: formatPrice(selectedProduct?.sellingPrice, selectedProduct?.currency) },
    { label: 'MRP', value: formatPrice(selectedProduct?.mrp, selectedProduct?.currency) },
    { label: 'GST Rate', value: formatValue(selectedProduct?.gstRate) },
    { label: 'Currency', value: formatValue(selectedProduct?.currency) },
    { label: 'B2B Price', value: formatPrice(selectedProduct?.b2bPrice, selectedProduct?.currency) },
    { label: 'Cost Price', value: formatPrice(selectedProduct?.costPrice, selectedProduct?.currency) },
    { label: 'Purchase Price', value: formatPrice(selectedProduct?.purchasePrice, selectedProduct?.currency) },
    { label: 'Profit Margin', value: formatValue(selectedProduct?.profitMargin) },
    { label: 'Discount Percent', value: formatValue(selectedProduct?.discountPercent) },
    { label: 'Minimum Order Qty', value: formatValue(selectedProduct?.minimumOrderQuantity) },
    { label: 'Tax Inclusive', value: formatValue(selectedProduct?.taxInclusive) },
  ];
  const inventoryViewFields = [
    { label: 'Stock Quantity', value: formatValue(selectedProduct?.stockQuantity) },
    { label: 'Low Stock Alert', value: formatValue(selectedProduct?.lowStockAlert) },
    { label: 'Reorder Level', value: formatValue(selectedProduct?.reorderLevel) },
    { label: 'Reorder Quantity', value: formatValue(selectedProduct?.reorderQuantity) },
    { label: 'Warehouse', value: formatValue(selectedProduct?.warehouseLocation) },
    { label: 'Rack / Bin', value: formatValue(selectedProduct?.rackBinNumber) },
    { label: 'Shipping Available', value: formatValue(selectedProduct?.shippingAvailable) },
    { label: 'Shipping Type', value: formatValue(selectedProduct?.shippingType) },
    { label: 'Return Policy', value: formatValue(selectedProduct?.returnPolicy), spanFull: true },
  ];
  const companyViewFields = [
    { label: 'Business', value: formatValue(selectedProduct?.businessName) },
    { label: 'Business User ID', value: formatValue(selectedProduct?.userId) },
    { label: 'Account Code', value: formatValue(selectedProduct?.accountCode) },
    { label: 'Approval Status', value: statusLabel },
    { label: 'Created On', value: formatDateTime(selectedProduct?.createdOn) },
    { label: 'Updated On', value: formatDateTime(selectedProduct?.updatedOn) },
    { label: 'License Certificate', value: formatValue(selectedProduct?.licenseCertificateId) },
    {
      label: 'License Documents',
      value:
        Array.isArray(selectedProduct?.licenseDocuments) && selectedProduct.licenseDocuments.length > 0
          ? selectedProduct.licenseDocuments.join(', ')
          : '-',
      spanFull: true,
    },
    { label: 'Video Link', value: formatValue(selectedProduct?.videoLink), spanFull: true },
    { label: 'Internal Notes', value: formatValue(selectedProduct?.internalNotes), spanFull: true },
    { label: 'Review Note', value: formatValue(selectedProduct?.reviewRemarks), spanFull: true },
  ];
  const renderViewDetailGrid = (items, className = '') => (
    <div className={`product-view-detail-grid${className ? ` ${className}` : ''}`}>
      {items.map((item) => (
        <div
          key={`${item.label}-${String(item.value)}`}
          className={`product-view-detail-item${item.spanFull ? ' span-full' : ''}`}
        >
          <span className="product-view-detail-label">{item.label}</span>
          <p className="product-view-detail-value">{item.value || '-'}</p>
        </div>
      ))}
    </div>
  );
  const renderVariantsView = () => {
    if (variants.length === 0) {
      return <p className="empty-state">No variants submitted.</p>;
    }

    return (
      <div className="variant-grid">
        {variants.map((variant, index) => {
          const variantStatus = variant?.approvalStatus || '';
          const variantStatusClass = `status-pill ${
            variantStatus ? variantStatus.toLowerCase().replace(/_/g, '-') : 'pending'
          }`;
          const variantTitle = variant?.variantName || variant?.sku || `Variant ${index + 1}`;
          const disableVariantApprove = isLoading || variantStatus === 'APPROVED';
          const disableVariantReject = isLoading || variantStatus === 'REJECTED';
          const attributes = Array.isArray(variant?.attributes) ? variant.attributes : [];

          return (
            <div
              className="variant-card"
              key={variant?.variantId || variant?.sku || `variant-${index}`}
            >
              <div className="panel-split">
                <div>
                  <p className="variant-title">{variantTitle}</p>
                  <p className="muted">SKU: {formatValue(variant?.sku)}</p>
                </div>
                <span className={variantStatusClass}>{formatStatus(variantStatus)}</span>
              </div>
              <div className="field-grid variant-fields">
                {resolveMediaUrl(getPrimaryVariantImage(variant)) ? (
                  <div className="field field-span variant-view-media">
                    <span>Image</span>
                    <div className="variant-media-preview">
                      <img
                        src={resolveMediaUrl(getPrimaryVariantImage(variant))}
                        alt={variantTitle}
                      />
                    </div>
                  </div>
                ) : null}
                <div className="field">
                  <span>Selling price</span>
                  <p className="field-value">{formatPrice(variant?.sellingPrice, selectedProduct?.currency)}</p>
                </div>
                <div className="field">
                  <span>MRP</span>
                  <p className="field-value">{formatPrice(variant?.mrp, selectedProduct?.currency)}</p>
                </div>
                <div className="field">
                  <span>Stock qty</span>
                  <p className="field-value">{formatValue(variant?.stockQuantity)}</p>
                </div>
                <div className="field">
                  <span>Low stock alert</span>
                  <p className="field-value">{formatValue(variant?.lowStockAlert)}</p>
                </div>
              </div>
              {attributes.length > 0 ? (
                <div className="variant-attributes">
                  <span className="field-label">Attributes</span>
                  <div className="tag-row">
                    {attributes.map((attr, attrIndex) => (
                      <span className="tag" key={`${attr?.key || 'attr'}-${attrIndex}`}>
                        {attr?.key ? `${attr.key}: ` : ''}
                        {formatValue(attr?.value)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="inline-row variant-actions">
                <button
                  type="button"
                  className="primary-btn compact"
                  onClick={() => handleVariantStatusUpdate(variant?.variantId, 'APPROVED')}
                  disabled={disableVariantApprove || !variant?.variantId}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="ghost-btn small"
                  onClick={() => handleVariantStatusUpdate(variant?.variantId, 'REJECTED')}
                  disabled={disableVariantReject || !variant?.variantId}
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  const renderReviewWorkspace = () => (
    <div className="gsc-product-review-grid">
      <div className="gsc-product-view-section">
        <div className="panel-split">
          <div>
            <h4 className="gsc-product-view-section-title">Category Assignment</h4>
            <p className="product-review-section-text">
              Assign the final catalog path before approval or change request.
            </p>
          </div>
          {reviewCategoryDirty ? <span className="review-dirty-badge">Unsaved</span> : null}
        </div>
        <div className="product-review-select-grid">
          <label className="field">
            <span>Main category</span>
            <select
              value={reviewForm.mainCategoryId}
              onChange={(event) => handleReviewCategoryChange('mainCategoryId', event.target.value)}
            >
              <option value="">Select main category</option>
              {mainCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Category</span>
            <select
              value={reviewForm.categoryId}
              onChange={(event) => handleReviewCategoryChange('categoryId', event.target.value)}
              disabled={!reviewForm.mainCategoryId}
            >
              <option value="">Select category</option>
              {reviewCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sub-category</span>
            <select
              value={reviewForm.subCategoryId}
              onChange={(event) => handleReviewCategoryChange('subCategoryId', event.target.value)}
              disabled={!reviewForm.categoryId}
            >
              <option value="">{reviewForm.categoryId ? 'All sub-categories' : 'Select category first'}</option>
              {reviewSubCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="ghost-btn small"
          onClick={handleSaveReviewCategory}
          disabled={isLoading || !reviewCategoryDirty || !reviewCategoryComplete}
        >
          Save Category Assignment
        </button>
      </div>

      <div className="gsc-product-view-section">
        <h4 className="gsc-product-view-section-title">Review Checklist</h4>
        <div className="review-checklist">
          {reviewChecklist.map((item) => (
            <div
              key={item.label}
              className={`review-checklist-item ${item.status === 'ready' ? 'ready' : 'warning'}`}
            >
              <div>
                <p className="review-checklist-label">{item.label}</p>
                <p className="review-checklist-detail">{item.detail}</p>
              </div>
              <span className={`review-checklist-dot ${item.status}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="gsc-product-view-section">
        <h4 className="gsc-product-view-section-title">Current Review Note</h4>
        <div className="review-note-box">
          {selectedProduct?.reviewRemarks ? (
            <pre>{selectedProduct.reviewRemarks}</pre>
          ) : (
            <p>No review note has been sent to the business yet.</p>
          )}
        </div>
      </div>

      <div className="gsc-product-view-section">
        <h4 className="gsc-product-view-section-title">Moderation Actions</h4>
        <div className="product-review-actions">
          <button
            type="button"
            className="primary-btn compact"
            onClick={() => handleStatusUpdate('APPROVED')}
            disabled={disableApprove}
          >
            Approve Product
          </button>
          <button
            type="button"
            className="ghost-btn small warning"
            onClick={openChangeRequestModal}
            disabled={disableRequestChanges}
          >
            Request Changes
          </button>
          <button
            type="button"
            className="ghost-btn small"
            onClick={() => handleStatusUpdate('REJECTED')}
            disabled={disableReject}
          >
            Reject Product
          </button>
        </div>
      </div>
    </div>
  );
  const renderProductViewBody = () => {
    if (resolvedProductViewTab === 'general') {
      return (
        <>
          <div className="gsc-product-view-hero">
            <div className="gsc-product-view-hero-media">
              {selectedProductPrimaryImage ? (
                <div className="gsc-product-view-main-image">
                  <img src={selectedProductPrimaryImage} alt={selectedProduct?.productName || 'Product'} />
                </div>
              ) : (
                <div className="gsc-product-view-main-image empty">
                  <span>No product image</span>
                </div>
              )}
            </div>
            {renderViewDetailGrid(generalViewFields, 'gsc-product-view-general-grid')}
          </div>

          <div className="gsc-product-view-section">
            <h4 className="gsc-product-view-section-title">Product Description</h4>
            {renderViewDetailGrid(descriptionViewFields)}
          </div>

          <div className="gsc-product-view-section">
            <h4 className="gsc-product-view-section-title">Unit Mapping</h4>
            {uomDisplayRows.length > 0 ? (
              <div className="gsc-product-view-table-shell">
                <table className="gsc-product-view-table">
                  <thead>
                    <tr>
                      <th>UOM</th>
                      <th>Qty</th>
                      <th className="uom-equals-column" aria-label="Equals" />
                      <th>UOM</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uomDisplayRows.map((row, index) => (
                      <tr key={`${row.type}-${row.leftUom}-${index}`}>
                        <td>{row.leftUom || '-'}</td>
                        <td>{row.leftQty}</td>
                        <td className="uom-equals-column">=</td>
                        <td>{row.rightUom || '-'}</td>
                        <td>{row.rightQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">No UOM mappings added.</p>
            )}
            {renderViewDetailGrid(uomSummaryFields, 'gsc-product-view-uom-summary')}
          </div>

          <div className="gsc-product-view-section">
            <h4 className="gsc-product-view-section-title">Product Images</h4>
            {viewMediaImages.length > 0 ? (
              <div className="gsc-product-view-gallery">
                {viewMediaImages.map((image, index) => (
                  <div className="gsc-product-view-gallery-card" key={`${image}-${index}`}>
                    <img src={image} alt={`Product ${index + 1}`} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No images uploaded.</p>
            )}
          </div>
        </>
      );
    }

    if (resolvedProductViewTab === 'classification') {
      return (
        <>
          <div className="gsc-product-view-section">
            <h4 className="gsc-product-view-section-title">Classification Details</h4>
            {renderViewDetailGrid(classificationViewFields)}
          </div>
          <div className="gsc-product-view-section">
            <h4 className="gsc-product-view-section-title">Dynamic Fields</h4>
            {dynamicViewGroups.length === 0 ? (
              <p className="empty-state">No dynamic fields provided.</p>
            ) : (
              <div className="gsc-product-view-dynamic-groups">
                {dynamicViewGroups.map((group) => (
                  <div className="gsc-product-view-dynamic-group" key={group.id}>
                    <div className="gsc-product-view-dynamic-group-head">{group.label}</div>
                    <div className="product-view-detail-grid">
                      {group.items.map((entry) => {
                        const hasUnit =
                          entry.unit &&
                          entry.label &&
                          !String(entry.label).toLowerCase().includes(String(entry.unit).toLowerCase());
                        const label = hasUnit ? `${entry.label} (${entry.unit})` : entry.label;
                        return (
                          <div className="product-view-detail-item" key={`${group.id}-${label}`}>
                            <span className="product-view-detail-label">{label}</span>
                            <p className="product-view-detail-value">{entry.value}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      );
    }

    if (resolvedProductViewTab === 'pricing') {
      return (
        <>
          <div className="gsc-product-view-section">
            <h4 className="gsc-product-view-section-title">Pricing Details</h4>
            {renderViewDetailGrid(pricingViewFields)}
          </div>
          <div className="gsc-product-view-section">
            <h4 className="gsc-product-view-section-title">Inventory &amp; Shipping</h4>
            {renderViewDetailGrid(inventoryViewFields)}
          </div>
        </>
      );
    }

    if (resolvedProductViewTab === 'company') {
      return (
        <div className="gsc-product-view-section">
          <h4 className="gsc-product-view-section-title">Business &amp; Company Mapping</h4>
          {renderViewDetailGrid(companyViewFields)}
        </div>
      );
    }

    if (resolvedProductViewTab === 'variants') {
      return (
        <div className="gsc-product-view-section">
          <div className="panel-split">
            <h4 className="gsc-product-view-section-title">Variants</h4>
            <span className="muted">{variants.length} total</span>
          </div>
          {renderVariantsView()}
        </div>
      );
    }

    if (resolvedProductViewTab === 'review') {
      return renderReviewWorkspace();
    }

    return null;
  };

  return (
    <div className="users-page product-page">
      {showForm ? (
        <div className="gsc-form-page-header">
          <div className="gsc-form-breadcrumb-row">
            <div className="gsc-form-meta">
              <span className="gsc-form-breadcrumb">Admin / Products</span>
              <button type="button" className="gsc-form-back-link" onClick={handleCloseForm}>
                &lt; Back
              </button>
              <p className="panel-subtitle gsc-form-description">Create and manage products submitted by businesses.</p>
              <span className="gsc-form-breadcrumb-secondary">Products / {isEditing ? 'Edit Product' : 'Create New'}</span>
            </div>
            <button type="button" className="primary-btn gsc-back-to-list-btn" onClick={handleCloseForm}>
              Back to list
            </button>
          </div>
        </div>
      ) : null}
      <Banner message={message} />
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleMediaFiles}
        style={{ display: 'none' }}
      />
      {showCreateSelector ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal product-create-selector-modal">
            <div className="admin-modal-header">
              <div>
                <h3 className="panel-title">Create Product</h3>
                <p className="panel-subtitle">Select the business and category path before opening the product form.</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setShowCreateSelector(false)}>
                Close
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="field-grid product-create-selector-grid">
                <label className="field field-span">
                  <span>Business<span className="gsc-required">*</span></span>
                  <select
                    value={createSelectorForm.userId}
                    onChange={(event) => handleCreateSelectorChange('userId', event.target.value)}
                    disabled={isCreateSelectorLoading}
                  >
                    <option value="">{isCreateSelectorLoading ? 'Loading businesses...' : 'Select business'}</option>
                    {businessAccounts.map((business) => (
                      <option key={business?.id || business?.user_id} value={business?.id || business?.user_id}>
                        {getBusinessName(business)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Main category<span className="gsc-required">*</span></span>
                  <select
                    value={createSelectorForm.mainCategoryId}
                    onChange={(event) => handleCreateSelectorChange('mainCategoryId', event.target.value)}
                  >
                    <option value="">Select main category</option>
                    {mainCategories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Category<span className="gsc-required">*</span></span>
                  <select
                    value={createSelectorForm.categoryId}
                    onChange={(event) => handleCreateSelectorChange('categoryId', event.target.value)}
                    disabled={!createSelectorForm.mainCategoryId}
                  >
                    <option value="">Select category</option>
                    {createSelectorCategories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Sub-category</span>
                  <select
                    value={createSelectorForm.subCategoryId}
                    onChange={(event) => handleCreateSelectorChange('subCategoryId', event.target.value)}
                    disabled={!createSelectorForm.categoryId}
                  >
                    <option value="">{createSelectorForm.categoryId ? 'All sub-categories' : 'Select category first'}</option>
                    {createSelectorSubCategories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="product-create-selector-preview">
                <div className="product-create-selector-preview-card">
                  <span className="field-label">Business</span>
                  <p>{selectorBusinessAccount ? getBusinessName(selectorBusinessAccount) : 'Select a business account'}</p>
                </div>
                <div className="product-create-selector-preview-card">
                  <span className="field-label">Category Path</span>
                  <p>
                    {[selectorMainCategory?.name, selectorCategory?.name, selectorSubCategoryLabel]
                      .filter(Boolean)
                      .join(' / ') || 'Select main category and category'}
                  </p>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="ghost-btn" onClick={() => setShowCreateSelector(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleApplyCreateSelector}
                disabled={isCreateSelectorLoading}
              >
                Continue to Form
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showForm && showCreateUomModal ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal product-uom-manager-modal">
            <div className="admin-modal-header">
              <div>
                <h3 className="panel-title">Manage UOM</h3>
                <p className="panel-subtitle">Configure the base unit, purchase UOMs, sales UOMs, and library entries.</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setShowCreateUomModal(false)}>
                Close
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="gsc-product-secondary-stack product-uom-manager-stack">
                <div className="panel card product-subpanel gsc-product-uom-card">
                  <h4 className="panel-subheading">UOM setup</h4>
                  <div className="field-grid">
                    <div className="field field-span">
                      <span>Selected base UOM</span>
                      <div className="field-static">
                        {selectedBaseUom ? formatUomLabel(selectedBaseUom) : 'Select a base UOM from the form above'}
                      </div>
                      <span className="field-help">
                        {uoms.length === 0
                          ? 'No UOMs available yet. Create one in the library below.'
                          : 'Selling price is interpreted per selected base UOM.'}
                      </span>
                    </div>
                    {uoms.length === 0 ? null : (
                      <>
                        <div className="field field-span">
                          <span>Purchase UOMs (max 3)</span>
                          {form.purchaseUoms.length === 0 ? <span className="field-help">No purchase UOMs added.</span> : null}
                          {form.purchaseUoms.map((entry, index) => {
                            const isBaseUom = form.baseUomId && entry.uomId === form.baseUomId;
                            return (
                              <div className="inline-row uom-entry-row" key={`create-modal-purchase-${index}`}>
                                <select
                                  value={entry.uomId}
                                  onChange={(event) => handleUomEntryChange('purchase', index, 'uomId', event.target.value)}
                                >
                                  <option value="">Select UOM</option>
                                  {uoms.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {formatUomLabel(item)}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  step="0.000001"
                                  value={entry.conversionFactor}
                                  onChange={(event) =>
                                    handleUomEntryChange('purchase', index, 'conversionFactor', event.target.value)
                                  }
                                  placeholder={isBaseUom ? '1 (base)' : 'e.g. 1000'}
                                  disabled={isBaseUom}
                                />
                                <button
                                  type="button"
                                  className="ghost-btn small"
                                  onClick={() => handleRemoveUomEntry('purchase', index)}
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            className="primary-btn small gsc-form-action-btn"
                            onClick={() => handleAddUomEntry('purchase')}
                            disabled={form.purchaseUoms.length >= 3}
                          >
                            Add purchase UOM
                          </button>
                          <span className="field-help">
                            Conversion factor is base units per 1 unit of the selected UOM.
                          </span>
                        </div>
                        <div className="field field-span">
                          <span>Sales UOMs (max 3)</span>
                          {form.salesUoms.length === 0 ? <span className="field-help">No sales UOMs added.</span> : null}
                          {form.salesUoms.map((entry, index) => {
                            const isBaseUom = form.baseUomId && entry.uomId === form.baseUomId;
                            return (
                              <div className="inline-row uom-entry-row" key={`create-modal-sales-${index}`}>
                                <select
                                  value={entry.uomId}
                                  onChange={(event) => handleUomEntryChange('sales', index, 'uomId', event.target.value)}
                                >
                                  <option value="">Select UOM</option>
                                  {uoms.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {formatUomLabel(item)}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  step="0.000001"
                                  value={entry.conversionFactor}
                                  onChange={(event) =>
                                    handleUomEntryChange('sales', index, 'conversionFactor', event.target.value)
                                  }
                                  placeholder={isBaseUom ? '1 (base)' : 'e.g. 0.001'}
                                  disabled={isBaseUom}
                                />
                                <button
                                  type="button"
                                  className="ghost-btn small"
                                  onClick={() => handleRemoveUomEntry('sales', index)}
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            className="primary-btn small gsc-form-action-btn"
                            onClick={() => handleAddUomEntry('sales')}
                            disabled={form.salesUoms.length >= 3}
                          >
                            Add sales UOM
                          </button>
                          <span className="field-help">
                            Leave conversion blank to use global conversion if configured.
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="panel card product-subpanel">
                  <div className="panel-split">
                    <div>
                      <h4 className="panel-subheading">UOM library</h4>
                      <p className="panel-subtitle">Create or manage units without leaving this form.</p>
                    </div>
                    <button
                      type="button"
                      className="ghost-btn small"
                      onClick={handleUomRefresh}
                      disabled={isUomSaving}
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="field-grid">
                    <label className="field">
                      <span>UOM Code</span>
                      <input
                        type="text"
                        value={uomForm.uomCode}
                        onChange={(event) => handleUomChange('uomCode', event.target.value)}
                        placeholder="e.g. KG"
                      />
                    </label>
                    <label className="field">
                      <span>UOM Name</span>
                      <input
                        type="text"
                        value={uomForm.uomName}
                        onChange={(event) => handleUomChange('uomName', event.target.value)}
                        placeholder="Kilogram"
                      />
                    </label>
                    <label className="field field-span">
                      <span>Description</span>
                      <input
                        type="text"
                        value={uomForm.description}
                        onChange={(event) => handleUomChange('description', event.target.value)}
                        placeholder="Optional description"
                      />
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <select
                        value={uomForm.isActive ? 'true' : 'false'}
                        onChange={(event) => handleUomChange('isActive', event.target.value)}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </label>
                    <div className="field field-span form-actions">
                      <button type="button" className="ghost-btn" onClick={resetUomForm} disabled={isUomSaving}>
                        Clear
                      </button>
                      <button type="button" className="primary-btn" onClick={handleUomSave} disabled={isUomSaving}>
                        {isUomSaving ? 'Saving...' : editingUomId ? 'Update UOM' : 'Create UOM'}
                      </button>
                    </div>
                  </div>
                  {uoms.length === 0 ? (
                    <p className="empty-state">No UOMs created yet.</p>
                  ) : (
                    <div className="table-shell">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th className="table-actions">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uoms.map((uom) => (
                            <tr key={uom.id || uom.uomCode}>
                              <td>{uom.uomCode}</td>
                              <td>{uom.uomName}</td>
                              <td>{uom.isActive === false ? 'Inactive' : 'Active'}</td>
                              <td className="table-actions">
                                <div className="table-action-group">
                                  <button
                                    type="button"
                                    className="ghost-btn small"
                                    onClick={() => handleUomEdit(uom)}
                                    disabled={isUomSaving}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost-btn small"
                                    onClick={() => handleUomDelete(uom)}
                                    disabled={isUomSaving}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="ghost-btn" onClick={() => setShowCreateUomModal(false)}>
                Close
              </button>
              <button type="button" className="primary-btn" onClick={() => setShowCreateUomModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showForm ? (
        <form className="panel card product-form gsc-create-form" onSubmit={handleSubmit}>
            <div className="gsc-form-tabs">
              <button type="button" className={`gsc-form-tab ${productFormTab === 'general' ? 'active' : ''}`} onClick={() => setProductFormTab('general')}>General Details</button>
              <button type="button" className={`gsc-form-tab ${productFormTab === 'classification' ? 'active' : ''}`} onClick={() => setProductFormTab('classification')}>Classification</button>
              <button type="button" className={`gsc-form-tab ${productFormTab === 'pricing' ? 'active' : ''}`} onClick={() => setProductFormTab('pricing')}>Pricing Details</button>
              <button type="button" className={`gsc-form-tab ${productFormTab === 'company' ? 'active' : ''}`} onClick={() => setProductFormTab('company')}>Company Mapping</button>
            </div>
            <div className={`field-grid form-grid gsc-form-panel gsc-tab-${productFormTab}`}>
              <div className="gsc-tab-section gsc-tab-general">
                <div className="field-span section-heading">
                  <h4 className="panel-subheading">Basic information</h4>
                </div>
                <div className="field-span gsc-product-create-hero">
                  <div className="gsc-product-create-column">
                    <label className="field">
                      <span>Product name<span className="gsc-required">*</span></span>
                      <input
                        type="text"
                        value={form.productName}
                        onChange={(event) => handleChange('productName', event.target.value)}
                        placeholder="Enter product name"
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Brand name</span>
                      <input
                        type="text"
                        value={form.brandName}
                        onChange={(event) => handleChange('brandName', event.target.value)}
                        placeholder="Brand"
                      />
                    </label>
                    <label className="field">
                      <span>Short description</span>
                      <input
                        type="text"
                        value={form.shortDescription}
                        onChange={(event) => handleChange('shortDescription', event.target.value)}
                        placeholder="Short description"
                      />
                    </label>
                  </div>
                  <div className="gsc-product-create-column">
                    <label className="field">
                      <span>Selling price<span className="gsc-required">*</span></span>
                      <input
                        type="number"
                        value={form.sellingPrice}
                        onChange={(event) => handleChange('sellingPrice', event.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </label>
                    <label className="field">
                      <span>MRP<span className="gsc-required">*</span></span>
                      <input
                        type="number"
                        value={form.mrp}
                        onChange={(event) => handleChange('mrp', event.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </label>
                    <label className="field">
                      <span>GST rate<span className="gsc-required">*</span></span>
                      <input
                        type="number"
                        value={form.gstRate}
                        onChange={(event) => handleChange('gstRate', event.target.value)}
                        placeholder="18"
                        required
                      />
                    </label>
                  </div>
                  <div className="gsc-product-create-column">
                    <label className="field">
                      <span>Main category<span className="gsc-required">*</span></span>
                      <select
                        value={form.mainCategoryId}
                        onChange={(event) => handleChange('mainCategoryId', event.target.value)}
                        required
                      >
                        <option value="">Select main category</option>
                        {mainCategories.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="gsc-product-inline-pair">
                      <label className="field">
                        <span>Category<span className="gsc-required">*</span></span>
                        <select
                          value={form.categoryId}
                          onChange={(event) => handleChange('categoryId', event.target.value)}
                          required
                        >
                          <option value="">Select category</option>
                          {categories.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Sub-category</span>
                        <select
                          value={form.subCategoryId}
                          onChange={(event) => handleChange('subCategoryId', event.target.value)}
                        >
                          <option value="">{form.categoryId ? 'All sub-categories' : 'Select category first'}</option>
                          {subCategories.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        {form.useAllSubCategories ? (
                          <span className="field-help">This product will apply to all sub-categories under the selected category.</span>
                        ) : null}
                      </label>
                    </div>
                    <div className="gsc-product-uom-inline">
                      <label className="field gsc-product-uom-main-field">
                        <span>Base UOM<span className="gsc-required">*</span></span>
                        <select
                          value={form.baseUomId}
                          onChange={(event) => handleChange('baseUomId', event.target.value)}
                          disabled={uoms.length === 0}
                        >
                          <option value="">{uoms.length === 0 ? 'No UOMs available' : 'Select base UOM'}</option>
                          {uoms.map((item) => (
                            <option key={item.id} value={item.id}>
                              {formatUomLabel(item)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="gsc-product-uom-trigger-wrap">
                        <button
                          type="button"
                          className="gsc-uom-plus-btn"
                          onClick={() => handleAddUomEntry('purchase')}
                          aria-label="Add UOM row"
                          title="Add UOM row"
                          disabled={!form.baseUomId || (form.uomConversions || []).length >= 3 || uoms.length === 0}
                        >
                          +
                        </button>
                        <span className="gsc-product-uom-trigger-label">
                          Add UOM
                          <small>(Max. 3 UOM can be added)</small>
                        </span>
                      </div>
                    </div>
                    <div className="gsc-product-inline-tools">
                      <button
                        type="button"
                        className="primary-btn small gsc-form-action-btn"
                        onClick={() => openMediaUpload({ kind: 'product', field: 'galleryImagesText' })}
                        disabled={isUploadingMedia}
                      >
                        {isUploadingMedia && mediaTarget?.kind === 'product' && mediaTarget?.field === 'galleryImagesText'
                          ? 'Uploading...'
                          : 'Upload Images'}
                      </button>
                      <div className="gsc-product-inline-tools-meta">
                        <span>{productPreviewUrl ? 'Thumbnail ready' : 'No thumbnail selected'}</span>
                        <span>
                          {mediaCount > 0
                            ? `${mediaCount} image${mediaCount === 1 ? '' : 's'} selected`
                            : 'No product images uploaded'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="field-span gsc-product-uom-flow-card">
                  {!form.baseUomId ? (
                    <div className="gsc-product-uom-empty">Select the Base UOM first to add conversion rows.</div>
                  ) : null}
                  {form.baseUomId && form.uomConversions.length > 0 ? (
                    <div className="gsc-product-uom-table-shell">
                      <table className="gsc-product-uom-table">
                        <thead>
                          <tr>
                            <th>UOM <span className="gsc-required">*</span></th>
                            <th>Qty</th>
                            <th className="uom-equals-column" aria-label="Equals" />
                            <th>Base UOM</th>
                            <th>Qty <span className="gsc-required">*</span></th>
                            <th className="table-actions" aria-label="Actions" />
                          </tr>
                        </thead>
                        <tbody>
                          {form.uomConversions.map((entry, index) => {
                            const isBaseUom = form.baseUomId && entry.uomId === form.baseUomId;
                            return (
                              <tr key={entry.rowId || `uom-row-${index}`}>
                                <td>
                                  <select
                                    value={entry.uomId}
                                    onChange={(event) => handleUomConversionChange(index, 'uomId', event.target.value)}
                                  >
                                    <option value="">
                                      Select UOM
                                    </option>
                                    {uoms
                                      .filter((item) => String(item.id) !== String(form.baseUomId || ''))
                                      .map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {formatUomLabel(item)}
                                        </option>
                                      ))}
                                  </select>
                                </td>
                                <td>
                                  <input type="number" value="1" readOnly tabIndex={-1} className="gsc-product-uom-fixed-input" />
                                </td>
                                <td className="uom-equals-column">=</td>
                                <td>
                                  <div className="gsc-product-uom-base-cell">{selectedBaseUomLabel}</div>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    step="0.000001"
                                    value={entry.conversionFactor}
                                    onChange={(event) => handleUomConversionChange(index, 'conversionFactor', event.target.value)}
                                    placeholder={isBaseUom ? '1' : 'Qty'}
                                    disabled={isBaseUom || !form.baseUomId}
                                  />
                                </td>
                                <td className="table-actions">
                                  <button
                                    type="button"
                                    className="icon-btn delete"
                                    aria-label="Remove UOM row"
                                    onClick={() => handleRemoveUomEntry('generic', index)}
                                  >
                                    {ACTION_ICONS.trash}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  {form.baseUomId && form.uomConversions.length > 0 ? (
                    <div className="gsc-product-uom-default-grid">
                      <label className="field">
                        <span>Default UOM For Stock In<span className="gsc-required">*</span></span>
                        <select value={form.defaultStockInUomId} onChange={(event) => handleUomDefaultChange('defaultStockInUomId', event.target.value)}>
                          <option value="" disabled>
                            Select UOM
                          </option>
                          {combinedDefaultOptions.map((option) => (
                            <option key={`default-stock-in-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Default UOM For Stock Out<span className="gsc-required">*</span></span>
                        <select value={form.defaultStockOutUomId} onChange={(event) => handleUomDefaultChange('defaultStockOutUomId', event.target.value)}>
                          <option value="" disabled>
                            Select UOM
                          </option>
                          {combinedDefaultOptions.map((option) => (
                            <option key={`default-stock-out-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>
                {attributeMappings.length > 0 ? (
                  <div className="field-span gsc-product-general-dynamic-grid">
                    {attributeMappings.map((mapping) => renderDynamicFieldInput(mapping))}
                  </div>
                ) : null}
              </div>
              {!isEditing ? (
              <div className="gsc-tab-section gsc-tab-company">
                <div className="field-span panel card product-subpanel product-create-selector-card">
                  <div className="panel-split">
                    <div>
                      <h4 className="panel-subheading">Selected business</h4>
                      <p className="panel-subtitle">This product will be created against the business and category chosen in the selector modal.</p>
                    </div>
                    <button type="button" className="ghost-btn small" onClick={() => openCreateSelector(true)}>
                      Change selection
                    </button>
                  </div>
                  <div className="field-grid product-create-selector-summary">
                    <div className="field">
                      <span>Business</span>
                      <div className="field-static">
                        {selectedBusinessAccount ? getBusinessName(selectedBusinessAccount) : 'No business selected'}
                      </div>
                    </div>
                    <div className="field">
                      <span>Main category</span>
                      <div className="field-static">{selectedMainCategory?.name || '-'}</div>
                    </div>
                    <div className="field">
                      <span>Category</span>
                      <div className="field-static">{selectedCategory?.name || '-'}</div>
                    </div>
                    <div className="field">
                      <span>Sub-category</span>
                      <div className="field-static">{selectedSubCategoryLabel}</div>
                    </div>
                  </div>
                </div>
              </div>
              ) : (
              <div className="gsc-tab-section gsc-tab-company">
                <p className="panel-subtitle" style={{ marginTop: 0 }}>This product is linked to a business. Business user ID can only be set when creating a new product.</p>
              </div>
              )}
              <div className="gsc-tab-section gsc-tab-classification">
              <div className="field-span section-heading">
                <h4 className="panel-subheading">Category &amp; subcategory</h4>
              </div>
              <label className="field">
                <span>Main category<span className="gsc-required">*</span></span>
                <select
                  value={form.mainCategoryId}
                  onChange={(event) => handleChange('mainCategoryId', event.target.value)}
                  required
                >
                  <option value="">Select main category</option>
                  {mainCategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Category<span className="gsc-required">*</span></span>
                <select
                  value={form.categoryId}
                  onChange={(event) => handleChange('categoryId', event.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Sub-category</span>
                <select
                  value={form.subCategoryId}
                  onChange={(event) => handleChange('subCategoryId', event.target.value)}
                >
                  <option value="">{form.categoryId ? 'All sub-categories' : 'Select category first'}</option>
                  {subCategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              </div>
              <div className="gsc-tab-section gsc-tab-pricing">
              <div className="field-span section-heading">
                <h4 className="panel-subheading">Pricing</h4>
              </div>
              <label className="field">
                <span>Selling price<span className="gsc-required">*</span></span>
                <input
                  type="number"
                  value={form.sellingPrice}
                  onChange={(event) => handleChange('sellingPrice', event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>
              <label className="field">
                <span>MRP<span className="gsc-required">*</span></span>
                <input
                  type="number"
                  value={form.mrp}
                  onChange={(event) => handleChange('mrp', event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>
              <label className="field">
                <span>GST rate<span className="gsc-required">*</span></span>
                <input
                  type="number"
                  value={form.gstRate}
                  onChange={(event) => handleChange('gstRate', event.target.value)}
                  placeholder="18"
                  required
                />
              </label>
              </div>
              {isEditing ? (
              <>
              <div className="gsc-tab-section gsc-tab-general" style={{ display: 'none' }}>
                <div className="field-span section-heading">
                  <h4 className="panel-subheading">Media &amp; units</h4>
                </div>
                <div className="field-span gsc-product-secondary-grid">
                  <div className="panel card product-subpanel gsc-product-media-card">
                    <div className="panel-split">
                      <div>
                        <h4 className="panel-subheading">Media</h4>
                        <p className="panel-subtitle">Thumbnail and gallery images for the product card and detail page.</p>
                      </div>
                    </div>
                    <div className="product-media-editor">
                      <div className="product-media-preview">
                        {productPreviewUrl ? (
                          <img src={productPreviewUrl} alt={form.productName || 'Product preview'} />
                        ) : (
                          <span>No product image</span>
                        )}
                      </div>
                      <div className="product-media-fields">
                        <label className="field field-span">
                          <span>Thumbnail image</span>
                          <input
                            type="text"
                            value={form.thumbnailImage}
                            onChange={(event) => handleChange('thumbnailImage', event.target.value)}
                            placeholder="https://..."
                          />
                        </label>
                        <div className="inline-row media-action-row">
                          <button
                            type="button"
                            className="primary-btn small gsc-form-action-btn"
                            onClick={() => openMediaUpload({ kind: 'product', field: 'thumbnailImage' })}
                            disabled={isUploadingMedia}
                          >
                            {isUploadingMedia && mediaTarget?.kind === 'product' && mediaTarget?.field === 'thumbnailImage'
                              ? 'Uploading...'
                              : 'Upload thumbnail'}
                          </button>
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={() => clearMediaField({ kind: 'product', field: 'thumbnailImage' })}
                          >
                            Clear
                          </button>
                        </div>
                        <label className="field field-span">
                          <span>Gallery images (comma or new line separated)</span>
                          <textarea
                            rows={3}
                            value={form.galleryImagesText}
                            onChange={(event) => handleChange('galleryImagesText', event.target.value)}
                            placeholder="https://image1.jpg, https://image2.jpg"
                          />
                        </label>
                        <div className="inline-row media-action-row">
                          <button
                            type="button"
                            className="primary-btn small gsc-form-action-btn"
                            onClick={() => openMediaUpload({ kind: 'product', field: 'galleryImagesText' })}
                            disabled={isUploadingMedia}
                          >
                            {isUploadingMedia && mediaTarget?.kind === 'product' && mediaTarget?.field === 'galleryImagesText'
                              ? 'Uploading...'
                              : 'Upload Images'}
                          </button>
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={() => clearMediaField({ kind: 'product', field: 'galleryImagesText' })}
                          >
                            Clear
                          </button>
                        </div>
                        {productGalleryPreview.length > 0 ? (
                          <div className="media-thumb-grid">
                            {productGalleryPreview.map((image, index) => (
                              <div className="media-thumb" key={`${image}-${index}`}>
                                <img src={image} alt={`Product gallery ${index + 1}`} />
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="gsc-product-secondary-stack">
                    <div className="panel card product-subpanel gsc-product-uom-card" ref={uomSectionRef}>
                      <h4 className="panel-subheading">UOM setup</h4>
                      <div className="field-grid">
                        <div className="field field-span">
                          <span>Selected base UOM</span>
                          <div className="field-static">
                            {selectedBaseUom ? formatUomLabel(selectedBaseUom) : 'Select a base UOM from the form above'}
                          </div>
                          <span className="field-help">
                            {uoms.length === 0
                              ? 'No UOMs available yet. Create one in the UOM library below.'
                              : 'Selling price is interpreted per selected base UOM.'}
                          </span>
                        </div>
                        {uoms.length === 0 ? null : (
                          <>
                            <div className="field field-span">
                              <span>Purchase UOMs (max 3)</span>
                              {form.purchaseUoms.length === 0 ? (
                                <span className="field-help">No purchase UOMs added.</span>
                              ) : null}
                              {form.purchaseUoms.map((entry, index) => {
                                const isBaseUom = form.baseUomId && entry.uomId === form.baseUomId;
                                return (
                                  <div className="inline-row uom-entry-row" key={`purchase-${index}`}>
                                    <select
                                      value={entry.uomId}
                                      onChange={(event) =>
                                        handleUomEntryChange('purchase', index, 'uomId', event.target.value)
                                      }
                                    >
                                      <option value="">Select UOM</option>
                                      {uoms.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {formatUomLabel(item)}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="number"
                                      step="0.000001"
                                      value={entry.conversionFactor}
                                      onChange={(event) =>
                                        handleUomEntryChange('purchase', index, 'conversionFactor', event.target.value)
                                      }
                                      placeholder={isBaseUom ? '1 (base)' : 'e.g. 1000'}
                                      disabled={isBaseUom}
                                    />
                                    <button
                                      type="button"
                                      className="ghost-btn small"
                                      onClick={() => handleRemoveUomEntry('purchase', index)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                );
                              })}
                              <button
                                type="button"
                                className="primary-btn small gsc-form-action-btn"
                                onClick={() => handleAddUomEntry('purchase')}
                                disabled={form.purchaseUoms.length >= 3}
                              >
                                Add purchase UOM
                              </button>
                              <span className="field-help">
                                Conversion factor is base units per 1 unit of the selected UOM.
                              </span>
                            </div>
                            <div className="field field-span">
                              <span>Sales UOMs (max 3)</span>
                              {form.salesUoms.length === 0 ? (
                                <span className="field-help">No sales UOMs added.</span>
                              ) : null}
                              {form.salesUoms.map((entry, index) => {
                                const isBaseUom = form.baseUomId && entry.uomId === form.baseUomId;
                                return (
                                  <div className="inline-row uom-entry-row" key={`sales-${index}`}>
                                    <select
                                      value={entry.uomId}
                                      onChange={(event) =>
                                        handleUomEntryChange('sales', index, 'uomId', event.target.value)
                                      }
                                    >
                                      <option value="">Select UOM</option>
                                      {uoms.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {formatUomLabel(item)}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="number"
                                      step="0.000001"
                                      value={entry.conversionFactor}
                                      onChange={(event) =>
                                        handleUomEntryChange('sales', index, 'conversionFactor', event.target.value)
                                      }
                                      placeholder={isBaseUom ? '1 (base)' : 'e.g. 0.001'}
                                      disabled={isBaseUom}
                                    />
                                    <button
                                      type="button"
                                      className="ghost-btn small"
                                      onClick={() => handleRemoveUomEntry('sales', index)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                );
                              })}
                              <button
                                type="button"
                                className="primary-btn small gsc-form-action-btn"
                                onClick={() => handleAddUomEntry('sales')}
                                disabled={form.salesUoms.length >= 3}
                              >
                                Add sales UOM
                              </button>
                              <span className="field-help">
                                Leave conversion blank to use global conversion if configured.
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="panel card product-subpanel">
                      <div className="panel-split">
                        <div>
                          <h4 className="panel-subheading">UOM Library</h4>
                          <p className="panel-subtitle">Create or manage units without leaving this form.</p>
                        </div>
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={handleUomRefresh}
                          disabled={isUomSaving}
                        >
                          Refresh
                        </button>
                      </div>
                      <div className="field-grid">
                        <label className="field">
                          <span>UOM Code</span>
                          <input
                            type="text"
                            value={uomForm.uomCode}
                            onChange={(event) => handleUomChange('uomCode', event.target.value)}
                            placeholder="e.g. KG"
                          />
                        </label>
                        <label className="field">
                          <span>UOM Name</span>
                          <input
                            type="text"
                            value={uomForm.uomName}
                            onChange={(event) => handleUomChange('uomName', event.target.value)}
                            placeholder="Kilogram"
                          />
                        </label>
                        <label className="field field-span">
                          <span>Description</span>
                          <input
                            type="text"
                            value={uomForm.description}
                            onChange={(event) => handleUomChange('description', event.target.value)}
                            placeholder="Optional description"
                          />
                        </label>
                        <label className="field">
                          <span>Status</span>
                          <select
                            value={uomForm.isActive ? 'true' : 'false'}
                            onChange={(event) => handleUomChange('isActive', event.target.value)}
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </label>
                        <div className="field field-span form-actions">
                          <button type="button" className="ghost-btn" onClick={resetUomForm} disabled={isUomSaving}>
                            Clear
                          </button>
                          <button type="button" className="primary-btn" onClick={handleUomSave} disabled={isUomSaving}>
                            {isUomSaving ? 'Saving...' : editingUomId ? 'Update UOM' : 'Create UOM'}
                          </button>
                        </div>
                      </div>
                      {uoms.length === 0 ? (
                        <p className="empty-state">No UOMs created yet.</p>
                      ) : (
                        <div className="table-shell">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Status</th>
                                <th className="table-actions">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {uoms.map((uom) => (
                                <tr key={uom.id || uom.uomCode}>
                                  <td>{uom.uomCode}</td>
                                  <td>{uom.uomName}</td>
                                  <td>{uom.isActive === false ? 'Inactive' : 'Active'}</td>
                                  <td className="table-actions">
                                    <div className="table-action-group">
                                      <button
                                        type="button"
                                        className="ghost-btn small"
                                        onClick={() => handleUomEdit(uom)}
                                        disabled={isUomSaving}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="ghost-btn small"
                                        onClick={() => handleUomDelete(uom)}
                                        disabled={isUomSaving}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="field-span section-heading">
                <div className="panel-split">
                  <h4 className="panel-subheading">Variants</h4>
                  <button
                    type="button"
                    className="ghost-btn small"
                    onClick={handleAddVariant}
                    disabled={form.variants.length >= 20}
                  >
                    Add variant
                  </button>
                </div>
                <p className="muted">Add up to 20 variants for this product.</p>
              </div>
              {form.variants.length === 0 ? (
                <div className="field-span">
                  <p className="empty-state">No variants added.</p>
                </div>
              ) : (
                form.variants.map((variant, index) => (
                  <div className="variant-form-card field-span" key={`variant-${index}`}>
                    <div className="panel-split">
                      <p className="variant-title">
                        {variant.variantName || variant.sku || `Variant ${index + 1}`}
                      </p>
                      <button
                        type="button"
                        className="ghost-btn small"
                        onClick={() => handleRemoveVariant(index)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="field-grid variant-fields">
                      <label className="field">
                        <span>Variant name</span>
                        <input
                          type="text"
                          value={variant.variantName}
                          onChange={(event) => handleVariantChange(index, 'variantName', event.target.value)}
                          placeholder="e.g. Black / 256GB"
                        />
                      </label>
                      <label className="field">
                        <span>SKU</span>
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(event) => handleVariantChange(index, 'sku', event.target.value)}
                          placeholder="Variant SKU"
                        />
                      </label>
                      <label className="field">
                        <span>Barcode</span>
                        <input
                          type="text"
                          value={variant.barcode}
                          onChange={(event) => handleVariantChange(index, 'barcode', event.target.value)}
                          placeholder="Barcode"
                        />
                      </label>
                      <label className="field">
                        <span>Selling price</span>
                        <input
                          type="number"
                          value={variant.sellingPrice}
                          onChange={(event) => handleVariantChange(index, 'sellingPrice', event.target.value)}
                          placeholder="0.00"
                        />
                      </label>
                      <label className="field">
                        <span>MRP</span>
                        <input
                          type="number"
                          value={variant.mrp}
                          onChange={(event) => handleVariantChange(index, 'mrp', event.target.value)}
                          placeholder="0.00"
                        />
                      </label>
                      <label className="field">
                        <span>Stock qty</span>
                        <input
                          type="number"
                          value={variant.stockQuantity}
                          onChange={(event) => handleVariantChange(index, 'stockQuantity', event.target.value)}
                          placeholder="0"
                        />
                      </label>
                      <label className="field">
                        <span>Low stock alert</span>
                        <input
                          type="number"
                          value={variant.lowStockAlert}
                          onChange={(event) => handleVariantChange(index, 'lowStockAlert', event.target.value)}
                          placeholder="0"
                        />
                      </label>
                      <label className="field field-span">
                        <span>Thumbnail image</span>
                        <input
                          type="text"
                          value={variant.thumbnailImage}
                          onChange={(event) => handleVariantChange(index, 'thumbnailImage', event.target.value)}
                          placeholder="https://..."
                        />
                      </label>
                      <div className="field field-span variant-media-tools">
                        <div className="inline-row media-action-row">
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={() => openMediaUpload({ kind: 'variant', index, field: 'thumbnailImage' })}
                            disabled={isUploadingMedia}
                          >
                            {isUploadingMedia &&
                            mediaTarget?.kind === 'variant' &&
                            mediaTarget?.index === index &&
                            mediaTarget?.field === 'thumbnailImage'
                              ? 'Uploading...'
                              : 'Upload thumbnail'}
                          </button>
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={() => clearMediaField({ kind: 'variant', index, field: 'thumbnailImage' })}
                          >
                            Clear
                          </button>
                        </div>
                        {resolveMediaUrl(getPrimaryVariantImage(variant)) ? (
                          <div className="variant-media-preview">
                            <img
                              src={resolveMediaUrl(getPrimaryVariantImage(variant))}
                              alt={variant.variantName || `Variant ${index + 1}`}
                            />
                          </div>
                        ) : null}
                      </div>
                      <label className="field field-span">
                        <span>Gallery images (comma or new line separated)</span>
                        <textarea
                          rows={2}
                          value={variant.galleryImagesText}
                          onChange={(event) => handleVariantChange(index, 'galleryImagesText', event.target.value)}
                          placeholder="https://image1.jpg, https://image2.jpg"
                        />
                      </label>
                      <div className="field field-span variant-media-tools">
                        <div className="inline-row media-action-row">
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={() => openMediaUpload({ kind: 'variant', index, field: 'galleryImagesText' })}
                            disabled={isUploadingMedia}
                          >
                            {isUploadingMedia &&
                            mediaTarget?.kind === 'variant' &&
                            mediaTarget?.index === index &&
                            mediaTarget?.field === 'galleryImagesText'
                              ? 'Uploading...'
                              : 'Add gallery images'}
                          </button>
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={() => clearMediaField({ kind: 'variant', index, field: 'galleryImagesText' })}
                          >
                            Clear
                          </button>
                        </div>
                        {parseList(variant.galleryImagesText).length > 0 ? (
                          <div className="media-thumb-grid">
                            {parseList(variant.galleryImagesText)
                              .map(resolveMediaUrl)
                              .filter(Boolean)
                              .map((image, imageIndex) => (
                                <div className="media-thumb" key={`${image}-${imageIndex}`}>
                                  <img src={image} alt={`Variant gallery ${imageIndex + 1}`} />
                                </div>
                              ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="variant-attributes">
                      <div className="panel-split">
                        <span className="field-label">Attributes</span>
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => handleAddVariantAttribute(index)}
                        >
                          Add attribute
                        </button>
                      </div>
                      {(variant.attributes || []).map((attr, attrIndex) => (
                        <div className="inline-row variant-attribute-row" key={`variant-${index}-attr-${attrIndex}`}>
                          <input
                            type="text"
                            value={attr.key}
                            onChange={(event) =>
                              handleVariantAttributeChange(index, attrIndex, 'key', event.target.value)
                            }
                            placeholder="Key (e.g. color)"
                          />
                          <input
                            type="text"
                            value={attr.value}
                            onChange={(event) =>
                              handleVariantAttributeChange(index, attrIndex, 'value', event.target.value)
                            }
                            placeholder="Value (e.g. Black)"
                          />
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={() => handleRemoveVariantAttribute(index, attrIndex)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              </>
              ) : null}
            </div>
            <div className="form-actions product-form-submit">
              <button type="button" className="ghost-btn" onClick={handleCloseForm}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update product' : 'Save'}
              </button>
            </div>
        </form>
      ) : null}
      {showViewOnly ? (
        <div className="product-view-shell gsc-product-view-shell">
          <div className="panel card product-view-card gsc-product-view-frame">
            {selectedProduct ? (
              <>
                <div className="gsc-product-view-topbar">
                  <button
                    type="button"
                    className="gsc-product-view-back"
                    onClick={() => {
                      setShowViewActionMenu(false);
                      handleBackToList();
                    }}
                  >
                    <span className="gsc-product-view-back-icon" aria-hidden="true">
                      ‹
                    </span>
                    <span>Back</span>
                  </button>
                  <div className="gsc-product-view-menu-shell" ref={viewActionMenuRef}>
                    <button
                      type="button"
                      className="gsc-product-view-menu-trigger"
                      aria-label="Open product actions"
                      aria-expanded={showViewActionMenu}
                      onClick={() => setShowViewActionMenu((prev) => !prev)}
                    >
                      {ACTION_ICONS.more}
                    </button>
                    {showViewActionMenu ? (
                      <div className="gsc-product-view-menu-panel">
                        <button
                          type="button"
                          className="gsc-product-view-menu-item"
                          onClick={() => {
                            setShowViewActionMenu(false);
                            handleOpenEditForm();
                          }}
                          disabled={disableEdit}
                        >
                          <span className="gsc-product-view-menu-icon edit">{ACTION_ICONS.edit}</span>
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="gsc-product-view-menu-item delete"
                          onClick={() => handleDelete(selectedProduct.id)}
                          disabled={isLoading}
                        >
                          <span className="gsc-product-view-menu-icon delete">{ACTION_ICONS.trash}</span>
                          <span>Delete</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="product-view-tabs">
                  {productViewTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={`product-view-tab ${resolvedProductViewTab === tab.key ? 'active' : ''}`}
                      onClick={() => setActiveProductViewTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="gsc-product-view-body">{renderProductViewBody()}</div>
              </>
            ) : (
              <p className="empty-state">
                {isLoading ? 'Loading product details...' : 'Product details not available.'}
              </p>
            )}
          </div>
        </div>
      ) : null}
      {showChangeRequestModal ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card product-review-modal">
            <div className="modal-head">
              <div>
                <h3 className="panel-title">Request Changes</h3>
                <p className="panel-subtitle">
                  Send structured feedback to the business. This note will be shown in the app.
                </p>
              </div>
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => setShowChangeRequestModal(false)}
              >
                Close
              </button>
            </div>

            <div className="product-review-modal-body">
              <div className="product-review-modal-section">
                <p className="product-review-section-title">Requested updates</p>
                <div className="review-issue-grid">
                  {CHANGE_REQUEST_OPTIONS.map((item) => {
                    const active = changeRequestForm.issues.includes(item.key);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={`review-issue-chip ${active ? 'active' : ''}`}
                        onClick={() =>
                          setChangeRequestForm((prev) => ({
                            ...prev,
                            issues: active
                              ? prev.issues.filter((entry) => entry !== item.key)
                              : [...prev.issues, item.key],
                          }))
                        }
                      >
                        <span className="review-issue-chip-title">{item.label}</span>
                        <span className="review-issue-chip-hint">{item.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {missingRequiredDynamicFields.length > 0 ? (
                <div className="product-review-modal-section">
                  <p className="product-review-section-title">Missing required dynamic fields</p>
                  <div className="tag-row">
                    {missingRequiredDynamicFields.map((field) => (
                      <span key={field} className="tag warning">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="product-review-modal-section">
                <label className="field field-span">
                  <span>Admin note</span>
                  <textarea
                    rows={5}
                    placeholder="Describe exactly what the business needs to update before resubmitting."
                    value={changeRequestForm.note}
                    onChange={(event) =>
                      setChangeRequestForm((prev) => ({
                        ...prev,
                        note: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="product-review-modal-section">
                <p className="product-review-section-title">Preview</p>
                <div className="review-note-box">
                  <pre>
                    {buildChangeRequestRemarks({
                      issues: changeRequestForm.issues,
                      note: changeRequestForm.note,
                      missingFields: missingRequiredDynamicFields,
                    }) || 'Add requested updates or an admin note to build the review message.'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="ghost-btn small" onClick={() => setShowChangeRequestModal(false)}>
                Cancel
              </button>
              <button type="button" className="primary-btn compact" onClick={handleSubmitChangeRequest} disabled={isLoading}>
                Send Change Request
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {!isViewing && !showForm ? (
        <div className="panel card users-table-card">
          <div className="gsc-datatable-toolbar">
            <div className="gsc-datatable-toolbar-left">
              <button type="button" className="gsc-toolbar-btn" title="Filter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h10M4 18h6" />
                </svg>
                Filter
              </button>
              <button type="button" className="gsc-toolbar-btn" title="Columns">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="18" rx="1" />
                  <rect x="14" y="3" width="7" height="18" rx="1" />
                </svg>
                Columns
              </button>
              <button type="button" className="gsc-toolbar-btn" title="Import/Export">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Import/Export
              </button>
            </div>
            <div className="gsc-datatable-toolbar-right">
              <div className="gsc-toolbar-search">
                <input
                  type="search"
                  placeholder="Search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search products"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <button
                type="button"
                className="gsc-create-btn"
                onClick={handleOpenCreateForm}
                title="Create product"
                aria-label="Create product"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>
          <div className="users-search" style={{ display: 'none' }}>
            <span className="icon icon-search" />
            <input
              type="search"
              placeholder="Search products by name, brand, or business..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button type="button" className="ghost-btn small" onClick={() => setQuery('')}>
                Clear
              </button>
            ) : null}
          </div>

          {filteredProducts.length === 0 ? (
            <p className="empty-state">No products found.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table users-table product-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        className="select-checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all products"
                      />
                    </th>
                    <th>Image</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Business</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>UOM</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const statusValue = product?.approvalStatus || '';
                    const statusClass = `status-pill ${
                      statusValue ? statusValue.toLowerCase().replace(/_/g, '-') : 'pending'
                    }`;
                    const hasFullCategoryPath = Boolean(
                      product?.category?.mainCategoryId && product?.category?.categoryId && product?.category?.subCategoryId
                    );
                    const categoryParts = formatCategoryParts(product?.category);
                    const updatedAt = product?.updatedOn || product?.updated_on || product?.createdOn;
                    const productCode = product?.sku || product?.productCode || `PRD-${product?.id || product?.productId || '-'}`;
                    const brandLabel = product?.brandName || 'Unbranded';
                    const uomLabel = product?.baseUomName || 'UOM not set';
                      return (
                        <tr
                          key={product?.id || product?.productId}
                          className="table-row-clickable"
                          onClick={() => handleViewProduct(product.id)}
                        >
                        <td>
                          <input
                            type="checkbox"
                            className="select-checkbox"
                            checked={product?.id ? selectedIds.has(product.id) : false}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => toggleSelect(product?.id)}
                            aria-label={`Select ${product?.productName || 'product'}`}
                          />
                        </td>
                        <td>
                          <div className="product-image-cell">
                            <ProductTableThumbnail
                              imageUrl={getPrimaryProductImage(product)}
                              alt={product?.productName || 'Product'}
                            />
                          </div>
                        </td>
                        <td>
                          <span className="product-table-code">{productCode}</span>
                        </td>
                        <td>
                          <p className="user-name">{product?.productName || '-'}</p>
                        </td>
                        <td>
                          <span className="product-table-primary">{product?.businessName || '-'}</span>
                        </td>
                        <td>
                          <span className="product-table-primary">{categoryParts.primary}</span>
                        </td>
                        <td>
                          <span className="product-table-primary">{brandLabel}</span>
                        </td>
                        <td>
                          <span className="product-table-primary">{uomLabel}</span>
                        </td>
                        <td>
                          <span className="product-price-main">
                            {product?.mrp !== null && product?.mrp !== undefined && product?.mrp !== ''
                              ? formatPrice(product.mrp, product?.currency)
                              : '-'}
                          </span>
                        </td>
                        <td>
                          <span className={statusClass}>{formatStatus(statusValue)}</span>
                        </td>
                        <td>
                          <span className="product-table-primary">{formatDateTime(updatedAt)}</span>
                        </td>
                        <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="product-table-action-menu" ref={openProductActionId === (product?.id || product?.productId) ? productActionMenuRef : null}>
                            <button
                              type="button"
                              className="icon-btn product-table-action-trigger"
                              aria-label="Actions"
                              aria-expanded={openProductActionId === (product?.id || product?.productId)}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenProductActionId((prev) => (prev === (product?.id || product?.productId) ? null : (product?.id || product?.productId)));
                              }}
                            >
                              {ACTION_ICONS.more}
                            </button>
                            {openProductActionId === (product?.id || product?.productId) ? (
                              <div className="product-table-action-dropdown">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenProductActionId(null);
                                    handleViewProduct(product.id);
                                  }}
                                >
                                  <span className="gsc-product-view-menu-icon view">{ACTION_ICONS.view}</span>
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenProductActionId(null);
                                    navigate(`/admin/products/${product.id}/edit`);
                                  }}
                                >
                                  <span className="gsc-product-view-menu-icon edit">{ACTION_ICONS.edit}</span>
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenProductActionId(null);
                                    handleDelete(product.id);
                                  }}
                                >
                                  <span className="gsc-product-view-menu-icon delete">{ACTION_ICONS.trash}</span>
                                  Delete
                                </button>
                                {['PENDING_REVIEW', 'CHANGES_REQUIRED'].includes(String(statusValue || '').toUpperCase()) ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={!hasFullCategoryPath}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenProductActionId(null);
                                        handleRowStatusUpdate(product.id, 'APPROVED');
                                      }}
                                    >
                                      <span className="gsc-product-view-menu-icon approve">{ACTION_ICONS.approve}</span>
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenProductActionId(null);
                                        handleRowStatusUpdate(product.id, 'CHANGES_REQUIRED');
                                      }}
                                    >
                                      <span className="gsc-product-view-menu-icon request-changes">{ACTION_ICONS.requestChanges}</span>
                                      Request changes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenProductActionId(null);
                                        handleRowStatusUpdate(product.id, 'REJECTED');
                                      }}
                                    >
                                      <span className="gsc-product-view-menu-icon reject">{ACTION_ICONS.reject}</span>
                                      Reject
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default ProductPage;
