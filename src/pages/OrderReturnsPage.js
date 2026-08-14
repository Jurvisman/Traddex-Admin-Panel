import { useEffect, useMemo, useState, useCallback } from 'react';
import { Banner, DataTable } from '../components';
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
  { label: 'All Statuses', value: '' },
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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const loadData = useCallback(async (override = filters) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listOrderReturns(token, override.status);
      const raw = Array.isArray(response?.data) ? response.data : [];
      raw.sort((a, b) => new Date(b?.createdAt || b?.created_at || 0) - new Date(a?.createdAt || a?.created_at || 0));
      setItems(raw);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load returns.' });
    } finally {
      setIsLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    let result = Array.isArray(items) ? items : [];
    if (filters.status) {
      result = result.filter((item) => String(item?.status || '').toUpperCase() === filters.status.toUpperCase());
    }
    const term = normalize(query);
    if (term) {
      result = result.filter((item) => {
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
    }
    return result;
  }, [items, filters.status, query]);

  useEffect(() => {
    setPage(0);
  }, [filters.status, query]);

  const openOverride = (item) => {
    setActiveReturn(item);
    setOverrideForm({ status: 'APPROVED', resolution_note: '' });
    setShowModal(true);
  };

  const columns = useMemo(() => [
    {
      key: 'return_id',
      header: 'Return ID',
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
          {formatStatus(status) || 'Requested'}
        </span>
      ),
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
      render: (_, item) => (
        <button type="button" className="ghost-btn small" onClick={() => openOverride(item)}>
          Override
        </button>
      ),
    },
  ], []);

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
      setMessage({ type: 'success', text: 'Return updated successfully.' });
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

      <div className="stat-grid" style={{ marginBottom: 20 }}>
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

      <DataTable
        columns={columns}
        data={filteredItems}
        isLoading={isLoading}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by return, order, buyer, seller..."
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
        emptyTitle="No order returns found"
        emptyDescription="No return requests match your search or filter criteria."
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
