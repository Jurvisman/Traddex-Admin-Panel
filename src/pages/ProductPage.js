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
  updateProduct,
} from '../services/adminApi';

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
    Promise.all([loadProducts(), loadMainCategories(), loadAttributeDefinitions()])
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
      return next;
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
      if (dynamicAttributes && Object.keys(dynamicAttributes).length > 0) {
        payload.dynamicAttributes = dynamicAttributes;
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

  const statusValue = selectedProduct?.approvalStatus || '';
  const statusLabel = formatStatus(statusValue);
  const statusClass = `status-pill ${statusValue ? statusValue.toLowerCase().replace(/_/g, '-') : 'pending'}`;
  const dynamicEntries = selectedProduct?.dynamicAttributes
    ? Object.entries(selectedProduct.dynamicAttributes)
    : [];
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
