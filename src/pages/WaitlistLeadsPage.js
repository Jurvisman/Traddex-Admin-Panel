import { useEffect, useState, useMemo, useCallback } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import { fetchWaitlistLeads, updateWaitlistLeadStatus, updateWaitlistLeadNotes } from '../services/adminApi';

/* ── Helpers ─────────────────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const getStatusPillClass = (status) => {
  const s = String(status || '').trim().toUpperCase();
  if (s === 'ONBOARDED') return 'approved';      // green
  if (s === 'CALLED') return 'under-review';     // blue/orange
  if (s === 'PENDING') return 'pending-review';  // yellow
  return 'pending';
};

const getStatusLabel = (status) => {
  const s = String(status || '').trim().toUpperCase();
  if (s === 'ONBOARDED') return 'Onboarded';
  if (s === 'CALLED') return 'Called';
  if (s === 'PENDING') return 'Pending';
  return s;
};

const getBusinessTypeLabel = (type) => {
  const t = String(type || '').trim().toLowerCase();
  if (t === 'b2b') return 'Wholesale (B2B)';
  if (t === 'b2c') return 'Retail (B2C)';
  if (t === 'both' || t === 'hybrid') return 'Hybrid (B2B & B2C)';
  return type;
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

/* ── Filter Options ─────────────────────────────────────────── */
const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CALLED', label: 'Called' },
  { value: 'ONBOARDED', label: 'Onboarded' },
];

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Business Types' },
  { value: 'b2b', label: 'Wholesale (B2B)' },
  { value: 'b2c', label: 'Retail (B2C)' },
  { value: 'both', label: 'Hybrid' },
];

/* ══════════════════════════════════════════════════════════════
   WAITLIST LEADS PAGE
   ══════════════════════════════════════════════════════════════ */
