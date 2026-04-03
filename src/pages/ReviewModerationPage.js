import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../components';
import {
  listAdminBusinessReviews,
  listAdminProductReviews,
  updateAdminBusinessReviewStatus,
  updateAdminProductReviewStatus,
  updateAdminReviewReportStatus,
} from '../services/adminApi';
import { REVIEW_MODERATION_PERMISSIONS } from '../constants/adminPermissions';
import { usePermissions } from '../shared/permissions';

const PAGE_SIZE = 12;

const REVIEW_TYPE_OPTIONS = [
  { value: 'PRODUCT', label: 'Product Reviews' },
  { value: 'BUSINESS', label: 'Business Reviews' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'FLAGGED', label: 'Flagged' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'REMOVED', label: 'Removed' },
];

const STATUS_COLORS = {
  PUBLISHED: '#10B981',
  FLAGGED: '#F59E0B',
  REMOVED: '#EF4444',
  OPEN: '#F59E0B',
  RESOLVED: '#10B981',
  DISMISSED: '#6B7280',
};

const normalize = (value) => String(value || '').trim().toUpperCase();

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const statusBadgeStyle = (status) => {
  const color = STATUS_COLORS[normalize(status)] || '#475569';
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    backgroundColor: `${color}14`,
    border: `1px solid ${color}30`,
    color,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
  };
};

