import React, { useEffect, useState, useCallback } from 'react';
import { Banner } from '../components';
import {
  fetchSupportTickets,
  fetchSupportTicketStats,
  updateSupportTicketStatus
} from '../services/adminApi';

/* ── Helpers ─────────────────────────────────────────────────── */

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const getStatusPillStyle = (status) => {
  const s = String(status || '').trim().toUpperCase();
  switch (s) {
    case 'OPEN':
      return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
    case 'ASSIGNED':
      return { background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' };
    case 'IN_PROGRESS':
      return { background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' };
    case 'WAITING_FOR_CUSTOMER':
      return { background: '#ffedd5', color: '#9a3412', border: '1px solid #fed7aa' };
    case 'RESOLVED':
      return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
    case 'CLOSED':
      return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    default:
      return { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
  }
};

const getSubjectBadgeStyle = (subject) => {
  const sub = String(subject || '').trim().toLowerCase();
  if (sub.includes('demo')) {
    return { background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' };
  }
  if (sub.includes('technical') || sub.includes('tech')) {
    return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
  }
  if (sub.includes('billing') || sub.includes('payment')) {
    return { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' };
  }
  if (sub.includes('partner')) {
    return { background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' };
  }
  if (sub.includes('general')) {
    return { background: '#e0f2fe', color: '#075985', border: '1px solid #bae6fd' };
  }
  return { background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' };
};

const getPriorityPillStyle = (priority) => {
  const p = String(priority || '').trim().toUpperCase();
  switch (p) {
    case 'URGENT':
      return { background: '#ffe4e6', color: '#9f1239', fontWeight: '800' };
    case 'HIGH':
      return { background: '#fee2e2', color: '#b91c1c', fontWeight: '750' };
    case 'MEDIUM':
      return { background: '#fef3c7', color: '#b45309', fontWeight: '700' };
    case 'LOW':
    default:
      return { background: '#f1f5f9', color: '#64748b', fontWeight: '600' };
  }
};

const SUBJECT_OPTIONS = [
  'General Enquiry',
  'Product Demo Request',
  'Technical Support',
  'Billing & Payments',
  'Partnership Opportunity',
  'Other'
];

const STATUS_TABS = [
  { key: '', label: 'All Tickets' },
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' }
];

function SupportPage({ token }) {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: 'info', text: '' });

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Selected Ticket Drawer
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [priorityUpdate, setPriorityUpdate] = useState('');
  const [assignedToUpdate, setAssignedToUpdate] = useState('');
  const [adminNotesUpdate, setAdminNotesUpdate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        fetchSupportTickets(token, {
          status: statusFilter || undefined,
          subject: subjectFilter || undefined,
          search: search || undefined,
          page,
          size: pageSize
        }),
        fetchSupportTicketStats(token)
      ]);

      const rawData = ticketsRes?.data !== undefined ? ticketsRes.data : ticketsRes;
      let ticketList = [];
      let total = 0;
      let pages = 1;

      if (Array.isArray(rawData)) {
        ticketList = rawData;
        total = rawData.length;
      } else if (rawData && Array.isArray(rawData.content)) {
        ticketList = rawData.content;
        total = rawData.totalElements !== undefined ? rawData.totalElements : rawData.content.length;
        pages = rawData.totalPages !== undefined ? rawData.totalPages : 1;
      } else if (Array.isArray(ticketsRes)) {
        ticketList = ticketsRes;
        total = ticketsRes.length;
      }

      setTickets(ticketList);
      setTotalElements(total);
      setTotalPages(pages);

      if (statsRes?.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.warn('Backend tickets API error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to fetch support tickets.' });
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, subjectFilter, search, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenTicketDrawer = (ticket) => {
    setSelectedTicket(ticket);
    setStatusUpdate(ticket.status || 'OPEN');
    setPriorityUpdate(ticket.priority || 'MEDIUM');
    setAssignedToUpdate(ticket.assignedTo || '');
    setAdminNotesUpdate(ticket.adminNotes || '');
    setIsDrawerOpen(true);
  };

  const handleSaveTicketChanges = async () => {
    if (!selectedTicket?.id) return;
    setIsSaving(true);
    try {
      const payload = {
        status: statusUpdate,
        priority: priorityUpdate,
        assignedTo: assignedToUpdate,
        adminNotes: adminNotesUpdate
      };

      const res = await updateSupportTicketStatus(token, selectedTicket.id, payload);
      if (res?.data) {
        setMessage({ type: 'success', text: `Ticket #${selectedTicket.ticketNumber} updated successfully.` });
        setSelectedTicket(res.data);
        setIsDrawerOpen(false);
        loadData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update ticket.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      
      {/* Header */}
      <div className="panel-head" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="panel-title" style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0' }}>
            Support & Helpdesk Tickets
          </h2>
          <p className="panel-subtitle" style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
            Manage customer inquiries, website contact requests, support tickets, and response status.
          </p>
        </div>
        <button 
          onClick={loadData}
          className="button outline"
          style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
        >
          🔄 Refresh
        </button>
      </div>

      {message.text && (
        <div style={{ marginBottom: '20px' }}>
          <Banner type={message.type} onDismiss={() => setMessage({ type: 'info', text: '' })}>
            {message.text}
          </Banner>
        </div>
      )}

      {/* Stats Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="panel card" style={{ padding: '18px 20px', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: 'white' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Tickets</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', marginTop: '6px' }}>{stats.total}</div>
        </div>
        <div className="panel card" style={{ padding: '18px 20px', borderRadius: '14px', border: '1.5px solid #fde68a', background: '#fffbeb' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Open Tickets</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#b45309', marginTop: '6px' }}>{stats.open}</div>
        </div>
        <div className="panel card" style={{ padding: '18px 20px', borderRadius: '14px', border: '1.5px solid #bfdbfe', background: '#eff6ff' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>In Progress</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#2563eb', marginTop: '6px' }}>{stats.inProgress}</div>
        </div>
        <div className="panel card" style={{ padding: '18px 20px', borderRadius: '14px', border: '1.5px solid #bbf7d0', background: '#f0fdf4' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resolved</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#16a34a', marginTop: '6px' }}>{stats.resolved}</div>
        </div>
        <div className="panel card" style={{ padding: '18px 20px', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Closed</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#64748b', marginTop: '6px' }}>{stats.closed}</div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="panel card" style={{ borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', padding: '24px' }}>
        
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(0); }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  border: 'none',
                  background: isActive ? '#4f46e5' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#475569',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Subject Dropdown Filter */}
        <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <input
              type="text"
              placeholder="🔍 Search by name, email, phone, ticket ID, or subject..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13.5px',
                outline: 'none'
              }}
            />
          </div>

          {/* Prominent Subject Filter */}
          <div style={{ minWidth: '220px' }}>
            <select
              value={subjectFilter}
              onChange={(e) => { setSubjectFilter(e.target.value); setPage(0); }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: '700',
                color: '#1e293b',
                background: '#ffffff',
                outline: 'none'
              }}
            >
              <option value="">📂 All Subjects</option>
              {SUBJECT_OPTIONS.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tickets Table */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <p style={{ fontSize: '15px', fontWeight: '700' }}>Loading support tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎫</div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>No Support Tickets Found</h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
              {search || statusFilter || subjectFilter 
                ? 'Try clearing the search or filters to see all tickets.' 
                : 'New inquiries and contact form submissions from the website will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '800', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 16px' }}>Ticket #</th>
                  <th style={{ padding: '14px 16px' }}>Customer</th>
                  <th style={{ padding: '14px 16px' }}>Subject</th>
                  <th style={{ padding: '14px 16px' }}>Message Preview</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px' }}>Priority</th>
                  <th style={{ padding: '14px 16px' }}>Date</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const subjectBadge = getSubjectBadgeStyle(ticket.subject);
                  const statusPill = getStatusPillStyle(ticket.status);
                  const priorityPill = getPriorityPillStyle(ticket.priority);

                  return (
                    <tr key={ticket.id || ticket.ticketNumber} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                      
                      {/* Ticket # & Source */}
                      <td style={{ padding: '14px 16px', fontWeight: '800', color: '#4f46e5' }}>
                        <div>{ticket.ticketNumber}</div>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                          {ticket.source === 'WEBSITE_CONTACT' ? '🌐 Website Contact' : ticket.source}
                        </span>
                      </td>

                      {/* Customer Name, Email, Phone */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a' }}>{ticket.name}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>{ticket.email}</div>
                        {ticket.phone && (
                          <div style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>📞 {ticket.phone}</div>
                        )}
                      </td>

                      {/* PROMINENT SUBJECT BADGE */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '100px',
                          fontSize: '11.5px',
                          fontWeight: '800',
                          ...subjectBadge
                        }}>
                          {ticket.subject}
                        </span>
                      </td>

                      {/* Message Preview */}
                      <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                        <div style={{
                          fontSize: '12.5px',
                          color: '#475569',
                          lineHeight: '1.4',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {ticket.message}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '800',
                          ...statusPill
                        }}>
                          {ticket.status}
                        </span>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          ...priorityPill
                        }}>
                          {ticket.priority || 'MEDIUM'}
                        </span>
                      </td>

                      {/* Created At */}
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDateTime(ticket.createdAt)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenTicketDrawer(ticket)}
                          style={{
                            background: '#4f46e5',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.2)'
                          }}
                        >
                          View & Update
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Showing {tickets.length} of {totalElements} tickets
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="button outline"
              style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', cursor: page === 0 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '13px', fontWeight: '700' }}>
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="button outline"
              style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>

      </div>

      {/* Ticket Details & Status Update Modal/Drawer */}
      {isDrawerOpen && selectedTicket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            padding: '30px'
          }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Support Ticket
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '2px 0 0 0' }}>
                  {selectedTicket.ticketNumber}
                </h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* SUBJECT CARD */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
                Subject / Category
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontWeight: '800',
                  ...getSubjectBadgeStyle(selectedTicket.subject)
                }}>
                  {selectedTicket.subject}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Source: <strong>{selectedTicket.source}</strong>
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Customer Name</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{selectedTicket.name}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Email Address</div>
                <a href={`mailto:${selectedTicket.email}`} style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', textDecoration: 'none' }}>
                  {selectedTicket.email}
                </a>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Phone Number</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                  {selectedTicket.phone ? (
                    <a href={`tel:${selectedTicket.phone}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                      {selectedTicket.phone}
                    </a>
                  ) : '-'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Submitted Date</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  {formatDateTime(selectedTicket.createdAt)}
                </div>
              </div>
            </div>

            {/* Message Box */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                Customer Message
              </div>
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '13.5px',
                color: '#1e293b',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedTicket.message}
              </div>
            </div>

            {/* Status & Priority Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  Update Status
                </label>
                <select
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}
                >
                  <option value="OPEN">OPEN</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  Priority
                </label>
                <select
                  value={priorityUpdate}
                  onChange={(e) => setPriorityUpdate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
            </div>

            {/* Assigned Agent */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                Assigned Agent / Staff
              </label>
              <input
                type="text"
                placeholder="e.g. Support Team / Agent Name"
                value={assignedToUpdate}
                onChange={(e) => setAssignedToUpdate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px'
                }}
              />
            </div>

            {/* Admin Internal Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                Admin Internal Notes / Resolution Remarks
              </label>
              <textarea
                placeholder="Add internal remarks, action taken, resolution steps..."
                rows={3}
                value={adminNotesUpdate}
                onChange={(e) => setAdminNotesUpdate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="button outline"
                style={{ padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTicketChanges}
                disabled={isSaving}
                style={{
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  padding: '9px 22px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving ? 'Saving...' : 'Save Ticket Updates'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default SupportPage;
