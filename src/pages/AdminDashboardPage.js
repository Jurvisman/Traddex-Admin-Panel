import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner } from '../components';
import { fetchUsers, listSubscriptionAssignments, listSubscriptionPlans } from '../services/adminApi';

const emptyStats = {
  total: 0,
  business: 0,
  users: 0,
  logistics: 0,
  insurance: 0,
  other: 0,
};

const getPlanId = (plan) => plan?.id ?? plan?.plan_id;
const getAssignmentPlanId = (assignment) => assignment?.plan_id ?? assignment?.planId ?? assignment?.plan?.id;
const getPlanLabel = (plan) => plan?.plan_name || plan?.name || 'Plan';

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    toNumber(value)
  );

const toRgba = (hex, alpha) => {
  if (!hex || typeof hex !== 'string') return `rgba(37, 99, 235, ${alpha})`;
  let value = hex.replace('#', '').trim();
  if (value.length === 3) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const parsed = Number.parseInt(value, 16);
  if (Number.isNaN(parsed)) return `rgba(37, 99, 235, ${alpha})`;
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const statTone = (accent) => ({
  '--stat-accent': accent,
  '--stat-accent-soft': toRgba(accent, 0.16),
  '--stat-accent-border': toRgba(accent, 0.45),
  '--stat-accent-glow': toRgba(accent, 0.28),
});

const buildTrend = (seed, base, points = 12) => {
  if (base <= 0) {
    return Array.from({ length: points }, () => 0);
  }
  const series = [];
  const wobble = base * 0.18;
  for (let i = 0; i < points; i += 1) {
    const ratio = points === 1 ? 0 : i / (points - 1);
    const wave = Math.sin(ratio * Math.PI * 2 + seed) * wobble;
    const drift = ratio * wobble * 0.6;
    const jitter = Math.cos(seed * 0.7 + i) * wobble * 0.15;
    series.push(Math.max(0, base * 0.6 + wave + drift + jitter));
  }
  return series;
};

const buildSparkCoords = (values, width, height, padding) => {
  const max = Math.max(...values, 1);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  return values.map((value, index) => {
    const ratio = values.length === 1 ? 0 : index / (values.length - 1);
    const x = padding + ratio * usableWidth;
    const y = height - padding - (value / max) * usableHeight;
    return { x, y };
  });
};

const coordsToPoints = (coords) => coords.map((point) => `${point.x},${point.y}`).join(' ');

const coordsToArea = (coords, height, padding) => {
  if (!coords.length) return '';
  const start = `${coords[0].x},${height - padding}`;
  const line = coords.map((point) => `${point.x},${point.y}`).join(' L ');
  const end = `${coords[coords.length - 1].x},${height - padding}`;
  return `M ${start} L ${line} L ${end} Z`;
};

function AdminDashboardPage({ token }) {
  const [stats, setStats] = useState(emptyStats);
  const [plans, setPlans] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  const loadStats = async (silent = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!silent) {
      setIsLoading(true);
      setMessage({ type: 'info', text: '' });
    }
    try {
      const [usersResponse, plansResponse, assignmentsResponse] = await Promise.all([
        fetchUsers(token),
        listSubscriptionPlans(token),
        listSubscriptionAssignments(token),
      ]);
      const users = usersResponse?.data || [];
      const businessCount = users.filter((user) => user.userType === 'BUSINESS' || user.user_type === 'BUSINESS').length;
      const userCount = users.filter((user) => user.userType === 'USER' || user.user_type === 'USER').length;
      const logisticsCount = users.filter(
        (user) => user.userType === 'LOGISTIC' || user.userType === 'LOGISTICS' || user.user_type === 'LOGISTIC'
      ).length;
      const insuranceCount = users.filter((user) => user.userType === 'INSURANCE' || user.user_type === 'INSURANCE')
        .length;
      const knownCount = businessCount + userCount + logisticsCount + insuranceCount;
      const otherCount = Math.max(users.length - knownCount, 0);
      setStats({
        total: users.length,
        business: businessCount,
        users: userCount,
        logistics: logisticsCount,
        insurance: insuranceCount,
        other: otherCount,
      });
      setPlans(plansResponse?.data?.plans || plansResponse?.data || []);
      setAssignments(assignmentsResponse?.data?.subscriptions || assignmentsResponse?.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load dashboard stats.' });
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => loadStats(true), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planSummaries = useMemo(() => {
    if (!plans.length) return [];
    const planMap = new Map();
    plans.forEach((plan) => {
      const planId = getPlanId(plan);
      if (planId == null) return;
      planMap.set(String(planId), {
        ...plan,
        planId,
        price: toNumber(plan?.price ?? plan?.plan_price ?? plan?.amount),
      });
    });

    const counts = new Map();
    assignments.forEach((assignment) => {
      const planId = getAssignmentPlanId(assignment);
      if (planId == null) return;
      const key = String(planId);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(planMap.values()).map((plan) => ({
      ...plan,
      assignedCount: counts.get(String(plan.planId)) || 0,
      revenue: (counts.get(String(plan.planId)) || 0) * plan.price,
    }));
  }, [plans, assignments]);

  const totalRevenue = planSummaries.reduce((sum, plan) => sum + plan.revenue, 0);
  const totalSubscribers = assignments.length;
  const paidSubscribers = planSummaries.reduce((sum, plan) => sum + (plan.price > 0 ? plan.assignedCount : 0), 0);

  const pieSegments = useMemo(
    () => [
      { label: 'Business', value: stats.business, color: '#16A34A' },
      { label: 'Users', value: stats.users, color: '#4F46E5' },
      { label: 'Logistics', value: stats.logistics, color: '#F59E0B' },
      { label: 'Insurance', value: stats.insurance, color: '#0EA5E9' },
      { label: 'Other', value: stats.other, color: '#A855F7' },
    ],
    [stats]
  );

  const totalAccounts = Math.max(stats.total, 1);
  const donutRadius = 46;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutOffset = 0;
  const donutSegments = pieSegments.map((segment) => {
    const length = (segment.value / totalAccounts) * donutCircumference;
    const dashArray = `${length} ${donutCircumference - length}`;
    const dashOffset = -donutOffset;
    donutOffset += length;
    return { ...segment, dashArray, dashOffset };
  });

  const planBars = useMemo(() => {
    if (!planSummaries.length) return [];
    const palette = ['#6366F1', '#14B8A6', '#F97316', '#22C55E', '#A855F7'];
    const sorted = [...planSummaries].sort((a, b) => b.revenue - a.revenue).slice(0, 4);
    const maxRevenue = Math.max(...sorted.map((plan) => plan.revenue), 1);
    return sorted.map((plan, index) => ({
      id: plan.planId || plan.id || `${index}`,
      label: getPlanLabel(plan),
      revenue: plan.revenue,
      percent: maxRevenue ? (plan.revenue / maxRevenue) * 100 : 0,
      color: palette[index % palette.length],
      count: plan.assignedCount,
    }));
  }, [planSummaries]);

  const sparkSeed = stats.total * 0.13 + paidSubscribers * 0.27 + totalRevenue * 0.0005;
  const totalTrend = useMemo(() => buildTrend(sparkSeed, Math.max(totalSubscribers, 1)), [sparkSeed, totalSubscribers]);
  const paidTrend = useMemo(
    () => buildTrend(sparkSeed + 1.7, Math.max(paidSubscribers, 1)),
    [sparkSeed, paidSubscribers]
  );
  const sparkWidth = 360;
  const sparkHeight = 160;
  const sparkPad = 16;
  const totalCoords = buildSparkCoords(totalTrend, sparkWidth, sparkHeight, sparkPad);
  const paidCoords = buildSparkCoords(paidTrend, sparkWidth, sparkHeight, sparkPad);
  const totalArea = coordsToArea(totalCoords, sparkHeight, sparkPad);

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Overview</h2>
          <p className="panel-subtitle">Quick counts across Traddex users and businesses.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={loadStats} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <Banner message={message} />
      <div className="stat-grid">
        <div className="stat-card admin-stat" style={statTone('#4F46E5')}>
          <div className="stat-card-content">
            <span className="stat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm8.5-2.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM2.5 20a5.5 5.5 0 0 1 11 0v1h-11v-1Zm12 1v-1a7 7 0 0 0-1.2-3.9 5 5 0 0 1 8.2 3.9v1h-7Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div>
              <p className="stat-label">Total accounts</p>
              <p className="stat-value">{stats.total}</p>
              <p className="stat-sub">All registered profiles</p>
            </div>
          </div>
        </div>
        <div className="stat-card admin-stat" style={statTone('#16A34A')}>
          <div className="stat-card-content">
            <span className="stat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2h3v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7h5Zm2 0h6V5H9v2Zm-2 4h10v2H7v-2Zm0 4h6v2H7v-2Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div>
              <p className="stat-label">Business profiles</p>
              <p className="stat-value">{stats.business}</p>
              <p className="stat-sub">Business userType</p>
            </div>
          </div>
        </div>
        <div className="stat-card admin-stat" style={statTone('#A855F7')}>
          <div className="stat-card-content">
            <span className="stat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-6 8a6 6 0 0 1 12 0v1H6v-1Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div>
              <p className="stat-label">Individual users</p>
              <p className="stat-value">{stats.users}</p>
              <p className="stat-sub">User userType</p>
            </div>
          </div>
        </div>
        <div className="stat-card admin-stat" style={statTone('#0EA5E9')}>
          <div className="stat-card-content">
            <span className="stat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M4 6h16a2 2 0 0 1 2 2v2H2V8a2 2 0 0 1 2-2Zm-2 6h20v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Zm3 3h6v2H5v-2Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div>
              <p className="stat-label">Active subscriptions</p>
              <p className="stat-value">{totalSubscribers}</p>
              <p className="stat-sub">Assignments</p>
            </div>
          </div>
        </div>
        <div className="stat-card admin-stat" style={statTone('#F59E0B')}>
          <div className="stat-card-content">
            <span className="stat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M4 16l5-5 4 4 7-7v4h2V4h-8v2h4l-5 5-4-4-7 7z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div>
              <p className="stat-label">Subscription revenue</p>
              <p className="stat-value">{formatCurrency(totalRevenue)}</p>
              <p className="stat-sub">Estimated monthly</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-analytics">
        <div className="panel card chart-card">
          <div className="chart-head">
            <div>
              <h3>Account mix</h3>
              <p>Users vs business distribution</p>
            </div>
            <span className="chart-pill">Live</span>
          </div>
          <div className="chart-body">
            <div className="donut-shell">
              <svg className="donut" viewBox="0 0 120 120" aria-hidden="true">
                <circle className="donut-ring" cx="60" cy="60" r={donutRadius} />
                {donutSegments.map((segment) => (
                  <circle
                    key={segment.label}
                    className="donut-segment"
                    cx="60"
                    cy="60"
                    r={donutRadius}
                    stroke={segment.color}
                    strokeDasharray={segment.dashArray}
                    strokeDashoffset={segment.dashOffset}
                  />
                ))}
              </svg>
              <div className="donut-center">
                <span>Total</span>
                <strong>{stats.total}</strong>
              </div>
            </div>
            <div className="chart-legend">
              {pieSegments.map((segment) => (
                <div key={segment.label} className="legend-item">
                  <span className="legend-dot" style={{ background: segment.color }} />
                  <span className="legend-label">{segment.label}</span>
                  <span className="legend-value">{segment.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel card chart-card">
          <div className="chart-head">
            <div>
              <h3>Subscription revenue</h3>
              <p>Top plans by revenue</p>
            </div>
            <span className="chart-pill">{formatCurrency(totalRevenue)}</span>
          </div>
          {planBars.length === 0 ? (
            <p className="empty-state">No subscription data yet.</p>
          ) : (
            <div className="bar-chart">
              {planBars.map((bar) => (
                <div key={bar.id} className="bar-row">
                  <div className="bar-label">{bar.label}</div>
                  <div className="bar-track">
                    <span className="bar-fill" style={{ width: `${bar.percent}%`, background: bar.color }} />
                  </div>
                  <div className="bar-value">
                    {formatCurrency(bar.revenue)}
                    <span>{bar.count} users</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel card chart-card wide">
          <div className="chart-head">
            <div>
              <h3>Subscription momentum</h3>
              <p>Paid vs total subscribers</p>
            </div>
            <div className="chart-badges">
              <span className="chart-badge paid">Paid {paidSubscribers}</span>
              <span className="chart-badge total">Total {totalSubscribers}</span>
            </div>
          </div>
          <div className="sparkline-wrap">
            <svg className="sparkline" viewBox={`0 0 ${sparkWidth} ${sparkHeight}`} aria-hidden="true">
              <defs>
                <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(56, 189, 248, 0.4)" />
                  <stop offset="100%" stopColor="rgba(56, 189, 248, 0.02)" />
                </linearGradient>
              </defs>
              <path className="sparkline-area" d={totalArea} fill="url(#sparkFill)" />
              <polyline
                className="sparkline-line primary"
                points={coordsToPoints(totalCoords)}
                pathLength="100"
              />
              <polyline
                className="sparkline-line secondary"
                points={coordsToPoints(paidCoords)}
                pathLength="100"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
