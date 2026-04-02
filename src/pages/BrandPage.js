import { useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import { usePermissions } from '../shared/permissions';
import { createBrand, deleteBrand, listBrands, updateBrand } from '../services/adminApi';
import { PRODUCT_MASTER_PERMISSIONS } from '../constants/adminPermissions';

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

    return [...visible].sort((left, right) => {
      const leftPending = String(left?.approvalStatus || '').toUpperCase() === 'PENDING_REVIEW' ? 0 : 1;
      const rightPending = String(right?.approvalStatus || '').toUpperCase() === 'PENDING_REVIEW' ? 0 : 1;
      if (leftPending !== rightPending) return leftPending - rightPending;
      return String(left?.brandName || '').localeCompare(String(right?.brandName || ''));
    });
  }, [items, searchQuery]);

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
      await loadBrands();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete the brand.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Banner message={message} />
      {showForm ? (
        <div className="admin-modal-backdrop" onClick={handleCloseModal}>
          <form
            className="admin-modal industry-create-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">{editItem ? 'Edit brand master' : 'Create brand master'}</h3>
              <button type="button" className="ghost-btn small" onClick={handleCloseModal}>
                Close
              </button>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Brand name</span>
                <input
                  type="text"
                  value={form.brandName}
                  onChange={(event) => handleChange('brandName', event.target.value)}
                  placeholder="e.g. Bosch"
                  required
                />
              </label>
              <label className="field">
                <span>Approval status</span>
                <select
                  value={form.approvalStatus}
                  onChange={(event) => handleChange('approvalStatus', event.target.value)}
                >
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                </select>
              </label>
              <label className="field">
                <span>Active</span>
                <select value={form.isActive} onChange={(event) => handleChange('isActive', event.target.value)}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <label className="field">
                <span>Country of origin</span>
                <input
                  type="text"
                  value={form.countryOfOrigin}
                  onChange={(event) => handleChange('countryOfOrigin', event.target.value)}
                  placeholder="e.g. Germany"
                />
              </label>
              <label className="field">
                <span>Website</span>
                <input
                  type="url"
                  value={form.website}
                  onChange={(event) => handleChange('website', event.target.value)}
                  placeholder="https://brand.com"
                />
              </label>
              <label className="field">
                <span>Logo URL</span>
                <input
                  type="url"
                  value={form.logoUrl}
                  onChange={(event) => handleChange('logoUrl', event.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label className="field field-span">
                <span>Description</span>
                <textarea
                  rows="4"
                  value={form.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  placeholder="Short note about this brand"
                />
              </label>
            </div>
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? (editItem ? 'Updating...' : 'Saving...') : editItem ? 'Update brand' : 'Save brand'}
            </button>
          </form>
        </div>
      ) : null}

      <div className="panel-grid">
        <div className="panel card users-table-card">
          <div className="panel-split">
            <div className="category-list-head-left">
              <h3 className="panel-subheading">Brand master list</h3>
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
              </div>
            </div>
            <div className="gsc-datatable-toolbar-right">
              <div className="gsc-toolbar-search">
                <input
                  type="search"
                  placeholder="Search brands"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label="Search brands"
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
                  onClick={() => {
                    if (showForm) {
                      handleCloseModal();
                    } else {
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
              ) : null}
            </div>
          </div>

          {items.length === 0 ? (
            <p className="empty-state">No brands created yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Brand</th>
                    <th>Status</th>
                    <th>Active</th>
                    <th>Website</th>
                    <th>Updated On</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div>
                          <strong>{item.brandName}</strong>
                          {item.countryOfOrigin ? <div className="muted">{item.countryOfOrigin}</div> : null}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            String(item?.approvalStatus || 'PENDING_REVIEW').toLowerCase().replace(/_/g, '-')
                          }`}
                        >
                          {formatStatus(item?.approvalStatus)}
                        </span>
                      </td>
                      <td>
                        <span className={item?.isActive ? 'status-active' : 'status-inactive'}>
                          {item?.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{item?.website || '-'}</td>
                      <td>{formatDateTime(item?.updatedOn || item?.createdOn)}</td>
                      <td className="table-actions" onClick={(event) => event.stopPropagation()}>
                        {(() => {
                          const actions = [];
                          if (canUpdate) {
                            actions.push({ label: 'Edit', onClick: () => handleEdit(item) });
                          }
                          if (canDelete) {
                            actions.push({ label: 'Delete', onClick: () => handleDelete(item.id), danger: true });
                          }
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

export default BrandPage;
