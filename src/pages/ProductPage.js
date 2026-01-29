import { useEffect, useMemo, useRef, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listAttributeDefinitions,
  listAttributeMappings,
  listCategories,
  listMainCategories,
  listProducts,
  listSubCategories,
  listUoms,
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

const initialForm = {
  productName: '',
  brandName: '',
  shortDescription: '',
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

function ProductPage({ token, adminUserId }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mainCategories, setMainCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [attributeDefinitions, setAttributeDefinitions] = useState([]);
  const [attributeMappings, setAttributeMappings] = useState([]);
  const [dynamicValues, setDynamicValues] = useState({});
  const [uoms, setUoms] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const didInitRef = useRef(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const editMatch = useMatch('/admin/products/:id/edit');

  const definitionById = useMemo(() => {
    const mapping = new Map();
    attributeDefinitions.forEach((definition) => {
      mapping.set(definition.id, definition);
    });
    return mapping;
  }, [attributeDefinitions]);

  const selectedProductId = id && !Number.isNaN(Number(id)) ? Number(id) : null;
  const isEditing = Boolean(editingProductId);
  const isViewing = Boolean(selectedProductId);
  const isEditRoute = Boolean(editMatch);

  const loadProducts = async () => {
    const response = await listProducts(token);
    setProducts(response?.data?.products || []);
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
    if (!isEditRoute) {
      if (editingProductId) {
        setEditingProductId(null);
        setShowForm(false);
      }
      return;
    }
    if (!selectedProduct) return;
    if (editingProductId === selectedProduct.id && showForm) return;
    populateEditForm(selectedProduct);
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

  const populateEditForm = (product) => {
    setEditingProductId(product.id);
    setForm({
      productName: product.productName || '',
      brandName: product.brandName || '',
      shortDescription: product.shortDescription || '',
      mainCategoryId: product.category?.mainCategoryId ? String(product.category.mainCategoryId) : '',
      categoryId: product.category?.categoryId ? String(product.category.categoryId) : '',
      subCategoryId: product.category?.subCategoryId ? String(product.category.subCategoryId) : '',
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
    populateEditForm(selectedProduct);
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
              thumbnailImage: variant.thumbnailImage?.trim() || null,
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

            const galleryImages = parseList(variant.galleryImagesText);
            if (galleryImages.length) {
              payloadVariant.galleryImages = galleryImages;
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

  const handleDelete = async (id) => {
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

  const handleStatusUpdate = async (nextStatus) => {
    if (!selectedProductId) return;
    const adminId = getAdminId();
    if (!adminId) return;
    try {
      setIsLoading(true);
      await updateProduct(token, selectedProductId, { approvalStatus: nextStatus, userId: adminId });
      await loadProducts();
      await loadProductDetail(selectedProductId);
      setMessage({
        type: 'success',
        text: `Product ${nextStatus === 'APPROVED' ? 'approved' : 'rejected'} successfully.`,
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
  const dynamicEntries = selectedProduct?.dynamicAttributes
    ? Object.entries(selectedProduct.dynamicAttributes)
    : [];
  const variants = Array.isArray(selectedProduct?.variants) ? selectedProduct.variants : [];
  const disableApprove = isLoading || !selectedProduct || statusValue === 'APPROVED';
  const disableReject = isLoading || !selectedProduct || statusValue === 'REJECTED';
  const disableEdit = isLoading || !selectedProduct;

  return (
    <div>
      {isViewing ? (
        <div className="panel-head">
          <div>
            <div className="inline-row">
              <button type="button" className="ghost-btn small" onClick={handleBackToList}>
                Back
              </button>
              <h2 className="panel-title">Product view</h2>
            </div>
            <p className="panel-subtitle">Review, approve, or edit product details.</p>
          </div>
          <div className="inline-row">
            <button
              type="button"
              className="primary-btn compact"
              onClick={() => handleStatusUpdate('APPROVED')}
              disabled={disableApprove}
            >
              Approve
            </button>
            <button
              type="button"
              className="ghost-btn small"
              onClick={() => handleStatusUpdate('REJECTED')}
              disabled={disableReject}
            >
              Reject
            </button>
            <button type="button" className="ghost-btn small" onClick={handleOpenEditForm} disabled={disableEdit}>
              Edit
            </button>
          </div>
        </div>
      ) : (
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Product</h2>
            <p className="panel-subtitle">Create and manage products for businesses.</p>
          </div>
          <button type="button" className="ghost-btn" onClick={handleRefresh} disabled={isLoading}>
            Refresh
          </button>
        </div>
      )}
      <Banner message={message} />
      {showForm ? (
        <div className="admin-modal-backdrop" onClick={handleCloseForm}>
          <form
            className="admin-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">{isEditing ? 'Edit product' : 'Create product'}</h3>
              <button type="button" className="ghost-btn small" onClick={handleCloseForm}>
                Close
              </button>
            </div>
            <div className="field-grid">
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
                    ? 'No UOMs available. Add units in the UOM master to enable selection.'
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
                    <span className="field-help">Conversion factor is base units per 1 unit of the selected UOM.</span>
                  </div>
                  <div className="field field-span">
                    <span>Sales UOMs (max 3)</span>
                    {form.salesUoms.length === 0 ? <span className="field-help">No sales UOMs added.</span> : null}
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
                    <span className="field-help">Leave conversion blank to use global conversion if configured.</span>
                  </div>
                </>
              )}
              <div className="field-span">
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
                      <label className="field field-span">
                        <span>Gallery images (comma or new line separated)</span>
                        <textarea
                          rows={2}
                          value={variant.galleryImagesText}
                          onChange={(event) => handleVariantChange(index, 'galleryImagesText', event.target.value)}
                          placeholder="https://image1.jpg, https://image2.jpg"
                        />
                      </label>
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
              <label className="field field-span">
                <span>Short description</span>
                <input
                  type="text"
                  value={form.shortDescription}
                  onChange={(event) => handleChange('shortDescription', event.target.value)}
                  placeholder="Short description"
                />
              </label>
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
              <div className="field-span">
                <h4 className="panel-subheading">Dynamic attributes</h4>
                <p className="muted">
                  Attributes load based on the selected category. Required fields are marked.
                </p>
              </div>
              {attributeMappings.length === 0 ? (
                <div className="field-span">
                  <p className="muted">Select a category to load dynamic attributes.</p>
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
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Update product' : 'Save product'}
            </button>
          </form>
        </div>
      ) : null}
      {isViewing ? (
        <div className="panel-grid">
          {selectedProduct ? (
            <>
              <div className="panel card">
                <div className="panel-split">
                  <h3 className="panel-subheading">Overview</h3>
                  <span className={statusClass}>{statusLabel}</span>
                </div>
                <div className="field-grid">
                  <div className="field">
                    <span>Product ID</span>
                    <p className="field-value">{formatValue(selectedProduct.id)}</p>
                  </div>
                  <div className="field">
                    <span>Product name</span>
                    <p className="field-value">{formatValue(selectedProduct.productName)}</p>
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
                    <p className="field-value">{formatValue(selectedProduct.createdOn)}</p>
                  </div>
                  <div className="field">
                    <span>Updated</span>
                    <p className="field-value">{formatValue(selectedProduct.updatedOn)}</p>
                  </div>
                </div>
              </div>
              <div className="panel card">
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
              <div className="panel card">
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
              <div className="panel card">
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
              <div className="panel card">
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
              <div className="panel card">
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
              <div className="panel card">
                <h3 className="panel-subheading">Dynamic attributes</h3>
                {dynamicEntries.length === 0 ? (
                  <p className="empty-state">No dynamic attributes provided.</p>
                ) : (
                  <div className="field-grid">
                    {dynamicEntries.map(([key, value]) => (
                      <div className="field" key={key}>
                        <span>{key}</span>
                        <p className="field-value">{formatValue(value)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="panel card">
              <p className="empty-state">
                {isLoading ? 'Loading product details...' : 'Product details not available.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="panel-grid">
          <div className="panel card">
            <div className="panel-split">
              <h3 className="panel-subheading">Product list</h3>
              <button
                type="button"
                className="primary-btn compact"
                onClick={showForm ? handleCloseForm : handleOpenCreateForm}
              >
                {showForm ? 'Close' : 'Create'}
              </button>
            </div>
            {products.length === 0 ? (
              <p className="empty-state">No products yet.</p>
            ) : (
              <div className="table-shell">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Selling price</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="table-row-clickable"
                        onClick={() => handleViewProduct(product.id)}
                      >
                        <td>{product.productName}</td>
                        <td>{product.category?.subCategoryName || product.category?.categoryName || '-'}</td>
                        <td>{product.sellingPrice ?? '-'}</td>
                        <td>{formatStatus(product.approvalStatus)}</td>
                        <td className="table-actions">
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(product.id);
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductPage;
