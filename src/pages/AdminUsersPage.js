import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { deleteUser, fetchUsers, updateUser } from '../services/adminApi';

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

const getVerificationStatus = (user) => (Number(user?.verify) === 1 ? 'Verified' : 'Pending');

const getInitials = (user) => {
  const name = getUserName(user);
  if (!name) return 'U';
  const words = String(name).trim().split(' ').filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
};

function AdminUsersPage({ token }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [viewUser, setViewUser] = useState(null);
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
  const pendingCount = useMemo(() => users.filter((user) => Number(user?.verify) !== 1).length, [users]);

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
          <button type="button" className="primary-btn">
            Add User
          </button>
        </div>
      </div>

      <Banner message={message} />

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
                  const verificationStatus = getVerificationStatus(user);
                  const verificationClass = verificationStatus === 'Verified' ? 'verified' : 'pending';
                  return (
                    <tr key={user?.id || user?.user_id || index}>
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
                          <button type="button" className="ghost-btn small" onClick={() => setViewUser(user)}>
                            View
                          </button>
                          <button type="button" className="ghost-btn small" onClick={() => openEdit(user)}>
                            Edit
                          </button>
                          {verificationStatus !== 'Verified' ? (
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

      {viewUser ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="panel-split">
              <div>
                <h3 className="panel-subheading">User Details</h3>
                <p className="panel-subtitle">{getUserName(viewUser)}</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setViewUser(null)}>
                Close
              </button>
            </div>

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
                <p className="user-detail-value">{getVerificationStatus(viewUser)}</p>
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
    </div>
  );
}

export default AdminUsersPage;
