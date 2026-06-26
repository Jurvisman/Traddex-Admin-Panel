import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { listPayoutOrders, confirmPayout } from '../services/adminApi';

const normalize = (value) => String(value || '').toLowerCase();

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const getCountdownText = (releaseTimeStr) => {
  if (!releaseTimeStr) return 'No window set';
  const releaseTime = new Date(releaseTimeStr);
  const diffMs = releaseTime.getTime() - Date.now();
  if (diffMs <= 0) return 'Ready for release';

  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m remaining`;
};


const TABS = [
  { label: 'Held in Escrow', value: 'HELD' },
  { label: 'Due for Payout', value: 'DUE' },
  { label: 'Paid Settlements', value: 'PAID' },
];

function EscrowPayoutsPage({ token }) {
  const [activeTab, setActiveTab] = useState('HELD');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activePayout, setActivePayout] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const loadData = async (statusValue = activeTab) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listPayoutOrders(token, statusValue);
      const raw = Array.isArray(response?.data) ? response.data : [];
      raw.sort((a, b) => new Date(b.createdOn || 0) - new Date(a.createdOn || 0));
      setItems(raw);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load payouts.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const stats = useMemo(() => {
    const counts = { HELD: 0, DUE: 0, PAID: 0 };
    items.forEach((item) => {
      const status = String(item?.payoutStatus || '').toUpperCase();
      if (counts[status] !== undefined) {
        counts[status] += 1;
      }
    });
    return counts;
  }, [items]);

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
        item?.sellerUpiId,
      ]
        .map(normalize)
        .join(' ');
      return haystack.includes(term);
    });
  }, [items, query]);

  const handleConfirmPayout = async () => {
    if (!activePayout?.id) return;
    setIsConfirming(true);
    setMessage({ type: 'info', text: '' });
    try {
      await confirmPayout(token, activePayout.id, activePayout.isStorefront);
      setShowModal(false);
      setActivePayout(null);
      await loadData(activeTab);
      setMessage({ type: 'success', text: 'Payout status updated to PAID successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update payout status.' });
    } finally {
      setIsConfirming(false);
    }
  };

  const openQrModal = (item) => {
    setActivePayout(item);
    setShowModal(true);
  };

  // Generate UPI QR Code URL using free QR server API
  const upiQrCodeUrl = useMemo(() => {
    if (!activePayout) return '';
    const sellerUpi = activePayout.sellerUpiId || '';
    const sellerName = activePayout.sellerBusinessName || activePayout.sellerName || 'Seller';
    const amount = activePayout.price || '0.00';
    // Format: upi://pay?pa=recipient@upi&pn=RecipientName&am=Amount&cu=INR
    const upiPayload = `upi://pay?pa=${sellerUpi}&pn=${encodeURIComponent(sellerName)}&am=${amount}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiPayload)}`;
  }, [activePayout]);

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Escrow Payouts Ledger</h2>
          <p className="panel-subtitle">Manage seller payout states: Held, Due, and Settled.</p>
        </div>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => loadData(activeTab)}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <Banner message={message} />

      {/* Tabs */}
      <div className="tab-container" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`tab-btn ${activeTab === tab.value ? 'primary-btn' : 'ghost-btn'}`}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: activeTab === tab.value ? 'bold' : 'normal',
            }}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label} {stats[tab.value] ? `(${stats[tab.value]})` : ''}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="panel card">
        <div className="panel-split">
          <h3 className="panel-subheading">Filters & Search</h3>
        </div>
        <div className="field-grid" style={{ gridTemplateColumns: '1fr' }}>
          <label className="field">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by order ID, PO reference, buyer, seller, UPI..."
            />
          </label>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="panel card">
        <div className="panel-split">
          <h3 className="panel-subheading">
            {TABS.find((t) => t.value === activeTab)?.label || 'Payout List'}
          </h3>
          <span className="panel-hint">{filteredItems.length} records</span>
        </div>
        <div className="table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>PO Ref</th>
                <th>Buyer</th>
                <th>Seller</th>
                <th>Seller UPI</th>
                <th>Amount</th>
                <th>Created</th>
                <th>Delivered</th>
                {activeTab === 'HELD' && <th>Countdown</th>}
                <th className="table-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 'bold' }}>#{item.id}</td>
                    <td>{item.orderReference || '-'}</td>
                    <td>
                      <div>{item.buyerBusinessName || item.buyerName}</div>
                      {item.buyerBusinessName && (
                        <small style={{ color: '#64748B' }}>({item.buyerName})</small>
                      )}
                    </td>
                    <td>
                      <div>{item.sellerBusinessName || item.sellerName}</div>
                      {item.sellerBusinessName && (
                        <small style={{ color: '#64748B' }}>({item.sellerName})</small>
                      )}
                    </td>
                    <td>
                      {item.sellerUpiId ? (
                        <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.sellerUpiId}
                        </code>
                      ) : (
                        <span style={{ color: '#EF4444', fontSize: '12px' }}>⚠️ Missing UPI ID</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 'bold', color: '#16A34A' }}>
                      ₹{Number(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>{formatDate(item.createdOn)}</td>
                    <td>{formatDate(item.deliveredOn)}</td>
                    {activeTab === 'HELD' && (
                      <td>
                        <span
                          className={`status-pill ${
                            getCountdownText(item.escrowReleaseAt).includes('Ready')
                              ? 'approved'
                              : 'pending-review'
                          }`}
                        >
                          {getCountdownText(item.escrowReleaseAt)}
                        </span>
                      </td>
                    )}
                    <td className="table-actions">
                      <div className="table-action-group">
                        {activeTab === 'DUE' && (
                          <button
                            type="button"
                            className="primary-btn small"
                            onClick={() => openQrModal(item)}
                          >
                            Pay Out
                          </button>
                        )}
                        {activeTab === 'HELD' && (
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={() => openQrModal(item)}
                          >
                            Preview QR
                          </button>
                        )}
                        {activeTab === 'PAID' && (
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={() => openQrModal(item)}
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredItems.length ? (
                <tr>
                  <td colSpan={activeTab === 'HELD' ? '10' : '9'} className="empty-state">
                    No matching payouts found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPI QR Code Settlement Modal */}
      {showModal && activePayout ? (
        <div className="admin-modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="admin-modal"
            style={{ maxWidth: '480px', padding: '24px' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split" style={{ marginBottom: '16px' }}>
              <h3 className="panel-subheading" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                {activeTab === 'PAID' ? 'Payout Settlement Details' : 'Settle Seller Escrow Payout'}
              </h3>
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => setShowModal(false)}
                style={{ minWidth: 'auto', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Summary Details */}
              <div
                style={{
                  background: '#F8FAFC',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748B' }}>Order Reference:</span>
                  <span style={{ fontWeight: 'bold' }}>#{activePayout.id} ({activePayout.orderReference})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748B' }}>Seller Business:</span>
                  <span style={{ fontWeight: 'bold' }}>{activePayout.sellerBusinessName || activePayout.sellerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748B' }}>Seller UPI ID:</span>
                  <span style={{ fontWeight: 'bold', color: activePayout.sellerUpiId ? '#0F172A' : '#EF4444' }}>
                    {activePayout.sellerUpiId || 'Not configured'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                  <span style={{ color: '#64748B', fontWeight: 'bold' }}>Payout Amount:</span>
                  <span style={{ fontWeight: 'bold', color: '#16A34A', fontSize: '1.1rem' }}>
                    ₹{Number(activePayout.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* QR Code Container */}
              {activePayout.sellerUpiId ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px' }}>
                  <p style={{ fontSize: '13px', color: '#64748B', textAlign: 'center' }}>
                    Scan QR code with GPay, PhonePe, Paytm, or BHIM UPI app:
                  </p>
                  <div
                    style={{
                      border: '2px solid #E2E8F0',
                      padding: '12px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <img
                      src={upiQrCodeUrl}
                      alt="UPI QR Code"
                      style={{ width: '220px', height: '220px', display: 'block' }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Powered by QRServer API</span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    background: '#FEF2F2',
                    borderRadius: '8px',
                    border: '1px dashed #FCA5A5',
                    color: '#991B1B',
                    gap: '8px',
                  }}
                >
                  <span>⚠️ UPI QR code cannot be generated.</span>
                  <p style={{ fontSize: '13px', textAlign: 'center', margin: 0 }}>
                    The seller has not configured a UPI ID in their onboarding profile. Please prompt them to setup their UPI ID.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  borderTop: '1px solid #E2E8F0',
                  paddingTop: '16px',
                }}
              >
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
                {activeTab === 'DUE' && activePayout.sellerUpiId && (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleConfirmPayout}
                    disabled={isConfirming}
                  >
                    {isConfirming ? 'Updating...' : 'Confirm Settlement Paid'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default EscrowPayoutsPage;
