import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { listOrderReturns, overrideOrderReturn } from '../services/adminApi';

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
  if (['APPROVED', 'COMPLETED'].includes(normalized)) return 'approved';
  if (normalized === 'REJECTED') return 'rejected';
  if (normalized === 'CANCELLED') return 'closed';
  return 'pending-review';
};

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Requested', value: 'REQUESTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const OVERRIDE_OPTIONS = [
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

function OrderReturnsPage({ token }) {
  const [filters, setFilters] = useState({ status: '' });
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeReturn, setActiveReturn] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ status: 'APPROVED', resolution_note: '' });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async (override = filters) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listOrderReturns(token, override.status);
      setItems(response?.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load returns.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const counts = { total: items.length, requested: 0, approved: 0, rejected: 0 };
    items.forEach((item) => {
      const status = String(item?.status || '').toUpperCase();
      if (status === 'REQUESTED') counts.requested += 1;
      else if (status === 'APPROVED') counts.approved += 1;
      else if (status === 'REJECTED') counts.rejected += 1;
    });
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = normalize(query);
    if (!term) return items;
    return items.filter((item) => {
      const haystack = [
        item?.return_id,
        item?.order_id,
        item?.buyer_name,
        item?.seller_name,
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

  const openOverride = (item) => {
    setActiveReturn(item);
    setOverrideForm({ status: 'APPROVED', resolution_note: '' });
    setShowModal(true);
  };

  const submitOverride = async (event) => {
    event.preventDefault();
    if (!activeReturn?.return_id) return;
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await overrideOrderReturn(token, activeReturn.return_id, overrideForm);
      setShowModal(false);
      setActiveReturn(null);
      setOverrideForm({ status: 'APPROVED', resolution_note: '' });
      await loadData(filters);
      setMessage({ type: 'success', text: 'Return updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update return.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Order Returns</h2>
          <p className="panel-subtitle">Override returns and record the final decision.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={() => loadData(filters)} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <Banner message={message} />

      <div className="stat-grid">
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#0EA5E9' }}>
          <p className="stat-label">Total returns</p>
          <p className="stat-value">{stats.total}</p>
          <p className="stat-sub">All requests</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F59E0B' }}>
          <p className="stat-label">Requested</p>
          <p className="stat-value">{stats.requested}</p>
          <p className="stat-sub">Needs action</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#22C55E' }}>
          <p className="stat-label">Approved</p>
          <p className="stat-value">{stats.approved}</p>
          <p className="stat-sub">Accepted</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#EF4444' }}>
          <p className="stat-label">Rejected</p>
          <p className="stat-value">{stats.rejected}</p>
          <p className="stat-sub">Declined</p>
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
              placeholder="Search by return, order, buyer, seller..."
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
          <h3 className="panel-subheading">Return list</h3>
          <span className="panel-hint">{filteredItems.length} records</span>
        </div>
        <div className="table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Order</th>
                <th>Status</th>
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
                return (
                  <tr key={item.return_id}>
                    <td>{item.return_id}</td>
                    <td>{item.order_id}</td>
                    <td>
                      <span className={`status-pill ${statusClass}`}>{statusLabel || 'Requested'}</span>
                    </td>
                    <td>{item.buyer_name || '-'}</td>
                    <td>{item.seller_name || '-'}</td>
                    <td>{item.reason || '-'}</td>
                    <td>{formatDate(item.created_on)}</td>
                    <td>{formatDate(item.resolved_on)}</td>
                    <td className="table-actions">
                      <div className="table-action-group">
                        <button type="button" className="ghost-btn small" onClick={() => openOverride(item)}>
                          Override
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredItems.length ? (
                <tr>
                  <td colSpan="9" className="empty-state">
                    No returns found.
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
            onSubmit={submitOverride}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">Override return</h3>
              <button type="button" className="ghost-btn small" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Return ID</span>
                <input type="text" value={activeReturn?.return_id || ''} disabled />
              </label>
              <label className="field">
                <span>Order ID</span>
                <input type="text" value={activeReturn?.order_id || ''} disabled />
              </label>
              <label className="field field-span">
                <span>Status</span>
                <select
                  value={overrideForm.status}
                  onChange={(event) => setOverrideForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  {OVERRIDE_OPTIONS.map((option) => (
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
                  value={overrideForm.resolution_note}
                  onChange={(event) => setOverrideForm((prev) => ({ ...prev, resolution_note: event.target.value }))}
                  placeholder="Explain why this return was overridden."
                />
              </label>
              <div className="field field-span modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save override'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default OrderReturnsPage;
