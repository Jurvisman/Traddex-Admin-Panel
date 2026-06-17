import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import { API_ORIGIN, STOREFRONT_BASE_URL } from '../config/runtime';

const API_BASE = API_ORIGIN;
const buildUrl = (path) => `${API_BASE}/api${path}`;

const STATUS_OPTIONS = [
  { value: '', label: 'All Sites' },
  { value: 'PENDING_SETUP', label: 'Pending Setup' },
  { value: 'LIVE', label: 'Live Sites' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'SUSPENDED', label: 'Suspended' },
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
  if (normalized === 'VERIFIED' || normalized === 'LIVE' || normalized === 'ACTIVE') return 'status-active';
  return 'status-inactive storefront-status-warn';
};

const primaryDomain = (site) => {
  const domains = Array.isArray(site?.domains) ? site.domains : [];
  return domains.find((domain) => domain?.domain)?.domain || '-';
};

const storefrontPreviewUrl = (domain) =>
  domain && domain !== '-' ? `${STOREFRONT_BASE_URL}/site/${encodeURIComponent(domain)}` : null;

const DomainLink = ({ domain }) => {
  const href = storefrontPreviewUrl(domain);
  if (!href) return <span>-</span>;
  return (
    <a
      href={href}
      className="storefront-domain-link"
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      {domain}
    </a>
  );
};

const isBusinessVerified = (site) => String(site?.businessStatus || '').toUpperCase() === 'VERIFIED';

const DetailRow = ({ label, value }) => (
  <div className="mv-detail-row">
    <span className="mv-detail-label">{label}</span>
    <span className="mv-detail-value">{value || '-'}</span>
  </div>
);

