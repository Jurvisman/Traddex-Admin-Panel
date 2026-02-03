import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner } from '../components';
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  listSubscriptionFeatures,
  listSubscriptionPlans,
  updateSubscriptionPlan,
} from '../services/adminApi';

const initialForm = {
  plan_name: '',
  user_type: 'BUSINESS',
  price: '',
  duration_months: '',
  description: '',
  icon_url: '',
  font_color: '#0f1230',
  background_color: '#ffffff',
  is_active: '1',
};

const USER_TYPES = [
  { value: 'BUSINESS', label: 'Business' },
  { value: 'USER', label: 'User' },
  { value: 'LOGISTIC', label: 'Logistic' },
  { value: 'INSURANCE', label: 'Insurance' },
];

const PRIORITIES = ['P1', 'P2', 'P3'];

const createFeatureRow = (overrides = {}) => ({
  key: `${Date.now()}-${Math.random()}`,
  feature_id: '',
  type: '',
  feature_limit: '',
  feature_priority: '',
  is_enabled: '1',
  ...overrides,
});

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

function SubscriptionPlanPage({ token }) {
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [featureRows, setFeatureRows] = useState([createFeatureRow()]);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const didInitRef = useRef(false);

  const monthlyPrice = form.price ? String(form.price) : '';
  const yearlyPrice = form.price ? String(Math.round(Number(form.price) * 12)) : '';

  const featureMap = useMemo(() => {
    const map = new Map();
    features.forEach((feature) => {
      map.set(String(feature.id), feature);
    });
    return map;
  }, [features]);

  const loadPlans = async () => {
    const response = await listSubscriptionPlans(token);
    setPlans(response?.data?.plans || []);
  };

  const loadFeatures = async () => {
    const response = await listSubscriptionFeatures(token);
    setFeatures(response?.data?.features || []);
  };

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    Promise.all([loadPlans(), loadFeatures()])
      .catch((error) => {
        setMessage({ type: 'error', text: error.message || 'Failed to load subscription data.' });
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateFeatureRow = (index, key, value) => {
    setFeatureRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        const updated = { ...row, [key]: value };
        if (key === 'feature_id') {
          const selected = featureMap.get(value);
          const type = selected?.type || '';
          updated.type = type;
          if (type !== 'COUNT') updated.feature_limit = '';
          if (type !== 'PRIORITY') updated.feature_priority = '';
        }
        if (key === 'type') {
          if (value !== 'COUNT') updated.feature_limit = '';
          if (value !== 'PRIORITY') updated.feature_priority = '';
        }
        return updated;
      })
    );
  };

  const addFeatureRow = () => {
    setFeatureRows((prev) => [...prev, createFeatureRow()]);
  };

  const removeFeatureRow = (index) => {
    setFeatureRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const resetForm = () => {
    setForm(initialForm);
    setFeatureRows([createFeatureRow()]);
    setEditingId(null);
  };

  const buildPayload = () => {
    const payload = {
      plan_name: form.plan_name.trim(),
      user_type: form.user_type,
      price: toNumber(form.price),
      duration_months: toNumber(form.duration_months),
      description: form.description.trim() || null,
      icon_url: form.icon_url.trim() || null,
      font_color: form.font_color || null,
      background_color: form.background_color || null,
      is_active: Number(form.is_active),
      features: featureRows
        .filter((row) => row.feature_id)
        .map((row) => ({
          feature_id: Number(row.feature_id),
          type: row.type || featureMap.get(row.feature_id)?.type,
          feature_limit: row.type === 'COUNT' ? toNumber(row.feature_limit) ?? 0 : null,
          feature_priority: row.type === 'PRIORITY' ? row.feature_priority || null : null,
          is_enabled: Number(row.is_enabled),
        })),
    };
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.plan_name.trim()) {
      setMessage({ type: 'error', text: 'Plan name is required.' });
      return;
    }
    if (!form.price) {
      setMessage({ type: 'error', text: 'Plan price is required.' });
      return;
    }
    if (!form.duration_months) {
      setMessage({ type: 'error', text: 'Plan duration is required.' });
      return;
    }

    const payload = buildPayload();
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      if (editingId) {
        await updateSubscriptionPlan(token, editingId, payload);
        setMessage({ type: 'success', text: 'Plan updated successfully.' });
      } else {
        await createSubscriptionPlan(token, payload);
        setMessage({ type: 'success', text: 'Plan created successfully.' });
      }
      resetForm();
      await loadPlans();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save plan.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (plan) => {
    setForm({
      plan_name: plan.plan_name || '',
      user_type: plan.user_type || 'BUSINESS',
      price: plan.price ?? '',
      duration_months: plan.duration_months ?? plan.duration ?? '',
      description: plan.description || '',
      icon_url: plan.icon_url || '',
      font_color: plan.font_color || '#0f1230',
      background_color: plan.background_color || '#ffffff',
      is_active: plan.is_active !== null && plan.is_active !== undefined ? String(plan.is_active) : '1',
    });
    const rows = (plan.features || []).map((feature) =>
      createFeatureRow({
        feature_id: feature.feature_id ? String(feature.feature_id) : '',
        type: feature.type || '',
        feature_limit: feature.limit ?? '',
        feature_priority: feature.priority ?? '',
        is_enabled:
          feature.is_enabled !== null && feature.is_enabled !== undefined ? String(feature.is_enabled) : '1',
      })
    );
    setFeatureRows(rows.length ? rows : [createFeatureRow()]);
    setEditingId(plan.id);
  };

  const handleDelete = async (id) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await deleteSubscriptionPlan(token, id);
      await loadPlans();
      setMessage({ type: 'success', text: 'Plan deactivated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to deactivate plan.' });
    } finally {
      setIsLoading(false);
    }
  };

  const previewFeatures = featureRows
    .map((row) => {
      if (!row.feature_id) return null;
      const feature = featureMap.get(row.feature_id);
      if (!feature) return null;
      if (row.type === 'COUNT') {
        return `${row.feature_limit || 0} ${feature.name}`;
      }
      if (row.type === 'PRIORITY') {
        return `${feature.name} - ${row.feature_priority || 'Priority'}`;
      }
      return feature.name;
    })
    .filter(Boolean);

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Subscription Plans</h2>
          <p className="panel-subtitle">Create plans and configure feature limits.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={loadPlans} disabled={isLoading}>
          Refresh
        </button>
      </div>
      <Banner message={message} />

      <div className="panel card subscription-plan-page">
        <form onSubmit={handleSubmit}>
          <div className="panel-split">
            <h3 className="panel-subheading">{editingId ? 'Edit plan' : 'Create plan'}</h3>
            <button type="button" className="ghost-btn small" onClick={resetForm}>
              Clear
            </button>
          </div>

            <div className="plan-builder">
              <div className="plan-preview">
                <div
                  className="plan-preview-card"
                  style={{
                    backgroundColor: form.background_color || '#f6f3ff',
                    color: form.font_color || '#0f1230',
                  }}
                >
                  <div className="plan-preview-icon">
                    {form.icon_url ? (
                      <img src={form.icon_url} alt="Plan icon" />
                    ) : (
                      <span className="plan-preview-icon-placeholder">+</span>
                    )}
                  </div>
                  <p className="plan-preview-title">{form.plan_name || 'Plan Name'}</p>
                  <div className="plan-preview-price">
                    <span className="plan-preview-price-main">₹ {monthlyPrice || '0'}/mo</span>
                    <span className="plan-preview-price-pill">₹ {yearlyPrice || '0'}/yr</span>
                  </div>
                  <ul className="plan-preview-features">
                    {(previewFeatures.length ? previewFeatures : ['Add features to preview']).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="plan-preview-cta"
                    style={{
                      backgroundColor: form.font_color || '#f4c542',
                      color: form.background_color || '#1c1c1c',
                    }}
                  >
                    {form.plan_name ? `Get ${form.plan_name}` : 'Get Plan'}
                  </button>
                </div>

                <div className="panel card plan-description-card">
                  <h4 className="panel-subheading">Plan Description</h4>
                  <textarea
                    className="plan-description-input"
                    value={form.description}
                    onChange={(event) => handleChange('description', event.target.value)}
                    placeholder="The plan offers 100 product listings, lead generation tools, and more."
                  />
                </div>
              </div>

              <div className="plan-form">
                <div className="field-grid">
                  <label className="field field-span">
                    <span>Plan name</span>
                    <input
                      type="text"
                      value={form.plan_name}
                      onChange={(event) => handleChange('plan_name', event.target.value)}
                      placeholder="Gold Plan"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Icon</span>
                    <div className="icon-input">
                      <div className="icon-preview">
                        {form.icon_url ? (
                          <img src={form.icon_url} alt="Icon preview" />
                        ) : (
                          <span className="icon-placeholder">+</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={form.icon_url}
                        onChange={(event) => handleChange('icon_url', event.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </label>
                  <label className="field">
                    <span>Font color</span>
                    <input
                      type="text"
                      value={form.font_color}
                      onChange={(event) => handleChange('font_color', event.target.value)}
                      placeholder="#0f1230"
                    />
                  </label>
                  <label className="field">
                    <span>Background color</span>
                    <input
                      type="text"
                      value={form.background_color}
                      onChange={(event) => handleChange('background_color', event.target.value)}
                      placeholder="#f6f3ff"
                    />
                  </label>
                  <label className="field">
                    <span>Monthly price</span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(event) => handleChange('price', event.target.value)}
                      placeholder="999"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Yearly price</span>
                    <input type="number" value={yearlyPrice} readOnly placeholder="11988" />
                  </label>
                  <label className="field">
                    <span>User type</span>
                    <select value={form.user_type} onChange={(event) => handleChange('user_type', event.target.value)}>
                      {USER_TYPES.map((type) => (
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
                  <label className="field">
                    <span>Duration (months)</span>
                    <input
                      type="number"
                      value={form.duration_months}
                      onChange={(event) => handleChange('duration_months', event.target.value)}
                      placeholder="12"
                      required
                    />
                  </label>
                </div>

                <div className="plan-feature-card">
                  <div className="panel-split">
                    <h4 className="panel-subheading">Add features</h4>
                    <button type="button" className="ghost-btn small" onClick={addFeatureRow}>
                      Add feature
                    </button>
                  </div>
                  <div className="plan-feature-rows">
                    {featureRows.map((row, index) => {
                      const selected = row.feature_id ? featureMap.get(row.feature_id) : null;
                      const featureCode = selected?.code || '';
                      return (
                        <div key={row.key} className="plan-feature-row">
                          <select
                            value={row.feature_id}
                            onChange={(event) => updateFeatureRow(index, 'feature_id', event.target.value)}
                          >
                            <option value="">Feature</option>
                            {features.map((feature) => (
                              <option key={feature.id} value={feature.id}>
                                {feature.name}
                              </option>
                            ))}
                          </select>
                          <input type="text" value={featureCode} readOnly placeholder="feature_code" />
                          <input type="text" value={row.type || ''} readOnly placeholder="Type" />
                          {row.type === 'COUNT' ? (
                            <input
                              type="number"
                              value={row.feature_limit}
                              onChange={(event) => updateFeatureRow(index, 'feature_limit', event.target.value)}
                              placeholder="Limit"
                            />
                          ) : null}
                          {row.type === 'PRIORITY' ? (
                            <select
                              value={row.feature_priority}
                              onChange={(event) => updateFeatureRow(index, 'feature_priority', event.target.value)}
                            >
                              <option value="">Priority</option>
                              {PRIORITIES.map((priority) => (
                                <option key={priority} value={priority}>
                                  {priority}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {row.type === 'ACCESS' ? (
                            <label className="plan-toggle">
                              <input
                                type="checkbox"
                                checked={row.is_enabled === '1'}
                                onChange={(event) =>
                                  updateFeatureRow(index, 'is_enabled', event.target.checked ? '1' : '0')
                                }
                              />
                              <span className="plan-toggle-track" />
                            </label>
                          ) : null}
                          <button type="button" className="ghost-btn small" onClick={() => removeFeatureRow(index)}>
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="plan-actions">
              <button type="button" className="ghost-btn" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
        </form>
      </div>

      <div className="panel-grid">
        <div className="panel card">
          <div className="panel-split">
            <h3 className="panel-subheading">Plan list</h3>
            <button type="button" className="primary-btn compact" onClick={resetForm}>
              Create
            </button>
          </div>
          {plans.length === 0 ? (
            <p className="empty-state">No subscription plans yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>User type</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>{plan.plan_name}</td>
                      <td>{plan.user_type}</td>
                      <td>{plan.price}</td>
                      <td>{plan.duration_months || plan.duration}</td>
                      <td>{plan.is_active === 1 ? 'Active' : 'Inactive'}</td>
                      <td className="table-actions">
                        <button type="button" className="ghost-btn small" onClick={() => handleEdit(plan)}>
                          Edit
                        </button>
                        <button type="button" className="ghost-btn small" onClick={() => handleDelete(plan.id)}>
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

export default SubscriptionPlanPage;
