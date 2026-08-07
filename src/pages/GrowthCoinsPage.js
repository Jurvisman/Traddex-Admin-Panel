import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
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

function StatCard({ label, value, note }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>{label}</span>
      <strong style={styles.statValue}>{formatNumber(value)}</strong>
      {note ? <span style={styles.statNote}>{note}</span> : null}
    </div>
  );
}

function StatusPill({ value, tone = 'neutral' }) {
  return <span style={{ ...styles.pill, ...(styles[`${tone}Pill`] || {}) }}>{humanize(value)}</span>;
}

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
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Growth Coins</h2>
          <p className="panel-subtitle">Control referral rewards, hold period, caps, wallets and ledger audit.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={loadData} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <Banner message={message} />

      <div style={styles.statsGrid}>
        <StatCard label="Available coins" value={summary.available_coins} note="Ready to redeem" />
        <StatCard label="Pending coins" value={summary.pending_coins} note="Still in hold period" />
        <StatCard label="Redeemed coins" value={summary.redeemed_coins} note="Already used" />
        <StatCard label="Referrals tracked" value={summary.referral_count} note={`${summary.fraud_hold_referrals || 0} fraud holds`} />
      </div>

      <div style={styles.panel}>
        <div style={styles.toolbar}>
          <div style={styles.tabs}>
            {TABS.map((tab) => (
              <button
                type="button"
                key={tab.value}
                style={{ ...styles.tab, ...(activeTab === tab.value ? styles.activeTab : {}) }}
                onClick={() => {
                  setActiveTab(tab.value);
                  setQuery('');
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records"
            style={styles.search}
          />
        </div>

        {activeTab === 'rules' ? (
          <RulesTable rows={rows} canUpdate={canUpdate} onEdit={openRule} />
        ) : activeTab === 'wallets' ? (
          <WalletsTable rows={rows} />
        ) : activeTab === 'referrals' ? (
          <ReferralsTable rows={rows} />
        ) : (
          <LedgerTable rows={rows} />
        )}
      </div>

      {editingRule ? (
        <div style={styles.drawerBackdrop}>
          <aside style={styles.drawer}>
            <div style={styles.drawerHead}>
              <div>
                <h3 style={styles.drawerTitle}>{RULE_LABELS[editingRule.rule_code] || humanize(editingRule.rule_code)}</h3>
                <p style={styles.drawerSubtitle}>{editingRule.rule_code}</p>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setEditingRule(null)}>Close</button>
            </div>
            <label style={styles.fieldLabel}>Coins to give</label>
            <input
              type="number"
              min="0"
              value={editingRule.coin_amount}
              onChange={(event) => setEditingRule((rule) => ({ ...rule, coin_amount: event.target.value }))}
              style={styles.input}
            />
            <label style={styles.fieldLabel}>Hold period days</label>
            <input
              type="number"
              min="0"
              value={editingRule.hold_days}
              onChange={(event) => setEditingRule((rule) => ({ ...rule, hold_days: event.target.value }))}
              style={styles.input}
            />
            <label style={styles.fieldLabel}>Monthly reward count cap</label>
            <input
              type="number"
              min="0"
              value={editingRule.monthly_cap_count}
              onChange={(event) => setEditingRule((rule) => ({ ...rule, monthly_cap_count: event.target.value }))}
              placeholder="No cap"
              style={styles.input}
            />
            <label style={styles.fieldLabel}>Monthly coins cap</label>
            <input
              type="number"
              min="0"
              value={editingRule.monthly_cap_coins}
              onChange={(event) => setEditingRule((rule) => ({ ...rule, monthly_cap_coins: event.target.value }))}
              placeholder="No cap"
              style={styles.input}
            />
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={editingRule.active}
                onChange={(event) => setEditingRule((rule) => ({ ...rule, active: event.target.checked }))}
              />
              Active rule
            </label>
            <label style={styles.fieldLabel}>Admin note</label>
            <textarea
              value={editingRule.description}
              onChange={(event) => setEditingRule((rule) => ({ ...rule, description: event.target.value }))}
              rows={4}
              style={styles.textarea}
            />
            <button type="button" className="primary-btn" onClick={saveRule} disabled={isSaving || !canUpdate} style={styles.saveButton}>
              {isSaving ? 'Saving...' : 'Save rule'}
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function EmptyRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} style={styles.emptyCell}>No records found.</td>
    </tr>
  );
}

function RulesTable({ rows, canUpdate, onEdit }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Rule</th>
            <th style={styles.th}>Coins</th>
            <th style={styles.th}>Hold</th>
            <th style={styles.th}>Monthly cap</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((rule) => (
            <tr key={rule.rule_code}>
              <td style={styles.td}>
                <strong>{RULE_LABELS[rule.rule_code] || humanize(rule.rule_code)}</strong>
                <span style={styles.subText}>{rule.description || rule.rule_code}</span>
              </td>
              <td style={styles.td}>{formatNumber(rule.coin_amount)}</td>
              <td style={styles.td}>{formatNumber(rule.hold_days)} days</td>
              <td style={styles.td}>
                {rule.monthly_cap_count ? `${formatNumber(rule.monthly_cap_count)} rewards` : 'No count cap'}
                <span style={styles.subText}>{rule.monthly_cap_coins ? `${formatNumber(rule.monthly_cap_coins)} coins cap` : 'No coin cap'}</span>
              </td>
              <td style={styles.td}><StatusPill value={rule.active ? 'Active' : 'Inactive'} tone={rule.active ? 'success' : 'neutral'} /></td>
              <td style={styles.td}>
                <button type="button" className="ghost-btn" onClick={() => onEdit(rule)} disabled={!canUpdate}>Edit</button>
              </td>
            </tr>
          )) : <EmptyRow colSpan={6} />}
        </tbody>
      </table>
    </div>
  );
}

function WalletsTable({ rows }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Owner</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Available</th>
            <th style={styles.th}>Pending</th>
            <th style={styles.th}>Redeemed</th>
            <th style={styles.th}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((wallet) => (
            <tr key={wallet.id}>
              <td style={styles.td}>
                <strong>{ownerName(wallet.owner)}</strong>
                <span style={styles.subText}>{ownerMobile(wallet.owner)}</span>
              </td>
              <td style={styles.td}>{humanize(wallet.owner_type)}</td>
              <td style={styles.td}>{formatNumber(wallet.available_coins)}</td>
              <td style={styles.td}>{formatNumber(wallet.pending_coins)}</td>
              <td style={styles.td}>{formatNumber(wallet.redeemed_coins)}</td>
              <td style={styles.td}>{formatDateTime(wallet.updated_at)}</td>
            </tr>
          )) : <EmptyRow colSpan={6} />}
        </tbody>
      </table>
    </div>
  );
}

