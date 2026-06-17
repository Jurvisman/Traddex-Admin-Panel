import { useEffect, useState, useMemo, useCallback } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import {
  fetchWaitlistLeads,
  updateWaitlistLeadStatus,
  updateWaitlistLeadNotes,
  fetchWaitlistConfig,
  updateWaitlistConfigLimit,
} from '../services/adminApi';

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
  if (s === 'SETUP_IN_PROGRESS') return 'under-review';
  if (s === 'CALLED') return 'under-review';     // blue
  if (s === 'PENDING') return 'pending-review';  // yellow
  return 'pending';
};

const getStatusLabel = (status) => {
  const s = String(status || '').trim().toUpperCase();
  if (s === 'ONBOARDED') return 'Onboarded';
  if (s === 'SETUP_IN_PROGRESS') return 'Setup In Progress';
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
  { value: 'SETUP_IN_PROGRESS', label: 'Setup In Progress' },
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

  /* ── Config limit state ──────────────────────────────────────── */
  const [config, setConfig] = useState({ totalLeads: 0, maxFreeLimit: 100, spotsLeft: 100, isLocked: false });
  const [editLimit, setEditLimit] = useState('');
  const [isEditingLimit, setIsEditingLimit] = useState(false);

  /* ── Table state ─────────────────────────────────────────────── */
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [openActionRowId, setOpenActionRowId] = useState(null);

  /* ── Details drawer state ────────────────────────────────────── */
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [leadNotes, setLeadNotes] = useState('');

  /* ── Load data ───────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [leadsRes, configRes] = await Promise.all([
        fetchWaitlistLeads(token),
        fetchWaitlistConfig(token),
      ]);
      setLeads(leadsRes?.data || leadsRes || []);
      
      const configData = configRes?.data || configRes || { totalLeads: 0, maxFreeLimit: 100, spotsLeft: 100, isLocked: false };
      setConfig(configData);
      setEditLimit(String(configData.maxFreeLimit || 100));
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch waitlist data.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Action Handlers ─────────────────────────────────────────── */
  const handleUpdateStatus = async (id, status) => {
    try {
      await updateWaitlistLeadStatus(token, id, status);
      setMessage({ type: 'success', text: `Lead status updated to ${getStatusLabel(status)}.` });
      
      // If updating status for currently selected lead in drawer, reflect changes
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(prev => ({ ...prev, status }));
      }
      
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update status.' });
    }
  };

  const handleOpenDrawer = (lead) => {
    setSelectedLead(lead);
    setLeadNotes(lead.notes || '');
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedLead(null);
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    try {
      await updateWaitlistLeadNotes(token, selectedLead.id, leadNotes);
      setMessage({ type: 'success', text: 'Lead notes updated successfully.' });
      
      // Reflect change in drawer selected state
      setSelectedLead(prev => ({ ...prev, notes: leadNotes }));
      
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save notes.' });
    }
  };

  const handleSaveConfigLimit = async (e) => {
    e.preventDefault();
    const limitNum = parseInt(editLimit, 10);
    if (isNaN(limitNum) || limitNum < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid spot limit.' });
      return;
    }
    try {
      await updateWaitlistConfigLimit(token, limitNum);
      setMessage({ type: 'success', text: `Free onboarding spots limit updated to ${limitNum}!` });
      setIsEditingLimit(false);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update spot limit.' });
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
        (l.city || '').toLowerCase().includes(q) ||
        (l.registrationNumber || '').toLowerCase().includes(q)
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
    const counts = { PENDING: 0, CALLED: 0, SETUP_IN_PROGRESS: 0, ONBOARDED: 0 };
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
      actions.push({ label: 'Start Setup', onClick: () => handleUpdateStatus(lead.id, 'SETUP_IN_PROGRESS') });
      actions.push({ label: 'Mark as Onboarded', onClick: () => handleUpdateStatus(lead.id, 'ONBOARDED') });
    } else if (s === 'CALLED') {
      actions.push({ label: 'Start Setup', onClick: () => handleUpdateStatus(lead.id, 'SETUP_IN_PROGRESS') });
      actions.push({ label: 'Mark as Onboarded', onClick: () => handleUpdateStatus(lead.id, 'ONBOARDED') });
      actions.push({ label: 'Move back to Pending', onClick: () => handleUpdateStatus(lead.id, 'PENDING') });
    } else if (s === 'SETUP_IN_PROGRESS') {
      actions.push({ label: 'Mark as Onboarded', onClick: () => handleUpdateStatus(lead.id, 'ONBOARDED') });
      actions.push({ label: 'Move back to Pending', onClick: () => handleUpdateStatus(lead.id, 'PENDING') });
    } else if (s === 'ONBOARDED') {
      actions.push({ label: 'Move back to Pending', onClick: () => handleUpdateStatus(lead.id, 'PENDING') });
    }

    actions.push({ label: 'Open Details', onClick: () => handleOpenDrawer(lead) });
    return actions;
  };

  return (
    <div className="users-page business-page">
      <Banner message={message} />

      {/* ── Top Config Card & Status Counters ───────────────────────── */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Spot configuration panel */}
        <div className="panel card" style={{ flex: '1 1 360px', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Free Onboarding Campaign</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>{leads.length}</span>
              <span style={{ color: 'var(--muted)' }}>/</span>
              {isEditingLimit ? (
                <form onSubmit={handleSaveConfigLimit} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number"
                    value={editLimit}
                    onChange={(e) => setEditLimit(e.target.value)}
                    style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 16, fontWeight: 700 }}
                    min="0"
                    required
                  />
                  <button type="submit" className="primary-btn" style={{ padding: '6px 12px', fontSize: 12 }}>Save</button>
                  <button type="button" className="ghost-btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setIsEditingLimit(false)}>Cancel</button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>{config.maxFreeLimit}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>spots limit</span>
                  <button 
                    onClick={() => { setEditLimit(String(config.maxFreeLimit)); setIsEditingLimit(true); }}
                    className="ghost-btn"
                    style={{ padding: '2px 8px', fontSize: 11, background: '#f1f5f9', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              {config.isLocked ? (
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>🔒 Hype Locked (Spot limit fully claimed on landing page)</span>
              ) : (
                <span style={{ color: '#16a34a', fontWeight: 600 }}>🔓 Active (Only {config.spotsLeft} free spots left!)</span>
              )}
            </div>
          </div>
        </div>

        {/* Counter chips */}
        <div style={{ flex: '1 1 300px', display: 'flex', gap: 12, alignItems: 'center', margin: 0 }}>
          <span className="status-chip pending" style={{ padding: '16px 20px', flex: 1, textAlign: 'center', margin: 0 }}>{statusCounts.PENDING} Pending</span>
          <span className="status-chip changes-required" style={{ padding: '16px 20px', flex: 1, textAlign: 'center', margin: 0 }}>{statusCounts.CALLED} Called</span>
          <span className="status-chip changes-required" style={{ padding: '16px 20px', flex: 1, textAlign: 'center', margin: 0 }}>{statusCounts.SETUP_IN_PROGRESS} Setup</span>
          <span className="status-chip login" style={{ padding: '16px 20px', flex: 1, textAlign: 'center', margin: 0 }}>{statusCounts.ONBOARDED} Onboarded</span>
        </div>
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
                placeholder="Search leads by ID, name, city, phone..."
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
                  <th>Reg ID</th>
                  <th>Name</th>
                  <th>Contact Details</th>
                  <th>City</th>
                  <th>Business Type</th>
                  <th>Plan</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Admin Notes</th>
                  <th>Signup Date</th>
                  <th className="table-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedLeads.items.map((lead, idx) => (
                  <tr key={lead.id} style={{ cursor: 'pointer' }} onClick={(e) => {
                    // Prevent drawer from opening when clicking row actions checkbox or menu buttons
                    if (e.target.closest('.table-actions') || e.target.closest('.bdt-checkbox-col') || e.target.closest('a')) return;
                    handleOpenDrawer(lead);
                  }}>
                    <td className="bdt-checkbox-col">
                      <input type="checkbox" className="select-checkbox" disabled />
                    </td>
                    <td>
                      <span className="bdt-name-link" style={{ fontWeight: 700 }}>
                        {lead.registrationNumber || `WL-${String(lead.id).padStart(4, '0')}`}
                      </span>
                    </td>
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
                      {lead.selectedPlanName || <span style={{ color: '#cbd5e1' }}>-</span>}
                      {lead.source ? <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{lead.source}</span> : null}
                    </td>
                    <td>
                      {lead.paymentStatus || <span style={{ color: '#cbd5e1' }}>-</span>}
                      {lead.couponCode ? <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{lead.couponCode}</span> : null}
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusPillClass(lead.status)}`}>
                        {getStatusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="bdt-email-cell" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

      {/* ── Slide-in Details Drawer ─────────────────────────────────── */}
      {isDrawerOpen && selectedLead && (
        <div className="waitlist-drawer-backdrop" onClick={handleCloseDrawer}>
          <div className="waitlist-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Lead Details</span>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: '4px 0 0' }}>
                  {selectedLead.registrationNumber || `WL-${String(selectedLead.id).padStart(4, '0')}`}
                </h2>
              </div>
              <button 
                onClick={handleCloseDrawer}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            <div className="drawer-content">
              {/* Status Section */}
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Current Status</span>
                  <span className={`status-pill ${getStatusPillClass(selectedLead.status)}`} style={{ marginTop: 6, display: 'inline-block', fontSize: 13, padding: '4px 10px' }}>
                    {getStatusLabel(selectedLead.status)}
                  </span>
                </div>
                
                {/* Status action shortcuts */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {String(selectedLead.status).toUpperCase() === 'PENDING' && (
                    <>
                      <button onClick={() => handleUpdateStatus(selectedLead.id, 'CALLED')} className="secondary-btn" style={{ padding: '6px 10px', fontSize: 12, background: '#eff6ff', color: '#1d4ed8', border: 'none' }}>Called</button>
                      <button onClick={() => handleUpdateStatus(selectedLead.id, 'ONBOARDED')} className="secondary-btn" style={{ padding: '6px 10px', fontSize: 12, background: '#f0fdf4', color: '#166534', border: 'none' }}>Onboard</button>
                    </>
                  )}
                  {String(selectedLead.status).toUpperCase() === 'CALLED' && (
                    <>
                      <button onClick={() => handleUpdateStatus(selectedLead.id, 'ONBOARDED')} className="secondary-btn" style={{ padding: '6px 10px', fontSize: 12, background: '#f0fdf4', color: '#166534', border: 'none' }}>Onboard</button>
                      <button onClick={() => handleUpdateStatus(selectedLead.id, 'PENDING')} className="secondary-btn" style={{ padding: '6px 10px', fontSize: 12, background: '#fffbeb', color: '#b45309', border: 'none' }}>Reset</button>
                    </>
                  )}
                  {String(selectedLead.status).toUpperCase() === 'ONBOARDED' && (
                    <button onClick={() => handleUpdateStatus(selectedLead.id, 'PENDING')} className="secondary-btn" style={{ padding: '6px 10px', fontSize: 12, background: '#fffbeb', color: '#b45309', border: 'none' }}>Reset to Pending</button>
                  )}
                </div>
              </div>

              {/* Lead Details Grid */}
              <div className="drawer-field">
                <label>Contact Name</label>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{selectedLead.name}</div>
              </div>

              <div className="drawer-field">
                <label>Phone Number</label>
                <div>
                  <a href={`tel:${selectedLead.phone}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                    📞 {selectedLead.phone}
                  </a>
                </div>
              </div>

              <div className="drawer-field">
                <label>Business Email</label>
                <div>
                  <a href={`mailto:${selectedLead.email}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                    ✉️ {selectedLead.email}
                  </a>
                </div>
              </div>

              <div className="drawer-field">
                <label>City / Location</label>
                <div>📍 {selectedLead.city}</div>
              </div>

              <div className="drawer-field">
                <label>Business Segment</label>
                <div>🏬 {getBusinessTypeLabel(selectedLead.businessType)}</div>
              </div>

              <div className="drawer-field">
                <label>Pricing Source</label>
                <div>{selectedLead.source || '-'}</div>
              </div>

              <div className="drawer-field">
                <label>Selected Plan</label>
                <div>{selectedLead.selectedPlanName || '-'}</div>
              </div>

              <div className="drawer-field">
                <label>Payment / Coupon</label>
                <div>{selectedLead.paymentStatus || '-'}{selectedLead.couponCode ? ` / ${selectedLead.couponCode}` : ''}</div>
              </div>

              <div className="drawer-field">
                <label>Registered Date</label>
                <div>📅 {formatDateTime(selectedLead.createdAt)}</div>
              </div>

              {/* Notes Area */}
              <div className="drawer-field" style={{ marginTop: 32 }}>
                <label>Lead Notes & Interaction History</label>
                <textarea
                  rows={6}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Record calling feedback, B2B/B2C interest, package discussed, or demo timing details here..."
                  style={{ width: '100%', padding: '12px', border: '1px solid var(--line)', borderRadius: '8px', outline: 'none', resize: 'vertical', fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)' }}
                />
                <button 
                  onClick={handleSaveNotes}
                  className="primary-btn"
                  style={{ marginTop: 10, width: '100%', padding: 10 }}
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Style overrides for slide-over drawer and spot configuration panel */}
      <style>{`
        .waitlist-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          justify-content: flex-end;
        }
        .waitlist-drawer {
          width: 100%;
          max-width: 480px;
          background: white;
          height: 100%;
          box-shadow: -10px 0 30px -5px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          animation: slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-header {
          padding: 24px;
          border-bottom: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .drawer-content {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        .drawer-field {
          margin-bottom: 20px;
        }
        .drawer-field label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .drawer-field div {
          font-size: 14px;
          color: var(--ink);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

export default WaitlistLeadsPage;
