import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { fetchUsers, updateUser } from '../services/adminApi';

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

function UserDirectoryPage({ token, allowedActions }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeUserId, setActiveUserId] = useState(null);

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
  const canUserRead = !hasActionModel || allowedActionSet.has('ADMIN_USERS_READ');
  const canUserUpdate = !hasActionModel || allowedActionSet.has('ADMIN_USERS_UPDATE');

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

  return (
    <div className="users-page">
      <div className="users-head">
        <div>
          <h2 className="panel-title">Users</h2>
          <p className="panel-subtitle">Customer, logistic, and insurance accounts in a single table view.</p>
        </div>
        <div className="users-head-actions">
          <button type="button" className="ghost-btn" onClick={loadUsers} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <Banner message={message} />

      <div className="stat-grid">
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#4F46E5' }}>
          <p className="stat-label">Total users</p>
          <p className="stat-value">{users.length}</p>
          <p className="stat-sub">Non-business accounts</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#16A34A' }}>
          <p className="stat-label">Active</p>
          <p className="stat-value">{activeCount}</p>
          <p className="stat-sub">Enabled accounts</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#0EA5E9' }}>
          <p className="stat-label">Verified</p>
          <p className="stat-value">{verifiedCount}</p>
          <p className="stat-sub">KYC completed</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F97316' }}>
          <p className="stat-label">Inactive</p>
          <p className="stat-value">{inactiveCount}</p>
          <p className="stat-sub">Needs reactivation</p>
        </div>
      </div>

      <div className="users-filters">
        <span className="status-chip login">{activeCount} Active</span>
        <span className="status-chip logout">{inactiveCount} Inactive</span>
        <span className="status-chip pending">{pendingCount} Pending</span>
      </div>

      <div className="panel card users-table-card">
        <div className="users-search">
          <span className="icon icon-search" />
          <input
            type="search"
            placeholder="Search users by name, email, or phone..."
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
                  <th>Phone</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="table-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const verificationMeta = resolveVerification(user);
                  const isActive = Number(user?.active) === 1;
                  return (
                    <tr key={user?.id || user?.user_id || getUserEmail(user)}>
                      <td>
                        <div className="user-cell">
                          <div className={`user-avatar ${isActive ? 'login' : 'logout'}`}>
                            <span>{getInitials(user)}</span>
                            <span className={`user-presence ${isActive ? 'login' : 'logout'}`} />
                          </div>
                          <div>
                            <p className="user-name">{getUserName(user)}</p>
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
                        {canUserUpdate ? (
                          <button
                            type="button"
                            className={isActive ? 'ghost-btn small' : 'primary-btn compact'}
                            onClick={() => handleToggleActive(user)}
                            disabled={activeUserId === user?.id}
                          >
                            {activeUserId === user?.id ? 'Saving...' : isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        ) : (
                          <span className="user-email">Read only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDirectoryPage;
