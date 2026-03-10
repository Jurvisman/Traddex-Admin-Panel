import { useEffect, useState } from 'react';
import { Banner } from '../components';
import { createSubCategory, deleteSubCategory, listCategories, listSubCategories, updateSubCategory } from '../services/adminApi';

const initialForm = {
  name: '',
  categoryId: '',
  subCategoryIcon: '',
  imageUrl: '',
  ordering: '',
  path: '',
  active: '1',
};

function SubCategoryPage({ token }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editItem, setEditItem] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [subCategories, categoryList] = await Promise.all([
        listSubCategories(token),
        listCategories(token),
      ]);
      setItems(subCategories?.data || []);
      setCategories(categoryList?.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch sub-categories.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name || '',
      categoryId: String(item.categoryId ?? item.category_id ?? ''),
      subCategoryIcon: item.subCategoryIcon ?? item.sub_category_icon ?? '',
      imageUrl: item.imageUrl ?? item.image_url ?? '',
      ordering: item.ordering != null ? String(item.ordering) : '',
      path: item.path ?? '',
      active: item.active === 1 ? '1' : '0',
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditItem(null);
    setForm(initialForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.categoryId) {
      setMessage({ type: 'error', text: 'Name and category are required.' });
      return;
    }
    const payload = {
      name: form.name.trim(),
      categoryId: Number(form.categoryId),
      subCategoryIcon: form.subCategoryIcon || null,
      imageUrl: form.imageUrl || null,
      ordering: form.ordering ? Number(form.ordering) : null,
      path: form.path || null,
      active: Number(form.active),
    };
    try {
      setIsLoading(true);
      if (editItem) {
        await updateSubCategory(token, editItem.id, payload);
        setMessage({ type: 'success', text: 'Sub-category updated.' });
      } else {
        await createSubCategory(token, payload);
        setMessage({ type: 'success', text: 'Sub-category created.' });
      }
      setEditItem(null);
      setForm(initialForm);
      setShowForm(false);
      await loadData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || (editItem ? 'Failed to update sub-category.' : 'Failed to create sub-category.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setIsLoading(true);
      await deleteSubCategory(token, id);
      await loadData();
      setMessage({ type: 'success', text: 'Sub-category deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete sub-category.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Banner message={message} />
      {showForm ? (
        <div className="admin-modal-backdrop" onClick={handleCloseForm}>
          <form
            className="admin-modal sub-category-create-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">{editItem ? 'Edit sub-category' : 'Create sub-category'}</h3>
              <button type="button" className="ghost-btn small" onClick={handleCloseForm}>
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
                  placeholder="e.g. Diesel engines"
                  required
                />
              </label>
              <label className="field">
                <span>Category</span>
                <select
                  value={form.categoryId}
                  onChange={(event) => handleChange('categoryId', event.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
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
                  placeholder="/diesel-engines"
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
                  value={form.subCategoryIcon}
                  onChange={(event) => handleChange('subCategoryIcon', event.target.value)}
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
              {isLoading ? 'Saving...' : editItem ? 'Update sub-category' : 'Save sub-category'}
            </button>
          </form>
        </div>
      ) : null}
      <div className="panel-grid">
        <div className="panel card">
          <div className="panel-split">
            <div className="category-list-head-left">
              <h3 className="panel-subheading">Sub-category list</h3>
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
                  aria-label="Search sub-categories"
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
                title="Create sub-category"
                aria-label="Create sub-category"
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
            <p className="empty-state">No sub-categories yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((item) => {
                      const q = searchQuery.trim().toLowerCase();
                      if (!q) return true;
                      const haystack = `${item.name || ''} ${item.categoryName || ''}`.toLowerCase();
                      return haystack.includes(q);
                    })
                    .map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.categoryName || '-'}</td>
                      <td>{item.active === 1 ? 'Yes' : 'No'}</td>
                      <td className="table-actions">
                        <button type="button" className="ghost-btn small" onClick={() => handleEdit(item)}>
                          Edit
                        </button>
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

export default SubCategoryPage;
