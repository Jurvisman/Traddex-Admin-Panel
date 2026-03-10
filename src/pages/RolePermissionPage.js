import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { id: routeRoleId } = useParams();
  const isCreateRoute = routeRoleId === 'new';
  const isDetailRoute = Boolean(routeRoleId);

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
  const [openMenus, setOpenMenus] = useState(new Set());
  const [openActionRoleId, setOpenActionRoleId] = useState(null);
  const [isDetailActionsOpen, setIsDetailActionsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const loadBaseData = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [rolesResponse, catalogResponse] = await Promise.all([
        listRoles(token),
        fetchPermissionCatalog(token),
      ]);
      const roleList = Array.isArray(rolesResponse?.data) ? rolesResponse.data : [];
      setRoles(roleList);
      setCatalog(Array.isArray(catalogResponse?.data) ? catalogResponse.data : []);
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
    if (isCreateRoute) {
      setSelectedRoleId('');
      setSelectedActionIds(new Set());
      setRoleNameInput('');
      setIsEditMode(true);
      return;
    }

    if (!roles.length) return;

    if (routeRoleId) {
      const match = roles.find((role) => String(getRoleId(role)) === String(routeRoleId));
      if (match) {
        const roleId = getRoleId(match);
        if (roleId) {
          setSelectedRoleId(String(roleId));
          setIsEditMode(false);
          return;
        }
      }
    }

    if (!selectedRoleId && roles.length > 0) {
      const firstRoleId = getRoleId(roles[0]);
      if (firstRoleId) {
        setSelectedRoleId(String(firstRoleId));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles, routeRoleId, isCreateRoute]);

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
        const actionByBucket = { CREATE: [], READ: [], UPDATE: [], DELETE: [] };
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

  const toggleMenu = (menuName) => {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(menuName)) next.delete(menuName);
      else next.add(menuName);
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
      navigate('/admin/settings/roles');
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
      setIsEditMode(false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update role.' });
    } finally {
      setIsRoleSaving(false);
    }
  };

  const handleDeleteRole = async (roleOverride) => {
    const targetRoleId = roleOverride ? getRoleId(roleOverride) : selectedRoleId;
    if (!targetRoleId) return;
    const targetRoleName =
      roleOverride ? getRoleName(roleOverride) : getRoleName(selectedRole) || `#${targetRoleId}`;
    const roleLabel = targetRoleName || `#${targetRoleId}`;
    const ok = window.confirm(`Delete role ${roleLabel}?`);
    if (!ok) return;
    setIsRoleSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await deleteRole(token, targetRoleId);
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
    setIsEditMode(false);
  };

  const filteredRoles = useMemo(() => {
    const query = roleSearchQuery.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((role) => getRoleName(role).toLowerCase().includes(query));
  }, [roles, roleSearchQuery]);

  const handleStartCreateRole = () => {
    navigate('/admin/settings/roles/new');
    setTimeout(() => {
      if (roleNameInputRef.current) roleNameInputRef.current.focus();
    }, 0);
    setIsEditMode(true);
  };

  const handleViewRole = (role) => {
    const roleId = getRoleId(role);
    if (!roleId) return;
    navigate(`/admin/settings/roles/${roleId}`);
  };

  const toggleRowActions = (role) => {
    const roleId = getRoleId(role);
    if (!roleId) return;
    setOpenActionRoleId((current) => (current && String(current) === String(roleId) ? null : String(roleId)));
  };

  const handleBackToList = () => {
    navigate('/admin/settings/roles');
  };

  const toggleDetailActions = () => {
    setIsDetailActionsOpen((current) => !current);
  };

  /* ───────── LIST VIEW ───────── */
  if (!isDetailRoute) {
    return (
      <div className="role-permission-page role-list-page">
        <Banner message={message} />

        <div className="role-list-toolbar">
          <h3 className="role-list-heading">User roles</h3>
          <div className="role-list-toolbar-right">
            <div className="gsc-toolbar-search">
              <input
                type="search"
                placeholder="Search"
                value={roleSearchQuery}
                onChange={(e) => setRoleSearchQuery(e.target.value)}
                aria-label="Search roles"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <button type="button" className="gsc-create-btn" onClick={handleStartCreateRole} title="Create role" aria-label="Create role">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        {filteredRoles.length === 0 ? (
          <p className="empty-state">{roles.length === 0 ? 'No roles found.' : 'No roles match your search.'}</p>
        ) : (
          <>
            <div className="table-shell">
              <table className="admin-table role-list-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Role Name</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((role, index) => {
                    const roleId = getRoleId(role);
                    const isMenuOpen = openActionRoleId && String(openActionRoleId) === String(roleId);
                    const openDown = index < 2;
                    return (
                      <tr key={roleId || getRoleName(role)}>
                        <td>{index + 1}</td>
                        <td>
                          <button
                            type="button"
                            className="role-link"
                            onClick={() => handleViewRole(role)}
                          >
                            {getRoleName(role)}
                          </button>
                        </td>
                        <td className="table-actions">
                          <div className="gsc-row-actions">
                            <button
                              type="button"
                              className="ghost-btn small gsc-row-actions-toggle"
                              onClick={() => toggleRowActions(role)}
                              aria-label="Open actions"
                            >
                              <span className="gsc-row-actions-dots">⋯</span>
                            </button>
                            {isMenuOpen ? (
                              <div className={`gsc-row-actions-menu ${openDown ? 'menu-down' : ''}`}>
                                <button
                                  type="button"
                                  className="gsc-row-actions-item view"
                                  onClick={() => handleViewRole(role)}
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5Zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /></svg>
                                  View
                                </button>
                                <button
                                  type="button"
                                  className="gsc-row-actions-item edit"
                                  onClick={() => handleViewRole(role)}
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" /></svg>
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="gsc-row-actions-item delete"
                                  onClick={() => handleDeleteRole(role)}
                                  disabled={isRoleSaving}
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z" /></svg>
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer-meta">
              <span>
                Showing {filteredRoles.length} of {roles.length} records
              </span>
              <span>No more records to show</span>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ───────── DETAIL / CREATE VIEW ───────── */
  return (
    <div className="role-permission-page users-page">
      <div className="users-head">
        <div>
          <h2 className="panel-title">{isCreateRoute ? 'Create Role' : 'Role Permissions'}</h2>
          <p className="panel-subtitle">
            {isCreateRoute
              ? 'Create a new role and configure permissions.'
              : 'Manage roles and map CRUD permissions by menu/submenu.'}
          </p>
        </div>
        <div className="users-head-actions">
          {/* <button type="button" className="ghost-btn" onClick={handleBackToList}>
            Back to Roles
          </button> */}
          {!isCreateRoute && selectedRoleId ? (
            <div className="gsc-row-actions" style={{ marginLeft: 8 }}>
              <button
                type="button"
                className="ghost-btn small gsc-row-actions-toggle"
                onClick={toggleDetailActions}
                aria-label="Role actions"
              >
                <span className="gsc-row-actions-dots">⋯</span>
              </button>
              {isDetailActionsOpen ? (
                <div className="gsc-row-actions-menu">
                  <button
                    type="button"
                    className="gsc-row-actions-item edit"
                    onClick={() => {
                      setIsEditMode(true);
                      if (roleNameInputRef.current) {
                        roleNameInputRef.current.focus();
                      }
                      setIsDetailActionsOpen(false);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="gsc-row-actions-item delete"
                    onClick={() => {
                      handleDeleteRole(selectedRole);
                      setIsDetailActionsOpen(false);
                    }}
                    disabled={isRoleSaving}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <Banner message={message} />

      <section className="panel card" style={{ marginBottom: 16 }}>
        {isCreateRoute || isEditMode ? (
          <div className="role-detail-form-row">
            {!isCreateRoute ? (
              <label className="field">
                <span>Select Role</span>
                <select
                  value={selectedRoleId}
                  onChange={(e) => {
                    setSelectedRoleId(e.target.value);
                    setIsEditMode(false);
                  }}
                >
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
            ) : null}
            <label className="field">
              <span>User Role Name *</span>
              <input
                type="text"
                ref={roleNameInputRef}
                value={roleNameInput}
                onChange={(e) => setRoleNameInput(e.target.value)}
                placeholder="Enter Role Name"
                disabled={!isCreateRoute && !isEditMode}
              />
            </label>
            <div className="role-detail-form-btns">
              {selectedRoleId && isEditMode ? (
                <>
                  <button type="button" className="ghost-btn small" onClick={handleUpdateRole} disabled={isRoleSaving}>
                    Rename
                  </button>
                  <button type="button" className="ghost-btn small" onClick={handleDeleteRole} disabled={isRoleSaving}>
                    Delete
                  </button>
                </>
              ) : (
                <button type="button" className="primary-btn compact" onClick={handleCreateRole} disabled={isRoleSaving}>
                  {isRoleSaving ? 'Saving...' : 'Create'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="role-summary-row">
            <div className="role-summary-field">
              <p className="role-summary-label">Type</p>
              <p className="role-summary-value">Company</p>
            </div>
            <div className="role-summary-field">
              <p className="role-summary-label">User Role Name</p>
              <p className="role-summary-value">{roleNameInput || getRoleName(selectedRole) || '-'}</p>
            </div>
          </div>
        )}
      </section>

      <div className="role-permission-groups">
        {groupedMatrix.map((group) => {
          const isOpen = openMenus.has(group.menuName);
          return (
            <div key={group.menuName} className={`role-permission-group ${isOpen ? 'open' : ''}`}>
              <button type="button" className="role-permission-group-header" onClick={() => toggleMenu(group.menuName)}>
                <span className="role-permission-group-title">{group.menuName}</span>
                <span className="role-permission-group-chevron" aria-hidden="true" />
              </button>
              {isOpen && (
                <div className="role-permission-group-body">
                  <table className="admin-table users-table role-permission-table">
                    <thead>
                      <tr>
                        <th />
                        {CRUD_COLUMNS.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.key}>
                          <td>{row.submenuName}</td>
                          {CRUD_COLUMNS.map((col) => {
                            const actionIds = row.actionByBucket[col] || [];
                            const disabled = actionIds.length === 0 || !selectedRoleId;
                            const checked = isBucketChecked(actionIds);
                            return (
                              <td key={`${row.key}-${col}`}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={(e) => toggleBucket(actionIds, e.target.checked)}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="business-edit-footer role-permission-actions">
        <button type="button" className="ghost-btn" onClick={handleBackToList}>
          Cancel
        </button>
        <button
          type="button"
          className="primary-btn"
          onClick={handleSavePermissions}
          disabled={isPermissionSaving || !selectedRoleId}
        >
          {isPermissionSaving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
}

export default RolePermissionPage;
