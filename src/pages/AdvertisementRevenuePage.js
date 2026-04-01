import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import {
  listAllAds,
  updateAdStatus,
} from '../services/adminApi';

const STATUS_TABS = ['ALL', 'PENDING', 'ACTIVE', 'EXPIRED', 'REJECTED'];

const STATUS_LABELS = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REJECTED: 'Rejected',
};

const SLOT_LABELS = {
  FULL_BANNER: 'Full Banner',
  MID_CARD: 'Mid Card',
  BOTTOM_STRIP: 'Bottom Strip',
};

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');

const formatTarget = (ad) => {
  if (ad.targetType === 'GLOBAL') return 'Global';
  if (ad.targetType === 'RADIUS') return `${ad.targetRadiusKm ?? '?'} km radius`;
  if (ad.targetType === 'CITY') return ad.targetValue || '-';
  if (ad.targetType === 'STATE') return ad.targetValue || '-';
  if (ad.targetType === 'COUNTRY') return ad.targetValue || 'Country';
  return ad.targetType || '-';
};

const initialRejectForm = { adId: null, adminNote: '' };

function AdvertisementRevenuePage({ token }) {
  const [ads, setAds] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [openActionRowId, setOpenActionRowId] = useState(null);

  // Reject modal
  const [rejectForm, setRejectForm] = useState(initialRejectForm);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Banner preview modal
  const [previewUrl, setPreviewUrl] = useState(null);

  const loadAds = useCallback(async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const status = activeTab === 'ALL' ? null : activeTab;
      const res = await listAllAds(token, status);
      setAds(res?.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load ads.' });
    } finally {
      setIsLoading(false);
    }
  }, [token, activeTab]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const filteredAds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return ads;
    return ads.filter(
      (ad) =>
        (ad.businessName || '').toLowerCase().includes(query) ||
        (ad.industry || '').toLowerCase().includes(query) ||
        (ad.status || '').toLowerCase().includes(query),
    );
  }, [ads, searchQuery]);

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async (ad) => {
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateAdStatus(token, ad.id, { status: 'ACTIVE' });
      setMessage({ type: 'success', text: `Ad #${ad.id} approved and is now live.` });
      await loadAds();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to approve ad.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Force Expire ──────────────────────────────────────────────────────────
  const handleForceExpire = async (ad) => {
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateAdStatus(token, ad.id, { status: 'EXPIRED', adminNote: 'Force-expired by admin.' });
      setMessage({ type: 'success', text: `Ad #${ad.id} has been expired.` });
      await loadAds();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to expire ad.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Reject modal ─────────────────────────────────────────────────────────
  const openRejectModal = (ad) => {
    setRejectForm({ adId: ad.id, adminNote: '' });
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateAdStatus(token, rejectForm.adId, {
        status: 'REJECTED',
        adminNote: rejectForm.adminNote.trim() || null,
      });
      setMessage({ type: 'success', text: `Ad #${rejectForm.adId} rejected.` });
      setShowRejectModal(false);
      setRejectForm(initialRejectForm);
      await loadAds();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to reject ad.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseRejectModal = (e) => {
    if (e.target === e.currentTarget) {
      setShowRejectModal(false);
      setRejectForm(initialRejectForm);
    }
  };

  // ── Counts per tab ────────────────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const counts = { ALL: ads.length };
    ads.forEach((ad) => {
      counts[ad.status] = (counts[ad.status] || 0) + 1;
    });
    return counts;
  }, [ads]);

  return (
    <div>
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="admin-modal-backdrop" onClick={handleCloseRejectModal}>
          <form
            className="admin-modal industry-create-modal"
            onSubmit={handleRejectSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">Reject Advertisement</h3>
            <p className="muted" style={{ marginBottom: 16 }}>
              Ad #{rejectForm.adId} — optionally provide a reason that the business will see.
            </p>
            <div className="field-grid">
              <label className="field">
                <span>Rejection reason (optional)</span>
                <textarea
                  rows={3}
                  placeholder="e.g. Banner contains inappropriate content"
                  value={rejectForm.adminNote}
                  onChange={(e) => setRejectForm((f) => ({ ...f, adminNote: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="submit" className="primary-btn full" disabled={isSaving}>
                {isSaving ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectForm(initialRejectForm);
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banner Preview Modal */}
      {previewUrl && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setPreviewUrl(null)}
          style={{ zIndex: 1100 }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: 12,
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewUrl}
              alt="Ad banner preview"
              style={{ maxWidth: '80vw', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
            />
            <button
              className="secondary-btn"
              style={{ marginTop: 10, width: '100%' }}
              onClick={() => setPreviewUrl(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="panel-head">
        <div>
          <h2 className="panel-title">Advertisement Management</h2>
          <p className="panel-subtitle">Review, approve, and manage business ad campaigns.</p>
        </div>
      </div>

      <Banner message={message} />

      <div className="panel-grid">
        <div className="panel card users-table-card">
          {/* Toolbar */}
          <div className="panel-split">
            {/* Status Tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                  className={activeTab === tab ? 'primary-btn' : 'secondary-btn'}
                  style={{ padding: '4px 12px', fontSize: 13 }}
                >
                  {tab === 'ALL' ? 'All' : STATUS_LABELS[tab]}
                  {tabCounts[tab] != null ? ` (${tabCounts[tab]})` : ''}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="gsc-datatable-toolbar-right">
              <div className="gsc-toolbar-search">
                <input
                  type="search"
                  placeholder="Search by business, industry…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-shell">
            {isLoading ? (
              <div className="empty-state"><p>Loading ads…</p></div>
            ) : filteredAds.length === 0 ? (
              <div className="empty-state">
                <p>No advertisements found{activeTab !== 'ALL' ? ` with status ${STATUS_LABELS[activeTab]}` : ''}.</p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Banner</th>
                    <th>Business</th>
                    <th>Industry</th>
                    <th>Slot</th>
                    <th>Targeting</th>
                    <th>Duration</th>
                    <th>Impressions / Clicks</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAds.map((ad, index) => (
                    <tr key={ad.id}>
                      <td>{index + 1}</td>

                      {/* Thumbnail */}
                      <td>
                        {ad.bannerUrl ? (
                          <img
                            src={ad.bannerUrl}
                            alt="banner"
                            style={{
                              width: 64,
                              height: 32,
                              objectFit: 'cover',
                              borderRadius: 4,
                              cursor: 'pointer',
                              border: '1px solid #e5e7eb',
                            }}
                            onClick={() => setPreviewUrl(ad.bannerUrl)}
                            title="Click to preview"
                          />
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>

                      <td>
                        <strong>{ad.businessName || `ID ${ad.businessId}`}</strong>
                      </td>

                      <td style={{ textTransform: 'capitalize' }}>{ad.industry || '-'}</td>

                      <td>
                        <span className="status-pill">
                          {SLOT_LABELS[ad.slotType] || ad.slotType || '-'}
                        </span>
                      </td>

                      <td>{formatTarget(ad)}</td>

                      <td>{ad.durationHours ? `${ad.durationHours}h` : '-'}</td>

                      <td>
                        {ad.impressions ?? 0} / {ad.clicks ?? 0}
                      </td>

                      <td>
                        <span className={`status-pill ${(ad.status || '').toLowerCase()}`}>
                          {STATUS_LABELS[ad.status] || ad.status || '-'}
                        </span>
                      </td>

                      <td>{formatDateTime(ad.createdAt)}</td>

                      <td className="table-actions">
                        <TableRowActionMenu
                          rowId={ad.id}
                          openRowId={openActionRowId}
                          onToggle={setOpenActionRowId}
                          actions={[
                            ad.status === 'PENDING' && {
                              label: 'Approve',
                              onClick: () => handleApprove(ad),
                            },
                            ad.status === 'PENDING' && {
                              label: 'Reject',
                              onClick: () => openRejectModal(ad),
                              danger: true,
                            },
                            ad.status === 'ACTIVE' && {
                              label: 'Force Expire',
                              onClick: () => handleForceExpire(ad),
                              danger: true,
                            },
                            ad.adminNote && {
                              label: 'View Note',
                              onClick: () =>
                                setMessage({ type: 'info', text: `Admin note: ${ad.adminNote}` }),
                            },
                          ].filter(Boolean)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvertisementRevenuePage;
