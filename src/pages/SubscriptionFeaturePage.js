import { useEffect, useRef, useState } from 'react';
import { Banner, DataTable, TableRowActionMenu } from '../components';
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
  limit_type: 'MONTHLY_CREDIT',
  is_active: '1',
};

const FEATURE_TYPES = [
  { value: 'COUNT', label: 'Count' },
  { value: 'ACCESS', label: 'Access' },
  { value: 'PRIORITY', label: 'Priority' },
];

const LIMIT_TYPES = [
  { value: 'MONTHLY_CREDIT', label: 'Monthly Credit' },
  { value: 'ACTIVE_LIMIT', label: 'Active Limit' },
];

function SubscriptionFeaturePage({ token }) {
  const [features, setFeatures] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const didInitRef = useRef(false);
  const [openActionRowId, setOpenActionRowId] = useState(null);

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

  const activeCount = features.filter((feature) => Number(feature.is_active) === 1).length;
  const inactiveCount = Math.max(0, features.length - activeCount);
  const accessCount = features.filter((feature) => String(feature.type || '').toUpperCase() === 'ACCESS').length;

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
      limit_type: form.limit_type,
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
      limit_type: feature.limit_type || feature.feature_limit_type || feature.limitType || 'MONTHLY_CREDIT',
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

  const filteredFeatures = features.filter((feature) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const haystack = `${feature.code || ''} ${feature.name || ''} ${feature.type || ''}`.toLowerCase();
    return haystack.includes(q);
  });

  return (
    <div>
    
      {/* <Banner message={message} /> */}

      {showForm ? (
        <div className="admin-modal-backdrop" onClick={() => setShowForm(false)}>
          <form
            className="admin-modal employee-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
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
                <span>Limit rule</span>
                <select
                  value={form.limit_type}
                  onChange={(event) => handleChange('limit_type', event.target.value)}
                >
                  {LIMIT_TYPES.map((type) => (
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
            <div className="form-actions employee-modal-actions">
              <button type="submit" className="primary-btn" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save feature'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="panel-grid subscription-feature-list-grid">
        <div className="subscription-feature-list-card">
          <DataTable
            columns={[
              {
                key: 'id',
                header: 'Sr. No.',
                width: '70px',
                render: (_, __, index) => index + 1,
              },
              {
                key: 'code',
                header: 'Code',
                sortable: true,
                render: (val) => <strong>{val}</strong>,
              },
              {
                key: 'name',
                header: 'Name',
                sortable: true,
                render: (val, feature) => (
                  <span
                    className="bdt-name-link"
                    style={{ color: '#6345ED', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(feature);
                    }}
                  >
                    {val}
                  </span>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                sortable: true,
                render: (val) => val || '-',
              },
              {
                key: 'limitRule',
                header: 'Limit Rule',
                render: (_, feature) => (feature.limit_type || feature.feature_limit_type || feature.limitType || 'MONTHLY_CREDIT').replace(/_/g, ' '),
              },
              {
                key: 'is_active',
                header: 'Status',
                sortable: true,
                render: (val) => (
                  <span className={`status-pill ${Number(val) === 1 ? 'approved' : 'rejected'}`}>
                    {Number(val) === 1 ? 'Active' : 'Inactive'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (_, feature) => {
                  const isActive = Number(feature.is_active) === 1;
                  return (
                    <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                      <TableRowActionMenu
                        rowId={feature.id}
                        openRowId={openActionRowId}
                        onToggle={setOpenActionRowId}
                        actions={[
                          {
                            label: 'Edit',
                            onClick: () => handleEdit(feature),
                          },
                          {
                            label: isActive ? 'Deactivate' : 'Activate',
                            onClick: () => handleDelete(feature.id),
                            danger: isActive,
                          },
                        ]}
                      />
                    </div>
                  );
                },
              },
            ]}
            data={filteredFeatures}
            isLoading={isLoading}
            search={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search features..."
            emptyTitle="No subscription features yet"
            emptyDescription="No features found matching your search."
            toolbarRight={
              <button
                type="button"
                className="gsc-create-btn"
                onClick={() => setShowForm(true)}
                title="Create feature"
                aria-label="Create feature"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}

export default SubscriptionFeaturePage;
