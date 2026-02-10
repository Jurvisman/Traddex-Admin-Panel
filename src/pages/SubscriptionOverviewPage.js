import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner } from '../components';
import { fetchUsers, listSubscriptionAssignments, listSubscriptionPlans } from '../services/adminApi';

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
};

const formatCurrency = (value) => {
  const amount = toNumber(value);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    return `Rs ${amount.toLocaleString('en-IN')}`;
  }
};

const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

const getPlanId = (plan) => plan?.id ?? plan?.plan_id;
const getAssignmentPlanId = (assignment) => assignment?.plan_id ?? assignment?.planId ?? assignment?.plan?.id;

const extractFeatures = (plan) => {
  const features = Array.isArray(plan?.features) ? plan.features : [];
  const fromFeatures = features
    .map((feature) => feature?.name || feature?.feature_name || feature?.code || feature?.feature_code)
    .filter(Boolean);
  if (fromFeatures.length) return fromFeatures.slice(0, 5);

  const description = plan?.description || '';
  const fromDescription = String(description)
    .split(/[\n,•]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (fromDescription.length) return fromDescription.slice(0, 5);

  return ['Core access', 'Usage analytics', 'Standard support'];
};

const getPlanLabel = (plan) => plan?.plan_name || plan?.name || 'Plan';

function SubscriptionOverviewPage({ token }) {
  const [plans, setPlans] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const didInitRef = useRef(false);

  const loadPlans = async () => {
    const response = await listSubscriptionPlans(token);
    setPlans(response?.data?.plans || []);
  };

  const loadAssignments = async () => {
    const response = await listSubscriptionAssignments(token);
    setAssignments(response?.data?.subscriptions || []);
  };

  const loadUsers = async () => {
    const response = await fetchUsers(token);
    setUsers(response?.data || []);
  };

  const loadAll = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await Promise.all([loadPlans(), loadAssignments(), loadUsers()]);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load subscription overview.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planSummaries = useMemo(() => {
    const activePlans = plans.filter((plan) => plan?.is_active !== 0 && plan?.is_active !== '0');
    return activePlans.map((plan) => {
      const planId = getPlanId(plan);
      const price = toNumber(plan?.price ?? plan?.plan_price ?? plan?.amount);
      const assignedCount = assignments.filter(
        (assignment) => String(getAssignmentPlanId(assignment)) === String(planId)
      ).length;
      const revenue = price * assignedCount;
      return {
        ...plan,
        planId,
        price,
        assignedCount,
        revenue,
        features: extractFeatures(plan),
      };
    });
  }, [plans, assignments]);

  const totalRevenue = planSummaries.reduce((sum, plan) => sum + plan.revenue, 0);
  const totalSubscribers = assignments.length;
  const paidSubscribers = planSummaries.reduce((sum, plan) => sum + (plan.price > 0 ? plan.assignedCount : 0), 0);
  const conversionRate = users.length ? paidSubscribers / users.length : totalSubscribers ? paidSubscribers / totalSubscribers : 0;

  const popularPlanId = useMemo(() => {
    if (!planSummaries.length) return null;
    return planSummaries.reduce((best, plan) => {
      if (!best) return plan;
      if (plan.assignedCount > best.assignedCount) return plan;
      if (plan.assignedCount === best.assignedCount && plan.price > best.price) return plan;
      return best;
    }, null)?.planId;
  }, [planSummaries]);

  return (
    <div className="subscription-overview">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Subscriptions</h2>
          <p className="panel-subtitle">Manage subscription plans and view analytics.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={loadAll} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <Banner message={message} />

      <div className="subscription-metrics">
        <div className="stat-card subscription-stat-card" style={{ '--stat-accent': '#16A34A' }}>
          <div className="metric-icon metric-revenue" />
          <div>
            <p className="stat-label">Total Revenue</p>
            <p className="stat-value">{formatCurrency(totalRevenue)}</p>
            <p className="stat-sub">Last 30 days</p>
          </div>
        </div>
        <div className="stat-card subscription-stat-card" style={{ '--stat-accent': '#3B82F6' }}>
          <div className="metric-icon metric-subscribers" />
          <div>
            <p className="stat-label">Total Subscribers</p>
            <p className="stat-value">{totalSubscribers}</p>
            <p className="stat-sub">Active assignments</p>
          </div>
        </div>
        <div className="stat-card subscription-stat-card" style={{ '--stat-accent': '#A855F7' }}>
          <div className="metric-icon metric-paid" />
          <div>
            <p className="stat-label">Paid Subscribers</p>
            <p className="stat-value">{paidSubscribers}</p>
            <p className="stat-sub">Active paid plans</p>
          </div>
        </div>
        <div className="stat-card subscription-stat-card" style={{ '--stat-accent': '#F59E0B' }}>
          <div className="metric-icon metric-conversion" />
          <div>
            <p className="stat-label">Conversion Rate</p>
            <p className="stat-value">{formatPercent(conversionRate)}</p>
            <p className="stat-sub">Based on total users</p>
          </div>
        </div>
      </div>

      <div className="panel card subscription-plans-card">
        <div className="panel-head compact">
          <div>
            <h3 className="panel-title">Available Plans</h3>
            <p className="panel-subtitle">Active plans with subscription activity.</p>
          </div>
        </div>

        {planSummaries.length === 0 ? (
          <p className="empty-state">No active plans yet.</p>
        ) : (
          <div className="subscription-plan-grid">
            {planSummaries.map((plan) => {
              const isPopular = plan.planId === popularPlanId;
              return (
                <div key={plan.planId || plan.id} className={`subscription-plan-card ${isPopular ? 'popular' : ''}`}>
                  {isPopular ? <div className="plan-ribbon">Popular</div> : null}
                  <div className="plan-card-head">
                    <span className="subscription-pill">{plan?.user_type || 'All users'}</span>
                    <span className="plan-chip">{getPlanLabel(plan)}</span>
                  </div>
                  <div className="plan-price">
                    <span className="plan-price-amount">{formatCurrency(plan.price || 0)}</span>
                    <span className="plan-price-cycle">/month</span>
                  </div>
                  <p className="plan-active-users">{plan.assignedCount} active users</p>
                  <ul className="plan-feature-list">
                    {plan.features.map((feature) => (
                      <li key={`${plan.planId}-${feature}`} className="plan-feature">
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel card subscription-stats-card">
        <div className="panel-head compact">
          <div>
            <h3 className="panel-title">Plan Statistics</h3>
            <p className="panel-subtitle">Distribution across active plans.</p>
          </div>
        </div>

        {planSummaries.length === 0 ? (
          <p className="empty-state">No plan data available.</p>
        ) : (
          <div className="table-shell">
            <table className="admin-table plan-stat-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Price</th>
                  <th>Users</th>
                  <th>Revenue</th>
                  <th>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {planSummaries.map((plan) => {
                  const share = totalRevenue ? plan.revenue / totalRevenue : 0;
                  return (
                    <tr key={`stat-${plan.planId || plan.id}`}>
                      <td>{getPlanLabel(plan)}</td>
                      <td>{plan.price ? formatCurrency(plan.price) : 'Free'}</td>
                      <td>{plan.assignedCount}</td>
                      <td>{formatCurrency(plan.revenue)}</td>
                      <td>
                        <div className="plan-progress">
                          <span style={{ width: `${share * 100}%` }} />
                        </div>
                        <span className="plan-share">{formatPercent(share)}</span>
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
  );
}

export default SubscriptionOverviewPage;
