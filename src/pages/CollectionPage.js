import { useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import {
  createProductCollection,
  deleteProductCollection,
  listCategories,
  listIndustries,
  listMainCategories,
  listProductCollections,
  listProducts,
  updateProductCollection,
} from '../services/adminApi';

const ADMIN_API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';

const initialForm = {
  title: '',
  slug: '',
  subtitle: '',
  description: '',
  heroImage: '',
  sourceType: 'CURATED',
  feedType: 'BESTSELLER',
  industryId: '',
  mainCategoryId: '',
  categoryId: '',
  productIds: '',
  productLimit: '12',
  active: '1',
};

const FEED_OPTIONS = [
  { value: 'TOP_SELLING', label: 'Top selling' },
  { value: 'BESTSELLER', label: 'Bestseller' },
  { value: 'TRENDING', label: 'Trending' },
  { value: 'FREQUENTLY_BOUGHT', label: 'Frequently bought' },
  { value: 'LOWEST_PRICE', label: 'Lowest price' },
  { value: 'MOST_RATED', label: 'Most rated' },
  { value: 'RECOMMENDED', label: 'Recommended' },
];

const toSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s/]+/g, '-')
    .replace(/-+/g, '-');

const parseIdList = (value) =>
  String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));

const formatIdList = (values) =>
  Array.isArray(values) ? values.map((value) => String(value)).join(', ') : '';

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

const getPrimaryProductImage = (product) =>
  product?.thumbnailImage || extractImageUrls(product?.galleryImages)[0] || '';

const formatPrice = (value, currency = 'INR') => {
  if (value === null || value === undefined || value === '') return 'Price unavailable';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 'Price unavailable';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: String(currency || 'INR').toUpperCase(),
      maximumFractionDigits: 0,
    }).format(numericValue);
  } catch {
    return `Rs ${numericValue.toLocaleString('en-IN')}`;
  }
};

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();

const formatStatusLabel = (value) =>
  String(value || '')
    .trim()
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getProductScope = (product) =>
  [
    product?.category?.mainCategoryName,
    product?.category?.categoryName,
    product?.category?.subCategoryName,
  ]
    .filter(Boolean)
    .join(' / ') || 'Unassigned catalog path';

const getProductSearchText = (product) =>
  [
    product?.id,
    product?.productName,
    product?.brandName,
    product?.businessName,
    product?.sku,
    product?.approvalStatus,
    product?.category?.mainCategoryName,
    product?.category?.categoryName,
    product?.category?.subCategoryName,
  ]
    .map((value) => String(value || '').toLowerCase())
    .join(' ');

