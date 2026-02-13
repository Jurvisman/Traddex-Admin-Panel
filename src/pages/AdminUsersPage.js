import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import {
  deleteUser,
  deleteUsersBulk,
  fetchUserDetails,
  fetchUsers,
  updateBusinessProfile,
  updateBusinessProfileStatus,
  updateUser,
} from '../services/adminApi';

const normalize = (value) => String(value || '').toLowerCase();

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const resolveLoginStatus = (user) => {
  if (user?.logout !== undefined && user?.logout !== null) {
    return Number(user.logout) === 0;
  }
  if (user?.active !== undefined && user?.active !== null) {
    return Number(user.active) === 1;
  }
  const raw =
    user?.login_status ??
    user?.loginStatus ??
    user?.is_logged_in ??
    user?.isLoggedIn ??
    user?.is_online ??
    user?.isOnline ??
    user?.online ??
    user?.current_session;

  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw === 1;
  if (typeof raw === 'string') {
    const value = raw.toLowerCase();
    if (['login', 'loggedin', 'online', 'true', 'yes', 'active'].includes(value)) return true;
    if (['logout', 'loggedout', 'offline', 'false', 'no', 'inactive'].includes(value)) return false;
  }
  if (raw && typeof raw === 'object') return true;
  return false;
};

const getUserName = (user) =>
  user?.name || user?.full_name || user?.fullName || user?.username || user?.mobile || `User #${user?.id || ''}`;

const getUserEmail = (user) => user?.email || user?.email_id || user?.user_email || user?.contact_email || '-';

const getUserType = (user) => {
  const raw = user?.userType || user?.type || user?.role || 'USER';
  const value = String(raw || '').toUpperCase();
  if (value === 'BUSINESS') return 'Business';
  if (value === 'LOGISTIC') return 'Logistic';
  if (value === 'INSURANCE') return 'Insurance';
  return 'User';
};

const getSubscriptionLabel = (user) => {
  const plan = user?.subscriptionPlan || user?.subscription_plan;
  return (
    plan?.name ||
    plan?.plan_name ||
    user?.plan_name ||
    user?.subscription ||
    user?.plan ||
    user?.current_plan ||
    'Free'
  );
};

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const isBusinessUser = (user) => {
  const raw = user?.userType || user?.type || user?.role;
  return String(raw || '').toUpperCase() === 'BUSINESS';
};

const resolveBusinessVerification = (statusValue) => {
  const normalized = normalizeStatus(statusValue);
  if (!normalized) return { label: 'Pending', className: 'pending', isVerified: false };
  if (['VERIFIED', 'APPROVED'].includes(normalized)) {
    return { label: 'Verified', className: 'verified', isVerified: true };
  }
  if (normalized === 'REJECTED') {
    return { label: 'Rejected', className: 'rejected', isVerified: false };
  }
  if (['PENDING_REVIEW', 'PENDING', 'COMPLETED'].includes(normalized)) {
    return { label: 'Pending', className: 'pending', isVerified: false };
  }
  return { label: normalized, className: 'pending', isVerified: false };
};

const resolveVerification = (user) => {
  if (isBusinessUser(user)) {
    return resolveBusinessVerification(user?.kycStatus);
  }
  const verified = Number(user?.verify) === 1;
  return { label: verified ? 'Verified' : 'Pending', className: verified ? 'verified' : 'pending', isVerified: verified };
};

const getInitials = (user) => {
  const name = getUserName(user);
  if (!name) return 'U';
  const words = String(name).trim().split(' ').filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
};

