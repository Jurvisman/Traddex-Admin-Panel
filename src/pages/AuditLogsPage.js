import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner, DataTable } from '../components';
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
    <span className="category-badge" style={{ background: style.bg, color: style.color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
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
          <p className="mv-section-label">Audit Diff Payload</p>
          {hasDiff ? (
            <div className="diff-view" style={{ fontSize: 12 }}>
              {Object.entries(parsedDetails).map(([key, change]) => {
                if (change && typeof change === 'object' && ('old' in change || 'new' in change)) {
                  return (
                    <div key={key} style={{ marginBottom: 8, background: '#f8fafc', padding: 8, borderRadius: 6 }}>
                      <strong style={{ color: '#334155' }}>{key}</strong>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>
                          {JSON.stringify(change.old)}
                        </span>
                        <span>→</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>
                          {JSON.stringify(change.new)}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ) : (
            <pre style={{
              background: '#0f172a',
              color: '#38bdf8',
              padding: 12,
              borderRadius: 8,
              fontSize: 11,
              overflowX: 'auto',
              maxHeight: 200,
            }}>
              {JSON.stringify(parsedDetails, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="audit-container">
      <div className="panel-head category-list-head" style={{ marginBottom: 20 }}>
        <div className="category-list-head-left">
          <div>
            <h2 className="panel-title">Audit Sentinel</h2>
            <p className="panel-subtitle">Activity monitoring and security auditing across all system modules.</p>
          </div>
        </div>
        <div className="users-head-actions">
          <button type="button" className="ghost-btn" onClick={() => load(0)} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#6345ED' }}>
          <p className="stat-label">Total Events</p>
          <p className="stat-value" style={{ color: '#6345ED' }}>{stats.totalToday}</p>
          <p className="stat-sub">System audit log records</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F59E0B' }}>
          <p className="stat-label">Sensitive Alerts</p>
          <p className="stat-value" style={{ color: '#F59E0B' }}>{stats.sensitiveToday}</p>
          <p className="stat-sub">High-priority security actions</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#0EA5E9' }}>
          <p className="stat-label">Unique Actors</p>
          <p className="stat-value" style={{ color: '#0EA5E9' }}>{stats.uniqueActors}</p>
          <p className="stat-sub">Active administrators</p>
        </div>
      </div>

      <div className={`mv-layout${selectedLog ? ' mv-layout--split' : ''}`}>
        
        {/* ── List Panel ── */}
        <div className="panel card users-table-card">
          <DataTable
            columns={[
              {
                key: 'actor',
                header: 'Actor',
                sortable: true,
                render: (_, log) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="actor-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                      {(log.actor_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="bdt-name-link" style={{ color: '#6345ED', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {log.actor_name || 'System'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                sortable: true,
                render: (val) => (
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: val === 'DELETED' ? '#ef4444' : val === 'CREATED' ? '#10b981' : '#6345ED',
                  }}>
                    {val}
                  </span>
                ),
              },
              {
                key: 'category',
                header: 'Category',
                sortable: true,
                render: (val) => <StatusBadge cat={val} />,
              },
              {
                key: 'entity',
                header: 'Entity',
                sortable: true,
                render: (_, log) => (
                  <div style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600 }}>{log.entity_type}</span>
                    {log.entity_id && <span style={{ color: '#94a3b8', marginLeft: 4 }}>#{log.entity_id}</span>}
                  </div>
                ),
              },
              {
                key: 'timestamp',
                header: 'Time',
                sortable: true,
                render: (val) => <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{formatDateTime(val)}</span>,
              },
            ]}
            data={filteredLogs}
            isLoading={isLoading}
            search={actorSearch}
            onSearchChange={setActorSearch}
            searchPlaceholder="Search actor..."
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={(p) => { setPage(p); load(p); }}
            pageSizeOptions={[25, 50, 100]}
            onRowClick={(log) => setSelectedLog(log)}
            emptyTitle="No logs found"
            emptyDescription="No audit logs match your criteria."
            toolbarLeft={
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <select
                  className="gsc-toolbar-btn"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{ border: 'none', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: '#64748b', fontWeight: 600 }}>
                  <input type="checkbox" checked={sensitiveOnly} onChange={e => setSensitiveOnly(e.target.checked)} />
                  Sensitive Only
                </label>
              </div>
            }
          />
        </div>

        {/* ── View Panel ── */}
        {renderViewPanel()}

      </div>
    </div>
  );
}

export default AuditLogsPage;