function ReferralsTable({ rows }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Referral</th>
            <th style={styles.th}>Referrer</th>
            <th style={styles.th}>Referred</th>
            <th style={styles.th}>Milestones</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((referral) => (
            <tr key={referral.id}>
              <td style={styles.td}>
                <strong>{referral.referral_code}</strong>
                <span style={styles.subText}>{humanize(referral.type)} / {referral.source || '-'}</span>
              </td>
              <td style={styles.td}>
                {ownerName(referral.referrer)}
                <span style={styles.subText}>{ownerMobile(referral.referrer)}</span>
              </td>
              <td style={styles.td}>
                {ownerName(referral.referred)}
                <span style={styles.subText}>{ownerMobile(referral.referred)}</span>
              </td>
              <td style={styles.td}>
                {[referral.welcome_rewarded && 'Welcome', referral.kyc_rewarded && 'KYC', referral.profile_rewarded && 'Profile']
                  .filter(Boolean)
                  .join(', ') || '-'}
                <span style={styles.subText}>Hold until {formatDateTime(referral.hold_until)}</span>
              </td>
              <td style={styles.td}><StatusPill value={referral.status} tone={referral.status === 'FRAUD_HOLD' ? 'danger' : 'success'} /></td>
              <td style={styles.td}>{formatDateTime(referral.created_at)}</td>
            </tr>
          )) : <EmptyRow colSpan={6} />}
        </tbody>
      </table>
    </div>
  );
}

