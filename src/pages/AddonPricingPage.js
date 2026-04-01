import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import {
  listSubscriptionFeatures,
  upsertAddonPricing,
} from '../services/adminApi';

const FEATURE_TYPE_LABELS = { COUNT: 'Count', ACCESS: 'Access', PRIORITY: 'Priority' };

const initialForm = {
  feature_id: '',
  per_unit_price: '',
  min_units: '1',
  max_units: '20',
};

function AddonPricingPage({ token }) {
  const [features, setFeatures] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadFeatures = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  // Only COUNT-type features make sense for addon pricing
  const countFeatures = useMemo(
    () => features.filter((f) => String(f.type || '').toUpperCase() === 'COUNT' && Number(f.is_active) === 1),
    [features],
  );

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setShowForm(false);
  };

  const handleEdit = (feature) => {
    setForm({
      feature_id: String(feature.id || ''),
      per_unit_price: feature._addonPrice ?? '',
      min_units: feature._addonMinUnits ?? '1',
      max_units: feature._addonMaxUnits ?? '20',
    });
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const featureId = Number(form.feature_id);
    if (!featureId) {
      setMessage({ type: 'error', text: 'Please select a feature.' });
      return;
    }
    const perUnitPrice = parseFloat(form.per_unit_price);
    if (isNaN(perUnitPrice) || perUnitPrice <= 0) {
      setMessage({ type: 'error', text: 'Per-unit price must be a positive number.' });
      return;
    }

    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await upsertAddonPricing(token, {
        feature_id: featureId,
        per_unit_price: perUnitPrice,
        min_units: form.min_units ? parseInt(form.min_units, 10) : 1,
        max_units: form.max_units ? parseInt(form.max_units, 10) : 20,
      });
      setMessage({ type: 'success', text: 'Addon pricing saved successfully.' });
      resetForm();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save addon pricing.' });
    } finally {
      setIsSaving(false);
    }
  };

  // We show all COUNT features and let admin set/update addon pricing for each
  const filteredFeatures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return countFeatures;
    return countFeatures.filter(
      (f) =>
        (f.code || '').toLowerCase().includes(q) ||
        (f.name || '').toLowerCase().includes(q),
    );
  }, [countFeatures, searchQuery]);

  return (
    <div>
      <Banner message={message} />

      {showForm && (
        <div className="admin-modal-backdrop" onClick={() => setShowForm(false)}>
          <form
            className="admin-modal employee-modal"
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">Set Addon Pricing</h3>
              <button type="button" className="ghost-btn small" onClick={resetForm}>
                Close
              </button>
            </div>
            <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
              Set per-unit price for buying extra credits of a feature. This uses the UPSERT
              pattern — one pricing row per feature.
            </p>
            <div className="field-grid">
              <label className="field">
                <span>Feature</span>
                <select
                  value={form.feature_id}
                  onChange={(e) => handleChange('feature_id', e.target.value)}
                  required
                >
                  <option value="">— Select feature —</option>
                  {countFeatures.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Per-unit price (₹)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 99"
                  value={form.per_unit_price}
                  onChange={(e) => handleChange('per_unit_price', e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Min units</span>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={form.min_units}
                  onChange={(e) => handleChange('min_units', e.target.value)}
                />
              </label>
              <label className="field">
                <span>Max units</span>
                <input
                  type="number"
                  min="1"
                  placeholder="20"
                  value={form.max_units}
                  onChange={(e) => handleChange('max_units', e.target.value)}
                />
              </label>
            </div>
            <div className="form-actions employee-modal-actions">
              <button type="submit" className="primary-btn" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Addon Pricing'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel-grid subscription-feature-list-grid">
        <div className="subscription-feature-list-card">
          <div className="gsc-datatable-toolbar">
            <div className="gsc-datatable-toolbar-left">
              <h3 className="panel-subheading">Addon Pricing — COUNT Features</h3>
            </div>
            <div className="gsc-datatable-toolbar-right">
              <div className="gsc-toolbar-search">
                <input
                  type="search"
                  placeholder="Search features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search addon features"
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
                  setForm(initialForm);
                  setShowForm(true);
                }}
                title="Set addon pricing"
                aria-label="Set addon pricing"
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

          {isLoading ? (
            <p className="empty-state">Loading features...</p>
          ) : filteredFeatures.length === 0 ? (
            <p className="empty-state">
              No COUNT-type features found. Create a feature with type "COUNT" in the Features page first.
            </p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Feature Code</th>
                    <th>Feature Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeatures.map((feature, index) => {
                    const isActive = Number(feature.is_active) === 1;
                    return (
                      <tr key={feature.id}>
                        <td>{index + 1}</td>
                        <td><code style={{ fontSize: 12 }}>{feature.code}</code></td>
                        <td><strong>{feature.name}</strong></td>
                        <td>
                          <span className="status-pill">
                            {FEATURE_TYPE_LABELS[feature.type] || feature.type}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${isActive ? 'approved' : 'rejected'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="primary-btn"
                            style={{ padding: '4px 16px', fontSize: 12 }}
                            onClick={() => handleEdit(feature)}
                          >
                            Set Pricing
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddonPricingPage;
