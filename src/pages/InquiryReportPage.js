import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { getInquiryReport } from '../services/adminApi';

const emptyReport = {
  total_requests: 0,
  total_assigned: 0,
  total_refunded: 0,
  premium_assigned: 0,
  normal_assigned: 0,
  cooldown_assigned: 0,
};

function InquiryReportPage({ token }) {
  const [filters, setFilters] = useState({ date_from: '', date_to: '', user_id: '' });
  const [report, setReport] = useState(emptyReport);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  const loadReport = async (override = filters) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await getInquiryReport(token, override);
      setReport({ ...emptyReport, ...(response?.data || {}) });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load inquiry report.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const distributionTotal = useMemo(
    () => report.premium_assigned + report.normal_assigned + report.cooldown_assigned,
    [report]
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    loadReport(filters);
  };

  const resetFilters = () => {
    const next = { date_from: '', date_to: '', user_id: '' };
    setFilters(next);
    loadReport(next);
  };

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Inquiry Report</h2>
          <p className="panel-subtitle">Track inquiry distribution and refunds over time.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={() => loadReport()} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <Banner message={message} />
      <div className="panel-grid">
        <div className="panel card">
          <div className="panel-split">
            <h3 className="panel-subheading">Filter</h3>
            <button type="button" className="ghost-btn small" onClick={resetFilters} disabled={isLoading}>
              Reset
            </button>
          </div>
          <form className="field-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Date from</span>
              <input
                type="date"
                value={filters.date_from}
                onChange={(event) => setFilters((prev) => ({ ...prev, date_from: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Date to</span>
              <input
                type="date"
                value={filters.date_to}
                onChange={(event) => setFilters((prev) => ({ ...prev, date_to: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>User ID (optional)</span>
              <input
                type="number"
                value={filters.user_id}
                onChange={(event) => setFilters((prev) => ({ ...prev, user_id: event.target.value }))}
                placeholder="e.g. 123"
              />
            </label>
            <div className="field">
              <button type="submit" className="primary-btn full" disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Apply'}
              </button>
            </div>
          </form>
        </div>
        <div className="panel card">
          <h3 className="panel-subheading">Summary</h3>
          <div className="stat-grid">
            <div className="stat-card admin-stat" style={{ '--stat-accent': '#F97316' }}>
              <p className="stat-label">Total requests</p>
              <p className="stat-value">{report.total_requests}</p>
              <p className="stat-sub">Inquiry requests created</p>
            </div>
            <div className="stat-card admin-stat" style={{ '--stat-accent': '#3B82F6' }}>
              <p className="stat-label">Assigned</p>
              <p className="stat-value">{report.total_assigned}</p>
              <p className="stat-sub">Total businesses reached</p>
            </div>
            <div className="stat-card admin-stat" style={{ '--stat-accent': '#EF4444' }}>
              <p className="stat-label">Refunded</p>
              <p className="stat-value">{report.total_refunded}</p>
              <p className="stat-sub">Unmatched inquiries</p>
            </div>
          </div>
          <h4 className="panel-subheading">Distribution</h4>
          <div className="stat-grid">
            <div className="stat-card admin-stat" style={{ '--stat-accent': '#F59E0B' }}>
              <p className="stat-label">Premium (P1)</p>
              <p className="stat-value">{report.premium_assigned}</p>
              <p className="stat-sub">
                {distributionTotal ? Math.round((report.premium_assigned / distributionTotal) * 100) : 0}% share
              </p>
            </div>
            <div className="stat-card admin-stat" style={{ '--stat-accent': '#0EA5E9' }}>
              <p className="stat-label">Normal (P2)</p>
              <p className="stat-value">{report.normal_assigned}</p>
              <p className="stat-sub">
                {distributionTotal ? Math.round((report.normal_assigned / distributionTotal) * 100) : 0}% share
              </p>
            </div>
            <div className="stat-card admin-stat" style={{ '--stat-accent': '#8B5CF6' }}>
              <p className="stat-label">Cooldown (P3)</p>
              <p className="stat-value">{report.cooldown_assigned}</p>
              <p className="stat-sub">
                {distributionTotal ? Math.round((report.cooldown_assigned / distributionTotal) * 100) : 0}% share
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InquiryReportPage;
