import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner } from '../components';
import {
  createRole,
  deleteRole,
  fetchPermissionCatalog,
  fetchRolePermissions,
  listRoles,
  saveRolePermissions,
  updateRole,
} from '../services/adminApi';

const CRUD_COLUMNS = ['CREATE', 'READ', 'UPDATE', 'DELETE'];

const getRoleId = (role) => role?.id || role?.roles_id || role?.roleId || null;
const getRoleName = (role) => role?.name || role?.role_name || role?.roleName || '';

const resolveCrudBucket = (code) => {
  const normalized = String(code || '').toUpperCase();
  if (normalized.includes('_CREATE')) return 'CREATE';
  if (normalized.includes('_DELETE') || normalized.includes('_REMOVE')) return 'DELETE';
  if (normalized.includes('_UPDATE') || normalized.includes('_EDIT') || normalized.includes('_ASSIGN')) return 'UPDATE';
  if (normalized.includes('_VIEW') || normalized.includes('_LIST') || normalized.includes('_READ')) return 'READ';
  return null;
};

function RolePermissionPage({ token }) {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedActionIds, setSelectedActionIds] = useState(new Set());
  const [roleNameInput, setRoleNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRoleSaving, setIsRoleSaving] = useState(false);
  const [isPermissionSaving, setIsPermissionSaving] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const roleNameInputRef = useRef(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
  const [openMenuName, setOpenMenuName] = useState('');

  const loadBaseData = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [rolesResponse, catalogResponse] = await Promise.all([listRoles(token), fetchPermissionCatalog(token)]);
      const roleList = Array.isArray(rolesResponse?.data) ? rolesResponse.data : [];
      setRoles(roleList);
      setCatalog(Array.isArray(catalogResponse?.data) ? catalogResponse.data : []);
      if (!selectedRoleId && roleList.length > 0) {
        const firstRoleId = getRoleId(roleList[0]);
        if (firstRoleId) setSelectedRoleId(String(firstRoleId));
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load role settings.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRolePermissions = async (roleId) => {
    if (!roleId) return;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await fetchRolePermissions(token, roleId);
      const menus = response?.data?.menuPermissions || [];
      const nextSet = new Set();
      menus.forEach((menu) => {
        (menu?.submenus || []).forEach((submenu) => {
          (submenu?.actions || []).forEach((action) => {
            const actionId = action?.actionId || action?.id;
            if (actionId) nextSet.add(Number(actionId));
          });
        });
      });
      setSelectedActionIds(nextSet);
    } catch (error) {
      setSelectedActionIds(new Set());
      setMessage({ type: 'error', text: error.message || 'Failed to load role permissions.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    loadRolePermissions(selectedRoleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId]);

  const matrixRows = useMemo(() => {
    const rows = [];
    catalog.forEach((menu) => {
      const menuName = menu?.name || 'Menu';
      (menu?.submenus || []).forEach((submenu) => {
        const actionByBucket = {
          CREATE: [],
          READ: [],
          UPDATE: [],
          DELETE: [],
        };
        (submenu?.actions || []).forEach((action) => {
          const bucket = resolveCrudBucket(action?.code);
          const actionId = action?.actionId || action?.id;
          if (bucket && actionId) {
            actionByBucket[bucket].push(Number(actionId));
          }
        });
        rows.push({
          key: `${menu?.menuId || menuName}-${submenu?.submenuId || submenu?.name}`,
          menuName,
          submenuName: submenu?.name || 'Submenu',
          actionByBucket,
        });
      });
    });
    return rows;
  }, [catalog]);

  const groupedMatrix = useMemo(() => {
    const groups = new Map();
    matrixRows.forEach((row) => {
      if (!groups.has(row.menuName)) {
        groups.set(row.menuName, []);
      }
      groups.get(row.menuName).push(row);
    });
    return Array.from(groups.entries()).map(([menuName, rows]) => ({ menuName, rows }));
  }, [matrixRows]);

  useEffect(() => {
    if (!openMenuName && groupedMatrix.length > 0) {
      setOpenMenuName(groupedMatrix[0].menuName);
    }
  }, [groupedMatrix, openMenuName]);

  const selectedRole = useMemo(
    () => roles.find((role) => String(getRoleId(role)) === String(selectedRoleId)) || null,
    [roles, selectedRoleId]
  );

  useEffect(() => {
    if (selectedRole) {
      setRoleNameInput(getRoleName(selectedRole));
    } else {
      setRoleNameInput('');
    }
  }, [selectedRole]);

  const isBucketChecked = (actionIds) =>
    Array.isArray(actionIds) && actionIds.length > 0 && actionIds.every((id) => selectedActionIds.has(id));

  const toggleBucket = (actionIds, checked) => {
    if (!Array.isArray(actionIds) || actionIds.length === 0) return;
    setSelectedActionIds((prev) => {
      const next = new Set(prev);
      actionIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    setIsPermissionSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await saveRolePermissions(token, selectedRoleId, Array.from(selectedActionIds));
      setMessage({ type: 'success', text: 'Role permissions saved successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save role permissions.' });
    } finally {
      setIsPermissionSaving(false);
    }
  };

  const handleCreateRole = async () => {
    const name = roleNameInput.trim();
    if (!name) {
      setMessage({ type: 'error', text: 'Enter role name to create.' });
      return;
    }
    setIsRoleSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await createRole(token, { name });
      await loadBaseData();
      setMessage({ type: 'success', text: 'Role created successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create role.' });
    } finally {
      setIsRoleSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRoleId) return;
    const name = roleNameInput.trim();
    if (!name) {
      setMessage({ type: 'error', text: 'Role name is required.' });
      return;
    }
    setIsRoleSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateRole(token, selectedRoleId, { name });
      await loadBaseData();
      setMessage({ type: 'success', text: 'Role renamed successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update role.' });
    } finally {
      setIsRoleSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRoleId) return;
    const roleLabel = getRoleName(selectedRole) || `#${selectedRoleId}`;
    const ok = window.confirm(`Delete role ${roleLabel}?`);
    if (!ok) return;
    setIsRoleSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await deleteRole(token, selectedRoleId);
      const roleListResponse = await listRoles(token);
      const roleList = Array.isArray(roleListResponse?.data) ? roleListResponse.data : [];
      setRoles(roleList);
      const nextSelected = roleList.length > 0 ? String(getRoleId(roleList[0])) : '';
      setSelectedRoleId(nextSelected);
      setSelectedActionIds(new Set());
      setMessage({ type: 'success', text: 'Role deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete role.' });
    } finally {
      setIsRoleSaving(false);
    }
  };

  const filteredRoles = useMemo(() => {
    const query = roleSearchQuery.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((role) => getRoleName(role).toLowerCase().includes(query));
  }, [roles, roleSearchQuery]);

  const handleStartCreateRole = () => {
    setSelectedRoleId('');
    setSelectedActionIds(new Set());
    setRoleNameInput('');
    setViewMode('detail');
    setTimeout(() => {
      if (roleNameInputRef.current) roleNameInputRef.current.focus();
    }, 0);
  };

  const handleSelectRoleFromList = (role) => {
    const roleId = getRoleId(role);
    if (!roleId) return;
    setSelectedRoleId(String(roleId));
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
  };

  return (
    <div className="role-permission-page users-page">
      <div className="users-head">
        <div>
          <h2 className="panel-title">Role Permissions</h2>
          {viewMode === 'detail' ? (
            <p className="panel-subtitle">Define role access using menu/submenu CRUD matrix.</p>
          ) : (
            <p className="panel-subtitle">View and manage user roles.</p>
          )}
        </div>
        <div className="users-head-actions">
          <button type="button" className="ghost-btn" onClick={loadBaseData} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          {viewMode === 'detail' ? (
            <>
              <button type="button" className="ghost-btn" onClick={handleBackToList}>
                Back to roles
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSavePermissions}
                disabled={isPermissionSaving || !selectedRoleId}
              >
                {isPermissionSaving ? 'Saving...' : 'Save Permissions'}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <Banner message={message} />

      {viewMode === 'list' ? (
        <section className="panel card users-table-card">
          <div className="gsc-datatable-toolbar">
            <div className="gsc-datatable-toolbar-left">
              <h3 className="panel-subheading">User roles</h3>
            </div>
            <div className="gsc-datatable-toolbar-right">
              <div className="gsc-toolbar-search">
                <input
                  type="search"
                  placeholder="Search"
                  value={roleSearchQuery}
                  onChange={(event) => setRoleSearchQuery(event.target.value)}
                  aria-label="Search roles"
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
              <button
                type="button"
                className="gsc-create-btn"
                onClick={handleStartCreateRole}
                title="Create role"
                aria-label="Create role"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>
          {filteredRoles.length === 0 ? (
            <p className="empty-state">
              {roles.length === 0 ? 'No roles found.' : 'No roles match your search.'}
            </p>
          ) : (
            <div className="table-shell">
              <table className="admin-table users-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Role Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((role, index) => {
                    const roleId = getRoleId(role);
                    return (
                      <tr key={roleId || getRoleName(role)}>
                        <td>{index + 1}</td>
                        <td>{getRoleName(role)}</td>
                        <td className="table-actions">
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={() => handleSelectRoleFromList(role)}
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {viewMode === 'detail' ? (
        <>
          <section className="panel card">
            <div className="field-grid">
              <label className="field">
                <span>Select Role</span>
                <select value={selectedRoleId} onChange={(event) => setSelectedRoleId(event.target.value)}>
                  <option value="">Select role</option>
                  {roles.map((role) => {
                    const roleId = getRoleId(role);
                    return (
                      <option key={roleId || getRoleName(role)} value={roleId ? String(roleId) : ''}>
                        {getRoleName(role)}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="field">
                <span>Role Name</span>
                <input
                  type="text"
                  ref={roleNameInputRef}
                  value={roleNameInput}
                  onChange={(event) => setRoleNameInput(event.target.value)}
                  placeholder="Enter role name"
                />
              </label>
              <div className="field field-span form-actions">
                <button type="button" className="ghost-btn" onClick={handleCreateRole} disabled={isRoleSaving}>
                  Create Role
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleUpdateRole}
                  disabled={isRoleSaving || !selectedRoleId}
                >
                  Rename Role
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleDeleteRole}
                  disabled={isRoleSaving || !selectedRoleId}
                >
                  Delete Role
                </button>
              </div>
            </div>
          </section>
          <section className="panel card users-table-card">
            {matrixRows.length === 0 ? (
              <p className="empty-state">No menu/submenu/actions found in permission catalog.</p>
            ) : (
              <div className="role-permission-groups">
                {groupedMatrix.map((group) => {
                  const isOpen = openMenuName === group.menuName;

                  // Collect all actionIds per CRUD bucket for "Select All" row
                  const bucketAllIds = {
                    CREATE: [],
                    READ: [],
                    UPDATE: [],
                    DELETE: [],
                  };
                  group.rows.forEach((row) => {
                    CRUD_COLUMNS.forEach((bucket) => {
                      const ids = row.actionByBucket[bucket] || [];
                      bucketAllIds[bucket].push(...ids);
                    });
                  });

                  return (
                    <div key={group.menuName} className={`role-permission-group ${isOpen ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="role-permission-group-header"
                        onClick={() =>
                          setOpenMenuName((prev) => (prev === group.menuName ? '' : group.menuName))
                        }
                      >
                        <span className="role-permission-group-title">{group.menuName}</span>
                        <span className="role-permission-group-chevron" aria-hidden="true" />
                      </button>
                      {isOpen ? (
                        <div className="role-permission-group-body">
                          <table className="admin-table users-table role-permission-table">
                            <thead>
                              <tr>
                                <th />
                                <th>Select All</th>
                                {CRUD_COLUMNS.map((column) => (
                                  <th key={column}>{column}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="role-permission-select-all-row">
                                <td />
                                <td />
                                {CRUD_COLUMNS.map((column) => {
                                  const ids = bucketAllIds[column] || [];
                                  const disabled = ids.length === 0 || !selectedRoleId;
                                  const checked =
                                    ids.length > 0 &&
                                    ids.every((id) => selectedActionIds.has(id));
                                  return (
                                    <td key={`select-all-${group.menuName}-${column}`}>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={disabled}
                                        onChange={(event) => toggleBucket(ids, event.target.checked)}
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                              {group.rows.map((row) => (
                                <tr key={row.key}>
                                  <td>{row.submenuName}</td>
                                  <td />
                                  {CRUD_COLUMNS.map((column) => {
                                    const actionIds = row.actionByBucket[column] || [];
                                    const disabled = actionIds.length === 0 || !selectedRoleId;
                                    const checked = isBucketChecked(actionIds);
                                    return (
                                      <td key={`${row.key}-${column}`}>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={disabled}
                                          onChange={(event) =>
                                            toggleBucket(actionIds, event.target.checked)
                                          }
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

export default RolePermissionPage;
