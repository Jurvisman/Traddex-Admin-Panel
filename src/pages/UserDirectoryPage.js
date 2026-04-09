import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import { fetchUsers, sendOtp, updateUser, verifyOtp } from '../services/adminApi';

const normalize = (value) => String(value || '').toLowerCase();

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const isBusinessUser = (user) => {
  const raw = user?.userType || user?.type || user?.role;
  return String(raw || '').toUpperCase() === 'BUSINESS';
};

const getUserName = (user) =>
  user?.name || user?.full_name || user?.fullName || user?.username || user?.mobile || `User #${user?.id || ''}`;

const getUserEmail = (user) => user?.email || user?.email_id || user?.user_email || user?.contact_email || '-';

const getInitials = (user) => {
  const name = getUserName(user);
  if (!name) return 'U';
  const words = String(name).trim().split(' ').filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
};

const getUserType = (user) => {
  const raw = user?.userType || user?.type || user?.role || 'USER';
  const value = String(raw || '').toUpperCase();
  if (value === 'LOGISTIC') return 'Logistic';
  if (value === 'INSURANCE') return 'Insurance';
  return 'User';
};

const resolveVerification = (user) => {
  const verified = Number(user?.verify) === 1;
  return { label: verified ? 'Verified' : 'Pending', className: verified ? 'verified' : 'pending' };
};

const buildUserUpdatePayload = (user, nextActive) => ({
  name: String(user?.name || user?.full_name || user?.fullName || user?.username || '').trim(),
  number: String(user?.number || user?.mobile || user?.phone || '').trim(),
  verify: Number(user?.verify) === 1 ? 1 : 0,
  active: nextActive,
  logout: user?.logout !== undefined && user?.logout !== null ? Number(user.logout) : 0,
  timeZone: String(user?.timeZone || user?.time_zone || '').trim() || null,
});

/* ── OTP step constants ──────────────────────────────────────── */
const OTP_STEP = { IDLE: 'IDLE', SENDING: 'SENDING', VERIFYING: 'VERIFYING', CREATING: 'CREATING', DONE: 'DONE' };
const RE_PHONE = /^[6-9][0-9]{9}$/;

/* ══════════════════════════════════════════════════════════════
   CREATE USER MODAL
   ══════════════════════════════════════════════════════════════ */
