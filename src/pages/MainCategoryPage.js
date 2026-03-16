import { useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import {
  createMainCategory,
  deleteMainCategory,
  listIndustries,
  listMainCategories,
  updateMainCategory,
} from '../services/adminApi';

const initialForm = {
  name: '',
  industryId: '',
  mainCategoryIcon: '',
  imageUrl: '',
  ordering: '',
  path: '',
  active: '1',
};

function MainCategoryPage({ token }) {
  const [items, setItems] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [openActionRowId, setOpenActionRowId] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [mainCategories, industryList] = await Promise.all([
        listMainCategories(token),
        listIndustries(token),
      ]);
      setItems(mainCategories?.data || []);
      const industryData = industryList?.data || [];
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
      if (id != null) {
        lookup.set(id, industry.name);
      }
    });
    return lookup;
  }, [industries]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEdit = (item) => {
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
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditItem(null);
    setForm(initialForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.industryId) {
      setMessage({ type: 'error', text: 'Name and industry are required.' });
      return;
    }
    const payload = {
      name: form.name.trim(),
      industryId: Number(form.industryId),
      mainCategoryIcon: form.mainCategoryIcon || null,
      imageUrl: form.imageUrl || null,
      ordering: form.ordering ? Number(form.ordering) : null,
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
    try {
      setIsLoading(true);
      await deleteMainCategory(token, id);
      await loadData();
      setMessage({ type: 'success', text: 'Main category deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete main category.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Banner message={message} />
      {showForm ? (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <form
            className="admin-modal main-category-create-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">{editItem ? 'Edit main category' : 'Create main category'}</h3>
              <button type="button" className="ghost-btn small" onClick={closeModal}>
                Close
              </button>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  placeholder="e.g. Machinery"
                  required
                />
              </label>
              <label className="field">
                <span>Industry</span>
                <select
                  value={form.industryId}
                  onChange={(event) => handleChange('industryId', event.target.value)}
                  required
                >
                  <option value="">Select industry</option>
                  {industries.map((industry) => (
                    <option key={industry.id} value={industry.id}>
                      {industry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Ordering</span>
                <input
                  type="number"
                  value={form.ordering}
                  onChange={(event) => handleChange('ordering', event.target.value)}
                  placeholder="1"
                />
              </label>
              <label className="field">
                <span>Path</span>
                <input
                  type="text"
                  value={form.path}
                  onChange={(event) => handleChange('path', event.target.value)}
                  placeholder="/machinery"
                />
              </label>
              <label className="field">
                <span>Active</span>
                <select value={form.active} onChange={(event) => handleChange('active', event.target.value)}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <label className="field">
                <span>Icon URL</span>
                <input
                  type="text"
                  value={form.mainCategoryIcon}
                  onChange={(event) => handleChange('mainCategoryIcon', event.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label className="field">
                <span>Image URL</span>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(event) => handleChange('imageUrl', event.target.value)}
                  placeholder="https://..."
                />
              </label>
            </div>
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : editItem ? 'Update main category' : 'Save main category'}
            </button>
          </form>
        </div>
      ) : null}
      <div className="panel-grid">
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
                <button type="button" className="gsc-toolbar-btn" title="Columns">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="18" rx="1" />
                    <rect x="14" y="3" width="7" height="18" rx="1" />
                  </svg>
                  Columns
                </button>
                <button type="button" className="gsc-toolbar-btn" title="Import/Export">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Import/Export
                </button>
              </div>
            </div>
            <div className="gsc-datatable-toolbar-right">
              <div className="gsc-toolbar-search">
                <input
                  type="search"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label="Search main categories"
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
                onClick={() => {
                  if (!showForm) {
                    setEditItem(null);
                    setForm(initialForm);
                  }
                  setShowForm((prev) => !prev);
                }}
                title="Create main category"
                aria-label="Create main category"
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
                  {(() => {
                    const filtered = items
                      .filter((item) => {
                        const q = searchQuery.trim().toLowerCase();
                        if (!q) return true;
                        const haystack = `${item.name || ''} ${industryNameById.get(item.industryId) || ''}`.toLowerCase();
                        return haystack.includes(q);
                      })
                      .sort((a, b) => {
                        const orderA = a.ordering != null ? Number(a.ordering) : Infinity;
                        const orderB = b.ordering != null ? Number(b.ordering) : Infinity;
                        if (orderA !== orderB) return orderA - orderB;
                        return (a.id ?? 0) - (b.id ?? 0);
                      });
                    return filtered.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>{item.name}</td>
                        <td>{industryNameById.get(item.industryId) || '-'}</td>
                        <td>
                          <span className={item.active === 1 ? 'status-active' : 'status-inactive'}>
                            {item.active === 1 ? 'Active' : 'Inactive'}
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
                    ));
                  })()}
                </tbody>
              </table>
              <div className="table-record-count">
                <span>Showing {items.filter((item) => { const q = searchQuery.trim().toLowerCase(); if (!q) return true; return `${item.name || ''} ${industryNameById.get(item.industryId) || ''}`.toLowerCase().includes(q); }).length} of {items.length} records</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MainCategoryPage;
