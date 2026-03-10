import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { createMainCategory, deleteMainCategory, listIndustries, listMainCategories } from '../services/adminApi';

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.industryId) {
      setMessage({ type: 'error', text: 'Name and industry are required.' });
      return;
    }
    try {
      setIsLoading(true);
      await createMainCategory(token, {
        name: form.name.trim(),
        industryId: Number(form.industryId),
        mainCategoryIcon: form.mainCategoryIcon || null,
        imageUrl: form.imageUrl || null,
        ordering: form.ordering ? Number(form.ordering) : null,
        path: form.path || null,
        active: Number(form.active),
      });
      setForm(initialForm);
      setShowForm(false);
      await loadData();
      setMessage({ type: 'success', text: 'Main category created.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create main category.' });
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
        <div className="admin-modal-backdrop" onClick={() => setShowForm(false)}>
          <form
            className="admin-modal main-category-create-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">Create main category</h3>
              <button type="button" className="ghost-btn small" onClick={() => setShowForm(false)}>
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
              {isLoading ? 'Saving...' : 'Save main category'}
            </button>
          </form>
        </div>
      ) : null}
      <div className="panel-grid">
        <div className="panel card">
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
                onClick={() => setShowForm((prev) => !prev)}
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
                    <th>Name</th>
                    <th>Industry</th>
                    <th>Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((item) => {
                      const q = searchQuery.trim().toLowerCase();
                      if (!q) return true;
                      const haystack = `${item.name || ''} ${industryNameById.get(item.industryId) || ''}`.toLowerCase();
                      return haystack.includes(q);
                    })
                    .map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{industryNameById.get(item.industryId) || '-'}</td>
                      <td>{item.active === 1 ? 'Yes' : 'No'}</td>
                      <td className="table-actions">
                        <button type="button" className="ghost-btn small" onClick={() => handleDelete(item.id)}>
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
    </div>
  );
}

export default MainCategoryPage;
