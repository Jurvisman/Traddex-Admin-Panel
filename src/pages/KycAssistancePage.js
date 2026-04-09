import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner, TableRowActionMenu } from '../components';
import { fetchKycAssistanceRequests, updateKycAssistanceStatus, fetchEmployees } from '../services/adminApi';

/* ── Helpers ─────────────────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const normalizeStatus = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '_');

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const getStatusPillClass = (status) => {
  const s = normalizeStatus(status);
  if (s === 'COMPLETED') return 'approved';
  if (s === 'IN_PROGRESS') return 'under-review';
  if (s === 'ACCEPTED') return 'pending';
  if (s === 'SUBMITTED') return 'pending-review';
  if (s === 'REJECTED' || s === 'CANCELLED') return 'rejected';
  return 'pending';
};

const getStatusLabel = (status) => {
  const s = normalizeStatus(status);
  return s.replace(/_/g, ' ');
};

const paginateItems = (items, page, pageSize = 10) => {
  const list = Array.isArray(items) ? items : [];
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;
  const end = Math.min(start + pageSize, totalItems);
  return { items: list.slice(start, end), totalItems, totalPages, page: safePage, start, end };
};

/* ── Status filter options ────────────────────────────────────── */
const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

/* ══════════════════════════════════════════════════════════════
   KYC ASSISTANCE PAGE
   ══════════════════════════════════════════════════════════════ */
