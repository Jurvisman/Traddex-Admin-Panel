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

const formatDateTime = (val) => {
  if (!val) return '-';
  const d = new Date(val);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

/* ── small helpers ── */
const StatusBadge = ({ cat }) => {
  const style = CAT_COLORS[cat] || { bg: '#f1f5f9', color: '#475569' };
  return (
    <span className="category-badge" style={{ background: style.bg, color: style.color }}>
      {cat}
    </span>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="mv-detail-row">
    <span className="mv-detail-label">{label}</span>
    <span className="mv-detail-value">{value ?? '-'}</span>
  </div>
);

function AuditLogsPage({ token }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters
  const [category, setCategory] = useState('');
  const [actorSearch, setActorSearch] = useState('');
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const PAGE_SIZE = 25;

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
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [token, category, sensitiveOnly, dateFrom, dateTo]);

  useEffect(() => { load(0); }, [load]);

  const stats = useMemo(() => {
    const sensitive = logs.filter(l => l.is_sensitive).length;
    return {
      totalToday: total,
      sensitiveToday: sensitive,
      uniqueActors: new Set(logs.map(l => l.actor_id)).size
    };
  }, [logs, total]);

  const filteredLogs = useMemo(() => {
    if (!actorSearch.trim()) return logs;
    const q = actorSearch.trim().toLowerCase();
    return logs.filter((l) => (l.actor_name || '').toLowerCase().includes(q));
  }, [logs, actorSearch]);

  const renderViewPanel = () => {
    if (!selectedLog) return null;

    let parsedDetails = {};
    try {
      parsedDetails = JSON.parse(selectedLog.details || '{}');
    } catch (e) {
      parsedDetails = { message: selectedLog.details };
    }

    const hasDiff = Object.values(parsedDetails).some(v => v && typeof v === 'object' && ('old' in v || 'new' in v));

    return (
      <div className="mv-panel card">
        {/* header */}
        <div className="mv-panel-header">
          <div className="mv-panel-title-row">
            <button type="button" className="mv-back-btn" onClick={() => setSelectedLog(null)}>
              ← Back
            </button>
            <h3 className="mv-panel-title">Detail Inspection</h3>
          </div>
        </div>

        {/* Actor Info */}
        <div className="mv-section">
          <p className="mv-section-label">Actor Info</p>
          <div className="mv-emp-avatar-row">
            <div className="mv-emp-avatar">{(selectedLog.actor_name || '?').charAt(0).toUpperCase()}</div>
            <div className="mv-emp-avatar-info">
              <strong>{selectedLog.actor_name || 'System'}</strong>
              <span>{selectedLog.actor_role}</span>
            </div>
          </div>
          <div className="mv-detail-grid" style={{ marginTop: 12 }}>
            <DetailRow label="IP Address" value={selectedLog.ip_address} />
            <DetailRow label="Timestamp" value={formatDateTime(selectedLog.timestamp)} />
          </div>
        </div>

        {/* Action Details */}
        <div className="mv-section">
          <p className="mv-section-label">Action Context</p>
          <div className="mv-detail-grid">
            <DetailRow label="Category" value={selectedLog.category} />
            <DetailRow label="Action" value={selectedLog.action} />
            <DetailRow label="Target" value={`${selectedLog.entity_type} (#${selectedLog.entity_id || 'N/A'})`} />
            <DetailRow label="Sensitive" value={selectedLog.is_sensitive ? 'Yes' : 'No'} />
          </div>
          <div style={{ marginTop: 12 }}>
            <DetailRow label="Request URL" value={selectedLog.request_url} />
            <DetailRow label="Method" value={selectedLog.request_method} />
          </div>
        </div>

        {/* User Agent */}
        <div className="mv-section">
          <p className="mv-section-label">User Agent</p>
          <p style={{ fontSize: 12, color: '#64748b', wordBreak: 'break-all', margin: 0 }}>
            {selectedLog.user_agent || 'Unknown'}
          </p>
        </div>

        {/* Data Changes */}
        <div className="mv-section">
          <p className="mv-section-label">Data Changes</p>
          {hasDiff ? (
            <div className="diff-box">
              <table className="diff-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Previous</th>
                    <th>New</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(parsedDetails).map(([key, val]) => {
                    // Handle new structured diff: { key: { old: ..., new: ... } }
                    if (val && typeof val === 'object' && 'old' in val && 'new' in val) {
                      return (
                        <tr key={key}>
                          <td>{key}</td>
                          <td className="val-old">{String(val.old ?? 'N/A')}</td>
                          <td className="val-new">{String(val.new ?? 'N/A')}</td>
                        </tr>
                      );
                    }
                    // Handle legacy flat diff (show as NEW)
                    return (
                      <tr key={key}>
                        <td>{key}</td>
                        <td className="val-old">-</td>
                        <td className="val-new">{String(val)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <pre style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 11, overflowX: 'auto', margin: 0 }}>
              {JSON.stringify(parsedDetails, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="audit-container">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Audit Sentinel</h2>
          <p className="panel-subtitle">Activity monitoring and security auditing for Deal 360.</p>
        </div>
      </div>

      <div className="audit-stats-grid">
        <div className="glass-card">
          <div className="stat-label">Total Events</div>
          <div className="stat-value">{stats.totalToday}</div>
        </div>
        <div className="glass-card">
          <div className="stat-label">Sensitive Alerts</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {stats.sensitiveToday} ⚠️
          </div>
        </div>
        <div className="glass-card">
          <div className="stat-label">Unique Actors</div>
          <div className="stat-value" style={{ color: '#6366f1' }}>{stats.uniqueActors}</div>
        </div>
      </div>

      <div className={`mv-layout${selectedLog ? ' mv-layout--split' : ''}`}>
        
        {/* ── List Panel ── */}
        <div className="panel card">
          <div className="panel-split" style={{ padding: '4px 0 16px' }}>
            <div className="gsc-datatable-toolbar-left" style={{ gap: 12 }}>
              <div className="gsc-toolbar-search" style={{ width: 240 }}>
                <input 
                  type="search" 
                  placeholder="Search actor..." 
                  value={actorSearch}
                  onChange={e => setActorSearch(e.target.value)}
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <select 
                className="pill-select" 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                style={{ height: 36, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 12px', fontSize: 13 }}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: '#64748b', fontWeight: 600 }}>
                <input type="checkbox" checked={sensitiveOnly} onChange={e => setSensitiveOnly(e.target.checked)} />
                Sensitive
              </label>
            </div>
          </div>

          <div className="table-shell">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Category</th>
                  <th>Entity</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40 }}><div className="rev-loading-spinner" style={{ margin: '0 auto' }}></div></td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan="5" className="rev-empty">No logs found.</td></tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)} 
                      className={selectedLog?.id === log.id ? 'mv-row-active' : ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="actor-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{(log.actor_name || '?').charAt(0).toUpperCase()}</div>
                          <span style={{ fontWeight: 600 }}>{log.actor_name || 'System'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: 12, 
                          fontWeight: 700, 
                          color: log.action === 'DELETED' ? '#ef4444' : log.action === 'CREATED' ? '#10b981' : '#6366f1' 
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td><StatusBadge cat={log.category} /></td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          <span style={{ fontWeight: 600 }}>{log.entity_type}</span>
                          {log.entity_id && <span style={{ color: '#94a3b8', marginLeft: 4 }}>#{log.entity_id}</span>}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{formatDateTime(log.timestamp)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && total > PAGE_SIZE && (
            <div className="bv-table-footer">
              <div className="table-record-count">Total {total} events</div>
              <div className="bv-table-pagination">
                 <button className="secondary-btn" disabled={page === 0} onClick={() => load(page - 1)}>Prev</button>
                 <span style={{ fontSize: 13 }}>Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
                 <button className="secondary-btn" disabled={logs.length < PAGE_SIZE} onClick={() => load(page + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* ── View Panel ── */}
        {renderViewPanel()}

      </div>
    </div>
  );
}

export default AuditLogsPage;
