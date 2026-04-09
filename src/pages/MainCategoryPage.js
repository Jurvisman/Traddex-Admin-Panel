import { useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu, ToggleSwitch } from '../components';
import { usePermissions } from '../shared/permissions';
import {
  createMainCategory,
  deleteMainCategory,
  getMainCategory,
  listIndustries,
  listMainCategories,
  updateMainCategory,
} from '../services/adminApi';
import { buildOrderingWarning, findNextAvailableOrdering, findOrderingConflict, parseOrderingInput } from '../utils/ordering';
import { PRODUCT_MASTER_PERMISSIONS } from '../constants/adminPermissions';

const initialForm = {
  name: '',
  industryId: '',
  mainCategoryIcon: '',
  imageUrl: '',
  ordering: '',
  path: '',
  active: '1',
};

const StatusBadge = ({ active }) => (
  <span className={active === 1 ? 'status-active' : 'status-inactive'}>
    {active === 1 ? 'Active' : 'Inactive'}
  </span>
);

const DetailRow = ({ label, value }) => (
  <div className="mv-detail-row">
    <span className="mv-detail-label">{label}</span>
    <span className="mv-detail-value">{value ?? '-'}</span>
  </div>
);

function MainCategoryPage({ token }) {
  const [items, setItems] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [touched, setTouched] = useState({});
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // View panel state
  const [viewItem, setViewItem] = useState(null);      // { mainCategory: {...}, categories: [...] }
  const [isViewLoading, setIsViewLoading] = useState(false);

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(PRODUCT_MASTER_PERMISSIONS.mainCategory.create);
  const canUpdate = hasPermission(PRODUCT_MASTER_PERMISSIONS.mainCategory.update);
  const canDelete = hasPermission(PRODUCT_MASTER_PERMISSIONS.mainCategory.delete);

  const loadData = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [mainCategoriesResult, industriesResult] = await Promise.allSettled([
        listMainCategories(token),
        listIndustries(token),
      ]);
      if (mainCategoriesResult.status !== 'fulfilled') {
        throw mainCategoriesResult.reason;
      }
      setItems(mainCategoriesResult.value?.data || []);
      const industryData = industriesResult.status === 'fulfilled' ? industriesResult.value?.data || [] : [];
      setIndustries(
        industryData.map((industry) => ({
          ...industry,
          id: industry.id ?? industry.industryId,
          industryId: industry.industryId ?? industry.id,
        }))
      );
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch main categories.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const industryNameById = useMemo(() => {
    const lookup = new Map();
    industries.forEach((industry) => {
      const id = industry.id ?? industry.industryId;
      if (id != null) lookup.set(id, industry.name);
    });
    return lookup;
  }, [industries]);

  const requestedOrdering = parseOrderingInput(form.ordering);
  const orderingConflict = useMemo(
    () =>
      findOrderingConflict({
        items,
        requestedOrder: requestedOrdering,
        currentItemId: editItem?.id,
        matchesScope: (item) => String(item.industryId ?? '') === String(form.industryId ?? ''),
      }),
    [editItem?.id, form.industryId, items, requestedOrdering]
  );
  const suggestedOrdering = useMemo(
    () =>
      findNextAvailableOrdering({
        items,
        currentItemId: editItem?.id,
        matchesScope: (item) => String(item.industryId ?? '') === String(form.industryId ?? ''),
      }),
    [editItem?.id, form.industryId, items]
  );
  const orderingWarning = buildOrderingWarning(requestedOrdering, orderingConflict, suggestedOrdering);

  const validate = (f) => {
    const errs = {};
    if (!f.name.trim()) errs.name = 'Name is required.';
    else if (f.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';
    if (!f.industryId) errs.industryId = 'Industry is required.';
    if (f.ordering !== '' && f.ordering !== null) {
      const n = parseOrderingInput(f.ordering);
      if (Number.isNaN(n)) errs.ordering = 'Must be a whole number ≥ 1.';
    }
    if (f.path && !f.path.startsWith('/')) errs.path = 'Path must start with /';
    return errs;
  };

  const errors = validate(form);
  const fieldErr = (key) => touched[key] && errors[key];

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBlur = (key) => setTouched((prev) => ({ ...prev, [key]: true }));

  const handleEdit = (item) => {
    if (!canUpdate) {
      setMessage({ type: 'error', text: 'You do not have permission to update main categories.' });
      return;
    }
    setEditItem(item);
    setForm({
      name: item.name || '',
      industryId: String(item.industryId ?? ''),
      mainCategoryIcon: item.mainCategoryIcon || '',
      imageUrl: item.imageUrl || '',
      ordering: item.ordering != null ? String(item.ordering) : '',
      path: item.path || '',
      active: item.active === 1 ? '1' : '0',
    });
    setTouched({});
    setViewItem(null);
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditItem(null);
    setForm(initialForm);
    setTouched({});
  };

  const handleView = async (item) => {
    setIsViewLoading(true);
    setViewItem(null);
    setShowForm(false);
    try {
      const response = await getMainCategory(token, item.id);
      // response.data = { mainCategory: {...}, categories: [...] }
      setViewItem(response?.data ?? { mainCategory: item, categories: [] });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load main category details.' });
    } finally {
      setIsViewLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ name: true, industryId: true, ordering: true, path: true });
    if (editItem ? !canUpdate : !canCreate) {
      setMessage({
        type: 'error',
        text: editItem
          ? 'You do not have permission to update main categories.'
          : 'You do not have permission to create main categories.',
      });
      return;
    }
    const submitErrors = validate(form);
    if (Object.keys(submitErrors).length > 0) {
      setMessage({ type: 'error', text: Object.values(submitErrors)[0] });
      return;
    }
    const payload = {
      name: form.name.trim(),
      industryId: Number(form.industryId),
      mainCategoryIcon: form.mainCategoryIcon || null,
      imageUrl: form.imageUrl || null,
      ordering: requestedOrdering,
      path: form.path || null,
      active: Number(form.active),
    };
    try {
      setIsLoading(true);
      if (editItem) {
        await updateMainCategory(token, editItem.id, payload);
        setEditItem(null);
        setMessage({ type: 'success', text: 'Main category updated.' });
      } else {
        await createMainCategory(token, payload);
        setMessage({ type: 'success', text: 'Main category created.' });
      }
      setForm(initialForm);
      setShowForm(false);
      await loadData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || (editItem ? 'Failed to update main category.' : 'Failed to create main category.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setMessage({ type: 'error', text: 'You do not have permission to delete main categories.' });
      return;
    }
    try {
      setIsLoading(true);
      await deleteMainCategory(token, id);
      if (viewItem?.mainCategory?.id === id) setViewItem(null);
      await loadData();
      setMessage({ type: 'success', text: 'Main category deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete main category.' });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── view panel ── */
  const renderViewPanel = () => {
    if (isViewLoading) {
      return (
        <div className="mv-panel card">
          <p className="mv-loading">Loading details…</p>
        </div>
      );
    }
    if (!viewItem) return null;

    const mc = viewItem.mainCategory ?? {};
    const categories = Array.isArray(viewItem.categories) ? viewItem.categories : [];
    const industryName = mc.industryName || industryNameById.get(mc.industryId) || '-';

    return (
      <div className="mv-panel card">
        {/* header */}
        <div className="mv-panel-header">
          <div className="mv-panel-title-row">
            <button type="button" className="mv-back-btn" onClick={() => setViewItem(null)}>
              ← Back
            </button>
            <h3 className="mv-panel-title">{mc.name}</h3>
            <StatusBadge active={mc.active} />
          </div>
          {canUpdate && (
            <button type="button" className="ghost-btn small" onClick={() => handleEdit(mc)}>
              Edit
            </button>
          )}
        </div>

        {/* basic info */}
        <div className="mv-section">
          <p className="mv-section-label">Basic Info</p>
          <div className="mv-detail-grid">
            <DetailRow label="Name" value={mc.name} />
            <DetailRow label="Industry" value={industryName} />
            <DetailRow label="Path" value={mc.path} />
            <DetailRow label="Order" value={mc.ordering} />
            <DetailRow label="Status" value={mc.active === 1 ? 'Active' : 'Inactive'} />
          </div>
        </div>

        {/* images */}
        {(mc.mainCategoryIcon || mc.imageUrl) && (
          <div className="mv-section">
            <p className="mv-section-label">Media</p>
            <div className="mv-media-row">
              {mc.mainCategoryIcon && (
                <div className="mv-media-item">
                  <span className="mv-media-caption">Icon</span>
                  <img src={mc.mainCategoryIcon} alt="icon" className="mv-thumb" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              {mc.imageUrl && (
                <div className="mv-media-item">
                  <span className="mv-media-caption">Banner</span>
                  <img src={mc.imageUrl} alt="banner" className="mv-banner-img" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* categories */}
        <div className="mv-section">
          <p className="mv-section-label">
            Categories
            <span className="mv-count-badge">{categories.length}</span>
          </p>
          {categories.length === 0 ? (
            <p className="mv-empty">No categories linked to this main category.</p>
          ) : (
            <table className="mv-child-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Order</th>
                  <th>Sub-cat?</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...categories]
                  .sort((a, b) => (a.ordering ?? Infinity) - (b.ordering ?? Infinity))
                  .map((cat, idx) => (
                    <tr key={cat.id}>
                      <td>{idx + 1}</td>
                      <td>{cat.name}</td>
                      <td>{cat.ordering ?? '-'}</td>
                      <td>{cat.hasSubCategory === 1 ? 'Yes' : 'No'}</td>
                      <td><StatusBadge active={cat.active} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const filteredItems = items
    .filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const haystack = `${item.name || ''} ${industryNameById.get(item.industryId) || item.industryName || ''}`.toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div>
      <Banner message={message} />
      {showForm ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={closeModal}>
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
                  {editItem ? 'Edit Main Category' : 'Create Main Category'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  {form.industryId ? industryNameById.get(Number(form.industryId)) : 'Industry'} › {form.name || '...'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
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
                  
                  {/* Row 1: Name + Industry */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className={`field${fieldErr('name') ? ' field-error' : ''}`}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(event) => handleChange('name', event.target.value)}
                        onBlur={() => handleBlur('name')}
                        className={fieldErr('name') ? 'input-error' : ''}
                        placeholder="e.g. Machinery"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                      {fieldErr('name') && <span className="field-error-msg">{errors.name}</span>}
                    </div>
                    <div className={`field${fieldErr('industryId') ? ' field-error' : ''}`}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Industry <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        value={form.industryId}
                        onChange={(event) => handleChange('industryId', event.target.value)}
                        onBlur={() => handleBlur('industryId')}
                        className={fieldErr('industryId') ? 'input-error' : ''}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      >
                        <option value="">Select industry</option>
                        {industries.map((industry) => (
                          <option key={industry.id} value={industry.id}>
                            {industry.name}
                          </option>
                        ))}
                      </select>
                      {fieldErr('industryId') && <span className="field-error-msg">{errors.industryId}</span>}
                    </div>
                  </div>

                  {/* Row 2: Ordering + Path + Status */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 16, alignItems: 'end' }}>
                    <div className={`field${fieldErr('ordering') ? ' field-error' : ''}`}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Ordering
                      </label>
                      <input
                        type="number"
                        value={form.ordering}
                        onChange={(event) => handleChange('ordering', event.target.value)}
                        onBlur={() => handleBlur('ordering')}
                        className={fieldErr('ordering') ? 'input-error' : ''}
                        placeholder="1"
                        min="1"
                        step="1"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                      {fieldErr('ordering')
                        ? <span className="field-error-msg">{errors.ordering}</span>
                        : orderingWarning ? <span className="field-help field-warning">{orderingWarning}</span> : null}
                    </div>
                    <div className={`field${fieldErr('path') ? ' field-error' : ''}`}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Path
                      </label>
                      <input
                        type="text"
                        value={form.path}
                        onChange={(event) => handleChange('path', event.target.value)}
                        onBlur={() => handleBlur('path')}
                        className={fieldErr('path') ? 'input-error' : ''}
                        placeholder="/machinery"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                      {fieldErr('path') && <span className="field-error-msg">{errors.path}</span>}
                    </div>
                    <div style={{ paddingBottom: 8 }}>
                      <ToggleSwitch
                        id="mc-active-toggle"
                        checked={Number(form.active) === 1}
                        onChange={(val) => handleChange('active', val ? '1' : '0')}
                        label="Active Status"
                      />
                    </div>
                  </div>

                  {/* Row 3: Icon URL + Banner Image URL */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Icon URL
                      </label>
                      <input
                        type="text"
                        value={form.mainCategoryIcon}
                        onChange={(event) => handleChange('mainCategoryIcon', event.target.value)}
                        placeholder="https://..."
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Banner Image URL
                      </label>
                      <input
                        type="text"
                        value={form.imageUrl}
                        onChange={(event) => handleChange('imageUrl', event.target.value)}
                        placeholder="https://..."
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
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
                  onClick={closeModal}
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
                  {isLoading ? 'Saving...' : editItem ? 'Update Main Category' : 'Save Main Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className={`mv-layout${viewItem || isViewLoading ? ' mv-layout--split' : ''}`}>
        {/* ── List panel ── */}
        <div className="panel card users-table-card">
          <div className="panel-split">
            <div className="category-list-head-left">
              <h3 className="panel-subheading">Main category list</h3>
              <div className="gsc-datatable-toolbar-left">
                <button type="button" className="gsc-toolbar-btn" title="Filter">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h10M4 18h6" />
                  </svg>
                  Filter
                </button>
              </div>
            </div>
            <div className="gsc-datatable-toolbar-right">
              <div className="gsc-toolbar-search">
                <input
                  type="search"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
                  aria-label="Search main categories"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              {canCreate ? (
                <button
                  type="button"
                  className="gsc-create-btn"
                  onClick={() => {
                    if (!showForm) {
                      setEditItem(null);
                      setForm(initialForm);
                      setViewItem(null);
                    }
                    setShowForm((prev) => !prev);
                  }}
                  title="Create main category"
                  aria-label="Create main category"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
          {items.length === 0 ? (
            <p className="empty-state">No main categories yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Name</th>
                    <th>Industry</th>
                    <th>Status</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className={viewItem?.mainCategory?.id === item.id ? 'mv-row-active' : ''}
                      onClick={() => handleView(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{(safePage - 1) * pageSize + index + 1}</td>
                      <td>{item.name}</td>
                      <td>{industryNameById.get(item.industryId) || item.industryName || '-'}</td>
                      <td><StatusBadge active={item.active} /></td>
                      <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const actions = [];
                          actions.push({ label: 'View', onClick: () => handleView(item) });
                          if (canUpdate) actions.push({ label: 'Edit', onClick: () => handleEdit(item) });
                          if (canDelete) actions.push({ label: 'Delete', onClick: () => handleDelete(item.id), danger: true });
                          if (actions.length === 0) return null;
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
                  <span>{filteredItems.length === 0 ? '0 records' : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredItems.length)} of ${filteredItems.length}`}</span>
                </div>
                <div className="product-pagination-controls">
                  <label className="product-pagination-size">
                    <span>Rows</span>
                    <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                      {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <div className="bv-table-pagination">
                    <button type="button" className="secondary-btn" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{'< Prev'}</button>
                    <span>Page {safePage} / {totalPages}</span>
                    <button type="button" className="secondary-btn" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>{'Next >'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── View panel ── */}
        {renderViewPanel()}
      </div>
    </div>
  );
}

export default MainCategoryPage;
