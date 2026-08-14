import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner, TableRowActionMenu, DataTable } from '../components';
import { fetchKycAssistanceRequests, updateKycAssistanceStatus } from '../services/adminApi';

/* ── Helpers ─────────────────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const normalizeStatus = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '_');

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
      const reqRes = await fetchKycAssistanceRequests(token).catch(() => ({ data: [] }));
      setRequests(reqRes?.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load requests.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Handlers ────────────────────────────────────────────────── */
  const handleUpdateStatus = useCallback(async (id, status, note = null) => {
    try {
      await updateKycAssistanceStatus(token, id, status, note);
      setMessage({ type: 'success', text: `Status updated to "${getStatusLabel(status)}".` });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update status.' });
    }
  }, [token, loadData]);

  const handleOpenNoteModal = useCallback((request) => {
    setSelectedRequest(request);
    setAdminNote(request.adminNote || '');
    setIsNoteModalOpen(true);
  }, []);

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

  /* ── Filtering ───────────────────────────────────────────────── */
  const filteredRequests = useMemo(() => {
    let result = Array.isArray(requests) ? requests : [];

    if (filterStatus) {
      result = result.filter((r) => normalizeStatus(r.status) === filterStatus);
    }

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
  const getRowActions = useCallback((r) => {
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
  }, [allowedActions, handleUpdateStatus, handleOpenNoteModal]);

  /* ── Columns definition ──────────────────────────────────────── */
  const columns = useMemo(() => [
    {
      key: 'id',
      header: 'Sr No',
      width: '80px',
      render: (_, __, index) => page * pageSize + index + 1,
    },
    {
      key: 'businessName',
      header: 'Business Name',
      sortable: true,
      render: (_, r) => (
        <span
          className="bdt-name-link"
          style={{ fontWeight: 600 }}
          onClick={() => navigate(`/admin/businesses/${r.userId}`)}
          role="button"
          tabIndex={0}
        >
          {r.businessName || '-'}
        </span>
      ),
    },
    {
      key: 'phoneNumber',
      header: 'Phone',
      render: (_, r) => (
        <a href={`tel:${r.phoneNumber}`} className="bdt-phone-link">
          {r.phoneNumber || '-'}
        </a>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_, r) => (
        <span className={`status-pill ${getStatusPillClass(r.status)}`}>
          {getStatusLabel(r.status)}
        </span>
      ),
    },
    {
      key: 'assignedToName',
      header: 'Assigned To',
      render: (_, r) => r.assignedToName || <span style={{ color: '#94a3b8' }}>Unassigned</span>,
    },
    {
      key: 'adminNote',
      header: 'Note',
      render: (_, r) => (
        <span className="bdt-email-cell" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
          {r.adminNote || <span style={{ color: '#cbd5e1' }}>—</span>}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Requested',
      sortable: true,
      render: (_, r) => formatDateTime(r.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, r) => {
        const rowActions = getRowActions(r);
        if (!rowActions.length) return '-';
        return (
          <div className="table-actions" onClick={(e) => e.stopPropagation()}>
            <TableRowActionMenu
              rowId={r.id}
              openRowId={openActionRowId}
              onToggle={setOpenActionRowId}
              actions={rowActions}
            />
          </div>
        );
      },
    },
  ], [navigate, page, pageSize, openActionRowId, getRowActions]);

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

      {/* ── Unified DataTable ─────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={filteredRequests}
        isLoading={isLoading}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by name, phone..."
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        emptyTitle="No KYC assistance requests"
        emptyDescription={requests.length === 0 ? "No KYC assistance requests have been submitted yet." : "No requests match your current filters."}
        toolbarLeft={
          <div className="bdt-toolbar-wrap" style={{ position: 'relative' }}>
            <button
              type="button"
              className={`gsc-toolbar-btn ${showFilterPanel ? 'active' : ''}`}
              title="Filter"
              onClick={() => setShowFilterPanel((v) => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                <path d="M4 6h16M4 12h10M4 18h6" />
              </svg>
              Filter{filterStatus ? ` • ${filterStatus}` : ''}
            </button>
            {showFilterPanel && (
              <div className="bdt-dropdown-panel" style={{ zIndex: 100, position: 'absolute', top: '100%', left: 0, marginTop: 4 }}>
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
        }
      />

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
