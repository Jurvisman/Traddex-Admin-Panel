import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner, DataTable, TableRowActionMenu } from '../components';
import {
  createSubscriptionCoupon,
  deleteSubscriptionCoupon,
  getSubscriptionCoupon,
  listSubscriptionCouponRedemptions,
  listSubscriptionCoupons,
  listSubscriptionPlans,
  updateSubscriptionCoupon,
  updateSubscriptionCouponStatus,
} from '../services/adminApi';
import { usePermissions } from '../shared/permissions';

const emptyForm = {
  id: null,
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  maxDiscountAmount: '',
  minOrderAmount: '',
  startAt: '',
  endAt: '',
  totalUsageLimit: '',
  perUserLimit: '1',
  applicableUserType: 'BUSINESS',
  active: true,
  showInCheckoutList: false,
  planIds: [],
  planOverrides: {},
};

const unwrap = (response, fallback) => response?.data || response || fallback;
const money = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const planIdOf = (plan) => plan?.id ?? plan?.plan_id ?? plan?.planId ?? plan?.subscription_plan_master_id;
const planNameOf = (plan) => plan?.plan_name || plan?.planName || plan?.name || `Plan ${planIdOf(plan) || ''}`;

const toInputDateTime = (value) => {
  if (!value) return '';
  return String(value).slice(0, 16);
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeForm = (coupon = {}) => ({
  id: coupon.id ?? null,
  code: coupon.code || '',
  name: coupon.name || '',
  description: coupon.description || '',
  discountType: coupon.discountType || 'PERCENTAGE',
  discountValue: coupon.discountValue ?? '',
  maxDiscountAmount: coupon.maxDiscountAmount ?? '',
  minOrderAmount: coupon.minOrderAmount ?? '',
  startAt: toInputDateTime(coupon.startAt),
  endAt: toInputDateTime(coupon.endAt),
  totalUsageLimit: coupon.totalUsageLimit ?? '',
  perUserLimit: coupon.perUserLimit ?? '1',
  applicableUserType: coupon.applicableUserType || 'BUSINESS',
  active: coupon.active !== false,
  showInCheckoutList: Boolean(coupon.showInCheckoutList),
  planIds: Array.isArray(coupon.planIds) ? coupon.planIds.map(String) : [],
  planOverrides: coupon.planDiscountOverrides && typeof coupon.planDiscountOverrides === 'object'
    ? Object.fromEntries(Object.entries(coupon.planDiscountOverrides).map(([k, v]) => [String(k), String(v)]))
    : {},
});

const statusClass = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'REDEEMED') return 'approved';
  if (normalized === 'FAILED' || normalized === 'CANCELLED') return 'rejected';
  return 'pending';
};

const DetailRow = ({ label, value }) => (
  <div className="mv-detail-row">
    <span className="mv-detail-label">{label}</span>
    <span className="mv-detail-value">{value ?? '-'}</span>
  </div>
);

