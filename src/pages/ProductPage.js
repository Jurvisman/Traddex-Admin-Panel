import { useEffect, useMemo, useRef, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components';
import {
  createProduct,
  createUom,
  deleteProduct,
  deleteProductsBulk,
  deleteUom,
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

const createUomEntry = () => ({ uomId: '', conversionFactor: '' });
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
  baseUomId: '',
  purchaseUoms: [],
  salesUoms: [],
  variants: [],
};

const createReviewForm = () => ({
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
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [activeProductViewTab, setActiveProductViewTab] = useState('overview');
  const didInitRef = useRef(false);
  const mediaInputRef = useRef(null);
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

  const formatCategory = (category) => {
    if (!category) return '-';
    const parts = [category.mainCategoryName, category.categoryName, category.subCategoryName].filter(Boolean);
    return parts.length ? parts.join(' / ') : '-';
  };

  const formatCategoryParts = (category) => {
    if (!category) return { primary: '-', secondary: '' };
    const primary =
      category.mainCategoryName || category.categoryName || category.subCategoryName || '-';
    const secondary = [category.categoryName, category.subCategoryName]
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

  const formatUomLabel = (uom) => {
    if (!uom) return '';
    return uom.uomCode ? `${uom.uomName} (${uom.uomCode})` : uom.uomName;
  };

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
    setActiveProductViewTab('overview');
  }, [showViewOnly, selectedProductId]);

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
    const mainId = form.mainCategoryId ? Number(form.mainCategoryId) : null;
    const categoryId = form.categoryId ? Number(form.categoryId) : null;
    const subCategoryId = form.subCategoryId ? Number(form.subCategoryId) : null;
    loadAttributeMappings(mainId, categoryId, subCategoryId).catch((error) => {
      setMessage({ type: 'error', text: error.message || 'Failed to load attribute mappings.' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.mainCategoryId, form.categoryId, form.subCategoryId]);

  const handleChange = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'mainCategoryId') {
        next.categoryId = '';
        next.subCategoryId = '';
      }
      if (key === 'categoryId') {
        next.subCategoryId = '';
      }
      if (key === 'baseUomId') {
        const syncEntries = (entries) =>
          entries.map((entry) => {
            if (!entry.uomId) return entry;
            if (value && entry.uomId === value) {
              return { ...entry, conversionFactor: '1' };
            }
            if (entry.conversionFactor === '1') {
              return { ...entry, conversionFactor: '' };
            }
            return entry;
          });
        next.purchaseUoms = syncEntries(next.purchaseUoms);
        next.salesUoms = syncEntries(next.salesUoms);
      }
      return next;
    });
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
      return { ...prev, [listKey]: nextList };
    });
  };

  const handleAddUomEntry = (type) => {
    setForm((prev) => {
      const listKey = type === 'purchase' ? 'purchaseUoms' : 'salesUoms';
      if (prev[listKey].length >= 3) return prev;
      return { ...prev, [listKey]: [...prev[listKey], createUomEntry()] };
    });
  };

  const handleRemoveUomEntry = (type, index) => {
    setForm((prev) => {
      const listKey = type === 'purchase' ? 'purchaseUoms' : 'salesUoms';
      const nextList = prev[listKey].filter((_, itemIndex) => itemIndex !== index);
      return { ...prev, [listKey]: nextList };
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
      baseUomId: product.baseUomId ? String(product.baseUomId) : '',
      purchaseUoms: Array.isArray(product.purchaseUoms)
        ? product.purchaseUoms.map((entry) => ({
            uomId: entry.uomId ? String(entry.uomId) : '',
            conversionFactor:
              entry.conversionFactor !== null && entry.conversionFactor !== undefined
                ? String(entry.conversionFactor)
                : '',
          }))
        : [],
      salesUoms: Array.isArray(product.salesUoms)
        ? product.salesUoms.map((entry) => ({
            uomId: entry.uomId ? String(entry.uomId) : '',
            conversionFactor:
              entry.conversionFactor !== null && entry.conversionFactor !== undefined
                ? String(entry.conversionFactor)
                : '',
          }))
        : [],
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
    setShowForm(true);
  };

  const handleOpenCreateForm = () => {
    setEditingProductId(null);
    setForm(initialForm);
    setAttributeMappings([]);
    setDynamicValues({});
    setShowForm(true);
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
      !form.subCategoryId ||
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
        subCategoryId: Number(form.subCategoryId),
        sellingPrice: Number(form.sellingPrice),
        mrp: Number(form.mrp),
        gstRate: Number(form.gstRate),
      };
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
      if (hasUomPayload) {
        payload.baseUomId = Number(form.baseUomId);
        payload.purchaseUoms = purchaseUoms;
        payload.salesUoms = salesUoms;
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

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      await loadProducts();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load products.' });
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
      setIsLoading(true);
      await deleteProduct(token, id);
      await loadProducts();
      setMessage({ type: 'success', text: 'Product deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete product.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    const ok = window.confirm(`Delete ${selectedIds.size} products? This will remove them from the list.`);
    if (!ok) return;
    try {
      setIsBulkDeleting(true);
      await deleteProductsBulk(token, Array.from(selectedIds));
      await loadProducts();
      setMessage({ type: 'success', text: 'Products deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete products.' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSaveReviewCategory = async () => {
    if (!selectedProductId) return;
    const adminId = getAdminId();
    if (!adminId) return;
    if (!reviewCategoryComplete) {
      setMessage({ type: 'error', text: 'Select main category, category, and sub-category first.' });
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
      setMessage({ type: 'error', text: 'Assign main category, category, and sub-category before requesting changes.' });
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
        setMessage({ type: 'error', text: 'Assign main category, category, and sub-category before approval.' });
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
  const statusClass = `status-pill ${statusValue ? statusValue.toLowerCase().replace(/_/g, '-') : 'pending'}`;
  const productPreviewUrl = resolveMediaUrl(form.thumbnailImage || getPrimaryProductImage(selectedProduct));
  const productGalleryPreview = parseList(form.galleryImagesText).map(resolveMediaUrl).filter(Boolean);
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
    { key: 'overview', label: 'Overview' },
    { key: 'commerce', label: 'Pricing & Inventory' },
    { key: 'variants', label: `Variants (${variants.length})` },
    { key: 'content', label: 'Descriptions' },
    { key: 'dynamic', label: 'Dynamic Fields', visible: dynamicViewGroups.length > 0 },
  ].filter((tab) => tab.visible !== false);
  const resolvedProductViewTab = productViewTabs.some((tab) => tab.key === activeProductViewTab)
    ? activeProductViewTab
    : productViewTabs[0]?.key || 'overview';
  const totalProducts = products.length;
  const approvedCount = products.filter(
    (product) => String(product?.approvalStatus || '').toUpperCase() === 'APPROVED'
  ).length;
  const rejectedCount = products.filter(
    (product) => String(product?.approvalStatus || '').toUpperCase() === 'REJECTED'
  ).length;
  const changesRequiredCount = products.filter(
    (product) => String(product?.approvalStatus || '').toUpperCase() === 'CHANGES_REQUIRED'
  ).length;
  const pendingCount = Math.max(0, totalProducts - approvedCount - rejectedCount - changesRequiredCount);
  const selectableIds = filteredProducts.map((product) => product?.id).filter(Boolean);
  const selectedCount = selectedIds.size;
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const selectedProductPrimaryImage = selectedProduct
    ? resolveMediaUrl(getPrimaryProductImage(selectedProduct))
    : '';
  const selectedProductGallery = selectedProduct
    ? getProductGalleryUrls(selectedProduct).map(resolveMediaUrl).filter(Boolean)
    : [];
  const reviewCategoryComplete = Boolean(
    reviewForm.mainCategoryId && reviewForm.categoryId && reviewForm.subCategoryId
  );
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
      detail: reviewCategoryComplete ? 'Main, category, and sub-category selected' : 'Select all three levels',
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

  return (
    <div className="users-page product-page">
      {showViewOnly ? (
        <div className="panel-head product-view-head">
          <div className="product-view-title">
            <button type="button" className="ghost-btn small" onClick={handleBackToList}>
              Back
            </button>
            <div className="product-title-wrap">
              <h2 className="product-title">{selectedProduct?.productName || 'Product'}</h2>
              <p className="product-subtitle">{selectedProduct?.sku || 'SKU unavailable'}</p>
              <span className={`status-pill product-status-pill ${statusValue ? statusValue.toLowerCase().replace(/_/g, '-') : 'pending'}`}>
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="inline-row product-view-actions">
            <span className="muted">Use the review workspace to moderate this product.</span>
            <button type="button" className="ghost-btn small" onClick={handleOpenEditForm} disabled={disableEdit}>
              Edit
            </button>
          </div>
        </div>
      ) : (
        <div className="users-head">
          <div>
            <h2 className="panel-title">Products</h2>
            <p className="panel-subtitle">Create and manage products for businesses.</p>
          </div>
          <div className="users-head-actions">
            {!showForm ? (
              <>
                <button type="button" className="ghost-btn" onClick={handleRefresh} disabled={isLoading}>
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting || selectedCount === 0}
                >
                  Delete Selected{selectedCount ? ` (${selectedCount})` : ''}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="primary-btn"
              onClick={showForm ? handleCloseForm : handleOpenCreateForm}
            >
              {showForm ? 'Back to list' : 'Create'}
            </button>
          </div>
        </div>
      )}
      <Banner message={message} />
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleMediaFiles}
        style={{ display: 'none' }}
      />
      {!isViewing && !showForm ? (
        <>
          <div className="stat-grid">
            <div className="stat-card admin-stat" style={{ '--stat-accent': '#14B8A6' }}>
              <p className="stat-label">Total products</p>
              <p className="stat-value">{totalProducts}</p>
              <p className="stat-sub">All listings</p>
            </div>
            <div className="stat-card admin-stat" style={{ '--stat-accent': '#16A34A' }}>
              <p className="stat-label">Approved</p>
              <p className="stat-value">{approvedCount}</p>
              <p className="stat-sub">Live products</p>
            </div>
            <div className="stat-card admin-stat" style={{ '--stat-accent': '#F59E0B' }}>
              <p className="stat-label">Pending</p>
              <p className="stat-value">{pendingCount}</p>
              <p className="stat-sub">Needs review</p>
            </div>
            <div className="stat-card admin-stat" style={{ '--stat-accent': '#8B5CF6' }}>
              <p className="stat-label">Changes Required</p>
              <p className="stat-value">{changesRequiredCount}</p>
              <p className="stat-sub">Awaiting business fixes</p>
            </div>
            <div className="stat-card admin-stat" style={{ '--stat-accent': '#EF4444' }}>
              <p className="stat-label">Rejected</p>
              <p className="stat-value">{rejectedCount}</p>
              <p className="stat-sub">Declined items</p>
            </div>
          </div>
          <div className="users-filters">
            <span className="status-chip approved">{approvedCount} Approved</span>
            <span className="status-chip pending">{pendingCount} Pending</span>
            <span className="status-chip changes-required">{changesRequiredCount} Changes Required</span>
            <span className="status-chip rejected">{rejectedCount} Rejected</span>
          </div>
        </>
      ) : null}
      {showForm ? (
        <form className="panel card product-form" onSubmit={handleSubmit}>
            <div className="panel-split">
              <h3 className="panel-subheading">{isEditing ? 'Edit product' : 'Create product'}</h3>
              <button type="button" className="ghost-btn small" onClick={handleCloseForm}>
                Back to list
              </button>
            </div>
            <div className="field-grid form-grid">
              <div className="field-span section-heading">
                <h4 className="panel-subheading">Basic information</h4>
              </div>
              <label className="field">
                <span>Product name</span>
                <input
                  type="text"
                  value={form.productName}
                  onChange={(event) => handleChange('productName', event.target.value)}
                  placeholder="Product name"
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
              <label className="field field-span">
                <span>Short description</span>
                <input
                  type="text"
                  value={form.shortDescription}
                  onChange={(event) => handleChange('shortDescription', event.target.value)}
                  placeholder="Short description"
                />
              </label>
              <div className="field-span section-heading">
                <h4 className="panel-subheading">Media</h4>
              </div>
              <div className="field-span product-media-editor">
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
                      className="ghost-btn small"
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
                      className="ghost-btn small"
                      onClick={() => openMediaUpload({ kind: 'product', field: 'galleryImagesText' })}
                      disabled={isUploadingMedia}
                    >
                      {isUploadingMedia && mediaTarget?.kind === 'product' && mediaTarget?.field === 'galleryImagesText'
                        ? 'Uploading...'
                        : 'Add gallery images'}
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
              {!isEditing ? (
                <label className="field">
                  <span>Business user ID (optional)</span>
                  <input
                    type="number"
                    value={form.userId}
                    onChange={(event) => handleChange('userId', event.target.value)}
                    placeholder="User ID"
                  />
                </label>
              ) : null}
              <div className="field-span section-heading">
                <h4 className="panel-subheading">Category &amp; subcategory</h4>
              </div>
              <label className="field">
                <span>Main category</span>
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
                <span>Category</span>
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
                  required
                >
                  <option value="">Select sub-category</option>
                  {subCategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field-span section-heading">
                <h4 className="panel-subheading">Pricing</h4>
              </div>
              <label className="field">
                <span>Selling price</span>
                <input
                  type="number"
                  value={form.sellingPrice}
                  onChange={(event) => handleChange('sellingPrice', event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>
              <label className="field">
                <span>MRP</span>
                <input
                  type="number"
                  value={form.mrp}
                  onChange={(event) => handleChange('mrp', event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>
              <label className="field">
                <span>GST rate</span>
                <input
                  type="number"
                  value={form.gstRate}
                  onChange={(event) => handleChange('gstRate', event.target.value)}
                  placeholder="18"
                  required
                />
              </label>
              <div className="field-span section-heading">
                <h4 className="panel-subheading">Units of measure</h4>
              </div>
              <div className="field-span">
                <div className="panel-grid form-panel-grid">
                  <div className="panel card">
                    <h4 className="panel-subheading">UOM setup</h4>
                    <div className="field-grid">
                      <label className="field field-span">
                        <span>Base UOM</span>
                        <select
                          value={form.baseUomId}
                          onChange={(event) => handleChange('baseUomId', event.target.value)}
                          disabled={uoms.length === 0}
                        >
                          <option value="">Select base unit</option>
                          {uoms.map((item) => (
                            <option key={item.id} value={item.id}>
                              {formatUomLabel(item)}
                            </option>
                          ))}
                        </select>
                        <span className="field-help">
                          {uoms.length === 0
                            ? 'No UOMs available. Add units in the UOM library to enable selection.'
                            : 'Used as the canonical unit for all conversions; selling price is per base UOM.'}
                        </span>
                      </label>
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
                                <div className="inline-row" key={`purchase-${index}`}>
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
                              className="ghost-btn small"
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
                                <div className="inline-row" key={`sales-${index}`}>
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
                              className="ghost-btn small"
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
                  <div className="panel card">
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
                        <div className="inline-row" key={`variant-${index}-attr-${attrIndex}`}>
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
              <div className="field-span section-heading">
                <h4 className="panel-subheading">Dynamic fields</h4>
              </div>
              {attributeMappings.length === 0 ? (
                <div className="field-span">
                  <p className="muted">Select a category to load dynamic fields.</p>
                </div>
              ) : (
                attributeMappings.map((mapping) => {
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
                })
              )}
            </div>
            <div className="form-actions">
              <button type="submit" className="primary-btn" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update product' : 'Save product'}
              </button>
            </div>
        </form>
      ) : null}
      {showViewOnly ? (
        <div className="product-view-shell">
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
          <div className="panel-grid product-view-grid">
            {selectedProduct ? (
              <>
              <div className="product-review-primary">
              {resolvedProductViewTab === 'overview' ? (
              <div className="panel card product-view-card product-view-card-overview">
                <div className="panel-split">
                  <h3 className="panel-subheading">Overview</h3>
                  <span className={`${statusClass} product-status-pill compact`}>{statusLabel}</span>
                </div>
                <div className="product-overview-top">
                  <div className="product-overview-copy">
                    <span className="product-overview-kicker">Catalog product</span>
                    <h4 className="product-overview-name">
                      {selectedProduct.productName || 'Unnamed product'}
                    </h4>
                    <p className="product-overview-path">{formatCategory(selectedProduct.category)}</p>
                    <div className="product-overview-meta">
                      <span className="product-overview-chip">
                        ID {formatValue(selectedProduct.id)}
                      </span>
                      <span className="product-overview-chip">
                        {selectedProduct.brandName || 'Unbranded'}
                      </span>
                      <span className="product-overview-chip">
                        {selectedProduct.productType || 'Unspecified type'}
                      </span>
                    </div>
                  </div>
                  {selectedProductPrimaryImage ? (
                    <div className="product-view-hero-media">
                      <div className="product-view-hero-image">
                        <img
                          src={selectedProductPrimaryImage}
                          alt={selectedProduct.productName || 'Product'}
                        />
                      </div>
                      {selectedProductGallery.length > 1 ? (
                        <div className="media-thumb-grid">
                          {selectedProductGallery.slice(1, 5).map((image, index) => (
                            <div className="media-thumb" key={`${image}-${index}`}>
                              <img src={image} alt={`Product media ${index + 1}`} />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="field-grid">
                  <div className="field">
                    <span>Product ID</span>
                    <p className="field-value">{formatValue(selectedProduct.id)}</p>
                  </div>
                  <div className="field">
                    <span>SKU</span>
                    <p className="field-value">{formatValue(selectedProduct.sku)}</p>
                  </div>
                  <div className="field">
                    <span>Brand</span>
                    <p className="field-value">{formatValue(selectedProduct.brandName)}</p>
                  </div>
                  <div className="field">
                    <span>Business</span>
                    <p className="field-value">{formatValue(selectedProduct.businessName)}</p>
                  </div>
                  <div className="field">
                    <span>Category</span>
                    <p className="field-value">{formatCategory(selectedProduct.category)}</p>
                  </div>
                  <div className="field">
                    <span>Product type</span>
                    <p className="field-value">{formatValue(selectedProduct.productType)}</p>
                  </div>
                  <div className="field">
                    <span>Created</span>
                    <p className="field-value">{formatDateTime(selectedProduct.createdOn)}</p>
                  </div>
                  <div className="field">
                    <span>Updated</span>
                    <p className="field-value">{formatDateTime(selectedProduct.updatedOn)}</p>
                  </div>
                </div>
              </div>
              ) : null}
              {resolvedProductViewTab === 'commerce' ? (
              <>
              <div className="panel card product-view-card product-view-card-pricing">
                <h3 className="panel-subheading">Pricing</h3>
                <div className="field-grid">
                  <div className="field">
                    <span>Selling price</span>
                    <p className="field-value">{formatValue(selectedProduct.sellingPrice)}</p>
                  </div>
                  <div className="field">
                    <span>MRP</span>
                    <p className="field-value">{formatValue(selectedProduct.mrp)}</p>
                  </div>
                  <div className="field">
                    <span>GST rate</span>
                    <p className="field-value">{formatValue(selectedProduct.gstRate)}</p>
                  </div>
                  <div className="field">
                    <span>Currency</span>
                    <p className="field-value">{formatValue(selectedProduct.currency)}</p>
                  </div>
                  <div className="field">
                    <span>B2B price</span>
                    <p className="field-value">{formatValue(selectedProduct.b2bPrice)}</p>
                  </div>
                  <div className="field">
                    <span>Minimum order qty</span>
                    <p className="field-value">{formatValue(selectedProduct.minimumOrderQuantity)}</p>
                  </div>
                </div>
              </div>
              <div className="panel card product-view-card product-view-card-uom">
                <h3 className="panel-subheading">Units of measure</h3>
                <div className="field-grid">
                  <div className="field">
                    <span>Base UOM</span>
                    <p className="field-value">{formatValue(selectedProduct.baseUomName)}</p>
                  </div>
                  <div className="field field-span">
                    <span>Purchase UOMs</span>
                    {selectedProduct.purchaseUoms && selectedProduct.purchaseUoms.length > 0 ? (
                      <div className="tag-row">
                        {selectedProduct.purchaseUoms.map((entry, index) => (
                          <span className="tag" key={`purchase-${entry.uomId || index}`}>
                            {formatUomEntry(entry, false)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="field-value">-</p>
                    )}
                  </div>
                  <div className="field field-span">
                    <span>Sales UOMs</span>
                    {selectedProduct.salesUoms && selectedProduct.salesUoms.length > 0 ? (
                      <div className="tag-row">
                        {selectedProduct.salesUoms.map((entry, index) => (
                          <span className="tag" key={`sales-${entry.uomId || index}`}>
                            {formatUomEntry(entry, true)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="field-value">-</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="panel card product-view-card product-view-card-inventory">
                <h3 className="panel-subheading">Inventory &amp; shipping</h3>
                <div className="field-grid">
                  <div className="field">
                    <span>SKU</span>
                    <p className="field-value">{formatValue(selectedProduct.sku)}</p>
                  </div>
                  <div className="field">
                    <span>Stock quantity</span>
                    <p className="field-value">{formatValue(selectedProduct.stockQuantity)}</p>
                  </div>
                  <div className="field">
                    <span>Warehouse</span>
                    <p className="field-value">{formatValue(selectedProduct.warehouseLocation)}</p>
                  </div>
                  <div className="field">
                    <span>Shipping available</span>
                    <p className="field-value">{formatValue(selectedProduct.shippingAvailable)}</p>
                  </div>
                  <div className="field">
                    <span>Shipping type</span>
                    <p className="field-value">{formatValue(selectedProduct.shippingType)}</p>
                  </div>
                  <div className="field">
                    <span>Return policy</span>
                    <p className="field-value">{formatValue(selectedProduct.returnPolicy)}</p>
                  </div>
                </div>
              </div>
              </>
              ) : null}
              {resolvedProductViewTab === 'variants' ? (
              <div className="panel card product-view-card product-view-card-variants">
                <div className="panel-split">
                  <h3 className="panel-subheading">Variants</h3>
                  <span className="muted">{variants.length} total</span>
                </div>
                {variants.length === 0 ? (
                  <p className="empty-state">No variants submitted.</p>
                ) : (
                  <div className="variant-grid">
                    {variants.map((variant, index) => {
                      const variantStatus = variant?.approvalStatus || '';
                      const variantStatusClass = `status-pill ${
                        variantStatus ? variantStatus.toLowerCase().replace(/_/g, '-') : 'pending'
                      }`;
                      const variantTitle =
                        variant?.variantName || variant?.sku || `Variant ${index + 1}`;
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
                              <p className="field-value">{formatValue(variant?.sellingPrice)}</p>
                            </div>
                            <div className="field">
                              <span>MRP</span>
                              <p className="field-value">{formatValue(variant?.mrp)}</p>
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
                )}
              </div>
              ) : null}
              {resolvedProductViewTab === 'content' ? (
              <div className="panel card product-view-card product-view-card-descriptions">
                <h3 className="panel-subheading">Descriptions</h3>
                <div className="field-grid">
                  <div className="field field-span">
                    <span>Short description</span>
                    <p className="field-value">{formatValue(selectedProduct.shortDescription)}</p>
                  </div>
                  <div className="field field-span">
                    <span>Long description</span>
                    <p className="field-value">{formatValue(selectedProduct.longDescription)}</p>
                  </div>
                </div>
              </div>
              ) : null}
              {resolvedProductViewTab === 'dynamic' ? (
              <div className="panel card product-view-card product-view-card-dynamic">
                <h3 className="panel-subheading">Dynamic fields</h3>
                {dynamicViewGroups.length === 0 ? (
                  <p className="empty-state">No dynamic fields provided.</p>
                ) : (
                  <div className="field-grid">
                    {dynamicViewGroups.map((group) => (
                      <div className="field field-span" key={group.id}>
                        <span className="field-label">{group.label}</span>
                        <div className="field-grid">
                          {group.items.map((entry) => {
                            const hasUnit =
                              entry.unit &&
                              entry.label &&
                              !String(entry.label).toLowerCase().includes(String(entry.unit).toLowerCase());
                            const label = hasUnit ? `${entry.label} (${entry.unit})` : entry.label;
                            return (
                              <div className="field" key={`${group.id}-${label}`}>
                                <span>{label}</span>
                                <p className="field-value">{entry.value}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              ) : null}
              </div>
              <aside className="panel card product-review-sidebar">
                <div className="panel-split">
                  <div>
                    <h3 className="panel-subheading">Review workspace</h3>
                    <p className="product-review-sidebar-title">Moderation controls</p>
                  </div>
                  <span className={`${statusClass} product-status-pill compact`}>{statusLabel}</span>
                </div>

                <div className="product-review-section">
                  <div className="panel-split">
                    <div>
                      <p className="product-review-section-title">Category assignment</p>
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
                        <option value="">Select sub-category</option>
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

                <div className="product-review-section">
                  <p className="product-review-section-title">Review checklist</p>
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

                <div className="product-review-section">
                  <p className="product-review-section-title">Current review note</p>
                  <div className="review-note-box">
                    {selectedProduct.reviewRemarks ? (
                      <pre>{selectedProduct.reviewRemarks}</pre>
                    ) : (
                      <p>No review note has been sent to the business yet.</p>
                    )}
                  </div>
                </div>

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
              </aside>
              </>
            ) : (
              <div className="panel card">
                <p className="empty-state">
                  {isLoading ? 'Loading product details...' : 'Product details not available.'}
                </p>
              </div>
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
          <div className="users-search">
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
                <colgroup>
                  <col style={{ width: '48px' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '208px' }} />
                </colgroup>
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
                    <th>Product</th>
                    <th>Business</th>
                    <th>Category</th>
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
                          <div className="product-row-main">
                            <ProductTableThumbnail
                              imageUrl={getPrimaryProductImage(product)}
                              alt={product?.productName || 'Product'}
                            />
                            <div className="product-row-copy">
                              <p className="user-name">{product?.productName || '-'}</p>
                              <p className="product-row-meta">{product?.brandName || 'Unbranded'}</p>
                              <p className="product-row-sku">{product?.sku || 'SKU unavailable'}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="product-table-stack">
                            <span className="product-table-primary">{product?.businessName || '-'}</span>
                            <span className="product-table-secondary">
                              {product?.productType || 'Product'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="product-table-stack">
                            <span className="product-table-primary">{categoryParts.primary}</span>
                            <span className="product-table-secondary">
                              {categoryParts.secondary || 'No subcategory mapped'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="product-price-cell">
                            <span className="product-price-main">
                              {formatPrice(product?.sellingPrice, product?.currency)}
                            </span>
                            <span className="product-price-sub">
                              {product?.mrp !== null && product?.mrp !== undefined && product?.mrp !== ''
                                ? `MRP ${formatPrice(product?.mrp, product?.currency)}`
                                : formatValue(product?.baseUomName || product?.currency || '-')}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={statusClass}>{formatStatus(statusValue)}</span>
                        </td>
                        <td>
                          <div className="product-table-stack product-updated-cell">
                            <span className="product-table-primary">{formatDateOnly(updatedAt)}</span>
                            <span className="product-table-secondary">{formatTimeOnly(updatedAt)}</span>
                          </div>
                        </td>
                        <td className="table-actions">
                          <div className="table-action-group">
                            <button
                              type="button"
                              className="icon-btn view"
                              aria-label="View product"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleViewProduct(product.id);
                              }}
                            >
                              {ACTION_ICONS.view}
                            </button>
                            <button
                              type="button"
                              className="icon-btn edit"
                              aria-label="Edit product"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/admin/products/${product.id}/edit`);
                              }}
                            >
                              {ACTION_ICONS.edit}
                            </button>
                            <button
                              type="button"
                              className="icon-btn delete"
                              aria-label="Delete product"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(product.id);
                              }}
                            >
                              {ACTION_ICONS.trash}
                            </button>
                            {['PENDING_REVIEW', 'CHANGES_REQUIRED'].includes(String(statusValue || '').toUpperCase()) ? (
                              <>
                                <button
                                  type="button"
                                  className="icon-btn approve"
                                  aria-label="Approve product"
                                  disabled={!hasFullCategoryPath}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleRowStatusUpdate(product.id, 'APPROVED');
                                  }}
                                >
                                  {ACTION_ICONS.approve}
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn request-changes"
                                  aria-label="Request changes"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleRowStatusUpdate(product.id, 'CHANGES_REQUIRED');
                                  }}
                                >
                                  {ACTION_ICONS.requestChanges}
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn reject"
                                  aria-label="Reject product"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleRowStatusUpdate(product.id, 'REJECTED');
                                  }}
                                >
                                  {ACTION_ICONS.reject}
                                </button>
                              </>
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
