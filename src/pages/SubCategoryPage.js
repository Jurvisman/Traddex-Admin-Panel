import { useEffect, useState } from 'react';
import { Banner } from '../components';
import { createSubCategory, deleteSubCategory, listCategories, listSubCategories } from '../services/adminApi';

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.categoryId) {
      setMessage({ type: 'error', text: 'Name and category are required.' });
      return;
    }
    try {
      setIsLoading(true);
      await createSubCategory(token, {
        name: form.name.trim(),
        categoryId: Number(form.categoryId),
        subCategoryIcon: form.subCategoryIcon || null,
        imageUrl: form.imageUrl || null,
        ordering: form.ordering ? Number(form.ordering) : null,
        path: form.path || null,
        active: Number(form.active),
      });
      setForm(initialForm);
      setShowForm(false);
      await loadData();
      setMessage({ type: 'success', text: 'Sub-category created.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create sub-category.' });
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
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Sub-Category</h2>
          <p className="panel-subtitle">Attach sub-categories to categories.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={loadData} disabled={isLoading}>
          Refresh
        </button>
      </div>
      <Banner message={message} />
      {showForm ? (
        <div className="admin-modal-backdrop" onClick={() => setShowForm(false)}>
          <form
            className="admin-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">Create sub-category</h3>
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
              {isLoading ? 'Saving...' : 'Save sub-category'}
            </button>
          </form>
        </div>
      ) : null}
      <div className="panel-grid">
        <div className="panel card">
          <div className="panel-split">
            <h3 className="panel-subheading">Sub-category list</h3>
            <button
              type="button"
              className="primary-btn compact"
              onClick={() => setShowForm((prev) => !prev)}
            >
              {showForm ? 'Close' : 'Create'}
            </button>
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
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.categoryName || '-'}</td>
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

export default SubCategoryPage;
