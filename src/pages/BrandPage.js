import { useEffect, useMemo, useState, useCallback } from 'react';
import { Banner, TableRowActionMenu, ToggleSwitch, DataTable } from '../components';
import { usePermissions } from '../shared/permissions';
import { createBrand, deleteBrand, listBrands, listProducts, updateBrand } from '../services/adminApi';
import { PRODUCT_MASTER_PERMISSIONS } from '../constants/adminPermissions';
import { API_ORIGIN } from '../config/runtime';

const ADMIN_API_BASE = API_ORIGIN;

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
  brandName: '',
  logoUrl: '',
  website: '',
  countryOfOrigin: '',
  description: '',
  approvalStatus: 'APPROVED',
  isActive: 'true',
};

const formatStatus = (value) =>
  String(value || 'PENDING_REVIEW')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

function BrandPage({ token }) {
  const { hasPermission } = usePermissions();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [brandProducts, setBrandProducts] = useState([]);
  const [brandProductsLoading, setBrandProductsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const canCreate = hasPermission(PRODUCT_MASTER_PERMISSIONS.brand.create);
  const canUpdate = hasPermission(PRODUCT_MASTER_PERMISSIONS.brand.update);
  const canDelete = hasPermission(PRODUCT_MASTER_PERMISSIONS.brand.delete);

  const loadBrands = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listBrands(token, { excludeMerged: true });
      setItems(response?.data?.brands || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch brands.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const visible = query
      ? items.filter((item) => {
          const haystack = [
            item?.brandName,
            item?.website,
            item?.countryOfOrigin,
            item?.approvalStatus,
          ]
            .map((value) => String(value || '').toLowerCase())
            .join(' ');
          return haystack.includes(query);
        })
      : items;

    return [...visible].sort((left, right) => (right.id ?? 0) - (left.id ?? 0));
  }, [items, searchQuery]);

  const paginated = useMemo(
    () => paginateItems(filteredItems, page, pageSize),
    [filteredItems, page, pageSize]
  );

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [searchQuery, pageSize]);

  const handleView = async (item) => {
    setViewItem(item);
    setBrandProducts([]);
    setBrandProductsLoading(true);
    try {
      const res = await listProducts(token, { brand: item.brandName, size: 50 });
      setBrandProducts(res?.data?.products || res?.data || []);
    } catch {
      setBrandProducts([]);
    } finally {
      setBrandProductsLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditItem(null);
    setForm(initialForm);
  };

  const handleEdit = (item) => {
    if (!canUpdate) {
      setMessage({ type: 'error', text: 'You do not have permission to update brands.' });
      return;
    }
    setEditItem(item);
    setForm({
      brandName: item?.brandName || '',
      logoUrl: item?.logoUrl || '',
      website: item?.website || '',
      countryOfOrigin: item?.countryOfOrigin || '',
      description: item?.description || '',
      approvalStatus: item?.approvalStatus || 'APPROVED',
      isActive: String(item?.isActive !== false),
    });
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (editItem ? !canUpdate : !canCreate) {
      setMessage({
        type: 'error',
        text: editItem ? 'You do not have permission to update brands.' : 'You do not have permission to create brands.',
      });
      return;
    }
    if (!form.brandName.trim()) {
      setMessage({ type: 'error', text: 'Brand name is required.' });
      return;
    }

    const payload = {
      brandName: form.brandName.trim(),
      logoUrl: form.logoUrl.trim() || null,
      website: form.website.trim() || null,
      countryOfOrigin: form.countryOfOrigin.trim() || null,
      description: form.description.trim() || null,
      approvalStatus: form.approvalStatus,
      isActive: form.isActive === 'true',
    };

    try {
      setIsLoading(true);
      if (editItem) {
        await updateBrand(token, editItem.id, payload);
        setMessage({ type: 'success', text: 'Brand updated successfully.' });
        if (viewItem?.id === editItem.id) setViewItem({ ...viewItem, ...payload, id: editItem.id });
      } else {
        await createBrand(token, payload);
        setMessage({ type: 'success', text: 'Brand created successfully.' });
      }
      handleCloseModal();
      await loadBrands();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save the brand.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setMessage({ type: 'error', text: 'You do not have permission to delete brands.' });
      return;
    }
    if (!window.confirm('Delete this brand master? This only works when no products are linked to it.')) {
      return;
    }
    try {
      setIsLoading(true);
      await deleteBrand(token, id);
      setMessage({ type: 'success', text: 'Brand deleted successfully.' });
      if (viewItem?.id === id) setViewItem(null);
      await loadBrands();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete the brand.' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderViewPanel = () => {
    if (!viewItem) return null;
    const statusClass = String(viewItem.approvalStatus || 'pending-review')
      .toLowerCase()
      .replace(/_/g, '-');
    const logoUrl = viewItem.logoUrl
      ? (viewItem.logoUrl.startsWith('http') ? viewItem.logoUrl : `${ADMIN_API_BASE}${viewItem.logoUrl}`)
      : '';

    return (
      <div className="mv-panel card">
        {/* Header */}
        <div className="mv-panel-header">
          <div className="mv-panel-title-row">
            <button type="button" className="mv-back-btn" onClick={() => setViewItem(null)}>
              ← Back
            </button>
            <h3 className="mv-panel-title">{viewItem.brandName}</h3>
            <span className={`status-pill ${statusClass}`}>
              {formatStatus(viewItem.approvalStatus)}
            </span>
          </div>
          {canUpdate && (
            <button type="button" className="ghost-btn small" onClick={() => handleEdit(viewItem)}>
              Edit
            </button>
          )}
        </div>

        {/* Logo */}
        {logoUrl ? (
          <div className="mv-section">
            <p className="mv-section-label">Logo</p>
            <div className="mv-media-row">
              <div className="mv-media-item">
                <img
                  src={logoUrl}
                  alt={viewItem.brandName}
                  className="mv-banner-img"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Brand Details */}
        <div className="mv-section">
          <p className="mv-section-label">Brand Details</p>
          <div className="mv-detail-grid">
            <span className="mv-detail-label">Brand Name</span>
            <span className="mv-detail-value">{viewItem.brandName || '-'}</span>
            <span className="mv-detail-label">Country</span>
            <span className="mv-detail-value">{viewItem.countryOfOrigin || '-'}</span>
            <span className="mv-detail-label">Active</span>
            <span className="mv-detail-value">
              <span className={viewItem.isActive !== false ? 'status-active' : 'status-inactive'}>
                {viewItem.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </span>
            <span className="mv-detail-label">Created</span>
            <span className="mv-detail-value">{formatDateTime(viewItem.createdOn)}</span>
            <span className="mv-detail-label">Updated</span>
            <span className="mv-detail-value">{formatDateTime(viewItem.updatedOn)}</span>
          </div>
          {viewItem.website ? (
            <div style={{ marginTop: 10 }}>
              <span className="mv-detail-label">Website</span>
              <div style={{ marginTop: 2 }}>
                <a
                  href={viewItem.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mv-detail-value"
                  style={{ color: '#6366f1', wordBreak: 'break-all' }}
                >
                  {viewItem.website}
                </a>
              </div>
            </div>
          ) : null}
          {viewItem.description ? (
            <div style={{ marginTop: 10 }}>
              <span className="mv-detail-label">Description</span>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, margin: '4px 0 0' }}>
                {viewItem.description}
              </p>
            </div>
          ) : null}
        </div>

        {/* Products using this brand */}
        <div className="mv-section">
          <p className="mv-section-label">
            Products using this brand
            {brandProducts.length > 0 && (
              <span className="mv-count-badge">{brandProducts.length}</span>
            )}
          </p>
          {brandProductsLoading ? (
            <p className="mv-loading">Loading products…</p>
          ) : brandProducts.length === 0 ? (
            <p className="mv-empty">No products linked to this brand.</p>
          ) : (
            <div className="mv-child-grid">
              {brandProducts.slice(0, 24).map((product) => {
                const img = product?.thumbnailImage || product?.images?.[0] || product?.thumbnailUrl || '';
                const imgSrc = img ? (img.startsWith('http') ? img : `${ADMIN_API_BASE}${img}`) : '';
                return (
                  <div key={product.id} className="mv-child-card" style={{ minWidth: 0, flexBasis: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={product.productName || product.name || ''}
                          style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0, background: '#f1f5f9', border: '1px solid #e2e8f0' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 6, background: '#f1f5f9', flexShrink: 0, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ width: 16, height: 16 }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M3 9h18M9 21V9" />
                          </svg>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="mv-child-name" style={{ marginBottom: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {product.productName || product.name || `Product #${product.id}`}
                        </div>
                        <div className="mv-child-meta">
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>ID: {product.id}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {brandProducts.length > 24 && (
            <p className="mv-empty" style={{ marginTop: 8, textAlign: 'center' }}>
              +{brandProducts.length - 24} more products
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <Banner message={message} />
      {showForm ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={handleCloseModal}>
          <div
            className="admin-modal cat-unified-modal"
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
                  {editItem ? 'Edit Brand Master' : 'Create Brand Master'}
                </h3>
                {form.brandName && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    Brand › {form.brandName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Row 1: Brand Name + Approval Status + Country */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1fr)', gap: 16 }}>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Brand Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={form.brandName}
                        onChange={(event) => handleChange('brandName', event.target.value)}
                        placeholder="e.g. Bosch"
                        required
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Approval Status
                      </label>
                      <select
                        value={form.approvalStatus}
                        onChange={(event) => handleChange('approvalStatus', event.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      >
                        <option value="APPROVED">Approved</option>
                        <option value="PENDING_REVIEW">Pending Review</option>
                      </select>
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Origin Country
                      </label>
                      <input
                        type="text"
                        value={form.countryOfOrigin}
                        onChange={(event) => handleChange('countryOfOrigin', event.target.value)}
                        placeholder="e.g. Germany"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Website + Logo + Status Toggle */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: 16, alignItems: 'end' }}>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Website
                      </label>
                      <input
                        type="url"
                        value={form.website}
                        onChange={(event) => handleChange('website', event.target.value)}
                        placeholder="https://brand.com"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Logo Image URL
                      </label>
                      <input
                        type="url"
                        value={form.logoUrl}
                        onChange={(event) => handleChange('logoUrl', event.target.value)}
                        placeholder="https://..."
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ paddingBottom: 8 }}>
                      <ToggleSwitch
                        id="brand-active-toggle"
                        checked={form.isActive === 'true'}
                        onChange={(val) => handleChange('isActive', val ? 'true' : 'false')}
                        label="Active Status"
                      />
                    </div>
                  </div>

                  {/* Row 4: Description */}
                  <div className="field">
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Description
                    </label>
                    <textarea
                      rows="3"
                      value={form.description}
                      onChange={(event) => handleChange('description', event.target.value)}
                      placeholder="Short note about this brand"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'inherit', fontSize: 14 }}
                    />
                  </div>

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
                  onClick={handleCloseModal}
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
                  {isLoading ? (editItem ? 'Updating...' : 'Saving...') : editItem ? 'Update Brand' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className={`mv-layout${viewItem ? ' mv-layout--split' : ''}`}>
        <div className="panel card users-table-card">
          <DataTable
            columns={[
              {
                key: 'id',
                header: 'Sr. No.',
                width: '70px',
                render: (_, __, index) => page * pageSize + index + 1,
              },
              {
                key: 'brandName',
                header: 'Brand',
                sortable: true,
                render: (val, item) => (
                  <div>
                    <strong>{val}</strong>
                    {item.countryOfOrigin ? <div className="muted" style={{ fontSize: 12 }}>{item.countryOfOrigin}</div> : null}
                  </div>
                ),
              },
              {
                key: 'approvalStatus',
                header: 'Status',
                sortable: true,
                render: (status) => (
                  <span
                    className={`status-pill ${
                      String(status || 'PENDING_REVIEW').toLowerCase().replace(/_/g, '-')
                    }`}
                  >
                    {formatStatus(status)}
                  </span>
                ),
              },
              {
                key: 'isActive',
                header: 'Active',
                render: (active) => (
                  <span className={active ? 'status-verified' : 'status-inactive'}>
                    {active ? 'Active' : 'Inactive'}
                  </span>
                ),
              },
              {
                key: 'website',
                header: 'Website',
                render: (val) => val || '-',
              },
              {
                key: 'updatedOn',
                header: 'Updated On',
                sortable: true,
                render: (_, item) => formatDateTime(item?.updatedOn || item?.createdOn),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (_, item) => {
                  const actions = [
                    { label: 'View', onClick: () => handleView(item) },
                  ];
                  if (canUpdate) {
                    actions.push({ label: 'Edit', onClick: () => handleEdit(item) });
                  }
                  if (canDelete) {
                    actions.push({ label: 'Delete', onClick: () => handleDelete(item.id), danger: true });
                  }
                  return (
                    <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                      <TableRowActionMenu
                        rowId={item.id}
                        openRowId={openActionRowId}
                        onToggle={setOpenActionRowId}
                        actions={actions}
                      />
                    </div>
                  );
                },
              },
            ]}
            data={filteredItems}
            isLoading={isLoading}
            search={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search brands..."
            page={page}
            pageSize={pageSize}
            totalItems={filteredItems.length}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onRowClick={handleView}
            emptyTitle="No brands created yet"
            emptyDescription="There are no brand entries matching your criteria."
            toolbarRight={
              canCreate ? (
                <button
                  type="button"
                  className="gsc-create-btn"
                  onClick={() => {
                    if (showForm) {
                      handleCloseModal();
                    } else {
                      setViewItem(null);
                      setEditItem(null);
                      setForm(initialForm);
                      setShowForm(true);
                    }
                  }}
                  title="Create brand"
                  aria-label="Create brand"
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
              ) : null
            }
          />
        </div>

        {renderViewPanel()}
      </div>
    </div>
  );
}

export default BrandPage;
