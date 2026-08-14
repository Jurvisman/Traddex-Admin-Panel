import { useEffect, useState, useCallback } from 'react';
import { Banner, DataTable } from '../components';
import {
  listAdminLeads,
  getAdminLeadDetail,
  assignLeadManually,
  deleteLeadAssignment,
  getCreditAudit,
  getContactUnlockAudit,
  getSpamReports,
  searchSellers
} from '../services/adminApi';

/* ── Constants & Helpers ────────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const getSourceLabel = (src) => {
  if (!src) return '-';
  const s = String(src).toUpperCase();
  if (s === 'SEARCH') return 'Search';
  if (s === 'PRODUCT_VIEW') return 'Product View';
  if (s === 'SERVICE_VIEW') return 'Service View';
  if (s === 'DIRECT_INQUIRY') return 'Direct Inquiry';
  if (s === 'BULK_INQUIRY') return 'Bulk Inquiry';
  return s;
};

const getDisplayTypePillClass = (type) => {
  const t = String(type || '').trim().toUpperCase();
  if (t === 'HOT_INQUIRY') return 'status-active';       
  if (t === 'WARM_OPPORTUNITY') return 'status-inactive';  
  if (t === 'BULK_INQUIRY') return 'status-inactive';     
  return 'status-inactive';
};

const getDisplayTypeLabel = (type) => {
  const t = String(type || '').trim().toUpperCase();
  if (t === 'HOT_INQUIRY') return 'Hot Inquiry';
  if (t === 'WARM_OPPORTUNITY') return 'Warm Opportunity';
  if (t === 'BULK_INQUIRY') return 'Bulk Inquiry';
  return t || '-';
};

const EmptyState = ({ message = "No records found" }) => (
  <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--muted)', textAlign: 'center', width: '100%' }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 44, height: 44, marginBottom: 12, opacity: 0.6 }}>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
    <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{message}</p>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div className="mv-detail-row">
    <span className="mv-detail-label">{label}</span>
    <span className="mv-detail-value">{value ?? '-'}</span>
  </div>
);

function LeadManagementPage({ token }) {
  /* ── State ───────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('intents'); 
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  /* ── Tab 1: Lead Intents state ─────────────────────────────────── */
  const [intents, setIntents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterVisibility, setFilterVisibility] = useState(''); 
  const [filterCreditConsumed, setFilterCreditConsumed] = useState(''); 
  const [filterSellerId, setFilterSellerId] = useState('');
  
  // Split pane view
  const [intentDetail, setIntentDetail] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Seller Search logic
  const [sellerSearchQuery, setSellerSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingSellers, setIsSearchingSellers] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);

  /* ── Tab 2: Credit Audit state ─────────────────────────────────── */
  const [creditLogs, setCreditLogs] = useState([]);

  /* ── Tab 3: Contact Audit state ────────────────────────────────── */
  const [contactLogs, setContactLogs] = useState([]);

  /* ── Tab 4: Spam Reports state ─────────────────────────────────── */
  const [spamReports, setSpamReports] = useState([]);

  /* ── Fetching Data ────────────────────────────────────────────── */
  const loadIntents = useCallback(async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listAdminLeads(token, {
        page,
        limit: pageSize,
        source: filterSource,
        buyerVisible: filterVisibility,
        creditConsumed: filterCreditConsumed,
        sellerId: filterSellerId,
        query: query
      });
      setIntents(response?.data?.data || response?.data || []);
      setTotalCount(response?.data?.total || response?.total || 0);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load lead intents.' });
    } finally {
      setIsLoading(false);
    }
  }, [token, page, pageSize, filterSource, filterVisibility, filterCreditConsumed, filterSellerId, query]);

  const loadCreditLogs = useCallback(async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await getCreditAudit(token);
      setCreditLogs(response?.data || response || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load credit logs.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const loadContactLogs = useCallback(async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await getContactUnlockAudit(token);
      setContactLogs(response?.data || response || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load contact unlock logs.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const loadSpamReports = useCallback(async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await getSpamReports(token);
      setSpamReports(response?.data || response || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load spam reports.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load appropriate data based on active tab
  useEffect(() => {
    setIntentDetail(null); 
    if (activeTab === 'intents') {
      loadIntents();
    } else if (activeTab === 'credit_audit') {
      loadCreditLogs();
    } else if (activeTab === 'contact_audit') {
      loadContactLogs();
    } else if (activeTab === 'spam_reports') {
      loadSpamReports();
    }
  }, [activeTab, loadIntents, loadCreditLogs, loadContactLogs, loadSpamReports]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterSource, filterVisibility, filterCreditConsumed, filterSellerId, query]);

  /* ── Split Panel Action handlers ──────────────────────────────── */
  const handleOpenDrawer = async (intentId) => {
    setIntentDetail(null);
    setSelectedSeller(null);
    setSellerSearchQuery('');
    setSearchResults([]);
    try {
      const response = await getAdminLeadDetail(token, intentId);
      setIntentDetail(response?.data || response);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load intent details.' });
    }
  };

  const handleCloseDrawer = () => {
    setIntentDetail(null);
    setSelectedSeller(null);
    setSellerSearchQuery('');
    setSearchResults([]);
  };

  const handleSellerSearch = async (val) => {
    setSellerSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearchingSellers(true);
    try {
      const response = await searchSellers(token, val);
      setSearchResults(response?.data || response || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingSellers(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this assignment? If a lead credit was consumed by this seller, it will be automatically refunded.')) {
      return;
    }
    try {
      await deleteLeadAssignment(token, assignmentId);
      const response = await getAdminLeadDetail(token, intentDetail.intent.id);
      setIntentDetail(response?.data || response);
      loadIntents();
      alert('Assignment deleted and credit refunded (if applicable).');
    } catch (err) {
      alert(err.message || 'Failed to delete assignment.');
    }
  };

  /* ── Right side Details Panel Render ─────────────────────────── */
  const renderViewPanel = () => {
    if (!intentDetail) return null;
    const intent = intentDetail.intent || {};
    const assignments = intentDetail.assignments || [];

    return (
      <div className="mv-panel card" style={{ flex: '0 0 450px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        {/* Header */}
        <div className="mv-panel-header">
          <div className="mv-panel-title-row">
            <button type="button" className="mv-back-btn" onClick={handleCloseDrawer}>
              ← Close
            </button>
            <h3 className="mv-panel-title">Lead #{intent.id}</h3>
            <span className={intent.buyerVisible ? 'status-active' : 'status-inactive'}>
              {intent.buyerVisible ? 'Visible' : 'Hidden'}
            </span>
          </div>
        </div>

        {/* Buyer Info */}
        <div className="mv-section">
          <p className="mv-section-label">Buyer Details</p>
          <div className="mv-detail-grid">
            <DetailRow label="Name" value={intent.buyerName} />
            <DetailRow label="Phone" value={intent.buyerPhone} />
            <DetailRow label="City Code" value={intent.cityCode} />
            <DetailRow label="Scope" value={intent.intentScope} />
          </div>
        </div>

        {/* Requirement Info */}
        <div className="mv-section">
          <p className="mv-section-label">Requirement Details</p>
          <div className="mv-detail-grid">
            <DetailRow label="Keyword" value={intent.productKeyword} />
            <DetailRow label="Quantity" value={
              intent.quantityMin !== null || intent.quantityMax !== null
                ? `${intent.quantityMin || 0}-${intent.quantityMax || 'Max'} ${intent.quantityUnit || ''}`
                : 'N/A'
            } />
            <DetailRow label="Source" value={getSourceLabel(intent.intentSource)} />
            <DetailRow label="Display Type" value={getDisplayTypeLabel(intent.displayType)} />
          </div>
          {intent.requirementNote && (
            <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid var(--line)' }}>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes / Preferred Slot</span>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{intent.requirementNote}</p>
              {intent.preferredSlot && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Slot: {intent.preferredSlot}</div>}
            </div>
          )}
        </div>

        {/* Manual Assign */}
        <div className="mv-section">
          <p className="mv-section-label">Manual Seller Assignment</p>
          
          {selectedSeller ? (
            <div style={{ padding: 12, border: '1px solid var(--primary, #6366f1)', borderRadius: 8, background: 'rgba(99, 102, 241, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>
                  {selectedSeller.businessName || selectedSeller.ownerName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Owner: {selectedSeller.ownerName} | Phone: {selectedSeller.phone}
                </div>
                <div style={{ fontSize: 11, color: 'var(--primary, #6366f1)', fontWeight: 600, marginTop: 4 }}>
                  Plan: {selectedSeller.activeSubscriptionName} (Credits: {selectedSeller.remainingLeads} / {selectedSeller.totalLeadsLimit})
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ height: 30, padding: '0 10px', fontSize: 11 }}
                  disabled={isAssigning}
                  onClick={async () => {
                    setIsAssigning(true);
                    try {
                      await assignLeadManually(token, intentDetail.intent.id, selectedSeller.id);
                      const response = await getAdminLeadDetail(token, intentDetail.intent.id);
                      setIntentDetail(response?.data || response);
                      setSelectedSeller(null);
                      setSellerSearchQuery('');
                      setSearchResults([]);
                      loadIntents();
                      alert('Seller assigned successfully!');
                    } catch (err) {
                      alert(err.message || 'Failed to assign seller.');
                    } finally {
                      setIsAssigning(false);
                    }
                  }}
                >
                  Link
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ height: 30, padding: '0 10px', fontSize: 11 }}
                  onClick={() => setSelectedSeller(null)}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Type seller name, business name, or mobile..."
                value={sellerSearchQuery}
                onChange={(e) => handleSellerSearch(e.target.value)}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
              {isSearchingSellers && (
                <div style={{ position: 'absolute', right: 12, top: 10, fontSize: 11, color: 'var(--muted)' }}>Searching...</div>
              )}
              {searchResults.length > 0 && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: '#fff', border: '1px solid var(--line)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 99, maxHeight: 180, overflowY: 'auto', marginTop: 4 }}>
                  {searchResults.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedSeller(s);
                        setSearchResults([]);
                      }}
                      style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink)' }}>
                        {s.businessName || s.ownerName} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>[ID: #{s.id}]</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                        Phone: {s.phone} | Plan: {s.activeSubscriptionName} ({s.remainingLeads} leads left)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assignments List */}
        <div className="mv-section">
          <p className="mv-section-label">Assigned Sellers ({assignments.length})</p>
          {assignments.length === 0 ? (
            <p className="mv-empty">No sellers assigned yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {assignments.map((a) => (
                <div key={a.assignmentId} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>
                      {a.sellerName} <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 11 }}>[ID: #{a.sellerId}]</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      Phone: {a.sellerPhone} | Priority: {a.priority}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span className={`status-pill ${a.creditConsumed ? 'pending-review' : 'pending'}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                        Credit: {a.creditConsumed ? 'Consumed' : 'No Cut'}
                      </span>
                      {a.firstResponseType && (
                        <span className="status-pill approved" style={{ fontSize: 10, padding: '2px 6px' }}>
                          {a.firstResponseType}
                        </span>
                      )}
                      {a.contactShared && (
                        <span className="status-pill approved" style={{ fontSize: 10, padding: '2px 6px' }}>
                          📞 Unlocked
                        </span>
                      )}
                    </div>
                    {a.offerId && (
                      <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
                        Offer: ₹{a.offerPrice} ({a.offerStatus})
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleDeleteAssignment(a.assignmentId)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="users-page business-page">
      <Banner message={message} />

      {/* ── Tabs Navigation ────────────────────────────────────────── */}
      <div className="gsc-tabs-row" style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--line)', marginBottom: 20, paddingBottom: 1 }}>
        <button
          onClick={() => setActiveTab('intents')}
          className={`gsc-tab-btn ${activeTab === 'intents' ? 'active' : ''}`}
          style={tabButtonStyle(activeTab === 'intents')}
        >
          🔍 Lead Intents
        </button>
        <button
          onClick={() => setActiveTab('credit_audit')}
          className={`gsc-tab-btn ${activeTab === 'credit_audit' ? 'active' : ''}`}
          style={tabButtonStyle(activeTab === 'credit_audit')}
        >
          💳 Credit Usage Audit
        </button>
        <button
          onClick={() => setActiveTab('contact_audit')}
          className={`gsc-tab-btn ${activeTab === 'contact_audit' ? 'active' : ''}`}
          style={tabButtonStyle(activeTab === 'contact_audit')}
        >
          📞 Contact Unlock Audit
        </button>
        <button
          onClick={() => setActiveTab('spam_reports')}
          className={`gsc-tab-btn ${activeTab === 'spam_reports' ? 'active' : ''}`}
          style={tabButtonStyle(activeTab === 'spam_reports')}
        >
          ⚠️ Spam Reports
        </button>
      </div>

      <div className={`mv-layout${intentDetail ? ' mv-layout--split' : ''}`}>
        
        {/* ══════════════════════════════════════════════════════════════
           TAB 1: LEAD INTENTS
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'intents' && (
          <div className="panel card users-table-card" style={{ flex: 1, minWidth: 0 }}>
            <DataTable
              columns={[
                {
                  key: 'id',
                  header: 'Intent ID',
                  width: '90px',
                  render: (val) => <strong>#{val}</strong>,
                },
                {
                  key: 'buyer',
                  header: 'Buyer',
                  sortable: true,
                  render: (_, intent) => (
                    <div>
                      <div className="bdt-name-link" style={{ fontWeight: 600, color: '#6345ED' }}>{intent.buyerName || 'Unknown'}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{intent.buyerPhone || '-'}</div>
                    </div>
                  ),
                },
                {
                  key: 'productKeyword',
                  header: 'Keyword',
                  sortable: true,
                  render: (val, intent) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{val || 'N/A'}</div>
                      <span style={{ fontSize: 10, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 2, fontWeight: 600 }}>
                        {intent.intentScope || 'PRODUCT'}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'buyerVisible',
                  header: 'Visibility',
                  sortable: true,
                  render: (val) => (
                    <span className={`status-pill ${val ? 'approved' : 'pending'}`}>
                      {val ? 'Visible' : 'Hidden'}
                    </span>
                  ),
                },
                {
                  key: 'intentType',
                  header: 'Type / Display',
                  render: (val, intent) => (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{val}</div>
                      <span className={`status-pill ${getDisplayTypePillClass(intent.displayType)}`} style={{ fontSize: 10, padding: '2px 6px', marginTop: 2, display: 'inline-block' }}>
                        {getDisplayTypeLabel(intent.displayType)}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'quantity',
                  header: 'Quantity',
                  render: (_, intent) => (
                    <div>
                      <div>
                        {intent.quantityMin !== null || intent.quantityMax !== null
                          ? `${intent.quantityMin || 0}-${intent.quantityMax || 'Max'} ${intent.quantityUnit || ''}`
                          : 'N/A'}
                      </div>
                      {intent.budgetAmount ? (
                        <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>₹{intent.budgetAmount}</div>
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: 'assignmentCount',
                  header: 'Assigned',
                  align: 'center',
                  render: (val) => <strong>{val}</strong>,
                },
                {
                  key: 'responseCount',
                  header: 'Responded',
                  align: 'center',
                  render: (val) => <strong>{val}</strong>,
                },
                {
                  key: 'creditConsumedCount',
                  header: 'Credit Cut',
                  align: 'center',
                  render: (val) => (
                    <strong style={{ color: val > 0 ? '#b45309' : 'inherit' }}>
                      {val}
                    </strong>
                  ),
                },
                {
                  key: 'createdOn',
                  header: 'Created Date',
                  sortable: true,
                  render: (val) => formatDateTime(val),
                },
              ]}
              data={intents}
              isLoading={isLoading}
              search={query}
              onSearchChange={setQuery}
              searchPlaceholder="Search buyer or keyword..."
              page={page - 1}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p + 1)}
              onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onRowClick={(intent) => handleOpenDrawer(intent.id)}
              emptyTitle="No lead intents found"
              emptyDescription="No lead intents match your filter criteria."
              toolbarLeft={
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    className="gsc-toolbar-btn"
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    style={{ border: 'none', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                  >
                    <option value="">All Sources</option>
                    <option value="SEARCH">Search</option>
                    <option value="PRODUCT_VIEW">Product View</option>
                    <option value="SERVICE_VIEW">Service View</option>
                    <option value="DIRECT_INQUIRY">Direct Inquiry</option>
                    <option value="BULK_INQUIRY">Bulk Inquiry</option>
                  </select>

                  <select
                    className="gsc-toolbar-btn"
                    value={filterVisibility}
                    onChange={(e) => setFilterVisibility(e.target.value)}
                    style={{ border: 'none', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                  >
                    <option value="">All Visibility</option>
                    <option value="true">Visible Only</option>
                    <option value="false">Hidden Only</option>
                  </select>

                  <select
                    className="gsc-toolbar-btn"
                    value={filterCreditConsumed}
                    onChange={(e) => setFilterCreditConsumed(e.target.value)}
                    style={{ border: 'none', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                  >
                    <option value="">All Credit States</option>
                    <option value="true">Credit Consumed</option>
                    <option value="false">No Credit Consumed</option>
                  </select>

                  <input
                    type="number"
                    placeholder="Seller ID"
                    value={filterSellerId}
                    onChange={(e) => setFilterSellerId(e.target.value)}
                    style={sellerIdInputStyle}
                  />
                </div>
              }
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
           TAB 2: CREDIT AUDIT LOGS
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'credit_audit' && (
          <div className="panel card users-table-card" style={{ flex: 1 }}>
            <h3 className="panel-subheading" style={{ marginBottom: 16 }}>Lead Credits Consumed Audit History</h3>
            {isLoading ? (
              <p className="empty-state">Loading credit usage log...</p>
            ) : creditLogs.length === 0 ? (
              <EmptyState message="No credits have been consumed yet." />
            ) : (
              <div className="table-shell business-table-shell">
                <table className="admin-table users-table business-datatable">
                  <thead>
                    <tr>
                      <th>Assignment ID</th>
                      <th>Intent ID</th>
                      <th>Buyer Info</th>
                      <th>Seller Name</th>
                      <th>Seller Contact</th>
                      <th>First Response Type</th>
                      <th>Credit Consumed On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditLogs.map((log) => (
                      <tr key={log.assignmentId}>
                        <td>#{log.assignmentId}</td>
                        <td>
                          <span style={{ fontWeight: 700 }}>#{log.intentId}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{log.buyerName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{log.buyerPhone}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{log.sellerName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>[ID: #{log.sellerId}]</div>
                        </td>
                        <td>{log.sellerPhone}</td>
                        <td>
                          <span className="status-pill approved" style={{ fontSize: 11 }}>
                            {log.firstResponseType || 'OFFER'}
                          </span>
                        </td>
                        <td>{formatDateTime(log.creditConsumedOn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
           TAB 3: CONTACT UNLOCK AUDIT LOGS
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'contact_audit' && (
          <div className="panel card users-table-card" style={{ flex: 1 }}>
            <h3 className="panel-subheading" style={{ marginBottom: 16 }}>Buyer-Seller Contact Sharing Audit Log</h3>
            {isLoading ? (
              <p className="empty-state">Loading contact sharing log...</p>
            ) : contactLogs.length === 0 ? (
              <EmptyState message="No contact shares unlock entries exist." />
            ) : (
              <div className="table-shell business-table-shell">
                <table className="admin-table users-table business-datatable">
                  <thead>
                    <tr>
                      <th>CS ID</th>
                      <th>Offer ID</th>
                      <th>Intent ID</th>
                      <th>Buyer Name/Phone</th>
                      <th>Seller Name/Phone</th>
                      <th>Buyer Shared</th>
                      <th>Seller Shared</th>
                      <th>Shared Timestamp</th>
                      <th>Logged On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactLogs.map((log) => (
                      <tr key={log.contactShareId}>
                        <td>#{log.contactShareId}</td>
                        <td>#{log.offerId}</td>
                        <td>#{log.intentId}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{log.buyerName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{log.buyerPhone} [ID: #{log.buyerId}]</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{log.sellerName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{log.sellerPhone} [ID: #{log.sellerId}]</div>
                        </td>
                        <td>
                          <span className={`status-pill ${log.buyerShared === 1 ? 'approved' : 'pending'}`}>
                            {log.buyerShared === 1 ? 'Yes' : 'No'}
                          </span>
                          {log.buyerSharedOn && <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{formatDateTime(log.buyerSharedOn)}</div>}
                        </td>
                        <td>
                          <span className={`status-pill ${log.sellerShared === 1 ? 'approved' : 'pending'}`}>
                            {log.sellerShared === 1 ? 'Yes' : 'No'}
                          </span>
                          {log.sellerSharedOn && <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{formatDateTime(log.sellerSharedOn)}</div>}
                        </td>
                        <td>{formatDateTime(log.sharedOn)}</td>
                        <td>{formatDateTime(log.createdOn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
           TAB 4: SPAM REPORTS
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'spam_reports' && (
          <div className="panel card users-table-card" style={{ flex: 1 }}>
            <h3 className="panel-subheading" style={{ marginBottom: 16 }}>Reported Fake / Spam Opportunities</h3>
            {isLoading ? (
              <p className="empty-state">Loading spam reports...</p>
            ) : spamReports.length === 0 ? (
              <EmptyState message="No spam complaints reported." />
            ) : (
              <div className="table-shell business-table-shell">
                <table className="admin-table users-table business-datatable">
                  <thead>
                    <tr>
                      <th>Report ID</th>
                      <th>Intent ID</th>
                      <th>Buyer Name</th>
                      <th>Reporter Seller</th>
                      <th>Spam Reason</th>
                      <th>Reported On</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spamReports.map((report) => (
                      <tr key={report.id}>
                        <td>#{report.id}</td>
                        <td>
                          <span style={{ fontWeight: 700 }}>#{report.intentId}</span>
                        </td>
                        <td>{report.buyerName}</td>
                        <td>{report.sellerName}</td>
                        <td style={{ color: 'var(--red)', fontWeight: 500 }}>{report.reason}</td>
                        <td>{formatDateTime(report.reportedOn)}</td>
                        <td>
                          <span className="status-pill pending" style={{ fontSize: 11 }}>
                            {report.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Details View Split Pane */}
        {renderViewPanel()}

      </div>

      {/* ── Custom Styled Overrides ─────────────────────────────────── */}
      <style>{`
        .gsc-tab-btn {
          cursor: pointer;
          font-family: inherit;
        }
        .gsc-toolbar-btn {
          background-color: white;
          color: var(--ink);
          border: 1px solid var(--line);
          border-radius: 6px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .gsc-toolbar-btn:hover, .gsc-toolbar-btn:focus {
          border-color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}

/* ── Inline Style Helper dictionaries ──────────────────────────────── */
const tabButtonStyle = (isActive) => ({
  padding: '10px 20px',
  background: isActive ? 'var(--primary-soft, rgba(99, 102, 241, 0.12))' : 'transparent',
  color: isActive ? 'var(--primary, #6366f1)' : 'var(--muted)',
  border: 'none',
  borderBottom: isActive ? '2px solid var(--primary, #6366f1)' : '2px solid transparent',
  fontWeight: isActive ? 700 : 500,
  fontSize: 14,
  outline: 'none',
  transition: 'all 0.2s ease',
  borderRadius: '6px 6px 0 0',
});

const sellerIdInputStyle = {
  height: 35,
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid var(--line)',
  fontSize: 13,
  outline: 'none',
  color: 'var(--ink)',
  width: 90,
  backgroundColor: 'white',
};

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid var(--line)',
  fontSize: 13,
  outline: 'none',
  color: 'var(--ink)',
};

export default LeadManagementPage;