function WaitlistLeadsPage({ token }) {
  /* ── Data state ──────────────────────────────────────────────── */
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: 'info', text: '' });

  /* ── Table state ─────────────────────────────────────────────── */
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [openActionRowId, setOpenActionRowId] = useState(null);

  /* ── Notes modal state ────────────────────────────────────────── */
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadNotes, setLeadNotes] = useState('');

  /* ── Load data ───────────────────────────────────────────────── */
  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchWaitlistLeads(token);
      setLeads(response?.data || response || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch waitlist leads.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  /* ── Action Handlers ─────────────────────────────────────────── */
  const handleUpdateStatus = async (id, status) => {
    try {
      await updateWaitlistLeadStatus(token, id, status);
      setMessage({ type: 'success', text: `Lead status updated to ${getStatusLabel(status)}.` });
      loadLeads();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update status.' });
    }
  };

  const handleOpenNotesModal = (lead) => {
    setSelectedLead(lead);
    setLeadNotes(lead.notes || '');
    setIsNotesModalOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    try {
      await updateWaitlistLeadNotes(token, selectedLead.id, leadNotes);
      setMessage({ type: 'success', text: 'Lead notes updated successfully.' });
      setIsNotesModalOpen(false);
      loadLeads();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save notes.' });
    }
  };

  /* ── Filtering & Pagination ──────────────────────────────────── */
  const filteredLeads = useMemo(() => {
    let result = Array.isArray(leads) ? leads : [];

    // Filter by status
    if (filterStatus) {
      result = result.filter((l) => String(l.status).toUpperCase() === filterStatus.toUpperCase());
    }

    // Filter by business type
    if (filterType) {
      result = result.filter((l) => String(l.businessType).toLowerCase() === filterType.toLowerCase());
    }

    // Search query
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((l) =>
        (l.name || '').toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [leads, filterStatus, filterType, query]);

  const pagedLeads = useMemo(() => paginateItems(filteredLeads, page, pageSize), [filteredLeads, page, pageSize]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(0);
  }, [filterStatus, filterType, query]);

  /* ── Status counts ───────────────────────────────────────────── */
  const statusCounts = useMemo(() => {
    const counts = { PENDING: 0, CALLED: 0, ONBOARDED: 0 };
    (Array.isArray(leads) ? leads : []).forEach((l) => {
      const s = String(l.status || '').trim().toUpperCase();
      if (counts[s] !== undefined) counts[s] += 1;
    });
    return counts;
  }, [leads]);

  /* ── Row Action Menu Definitions ──────────────────────────────── */
  const getRowActions = (lead) => {
    const actions = [];
    const s = String(lead.status || '').trim().toUpperCase();

    if (s === 'PENDING') {
      actions.push({ label: 'Mark as Called', onClick: () => handleUpdateStatus(lead.id, 'CALLED') });
      actions.push({ label: 'Mark as Onboarded', onClick: () => handleUpdateStatus(lead.id, 'ONBOARDED') });
    } else if (s === 'CALLED') {
      actions.push({ label: 'Mark as Onboarded', onClick: () => handleUpdateStatus(lead.id, 'ONBOARDED') });
      actions.push({ label: 'Move back to Pending', onClick: () => handleUpdateStatus(lead.id, 'PENDING') });
    } else if (s === 'ONBOARDED') {
      actions.push({ label: 'Move back to Pending', onClick: () => handleUpdateStatus(lead.id, 'PENDING') });
    }

    actions.push({ label: 'Edit Notes', onClick: () => handleOpenNotesModal(lead) });
    return actions;
  };

  return (
    <div className="users-page business-page">
      <Banner message={message} />

      {/* ── Status counters ────────────────────────────────────────── */}
      <div className="users-filters">
        <span className="status-chip pending">{statusCounts.PENDING} Pending</span>
        <span className="status-chip changes-required">{statusCounts.CALLED} Called</span>
        <span className="status-chip login">{statusCounts.ONBOARDED} Onboarded</span>
      </div>

      {/* ── Table Card Panel ────────────────────────────────────────── */}
      <div className="panel card users-table-card">
        {/* Toolbar */}
        <div className="panel-split">
          <div className="category-list-head-left" style={{ display: 'flex', gap: 12 }}>
            <div className="gsc-datatable-toolbar-left" style={{ display: 'flex', gap: 12 }}>
              {/* Status Filter */}
              <div className="bdt-toolbar-wrap">
                <button
                  type="button"
                  className={`gsc-toolbar-btn ${showStatusFilter ? 'active' : ''}`}
                  onClick={() => { setShowStatusFilter((v) => !v); setShowTypeFilter(false); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h10M4 18h6" />
                  </svg>
                  Status{filterStatus ? `: ${getStatusLabel(filterStatus)}` : ''}
                </button>
                {showStatusFilter && (
                  <div className="bdt-dropdown-panel" style={{ zIndex: 100 }}>
                    <p className="bdt-dropdown-label">Filter by Status</p>
                    {STATUS_FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`bdt-dropdown-option ${filterStatus === opt.value ? 'selected' : ''}`}
                        onClick={() => { setFilterStatus(opt.value); setShowStatusFilter(false); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Business Type Filter */}
              <div className="bdt-toolbar-wrap">
                <button
                  type="button"
                  className={`gsc-toolbar-btn ${showTypeFilter ? 'active' : ''}`}
                  onClick={() => { setShowTypeFilter((v) => !v); setShowStatusFilter(false); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h10M4 18h6" />
                  </svg>
                  Business Type{filterType ? `: ${getBusinessTypeLabel(filterType)}` : ''}
                </button>
                {showTypeFilter && (
                  <div className="bdt-dropdown-panel" style={{ zIndex: 100 }}>
                    <p className="bdt-dropdown-label">Filter by Business Type</p>
                    {TYPE_FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`bdt-dropdown-option ${filterType === opt.value ? 'selected' : ''}`}
                        onClick={() => { setFilterType(opt.value); setShowTypeFilter(false); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="gsc-datatable-toolbar-right">
            <div className="gsc-toolbar-search">
              <input
                type="search"
                placeholder="Search leads by name, email, phone, city..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search waitlist leads"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          </div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <p className="empty-state">Loading waitlist leads...</p>
        ) : filteredLeads.length === 0 ? (
          <p className="empty-state">
            {leads.length === 0 ? 'No waitlist registrations found.' : 'No leads match the selected filter/search criteria.'}
          </p>
        ) : (
          <div className="table-shell business-table-shell">
            <table className="admin-table users-table business-datatable">
              <thead>
                <tr>
                  <th className="bdt-checkbox-col">
                    <input type="checkbox" className="select-checkbox" disabled />
                  </th>
                  <th>Sr No</th>
                  <th>Name</th>
                  <th>Contact Details</th>
                  <th>City</th>
                  <th>Business Type</th>
                  <th>Status</th>
                  <th>Admin Notes</th>
                  <th>Signup Date</th>
                  <th className="table-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedLeads.items.map((lead, idx) => (
                  <tr key={lead.id}>
                    <td className="bdt-checkbox-col">
                      <input type="checkbox" className="select-checkbox" disabled />
                    </td>
                    <td>{pagedLeads.start + idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{lead.name}</div>
                    </td>
                    <td>
                      <div>
                        <a href={`tel:${lead.phone}`} className="bdt-phone-link" style={{ display: 'block', fontSize: 13, marginBottom: 2 }}>
                          {lead.phone}
                        </a>
                        <span style={{ fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all' }}>{lead.email}</span>
                      </div>
                    </td>
                    <td>{lead.city}</td>
                    <td>{getBusinessTypeLabel(lead.businessType)}</td>
                    <td>
                      <span className={`status-pill ${getStatusPillClass(lead.status)}`}>
                        {getStatusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="bdt-email-cell" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.notes || <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td>{formatDateTime(lead.createdAt)}</td>
                    <td className="table-actions">
                      <div className="table-action-group">
                        <TableRowActionMenu
                          rowId={lead.id}
                          openRowId={openActionRowId}
                          onToggle={setOpenActionRowId}
                          actions={getRowActions(lead)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="bv-table-footer">
              <div className="table-record-count">
                <span>
                  Showing {pagedLeads.totalItems ? pagedLeads.start + 1 : 0}–{pagedLeads.end} of {filteredLeads.length} leads
                </span>
                {(query || filterStatus || filterType) && (
                  <span className="bdt-no-more">Filtered from {leads.length} total</span>
                )}
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
                    disabled={pagedLeads.page === 0 || isLoading}
                    onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  >
                    {'< Prev'}
                  </button>
                  <span>Page {pagedLeads.page + 1} / {pagedLeads.totalPages}</span>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={pagedLeads.page >= pagedLeads.totalPages - 1 || isLoading}
                    onClick={() => setPage((p) => Math.min(p + 1, Math.max(pagedLeads.totalPages - 1, 0)))}
                  >
                    {'Next >'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Notes Modal ────────────────────────────────────────────── */}
      {isNotesModalOpen && selectedLead && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal confirm-modal" style={{ maxWidth: 520 }}>
            <h3 className="panel-subheading">Lead Notes — {selectedLead.name}</h3>
            <p className="panel-subtitle" style={{ marginBottom: 16 }}>
              Add internal review notes, calling updates, or onboarding steps for this lead.
            </p>
            <textarea
              rows={5}
              value={leadNotes}
              onChange={(e) => setLeadNotes(e.target.value)}
              placeholder="e.g. Called on May 28. Interested in B2B catalog features. Plan to schedule demo..."
              style={{ width: '100%', padding: '12px', border: '1px solid var(--line)', borderRadius: '8px', outline: 'none', resize: 'vertical' }}
            />
            <div className="form-actions" style={{ marginTop: 20 }}>
              <button type="button" className="ghost-btn" onClick={() => setIsNotesModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleSaveNotes}>
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WaitlistLeadsPage;
