import { useEffect, useMemo, useState } from 'react';
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

  return (
    <div className="role-permission-page users-page">
      <div className="users-head">
        <div>
          <h2 className="panel-title">Role Permissions</h2>
          <p className="panel-subtitle">Define role access using menu/submenu CRUD matrix.</p>
        </div>
        <div className="users-head-actions">
          <button type="button" className="ghost-btn" onClick={loadBaseData} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" className="primary-btn" onClick={handleSavePermissions} disabled={isPermissionSaving || !selectedRoleId}>
            {isPermissionSaving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>

      <Banner message={message} />

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
              value={roleNameInput}
              onChange={(event) => setRoleNameInput(event.target.value)}
              placeholder="Enter role name"
            />
          </label>
          <div className="field field-span form-actions">
            <button type="button" className="ghost-btn" onClick={handleCreateRole} disabled={isRoleSaving}>
              Create Role
            </button>
            <button type="button" className="ghost-btn" onClick={handleUpdateRole} disabled={isRoleSaving || !selectedRoleId}>
              Rename Role
            </button>
            <button type="button" className="ghost-btn" onClick={handleDeleteRole} disabled={isRoleSaving || !selectedRoleId}>
              Delete Role
            </button>
          </div>
        </div>
      </section>

      <section className="panel card users-table-card">
        {matrixRows.length === 0 ? (
          <p className="empty-state">No menu/submenu/actions found in permission catalog.</p>
        ) : (
          <div className="table-shell">
            <table className="admin-table users-table">
              <thead>
                <tr>
                  <th>Menu</th>
                  <th>Submenu</th>
                  {CRUD_COLUMNS.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.menuName}</td>
                    <td>{row.submenuName}</td>
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
                            onChange={(event) => toggleBucket(actionIds, event.target.checked)}
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
      </section>
    </div>
  );
}

export default RolePermissionPage;
