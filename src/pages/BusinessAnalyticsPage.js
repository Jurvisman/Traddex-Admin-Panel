import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { fetchBusinesses, getInquiryReport, listSubscriptionAssignments } from '../services/adminApi';

const normalize = (value) => String(value || '').toLowerCase();

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(value) || 0
  );

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const resolveKycStatus = (user) => {
  const kycNorm = normalizeStatus(user?.kycStatus);
  const isActive = Number(user?.active) === 1;
  if (!isActive) return 'inactive';
  if (kycNorm === 'REJECTED') return 'rejected';
  if (['VERIFIED', 'APPROVED'].includes(kycNorm)) return 'verified';
  return 'pending';
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="biz-stat-card" style={{ '--biz-accent': accent || 'var(--accent, #8660ff)' }}>
      <p className="biz-stat-label">{label}</p>
      <p className="biz-stat-value">{value}</p>
      {sub && <p className="biz-stat-sub">{sub}</p>}
    </div>
  );
}

function BarRow({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="biz-bar-row">
      <div className="biz-bar-label">{label}</div>
      <div className="biz-bar-track">
        <span className="biz-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="biz-bar-count">{count} <span className="biz-bar-pct">({pct}%)</span></div>
    </div>
  );
}

function BusinessAnalyticsPage({ token }) {
  const [businesses, setBusinesses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [leads, setLeads] = useState(null);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setMessage({ type: 'info', text: '' });
      try {
        const [bizResp, subResp, leadsResp] = await Promise.all([
          fetchBusinesses(token),
          listSubscriptionAssignments(token),
          getInquiryReport(token).catch(() => null),
        ]);

        const raw = Array.isArray(bizResp?.data) ? bizResp.data : [];
        // Only business-type users, sorted DESC
        const list = raw
          .filter((u) => {
            const type = String(u?.userType || u?.type || u?.role || '').toUpperCase();
            return type === 'BUSINESS';
          })
          .sort((a, b) => new Date(b?.createdAt || b?.created_at || 0) - new Date(a?.createdAt || a?.created_at || 0));
        setBusinesses(list);

        setSubscriptions(
          Array.isArray(subResp?.data?.subscriptions) ? subResp.data.subscriptions :
          Array.isArray(subResp?.data) ? subResp.data : []
        );
        setLeads(leadsResp?.data || null);
      } catch (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to load analytics.' });
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Computed metrics ─────────────────────────────────── */
  const total = businesses.length;
  const activeCount = useMemo(() => businesses.filter((u) => Number(u?.active) === 1).length, [businesses]);
  const inactiveCount = total - activeCount;
  const verifiedCount = useMemo(() => businesses.filter((u) => resolveKycStatus(u) === 'verified').length, [businesses]);
  const pendingCount = useMemo(() => businesses.filter((u) => resolveKycStatus(u) === 'pending').length, [businesses]);
  const rejectedCount = useMemo(() => businesses.filter((u) => resolveKycStatus(u) === 'rejected').length, [businesses]);

  // Subscribed business count (unique userIds with an active subscription)
  const subscribedUserIds = useMemo(() => {
    const ids = new Set();
    subscriptions.forEach((s) => {
      const uid = s?.user_id || s?.userId;
      if (uid && s?.status === 'ACTIVE') ids.add(String(uid));
    });
    return ids;
  }, [subscriptions]);

  const subscribedBusinessCount = useMemo(
    () => businesses.filter((u) => subscribedUserIds.has(String(u?.id || u?.user_id))).length,
    [businesses, subscribedUserIds]
  );

  // Industry breakdown
  const industryMap = useMemo(() => {
    const map = {};
    businesses.forEach((u) => {
      const ind = u?.industry || u?.businessProfile?.industry || 'Unknown';
      map[ind] = (map[ind] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [businesses]);

  // Recent 10 businesses (newest first)
  const recentBusinesses = businesses.slice(0, 10);

  // KYC funnel
  const kycFunnel = [
    { label: 'Total Registered', count: total, color: '#6366f1' },
    { label: 'Active Accounts', count: activeCount, color: '#22c55e' },
    { label: 'KYC Verified', count: verifiedCount, color: '#0ea5e9' },
    { label: 'KYC Pending', count: pendingCount, color: '#f59e0b' },
    { label: 'KYC Rejected', count: rejectedCount, color: '#ef4444' },
    { label: 'With Subscription', count: subscribedBusinessCount, color: '#a855f7' },
  ];

  return (
    <div className="biz-analytics-page">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Business Analytics</h2>
          <p className="panel-subtitle">Overview of all business accounts, KYC status, subscriptions, and activity.</p>
        </div>
      </div>

      <Banner message={message} />

      {isLoading ? (
        <p className="empty-state">Loading analytics...</p>
      ) : (
        <>
          {/* KPI strip */}
          <div className="biz-stat-grid">
            <StatCard label="Total Businesses" value={total} sub="All registered" accent="#6366f1" />
            <StatCard label="Active" value={activeCount} sub={`${inactiveCount} inactive`} accent="#22c55e" />
            <StatCard label="KYC Verified" value={verifiedCount} sub={`${Math.round((verifiedCount / (total || 1)) * 100)}% of total`} accent="#0ea5e9" />
            <StatCard label="Pending KYC" value={pendingCount} sub="Awaiting review" accent="#f59e0b" />
            <StatCard label="KYC Rejected" value={rejectedCount} sub="Need re-submission" accent="#ef4444" />
            <StatCard label="Subscribed" value={subscribedBusinessCount} sub="Active subscription" accent="#a855f7" />
          </div>

          <div className="biz-analytics-grid">
            {/* KYC Funnel */}
            <div className="panel card biz-analytics-card">
              <h3 className="panel-subheading">KYC & Status Funnel</h3>
              <p className="panel-subtitle">How businesses flow from registration to verification.</p>
              <div className="biz-bar-list">
                {kycFunnel.map((row) => (
                  <BarRow key={row.label} label={row.label} count={row.count} total={total || 1} color={row.color} />
                ))}
              </div>
            </div>

            {/* Industry Breakdown */}
            <div className="panel card biz-analytics-card">
              <h3 className="panel-subheading">Industry Breakdown</h3>
              <p className="panel-subtitle">Top industries by number of businesses.</p>
              {industryMap.length === 0 ? (
                <p className="empty-state">No industry data available.</p>
              ) : (
                <div className="biz-bar-list">
                  {industryMap.map(([ind, count], i) => {
                    const colors = ['#6366f1','#22c55e','#f59e0b','#0ea5e9','#a855f7','#f97316','#14b8a6','#ec4899'];
                    return (
                      <BarRow key={ind} label={ind} count={count} total={total || 1} color={colors[i % colors.length]} />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Subscription Overview */}
            <div className="panel card biz-analytics-card">
              <h3 className="panel-subheading">Subscription Coverage</h3>
              <p className="panel-subtitle">Businesses with active subscription plans.</p>
              <div className="biz-coverage-ring-wrap">
                <div className="biz-coverage-ring">
                  <svg viewBox="0 0 120 120" aria-hidden="true">
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#e5e7eb" strokeWidth="14" />
                    <circle
                      cx="60" cy="60" r="46" fill="none"
                      stroke="#a855f7" strokeWidth="14"
                      strokeDasharray={`${(subscribedBusinessCount / (total || 1)) * 289} 289`}
                      strokeDashoffset="72"
                    />
                  </svg>
                  <div className="biz-ring-center">
                    <strong>{total > 0 ? Math.round((subscribedBusinessCount / total) * 100) : 0}%</strong>
                    <span>subscribed</span>
                  </div>
                </div>
                <div className="biz-coverage-legend">
                  <div className="biz-legend-row"><span className="biz-legend-dot" style={{ background: '#a855f7' }} />Subscribed: {subscribedBusinessCount}</div>
                  <div className="biz-legend-row"><span className="biz-legend-dot" style={{ background: '#e5e7eb' }} />Without plan: {total - subscribedBusinessCount}</div>
                </div>
              </div>
            </div>

            {/* Leads summary */}
            <div className="panel card biz-analytics-card">
              <h3 className="panel-subheading">Lead / Inquiry Summary</h3>
              <p className="panel-subtitle">Inquiry data across all businesses.</p>
              {!leads ? (
                <p className="empty-state">Lead data not available.</p>
              ) : (
                <div className="biz-leads-grid">
                  {[
                    { label: 'Total Inquiries', value: leads?.totalInquiries ?? leads?.total ?? '—' },
                    { label: 'Responded', value: leads?.responded ?? leads?.respondedCount ?? '—' },
                    { label: 'Pending', value: leads?.pending ?? leads?.pendingCount ?? '—' },
                    { label: 'Avg Response Time', value: leads?.avgResponseTime ?? '—' },
                  ].map((item) => (
                    <div key={item.label} className="biz-leads-card">
                      <p className="biz-stat-label">{item.label}</p>
                      <p className="biz-stat-value">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent businesses table */}
          <div className="panel card">
            <h3 className="panel-subheading">Recently Registered Businesses</h3>
            <p className="panel-subtitle">Latest 10 businesses, sorted by registration date.</p>
            {recentBusinesses.length === 0 ? (
              <p className="empty-state">No businesses found.</p>
            ) : (
              <div className="table-shell">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Sr No</th>
                      <th>Business Name</th>
                      <th>Owner / Account Name</th>
                      <th>Phone</th>
                      <th>Industry</th>
                      <th>KYC Status</th>
                      <th>Account Status</th>
                      <th>Registered On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBusinesses.map((u, i) => {
                      const kycStatus = resolveKycStatus(u);
                      const kycLabel = { verified: 'Verified', pending: 'Pending', rejected: 'Rejected', inactive: 'Inactive' }[kycStatus] || 'Unknown';
                      const kycClass = { verified: 'status-verified', pending: 'status-pending', rejected: 'status-rejected', inactive: 'status-inactive' }[kycStatus];
                      const bp = u?.businessProfile || u;
                      return (
                        <tr key={u?.id || i}>
                          <td>{i + 1}</td>
                          <td>{bp?.businessName || u?.businessName || '—'}</td>
                          <td>{u?.name || u?.full_name || u?.fullName || '—'}</td>
                          <td>{u?.number || u?.mobile || u?.phone || '—'}</td>
                          <td>{bp?.industry || u?.industry || '—'}</td>
                          <td><span className={`status-pill ${kycClass}`}>{kycLabel}</span></td>
                          <td>
                            <span className={`status-pill ${Number(u?.active) === 1 ? 'status-verified' : 'status-inactive'}`}>
                              {Number(u?.active) === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{formatDate(u?.createdAt || u?.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default BusinessAnalyticsPage;
