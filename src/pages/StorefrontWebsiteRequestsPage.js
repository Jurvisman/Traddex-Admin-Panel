import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import { API_ORIGIN } from '../config/runtime';

const API_BASE = API_ORIGIN;
const buildUrl = (path) => `${API_BASE}/api${path}`;

const STATUS_OPTIONS = [
  { value: '', label: 'All Requests' },
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
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
  if (normalized === 'COMPLETED') return 'status-active';
  if (normalized === 'NEW') return 'storefront-status-warn';
  if (normalized === 'IN_PROGRESS') return 'status-primary';
  return 'status-inactive';
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
        req.selectedTemplateName,
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

  const renderViewPanel = () => {
    if (!viewItem) return null;
    let colors = {};
    try {
      if (viewItem.brandColorsJson) colors = JSON.parse(viewItem.brandColorsJson);
    } catch(e) {}
    
    return (
      <div className="mv-panel card">
        <div className="mv-panel-header">
          <div className="mv-panel-title-row">
            <button type="button" className="mv-back-btn" onClick={() => setViewItem(null)}>
              Back
            </button>
            <h3 className="mv-panel-title">{viewItem.businessName || 'Request Details'}</h3>
            <span className={statusPillClass(viewItem.status)}>{formatStatus(viewItem.status)}</span>
          </div>
          <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
             {viewItem.status === 'NEW' && (
                <button className="primary-btn compact" onClick={() => handleStatusUpdate(viewItem, 'IN_PROGRESS')}>Start Work</button>
             )}
             {viewItem.status === 'IN_PROGRESS' && (
                <button className="primary-btn compact" onClick={() => handleStatusUpdate(viewItem, 'COMPLETED')}>Mark Completed</button>
             )}
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">Contact Info</p>
          <div className="mv-detail-grid">
            <DetailRow label="Business" value={viewItem.businessName} />
            <DetailRow label="Mobile" value={viewItem.contactNumber} />
            <DetailRow label="Email" value={viewItem.email} />
            <DetailRow label="Domain Req" value={viewItem.preferredDomainName} />
            <DetailRow label="Created At" value={formatDate(viewItem.createdAt)} />
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">Template Details</p>
          <div className="mv-detail-grid">
            <DetailRow label="Template Name" value={viewItem.selectedTemplateName} />
            <DetailRow label="Template Key" value={viewItem.selectedTemplateKey} />
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">Branding</p>
          <div className="mv-detail-grid">
            <div className="mv-detail-row" style={{gridColumn: '1 / -1'}}>
              <span className="mv-detail-label">Logo</span>
              <span className="mv-detail-value">
                {viewItem.logoUrl ? <img src={viewItem.logoUrl} style={{maxHeight: 40}} alt="Logo" /> : '-'}
              </span>
            </div>
            <DetailRow label="Primary Color" value={colors.primary ? <span style={{display: 'inline-block', width: 20, height: 20, background: colors.primary, borderRadius: 4, verticalAlign: 'middle', marginRight: 8}}></span> : '-'} />
            <DetailRow label="Secondary Color" value={colors.secondary ? <span style={{display: 'inline-block', width: 20, height: 20, background: colors.secondary, borderRadius: 4, verticalAlign: 'middle', marginRight: 8}}></span> : '-'} />
          </div>
        </div>
        
        {viewItem.notes && (
          <div className="mv-section">
            <p className="mv-section-label">Customer Notes</p>
            <div style={{padding: '12px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px'}}>
                {viewItem.notes}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <Banner message={message} />

      <div className={`mv-layout${viewItem ? ' mv-layout--split' : ''}`}>
        <div className="panel card users-table-card">
          <div className="panel-split">
            <div className="category-list-head-left">
              <h3 className="panel-subheading">Website Requests</h3>
              <div className="gsc-datatable-toolbar-left">
                <select
                  value={statusFilter}
                  onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
                  className="gsc-toolbar-btn storefront-filter-select"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="gsc-datatable-toolbar-right">
              <div className="gsc-toolbar-search">
                <input
                  type="search"
                  placeholder="Search requests"
                  value={searchQuery}
                  onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-state">Loading requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="empty-state">No requests found.</div>
          ) : (
            <div className="table-shell">
              <table className="admin-table storefront-master-table">
                <thead>
                  <tr>
                    <th>Req. ID</th>
                    <th>Business</th>
                    <th>Mobile</th>
                    <th>Template</th>
                    <th>Requested Domain</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRequests.map((req) => (
                    <tr
                      key={req.id}
                      className={viewItem?.id === req.id ? 'mv-row-active' : ''}
                      onClick={() => handleView(req)}
                    >
                      <td>#{req.id}</td>
                      <td>{req.businessName || '-'}</td>
                      <td>{req.contactNumber || '-'}</td>
                      <td>{req.selectedTemplateName || req.selectedTemplateKey || '-'}</td>
                      <td>{req.preferredDomainName || '-'}</td>
                      <td><span className={statusPillClass(req.status)}>{formatStatus(req.status)}</span></td>
                      <td>{formatDate(req.createdAt)}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <TableRowActionMenu
                          rowId={req.id}
                          openRowId={openActionRowId}
                          onToggle={setOpenActionRowId}
                          actions={[
                            { label: 'View Details', onClick: () => handleView(req) }
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bv-table-footer">
                 <div className="product-pagination-controls">
                  <div className="bv-table-pagination">
                    <button type="button" className="secondary-btn" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{'< Prev'}</button>
                    <span>Page {safePage} / {totalPages}</span>
                    <button type="button" className="secondary-btn" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>{'Next >'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {renderViewPanel()}
      </div>
    </div>
  );
}

export default StorefrontWebsiteRequestsPage;
