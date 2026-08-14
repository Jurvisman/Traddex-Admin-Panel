import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner, TableRowActionMenu } from '../components';
import {
  deleteSubscriptionPlan,
  listSubscriptionFeatures,
  listSubscriptionPlans,
  updateSubscriptionPlan,
} from '../services/adminApi';

function SubscriptionPlanViewPage({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const didInitRef = useRef(false);
  const [openActionRowId, setOpenActionRowId] = useState(null);

  const numericId = id ? Number(id) : null;

  const featureMap = useMemo(() => {
    const map = new Map();
    features.forEach((feature) => {
      map.set(String(feature.id), feature);
    });
    return map;
  }, [features]);

  const selectedPlan = useMemo(() => {
    if (!numericId) return null;
    return plans.find((plan) => Number(plan.id) === numericId) || null;
  }, [numericId, plans]);

  const selectedPlanFeatureRows = useMemo(() => {
    if (!selectedPlan || !Array.isArray(selectedPlan.features)) return [];
    return selectedPlan.features.map((item) => {
      const featureId = item.feature_id ?? item.id;
      const featureKey = featureId != null ? String(featureId) : '';
      const featureMeta = featureKey ? featureMap.get(featureKey) : null;
      const type = item.type || featureMeta?.type || '';
      const limit = item.limit ?? item.feature_limit ?? null;
      const priority = item.priority ?? item.feature_priority ?? null;
      const isEnabled =
        item.is_enabled !== null && item.is_enabled !== undefined ? Number(item.is_enabled) === 1 : true;
      return {
        id: featureId,
        name: featureMeta?.name || item.name || `Feature #${featureId ?? ''}`,
        type,
        limit,
        priority,
        isEnabled,
      };
    });
  }, [selectedPlan, featureMap]);

  const loadData = useCallback(async () => {
    if (!numericId) {
      setMessage({ type: 'error', text: 'Invalid subscription plan id.' });
      return;
    }
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [plansResponse, featuresResponse] = await Promise.all([
        listSubscriptionPlans(token),
        listSubscriptionFeatures(token),
      ]);
      setPlans(plansResponse?.data?.plans || []);
      setFeatures(featuresResponse?.data?.features || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load subscription plan.' });
    } finally {
      setIsLoading(false);
    }
  }, [numericId, token]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    loadData();
  }, [loadData]);

  const handleEditPlan = () => {
    if (!selectedPlan?.id) return;
    navigate(`/admin/subscription/plans/${selectedPlan.id}/edit`);
  };

  const handleTogglePlanStatus = async () => {
    if (!selectedPlan?.id) return;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    const isCurrentlyActive = Number(selectedPlan.is_active) === 1 || selectedPlan.is_active === true;
    try {
      if (isCurrentlyActive) {
        await deleteSubscriptionPlan(token, selectedPlan.id);
        setMessage({ type: 'success', text: 'Plan deactivated successfully.' });
      } else {
        const payload = {
          plan_name: selectedPlan.plan_name,
          user_type: selectedPlan.user_type,
          business_type: selectedPlan.business_type,
          price: selectedPlan.price,
          duration_months: selectedPlan.duration_months || selectedPlan.duration,
          yearly_discount_percent: selectedPlan.yearly_discount_percent,
          promo_price: selectedPlan.promo_price,
          offer_active: Boolean(selectedPlan.offer_active),
          offer_duration_months: selectedPlan.offer_duration_months,
          offer_terms: selectedPlan.offer_terms,
          promo_label: selectedPlan.promo_label,
          cta_label: selectedPlan.cta_label,
          popular: selectedPlan.popular,
          best_for: selectedPlan.best_for,
          waitlist_enabled: Boolean(selectedPlan.waitlist_enabled),
          is_active: 1,
        };
        await updateSubscriptionPlan(token, selectedPlan.id, payload);
        setMessage({ type: 'success', text: 'Plan activated successfully.' });
      }
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update plan status.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="panel-head category-list-head">
        <div className="category-list-head-left">
          <div>
            <h2 className="panel-title">Plan details</h2>
            <p className="panel-subtitle">View full configuration for this subscription plan.</p>
          </div>
        </div>
      </div>

      <Banner message={message} />

      {!selectedPlan && !isLoading ? (
        <p className="empty-state">Subscription plan not found.</p>
      ) : null}

      {selectedPlan ? (
        <div className="panel card users-detail-page">
          <div className="user-view-shell">
            <div className="panel-split detail-section-head">
              <div className="detail-heading-wrap">
                <h4 className="detail-section-title">Subscription plan</h4>
                <span
                  className={`status-pill ${
                    Number(selectedPlan.is_active) === 1 || selectedPlan.is_active === true ? 'approved' : 'rejected'
                  }`}
                >
                  {Number(selectedPlan.is_active) === 1 || selectedPlan.is_active === true ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="table-action-group plan-header-actions">
                <TableRowActionMenu
                  rowId={selectedPlan.id}
                  openRowId={openActionRowId}
                  onToggle={setOpenActionRowId}
                  actions={[
                    {
                      label: 'Edit',
                      onClick: handleEditPlan,
                    },
                    {
                      label: (Number(selectedPlan.is_active) === 1 || selectedPlan.is_active === true) ? 'Deactivate' : 'Activate',
                      onClick: handleTogglePlanStatus,
                      danger: Number(selectedPlan.is_active) === 1 || selectedPlan.is_active === true,
                    },
                  ]}
                />
              </div>
            </div>

            <div className="user-view-grid user-view-grid-3">
              <div className="user-view-card">
                <p className="user-view-label">Plan name</p>
                <p className="user-view-value">{selectedPlan.plan_name || '-'}</p>
              </div>
              <div className="user-view-card">
                <p className="user-view-label">User type</p>
                <p className="user-view-value">{selectedPlan.user_type || '-'}</p>
              </div>
              <div className="user-view-card">
                <p className="user-view-label">Business type</p>
                <p className="user-view-value">{selectedPlan.business_type || 'ALL'}</p>
              </div>
              <div className="user-view-card">
                <p className="user-view-label">Price</p>
                <p className="user-view-value">
                  ₹ {selectedPlan.price ?? 0}
                  {selectedPlan.duration_months || selectedPlan.duration
                    ? ` / ${selectedPlan.duration_months || selectedPlan.duration} month(s)`
                    : null}
                </p>
              </div>
              <div className="user-view-card">
                <p className="user-view-label">Billing cycle</p>
                <p className="user-view-value">
                  {selectedPlan.duration_months || selectedPlan.duration
                    ? `${selectedPlan.duration_months || selectedPlan.duration} month cycle`
                    : 'Not specified'}
                </p>
              </div>
              <div className="user-view-card">
                <p className="user-view-label">Colors</p>
                <div className="plan-color-swatches">
                  <div className="plan-color-row">
                    <span
                      className="plan-color-dot"
                      style={{ background: selectedPlan.font_color || '#000' }}
                      title={selectedPlan.font_color || ''}
                    />
                    <span className="plan-color-role">Font</span>
                  </div>
                  <div className="plan-color-row">
                    <span
                      className="plan-color-dot"
                      style={{ background: selectedPlan.background_color || '#fff' }}
                      title={selectedPlan.background_color || ''}
                    />
                    <span className="plan-color-role">Background</span>
                  </div>
                </div>
              </div>
              {selectedPlan.promo_price !== undefined && selectedPlan.promo_price !== null && (
                <div className="user-view-card">
                  <p className="user-view-label">Offer price</p>
                  <p className="user-view-value">₹ {selectedPlan.promo_price}</p>
                </div>
              )}
              <div className="user-view-card">
                <p className="user-view-label">Launch offer</p>
                <p className="user-view-value">
                  {selectedPlan.offer_active === true || Number(selectedPlan.offer_active) === 1
                    ? 'Active'
                    : 'Inactive'}
                </p>
              </div>
              {selectedPlan.offer_duration_months ? (
                <div className="user-view-card">
                  <p className="user-view-label">Offer duration</p>
                  <p className="user-view-value">{selectedPlan.offer_duration_months} month(s)</p>
                </div>
              ) : null}
              {selectedPlan.promo_label && (
                <div className="user-view-card">
                  <p className="user-view-label">Promo Label / Badge</p>
                  <p className="user-view-value">{selectedPlan.promo_label}</p>
                </div>
              )}
              {selectedPlan.cta_label && (
                <div className="user-view-card">
                  <p className="user-view-label">CTA Label</p>
                  <p className="user-view-value">{selectedPlan.cta_label}</p>
                </div>
              )}
              {selectedPlan.best_for && (
                <div className="user-view-card">
                  <p className="user-view-label">Best For</p>
                  <p className="user-view-value">{selectedPlan.best_for}</p>
                </div>
              )}
              <div className="user-view-card">
                <p className="user-view-label">Popular status</p>
                <p className="user-view-value">{selectedPlan.popular === 1 ? 'Yes (Highlighted)' : 'No'}</p>
              </div>
            </div>

            {selectedPlan.description ? (
              <div className="detail-section">
                <p className="detail-section-title">Description</p>
                <p className="user-view-value">{selectedPlan.description}</p>
              </div>
            ) : null}

            {selectedPlan.offer_terms ? (
              <div className="detail-section">
                <p className="detail-section-title">Launch offer terms</p>
                <p className="user-view-value">{selectedPlan.offer_terms}</p>
              </div>
            ) : null}

            <div className="detail-section">
              <p className="detail-section-title">Included features</p>
              {selectedPlanFeatureRows.length === 0 ? (
                <p className="empty-state">No features configured for this plan.</p>
              ) : (
                <div className="table-shell">
                  <table className="admin-table plan-features-table">
                    <colgroup>
                      <col style={{ width: '35%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>Type</th>
                        <th>Limit</th>
                        <th>Priority</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPlanFeatureRows.map((row) => (
                        <tr key={row.id || row.name}>
                          <td>{row.name}</td>
                          <td>
                            <span className={`plan-feature-type-pill ${(row.type || '').toLowerCase()}`}>
                              {row.type || '-'}
                            </span>
                          </td>
                          <td>{row.type === 'COUNT' ? row.limit ?? 0 : '—'}</td>
                          <td>{row.type === 'PRIORITY' ? row.priority || '—' : '—'}</td>
                          <td>
                            <span className={`status-pill ${row.isEnabled ? 'approved' : 'rejected'}`}>
                              {row.isEnabled ? 'Enabled' : 'Disabled'}
                            </span>
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
      ) : null}
    </div>
  );
}

export default SubscriptionPlanViewPage;
