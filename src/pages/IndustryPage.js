import { useEffect, useMemo, useState } from 'react';
import { Banner, DataTable, TableRowActionMenu, TaxonomyDeleteImpactDialog, ToggleSwitch } from '../components';
import CatalogBulkImportModal from '../components/CatalogBulkImportModal';
import { usePermissions } from '../shared/permissions';
import { createIndustry, deleteIndustry, getIndustry, getIndustryDeleteImpact, listIndustries, updateIndustry } from '../services/adminApi';
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    target: null,
    impact: null,
    loading: false,
    deleting: false,
    deactivating: false,
  });

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
      const data = (response?.data || []).filter((item) => String(item.name || '').trim().toLowerCase() !== 'home');
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
    else if (items.some((item) => String(item.id ?? item.industryId) !== String(editItem?.id ?? '') && String(item.name || '').trim().toLowerCase() === f.name.trim().toLowerCase())) {
      errs.name = 'This industry name already exists.';
    }
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

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, target: null, impact: null, loading: false, deleting: false, deactivating: false });
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setMessage({ type: 'error', text: 'You do not have permission to delete industries.' });
      return;
    }
    const target = items.find((item) => String(item.id ?? item.industryId) === String(id)) || { id };
    setDeleteDialog({ open: true, target, impact: null, loading: true, deleting: false, deactivating: false });
    try {
      const response = await getIndustryDeleteImpact(token, id);
      setDeleteDialog((prev) => ({ ...prev, impact: response?.data || null, loading: false }));
    } catch (error) {
      closeDeleteDialog();
      setMessage({ type: 'error', text: error.message || 'Failed to check industry usage.' });
    }
  };

  const confirmDelete = async () => {
    const id = deleteDialog.target?.id ?? deleteDialog.target?.industryId;
    if (!id) return;
    try {
      setDeleteDialog((prev) => ({ ...prev, deleting: true }));
      await deleteIndustry(token, id);
      if (viewItem?.industry?.id === id || viewItem?.industry?.industryId === id) {
        setViewItem(null);
      }
      await loadIndustries();
      closeDeleteDialog();
      setMessage({ type: 'success', text: 'Industry deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete industry.' });
    } finally {
      setDeleteDialog((prev) => ({ ...prev, deleting: false }));
    }
  };

  const deactivateInstead = async () => {
    const item = deleteDialog.target;
    const id = item?.id ?? item?.industryId;
    if (!id) return;
    const payload = {
      name: item.name,
      industryIcon: item.industryIcon || null,
      industryImage: item.industryImage || null,
      ordering: item.ordering ?? null,
      path: item.path || null,
      active: 0,
    };
    try {
      setDeleteDialog((prev) => ({ ...prev, deactivating: true }));
      await updateIndustry(token, id, payload);
      if (viewItem?.industry?.id === id || viewItem?.industry?.industryId === id) {
        setViewItem((prev) => prev ? { ...prev, industry: { ...prev.industry, active: 0 } } : prev);
      }
      await loadIndustries();
      closeDeleteDialog();
      setMessage({ type: 'success', text: 'Industry deactivated. Existing records are preserved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to deactivate industry.' });
    } finally {
      setDeleteDialog((prev) => ({ ...prev, deactivating: false }));
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
    .filter((item) => statusFilter === 'all' || String(item.active ?? 1) === statusFilter)
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
          <DataTable
            columns={[
              {
                key: 'srNo',
                header: 'Sr. No.',
                width: '70px',
                render: (_, __, index) => (safePage - 1) * pageSize + index + 1,
              },
              {
                key: 'name',
                header: 'Name',
                sortable: true,
                render: (val, item) => (
                  <span
                    className="bdt-name-link"
                    style={{ color: '#6345ED', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(item);
                    }}
                  >
                    {val}
                  </span>
                ),
              },
              {
                key: 'active',
                header: 'Status',
                sortable: true,
                render: (val) => <StatusBadge active={val} />,
              },
              {
                key: 'ordering',
                header: 'Order',
                sortable: true,
                render: (val) => val ?? '-',
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (_, item) => {
                  const actions = [];
                  actions.push({ label: 'View', onClick: () => handleView(item) });
                  if (canUpdate) actions.push({ label: 'Edit', onClick: () => handleEdit(item) });
                  if (canDelete) actions.push({ label: 'Delete', onClick: () => handleDelete(item.id), danger: true });
                  if (actions.length === 0) return null;
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
            onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
            searchPlaceholder="Search industries..."
            page={safePage - 1}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p + 1)}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
            pageSizeOptions={[10, 20, 50, 100]}
            onRowClick={(item) => handleView(item)}
            emptyTitle="No industries yet"
            emptyDescription="No industries found matching your criteria."
            toolbarLeft={
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  className="gsc-toolbar-btn"
                  value={statusFilter}
                  onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
                  aria-label="Filter industries by status"
                  style={{ border: 'none', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="all">All status</option>
                  <option value="1">Active only</option>
                  <option value="0">Inactive only</option>
                </select>
                <button
                  type="button"
                  className="gsc-toolbar-btn"
                  title="Bulk Taxonomy Import"
                  onClick={() => setShowBulkImport(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 8l5-5 5 5M12 3v13" />
                  </svg>
                  Bulk Import
                </button>
              </div>
            }
            toolbarRight={
              canCreate ? (
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              ) : null
            }
          />
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
      <TaxonomyDeleteImpactDialog
        open={deleteDialog.open}
        impact={deleteDialog.impact}
        loading={deleteDialog.loading}
        deleting={deleteDialog.deleting}
        deactivating={deleteDialog.deactivating}
        canDeactivate={canUpdate}
        onCancel={closeDeleteDialog}
        onDelete={confirmDelete}
        onDeactivate={deactivateInstead}
      />
    </div>
  );
}

export default IndustryPage;
