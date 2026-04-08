import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { Banner } from '../components';
import { listAllAds } from '../services/adminApi';

/* ── Constants ──────────────────────────────────────────────────── */
const SLOT_LABELS = { FULL_BANNER: 'Full Banner', MID_CARD: 'Mid Card', BOTTOM_STRIP: 'Bottom Strip' };
const STATUS_LABELS = {
  PAYMENT_PENDING: 'Payment Pending', PENDING: 'Pending', QUEUED: 'Queued',
  ACTIVE: 'Active', EXPIRED: 'Expired', REJECTED: 'Rejected',
};
const STATUS_COLORS = {
  ACTIVE: '#10b981', PENDING: '#f59e0b', QUEUED: '#3b82f6',
  EXPIRED: '#94a3b8', REJECTED: '#ef4444', PAYMENT_PENDING: '#f97316',
};
const SLOT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const formatTarget = (ad) => {
  if (ad.targetType === 'GLOBAL') return 'Global';
  if (ad.targetType === 'RADIUS') return `${ad.targetRadiusKm ?? '?'} km radius`;
  return ad.targetValue || '-';
};
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const formatAmount = (amount) =>
  amount ? `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00';

/* ── Custom Tooltip ─────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: '#1e1e2e', color: '#fff', padding: '10px 14px',
      borderRadius: 10, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,.25)',
      border: '1px solid rgba(255,255,255,.08)',
    }}>
      <p style={{ margin: 0, fontWeight: 700, color: d.payload?.fill || d.color || '#fff' }}>{d.name || d.payload?.name || ''}</p>
      <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{formatAmount(d.value)}</p>
    </div>
  );
};

const BarTooltip = ({ active, payload, label }) => {
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

/* ── Pie Legend ──────────────────────────────────────────────────── */
function PieLegend({ data, colors }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rev-pie-legend">
      {data.map((d, i) => (
        <div key={d.name} className="rev-pie-legend-item">
          <span className="rev-pie-legend-dot" style={{ background: colors[i % colors.length] }} />
          <span className="rev-pie-legend-label">{d.name}</span>
          <span className="rev-pie-legend-pct">{total ? `${((d.value / total) * 100).toFixed(1)}%` : '0%'}</span>
          <span className="rev-pie-legend-val">{formatAmount(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
function AdvertisementRevenuePage({ token }) {
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadAds = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listAllAds(token, null);
      setAds(res?.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load data.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadAds(); }, [loadAds]);

  const paidAds = useMemo(() => ads.filter((ad) => ad.paymentStatus === 'COMPLETED'), [ads]);

  const totalRevenue = useMemo(() =>
    paidAds.reduce((sum, ad) => sum + parseFloat(ad.totalAmount || 0), 0), [paidAds]);

  const thisMonthRevenue = useMemo(() => {
    const now = new Date();
    return paidAds
      .filter((ad) => {
        const d = new Date(ad.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, ad) => sum + parseFloat(ad.totalAmount || 0), 0);
  }, [paidAds]);

  const activeCount = useMemo(() => ads.filter((a) => a.status === 'ACTIVE').length, [ads]);
  const pendingCount = useMemo(() => ads.filter((a) => a.status === 'PENDING').length, [ads]);

  const slotBreakdown = useMemo(() => {
    const map = {};
    paidAds.forEach((ad) => {
      const slot = ad.slotType || 'UNKNOWN';
      if (!map[slot]) map[slot] = { count: 0, revenue: 0 };
      map[slot].count += 1;
      map[slot].revenue += parseFloat(ad.totalAmount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [paidAds]);

  /* Pie data for slot breakdown */
  const slotPieData = useMemo(() =>
    slotBreakdown.map(([slot, d]) => ({
      name: SLOT_LABELS[slot] || slot,
      value: d.revenue,
    })),
  [slotBreakdown]);

  /* Monthly ad revenue for area chart */
  const monthlyAdRevenue = useMemo(() => {
    const map = {};
    paidAds.forEach((ad) => {
      if (!ad.createdAt) return;
      const d = new Date(ad.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { key, month: label, revenue: 0, count: 0 };
      map[key].revenue += parseFloat(ad.totalAmount || 0);
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [paidAds]);

  /* Bar data by industry */
  const industryData = useMemo(() => {
    const map = {};
    paidAds.forEach((ad) => {
      const industry = ad.industry || 'Other';
      if (!map[industry]) map[industry] = { name: industry, revenue: 0, count: 0 };
      map[industry].revenue += parseFloat(ad.totalAmount || 0);
      map[industry].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [paidAds]);

  /* Filtered table rows */
  const filteredAds = useMemo(() => {
    let list = paidAds;
    if (statusFilter !== 'ALL') list = list.filter((a) => a.status === statusFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter(
      (a) => (a.businessName || '').toLowerCase().includes(q) || (a.industry || '').toLowerCase().includes(q)
    );
    return list;
  }, [paidAds, statusFilter, searchQuery]);

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(filteredAds.length / rowsPerPage));
  const paginatedAds = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAds.slice(start, start + rowsPerPage);
  }, [filteredAds, currentPage, rowsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchQuery, rowsPerPage]);

  const STATUS_FILTER_TABS = ['ALL', 'ACTIVE', 'PENDING', 'QUEUED', 'EXPIRED', 'REJECTED'];

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
          <h2 className="panel-title">Revenue / Advertisement</h2>
          <p className="panel-subtitle">Revenue generated from pay-per-ad campaigns.</p>
        </div>
      </div>

      <Banner message={message} />

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <div className="rev-stat-grid rev-stat-grid-4">
        <StatCard
          label="Total Revenue (All Time)"
          value={formatAmount(totalRevenue)}
          sub={`${paidAds.length} paid ad${paidAds.length !== 1 ? 's' : ''}`}
          gradient="linear-gradient(135deg, #6366f1, #818cf8)"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
        />
        <StatCard
          label="This Month's Revenue"
          value={formatAmount(thisMonthRevenue)}
          sub={new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          gradient="linear-gradient(135deg, #10b981, #34d399)"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>}
        />
        <StatCard
          label="Currently Active Ads"
          value={activeCount}
          sub="Live on mobile app"
          gradient="linear-gradient(135deg, #3b82f6, #60a5fa)"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
        />
        <StatCard
          label="Awaiting Review"
          value={pendingCount}
          sub="Needs admin approval"
          gradient="linear-gradient(135deg, #f59e0b, #fbbf24)"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
        />
      </div>

      {/* ── Charts Row 1: Slot Pie + Monthly Area ──────────────── */}
      <div className="rev-charts-grid">
        {slotPieData.length > 0 && (
          <div className="rev-chart-card">
            <div className="rev-chart-header">
              <div>
                <h3>Revenue by Slot Type</h3>
                <p>Breakdown of ad slot revenue</p>
              </div>
              <span className="rev-chart-badge live">
                <span className="rev-live-dot" /> Live
              </span>
            </div>
            <div className="rev-chart-body">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={slotPieData}
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
                    {slotPieData.map((_, i) => (
                      <Cell key={i} fill={SLOT_COLORS[i % SLOT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <PieLegend data={slotPieData} colors={SLOT_COLORS} />
            </div>
          </div>
        )}

        {monthlyAdRevenue.length > 0 && (
          <div className="rev-chart-card">
            <div className="rev-chart-header">
              <div>
                <h3>Monthly Ad Revenue</h3>
                <p>Revenue trend over months</p>
              </div>
              <span className="rev-chart-badge total">{formatAmount(totalRevenue)}</span>
            </div>
            <div className="rev-chart-body" style={{ paddingTop: 8 }}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyAdRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={<BarTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#adRevGrad)"
                    animationDuration={1500}
                    animationEasing="ease-out"
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ── Charts Row 2: Industry Bar Chart ───────────────────── */}
      {industryData.length > 0 && (
        <div className="rev-charts-grid rev-charts-single">
          <div className="rev-chart-card">
            <div className="rev-chart-header">
              <div>
                <h3>Revenue by Industry</h3>
                <p>Top industries by ad revenue</p>
              </div>
            </div>
            <div className="rev-chart-body" style={{ paddingTop: 8 }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={industryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Bar
                    dataKey="revenue"
                    radius={[6, 6, 0, 0]}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {industryData.map((_, i) => (
                      <Cell key={i} fill={SLOT_COLORS[i % SLOT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Slot Breakdown Cards ───────────────────────────────── */}
      {slotBreakdown.length > 0 && (
        <div className="rev-type-breakdown">
          {slotBreakdown.map(([slot, sData], i) => {
            const pct = totalRevenue > 0 ? ((sData.revenue / totalRevenue) * 100).toFixed(1) : '0';
            return (
              <div key={slot} className="rev-type-card">
                <div className="rev-type-dot" style={{ background: SLOT_COLORS[i % SLOT_COLORS.length] }} />
                <div className="rev-type-info">
                  <p className="rev-type-name">{SLOT_LABELS[slot] || slot}</p>
                  <p className="rev-type-amount">{formatAmount(sData.revenue)}</p>
                </div>
                <div className="rev-type-meta">
                  <span className="rev-type-pct">{pct}%</span>
                  <span className="rev-type-count">{sData.count} ad{sData.count !== 1 ? 's' : ''}</span>
                </div>
                <div className="rev-type-bar-track">
                  <div className="rev-type-bar-fill" style={{ width: `${pct}%`, background: SLOT_COLORS[i % SLOT_COLORS.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Revenue Table ─────────────────────────────────────────── */}
      <div className="rev-table-card">
        <div className="rev-table-toolbar">
          <div className="rev-table-filters">
            {STATUS_FILTER_TABS.map((tab) => {
              const count = tab === 'ALL'
                ? paidAds.length
                : paidAds.filter((a) => a.status === tab).length;
              if (tab !== 'ALL' && count === 0) return null;
              return (
                <button
                  key={tab}
                  onClick={() => { setStatusFilter(tab); setSearchQuery(''); }}
                  className={`rev-filter-btn ${statusFilter === tab ? 'active' : ''}`}
                >
                  {tab === 'ALL' ? 'All' : STATUS_LABELS[tab]}
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
              placeholder="Search by business, industry…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="rev-table-shell">
          {isLoading ? (
            <div className="rev-loading">
              <div className="rev-loading-spinner" />
              <p>Loading revenue data…</p>
            </div>
          ) : filteredAds.length === 0 ? (
            <div className="rev-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p>No paid advertisements found.</p>
            </div>
          ) : (
            <>
              <table className="rev-table">
                <thead>
                  <tr>
                    <th style={{width: 46}}>#</th>
                    <th style={{width: 70}}>Banner</th>
                    <th>Business</th>
                    <th>Industry</th>
                    <th>Slot</th>
                    <th>Targeting</th>
                    <th>Duration</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAds.map((ad, index) => (
                    <tr key={ad.id} className={index % 2 === 0 ? 'rev-row-even' : ''}>
                      <td className="rev-td-num">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                      <td>
                        {ad.bannerUrl ? (
                          <img
                            src={ad.bannerUrl}
                            alt="banner"
                            className="rev-ad-banner"
                          />
                        ) : <span className="muted">—</span>}
                      </td>
                      <td><strong>{ad.businessName || `ID ${ad.businessId}`}</strong></td>
                      <td style={{ textTransform: 'capitalize' }}>{ad.industry || '-'}</td>
                      <td>
                        <span className="rev-type-pill" style={{
                          background: 'rgba(99,102,241,0.1)',
                          color: '#6366f1',
                          borderColor: 'rgba(99,102,241,0.25)',
                        }}>
                          {SLOT_LABELS[ad.slotType] || ad.slotType || '-'}
                        </span>
                      </td>
                      <td>{formatTarget(ad)}</td>
                      <td>{ad.durationHours ? `${ad.durationHours}h` : '-'}</td>
                      <td><strong className="rev-amount">{formatAmount(ad.totalAmount)}</strong></td>
                      <td>
                        <span
                          className="rev-status-pill"
                          style={{
                            background: STATUS_COLORS[ad.status] ? `${STATUS_COLORS[ad.status]}15` : undefined,
                            color: STATUS_COLORS[ad.status] || '#64748b',
                            borderColor: STATUS_COLORS[ad.status] ? `${STATUS_COLORS[ad.status]}40` : undefined,
                          }}
                        >
                          {STATUS_LABELS[ad.status] || ad.status || '-'}
                        </span>
                      </td>
                      <td className="rev-td-date">{formatDate(ad.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'right', fontWeight: 600, paddingRight: 12 }}>
                      Total ({filteredAds.length} ads)
                    </td>
                    <td>
                      <strong className="rev-amount">
                        {formatAmount(filteredAds.reduce((s, a) => s + parseFloat(a.totalAmount || 0), 0))}
                      </strong>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>

              {/* Pagination */}
              <div className="rev-pagination">
                <div className="rev-pagination-info">
                  Showing {Math.min((currentPage - 1) * rowsPerPage + 1, filteredAds.length)}–{Math.min(currentPage * rowsPerPage, filteredAds.length)} of {filteredAds.length} records
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
    </div>
  );
}

export default AdvertisementRevenuePage;
