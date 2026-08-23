import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner, DataTable, TableRowActionMenu } from '../components';
import {
  confirmPayout,
  listManualDeliveryClaims,
  listPayoutOrders,
  refundPayout,
  reviewManualDeliveryClaim,
} from '../services/adminApi';

const VIEWS = [
  { label: 'Payout Orders', value: 'PAYOUTS' },
  { label: 'Manual Delivery Claims', value: 'CLAIMS' },
];

const PAYOUT_STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Held in Escrow', value: 'HELD' },
  { label: 'Due for Payout', value: 'DUE' },
  { label: 'Paid Settlements', value: 'PAID' },
  { label: 'Refund Pending', value: 'REFUND_PENDING' },
  { label: 'Refunded', value: 'REFUNDED' },
];

const CLAIM_STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Paid', value: 'PAID' },
];

const normalize = (value) => String(value || '').toLowerCase();

const money = (value) =>
  `Rs ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getOrderDate = (item) => item?.createdOn || item?.orderDate || item?.submittedAt || item?.createdAt;

const resolvePayoutStatusClass = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PAID') return 'approved';
  if (normalized === 'REFUND_PENDING') return 'rejected';
  if (normalized === 'DUE') return 'pending-review';
  if (normalized === 'HELD') return 'closed';
  return 'pending-review';
};

const resolveClaimStatusClass = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PAID') return 'approved';
  if (normalized === 'REJECTED') return 'rejected';
  if (normalized === 'APPROVED') return 'changes-required';
  return 'pending-review';
};

const getCountdownText = (releaseTimeStr) => {
  if (!releaseTimeStr) return 'No release window';
  const releaseTime = new Date(releaseTimeStr);
  const diffMs = releaseTime.getTime() - Date.now();
  if (diffMs <= 0) return 'Ready for release';
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m remaining`;
};

const parseProofUrls = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(raw)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const getSellerName = (item) => item?.sellerBusinessName || item?.sellerName || '-';
const getBuyerName = (item) => item?.buyerBusinessName || item?.buyerName || '-';
const getRecordAmount = (item, view) =>
  view === 'CLAIMS' ? item?.approvedAmount || item?.amountPaid : item?.price;
const getGrossAmount = (item) => item?.grossProductAmount ?? item?.gross_product_amount ?? item?.price ?? 0;
const getProcessingFee = (item) => item?.processingFeeAmount ?? item?.processing_fee_amount ?? 0;
const pick = (item, ...keys) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return '';
};
const sellerPayment = (item) => ({
  upi: pick(item, 'sellerUpiId', 'seller_upi_id'),
  mobile: pick(item, 'sellerMobile', 'seller_mobile', 'sellerPhone', 'seller_phone', 'contactNumber', 'contact_number'),
  holder: pick(item, 'sellerAccountHolderName', 'seller_account_holder_name', 'accountHolderName', 'account_holder_name'),
  bank: pick(item, 'sellerBankName', 'seller_bank_name', 'bankName', 'bank_name'),
  account: pick(item, 'sellerAccountNumber', 'seller_account_number', 'accountNumber', 'account_number'),
  ifsc: pick(item, 'sellerIfscCode', 'seller_ifsc_code', 'ifscCode', 'ifsc_code'),
});

const getQrUrl = (item, view) => {
  const sellerUpi = sellerPayment(item).upi || '';
  if (!sellerUpi) return '';
  const sellerName = getSellerName(item);
  const amount = getRecordAmount(item, view) || '0.00';
  const payload = `upi://pay?pa=${sellerUpi}&pn=${encodeURIComponent(sellerName)}&am=${amount}&cu=INR`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
};

function DetailRow({ label, value, mono }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <strong style={mono ? styles.monoValue : styles.detailValue}>{value || '-'}</strong>
    </div>
  );
}

