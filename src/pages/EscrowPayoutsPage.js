import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import {
  confirmPayout,
  listManualDeliveryClaims,
  listPayoutOrders,
  refundPayout,
  reviewManualDeliveryClaim,
} from '../services/adminApi';

const TABS = [
  { label: 'Held in Escrow', value: 'HELD' },
  { label: 'Due for Payout', value: 'DUE' },
  { label: 'Paid Settlements', value: 'PAID' },
  { label: 'Refund Pending', value: 'REFUND_PENDING' },
  { label: 'Manual Delivery Claims', value: 'MANUAL_CLAIMS' },
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
  return date.toLocaleString();
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
const getRecordAmount = (item, activeTab) =>
  activeTab === 'MANUAL_CLAIMS' ? item?.approvedAmount || item?.amountPaid : item?.price;
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

const getQrUrl = (item, activeTab) => {
  const sellerUpi = sellerPayment(item).upi || '';
  if (!sellerUpi) return '';
  const sellerName = getSellerName(item);
  const amount = getRecordAmount(item, activeTab) || '0.00';
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
  const [activeTab, setActiveTab] = useState('HELD');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [claimDecision, setClaimDecision] = useState('APPROVED');
  const [claimApprovedAmount, setClaimApprovedAmount] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const loadData = async (statusValue = activeTab) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = statusValue === 'MANUAL_CLAIMS'
        ? await listManualDeliveryClaims(token)
        : await listPayoutOrders(token, statusValue);
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
    loadData(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filteredItems = useMemo(() => {
    const term = normalize(query);
    if (!term) return items;
    return items.filter((item) => {
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
  }, [items, query]);

  const totals = useMemo(() => {
    const amount = filteredItems.reduce((sum, item) => sum + Number(getRecordAmount(item, activeTab) || 0), 0);
    return { count: filteredItems.length, amount };
  }, [filteredItems, activeTab]);

  const openRecord = (item) => {
    setActiveRecord(item);
    if (activeTab === 'MANUAL_CLAIMS') {
      setClaimDecision(item?.status === 'APPROVED' ? 'PAID' : 'APPROVED');
      setClaimApprovedAmount(item?.approvedAmount || item?.amountPaid || '');
      setClaimNote(item?.adminNote || '');
    }
  };

  const handleConfirmPayout = async () => {
    if (!activeRecord?.id) return;
    setIsConfirming(true);
    setMessage({ type: 'info', text: '' });
    try {
      await confirmPayout(token, activeRecord.id, activeRecord.isStorefront);
      await loadData(activeTab);
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
      await loadData(activeTab);
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
      await loadData(activeTab);
      setMessage({ type: 'success', text: `Manual delivery claim marked ${claimDecision}.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to review manual delivery claim.' });
    } finally {
      setIsConfirming(false);
    }
  };

  const qrUrl = useMemo(() => getQrUrl(activeRecord, activeTab), [activeRecord, activeTab]);

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Escrow Payouts Ledger</h2>
          <p className="panel-subtitle">Manage held, due, paid and manual delivery reimbursement payouts.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={() => loadData(activeTab)} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <Banner message={message} />

      <div style={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={activeTab === tab.value ? 'primary-btn' : 'ghost-btn'}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.summaryStrip}>
        <div style={styles.summaryBox}>
          <span style={styles.summaryLabel}>Records</span>
          <strong style={styles.summaryValue}>{totals.count}</strong>
        </div>
        <div style={styles.summaryBox}>
          <span style={styles.summaryLabel}>Total amount</span>
          <strong style={styles.summaryValue}>{money(totals.amount)}</strong>
        </div>
        <label className="field" style={styles.searchField}>
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Order, seller, UPI, mobile, bank account, IFSC..."
          />
        </label>
      </div>

      <div className="panel card">
        <div className="panel-split">
          <h3 className="panel-subheading">{TABS.find((t) => t.value === activeTab)?.label}</h3>
          <span className="panel-hint">Click any row to view payment details</span>
        </div>

        <div className="table-shell">
          {activeTab === 'MANUAL_CLAIMS' ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Claim</th>
                  <th>Order</th>
                  <th>Seller</th>
                  <th>Courier</th>
                  <th>Claimed</th>
                  <th>Approved</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th className="table-actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const status = String(item.status || '').toUpperCase();
                  return (
                    <tr key={item.id} onClick={() => openRecord(item)} style={styles.clickableRow}>
                      <td><strong>{item.claimReference || `#${item.id}`}</strong></td>
                      <td>#{item.orderId}<br /><small>{item.orderReference || '-'}</small></td>
                      <td>{getSellerName(item)}</td>
                      <td>{item.courierType || '-'}<br /><small>{item.bookingId || '-'}</small></td>
                      <td><strong>{money(item.amountPaid)}</strong></td>
                      <td>{money(item.approvedAmount)}</td>
                      <td><span className="status-pill pending-review">{status}</span></td>
                      <td>{formatDate(item.submittedAt)}</td>
                      <td className="table-actions">
                        <button type="button" className="ghost-btn small" onClick={(event) => { event.stopPropagation(); openRecord(item); }}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filteredItems.length ? (
                  <tr><td colSpan="9" className="empty-state">No manual delivery claims found.</td></tr>
                ) : null}
              </tbody>
            </table>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Buyer</th>
                  <th>Seller</th>
                  <th>Payment Details</th>
                  <th>Net Payout</th>
                  <th>Status</th>
                  <th>{activeTab === 'HELD' ? 'Release Window' : 'Delivered'}</th>
                  <th className="table-actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={`${item.isStorefront ? 's' : 'p'}-${item.id}`} onClick={() => openRecord(item)} style={styles.clickableRow}>
                    <td><strong>#{item.id}</strong><br /><small>{item.orderReference || '-'}</small></td>
                    <td>{getBuyerName(item)}</td>
                    <td>{getSellerName(item)}</td>
                    <td>
                      <div>{sellerPayment(item).upi ? `UPI: ${sellerPayment(item).upi}` : 'UPI missing'}</div>
                      <small>{sellerPayment(item).account ? `Bank: ${sellerPayment(item).account}` : 'Bank missing'}</small>
                    </td>
                    <td><strong style={{ color: '#16A34A' }}>{money(item.price)}</strong></td>
                    <td><span className="status-pill approved">{item.payoutStatus}</span></td>
                    <td>
                      {activeTab === 'HELD' ? getCountdownText(item.escrowReleaseAt) : formatDate(item.deliveredOn)}
                    </td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className={activeTab === 'DUE' || activeTab === 'REFUND_PENDING' ? 'primary-btn small' : 'ghost-btn small'}
                        onClick={(event) => { event.stopPropagation(); openRecord(item); }}
                      >
                        {activeTab === 'DUE' ? 'Pay' : activeTab === 'REFUND_PENDING' ? 'Refund' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredItems.length ? (
                  <tr><td colSpan="8" className="empty-state">No matching payouts found.</td></tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {activeRecord ? (
        <div style={styles.drawerBackdrop} onClick={() => setActiveRecord(null)}>
          <aside style={styles.drawer} onClick={(event) => event.stopPropagation()}>
            <div style={styles.drawerHead}>
              <div>
                <h3 style={styles.drawerTitle}>
                  {activeTab === 'MANUAL_CLAIMS' ? 'Manual Delivery Claim' : 'Payout Details'}
                </h3>
                <p style={styles.drawerSub}>
                  {activeRecord.orderReference || activeRecord.claimReference || `#${activeRecord.id}`}
                </p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setActiveRecord(null)}>Close</button>
            </div>

            <section style={styles.drawerSection}>
              <h4 style={styles.sectionTitle}>Settlement Summary</h4>
              <DetailRow label="Seller" value={getSellerName(activeRecord)} />
              <DetailRow label="Buyer" value={getBuyerName(activeRecord)} />
              {activeTab !== 'MANUAL_CLAIMS' ? (
                <>
                  <DetailRow label="Gross product amount" value={money(getGrossAmount(activeRecord))} />
                  <DetailRow label="Payment & order handling fee (3%)" value={`-${money(getProcessingFee(activeRecord))}`} />
                </>
              ) : null}
              <DetailRow label="Net amount to pay" value={money(getRecordAmount(activeRecord, activeTab))} />
              <DetailRow label="Status" value={activeTab === 'MANUAL_CLAIMS' ? activeRecord.status : activeRecord.payoutStatus} />
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

            {activeTab === 'MANUAL_CLAIMS' ? (
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

            <div style={styles.drawerActions}>
              <button type="button" className="ghost-btn" onClick={() => setActiveRecord(null)}>Cancel</button>
              {activeTab === 'DUE' ? (
                <button type="button" className="primary-btn" onClick={handleConfirmPayout} disabled={isConfirming}>
                  {isConfirming ? 'Saving...' : 'Mark Settlement Paid'}
                </button>
              ) : null}
              {activeTab === 'REFUND_PENDING' ? (
                <button type="button" className="primary-btn" onClick={handleRefundPayout} disabled={isConfirming || activeRecord?.isStorefront}>
                  {isConfirming ? 'Processing...' : 'Refund via Razorpay'}
                </button>
              ) : null}
              {activeTab === 'MANUAL_CLAIMS' ? (
                <button type="button" className="primary-btn" onClick={handleReviewClaim} disabled={isConfirming}>
                  {isConfirming ? 'Saving...' : 'Save Claim Review'}
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  tabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  summaryStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    alignItems: 'end',
    marginBottom: 16,
  },
  summaryBox: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  summaryLabel: { display: 'block', color: '#64748B', fontSize: 12, marginBottom: 4 },
  summaryValue: { color: '#0F172A', fontSize: 18 },
  searchField: { margin: 0 },
  clickableRow: { cursor: 'pointer' },
  drawerBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.26)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  drawer: {
    width: 'min(520px, 100vw)',
    height: '100%',
    background: '#FFFFFF',
    boxShadow: '-16px 0 40px rgba(15, 23, 42, 0.18)',
    padding: 22,
    overflowY: 'auto',
  },
  drawerHead: { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 },
  drawerTitle: { margin: 0, fontSize: 20, color: '#0F172A' },
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
  drawerActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 14,
    borderTop: '1px solid #E2E8F0',
  },
};

export default EscrowPayoutsPage;