function StorefrontManagementPage({ token }) {
  const [sites, setSites] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('PENDING_SETUP');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const loadSites = useCallback(async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const response = await fetch(buildUrl(`/admin/storefront/sites${query}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load storefront sites.');
      }
      setSites(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load storefront sites.' });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, token]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const filteredSites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((site) => {
      const text = [
        site.businessName,
        site.businessProfileId,
        site.contactNumber,
        site.email,
        site.industry,
        site.templateKey,
        site.businessStatus,
        site.status,
        primaryDomain(site),
      ].join(' ').toLowerCase();
      return text.includes(q);
    });
  }, [searchQuery, sites]);

  const totalPages = Math.max(1, Math.ceil(filteredSites.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedSites = filteredSites.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleView = (site) => {
    setViewItem(site);
    setOpenActionRowId(null);
  };

  const handlePublish = async (site) => {
    if (!isBusinessVerified(site)) {
      setMessage({
        type: 'error',
        text: 'Please approve this business first and after that this site will be ready for live.',
      });
      return;
    }
    if (!window.confirm(`Publish ${site.businessName || 'this website'} live now?`)) return;
    setPublishingId(site.siteId);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await fetch(buildUrl(`/admin/storefront/sites/${site.siteId}/publish`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to publish storefront.');
      }
      setMessage({ type: 'success', text: 'Website published successfully.' });
      setViewItem(null);
      await loadSites();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to publish storefront.' });
    } finally {
      setPublishingId(null);
    }
  };

  const renderViewPanel = () => {
    if (!viewItem) return null;
    const domains = Array.isArray(viewItem.domains) ? viewItem.domains : [];
    const domain = primaryDomain(viewItem);
    const storefrontPath = storefrontPreviewUrl(domain);

    return (
      <div className="mv-panel card">
        <div className="mv-panel-header">
          <div className="mv-panel-title-row">
            <button type="button" className="mv-back-btn" onClick={() => setViewItem(null)}>
              Back
            </button>
            <h3 className="mv-panel-title">{viewItem.businessName || 'Storefront'}</h3>
            <span className={statusPillClass(viewItem.status)}>{formatStatus(viewItem.status)}</span>
          </div>
          {viewItem.status === 'PENDING_SETUP' && (
            <button
              type="button"
              className="primary-btn compact"
              onClick={() => handlePublish(viewItem)}
              disabled={publishingId === viewItem.siteId}
            >
              {publishingId === viewItem.siteId ? 'Publishing...' : 'Publish'}
            </button>
          )}
        </div>

        {!isBusinessVerified(viewItem) && (
          <div className="mv-section storefront-approval-note">
            <p className="mv-empty">
              Please approve this business first and after that this site will be ready for live.
            </p>
          </div>
        )}

        <div className="mv-section">
          <p className="mv-section-label">Basic Info</p>
          <div className="mv-detail-grid">
            <DetailRow label="Business" value={viewItem.businessName} />
            <DetailRow label="Business ID" value={viewItem.businessProfileId} />
            <DetailRow label="Site ID" value={viewItem.siteId} />
            <div className="mv-detail-row">
              <span className="mv-detail-label">Domain</span>
              <span className="mv-detail-value"><DomainLink domain={domain} /></span>
            </div>
            <DetailRow label="Business Status" value={formatStatus(viewItem.businessStatus)} />
            <DetailRow label="Site Status" value={formatStatus(viewItem.status)} />
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">Business Contact</p>
          <div className="mv-detail-grid">
            <DetailRow label="Owner" value={viewItem.ownerName} />
            <DetailRow label="Mobile" value={viewItem.contactNumber} />
            <DetailRow label="WhatsApp" value={viewItem.whatsappNumber} />
            <DetailRow label="Email" value={viewItem.email} />
            <DetailRow label="Industry" value={viewItem.industry} />
            <DetailRow label="Address" value={viewItem.address} />
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">Website</p>
          <div className="mv-detail-grid">
            <DetailRow label="Template" value={viewItem.templateKey} />
            <DetailRow label="Version" value={viewItem.templateVersion} />
            <DetailRow label="Requested" value={formatDate(viewItem.updatedAt)} />
            <DetailRow label="Published" value={formatDate(viewItem.publishedAt)} />
          </div>
        </div>

        <div className="mv-section">
          <p className="mv-section-label">
            Domains
            <span className="mv-count-badge">{domains.length}</span>
          </p>
          {domains.length === 0 ? (
            <p className="mv-empty">No domain attached.</p>
          ) : (
            <div className="mv-child-grid">
              {domains.map((item) => (
                <div key={item.id || item.domain} className="mv-child-card">
                  <div className="mv-child-name"><DomainLink domain={item.domain} /></div>
                  <div className="mv-child-meta">
                    <span className={statusPillClass(item.status)}>{formatStatus(item.status)}</span>
                    <span className="mv-child-order">{formatStatus(item.type)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mv-panel-footer-actions">
          {storefrontPath && (
            <a href={storefrontPath} className="ghost-btn small" target="_blank" rel="noreferrer">
              Open Preview
            </a>
          )}
        </div>
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
              <h3 className="panel-subheading">Storefront list</h3>
              <div className="gsc-datatable-toolbar-left">
                <button type="button" className="gsc-toolbar-btn" title="Filter">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h10M4 18h6" />
                  </svg>
                  Filter
                </button>
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
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
                  aria-label="Search storefronts"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-state">Loading storefront sites...</div>
          ) : filteredSites.length === 0 ? (
            <div className="empty-state">No storefront records found.</div>
          ) : (
            <div className="table-shell">
              <table className="admin-table storefront-master-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Business</th>
                    <th>Domain</th>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>Business Status</th>
                    <th>Site Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSites.map((site, index) => (
                    <tr
                      key={site.siteId}
                      className={viewItem?.siteId === site.siteId ? 'mv-row-active' : ''}
                      onClick={() => handleView(site)}
                    >
                      <td>{(safePage - 1) * pageSize + index + 1}</td>
                      <td>
                        <button type="button" className="storefront-master-name" onClick={() => handleView(site)}>
                          <span>{site.businessName || '-'}</span>
                          <small>Business #{site.businessProfileId || '-'}</small>
                        </button>
                      </td>
                      <td><DomainLink domain={primaryDomain(site)} /></td>
                      <td>{site.contactNumber || '-'}</td>
                      <td className="storefront-email-cell">{site.email || '-'}</td>
                      <td><span className={statusPillClass(site.businessStatus)}>{formatStatus(site.businessStatus)}</span></td>
                      <td><span className={statusPillClass(site.status)}>{formatStatus(site.status)}</span></td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <TableRowActionMenu
                          rowId={site.siteId}
                          openRowId={openActionRowId}
                          onToggle={setOpenActionRowId}
                          actions={[
                            { label: 'View', onClick: () => handleView(site) },
                            ...(site.status === 'PENDING_SETUP'
                              ? [{ label: publishingId === site.siteId ? 'Publishing...' : 'Publish Live', onClick: () => handlePublish(site) }]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bv-table-footer">
                <div className="table-record-count">
                  <span>{filteredSites.length === 0 ? '0 records' : `Showing ${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filteredSites.length)} of ${filteredSites.length}`}</span>
                </div>
                <div className="product-pagination-controls">
                  <label className="product-pagination-size">
                    <span>Rows</span>
                    <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                      {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
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

export default StorefrontManagementPage;
