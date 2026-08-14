import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner, DataTable, TableRowActionMenu } from '../components';
import { listAllAds, updateAdStatus } from '../services/adminApi';
import { usePermissions } from '../shared/permissions';

const STATUS_COLORS = {
  PENDING: '#F59E0B',
  ACTIVE: '#10B981',
  REJECTED: '#EF4444',
  EXPIRED: '#6B7280',
};

function StatusChip({ status }) {
  const color = STATUS_COLORS[status] || '#111827';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: '12px',
        backgroundColor: `${color}15`,
        border: `1px solid ${color}30`,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: color,
          marginRight: 6,
        }}
      />
      <span style={{ color, fontSize: 11, fontWeight: 700 }}>{status}</span>
    </div>
  );
}

function AdvertisementReviewPage({ token }) {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('ADMIN_ADVERTISEMENT_REVIEW_UPDATE');

  const [ads, setAds] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionRowId, setOpenActionRowId] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Modal states
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedAdForReject, setSelectedAdForReject] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const loadAds = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listAllAds(token, filterStatus === 'ALL' ? null : filterStatus);
      const raw = Array.isArray(response?.data) ? response.data : [];
      raw.sort((a, b) => new Date(b?.createdAt || b?.created_at || 0) - new Date(a?.createdAt || a?.created_at || 0));
      setAds(raw);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load advertisements.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const handleApprove = async (ad) => {
    if (!window.confirm(`Are you sure you want to approve this ad for ${ad.businessName}?`)) return;
    
    setIsLoading(true);
    try {
      await updateAdStatus(token, ad.id, { status: 'ACTIVE' });
      setMessage({ type: 'success', text: `Ad #${ad.id} approved successfully.` });
      await loadAds();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to approve ad.' });
      setIsLoading(false);
    }
  };

  const openRejectModal = (ad) => {
    setSelectedAdForReject(ad);
    setAdminNote('');
    setIsRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setSelectedAdForReject(null);
    setAdminNote('');
    setIsRejectModalOpen(false);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!adminNote.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    
    setIsLoading(true);
    try {
      await updateAdStatus(token, selectedAdForReject.id, { 
        status: 'REJECTED', 
        adminNote: adminNote.trim() 
      });
      setMessage({ type: 'success', text: `Ad #${selectedAdForReject.id} rejected.` });
      closeRejectModal();
      await loadAds();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to reject ad.' });
      setIsLoading(false);
    }
  };

  const handleForceExpire = async (ad) => {
    if (!window.confirm(`Are you sure you want to expire this ad early? This cannot be undone.`)) return;
    
    setIsLoading(true);
    try {
      await updateAdStatus(token, ad.id, { status: 'EXPIRED' });
      setMessage({ type: 'success', text: `Ad #${ad.id} explicitly expired.` });
      await loadAds();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to expire ad.' });
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: ads.length,
      pending: ads.filter(a => a.status === 'PENDING').length,
      active: ads.filter(a => a.status === 'ACTIVE').length,
    };
  }, [ads]);

  const filteredAds = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return ads;
    return ads.filter(ad => {
      const haystack = [
        ad.businessName,
        ad.slotType,
        ad.industry,
        ad.targetValue,
        ad.status,
      ].map(v => String(v || '').toLowerCase()).join(' ');
      return haystack.includes(term);
    });
  }, [ads, searchQuery]);

  return (
    <div className="ad-review-page">
      <div className="panel-head category-list-head" style={{ marginBottom: 20 }}>
        <div className="category-list-head-left">
          <div>
            <h2 className="panel-title">Advertisement Review</h2>
            <p className="panel-subtitle">Review, approve, or reject business advertisements across slots.</p>
          </div>
        </div>
        <div className="users-head-actions">
          <button type="button" className="ghost-btn" onClick={loadAds} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <Banner message={message} />

      {/* Summary Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#6345ED' }}>
          <p className="stat-label">Total Ads</p>
          <p className="stat-value" style={{ color: '#6345ED' }}>{stats.total}</p>
          <p className="stat-sub">Across all statuses</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F59E0B' }}>
          <p className="stat-label">Pending Review</p>
          <p className="stat-value" style={{ color: '#F59E0B' }}>{stats.pending}</p>
          <p className="stat-sub">Action required</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#10B981' }}>
          <p className="stat-label">Active Running</p>
          <p className="stat-value" style={{ color: '#10B981' }}>{stats.active}</p>
          <p className="stat-sub">Live on app/web</p>
        </div>
      </div>

      <div className="panel card users-table-card">
        <DataTable
          columns={[
            {
              key: 'banner',
              header: 'Banner',
              width: '100px',
              render: (_, ad) => (
                <div style={{ width: 80, height: 44, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden' }}>
                  {ad.bannerUrl ? (
                    <img src={ad.bannerUrl} alt="Ad Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 10 }}>No Image</div>
                  )}
                </div>
              ),
            },
            {
              key: 'businessName',
              header: 'Business & Target',
              sortable: true,
              render: (val, ad) => (
                <div>
                  <span
                    className="bdt-name-link"
                    style={{ color: '#6345ED', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/advertisement/review/${ad.id}`);
                    }}
                  >
                    {val || 'Unknown Business'}
                  </span>
                  <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ backgroundColor: '#F3F4F6', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>{ad.slotType}</span>
                    <span>•</span>
                    <span style={{ color: '#059669', fontWeight: 500 }}>
                      {ad.targetType === 'RADIUS' ? `Radius (${ad.targetRadiusKm}km)` : ad.targetValue || 'Global'}
                    </span>
                  </div>
                </div>
              ),
            },
            {
              key: 'durationHours',
              header: 'Duration',
              sortable: true,
              render: (val, ad) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{val} Hours</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>
                    {ad.startTime ? new Date(ad.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not started'}
                  </div>
                </div>
              ),
            },
            {
              key: 'performance',
              header: 'Performance',
              render: (_, ad) => (
                <div style={{ fontSize: 12, color: '#4B5563', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <span>{ad.impressions || 0} views</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path></svg>
                    <span>{ad.clicks || 0} clicks</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (val, ad) => (
                <div>
                  <StatusChip status={val} />
                  {ad.adminNote && ad.status === 'REJECTED' && (
                    <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2, maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ad.adminNote}>
                      Reason: {ad.adminNote}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (_, ad) => {
                const actions = [];
                actions.push({
                  label: 'View Details',
                  onClick: () => navigate(`/admin/advertisement/review/${ad.id}`),
                });
                if (canUpdate && ad.status === 'PENDING') {
                  actions.push({
                    label: 'Approve Ad',
                    onClick: () => handleApprove(ad),
                  });
                  actions.push({
                    label: 'Reject Ad',
                    onClick: () => openRejectModal(ad),
                    danger: true,
                  });
                }
                if (canUpdate && ad.status === 'ACTIVE') {
                  actions.push({
                    label: 'Expire Ad',
                    onClick: () => handleForceExpire(ad),
                    danger: true,
                  });
                }
                return (
                  <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                    <TableRowActionMenu
                      rowId={ad.id}
                      openRowId={openActionRowId}
                      onToggle={setOpenActionRowId}
                      actions={actions}
                    />
                  </div>
                );
              },
            },
          ]}
          data={filteredAds}
          isLoading={isLoading}
          search={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setPage(0); }}
          searchPlaceholder="Search ads by business, slot, industry..."
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
          pageSizeOptions={[10, 25, 50]}
          onRowClick={(ad) => navigate(`/admin/advertisement/review/${ad.id}`)}
          emptyTitle="No advertisements found"
          emptyDescription="No advertisements match your filter criteria."
          toolbarLeft={
            <select
              className="gsc-toolbar-btn"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
              style={{ border: 'none', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="ACTIVE">Active Running</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
            </select>
          }
        />
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && selectedAdForReject && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={closeRejectModal}>
          <div
            className="admin-modal cat-unified-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            <div style={{
              padding: '18px 24px 14px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Reject Advertisement</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  Business: {selectedAdForReject.businessName}
                </p>
              </div>
              <button
                type="button"
                onClick={closeRejectModal}
                aria-label="Close"
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: 8,
                  width: 32, height: 32, cursor: 'pointer', color: '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Provide a reason for rejecting this ad. The reason will be communicated to the merchant.
                </p>

                <label className="field">
                  <span>Rejection Reason *</span>
                  <textarea
                    required
                    rows={4}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="e.g. Low image resolution / Promotional content guideline violation..."
                  />
                </label>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" className="ghost-btn" onClick={closeRejectModal}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary-btn"
                    style={{ background: '#EF4444', borderColor: '#EF4444' }}
                    disabled={isLoading}
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvertisementReviewPage;