const BUSINESS_PROFILE_FIELDS = [
  { key: 'businessName', label: 'Business Name', required: true, span: true },
  { key: 'ownerName', label: 'Owner Name' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'whatsappNumber', label: 'WhatsApp Number' },
  { key: 'email', label: 'Email' },
  { key: 'industry', label: 'Industry' },
  { key: 'businessType', label: 'Business Type' },
  { key: 'gstNumber', label: 'GST Number' },
  { key: 'businessPan', label: 'Business PAN' },
  { key: 'udyam', label: 'Udyam' },
  { key: 'primaryCategoryId', label: 'Primary Category ID', type: 'number' },
  { key: 'primarySubCategoryId', label: 'Primary Sub-Category ID', type: 'number' },
  { key: 'address', label: 'Address', type: 'textarea', span: true },
  { key: 'formattedAddress', label: 'Formatted Address', type: 'textarea', span: true },
  { key: 'placeId', label: 'Place ID' },
  { key: 'plotNo', label: 'Plot No' },
  { key: 'landmark', label: 'Landmark' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'countryCode', label: 'Country Code' },
  { key: 'stateCode', label: 'State Code' },
  { key: 'cityCode', label: 'City Code' },
  { key: 'latitude', label: 'Latitude', type: 'number' },
  { key: 'longitude', label: 'Longitude', type: 'number' },
  { key: 'logo', label: 'Logo URL' },
  { key: 'website', label: 'Website' },
  { key: 'nature', label: 'Nature' },
  { key: 'branchAddress', label: 'Branch Address', type: 'textarea', span: true },
  { key: 'description', label: 'Description', type: 'textarea', span: true },
  { key: 'experience', label: 'Experience' },
  { key: 'hours', label: 'Hours' },
  { key: 'serviceArea', label: 'Service Area' },
  { key: 'serviceRadius', label: 'Service Radius', type: 'number' },
  { key: 'modeOfService', label: 'Mode of Service' },
  { key: 'paymentMethods', label: 'Payment Methods', type: 'textarea', span: true },
  { key: 'refundPolicy', label: 'Refund Policy', type: 'textarea', span: true },
  { key: 'serviceHighlights', label: 'Service Highlights', type: 'textarea', span: true },
  { key: 'languagesSupported', label: 'Languages Supported' },
  { key: 'licenseNumber', label: 'License Number' },
  { key: 'mapLink', label: 'Map Link' },
  { key: 'accountHolderName', label: 'Account Holder Name' },
  { key: 'bankName', label: 'Bank Name' },
  { key: 'accountNumber', label: 'Account Number' },
  { key: 'ifscCode', label: 'IFSC Code' },
  { key: 'razorpayKey', label: 'Razorpay Key' },
];

const buildBusinessFormState = (profile) =>
  BUSINESS_PROFILE_FIELDS.reduce((acc, field) => {
    const value = profile?.[field.key];
    acc[field.key] = value !== null && value !== undefined ? value : '';
    return acc;
  }, {});

const buildBusinessPayload = (form) =>
  BUSINESS_PROFILE_FIELDS.reduce((acc, field) => {
    const value = form?.[field.key];
    if (value === null || value === undefined || value === '') {
      acc[field.key] = null;
      return acc;
    }
    if (field.type === 'number') {
      const parsed = Number(value);
      acc[field.key] = Number.isNaN(parsed) ? null : parsed;
      return acc;
    }
    acc[field.key] = typeof value === 'string' ? value.trim() : value;
    return acc;
  }, {});

