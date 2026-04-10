import { useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu, ToggleSwitch } from '../components';
import CatalogBulkImportModal from '../components/CatalogBulkImportModal';
import { usePermissions } from '../shared/permissions';
import { createIndustry, deleteIndustry, getIndustry, listIndustries, updateIndustry } from '../services/adminApi';
import { buildOrderingWarning, findNextAvailableOrdering, findOrderingConflict, parseOrderingInput } from '../utils/ordering';
import { PRODUCT_MASTER_PERMISSIONS } from '../constants/adminPermissions';

const initialForm = {
  name: '',
  industryIcon: '',
  industryImage: '',
  ordering: '',
  path: '',
  active: '1',
};

/* ── small helpers ── */
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

function IndustryPage({ token }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [touched, setTouched] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // View panel state
  const [viewItem, setViewItem] = useState(null);      // { industry, mainCategories }
  const [isViewLoading, setIsViewLoading] = useState(false);

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(PRODUCT_MASTER_PERMISSIONS.industry.create);
  const canUpdate = hasPermission(PRODUCT_MASTER_PERMISSIONS.industry.update);
  const canDelete = hasPermission(PRODUCT_MASTER_PERMISSIONS.industry.delete);

  const loadIndustries = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listIndustries(token);
      const data = response?.data || [];
      setItems(data.map((item) => ({ ...item, id: item.id ?? item.industryId })));
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch industries.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIndustries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestedOrdering = parseOrderingInput(form.ordering);
  const orderingConflict = useMemo(
    () =>
      findOrderingConflict({
        items,
        requestedOrder: requestedOrdering,
        currentItemId: editItem?.id,
        getItemId: (item) => item.id ?? item.industryId,
      }),
    [editItem?.id, items, requestedOrdering]
  );
  const suggestedOrdering = useMemo(
    () =>
      findNextAvailableOrdering({
        items,
        currentItemId: editItem?.id,
        getItemId: (item) => item.id ?? item.industryId,
      }),
    [editItem?.id, items]
  );
  const orderingWarning = buildOrderingWarning(requestedOrdering, orderingConflict, suggestedOrdering);

  const validate = (f) => {
    const errs = {};
    if (!f.name.trim()) errs.name = 'Industry name is required.';
    else if (f.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';
    if (f.ordering !== '' && f.ordering !== null) {
      const n = parseOrderingInput(f.ordering);
      if (Number.isNaN(n)) errs.ordering = 'Must be a whole number ≥ 1.';
    }
    if (f.path && !f.path.startsWith('/')) f.path = '/' + f.path;
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
      setMessage({ type: 'error', text: 'You do not have permission to update industries.' });
      return;
    }
    setEditItem(item);
    setForm({
      name: item.name || '',
      industryIcon: item.industryIcon || '',
      industryImage: item.industryImage || '',
      ordering: item.ordering ?? '',
      path: item.path || '',
      active: String(item.active ?? 1),
    });
    setTouched({});
    setViewItem(null);
    setShowForm(true);
  };

  const handleCloseModal = () => {
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
      const response = await getIndustry(token, item.id ?? item.industryId);
      // response.data = { industry: {...}, mainCategories: [...] }
      setViewItem(response?.data ?? { industry: item, mainCategories: [] });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load industry details.' });
    } finally {
      setIsViewLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ name: true, ordering: true, path: true });
    if (editItem ? !canUpdate : !canCreate) {
      setMessage({
        type: 'error',
        text: editItem ? 'You do not have permission to update industries.' : 'You do not have permission to create industries.',
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
      industryIcon: form.industryIcon || null,
      industryImage: form.industryImage || null,
      ordering: requestedOrdering,
      path: form.path || null,
      active: Number(form.active),
    };
    try {
      setIsLoading(true);
      if (editItem) {
        await updateIndustry(token, editItem.id, payload);
        setMessage({ type: 'success', text: 'Industry updated successfully.' });
      } else {
        await createIndustry(token, payload);
        setMessage({ type: 'success', text: 'Industry created successfully.' });
      }
      setForm(initialForm);
      setShowForm(false);
      setEditItem(null);
      await loadIndustries();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || (editItem ? 'Failed to update industry.' : 'Failed to create industry.') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setMessage({ type: 'error', text: 'You do not have permission to delete industries.' });
      return;
    }
    try {
      setIsLoading(true);
      await deleteIndustry(token, id);
      if (viewItem?.industry?.id === id || viewItem?.industry?.industryId === id) {
        setViewItem(null);
      }
      await loadIndustries();
      setMessage({ type: 'success', text: 'Industry deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete industry.' });
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

    const ind = viewItem.industry ?? {};
    const mainCats = Array.isArray(viewItem.mainCategories) ? viewItem.mainCategories : [];

    return (
      <div className="mv-panel card">
        {/* header */}
        <div className="mv-panel-header">
          <div className="mv-panel-title-row">
            <button type="button" className="mv-back-btn" onClick={() => setViewItem(null)}>
              ← Back
            </button>
            <h3 className="mv-panel-title">{ind.name}</h3>
            <StatusBadge active={ind.active} />
          </div>
          {canUpdate && (
            <button type="button" className="ghost-btn small" onClick={() => handleEdit({ ...ind, id: ind.id ?? ind.industryId })}>
              Edit
            </button>
          )}
        </div>

        {/* basic info */}
        <div className="mv-section">
          <p className="mv-section-label">Basic Info</p>
          <div className="mv-detail-grid">
            <DetailRow label="Name" value={ind.name} />
            <DetailRow label="Path" value={ind.path} />
            <DetailRow label="Order" value={ind.ordering} />
            <DetailRow label="Status" value={ind.active === 1 ? 'Active' : 'Inactive'} />
          </div>
        </div>

        {/* images */}
        {(ind.industryIcon || ind.industryImage) && (
          <div className="mv-section">
            <p className="mv-section-label">Media</p>
            <div className="mv-media-row">
              {ind.industryIcon && (
                <div className="mv-media-item">
                  <span className="mv-media-caption">Icon</span>
                  <img src={ind.industryIcon} alt="icon" className="mv-thumb" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              {ind.industryImage && (
                <div className="mv-media-item">
                  <span className="mv-media-caption">Banner</span>
                  <img src={ind.industryImage} alt="banner" className="mv-banner-img" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* main categories */}
        <div className="mv-section">
          <p className="mv-section-label">
            Main Categories
            <span className="mv-count-badge">{mainCats.length}</span>
          </p>
          {mainCats.length === 0 ? (
            <p className="mv-empty">No main categories linked to this industry.</p>
          ) : (
            <div className="mv-child-grid">
              {mainCats.map((mc) => (
                <div key={mc.id} className="mv-child-card">
                  <div className="mv-child-name">{mc.name}</div>
                  <div className="mv-child-meta">
                    <StatusBadge active={mc.active} />
                    {mc.ordering != null && <span className="mv-child-order">Order: {mc.ordering}</span>}
                    {Array.isArray(mc.categories) && mc.categories.length > 0 && (
                      <span className="mv-child-cats">{mc.categories.length} categories</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredItems = items
    .filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return String(item.name || '').toLowerCase().includes(q);
    })
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);

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
                  {editItem ? 'Edit Industry' : 'Create Industry'}
                </h3>
                {form.name && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    Industry › {form.name}
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
                  
                  {/* Row 1: Name + Ordering + Path */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.6fr 1.2fr', gap: 16 }}>
                    <div className={`field${fieldErr('name') ? ' field-error' : ''}`}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Industry Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(event) => handleChange('name', event.target.value)}
                        onBlur={() => handleBlur('name')}
                        className={fieldErr('name') ? 'input-error' : ''}
                        placeholder="e.g. Agriculture"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                      {fieldErr('name') && <span className="field-error-msg">{errors.name}</span>}
                    </div>
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
                        placeholder="/agriculture"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Status + URLs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.1fr 1.1fr', gap: 16, alignItems: 'end' }}>
                    <div style={{ paddingBottom: 8 }}>
                      <ToggleSwitch
                        id="industry-active-toggle"
                        checked={Number(form.active) === 1}
                        onChange={(val) => handleChange('active', val ? '1' : '0')}
                        label="Active Status"
                      />
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Icon URL
                      </label>
                      <input
                        type="text"
                        value={form.industryIcon}
                        onChange={(event) => handleChange('industryIcon', event.target.value)}
                        placeholder="https://..."
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Banner URL
                      </label>
                      <input
                        type="text"
                        value={form.industryImage}
                        onChange={(event) => handleChange('industryImage', event.target.value)}
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
                  {isLoading ? (editItem ? 'Updating...' : 'Saving...') : (editItem ? 'Update Industry' : 'Save Industry')}
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
              <h3 className="panel-subheading">Industry list</h3>
              <div className="gsc-datatable-toolbar-left">
                <button type="button" className="gsc-toolbar-btn" title="Filter">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h10M4 18h6" />
                  </svg>
                  Filter
                </button>
                <button type="button" className="gsc-toolbar-btn" title="Bulk Taxonomy Import" onClick={() => setShowBulkImport(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 8l5-5 5 5M12 3v13" />
                  </svg>
                  Bulk Import
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
                  aria-label="Search industries"
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
                    if (showForm) {
                      handleCloseModal();
                    } else {
                      setEditItem(null);
                      setForm(initialForm);
                      setViewItem(null);
                      setShowForm(true);
                    }
                  }}
                  title="Create industry"
                  aria-label="Create industry"
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
            <p className="empty-state">No industries yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Order</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className={viewItem?.industry?.id === item.id ? 'mv-row-active' : ''}
                      onClick={() => handleView(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{(safePage - 1) * pageSize + index + 1}</td>
                      <td>{item.name}</td>
                      <td><StatusBadge active={item.active} /></td>
                      <td>{item.ordering ?? '-'}</td>
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

      {showBulkImport ? (
        <CatalogBulkImportModal
          token={token}
          industries={items}
          onClose={() => setShowBulkImport(false)}
          onImportSuccess={() => {
            loadIndustries();
            setShowBulkImport(false);
            setMessage({ type: 'success', text: 'Taxonomy imported successfully.' });
          }}
        />
      ) : null}
    </div>
  );
}

export default IndustryPage;
