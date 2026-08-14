import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Banner, TableRowActionMenu, DataTable } from '../components';
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
  business_type: 'ALL',
  price: '',
  yearly_discount_percent: '',
  duration_months: '',
  description: '',
  icon_url: '',
  font_color: '#0f1230',
  background_color: '#ffffff',
  is_active: '1',
  offer_active: '0',
  promo_price: '',
  offer_duration_months: '',
  offer_terms: '',
  promo_label: '',
  cta_label: '',
  popular: '0',
  best_for: '',
  waitlist_enabled: '0',
  apply_to_existing_subscribers: false,
};

const USER_TYPES = [
  { value: 'BUSINESS', label: 'Business' },
  { value: 'USER', label: 'User' },
  { value: 'LOGISTIC', label: 'Logistic' },
  { value: 'INSURANCE', label: 'Insurance' },
];

const BUSINESS_TYPES = [
  { value: 'ALL', label: 'All business' },
  { value: 'B2B', label: 'B2B' },
  { value: 'B2C', label: 'B2C' },
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

const formatPlanDate = (value) =>
  value.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const addMonths = (date, months) => {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
};

function SubscriptionPlanPage({ token }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [featureRows, setFeatureRows] = useState([createFeatureRow()]);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const didInitRef = useRef(false);
  const [openActionRowId, setOpenActionRowId] = useState(null);

  const regularMonthlyPrice = toNumber(form.price) || 0;
  const offerMonthlyPrice = toNumber(form.promo_price);
  const offerDurationMonths = toNumber(form.offer_duration_months) || 0;
  const isLaunchOfferActive =
    form.offer_active === '1' &&
    offerMonthlyPrice !== null &&
    offerDurationMonths > 0 &&
    offerMonthlyPrice >= 0 &&
    offerMonthlyPrice <= regularMonthlyPrice;
  const monthlyPrice = form.price ? String(form.price) : '';
  const yearlyBasePrice = (isLaunchOfferActive ? offerMonthlyPrice : regularMonthlyPrice) * 12;
  const yearlyDiscountPercent = Math.max(0, Math.min(100, Number(form.yearly_discount_percent || 0)));
  const yearlyPrice = yearlyBasePrice
    ? String(Math.round(yearlyBasePrice - (yearlyBasePrice * yearlyDiscountPercent) / 100))
    : '';
  const regularYearlyBasePrice = regularMonthlyPrice * 12;
  const afterOfferYearlyPrice = regularYearlyBasePrice
    ? String(Math.round(regularYearlyBasePrice - (regularYearlyBasePrice * yearlyDiscountPercent) / 100))
    : '';
  const offerEndDate = isLaunchOfferActive ? formatPlanDate(addMonths(new Date(), offerDurationMonths)) : '';

  const featureMap = useMemo(() => {
    const map = new Map();
    features.forEach((feature) => {
      map.set(String(feature.id), feature);
    });
    return map;
  }, [features]);

  const loadPlans = async () => {
    const response = await listSubscriptionPlans(token);
    const raw = Array.isArray(response?.data?.plans) ? response.data.plans : [];
    raw.sort((a, b) => new Date(b?.createdAt || b?.created_at || 0) - new Date(a?.createdAt || a?.created_at || 0));
    setPlans(raw);
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

  const activeCount = plans.filter((plan) => Number(plan.is_active) === 1).length;
  const inactiveCount = Math.max(0, plans.length - activeCount);
  const paidCount = plans.filter((plan) => Number(plan.price || 0) > 0).length;

  const handleChange = (key, value) => {
    setForm((prev) => {
      if (key === 'user_type') {
        return {
          ...prev,
          user_type: value,
          business_type: value === 'BUSINESS' ? prev.business_type || 'ALL' : '',
        };
      }
      return { ...prev, [key]: value };
    });
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

  const startCreateNew = () => {
    navigate('/admin/subscription/plans/new');
  };

  const startViewPlan = (plan) => {
    if (!plan?.id) return;
    navigate(`/admin/subscription/plans/${plan.id}`);
  };

  const buildPayload = () => {
    const businessType = form.user_type === 'BUSINESS' ? form.business_type || 'ALL' : null;
    const payload = {
      plan_name: form.plan_name.trim(),
      user_type: form.user_type,
      business_type: businessType,
      price: toNumber(form.price),
      yearly_discount_percent: toNumber(form.yearly_discount_percent),
      duration_months: toNumber(form.duration_months),
      description: form.description.trim() || null,
      icon_url: form.icon_url.trim() || null,
      font_color: form.font_color || null,
      background_color: form.background_color || null,
      is_active: Number(form.is_active),
      offer_active: form.offer_active === '1',
      promo_price: toNumber(form.promo_price),
      offer_duration_months: toNumber(form.offer_duration_months),
      offer_terms: form.offer_terms.trim() || null,
      promo_label: form.promo_label.trim() || null,
      cta_label: form.cta_label.trim() || null,
      popular: Number(form.popular),
      best_for: form.best_for.trim() || null,
      waitlist_enabled: form.waitlist_enabled === '1',
      apply_to_existing_subscribers: Boolean(form.apply_to_existing_subscribers),
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
    const yearlyDiscount = toNumber(form.yearly_discount_percent);
    if (yearlyDiscount !== null && (yearlyDiscount < 0 || yearlyDiscount > 100)) {
      setMessage({ type: 'error', text: 'Yearly discount must be between 0 and 100%.' });
      return;
    }
    if (form.offer_active === '1') {
      const offerPrice = toNumber(form.promo_price);
      const regularPrice = toNumber(form.price);
      const offerDuration = toNumber(form.offer_duration_months);
      if (offerPrice === null || offerPrice < 0 || offerPrice > regularPrice) {
        setMessage({ type: 'error', text: 'Enter an offer price between zero and the regular monthly price.' });
        return;
      }
      if (!offerDuration || offerDuration < 1 || offerDuration > 120) {
        setMessage({ type: 'error', text: 'Offer duration must be between 1 and 120 months.' });
        return;
      }
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
      business_type: plan.business_type || 'ALL',
      price: plan.price ?? '',
      yearly_discount_percent: plan.yearly_discount_percent ?? '',
      duration_months: plan.duration_months ?? plan.duration ?? '',
      description: plan.description || '',
      icon_url: plan.icon_url || '',
      font_color: plan.font_color || '#0f1230',
      background_color: plan.background_color || '#ffffff',
      is_active: plan.is_active !== null && plan.is_active !== undefined ? String(plan.is_active) : '1',
      offer_active: plan.offer_active ? '1' : '0',
      promo_price: plan.promo_price ?? '',
      offer_duration_months: plan.offer_duration_months ?? '',
      offer_terms: plan.offer_terms || '',
      promo_label: plan.promo_label || '',
      cta_label: plan.cta_label || '',
      popular: plan.popular !== null && plan.popular !== undefined ? String(plan.popular) : '0',
      best_for: plan.best_for || '',
      waitlist_enabled: plan.waitlist_enabled ? '1' : '0',
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
    setIsFormVisible(true);
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

  const handleCancel = () => {
    resetForm();
    setIsFormVisible(false);
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

  const filteredPlans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return plans;
    return plans.filter((plan) => {
      const name = (plan.plan_name || '').toLowerCase();
      const userType = (plan.user_type || '').toLowerCase();
      return name.includes(query) || userType.includes(query);
    });
  }, [plans, searchQuery]);

  useEffect(() => {
    const editParam = searchParams.get('edit');
    if (!editParam || !plans.length) return;
    const editId = Number(editParam);
    if (Number.isNaN(editId)) return;
    const plan = plans.find((item) => Number(item.id) === editId);
    if (!plan) return;
    handleEdit(plan);
    const next = new URLSearchParams(searchParams);
    next.delete('edit');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

  return (
    <div>
      <div className="panel-head category-list-head">
        <div className="category-list-head-left">
          <div>
            <h2 className="panel-title">Subscription Plans</h2>
            <p className="panel-subtitle">Manage plans and configure feature limits.</p>
          </div>
        </div>
      </div>
      <Banner message={message} />

      <div className="panel-grid subscription-plan-list-grid">
        <div className="subscription-plan-list-card" style={{ width: '100%' }}>
          <DataTable
            columns={[
              {
                key: 'id',
                header: 'Sr. No.',
                width: '70px',
                render: (_, __, index) => index + 1,
              },
              {
                key: 'plan_name',
                header: 'Name',
                sortable: true,
                render: (val, plan) => (
                  <span
                    className="bdt-name-link"
                    style={{ fontWeight: 600, color: 'var(--gsc-primary, #6345ED)', cursor: 'pointer' }}
                    onClick={() => startViewPlan(plan)}
                    role="button"
                    tabIndex={0}
                  >
                    {val}
                  </span>
                ),
              },
              {
                key: 'user_type',
                header: 'User Type',
                sortable: true,
                render: (val) => val || '-',
              },
              {
                key: 'price',
                header: 'Price (₹)',
                sortable: true,
                render: (val) => <strong>₹ {Number(val || 0).toLocaleString('en-IN')}</strong>,
              },
              {
                key: 'duration_months',
                header: 'Duration',
                render: (val, plan) => `${val || plan.duration || '-'} mo`,
              },
              {
                key: 'is_active',
                header: 'Status',
                sortable: true,
                render: (val) => (
                  <span className={`status-pill ${val === 1 ? 'approved' : 'rejected'}`}>
                    {val === 1 ? 'Active' : 'Inactive'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (_, plan) => (
                  <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                    <TableRowActionMenu
                      rowId={plan.id}
                      openRowId={openActionRowId}
                      onToggle={setOpenActionRowId}
                      actions={[
                        {
                          label: 'Edit',
                          onClick: () => navigate(`/admin/subscription/plans/${plan.id}/edit`),
                        },
                        {
                          label: plan.is_active === 1 ? 'Deactivate' : 'Activate',
                          onClick: () => handleDelete(plan.id),
                          danger: plan.is_active === 1,
                        },
                      ]}
                    />
                  </div>
                ),
              },
            ]}
            data={filteredPlans}
            isLoading={isLoading}
            search={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search plans..."
            onRowClick={(plan) => startViewPlan(plan)}
            emptyTitle="No subscription plans found"
            emptyDescription={plans.length === 0 ? "No subscription plans created yet." : "No plans match your search."}
            toolbarRight={
              <button
                type="button"
                className="gsc-create-btn"
                onClick={startCreateNew}
                title="Create subscription plan"
                aria-label="Create subscription plan"
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
            }
          />
        </div>
      </div>

      {isFormVisible && (
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
                    position: 'relative',
                    border: form.popular === '1' ? '2.5px solid #6366f1' : '1px solid #e2e8f0',
                    paddingTop: form.popular === '1' ? '30px' : '20px'
                  }}
                >
                  {form.popular === '1' && (
                    <div style={{
                      position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
                      background: '#6366f1', color: '#ffffff', fontSize: '9px', fontWeight: 800,
                      padding: '2px 10px', borderRadius: '10px', letterSpacing: '0.05em'
                    }}>
                      MOST POPULAR
                    </div>
                  )}
                  <div className="plan-preview-icon">
                    {form.icon_url ? (
                      <img src={form.icon_url} alt="Plan icon" />
                    ) : (
                      <span className="plan-preview-icon-placeholder">+</span>
                    )}
                  </div>
                  <p className="plan-preview-title">{form.plan_name || 'Plan Name'}</p>
                  <div className="plan-preview-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      {form.offer_active === '1' && form.promo_price !== '' ? (
                        <>
                          <span style={{ fontSize: 13, textDecoration: 'line-through', color: '#94a3b8' }}>₹ {monthlyPrice || '0'}</span>
                          <span className="plan-preview-price-main">₹ {form.promo_price}/mo</span>
                        </>
                      ) : (
                        <span className="plan-preview-price-main">₹ {monthlyPrice || '0'}/mo</span>
                      )}
                    </div>
                    <span className="plan-preview-price-pill">₹ {yearlyPrice || '0'}/yr</span>
                  </div>
                  {form.offer_active === '1' && form.promo_label && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.08)', border: '1px dashed #f59e0b', color: '#d97706',
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, margin: '8px 0',
                      textAlign: 'center', width: '100%', boxSizing: 'border-box'
                    }}>
                      {form.promo_label}
                    </div>
                  )}
                  <ul className="plan-preview-features" style={{ width: '100%' }}>
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
                      marginTop: 'auto', width: '100%'
                    }}
                  >
                    {form.cta_label || (form.plan_name ? `Get ${form.plan_name}` : 'Get Plan')}
                  </button>
                  {form.best_for && (
                    <div style={{
                      fontSize: 10, fontWeight: 600, color: '#64748b', marginTop: 12,
                      borderTop: '1px solid #f1f5f9', paddingTop: 8, width: '100%', textAlign: 'center'
                    }}>
                      Best For: {form.best_for}
                    </div>
                  )}
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
                    <div className="inline-row">
                      <input
                        type="color"
                        className="color-input"
                        value={form.font_color}
                        onChange={(event) => handleChange('font_color', event.target.value)}
                        aria-label="Font color"
                      />
                      <input
                        type="text"
                        value={form.font_color}
                        onChange={(event) => handleChange('font_color', event.target.value)}
                        placeholder="#0f1230"
                      />
                    </div>
                  </label>
                  <label className="field">
                    <span>Background color</span>
                    <div className="inline-row">
                      <input
                        type="color"
                        className="color-input"
                        value={form.background_color}
                        onChange={(event) => handleChange('background_color', event.target.value)}
                        aria-label="Background color"
                      />
                      <input
                        type="text"
                        value={form.background_color}
                        onChange={(event) => handleChange('background_color', event.target.value)}
                        placeholder="#f6f3ff"
                      />
                    </div>
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
                    <span>Yearly discount %</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.yearly_discount_percent}
                      onChange={(event) => handleChange('yearly_discount_percent', event.target.value)}
                      placeholder="0"
                    />
                  </label>
                  <label className="field">
                    <span>Launch Offer</span>
                    <select value={form.offer_active} onChange={(event) => handleChange('offer_active', event.target.value)}>
                      <option value="0">Inactive - charge regular price</option>
                      <option value="1">Active - use offer price</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Offer Price / Month</span>
                    <input
                      type="number"
                      min="0"
                      value={form.promo_price}
                      onChange={(event) => handleChange('promo_price', event.target.value)}
                      placeholder="0 for free, or e.g. 499"
                    />
                  </label>
                  <label className="field">
                    <span>Offer Duration (Months)</span>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={form.offer_duration_months}
                      onChange={(event) => handleChange('offer_duration_months', event.target.value)}
                      placeholder="e.g. 3 or 24"
                    />
                  </label>
                  {isLaunchOfferActive && (
                    <div className="field field-span plan-offer-summary">
                      <div>
                        <span>Offer ends</span>
                        <strong>{offerEndDate}</strong>
                        <small>Actual date is counted from each subscriber's start date.</small>
                      </div>
                      <div>
                        <span>Yearly price after offer</span>
                        <strong>₹ {afterOfferYearlyPrice || '0'}/yr</strong>
                        <small>Regular monthly price with yearly discount applied.</small>
                      </div>
                    </div>
                  )}
                  <label className="field">
                    <span>Promo Label / Badge (Optional)</span>
                    <input
                      type="text"
                      value={form.promo_label}
                      onChange={(event) => handleChange('promo_label', event.target.value)}
                      placeholder="e.g. Founder price: Rs.499 locked"
                    />
                  </label>
                  <label className="field field-span">
                    <span>Offer Terms Shown To Customers</span>
                    <textarea
                      value={form.offer_terms}
                      onChange={(event) => handleChange('offer_terms', event.target.value)}
                      placeholder="e.g. Rs.499/month for 24 months, then Rs.799/month."
                      rows={3}
                    />
                  </label>
                  <label className="field">
                    <span>CTA Button Label (Optional)</span>
                    <input
                      type="text"
                      value={form.cta_label}
                      onChange={(event) => handleChange('cta_label', event.target.value)}
                      placeholder="e.g. Lock Founder Price"
                    />
                  </label>
                  <label className="field">
                    <span>Target Audience (Best For)</span>
                    <input
                      type="text"
                      value={form.best_for}
                      onChange={(event) => handleChange('best_for', event.target.value)}
                      placeholder="e.g. Small Shops & Startups"
                    />
                  </label>
                  <label className="field">
                    <span>Mark as Popular</span>
                    <select value={form.popular} onChange={(event) => handleChange('popular', event.target.value)}>
                      <option value="0">No</option>
                      <option value="1">Yes (Show badge)</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Plan Signup Action</span>
                    <select
                      value={form.waitlist_enabled}
                      onChange={(event) => handleChange('waitlist_enabled', event.target.value)}
                    >
                      <option value="0">Direct checkout</option>
                      <option value="1">Open waitlist form</option>
                    </select>
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
                  {form.user_type === 'BUSINESS' ? (
                    <label className="field">
                      <span>Business type</span>
                      <select
                        value={form.business_type || 'ALL'}
                        onChange={(event) => handleChange('business_type', event.target.value)}
                      >
                        {BUSINESS_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
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

                {editingId ? (
                  <label className="plan-existing-subscribers-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(form.apply_to_existing_subscribers)}
                      onChange={(event) =>
                        handleChange('apply_to_existing_subscribers', event.target.checked)
                      }
                    />
                    <span>
                      <strong>Apply newly added features to existing active subscribers</strong>
                      <small>
                        Keep off for new-subscriber-only rollout. Turn on only when old subscribers should receive the new entitlements now.
                      </small>
                    </span>
                  </label>
                ) : null}

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
              <button type="button" className="ghost-btn" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default SubscriptionPlanPage;
