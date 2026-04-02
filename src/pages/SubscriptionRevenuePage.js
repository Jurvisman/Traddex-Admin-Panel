import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { getSubscriptionRevenue } from '../services/adminApi';

const TYPE_LABELS = {
  SUBSCRIPTION: 'Plan',
  ADDON: 'Add-on',
  UPGRADE: 'Upgrade',
};

const TYPE_COLORS = {
  SUBSCRIPTION: '#6366f1',
  ADDON: '#f59e0b',
  UPGRADE: '#10b981',
};

const formatAmount = (val) =>
  `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const formatDate = (val) =>
  val ? new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="panel card" style={{ flex: 1, minWidth: 160, padding: '18px 22px', borderTop: color ? `3px solid ${color}` : undefined }}>
      <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{value}</p>
      {sub && <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function SubscriptionRevenuePage({ token }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getSubscriptionRevenue(token);
      setData(res?.data || null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load revenue.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const payments = useMemo(() => data?.payments || [], [data]);

  const filteredPayments = useMemo(() => {
    let list = payments;
    if (typeFilter !== 'ALL') list = list.filter((p) => p.type === typeFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.user || '').toLowerCase().includes(q) || (p.razorpay_id || '').toLowerCase().includes(q));
    return list;
  }, [payments, typeFilter, searchQuery]);

  const filteredTotal = useMemo(() =>
    filteredPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0),
  [filteredPayments]);

  const revenueByType = data?.revenue_by_type || {};

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Subscription Revenue</h2>
          <p className="panel-subtitle">Revenue from subscription plans, add-ons, and upgrades.</p>
        </div>
      </div>

      <Banner message={message} />

      {isLoading ? (
        <div className="panel card"><div className="empty-state"><p>Loading revenue data…</p></div></div>
      ) : !data ? null : (
        <>
          {/* ── Summary Cards ──────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
            <StatCard
              label="Total Revenue (All Time)"
              value={formatAmount(data.total_revenue)}
              sub={`${data.total_paid_count} paid transaction${data.total_paid_count !== 1 ? 's' : ''}`}
              color="#6366f1"
            />
            <StatCard
              label="This Month's Revenue"
              value={formatAmount(data.this_month_revenue)}
              sub={new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
              color="#10b981"
            />
          </div>

          {/* ── Revenue by Type ────────────────────────────────────── */}
          {Object.keys(revenueByType).length > 0 && (
            <div className="panel card" style={{ marginBottom: 20, padding: '16px 20px' }}>
              <p style={{ fontWeight: 600, marginBottom: 12 }}>Revenue by Type</p>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                {Object.entries(revenueByType).map(([type, amount]) => (
                  <div key={type} style={{ minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: TYPE_COLORS[type] || '#94a3b8', display: 'inline-block' }} />
                      <p className="muted" style={{ fontSize: 12, margin: 0 }}>{TYPE_LABELS[type] || type}</p>
                    </div>
                    <p style={{ fontWeight: 700, fontSize: 20, margin: 0 }}>{formatAmount(amount)}</p>
                    <p className="muted" style={{ fontSize: 12 }}>
                      {payments.filter((p) => p.type === type).length} transaction{payments.filter((p) => p.type === type).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Payments Table ─────────────────────────────────────── */}
          <div className="panel card users-table-card">
            <div className="panel-split" style={{ marginBottom: 12 }}>
              {/* Type filter */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['ALL', 'SUBSCRIPTION', 'ADDON', 'UPGRADE'].map((tab) => {
                  const count = tab === 'ALL' ? payments.length : payments.filter((p) => p.type === tab).length;
                  if (tab !== 'ALL' && count === 0) return null;
                  return (
                    <button
                      key={tab}
                      onClick={() => { setTypeFilter(tab); setSearchQuery(''); }}
                      className={typeFilter === tab ? 'primary-btn' : 'secondary-btn'}
                      style={{ padding: '4px 12px', fontSize: 13 }}
                    >
                      {tab === 'ALL' ? 'All' : TYPE_LABELS[tab]} ({count})
                    </button>
                  );
                })}
              </div>
              {/* Search */}
              <div className="gsc-datatable-toolbar-right">
                <div className="gsc-toolbar-search">
                  <input
                    type="search"
                    placeholder="Search by user, payment ID…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="table-shell">
              {filteredPayments.length === 0 ? (
                <div className="empty-state"><p>No payments found.</p></div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Razorpay ID</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p, i) => (
                      <tr key={p.id}>
                        <td>{i + 1}</td>
                        <td><strong>{p.user || '-'}</strong></td>
                        <td>
                          <span
                            className="status-pill"
                            style={{ background: TYPE_COLORS[p.type] ? `${TYPE_COLORS[p.type]}22` : undefined, color: TYPE_COLORS[p.type] }}
                          >
                            {TYPE_LABELS[p.type] || p.type}
                          </span>
                        </td>
                        <td><strong style={{ color: '#16a34a' }}>{formatAmount(p.amount)}</strong></td>
                        <td><span className="muted" style={{ fontSize: 12 }}>{p.razorpay_id || '—'}</span></td>
                        <td>{formatDate(p.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600, paddingRight: 12 }}>
                        Total ({filteredPayments.length})
                      </td>
                      <td><strong style={{ color: '#16a34a' }}>{formatAmount(filteredTotal)}</strong></td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SubscriptionRevenuePage;
