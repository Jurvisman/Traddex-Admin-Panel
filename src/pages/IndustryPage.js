import { useEffect, useState } from 'react';
import { Banner } from '../components';
import { createIndustry, deleteIndustry, listIndustries } from '../services/adminApi';

const initialForm = {
  name: '',
  industryIcon: '',
  industryImage: '',
  ordering: '',
  path: '',
  active: '1',
};

function IndustryPage({ token }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

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

  const activeCount = items.filter((item) => Number(item.active) === 1).length;
  const inactiveCount = Math.max(0, items.length - activeCount);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Industry name is required.' });
      return;
    }
    try {
      setIsLoading(true);
      await createIndustry(token, {
        name: form.name.trim(),
        industryIcon: form.industryIcon || null,
        industryImage: form.industryImage || null,
        ordering: form.ordering ? Number(form.ordering) : null,
        path: form.path || null,
        active: Number(form.active),
      });
      setForm(initialForm);
      setShowForm(false);
      await loadIndustries();
      setMessage({ type: 'success', text: 'Industry created successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create industry.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setIsLoading(true);
      await deleteIndustry(token, id);
      await loadIndustries();
      setMessage({ type: 'success', text: 'Industry deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete industry.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Industry</h2>
          <p className="panel-subtitle">Create and maintain industry groups.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={loadIndustries} disabled={isLoading}>
          Refresh
        </button>
      </div>
      <Banner message={message} />
      <div className="stat-grid">
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F59E0B' }}>
          <p className="stat-label">Total industries</p>
          <p className="stat-value">{items.length}</p>
          <p className="stat-sub">All groups</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#16A34A' }}>
          <p className="stat-label">Active</p>
          <p className="stat-value">{activeCount}</p>
          <p className="stat-sub">Visible to users</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#EF4444' }}>
          <p className="stat-label">Inactive</p>
          <p className="stat-value">{inactiveCount}</p>
          <p className="stat-sub">Hidden from users</p>
        </div>
      </div>
      {showForm ? (
        <div className="admin-modal-backdrop" onClick={() => setShowForm(false)}>
          <form
            className="admin-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">Create industry</h3>
              <button type="button" className="ghost-btn small" onClick={() => setShowForm(false)}>
                Close
              </button>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Industry name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  placeholder="e.g. Agriculture"
                  required
                />
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
                  placeholder="/agriculture"
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
                  value={form.industryIcon}
                  onChange={(event) => handleChange('industryIcon', event.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label className="field">
                <span>Image URL</span>
                <input
                  type="text"
                  value={form.industryImage}
                  onChange={(event) => handleChange('industryImage', event.target.value)}
                  placeholder="https://..."
                />
              </label>
            </div>
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save industry'}
            </button>
          </form>
        </div>
      ) : null}
      <div className="panel-grid">
        <div className="panel card">
          <div className="panel-split">
            <h3 className="panel-subheading">Industry list</h3>
            <button
              type="button"
              className="primary-btn compact"
              onClick={() => setShowForm((prev) => !prev)}
            >
              {showForm ? 'Close' : 'Create'}
            </button>
          </div>
          {items.length === 0 ? (
            <p className="empty-state">No industries yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Active</th>
                    <th>Order</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.active === 1 ? 'Yes' : 'No'}</td>
                      <td>{item.ordering ?? '-'}</td>
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

export default IndustryPage;
