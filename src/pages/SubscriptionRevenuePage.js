import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Banner } from '../components';
import { getSubscriptionRevenue } from '../services/adminApi';

/* ── Constants ──────────────────────────────────────────────────── */
const TYPE_LABELS = { SUBSCRIPTION: 'Plan', ADDON: 'Add-on', UPGRADE: 'Upgrade' };
const TYPE_COLORS = { SUBSCRIPTION: '#6366f1', ADDON: '#f59e0b', UPGRADE: '#10b981' };
const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const formatAmount = (val) =>
  `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const formatDate = (val) =>
  val ? new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

/* ── Custom Tooltip ─────────────────────────────────────────────── */
const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: '#1e1e2e', color: '#fff', padding: '10px 14px',
      borderRadius: 10, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,.25)',
      border: '1px solid rgba(255,255,255,.08)',
    }}>
      <p style={{ margin: 0, fontWeight: 700, color: d.payload?.fill || '#fff' }}>{d.name}</p>
      <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{formatAmount(d.value)}</p>
    </div>
  );
};

const CustomAreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e1e2e', color: '#fff', padding: '10px 14px',
      borderRadius: 10, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,.25)',
      border: '1px solid rgba(255,255,255,.08)',
    }}>
      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#6366f1' }}>{formatAmount(payload[0]?.value)}</p>
    </div>
  );
};

/* ── Animated Stat Card ─────────────────────────────────────────── */
function StatCard({ label, value, sub, gradient, icon }) {
  return (
    <div className="rev-stat-card">
      <div className="rev-stat-gradient" style={{ background: gradient }} />
      <div className="rev-stat-body">
        <div className="rev-stat-icon">{icon}</div>
        <p className="rev-stat-label">{label}</p>
        <p className="rev-stat-value">{value}</p>
        {sub && <p className="rev-stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Custom Pie Legend ──────────────────────────────────────────── */
function PieLegend({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rev-pie-legend">
      {data.map((d, i) => (
        <div key={d.name} className="rev-pie-legend-item">
          <span className="rev-pie-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
          <span className="rev-pie-legend-label">{d.name}</span>
          <span className="rev-pie-legend-pct">{total ? `${((d.value / total) * 100).toFixed(1)}%` : '0%'}</span>
          <span className="rev-pie-legend-val">{formatAmount(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
function SubscriptionRevenuePage({ token }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
    if (q) list = list.filter((p) =>
      (p.user || '').toLowerCase().includes(q) ||
      (p.razorpay_id || '').toLowerCase().includes(q)
    );
    return list;
  }, [payments, typeFilter, searchQuery]);

  const filteredTotal = useMemo(() =>
    filteredPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0),
  [filteredPayments]);

  /* Pagination logic */
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / rowsPerPage));
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredPayments.slice(start, start + rowsPerPage);
  }, [filteredPayments, currentPage, rowsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [typeFilter, searchQuery, rowsPerPage]);

  const revenueByType = data?.revenue_by_type || {};

  /* Chart data */
  const pieData = useMemo(() =>
    Object.entries(revenueByType).map(([type, amount]) => ({
      name: TYPE_LABELS[type] || type,
      value: parseFloat(amount || 0),
    })),
  [revenueByType]);

  /* Monthly revenue for area chart */
  const monthlyData = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      if (!p.date) return;
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { key, month: label, revenue: 0 };
      map[key].revenue += parseFloat(p.amount || 0);
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [payments]);

  const getPageNumbers = () => {
    const pages = [];
    const max = 5;
    let start = Math.max(1, currentPage - Math.floor(max / 2));
    let end = Math.min(totalPages, start + max - 1);
    start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="sub-rev-page">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Revenue / Subscription</h2>
          <p className="panel-subtitle">Breakdown of subscription payments and analytics.</p>
        </div>
      </div>

      <Banner message={message} />

      {isLoading ? (
        <div className="rev-loading">
          <div className="rev-loading-spinner" />
          <p>Loading revenue data…</p>
        </div>
      ) : !data ? null : (
        <>
          {/* ── Summary Cards ──────────────────────────────────────── */}
          <div className="rev-stat-grid">
            <StatCard
              label="Total Revenue (All Time)"
              value={formatAmount(data.total_revenue)}
              sub={`${data.total_paid_count} paid transaction${data.total_paid_count !== 1 ? 's' : ''}`}
              gradient="linear-gradient(135deg, #6366f1, #818cf8)"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
            />
            <StatCard
              label="This Month's Revenue"
              value={formatAmount(data.this_month_revenue)}
              sub={new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
              gradient="linear-gradient(135deg, #10b981, #34d399)"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>}
            />
            <StatCard
              label="Avg. Transaction"
              value={formatAmount(data.total_paid_count ? (parseFloat(data.total_revenue) / data.total_paid_count) : 0)}
              sub="Per transaction"
              gradient="linear-gradient(135deg, #f59e0b, #fbbf24)"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>}
            />
          </div>

          {/* ── Analytics Charts Row ───────────────────────────────── */}
          <div className="rev-charts-grid">
            {/* Revenue by Type - Pie Chart */}
            {pieData.length > 0 && (
              <div className="rev-chart-card">
                <div className="rev-chart-header">
                  <div>
                    <h3>Revenue by Type</h3>
                    <p>Distribution across payment types</p>
                  </div>
                  <span className="rev-chart-badge live">
                    <span className="rev-live-dot" /> Live
                  </span>
                </div>
                <div className="rev-chart-body">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1200}
                        animationEasing="ease-out"
                        stroke="none"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <PieLegend data={pieData} />
                </div>
              </div>
            )}

            {/* Monthly Revenue - Area Chart */}
            {monthlyData.length > 0 && (
              <div className="rev-chart-card">
                <div className="rev-chart-header">
                  <div>
                    <h3>Monthly Revenue Trend</h3>
                    <p>Revenue across months</p>
                  </div>
                  <span className="rev-chart-badge total">{formatAmount(data.total_revenue)}</span>
                </div>
                <div className="rev-chart-body" style={{ paddingTop: 8 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="subRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomAreaTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#subRevGrad)"
                        animationDuration={1500}
                        animationEasing="ease-out"
                        dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* ── Revenue by Type Breakdown (Cards) ──────────────────── */}
          {Object.keys(revenueByType).length > 0 && (
            <div className="rev-type-breakdown">
              {Object.entries(revenueByType).map(([type, amount]) => {
                const count = payments.filter((p) => p.type === type).length;
                const pct = parseFloat(data.total_revenue) > 0
                  ? ((parseFloat(amount) / parseFloat(data.total_revenue)) * 100).toFixed(1)
                  : '0';
                return (
                  <div key={type} className="rev-type-card">
                    <div className="rev-type-dot" style={{ background: TYPE_COLORS[type] || '#94a3b8' }} />
                    <div className="rev-type-info">
                      <p className="rev-type-name">{TYPE_LABELS[type] || type}</p>
                      <p className="rev-type-amount">{formatAmount(amount)}</p>
                    </div>
                    <div className="rev-type-meta">
                      <span className="rev-type-pct">{pct}%</span>
                      <span className="rev-type-count">{count} txn{count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="rev-type-bar-track">
                      <div className="rev-type-bar-fill" style={{ width: `${pct}%`, background: TYPE_COLORS[type] || '#94a3b8' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Payments Table ─────────────────────────────────────── */}
          <div className="rev-table-card">
            <div className="rev-table-toolbar">
              <div className="rev-table-filters">
                {['ALL', 'SUBSCRIPTION', 'ADDON', 'UPGRADE'].map((tab) => {
                  const count = tab === 'ALL' ? payments.length : payments.filter((p) => p.type === tab).length;
                  if (tab !== 'ALL' && count === 0) return null;
                  return (
                    <button
                      key={tab}
                      onClick={() => { setTypeFilter(tab); setSearchQuery(''); }}
                      className={`rev-filter-btn ${typeFilter === tab ? 'active' : ''}`}
                    >
                      {tab === 'ALL' ? 'All' : TYPE_LABELS[tab]}
                      <span className="rev-filter-count">{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="rev-table-search-wrap">
                <svg className="rev-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input
                  type="search"
                  className="rev-table-search"
                  placeholder="Search by user, payment ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="rev-table-shell">
              {filteredPayments.length === 0 ? (
                <div className="rev-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <p>No payments found.</p>
                </div>
              ) : (
                <>
                  <table className="rev-table">
                    <thead>
                      <tr>
                        <th style={{width: 50}}>#</th>
                        <th>User</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Razorpay ID</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPayments.map((p, i) => (
                        <tr key={p.id} className={i % 2 === 0 ? 'rev-row-even' : ''}>
                          <td className="rev-td-num">{(currentPage - 1) * rowsPerPage + i + 1}</td>
                          <td>
                            <div className="rev-user-cell">
                              <div className="rev-user-avatar" style={{ background: TYPE_COLORS[p.type] || '#6366f1' }}>
                                {(p.user || '?')[0].toUpperCase()}
                              </div>
                              <strong>{p.user || '-'}</strong>
                            </div>
                          </td>
                          <td>
                            <span
                              className="rev-type-pill"
                              style={{ background: TYPE_COLORS[p.type] ? `${TYPE_COLORS[p.type]}18` : undefined, color: TYPE_COLORS[p.type], borderColor: TYPE_COLORS[p.type] ? `${TYPE_COLORS[p.type]}40` : undefined }}
                            >
                              {TYPE_LABELS[p.type] || p.type}
                            </span>
                          </td>
                          <td><strong className="rev-amount">{formatAmount(p.amount)}</strong></td>
                          <td><span className="rev-razorpay-id">{p.razorpay_id || '—'}</span></td>
                          <td className="rev-td-date">{formatDate(p.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600, paddingRight: 12 }}>
                          Total ({filteredPayments.length})
                        </td>
                        <td><strong className="rev-amount">{formatAmount(filteredTotal)}</strong></td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>

                  {/* Pagination */}
                  <div className="rev-pagination">
                    <div className="rev-pagination-info">
                      Showing {Math.min((currentPage - 1) * rowsPerPage + 1, filteredPayments.length)}–{Math.min(currentPage * rowsPerPage, filteredPayments.length)} of {filteredPayments.length} records
                    </div>
                    <div className="rev-pagination-controls">
                      <select
                        className="rev-rows-select"
                        value={rowsPerPage}
                        onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      >
                        {ROWS_PER_PAGE_OPTIONS.map((n) => (
                          <option key={n} value={n}>{n} / page</option>
                        ))}
                      </select>
                      <button className="rev-page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(1)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
                      </button>
                      <button className="rev-page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      {getPageNumbers().map((pg) => (
                        <button
                          key={pg}
                          className={`rev-page-btn ${pg === currentPage ? 'active' : ''}`}
                          onClick={() => setCurrentPage(pg)}
                        >
                          {pg}
                        </button>
                      ))}
                      <button className="rev-page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                      <button className="rev-page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SubscriptionRevenuePage;
