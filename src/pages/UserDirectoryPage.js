import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import { deleteUsersBulk, fetchUsers, sendOtp, updateUser, verifyOtp } from '../services/adminApi';

const normalize = (value) => String(value || '').toLowerCase();
const USER_LIST_PAGE_SIZE_OPTIONS = [10, 25, 50];

const paginateItems = (items, page, pageSize = USER_LIST_PAGE_SIZE_OPTIONS[0]) => {
  const list = Array.isArray(items) ? items : [];
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;
  const end = Math.min(start + pageSize, totalItems);

  return {
    items: list.slice(start, end),
    totalItems,
    totalPages,
    page: safePage,
    start,
    end,
  };
};

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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verified, setVerified] = useState(false);
  const [step, setStep] = useState(OTP_STEP.IDLE);
  const [error, setError] = useState('');
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
      const resp = await verifyOtp(phone.trim(), otp.trim());
      verifiedUser = resp?.data || resp;
      setVerified(true);
      clearInterval(timerRef.current);
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
      setStep(OTP_STEP.IDLE);
      return;
    }
    setStep(OTP_STEP.CREATING);
    try {
      const userId = verifiedUser?.id || verifiedUser?.user_id || verifiedUser?.userId;
      if (userId && name.trim() && name.trim().toLowerCase() !== 'user') {
        await updateUser(token, userId, {
          name: name.trim(),
          number: phone.trim(),
          verify: 1,
          active: 1,
          logout: 0,
          timeZone: null,
        });
      }
      setStep(OTP_STEP.DONE);
      onSuccess(`User "${name.trim()}" created successfully.`);
    } catch (err) {
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

  const STEPS = ['Details', 'Verify OTP', 'Done'];

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
      <div
        className="admin-modal"
        style={{ maxWidth: 460, width: '100%', padding: 0, borderRadius: 16, overflow: 'hidden' }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            <h3
              id="create-user-title"
              style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}
            >
              Create New User
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
              Verify mobile number via OTP to create account
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close"
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: isBusy ? 'not-allowed' : 'pointer',
              color: '#64748b', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 14, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Step indicator ──────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '13px 24px',
          background: '#fafafa',
          borderBottom: '1px solid #f1f5f9',
        }}>
          {STEPS.map((label, i) => {
            const active = i === 0 ? !otpSent : i === 1 ? otpSent && !verified : verified;
            const done = i === 0 ? otpSent : i === 1 ? verified : false;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    background: done ? '#16a34a' : active ? 'var(--accent)' : '#e2e8f0',
                    color: done || active ? '#fff' : '#94a3b8',
                    boxShadow: active ? '0 0 0 3px rgba(99,69,237,0.15)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: active || done ? 600 : 400,
                    color: active ? 'var(--accent)' : done ? '#16a34a' : '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div style={{
                    flex: 1, height: 1.5, margin: '0 8px',
                    background: done ? '#16a34a' : '#e2e8f0',
                    borderRadius: 2, transition: 'background 0.3s',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        <div style={{ padding: '22px 24px 4px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Full Name */}
          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7,
            }}>
              Full Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Enter user's full name"
              disabled={isBusy || verified}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 13px',
                border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14,
                outline: 'none', color: '#111827',
                background: isBusy || verified ? '#f8fafc' : '#fff',
              }}
              aria-label="Full name"
            />
          </div>

          {/* Mobile + Send OTP */}
          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7,
            }}>
              Mobile Number <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Phone input with +91 prefix */}
              <div style={{
                display: 'flex', alignItems: 'center', flex: 1,
                border: '1.5px solid #e2e8f0', borderRadius: 8,
                overflow: 'hidden',
                background: isBusy || verified ? '#f8fafc' : '#fff',
              }}>
                <span style={{
                  padding: '0 10px', fontSize: 13, color: '#64748b', fontWeight: 600,
                  borderRight: '1.5px solid #e2e8f0', background: '#f8fafc',
                  alignSelf: 'stretch', display: 'flex', alignItems: 'center', flexShrink: 0,
                }}>
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number"
                  maxLength={10}
                  disabled={isBusy || verified}
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    padding: '10px 12px', fontSize: 14,
                    background: 'transparent', color: '#111827',
                  }}
                  aria-label="Mobile number"
                />
              </div>
              {/* Send OTP button */}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isBusy || verified || (otpSent && resendTimer > 0)}
                style={{
                  whiteSpace: 'nowrap', minWidth: 108, padding: '0 14px', height: 44,
                  border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13,
                  cursor: (isBusy || verified || (otpSent && resendTimer > 0)) ? 'not-allowed' : 'pointer',
                  background: (isBusy || verified || (otpSent && resendTimer > 0))
                    ? '#e2e8f0'
                    : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)',
                  color: (isBusy || verified || (otpSent && resendTimer > 0)) ? '#9ca3af' : '#fff',
                  boxShadow: (isBusy || verified || (otpSent && resendTimer > 0))
                    ? 'none' : '0 4px 12px rgba(99,69,237,0.25)',
                  transition: 'all 0.15s',
                }}
              >
                {step === OTP_STEP.SENDING
                  ? 'Sending…'
                  : otpSent
                    ? (resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Resend OTP')
                    : 'Send OTP'}
              </button>
            </div>
          </div>

          {/* OTP input — shown after send */}
          {otpSent && !verified && (
            <div style={{
              background: '#faf5ff', border: '1.5px solid #e9d5ff',
              borderRadius: 10, padding: '16px',
            }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#7c3aed', fontWeight: 500, lineHeight: 1.5 }}>
                OTP sent to <strong>+91 {phone}</strong> — enter the code below
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  placeholder="— — — — — —"
                  maxLength={6}
                  disabled={isBusy}
                  style={{
                    flex: 1, letterSpacing: 10, fontSize: 22, textAlign: 'center',
                    fontWeight: 700, padding: '10px 8px', borderRadius: 8,
                    border: '1.5px solid #c4b5fd', outline: 'none',
                    background: '#fff', color: '#4c1d95',
                  }}
                  aria-label="OTP code"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isBusy || otp.length < 4}
                  style={{
                    minWidth: 128, padding: '0 14px', height: 48, borderRadius: 8,
                    border: 'none', fontWeight: 600, fontSize: 13,
                    cursor: (isBusy || otp.length < 4) ? 'not-allowed' : 'pointer',
                    background: (isBusy || otp.length < 4)
                      ? '#e2e8f0'
                      : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)',
                    color: (isBusy || otp.length < 4) ? '#9ca3af' : '#fff',
                    boxShadow: (isBusy || otp.length < 4) ? 'none' : '0 4px 12px rgba(99,69,237,0.3)',
                    transition: 'all 0.15s',
                  }}
                >
                  {step === OTP_STEP.VERIFYING
                    ? 'Verifying…'
                    : step === OTP_STEP.CREATING
                      ? 'Creating…'
                      : 'Verify & Create'}
                </button>
              </div>
            </div>
          )}

          {/* Success state */}
          {verified && step === OTP_STEP.DONE && (
            <div style={{
              padding: '14px 16px', borderRadius: 10, background: '#f0fdf4',
              border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: '#16a34a', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 18, fontWeight: 700,
              }}>
                ✓
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#15803d' }}>User created successfully!</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#166534' }}>They can now log in to the Deal 360 app.</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: '#fef2f2',
              border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ color: '#ef4444', fontSize: 16, flexShrink: 0 }}>⚠</span>
              <span style={{ fontSize: 13, color: '#b91c1c' }}>{error}</span>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#fafafa',
          marginTop: 18,
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={step === OTP_STEP.CREATING}
            style={{
              padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b',
              cursor: step === OTP_STEP.CREATING ? 'not-allowed' : 'pointer',
            }}
          >
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
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [userListPage, setUserListPage] = useState(0);
  const [userListPageSize, setUserListPageSize] = useState(USER_LIST_PAGE_SIZE_OPTIONS[0]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState({
    srNo: true,
    user: true,
    type: true,
    phone: true,
    verification: true,
    status: true,
    joined: true,
  });

  const allowedActionSet = useMemo(() => {
    const next = new Set();
    const source = allowedActions instanceof Set ? Array.from(allowedActions) : Array.isArray(allowedActions) ? allowedActions : [];
    source.forEach((code) => {
      const normalizedCode = String(code || '').trim().toUpperCase();
      if (normalizedCode) next.add(normalizedCode);
    });
    return next;
  }, [allowedActions]);

  const hasActionModel = allowedActionSet.size > 0;
  const canUserRead = !hasActionModel || allowedActionSet.has('ADMIN_USERS_READ');
  const canUserUpdate = !hasActionModel || allowedActionSet.has('ADMIN_USERS_UPDATE');
  const canUserCreate = !hasActionModel || allowedActionSet.has('ADMIN_USERS_CREATE');
  const canUserDelete = !hasActionModel || allowedActionSet.has('ADMIN_USERS_DELETE');

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

  const statusFilteredUsers = useMemo(() => {
    return filteredUsers.filter((user) => {
      if (filterStatus === 'active') return Number(user?.active) === 1;
      if (filterStatus === 'inactive') return Number(user?.active) !== 1;
      if (filterStatus === 'verified') return Number(user?.verify) === 1;
      if (filterStatus === 'pending') return Number(user?.verify) !== 1;
      return true;
    });
  }, [filterStatus, filteredUsers]);

  const pagedUsers = useMemo(
    () => paginateItems(statusFilteredUsers, userListPage, userListPageSize),
    [statusFilteredUsers, userListPage, userListPageSize]
  );

  const visibleUserRowIds = useMemo(
    () =>
      pagedUsers.items
        .map((user) => user?.id || user?.user_id)
        .filter((value) => value !== null && value !== undefined && value !== ''),
    [pagedUsers.items]
  );

  const allVisibleUsersSelected =
    visibleUserRowIds.length > 0 &&
    visibleUserRowIds.every((rowId) => selectedRows.has(rowId));

  useEffect(() => {
    setUserListPage(0);
  }, [query, filterStatus]);

  useEffect(() => {
    if (userListPage !== pagedUsers.page) {
      setUserListPage(pagedUsers.page);
    }
  }, [pagedUsers.page, userListPage]);

  const activeCount = useMemo(() => users.filter((u) => Number(u?.active) === 1).length, [users]);
  const inactiveCount = Math.max(0, users.length - activeCount);
  const verifiedCount = useMemo(() => users.filter((u) => Number(u?.verify) === 1).length, [users]);
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

  const handleBulkDelete = async () => {
    if (!canUserDelete) {
      setMessage({ type: 'error', text: 'You do not have permission to delete users.' });
      return;
    }
    if (!selectedRows.size) return;

    const ids = Array.from(selectedRows);
    setIsDeleting(true);
    setMessage({ type: 'info', text: '' });
    try {
      await deleteUsersBulk(token, ids);
      setSelectedRows(new Set());
      setShowBulkDeleteConfirm(false);
      if (viewUser?.id && ids.includes(viewUser.id)) {
        setViewUser(null);
      }
      await loadUsers();
      setMessage({ type: 'success', text: `${ids.length} user(s) deleted successfully.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete users.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleColumn = (key) => {
    setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderViewPanel = () => {
    if (!viewUser) return null;
    const u = viewUser;
    const name = getUserName(u);
    const email = getUserEmail(u);
    const phone = u?.number || u?.mobile || u?.phone || null;
    const userType = getUserType(u);
    const initials = getInitials(u);
    const verif = resolveVerification(u);
    const isActive = Number(u?.active) === 1;
    const joined = u?.created_at || u?.createdAt || u?.joined_at;
    const lastAct = u?.last_active || u?.lastActive || u?.updatedAt || u?.updated_at;
    const timeZone = u?.timeZone || u?.time_zone || null;
    const userId = u?.id || u?.user_id;

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
          <div className="mv-emp-avatar" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', fontSize: 20 }}>
            {initials}
          </div>
          <div className="mv-emp-avatar-info">
            <strong>{name}</strong>
            <span>{phone || email || '—'}</span>
            <span style={{ marginTop: 4 }}>
              <span
                className={verif.className === 'verified' ? 'status-active' : 'status-inactive'}
                style={{ fontSize: 11, padding: '2px 8px' }}
              >
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
              <div className="gsc-datatable-toolbar-left">
                <div className="bdt-toolbar-wrap">
                  <button
                    type="button"
                    className={`gsc-toolbar-btn ${showFilterPanel ? 'active' : ''}`}
                    title="Filter"
                    onClick={() => { setShowFilterPanel((value) => !value); setShowColumnPicker(false); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16M4 12h10M4 18h6" />
                    </svg>
                    Filter{filterStatus ? ' •' : ''}
                  </button>
                  {showFilterPanel && (
                    <div className="bdt-dropdown-panel">
                      <p className="bdt-dropdown-label">User Status</p>
                      {[
                        { value: '', label: 'All Users' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                        { value: 'verified', label: 'Verified' },
                        { value: 'pending', label: 'Pending Verification' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`bdt-dropdown-option ${filterStatus === option.value ? 'selected' : ''}`}
                          onClick={() => { setFilterStatus(option.value); setShowFilterPanel(false); }}
                        >
                          {option.label}
                        </button>
                      ))}
                      {filterStatus ? (
                        <button
                          type="button"
                          className="bdt-dropdown-option danger"
                          onClick={() => { setFilterStatus(''); setShowFilterPanel(false); }}
                        >
                          Clear Filter
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="bdt-toolbar-wrap">
                  <button
                    type="button"
                    className={`gsc-toolbar-btn ${showColumnPicker ? 'active' : ''}`}
                    title="Columns"
                    onClick={() => { setShowColumnPicker((value) => !value); setShowFilterPanel(false); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="18" rx="1" />
                      <rect x="14" y="3" width="7" height="18" rx="1" />
                    </svg>
                    Columns
                  </button>
                  {showColumnPicker && (
                    <div className="bdt-dropdown-panel bdt-column-picker">
                      <p className="bdt-dropdown-label">Visible Columns</p>
                      {[
                        { key: 'srNo', label: 'Sr No' },
                        { key: 'user', label: 'User' },
                        { key: 'type', label: 'Type' },
                        { key: 'phone', label: 'Phone' },
                        { key: 'verification', label: 'Verification' },
                        { key: 'status', label: 'Status' },
                        { key: 'joined', label: 'Joined' },
                      ].map((column) => (
                        <label key={column.key} className="bdt-column-toggle">
                          <input
                            type="checkbox"
                            checked={columnVisibility[column.key]}
                            onChange={() => toggleColumn(column.key)}
                          />
                          {column.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
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

          {selectedRows.size > 0 && canUserDelete ? (
            <div className="bdt-bulk-bar">
              <div className="bdt-bulk-info">
                <span className="bdt-bulk-count">{selectedRows.size}</span>
                <span className="bdt-bulk-label">user(s) selected</span>
              </div>
              <div className="bdt-bulk-actions">
                <button
                  type="button"
                  className="bdt-bulk-btn delete"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete Selected
                </button>
                <button
                  type="button"
                  className="bdt-bulk-btn ghost"
                  onClick={() => setSelectedRows(new Set())}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          ) : null}

          {showBulkDeleteConfirm ? (
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
              <div className="admin-modal confirm-modal">
                <h3 className="panel-subheading">Delete {selectedRows.size} User(s)?</h3>
                <p className="panel-subtitle">Are you sure you want to delete the selected user accounts? This will remove them from the active listings.</p>
                <div className="form-actions" style={{ marginTop: 20 }}>
                  <button type="button" className="ghost-btn" onClick={() => setShowBulkDeleteConfirm(false)} disabled={isDeleting}>
                    Cancel
                  </button>
                  <button type="button" className="primary-btn danger" onClick={handleBulkDelete} disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {statusFilteredUsers.length === 0 ? (
            <p className="empty-state">{isLoading ? 'Loading...' : 'No users found.'}</p>
          ) : (
            <div className="table-shell business-table-shell">
              <table className="admin-table users-table business-datatable">
                <thead>
                  <tr>
                    <th className="bdt-checkbox-col">
                      <input
                        type="checkbox"
                        className="select-checkbox"
                        checked={allVisibleUsersSelected}
                        onChange={(event) => {
                          const pageRowIds = visibleUserRowIds;
                          if (event.target.checked) {
                            setSelectedRows((prev) => {
                              const next = new Set(prev);
                              pageRowIds.forEach((rowId) => next.add(rowId));
                              return next;
                            });
                          } else {
                            setSelectedRows((prev) => {
                              const next = new Set(prev);
                              pageRowIds.forEach((rowId) => next.delete(rowId));
                              return next;
                            });
                          }
                        }}
                      />
                    </th>
                    {columnVisibility.srNo && <th>Sr. No.</th>}
                    {columnVisibility.user && <th>User</th>}
                    {columnVisibility.type && <th>Type</th>}
                    {columnVisibility.phone && <th>Phone</th>}
                    {columnVisibility.verification && <th>Verification</th>}
                    {columnVisibility.status && <th>Status</th>}
                    {columnVisibility.joined && <th>Joined</th>}
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.items.map((user, index) => {
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
                        {columnVisibility.srNo && <td>{pagedUsers.start + index + 1}</td>}
                        {columnVisibility.user && (
                          <td>
                            <div className="user-cell">
                              <div>
                                <span
                                  className="bdt-name-link"
                                  style={{ color: 'var(--gsc-primary, #6345ED)', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  {getUserName(user)}
                                </span>
                                <p className="user-email">{getUserEmail(user)}</p>
                              </div>
                            </div>
                          </td>
                        )}
                        {columnVisibility.type && (
                          <td>
                            <span className={`type-pill ${normalize(getUserType(user))}`}>{getUserType(user)}</span>
                          </td>
                        )}
                        {columnVisibility.phone && <td>{user?.number || user?.mobile || user?.phone || '-'}</td>}
                        {columnVisibility.verification && (
                          <td>
                            <span className={`verify-pill ${verificationMeta.className}`}>{verificationMeta.label}</span>
                          </td>
                        )}
                        {columnVisibility.status && (
                          <td>
                            <span className={`status-pill ${isActive ? 'approved' : 'rejected'}`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        )}
                        {columnVisibility.joined && <td>{formatDate(user?.created_at || user?.createdAt || user?.joined_at)}</td>}
                        <td className="table-actions">
                          <div className="table-action-group">
                            {canUserUpdate ? (
                              <TableRowActionMenu
                                rowId={rowId}
                                openRowId={openActionRowId}
                                onToggle={setOpenActionRowId}
                                actions={[
                                  { label: 'View', onClick: () => setViewUser(user) },
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
              <div className="bv-table-footer">
                <div className="table-record-count">
                  <span>
                    Showing {pagedUsers.totalItems ? pagedUsers.start + 1 : 0}-{pagedUsers.end} of {statusFilteredUsers.length} users
                  </span>
                  {query || filterStatus ? <span className="bdt-no-more">Filtered from {users.length} total</span> : null}
                </div>
                <div className="product-pagination-controls">
                  <label className="product-pagination-size">
                    <span>Rows</span>
                    <select
                      value={userListPageSize}
                      onChange={(event) => {
                        setUserListPageSize(Number(event.target.value) || USER_LIST_PAGE_SIZE_OPTIONS[0]);
                        setUserListPage(0);
                      }}
                    >
                      {USER_LIST_PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="bv-table-pagination">
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={pagedUsers.page === 0 || isLoading}
                      onClick={() => setUserListPage((prev) => Math.max(prev - 1, 0))}
                    >
                      {'< Prev'}
                    </button>
                    <span>Page {pagedUsers.page + 1} / {pagedUsers.totalPages}</span>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={pagedUsers.page >= pagedUsers.totalPages - 1 || isLoading}
                      onClick={() => setUserListPage((prev) => Math.min(prev + 1, Math.max(pagedUsers.totalPages - 1, 0)))}
                    >
                      {'Next >'}
                    </button>
                  </div>
                </div>
              </div>
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
