import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { getAuditLogs } from '../services/adminApi';

const CATEGORIES = ['AUTH', 'AD', 'ORDER', 'SUBSCRIPTION', 'CONFIG', 'PERMISSION', 'EMPLOYEE', 'BUSINESS', 'SYSTEM'];

const CAT_COLORS = {
  AUTH:         { bg: '#eff6ff', color: '#2563eb' },
  AD:           { bg: '#f0fdf4', color: '#16a34a' },
  ORDER:        { bg: '#fff7ed', color: '#ea580c' },
  SUBSCRIPTION: { bg: '#faf5ff', color: '#7c3aed' },
  CONFIG:       { bg: '#fefce8', color: '#ca8a04' },
  PERMISSION:   { bg: '#fef2f2', color: '#dc2626' },
  EMPLOYEE:     { bg: '#f0f9ff', color: '#0284c7' },
  BUSINESS:     { bg: '#f0fdfa', color: '#0d9488' },
  SYSTEM:       { bg: '#f8fafc', color: '#64748b' },
};

const ACTION_COLORS = {
  APPROVED:           '#16a34a',
  CREATED:            '#16a34a',
  PROMOTED:           '#16a34a',
  ASSIGNED:           '#16a34a',
  LOGIN:              '#2563eb',
  REJECTED:           '#dc2626',
  DELETED:            '#dc2626',
  LOGIN_FAILED:       '#dc2626',
  EXPIRED:            '#6b7280',
  CONFIG_CHANGED:     '#ca8a04',
  PERMISSION_CHANGED: '#ca8a04',
  QUEUED:             '#f59e0b',
  UPDATED:            '#0284c7',
};

const formatDateTime = (val) => {
  if (!val) return '-';
  const d = new Date(val);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
};

const formatDetails = (details) => {
  if (!details) return '-';
  try {
    const obj = JSON.parse(details);
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
  } catch {
    return details;
  }
};

const downloadCSV = (logs) => {
  const headers = ['Timestamp', 'Actor', 'Role', 'Category', 'Action', 'Entity', 'Entity ID', 'Details', 'IP', 'Sensitive'];
  const rows = logs.map((l) => [
    formatDateTime(l.timestamp),
    l.actor_name || '-',
    l.actor_role || '-',
    l.category,
    l.action,
    l.entity_type || '-',
    l.entity_id || '-',
    formatDetails(l.details),
    l.ip_address || '-',
    l.is_sensitive ? 'Yes' : 'No',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

function AuditLogsPage({ token }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });

  // Filters
  const [category, setCategory] = useState('');
  const [actorSearch, setActorSearch] = useState('');
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const PAGE_SIZE = 50;

  const load = useCallback(async (p = 0) => {
    setIsLoading(true);
    try {
      const res = await getAuditLogs(token, {
        category: category || undefined,
        sensitiveOnly,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
        page: p,
        size: PAGE_SIZE,
      });
      setLogs(res?.data?.logs || []);
      setTotal(res?.data?.total || 0);
      setPage(p);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load logs.' });
    } finally {
      setIsLoading(false);
    }
  }, [token, category, sensitiveOnly, dateFrom, dateTo]);

  useEffect(() => { load(0); }, [load]);

  // Client-side actor name filter (since backend filters by ID)
  const filteredLogs = useMemo(() => {
    if (!actorSearch.trim()) return logs;
    const q = actorSearch.trim().toLowerCase();
    return logs.filter((l) => (l.actor_name || '').toLowerCase().includes(q));
  }, [logs, actorSearch]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Audit Logs</h2>
          <p className="panel-subtitle">Track every action taken by admins, employees, and the system.</p>
        </div>
        <button
          className="secondary-btn"
          onClick={() => downloadCSV(filteredLogs)}
          disabled={filteredLogs.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ↓ Export CSV
        </button>
      </div>

      <Banner message={message} />

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="panel card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>CATEGORY</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13 }}
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Actor search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>ACTOR</label>
            <input
              type="text"
              placeholder="Search by name…"
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13, width: 180 }}
            />
          </div>

          {/* Date From */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>FROM</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13 }} />
          </div>

          {/* Date To */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>TO</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13 }} />
          </div>

          {/* Sensitive toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', paddingBottom: 2 }}>
            <input type="checkbox" checked={sensitiveOnly} onChange={(e) => setSensitiveOnly(e.target.checked)} />
            ⚠️ Sensitive only
          </label>

          {/* Reset */}
          <button className="secondary-btn" style={{ padding: '6px 14px', fontSize: 13 }}
            onClick={() => { setCategory(''); setActorSearch(''); setSensitiveOnly(false); setDateFrom(''); setDateTo(''); }}>
            Reset
          </button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="panel card users-table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
          <p className="muted" style={{ fontSize: 13 }}>
            {isLoading ? 'Loading…' : `Showing ${filteredLogs.length} of ${total} logs`}
          </p>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="secondary-btn" style={{ padding: '4px 10px', fontSize: 12 }}
                disabled={page === 0} onClick={() => load(page - 1)}>← Prev</button>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Page {page + 1} / {totalPages}</span>
              <button className="secondary-btn" style={{ padding: '4px 10px', fontSize: 12 }}
                disabled={page >= totalPages - 1} onClick={() => load(page + 1)}>Next →</button>
            </div>
          )}
        </div>

        <div className="table-shell">
          {isLoading ? (
            <div className="empty-state"><p>Loading audit logs…</p></div>
          ) : filteredLogs.length === 0 ? (
            <div className="empty-state"><p>No logs found.</p></div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Category</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const catStyle = CAT_COLORS[log.category] || { bg: '#f8fafc', color: '#64748b' };
                  const actionColor = ACTION_COLORS[log.action] || '#374151';
                  return (
                    <tr key={log.id} style={log.is_sensitive ? { background: '#fffbeb' } : {}}>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#6b7280' }}>
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td>
                        <strong>{log.actor_name || '—'}</strong>
                        {log.is_sensitive && <span title="Sensitive action" style={{ marginLeft: 4 }}>⚠️</span>}
                      </td>
                      <td>
                        <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: 4 }}>
                          {log.actor_role || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, background: catStyle.bg, color: catStyle.color, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                          {log.category}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: actionColor }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {log.entity_type && <span>{log.entity_type}</span>}
                        {log.entity_id && <span className="muted"> #{log.entity_id}</span>}
                      </td>
                      <td style={{ fontSize: 12, color: '#6b7280', maxWidth: 280 }}>
                        <span title={log.details || ''}>{formatDetails(log.details)}</span>
                      </td>
                      <td style={{ fontSize: 11, color: '#9ca3af' }}>{log.ip_address || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditLogsPage;
