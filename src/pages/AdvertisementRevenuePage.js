import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { listAllAds } from '../services/adminApi';

const SLOT_LABELS = {
  FULL_BANNER: 'Full Banner',
  MID_CARD: 'Mid Card',
  BOTTOM_STRIP: 'Bottom Strip',
};

const STATUS_LABELS = {
  PAYMENT_PENDING: 'Payment Pending',
  PENDING: 'Pending',
  QUEUED: 'Queued',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REJECTED: 'Rejected',
};

const formatTarget = (ad) => {
  if (ad.targetType === 'GLOBAL') return 'Global';
  if (ad.targetType === 'RADIUS') return `${ad.targetRadiusKm ?? '?'} km radius`;
  return ad.targetValue || '-';
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatAmount = (amount) => {
  if (!amount) return '₹0.00';
  return `₹${parseFloat(amount).toFixed(2)}`;
};

function StatCard({ label, value, sub }) {
  return (
    <div className="panel card" style={{ flex: 1, minWidth: 160, padding: '18px 22px' }}>
      <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{value}</p>
      {sub && <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function AdvertisementRevenuePage({ token }) {
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  // Only paid ads count for revenue
  const paidAds = useMemo(() =>
    ads.filter((ad) => ad.paymentStatus === 'COMPLETED'),
  [ads]);

  // Summary calculations
  const totalRevenue = useMemo(() =>
    paidAds.reduce((sum, ad) => sum + parseFloat(ad.totalAmount || 0), 0),
  [paidAds]);

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

  // Slot-wise revenue breakdown
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

  // Filtered table rows
  const filteredAds = useMemo(() => {
    let list = paidAds;
    if (statusFilter !== 'ALL') list = list.filter((a) => a.status === statusFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter(
      (a) => (a.businessName || '').toLowerCase().includes(q) || (a.industry || '').toLowerCase().includes(q)
    );
    return list;
  }, [paidAds, statusFilter, searchQuery]);

  const STATUS_FILTER_TABS = ['ALL', 'ACTIVE', 'PENDING', 'QUEUED', 'EXPIRED', 'REJECTED'];

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Advertisement Revenue</h2>
          <p className="panel-subtitle">Revenue generated from pay-per-ad campaigns.</p>
        </div>
      </div>

      <Banner message={message} />

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard
          label="Total Revenue (All Time)"
          value={`₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          sub={`${paidAds.length} paid ad${paidAds.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="This Month's Revenue"
          value={`₹${thisMonthRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          sub={new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
        />
        <StatCard
          label="Currently Active Ads"
          value={activeCount}
          sub="Live on mobile app"
        />
        <StatCard
          label="Awaiting Review"
          value={pendingCount}
          sub="Needs admin approval"
        />
      </div>

      {/* ── Slot Breakdown ────────────────────────────────────────── */}
      {slotBreakdown.length > 0 && (
        <div className="panel card" style={{ marginBottom: 20, padding: '16px 20px' }}>
          <p style={{ fontWeight: 600, marginBottom: 12 }}>Revenue by Slot Type</p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {slotBreakdown.map(([slot, data]) => (
              <div key={slot} style={{ minWidth: 160 }}>
                <p className="muted" style={{ fontSize: 12, marginBottom: 2 }}>
                  {SLOT_LABELS[slot] || slot}
                </p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>
                  ₹{data.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="muted" style={{ fontSize: 12 }}>{data.count} ad{data.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Revenue Table ─────────────────────────────────────────── */}
      <div className="panel card users-table-card">
        <div className="panel-split" style={{ marginBottom: 12 }}>
          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_FILTER_TABS.map((tab) => {
              const count = tab === 'ALL'
                ? paidAds.length
                : paidAds.filter((a) => a.status === tab).length;
              if (tab !== 'ALL' && count === 0) return null;
              return (
                <button
                  key={tab}
                  onClick={() => { setStatusFilter(tab); setSearchQuery(''); }}
                  className={statusFilter === tab ? 'primary-btn' : 'secondary-btn'}
                  style={{ padding: '4px 12px', fontSize: 13 }}
                >
                  {tab === 'ALL' ? 'All' : STATUS_LABELS[tab]} ({count})
                </button>
              );
            })}
          </div>
          {/* Search */}
          <div className="gsc-datatable-toolbar-right">
            <div className="gsc-toolbar-search">
              <input
                type="search"
                placeholder="Search by business, industry…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-shell">
          {isLoading ? (
            <div className="empty-state"><p>Loading revenue data…</p></div>
          ) : filteredAds.length === 0 ? (
            <div className="empty-state"><p>No paid advertisements found.</p></div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Banner</th>
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
                {filteredAds.map((ad, index) => (
                  <tr key={ad.id}>
                    <td>{index + 1}</td>
                    <td>
                      {ad.bannerUrl ? (
                        <img
                          src={ad.bannerUrl}
                          alt="banner"
                          style={{ width: 64, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }}
                        />
                      ) : <span className="muted">—</span>}
                    </td>
                    <td><strong>{ad.businessName || `ID ${ad.businessId}`}</strong></td>
                    <td style={{ textTransform: 'capitalize' }}>{ad.industry || '-'}</td>
                    <td>
                      <span className="status-pill">{SLOT_LABELS[ad.slotType] || ad.slotType || '-'}</span>
                    </td>
                    <td>{formatTarget(ad)}</td>
                    <td>{ad.durationHours ? `${ad.durationHours}h` : '-'}</td>
                    <td><strong style={{ color: '#16a34a' }}>{formatAmount(ad.totalAmount)}</strong></td>
                    <td>
                      <span className={`status-pill ${(ad.status || '').toLowerCase()}`}>
                        {STATUS_LABELS[ad.status] || ad.status || '-'}
                      </span>
                    </td>
                    <td>{formatDate(ad.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
              {/* Total row */}
              <tfoot>
                <tr>
                  <td colSpan={7} style={{ textAlign: 'right', fontWeight: 600, paddingRight: 12 }}>
                    Total ({filteredAds.length} ads)
                  </td>
                  <td>
                    <strong style={{ color: '#16a34a' }}>
                      ₹{filteredAds.reduce((s, a) => s + parseFloat(a.totalAmount || 0), 0)
                          .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdvertisementRevenuePage;
