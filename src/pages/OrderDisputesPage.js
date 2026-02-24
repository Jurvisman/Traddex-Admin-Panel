import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { listOrderDisputes, resolveOrderDispute } from '../services/adminApi';

const normalize = (value) => String(value || '').toLowerCase();

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const formatStatus = (value) =>
  String(value || '')
    .toLowerCase()
    .split('_')
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ''))
    .join(' ');

const resolveStatusClass = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'RESOLVED') return 'approved';
  if (normalized === 'REJECTED') return 'rejected';
  if (normalized === 'CLOSED') return 'closed';
  return 'pending-review';
};

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Under review', value: 'UNDER_REVIEW' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Closed', value: 'CLOSED' },
];

const RESOLVE_OPTIONS = [
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Closed', value: 'CLOSED' },
];

function OrderDisputesPage({ token }) {
  const [filters, setFilters] = useState({ status: '' });
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeDispute, setActiveDispute] = useState(null);
  const [resolveForm, setResolveForm] = useState({ status: 'RESOLVED', resolution_note: '' });
  const [isResolving, setIsResolving] = useState(false);

  const loadData = async (override = filters) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listOrderDisputes(token, override.status);
      setItems(response?.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load disputes.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const counts = { total: items.length, open: 0, review: 0, resolved: 0, rejected: 0 };
    items.forEach((item) => {
      const status = String(item?.status || '').toUpperCase();
      if (status === 'OPEN') counts.open += 1;
      else if (status === 'UNDER_REVIEW') counts.review += 1;
      else if (status === 'RESOLVED') counts.resolved += 1;
      else if (status === 'REJECTED') counts.rejected += 1;
    });
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = normalize(query);
    if (!term) return items;
    return items.filter((item) => {
      const haystack = [
        item?.dispute_id,
        item?.order_id,
        item?.buyer_name,
        item?.seller_name,
        item?.opened_by_name,
        item?.reason,
      ]
        .map(normalize)
        .join(' ');
      return haystack.includes(term);
    });
  }, [items, query]);

  const handleSubmit = (event) => {
    event.preventDefault();
    loadData(filters);
  };

  const resetFilters = () => {
    const next = { status: '' };
    setFilters(next);
    loadData(next);
  };

  const openResolve = (item) => {
    setActiveDispute(item);
    setResolveForm({ status: 'RESOLVED', resolution_note: '' });
    setShowModal(true);
  };

  const submitResolution = async (event) => {
    event.preventDefault();
    if (!activeDispute?.dispute_id) return;
    setIsResolving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await resolveOrderDispute(token, activeDispute.dispute_id, resolveForm);
      setShowModal(false);
      setActiveDispute(null);
      setResolveForm({ status: 'RESOLVED', resolution_note: '' });
      await loadData(filters);
      setMessage({ type: 'success', text: 'Dispute updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update dispute.' });
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Order Disputes</h2>
          <p className="panel-subtitle">Review disputes and close them with clear resolutions.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={() => loadData(filters)} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <Banner message={message} />

      <div className="stat-grid">
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#0EA5E9' }}>
          <p className="stat-label">Total disputes</p>
          <p className="stat-value">{stats.total}</p>
          <p className="stat-sub">All tickets</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F59E0B' }}>
          <p className="stat-label">Open</p>
          <p className="stat-value">{stats.open}</p>
          <p className="stat-sub">Awaiting response</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#6366F1' }}>
          <p className="stat-label">Under review</p>
          <p className="stat-value">{stats.review}</p>
          <p className="stat-sub">Needs follow up</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#22C55E' }}>
          <p className="stat-label">Resolved</p>
          <p className="stat-value">{stats.resolved}</p>
          <p className="stat-sub">Closed with resolution</p>
        </div>
      </div>

      <div className="panel card">
        <div className="panel-split">
          <h3 className="panel-subheading">Filters</h3>
          <button type="button" className="ghost-btn small" onClick={resetFilters} disabled={isLoading}>
            Reset
          </button>
        </div>
        <form className="field-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by dispute, order, buyer, seller..."
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
        <div className="panel-split">
          <h3 className="panel-subheading">Dispute list</h3>
          <span className="panel-hint">{filteredItems.length} records</span>
        </div>
        <div className="table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Order</th>
                <th>Status</th>
                <th>Opened by</th>
                <th>Buyer</th>
                <th>Seller</th>
                <th>Reason</th>
                <th>Created</th>
                <th>Resolved</th>
                <th className="table-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const statusClass = resolveStatusClass(item.status);
                const statusLabel = formatStatus(item.status);
                const actionable = ['OPEN', 'UNDER_REVIEW'].includes(String(item.status || '').toUpperCase());
                return (
                  <tr key={item.dispute_id}>
                    <td>{item.dispute_id}</td>
                    <td>{item.order_id}</td>
                    <td>
                      <span className={`status-pill ${statusClass}`}>{statusLabel || 'Open'}</span>
                    </td>
                    <td>{item.opened_by_name || '-'}</td>
                    <td>{item.buyer_name || '-'}</td>
                    <td>{item.seller_name || '-'}</td>
                    <td>{item.reason || '-'}</td>
                    <td>{formatDate(item.created_on)}</td>
                    <td>{formatDate(item.resolved_on)}</td>
                    <td className="table-actions">
                      <div className="table-action-group">
                        <button type="button" className="ghost-btn small" onClick={() => openResolve(item)}>
                          {actionable ? 'Resolve' : 'View'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredItems.length ? (
                <tr>
                  <td colSpan="10" className="empty-state">
                    No disputes found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {showModal ? (
        <div className="admin-modal-backdrop" onClick={() => setShowModal(false)}>
          <form
            className="admin-modal"
            onSubmit={submitResolution}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">Resolve dispute</h3>
              <button type="button" className="ghost-btn small" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Dispute ID</span>
                <input type="text" value={activeDispute?.dispute_id || ''} disabled />
              </label>
              <label className="field">
                <span>Order ID</span>
                <input type="text" value={activeDispute?.order_id || ''} disabled />
              </label>
              <label className="field field-span">
                <span>Resolution status</span>
                <select
                  value={resolveForm.status}
                  onChange={(event) => setResolveForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  {RESOLVE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-span">
                <span>Resolution note</span>
                <textarea
                  rows="4"
                  value={resolveForm.resolution_note}
                  onChange={(event) => setResolveForm((prev) => ({ ...prev, resolution_note: event.target.value }))}
                  placeholder="Explain how this dispute was resolved."
                />
              </label>
              <div className="field field-span modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isResolving}>
                  {isResolving ? 'Saving...' : 'Save resolution'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default OrderDisputesPage;