function CollectionPage({ token }) {
  const [items, setItems] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [isSlugDirty, setIsSlugDirty] = useState(false);
  const [productPickerQuery, setProductPickerQuery] = useState('');
  const [isProductOptionsLoading, setIsProductOptionsLoading] = useState(false);
  const [productOptionsError, setProductOptionsError] = useState('');

  const isCurated = form.sourceType === 'CURATED';
  const selectedProductIds = useMemo(() => parseIdList(form.productIds), [form.productIds]);
  const selectedProductIdSet = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);

  const activeCount = items.filter((item) => Number(item.active) === 1).length;
  const feedCount = items.filter((item) => item.sourceType === 'PRODUCT_FEED').length;
  const curatedCount = Math.max(0, items.length - feedCount);

  const visibleMainCategories = useMemo(() => {
    if (!form.industryId) return mainCategories;
    return mainCategories.filter(
      (mainCategory) => String(mainCategory.industryId ?? '') === String(form.industryId)
    );
  }, [form.industryId, mainCategories]);

  const filteredItems = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (!search) return true;
      const haystack = [
        item.title,
        item.slug,
        item.subtitle,
        item.industryLabel,
        item.mainCategoryName,
        item.categoryName,
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return haystack.includes(search);
    });
  }, [items, searchQuery]);

  const selectableProducts = useMemo(
    () => productOptions.filter((product) => String(product?.approvalStatus || '').toUpperCase() === 'APPROVED'),
    [productOptions]
  );

  const productOptionsById = useMemo(() => {
    const next = new Map();
    productOptions.forEach((product) => {
      if (product?.id != null) {
        next.set(Number(product.id), product);
      }
    });
    return next;
  }, [productOptions]);

  const selectedProducts = useMemo(
    () =>
      selectedProductIds.map((productId) => {
        const match = productOptionsById.get(productId);
        if (match) return match;
        return {
          id: productId,
          productName: `Product #${productId}`,
          approvalStatus: 'UNKNOWN',
          _missing: true,
        };
      }),
    [productOptionsById, selectedProductIds]
  );

  const filteredProductOptions = useMemo(() => {
    const search = normalizeSearchValue(productPickerQuery);
    const baseList = selectableProducts.filter((product) => {
      if (!search) return true;
      return getProductSearchText(product).includes(search);
    });
    const sorted = [...baseList].sort((left, right) => {
      const leftName = String(left?.productName || '').toLowerCase();
      const rightName = String(right?.productName || '').toLowerCase();
      if (leftName !== rightName) return leftName.localeCompare(rightName);
      return Number(left?.id || 0) - Number(right?.id || 0);
    });
    return sorted.slice(0, 40);
  }, [productPickerQuery, selectableProducts]);

  const ensureProductOptionsLoaded = async (force = false) => {
    if (isProductOptionsLoading) return;
    if (!force && productOptions.length > 0) return;
    try {
      setIsProductOptionsLoading(true);
      setProductOptionsError('');
      const response = await listProducts(token);
      const nextProducts = Array.isArray(response?.data?.products)
        ? response.data.products
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setProductOptions(nextProducts);
    } catch (error) {
      setProductOptionsError(error.message || 'Failed to load products for curated selection.');
    } finally {
      setIsProductOptionsLoading(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [collectionResponse, industryResponse, mainCategoryResponse] = await Promise.all([
        listProductCollections(token),
        listIndustries(token),
        listMainCategories(token),
      ]);
      setItems(Array.isArray(collectionResponse?.data) ? collectionResponse.data : []);
      setIndustries(Array.isArray(industryResponse?.data) ? industryResponse.data : []);
      setMainCategories(Array.isArray(mainCategoryResponse?.data) ? mainCategoryResponse.data : []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch collections.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadCategoryOptions = async () => {
      if (!form.mainCategoryId) {
        setCategories([]);
        return;
      }
      try {
        const response = await listCategories(token, form.mainCategoryId);
        setCategories(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        setCategories([]);
      }
    };

    loadCategoryOptions();
  }, [form.mainCategoryId, token]);

  useEffect(() => {
    if (showForm && isCurated) {
      ensureProductOptionsLoaded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm, isCurated, token]);

  const handleChange = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'title' && !isSlugDirty) {
        next.slug = toSlug(value);
      }
      if (key === 'industryId' && value !== prev.industryId) {
        next.mainCategoryId = '';
        next.categoryId = '';
      }
      if (key === 'mainCategoryId' && value !== prev.mainCategoryId) {
        next.categoryId = '';
      }
      if (key === 'sourceType') {
        if (value === 'CURATED') {
          next.feedType = 'BESTSELLER';
          next.industryId = '';
          next.mainCategoryId = '';
          next.categoryId = '';
        } else {
          next.productIds = '';
        }
      }
      return next;
    });
  };

  const openCreateModal = () => {
    setEditItem(null);
    setForm(initialForm);
    setIsSlugDirty(false);
    setProductPickerQuery('');
    setProductOptionsError('');
    setShowForm(true);
  };

  const closeFormModal = () => {
    setShowForm(false);
    setEditItem(null);
    setForm(initialForm);
    setIsSlugDirty(false);
    setProductPickerQuery('');
    setProductOptionsError('');
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({
      title: item.title || '',
      slug: item.slug || '',
      subtitle: item.subtitle || '',
      description: item.description || '',
      heroImage: item.heroImage || '',
      sourceType: item.sourceType || 'CURATED',
      feedType: item.feedType === 'MANUAL' ? 'BESTSELLER' : item.feedType || 'BESTSELLER',
      industryId: item.industryId != null ? String(item.industryId) : '',
      mainCategoryId: item.mainCategoryId != null ? String(item.mainCategoryId) : '',
      categoryId: item.categoryId != null ? String(item.categoryId) : '',
      productIds: formatIdList(item.productIds),
      productLimit: item.productLimit != null ? String(item.productLimit) : '12',
      active: item.active != null ? String(item.active) : '1',
    });
    setIsSlugDirty(true);
    setProductPickerQuery('');
    setProductOptionsError('');
    setShowForm(true);
  };

  const updateSelectedProductIds = (nextIds) => {
    const normalizedIds = nextIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    handleChange('productIds', formatIdList(normalizedIds));
  };

  const addSelectedProduct = (productId) => {
    const numericId = Number(productId);
    if (!Number.isFinite(numericId) || selectedProductIdSet.has(numericId)) return;
    updateSelectedProductIds([...selectedProductIds, numericId]);
  };

  const removeSelectedProduct = (productId) => {
    const numericId = Number(productId);
    updateSelectedProductIds(selectedProductIds.filter((value) => value !== numericId));
  };

  const moveSelectedProduct = (productId, direction) => {
    const numericId = Number(productId);
    const index = selectedProductIds.findIndex((value) => value === numericId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedProductIds.length) return;
    const nextIds = [...selectedProductIds];
    [nextIds[index], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[index]];
    updateSelectedProductIds(nextIds);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setMessage({ type: 'error', text: 'Collection title is required.' });
      return;
    }
    const slug = toSlug(form.slug || form.title);
    if (!slug) {
      setMessage({ type: 'error', text: 'Collection slug is required.' });
      return;
    }

    const productIds = parseIdList(form.productIds);
    if (form.sourceType === 'CURATED' && productIds.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one product id for curated collections.' });
      return;
    }

    const payload = {
      title: form.title.trim(),
      slug,
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      heroImage: form.heroImage.trim() || null,
      sourceType: form.sourceType,
      feedType: form.sourceType === 'PRODUCT_FEED' ? form.feedType : null,
      industryId: form.sourceType === 'PRODUCT_FEED' && form.industryId ? Number(form.industryId) : null,
      mainCategoryId: form.sourceType === 'PRODUCT_FEED' && form.mainCategoryId ? Number(form.mainCategoryId) : null,
      categoryId: form.sourceType === 'PRODUCT_FEED' && form.categoryId ? Number(form.categoryId) : null,
      productIds: form.sourceType === 'CURATED' ? productIds : [],
      productLimit: form.productLimit ? Number(form.productLimit) : 12,
      active: Number(form.active),
    };

    try {
      setIsLoading(true);
      if (editItem) {
        await updateProductCollection(token, editItem.id, payload);
        setMessage({ type: 'success', text: 'Collection updated.' });
      } else {
        await createProductCollection(token, payload);
        setMessage({ type: 'success', text: 'Collection created.' });
      }
      closeFormModal();
      await loadData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || (editItem ? 'Failed to update collection.' : 'Failed to create collection.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this collection?')) {
      return;
    }
    try {
      setIsLoading(true);
      await deleteProductCollection(token, id);
      await loadData();
      setMessage({ type: 'success', text: 'Collection deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete collection.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="catalog-manager">
      <Banner message={message} />

      {showForm ? (
        <div className="admin-modal-backdrop" onClick={closeFormModal}>
          <form
            className="admin-modal category-create-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">{editItem ? 'Edit collection' : 'Create collection'}</h3>
              <button type="button" className="ghost-btn small" onClick={closeFormModal}>
                Close
              </button>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => handleChange('title', event.target.value)}
                  placeholder="e.g. Summer Serums"
                  required
                />
              </label>
              <label className="field">
                <span>Slug</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(event) => {
                    setIsSlugDirty(true);
                    handleChange('slug', event.target.value);
                  }}
                  placeholder="summer-serums"
                  required
                />
              </label>
              <label className="field">
                <span>Source type</span>
                <select value={form.sourceType} onChange={(event) => handleChange('sourceType', event.target.value)}>
                  <option value="CURATED">Curated products</option>
                  <option value="PRODUCT_FEED">Product feed</option>
                </select>
              </label>
              <label className="field">
                <span>Initial visible products</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={form.productLimit}
                  onChange={(event) => handleChange('productLimit', event.target.value)}
                  placeholder="12"
                />
              </label>
              <label className="field">
                <span>Subtitle</span>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(event) => handleChange('subtitle', event.target.value)}
                  placeholder="Top glow picks"
                />
              </label>
              <label className="field">
                <span>Active</span>
                <select value={form.active} onChange={(event) => handleChange('active', event.target.value)}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <label className="field field-span">
                <span>Description</span>
                <input
                  type="text"
                  value={form.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  placeholder="Optional helper text for the landing page"
                />
              </label>
              <label className="field field-span">
                <span>Hero image URL</span>
                <input
                  type="text"
                  value={form.heroImage}
                  onChange={(event) => handleChange('heroImage', event.target.value)}
                  placeholder="https://..."
                />
              </label>

              {isCurated ? (
                <div className="field field-span">
                  <div className="collection-picker">
                    <div className="collection-picker-head">
                      <div>
                        <span>Curated products</span>
                        <p>Select approved products, then adjust their order for live display.</p>
                      </div>
                      <div className="collection-picker-actions">
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => ensureProductOptionsLoaded(true)}
                          disabled={isProductOptionsLoading}
                        >
                          {isProductOptionsLoading ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => updateSelectedProductIds([])}
                          disabled={selectedProductIds.length === 0}
                        >
                          Clear all
                        </button>
                      </div>
                    </div>

                    <div className="users-search collection-picker-search">
                      <span className="icon-search" aria-hidden="true" />
                      <input
                        type="search"
                        value={productPickerQuery}
                        onChange={(event) => setProductPickerQuery(event.target.value)}
                        placeholder="Search products by id, name, brand, SKU, or category"
                        aria-label="Search products for curated collection"
                      />
                    </div>

                    <p className="collection-picker-note">
                      Only approved products appear on the live collection page. Selected order is preserved.
                    </p>

                    {productOptionsError ? <p className="collection-picker-error">{productOptionsError}</p> : null}

                    <div className="collection-picker-section">
                      <div className="collection-picker-section-head">
                        <strong>Selected products ({selectedProductIds.length})</strong>
                        {selectedProductIds.length > 0 ? <span>Top item appears first.</span> : null}
                      </div>

                      {selectedProducts.length === 0 ? (
                        <p className="collection-picker-empty">No products selected yet.</p>
                      ) : (
                        <div className="collection-selected-list">
                          {selectedProducts.map((product, index) => {
                            const imageUrl = resolveMediaUrl(getPrimaryProductImage(product));
                            return (
                              <div
                                key={`selected-${product.id}`}
                                className={`collection-selected-card ${product._missing ? 'is-missing' : ''}`}
                              >
                                <div className="collection-selected-thumb">
                                  {imageUrl ? <img src={imageUrl} alt={product.productName || 'Product'} /> : <span>No image</span>}
                                </div>
                                <div className="collection-selected-copy">
                                  <strong>{product.productName || `Product #${product.id}`}</strong>
                                  <span>ID #{product.id}</span>
                                  <span>{getProductScope(product)}</span>
                                  <span>
                                    {formatPrice(product?.sellingPrice, product?.currency)} ·{' '}
                                    {product?._missing
                                      ? 'Missing from admin product list'
                                      : formatStatusLabel(product?.approvalStatus || 'UNKNOWN')}
                                  </span>
                                </div>
                                <div className="collection-selected-controls">
                                  <button
                                    type="button"
                                    className="ghost-btn small"
                                    onClick={() => moveSelectedProduct(product.id, 'up')}
                                    disabled={index === 0}
                                    aria-label={`Move ${product.productName || product.id} up`}
                                  >
                                    Up
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost-btn small"
                                    onClick={() => moveSelectedProduct(product.id, 'down')}
                                    disabled={index === selectedProducts.length - 1}
                                    aria-label={`Move ${product.productName || product.id} down`}
                                  >
                                    Down
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost-btn small"
                                    onClick={() => removeSelectedProduct(product.id)}
                                    aria-label={`Remove ${product.productName || product.id}`}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="collection-picker-section">
                      <div className="collection-picker-section-head">
                        <strong>Search results</strong>
                        <span>
                          {isProductOptionsLoading
                            ? 'Loading products...'
                            : `${filteredProductOptions.length} approved products shown`}
                        </span>
                      </div>

                      {isProductOptionsLoading ? (
                        <p className="collection-picker-empty">Loading product options...</p>
                      ) : filteredProductOptions.length === 0 ? (
                        <p className="collection-picker-empty">No approved products match your search.</p>
                      ) : (
                        <div className="collection-product-results">
                          {filteredProductOptions.map((product) => {
                            const imageUrl = resolveMediaUrl(getPrimaryProductImage(product));
                            const isSelected = selectedProductIdSet.has(Number(product.id));
                            return (
                              <div key={`option-${product.id}`} className="collection-product-row">
                                <div className="collection-product-thumb">
                                  {imageUrl ? <img src={imageUrl} alt={product.productName || 'Product'} /> : <span>No image</span>}
                                </div>
                                <div className="collection-product-copy">
                                  <strong>{product.productName || `Product #${product.id}`}</strong>
                                  <span>ID #{product.id}</span>
                                  <span>{getProductScope(product)}</span>
                                  <span>{product.brandName || product.businessName || 'No brand/business info'}</span>
                                </div>
                                <div className="collection-product-meta">
                                  <span className="collection-product-price">
                                    {formatPrice(product?.sellingPrice, product?.currency)}
                                  </span>
                                  <button
                                    type="button"
                                    className={`ghost-btn small ${isSelected ? 'is-selected' : ''}`}
                                    onClick={() => addSelectedProduct(product.id)}
                                    disabled={isSelected}
                                  >
                                    {isSelected ? 'Added' : 'Add'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <label className="field">
                    <span>Feed type</span>
                    <select value={form.feedType} onChange={(event) => handleChange('feedType', event.target.value)}>
                      {FEED_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Industry</span>
                    <select value={form.industryId} onChange={(event) => handleChange('industryId', event.target.value)}>
                      <option value="">All industries</option>
                      {industries.map((industry) => (
                        <option key={industry.id ?? industry.industryId} value={industry.id ?? industry.industryId}>
                          {industry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Main category</span>
                    <select
                      value={form.mainCategoryId}
                      onChange={(event) => handleChange('mainCategoryId', event.target.value)}
                    >
                      <option value="">All main categories</option>
                      {visibleMainCategories.map((mainCategory) => (
                        <option key={mainCategory.id} value={mainCategory.id}>
                          {mainCategory.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Category</span>
                    <select value={form.categoryId} onChange={(event) => handleChange('categoryId', event.target.value)}>
                      <option value="">All categories</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : editItem ? 'Update collection' : 'Save collection'}
            </button>
          </form>
        </div>
      ) : null}

      <div className="panel-grid">
        <div className="panel card users-table-card">
          <div className="panel-split">
            <div className="category-list-head-left">
              <h3 className="panel-subheading">Collection list</h3>
            </div>
            <div className="gsc-datatable-toolbar-right">
              <div className="gsc-toolbar-search">
                <input
                  type="search"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label="Search collections"
                />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <button
                type="button"
                className="gsc-create-btn"
                onClick={openCreateModal}
                title="Create collection"
                aria-label="Create collection"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <p className="empty-state">No collections yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Title</th>
                    <th>Slug</th>
                    <th>Source</th>
                    <th>Scope</th>
                    <th>Status</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="user-name">
                          <strong>{item.title}</strong>
                          {item.subtitle ? <span>{item.subtitle}</span> : null}
                        </div>
                      </td>
                      <td>{item.slug || '-'}</td>
                      <td>
                        {item.sourceType === 'PRODUCT_FEED'
                          ? `Feed · ${String(item.feedType || 'BESTSELLER').replaceAll('_', ' ')}`
                          : `Curated · ${Array.isArray(item.productIds) ? item.productIds.length : 0} ids`}
                      </td>
                      <td>
                        {[item.industryLabel, item.mainCategoryName, item.categoryName]
                          .filter(Boolean)
                          .join(' / ') || '-'}
                      </td>
                      <td>
                        <span className={Number(item.active) === 1 ? 'status-active' : 'status-inactive'}>
                          {Number(item.active) === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                        <TableRowActionMenu
                          rowId={item.id}
                          openRowId={openActionRowId}
                          onToggle={setOpenActionRowId}
                          actions={[
                            { label: 'Edit', onClick: () => handleEdit(item) },
                            { label: 'Delete', onClick: () => handleDelete(item.id), danger: true },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-record-count">
                <span>
                  Showing {filteredItems.length} of {items.length} records
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CollectionPage;
