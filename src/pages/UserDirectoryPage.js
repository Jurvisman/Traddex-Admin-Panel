import { useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
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
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());

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
      <Banner message={message} />

      <div className="users-filters">
        <span className="status-chip login">{activeCount} Active</span>
        <span className="status-chip logout">{inactiveCount} Inactive</span>
        <span className="status-chip pending">{pendingCount} Pending</span>
      </div>

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
              <button type="button" className="gsc-toolbar-btn" title="Import/Export">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Import/Export
              </button>
            </div>
          </div>
          <div className="gsc-datatable-toolbar-right">
            <div className="gsc-toolbar-search">
              <input
                type="search"
                placeholder="Search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search users"
              />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
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
                      className={rowId && selectedRows.has(rowId) ? 'bdt-row-selected' : ''}
                    >
                      <td className="bdt-checkbox-col">
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
                            <span className="bdt-name-link">{getUserName(user)}</span>
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
    </div>
  );
}

export default UserDirectoryPage;
