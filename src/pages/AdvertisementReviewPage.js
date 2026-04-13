import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../components';
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
        padding: '4px 8px',
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
      <span style={{ color, fontSize: 12, fontWeight: 600 }}>{status}</span>
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

  return (
    <div>
      <div className="panel-head category-list-head">
        <div className="category-list-head-left">
          <div>
             <h2 className="panel-title">Advertisement Review</h2>
             <p className="panel-subtitle">Review, approve, or reject business advertisements.</p>
          </div>
        </div>
      </div>
      <Banner message={message} />

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: '0 16px' }}>
        <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, flex: 1, border: '1px solid #E5E7EB' }}>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>Total Ads Shown</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{stats.total}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, flex: 1, border: '1px solid #E5E7EB' }}>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>Pending Review</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>{stats.pending}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, flex: 1, border: '1px solid #E5E7EB' }}>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>Active Running</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>{stats.active}</p>
        </div>
      </div>

      <div className="panel card subscription-plan-page">
        <div className="panel-split" style={{ marginBottom: 16 }}>
          <h3 className="panel-subheading">Advertisement List</h3>
          <select 
            className="panel-select" 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB' }}
          >
            <option value="ALL">All Ads</option>
            <option value="PENDING">Pending Review</option>
            <option value="ACTIVE">Active Running</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {isLoading && ads.length === 0 ? (
          <p className="empty-state">Loading advertisements...</p>
        ) : ads.length === 0 ? (
          <p className="empty-state">No advertisements found for this filter.</p>
        ) : (
          <div className="table-shell" style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 100, minWidth: 100 }}>Banner</th>
                  <th style={{ minWidth: 180 }}>Business & Target</th>
                  <th style={{ minWidth: 140 }}>Duration</th>
                  <th style={{ minWidth: 100 }}>Performance</th>
                  <th style={{ minWidth: 120 }}>Status</th>
                  <th className="table-actions" style={{ minWidth: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.id}>
                    <td style={{ width: 100 }}>
                      <div style={{ width: 80, minWidth: 80, height: 45, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden' }}>
                        {ad.bannerUrl ? (
                          <img src={ad.bannerUrl} alt="Ad Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 10 }}>No Image</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}>{ad.businessName}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>{ad.slotType}</span>
                          <span style={{ color: '#9CA3AF' }}>•</span>
                          <span style={{ fontWeight: 500, color: '#4B5563', textTransform: 'capitalize' }}>Industry: {ad.industry || 'N/A'}</span>
                        </div>
                        <div style={{ color: '#10B981' }}>
                          Target: {ad.targetType === 'RADIUS' ? `Radius (${ad.targetRadiusKm}km)` : ad.targetValue || 'Global'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{ad.durationHours} Hours</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                         {ad.startTime ? new Date(ad.startTime).toLocaleDateString() : 'Not started'} 
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> 
                        {ad.impressions || 0}
                      </div>
                      <div style={{ fontSize: 13, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path></svg> 
                        {ad.clicks || 0}
                      </div>
                    </td>
                    <td>
                      <StatusChip status={ad.status} />
                      {ad.adminNote && ad.status === 'REJECTED' && (
                        <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Reason: {ad.adminNote}
                        </div>
                      )}
                    </td>
                    <td className="table-actions">
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => navigate(`/admin/advertisement/review/${ad.id}`)}
                          style={{ padding: '6px 12px', backgroundColor: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, border: '1px solid #BFDBFE', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                          View Details
                        </button>
                        {canUpdate && ad.status === 'PENDING' && (
                          <>
                            <button 
                              onClick={() => handleApprove(ad)}
                              style={{ padding: '6px 12px', backgroundColor: '#10B981', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => openRejectModal(ad)}
                              style={{ padding: '6px 12px', backgroundColor: '#FEE2E2', color: '#EF4444', borderRadius: 6, border: '1px solid #FCA5A5', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {canUpdate && ad.status === 'ACTIVE' && (
                          <button 
                            onClick={() => handleForceExpire(ad)}
                            style={{ padding: '6px 12px', backgroundColor: '#F3F4F6', color: '#6B7280', borderRadius: 6, border: '1px solid #D1D5DB', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          >
                            Expire 
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && selectedAdForReject && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#fff', padding: 24, borderRadius: 12, width: '100%', maxWidth: 400,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: 0, fontSize: 18, color: '#111827' }}>Reject Advertisement</h3>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8, marginBottom: 16 }}>
              Provide a reason for rejecting the ad from <strong>{selectedAdForReject.businessName}</strong>. This will be visible to the user.
            </p>
            
            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: 16 }}>
                <textarea
                  required
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Image quality is too low, violates policy..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D1D5DB', minHeight: 80, fontSize: 14 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button 
                  type="button" 
                  onClick={closeRejectModal}
                  style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #D1D5DB', borderRadius: 8, color: '#374151', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  style={{ padding: '8px 16px', backgroundColor: '#EF4444', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 500, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                >
                  {isLoading ? 'Processing...' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvertisementReviewPage;