function AdminUsersPage({ token }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [viewDetails, setViewDetails] = useState(null);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    number: '',
    verify: '0',
    active: '1',
    logout: '0',
    timeZone: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editBusinessProfile, setEditBusinessProfile] = useState(null);
  const [editBusinessForm, setEditBusinessForm] = useState(() => buildBusinessFormState(null));
  const [isBusinessSaving, setIsBusinessSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const loadUsers = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await fetchUsers(token);
      const list = response?.data || [];
      list.sort((a, b) => {
        const aDate = new Date(a?.createdAt || a?.created_at || 0).getTime();
        const bDate = new Date(b?.createdAt || b?.created_at || 0).getTime();
        return bDate - aDate;
      });
      setUsers(list);
      setSelectedIds(new Set());
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

  const loginCount = useMemo(() => users.filter((user) => resolveLoginStatus(user)).length, [users]);
  const logoutCount = Math.max(0, users.length - loginCount);
  const pendingCount = useMemo(() => users.filter((user) => !resolveVerification(user).isVerified).length, [users]);
  const verifiedCount = Math.max(0, users.length - pendingCount);
  const selectedCount = selectedIds.size;
  const allSelected =
    filteredUsers.length > 0 && filteredUsers.every((user) => user?.id && selectedIds.has(user.id));

  const toggleSelect = (userId) => {
    if (!userId) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      filteredUsers.forEach((user) => {
        if (user?.id) next.add(user.id);
      });
      return next;
    });
  };

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({
      name: user?.name || '',
      number: user?.number || user?.mobile || user?.phone || '',
      verify: user?.verify !== undefined && user?.verify !== null ? String(user.verify) : '0',
      active: user?.active !== undefined && user?.active !== null ? String(user.active) : '1',
      logout: user?.logout !== undefined && user?.logout !== null ? String(user.logout) : '0',
      timeZone: user?.timeZone || user?.time_zone || '',
    });
  };

  const handleEditChange = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editUser?.id) return;
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateUser(token, editUser.id, {
        name: editForm.name.trim(),
        number: editForm.number.trim(),
        verify: Number(editForm.verify),
        active: Number(editForm.active),
        logout: Number(editForm.logout),
        timeZone: editForm.timeZone.trim() || null,
      });
      await loadUsers();
      setEditUser(null);
      setMessage({ type: 'success', text: 'User updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update user.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async (user) => {
    if (!user?.id) return;
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateUser(token, user.id, { verify: 1 });
      await loadUsers();
      setMessage({ type: 'success', text: 'User verified successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to verify user.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!user?.id) return;
    const ok = window.confirm(`Delete ${getUserName(user)}? This will remove the user from the list.`);
    if (!ok) return;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await deleteUser(token, user.id);
      await loadUsers();
      setMessage({ type: 'success', text: 'User deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete user.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedCount) return;
    const ok = window.confirm(`Delete ${selectedCount} users? This will remove them from the list.`);
    if (!ok) return;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await deleteUsersBulk(token, Array.from(selectedIds));
      await loadUsers();
      setMessage({ type: 'success', text: 'Users deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete users.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = async (user) => {
    if (!user?.id) return;
    setViewDetails({ user });
    setIsViewLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await fetchUserDetails(token, user.id);
      setViewDetails(response?.data || { user });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load user details.' });
    } finally {
      setIsViewLoading(false);
    }
  };

  const refreshViewDetails = async (userId) => {
    if (!userId) return;
    setIsViewLoading(true);
    try {
      const response = await fetchUserDetails(token, userId);
      setViewDetails(response?.data || { user: viewDetails?.user });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to refresh user details.' });
    } finally {
      setIsViewLoading(false);
    }
  };

  const openBusinessEdit = (profile) => {
    if (!profile) return;
    setEditBusinessProfile(profile);
    setEditBusinessForm(buildBusinessFormState(profile));
  };

  const handleBusinessChange = (key, value) => {
    setEditBusinessForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBusinessSave = async (event) => {
    event.preventDefault();
    if (!editBusinessProfile?.userId) return;
    setIsBusinessSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      const payload = buildBusinessPayload(editBusinessForm);
      if (!payload.businessName) {
        throw new Error('Business name is required.');
      }
      await updateBusinessProfile(token, editBusinessProfile.userId, payload, 'VERIFIED');
      await loadUsers();
      await refreshViewDetails(editBusinessProfile.userId);
      setEditBusinessProfile(null);
      setMessage({ type: 'success', text: 'Business profile saved and verified.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update business profile.' });
    } finally {
      setIsBusinessSaving(false);
    }
  };

  const handleBusinessApprove = async () => {
    if (!viewBusinessProfile?.profileId) return;
    setIsBusinessSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateBusinessProfileStatus(token, viewBusinessProfile.profileId, 'VERIFIED');
      await loadUsers();
      await refreshViewDetails(viewBusinessProfile.userId || viewUser?.id);
      setMessage({ type: 'success', text: 'Business profile verified successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to verify business profile.' });
    } finally {
      setIsBusinessSaving(false);
    }
  };

  const viewUser = viewDetails?.user || null;
  const viewUserProfile = viewDetails?.userProfile || null;
  const viewBusinessProfile = viewDetails?.businessProfile || null;
  const viewLogisticProfile = viewDetails?.logisticProfile || null;
  const viewInsuranceProfile = viewDetails?.insuranceProfile || null;
  const businessStatusMeta = viewBusinessProfile
    ? resolveBusinessVerification(viewBusinessProfile?.status || viewUser?.kycStatus)
    : null;

  return (
    <div className="users-page">
      <div className="users-head">
        <div>
          <h2 className="panel-title">Users</h2>
          <p className="panel-subtitle">Manage all {users.length} registered users.</p>
        </div>
        <div className="users-head-actions">
          <button type="button" className="ghost-btn" onClick={loadUsers} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={handleBulkDelete}
            disabled={isLoading || selectedCount === 0}
          >
            Delete Selected{selectedCount ? ` (${selectedCount})` : ''}
          </button>
          <button type="button" className="primary-btn">
            Add User
          </button>
        </div>
      </div>

      <Banner message={message} />

      <div className="stat-grid">
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#4F46E5' }}>
          <p className="stat-label">Total users</p>
          <p className="stat-value">{users.length}</p>
          <p className="stat-sub">All registered accounts</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#16A34A' }}>
          <p className="stat-label">Logged in</p>
          <p className="stat-value">{loginCount}</p>
          <p className="stat-sub">Active sessions</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#0EA5E9' }}>
          <p className="stat-label">Verified</p>
          <p className="stat-value">{verifiedCount}</p>
          <p className="stat-sub">KYC complete</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F97316' }}>
          <p className="stat-label">Pending</p>
          <p className="stat-value">{pendingCount}</p>
          <p className="stat-sub">Needs verification</p>
        </div>
      </div>

      <div className="users-filters">
        <span className="status-chip login">{loginCount} Login</span>
        <span className="status-chip logout">{logoutCount} Logout</span>
        <span className="status-chip pending">{pendingCount} Pending</span>
      </div>

      <div className="panel card users-table-card">
        <div className="users-search">
          <span className="icon icon-search" />
          <input
            type="search"
            placeholder="Search users by name or email..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" className="ghost-btn small" onClick={() => setQuery('')}>
              Clear
            </button>
          ) : null}
        </div>

        {filteredUsers.length === 0 ? (
          <p className="empty-state">No users found.</p>
        ) : (
          <div className="table-shell">
            <table className="admin-table users-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="select-checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all users"
                    />
                  </th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Subscription</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="table-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => {
                  const isLoggedIn = resolveLoginStatus(user);
                  const statusLabel = isLoggedIn ? 'Login' : 'Logout';
                  const statusClass = isLoggedIn ? 'login' : 'logout';
                  const userType = getUserType(user);
                  const verificationMeta = resolveVerification(user);
                  const verificationStatus = verificationMeta.label;
                  const verificationClass = verificationMeta.className;
                  return (
                    <tr key={user?.id || user?.user_id || index}>
                      <td>
                        <input
                          type="checkbox"
                          className="select-checkbox"
                          checked={user?.id ? selectedIds.has(user.id) : false}
                          onChange={() => toggleSelect(user?.id)}
                          aria-label={`Select ${getUserName(user)}`}
                        />
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className={`user-avatar ${statusClass}`}>
                            <span>{getInitials(user)}</span>
                            <span className={`user-presence ${statusClass}`} />
                          </div>
                          <div>
                            <p className="user-name">{getUserName(user)}</p>
                            <p className="user-email">{getUserEmail(user)}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`type-pill ${normalize(userType)}`}>{userType}</span>
                      </td>
                      <td>
                        <span className="subscription-pill">{getSubscriptionLabel(user)}</span>
                      </td>
                      <td>
                        <span className={`verify-pill ${verificationClass}`}>{verificationStatus}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                      </td>
                      <td>{formatDate(user?.created_at || user?.createdAt || user?.joined_at)}</td>
                      <td className="table-actions">
                        <div className="table-action-group">
                          <button type="button" className="ghost-btn small" onClick={() => handleView(user)}>
                            View
                          </button>
                          <button type="button" className="ghost-btn small" onClick={() => openEdit(user)}>
                            Edit
                          </button>
                          {verificationStatus !== 'Verified' && !isBusinessUser(user) ? (
                            <button
                              type="button"
                              className="ghost-btn small"
                              onClick={() => handleVerify(user)}
                              disabled={isSaving}
                            >
                              Verify
                            </button>
                          ) : null}
                          <button type="button" className="ghost-btn small" onClick={() => handleDelete(user)}>
                            Delete
                          </button>
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

      {viewDetails ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="panel-split">
              <div>
                <h3 className="panel-subheading">User Details</h3>
                <p className="panel-subtitle">{viewUser ? getUserName(viewUser) : 'Loading...'}</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setViewDetails(null)}>
                Close
              </button>
            </div>

            {isViewLoading ? <p className="empty-state">Loading user details...</p> : null}

            {viewUser ? (
              <>
                <div className="detail-section">
                  <h4 className="detail-section-title">Account</h4>
                  <div className="user-detail-grid">
                    <div className="user-detail-card">
                      <p className="user-detail-label">Phone</p>
                      <p className="user-detail-value">{viewUser?.number || viewUser?.mobile || '-'}</p>
                    </div>
                    <div className="user-detail-card">
                      <p className="user-detail-label">User Type</p>
                      <p className="user-detail-value">{getUserType(viewUser)}</p>
                    </div>
                    <div className="user-detail-card">
                      <p className="user-detail-label">Subscription</p>
                      <p className="user-detail-value">{getSubscriptionLabel(viewUser)}</p>
                    </div>
                    <div className="user-detail-card">
                      <p className="user-detail-label">Subscription Status</p>
                      <p className="user-detail-value">{viewUser?.subscriptionStatus || '-'}</p>
                    </div>
                    <div className="user-detail-card">
                      <p className="user-detail-label">Login Status</p>
                      <p className="user-detail-value">{resolveLoginStatus(viewUser) ? 'Login' : 'Logout'}</p>
                    </div>
                    <div className="user-detail-card">
                      <p className="user-detail-label">Active</p>
                      <p className="user-detail-value">
                        {viewUser?.active !== undefined && viewUser?.active !== null ? String(viewUser.active) : '-'}
                      </p>
                    </div>
                    <div className="user-detail-card">
                      <p className="user-detail-label">Verified</p>
                      <p className="user-detail-value">{resolveVerification(viewUser).label}</p>
                    </div>
                    <div className="user-detail-card">
                      <p className="user-detail-label">Joined</p>
                      <p className="user-detail-value">
                        {formatDate(viewUser?.createdAt || viewUser?.created_at || viewUser?.joined_at)}
                      </p>
                    </div>
                    <div className="user-detail-card">
                      <p className="user-detail-label">Last Active</p>
                      <p className="user-detail-value">{formatDate(viewUser?.lastActive || viewUser?.last_active)}</p>
                    </div>
                    <div className="user-detail-card">
                      <p className="user-detail-label">Role</p>
                      <p className="user-detail-value">{viewUser?.roleName || '-'}</p>
                    </div>
                    <div className="user-detail-card">
                      <p className="user-detail-label">Time Zone</p>
                      <p className="user-detail-value">{viewUser?.timeZone || '-'}</p>
                    </div>
                  </div>
                </div>

                {viewUserProfile ? (
                  <div className="detail-section">
                    <h4 className="detail-section-title">User Profile</h4>
                    <div className="user-detail-grid">
                      {Object.entries(viewUserProfile).map(([key, value]) => {
                        if (value === null || value === undefined || value === '') return null;
                        return (
                          <div key={`user-${key}`} className="user-detail-card">
                            <p className="user-detail-label">{key.replace(/([A-Z])/g, ' $1')}</p>
                            <p className="user-detail-value">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {viewBusinessProfile ? (
                  <div className="detail-section">
                    <div className="panel-split">
                      <div className="inline-row">
                        <h4 className="detail-section-title">Business Profile</h4>
                        {businessStatusMeta ? (
                          <span className={`verify-pill ${businessStatusMeta.className}`}>{businessStatusMeta.label}</span>
                        ) : null}
                      </div>
                      <div className="inline-row">
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => openBusinessEdit(viewBusinessProfile)}
                        >
                          Edit KYC
                        </button>
                        <button
                          type="button"
                          className="primary-btn compact"
                          onClick={handleBusinessApprove}
                          disabled={isBusinessSaving || businessStatusMeta?.isVerified}
                        >
                          {businessStatusMeta?.isVerified ? 'Verified' : isBusinessSaving ? 'Approving...' : 'Approve'}
                        </button>
                      </div>
                    </div>
                    <div className="user-detail-grid">
                      {Object.entries(viewBusinessProfile).map(([key, value]) => {
                        if (value === null || value === undefined || value === '') return null;
                        return (
                          <div key={`biz-${key}`} className="user-detail-card">
                            <p className="user-detail-label">{key.replace(/([A-Z])/g, ' $1')}</p>
                            <p className="user-detail-value">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {viewLogisticProfile ? (
                  <div className="detail-section">
                    <h4 className="detail-section-title">Logistic Profile</h4>
                    <div className="user-detail-grid">
                      {Object.entries(viewLogisticProfile).map(([key, value]) => {
                        if (value === null || value === undefined || value === '') return null;
                        return (
                          <div key={`log-${key}`} className="user-detail-card">
                            <p className="user-detail-label">{key.replace(/([A-Z])/g, ' $1')}</p>
                            <p className="user-detail-value">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {viewInsuranceProfile ? (
                  <div className="detail-section">
                    <h4 className="detail-section-title">Insurance Profile</h4>
                    <div className="user-detail-grid">
                      {Object.entries(viewInsuranceProfile).map(([key, value]) => {
                        if (value === null || value === undefined || value === '') return null;
                        const display =
                          typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
                        return (
                          <div key={`ins-${key}`} className="user-detail-card">
                            <p className="user-detail-label">{key.replace(/([A-Z])/g, ' $1')}</p>
                            <p className="user-detail-value">{display}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {editUser ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="panel-split">
              <div>
                <h3 className="panel-subheading">Edit User</h3>
                <p className="panel-subtitle">{getUserName(editUser)}</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setEditUser(null)}>
                Close
              </button>
            </div>

            <form className="field-grid" onSubmit={handleUpdate}>
              <label className="field field-span">
                <span>Name</span>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(event) => handleEditChange('name', event.target.value)}
                  required
                />
              </label>
              <label className="field field-span">
                <span>Phone</span>
                <input
                  type="text"
                  value={editForm.number}
                  onChange={(event) => handleEditChange('number', event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Verified</span>
                <select value={editForm.verify} onChange={(event) => handleEditChange('verify', event.target.value)}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </label>
              <label className="field">
                <span>Active</span>
                <select value={editForm.active} onChange={(event) => handleEditChange('active', event.target.value)}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <label className="field">
                <span>Logout</span>
                <select value={editForm.logout} onChange={(event) => handleEditChange('logout', event.target.value)}>
                  <option value="0">Login</option>
                  <option value="1">Logout</option>
                </select>
              </label>
              <label className="field">
                <span>Time Zone</span>
                <input
                  type="text"
                  value={editForm.timeZone}
                  onChange={(event) => handleEditChange('timeZone', event.target.value)}
                  placeholder="Asia/Kolkata"
                />
              </label>
              <div className="field field-span form-actions">
                <button type="button" className="ghost-btn" onClick={() => setEditUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editBusinessProfile ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="panel-split">
              <div>
                <h3 className="panel-subheading">Edit Business Profile</h3>
                <p className="panel-subtitle">{viewUser ? getUserName(viewUser) : 'Business user'}</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setEditBusinessProfile(null)}>
                Close
              </button>
            </div>

            <form className="field-grid" onSubmit={handleBusinessSave}>
              {BUSINESS_PROFILE_FIELDS.map((field) => {
                const value = editBusinessForm?.[field.key] ?? '';
                const isTextArea = field.type === 'textarea';
                const isNumber = field.type === 'number';
                return (
                  <label key={`biz-edit-${field.key}`} className={`field ${field.span ? 'field-span' : ''}`}>
                    <span>{field.label}</span>
                    {isTextArea ? (
                      <textarea value={value} onChange={(event) => handleBusinessChange(field.key, event.target.value)} />
                    ) : (
                      <input
                        type={isNumber ? 'number' : 'text'}
                        value={value}
                        step={isNumber && (field.key === 'latitude' || field.key === 'longitude') ? 'any' : undefined}
                        onChange={(event) => handleBusinessChange(field.key, event.target.value)}
                        required={Boolean(field.required)}
                      />
                    )}
                  </label>
                );
              })}
              <div className="field field-span form-actions">
                <button type="button" className="ghost-btn" onClick={() => setEditBusinessProfile(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isBusinessSaving}>
                  {isBusinessSaving ? 'Saving...' : 'Save & Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminUsersPage;