function LedgerTable({ rows }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Owner</th>
            <th style={styles.th}>Coins</th>
            <th style={styles.th}>Reason</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Available</th>
            <th style={styles.th}>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((entry) => (
            <tr key={entry.id}>
              <td style={styles.td}>
                <strong>{ownerName(entry.owner)}</strong>
                <span style={styles.subText}>{ownerMobile(entry.owner)} / {humanize(entry.owner_type)}</span>
              </td>
              <td style={styles.td}>
                {entry.direction === 'DEBIT' ? '-' : '+'}{formatNumber(entry.coins)}
              </td>
              <td style={styles.td}>
                {entry.reason_label || humanize(entry.reason_type)}
                <span style={styles.subText}>{entry.reason_type}</span>
              </td>
              <td style={styles.td}><StatusPill value={entry.status} tone={entry.status === 'PENDING' ? 'warning' : 'success'} /></td>
              <td style={styles.td}>{formatDateTime(entry.available_at)}</td>
              <td style={styles.td}>{formatDateTime(entry.created_at)}</td>
            </tr>
          )) : <EmptyRow colSpan={6} />}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14,
    marginBottom: 18,
  },
  statCard: {
    background: '#fff',
    border: '1px solid #e8ecf5',
    borderRadius: 8,
    padding: 18,
  },
  statLabel: { display: 'block', color: '#667085', fontSize: 13, marginBottom: 8 },
  statValue: { display: 'block', color: '#101828', fontSize: 28, lineHeight: 1.15 },
  statNote: { display: 'block', color: '#7c3aed', fontSize: 12, marginTop: 8 },
  panel: {
    background: '#fff',
    border: '1px solid #e8ecf5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottom: '1px solid #eef2f7',
    flexWrap: 'wrap',
  },
  tabs: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  tab: {
    border: '1px solid #e4e7ec',
    background: '#fff',
    color: '#667085',
    borderRadius: 8,
    padding: '9px 13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  activeTab: { background: '#6d40f6', borderColor: '#6d40f6', color: '#fff' },
  search: {
    border: '1px solid #d0d5dd',
    borderRadius: 8,
    padding: '10px 12px',
    minWidth: 240,
    outline: 'none',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 840 },
  th: {
    textAlign: 'left',
    padding: '13px 16px',
    fontSize: 12,
    color: '#667085',
    background: '#f9fafb',
    borderBottom: '1px solid #eef2f7',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  td: {
    padding: '14px 16px',
    borderBottom: '1px solid #eef2f7',
    color: '#101828',
    verticalAlign: 'top',
  },
  subText: { display: 'block', color: '#667085', fontSize: 12, marginTop: 4 },
  emptyCell: { padding: 30, textAlign: 'center', color: '#667085' },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '5px 9px',
    fontSize: 12,
    fontWeight: 800,
    background: '#f2f4f7',
    color: '#475467',
  },
  successPill: { background: '#ecfdf3', color: '#027a48' },
  warningPill: { background: '#fffaeb', color: '#b54708' },
  dangerPill: { background: '#fef3f2', color: '#b42318' },
  drawerBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.35)',
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  drawer: {
    width: 'min(460px, 100%)',
    background: '#fff',
    padding: 24,
    overflowY: 'auto',
  },
  drawerHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
  drawerTitle: { margin: 0, fontSize: 22, color: '#101828' },
  drawerSubtitle: { margin: '4px 0 0', color: '#667085', fontSize: 12 },
  fieldLabel: { display: 'block', color: '#344054', fontWeight: 700, margin: '14px 0 7px' },
  input: {
    width: '100%',
    border: '1px solid #d0d5dd',
    borderRadius: 8,
    padding: '11px 12px',
    fontSize: 14,
  },
  textarea: {
    width: '100%',
    border: '1px solid #d0d5dd',
    borderRadius: 8,
    padding: '11px 12px',
    fontSize: 14,
    resize: 'vertical',
  },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontWeight: 700 },
  saveButton: { width: '100%', justifyContent: 'center', marginTop: 18 },
};

export default GrowthCoinsPage;
