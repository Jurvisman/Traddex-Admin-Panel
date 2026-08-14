import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner, DataTable, TableRowActionMenu } from '../components';
import {
  createRole,
  deleteRole,
  fetchPermissionCatalog,
  fetchRolePermissions,
  listRoles,
  saveRolePermissions,
  updateRole,
} from '../services/adminApi';

const DEFAULT_ACTION_ORDER = ['CREATE', 'READ', 'VIEW', 'EDIT KYC', 'EDIT', 'UPDATE', 'DELETE', 'APPROVE', 'REQUEST CHANGES', 'REJECT'];

const getRoleId = (role) => role?.id || role?.roles_id || role?.roleId || null;
const getRoleName = (role) => role?.name || role?.role_name || role?.roleName || '';

const resolveActionLabel = (action) => {
  const raw = String(action?.name || action?.code || '').trim();
  if (!raw) return 'ACTION';
  return raw.replace(/_/g, ' ').toUpperCase();
};

const sortActionLabels = (labels) =>
  [...labels].sort((left, right) => {
    const leftPriority = DEFAULT_ACTION_ORDER.indexOf(left);
    const rightPriority = DEFAULT_ACTION_ORDER.indexOf(right);
    if (leftPriority !== -1 || rightPriority !== -1) {
      if (leftPriority === -1) return 1;
      if (rightPriority === -1) return -1;
      return leftPriority - rightPriority;
    }
    return left.localeCompare(right);
  });

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
  const [openActionRowId, setOpenActionRowId] = useState(null);
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
        const actionMap = new Map();
        (submenu?.actions || []).forEach((action) => {
          const actionId = action?.actionId || action?.id;
          if (!actionId) return;
          const label = resolveActionLabel(action);
          const existing = actionMap.get(label) || [];
          existing.push(Number(actionId));
          actionMap.set(label, existing);
        });
        rows.push({
          key: `${menu?.menuId || menuName}-${submenu?.submenuId || submenu?.name}`,
          menuName,
          submenuName: submenu?.name || 'Submenu',
          actionIdsByLabel: Object.fromEntries(actionMap),
        });
      });
    });
    return rows;
  }, [catalog]);

  const groupedMatrix = useMemo(() => {
    const groups = new Map();
    matrixRows.forEach((row) => {
      if (!groups.has(row.menuName)) {
        groups.set(row.menuName, { rows: [], columns: new Set() });
      }
      const group = groups.get(row.menuName);
      group.rows.push(row);
      Object.keys(row.actionIdsByLabel || {}).forEach((label) => group.columns.add(label));
    });
    return Array.from(groups.entries()).map(([menuName, group]) => ({
      menuName,
      columns: sortActionLabels(Array.from(group.columns)),
      rows: group.rows,
    }));
  }, [matrixRows]);

  useEffect(() => {
    if (!openMenus.size && groupedMatrix.length > 0) {
      setOpenMenus(new Set([groupedMatrix[0].menuName]));
    }
  }, [groupedMatrix, openMenus]);

  const selectedRole = useMemo(
    () => roles.find((role) => String(getRoleId(role)) === String(selectedRoleId)) || null,
    [roles, selectedRoleId]
  );

  useEffect(() => {
    if (selectedRole) {
      setRoleNameInput(getRoleName(selectedRole));
    } else if (isCreateRoute) {
      setRoleNameInput('');
    }
  }, [selectedRole, isCreateRoute]);

  const isActionSetChecked = (actionIds) => {
    if (!actionIds?.length) return false;
    return actionIds.every((id) => selectedActionIds.has(Number(id)));
  };

  const toggleActionSet = (actionIds, checked) => {
    setSelectedActionIds((previous) => {
      const next = new Set(previous);
      actionIds.forEach((id) => {
        const numId = Number(id);
        if (checked) {
          next.add(numId);
        } else {
          next.delete(numId);
        }
      });
      return next;
    });
  };

  const toggleMenu = (menuName) => {
    setOpenMenus((previous) => {
      const next = new Set(previous);
      if (next.has(menuName)) {
        next.delete(menuName);
      } else {
        next.add(menuName);
      }
      return next;
    });
  };

  const handleCreateRole = async () => {
    const roleName = roleNameInput.trim();
    if (!roleName) {
      setMessage({ type: 'error', text: 'Please enter a role name.' });
      return;
    }

    setIsRoleSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await createRole(token, { name: roleName });
      const createdRoleId = response?.data?.id || response?.data?.roleId;
      setMessage({ type: 'success', text: `Role "${roleName}" created successfully.` });
      await loadBaseData();
      if (createdRoleId) {
        navigate(`/admin/settings/roles/${createdRoleId}`);
      } else {
        navigate('/admin/settings/roles');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create role.' });
    } finally {
      setIsRoleSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    const roleName = roleNameInput.trim();
    if (!selectedRoleId || !roleName) {
      setMessage({ type: 'error', text: 'Please enter a valid role name.' });
      return;
    }

    setIsRoleSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateRole(token, selectedRoleId, { name: roleName });
      setMessage({ type: 'success', text: `Role updated to "${roleName}".` });
      setIsEditMode(false);
      await loadBaseData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update role.' });
    } finally {
      setIsRoleSaving(false);
    }
  };

  const handleDeleteRole = async (role) => {
    const roleId = getRoleId(role);
    const roleName = getRoleName(role);
    if (!roleId) return;

    if (!window.confirm(`Are you sure you want to delete role "${roleName}"?`)) {
      return;
    }

    setIsRoleSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await deleteRole(token, roleId);
      setMessage({ type: 'success', text: `Role "${roleName}" deleted.` });
      await loadBaseData();
      navigate('/admin/settings/roles');
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete role.' });
    } finally {
      setIsRoleSaving(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) {
      setMessage({ type: 'error', text: 'Select a role to save permissions.' });
      return;
    }

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

  const filteredRoles = useMemo(() => {
    const query = roleSearchQuery.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((role) => getRoleName(role).toLowerCase().includes(query));
  }, [roles, roleSearchQuery]);

  const handleViewRole = (role) => {
    const roleId = getRoleId(role);
    if (roleId) {
      navigate(`/admin/settings/roles/${roleId}`);
    }
  };

  const handleStartCreateRole = () => {
    navigate('/admin/settings/roles/new');
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
        <div className="panel-head category-list-head" style={{ marginBottom: 20 }}>
          <div className="category-list-head-left">
            <div>
              <h2 className="panel-title">Role Management</h2>
              <p className="panel-subtitle">Manage administrative user roles and configure permission matrices.</p>
            </div>
          </div>
        </div>

        <Banner message={message} />

        <div className="panel card users-table-card">
          <DataTable
            columns={[
              {
                key: 'srNo',
                header: 'Sr. No.',
                width: '70px',
                render: (_, __, index) => index + 1,
              },
              {
                key: 'name',
                header: 'Role Name',
                sortable: true,
                render: (val, role) => (
                  <span
                    className="bdt-name-link"
                    style={{ color: '#6345ED', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewRole(role);
                    }}
                  >
                    {val || getRoleName(role)}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (_, role) => {
                  const roleId = getRoleId(role);
                  return (
                    <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                      <TableRowActionMenu
                        rowId={roleId}
                        openRowId={openActionRowId}
                        onToggle={setOpenActionRowId}
                        actions={[
                          { label: 'View & Edit Permissions', onClick: () => handleViewRole(role) },
                          { label: 'Delete Role', onClick: () => handleDeleteRole(role), danger: true },
                        ]}
                      />
                    </div>
                  );
                },
              },
            ]}
            data={filteredRoles}
            isLoading={isLoading}
            search={roleSearchQuery}
            onSearchChange={setRoleSearchQuery}
            searchPlaceholder="Search roles..."
            onRowClick={(role) => handleViewRole(role)}
            emptyTitle="No roles found"
            emptyDescription="No user roles found matching your search."
            toolbarRight={
              <button
                type="button"
                className="gsc-create-btn"
                onClick={handleStartCreateRole}
                title="Create role"
                aria-label="Create role"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            }
          />
        </div>
      </div>
    );
  }

  /* ───────── DETAIL / CREATE VIEW ───────── */
  return (
    <div className="role-permission-page users-page">
      <div className="panel-head category-list-head" style={{ marginBottom: 20 }}>
        <div className="category-list-head-left">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <button
                type="button"
                className="ghost-btn small"
                onClick={handleBackToList}
                style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Back to Roles
              </button>
              <h2 className="panel-title" style={{ margin: 0 }}>{isCreateRoute ? 'Create Role' : 'Role Permissions'}</h2>
            </div>
            <p className="panel-subtitle">
              {isCreateRoute
                ? 'Create a new role and configure action permissions.'
                : 'Map action permissions across system modules and menus.'}
            </p>
          </div>
        </div>

        <div className="users-head-actions">
          {!isCreateRoute && selectedRoleId ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => {
                  setIsEditMode(true);
                  if (roleNameInputRef.current) {
                    roleNameInputRef.current.focus();
                  }
                }}
              >
                Edit Name
              </button>
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => handleDeleteRole(selectedRole)}
                disabled={isRoleSaving}
                style={{ color: '#EF4444' }}
              >
                Delete Role
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <Banner message={message} />

      <section className="panel card" style={{ marginBottom: 20, padding: 20 }}>
        {isCreateRoute || isEditMode ? (
          <div className="role-detail-form-row" style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {!isCreateRoute ? (
              <label className="field" style={{ minWidth: 220, marginBottom: 0 }}>
                <span>Select Role</span>
                <select
                  value={selectedRoleId}
                  onChange={(e) => {
                    setSelectedRoleId(e.target.value);
                    setIsEditMode(false);
                  }}
                  style={{ height: 40 }}
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
            <label className="field" style={{ flex: 1, minWidth: 240, marginBottom: 0 }}>
              <span>User Role Name *</span>
              <input
                type="text"
                ref={roleNameInputRef}
                value={roleNameInput}
                onChange={(e) => setRoleNameInput(e.target.value)}
                placeholder="Enter Role Name"
                disabled={!isCreateRoute && !isEditMode}
                style={{ height: 40 }}
              />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedRoleId && isEditMode ? (
                <>
                  <button type="button" className="primary-btn" onClick={handleUpdateRole} disabled={isRoleSaving} style={{ height: 40 }}>
                    Save Name
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => setIsEditMode(false)} style={{ height: 40 }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" className="primary-btn" onClick={handleCreateRole} disabled={isRoleSaving} style={{ height: 40 }}>
                  {isRoleSaving ? 'Creating...' : 'Create Role'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Role</p>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#6345ED' }}>{roleNameInput || getRoleName(selectedRole) || '-'}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role Scope</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: '#334155' }}>Admin System</p>
            </div>
          </div>
        )}
      </section>

      <div className="role-permission-groups">
        {groupedMatrix.length === 0 ? <p className="empty-state">No permission catalog configured.</p> : null}
        {groupedMatrix.map((group) => {
          const isOpen = openMenus.has(group.menuName);
          return (
            <div key={group.menuName} className={`role-permission-group ${isOpen ? 'open' : ''}`} style={{ marginBottom: 16 }}>
              <button
                type="button"
                className="role-permission-group-header"
                onClick={() => toggleMenu(group.menuName)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: isOpen ? '12px 12px 0 0' : '12px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 15,
                  color: '#1e293b',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6345ED' }} />
                  {group.menuName}
                </span>
                <span className="role-permission-group-chevron" aria-hidden="true" />
              </button>
              {isOpen && (
                <div className="role-permission-group-body" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '16px 20px' }}>
                  {group.columns.length === 0 ? (
                    <p className="empty-state">No active actions configured for this menu.</p>
                  ) : (
                    <div className="table-shell">
                      <table className="admin-table users-table role-permission-table">
                        <thead>
                          <tr>
                            <th style={{ minWidth: 160 }}>Submenu</th>
                            {group.columns.map((column) => (
                              <th key={`${group.menuName}-${column}`} style={{ textAlign: 'center', minWidth: 90 }}>{column}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row) => (
                            <tr key={row.key}>
                              <td><strong>{row.submenuName}</strong></td>
                              {group.columns.map((column) => {
                                const actionIds = row.actionIdsByLabel[column] || [];
                                const disabled = actionIds.length === 0 || !selectedRoleId;
                                const checked = isActionSetChecked(actionIds);
                                return (
                                  <td key={`${row.key}-${column}`} style={{ textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={disabled}
                                      onChange={(e) => toggleActionSet(actionIds, e.target.checked)}
                                      style={{ width: 16, height: 16, cursor: disabled ? 'not-allowed' : 'pointer', accentColor: '#6345ED' }}
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
              )}
            </div>
          );
        })}
      </div>

      <div className="business-edit-footer role-permission-actions" style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
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