function ReviewModerationPage({ token }) {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canModerate = hasPermission(REVIEW_MODERATION_PERMISSIONS.moderate);

  const [reviewType, setReviewType] = useState('PRODUCT');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reportedOnly, setReportedOnly] = useState(true);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState({ data: [], total: 0, page: 1, limit: PAGE_SIZE, hasMore: false });
  const [isLoading, setIsLoading] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState({ type: 'info', text: '' });

  useEffect(() => {
    setPage(1);
  }, [reviewType, statusFilter, reportedOnly, query]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const filters = {
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          reportedOnly,
          query: query || undefined,
          page,
          limit: PAGE_SIZE,
        };

        const response =
          reviewType === 'PRODUCT'
            ? await listAdminProductReviews(token, filters)
            : await listAdminBusinessReviews(token, filters);

        if (cancelled) return;
        setPayload(response?.data || { data: [], total: 0, page, limit: PAGE_SIZE, hasMore: false });
      } catch (error) {
        if (cancelled) return;
        setMessage({ type: 'error', text: error.message || 'Failed to load review moderation queue.' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [page, query, reportedOnly, reviewType, statusFilter, token]);

  const items = useMemo(() => (Array.isArray(payload?.data) ? payload.data : []), [payload]);
  const total = Number(payload?.total || 0);
  const hasMore = Boolean(payload?.hasMore);

  const summary = useMemo(() => {
    return {
      flagged: items.filter((item) => normalize(item.status) === 'FLAGGED').length,
      removed: items.filter((item) => normalize(item.status) === 'REMOVED').length,
      reported: items.filter((item) => Number(item.reportCount || 0) > 0).length,
    };
  }, [items]);

  const refreshCurrentPage = async () => {
    setIsLoading(true);
    try {
      const filters = {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        reportedOnly,
        query: query || undefined,
        page,
        limit: PAGE_SIZE,
      };
      const response =
        reviewType === 'PRODUCT'
          ? await listAdminProductReviews(token, filters)
          : await listAdminBusinessReviews(token, filters);
      setPayload(response?.data || { data: [], total: 0, page, limit: PAGE_SIZE, hasMore: false });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to refresh review moderation queue.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery(queryInput.trim());
  };

  const handleReviewStatusChange = async (review, nextStatus) => {
    if (!canModerate) return;
    const normalizedType = normalize(review.reviewType);
    const confirmed = window.confirm(`Change this ${normalizedType.toLowerCase()} review to ${nextStatus}?`);
    if (!confirmed) return;

    const actionKey = `${normalizedType}-${review.reviewId}-${nextStatus}`;
    setBusyKey(actionKey);
    try {
      if (normalizedType === 'PRODUCT') {
        await updateAdminProductReviewStatus(token, review.reviewId, nextStatus);
      } else {
        await updateAdminBusinessReviewStatus(token, review.reviewId, nextStatus);
      }
      setMessage({ type: 'success', text: `Review moved to ${nextStatus}.` });
      await refreshCurrentPage();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update review status.' });
    } finally {
      setBusyKey('');
    }
  };

  const handleReportStatusChange = async (report, nextStatus) => {
    if (!canModerate) return;
    const actionKey = `report-${report.reportId}-${nextStatus}`;
    setBusyKey(actionKey);
    try {
      await updateAdminReviewReportStatus(token, report.reportId, nextStatus);
      setMessage({ type: 'success', text: `Report marked as ${nextStatus.toLowerCase()}.` });
      await refreshCurrentPage();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update report status.' });
    } finally {
      setBusyKey('');
    }
  };

  const openLinkedRecord = (review) => {
    if (normalize(review.reviewType) === 'PRODUCT' && review.subjectId) {
      navigate(`/admin/products/${review.subjectId}`);
      return;
    }
    if (review.businessUserId) {
      navigate(`/admin/businesses/${review.businessUserId}`);
    }
  };

  return (
    <div>
      <div className="panel-head category-list-head">
        <div className="category-list-head-left">
          <div>
            <h2 className="panel-title">Review Moderation</h2>
            <p className="panel-subtitle">Moderate reported buyer reviews, resolve reports, and control public visibility.</p>
          </div>
        </div>
      </div>
      <Banner message={message} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18 }}>
          <div style={{ color: '#64748B', fontSize: 13 }}>Queue Total</div>
          <div style={{ color: '#0F172A', fontSize: 28, fontWeight: 800, marginTop: 6 }}>{total}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18 }}>
          <div style={{ color: '#64748B', fontSize: 13 }}>Flagged On Screen</div>
          <div style={{ color: '#F59E0B', fontSize: 28, fontWeight: 800, marginTop: 6 }}>{summary.flagged}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18 }}>
          <div style={{ color: '#64748B', fontSize: 13 }}>Reported On Screen</div>
          <div style={{ color: '#DC2626', fontSize: 28, fontWeight: 800, marginTop: 6 }}>{summary.reported}</div>
        </div>
      </div>

      <div className="panel card" style={{ padding: 20, borderRadius: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'inline-flex', padding: 4, borderRadius: 999, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            {REVIEW_TYPE_OPTIONS.map((option) => {
              const active = reviewType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReviewType(option.value)}
                  style={{
                    border: 0,
                    borderRadius: 999,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    background: active ? '#0F172A' : 'transparent',
                    color: active ? '#fff' : '#334155',
                    fontWeight: 700,
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <select
            className="panel-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ minWidth: 160 }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#334155', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={reportedOnly}
              onChange={(event) => setReportedOnly(event.target.checked)}
            />
            Reported only
          </label>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Search review, buyer, product, business"
              className="panel-input"
              style={{ minWidth: 280 }}
            />
            <button type="submit" className="primary-btn">Apply</button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setQueryInput('');
                setQuery('');
              }}
            >
              Clear
            </button>
          </form>
        </div>

        {isLoading && items.length === 0 ? (
          <div className="empty-state">Loading review queue...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No reviews matched the current moderation filters.</div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {items.map((review) => {
              const normalizedType = normalize(review.reviewType);
              const normalizedStatus = normalize(review.status);
              const reportCount = Number(review.reportCount || 0);
              const openReports = Array.isArray(review.openReports) ? review.openReports : [];
              return (
                <article
                  key={`${normalizedType}-${review.reviewId}`}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 18,
                    background: '#fff',
                    padding: 18,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={statusBadgeStyle(normalizedType)}>{normalizedType}</span>
                        <span style={statusBadgeStyle(normalizedStatus)}>{normalizedStatus}</span>
                        {review.verifiedPurchase ? <span style={statusBadgeStyle('RESOLVED')}>VERIFIED PURCHASE</span> : null}
                        {reportCount > 0 ? <span style={statusBadgeStyle('OPEN')}>{reportCount} OPEN REPORTS</span> : null}
                      </div>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{review.subjectLabel || 'Review Item'}</div>
                        <div style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>
                          {review.businessLabel ? `${review.businessLabel} | ` : ''}
                          Buyer: {review.reviewerName || 'Buyer'} | Rating: {review.rating || 0}/5
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: 220 }}>
                      <div style={{ color: '#475569', fontSize: 13 }}>Order #{review.orderId || '-'}</div>
                      <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Updated {formatDateTime(review.updatedOn)}</div>
                      <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>Created {formatDateTime(review.createdOn)}</div>
                    </div>
                  </div>

                  {review.headline ? (
                    <div style={{ color: '#0F172A', fontWeight: 700, marginBottom: 6 }}>{review.headline}</div>
                  ) : null}
                  <div style={{ color: '#334155', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {review.reviewText || 'No review text provided.'}
                  </div>

                  {Array.isArray(review.mediaUrls) && review.mediaUrls.length > 0 ? (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                      {review.mediaUrls.map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt="Review evidence"
                          style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 12, border: '1px solid #CBD5E1' }}
                        />
                      ))}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                    <button type="button" className="secondary-btn" onClick={() => openLinkedRecord(review)}>
                      Open Linked Record
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={!canModerate || busyKey === `${normalizedType}-${review.reviewId}-PUBLISHED`}
                      onClick={() => handleReviewStatusChange(review, 'PUBLISHED')}
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={!canModerate || busyKey === `${normalizedType}-${review.reviewId}-FLAGGED`}
                      onClick={() => handleReviewStatusChange(review, 'FLAGGED')}
                    >
                      Flag
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={!canModerate || busyKey === `${normalizedType}-${review.reviewId}-REMOVED`}
                      onClick={() => handleReviewStatusChange(review, 'REMOVED')}
                      style={{ borderColor: '#FECACA', color: '#B91C1C' }}
                    >
                      Remove
                    </button>
                  </div>

                  {openReports.length > 0 ? (
                    <div style={{ marginTop: 18, borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>Open Reports</div>
                      <div style={{ display: 'grid', gap: 12 }}>
                        {openReports.map((report) => (
                          <div key={report.reportId} style={{ border: '1px solid #FDE68A', background: '#FFF7ED', borderRadius: 14, padding: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                              <div>
                                <div style={{ fontWeight: 700, color: '#9A3412' }}>{report.reason || 'OTHER'}</div>
                                <div style={{ color: '#7C2D12', fontSize: 13, marginTop: 4 }}>
                                  {report.reporterName || 'Reporter'} raised this on {formatDateTime(report.createdOn)}
                                </div>
                              </div>
                              <span style={statusBadgeStyle(report.status)}>{normalize(report.status)}</span>
                            </div>
                            <div style={{ color: '#7C2D12', fontSize: 14, lineHeight: 1.5, marginTop: 10 }}>
                              {report.details || 'No extra details shared by the reporter.'}
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="secondary-btn"
                                disabled={!canModerate || busyKey === `report-${report.reportId}-RESOLVED`}
                                onClick={() => handleReportStatusChange(report, 'RESOLVED')}
                              >
                                Resolve Report
                              </button>
                              <button
                                type="button"
                                className="secondary-btn"
                                disabled={!canModerate || busyKey === `report-${report.reportId}-DISMISSED`}
                                onClick={() => handleReportStatusChange(report, 'DISMISSED')}
                              >
                                Dismiss Report
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ color: '#475569', fontSize: 14 }}>
            Showing page {payload?.page || page} with {items.length} records
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="secondary-btn"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="secondary-btn"
              disabled={!hasMore || isLoading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewModerationPage;
