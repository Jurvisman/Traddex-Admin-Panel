import { useEffect, useState, useMemo, useCallback } from 'react';
import { Banner, TableRowActionMenu, DataTable } from '../components';
import {
  fetchWaitlistLeads,
  updateWaitlistLeadStatus,
  updateWaitlistLeadNotes,
} from '../services/adminApi';

/* ── Helpers ─────────────────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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
      const leadsRes = await fetchWaitlistLeads(token);
      setLeads(leadsRes?.data || leadsRes || []);
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
  const getRowActions = useCallback((lead) => {
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
  }, [handleUpdateStatus, handleOpenDrawer]);

  /* ── Unified Columns Definition ──────────────────────────────── */
  const columns = useMemo(() => [
    {
      key: 'registrationNumber',
      header: 'Reg ID',
      sortable: true,
      render: (_, lead) => (
        <span className="bdt-name-link" style={{ fontWeight: 700 }}>
          {lead.registrationNumber || `WL-${String(lead.id).padStart(4, '0')}`}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (_, lead) => <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{lead.name}</div>,
    },
    {
      key: 'phone',
      header: 'Contact Details',
      render: (_, lead) => (
        <div>
          <a href={`tel:${lead.phone}`} className="bdt-phone-link" style={{ display: 'block', fontSize: 13, marginBottom: 2 }}>
            {lead.phone}
          </a>
          <span style={{ fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all' }}>{lead.email}</span>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'City & State',
      render: (_, lead) => `${lead.city || '-'}${lead.state ? `, ${lead.state}` : ''}`,
    },
    {
      key: 'businessType',
      header: 'Business Type',
      render: (_, lead) => getBusinessTypeLabel(lead.businessType),
    },
    {
      key: 'selectedPlanName',
      header: 'Plan',
      render: (_, lead) => (
        <span className="purple-badge" style={{ fontSize: 11.5, padding: '3px 8px', borderRadius: 6, background: '#f5f3ff', color: '#6d28d9', fontWeight: 600 }}>
          {lead.selectedPlanName || 'Default Plan'}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (_, lead) => (
        <span className={`status-chip ${String(lead.paymentStatus).toUpperCase() === 'PAID' ? 'login' : 'pending'}`}>
          {lead.paymentStatus || 'UNPAID'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_, lead) => (
        <span className={`status-chip ${getStatusPillClass(lead.status)}`}>
          {getStatusLabel(lead.status)}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Admin Notes',
      render: (_, lead) => (
        <span style={{ fontSize: 12, color: lead.notes ? 'var(--ink)' : 'var(--muted)', maxWidth: 160, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lead.notes || ''}>
          {lead.notes || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Signup Date',
      sortable: true,
      render: (_, lead) => formatDateTime(lead.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, lead) => (
        <div className="table-actions" onClick={(e) => e.stopPropagation()}>
          <TableRowActionMenu
            rowId={lead.id}
            openRowId={openActionRowId}
            onToggle={setOpenActionRowId}
            actions={getRowActions(lead)}
          />
        </div>
      ),
    },
  ], [openActionRowId]);
  return (
    <div className="users-page business-page">
      <Banner message={message} />

      {/* ── Status Counters ───────────────────────── */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: '1 1 300px', display: 'flex', gap: 12, alignItems: 'center', margin: 0, flexWrap: 'wrap' }}>
          <span className="status-chip pending" style={{ padding: '16px 20px', flex: '1 1 140px', textAlign: 'center', margin: 0 }}>{statusCounts.PENDING} Pending</span>
          <span className="status-chip changes-required" style={{ padding: '16px 20px', flex: '1 1 140px', textAlign: 'center', margin: 0 }}>{statusCounts.CALLED} Called</span>
          <span className="status-chip changes-required" style={{ padding: '16px 20px', flex: '1 1 140px', textAlign: 'center', margin: 0 }}>{statusCounts.SETUP_IN_PROGRESS} Setup</span>
          <span className="status-chip login" style={{ padding: '16px 20px', flex: '1 1 140px', textAlign: 'center', margin: 0 }}>{statusCounts.ONBOARDED} Onboarded</span>
        </div>
      </div>

      {/* ── Unified DataTable ─────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={filteredLeads}
        isLoading={isLoading}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search leads by ID, name, city, phone..."
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onRowClick={handleOpenDrawer}
        emptyTitle="No waitlist leads found"
        emptyDescription={leads.length === 0 ? "No waitlist registrations have been received yet." : "No leads match your selected filter criteria."}
        toolbarLeft={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <div className="bdt-toolbar-wrap" style={{ position: 'relative' }}>
              <button
                type="button"
                className={`gsc-toolbar-btn ${showStatusFilter ? 'active' : ''}`}
                onClick={() => { setShowStatusFilter((v) => !v); setShowTypeFilter(false); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                  <path d="M4 6h16M4 12h10M4 18h6" />
                </svg>
                Status{filterStatus ? `: ${getStatusLabel(filterStatus)}` : ''}
              </button>
              {showStatusFilter && (
                <div className="bdt-dropdown-panel" style={{ zIndex: 100, position: 'absolute', top: '100%', left: 0, marginTop: 4 }}>
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
            <div className="bdt-toolbar-wrap" style={{ position: 'relative' }}>
              <button
                type="button"
                className={`gsc-toolbar-btn ${showTypeFilter ? 'active' : ''}`}
                onClick={() => { setShowTypeFilter((v) => !v); setShowStatusFilter(false); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                  <path d="M4 6h16M4 12h10M4 18h6" />
                </svg>
                Business Type{filterType ? `: ${getBusinessTypeLabel(filterType)}` : ''}
              </button>
              {showTypeFilter && (
                <div className="bdt-dropdown-panel" style={{ zIndex: 100, position: 'absolute', top: '100%', left: 0, marginTop: 4 }}>
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
        }
      />

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

            <div className="drawer-content" style={{ padding: '20px 24px' }}>
              {/* Status Header Banner */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px 20px', borderRadius: 14, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Current Status</span>
                  <span className={`status-pill ${getStatusPillClass(selectedLead.status)}`} style={{ fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                    {getStatusLabel(selectedLead.status)}
                  </span>
                </div>
                
                {/* Status action shortcuts */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {String(selectedLead.status).toUpperCase() === 'PENDING' && (
                    <>
                      <button onClick={() => handleUpdateStatus(selectedLead.id, 'CALLED')} className="secondary-btn" style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 8, cursor: 'pointer' }}>Mark Called</button>
                      <button onClick={() => handleUpdateStatus(selectedLead.id, 'ONBOARDED')} className="secondary-btn" style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', borderRadius: 8, cursor: 'pointer' }}>Mark Onboarded</button>
                    </>
                  )}
                  {String(selectedLead.status).toUpperCase() === 'CALLED' && (
                    <>
                      <button onClick={() => handleUpdateStatus(selectedLead.id, 'ONBOARDED')} className="secondary-btn" style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', borderRadius: 8, cursor: 'pointer' }}>Mark Onboarded</button>
                      <button onClick={() => handleUpdateStatus(selectedLead.id, 'PENDING')} className="secondary-btn" style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', borderRadius: 8, cursor: 'pointer' }}>Reset</button>
                    </>
                  )}
                  {String(selectedLead.status).toUpperCase() === 'ONBOARDED' && (
                    <button onClick={() => handleUpdateStatus(selectedLead.id, 'PENDING')} className="secondary-btn" style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', borderRadius: 8, cursor: 'pointer' }}>Reset to Pending</button>
                  )}
                </div>
              </div>

              {/* 2-Column Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Contact Information Group */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                    👤 Contact Details
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Contact Name</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{selectedLead.name || '-'}</span>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Phone Number</span>
                    <a href={`tel:${selectedLead.phone}`} style={{ fontSize: 14, fontWeight: 600, color: '#2563EB', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      📞 {selectedLead.phone || '-'}
                    </a>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Business Email</span>
                    <a href={`mailto:${selectedLead.email}`} style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', textDecoration: 'none', wordBreak: 'break-all' }}>
                      ✉️ {selectedLead.email || '-'}
                    </a>
                  </div>

                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>State & City / Area</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                      📍 {selectedLead.city || '-'}{selectedLead.state ? `, ${selectedLead.state}` : ''}
                    </span>
                  </div>
                </div>

                {/* Plan & Lead Source Group */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                    🏢 Business & Plan Info
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Business Segment</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>🏬 {getBusinessTypeLabel(selectedLead.businessType)}</span>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Selected Plan</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                      {selectedLead.selectedPlanName || 'Starter'}
                    </span>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Pricing Source</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{selectedLead.source || 'WEBSITE_WAITLIST'}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Registered Date</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>📅 {formatDateTime(selectedLead.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Notes Area */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>
                  📝 Lead Notes & Interaction History
                </label>
                <textarea
                  rows={5}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Record calling feedback, B2B/B2C interest, package discussed, or demo timing details here..."
                  style={{ width: '100%', padding: '12px 14px', border: '1px solid #CBD5E1', borderRadius: 10, outline: 'none', resize: 'vertical', fontSize: 13, fontFamily: 'inherit', color: '#0F172A', background: '#F8FAFC', lineHeight: 1.5 }}
                />
                <button 
                  onClick={handleSaveNotes}
                  className="primary-btn"
                  style={{ marginTop: 12, width: '100%', padding: '10px 16px', fontSize: 13, fontWeight: 700, borderRadius: 10, cursor: 'pointer' }}
                >
                  Save Lead Notes
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
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          justify-content: flex-end;
        }
        .waitlist-drawer {
          width: 100%;
          max-width: 580px;
          background: white;
          height: 100%;
          box-shadow: -10px 0 30px -5px rgba(0,0,0,0.18);
          display: flex;
          flex-direction: column;
          animation: slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>
    </div>
  );
}

export default WaitlistLeadsPage;