function EscrowPayoutsPage({ token }) {
  const [view, setView] = useState('PAYOUTS');
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [claimDecision, setClaimDecision] = useState('APPROVED');
  const [claimApprovedAmount, setClaimApprovedAmount] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [openActionRowId, setOpenActionRowId] = useState(null);

  const loadData = async (viewValue = view) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = viewValue === 'CLAIMS'
        ? await listManualDeliveryClaims(token)
        : await listPayoutOrders(token);
      const raw = Array.isArray(response?.data) ? response.data : [];
      raw.sort((a, b) => new Date(b.createdOn || b.submittedAt || 0) - new Date(a.createdOn || a.submittedAt || 0));
      setItems(raw);
      setActiveRecord(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load payout data.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setStatusFilter('');
    loadData(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    setPage(0);
  }, [view, statusFilter, query]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (statusFilter) {
      result = result.filter((item) => {
        const status = view === 'CLAIMS' ? item?.status : item?.payoutStatus;
        return String(status || '').toUpperCase() === statusFilter;
      });
    }
    const term = normalize(query);
    if (term) {
      result = result.filter((item) => {
        const haystack = [
          item?.id,
          item?.orderReference,
          item?.buyerName,
          item?.buyerBusinessName,
          item?.sellerName,
          item?.sellerBusinessName,
          sellerPayment(item).upi,
          sellerPayment(item).mobile,
          sellerPayment(item).account,
          sellerPayment(item).ifsc,
          item?.claimReference,
          item?.courierType,
          item?.bookingId,
        ].map(normalize).join(' ');
        return haystack.includes(term);
      });
    }
    return result;
  }, [items, statusFilter, query, view]);

  const totals = useMemo(() => {
    const amount = filteredItems.reduce((sum, item) => sum + Number(getRecordAmount(item, view) || 0), 0);
    return { count: filteredItems.length, amount };
  }, [filteredItems, view]);

  const openRecord = useCallback((item) => {
    setActiveRecord(item);
    if (view === 'CLAIMS') {
      setClaimDecision(item?.status === 'APPROVED' ? 'PAID' : 'APPROVED');
      setClaimApprovedAmount(item?.approvedAmount || item?.amountPaid || '');
      setClaimNote(item?.adminNote || '');
    }
  }, [view]);

  const handleConfirmPayout = async () => {
    if (!activeRecord?.id) return;
    setIsConfirming(true);
    setMessage({ type: 'info', text: '' });
    try {
      await confirmPayout(token, activeRecord.id, activeRecord.isStorefront);
      await loadData(view);
      setMessage({ type: 'success', text: 'Payout marked PAID successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update payout status.' });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRefundPayout = async () => {
    if (!activeRecord?.id) return;
    if (activeRecord.isStorefront) {
      setMessage({ type: 'error', text: 'Storefront order refunds must be processed from the alert popup (payment ID entry required).' });
      return;
    }
    setIsConfirming(true);
    setMessage({ type: 'info', text: '' });
    try {
      await refundPayout(token, activeRecord.id);
      await loadData(view);
      setMessage({ type: 'success', text: 'Refund processed successfully via Razorpay.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to process refund.' });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReviewClaim = async () => {
    if (!activeRecord?.id) return;
    setIsConfirming(true);
    setMessage({ type: 'info', text: '' });
    try {
      await reviewManualDeliveryClaim(token, activeRecord.id, {
        status: claimDecision,
        approvedAmount: claimApprovedAmount,
        adminNote: claimNote,
      });
      await loadData(view);
      setMessage({ type: 'success', text: `Manual delivery claim marked ${claimDecision}.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to review manual delivery claim.' });
    } finally {
      setIsConfirming(false);
    }
  };

  const qrUrl = useMemo(() => getQrUrl(activeRecord, view), [activeRecord, view]);

  const claimColumns = useMemo(() => [
    {
      key: 'claimReference',
      header: 'Claim',
      render: (val, item) => <strong>{val || `#${item.id}`}</strong>,
    },
    {
      key: 'orderId',
      header: 'Order',
      render: (val, item) => (
        <span>
          #{val}<br /><small>{item.orderReference || '-'}</small>
        </span>
      ),
    },
    {
      key: 'seller',
      header: 'Seller',
      render: (_, item) => getSellerName(item),
    },
    {
      key: 'courierType',
      header: 'Courier',
      render: (val, item) => (
        <span>
          {val || '-'}<br /><small>{item.bookingId || '-'}</small>
        </span>
      ),
    },
    {
      key: 'amountPaid',
      header: 'Claimed',
      align: 'right',
      sortable: true,
      render: (val) => <strong>{money(val)}</strong>,
    },
    {
      key: 'approvedAmount',
      header: 'Approved',
      align: 'right',
      sortable: true,
      render: (val) => money(val),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (status) => (
        <span className={`status-pill ${resolveClaimStatusClass(status)}`}>
          {String(status || '').toUpperCase() || 'PENDING'}
        </span>
      ),
    },
    {
      key: 'submittedAt',
      header: 'Submitted',
      sortable: true,
      render: (val) => formatDate(val),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, item) => (
        <div className="table-actions" onClick={(event) => event.stopPropagation()}>
          <TableRowActionMenu
            rowId={item.id}
            openRowId={openActionRowId}
            onToggle={setOpenActionRowId}
            actions={[{ label: 'View Claim', onClick: () => openRecord(item) }]}
          />
        </div>
      ),
    },
  ], [openRecord, openActionRowId]);

  const payoutColumns = useMemo(() => [
    {
      key: 'id',
      header: 'Order',
      sortable: true,
      render: (val, item) => (
        <span>
          <strong>#{val}</strong><br /><small>{item.orderReference || '-'}</small>
        </span>
      ),
    },
    {
      key: 'buyer',
      header: 'Buyer',
      render: (_, item) => getBuyerName(item),
    },
    {
      key: 'seller',
      header: 'Seller',
      render: (_, item) => getSellerName(item),
    },
    {
      key: 'payment',
      header: 'Payment Details',
      render: (_, item) => (
        <span>
          <div>{sellerPayment(item).upi ? `UPI: ${sellerPayment(item).upi}` : 'UPI missing'}</div>
          <small>{sellerPayment(item).account ? `Bank: ${sellerPayment(item).account}` : 'Bank missing'}</small>
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Net Payout',
      align: 'right',
      sortable: true,
      render: (val) => <strong style={{ color: '#16A34A' }}>{money(val)}</strong>,
    },
    {
      key: 'payoutStatus',
      header: 'Status',
      sortable: true,
      render: (status) => (
        <span className={`status-pill ${resolvePayoutStatusClass(status)}`}>{status}</span>
      ),
    },
    {
      key: 'orderDate',
      header: 'Order Date',
      sortable: true,
      render: (_, item) => formatDate(getOrderDate(item)),
    },
    {
      key: 'window',
      header: 'Release / Delivered',
      render: (_, item) => (
        String(item?.payoutStatus || '').toUpperCase() === 'HELD'
          ? getCountdownText(item.escrowReleaseAt)
          : formatDate(item.deliveredOn)
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, item) => {
        const rowStatus = String(item?.payoutStatus || '').toUpperCase();
        const actionLabel = rowStatus === 'DUE' ? 'Pay Now' : rowStatus === 'REFUND_PENDING' ? 'Process Refund' : 'View Details';
        return (
          <div className="table-actions" onClick={(event) => event.stopPropagation()}>
            <TableRowActionMenu
              rowId={item.id}
              openRowId={openActionRowId}
              onToggle={setOpenActionRowId}
              actions={[{ label: actionLabel, onClick: () => openRecord(item) }]}
            />
          </div>
        );
      },
    },
  ], [openRecord, openActionRowId]);

  const activeRecordStatus = String(activeRecord?.payoutStatus || '').toUpperCase();

  const refreshButton = (
    <button
      type="button"
      className="icon-btn"
      title="Refresh"
      aria-label="Refresh"
      onClick={() => loadData(view)}
      disabled={isLoading}
      style={isLoading ? { animation: 'spinRotate 0.8s linear infinite' } : undefined}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2v6h-6" />
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M3 22v-6h6" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      </svg>
    </button>
  );

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Escrow Payouts Ledger</h2>
          <p className="panel-subtitle">Manage held, due, paid and manual delivery reimbursement payouts.</p>
        </div>
      </div>

      <Banner message={message} />

      <div style={styles.statStrip}>
        <div style={styles.viewSwitch}>
          {VIEWS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              style={view === tab.value ? styles.viewSwitchBtnActive : styles.viewSwitchBtn}
              onClick={() => setView(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.statChip}>
          <span style={styles.statChipLabel}>Records</span>
          <strong style={{ ...styles.statChipValue, color: '#6345ED' }}>{totals.count}</strong>
          <span style={styles.statChipHint}>
            {(view === 'CLAIMS' ? CLAIM_STATUS_OPTIONS : PAYOUT_STATUS_OPTIONS).find((o) => o.value === statusFilter)?.label}
          </span>
        </div>
        <div style={styles.statChip}>
          <span style={styles.statChipLabel}>Total amount</span>
          <strong style={{ ...styles.statChipValue, color: '#16A34A' }}>{money(totals.amount)}</strong>
        </div>
      </div>

      <div className="panel card users-table-card">
        {view === 'CLAIMS' ? (
          <DataTable
            columns={claimColumns}
            data={filteredItems}
            isLoading={isLoading}
            search={query}
            onSearchChange={setQuery}
            searchPlaceholder="Order, seller, courier, booking ID..."
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
            emptyTitle="No manual delivery claims found"
            emptyDescription="No claims match your search or filter."
            onRowClick={openRecord}
            toolbarLeft={
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="datatable-pagesize-select"
                style={{ height: 38, padding: '0 12px', borderRadius: 9999, minWidth: 160 }}
              >
                {CLAIM_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            }
            toolbarRight={refreshButton}
          />
        ) : (
          <DataTable
            columns={payoutColumns}
            data={filteredItems}
            isLoading={isLoading}
            search={query}
            onSearchChange={setQuery}
            searchPlaceholder="Order, seller, UPI, mobile, bank account, IFSC..."
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
            emptyTitle="No matching payouts found"
            emptyDescription="No payouts match your search or filter."
            onRowClick={openRecord}
            toolbarLeft={
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="datatable-pagesize-select"
                style={{ height: 38, padding: '0 12px', borderRadius: 9999, minWidth: 160 }}
              >
                {PAYOUT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            }
            toolbarRight={refreshButton}
          />
        )}
      </div>

      {activeRecord ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setActiveRecord(null)}>
          <div className="admin-modal" style={{ width: 'min(640px, 100%)' }} onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3 className="admin-modal-title">
                  {view === 'CLAIMS' ? 'Manual Delivery Claim' : 'Payout Details'}
                </h3>
                <p style={styles.drawerSub}>
                  {activeRecord.orderReference || activeRecord.claimReference || `#${activeRecord.id}`}
                </p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setActiveRecord(null)}>Close</button>
            </div>

            <div className="admin-modal-body">

            <section style={styles.drawerSection}>
              <h4 style={styles.sectionTitle}>Settlement Summary</h4>
              <DetailRow label="Seller" value={getSellerName(activeRecord)} />
              <DetailRow label="Buyer" value={getBuyerName(activeRecord)} />
              <DetailRow label="Order date" value={formatDate(getOrderDate(activeRecord) || activeRecord.submittedAt)} />
              {view !== 'CLAIMS' ? (
                <>
                  <DetailRow label="Gross product amount" value={money(getGrossAmount(activeRecord))} />
                  <DetailRow label="Payment & order handling fee (3%)" value={`-${money(getProcessingFee(activeRecord))}`} />
                </>
              ) : null}
              <DetailRow label="Net amount to pay" value={money(getRecordAmount(activeRecord, view))} />
              <DetailRow label="Status" value={view === 'CLAIMS' ? activeRecord.status : activeRecord.payoutStatus} />
            </section>

            <section style={styles.drawerSection}>
              <h4 style={styles.sectionTitle}>Payment Details</h4>
              <DetailRow label="UPI ID" value={sellerPayment(activeRecord).upi || 'Not configured'} mono />
              <DetailRow label="Mobile" value={sellerPayment(activeRecord).mobile || 'Not configured'} mono />
              <DetailRow label="Account holder" value={sellerPayment(activeRecord).holder || 'Not configured'} />
              <DetailRow label="Bank name" value={sellerPayment(activeRecord).bank || 'Not configured'} />
              <DetailRow label="Account number" value={sellerPayment(activeRecord).account || 'Not configured'} mono />
              <DetailRow label="IFSC code" value={sellerPayment(activeRecord).ifsc || 'Not configured'} mono />
            </section>

            {qrUrl ? (
              <section style={styles.qrBox}>
                <p style={styles.qrHelp}>UPI QR is optional. Admin can also pay using bank account, IFSC or mobile details above.</p>
                <img src={qrUrl} alt="UPI QR Code" style={styles.qrImage} />
              </section>
            ) : (
              <section style={styles.warningBox}>
                UPI QR unavailable. Use bank account / IFSC / mobile details for manual payout.
              </section>
            )}

            {view === 'CLAIMS' ? (
              <section style={styles.drawerSection}>
                <h4 style={styles.sectionTitle}>Claim Review</h4>
                <DetailRow label="Courier" value={activeRecord.courierType} />
                <DetailRow label="Booking ID" value={activeRecord.bookingId} mono />
                <DetailRow label="Claimed amount" value={money(activeRecord.amountPaid)} />
                <div className="field-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
                  <label className="field">
                    <span>Decision</span>
                    <select value={claimDecision} onChange={(event) => setClaimDecision(event.target.value)}>
                      <option value="APPROVED">Approve</option>
                      <option value="REJECTED">Reject</option>
                      <option value="PAID">Paid</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Approved Amount</span>
                    <input value={claimApprovedAmount} onChange={(event) => setClaimApprovedAmount(event.target.value)} />
                  </label>
                  <label className="field" style={{ gridColumn: '1 / -1' }}>
                    <span>Admin Note</span>
                    <textarea rows="3" value={claimNote} onChange={(event) => setClaimNote(event.target.value)} />
                  </label>
                </div>
                <div style={styles.proofList}>
                  {parseProofUrls(activeRecord.proofUrls).map((url, index) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">Open proof {index + 1}</a>
                  ))}
                </div>
              </section>
            ) : null}

            </div>

            <div className="admin-modal-footer">
              <button type="button" className="ghost-btn" onClick={() => setActiveRecord(null)}>Cancel</button>
              {view !== 'CLAIMS' && activeRecordStatus === 'DUE' ? (
                <button type="button" className="primary-btn" onClick={handleConfirmPayout} disabled={isConfirming}>
                  {isConfirming ? 'Saving...' : 'Mark Settlement Paid'}
                </button>
              ) : null}
              {view !== 'CLAIMS' && activeRecordStatus === 'REFUND_PENDING' ? (
                <button type="button" className="primary-btn" onClick={handleRefundPayout} disabled={isConfirming || activeRecord?.isStorefront}>
                  {isConfirming ? 'Processing...' : 'Refund via Razorpay'}
                </button>
              ) : null}
              {view === 'CLAIMS' ? (
                <button type="button" className="primary-btn" onClick={handleReviewClaim} disabled={isConfirming}>
                  {isConfirming ? 'Saving...' : 'Save Claim Review'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  viewSwitch: {
    display: 'inline-flex',
    alignItems: 'center',
    height: 36,
    boxSizing: 'border-box',
    padding: 3,
    gap: 2,
    borderRadius: 999,
    background: '#F1F5F9',
    border: '1px solid #E2E8F0',
  },
  viewSwitchBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '100%',
    boxSizing: 'border-box',
    border: 'none',
    background: 'transparent',
    color: '#64748B',
    padding: '0 14px',
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 12.5,
    lineHeight: 1,
    cursor: 'pointer',
  },
  viewSwitchBtnActive: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '100%',
    boxSizing: 'border-box',
    border: 'none',
    background: '#6345ED',
    color: '#FFFFFF',
    padding: '0 14px',
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 12.5,
    lineHeight: 1,
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(99, 69, 237, 0.28)',
  },
  statStrip: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 },
  statChip: {
    display: 'inline-flex',
    alignItems: 'center',
    height: 36,
    boxSizing: 'border-box',
    gap: 6,
    padding: '0 12px',
    border: '1px solid #E2E8F0',
    borderRadius: 999,
    background: '#FFFFFF',
  },
  statChipLabel: { fontSize: 11.5, color: '#64748B', fontWeight: 600, lineHeight: 1 },
  statChipValue: { fontSize: 13, fontWeight: 700, lineHeight: 1 },
  statChipHint: { fontSize: 10.5, color: '#94A3B8', lineHeight: 1 },
  drawerSub: { margin: '4px 0 0', color: '#64748B' },
  drawerSection: {
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    background: '#FFFFFF',
  },
  sectionTitle: { margin: '0 0 10px', color: '#0F172A', fontSize: 14 },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    padding: '8px 0',
    borderTop: '1px solid #F1F5F9',
  },
  detailLabel: { color: '#64748B', fontSize: 13 },
  detailValue: { color: '#0F172A', textAlign: 'right' },
  monoValue: { color: '#0F172A', textAlign: 'right', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  qrBox: {
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    textAlign: 'center',
    background: '#F8FAFC',
  },
  qrHelp: { margin: '0 0 10px', color: '#64748B', fontSize: 13 },
  qrImage: { width: 220, height: 220, background: '#FFFFFF', borderRadius: 10 },
  warningBox: {
    border: '1px dashed #FCA5A5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    color: '#991B1B',
    background: '#FEF2F2',
  },
  proofList: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 },
};

export default EscrowPayoutsPage;
