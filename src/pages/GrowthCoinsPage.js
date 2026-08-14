import { useEffect, useMemo, useState } from 'react';
import { Banner, DataTable } from '../components';
import { getGrowthCoinsOverview, updateGrowthCoinRule } from '../services/adminApi';
import { usePermissions } from '../shared/permissions';

const TABS = [
  { value: 'rules', label: 'Rules' },
  { value: 'wallets', label: 'Wallets' },
  { value: 'referrals', label: 'Referrals' },
  { value: 'ledger', label: 'Coin Ledger' },
];

const RULE_LABELS = {
  BUSINESS_WELCOME_REFERRAL: 'New business welcome coins',
  B2B_REFERRAL_PAID_PLAN: 'Referrer reward after paid plan',
  B2B_REFERRAL_KYC_APPROVED: 'Referrer reward after KYC',
  B2B_REFERRAL_PROFILE_COMPLETE: 'Referrer reward after profile completion',
};

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

const formatDateTime = (value) => {
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

const humanize = (value) =>
  String(value || '-')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const ownerName = (owner) => owner?.business_name || owner?.name || `User #${owner?.id || '-'}`;
const ownerMobile = (owner) => owner?.mobile || '-';

const normalize = (value) => String(value || '').toLowerCase();

function GrowthCoinsPage({ token }) {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('ADMIN_GROWTH_COINS_UPDATE');
  const [activeTab, setActiveTab] = useState('rules');
  const [query, setQuery] = useState('');
  const [overview, setOverview] = useState(null);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination for tables
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const loadData = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await getGrowthCoinsOverview(token);
      setOverview(response?.data || {});
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load growth coins.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = overview?.summary || {};
  const rows = useMemo(() => {
    const source = overview?.[activeTab] || [];
    const term = normalize(query);
    if (!term) return source;
    return source.filter((item) => normalize(JSON.stringify(item)).includes(term));
  }, [activeTab, overview, query]);

  const openRule = (rule) => {
    setEditingRule({
      rule_code: rule.rule_code,
      coin_amount: rule.coin_amount ?? 0,
      hold_days: rule.hold_days ?? 0,
      monthly_cap_count: rule.monthly_cap_count ?? '',
      monthly_cap_coins: rule.monthly_cap_coins ?? '',
      active: rule.active !== false,
      description: rule.description || '',
    });
  };

  const saveRule = async () => {
    if (!editingRule?.rule_code) return;
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateGrowthCoinRule(token, editingRule.rule_code, {
        coin_amount: Number(editingRule.coin_amount || 0),
        hold_days: Number(editingRule.hold_days || 0),
        monthly_cap_count: editingRule.monthly_cap_count === '' ? null : Number(editingRule.monthly_cap_count),
        monthly_cap_coins: editingRule.monthly_cap_coins === '' ? null : Number(editingRule.monthly_cap_coins),
        active: Boolean(editingRule.active),
        description: editingRule.description,
      });
      setEditingRule(null);
      setMessage({ type: 'success', text: 'Growth coin rule saved.' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save rule.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="growth-coins-page">
      <div className="panel-head category-list-head" style={{ marginBottom: 20 }}>
        <div className="category-list-head-left">
          <div>
            <h2 className="panel-title">Growth Coins</h2>
            <p className="panel-subtitle">Control referral rewards, hold period, caps, wallets and ledger audit.</p>
          </div>
        </div>
        <div className="users-head-actions">
          <button type="button" className="ghost-btn" onClick={loadData} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <Banner message={message} />

      {/* Modern Stat Grid */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#6345ED' }}>
          <p className="stat-label">Available Coins</p>
          <p className="stat-value" style={{ color: '#6345ED' }}>{formatNumber(summary.available_coins)}</p>
          <p className="stat-sub">Ready to redeem</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F59E0B' }}>
          <p className="stat-label">Pending Coins</p>
          <p className="stat-value" style={{ color: '#F59E0B' }}>{formatNumber(summary.pending_coins)}</p>
          <p className="stat-sub">Still in hold period</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#10B981' }}>
          <p className="stat-label">Redeemed Coins</p>
          <p className="stat-value" style={{ color: '#10B981' }}>{formatNumber(summary.redeemed_coins)}</p>
          <p className="stat-sub">Already used</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#0EA5E9' }}>
          <p className="stat-label">Referrals Tracked</p>
          <p className="stat-value" style={{ color: '#0EA5E9' }}>{formatNumber(summary.referral_count)}</p>
          <p className="stat-sub">{summary.fraud_hold_referrals || 0} fraud holds</p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, borderBottom: '2px solid #e2e8f0' }}>
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              setQuery('');
              setPage(0);
            }}
            style={{
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab.value ? '3px solid #6345ED' : '3px solid transparent',
              color: activeTab === tab.value ? '#6345ED' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="panel card users-table-card">
        {activeTab === 'rules' && (
          <DataTable
            columns={[
              {
                key: 'rule',
                header: 'Rule',
                sortable: true,
                render: (_, rule) => (
                  <div>
                    <span
                      className="bdt-name-link"
                      style={{ color: '#6345ED', fontWeight: 600, cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openRule(rule);
                      }}
                    >
                      {RULE_LABELS[rule.rule_code] || humanize(rule.rule_code)}
                    </span>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{rule.description || rule.rule_code}</div>
                  </div>
                ),
              },
              {
                key: 'coin_amount',
                header: 'Coins',
                sortable: true,
                render: (val) => <strong>{formatNumber(val)}</strong>,
              },
              {
                key: 'hold_days',
                header: 'Hold Period',
                sortable: true,
                render: (val) => `${formatNumber(val)} days`,
              },
              {
                key: 'monthly_cap',
                header: 'Monthly Cap',
                render: (_, rule) => (
                  <div>
                    <div>{rule.monthly_cap_count ? `${formatNumber(rule.monthly_cap_count)} rewards` : 'No count cap'}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {rule.monthly_cap_coins ? `${formatNumber(rule.monthly_cap_coins)} coins cap` : 'No coin cap'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'active',
                header: 'Status',
                sortable: true,
                render: (val) => (
                  <span className={`status-pill ${val ? 'approved' : 'rejected'}`}>
                    {val ? 'Active' : 'Inactive'}
                  </span>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                align: 'right',
                render: (_, rule) => (
                  <button
                    type="button"
                    className="primary-btn small"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRule(rule);
                    }}
                    disabled={!canUpdate}
                    style={{ fontSize: 12, padding: '4px 12px' }}
                  >
                    Edit
                  </button>
                ),
              },
            ]}
            data={rows}
            isLoading={isLoading}
            search={query}
            onSearchChange={(val) => { setQuery(val); setPage(0); }}
            searchPlaceholder="Search rules..."
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
            pageSizeOptions={[10, 25, 50]}
            emptyTitle="No rules found"
            emptyDescription="No growth coin rules found."
          />
        )}

        {activeTab === 'wallets' && (
          <DataTable
            columns={[
              {
                key: 'owner',
                header: 'Owner',
                sortable: true,
                render: (_, wallet) => (
                  <div>
                    <span className="bdt-name-link" style={{ color: '#6345ED', fontWeight: 600 }}>
                      {ownerName(wallet.owner)}
                    </span>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{ownerMobile(wallet.owner)}</div>
                  </div>
                ),
              },
              {
                key: 'owner_type',
                header: 'Type',
                sortable: true,
                render: (val) => <span className="status-pill">{humanize(val)}</span>,
              },
              {
                key: 'available_coins',
                header: 'Available',
                sortable: true,
                render: (val) => <strong style={{ color: '#10B981' }}>{formatNumber(val)}</strong>,
              },
              {
                key: 'pending_coins',
                header: 'Pending',
                sortable: true,
                render: (val) => <strong style={{ color: '#F59E0B' }}>{formatNumber(val)}</strong>,
              },
              {
                key: 'redeemed_coins',
                header: 'Redeemed',
                sortable: true,
                render: (val) => formatNumber(val),
              },
              {
                key: 'updated_at',
                header: 'Updated',
                sortable: true,
                render: (val) => formatDateTime(val),
              },
            ]}
            data={rows}
            isLoading={isLoading}
            search={query}
            onSearchChange={(val) => { setQuery(val); setPage(0); }}
            searchPlaceholder="Search wallets..."
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
            pageSizeOptions={[10, 25, 50]}
            emptyTitle="No wallets found"
            emptyDescription="No user coin wallets found."
          />
        )}

        {activeTab === 'referrals' && (
          <DataTable
            columns={[
              {
                key: 'referral_code',
                header: 'Referral',
                sortable: true,
                render: (val, ref) => (
                  <div>
                    <strong style={{ color: '#6345ED' }}>{val}</strong>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{humanize(ref.type)} / {ref.source || '-'}</div>
                  </div>
                ),
              },
              {
                key: 'referrer',
                header: 'Referrer',
                sortable: true,
                render: (_, ref) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{ownerName(ref.referrer)}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{ownerMobile(ref.referrer)}</div>
                  </div>
                ),
              },
              {
                key: 'referred',
                header: 'Referred',
                sortable: true,
                render: (_, ref) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{ownerName(ref.referred)}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{ownerMobile(ref.referred)}</div>
                  </div>
                ),
              },
              {
                key: 'milestones',
                header: 'Milestones',
                render: (_, ref) => (
                  <div>
                    <div>
                      {[ref.welcome_rewarded && 'Welcome', ref.kyc_rewarded && 'KYC', ref.profile_rewarded && 'Profile']
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Hold until {formatDateTime(ref.hold_until)}</div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (val) => (
                  <span className={`status-pill ${val === 'FRAUD_HOLD' ? 'rejected' : 'approved'}`}>
                    {humanize(val)}
                  </span>
                ),
              },
              {
                key: 'created_at',
                header: 'Created',
                sortable: true,
                render: (val) => formatDateTime(val),
              },
            ]}
            data={rows}
            isLoading={isLoading}
            search={query}
            onSearchChange={(val) => { setQuery(val); setPage(0); }}
            searchPlaceholder="Search referrals..."
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
            pageSizeOptions={[10, 25, 50]}
            emptyTitle="No referrals found"
            emptyDescription="No referral records match your search."
          />
        )}

        {activeTab === 'ledger' && (
          <DataTable
            columns={[
              {
                key: 'owner',
                header: 'Owner',
                sortable: true,
                render: (_, entry) => (
                  <div>
                    <span className="bdt-name-link" style={{ color: '#6345ED', fontWeight: 600 }}>
                      {ownerName(entry.owner)}
                    </span>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {ownerMobile(entry.owner)} / {humanize(entry.owner_type)}
                    </div>
                  </div>
                ),
              },
              {
                key: 'coins',
                header: 'Coins',
                sortable: true,
                render: (val, entry) => (
                  <strong style={{ color: entry.direction === 'DEBIT' ? '#EF4444' : '#10B981' }}>
                    {entry.direction === 'DEBIT' ? '-' : '+'}{formatNumber(val)}
                  </strong>
                ),
              },
              {
                key: 'reason',
                header: 'Reason',
                sortable: true,
                render: (_, entry) => (
                  <div>
                    <div>{entry.reason_label || humanize(entry.reason_type)}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{entry.reason_type}</div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (val) => (
                  <span className={`status-pill ${val === 'PENDING' ? 'pending' : 'approved'}`}>
                    {humanize(val)}
                  </span>
                ),
              },
              {
                key: 'available_at',
                header: 'Available At',
                sortable: true,
                render: (val) => formatDateTime(val),
              },
              {
                key: 'created_at',
                header: 'Created',
                sortable: true,
                render: (val) => formatDateTime(val),
              },
            ]}
            data={rows}
            isLoading={isLoading}
            search={query}
            onSearchChange={(val) => { setQuery(val); setPage(0); }}
            searchPlaceholder="Search coin ledger..."
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
            pageSizeOptions={[10, 25, 50]}
            emptyTitle="No ledger records found"
            emptyDescription="No coin ledger entries found."
          />
        )}
      </div>

      {/* Edit Rule Drawer / Modal */}
      {editingRule ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setEditingRule(null)}>
          <div
            className="admin-modal cat-unified-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div style={{
              padding: '18px 24px 14px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                  {RULE_LABELS[editingRule.rule_code] || humanize(editingRule.rule_code)}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  Rule Code: {editingRule.rule_code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
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

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label className="field">
                <span>Coins to give *</span>
                <input
                  type="number"
                  min="0"
                  value={editingRule.coin_amount}
                  onChange={(e) => setEditingRule((prev) => ({ ...prev, coin_amount: e.target.value }))}
                />
              </label>

              <label className="field">
                <span>Hold period (days) *</span>
                <input
                  type="number"
                  min="0"
                  value={editingRule.hold_days}
                  onChange={(e) => setEditingRule((prev) => ({ ...prev, hold_days: e.target.value }))}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label className="field">
                  <span>Monthly reward count cap</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="No cap"
                    value={editingRule.monthly_cap_count}
                    onChange={(e) => setEditingRule((prev) => ({ ...prev, monthly_cap_count: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Monthly coins cap</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="No cap"
                    value={editingRule.monthly_cap_coins}
                    onChange={(e) => setEditingRule((prev) => ({ ...prev, monthly_cap_coins: e.target.value }))}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={editingRule.active}
                  onChange={(e) => setEditingRule((prev) => ({ ...prev, active: e.target.checked }))}
                />
                Active Rule
              </label>

              <label className="field">
                <span>Admin note</span>
                <textarea
                  rows={3}
                  value={editingRule.description}
                  onChange={(e) => setEditingRule((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Internal description for this rule..."
                />
              </label>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="ghost-btn" onClick={() => setEditingRule(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={saveRule}
                  disabled={isSaving || !canUpdate}
                >
                  {isSaving ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GrowthCoinsPage;