function CreateUserModal({ token, onClose, onSuccess }) {
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp]         = useState('');
  const [verified, setVerified] = useState(false);
  const [step, setStep]       = useState(OTP_STEP.IDLE);
  const [error, setError]     = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    setResendTimer(30);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  // cleanup timer on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleSendOtp = async () => {
    setError('');
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter a valid name (min 2 characters).');
      return;
    }
    if (!RE_PHONE.test(phone.trim())) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setStep(OTP_STEP.SENDING);
    try {
      await sendOtp(phone.trim());
      setOtpSent(true);
      setOtp('');
      setVerified(false);
      startTimer();
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setStep(OTP_STEP.IDLE);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (!otp || otp.length < 4) {
      setError('Enter the OTP sent to your mobile number.');
      return;
    }
    setStep(OTP_STEP.VERIFYING);
    let verifiedUser = null;
    try {
      // verifyOtp creates/verifies the user and returns the user record
      const resp = await verifyOtp(phone.trim(), otp.trim());
      verifiedUser = resp?.data || resp;
      setVerified(true);
      clearInterval(timerRef.current);
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
      setStep(OTP_STEP.IDLE);
      return;
    }
    // After OTP verified, update the user's name (sendOtp creates a placeholder with name "User")
    setStep(OTP_STEP.CREATING);
    try {
      const userId = verifiedUser?.id || verifiedUser?.user_id || verifiedUser?.userId;
      if (userId && name.trim() && name.trim().toLowerCase() !== 'user') {
        const updatePayload = {
          name: name.trim(),
          number: phone.trim(),
          verify: 1,
          active: 1,
          logout: 0,
          timeZone: null,
        };
        await updateUser(token, userId, updatePayload);
      }
      setStep(OTP_STEP.DONE);
      onSuccess(`User "${name.trim()}" created successfully.`);
    } catch (err) {
      // Name update failed — user is still created and verified, just with placeholder name
      setStep(OTP_STEP.DONE);
      onSuccess(`User "${phone.trim()}" created (name update failed — edit from the list).`);
    }
  };

  const handlePhoneChange = (val) => {
    setPhone(val);
    setOtpSent(false);
    setOtp('');
    setVerified(false);
    setError('');
  };

  const isBusy = step === OTP_STEP.SENDING || step === OTP_STEP.VERIFYING || step === OTP_STEP.CREATING;

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
      <div className="admin-modal confirm-modal" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 className="panel-subheading" id="create-user-title" style={{ margin: 0 }}>Create New User</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8', lineHeight: 1 }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
          {['Details', 'Verify OTP', 'Done'].map((label, i) => {
            const active = i === 0 ? !otpSent : i === 1 ? otpSent && !verified : verified;
            const done   = i === 0 ? otpSent : i === 1 ? verified : false;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  background: done ? '#16a34a' : active ? 'var(--primary, #4f46e5)' : '#e2e8f0',
                  color: done || active ? '#fff' : '#94a3b8',
                  transition: 'background 0.2s',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 12, color: active || done ? '#1e293b' : '#94a3b8', fontWeight: active ? 600 : 400 }}>{label}</span>
                {i < 2 && <div style={{ width: 24, height: 1, background: '#e2e8f0' }} />}
              </div>
            );
          })}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Full Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Enter user's full name"
              disabled={isBusy || verified}
              style={{ width: '100%', boxSizing: 'border-box' }}
              aria-label="Full name"
            />
          </div>

          {/* Phone + Send OTP */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Mobile Number <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                maxLength={10}
                disabled={isBusy || verified}
                style={{ flex: 1 }}
                aria-label="Mobile number"
              />
              <button
                type="button"
                className="primary-btn"
                onClick={handleSendOtp}
                disabled={isBusy || verified || (otpSent && resendTimer > 0)}
                style={{ whiteSpace: 'nowrap', minWidth: 110 }}
              >
                {step === OTP_STEP.SENDING ? 'Sending…' : otpSent ? (resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Resend OTP') : 'Send OTP'}
              </button>
            </div>
          </div>

          {/* OTP input (shown after send) */}
          {otpSent && !verified && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Enter OTP <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b' }}>
                OTP sent to <strong>+91 {phone}</strong>. Enter the code below.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  placeholder="Enter OTP"
                  maxLength={6}
                  disabled={isBusy}
                  style={{ flex: 1, letterSpacing: 4, fontSize: 18, textAlign: 'center', fontWeight: 700 }}
                  aria-label="OTP code"
                  autoFocus
                />
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleVerifyOtp}
                  disabled={isBusy || otp.length < 4}
                  style={{ minWidth: 110 }}
                >
                  {step === OTP_STEP.VERIFYING ? 'Verifying…' : step === OTP_STEP.CREATING ? 'Creating…' : 'Verify & Create'}
                </button>
              </div>
            </div>
          )}

          {/* Verified success state */}
          {verified && step === OTP_STEP.DONE && (
            <div style={{
              padding: '12px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <span style={{ fontSize: 14, color: '#166534', fontWeight: 500 }}>User created successfully!</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca',
              fontSize: 13, color: '#b91c1c',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="form-actions" style={{ marginTop: 24 }}>
          <button type="button" className="ghost-btn" onClick={onClose} disabled={step === OTP_STEP.CREATING}>
            {step === OTP_STEP.DONE ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ── Small reusable helpers for view panel ──────────────── */
const UserStatusBadge = ({ isActive }) => (
  <span className={isActive ? 'status-active' : 'status-inactive'}>
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

const UserDetailRow = ({ label, value }) => (
  <div className="mv-detail-row">
    <span className="mv-detail-label">{label}</span>
    <span className="mv-detail-value">{value ?? '—'}</span>
  </div>
);

function UserDirectoryPage({ token, allowedActions }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeUserId, setActiveUserId] = useState(null);
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewUser, setViewUser] = useState(null);

  const allowedActionSet = useMemo(() => {
    const next = new Set();
    const source = allowedActions instanceof Set ? Array.from(allowedActions) : Array.isArray(allowedActions) ? allowedActions : [];
    source.forEach((code) => {
      const normalizedCode = String(code || '').trim().toUpperCase();
      if (normalizedCode) {
        next.add(normalizedCode);
      }
    });
    return next;
  }, [allowedActions]);

  const hasActionModel = allowedActionSet.size > 0;
  const canUserRead   = !hasActionModel || allowedActionSet.has('ADMIN_USERS_READ');
  const canUserUpdate = !hasActionModel || allowedActionSet.has('ADMIN_USERS_UPDATE');
  const canUserCreate = !hasActionModel || allowedActionSet.has('ADMIN_USERS_CREATE');

  const loadUsers = async () => {
    if (!canUserRead) {
      setUsers([]);
      setMessage({ type: 'error', text: 'You do not have permission to view users.' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await fetchUsers(token);
      const list = Array.isArray(response?.data) ? response.data : [];
      const filtered = list
        .filter((user) => !isBusinessUser(user))
        .sort((a, b) => {
          const aDate = new Date(a?.createdAt || a?.created_at || 0).getTime();
          const bDate = new Date(b?.createdAt || b?.created_at || 0).getTime();
          return bDate - aDate;
        });
      setUsers(filtered);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load users.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const term = normalize(query);
    if (!term) return users;
    return users.filter((user) => {
      const haystack = [
        getUserName(user),
        getUserEmail(user),
        user?.mobile,
        user?.phone,
        user?.userType,
        user?.status,
      ]
        .map(normalize)
        .join(' ');
      return haystack.includes(term);
    });
  }, [query, users]);

  const activeCount = useMemo(() => users.filter((user) => Number(user?.active) === 1).length, [users]);
  const inactiveCount = Math.max(0, users.length - activeCount);
  const verifiedCount = useMemo(() => users.filter((user) => Number(user?.verify) === 1).length, [users]);
  const pendingCount = Math.max(0, users.length - verifiedCount);

  const handleToggleActive = async (user) => {
    if (!canUserUpdate) {
      setMessage({ type: 'error', text: 'You do not have permission to update users.' });
      return;
    }
    if (!user?.id) return;

    const nextActive = Number(user?.active) === 1 ? 0 : 1;
    const payload = buildUserUpdatePayload(user, nextActive);
    if (!payload.name || !payload.number) {
      setMessage({ type: 'error', text: 'User is missing required name or phone fields for update.' });
      return;
    }

    setActiveUserId(user.id);
    setMessage({ type: 'info', text: '' });
    try {
      await updateUser(token, user.id, payload);
      await loadUsers();
      setMessage({
        type: 'success',
        text: `${getUserName(user)} ${nextActive === 1 ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update user status.' });
    } finally {
      setActiveUserId(null);
    }
  };

  const handleCreateSuccess = (msg) => {
    setMessage({ type: 'success', text: msg });
    loadUsers();
    setShowCreateModal(false);
  };

  const renderViewPanel = () => {
    if (!viewUser) return null;
    const u = viewUser;
    const name      = getUserName(u);
    const email     = getUserEmail(u);
    const phone     = u?.number || u?.mobile || u?.phone || null;
    const userType  = getUserType(u);
    const initials  = getInitials(u);
    const verif     = resolveVerification(u);
    const isActive  = Number(u?.active) === 1;
    const joined    = u?.created_at || u?.createdAt || u?.joined_at;
    const lastAct   = u?.last_active || u?.lastActive || u?.updatedAt || u?.updated_at;
    const timeZone  = u?.timeZone || u?.time_zone || null;
    const userId    = u?.id || u?.user_id;

    return (
      <div className="mv-panel card">
        {/* header */}
        <div className="mv-panel-header">
          <div className="mv-panel-title-row">
            <button type="button" className="mv-back-btn" onClick={() => setViewUser(null)}>
              ← Back
            </button>
            <h3 className="mv-panel-title">{name}</h3>
            <UserStatusBadge isActive={isActive} />
          </div>
        </div>

        {/* avatar + verification */}
        <div className="mv-section" style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 14, paddingBottom: 14 }}>
          <div className="mv-emp-avatar" style={{ background: 'linear-gradient(135deg, #6e46ff, #8b5cf6)', fontSize: 20 }}>
            {initials}
          </div>
          <div className="mv-emp-avatar-info">
            <strong>{name}</strong>
            <span>{phone || email || '—'}</span>
            <span style={{ marginTop: 4 }}>
              <span className={verif.className === 'verified' ? 'status-active' : 'status-inactive'}
                style={{ fontSize: 11, padding: '2px 8px' }}>
                {verif.label}
              </span>
            </span>
          </div>
        </div>

        {/* basic info */}
        <div className="mv-section">
          <p className="mv-section-label">Basic Info</p>
          <div className="mv-detail-grid">
            <UserDetailRow label="User ID" value={String(userId ?? '—')} />
            <UserDetailRow label="Phone" value={phone} />
            <UserDetailRow label="Email" value={email !== '-' ? email : null} />
            <UserDetailRow label="User Type" value={userType} />
            <UserDetailRow label="Timezone" value={timeZone} />
            <UserDetailRow label="Verification" value={verif.label} />
          </div>
        </div>

        {/* activity */}
        <div className="mv-section">
          <p className="mv-section-label">Activity</p>
          <div className="mv-detail-grid">
            <UserDetailRow
              label="Joined"
              value={joined ? new Date(joined).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null}
            />
            <UserDetailRow
              label="Last Active"
              value={lastAct ? new Date(lastAct).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="users-page">
      <Banner message={message} />

      <div className="users-filters">
        <span className="status-chip login">{activeCount} Active</span>
        <span className="status-chip logout">{inactiveCount} Inactive</span>
        <span className="status-chip pending">{pendingCount} Pending</span>
      </div>

      <div className={`mv-layout${viewUser ? ' mv-layout--split' : ''}`}>
        <div className="panel card users-table-card">
          <div className="panel-split">
            <div className="category-list-head-left">
              <h3 className="panel-subheading">User list</h3>
              <div className="gsc-datatable-toolbar-left">
                <button type="button" className="gsc-toolbar-btn" title="Filter">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h10M4 18h6" />
                  </svg>
                  Filter
                </button>
                <button type="button" className="gsc-toolbar-btn" title="Columns">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="18" rx="1" />
                    <rect x="14" y="3" width="7" height="18" rx="1" />
                  </svg>
                  Columns
                </button>
              </div>
            </div>
            <div className="gsc-datatable-toolbar-right">
              <div className="gsc-toolbar-search">
                <input
                  type="search"
                  placeholder="Search users..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search users"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              {canUserCreate && (
                <button
                  type="button"
                  className="gsc-create-btn"
                  id="create-user-btn"
                  onClick={() => { setMessage({ type: 'info', text: '' }); setShowCreateModal(true); }}
                  title="Create User"
                  aria-label="Create User"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <p className="empty-state">No users found.</p>
          ) : (
            <div className="table-shell business-table-shell">
              <table className="admin-table users-table business-datatable">
                <thead>
                  <tr>
                    <th className="bdt-checkbox-col">
                      <input
                        type="checkbox"
                        className="select-checkbox"
                        checked={selectedRows.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedRows(new Set(filteredUsers.map((user) => user?.id || user?.user_id)));
                          } else {
                            setSelectedRows(new Set());
                          }
                        }}
                      />
                    </th>
                    <th>Sr. No.</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Phone</th>
                    <th>Verification</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => {
                    const verificationMeta = resolveVerification(user);
                    const isActive = Number(user?.active) === 1;
                    const rowId = user?.id || user?.user_id;
                    return (
                      <tr
                        key={rowId || getUserEmail(user)}
                        className={`${rowId && selectedRows.has(rowId) ? 'bdt-row-selected' : ''}${viewUser?.id === rowId ? ' mv-row-active' : ''} table-row-clickable`}
                        onClick={(e) => {
                          if (e.target.closest('.bdt-checkbox-col') || e.target.closest('.table-actions')) return;
                          setViewUser(user);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="bdt-checkbox-col" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="select-checkbox"
                            checked={rowId ? selectedRows.has(rowId) : false}
                            onChange={(event) => {
                              if (!rowId) return;
                              setSelectedRows((prev) => {
                                const next = new Set(prev);
                                if (event.target.checked) {
                                  next.add(rowId);
                                } else {
                                  next.delete(rowId);
                                }
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td>{index + 1}</td>
                        <td>
                          <div className="user-cell">
                            <div>
                              <span className="bdt-name-link" style={{ color: 'var(--gsc-primary, #6e46ff)', fontWeight: 600, cursor: 'pointer' }}>{getUserName(user)}</span>
                              <p className="user-email">{getUserEmail(user)}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`type-pill ${normalize(getUserType(user))}`}>{getUserType(user)}</span>
                        </td>
                        <td>{user?.number || user?.mobile || user?.phone || '-'}</td>
                        <td>
                          <span className={`verify-pill ${verificationMeta.className}`}>{verificationMeta.label}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${isActive ? 'approved' : 'rejected'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{formatDate(user?.created_at || user?.createdAt || user?.joined_at)}</td>
                        <td className="table-actions">
                          <div className="table-action-group">
                            {canUserUpdate ? (
                              <TableRowActionMenu
                                rowId={rowId}
                                openRowId={openActionRowId}
                                onToggle={setOpenActionRowId}
                                actions={[
                                  {
                                    label: 'View',
                                    onClick: () => setViewUser(user),
                                  },
                                  {
                                    label: isActive ? 'Deactivate' : 'Activate',
                                    onClick: () => handleToggleActive(user),
                                    danger: isActive,
                                  },
                                ]}
                              />
                            ) : (
                              <span className="user-email">Read only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── View panel ────────────────────────────────────── */}
        {renderViewPanel()}
      </div>

      {/* ── Create User Modal ────────────────────────────────────── */}
      {showCreateModal && (
        <CreateUserModal
          token={token}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}

export default UserDirectoryPage;