function SubscriptionCouponPage({ token }) {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('ADMIN_SUBSCRIPTION_COUPON_CREATE');
  const canUpdate = hasPermission('ADMIN_SUBSCRIPTION_COUPON_UPDATE');
  const canDelete = hasPermission('ADMIN_SUBSCRIPTION_COUPON_DELETE');
  const canReport = hasPermission('ADMIN_SUBSCRIPTION_COUPON_REPORT');

  const [coupons, setCoupons] = useState([]);
  const [plans, setPlans] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [redemptionSearch, setRedemptionSearch] = useState('');
  const [couponPage, setCouponPage] = useState(0);
  const [couponPageSize, setCouponPageSize] = useState(10);
  const [redemptionPage, setRedemptionPage] = useState(0);
  const [redemptionPageSize, setRedemptionPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });

  // View panel state
  const [viewItem, setViewItem] = useState(null);      // { coupon, redemptions }
  const [isViewLoading, setIsViewLoading] = useState(false);

  const handleCloseModal = () => {
    setShowForm(false);
    setForm(emptyForm);
  };

  const loadCoupons = useCallback(async () => {
    const response = await listSubscriptionCoupons(token);
    const list = unwrap(response, []);
    setCoupons(Array.isArray(list) ? list : []);
  }, [token]);

  const loadRedemptions = useCallback(
    async (couponId = selectedCouponId) => {
      if (!canReport) return;
      const response = await listSubscriptionCouponRedemptions(token, couponId || null);
      const list = unwrap(response, []);
      setRedemptions(Array.isArray(list) ? list : []);
    },
    [canReport, selectedCouponId, token],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [couponResponse, planResponse] = await Promise.all([
        listSubscriptionCoupons(token),
        listSubscriptionPlans(token),
      ]);
      const couponList = unwrap(couponResponse, []);
      const planPayload = unwrap(planResponse, {});
      setCoupons(Array.isArray(couponList) ? couponList : []);
      setPlans(Array.isArray(planPayload?.plans) ? planPayload.plans : Array.isArray(planPayload) ? planPayload : []);
      if (canReport) {
        await loadRedemptions('');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load coupons.' });
    } finally {
      setIsLoading(false);
    }
  }, [canReport, loadRedemptions, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCoupons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return coupons;
    return coupons.filter((coupon) =>
      [coupon.code, coupon.name, ...(coupon.planNames || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [coupons, searchQuery]);

  const filteredRedemptions = useMemo(() => {
    const query = redemptionSearch.trim().toLowerCase();
    if (!query) return redemptions;
    return redemptions.filter((item) =>
      [item.couponCode, item.businessName, item.mobile, item.planName, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [redemptions, redemptionSearch]);

  const pagedCoupons = useMemo(() => {
    const totalItems = filteredCoupons.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / couponPageSize));
    const safePage = Math.min(Math.max(couponPage, 0), totalPages - 1);
    const start = safePage * couponPageSize;
    const end = Math.min(start + couponPageSize, totalItems);
    return { items: filteredCoupons.slice(start, end), totalItems, totalPages, page: safePage, start, end };
  }, [couponPage, couponPageSize, filteredCoupons]);

  const totals = useMemo(() => {
    const redeemed = redemptions.filter((item) => String(item.status).toUpperCase() === 'REDEEMED');
    return {
      coupons: coupons.length,
      active: coupons.filter((coupon) => coupon.active !== false).length,
      redeemed: redeemed.length,
      discount: redeemed.reduce((sum, item) => sum + Number(item.couponDiscountAmount || 0), 0),
    };
  }, [coupons, redemptions]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const startCreate = () => {
    setForm(emptyForm);
    setMessage({ type: 'info', text: '' });
    setViewItem(null);
    setShowForm(true);
  };

  const startEdit = (coupon) => {
    setForm(normalizeForm(coupon));
    setMessage({ type: 'info', text: '' });
    setViewItem(null);
    setShowForm(true);
  };

  const buildPayload = () => ({
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim(),
    discountType: form.discountType,
    discountValue: toNumberOrNull(form.discountValue),
    maxDiscountAmount: toNumberOrNull(form.maxDiscountAmount),
    minOrderAmount: toNumberOrNull(form.minOrderAmount),
    startAt: form.startAt || null,
    endAt: form.endAt || null,
    totalUsageLimit: toNumberOrNull(form.totalUsageLimit),
    perUserLimit: toNumberOrNull(form.perUserLimit),
    applicableUserType: form.applicableUserType,
    active: Boolean(form.active),
    showInCheckoutList: Boolean(form.showInCheckoutList),
    planIds: form.planIds.map(Number).filter(Boolean),
    planDiscountOverrides: Object.fromEntries(
      form.planIds
        .filter((planId) => toNumberOrNull(form.planOverrides?.[planId]) > 0)
        .map((planId) => [planId, toNumberOrNull(form.planOverrides[planId])])
    ),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.id && !canCreate) return;
    if (form.id && !canUpdate) return;
    if (!form.code.trim() || !form.name.trim()) {
      setMessage({ type: 'error', text: 'Coupon code and name are required.' });
      return;
    }
    if (!toNumberOrNull(form.discountValue) || Number(form.discountValue) <= 0) {
      setMessage({ type: 'error', text: 'Discount value must be greater than zero.' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (form.id) {
        await updateSubscriptionCoupon(token, form.id, payload);
        if (viewItem?.coupon?.id === form.id) {
          setViewItem(null);
        }
        setMessage({ type: 'success', text: 'Coupon updated.' });
      } else {
        await createSubscriptionCoupon(token, payload);
        setMessage({ type: 'success', text: 'Coupon created.' });
      }
      setForm(emptyForm);
      setShowForm(false);
      await loadCoupons();
      await loadRedemptions(selectedCouponId);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save coupon.' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCoupon = async (coupon) => {
    if (!canUpdate) return;
    try {
      await updateSubscriptionCouponStatus(token, coupon.id, coupon.active === false);
      await loadCoupons();
      setMessage({ type: 'success', text: 'Coupon status updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update coupon status.' });
    }
  };

  const deactivateCoupon = async (coupon) => {
    if (!canDelete) return;
    try {
      await deleteSubscriptionCoupon(token, coupon.id);
      if (viewItem?.coupon?.id === coupon.id) {
        setViewItem(null);
      }
      await loadCoupons();
      setMessage({ type: 'success', text: 'Coupon deactivated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to deactivate coupon.' });
    }
  };

  const handleView = async (coupon) => {
    setIsViewLoading(true);
    setViewItem(null);
    setShowForm(false);
    try {
      const [couponRes, redemptionsRes] = await Promise.all([
        getSubscriptionCoupon(token, coupon.id),
        listSubscriptionCouponRedemptions(token, coupon.id)
      ]);
      const detailedCoupon = unwrap(couponRes, coupon);
      const redemptionList = unwrap(redemptionsRes, []);
      setViewItem({ coupon: detailedCoupon, redemptions: redemptionList });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load coupon details.' });
    } finally {
      setIsViewLoading(false);
    }
  };

  const renderViewPanel = () => {
    if (isViewLoading) {
      return (
        <div className="mv-panel card">
          <p className="mv-loading">Loading details…</p>
        </div>
      );
    }
    if (!viewItem) return null;

    const cp = viewItem.coupon ?? {};
    const cpRedemptions = Array.isArray(viewItem.redemptions) ? viewItem.redemptions : [];

    return (
      <div className="mv-panel card" style={{ maxHeight: '100%', overflowY: 'auto' }}>
        <div className="mv-panel-header">
          <div className="mv-panel-title-row">
            <button type="button" className="mv-back-btn" onClick={() => setViewItem(null)}>
              ← Back
            </button>
            <h3 className="mv-panel-title">{cp.code}</h3>
            <span className={cp.active !== false ? 'status-active' : 'status-inactive'}>
              {cp.active !== false ? 'Active' : 'Inactive'}
            </span>
          </div>
          {canUpdate && (
            <button type="button" className="ghost-btn small" onClick={() => startEdit(cp)}>
              Edit
            </button>
          )}
        </div>

        <div className="mv-section">
          <p className="mv-section-label">Basic Info</p>
          <div className="mv-detail-grid">
            <DetailRow label="Coupon Code" value={cp.code} />
            <DetailRow label="Coupon Name" value={cp.name} />
            <DetailRow label="Description" value={cp.description} />
            <DetailRow 
              label="Discount" 
              value={cp.discountType === 'PERCENTAGE' ? `${money(cp.discountValue)}%` : `Rs. ${money(cp.discountValue)}`} 
            />
            <DetailRow label="Max Discount" value={cp.maxDiscountAmount ? `Rs. ${money(cp.maxDiscountAmount)}` : 'No Cap'} />
            <DetailRow label="Min Order Amount" value={cp.minOrderAmount ? `Rs. ${money(cp.minOrderAmount)}` : 'No Min'} />
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">Usage & Limits</p>
          <div className="mv-detail-grid">
            <DetailRow label="Total Usage Limit" value={cp.totalUsageLimit ?? 'Unlimited'} />
            <DetailRow label="Per Mobile Limit" value={cp.perUserLimit ?? '1'} />
            <DetailRow label="Current Usage" value={`${cp.usageCount || 0} times`} />
            <DetailRow label="Total Discount Given" value={`Rs. ${money(cp.totalDiscountGiven)}`} />
            <DetailRow label="Start Date" value={cp.startAt ? new Date(cp.startAt).toLocaleString('en-IN') : '-'} />
            <DetailRow label="End Date" value={cp.endAt ? new Date(cp.endAt).toLocaleString('en-IN') : '-'} />
            <DetailRow label="Applicable User Type" value={cp.applicableUserType ?? 'BUSINESS'} />
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">Applicable Plans</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {cp.planNames?.length ? (
              cp.planNames.map((pn, i) => (
                <span key={i} className="status-pill pending" style={{ margin: 0 }}>{pn}</span>
              ))
            ) : (
              <span className="mv-empty" style={{ margin: 0 }}>All Plans</span>
            )}
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">
            Usage History
            <span className="mv-count-badge">{cpRedemptions.length}</span>
          </p>
          {cpRedemptions.length === 0 ? (
            <p className="mv-empty">This coupon has not been redeemed yet.</p>
          ) : (
            <div className="mv-child-grid">
              {cpRedemptions.map((red) => (
                <div key={red.id} className="mv-child-card">
                  <div className="mv-child-name">{red.businessName || 'Business User'}</div>
                  <div className="mv-child-meta" style={{ marginTop: 4 }}>
                    <span className={`status-pill ${statusClass(red.status)}`}>{red.status}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Plan: {red.planName || '-'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
                      Discount: Rs. {money(red.couponDiscountAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleReportFilter = async (couponId) => {
    setSelectedCouponId(couponId);
    try {
      await loadRedemptions(couponId);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load coupon report.' });
    }
  };

  const exportRedemptions = () => {
    const headers = ['Coupon', 'Business', 'Mobile', 'Plan', 'Base', 'Launch Discount', 'Coupon Discount', 'Final Amount', 'Status'];
    const rows = filteredRedemptions.map((item) => [
      item.couponCode || '',
      item.businessName || '',
      item.mobile || '',
      item.planName || '',
      item.baseAmount || 0,
      item.launchDiscountAmount || 0,
      item.couponDiscountAmount || 0,
      item.finalAmount || 0,
      item.status || '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'coupon-redemptions.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="subscription-coupon-page">
      <Banner message={message} />

      <div className="subscription-coupon-metrics">
        <div className="subscription-coupon-stat">
          <span>Total Coupons</span>
          <strong>{totals.coupons}</strong>
        </div>
        <div className="subscription-coupon-stat">
          <span>Active</span>
          <strong>{totals.active}</strong>
        </div>
        <div className="subscription-coupon-stat">
          <span>Redeemed</span>
          <strong>{totals.redeemed}</strong>
        </div>
        <div className="subscription-coupon-stat">
          <span>Discount Given</span>
          <strong>Rs. {money(totals.discount)}</strong>
        </div>
      </div>

      <div className={`mv-layout${viewItem || isViewLoading ? ' mv-layout--split' : ''}`}>
        {/* ── List panel ── */}
        <div className="panel card users-table-card">
          <DataTable
            columns={[
              {
                key: 'code',
                header: 'Code',
                sortable: true,
                render: (val, coupon) => (
                  <span
                    className="bdt-name-link"
                    style={{ color: '#6345ED', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(coupon);
                    }}
                  >
                    {val}
                  </span>
                ),
              },
              {
                key: 'name',
                header: 'Name',
                sortable: true,
                render: (val) => val || '-',
              },
              {
                key: 'discountValue',
                header: 'Discount',
                sortable: true,
                render: (val, coupon) => (
                  <div>
                    <strong>
                      {coupon.discountType === 'PERCENTAGE'
                        ? `${money(val)}%`
                        : `₹ ${money(val)}`}
                    </strong>
                    {coupon.maxDiscountAmount ? (
                      <div style={{ fontSize: 11, color: '#6b7280' }}>Cap ₹ {money(coupon.maxDiscountAmount)}</div>
                    ) : null}
                  </div>
                ),
              },
              {
                key: 'plans',
                header: 'Plans',
                render: (_, coupon) => coupon.planNames?.length ? coupon.planNames.join(', ') : 'All plans',
              },
              {
                key: 'usageCount',
                header: 'Usage',
                sortable: true,
                render: (val, coupon) => (
                  <div>
                    <span>{val || 0}</span>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>₹ {money(coupon.totalDiscountGiven)}</div>
                  </div>
                ),
              },
              {
                key: 'active',
                header: 'Status',
                sortable: true,
                render: (val) => (
                  <span className={`status-pill ${val === false ? 'rejected' : 'approved'}`}>
                    {val === false ? 'Inactive' : 'Active'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (_, coupon) => {
                  const actions = [];
                  actions.push({ label: 'View', onClick: () => handleView(coupon) });
                  if (canUpdate) {
                    actions.push({ label: 'Edit', onClick: () => startEdit(coupon) });
                    actions.push({
                      label: coupon.active === false ? 'Activate' : 'Pause',
                      onClick: () => toggleCoupon(coupon),
                    });
                  }
                  if (canDelete) {
                    actions.push({
                      label: 'Deactivate',
                      onClick: () => deactivateCoupon(coupon),
                      danger: true,
                    });
                  }
                  if (actions.length === 0) return null;
                  return (
                    <div className="table-actions" onClick={(event) => event.stopPropagation()}>
                      <TableRowActionMenu
                        rowId={coupon.id}
                        openRowId={openActionRowId}
                        onToggle={setOpenActionRowId}
                        actions={actions}
                      />
                    </div>
                  );
                },
              },
            ]}
            data={filteredCoupons}
            isLoading={isLoading}
            search={searchQuery}
            onSearchChange={(val) => { setSearchQuery(val); setCouponPage(0); }}
            searchPlaceholder="Search coupons..."
            page={pagedCoupons.page}
            pageSize={couponPageSize}
            onPageChange={setCouponPage}
            onPageSizeChange={(newSize) => { setCouponPageSize(newSize); setCouponPage(0); }}
            pageSizeOptions={[10, 25, 50]}
            onRowClick={(coupon) => handleView(coupon)}
            emptyTitle="No coupons found"
            emptyDescription="No subscription coupons match your criteria."
            toolbarRight={
              canCreate ? (
                <button
                  type="button"
                  className="gsc-create-btn"
                  onClick={startCreate}
                  title="New Coupon"
                  aria-label="New Coupon"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              ) : null
            }
          />
        </div>

        {/* ── View panel ── */}
        {renderViewPanel()}
      </div>

      {showForm ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={handleCloseModal}>
          <div
            className="admin-modal cat-unified-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px 14px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                  {form.id ? 'Edit Coupon' : 'Create Coupon'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  Empty plan selection means coupon applies to all plans.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Close"
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: 8,
                  width: 32, height: 32, cursor: 'pointer', color: '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '24px', maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Row 1: Code + Name */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Coupon Code <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={form.code}
                        onChange={(event) => updateForm('code', event.target.value.toUpperCase())}
                        placeholder="LAUNCH10"
                        disabled={form.id && !canUpdate}
                        required
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Coupon Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(event) => updateForm('name', event.target.value)}
                        placeholder="Launch 10 percent off"
                        required
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Discount Type + Discount Value */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Discount Type
                      </label>
                      <select
                        value={form.discountType}
                        onChange={(event) => updateForm('discountType', event.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      >
                        <option value="PERCENTAGE">Percentage</option>
                        <option value="FIXED">Fixed amount</option>
                      </select>
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Discount Value <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.discountValue}
                        onChange={(event) => updateForm('discountValue', event.target.value)}
                        placeholder={form.discountType === 'PERCENTAGE' ? "e.g. 10" : "e.g. 50"}
                        required
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                      {form.discountType === 'PERCENTAGE' ? (
                        <span className="field-help">Enter percentage value (e.g. 10 for 10% discount)</span>
                      ) : (
                        <span className="field-help">Enter fixed amount in Rs. (e.g. 50 for Rs. 50 discount)</span>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Max Discount + Min Order */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Max Discount Amount (Optional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.maxDiscountAmount}
                        onChange={(event) => updateForm('maxDiscountAmount', event.target.value)}
                        placeholder="e.g. 100"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Minimum Order Amount (Optional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.minOrderAmount}
                        onChange={(event) => updateForm('minOrderAmount', event.target.value)}
                        placeholder="e.g. 499"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Row 4: Total Usage + Per Mobile Limit */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Total Usage Limit (Optional)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.totalUsageLimit}
                        onChange={(event) => updateForm('totalUsageLimit', event.target.value)}
                        placeholder="e.g. 100"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Per Mobile Limit (Optional)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.perUserLimit}
                        onChange={(event) => updateForm('perUserLimit', event.target.value)}
                        placeholder="e.g. 1"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Row 5: Start At + End At */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Start At (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={form.startAt}
                        onChange={(event) => updateForm('startAt', event.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        End At (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={form.endAt}
                        onChange={(event) => updateForm('endAt', event.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Row 6: User Type + Active Toggle */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, alignItems: 'center' }}>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Applicable User Type
                      </label>
                      <select
                        value={form.applicableUserType}
                        onChange={(event) => updateForm('applicableUserType', event.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      >
                        <option value="BUSINESS">Business</option>
                        <option value="USER">User</option>
                        <option value="ALL">All</option>
                      </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 18 }}>
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(event) => updateForm('active', event.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6345ED' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Active Coupon</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 18 }}>
                      <input
                        type="checkbox"
                        checked={form.showInCheckoutList}
                        onChange={(event) => updateForm('showInCheckoutList', event.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6345ED' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Show in checkout offer list</span>
                    </label>
                  </div>

                  {/* Row 7: Applicable Plans */}
                  <div className="field">
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Applicable Plans
                    </label>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>
                      Leave all unchecked to apply to every plan. Check a plan and optionally set an override amount
                      to charge a different flat discount for that plan instead of the global discount value above.
                    </p>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      maxHeight: 220,
                      overflowY: 'auto',
                      padding: 8,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}>
                      {plans.map((plan) => {
                        const planId = String(planIdOf(plan));
                        const checked = form.planIds.includes(planId);
                        return (
                          <div key={planId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  const nextPlanIds = event.target.checked
                                    ? [...form.planIds, planId]
                                    : form.planIds.filter((id) => id !== planId);
                                  updateForm('planIds', nextPlanIds);
                                }}
                                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6345ED' }}
                              />
                              <span style={{ fontSize: 13, color: '#1e293b' }}>{planNameOf(plan)}</span>
                            </label>
                            {checked && (
                              <input
                                type="number"
                                min="0"
                                placeholder="Override Rs (optional)"
                                value={form.planOverrides?.[planId] ?? ''}
                                onChange={(event) =>
                                  updateForm('planOverrides', { ...form.planOverrides, [planId]: event.target.value })
                                }
                                style={{ width: 170, padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12.5 }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <span className="field-help">Hold Ctrl (or Cmd) to select multiple plans. Leave empty for all plans.</span>
                  </div>

                  {/* Row 8: Description */}
                  <div className="field">
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(event) => updateForm('description', event.target.value)}
                      placeholder="Internal note for admin team"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'flex-end', gap: 12,
                background: '#fafafa',
              }}>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleCloseModal}
                  style={{ minWidth: 100 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isSaving}
                  style={{ minWidth: 140 }}
                >
                  {isSaving ? 'Saving...' : form.id ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {canReport ? (
        <section className="panel card subscription-coupon-report" style={{ marginTop: 24 }}>
          <DataTable
            columns={[
              {
                key: 'couponCode',
                header: 'Coupon',
                sortable: true,
                render: (val) => <strong style={{ color: '#6345ED' }}>{val || '-'}</strong>,
              },
              {
                key: 'businessName',
                header: 'Business',
                sortable: true,
                render: (val) => (
                  <span className="bdt-name-link" style={{ color: '#6345ED', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {val || '-'}
                  </span>
                ),
              },
              {
                key: 'mobile',
                header: 'Mobile',
                render: (val) => val || '-',
              },
              {
                key: 'planName',
                header: 'Plan',
                sortable: true,
                render: (val) => val || '-',
              },
              {
                key: 'baseAmount',
                header: 'Base (₹)',
                sortable: true,
                render: (val) => `₹${money(val)}`,
              },
              {
                key: 'launchDiscountAmount',
                header: 'Launch Disc (₹)',
                render: (val) => `₹${money(val)}`,
              },
              {
                key: 'couponDiscountAmount',
                header: 'Coupon Disc (₹)',
                render: (val) => `₹${money(val)}`,
              },
              {
                key: 'finalAmount',
                header: 'Final (₹)',
                sortable: true,
                render: (val) => <strong>₹{money(val)}</strong>,
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (val) => (
                  <span className={`status-pill ${statusClass(val)}`}>{val || '-'}</span>
                ),
              },
            ]}
            data={filteredRedemptions}
            isLoading={isLoading}
            search={redemptionSearch}
            onSearchChange={(val) => { setRedemptionSearch(val); setRedemptionPage(0); }}
            searchPlaceholder="Search coupon usage..."
            page={redemptionPage}
            pageSize={redemptionPageSize}
            onPageChange={setRedemptionPage}
            onPageSizeChange={(newSize) => { setRedemptionPageSize(newSize); setRedemptionPage(0); }}
            pageSizeOptions={[10, 25, 50]}
            emptyTitle="No coupon usage yet"
            emptyDescription="No business redemptions found for this coupon."
            toolbarLeft={
              <select
                value={selectedCouponId}
                onChange={(event) => handleReportFilter(event.target.value)}
                className="gsc-toolbar-btn"
                style={{ border: 'none', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
              >
                <option value="">All Coupons</option>
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.code}
                  </option>
                ))}
              </select>
            }
            toolbarRight={
              <button type="button" className="ghost-btn small" onClick={exportRedemptions}>
                Export CSV
              </button>
            }
          />
        </section>
      ) : null}
    </div>
  );
}

export default SubscriptionCouponPage;
