import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner, DataTable, TableRowActionMenu } from '../components';
import { API_ORIGIN } from '../config/runtime';

const API_BASE = API_ORIGIN;
const buildUrl = (path) => `${API_BASE}/api${path}`;

const STATUS_OPTIONS = [
  { value: '', label: 'All Requests' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'REQUIREMENT_COLLECTED', label: 'Requirement Collected' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PREVIEW_READY', label: 'Preview Ready' },
  { value: 'REVISION', label: 'Revision' },
  { value: 'LIVE', label: 'Live' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const formatStatus = (status) =>
  String(status || 'Unknown')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusPillClass = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'LIVE' || normalized === 'COMPLETED') return 'live';
  if (normalized === 'PENDING' || normalized === 'NEW') return 'pending';
  if (normalized === 'IN_PROGRESS' || normalized === 'CONTACTED' || normalized === 'REQUIREMENT_COLLECTED') return 'in-review';
  if (normalized === 'PREVIEW_READY' || normalized === 'REVISION') return 'pending-review';
  if (normalized === 'CANCELLED') return 'rejected';
  return 'inactive';
};

const formatDateOnly = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DetailRow = ({ label, value }) => (
  <div className="mv-detail-row">
    <span className="mv-detail-label">{label}</span>
    <span className="mv-detail-value">{value || '-'}</span>
  </div>
);

function StorefrontWebsiteRequestsPage({ token }) {
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const response = await fetch(buildUrl(`/admin/website-requests${query}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load requests.');
      }
      setRequests(Array.isArray(data.data?.content) ? data.data.content : []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load requests.' });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, token]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((req) => {
      const text = [
        req.businessName,
        req.businessProfileId,
        req.contactNumber,
        req.email,
        req.requestCode,
        req.planName,
        req.assignedTo,
        req.status,
      ].join(' ').toLowerCase();
      return text.includes(q);
    });
  }, [searchQuery, requests]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRequests = filteredRequests.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleView = (req) => {
    setViewItem(req);
    setOpenActionRowId(null);
  };

  const handleStatusUpdate = async (req, newStatus) => {
    if (!window.confirm(`Update status to ${newStatus}?`)) return;
    setUpdatingId(req.id);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await fetch(buildUrl(`/admin/website-requests/${req.id}/status`), {
        method: 'PUT',
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update request.');
      }
      setMessage({ type: 'success', text: 'Request updated successfully.' });
      if (viewItem && viewItem.id === req.id) setViewItem(data.data);
      await loadRequests();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update request.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRequestUpdate = async (updates) => {
    if (!viewItem) return;
    setUpdatingId(viewItem.id);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await fetch(buildUrl(`/admin/website-requests/${viewItem.id}/status`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update request.');
      }
      setMessage({ type: 'success', text: 'Request updated successfully.' });
      setViewItem(data.data);
      await loadRequests();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update request.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const renderViewPanel = () => {
    if (!viewItem) return null;
    return (
      <div className="mv-panel card storefront-request-panel">
        <div className="mv-panel-header">
          <div className="request-panel-heading">
            <button type="button" className="mv-back-btn" onClick={() => setViewItem(null)}>
              Back
            </button>
            <div className="request-panel-title-stack">
              <span className="request-panel-kicker">{viewItem.requestCode || `#${viewItem.id}`}</span>
              <h3 className="mv-panel-title">{viewItem.businessName || 'Request Details'}</h3>
            </div>
            <span className={`status-pill storefront-status ${statusPillClass(viewItem.status)}`}>
              {formatStatus(viewItem.status)}
            </span>
          </div>
          <div className="request-panel-toolbar">
            <label className="request-status-field">
              <span>Status</span>
              <select
                className="request-control-select"
                value={viewItem.status || 'PENDING'}
                onChange={(event) => handleStatusUpdate(viewItem, event.target.value)}
              >
                {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <button
              className="secondary-btn compact request-notify-btn"
              disabled={updatingId === viewItem.id}
              onClick={() => handleRequestUpdate({ markNotified: 'true' })}
            >
              Mark Update Sent
            </button>
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">Request & Plan</p>
          <div className="mv-detail-grid">
            <DetailRow label="Request ID" value={viewItem.requestCode || `#${viewItem.id}`} />
            <DetailRow label="Plan" value={viewItem.planName} />
            <DetailRow label="Validity" value={`${formatDateOnly(viewItem.validFrom)} - ${formatDateOnly(viewItem.validTill)}`} />
            <DetailRow label="Created At" value={formatDate(viewItem.createdAt)} />
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">Business Contact</p>
          <div className="mv-detail-grid">
            <DetailRow label="Business" value={viewItem.businessName} />
            <DetailRow label="Mobile" value={viewItem.contactNumber} />
            <DetailRow label="Email" value={viewItem.email} />
            <DetailRow label="Assigned To" value={viewItem.assignedTo} />
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">Work Management</p>
          <div className="request-form-grid">
            <label className="request-field">
              <span>Assigned To</span>
              <input
                className="request-input"
                value={viewItem.assignedTo || ''}
                onChange={(event) => setViewItem({ ...viewItem, assignedTo: event.target.value })}
                placeholder="Team member name"
              />
            </label>
            <label className="request-field">
              <span>MOM / Requirements</span>
              <textarea
                className="request-textarea"
                rows={5}
                value={viewItem.adminNotes || ''}
                onChange={(event) => setViewItem({ ...viewItem, adminNotes: event.target.value })}
                placeholder="Write call notes, website requirements, pages, colors, domain preference..."
              />
            </label>
            <label className="request-field">
              <span>Customer Notes</span>
              <textarea
                className="request-textarea"
                rows={3}
                value={viewItem.notes || ''}
                onChange={(event) => setViewItem({ ...viewItem, notes: event.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">Website Link</p>
          <div className="request-form-grid">
            <label className="request-field">
              <span>Preview URL</span>
              <input
                className="request-input"
                value={viewItem.previewUrl || ''}
                onChange={(event) => setViewItem({ ...viewItem, previewUrl: event.target.value })}
                placeholder="https://preview..."
              />
            </label>
            <label className="request-field">
              <span>Final Website URL</span>
              <input
                className="request-input"
                value={viewItem.finalWebsiteUrl || ''}
                onChange={(event) => setViewItem({ ...viewItem, finalWebsiteUrl: event.target.value })}
                placeholder="https://ramji.traddex.in"
              />
            </label>
            <label className="request-field">
              <span>Linked Site ID</span>
              <input
                className="request-input"
                value={viewItem.siteId || ''}
                onChange={(event) => setViewItem({ ...viewItem, siteId: event.target.value })}
                placeholder="Storefront site id after launch"
              />
            </label>
          </div>
        </div>

        <div className="request-panel-actions">
          <button
            className="primary-btn compact"
            disabled={updatingId === viewItem.id}
            onClick={() => handleRequestUpdate({
              status: viewItem.status,
              assignedTo: viewItem.assignedTo || '',
              adminNotes: viewItem.adminNotes || '',
              notes: viewItem.notes || '',
              previewUrl: viewItem.previewUrl || '',
              finalWebsiteUrl: viewItem.finalWebsiteUrl || '',
              siteId: viewItem.siteId ? String(viewItem.siteId) : '',
            })}
          >
            Save Request
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <Banner message={message} />

      <div className={`mv-layout${viewItem ? ' mv-layout--split' : ''}`}>
        <div className="panel card users-table-card">
          <DataTable
            columns={[
              {
                key: 'requestCode',
                header: 'Request ID',
                sortable: true,
                render: (val, req) => <strong>{val || `#${req.id}`}</strong>,
              },
              {
                key: 'businessName',
                header: 'Business',
                sortable: true,
                render: (val, req) => (
                  <span
                    className="bdt-name-link"
                    style={{ color: '#6345ED', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(req);
                    }}
                  >
                    {val || '-'}
                  </span>
                ),
              },
              {
                key: 'contactNumber',
                header: 'Mobile',
                sortable: true,
                render: (val) => val || '-',
              },
              {
                key: 'planName',
                header: 'Plan',
                sortable: true,
                render: (val) => val || '-',
              },
              {
                key: 'validity',
                header: 'Validity',
                render: (_, req) => `${formatDateOnly(req.validFrom)} - ${formatDateOnly(req.validTill)}`,
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (val) => (
                  <span className={`status-pill storefront-status ${statusPillClass(val)}`}>
                    {formatStatus(val)}
                  </span>
                ),
              },
              {
                key: 'assignedTo',
                header: 'Assigned',
                sortable: true,
                render: (val) => val || '-',
              },
              {
                key: 'createdAt',
                header: 'Created',
                sortable: true,
                render: (val) => formatDate(val),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (_, req) => (
                  <div className="table-actions" onClick={(event) => event.stopPropagation()}>
                    <TableRowActionMenu
                      rowId={req.id}
                      openRowId={openActionRowId}
                      onToggle={setOpenActionRowId}
                      actions={[
                        { label: 'View Details', onClick: () => handleView(req) },
                      ]}
                    />
                  </div>
                ),
              },
            ]}
            data={filteredRequests}
            isLoading={isLoading}
            search={searchQuery}
            onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
            searchPlaceholder="Search requests..."
            page={page - 1}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p + 1)}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
            pageSizeOptions={[10, 20, 50]}
            onRowClick={(req) => handleView(req)}
            emptyTitle="No requests found"
            emptyDescription="No storefront website requests match your criteria."
            toolbarLeft={
              <select
                value={statusFilter}
                onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
                className="gsc-toolbar-btn storefront-filter-select"
                style={{ border: 'none', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                ))}
              </select>
            }
          />
        </div>

        {renderViewPanel()}
      </div>
    </div>
  );
}

export default StorefrontWebsiteRequestsPage;
