import { useEffect, useMemo, useState, useCallback } from 'react';
import { Banner, DataTable } from '../components';
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
  { label: 'All Statuses', value: '' },
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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const loadData = useCallback(async (override = filters) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listOrderDisputes(token, override.status);
      const raw = Array.isArray(response?.data) ? response.data : [];
      raw.sort((a, b) => new Date(b?.createdAt || b?.created_at || 0) - new Date(a?.createdAt || a?.created_at || 0));
      setItems(raw);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load disputes.' });
    } finally {
      setIsLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    let result = Array.isArray(items) ? items : [];
    if (filters.status) {
      result = result.filter((item) => String(item?.status || '').toUpperCase() === filters.status.toUpperCase());
    }
    const term = normalize(query);
    if (term) {
      result = result.filter((item) => {
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
    }
    return result;
  }, [items, filters.status, query]);

  useEffect(() => {
    setPage(0);
  }, [filters.status, query]);

  const openResolve = (item) => {
    setActiveDispute(item);
    setResolveForm({ status: 'RESOLVED', resolution_note: '' });
    setShowModal(true);
  };

  const columns = useMemo(() => [
    {
      key: 'dispute_id',
      header: 'Dispute ID',
      sortable: true,
      render: (val) => <strong>{val || '-'}</strong>,
    },
    {
      key: 'order_id',
      header: 'Order ID',
      sortable: true,
      render: (val) => <span style={{ color: '#6345ed', fontWeight: 600 }}>{val || '-'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (status) => (
        <span className={`status-pill ${resolveStatusClass(status)}`}>
          {formatStatus(status) || 'Open'}
        </span>
      ),
    },
    {
      key: 'opened_by_name',
      header: 'Opened By',
      render: (val) => val || '-',
    },
    {
      key: 'buyer_name',
      header: 'Buyer',
      render: (val) => val || '-',
    },
    {
      key: 'seller_name',
      header: 'Seller',
      render: (val) => val || '-',
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (val) => (
        <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }} title={val || ''}>
          {val || '-'}
        </span>
      ),
    },
    {
      key: 'created_on',
      header: 'Created',
      sortable: true,
      render: (val, item) => formatDate(val || item?.createdAt),
    },
    {
      key: 'resolved_on',
      header: 'Resolved',
      render: (val) => formatDate(val),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (_, item) => {
        const actionable = ['OPEN', 'UNDER_REVIEW'].includes(String(item.status || '').toUpperCase());
        return (
          <button type="button" className="ghost-btn small" onClick={() => openResolve(item)}>
            {actionable ? 'Resolve' : 'View'}
          </button>
        );
      },
    },
  ], []);

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
      setMessage({ type: 'success', text: 'Dispute updated successfully.' });
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

      <div className="stat-grid" style={{ marginBottom: 20 }}>
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

      <DataTable
        columns={columns}
        data={filteredItems}
        isLoading={isLoading}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by dispute, order, buyer, seller..."
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
        emptyTitle="No order disputes found"
        emptyDescription="No dispute tickets match your search or filter criteria."
        toolbarLeft={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              className="datatable-pagesize-select"
              style={{ height: 38, padding: '0 12px', borderRadius: 9999, minWidth: 140 }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {filters.status && (
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => setFilters({ status: '' })}
              >
                Clear Filter
              </button>
            )}
          </div>
        }
      />

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
