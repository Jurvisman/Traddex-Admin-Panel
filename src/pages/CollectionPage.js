import { useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu, ToggleSwitch } from '../components';
import { usePermissions } from '../shared/permissions';
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
import { PRODUCT_MASTER_PERMISSIONS } from '../constants/adminPermissions';

const ADMIN_API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const paginateItems = (items, page, pageSize) => {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);
  return { items: items.slice(start, end), totalItems, totalPages, page: safePage, start, end };
};

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
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(PRODUCT_MASTER_PERMISSIONS.collection.create);
  const canUpdate = hasPermission(PRODUCT_MASTER_PERMISSIONS.collection.update);
  const canDelete = hasPermission(PRODUCT_MASTER_PERMISSIONS.collection.delete);
  const [isSlugDirty, setIsSlugDirty] = useState(false);
  const [productPickerQuery, setProductPickerQuery] = useState('');
  const [isProductOptionsLoading, setIsProductOptionsLoading] = useState(false);
  const [productOptionsError, setProductOptionsError] = useState('');

  // Side view panel
  const [viewItem, setViewItem] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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
  }, [items, searchQuery])
  .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  const paginated = useMemo(
    () => paginateItems(filteredItems, page, pageSize),
    [filteredItems, page, pageSize]
  );

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
      const [collectionsResult, industriesResult, mainCategoriesResult] = await Promise.allSettled([
        listProductCollections(token),
        listIndustries(token),
        listMainCategories(token),
      ]);
      if (collectionsResult.status !== 'fulfilled') {
        throw collectionsResult.reason;
      }
      setItems(Array.isArray(collectionsResult.value?.data) ? collectionsResult.value.data : []);
      setIndustries(
        industriesResult.status === 'fulfilled' && Array.isArray(industriesResult.value?.data)
          ? industriesResult.value.data
          : []
      );
      setMainCategories(
        mainCategoriesResult.status === 'fulfilled' && Array.isArray(mainCategoriesResult.value?.data)
          ? mainCategoriesResult.value.data
          : []
      );
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
    if (!canCreate) {
      setMessage({ type: 'error', text: 'You do not have permission to create collections.' });
      return;
    }
    setEditItem(null);
    setViewItem(null);
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
    if (!canUpdate) {
      setMessage({ type: 'error', text: 'You do not have permission to update collections.' });
      return;
    }
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
    if (editItem ? !canUpdate : !canCreate) {
      setMessage({
        type: 'error',
        text: editItem ? 'You do not have permission to update collections.' : 'You do not have permission to create collections.',
      });
      return;
    }
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
    if (!canDelete) {
      setMessage({ type: 'error', text: 'You do not have permission to delete collections.' });
      return;
    }
    if (!window.confirm('Delete this collection?')) {
      return;
    }
    try {
      setIsLoading(true);
      await deleteProductCollection(token, id);
      if (viewItem?.id === id) setViewItem(null);
      await loadData();
      setMessage({ type: 'success', text: 'Collection deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete collection.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (item) => {
    setViewItem(item);
    setShowForm(false);
    // If curated, load products so we can show them in the panel
    if (item.sourceType === 'CURATED') {
      ensureProductOptionsLoaded();
    }
  };

  /* ── View panel products (for CURATED collections) ──────────── */
  const viewProductList = useMemo(() => {
    if (!viewItem || viewItem.sourceType !== 'CURATED') return [];
    const ids = Array.isArray(viewItem.productIds) ? viewItem.productIds : parseIdList(String(viewItem.productIds || ''));
    return ids.map((pid) => {
      const p = productOptionsById.get(Number(pid));
      return p || { id: pid, productName: `Product #${pid}`, _missing: true };
    });
  }, [viewItem, productOptionsById]);

  /* ── Side view panel renderer ───────────────────────────────── */
  const renderViewPanel = () => {
    if (!viewItem) return null;
    const col = viewItem;
    const isCuratedCol = col.sourceType === 'CURATED';
    const productIds = Array.isArray(col.productIds) ? col.productIds : parseIdList(String(col.productIds || ''));
    const scopeParts = [col.industryLabel, col.mainCategoryName, col.categoryName].filter(Boolean);
    const heroUrl = col.heroImage ? resolveMediaUrl(col.heroImage) : '';

    return (
      <div className="mv-panel card">
        {/* Header */}
        <div className="mv-panel-header">
          <div className="mv-panel-title-row">
            <button type="button" className="mv-back-btn" onClick={() => setViewItem(null)}>
              ← Back
            </button>
            <h3 className="mv-panel-title">{col.title || 'Collection'}</h3>
            <span className={`status-pill ${Number(col.active) === 1 ? 'status-verified' : 'status-inactive'}`}>
              {Number(col.active) === 1 ? 'Active' : 'Inactive'}
            </span>
          </div>
          {canUpdate && (
            <button type="button" className="ghost-btn small" onClick={() => handleEdit(col)}>
              Edit
            </button>
          )}
        </div>

        {/* Hero image */}
        {heroUrl ? (
          <div className="mv-section">
            <img
              src={heroUrl}
              alt={col.title}
              className="mv-banner-img"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        ) : null}

        {/* Basic Info */}
        <div className="mv-section">
          <p className="mv-section-label">Collection Details</p>
          <div className="mv-detail-grid">
            <span className="mv-detail-label">Title</span>
            <span className="mv-detail-value">{col.title || '-'}</span>
            {col.subtitle ? (
              <>
                <span className="mv-detail-label">Subtitle</span>
                <span className="mv-detail-value">{col.subtitle}</span>
              </>
            ) : null}
            <span className="mv-detail-label">Slug</span>
            <span className="mv-detail-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{col.slug || '-'}</span>
            <span className="mv-detail-label">Source</span>
            <span className="mv-detail-value">
              {isCuratedCol
                ? `Curated (${productIds.length} product${productIds.length !== 1 ? 's' : ''})`
                : `Product Feed`}
            </span>
            {!isCuratedCol && col.feedType ? (
              <>
                <span className="mv-detail-label">Feed Type</span>
                <span className="mv-detail-value">
                  {FEED_OPTIONS.find((f) => f.value === col.feedType)?.label || formatStatusLabel(col.feedType)}
                </span>
              </>
            ) : null}
            <span className="mv-detail-label">Product Limit</span>
            <span className="mv-detail-value">{col.productLimit ?? 12}</span>
          </div>
        </div>

        {/* Scope (where this collection applies) */}
        <div className="mv-section">
          <p className="mv-section-label">Scope / Applied To</p>
          {scopeParts.length > 0 ? (
            <div className="mv-detail-grid">
              {col.industryLabel ? (
                <>
                  <span className="mv-detail-label">Industry</span>
                  <span className="mv-detail-value">{col.industryLabel}</span>
                </>
              ) : null}
              {col.mainCategoryName ? (
                <>
                  <span className="mv-detail-label">Main Category</span>
                  <span className="mv-detail-value">{col.mainCategoryName}</span>
                </>
              ) : null}
              {col.categoryName ? (
                <>
                  <span className="mv-detail-label">Category</span>
                  <span className="mv-detail-value">{col.categoryName}</span>
                </>
              ) : null}
            </div>
          ) : (
            <p className="mv-empty">No scope filter — applies to all products.</p>
          )}
        </div>

        {/* Description */}
        {col.description ? (
          <div className="mv-section">
            <p className="mv-section-label">Description</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', lineHeight: 1.5, margin: 0 }}>
              {col.description}
            </p>
          </div>
        ) : null}

        {/* Curated products list */}
        {isCuratedCol ? (
          <div className="mv-section">
            <p className="mv-section-label">
              Products in this Collection
              <span className="mv-count-badge">{productIds.length}</span>
            </p>
            {isProductOptionsLoading ? (
              <p className="mv-loading">Loading products…</p>
            ) : viewProductList.length === 0 ? (
              <p className="mv-empty">No products added to this collection yet.</p>
            ) : (
              <div className="mv-child-grid">
                {viewProductList.map((p) => {
                  const imgUrl = resolveMediaUrl(getPrimaryProductImage(p));
                  return (
                    <div key={p.id} className="mv-child-card mv-product-card">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={p.productName || `Product #${p.id}`}
                          className="mv-product-thumb"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="mv-product-thumb mv-product-no-img">No img</div>
                      )}
                      <div className="mv-child-name">
                        {p._missing
                          ? <span style={{ color: 'var(--text-secondary)' }}>Product #{p.id}</span>
                          : p.productName || `Product #${p.id}`}
                      </div>
                      {!p._missing && (
                        <div className="mv-child-meta">
                          <span className="mv-child-order">#{p.id}</span>
                          {p.sellingPrice != null && (
                            <span className="mv-child-cats">{formatPrice(p.sellingPrice, p.currency)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Feed-type: explain how it works */
          <div className="mv-section">
            <p className="mv-section-label">How this Feed Works</p>
            <div className="mv-child-grid">
              <div className="mv-child-card" style={{ gridColumn: '1 / -1' }}>
                <div className="mv-child-name">
                  {FEED_OPTIONS.find((f) => f.value === col.feedType)?.label || formatStatusLabel(col.feedType || 'BESTSELLER')} Feed
                </div>
                <div className="mv-child-meta">
                  <span className="mv-child-cats">
                    Automatically shows up to {col.productLimit ?? 12} products
                    {scopeParts.length > 0 ? ` from ${scopeParts.join(' › ')}` : ' across all categories'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="catalog-manager">
      <Banner message={message} />

      {showForm ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={closeFormModal}>
          <div
            className="admin-modal cat-unified-modal"
            style={isCurated ? { maxWidth: 960, width: '100%' } : {}}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px 14px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                  {editItem ? 'Edit Collection' : 'Create Collection'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  {form.sourceType === 'CURATED' ? 'Curated Collection' : 'Smart Feed Collection'} › {form.title || '...'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                aria-label="Close"
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: 8,
                  width: 32, height: 32, cursor: 'pointer', color: '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '24px', maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isCurated ? '1.2fr 1fr' : '1fr', gap: 32 }}>
                  
                  {/* Left Column: Collection Configuration */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {/* Basic Info Group */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Collection Title <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={form.title}
                          onChange={(event) => handleChange('title', event.target.value)}
                          placeholder="e.g. Weekend Steals"
                          required
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Slug (URL Path) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={form.slug}
                          onChange={(event) => {
                            setIsSlugDirty(true);
                            handleChange('slug', event.target.value);
                          }}
                          placeholder="weekend-steals"
                          required
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Source Type
                        </label>
                        <select 
                          value={form.sourceType} 
                          onChange={(event) => handleChange('sourceType', event.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        >
                          <option value="CURATED">Curated List</option>
                          <option value="PRODUCT_FEED">Dynamic Feed</option>
                        </select>
                      </div>
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Max Items
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={form.productLimit}
                          onChange={(event) => handleChange('productLimit', event.target.value)}
                          placeholder="12"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Subtitle / Catchphrase
                      </label>
                      <input
                        type="text"
                        value={form.subtitle}
                        onChange={(event) => handleChange('subtitle', event.target.value)}
                        placeholder="Grab them before they are gone!"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Active Toggle Group */}
                    <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <ToggleSwitch
                        id="collection-status-toggle"
                        checked={Number(form.active) === 1}
                        onChange={(val) => handleChange('active', val ? '1' : '0')}
                        label="Publish Collection"
                      />
                    </div>

                    {/* Feed specific configuration */}
                    {!isCurated && (
                      <div style={{ background: '#f1f5f9', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="field">
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                            Feed Strategy
                          </label>
                          <select 
                            value={form.feedType} 
                            onChange={(event) => handleChange('feedType', event.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box' }}
                          >
                            {FEED_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div className="field">
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                              Industry Filter
                            </label>
                            <select 
                              value={form.industryId} 
                              onChange={(event) => handleChange('industryId', event.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }}
                            >
                              <option value="">All Industries</option>
                              {industries.map((ind) => (
                                <option key={ind.industryId || ind.id} value={ind.industryId || ind.id}>{ind.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                              Main Category
                            </label>
                            <select 
                              value={form.mainCategoryId} 
                              onChange={(event) => handleChange('mainCategoryId', event.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }}
                            >
                              <option value="">All Main Categories</option>
                              {visibleMainCategories.map((mc) => (
                                <option key={mc.id} value={mc.id}>{mc.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div className="field">
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                            Category Filter
                          </label>
                          <select 
                            value={form.categoryId} 
                            onChange={(event) => handleChange('categoryId', event.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }}
                          >
                            <option value="">All Categories</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Media & SEO */}
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Hero Image URL
                      </label>
                      <input
                        type="text"
                        value={form.heroImage}
                        onChange={(event) => handleChange('heroImage', event.target.value)}
                        placeholder="https://..."
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Detailed Description
                      </label>
                      <textarea
                        rows="4"
                        value={form.description}
                        onChange={(event) => handleChange('description', event.target.value)}
                        placeholder="Explain the vibe of this collection..."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'inherit', fontSize: 14 }}
                      />
                    </div>
                  </div>

                  {/* Right Column: Curated Products Selection */}
                  {isCurated && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderLeft: '1px solid #f1f5f9', paddingLeft: 32 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Selection ({selectedProductIds.length})
                        </label>
                        <button 
                          type="button" 
                          onClick={() => ensureProductOptionsLoaded(true)}
                          className="ghost-btn small"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                        >
                          Refresh
                        </button>
                      </div>

                      {/* Search & Add */}
                      <div className="gsc-toolbar-search" style={{ width: '100%', margin: 0, border: '2px solid rgba(99, 69, 237, 0.12)', borderRadius: 12, transition: 'all 0.2s' }}>
                        <input
                          type="search"
                          placeholder="Search items to add..."
                          value={productPickerQuery}
                          onChange={(e) => setProductPickerQuery(e.target.value)}
                          style={{ border: 'none', background: 'transparent', height: 40 }}
                        />
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: 'var(--accent)' }}>
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                      </div>

                      {/* Floating Results Panel */}
                      {productPickerQuery.trim() && (
                        <div style={{ 
                          maxHeight: 280, overflowY: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', zIndex: 50, marginTop: -8
                        }}>
                          {isProductOptionsLoading ? (
                            <p style={{ padding: 20, textAlign: 'center', fontSize: 13, color: '#64748b' }}>Finding items...</p>
                          ) : filteredProductOptions.length === 0 ? (
                            <p style={{ padding: 20, textAlign: 'center', fontSize: 13, color: '#64748b' }}>No items found</p>
                          ) : (
                            filteredProductOptions.map((p) => {
                              const isAdded = selectedProductIdSet.has(Number(p.id));
                              const imgSrc = resolveMediaUrl(getPrimaryProductImage(p));
                              return (
                                <div 
                                  key={p.id} 
                                  onClick={() => !isAdded && addSelectedProduct(p.id)}
                                  style={{ 
                                    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: isAdded ? 'default' : 'pointer',
                                    background: isAdded ? '#f8fafc' : 'transparent', borderBottom: '1px solid #f1f5f9'
                                  }}
                                  className="picker-hover-item"
                                >
                                  <div style={{ width: 36, height: 36, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
                                    {imgSrc && <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" onError={(e) => { e.target.style.display = 'none'; }} />}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isAdded ? '#94a3b8' : '#1e293b' }}>
                                      {p.productName}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>#{p.id} • {p.brandName || 'Unbranded'}</div>
                                  </div>
                                  {isAdded ? (
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" style={{ width: 12, height: 12 }}><path d="M20 6 9 17l-5-5"/></svg>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>+ Add</span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Vertical Selected List (Scrollable) */}
                      <div style={{ 
                        flex: 1, maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10,
                        padding: '4px', margin: '-4px' 
                      }}>
                        {selectedProducts.length === 0 ? (
                          <div style={{ 
                            padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13, 
                            background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 40, height: 40, opacity: 0.5 }}>
                              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8"/>
                            </svg>
                            Your collection is empty
                          </div>
                        ) : (
                          selectedProducts.map((p, idx) => {
                            const imgSrc = resolveMediaUrl(getPrimaryProductImage(p));
                            return (
                              <div key={p.id} style={{ 
                                padding: '12px', display: 'flex', alignItems: 'center', gap: 12, 
                                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative'
                              }}>
                                <div style={{ 
                                  width: 44, height: 44, borderRadius: 8, background: '#f8fafc', 
                                  overflow: 'hidden', flexShrink: 0, border: '1px solid #f1f5f9' 
                                }}>
                                  {imgSrc && <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" onError={(e) => { e.target.style.display = 'none'; }} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {p.productName}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>#{p.id}</span>
                                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9' }}>Pos {idx + 1}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <button type="button" onClick={() => moveSelectedProduct(p.id, 'up')} disabled={idx === 0} style={{ padding: 4, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 12, height: 12 }}><path d="m18 15-6-6-6 6"/></svg>
                                    </button>
                                    <button type="button" onClick={() => moveSelectedProduct(p.id, 'down')} disabled={idx === selectedProducts.length - 1} style={{ padding: 4, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', opacity: idx === selectedProducts.length - 1 ? 0.3 : 1 }}>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 12, height: 12 }}><path d="m6 9 6 6 6-6"/></svg>
                                    </button>
                                  </div>
                                  <button type="button" onClick={() => removeSelectedProduct(p.id)} style={{ padding: '0 8px', background: '#fff1f1', border: '1px solid #fee2e2', borderRadius: 8, cursor: 'pointer', color: '#ef4444' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><path d="M18 6 6 18M6 6l12 12"/></svg>
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'flex-end', gap: 12,
                background: '#fafafa',
              }}>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={closeFormModal}
                  style={{ minWidth: 100 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isLoading}
                  style={{ minWidth: 140 }}
                >
                  {isLoading ? 'Saving...' : editItem ? 'Update Collection' : 'Create Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className={`mv-layout${viewItem ? ' mv-layout--split' : ''}`}>
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
              {canCreate ? (
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
              ) : null}
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
                  {paginated.items.map((item, index) => (
                    <tr
                      key={item.id}
                      className={viewItem?.id === item.id ? 'mv-row-active' : ''}
                      onClick={() => handleView(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{paginated.start + index + 1}</td>
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
                          : `Curated · ${Array.isArray(item.productIds) ? item.productIds.length : 0} products`}
                      </td>
                      <td>
                        {[item.industryLabel, item.mainCategoryName, item.categoryName]
                          .filter(Boolean)
                          .join(' / ') || '-'}
                      </td>
                      <td>
                        <span className={`status-pill ${Number(item.active) === 1 ? 'status-verified' : 'status-inactive'}`}>
                          {Number(item.active) === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const actions = [{ label: 'View', onClick: () => handleView(item) }];
                          if (canUpdate) {
                            actions.push({ label: 'Edit', onClick: () => handleEdit(item) });
                          }
                          if (canDelete) {
                            actions.push({ label: 'Delete', onClick: () => handleDelete(item.id), danger: true });
                          }
                          return (
                            <TableRowActionMenu
                              rowId={item.id}
                              openRowId={openActionRowId}
                              onToggle={setOpenActionRowId}
                              actions={actions}
                            />
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bv-table-footer">
                <div className="table-record-count">
                  <span>
                    {paginated.totalItems === 0
                      ? '0 records'
                      : `Showing ${paginated.start + 1}–${paginated.end} of ${paginated.totalItems}`}
                  </span>
                </div>
                <div className="product-pagination-controls">
                  <label className="product-pagination-size">
                    <span>Rows</span>
                    <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                      {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <div className="bv-table-pagination">
                    <button type="button" className="secondary-btn" disabled={paginated.page <= 1} onClick={() => setPage((p) => p - 1)}>{'< Prev'}</button>
                    <span>Page {paginated.page} / {paginated.totalPages}</span>
                    <button type="button" className="secondary-btn" disabled={paginated.page >= paginated.totalPages} onClick={() => setPage((p) => p + 1)}>{'Next >'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side view panel */}
        {renderViewPanel()}
      </div>
    </div>
  );
}

export default CollectionPage;
