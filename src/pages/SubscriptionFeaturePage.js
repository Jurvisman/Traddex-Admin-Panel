import { useEffect, useRef, useState } from 'react';
import { Banner } from '../components';
import {
  createSubscriptionFeature,
  deleteSubscriptionFeature,
  listSubscriptionFeatures,
  updateSubscriptionFeature,
} from '../services/adminApi';

const initialForm = {
  feature_code: '',
  feature_name: '',
  feature_type: 'COUNT',
  is_active: '1',
};

const FEATURE_TYPES = [
  { value: 'COUNT', label: 'Count' },
  { value: 'ACCESS', label: 'Access' },
  { value: 'PRIORITY', label: 'Priority' },
];

function SubscriptionFeaturePage({ token }) {
  const [features, setFeatures] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const didInitRef = useRef(false);

  const loadFeatures = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listSubscriptionFeatures(token);
      setFeatures(response?.data?.features || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch features.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    loadFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.feature_code.trim() || !form.feature_name.trim()) {
      setMessage({ type: 'error', text: 'Feature code and name are required.' });
      return;
    }

    const payload = {
      feature_code: form.feature_code.trim(),
      feature_name: form.feature_name.trim(),
      feature_type: form.feature_type,
      is_active: Number(form.is_active),
    };

    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      if (editingId) {
        await updateSubscriptionFeature(token, editingId, payload);
        setMessage({ type: 'success', text: 'Feature updated.' });
      } else {
        await createSubscriptionFeature(token, payload);
        setMessage({ type: 'success', text: 'Feature created.' });
      }
      resetForm();
      await loadFeatures();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save feature.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (feature) => {
    setForm({
      feature_code: feature.code || '',
      feature_name: feature.name || '',
      feature_type: feature.type || 'COUNT',
      is_active: feature.is_active !== null && feature.is_active !== undefined ? String(feature.is_active) : '1',
    });
    setEditingId(feature.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await deleteSubscriptionFeature(token, id);
      await loadFeatures();
      setMessage({ type: 'success', text: 'Feature deactivated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to deactivate feature.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Subscription Features</h2>
          <p className="panel-subtitle">Define the feature catalog used in plans.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={loadFeatures} disabled={isLoading}>
          Refresh
        </button>
      </div>
      <Banner message={message} />

      {showForm ? (
        <div className="admin-modal-backdrop" onClick={() => setShowForm(false)}>
          <form className="admin-modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="panel-split">
              <h3 className="panel-subheading">{editingId ? 'Edit feature' : 'Create feature'}</h3>
              <button type="button" className="ghost-btn small" onClick={resetForm}>
                Close
              </button>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Feature code</span>
                <input
                  type="text"
                  value={form.feature_code}
                  onChange={(event) => handleChange('feature_code', event.target.value)}
                  placeholder="product_listings"
                  required
                />
              </label>
              <label className="field">
                <span>Feature name</span>
                <input
                  type="text"
                  value={form.feature_name}
                  onChange={(event) => handleChange('feature_name', event.target.value)}
                  placeholder="Product Listings"
                  required
                />
              </label>
              <label className="field">
                <span>Feature type</span>
                <select
                  value={form.feature_type}
                  onChange={(event) => handleChange('feature_type', event.target.value)}
                >
                  {FEATURE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select value={form.is_active} onChange={(event) => handleChange('is_active', event.target.value)}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
            </div>
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save feature'}
            </button>
          </form>
        </div>
      ) : null}

      <div className="panel-grid">
        <div className="panel card">
          <div className="panel-split">
            <h3 className="panel-subheading">Feature list</h3>
            <button type="button" className="primary-btn compact" onClick={() => setShowForm(true)}>
              Create
            </button>
          </div>
          {features.length === 0 ? (
            <p className="empty-state">No subscription features yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature) => (
                    <tr key={feature.id}>
                      <td>{feature.code}</td>
                      <td>{feature.name}</td>
                      <td>{feature.type}</td>
                      <td>{feature.is_active === 1 ? 'Active' : 'Inactive'}</td>
                      <td className="table-actions">
                        <button type="button" className="ghost-btn small" onClick={() => handleEdit(feature)}>
                          Edit
                        </button>
                        <button type="button" className="ghost-btn small" onClick={() => handleDelete(feature.id)}>
                          Deactivate
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

export default SubscriptionFeaturePage;