function KycAssistancePage({ token, allowedActions }) {
  const navigate = useNavigate();

  /* ── Data state ──────────────────────────────────────────────── */
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: 'info', text: '' });

  /* ── Table state ─────────────────────────────────────────────── */
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [openActionRowId, setOpenActionRowId] = useState(null);

  /* ── Note modal state ────────────────────────────────────────── */
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  /* ── Data loading ────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [reqRes, empRes] = await Promise.all([
        fetchKycAssistanceRequests(token).catch(() => ({ data: [] })),
        fetchEmployees(token).catch(() => ({ data: [] })),
      ]);
      setRequests(reqRes?.data || []);
      setEmployees(empRes?.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load requests.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ── Handlers ────────────────────────────────────────────────── */
  const handleUpdateStatus = async (id, status, note = null) => {
    try {
      await updateKycAssistanceStatus(token, id, status, note);
      setMessage({ type: 'success', text: `Status updated to "${getStatusLabel(status)}".` });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update status.' });
    }
  };

  const handleOpenNoteModal = (request) => {
    setSelectedRequest(request);
    setAdminNote(request.adminNote || '');
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!selectedRequest) return;
    try {
      await updateKycAssistanceStatus(token, selectedRequest.id, selectedRequest.status, adminNote);
      setMessage({ type: 'success', text: 'Note saved successfully.' });
      setIsNoteModalOpen(false);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save note.' });
    }
  };

  /* ── Filtering & pagination ──────────────────────────────────── */
  const filteredRequests = useMemo(() => {
    let result = Array.isArray(requests) ? requests : [];

    // Status filter
    if (filterStatus) {
      result = result.filter((r) => normalizeStatus(r.status) === filterStatus);
    }

    // Search query
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((r) =>
        (r.businessName || '').toLowerCase().includes(q) ||
        (r.phoneNumber || '').toLowerCase().includes(q) ||
        (r.assignedToName || '').toLowerCase().includes(q) ||
        String(r.id || '').includes(q)
      );
    }

    return result;
  }, [requests, filterStatus, query]);

  const pagedRequests = useMemo(() => paginateItems(filteredRequests, page, pageSize), [filteredRequests, page, pageSize]);

  // Reset page when filter/query change
  useEffect(() => { setPage(0); }, [filterStatus, query]);

  /* ── Status chip counts ──────────────────────────────────────── */
  const statusCounts = useMemo(() => {
    const counts = { SUBMITTED: 0, ACCEPTED: 0, IN_PROGRESS: 0, COMPLETED: 0 };
    (Array.isArray(requests) ? requests : []).forEach((r) => {
      const s = normalizeStatus(r.status);
      if (counts[s] !== undefined) counts[s] += 1;
    });
    return counts;
  }, [requests]);

  /* ── Action Handlers ─────────────────────────────────────────── */
  const getRowActions = (r) => {
    const actions = [];
    const s = normalizeStatus(r.status);
    
    const hasUpdatePerm = allowedActions?.has('ADMIN_KYC_ASSISTANCE_UPDATE') ?? false;

    if (hasUpdatePerm) {
      if (s === 'SUBMITTED') {
        actions.push({ label: 'Accept', onClick: () => handleUpdateStatus(r.id, 'ACCEPTED') });
      }
      if (s === 'ACCEPTED') {
        actions.push({ label: 'Start Work', onClick: () => handleUpdateStatus(r.id, 'IN_PROGRESS') });
      }
      if (s === 'IN_PROGRESS') {
        actions.push({ label: 'Complete', onClick: () => handleUpdateStatus(r.id, 'COMPLETED') });
      }

      actions.push({ label: 'Add Note', onClick: () => handleOpenNoteModal(r) });
    }

    return actions;
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="users-page business-page">
      <Banner message={message} />

      {/* ── Status chips ────────────────────────────────────────── */}
      <div className="users-filters">
        <span className="status-chip pending">{statusCounts.SUBMITTED} Submitted</span>
        <span className="status-chip approved">{statusCounts.ACCEPTED} Accepted</span>
        <span className="status-chip changes-required">{statusCounts.IN_PROGRESS} In Progress</span>
        <span className="status-chip login">{statusCounts.COMPLETED} Completed</span>
      </div>

      {/* ── Table card ──────────────────────────────────────────── */}
      <div className="panel card users-table-card">
        {/* Toolbar */}
        <div className="panel-split">
          <div className="category-list-head-left">
            <div className="gsc-datatable-toolbar-left">
              {/* Filter button */}
              <div className="bdt-toolbar-wrap">
                <button
                  type="button"
                  className={`gsc-toolbar-btn ${showFilterPanel ? 'active' : ''}`}
                  title="Filter"
                  onClick={() => setShowFilterPanel((v) => !v)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h10M4 18h6" />
                  </svg>
                  Filter{filterStatus ? ' •' : ''}
                </button>
                {showFilterPanel && (
                  <div className="bdt-dropdown-panel">
                    <p className="bdt-dropdown-label">Status</p>
                    {STATUS_FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`bdt-dropdown-option ${filterStatus === opt.value ? 'selected' : ''}`}
                        onClick={() => { setFilterStatus(opt.value); setShowFilterPanel(false); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                    {filterStatus ? (
                      <button
                        type="button"
                        className="bdt-dropdown-option danger"
                        onClick={() => { setFilterStatus(''); setShowFilterPanel(false); }}
                      >
                        Clear Filter
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="gsc-datatable-toolbar-right">
            <div className="gsc-toolbar-search">
              <input
                type="search"
                placeholder="Search by name, phone..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search KYC requests"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <p className="empty-state">Loading requests...</p>
        ) : filteredRequests.length === 0 ? (
          <p className="empty-state">{requests.length === 0 ? 'No KYC assistance requests yet.' : 'No requests match the current filter.'}</p>
        ) : (
          <div className="table-shell business-table-shell">
            <table className="admin-table users-table business-datatable">
              <thead>
                <tr>
                  <th className="bdt-checkbox-col">
                    <input type="checkbox" className="select-checkbox" disabled />
                  </th>
                  <th>Sr No</th>
                  <th>Business Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Note</th>
                  <th>Requested</th>
                  <th className="table-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRequests.items.map((r, index) => (
                  <tr key={r.id}>
                    <td className="bdt-checkbox-col">
                      <input type="checkbox" className="select-checkbox" disabled />
                    </td>
                    <td>{pagedRequests.start + index + 1}</td>
                    <td>
                      <span
                        className="bdt-name-link"
                        onClick={() => navigate(`/admin/businesses/${r.userId}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/businesses/${r.userId}`)}
                      >
                        {r.businessName || '-'}
                      </span>
                    </td>
                    <td>
                      <a href={`tel:${r.phoneNumber}`} className="bdt-phone-link">
                        {r.phoneNumber || '-'}
                      </a>
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusPillClass(r.status)}`}>
                        {getStatusLabel(r.status)}
                      </span>
                    </td>
                    <td>{r.assignedToName || <span style={{ color: '#94a3b8' }}>Unassigned</span>}</td>
                    <td className="bdt-email-cell">{r.adminNote || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td>{formatDateTime(r.createdAt)}</td>
                    <td className="table-actions">
                      {getRowActions(r).length > 0 && (
                        <div className="table-action-group">
                          <TableRowActionMenu
                            rowId={r.id}
                            openRowId={openActionRowId}
                            onToggle={setOpenActionRowId}
                            actions={getRowActions(r)}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Pagination footer ───────────────────────────────── */}
            <div className="bv-table-footer">
              <div className="table-record-count">
                <span>
                  Showing {pagedRequests.totalItems ? pagedRequests.start + 1 : 0}–{pagedRequests.end} of {filteredRequests.length} requests
                </span>
                {query || filterStatus ? (
                  <span className="bdt-no-more">Filtered from {requests.length} total</span>
                ) : null}
              </div>
              <div className="product-pagination-controls">
                <label className="product-pagination-size">
                  <span>Rows</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value) || 10); setPage(0); }}
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </label>
                <div className="bv-table-pagination">
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={pagedRequests.page === 0 || isLoading}
                    onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  >
                    {'< Prev'}
                  </button>
                  <span>Page {pagedRequests.page + 1} / {pagedRequests.totalPages}</span>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={pagedRequests.page >= pagedRequests.totalPages - 1 || isLoading}
                    onClick={() => setPage((p) => Math.min(p + 1, Math.max(pagedRequests.totalPages - 1, 0)))}
                  >
                    {'Next >'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Note modal ──────────────────────────────────────────── */}
      {isNoteModalOpen && selectedRequest ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal confirm-modal" style={{ maxWidth: 520 }}>
            <h3 className="panel-subheading">Admin Note — {selectedRequest.businessName}</h3>
            <p className="panel-subtitle" style={{ marginBottom: 16 }}>
              Add an internal note about this KYC assistance request.
            </p>
            <textarea
              rows={4}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Enter any notes about this request..."
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div className="form-actions" style={{ marginTop: 20 }}>
              <button type="button" className="ghost-btn" onClick={() => setIsNoteModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleSaveNote}>
                Save Note
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default KycAssistancePage;
