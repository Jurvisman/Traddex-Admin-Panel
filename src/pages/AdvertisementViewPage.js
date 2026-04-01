import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components';
import { getAdById, updateAdStatus } from '../services/adminApi';
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
        padding: '6px 12px',
        borderRadius: '16px',
        backgroundColor: `${color}15`,
        border: `1px solid ${color}30`,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          marginRight: 8,
        }}
      />
      <span style={{ color, fontSize: 13, fontWeight: 700 }}>{status}</span>
    </div>
  );
}

function AdvertisementViewPage({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [ad, setAd] = useState(null);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  const numericId = id ? Number(id) : null;
  const canUpdate = hasPermission('ADMIN_ADVERTISEMENT_REVIEW_UPDATE');

  const loadAd = async () => {
    if (!numericId) return;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await getAdById(token, numericId);
      setAd(response?.data || null);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load advertisement details.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericId, token]);

  const handleApprove = async () => {
    if (!window.confirm(`Are you sure you want to approve this ad for ${ad.businessName}?`)) return;
    
    setIsLoading(true);
    try {
      await updateAdStatus(token, ad.id, { status: 'ACTIVE' });
      setMessage({ type: 'success', text: `Ad #${ad.id} approved successfully.` });
      await loadAd();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to approve ad.' });
      setIsLoading(false);
    }
  };

  const openRejectModal = () => {
    setAdminNote('');
    setIsRejectModalOpen(true);
  };

  const closeRejectModal = () => {
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
      await updateAdStatus(token, ad.id, { 
        status: 'REJECTED', 
        adminNote: adminNote.trim() 
      });
      setMessage({ type: 'success', text: `Ad #${ad.id} rejected.` });
      closeRejectModal();
      await loadAd();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to reject ad.' });
      setIsLoading(false);
    }
  };

  const handleForceExpire = async () => {
    if (!window.confirm(`Are you sure you want to expire this ad early? This cannot be undone.`)) return;
    
    setIsLoading(true);
    try {
      await updateAdStatus(token, ad.id, { status: 'EXPIRED' });
      setMessage({ type: 'success', text: `Ad #${ad.id} explicitly expired.` });
      await loadAd();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to expire ad.' });
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="panel-head category-list-head" style={{ marginBottom: 16 }}>
        <div className="category-list-head-left" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/admin/advertisement/review')}
            style={{ 
              background: '#F3F4F6', border: 'none', borderRadius: 8, 
              width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#4B5563' 
            }}
          >
            <i className="ri-arrow-left-line" style={{ fontSize: 20 }}></i>
          </button>
          <div>
            <h2 className="panel-title">Advertisement Details</h2>
            <p className="panel-subtitle">Review complete information for Ad #{numericId}</p>
          </div>
        </div>
      </div>
      
      <Banner message={message} />

      {!ad && !isLoading ? (
        <p className="empty-state">Advertisement not found.</p>
      ) : null}

      {ad ? (
        <div style={{ paddingBottom: 40 }}>
          {/* Header Actions Card */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
               <StatusChip status={ad.status} />
               <div style={{ fontSize: 13, color: '#6B7280' }}>
                 Created: {new Date(ad.createdAt).toLocaleString()}
               </div>
            </div>
            
            {canUpdate && (
              <div style={{ display: 'flex', gap: 12 }}>
                {ad.status === 'PENDING' && (
                  <>
                    <button 
                      onClick={openRejectModal}
                      style={{ padding: '8px 16px', backgroundColor: '#FEE2E2', color: '#EF4444', borderRadius: 8, border: '1px solid #FCA5A5', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                    >
                      Reject Ad
                    </button>
                    <button 
                      onClick={handleApprove}
                      style={{ padding: '8px 16px', backgroundColor: '#10B981', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                    >
                      Approve & Publish
                    </button>
                  </>
                )}
                {ad.status === 'ACTIVE' && (
                  <button 
                    onClick={handleForceExpire}
                    style={{ padding: '8px 16px', backgroundColor: '#F3F4F6', color: '#6B7280', borderRadius: 8, border: '1px solid #D1D5DB', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                  >
                    Force Expire
                  </button>
                )}
              </div>
            )}
          </div>

          {/* If rejected, show reason */}
          {ad.adminNote && ad.status === 'REJECTED' && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <h4 style={{ color: '#991B1B', margin: '0 0 8px 0', fontSize: 14 }}>Rejection Reason</h4>
              <p style={{ color: '#7F1D1D', fontSize: 13, margin: 0 }}>{ad.adminNote}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20 }}>
            
            {/* Left Column: Creative & Placement Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Banner Card */}
              <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                  <h4 style={{ margin: 0, color: '#111827', fontSize: 15 }}>Banner Creative</h4>
                </div>
                <div style={{ padding: 20, display: 'flex', justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
                  {ad.bannerUrl ? (
                     <img src={ad.bannerUrl} alt="Banner" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  ) : (
                     <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>No image uploaded</div>
                  )}
                </div>
              </div>

              {/* Placement & Target Matrix */}
              <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                  <h4 style={{ margin: 0, color: '#111827', fontSize: 15 }}>Placement & Targeting</h4>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                      <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600 }}>Slot / Placement</p>
                      <p style={{ fontSize: 14, color: '#111827', fontWeight: 500, margin: 0 }}>
                        <span style={{ backgroundColor: '#E0E7FF', color: '#4338CA', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>
                          {ad.slotType}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600 }}>Target Audience</p>
                      <p style={{ fontSize: 14, color: '#111827', fontWeight: 500, margin: 0 }}>
                         <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>
                          {ad.targetType}
                        </span>
                      </p>
                    </div>
                    
                    {ad.industry && (
                      <div>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600 }}>Industry</p>
                        <p style={{ fontSize: 14, color: '#111827', fontWeight: 500, margin: 0, textTransform: 'capitalize' }}>{ad.industry}</p>
                      </div>
                    )}
                    
                    {['CITY', 'STATE', 'COUNTRY'].includes(ad.targetType) && (
                      <div>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600 }}>Target Location</p>
                        <p style={{ fontSize: 14, color: '#111827', fontWeight: 500, margin: 0 }}>{ad.targetValue}</p>
                      </div>
                    )}

                    {ad.targetType === 'INDUSTRY' && !ad.industry && (
                      <div>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600 }}>Target Industry</p>
                        <p style={{ fontSize: 14, color: '#111827', fontWeight: 500, margin: 0 }}>{ad.targetValue}</p>
                      </div>
                    )}
                    
                    {(ad.targetType === 'LOCATION' || ad.targetType === 'RADIUS') && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600 }}>Location Coordinates</p>
                        <p style={{ fontSize: 14, color: '#111827', fontWeight: 500, margin: '0 0 8px 0' }}>Radius: {ad.targetRadiusKm || 0} km</p>
                        <div style={{ display: 'flex', gap: 16 }}>
                           <div style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#F9FAFB', flex: 1 }}>
                             <span style={{ fontSize: 11, color: '#6B7280', display: 'block' }}>Latitude</span>
                             <span style={{ fontSize: 14, color: '#111827' }}>{ad.targetLat || 'N/A'}</span>
                           </div>
                           <div style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#F9FAFB', flex: 1 }}>
                             <span style={{ fontSize: 11, color: '#6B7280', display: 'block' }}>Longitude</span>
                             <span style={{ fontSize: 14, color: '#111827' }}>{ad.targetLng || 'N/A'}</span>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tap Action */}
              <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                  <h4 style={{ margin: 0, color: '#111827', fontSize: 15 }}>Interaction (On User Tap)</h4>
                </div>
                <div style={{ padding: 20 }}>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600 }}>Action Type</p>
                  <p style={{ fontSize: 14, color: '#111827', fontWeight: 500, margin: '0 0 16px 0' }}>
                    <span style={{ backgroundColor: '#D1FAE5', color: '#047857', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>
                      {ad.tapActionType}
                    </span>
                  </p>

                  <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600 }}>Destination</p>
                  <div style={{ padding: 12, backgroundColor: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: 8, fontSize: 13, color: '#374151', wordBreak: 'break-all' }}>
                    {ad.tapActionType === 'EXTERNAL_URL' && (ad.tapUrl || 'No URL Provided')}
                    {ad.tapActionType === 'STORE_PAGE' && `Business Profile`}
                    {ad.tapActionType === 'PRODUCT' && `Specific Product (ID: ${ad.tapProductId || 'N/A'})`}
                    {ad.tapActionType === 'COLLECTION' && `Collection (ID: ${ad.tapCollectionId || 'N/A'})`}
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Business, Timing, Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Advertiser Details */}
              <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                  <h4 style={{ margin: 0, color: '#111827', fontSize: 15 }}>Advertiser</h4>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ width: 48, height: 48, backgroundColor: '#F3F4F6', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                     <i className="ri-store-2-line" style={{ fontSize: 24, color: '#9CA3AF' }}></i>
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#111827', fontSize: 16 }}>{ad.businessName}</h3>
                  <p style={{ margin: 0, color: '#6B7280', fontSize: 13 }}>ID: {ad.businessId}</p>
                </div>
              </div>

              {/* Campaign Rules */}
              <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                  <h4 style={{ margin: 0, color: '#111827', fontSize: 15 }}>Campaign Timing</h4>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ color: '#6B7280', fontSize: 13 }}>Purchased Duration</span>
                    <span style={{ color: '#111827', fontSize: 13, fontWeight: 600 }}>{ad.durationHours} Hours</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#ECFDF5', borderRadius: 8, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }}></div>
                    <div>
                      <span style={{ display: 'block', fontSize: 11, color: '#065F46', fontWeight: 600, textTransform: 'uppercase' }}>Start Time</span>
                      <span style={{ fontSize: 13, color: '#064E3B' }}>{ad.startTime ? new Date(ad.startTime).toLocaleString() : 'Pending Approval'}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }}></div>
                    <div>
                      <span style={{ display: 'block', fontSize: 11, color: '#991B1B', fontWeight: 600, textTransform: 'uppercase' }}>End Time</span>
                      <span style={{ fontSize: 13, color: '#7F1D1D' }}>{ad.endTime ? new Date(ad.endTime).toLocaleString() : 'Pending Approval'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                  <h4 style={{ margin: 0, color: '#111827', fontSize: 15 }}>Live Performance</h4>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ padding: 16, backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, textAlign: 'center' }}>
                      <p style={{ margin: '0 0 8px 0', color: '#6B7280', fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Impressions</p>
                      <p style={{ margin: 0, color: '#111827', fontSize: 24, fontWeight: 700 }}>{ad.impressions || 0}</p>
                    </div>
                    <div style={{ padding: 16, backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, textAlign: 'center' }}>
                      <p style={{ margin: '0 0 8px 0', color: '#6B7280', fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Clicks</p>
                      <p style={{ margin: 0, color: '#111827', fontSize: 24, fontWeight: 700 }}>{ad.clicks || 0}</p>
                    </div>
                    <div style={{ gridColumn: '1 / -1', padding: 16, backgroundColor: '#F3F4F6', borderRadius: 8, textAlign: 'center', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, color: '#4B5563', fontSize: 13, fontWeight: 600 }}>Click Through Rate (CTR)</p>
                      <p style={{ margin: 0, color: '#111827', fontSize: 15, fontWeight: 700 }}>
                        {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : '0.00'}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : null}

      {/* Reject Modal */}
      {isRejectModalOpen && (
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
              Provide a reason for rejecting the ad from <strong>{ad.businessName}</strong>.
            </p>
            
            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: 16 }}>
                <textarea
                  required
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Image quality is too low... (This will be visible to the user)"
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

export default AdvertisementViewPage;
